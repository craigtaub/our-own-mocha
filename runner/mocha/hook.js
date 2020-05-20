const util = require("util");
const Runnable = require("./runnable");

function Hook(title, fn) {
  Runnable.call(this, title, fn);
  this.type = "hook";
}

util.inherits(Hook, Runnable);

module.exports = Hook;
