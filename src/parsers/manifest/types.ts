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
  keyId : string;
}

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

export type IParsedAdaptations =
  Partial<Record<string, IParsedAdaptation[]>>;

export interface IParsedAdaptation {
  // required
  id: string;
  representations: IParsedRepresentation[];
  type: string;

  // optional
  audioDescription? : boolean;
  closedCaption? : boolean;
  language?: string;
}

export interface IParsedPeriod {
  // required
  id : string;
  start : number;
  adaptations : IParsedAdaptations;

  // optional
  duration? : number;
  end? : number;
}

export interface IParsedManifest {
  // required
  id: string; // Unique ID for the manifest.
  isLive : boolean; // If true, this Manifest describes a content not finished yet.
  periods: IParsedPeriod[]; // Periods contained in this manifest.
  transportType: string; // "smooth", "dash" etc.

  // optional
  availabilityStartTime? : number; // Base time from which the segments are generated.
  baseURL? : string; // Base URL for relative URLs given in that Manifest.
  clockOffset?: number; // Offset, in milliseconds, the client's clock has
                        // relatively to the server's
  duration? : number; // Last time in the content. Only useful for non-live contents.
  lifetime?: number; // Duration of the validity of this Manifest, after which it
                     // should be refreshed.
  maximumTime? : { // Informations on the maximum seekable position.
    isContinuous : boolean; // Whether this value linearly evolves over time.
    value : number; // Maximum seekable time in seconds calculated at `time`.
    time : number; // `Performance.now()` output at the time `value` was calculated.
  };
  minimumTime? : { // Informations on the minimum seekable position.
    isContinuous : boolean; // Whether this value linearly evolves over time.
    value : number; // minimum seekable time in seconds calculated at `time`.
    time : number; // `Performance.now()` output at the time `value` was calculated.
  };
  suggestedPresentationDelay? : number; // Suggested delay from the last position.
                                        // the player should start from by default.
  uris?: string[]; // URIs where the manifest can be refreshed.
                   // By order of importance.
}
