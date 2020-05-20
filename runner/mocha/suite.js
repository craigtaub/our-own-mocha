const util = require("util");
const EventEmitter = require("events").EventEmitter;
const Hook = require("./hook");

// collection of tests
// lib/suite.js
function Suite(title, parentContext, isRoot) {
  this.title = title;
  function Context() {}
  Context.prototype = parentContext;
  this.ctx = new Context();
  this.suites = [];
  this.tests = [];
  this._beforeEach = [];
  this._beforeAll = [];
  this._afterEach = [];
  this._afterAll = [];
  this.root = isRoot === true;
}
Suite.prototype.fullTitle = function () {
  return this.titlePath().join(" ");
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
  return this["_" + name];
};
Suite.prototype._createHook = function (title, fn) {
  var hook = new Hook(title, fn);
  hook.parent = this;
  hook.ctx = this.ctx;
  hook.file = this.file;
  return hook;
};
Suite.prototype.beforeEach = function (title, fn) {
  fn = title;
  title = fn.name;
  title = '"before each" hook' + (title ? ": " + title : "");
  var hook = this._createHook(title, fn);
  this._beforeEach.push(hook);
  this.emit(Suite.constants.EVENT_SUITE_ADD_HOOK_BEFORE_EACH, hook);
  return this;
};

Suite.prototype.afterEach = function (title, fn) {
  fn = title;
  title = fn.name;
  title = '"after each" hook' + (title ? ": " + title : "");
  var hook = this._createHook(title, fn);
  this._afterEach.push(hook);
  this.emit(Suite.constants.EVENT_SUITE_ADD_HOOK_AFTER_EACH, hook);
  return this;
};
Suite.prototype.beforeAll = function (title, fn) {
  fn = title;
  title = fn.name;
  title = '"before all" hook' + (title ? ": " + title : "");

  var hook = this._createHook(title, fn);
  this._beforeAll.push(hook);
  this.emit(Suite.constants.EVENT_SUITE_ADD_HOOK_BEFORE_ALL, hook);
  return this;
};
Suite.prototype.afterAll = function (title, fn) {
  fn = title;
  title = fn.name;
  title = '"after all" hook' + (title ? ": " + title : "");

  var hook = this._createHook(title, fn);
  this._afterAll.push(hook);
  this.emit(Suite.constants.EVENT_SUITE_ADD_HOOK_AFTER_ALL, hook);
  return this;
};

// Inherit from `EventEmitter.prototype`.
util.inherits(Suite, EventEmitter);
// Events
Suite.constants = {
  EVENT_FILE_POST_REQUIRE: "post-require",
  EVENT_FILE_PRE_REQUIRE: "pre-require",
  EVENT_FILE_REQUIRE: "require",
  EVENT_ROOT_SUITE_RUN: "run",
  HOOK_TYPE_AFTER_ALL: "afterAll",
  HOOK_TYPE_AFTER_EACH: "afterEach",
  HOOK_TYPE_BEFORE_ALL: "beforeAll",
  HOOK_TYPE_BEFORE_EACH: "beforeEach",
  EVENT_SUITE_ADD_HOOK_AFTER_ALL: "afterAll",
  EVENT_SUITE_ADD_HOOK_AFTER_EACH: "afterEach",
  EVENT_SUITE_ADD_HOOK_BEFORE_ALL: "beforeAll",
  EVENT_SUITE_ADD_HOOK_BEFORE_EACH: "beforeEach",
  EVENT_SUITE_ADD_SUITE: "suite",
  EVENT_SUITE_ADD_TEST: "test",
};

module.exports = Suite;
