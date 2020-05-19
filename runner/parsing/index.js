const yargs = require("yargs");
const yargsParser = require("yargs-parser");
const Mocha = require("../mocha");
const validatePlugin = require("./run-helpers").validatePlugin;
const handleRequires = require("./run-helpers").handleRequires;

// 1. Parsing phase
const parsingPhase = (runMocha) => {

  // lib/cli/options.js
  const YARGS_PARSER_CONFIG = {
    'combine-arrays': true,
    'short-option-groups': false,
    'dot-notation': false
  };

  // lib/mocharc.json
  const defaults = {
    diff: true,
    extension: ['js', 'cjs', 'mjs'],
    package: './package.json',
    reporter: 'spec',
    timeout: 2000,
    ui: 'bdd',
    'watch-ignore': ['node_modules', '.git'],
    R: 'spec',
    s: 75,
    t: 2000,
    timeouts: 2000,
    u: 'bdd'
  }


  // lib/cli/options loadOptions()
  const loadOptions = (argv = []) => {
    const parse = (args = []) => {
      const result = yargsParser.detailed(args);
      if (result.error) {
        console.error(`Error: ${result.error.message}`);
        process.exit(1);
      }
      return result.argv;
    };
    let args = parse(argv);
    // make unique
    args._ = Array.from(new Set(args._));
    return args;
  };

  // lib/cli/commands.js -> lib/cli/run.js
  const builder = (yargs) => {
    // cli/run.js builder()
    // Logical option groups
    const GROUPS = {
      FILES: 'File Handling',
      FILTERS: 'Test Filters',
      NODEJS: 'Node.js & V8',
      OUTPUT: 'Reporting & Output',
      RULES: 'Rules & Behavior',
      CONFIG: 'Configuration'
    };
    return yargs
      .options({
        config: {
          config: true,
          defaultDescription: '(nearest rc file)',
          description: 'Path to config file',
          group: GROUPS.CONFIG
        },
        reporter: {
          default: defaults.reporter,
          description: 'Specify reporter to use',
          group: GROUPS.OUTPUT,
          requiresArg: true
        },
        require: {
          defaultDescription: '(none)',
          description: 'Require module',
          group: GROUPS.FILES,
          requiresArg: true
        },
        timeout: {
          default: defaults.timeout,
          description: 'Specify test timeout threshold (in milliseconds)',
          group: GROUPS.RULES
        },
        ui: {
          default: defaults.ui,
          description: 'Specify user interface',
          group: GROUPS.RULES,
          requiresArg: true
        }
      })
      .check(argv => {
        // load requires first, because it can impact "plugin" validation
        handleRequires(argv.require);

        // validate reporter + ui
        validatePlugin(argv, 'reporter', Mocha.reporters);
        validatePlugin(argv, 'ui', Mocha.interfaces);

        return true;
      });
  }
  const handler = async function (argv) {
    const mocha = new Mocha(argv);

    try {
      // NEXT PHASE
      await runMocha(mocha, argv);
    } catch (err) {
      console.error('\n' + (err.stack || `Error: ${err.message || err}`));
      process.exit(1);
    }
  }
  const commands = {
    run: {
      command: ['$0 [spec..]', 'inspect'],
      describe: 'Run tests with Our-Mocha',
      builder,
      handler
    }
  }

  // lib cli/cli.js main()
  const argv = process.argv.slice(2)
  var args = loadOptions(argv);
  yargs()
    .scriptName('our_mocha')
    .command(commands.run)
    .updateStrings({
      'Positionals:': 'Positional Arguments',
      'Options:': 'Other Options',
      'Commands:': 'Commands'
    })
    .fail((msg, err, yargs) => {
      yargs.showHelp();
      const message = msg || err.message
      console.error(`\nERROR: ${message}`);
      process.exit(1);
    })
    .help('help', 'Show usage information & exit')
    .alias('help', 'h')
    .version('version', 'Show version number & exit', "1.0")
    .alias('version', 'V')
    .epilog(
      `Mocha Resources:
      Here: ...
      `
    )
    .parserConfiguration(YARGS_PARSER_CONFIG)
    .config(args)
    .parse(args._);
}

module.exports = parsingPhase;  // lib cli/cli.js main()
