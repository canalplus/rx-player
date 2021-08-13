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
 * Those are types used when generating the MPD "Intermediate Representation"
 * which is an intermediate step between parsing the MPD (in XML) and generating
 * the RxPlayer's internal representation of a Manifest.
 *
 * This way, we can without much development cost only create a parser's
 * "front-end" - which will just generate those object - to then depend on the
 * already existing "back-end".
 */

/** Intermediate Representation for the `<MPD>` element in an MPD. */
export interface IMPDIntermediateRepresentation {
  /** Contains data about the element's children. */
  children : IMPDChildren;
  /** Contains data about the element's attributes. */
  attributes : IMPDAttributes;
}

/** Intermediate representation for the root's children nodes. */
export interface IMPDChildren {
  /**
   * Root URL on which further relative URLs make reference.
   *
   * This is the content of all `BaseURL` elements encountered in this MPD node,
   * from the first encountered to the last encountered.
   */
  baseURLs : IBaseUrlIntermediateRepresentation[];
  /**
   * Location(s) at which the Manifest can be refreshed.
   *
   * This is the content of all `Location` elements encountered in this MPD
   * node,
   * from the first encountered to the last encountered.
   */
  locations : string[];
  /**
   * Temporal subdivisions in that Manifest.
   *
   * This is the content of all `Period` elements encountered in this MPD node,
   * from the first encountered to the last encountered.
   */
  periods : IPeriodIntermediateRepresentation[];
  /**
   * Gives way to synchronize a clock to the server time.
   *
   * This is the content of all `UTCTiming` elements encountered in this MPD
   * node, from the first encountered to the last encountered.
   */
  utcTimings : IScheme[];
}

/* Intermediate representation for the root's attributes. */
export interface IMPDAttributes {
  /**
   * value of the `id` attribute.
   * `undefined` if no `id` attribute was found on this MPD node.
   */
  id? : string;
  /**
   * value of the `profiles` attribute.
   * `undefined` if no `profiles` attribute was found on this MPD node.
   */
  profiles? : string;
  /**
   * value of the `type` attribute.
   * `undefined` if no `id` attribute was found on this MPD node.
   */
  type? : string;
  availabilityStartTime? : number;
  availabilityEndTime? : number;
  publishTime? : number;
  duration? : number; // mediaPresentationDuration
  minimumUpdatePeriod? : number;
  minBufferTime? : number;
  timeShiftBufferDepth? : number;
  suggestedPresentationDelay? : number;
  maxSegmentDuration? : number;
  maxSubsegmentDuration? : number;

  /**
   * XML namespaces linked to the `<MPD>` element.
   *
   * This property is only needed when the EventStream's `<Event>` elements are
   * not parsed through the browser's DOMParser API, and thus might depend on
   * parent namespaces to be parsed correctly.
   */
  namespaces? : Array<{ key: string;
                        value: string; }>;
}

/** Intermediate representation of an encountered Period node. */
export interface IPeriodIntermediateRepresentation {
  /** Children nodes for that Representation node. */
  children : IPeriodChildren;
  /** Attributes on that Representation nodes. */
  attributes : IPeriodAttributes;
}

/** Intermediate representation for a Period node's children nodes. */
export interface IPeriodChildren {
  /**
   * Available "tracks" in that Period.
   *
   * This is the content of all `AdaptationSet` elements encountered in this
   * node, from the first encountered to the last encountered.
   */
  adaptations : IAdaptationSetIntermediateRepresentation[];
  /**
   * Root URL on which further relative URLs make reference.
   *
   * This is the content of all `BaseURL` elements encountered in this node,
   * from the first encountered to the last encountered.
   */
  baseURLs : IBaseUrlIntermediateRepresentation[];
  /**
   * Provide a template with which we will be able to request segments.
   */
  segmentTemplate? : ISegmentTemplateIntermediateRepresentation | undefined;
  /**
   * Allows to signal events linked to this Period.
   *
   * This is the content of all `EventStream` elements encountered in this
   * node, from the first encountered to the last encountered.
   */
  eventStreams : IEventStreamIntermediateRepresentation[];
}

/* Intermediate representation for A Period node's attributes. */
export interface IPeriodAttributes {
  /**
   * value of the `id` attribute.
   * `undefined` if no `id` attribute was found on this Period node.
   */
  id? : string;
  /**
   * value of the `start` attribute, converted into an integer.
   * `undefined` if no `id` attribute was found on this Period node or if we
   * could not parse it.
   */
  start? : number;
  /**
   * value of the `duration` attribute, converted into an integer.
   * `undefined` if no `id` attribute was found on this Period node or if we
   * could not parse it.
   */
  duration? : number;
  bitstreamSwitching? : boolean;
  availabilityTimeComplete?: boolean;
  availabilityTimeOffset?: number;
  xlinkHref? : string;
  xlinkActuate? : string;

  /**
   * XML namespaces linked to the `<Period>` element.
   *
   * This property is only needed when the EventStream's `<Event>` elements are
   * not parsed through the browser's DOMParser API, and thus might depend on
   * parent namespaces to be parsed correctly.
   */
  namespaces? : Array<{ key: string;
                        value: string; }>;
}

/** AdaptationSet once parsed into its intermediate representation. */
export interface IAdaptationSetIntermediateRepresentation {
  children : IAdaptationSetChildren;
  attributes : IAdaptationSetAttributes;
}

export interface IAdaptationSetChildren {
  // required
  baseURLs : IBaseUrlIntermediateRepresentation[];
  representations : IRepresentationIntermediateRepresentation[];

  // optional
  accessibilities? : IScheme[] | undefined;
  contentComponent? : IContentComponentAttributes | undefined;
  contentProtections? : IContentProtectionIntermediateRepresentation[] | undefined;
  essentialProperties? : IScheme[] | undefined;
  inbandEventStreams? : IScheme[] | undefined;
  roles? : IScheme[];
  supplementalProperties? : IScheme[] | undefined;

  segmentBase? : ISegmentBaseIntermediateRepresentation | undefined;
  segmentList? : ISegmentListIntermediateRepresentation | undefined;
  segmentTemplate? : ISegmentTemplateIntermediateRepresentation | undefined;
  label? : string | undefined;
}

/* Intermediate representation for An AdaptationSet node's attributes. */
export interface IAdaptationSetAttributes {
  audioSamplingRate? : string;
  bitstreamSwitching? : boolean;
  codecs? : string;
  codingDependency? : boolean;
  contentType? : string;
  frameRate? : number;
  group? : number;
  height? : number;
  id? : string;
  language? : string;
  maxBitrate? : number;
  maxFrameRate? : number;
  maxHeight? : number;
  maxPlayoutRate? : number;
  maxWidth? : number;
  maximumSAPPeriod? : number;
  mimeType? : string;
  minBitrate? : number;
  minFrameRate? : number;
  minHeight? : number;
  minWidth? : number;
  par? : string;
  profiles? : string;
  selectionPriority? : number;
  segmentAlignment? : number|boolean;
  segmentProfiles? : string;
  subsegmentAlignment? : number|boolean;
  width? : number;
  availabilityTimeComplete?: boolean;
  availabilityTimeOffset?: number;
  label?: string;
}

export interface IRepresentationIntermediateRepresentation {
  children : IRepresentationChildren;
  attributes : IRepresentationAttributes;
}

export interface IRepresentationChildren {
  // required
  baseURLs : IBaseUrlIntermediateRepresentation[];

  // optional
  contentProtections? : IContentProtectionIntermediateRepresentation[];
  inbandEventStreams? : IScheme[];
  segmentBase? : ISegmentBaseIntermediateRepresentation;
  segmentList? : ISegmentListIntermediateRepresentation;
  segmentTemplate? : ISegmentTemplateIntermediateRepresentation;
}

/* Intermediate representation for A Representation node's attributes. */
export interface IRepresentationAttributes {
  audioSamplingRate? : string;
  bitrate? : number;
  codecs? : string;
  codingDependency? : boolean;
  frameRate? : number;
  height? : number;
  id? : string;
  maxPlayoutRate? : number;
  maximumSAPPeriod? : number;
  mimeType? : string;
  profiles? : string;
  qualityRanking? : number;
  segmentProfiles? : string;
  width? : number;
  availabilityTimeComplete?: boolean;
  availabilityTimeOffset?: number;
}

export interface ISegmentBaseIntermediateRepresentation {
  availabilityTimeComplete?: boolean;
  availabilityTimeOffset?: number;
  duration? : number;
  indexRange?: [number, number];
  indexRangeExact?: boolean;
  initialization?: IInitializationAttributes;
  media?: string;
  presentationTimeOffset?: number;
  startNumber? : number;
  timescale?: number;
}

export interface ISegmentListIntermediateRepresentation {
  list: ISegmentUrlIntermediateRepresentation[];
  availabilityTimeComplete?: boolean;
  availabilityTimeOffset?: number;
  duration? : number;
  indexRange?: [number, number];
  indexRangeExact?: boolean;
  initialization?: IInitializationAttributes;
  media?: string;
  presentationTimeOffset?: number;
  startNumber? : number;
  timescale?: number;
}

export interface ISegmentUrlIntermediateRepresentation {
  media?: string;
  mediaRange?: [number, number];
  index?: string;
  indexRange?: [number, number];
}

export interface IInitializationAttributes {
  range?: [number, number];
  media?: string;
}

/** The ContentComponent once parsed. */
export interface IContentComponentAttributes {
  id?: string;
  language?: string;
  contentType?: string;
  par?: string;
}

export interface IContentProtectionIntermediateRepresentation {
  children : IContentProtectionChildren;
  attributes : IContentProtectionAttributes;
}

export interface IContentProtectionChildren {
  cencPssh : Uint8Array[];
}

export interface IContentProtectionAttributes {
  schemeIdUri? : string;
  value? : string;
  keyId? : Uint8Array;
}

export interface ISegmentTemplateIntermediateRepresentation {
  availabilityTimeComplete? : boolean | undefined;
  availabilityTimeOffset? : number | undefined;
  bitstreamSwitching? : boolean | undefined;
  duration? : number | undefined;
  index? : string | undefined;
  indexRange?: [number, number] | undefined;
  indexRangeExact? : boolean | undefined;
  media? : string | undefined;
  presentationTimeOffset? : number | undefined;
  startNumber? : number | undefined;
  timescale? : number | undefined;
  initialization? : { media?: string } | undefined;
  timeline? : ISegmentTimelineElement[] | undefined;
  timelineParser? : ITimelineParser | undefined;
}

export interface ISegmentTimelineElement {
  start : number;
  duration : number;
  repeatCount : number;
}

/** Intermediate representation for a BaseURL node. */
export interface IBaseUrlIntermediateRepresentation {
  /**
   * The URL itself.
   *
   * This is the inner content of a BaseURL node.
   */
  value: string;

  /** Attributes assiociated to the BaseURL node. */
  attributes: {
    /** availabilityTimeOffset attribute assiociated to that BaseURL node. */
    availabilityTimeOffset?: number;
    availabilityTimeComplete?: boolean;
  };
}

/** Intermediate representation for a Node following a "scheme" format. */
export interface IScheme {
  /**
   * Content of the `schemeIdUri` attribute for that scheme.
   *
   * `undefined` if no `schemeIdUri` attribute has been found.
   */
  schemeIdUri? : string | undefined;
  /** Inner content of that scheme. */
  value? : string | undefined;
}

export interface IEventStreamIntermediateRepresentation {
  /** Contains data about the element's children. */
  children : IEventStreamChildren;
  /** Contains data about the element's attributes. */
  attributes : IEventStreamAttributes;
}

export interface IEventStreamAttributes {
  schemeIdUri? : string | undefined;
  timescale? : number | undefined;
  value? : string | undefined;

  /**
   * XML namespaces linked to the `<EventStream>` element.
   *
   * This property is only needed when the EventStream's `<Event>` elements are
   * not parsed through the browser's DOMParser API, and thus might depend on
   * parent namespaces to be parsed correctly.
   */
  namespaces? : Array<{ key: string; value: string }> | undefined;
}

export interface IEventStreamChildren {
  events : IEventStreamEventIntermediateRepresentation[];
}

export interface IEventStreamEventIntermediateRepresentation {
  id?: string;
  presentationTime? : number;
  duration? : number;

  /**
   * The `<Event>` element itself.
   * Can be in two forms:
   *   - Either as an Element instance directly
   *   - Either as the Element's UTF-8 textual representation.
   */
  eventStreamData? : Element | ArrayBuffer;
}

export type ITimelineParser = () => HTMLCollection;
