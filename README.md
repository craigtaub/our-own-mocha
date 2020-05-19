# our-own-mocha

- CJS as core does not support ESM natively yet.
- accepts ESM for test files.

## Features

- suites + tests
- hooks
- reporter + ui
- NO: timers, slow

## 3 parts to our /runner

### 1. Mocha

- entities required for a test runner 

### 2. Parsing phase

- goal to build a coherent CLI
- found in `lib/cli`
- uses Prototype so can chain in ES5-friendly way

### 3. Execution phase

- relies on mocha instance from parsing phase
- creates instance of a Runnable

## Runner steps

### Parsing phase

- create a yars instance and attach commands
- uses a child yargs instance for options and checks
- runs validation inside a part of these checks
- if passes above build mocha instance + hands to next phase

#### Build mocha instance

- creates instance of an empty Suite and attaches to "this.suite"
- creates instance of a Reporter and attaches "this.reporter" (a function "Spec")
- based on Interface, binds suite events onto our "this.suite".
  - events are used to bind UI methods to the suite context.
  - HOW? each listener is given the params "context", "file" and our "mocha" instance
  - So on("EVENT_FILE_PRE_REQUIRE") => context.after = ... context.describe = ... context.it = ...
  - "describe()" creates and returns a new suite via "suite.create"
  - "it()" creates and returns a new Test via "new Test"

### Execution phase

- build single array of all files to run
- load ESM and CJS files async, emitting event before/after file required
- run mocha instance

### Mocha.run instance

- create instance of a Runner, add stats collecting
- create instance of a Reporter from the Runner

## Scripts

    npm run help
    npm run test
