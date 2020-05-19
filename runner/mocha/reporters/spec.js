const util = require("util");
const EventEmitter = require("events").EventEmitter;
const Base = require("./base");
const Runner = require("../runner");


// lib/reporters/spec.js
var color = Base.color;
function Spec(runner, options) {
  Base.call(this, runner, options);

  var self = this;
  var indents = 0;
  var n = 0;

  function indent() {
    return Array(indents).join('  ');
  }

  runner.on(Runner.constants.EVENT_RUN_BEGIN, function () {
    Base.consoleLog();
  });

  runner.on(Runner.constants.EVENT_SUITE_BEGIN, function (suite) {
    ++indents;
    Base.consoleLog('suite', suite.title);
  });

  runner.on(Runner.constants.EVENT_SUITE_END, function () {
    --indents;
    if (indents === 1) {
      Base.consoleLog();
    }
  });

  runner.on(Runner.constants.EVENT_TEST_PENDING, function (test) {
    var fmt = indent() + color('pending', '  - %s');
    Base.consoleLog(fmt, test.title);
  });

  runner.on(Runner.constants.EVENT_TEST_PASS, function (test) {
    var fmt =
      indent() +
      color('checkmark', '  ' + Base.symbols.ok) +
      color('pass', ' %s') +
      color(test.speed, ' (%dms)');
    Base.consoleLog(fmt, test.title, test.duration);
  });

  runner.on(Runner.constants.EVENT_TEST_FAIL, function (test) {
    Base.consoleLog(indent() + color('fail', '  %d) %s'), ++n, test.title);
  });

  runner.once(Runner.constants.EVENT_RUN_END, self.epilogue.bind(self));
}
util.inherits(Spec, Base);

module.exports = Spec;
