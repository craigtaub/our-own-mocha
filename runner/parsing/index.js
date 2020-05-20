const yargs = require("yargs");
const yargsParser = require("yargs-parser");
const Mocha = require("../mocha");
const defaults = require("../mocha/defaults");

const parsingPhase = (runMocha) => {
  // lib/cli/commands.js -> lib/cli/run.js
  const builder = (yargs) => {
    // cli/run.js builder()
    return yargs
      .options({
        config: {
          config: true,
          description: "Path to config file",
        },
        reporter: {
          default: defaults.reporter,
          description: "Specify reporter to use",
          requiresArg: true,
        },
        ui: {
          default: defaults.ui,
          description: "Specify user interface",
          requiresArg: true,
        },
      })
      .check((argv) => {
        // lib/cli/run-helpers.js handleRequires
        // load --requires first, because it can impact "plugin" validation

        // lib/cli/run-helpers.js validatePlugin
        // validate `--reporter` and `--ui`.  Ensures there's only one, and asserts that it actually exists
        // Checks keys on Mocha.reporters + Mocha.interfaces

        return true;
      });
  };
  const handler = async function (argv) {
    const mocha = new Mocha(argv);

    try {
      // NEXT PHASE
      await runMocha(mocha, argv);
    } catch (err) {
      console.error("\n" + (err.stack || `Error: ${err.message || err}`));
      process.exit(1);
    }
  };
  const commands = {
    run: {
      command: ["$0 [spec..]", "inspect"],
      describe: "Run tests with Our-Mocha",
      builder,
      handler,
    },
  };

  // lib cli/cli.js main()
  const argv = process.argv.slice(2);
  // lib/cli/options loadOptions()
  var args = yargsParser.detailed(argv).argv;
  args._ = Array.from(new Set(args._));

  yargs()
    .scriptName("our_mocha")
    .command(commands.run)
    .fail((msg, err, yargs) => {
      yargs.showHelp();
      const message = msg || err.message;
      console.error(`\nERROR: ${message}`);
      process.exit(1);
    })
    .help("help", "Show usage information & exit")
    .version("version", "Show version number & exit", "1.0")
    .epilog("Mocha Resources: ...")
    .config(args)
    .parse(args._);
};

module.exports = parsingPhase; // lib cli/cli.js main()
