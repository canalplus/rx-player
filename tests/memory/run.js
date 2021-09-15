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

const singleRun = !argv.includes("--watch");

const browsers = [];
if (argv.includes("--bchrome")) {
  browsers.push("ChromeMemory");
}
if (argv.includes("--bchromehl")) {
  browsers.push("ChromeHeadlessMemory");
}

if (browsers.length === 0) {
  displayHelp();
  process.exit(0);
}

const webpackConfig = generateTestWebpackConfig({
  contentServerInfo: { url: "127.0.0.1", port: CONTENT_SERVER_PORT },
});

const karmaConf = {
  basePath: "",
  browserNoActivityTimeout: 10 * 60 * 1000,
  browsers,
  customLaunchers: {
    ChromeMemory: {
      base: "Chrome",
      flags: [
        "--autoplay-policy=no-user-gesture-required",
        "--enable-precise-memory-info",
        "--js-flags=\"--expose-gc\"",
      ],
    },
    ChromeHeadlessMemory: {
      base: "ChromeHeadless",
      flags: [
        "--autoplay-policy=no-user-gesture-required",
        "--enable-precise-memory-info",
        "--js-flags=\"--expose-gc\"",
      ],
    },
  },
  singleRun,
  reporters: ["progress"],
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
    [path.resolve(__dirname, "./index.js")]: ["webpack"],
  },
  files: [ path.resolve(__dirname, "./index.js") ],
  client: {
    mocha: { reporter: "html" },
  },
};

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

/**
 * Display through `console.log` an helping message relative to how to run this
 * script.
 */
function displayHelp() {
  /* eslint-disable no-console */
  console.log(
  /* eslint-disable indent */
`Usage: node run.js [options]
Options:
  -h, --help    Display this help
  --bchrome     Launch tests on Chrome
  --bchromehl   Launch tests on headless Chrome`,
  /* eslint-enable indent */
  );
  /* eslint-enable no-console */
}
