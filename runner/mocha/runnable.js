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
  this.timedOut = false;
}
Runnable.prototype.fullTitle = function () {
  return this.titlePath().join(' ');
};

Runnable.prototype.titlePath = function () {
  return this.parent.titlePath().concat([this.title]);
};

Runnable.prototype.run = function (fn) {
  var self = this;
  var start = new Date();
  var ctx = this.ctx;
  var finished;
  var emitted;

  // Sometimes the ctx exists, but it is not runnable
  if (ctx && ctx.runnable) {
    ctx.runnable(this);
  }

  // called multiple times
  function multiple(err) {
    if (emitted) {
      return;
    }
    emitted = true;
    var msg = 'done() called multiple times';
    if (err && err.message) {
      err.message += " (and Mocha's " + msg + ')';
      self.emit('error', err);
    } else {
      self.emit('error', new Error(msg));
    }
  }

  // finished
  function done(err) {
    if (finished) {
      return multiple(err);
    }

    self.duration = new Date() - start;
    finished = true;
    fn(err);
  }

  // for .resetTimeout() and Runner#uncaught()
  this.callback = done;

  // explicit async with `done` argument

  // sync or promise-returning
  callFn(this.fn);

  function callFn(fn) {
    var result = fn.call(ctx);
    done();
  }
};

util.inherits(Runnable, EventEmitter);

module.exports = Runnable;
