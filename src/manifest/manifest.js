const { Adaptation } = require("./adaptation.js");
const generateNewId = require("../utils/id.js");

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
    this.uris = args.locations;

    // --------- private data
    this._duration = args.duration;

    // Will be needed here
    // this.suggestedPresentationDelay = args.suggestedPresentationDelay;
    // this.availabilityStartTime = args.availabilityStartTime;
    // this.presentationLiveGap = args.presentationLiveGap;
    // this.timeShiftBufferDepth = args.timeShiftBufferDepth;
  }

  /**
   * @returns {Number}
   */
  getDuration() {
    return this._duration;
  }
}

module.exports = { Manifest };
