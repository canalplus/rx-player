import Adaptation from "./adaptation.js";
import generateNewId from "../utils/id.js";

/**
 * Normalized Manifest structure.
 *
 * API Public Properties:
 *   - id {string|Number}
 *   - adaptations {Object}:
 *       adaptations.video {[]Adaptation|undefined}
 *       adaptations.audio {[]Adaptation|undefined}
 *       adaptations.text {[]Adaptation|undefined}
 *       adaptations.image {[]Adaptation|undefined}
 *       adaptations.other {[]adaptation|undefined}
 *   - periods {[]Object} TODO
 *   - isLive {Boolean}
 *   - uris {[]string}
 *   - transport {string}
 *
 * API Public Methods:
 *   - getDuration () => {Number} - Returns duration of the entire content, in s
 */
class Manifest {
  /**
   * @constructor
   * @param {Object} [args={}]
   * @param {string|Number} [args.id]
   * @param {string} args.transportType
   * @param {Array.<Object>} args.adaptations
   * @param {string} args.type
   * @param {Array.<string>} args.locations
   * @param {Number} args.duration
   */
  constructor(args = {}) {
    const nId = generateNewId();
    this.id = args.id == null ? nId : "" + args.id;
    this.transport = args.transportType || "";
    this.adaptations = args.adaptations ?
      Object.keys(args.adaptations).reduce((acc, val) => {
        acc[val] = args.adaptations[val].map(a => new Adaptation(a));
        return acc;
      }, {}) : [];

    // TODO Real period management
    this.periods = [
      {
        adaptations: this.adaptations,
      },
    ];

    this.isLive = args.type === "dynamic";
    this.uris = args.locations || [];

    // --------- private data
    this._duration = args.duration;

    // Will be needed here
    this.suggestedPresentationDelay = args.suggestedPresentationDelay;
    this.availabilityStartTime = args.availabilityStartTime;
    this.presentationLiveGap = args.presentationLiveGap;
    this.timeShiftBufferDepth = args.timeShiftBufferDepth;
  }

  /**
   * @returns {Number}
   */
  getDuration() {
    return this._duration;
  }

  getUrl() {
    return this.uris[0];
  }

  /**
   * @returns {Array.<Object>}
   */
  getAdaptations() {
    const adaptationsByType = this.adaptations;
    if (!adaptationsByType) {
      return [];
    }

    const adaptationsList = [];
    for (const type in adaptationsByType) {
      const adaptations = adaptationsByType[type];
      adaptationsList.push(...adaptations);
    }
    return adaptationsList;
  }

  getAdaptation(wantedId) {
    return this.getAdaptations()
      .find(({ id }) => wantedId === id);
  }

  updateLiveGap(delta) {
    if (this.isLive) {
      this.presentationLiveGap += delta;
    }
  }
}

export default Manifest;
