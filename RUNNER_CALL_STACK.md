# Runner call stack

Below is a break-down of the Runner calling hooks, suites and tests

```javascript
Mocha.run
  runner.run // call runner

Runner.run
  runSuite() // run root suite

Runner.runSuite
  next() {
    curr = suite.suites[i++]; // grab next suite
    if (!curr) done(); // none left, done
    runSuite(curr, next); // call suite
  }
  // 1. run all beforeAll hooks
  hook(HOOK_TYPE_BEFORE_ALL, () => {
    // 2. run tests + callback once complete
    runTests(next)
  }

Runner.hook (callback)
  // 1. for current suite, get hooks with name x
  var hooks = this.suite.getHooks(name);

  next(i){
    // 3. grab current hook
    var hook = hooks[i];
    // 4. executed all hooks under name x for suite
    if (!hook) callback()

    // set hooks test context
    hook.ctx.currentTest = ...

    // 5. execute hook
    hook.run(() => {
      // 6. end of hook trigger next hook
      next(++i)
    });
  }

  // 2. trigger start of hooks
  next(0);


Runnable.run() // hook.run()
  fn.call(ctx);
  // NOTE: hooks inherit runnable so "hook.run" will call this.

Runner.runTests (callback)
  next() {
    // grab next text
    test = tests.shift()
    // no tests left, run callback running next suite
    if (!test) callback()
    // run beforeEach hooks bottom up
    hookDown(HOOK_TYPE_BEFORE_EACH, () => {
      runTest((err) => {
        if (err) {
          // test failure
          // run after each hook in reverse order
          return hookUp(HOOK_TYPE_AFTER_EACH, next)
        }
        // test pass
        // run after each hook in reverse order
        hookUp(HOOK_TYPE_AFTER_EACH, next)
      })
    })
  }
  // run next test
  next()

Runner.hookDown / Runner.hookUp (name, cb)
  hooks(name, cb)

Runner.hooks (name, callback)
  next(suite) {
    if (!suite) callback()
    hook(() => {
      next(suites.pop()); // run next suite
    });
  }
  next()
```
