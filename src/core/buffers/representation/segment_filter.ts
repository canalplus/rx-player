/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import config from "../../../config";
import log from "../../../log";
import {
  Adaptation,
  ISegment,
  Period,
  Representation,
} from "../../../manifest";
import { mergeContiguousRanges } from "../../../utils/ranges";
import SimpleSet from "../../../utils/simple_set";
import SegmentBookkeeper from "../segment_bookkeeper";

const {
  BITRATE_REBUFFERING_RATIO,
  MINIMUM_SEGMENT_SIZE,
} = config;

type IAdaptationType = "video"|"audio"|"text"|"image"|"overlay";

/**
 * Get all adaptations from a given period
 * @param {Object} period
 * @param {Function} getSegmentBookkeeper
 * @returns {Object}
 */
function getEnforcedAdaptationsFromPeriod(
  period: Period,
  getSegmentBookkeeper: (type: IAdaptationType) => SegmentBookkeeper|undefined
): Array<{ adaptation: Adaptation; segments: Array<{ start: number; end: number }> }> {
  return ["audio", "video", "text", "image", "overlay"]
    .reduce((acc: Array<{
      adaptation: Adaptation;
      segments: Array<{ start: number; end: number }>;
    }>, type) => {
      const adaptationsByType =
        period.adaptations[type as "video"|"audio"|"text"|"image"|"overlay"];
      if (adaptationsByType && adaptationsByType.length) {
        const enforcedAdaptationsByType = adaptationsByType
          .filter(({ isEnforced }) => isEnforced)
          .map((_a) => {
            const sb = getSegmentBookkeeper(_a.type);
            const segments = sb ? sb.inventory.filter(({ infos }) => {
              return infos.adaptation.id === _a.id;
            }) : [];

            return {
              adaptation: _a,
              segments,
            };
          });
        if (enforcedAdaptationsByType && enforcedAdaptationsByType.length) {
          acc.push(...enforcedAdaptationsByType);
        }
      }
      return acc;
    }, []);
}

/**
 * Returns true if the given Segment should be downloaded.
 * false otherwise.
 *
 * @param {Object} segment
 * @param {Object} content - The content the Segment depends on.
 * @param {Object} segmentBookkeeper
 * @param {Object} wantedRange
 * @param {Object} segmentIDsToIgnore
 * @returns {boolean}
 */
export default function shouldDownloadSegment(
  segment : ISegment,
  content: {
    period : Period;
    adaptation : Adaptation;
    representation : Representation;
  },
  segmentBookkeeper: SegmentBookkeeper,
  wantedRange : { start : number; end : number },
  segmentIDsToIgnore : SimpleSet,
  getSegmentBookkeeper : (type: IAdaptationType) => SegmentBookkeeper|undefined
) : boolean {
  const { period, adaptation, representation } = content;
  const shouldIgnore = segmentIDsToIgnore.test(segment.id);

  if (shouldIgnore) {
    return false;
  }
  const enforcedAdaptations =
    getEnforcedAdaptationsFromPeriod(period, getSegmentBookkeeper);
  const enforcedTracksOutOfCurrent = enforcedAdaptations
    .filter(({ adaptation: _adaptation }) => _adaptation.id !== adaptation.id);

  if (enforcedTracksOutOfCurrent) {
    for (let i = 0; i < enforcedTracksOutOfCurrent.length; i++) {

      const enforcedTrack = enforcedTracksOutOfCurrent[i];
      const loadedSegments = enforcedTrack.segments.slice();
      const bufferedRanges = mergeContiguousRanges(loadedSegments);
      const segmentStart = segment.time / segment.timescale;
      const segmentEnd =
        (segment.time + (segment.duration || 0)) / segment.timescale;
      const segments = enforcedTrack.adaptation.representations[0].index
        .getSegments(segmentStart, segmentEnd - segmentStart);

      if (segments.length) {
        const firstPos = segments[0].time;
        const endPos = segments[segments.length - 1].time +
          (segments[segments.length - 1].duration || 0);

        const hasBufferedForSegments = (() => {
          for (let k = 0; k < bufferedRanges.length; k++) {
            const range = bufferedRanges[k];
            if (range.start <= firstPos && range.end >= endPos) {
              return true;
            }
          }
          return false;
        })();

        if (!hasBufferedForSegments) {
          log.warn("Buffers: " + adaptation.type + " content will not update while " +
            "enforced track(s) is/are unaivalable");
          return false;
        }
      }
    }
  }

  // segment without time info are usually init segments or some
  // kind of metadata segment that we never filter out
  if (segment.isInit || segment.time < 0) {
    return true;
  }

  const { time, duration, timescale } = segment;
  if (!duration) {
    return true;
  }

  if (duration / timescale < MINIMUM_SEGMENT_SIZE) {
    return false;
  }

  const currentSegment =
    segmentBookkeeper.hasPlayableSegment(wantedRange, { time, duration, timescale });

  if (!currentSegment) {
    return true;
  }

  if (currentSegment.infos.period.id !== period.id) {
    // segments for later periods have the advantage here
    return period.start >= currentSegment.infos.period.start;
  }

  if (currentSegment.infos.adaptation.id !== adaptation.id) {
    return true;
  }

  // only re-load comparatively-poor bitrates for the same adaptation.
  const bitrateCeil = currentSegment.infos.representation.bitrate *
                      BITRATE_REBUFFERING_RATIO;

  return representation.bitrate > bitrateCeil;
}
