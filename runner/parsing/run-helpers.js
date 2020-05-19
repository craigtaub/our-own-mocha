const fs = require("fs");
const path = require("path");

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

exports.handleRequires = handleRequires;
exports.validatePlugin = validatePlugin;
