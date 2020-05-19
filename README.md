# our-own-mocha

- CJS as core does not support ESM natively yet.

## 3 parts:

### 1. Mocha

- entities required for a test runner 

### 2. Parsing phase

- goal to build a coherent CLI
- found in `cli`
- uses Prototype so can chain in ES5-friendly way

### 3. Execution phase

- relies on mocha instance from parsing phase

## Scripts

`npm run help`
`npm run test`
