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
  /**
   * @constructor
   * @param {Object} [args={}]
   * @param {string|Number} [args.id]
   * @param {string} args.type
   * @param {string} [args.language]
   * @param {string} [args.language]
   * @param {Array.<string>} [args.accessibility]
   * @param {Array.<Object>} args.representations
   * @param {Object} [args.contentProtection]
   * @param {Boolean} args.manual
   */
  constructor(args = {}) {
    const nId = generateNewId();
    this.id = args.id == null ? nId : "" + args.id;
    this.type = args.type || "";
    this.representations = Array.isArray(args.representations) ?
      args.representations
        .map(r => new Representation(Object.assign({ rootId: this.id }, r)))
        .sort((a, b) => a.bitrate - b.bitrate) : [];

    if (args.language != null) {
      this.language = args.language;
    } else if (args.language != null) {
      this.language = args.language;
    }

    // XXX TODO choose one or the other
    const { accessibility } = args;
    if (Array.isArray(accessibility)) {
      if (accessibility.includes("audioDescription")) {
        this.isAudioDescription = true;
      }

      if (accessibility.includes("closedCaption")) {
        this.isClosedCaption = true;
      }
    }
    if (args.closedCaption != null) {
      this.isClosedCaption = args.closedCaption;
    }
    if (args.audioDescription != null) {
      this.isAudioDescription = args.audioDescription;
    }

    // TODO rename both protectionData?
    if (args.contentProtection != null) {
      this.contentProtection = args.contentProtection;
    }
    if (args.smoothProtection != null) {
      this._smoothProtection = args.smoothProtection;
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

  getRepresentation(wantedId) {
    return this.representations
      .find(({ id }) => wantedId === id);
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
