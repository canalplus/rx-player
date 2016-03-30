const Levels = {
  NONE: 0,
  ERROR: 1,
  WARNING: 2,
  INFO: 3,
  DEBUG: 4,
};
const noop = function() {};

function log() {}
log.error = noop;
log.warn = noop;
log.info = noop;
log.debug = noop;
log.setLevel = function(level) {
  if (typeof level == "string") {
    level = Levels[level];
  }

  log.error = (level >= Levels.ERROR) ? console.error.bind(console) : noop;
  log.warn = (level >= Levels.WARNING) ? console.warn.bind(console) : noop;
  log.info = (level >= Levels.INFO) ? console.info.bind(console) : noop;
  log.debug = (level >= Levels.DEBUG) ? console.log.bind(console) : noop;
};

module.exports = log;
