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

import log from "../../../../log";
import {
  IRepresentationIndex,
  ISegment,
} from "../../../../manifest";
import { createIndexURL } from "../helpers";
import {
  getInitSegment,
  getTimescaledRange,
} from "./helpers";

// index property defined for a SegmentList RepresentationIndex
export interface IListIndex {
  timescale : number; // timescale to convert a time given here into seconds.
                      // This is done by this simple operation:
                      // ``timeInSeconds = timeInIndex * timescale``
  duration : number; // duration of each element in the timeline, in the
                     // timescale given (see timescale and timeline)
  list: Array<{ // List of Segments for this index
    mediaURL : string; // URL of the segment
    mediaRange? : [number, number]; // possible byte-range of the segment
  }>;
  indexTimeOffset : number; // Temporal offset, in the current timescale (see
                            // timescale), to add to the presentation time
                            // (time a segment has at decoding time) to
                            // obtain the corresponding media time (original
                            // time of the media segment in the index and on
                            // the media file).
                            // For example, to look for a segment beginning at
                            // a second `T` on a HTMLMediaElement, we
                            // actually will look for a segment in the index
                            // beginning at:
                            // ``` T * timescale + indexTimeOffset ```

  initialization? : { // informations on the initialization segment
    mediaURL: string; // URL to access the initialization segment
    range?: [number, number]; // possible byte range to request it
  };
  indexRange?: [number, number]; // byte range for a possible index of segments
                                 // in the server
}

// `index` Argument for a SegmentList RepresentationIndex
// Most of the properties here are already defined in IListIndex.
export interface IListIndexIndexArgument {
  duration : number;
  list: Array<{
    media? : string;
    mediaRange? : [number, number];
  }>;
  timescale : number;

  indexRange?: [number, number];
  initialization?: { media? : string; range?: [number, number] };
  presentationTimeOffset?: number;
}

// Aditional argument for a SegmentList RepresentationIndex
export interface IListIndexContextArgument {
  periodStart : number; // Start of the period concerned by this
                        // RepresentationIndex, in seconds
  representationBaseURL : string; // Base URL for the Representation concerned
  representationId? : string; // ID of the Representation concerned
  representationBitrate? : number; // Bitrate of the Representation concerned
}

/**
 * Provide helpers for SegmentList-based DASH indexes.
 * @type {Object}
 */
export default class ListRepresentationIndex implements IRepresentationIndex {
  protected _periodStart : number;
  private _index : IListIndex;

  /**
   * @param {Object} index
   * @param {Object} context
   */
  constructor(index : IListIndexIndexArgument, context : IListIndexContextArgument) {
    const {
      periodStart,
      representationBaseURL,
      representationId,
      representationBitrate,
    } = context;

    this._periodStart = periodStart;
    const presentationTimeOffset = index.presentationTimeOffset != null ?
      index.presentationTimeOffset : 0;
    const indexTimeOffset = presentationTimeOffset - periodStart * index.timescale;

    this._index = {
      list: index.list.map((lItem) => ({
        mediaURL: createIndexURL(
          representationBaseURL,
          lItem.media,
          representationId,
          representationBitrate
        ),
        mediaRange: lItem.mediaRange,
      })),
      timescale: index.timescale,
      duration: index.duration,
      indexTimeOffset,
      indexRange: index.indexRange,
      initialization: index.initialization && {
        mediaURL: createIndexURL(
          representationBaseURL,
          index.initialization.media,
          representationId,
          representationBitrate
        ),
        range: index.initialization.range,
      },
    };
  }

  /**
   * Construct init Segment.
   * @returns {Object}
   */
  getInitSegment() : ISegment {
    return getInitSegment(this._index);
  }

  /**
   * @param {Number} fromTime
   * @param {Number} duration
   * @returns {Array.<Object>}
   */
  getSegments(fromTime : number, dur : number) : ISegment[] {
    const index = this._index;
    const fromTimeInPeriod = fromTime + this._periodStart;
    const { up, to } = getTimescaledRange(index, fromTimeInPeriod, dur);

    const { duration, list, timescale } = index;
    const length = Math.min(list.length - 1, Math.floor(to / duration));
    const segments : ISegment[] = [];
    let i = Math.floor(up / duration);
    while (i <= length) {
      const range = list[i].mediaRange;
      const mediaURL = list[i].mediaURL;
      const args = {
        id: "" + i,
        time: i * duration,
        isInit: false,
        range,
        duration,
        timescale,
        mediaURL,
        timestampOffset: -(index.indexTimeOffset / timescale),
      };
      segments.push(args);
      i++;
    }
    return segments;
  }

  /**
   * Returns true if, based on the arguments, the index should be refreshed.
   * (If we should re-fetch the manifest)
   * @param {Number} _fromTime
   * @param {Number} toTime
   * @returns {Boolean}
   */
  shouldRefresh(_fromTime : number, toTime : number) : boolean {
    const {
      timescale,
      duration,
      list,
    } = this._index;

    const scaledTo = toTime * timescale;
    const i = Math.floor(scaledTo / duration);
    return !(i >= 0 && i < list.length);
  }

  /**
   * Returns first position in index.
   * @returns {Number}
   */
  getFirstPosition() : number {
    return this._periodStart;
  }

  /**
   * Returns last position in index.
   * @returns {Number}
   */
  getLastPosition() : number {
    const index = this._index;
    const { duration, list } = index;
    return ((list.length * duration) / index.timescale) + this._periodStart;
  }

  /**
   * We do not check for discontinuity in SegmentList-based indexes.
   * @returns {Number}
   */
  checkDiscontinuity() : -1 {
    return -1;
  }

  /**
   * @param {Object} newIndex
   */
  _update(newIndex : ListRepresentationIndex) : void {
    this._index = newIndex._index;
  }

  /**
   * We do not have to add new segments to SegmentList-based indexes.
   * @returns {Array}
   */
  _addSegments() : void {
    if (__DEV__) {
      log.warn("Tried to add Segments to a list RepresentationIndex");
    }
  }
}
