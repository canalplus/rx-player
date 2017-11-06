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
  index: IIndex|ISegmentBase|null;
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
  bandwidth?: string;
  qualityRanking?: number;
}

interface IAdaptationDash {
  id: string|null|number;
  index: IIndex|ISegmentBase|null;
  representations: IRepresentationDash[];
  mimeType: string|null;
  baseURL?: string|null;
  type?: string;
  role?: IRole;
  accessibility?: string[];
  contentComponent?: IContentComponentDash;
  contentProtection?: IContentProtectionDash|undefined;
  group?: number;
  lang?: string;
  contentType?: string;
  par?: number;
  minBandwidth?: number;
  maxBandwidth?: number;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  minFrameRate?: number;
  maxFrameRate?: number;
  segmentAlignment?: number|boolean;
  subsegmentAlignment?: number|boolean;
  bitstreamSwitching?: boolean;
  codecs?: string;
  height?: number;
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
  mediaRange?: any;
  index?: string;
  indexRange?: any;
}

interface ISegmentBase {
  list: ISegmentURL[];
  timeline: ISegmentTimeLine[];
  timescale: number;
  indexType?: string;
  initialization?: IInitialization;
  timeShiftBufferDepth?: number;
  presentationTimeOffset?: number;
  indexRange?: any;
  indexRangeExact?: any;
  availabilityTimeOffset?: number;
  availabilityTimeComplete?: boolean;
  // XXX TODO MultipleSegmentBase
  duration?: number;
  startNumber?: number;
  // XXX TODO SegmentTimeLine
  index?: string;
  media?: string;
  bitstreamSwitching?: string;
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
  IContentComponentDash,
  IContentProtectionDash,
  ContentProtectionParser,
};
