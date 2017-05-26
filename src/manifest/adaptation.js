import Representation from "./representation.js";
import generateNewId from "../utils/id.js";

/**
 * Normalized Adaptation structure.
 *
 * API Public Properties:
 *   - id {string|Number}:
 *   - type {string}
 *   - language {string|undefined}
 *   - isAudioDescription {Boolean|undefined}
 *   - isClosedCaption {Boolean|undefined}
 *   - representations {[]Representation}
 *
 * API Public Methods:
 *   - getAvailableBitrates () => {[]Number}
 */
class Adaptation {
  constructor(args = {}) {
    const nId = generateNewId();
    this.id = args.id == null ? nId : "" + args.id;
    this.type = args.type || "";
    this.representations = Array.isArray(args.representations) ?
      args.representations
        .map(r => new Representation(r))
        .sort((a, b) => a.bitrate - b.bitrate) : [];

    if (args.lang != null) {
      this.language = args.lang;
    } else if (args.language != null) {
      this.language = args.language;
    }

    const { accessibility } = args;
    if (Array.isArray(accessibility)) {
      if (accessibility.includes("audioDescription")) {
        this.isAudioDescription = true;
      }

      if (accessibility.includes("closedCaption")) {
        this.isClosedCaption = true;
      }
    }

    // for manual adaptations (not in the manifest)
    this.manual = args.manual;

    // ---------
    // this._rootURL = args.rootURL;
    // this._baseURL = args.baseURL;
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableBitrates() {
    return this.representations
      .map(r => r.bitrate);
  }

  /**
   * @param {Number} bitrate
   * @returns {Representation|null}
   */
  getRepresentationsForBitrate(bitrate) {
    return this.representations.filter(r => r.bitrate === bitrate) || null;
  }
}

export default Adaptation;
