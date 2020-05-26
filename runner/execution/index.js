const glob = require("glob");
const minimatch = require("minimatch");
const fs = require("fs");
const path = require("path");

// 2. Runners execution
async function runMocha(mocha, options) {
  const { file = [], spec = [] } = options;

  // if options.watch watchRun()

  // singleRun
  const files = collectFiles({ file, spec });
  mocha.files = files;
  await mocha.loadFilesAsync();
  return mocha.run(exitMochaLater);
}

// Exits Mocha when tests + code under test has finished execution (default)
const exitMochaLater = (code) => {
  process.on("exit", () => {
    process.exitCode = Math.min(code, 255);
  });
};

// lib/cli/collect-files.js
// Smash together an array of test files in the correct order
function collectFiles({ ignore, file, spec } = {}) {
  let files = [];
  spec.forEach((arg) => {
    files.push(arg);
  });
  if (!files.length) {
    console.error("Error: No test files found");
    process.exit(1);
  }
  return files;
}

module.exports = runMocha;
