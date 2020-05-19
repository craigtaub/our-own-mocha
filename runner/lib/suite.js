const util = require("util");
const EventEmitter = require("events").EventEmitter;

// collection of tests
// lib/suite.js
function Suite(title, parentContext, isRoot) {
  this.title = title;
  function Context() { }
  Context.prototype = parentContext;
  this.ctx = new Context();
  this.suites = [];
  this.tests = [];
  this._beforeEach = [];
  this._beforeAll = [];
  this._afterEach = [];
  this._afterAll = [];
  this.root = isRoot === true;
  this._timeout = 2000;
}
Suite.prototype.timeout = function (ms) {
  if (!arguments.length) {
    return this._timeout;
  }
  if (typeof ms === 'string') {
    ms = milliseconds(ms);
  }

  this._timeout = parseInt(ms, 10);
  return this;
};
Suite.prototype.fullTitle = function () {
  return this.titlePath().join(' ');
};
Suite.prototype.titlePath = function () {
  var result = [];
  if (this.parent) {
    result = result.concat(this.parent.titlePath());
  }
  if (!this.root) {
    result.push(this.title);
  }
  return result;
};
Suite.prototype.addSuite = function (suite) {
  suite.parent = this;
  suite.root = false;
  suite.timeout(this.timeout());
  this.suites.push(suite);
  this.emit(Suite.constants.EVENT_SUITE_ADD_SUITE, suite);
  return this;
};
Suite.prototype.addTest = function (test) {
  test.parent = this;
  test.ctx = this.ctx;
  this.tests.push(test);
  this.emit(Suite.constants.EVENT_SUITE_ADD_TEST, test);
  return this;
};
Suite.prototype.total = function () {
  return (
    this.suites.reduce(function (sum, suite) {
      return sum + suite.total();
    }, 0) + this.tests.length
  );
};
Suite.create = function (parent, title) {
  var suite = new Suite(title, parent.ctx);
  suite.parent = parent;
  title = suite.fullTitle();
  parent.addSuite(suite);
  return suite;
};
Suite.prototype.eachTest = function (fn) {
  this.tests.forEach(fn);
  this.suites.forEach(function (suite) {
    suite.eachTest(fn);
  });
  return this;
};
Suite.prototype.getHooks = function getHooks(name) {
  return this['_' + name];
};
// Inherit from `EventEmitter.prototype`.
util.inherits(Suite, EventEmitter);
// Events
Suite.constants = {
  EVENT_FILE_POST_REQUIRE: 'post-require',
  EVENT_FILE_PRE_REQUIRE: 'pre-require',
  EVENT_FILE_REQUIRE: 'require',
  EVENT_ROOT_SUITE_RUN: 'run',
  HOOK_TYPE_AFTER_ALL: 'afterAll',
  HOOK_TYPE_AFTER_EACH: 'afterEach',
  HOOK_TYPE_BEFORE_ALL: 'beforeAll',
  HOOK_TYPE_BEFORE_EACH: 'beforeEach',
  EVENT_SUITE_ADD_HOOK_AFTER_ALL: 'afterAll',
  EVENT_SUITE_ADD_HOOK_AFTER_EACH: 'afterEach',
  EVENT_SUITE_ADD_HOOK_BEFORE_ALL: 'beforeAll',
  EVENT_SUITE_ADD_HOOK_BEFORE_EACH: 'beforeEach',
  EVENT_SUITE_ADD_SUITE: 'suite',
  EVENT_SUITE_ADD_TEST: 'test'
}

module.exports = Suite;
