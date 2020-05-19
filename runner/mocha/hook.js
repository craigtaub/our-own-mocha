
const Runnable = require("./runnable");
const util = require("util");

function Hook(title, fn) {
  Runnable.call(this, title, fn);
  this.type = 'hook';
}

util.inherits(Hook, Runnable);

module.exports = Hook;
