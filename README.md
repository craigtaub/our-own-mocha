# our-own-mocha

- CJS as core does not support ESM natively yet.
- Accepts ESM for test files.

## Features

- Suites + tests
- Hooks
- Reporter + ui
- IGNORED: timers, slow

## 3 parts to our /runner

### 1. Mocha

- Entities required for a test runner 

### 2. Parsing phase

- Goal to build a coherent CLI
- Found in Mochas `lib/cli`
- Uses Prototype so can chain in ES5-friendly way

### 3. Execution phase

- Relies on mocha instance from parsing phase
- Creates instance of a Runnable

## Runner steps

### Parsing phase

- Create a yars instance and attach commands
- Uses a child yargs instance for options and checks
- Runs validation inside a part of these checks
- If passes above build mocha instance + hands to next phase

#### Build mocha instance

- Creates instance of an empty Suite and attaches to `this.suite`
- Creates instance of a Reporter and attaches `this.reporter` (e.g. a function `Spec`)
- Based on Interface, binds suite events onto our `this.suite`.
  - Events are used to bind UI methods to the suite context.

##### How does the Interface work with our Mocha instance?

- Each listener is given the params `context`, `file` and our `mocha` instance
- So `on("EVENT_FILE_PRE_REQUIRE")` => `context.after = ...`, `context.describe = ...`,  `context.it = ...`
- `describe()` creates and returns a new `Suite` via `suite.create()`
- `it()` creates and returns a new `Test` via `new Test()`

### Execution phase

- Build single array of all files to run
- Load ESM and CJS files async, emitting event before/after file required
- Run our mocha instance

#### mocha.run 

- Create instance of a `Runner`, add stats collecting
- Create instance of a Reporter via `new this._reporter(runner)` using the `Runner`

## Scripts

    npm run help
    npm run test
