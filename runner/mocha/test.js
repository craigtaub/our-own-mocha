const util = require("util");
const EventEmitter = require("events").EventEmitter;
const Runnable = require("./runnable");

// the test
// lib/test.js
function Test(title, fn) {
  Runnable.call(this, title, fn);
  this.pending = !fn;
  this.type = "test";
}

util.inherits(Test, Runnable);

Test.prototype.clone = function () {
  var test = new Test(this.title, this.fn);
  test.parent = this.parent;
  test.file = this.file;
  test.ctx = this.ctx;
  return test;
};

module.exports = Test;
