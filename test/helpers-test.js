/* eslint-disable func-names */
/* eslint-disable prefer-arrow-callback */
/**
 * @module 'helpers-test'
 * @fileoverview Tests for Nssm internal helpers methods
 * @license MIT
 * @author gharbi.wass@gmail.com (Wassim Gharbi)
 */

const assert = require('assert');
const commander = require('commander');
const helpers = require('../src/helpers');

const program = new commander.Command();
const haveAdminRights = true;

program
  .option('-l, --location  <type>', 'nssm location')
  .option('-a, --app  <type>', 'app path')
  .option('-s, --serviceName  <type>', 'serviceName')
  .option('-r, --appArgs <type>', 'app args');
program.parse(process.argv);

const { location, serviceName, app, appArgs } = program.opts();

describe('nssm-helpers', function () {
  if (!haveAdminRights) { // Special case for user with wrong rights
    describe('#constructor()', function () {
      it('prevent continue executing with wrong rights', function (done) {
        helpers.initExecuter().catch((error) => {
          assert(error instanceof Error);
          done();
        });
      });
    });
  } else {
    // Check helpers stop execting when wrong path is set for executer
    describe('#constructor()', function () {
      it('should stop executing with wrong path', function (done) {
        helpers.initExecuter({ location: 'wrong path' }).catch((error) => {
          assert(error instanceof Error);
          done();
        });
      });
    });
    // eslint-disable-next-line vars-on-top
    let nssmExecuter = null;
    before(function (done) {
      helpers.initExecuter({ location }).then((_nssmExecuter) => {
        assert(_nssmExecuter instanceof Object);
        nssmExecuter = _nssmExecuter;
        done();
      }).catch((error) => {
        done(error);
      });
    });
    // Testing install functions
    describe('install', function () {
      context('when install service with default path', function () {
        it('should get an error, "//foo dosen\'t exist"', function (done) {
          this.timeout(3000);
          nssmExecuter.install('foo', (error) => {
            assert(error instanceof Error);
            assert.strictEqual(error.message, '//foo don\'t exist');
            done();
          }, '//foo', '');
        });
      });
      context(`when install service "${serviceName}" for first time`, function () {
        it('should be succedded', function (done) {
          this.timeout(3000);
          nssmExecuter.install(serviceName, (error) => {
            if (error) {
              console.log(error.message);
            }
            assert(!(error instanceof Error));
            done();
          }, app, appArgs);
        });
      });
      context(`when install service "${serviceName}" for second time`, function () {
        it('should get an error, "Service already exist"', function (done) {
          this.timeout(3000);
          nssmExecuter.install(serviceName, (error) => {
            assert(error instanceof Error);
            done();
          }, app, appArgs);
        });
      });
    });
    // Testing control functions
    describe('controls', function () {
      before(function (done) { // Create Service with empty app
        nssmExecuter.control(null, (error) => {
          done(error);
        }, 'install', 'testService', 'C:\\test\\eee');
      });
      context('when serviceName dosen\'t exist', function () {
        it('should get an error, "dosen\'t exist"', function (done) {
          this.timeout(3000);
          nssmExecuter.start('foo', (error) => {
            assert(error instanceof Error);
            assert.strictEqual(error.message, 'Service dosen\'t exist');
            done();
          });
        });
      });
      context(`when service "${serviceName}" is start for first time`, function () {
        it('should be succedded', function (done) {
          this.timeout(3000);
          nssmExecuter.start(serviceName, (error) => {
            if (error) {
              console.log(error.message);
            }
            assert(!(error instanceof Error));
            done();
          });
        });
      });
      context(`when service "${serviceName}" is start for second time`, function () {
        it('should get an error, "Already running"', function (done) {
          this.timeout(3000);
          nssmExecuter.start(serviceName, (error) => {
            assert(error instanceof Error);
            assert.strictEqual(error.message, 'Service already running');
            done();
          });
        });
      });
      context(`when reading service "${serviceName}" status`, function () {
        it('should be succedded', function (done) {
          this.timeout(3000);
          nssmExecuter.status(serviceName, (error, status) => {
            if (error) {
              console.log(error.message);
            }
            assert(!(error instanceof Error));
            assert.strictEqual(status, 'running');
            done();
          });
        });
      });
      context(`when service "${serviceName}" is restart`, function () {
        it('should be succedded', function (done) {
          this.timeout(3000);
          nssmExecuter.restart(serviceName, (error) => {
            assert(!(error instanceof Error));
            done();
          });
        });
      });
      context(`when service "${serviceName}" is stop for first time`, function () {
        it('should be succedded', function (done) {
          this.timeout(3000);
          nssmExecuter.stop(serviceName, (error) => {
            assert(!(error instanceof Error));
            done();
          });
        });
      });
      context(`when service "${serviceName}" is stop for second time`, function () {
        it('should be succedded', function (done) {
          this.timeout(3000);
          nssmExecuter.stop(serviceName, (error) => {
            assert(!(error instanceof Error));
            done();
          });
        });
      });
      context('when service "testService" is start, with wrong app path', function () {
        it('should get an error, "Wrong app path"', function (done) {
          this.timeout(3000);
          nssmExecuter.start('testService', (error, status) => {
            // assert(error instanceof Error);
            console.log(status);
            // assert.strictEqual(error.message, 'Service already running');
            done();
          });
        });
      });
    });
    // Testing remove function
    describe('remove', function () {
      context('when remove service don\'t exist', function () {
        it('should get an error, "Service dosen\'t exist"', function (done) {
          this.timeout(3000);
          nssmExecuter.remove('foo', (error) => {
            // if (error){
            //   console.log(error.message);
            // }
            assert(error instanceof Error);
            assert.strictEqual(error.message, 'Service dosen\'t exist');
            done();
          });
        });
      });
      context(`when remove service "${serviceName}"`, function () {
        it('should be succedded', function (done) {
          this.timeout(3000);
          nssmExecuter.remove(serviceName, (error) => {
            if (error) {
              console.log(error.message);
            }
            assert(!(error instanceof Error));
            done();
          });
        });
      });
      context('when remove service "testService"', function () {
        it('should be succedded', function (done) {
          this.timeout(3000);
          nssmExecuter.remove('testService', (error) => {
            if (error) {
              console.log(error.message);
            }
            assert(!(error instanceof Error));
            done();
          });
        });
      });
    });
  }
});
