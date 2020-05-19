const util = require("util");
const EventEmitter = require("events").EventEmitter;
const Suite = require("./suite");
const Runnable = require("./runnable");

// given run of a suite uses a runner. instance of runnable
// keep record of current pass/fails + suites + tests
// lib/runner.js
function Runner(suite, delay) {
  var self = this;
  this.suite = suite;
  this.started = false;
  this.total = suite.total();
  this.failures = 0;
  // check for retried test at EVENT_TEST_END
  this._defaultGrep = /.*/;
  this.grep(this._defaultGrep);
}

util.inherits(Runner, EventEmitter);

Runner.prototype.runTests = function (suite, fn) {
  var self = this;
  var tests = suite.tests.slice();
  var test;

  function next(err, errSuite) {
    // if we bail after first err
    if (self.failures && suite._bail) {
      tests = [];
    }

    // next test
    test = tests.shift();

    // all done
    if (!test) {
      return fn();
    }

    // execute test and hook(s)
    self.emit(Runner.constants.EVENT_TEST_BEGIN, (self.test = test));
    self.hookDown(Suite.constants.HOOK_TYPE_BEFORE_EACH, function (err, errSuite) {
      self.currentRunnable = self.test;
      self.runTest(function (err) {
        test = self.test;
        if (err) {
          self.fail(test, err);
          self.emit(Runner.constants.EVENT_TEST_END, test);
          return self.hookUp(Suite.constants.HOOK_TYPE_AFTER_EACH, next);
        }

        test.state = Runnable.constants.STATE_PASSED;
        self.emit(Runner.constants.EVENT_TEST_PASS, test);
        self.emit(Runner.constants.EVENT_TEST_END, test);
        self.hookUp(Suite.constants.HOOK_TYPE_AFTER_EACH, next);
      });
    });
  }

  this.next = next;
  next();
};

Runner.prototype.runTest = function (fn) {
  var self = this;
  var test = this.test;

  if (!test) {
    return;
  }

  var suite = this.parents().reverse()[0] || this.suite;
  test.on('error', function (err) {
    self.fail(test, err);
  });
  try {
    test.run(fn);
  } catch (err) {
    fn(err);
  }
};

Runner.prototype.runSuite = function (suite, fn) {
  var i = 0;
  var self = this;
  var total = this.grepTotal(suite);

  if (!total || (self.failures && suite._bail)) {
    return fn();
  }

  this.emit(Runner.constants.EVENT_SUITE_BEGIN, (this.suite = suite));

  function next(_) {
    var curr = suite.suites[i++];
    if (!curr) {
      return done();
    }
    self.runSuite(curr, next);
  }

  function done(errSuite) {
    self.suite = suite;
    self.nextSuite = next;

    // remove reference to test
    delete self.test;

    self.hook(Suite.constants.HOOK_TYPE_AFTER_ALL, function () {
      self.emit(Runner.constants.EVENT_SUITE_END, suite);
      fn(errSuite);
    });
  }

  this.nextSuite = next;

  this.hook(Suite.constants.HOOK_TYPE_BEFORE_ALL, function (err) {
    if (err) {
      return done();
    }
    self.runTests(suite, next);
  });
};

Runner.prototype.run = function (fn) {
  var self = this;
  var rootSuite = this.suite;
  fn = fn || function () { };
  function start() {
    self.started = true;
    self.emit(Runner.constants.EVENT_RUN_BEGIN);

    self.runSuite(rootSuite, function () {
      self.emit(Runner.constants.EVENT_RUN_END);
    });
  }
  // callback
  this.on(Runner.constants.EVENT_RUN_END, function () {
    fn(self.failures);
  });

  // uncaught exception

  // BELOW WORRYING !!! craig
  // Runner.immediately(function () {
  start();
  // });

  return this;
};

Runner.prototype.grep = function (re, invert) {
  this._grep = re;
  this.total = this.grepTotal(this.suite);
  return this;
};

Runner.prototype.grepTotal = function (suite) {
  var self = this;
  var total = 0;

  suite.eachTest(function (test) {
    var match = self._grep.test(test.fullTitle());
    if (match) {
      total++;
    }
  });

  return total;
};

Runner.prototype.hook = function (name, fn) {
  var suite = this.suite;
  var hooks = suite.getHooks(name);
  var self = this;

  function next(i) {
    var hook = hooks[i];
    if (!hook) {
      return fn();
    }
    self.currentRunnable = hook;

    if (name === Suite.constants.HOOK_TYPE_BEFORE_ALL) {
      hook.ctx.currentTest = hook.parent.tests[0];
    } else if (name === Suite.constants.HOOK_TYPE_AFTER_ALL) {
      hook.ctx.currentTest = hook.parent.tests[hook.parent.tests.length - 1];
    } else {
      hook.ctx.currentTest = self.test;
    }

    self.emit(Runner.constants.EVENT_HOOK_BEGIN, hook);

    hook.run(function cbHookRun(err) {
      // conditional skip
      self.emit(Runner.constants.EVENT_HOOK_END, hook);
      delete hook.ctx.currentTest;
      next(++i);
    });
  }

  // Runner.immediately(function () {
  next(0);
  // });
};

Runner.prototype.hookDown = function (name, fn) {
  var suites = [this.suite].concat(this.parents());
  this.hooks(name, suites, fn);
};

Runner.prototype.hookUp = function (name, fn) {
  var suites = [this.suite].concat(this.parents()).reverse();
  this.hooks(name, suites, fn);
};

Runner.prototype.parents = function () {
  var suite = this.suite;
  var suites = [];
  while (suite.parent) {
    suite = suite.parent;
    suites.push(suite);
  }
  return suites;
};

Runner.prototype.hooks = function (name, suites, fn) {
  var self = this;
  var orig = this.suite;

  function next(suite) {
    self.suite = suite;

    if (!suite) {
      self.suite = orig;
      return fn();
    }

    self.hook(name, function (err) {
      next(suites.pop());
    });
  }

  next(suites.pop());
};

Runner.prototype.fail = function (test, err, force) {
  ++this.failures;
  test.state = Runnable.constants.STATE_FAILED;
  function thrown2Error(err) {
    return new Error(
      'the (some type) ' + stringify(err) + ' was thrown, throw an Error :)'
    );
  }

  function isError(err) {
    return err instanceof Error || (err && typeof err.message === 'string');
  }
  if (!isError(err)) {
    err = thrown2Error(err);
  }

  try {
    err.stack =
      this.fullStackTrace || !err.stack ? err.stack : stackFilter(err.stack);
  } catch (ignore) {
    // some environments do not take kindly to monkeying with the stack
  }

  this.emit(Runner.constants.EVENT_TEST_FAIL, test, err);
};

Runner.constants = {
  EVENT_HOOK_BEGIN: 'hook',
  EVENT_HOOK_END: 'hook end',
  EVENT_RUN_BEGIN: 'start',
  EVENT_DELAY_BEGIN: 'waiting',
  EVENT_DELAY_END: 'ready',
  EVENT_RUN_END: 'end',
  EVENT_SUITE_BEGIN: 'suite',
  EVENT_SUITE_END: 'suite end',
  EVENT_TEST_BEGIN: 'test',
  EVENT_TEST_END: 'test end',
  EVENT_TEST_FAIL: 'fail',
  EVENT_TEST_PASS: 'pass',
  EVENT_TEST_PENDING: 'pending',
  EVENT_TEST_RETRY: 'retry'
}

module.exports = Runner;
