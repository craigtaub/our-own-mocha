const glob = require("glob");
const minimatch = require("minimatch");
const fs = require("fs");
const path = require("path");

// 2. Runners execution
async function runMocha(mocha, options) {
  const {
    extension = ['js', 'cjs', 'mjs'],
    exit = false,
    ignore = [],
    file = [],
    recursive = false,
    sort = false,
    spec = [],
  } = options;

  const fileCollectParams = {
    ignore,
    extension,
    file,
    recursive,
    sort,
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
    try {
      newFiles = lookupFiles(arg, extension, recursive);
    } catch (err) {
      if (err.code === 'ERR_MOCHA_NO_FILES_MATCH_PATTERN') {
        unmatched.push({ message: err.message, pattern: err.pattern });
        return;
      }

      throw err;
    }

    if (typeof newFiles !== 'undefined') {
      if (typeof newFiles === 'string') {
        newFiles = [newFiles];
      }
      newFiles = newFiles.filter(fileName =>
        ignore.every(pattern => !minimatch(fileName, pattern))
      );
    }

    files = files.concat(newFiles);
  });

  const fileArgs = file.map(filepath => path.resolve(filepath));
  files = files.map(filepath => path.resolve(filepath));

  // ensure we don't sort the stuff from fileArgs; order is important!
  if (sort) {
    files.sort();
  }

  // add files given through --file to be ran first
  files = fileArgs.concat(files);
  if (!files.length) {
    // give full message details when only 1 file is missing
    const noneFoundMsg =
      unmatched.length === 1
        ? `Error: No test files found: ${JSON.stringify(unmatched[0].pattern)}` // stringify to print escaped characters raw
        : 'Error: No test files found';
    console.error(noneFoundMsg);
    process.exit(1);
  } else {
    // print messages as an warning
    unmatched.forEach(warning => {
      console.warn(`Warning: ${warning.message}`);
    });
  }

  return files;
};

// lib/utils.js
function lookupFiles(filepath, extensionnoneFoundMsgs, recursive) {
  let extensions = ['js', 'cjs', 'mjs'];
  function hasMatchingExtname(pathname, exts) {
    var suffix = path.extname(pathname).slice(1);
    return exts.some(function (element) {
      return suffix === element;
    });
  }
  function isHiddenOnUnix(pathname) {
    return path.basename(pathname)[0] === '.';
  }

  extensions = extensions || [];
  recursive = recursive || false;
  var files = [];
  var stat;

  if (!fs.existsSync(filepath)) {
    var pattern;
    if (glob.hasMagic(filepath)) {
      // Handle glob as is without extensions
      pattern = filepath;
    } else {
      // glob pattern e.g. 'filepath+(.js|.ts)'
      var strExtensions = extensions
        .map(function (v) {
          return '.' + v;
        })
        .join('|');
      pattern = filepath + '+(' + strExtensions + ')';
    }
    files = glob.sync(pattern, { nodir: true });
    if (!files.length) {
      throw new Error('Cannot find any files matching pattern ' + filepath);
    }
    return files;
  }

  // Handle file
  try {
    stat = fs.statSync(filepath);
    if (stat.isFile()) {
      return filepath;
    }
  } catch (err) {
    // ignore error
    return;
  }

  // Handle directory
  fs.readdirSync(filepath).forEach(function (dirent) {
    var pathname = path.join(filepath, dirent);
    var stat;

    try {
      stat = fs.statSync(pathname);
      if (stat.isDirectory()) {
        if (recursive) {
          files = files.concat(lookupFiles(pathname, extensions, recursive));
        }
        return;
      }
    } catch (err) {
      // ignore error
      return;
    }
    if (!extensions.length) {
      throw new Error('Argument %s required when argument %s is a directory');
    }

    if (
      !stat.isFile() ||
      !hasMatchingExtname(pathname, extensions) ||
      isHiddenOnUnix(pathname)
    ) {
      return;
    }
    files.push(pathname);
  });

  return files;
};

// lib/cli/run-helpers.js
// Modules to --require
const handleRequires = (requires = []) => {
  requires.forEach(mod => {
    let modpath = mod;
    if (fs.existsSync(mod, { cwd }) || fs.existsSync(`${mod}.js`, { cwd })) {
      modpath = path.resolve(mod);
    }
    require(modpath);
  });
};
// Used for `--reporter` and `--ui`.  Ensures there's only one, and asserts that it actually exists
const validatePlugin = (opts, pluginType, map = {}) => {
  const pluginId = opts[pluginType];
  if (Array.isArray(pluginId)) {
    throw Error(`"--${pluginType}" can only be specified once`)
  }

  // if this exists, then it's already loaded, so nothing more to do.
  if (!map[pluginId]) {
    try {
      opts[pluginType] = require(pluginId);
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND') {
        // Try to load reporters from a path (absolute or relative)
        try {
          opts[pluginType] = require(path.resolve(pluginId));
        } catch (err) {
          throw err; // custom in mocha
        }
      } else {
        throw err; // custom in mocha
      }
    }
  }
};

exports.runMocha = runMocha;
exports.handleRequires = handleRequires;
exports.validatePlugin = validatePlugin;
