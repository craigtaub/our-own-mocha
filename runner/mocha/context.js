// lib/context.js
function Context() { }
// Set or get the context `Runnable` to `runnable`.
Context.prototype.runnable = function (runnable) {
  if (!arguments.length) {
    return this._runnable;
  }
  this.test = this._runnable = runnable;
  return this;
};
module.exports = Context;
