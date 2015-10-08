var RxPlayer = require("./core/player");
var createFileSourceBuffer = require("./buffers/fs-buffer");
var { MP4SourceBuffer, H264SourceBuffer } = require("./buffers/mp4");

RxPlayer.createHeadlessMediaSource = require("./compat/mse-headless");
RxPlayer.createNodeCompatibilityModule = require("./compat/node");
RxPlayer.buffers = {
  createFileSourceBuffer,
  MP4SourceBuffer,
  H264SourceBuffer,
};

module.exports = RxPlayer;
