import Segment from "../segment.js";
import { normalizeRange } from "./helpers.js";

export default {
  getSegments(repId, index, _up, _to) {
    const { up, to } = normalizeRange(index, _up, _to);

    const { duration, startNumber, timescale } = index;

    const segments = [];
    for (let time = up; time <= to; time += duration) {
      const number = Math.floor(time / duration) +
        (startNumber == null ? 1 : startNumber);
      const time = number * duration;

      const args = {
        id: "" + repId + "_" + number,
        number: number,
        time: time,
        init: false,
        duration: duration,
        range: null,
        indexRange: null,
        timescale,
      };
      segments.push(new Segment(args));
    }

    return segments;
  },

  shouldRefresh() {
    return false;
  },
};
