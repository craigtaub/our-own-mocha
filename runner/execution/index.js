const glob = require("glob");
const minimatch = require("minimatch");
const fs = require("fs");
const path = require("path");

// 2. Runners execution
async function runMocha(mocha, options) {
  const {
    extension = ['js', 'cjs', 'mjs'],
    exit = false,
    file = [],
    spec = [],
  } = options;

  const fileCollectParams = {
    extension,
    file,
    spec
  };

  // if options.watch
  // watchRun(mocha, { watchFiles, watchIgnore }, fileCollectParams);

  await singleRun(mocha, { exit }, fileCollectParams);
}
async function singleRun(mocha, { exit }, fileCollectParams) {
  const files = collectFiles(fileCollectParams);
  mocha.files = files;

  await mocha.loadFilesAsync();

  return mocha.run(exit ? exitMocha : exitMochaLater);
};

// Exits Mocha when tests + code under test has finished execution (default)
const exitMochaLater = code => {
  process.on('exit', () => {
    process.exitCode = Math.min(code, 255);
  });
};

// lib/cli/collect-files.js
// Smash together an array of test files in the correct order
function collectFiles({ ignore, extension, file, recursive, sort, spec } = {}) {
  let files = [];
  const unmatched = [];
  spec.forEach(arg => {
    let newFiles;
    newFiles = lookupFiles(arg, extension, recursive);
    files = files.concat(newFiles);
  });

  const fileArgs = file.map(filepath => path.resolve(filepath));

  // add files given through --file to be ran first
  files = fileArgs.concat(files);
  if (!files.length) {
    console.error('Error: No test files found');
    process.exit(1);
  }

  return files;
};

// lib/utils.js
function lookupFiles(filepath, extensionnoneFoundMsgs, recursive) {
  let extensions = ['js', 'cjs', 'mjs'];
  var files = [];
  var stat;

  if (!fs.existsSync(filepath)) {
    var pattern;
    pattern = filepath;
    files = glob.sync(pattern, { nodir: true });
    return files;
  }

  // Handle file
  stat = fs.statSync(filepath);
  if (stat.isFile()) {
    return filepath;
  }

  // Handle directory
};

module.exports = runMocha;
