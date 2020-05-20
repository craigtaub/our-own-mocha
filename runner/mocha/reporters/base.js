const util = require("util");
const EventEmitter = require("events").EventEmitter;
const Runner = require("../runner");
const milliseconds = require("ms");

// lib/reporters/base.js
const colors = {
  pass: 90,
  fail: 31,
  "bright pass": 92,
  "bright fail": 91,
  "bright yellow": 93,
  pending: 36,
  suite: 0,
  "error title": 0,
  "error message": 31,
  "error stack": 90,
  checkmark: 32,
  fast: 90,
  medium: 33,
  slow: 31,
  green: 32,
  light: 90,
  "diff gutter": 90,
  "diff added": 32,
  "diff removed": 31,
};

const symbols = {
  ok: "✓",
  err: "✖",
  dot: "․",
  comma: ",",
  bang: "!",
};

var color = function (type, str) {
  return "\u001b[" + colors[type] + "m" + str + "\u001b[0m";
};
function Base(runner, options) {
  var failures = (this.failures = []);
  this.options = options || {};
  this.runner = runner;
  this.stats = runner.stats; // assigned so Reporters keep a closer reference

  runner.on(Runner.constants.EVENT_TEST_PASS, function (test) {
    test.speed = "medium";
  });

  runner.on(Runner.constants.EVENT_TEST_FAIL, function (test, err) {
    // more than one error per test
    if (test.err && err instanceof Error) {
      test.err.multiple = (test.err.multiple || []).concat(err);
    } else {
      test.err = err;
    }
    failures.push(test);
  });
}
Base.consoleLog = console.log;
Base.symbols = symbols;
Base.color = color;
Base.prototype.epilogue = function () {
  var stats = this.stats;
  var fmt;

  Base.consoleLog();

  // passes
  fmt =
    color("bright pass", " ") +
    color("green", " %d passing") +
    color("light", " (%s)");

  Base.consoleLog(fmt, stats.passes || 0, milliseconds(stats.duration));

  // pending
  if (stats.pending) {
    fmt = color("pending", " ") + color("pending", " %d pending");

    Base.consoleLog(fmt, stats.pending);
  }

  // failures
  if (stats.failures) {
    fmt = color("fail", "  %d failing");

    Base.consoleLog(fmt, stats.failures);

    Base.list(this.failures);
    Base.consoleLog();
  }

  Base.consoleLog();
};

module.exports = Base;
