const glob = require("glob");
const minimatch = require("minimatch");
const fs = require("fs");
const path = require("path");

// 2. Runners execution
async function runMocha(mocha, options) {
  const { spec = [] } = options;

  // if options.watch watchRun()

  // singleRun
  // collectFiles and lookupFiles here
  mocha.files = spec;
  await mocha.loadFilesAsync();
  return mocha.run(exitMochaLater);
}

// Exits Mocha when tests + code under test has finished execution (default)
const exitMochaLater = (code) => {
  process.on("exit", () => {
    process.exitCode = Math.min(code, 255);
  });
};

module.exports = runMocha;
