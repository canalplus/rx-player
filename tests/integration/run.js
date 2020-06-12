/* eslint-env node */

const path = require("path");
const Server = require("karma").Server;
const TestContentServer = require("../contents/server");
const webpackConfig = require("../../webpack-tests.config.js");

const argv = process.argv;
if (argv.includes("-h") || argv.includes("--help")) {
  displayHelp();
  process.exit(0);
}

const coverageIsWanted = argv.includes("--coverage") ?
  true :
  !!process.env.RXP_COVERAGE;

const singleRun = argv.includes("--watch") ?
  false :
  !process.env.RXP_TESTS_WATCH;

const browsers = [];
if (argv.includes("--bchrome")) {
  browsers.push("ChromeAutoPlay");
}
if (argv.includes("--bchromehl")) {
  browsers.push("ChromeHeadlessAutoPlay");
}
if (argv.includes("--bfirefoxhl")) {
  browsers.push("FirefoxHeadlessAutoPlay");
}

if (browsers.length === 0) {
  displayHelp();
  process.exit(0);
}

const karmaConf = {
  basePath: ".",
  browsers: browsers,
  customLaunchers: {
    ChromeHeadlessAutoPlay: {
      base: "ChromeHeadless",
      flags: [ "--autoplay-policy=no-user-gesture-required" ],
    },
    FirefoxHeadlessAutoPlay: {
      base: "FirefoxHeadless",
      prefs: {
        "media.autoplay.default": 0,
        "media.autoplay.enabled.user-gestures-needed": false,
        "media.autoplay.block-webaudio": false,
        "media.autoplay.ask-permission": false,
        "media.autoplay.block-event.enabled": false,
        "media.block-autoplay-until-in-foreground": false,
      },
    },
    ChromeAutoPlay: {
      base: "Chrome",
      flags: [ "--autoplay-policy=no-user-gesture-required" ],
    },
  },
  singleRun,
  reporters: ["dots"],
  frameworks: ["mocha"],
  webpack: webpackConfig,
  webpackMiddleware: { stats: { colors: true, chunks: false } },
  preprocessors: {
    [path.resolve(__dirname, "./index.js")]: "webpack",
  },
  files: [
    path.resolve(__dirname, "./index.js"),
  ],
  client: {
    captureConsole: true,
    mocha: { reporter: "html" },
  },
};

if (coverageIsWanted) {
  karmaConf.reporters.push("coverage-istanbul");
  karmaConf.coverageIstanbulReporter = {
    reports: [ "html", "text-summary" ],
    dir: path.join(__dirname, "coverage"),
    fixWebpackSourcePaths: true,
    "report-config": {
      html: { outdir: "html" },
    },
  };
}

const testContentServer = TestContentServer(3000);
const server = new Server(karmaConf, function(exitCode) {
  testContentServer.close();
  process.exit(exitCode);
});
server.start();

function displayHelp() {
  /* eslint-disable no-console */
  console.log(
  /* eslint-disable indent */
`Usage: node run.js [options]
Options:
  -h, --help    Display this help
  --bchrome     Launch tests on Chrome
  --bchromehl   Launch tests on headless Chrome
  --bfirefoxhl  Launch tests on headless Firefox
  --coverage    Add coverage report
  --watch       Re-run tests on modifications`,
  /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
