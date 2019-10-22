/**
 * @module 'nssm'
 * @fileoverview NSSM control layer
 * @license MIT
 * @author gharbi.wass@gmail.com (Wassim Gharbi)
 */

const async = require('async');
const helpers = require('./helpers');

/**
 *
 * @param {*} serviceName
 * @param {*} actions
 * @param {*} expectedState
 */
const runActionWithChecking = (executer, serviceName, actions, expectedState = null, ...args) => new Promise((resolve, reject) => {
  const fnActions = actions.map((action) => (callback) => action(serviceName, callback, ...args));
  if (expectedState) {
    fnActions.push((callback) => setTimeout(() => {
      executer.status(serviceName, callback, ...args);
    }, 2000));
  }
  async.series(fnActions, (error, result) => {
    if (error) {
      return reject(error);
    }
    if (expectedState && expectedState !== result[result.length - 1]) {
      return reject(Error(`Unexpected Status : ${result[result.length - 1]}, expected ${expectedState}`));
    }
    return resolve();
  });
});

/**
 * Constructor for Nssm with promise return
 * @constructor
 * @param {Object} options
 * @param {string} options.location // location where nssm executables (.exe) exists
 * @param {boolean} options.dbg // display commands and theirs return
*/
exports.Nssm = (options = {}) => {
  const ctrl = this;
  return new Promise((resolve, reject) => {
    helpers.initExecuter(options).then((executer) => {
      ctrl.executer = executer;
      ctrl.start = (serviceName) => runActionWithChecking(ctrl.executer, serviceName, [ctrl.executer.start], 'running');
      ctrl.stop = (serviceName) => runActionWithChecking(ctrl.executer, serviceName, [ctrl.executer.stop], 'stopped');
      ctrl.restart = (serviceName) => runActionWithChecking(ctrl.executer, serviceName, [ctrl.executer.restart], 'running');
      ctrl.remove = (serviceName) => runActionWithChecking(ctrl.executer, serviceName, [ctrl.executer.stop, ctrl.executer.remove]);
      ctrl.reinstall = (serviceName, executable, args) => ctrl.install(serviceName, executable, args, true);
      ctrl.install = (serviceName, executable, args, reinstall) => new Promise((rsl, rjt) => {
        ctrl.executer.status(serviceName, (error) => {
          let actions = [ctrl.executer.install, ctrl.executer.start];
          if (!error) { // Which mean that service aleardy exist
            if (reinstall) {
              // In case service exist and we reinstall service, thaen add remove functions
              actions = [ctrl.executer.stop, ctrl.executer.remove].concat(actions);
            } else {
              return rjt(Error(`${serviceName} already exist !`));
            }
          }
          runActionWithChecking(ctrl.executer, serviceName, actions, 'running', executable, args).then(rsl).catch(rjt);
          return 0;
        });
      });
      ctrl.getStatus = (serviceName) => new Promise((rsl, rjt) => {
        ctrl.executer.status(serviceName, (error, status) => {
          if (error) {
            return rjt(error);
          }
          rsl(status);
          return 0;
        });
      });
      resolve(ctrl);
    }).catch((error) => reject(error));
  });
};
