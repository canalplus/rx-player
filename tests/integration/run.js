/* eslint-env node */

const path = require("path");
const karma = require("karma");
const parseConfig = karma.config.parseConfig;
const Server = karma.Server;
const TestContentServer = require("../contents/server");
const generateTestWebpackConfig = require("../generate_test_webpack_config");

const CONTENT_SERVER_PORT = 3000;

const argv = process.argv;
if (argv.includes("-h") || argv.includes("--help")) {
  displayHelp();
  process.exit(0);
}

const coverage = !!argv.includes("--coverage");
const singleRun = !argv.includes("--watch");

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

const webpackConfig = generateTestWebpackConfig({
  coverage,
  contentServerInfo: { url: "127.0.0.1", port: CONTENT_SERVER_PORT },
});

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
  frameworks: ["webpack", "mocha"],
  plugins: [
    "karma-chrome-launcher",
    "karma-coverage-istanbul-reporter",
    "karma-firefox-launcher",
    "karma-mocha",
    "karma-webpack"
  ],
  webpack: webpackConfig,
  webpackMiddleware: { stats: { colors: true, chunks: false } },
  preprocessors: {
    [path.resolve(__dirname, "./scenarios/**/*.js")]: ["webpack"],
  },
  files: [
    {
      pattern: path.resolve(__dirname, "./scenarios/**/*.js"),
      watched: false,
    }
  ],
  client: {
    captureConsole: true,
    mocha: { reporter: "html" },
  },
};

if (coverage) {
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

const testContentServer = TestContentServer(CONTENT_SERVER_PORT);
parseConfig(
  null,
  karmaConf,
  { promiseConfig: true, throwErrors: true }
).then((parsedConfig) => {
  const server = new Server(parsedConfig, function(exitCode) {
    testContentServer.close();
    process.exit(exitCode);
  });
  server.start();
}, (rejectReason) => {
  /* eslint-disable-next-line no-console */
  console.error("Karma config rejected:", rejectReason);
});

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
