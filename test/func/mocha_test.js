/* eslint-env node */
/* eslint no-var: 0 */

var webdriver = require("selenium-webdriver");
var test = require("selenium-webdriver/testing");
var http = require("http");
var chrome = require("selenium-webdriver/chrome");
var firefox = require("selenium-webdriver/firefox");
var path = require("path");
var mkdirp = require("mkdirp");
var rimraf = require("rimraf");
var os = require("os");
var fs = require("fs");
var spawnSync = require("child_process").spawnSync;
var CHROME_BINARIES = process.env.CHROME_BINARIES;
var FIREFOX_BINARIES = process.env.FIREFOX_BINARIES;
var HTTP_PORT = process.env.MOCK_HTTP_PORT || 7654;
var indexFile = path.join(__dirname, "index.html");
var rxPlayerPayload = (
  "(function(exports) { " +
    fs.readFileSync("../../dist/rx-player.js", "utf-8") +
  " })(window)"
);
var tempProfileDir = path.join(os.tmpdir(), mktempName("selenium"));
var browsers = [];

function mktempName(prefix) {
  var tname = prefix || "";
  var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 6; i++) {
    tname += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tname;
}

function createProfileDir(name) {
  return mkdirp.sync(path.join(tempProfileDir, mktempName(name)));
}

function getBrowserVersion(path) {
  return spawnSync(path, ["--version"]).stdout.toString().trim();
}

function createHttpServer(done) {
  http.createServer((req, res) => {
    switch (req.url) {
    case "/":
      fs.createReadStream(indexFile).pipe(res);
      break;
    case "/rx-player.js":
      res.write(rxPlayerPayload);
      res.end();
      break;
    default:
      res.end();
      break;
    }
  })
    .listen(HTTP_PORT, done);
}


if (CHROME_BINARIES) {
  CHROME_BINARIES.split(":").forEach((binPath) => addBrowser("chrome", binPath));
}

if (FIREFOX_BINARIES) {
  FIREFOX_BINARIES.split(":").forEach((binPath) => addBrowser("firefox", binPath));
}

function addBrowser(type, path) {
  try {
    fs.statSync(path);
  } catch(e) {
    console.error("Could not find browser executable for", type, "in", path);
    process.exit(1);
    return;
  }
  browsers.push({ type: type, path: path });
}

test.before((done) => {
  createHttpServer(done);
});

function launcherTest(browser) {
  var driver;
  var browserPath = browser.path;
  var browserType = browser.type;

  var profileDir = createProfileDir(browserType);
  var version = getBrowserVersion(browserPath);

  test.describe("Testing on " + browserType + " - " + version, function() {
    this.timeout(30000);

    test.beforeEach(function(done) {

      var options;

      switch(browserType) {
      case "chrome":
        options = new chrome.Options();
        options.addArguments("user-data-dir=" + profileDir);
        options.addArguments("--no-sandbox"); // fix to run chrome without having root permissions (setuid needs)
        options.setChromeBinaryPath(browserPath);
        driver = new webdriver.Builder()
          .forBrowser(browserType)
          .withCapabilities(webdriver.Capabilities.chrome())
          .setChromeOptions(options)
          .build();
        driver
          .manage()
          .timeouts()
          .setScriptTimeout(100000);
        break;
      case "firefox":
        options = new firefox.Options();
        options.setBinary(browserPath);
        options.setProfile(profileDir);
        options.useMarionette(true);
        driver = new firefox.Driver(options);
        break;
      default:
        throw new Error("Browser type not supported (" + browserType + ")");
      }

      driver.get("http://localhost:" + HTTP_PORT)
        .then(() => driver.executeScript(rxPlayerPayload))
        .then(
          ( ) => done(),
          (e) => done(e));
    });

    test.afterEach(() => {
      if (driver && driver.quit) {
        driver.quit();
      }
    });

    test.it("should be defined and instantiated", function(done) {
      driver.executeScript(function() {
        var videoElement = document.getElementById("video");
        if (!videoElement) {
          throw new Error("missing <video> element");
        }
        if (!window.RxPlayer) {
          throw new Error("missing window.RxPlayer class in global scope");
        } else {
          new window.RxPlayer({ videoElement: videoElement });
        }
      })
        .then(
          ( ) => done(),
          (e) => done(e)
        );
    });

    test.it("should have the good states when launching a video *not* in autoPlay", function(done) {
      driver.executeAsyncScript(function(callback) {
        var player = new window.RxPlayer({ videoElement: document.getElementById("video") });
        var states = [player.getPlayerState()];

        function onPlayerStateChange(state) {
          states.push(state);
          if (state == "PAUSED") {
            if (states.join("|") != "STOPPED|LOADING|LOADED|PAUSED") {
              callback("wrong state pattern " + states.join("|"));
            } else {
              callback();
            }
          }
        }

        function onPlayerError(error) {
          callback(error.message);
        }

        player.addEventListener("playerStateChange", onPlayerStateChange);
        player.addEventListener("error", onPlayerError);
        player.loadVideo({
          "url": "http://hss-live-m3-aka.canal-plus.com/live/hss/alaune-hd/hd-clair.isml/Manifest",
          "transport": "smooth",
        });
      })
        .then(
          (val) => done(val),
          (err) => done(err));
    });

    test.it("should have the good states when launching a video in autoPlay", function(done) {
      driver.executeAsyncScript(function(callback) {
        var player = new window.RxPlayer({ videoElement: document.getElementById("video") });
        var states = [player.getPlayerState()];

        function onPlayerStateChange(state) {
          states.push(state);
          if (state == "PLAYING") {
            if (states.join("|") != "STOPPED|LOADING|LOADED|PLAYING") {
              callback("wrong state pattern " + states.join("|"));
            } else {
              callback();
            }
          }
        }

        function onPlayerError(error) {
          callback(error.message);
        }

        player.addEventListener("playerStateChange", onPlayerStateChange);
        player.addEventListener("error", onPlayerError);
        player.loadVideo({
          "url": "http://hss-live-m3-aka.canal-plus.com/live/hss/alaune-hd/hd-clair.isml/Manifest",
          "transport": "smooth",
          "autoPlay": true,
        });
      })
        .then(
          (val) => done(val),
          (err) => done(err));
    });

    test.it("should play", function(done) {
      driver.executeAsyncScript(function(callback) {
        var player = new window.RxPlayer({ videoElement: document.getElementById("video") });

        var states = [];

        function onPlayerStateChange(state) {
          states.push(state);

          if (state == "PAUSED") {
            player.play();
          }

          if (state == "PLAYING") {
            if (states.join("|") != "LOADING|LOADED|PAUSED|PLAYING") {
              callback("wrong state pattern " + states.join("|"));
            } else {
              callback();
            }
          }
        }

        function onPlayerError(error) {
          callback(error.message);
        }

        player.addEventListener("error", onPlayerError);
        player.addEventListener("playerStateChange", onPlayerStateChange);
        player.loadVideo({
          "url": "http://hss-live-m3-aka.canal-plus.com/live/hss/alaune-hd/hd-clair.isml/Manifest",
          "transport": "smooth",
        });
      })
        .then(
          (val) => done(val),
          (err) => done(err));
    });

    test.it("should pause", function(done) {
      driver.executeAsyncScript(function(callback) {
        var player = new window.RxPlayer({ videoElement: document.getElementById("video") });

        var states = [];

        function onPlayerStateChange(state) {
          states.push(state);

          if (state == "PLAYING") {
            player.pause();
          }

          if (state == "PAUSED") {
            if (states.join("|") != "LOADING|LOADED|PLAYING|PAUSED") {
              callback("wrong state pattern " + states.join("|"));
            } else {
              callback();
            }
          }
        }

        function onPlayerError(error) {
          callback(error.message);
        }

        player.addEventListener("error", onPlayerError);
        player.addEventListener("playerStateChange", onPlayerStateChange);
        player.loadVideo({
          "url": "http://hss-live-m3-aka.canal-plus.com/live/hss/alaune-hd/hd-clair.isml/Manifest",
          "transport": "smooth",
          "autoPlay": true,
        });
      })
        .then(
          (val) => done(val),
          (err) => done(err));
    });

    test.it("should stop", function(done) {
      driver.executeAsyncScript(function(callback) {
        var player = new window.RxPlayer({ videoElement: document.getElementById("video") });

        var states = [];

        function onPlayerStateChange(state) {
          states.push(state);

          if (state == "PLAYING") {
            player.stop();
          }

          if (state == "STOPPED") {
            if (states.join("|") != "LOADING|LOADED|PLAYING|STOPPED") {
              callback("wrong state pattern " + states.join("|"));
            } else {
              callback();
            }
          }
        }

        function onPlayerError(error) {
          callback(error.message);
        }

        player.addEventListener("error", onPlayerError);
        player.addEventListener("playerStateChange", onPlayerStateChange);
        player.loadVideo({
          "url": "http://hss-live-m3-aka.canal-plus.com/live/hss/alaune-hd/hd-clair.isml/Manifest",
          "transport": "smooth",
          "autoPlay": true,
        });
      })
        .then(
          (val) => done(val),
          (err) => done(err));
    });

    test.it("should have a playback", function(done) {
      driver.executeAsyncScript(function(callback) {
        var player = new window.RxPlayer({ videoElement: document.getElementById("video") });

        function onPlayerStateChange(state) {
          if (state == "PLAYING") {
            checkPlaybackChange();
          }
        }

        function checkPlaybackChange() {
          var currentTime = player.getCurrentTime();
          var now = currentTime;

          var i = 10;
          setInterval(function() {
            now = player.getCurrentTime();
            if (--i === 0 && now - currentTime >= 0) {
              callback();
            }
          }, 100);
        }

        player.addEventListener("playerStateChange", onPlayerStateChange);

        player.loadVideo({
          "url": "http://hss-live-m3-aka.canal-plus.com/live/hss/alaune-hd/hd-clair.isml/Manifest",
          "transport": "smooth",
          "autoPlay": true,
        });
      })
        .then(
          (val) => done(val),
          (err) => done(err));
    });
  });
}

browsers.forEach(launcherTest);

function cleanup() {
  if (tempProfileDir) {
    rimraf.sync(tempProfileDir);
  }
}

process.on("exit", function() {
  cleanup();
});

process.on("SIGINT", function() {
  cleanup();
  process.exit(1);
});

process.on("uncaughtException", function(e) {
  cleanup();
  console.log("Uncaught Exception...");
  console.log(e.stack);
  process.exit(1);
});
