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

import log from "../../../log";
import {
  IRepresentationIndex,
  ISegment,
} from "../../../manifest";
import {
  ILocalIndex,
  ILocalIndexSegment,
} from "./types";

/**
 * @param {Object} index
 * @param {string} representationId
 * @returns {Object}
 */
export default function createRepresentationIndex(
  index : ILocalIndex,
  representationId : string,
  isFinished : boolean
) : IRepresentationIndex {
  return {
    /**
     * @returns {Object}
     */
    getInitSegment() : ISegment|null {
      return {
        id: `${representationId}_init`,
        isInit: true,
        time: 0,
        duration: 0,
        timescale: 1,
        mediaURL: null,
        privateInfos: {
          localManifestInitSegment: { load: index.loadInitSegment } },
      };
    },

    /**
     * @param {Number} up
     * @param {Number} duration
     * @returns {Array.<Object>}
     */
    getSegments(up : number, duration : number) : ISegment[] {
      const startTime = up;
      const endTime = up + duration;
      const wantedSegments : ILocalIndexSegment[] = [];
      for (let i = 0; i < index.segments.length; i++) {
        const segment = index.segments[i];
        const segmentStart = segment.time / segment.timescale;
        if (endTime <= segmentStart) {
          break;
        }
        const segmentEnd = (segment.time + segment.duration) / segment.timescale;
        if (segmentEnd > startTime) {
          wantedSegments.push(segment);
        }
      }

      return wantedSegments
        .map(wantedSegment => {
          return {
            id: `${representationId}_${wantedSegment.time}`,
            isInit: false,
            time: wantedSegment.time,
            duration: wantedSegment.duration,
            timescale: wantedSegment.timescale,
            mediaURL: null,
            privateInfos: {
              localManifestSegment: { load: index.loadSegment,
                                      segment: wantedSegment },
            },
          };
        });
    },

    /**
     * @returns {Number|undefined}
     */
    getFirstPosition() : number|undefined {
      if (index.segments.length === 0) {
        return undefined;
      }
      return index.segments[0].time;
    },

    /**
     * @returns {Number|undefined}
     */
    getLastPosition() : number|undefined {
      if (index.segments.length === 0) {
        return undefined;
      }
      return index.segments[index.segments.length - 1].time;
    },

    /**
     * @returns {Boolean}
     */
    shouldRefresh() : false {
      return false;
    },

    /**
     * @returns {Boolean}
     */
    isSegmentStillAvailable() : true {
      return true;
    },

    isFinished() : boolean {
      return isFinished;
    },

    /**
     * @returns {Boolean}
     */
    canBeOutOfSyncError() : false {
      return false;
    },

    /**
     * @returns {Number}
     */
    checkDiscontinuity() : -1 {
      return -1;
    },

    _update() : void {
      if (__DEV__) {
        log.warn("Tried to update a local Manifest RepresentationIndex");
      }
    },

    _addSegments() : void {
      if (__DEV__) {
        log.warn("Tried to add Segments to a local Manifest RepresentationIndex");
      }
    },
  };
}
