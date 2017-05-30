import Segment from "../segment.js";
import {
  normalizeRange,
  getInitSegment,
  setTimescale,
  scale,
} from "./helpers.js";

/**
 * NEEDED IN INDEX
 * duration
 * list []
 *   ?range
 * timescale
 */

const ListIndexHelpers = {
  getInitSegment,
  setTimescale,
  scale,

  /**
   * @param {string|Number} repId
   * @param {Object} index
   * @param {Number} _up
   * @param {Number} _to
   * @returns {Array.<Segment>}
   */
  getSegments(repId, index, _up, _to) {
    const { up, to } = normalizeRange(index, _up, _to);

    const { duration, list, timescale } = index;
    const length = Math.min(list.length - 1, Math.floor(to / duration));
    const segments = [];
    let i = Math.floor(up / duration);
    while (i <= length) {
      const range = list[i].range;
      const media = list[i].media;
      const args = {
        id: "" + repId + "_" + i,
        time: i * duration,
        init: false,
        range: range,
        duration: duration,
        indexRange: null,
        timescale,
        media,
      };
      segments.push(new Segment(args));
      i++;
    }
    return segments;
  },

  /**
   * Returns first position in index.
   * @returns {Number}
   */
  getFirstPosition() {
    return 0;
  },

  /**
   * Returns last position in index.
   * @returns {Number}
   */
  getLastPosition(index) {
    const { duration, list } = index;
    return (list.length * duration) / index.timescale;
  },

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * (If we should re-fetch the manifest)
   * @returns {Boolean}
   */
  shouldRefresh(index, time, up, to) {
    const {
      timescale,
      duration,
      list,
      presentationTimeOffset = 0,
    } = index;

    const scaledTo = to * timescale - presentationTimeOffset;
    const i = Math.floor(scaledTo / duration);
    return !(i >= 0 && i < list.length);
  },

  _addSegmentInfos() {
    return false;
  },

  checkDiscontinuity() {
    return -1;
  },
};

export default ListIndexHelpers;
