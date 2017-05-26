import { AbstractSourceBuffer } from "./sourcebuffer";

class ImageSourceBuffer extends AbstractSourceBuffer {
  _append() {
    // TODO: handle live case.
    // We suppose here that the first received bsi includes all images
    this.buffered.insert(0 /* bitrate */, 0 /* start */, Infinity /* end */);
  }
}

export default ImageSourceBuffer;
