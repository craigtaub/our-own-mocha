const util = require("util");
const EventEmitter = require("events").EventEmitter;
const Suite = require("./suite");

// event thing
// lib/runnaable.js
function Runnable(title, fn) {
  this.title = title;
  this.fn = fn;
  this.body = (fn || '').toString();
  this.async = fn && fn.length;
  this.sync = !this.async;
  this._timeout = 2000;
  this.timedOut = false;
}
Runnable.prototype.fullTitle = function () {
  return this.titlePath().join(' ');
};
Runnable.prototype.titlePath = function () {
  return this.parent.titlePath().concat([this.title]);
};
util.inherits(Runnable, EventEmitter);

module.exports = Runnable;
