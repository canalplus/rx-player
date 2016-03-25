const { AbstractSourceBuffer } = require("./sourcebuffer");

class ImageSourceBuffer extends AbstractSourceBuffer {
  constructor(video, codec) {
    super(codec);
    this.video = video;
    this.codec = codec;
  }

  _append() {
    // TODO: handle live case
    // we suppose here the first
    // receive bsi includes all images
    this.buffered.insert(0, 0, Infinity);
  }

  _remove() {
  }

  _abort() {
  }
}

module.exports = ImageSourceBuffer;