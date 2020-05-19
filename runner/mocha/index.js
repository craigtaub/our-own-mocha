const path = require('path');
const Base = require("./reporters/base");
const Spec = require("./reporters/spec");
const Suite = require("./suite");
const Context = require("./context");
const Test = require("./test");
const Runner = require("./runner");

// lib/stats-collector.js
function createStatsCollector(runner) {
  var stats = {
    suites: 0,
    tests: 0,
    passes: 0,
    pending: 0,
    failures: 0
  };

  if (!runner) {
    throw new TypeError('Missing runner argument');
  }

  runner.stats = stats;

  runner.once(Runner.constants.EVENT_RUN_BEGIN, function () {
    stats.start = new Date();
  });
  runner.on(Runner.constants.EVENT_SUITE_BEGIN, function (suite) {
    suite.root || stats.suites++;
  });
  runner.on(Runner.constants.EVENT_TEST_PASS, function () {
    stats.passes++;
  });
  runner.on(Runner.constants.EVENT_TEST_FAIL, function () {
    stats.failures++;
  });
  runner.on(Runner.constants.EVENT_TEST_PENDING, function () {
    stats.pending++;
  });
  runner.on(Runner.constants.EVENT_TEST_END, function () {
    stats.tests++;
  });
  runner.once(Runner.constants.EVENT_RUN_END, function () {
    stats.end = new Date();
    stats.duration = stats.end - stats.start;
  });
}

// lib/mocharc.json
const defaults = {
  diff: true,
  extension: ['js', 'cjs', 'mjs'],
  reporter: 'spec',
  timeout: 2000,
  ui: 'bdd',
}

// Mocha instance with options
// lib/mocha.js
function Mocha(options) {
  this.files = [];
  this.options = options;
  // root suite
  this.suite = new Suite('', new Context(), true);

  this.ui(options.ui)
    .reporter(options.reporter)
  this.timeout(options.timeout === false ? 0 : options.timeout);
}
// Sets test UI `name`, defaults to "bdd".
Mocha.prototype.ui = function (ui) {
  var bindInterface;
  ui = ui || 'bdd';
  bindInterface = Mocha.interfaces[ui];
  bindInterface(this.suite);

  this.suite.on(Suite.constants.EVENT_FILE_PRE_REQUIRE, function (context) {
    exports.afterEach = context.afterEach || context.teardown;
    exports.after = context.after || context.suiteTeardown;
    exports.beforeEach = context.beforeEach || context.setup;
    exports.before = context.before || context.suiteSetup;
    exports.describe = context.describe || context.suite;
    exports.it = context.it || context.test;
  });

  return this;
};
Mocha.prototype.reporter = function (reporter) {
  const builtinReporters = Mocha.reporters;
  reporter = reporter || 'spec';
  var _reporter;
  // Try to load a built-in reporter.
  _reporter = builtinReporters[reporter];
  // Try to load reporters from process.cwd() and node_modules

  this._reporter = _reporter;
  return this;
};
Mocha.prototype.timeout = function (msecs) {
  this.suite.timeout(msecs);
  return this;
};
// -> lib/reporters.js -> base/spec
Mocha.reporters = {
  base: Base,
  spec: Spec
}
// -> lib/interfaces/index.js -> tdd/bdd
Mocha.interfaces = {
  // lib/interfaces/common.js
  common: function (suites, context, mocha) {
    return {
      before: function (name, fn) {
        suites[0].beforeAll(name, fn);
      },
      after: function (name, fn) {
        suites[0].afterAll(name, fn);
      },
      beforeEach: function (name, fn) {
        suites[0].beforeEach(name, fn);
      },
      afterEach: function (name, fn) {
        suites[0].afterEach(name, fn);
      },

      suite: {
        //Creates a suite.
        create: function create(opts) {
          var suite = Suite.create(suites[0], opts.title);
          suite.pending = Boolean(opts.pending);
          suite.file = opts.file;
          suites.unshift(suite);

          opts.fn.call(suite);
          suites.shift();

          return suite;
        }
      }
    };
  },
  bdd: function bddInterface(suite) {
    var suites = [suite];

    suite.on(Suite.constants.EVENT_FILE_PRE_REQUIRE, function (context, file, mocha) {
      var common = Mocha.interfaces.common(suites, context, mocha);

      context.before = common.before;
      context.after = common.after;
      context.beforeEach = common.beforeEach;
      context.afterEach = common.afterEach;

      context.describe = context.context = function (title, fn) {
        return common.suite.create({
          title: title,
          file: file,
          fn: fn
        });
      };

      context.it = context.specify = function (title, fn) {
        var suite = suites[0];
        var test = new Test(title, fn);
        test.file = file;
        suite.addTest(test);
        return test;
      };
    });
  }
}
// loads ESM (and CJS) test files asynchronously, then runs root suite
Mocha.prototype.loadFilesAsync = function () {
  var self = this;
  var suite = this.suite;
  this.loadAsync = true;

  const requireOrImport = async file => {
    file = path.resolve(file);
    return require(file);
  };
  const loadFilesAsync = async (files, preLoadFunc, postLoadFunc) => {
    for (const file of files) {
      preLoadFunc(file);
      const result = await requireOrImport(file);
      postLoadFunc(file, result);
    }
  };

  return loadFilesAsync(
    this.files,
    function (file) {
      suite.emit(Suite.constants.EVENT_FILE_PRE_REQUIRE, global, file, self);
    },
    function (file, resultModule) {
      suite.emit(Suite.constants.EVENT_FILE_REQUIRE, resultModule, file, self);
      suite.emit(Suite.constants.EVENT_FILE_POST_REQUIRE, global, file, self);
    }
  );
};
Mocha.prototype.run = function (fn) {
  var suite = this.suite;
  var options = this.options;
  options.files = this.files;
  var runner = new Runner(suite, options.delay);
  createStatsCollector(runner);
  var reporter = new this._reporter(runner, options);

  function done(failures) {
    fn = fn || utils.noop;
    if (reporter.done) {
      reporter.done(failures, fn);
    } else {
      fn(failures);
    }
  }

  return runner.run(done);
};


module.exports = Mocha;
