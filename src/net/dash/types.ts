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

/**
 * Keys in a parsed manifest are, after parsing, filtered to only the keys
 * actually used to simplify manifest management and debugging in the core.
 *
 * This allows to clearly see what manifest property is exploited in this player
 * for now and allows a cleaner management down the line. It also allows to
 * greatly simplify the update / creation of other streaming technologies
 * (MSS, HLS...) for this player, as they should all give the same properties.
 *
 * The arrays of strings declared here are the keys used in each type of object
 * (periods, adaptations, etc.).
 *
 * NOTE: This object can be totally removed without losing any feature. It had
 * mainly been added to simplify debugging.
 */

interface IIndex {
    timeline: ISegmentTimeLine[];
    timescale: number;
    initialization?: IInitialization;
    indexType?: string;
}

interface IInitialization {
    range: Array<number|null>|null|undefined;
    media: string|null|undefined;
    indexRange?: Array<number|null>|undefined;
}

type ContentProtectionParser =
  (attributes: IContentProtectionDash, root: Element) => IContentProtectionDash;

interface IRole {
  schemeIdUri: string;
  value: string|number;
}

interface IAccessibility {
  schemeIdUri: string;
  value: string|number;
}

interface IContentProtectionDash {
  schemeIdUri: string;
  value: string;
}
interface IContentComponentDash {
  id: string;
  lang?: string;
  contentType?: string;
  par?: number;
}

interface IRepresentationDash {
  id: string|number|null;
  index: any|null; // XXX TODO
  mimeType: string|null;
  baseURL?: string|null;
  representations?: IRepresentationDash[];
  contentComponent?: IContentComponentDash;
  contentProtection?: IContentProtectionDash;
  profiles?: string;
  width?: number;
  height?: number;
  frameRate?: number;
  audioSamplingRate?: string;
  segmentProfiles?: string;
  codecs?: string;
  maximumSAPPeriod?: number;
  maxPlayoutRate?: number;
  codingDependency?: boolean;
  bitrate: number;
  qualityRanking?: number;
}

interface IAdaptationDash {
  // required
  id: string|null|number;
  index: IIndex|ISegmentBase|null;
  mimeType: string|null;
  representations: IRepresentationDash[];

  // optional
  audioDescription? : boolean;
  baseURL?: string|null;
  bitstreamSwitching?: boolean;
  closedCaption? : boolean;
  codecs?: string;
  contentComponent?: IContentComponentDash;
  contentProtection?: IContentProtectionDash|undefined;
  contentType?: string;
  group?: number;
  height?: number;
  language?: string;
  maxBandwidth?: number;
  maxFrameRate?: number;
  maxHeight?: number;
  maxWidth?: number;
  minBandwidth?: number;
  minFrameRate?: number;
  minHeight?: number;
  minWidth?: number;
  par?: number;
  role?: IRole;
  segmentAlignment?: number|boolean;
  subsegmentAlignment?: number|boolean;
  type?: string;
  width?: number;
}

interface IPeriodDash {
  id: string|null|number;
  adaptations: IAdaptationDash[];
  baseURL?: string|null;
  start?: number;
  duration?: number;
  bitstreamSwitching?: boolean;
}

interface ISegmentTimeLine {
  ts: number;
  r: number;
  d: number;
}

interface ISegmentURL {
  media?: string;
  mediaRange?: [number, number];
  index?: string;
  indexRange?: [number, number];
}

interface ISegmentBase {
  list: ISegmentURL[];
  timeline: ISegmentTimeLine[];
  timescale: number;
  indexType?: string;
  initialization?: IInitialization;
  timeShiftBufferDepth?: number;
  presentationTimeOffset?: number;
  indexRange?: [number, number];
  indexRangeExact?: boolean;
  availabilityTimeOffset?: number;
  availabilityTimeComplete?: boolean;
}

interface IMultipleSegmentBase extends ISegmentBase {
  duration?: number;
  startNumber?: number;
}

export {
  IRole,
  IIndex,
  ISegmentURL,
  IPeriodDash,
  ISegmentBase,
  IAccessibility,
  IAdaptationDash,
  IInitialization,
  ISegmentTimeLine,
  IRepresentationDash,
  IMultipleSegmentBase,
  IContentComponentDash,
  IContentProtectionDash,
  ContentProtectionParser,
};
