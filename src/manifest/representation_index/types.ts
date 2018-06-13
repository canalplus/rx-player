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

import { ICustomError } from "../../errors";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import {
  ILocalManifestInitSegmentLoader,
  ILocalManifestSegmentLoader,
} from "../../parsers/manifest/local";

// privateInfos specific to Smooth Initialization Segments
export interface ISmoothInitSegmentPrivateInfos { codecPrivateData? : string;
                                                  bitsPerSample? : number;
                                                  channels? : number;
                                                  packetSize? : number;
                                                  samplingRate? : number;
                                                  protection? : {
                                                    keyId : Uint8Array;
                                                    keySystems : Array<{
                                                      systemId : string;
                                                      privateData : Uint8Array;
                                                    }>;
                                                  }; }

export interface IBaseContentInfos { manifest: Manifest;
                                     period: Period;
                                     adaptation: Adaptation;
                                     representation: Representation; }

export interface IMetaPlaylistPrivateInfos { transportType : string;
                                             baseContent : IBaseContentInfos;
                                             contentStart : number;
                                             contentEnd? : number; }

// privateInfos specific to local Manifest's init segments
export interface ILocalManifestInitSegmentPrivateInfos {
  load : ILocalManifestInitSegmentLoader;
}

// privateInfos specific to local Manifests
export interface ILocalManifestSegmentPrivateInfos {
  load : ILocalManifestSegmentLoader;
  segment : { time : number; duration : number; timescale : number };
}

export interface IPrivateInfos {
  smoothInit? : ISmoothInitSegmentPrivateInfos;
  metaplaylistInfos? : IMetaPlaylistPrivateInfos;
  localManifestInitSegment? : ILocalManifestInitSegmentPrivateInfos;
  localManifestSegment? : ILocalManifestSegmentPrivateInfos;
}

// ISegment Object.
// Represent a single Segment from a Representation.
export interface ISegment {
  duration : number; // Estimated duration of the segment, in timescale
  id : string; // ID of the Segment. Should be unique for this Representation
  isInit : boolean; // If true, this Segment contains initialization data
  mediaURL : string|null; // URL of the segment
  time : number; // Estimated time of beginning for the segment, in timescale
  timescale : number; // Timescale to convert time and duration into seconds

  indexRange? : [number, number]; // If set, the corresponding byte-range in the
                                  // downloaded Segment will contain an index
                                  // describing other Segments
                                  // TODO put in privateInfos?
  number? : number; // Optional number of the Segment
                    // TODO put in privateInfos?
  privateInfos? : IPrivateInfos; // Allows a RepresentationIndex to store
                                 // supplementary information in a given
                                 // Segment for later downloading/parsing
  range? : [number, number]; // Optional byte range to retrieve the Segment
  timestampOffset? : number; // Estimated time, in seconds, at which the
                             // concerned segment will be offseted when
                             // decoded.
}

export interface IRepresentationIndexSegmentInfos { duration : number;
                                                    time : number;
                                                    timescale : number; }

// Interface that should be implemented by any Representation's index
export default interface IRepresentationIndex {
  /**
   * Returns Segment object allowing to do the Init Segment request.
   * @returns {Object}
   */
  getInitSegment() : ISegment|null;

  /**
   * Returns an array of Segments needed for the amount of time given.
   * @param {number} up
   * @param {number} duration
   * @returns {Array.<Object>}
   */
  getSegments(up : number, duration : number) : ISegment[];

  /**
   * Returns true if, from the given situation, the manifest has to be refreshed
   * @param {number} up - Beginning timestamp of what you want
   * @param {number} to - End timestamp of what you want
   * @returns {Boolean}
   */
  shouldRefresh(up : number, to : number) : boolean;

  /**
   * Returns the starting time, in seconds, of the earliest segment currently
   * available.
   * Returns null if nothing is in the index
   * Returns undefined if we cannot know this value.
   * @returns {Number|null}
   */
  getFirstPosition() : number | null | undefined;

  /**
   * Returns the ending time, in seconds, of the last segment currently
   * available.
   * Returns null if nothing is in the index
   * Returns undefined if we cannot know this value.
   * @returns {Number|null|undefined}
   */
  getLastPosition() : number | null | undefined;

  /**
   * Returns true if a Segment returned by this index is still considered
   * available.
   * Returns false if it is not available anymore.
   * Returns undefined if we cannot know whether it is still available or not.
   * @param {Object} segment
   * @returns {Boolean|undefined}
   */
  isSegmentStillAvailable(segment : ISegment) : boolean | undefined;

  /**
   * Returns true if the Error given can indicate that the local index became
   * "unsynchronized" with the server.
   * Some transport cannot become unsynchronized and can return false directly.
   * Note: This API assumes that the user first checked that the segment is
   * still available through `isSegmentStillAvailable`.
   * @returns {Boolean}
   */
  canBeOutOfSyncError(error : ICustomError) : boolean;

  /**
   * Checks if the given time - in seconds - is in a discontinuity. That is:
   *   - We're on the upper bound of the current range (end of the range - time
   *     is inferior to the timescale)
   *   - The next range starts after the end of the current range.
   * @param {Number} _time
   * @returns {Number} - If a discontinuity is present, this is the Starting
   * time for the next (discontinuited) range. If not this is equal to -1.
   */
  checkDiscontinuity(time : number) : number;

  /**
   * Returns true if the last segments in this index have already been generated
   * so that we can freely go to the next period.
   * @returns {boolean}
   */
  isFinished() : boolean;

  /**
   * Update the index with another one, such as after a Manifest update.
   * TODO Both this and _addSegments mutate the index. They should not be
   * accessible like that.
   * Think of another implementation?
   * @param {Object} newIndex
   */
  _update(newIndex : IRepresentationIndex) : void;

  /**
   * Add new segments to the index, obtained through various other different
   * ways.
   * TODO Both this and _update mutate the index. They should not be accessible
   * like that.
   * Think of another implementation?
   * @param {Array.<Object>} nextSegments
   * @param {Object} currentSegment
   */
  _addSegments(
    nextSegments : Array<{ time : number;
                           duration : number;
                           timescale : number;
                           count? : number;
                           range? : [number, number]; }>,
    currentSegment? : { duration? : number;
                        time : number;
                        timescale? : number; }
  ) : void;
}
