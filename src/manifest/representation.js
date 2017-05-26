// const { Segment } = require("./segment.js");
const generateNewId = require("../utils/id.js");

const RepresentationIndex = require("./representation_index.js");

/**
 * Normalized Representation structure.
 *
 * API Public Properties:
 *   - id {string|Number}
 *   - bitrate {Number}
 *   - codec {string}
 *   - height {Number|undefined}
 *   - width {Number|undefined}
 *   - mimeType {Number|undefined}
 *
 * API Public Methods:
 *   - getSegments () => {[]Segment}
 */
class Representation {
  constructor(args = {}) {
    const nId = generateNewId();
    this.id = args.id == null ? nId : "" + args.id;
    this.bitrate = args.bitrate;
    this.codec = args.codecs;

    if (args.height != null) {
      this.height = args.height;
    }

    if (args.width != null) {
      this.width = args.width;
    }

    if (args.mimeType != null) {
      this.mimeType = args.mimeType;
    }

    this.index = new RepresentationIndex({
      index: args.index,
      rootId: this.id,
    });

    // Most of those are for the smooth init segment
    // this._audioSamplingRate = args.audioSamplingRate;
    // this._codingDependency = args.codingDependency;
    // this._frameRate = args.frameRate;
    // this._maxPlayoutRate = args.maxPlayoutRate;
    // this._channels = args.channels;
    // this._bitsPerSample = args.bitsPerSample;
    // this._packetSize = args.packetSize;
    // this._samplingRate = args.samplingRate;
    // this._codecPrivateData = args.codecPrivateData;
    // this._smoothProtection = args.smoothProtection;
    // this._maximumSAPPeriod = args.maximumSAPPeriod;
    // this._profiles = args.profiles;
    // this._segmentProfiles = args.segmentProfiles;
  }
}

module.exports = {
  Representation,
};
