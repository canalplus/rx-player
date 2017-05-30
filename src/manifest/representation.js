import generateNewId from "../utils/id.js";

import RepresentationIndex from "./representation_index.js";

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
  /**
   * @constructor
   * @param {Object} [args={}]
   * @param {string|Number} [args.rootId]
   * @param {string|Number} [args.id]
   * @param {Number} args.bitrate
   * @param {string} args.codecs
   * @param {Number} args.height
   * @param {Number} args.height
   * @param {string} args.mimeType
   * @param {Object} args.index
   */
  constructor(args = {}) {
    const nId = generateNewId();
    this.id =
      (args.rootId == null ? "" : args.rootId + "_") +
      (args.id == null ? nId : args.id);
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

    this.baseURL = args.baseURL;

    // Most of those are for the smooth init segment
    if (args.codecPrivateData != null) {
      this._codecPrivateData = args.codecPrivateData;
    }
    if (args.channels != null) {
      this._channels = args.channels;
    }
    if (args.bitsPerSample != null) {
      this._bitsPerSample = args.bitsPerSample;
    }
    if (args.packetSize != null) {
      this._packetSize = args.packetSize;
    }
    if (args.samplingRate != null) {
      this._samplingRate = args.samplingRate;
    }

    // this._audioSamplingRate = args.audioSamplingRate;
    // this._codingDependency = args.codingDependency;
    // this._frameRate = args.frameRate;
    // this._maxPlayoutRate = args.maxPlayoutRate;
    // this._maximumSAPPeriod = args.maximumSAPPeriod;
    // this._profiles = args.profiles;
    // this._segmentProfiles = args.segmentProfiles;
  }
}

export default Representation;
