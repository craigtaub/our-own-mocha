const util = require("util");
const EventEmitter = require("events").EventEmitter;
const Suite = require("./suite");

// given run of a suite uses a runner. instance of runnable
// keep record of current pass/fails + suites + tests
// lib/runner.js
function Runner(suite, delay) {
  var self = this;
  this._globals = [];
  this._abort = false;
  this._delay = delay;
  this.suite = suite;
  this.started = false;
  this.total = suite.total();
  this.failures = 0;
  this.on(Suite.constants.EVENT_TEST_END, function (test) {
    if (test.type === 'test' && test.retriedTest() && test.parent) {
      var idx =
        test.parent.tests && test.parent.tests.indexOf(test.retriedTest());
      if (idx > -1) test.parent.tests[idx] = test;
    }
  });
  this._defaultGrep = /.*/;
  this.grep(this._defaultGrep);
}
util.inherits(Runner, EventEmitter);
Runner.prototype.uncaughtEnd = function uncaughtEnd(err) {
  if (err instanceof Pending) return;
  throw err;
};
Runner.prototype.runTests = function (suite, fn) {
  var self = this;
  var tests = suite.tests.slice();
  var test;

  function hookErr(_, errSuite, after) {
    // before/after Each hook for errSuite failed:
    var orig = self.suite;

    // for failed 'after each' hook start from errSuite parent,
    // otherwise start from errSuite itself
    self.suite = after ? errSuite.parent : errSuite;

    if (self.suite) {
      // call hookUp afterEach
      self.hookUp(Suite.constants.HOOK_TYPE_AFTER_EACH, function (err2, errSuite2) {
        self.suite = orig;
        // some hooks may fail even now
        if (err2) {
          return hookErr(err2, errSuite2, true);
        }
        // report error suite
        fn(errSuite);
      });
    } else {
      // there is no need calling other 'after each' hooks
      self.suite = orig;
      fn(errSuite);
    }
  }

  function next(err, errSuite) {
    // if we bail after first err
    if (self.failures && suite._bail) {
      tests = [];
    }

    if (self._abort) {
      return fn();
    }

    if (err) {
      return hookErr(err, errSuite, true);
    }

    // next test
    test = tests.shift();

    // all done
    if (!test) {
      return fn();
    }

    // grep
    var match = self._grep.test(test.fullTitle());
    if (self._invert) {
      match = !match;
    }
    if (!match) {
      // Run immediately only if we have defined a grep. When we
      // define a grep — It can cause maximum callstack error if
      // the grep is doing a large recursive loop by neglecting
      // all tests. The run immediately function also comes with
      // a performance cost. So we don't want to run immediately
      // if we run the whole test suite, because running the whole
      // test suite don't do any immediate recursive loops. Thus,
      // allowing a JS runtime to breathe.
      if (self._grep !== self._defaultGrep) {
        Runner.immediately(next);
      } else {
        next();
      }
      return;
    }


    // execute test and hook(s)
    self.emit(Runner.constants.EVENT_TEST_BEGIN, (self.test = test));
    self.hookDown(Suite.constants.HOOK_TYPE_BEFORE_EACH, function (err, errSuite) {
      if (err) {
        return hookErr(err, errSuite, false);
      }
      self.currentRunnable = self.test;
      self.runTest(function (err) {
        test = self.test;
        test.state = Runner.constants.STATE_PASSED;
        self.emit(Runner.constants.EVENT_TEST_PASS, test);
        self.emit(Runner.constants.EVENT_TEST_END, test);
        self.hookUp(Suite.constants.HOOK_TYPE_AFTER_EACH, next);
      });
    });
  }

  this.next = next;
  this.hookErr = hookErr;
  next();
};
Runner.prototype.runTest = function (fn) {
  var self = this;
  var test = this.test;

  if (!test) {
    return;
  }

  var suite = this.parents().reverse()[0] || this.suite;
  if (this.asyncOnly) {
    test.asyncOnly = true;
  }
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

  function next(errSuite) {
    if (errSuite) {
      // current suite failed on a hook from errSuite
      if (errSuite === suite) {
        // if errSuite is current suite
        // continue to the next sibling suite
        return done();
      }
      // errSuite is among the parents of current suite
      // stop execution of errSuite and all sub-suites
      return done(errSuite);
    }

    if (self._abort) {
      return done();
    }

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
  function uncaught(err) {
    self.uncaught(err);
  }
  function start() {
    self.started = true;
    self.emit(Runner.constants.EVENT_RUN_BEGIN);

    self.runSuite(rootSuite, function () {
      self.emit(Runner.constants.EVENT_RUN_END);
    });
  }
  // callback
  this.on(Runner.constants.EVENT_RUN_END, function () {
    process.removeListener('uncaughtException', uncaught);
    process.on('uncaughtException', self.uncaughtEnd);
    fn(self.failures);
  });

  // uncaught exception
  process.removeListener('uncaughtException', self.uncaughtEnd);
  process.on('uncaughtException', uncaught);

  // BELOW WORRYING !!! craig
  // Runner.immediately(function () {
  start();
  // });

  return this;
};
Runner.prototype.grep = function (re, invert) {
  this._grep = re;
  this._invert = invert;
  this.total = this.grepTotal(this.suite);
  return this;
};
Runner.prototype.grepTotal = function (suite) {
  var self = this;
  var total = 0;

  suite.eachTest(function (test) {
    var match = self._grep.test(test.fullTitle());
    if (self._invert) {
      match = !match;
    }
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

    hook.allowUncaught = self.allowUncaught;

    self.emit(Runner.constants.EVENT_HOOK_BEGIN, hook);

    if (!hook.listeners('error').length) {
      hook.on('error', function (err) {
        self.failHook(hook, err);
      });
    }

    hook.run(function cbHookRun(err) {
      var testError = hook.error();
      if (testError) {
        self.fail(self.test, testError);
      }
      // conditional skip
      if (hook.pending) {
        if (name === Suite.constants.HOOK_TYPE_AFTER_EACH) {
          // TODO define and implement use case
          if (self.test) {
            self.test.pending = true;
          }
        } else if (name === Suite.constants.HOOK_TYPE_BEFORE_EACH) {
          if (self.test) {
            self.test.pending = true;
          }
          self.emit(Runner.constants.EVENT_HOOK_END, hook);
          hook.pending = false; // activates hook for next test
          return fn(new Error('abort hookDown'));
        } else if (name === Runner.constants.HOOK_TYPE_BEFORE_ALL) {
          suite.tests.forEach(function (test) {
            test.pending = true;
          });
          suite.suites.forEach(function (suite) {
            suite.pending = true;
          });
          hooks = [];
        } else {
          hook.pending = false;
          var errForbid = createUnsupportedError('`this.skip` forbidden');
          self.failHook(hook, errForbid);
          return fn(errForbid);
        }
      } else if (err) {
        self.failHook(hook, err);
        // stop executing hooks, notify callee of hook err
        return fn(err);
      }
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
      if (err) {
        var errSuite = self.suite;
        self.suite = orig;
        return fn(err, errSuite);
      }

      next(suites.pop());
    });
  }

  next(suites.pop());
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
