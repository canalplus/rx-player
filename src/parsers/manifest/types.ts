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

import { IRepresentationIndex } from "../../manifest";

export interface IContentProtection {
  systemId? : string;
  keyId : Uint8Array;
}

// Representation of a "quality" available in any Adaptation
export interface IParsedRepresentation {
  // required
  bitrate : number;
  index : IRepresentationIndex;
  id: string;

  // optional
  codecs?: string;
  contentProtections? : IContentProtection[];
  frameRate?: string;
  height?: number;
  mimeType?: string;
  width?: number;
}

// Collection of multiple `Adaptation`, regrouped by type
export type IParsedAdaptations =
  Partial<Record<string, IParsedAdaptation[]>>;

// Representation of a "track" available in any Period
export interface IParsedAdaptation {
  // required
  id: string; // Unique ID for all Adaptation of that Period
  representations: IParsedRepresentation[]; // Qualities available for that Adaptation
  type: string; // `Type` of Adaptation (e.g. `audio`, `video`, `text`, `image`...)

  // optional
  audioDescription? : boolean; // Whether this Adaptation is an audio-track for
                               // the visually impaired
  closedCaption? : boolean; // Whether this Adaptation are closed caption for
                            // the hard of hearing
  language?: string; // Language the `Adaptation` is in, if it can be applied
}

// Representation of a given period of time in the Manifest
export interface IParsedPeriod {
  // required
  id : string; // Unique ID amongst Periods of the Manifest
  start : number; // Start time at which the Period begins.
                  // For static contents, the start of the first Period should
                  // corresponds to the time of the first available segment
  adaptations : IParsedAdaptations; // Available tracks for this Period

  // optional
  duration? : number; // duration of the Period (from the start to the end),
                      // in seconds.
                      // `undefined` if the Period is the last one and is still
                      // being updated
  end? : number; // end time at which the Period ends, in seconds.
                 // `undefined` if the Period is the last one and is still
                 // being updated
}

// Representation of the whole Manifest file
export interface IParsedManifest {
  // required
  id: string; // Unique ID for the manifest.
  isDynamic : boolean; // If true, this Manifest can still evolve
  isLive : boolean; // If true, this Manifest describes a "live" content
  periods: IParsedPeriod[]; // Periods contained in this manifest.
  transportType: string; // "smooth", "dash" etc.

  // optional
  availabilityStartTime? : number; // Base time from which the segments are generated.
  baseURL? : string; // Base URL for relative URLs given in that Manifest.
  clockOffset?: number; // Offset, in milliseconds, the client's clock (in terms
                        // of `performance.now`) has relatively to the server's
  duration? : number; // Last time available in the content.
                      // `undefined` for dynamic contents whose end is unknown
  lifetime?: number; // Duration of the validity of this Manifest, after which it
                     // should be refreshed.
  maximumTime? : { // Information on the maximum seekable position.
    isContinuous : boolean; // Whether this value linearly evolves over time.
    value : number; // Maximum seekable time in seconds calculated at `time`.
    time : number; // `Performance.now()` output at the time `value` was calculated.
  };
  minimumTime? : { // Information on the minimum seekable position.
    isContinuous : boolean; // Whether this value linearly evolves over time.
    value : number; // minimum seekable time in seconds calculated at `time`.
    time : number; // `Performance.now()` output at the time `value` was calculated.
  };
  suggestedPresentationDelay? : number; // Suggested delay from the last position.
                                        // the player should start from by default.
  uris?: string[]; // URIs where the manifest can be refreshed.
                   // By order of importance.
}
