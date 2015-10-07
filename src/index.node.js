var RxPlayer = require("./core/player");
var createFileSourceBuffer = require("./utils/node-fsbuffer");

RxPlayer.createMediaSource = require("./utils/mse-headless").createMediaSource;
RxPlayer.buffers = {
  createFileSourceBuffer
};
RxPlayer.compat = require("./compat/node");

module.exports = RxPlayer;
