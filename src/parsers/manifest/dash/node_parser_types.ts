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

import type { ITNode } from "../../../utils/xml-parser.ts";

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
  children: IMPDChildren;
  /** Contains data about the element's attributes. */
  attributes: IMPDAttributes;
}

/** Intermediate representation for the root's children nodes. */
export interface IMPDChildren {
  /**
   * Root URL on which further relative URLs make reference.
   *
   * This is the content of all `BaseURL` elements encountered in this MPD node,
   * from the first encountered to the last encountered.
   */
  BaseURL: IBaseUrlIntermediateRepresentation[];
  /** Root-level `<EssentialProperty>` descriptors. */
  EssentialProperty: IDescriptorIntermediateRepresentation[];
  /** Root-level `<SupplementalProperty>` descriptors. */
  SupplementalProperty: IDescriptorIntermediateRepresentation[];
  /**
   * Location(s) at which the Manifest can be refreshed.
   *
   * This is the content of all `Location` elements encountered in this MPD
   * node,
   * from the first encountered to the last encountered.
   */
  Location: ILocationIntermediateRepresentation[];
  /**
   * Temporal subdivisions in that Manifest.
   *
   * This is the content of all `Period` elements encountered in this MPD node,
   * from the first encountered to the last encountered.
   */
  Period: IPeriodIntermediateRepresentation[];
  /**
   * Gives way to synchronize a clock to the server time.
   *
   * This is the content of all `UTCTiming` elements encountered in this MPD
   * node, from the first encountered to the last encountered.
   */
  UTCTiming: ISchemeIntermediateRepresentation[];
  /** Encryption-related metadata. */
  ContentProtection: IContentProtectionIntermediateRepresentation[];
}

/* Intermediate representation for the root's attributes. */
export interface IMPDAttributes {
  /**
   * value of the `id` attribute.
   * `undefined` if no `id` attribute was found on this MPD node.
   */
  id?: string;
  /**
   * value of the `profiles` attribute.
   * `undefined` if no `profiles` attribute was found on this MPD node.
   */
  profiles?: string;
  /**
   * value of the `type` attribute.
   * `undefined` if no `id` attribute was found on this MPD node.
   */
  type?: string;
  availabilityStartTime?: number;
  availabilityEndTime?: number;
  publishTime?: number;
  mediaPresentationDuration?: number;
  minimumUpdatePeriod?: number;
  minBufferTime?: number;
  timeShiftBufferDepth?: number;
  suggestedPresentationDelay?: number;
  maxSegmentDuration?: number;
  maxSubsegmentDuration?: number;

  /**
   * XML namespaces linked to the `<MPD>` element.
   *
   * This property is needed when the EventStream's `<Event>` elements depend
   * on parent namespaces to be parsed / reconstructed correctly.
   */
  namespaces?: Array<{ key: string; value: string }>;
}

/** Intermediate representation of an encountered Period node. */
export interface IPeriodIntermediateRepresentation {
  /** Children nodes for that Representation node. */
  children: IPeriodChildren;
  /** Attributes on that Representation nodes. */
  attributes: IPeriodAttributes;
}

/** Intermediate representation for a Period node's children nodes. */
export interface IPeriodChildren {
  /**
   * Available "tracks" in that Period.
   *
   * This is the content of all `AdaptationSet` elements encountered in this
   * node, from the first encountered to the last encountered.
   */
  AdaptationSet: IAdaptationSetIntermediateRepresentation[];
  /**
   * Root URL on which further relative URLs make reference.
   *
   * This is the content of all `BaseURL` elements encountered in this node,
   * from the first encountered to the last encountered.
   */
  BaseURL: IBaseUrlIntermediateRepresentation[];
  /**
   * Provide a template with which we will be able to request segments.
   */
  SegmentTemplate: ISegmentTemplateIntermediateRepresentation[];
  /**
   * Allows to signal events linked to this Period.
   *
   * This is the content of all `EventStream` elements encountered in this
   * node, from the first encountered to the last encountered.
   */
  EventStream: IEventStreamIntermediateRepresentation[];
  /** Encryption-related metadata. */
  ContentProtection: IContentProtectionIntermediateRepresentation[];
  /** Period-level `<SupplementalProperty>` descriptors. */
  SupplementalProperty: IDescriptorIntermediateRepresentation[];
}

/* Intermediate representation for A Period node's attributes. */
export interface IPeriodAttributes {
  /**
   * value of the `id` attribute.
   * `undefined` if no `id` attribute was found on this Period node.
   */
  id?: string;
  /**
   * value of the `start` attribute, converted into an integer.
   * `undefined` if no `id` attribute was found on this Period node or if we
   * could not parse it.
   */
  start?: number;
  /**
   * value of the `duration` attribute, converted into an integer.
   * `undefined` if no `id` attribute was found on this Period node or if we
   * could not parse it.
   */
  duration?: number;
  bitstreamSwitching?: boolean;
  availabilityTimeComplete?: boolean;
  availabilityTimeOffset?: number;
  ["xlink:href"]?: string;
  ["xlink:actuate"]?: string;

  /**
   * XML namespaces linked to the `<Period>` element.
   *
   * This property is needed when the EventStream's `<Event>` elements depend
   * on parent namespaces to be parsed / reconstructed correctly.
   */
  namespaces?: Array<{ key: string; value: string }>;
}

/** AdaptationSet once parsed into its intermediate representation. */
export interface IAdaptationSetIntermediateRepresentation {
  children: IAdaptationSetChildren;
  attributes: IAdaptationSetAttributes;
}

export interface IAdaptationSetChildren {
  BaseURL: IBaseUrlIntermediateRepresentation[];
  Representation: IRepresentationIntermediateRepresentation[];
  Accessibility: ISchemeIntermediateRepresentation[];
  ContentComponent: IContentComponentIntermediateRepresentation[];
  /** Encryption-related metadata. */
  ContentProtection: IContentProtectionIntermediateRepresentation[];
  EssentialProperty: IDescriptorIntermediateRepresentation[];
  InbandEventStream: ISchemeIntermediateRepresentation[];
  Role: ISchemeIntermediateRepresentation[];
  SupplementalProperty: IDescriptorIntermediateRepresentation[];
  SegmentBase: ISegmentBaseIntermediateRepresentation[];
  SegmentList: ISegmentListIntermediateRepresentation[];
  SegmentTemplate: ISegmentTemplateIntermediateRepresentation[];
  Label: Array<{ value: string }>;
}

/* Intermediate representation for An AdaptationSet node's attributes. */
export interface IAdaptationSetAttributes {
  audioSamplingRate?: string;
  bitstreamSwitching?: boolean;
  codecs?: string;
  codingDependency?: boolean;
  contentType?: string;
  frameRate?: number;
  group?: number;
  height?: number;
  id?: string;
  lang?: string;
  maxBandwidth?: number;
  maxFrameRate?: number;
  maxHeight?: number;
  maxPlayoutRate?: number;
  maxWidth?: number;
  maximumSAPPeriod?: number;
  mimeType?: string;
  minBandwidth?: number;
  minFrameRate?: number;
  minHeight?: number;
  minWidth?: number;
  par?: string;
  profiles?: string;
  selectionPriority?: number;
  segmentAlignment?: number | boolean;
  segmentProfiles?: string;
  subsegmentAlignment?: number | boolean;
  ["scte214:supplementalCodecs"]?: string;
  width?: number;
  availabilityTimeComplete?: boolean;
  availabilityTimeOffset?: number;
  label?: string;
}

export interface IRepresentationIntermediateRepresentation {
  children: IRepresentationChildren;
  attributes: IRepresentationAttributes;
}

export interface IRepresentationChildren {
  BaseURL: IBaseUrlIntermediateRepresentation[];
  /** Encryption-related metadata. */
  ContentProtection: IContentProtectionIntermediateRepresentation[];
  InbandEventStream: ISchemeIntermediateRepresentation[];
  SegmentBase: ISegmentBaseIntermediateRepresentation[];
  SegmentList: ISegmentListIntermediateRepresentation[];
  SegmentTemplate: ISegmentTemplateIntermediateRepresentation[];
  SupplementalProperty: IDescriptorIntermediateRepresentation[];
  EssentialProperty: IDescriptorIntermediateRepresentation[];
}

/* Intermediate representation for A Representation node's attributes. */
export interface IRepresentationAttributes {
  audioSamplingRate?: string;
  bandwidth?: number;
  codecs?: string;
  codingDependency?: boolean;
  frameRate?: number;
  height?: number;
  id?: string;
  maxPlayoutRate?: number;
  maximumSAPPeriod?: number;
  mimeType?: string;
  profiles?: string;
  qualityRanking?: number;
  segmentProfiles?: string;
  ["scte214:supplementalCodecs"]?: string;
  width?: number;
  availabilityTimeComplete?: boolean;
  availabilityTimeOffset?: number;
}

export interface ISegmentBaseIntermediateRepresentation {
  children: ISegmentBaseChildren;
  attributes: ISegmentBaseAttributes;
}

export interface ISegmentBaseChildren {
  Initialization: IInitializationIntermediateRepresentation[];
}

export interface ISegmentBaseAttributes {
  availabilityTimeComplete?: boolean;
  availabilityTimeOffset?: number;
  duration?: number;
  indexRange?: [number, number];
  indexRangeExact?: boolean;
  media?: string;
  presentationTimeOffset?: number;
  startNumber?: number;
  endNumber?: number;
  timescale?: number;
}

export interface IInitializationIntermediateRepresentation {
  attributes: IInitializationAttributes;
}

export interface ISegmentListIntermediateRepresentation {
  children: ISegmentListChildren;
  attributes: ISegmentListAttributes;
}

export interface ISegmentListChildren {
  Initialization: IInitializationIntermediateRepresentation[];
  SegmentURL: ISegmentUrlIntermediateRepresentation[];
}

export interface ISegmentListAttributes {
  availabilityTimeComplete?: boolean;
  availabilityTimeOffset?: number;
  duration?: number;
  indexRange?: [number, number];
  indexRangeExact?: boolean;
  presentationTimeOffset?: number;
  startNumber?: number;
  endNumber?: number;
  timescale?: number;
}

export interface ISegmentUrlIntermediateRepresentation {
  attributes: ISegmentUrlAttributes;
}

export interface ISegmentUrlAttributes {
  media?: string;
  mediaRange?: [number, number];
  index?: string;
  indexRange?: [number, number];
}

export interface IInitializationAttributes {
  range?: [number, number];
  sourceURL?: string;
}

/** The ContentComponent once parsed. */
export interface IContentComponentIntermediateRepresentation {
  attributes: IContentComponentAttributes;
}

export interface IContentComponentAttributes {
  id?: string;
  lang?: string;
  contentType?: string;
  par?: string;
}

export interface IContentProtectionIntermediateRepresentation {
  children: IContentProtectionChildren;
  attributes: IContentProtectionAttributes;
}

export interface IContentProtectionChildren {
  ["cenc:pssh"]: Array<{ value: Uint8Array }>;
}

export interface IContentProtectionAttributes {
  schemeIdUri?: string;
  value?: string;
  ["cenc:default_KID"]?: Uint8Array;
  refId?: string;
  ref?: string;
}

export interface ISegmentTemplateIntermediateRepresentation {
  children: ISegmentTemplateChildren;
  attributes: ISegmentTemplateAttributes;
}

export interface ISegmentTemplateChildren {
  Initialization: IInitializationIntermediateRepresentation[];
  timeline?: ISegmentTimelineElement[] | undefined;
  timelineParser?: ITimelineParser | undefined;
}

export interface ISegmentTemplateAttributes {
  availabilityTimeComplete?: boolean | undefined;
  availabilityTimeOffset?: number | undefined;
  bitstreamSwitching?: boolean | undefined;
  duration?: number | undefined;
  index?: string | undefined;
  indexRange?: [number, number] | undefined;
  indexRangeExact?: boolean | undefined;
  media?: string | undefined;
  presentationTimeOffset?: number | undefined;
  startNumber?: number | undefined;
  endNumber?: number | undefined;
  timescale?: number | undefined;
  initialization?: string | undefined;
}

export interface ISegmentTimelineElement {
  start: number;
  duration: number;
  repeatCount: number;
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
    /**
     * Potential value for a `serviceLocation` attribute, used in content
     * steering mechanisms.
     */
    serviceLocation?: string;
  };
}

/** Intermediate representation for a Location node. */
export interface ILocationIntermediateRepresentation {
  /** The URL contained in the Location node. */
  value: string;

  /** Attributes associated to the Location node. */
  attributes: {
    /** Value of the `serviceLocation` attribute. */
    serviceLocation?: string | undefined;
  };
}

/** Intermediate representation for a Node following a "scheme" format. */
export interface ISchemeIntermediateRepresentation {
  attributes: ISchemeAttributes;
}

/** Shared intermediate representation for DASH descriptor elements. */
export interface IDescriptorIntermediateRepresentation {
  attributes: IDescriptorAttributes;
  children: {
    UrlQueryInfo: IUrlQueryInfoIntermediateRepresentation[];
    ExtUrlQueryInfo: IUrlQueryInfoIntermediateRepresentation[];
  };
}

/** Parsed DASH Annex I URL query information. */
export interface IUrlQueryInfoIntermediateRepresentation {
  attributes: {
    queryString?: string | undefined;
    queryTemplate?: string | undefined;
    includeInRequests?: string | undefined;
    useMpdUrlQuery?: boolean | undefined;
  };
}

export interface IDescriptorAttributes extends ISchemeAttributes {
  id?: string | undefined;
}

export interface ISchemeAttributes {
  /**
   * Content of the `schemeIdUri` attribute for that scheme.
   *
   * `undefined` if no `schemeIdUri` attribute has been found.
   */
  schemeIdUri?: string | undefined;
  /** Value attribute of that scheme. */
  value?: string | undefined;
}

export interface IEventStreamIntermediateRepresentation {
  /** Contains data about the element's children. */
  children: IEventStreamChildren;
  /** Contains data about the element's attributes. */
  attributes: IEventStreamAttributes;
}

export interface IEventStreamAttributes {
  schemeIdUri?: string | undefined;
  timescale?: number | undefined;
  value?: string | undefined;

  /**
   * XML namespaces linked to the `<EventStream>` element.
   *
   * This property is needed when the EventStream's `<Event>` elements depend
   * on parent namespaces to be parsed / reconstructed correctly.
   */
  namespaces?: Array<{ key: string; value: string }> | undefined;
}

export interface IEventStreamChildren {
  Event: IEventStreamEventIntermediateRepresentation[];
}

export interface IEventStreamEventIntermediateRepresentation {
  id?: string;
  presentationTime?: number;
  duration?: number;

  /**
   * The `<Event>` element itself.
   * Can be under any of those forms:
   *   - Either as an Element instance directly
   *   - Either as the Element's UTF-8 textual representation.
   *   - Either as the Element's string representation.
   */
  eventStreamData?: ArrayBufferLike | string;
}

export type ITimelineParser = () => ITNode[];
