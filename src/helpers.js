/**
 * @module helpers
 * @fileoverview Helpers for nssm
 * @license MIT
 * @author gharbi.wass@gmail.com (Wassim Gharbi)
 */


const { exec } = require('child_process');
const async = require('async');
const fs = require('fs');
const { Kernel32 } = require('win32-api');
const path = require('path');
const ref = require('ref');

const knl32 = Kernel32.load();

/**
 *
 * @param {*} callback
 */
function checkRights(callback) {
  exec('NET SESSION', (err, stdout, stderr) => {
    if (err || stderr.length !== 0) {
      callback('No rights to manage services.');
    } else {
      callback();
    }
  });
}
/**
 *
 * @param {*} location
 * @param {*} callback
 */
function getNssmExecutable(location, callback) {
  if (!location) {
    return callback('Undefined location');
  }
  if (!fs.existsSync(location)) {
    return callback(`${location} don't exist`);
  }
  exec('wmic CPU get AddressWidth < nul', (err, stdout) => {
    let arch = '32'; // by 32 default
    // In success cmd execution, we set exact arch value
    if (!err && stdout) {
      arch = stdout.match(/(32|64)/)[1];
    }
    // Join location with arch to get absolute executable path
    const selectedNssm = path.join(location, (arch === '64') ? 'nssm64.exe' : 'nssm.exe');
    // Check if executable exist
    if (!fs.existsSync(selectedNssm)) {
      return callback(`${selectedNssm} don't exist`);
    }
    callback(null, selectedNssm);
    return 0;
  });
  return 0;
}

/**
 * Constructor for Nssm Executer with promise return
 * @constructor
 * @param {Object} options
 * @param {string=info} options.location // location where nssm executables (.exe) exists
*/
exports.initExecuter = (options) => {
  const ctrl = this;
  options.location = options.location || path.join(__dirname, '../bin');
  return new Promise((resolve, reject) => {
    async.series([
      checkRights,
      (callback) => getNssmExecutable(options.location, (err, selectedNssm) => {
        if (err) {
          callback(err);
          return;
        }
        ctrl.selectedNssm = selectedNssm;
        callback();
      }),
    ], (error) => {
      if (error) {
        reject(Error(error));
      }
      // Generic control function
      ctrl.control = control(ctrl.selectedNssm);
      // Install function
      ctrl.install = (serviceName, callback, executable, args) => {
        if (!fs.existsSync(executable)) {
          callback(Error(`${executable} don't exist`));
          return;
        }
        const arg = `${executable} ${args}`;
        ctrl.control(options.dbg, (err, status) => {
          if (err) {
            callback(err);
            return;
          }
          callback(status);
        }, 'INSTALL', serviceName, arg);
      };
      // Start function
      ctrl.start = (serviceName, callback) => ctrl.control(options.dbg, callback, 'START', serviceName);
      // Stop function
      ctrl.stop = (serviceName, callback) => ctrl.control(options.dbg, callback, 'STOP', serviceName);
      // Restart function
      ctrl.restart = (serviceName, callback) => ctrl.control(options.dbg, callback, 'RESTART', serviceName);
      // Remove function
      ctrl.remove = (serviceName, callback) => ctrl.control(options.dbg, callback, 'REMOVE', serviceName, 'confirm');
      // Status function
      ctrl.status = (serviceName, callback) => ctrl.control(options.dbg, callback, 'STATUS', serviceName);
      resolve(ctrl);
    });
  });
};


function TryParseInt(str, defaultValue = -1) {
  let retValue = defaultValue;
  if (str !== null) {
    if (str.length > 0) {
      if (!isNaN(str)) {
        retValue = parseInt(str);
      }
    }
  }
  return retValue;
}

function getServiceStatus(str) {
  let formatString = JSON.parse(JSON.stringify(str));
  formatString = formatString.replace(/(\r\n|\n|\r)/gm, '');
  formatString = formatString.replace('.', '');
  let status = 0;
  switch (formatString) {
    case 'SERVICE_CONTINUE_PENDING':
    case 'SERVICE_START_PENDING':
    case 'SERVICE_STOP_PENDING':
    case 'SERVICE_PAUSE_PENDING':
      status = 'pending';
      break;
    case 'SERVICE_PAUSED':
      status = 'paused';
      break;
    case 'SERVICE_RUNNING':
      status = 'running';
      break;
    case 'SERVICE_STOPPED':
      status = 'stopped';
      break;
    default:
      status = 0;
      break;
  }
  return status;
}

function getKernelError(error) {
  let errorMessage = null;
  switch (error) {
    case 2: // In case exe file not found
      errorMessage = new Error('Old Nssm not found, please reinstall service');
      break;
    case 1056: // In case exe service already running
      errorMessage = new Error('Service already running');
      break;
    case 1060:
      errorMessage = new Error('Service dosen\'t exist');
      break;
    case 1073:
      errorMessage = new Error('Service already exist');
      break;
    default:
      // console.log(error);
      const buf = Buffer.alloc(255);
      if (!knl32.FormatMessageW(0x00001000 | 0x00000200, null, error, 0x0409, buf, 255, null)) {
        if (!knl32.FormatMessageW(0x00001000 | 0x00000200, null, error, 0, buf, 255, null)) {
          errorMessage = new Error(`System Error:  ${error[2]}`);
          break;
        }
      }
      errorMessage = new Error(Error(ref.reinterpretUntilZeros(buf, 2).toString('ucs2')));
      break;
  }
  return errorMessage;
}

/**
 *
 * @param {*} nssm executable
 * @param {*} action "START / STOP / REMOVE/ INSTALL / RESTART"
 * @param {*} nssm args
 */
const control = (nssm) => (dbg, callback, action, serviceName, args = null) => {
  const cmd = `${nssm} ${action} "${serviceName}" ${args}`;
  if (dbg) {
    dbg(`CMD :  + ${cmd}`);
  }
  exec(cmd, (err, stdout, stderr) => {
    let status = null;
    if (err) {
      const frg = err.message.split(';');
      if (frg.length) {
        const error = TryParseInt(frg[frg.length - 1]);
        if (error !== -1) { // System Error
          callback(getKernelError(error));
          return;
        }
        status = getServiceStatus(frg[frg.length - 1]);
        // console.log("Status : " + status);
        if (!status) {
          callback(Error(err.message));
          return;
        }
      } else {
        callback(Error(err.message));
        return;
      }
    }
    if (!status) {
      status = getServiceStatus(stdout);
    }
    if (dbg) {
      dbg(`STDOUT :  + ${stdout}`);
    }
    callback(null, status);
  });
};
