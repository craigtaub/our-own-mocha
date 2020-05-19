# our-own-mocha

- CJS as core does not support ESM natively yet.
- accepts ESM for test files.

## Features

- suites + tests
- hooks
- reporter + ui
- NO: timers, slow

## 3 parts:

### 1. Mocha

- entities required for a test runner 

### 2. Parsing phase

- goal to build a coherent CLI
- found in `cli`
- uses Prototype so can chain in ES5-friendly way

### 3. Execution phase

- relies on mocha instance from parsing phase
- creates instance of a Runnable

## Scripts

`npm run help`
`npm run test`
