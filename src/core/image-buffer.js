const { AbstractSourceBuffer } = require("./sourcebuffer");

class ImageSourceBuffer extends AbstractSourceBuffer {
  _append() {
    // TODO: handle live case we suppose here the first receive bsi
    // includes all images
    this.buffered.insert(0, 0, Infinity);
  }
}

module.exports = ImageSourceBuffer;
