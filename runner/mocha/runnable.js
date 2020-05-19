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
Runnable.prototype.timeout = function (ms) {
  if (!arguments.length) {
    return this._timeout;
  }
  if (typeof ms === 'string') {
    ms = milliseconds(ms);
  }

  this._timeout = parseInt(ms, 10);
  return this;
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
    var ms = self.timeout();

    if (finished) {
      return multiple(err);
    }

    self.duration = new Date() - start;
    finished = true;
    if (!err && self.duration > ms && ms > 0) {
      err = self._timeoutError(ms);
    }
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
