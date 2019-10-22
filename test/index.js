/* eslint-disable prefer-arrow-callback */
/* eslint-disable func-names */
const assert = require('assert');
const commander = require('commander');
const { Nssm } = require('../src');


const program = new commander.Command();
const haveAdminRights = true;

program
  .option('-l, --location  <type>', 'nssm location, optional')
  .option('-a, --app  <type>', 'app path')
  .option('-s, --serviceName  <type>', 'serviceName')
  .option('-r, --appArgs <type>', 'app args');
program.parse(process.argv);

const { location, serviceName, app, appArgs } = program.opts();

if (!serviceName) {
  program.outputHelp();
  process.exit(0);
}

describe('nssm', function () {
  if (!haveAdminRights) { // Special case for user with wrong rights
    describe('#constructor()', function () {
      it('prevent continue executing with wrong rights', function (done) {
        Nssm().catch((error) => {
          assert(error instanceof Error);
          done();
        });
      });
    });
  } else {
    // Check Nssm stop execting when wrong path is set for executer
    describe('#constructor()', function () {
      it('should stop executing with wrong path', function (done) {
        Nssm({ location: 'wrong path' }).catch((error) => {
          assert(error instanceof Error);
          done();
        });
      });
    });
    let nssm = null;
    before(function (done) {
      Nssm({ location }).then((_nssm) => {
        assert(_nssm instanceof Object);
        nssm = _nssm;
        done();
      }).catch((error) => {
        done(error);
      });
    });
    describe('#install()', function () {
      context('when install service with default path', function () {
        it('should get an error, "//foo dosen\'t exist"', function (done) {
          this.timeout(5000);
          nssm.install('foo', '//foo', '').then(function () {
          }).catch((error) => {
            assert(error instanceof Error);
            assert.strictEqual(error.message, '//foo don\'t exist');
            done();
          });
        });
      });
      context(`install service "${serviceName}" for first time`, function () {
        it('should be succedded', function (done) {
          this.timeout(5000);
          nssm.install(serviceName, app, appArgs).then(function () {
            done();
          }).catch((error) => {
            if (error) {
              console.log(error.message);
            }
            assert(!(error instanceof Error));
          });
        });
      });
      context(`install service "${serviceName}" for second time`, function () {
        it('should be succedded', function (done) {
          this.timeout(5000);
          nssm.install(serviceName, app, appArgs).then(function () {
          }).catch((error) => {
            assert(error instanceof Error);
            assert.strictEqual(error.message, `${serviceName} already exist !`);
            done();
          });
        });
      });
      context(`reinstall service "${serviceName}"`, function () {
        it('should be succedded', function (done) {
          this.timeout(5000);
          nssm.reinstall(serviceName, app, appArgs, true).then(function () {
            done();
          }).catch((error) => {
            assert(!(error instanceof Error));
          });
        });
      });
    });
    describe('controls', function () {
      before(function (done) { // Create Service with wrong app path for start testing
        nssm.executer.control(null, (error) => {
          done(error);
        }, 'install', 'testService', 'C:\\test\\eee');
      });
      describe('#start()', function () {
        context('when serviceName dosen\'t exist', function () {
          it('should get an error, "dosen\'t exist"', function (done) {
            this.timeout(5000);
            nssm.start('foo').then(function () {}).catch((error) => {
              assert(error instanceof Error);
              assert.strictEqual(error.message, 'Service dosen\'t exist');
              done();
            });
          });
        });
        context(`when service "${serviceName}" is start for second time`, function () {
          it('should get an error, "Already running"', function (done) {
            this.timeout(5000);
            nssm.start(serviceName).then(function () {}).catch((error) => {
              assert(error instanceof Error);
              assert.strictEqual(error.message, 'Service already running');
              done();
            });
          });
        });
        context('start service "testService" with wrong app path ', function () {
          it('should get an error, "Unexpected Status"', function (done) {
            this.timeout(5000);
            nssm.start('testService').then(function () {}).catch((error) => {
              assert(error instanceof Error);
              assert.strictEqual(error.message, 'Unexpected Status : stopped, expected running');
              done();
            });
          });
        });
      });
      describe('#restart()', function () {
        it('should be succedded"', function (done) {
          this.timeout(5000);
          nssm.restart(serviceName).then(() => done()).catch((error) => {
            console.log(error.message);
            assert(!(error instanceof Error));
          });
        });
      });
      describe('#stop()', function () {
        it('should be succedded"', function (done) {
          this.timeout(5000);
          nssm.stop(serviceName).then(() => done()).catch((error) => {
            console.log(error.message);
            assert(!(error instanceof Error));
          });
        });
      });
      describe('#getStatus()', function () {
        it('should be succedded"', function (done) {
          this.timeout(5000);
          nssm.stop(serviceName).then(() => done()).catch((error) => {
            console.log(error.message);
            assert(!(error instanceof Error));
          });
        });
      });
    });
    describe('#remove()', function () {
      context(`when remove service "${serviceName}"`, function () {
        it('should be succedded', function (done) {
          this.timeout(5000);
          nssm.remove(serviceName).then(function () {
            done();
          }).catch((error) => {
            if (error) {
              console.log(error.message);
            }
            assert(!(error instanceof Error));
          });
        });
      });
      context('when remove service "testService"', function () {
        it('should be succedded', function (done) {
          this.timeout(5000);
          nssm.remove('testService').then(function () {
            done();
          }).catch((error) => {
            if (error) {
              console.log(error.message);
            }
            assert(!(error instanceof Error));
          });
        });
      });
    });
  }
});
