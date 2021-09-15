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
 * Identify a "custom event" provoked by the parser.
 *
 * This enum can simply be copy-pasted from the corresponding Rust file as both
 * the TypeScript syntax and the rust syntax for them are really close.
 */
export const enum CustomEventType {
  /**
   * Variant that can be used to log various information on the RxPlayer's
   * logger.
   *
   * Useful for debugging, for example.
   */
  Log = 0,

    /** Variant used to report parsing errors to the RxPlayer. */
  Error = 1,
}

/**
 * Identify the name of a node encountered by the wasm-parser.
 *
 * This enum can simply be copy-pasted from the corresponding Rust file as both
 * the TypeScript syntax and the rust syntax for them are really close.
 */
export const enum TagName {
  /// Indicate an <MPD> node
  /// These nodes are usually contained at the root of an MPD.
  MPD = 1,

  // -- Inside an <MPD> --

  /// Indicate a <Period> node
  Period = 2,

  /// Indicate a <UTCTiming> node
  UtcTiming = 3,

  // -- Inside a <Period> --

  /// Indicate an <AdaptationSet> node
  AdaptationSet = 4,

  /// Indicate an <EventStream> node
  EventStream = 5,

  /// Indicate an <Event> node.
  /// These nodes are usually contained in <EventStream> elements.
  EventStreamElt = 6,

  // -- Inside an <AdaptationSet> --

  /// Indicate a <Representation> node
  Representation = 7,

  /// Indicate an <Accessibility> node
  Accessibility = 8,

  /// Indicate a <ContentComponent> node
  ContentComponent = 9,

  /// Indicate a <ContentProtection> node
  ContentProtection = 10,

  /// Indicate an <EssentialProperty> node
  EssentialProperty = 11,

  /// Indicate a <Role> node
  Role = 12,

  /// Indicate a <SupplementalProperty> node
  SupplementalProperty = 13,

  // -- Inside various elements --

  /// Indicate a <BaseURL> node
  BaseURL = 15,

  /// Indicate a <SegmentTemplate> node
  SegmentTemplate = 16,

  /// Indicate a <SegmentBase> node
  SegmentBase = 17,

  /// Indicate a <SegmentList> node
  SegmentList = 18,

  /// Indicate an <InbandEventStream> node
  InbandEventStream = 19,

  // -- Inside a <SegmentList> --

  /// Indicate a <SegmentURL> node
  SegmentUrl = 20,
}

/**
 * Identify the name of an attribute encountered by the wasm-parser.
 *
 * This enum can simply be copy-pasted from the corresponding Rust file as both
 * the TypeScript syntax and the rust syntax for them are really close.
 */
export const enum AttributeName {
  Id = 0,
  Duration = 1,
  Profiles = 2,

  // AdaptationSet + Representation
  AudioSamplingRate = 3,
  Codecs = 4, // String
  CodingDependency = 5,
  FrameRate = 6,
  Height = 7, // f64
  Width = 8, // f64
  MaxPlayoutRate = 9,
  MaxSAPPeriod = 10,
  MimeType = 11, // f64
  SegmentProfiles = 12,

  // ContentProtection
  ContentProtectionValue = 13, // String
  ContentProtectionKeyId = 14, // ArrayBuffer
  ContentProtectionCencPSSH = 15, // ArrayBuffer

  // Various schemes (Accessibility) + EventStream + ContentProtection
  SchemeIdUri = 16, // String

  // Various schemes (Accessibility)
  SchemeValue = 17, // String

  // SegmentURL
  MediaRange = 18, // [f64, f64]

  // SegmentTimeline
  SegmentTimeline = 19, // Vec<SElement>

  // SegmentTemplate
  StartNumber = 20, // f64

  // SegmentBase
  SegmentBaseSegment = 21, // SegmentBaseSegment

  // SegmentTemplate + SegmentBase
  AvailabilityTimeComplete = 22, // u8 (bool)
  IndexRangeExact = 23, // u8 (bool)
  PresentationTimeOffset = 24, // f64

  // EventStream
  EventPresentationTime = 25, // f64

  // EventStreamElt
  Element = 26, // String (XML)

  // SegmentTemplate + SegmentBase + EventStream + EventStreamElt
  TimeScale = 27, // f64

  // SegmentURL + SegmentTemplate
  Index = 28, // String

  // Initialization
  InitializationRange = 29, // [f64, f64]

  // SegmentURL + SegmentTemplate + SegmentBase + Initialization
  Media = 30, // String
  IndexRange = 31, // [f64, f64]

  // Period + AdaptationSet + SegmentTemplate
  BitstreamSwitching = 32, // u8 (bool)


  // MPD
  Type = 33, // String
  AvailabilityStartTime = 34, // f64
  AvailabilityEndTime = 35, // f64
  PublishTime = 36, // f64
  MinimumUpdatePeriod = 37, // f64
  MinBufferTime = 38, // f64
  TimeShiftBufferDepth = 39, // f64
  SuggestedPresentationDelay = 40, // f64
  MaxSegmentDuration = 41, // f64
  MaxSubsegmentDuration = 42, // f64

  // BaseURL + SegmentTemplate
  AvailabilityTimeOffset = 43, // f64

  // BaseURL
  BaseUrlValue = 44, // String

  // Period
  Start = 45, // f64
  XLinkHref = 46, // String
  XLinkActuate = 47, // String

  // AdaptationSet
  Group = 48,
  MaxBandwidth = 49, // f64
  MaxFrameRate = 50, // f64
  MaxHeight = 51, // f64
  MaxWidth = 52, // f64
  MinBandwidth = 53, // f64
  MinFrameRate = 54, // f64
  MinHeight = 55, // f64
  MinWidth = 56, // f64
  SelectionPriority = 57,
  SegmentAlignment = 58,
  SubsegmentAlignment = 59,

  // AdaptationSet + ContentComponent
  Language = 60, // String
  ContentType = 61, // String
  Par = 62,

  // Representation
  Bitrate = 63, // f64

  Text = 64,
  QualityRanking = 65,
  Location = 66,

  InitializationMedia = 67,

  /// Describes an encountered "mediaPresentationDuration" attribute, as found
  /// in `<MPD>` elements.
  ///
  /// This value has been converted into seconds, as an f64.
  MediaPresentationDuration = 68,

  /// Describes the byte range (end not included) of an encountered `<Event>`
  /// element in the whole MPD.
  ///
  /// This can be useful to re-construct the whole element on the JS-sid.
  ///
  /// It is reported as an array of two f64 values.
  /// The first number indicating the starting range (included).
  /// The second indicating the ending range (non-included).
  EventStreamEltRange = 69,

  /// Describes an XML namespace coming from either a `<MPD>` element, a
  /// `<Period> element or a `<EventStream>` elements, as those are the three
  /// parent tags of potential `<Event>` elements.
  ///
  /// It is reported as the concatenation of four values:
  ///
  ///   - In the four first bytes: The length of the namespace's name (the
  ///     part in the XML attribute just after "xmlns:"), as a big endian
  ///     unsigned 32 bit integer
  ///
  ///   - The namespace's name (the part coming after "xmlns:" in the
  ///     attribute's name), as an UTF-8 encoded string.
  ///     The length of this attribute is indicated by the preceding four
  ///     bytes.
  ///
  ///   - As the next four bytes: The length of the namespace's value (the
  ///     corresponding XML attribute's value), as a big endian
  ///     unsigned 32 bit integer
  ///
  ///   - The namespace's value (the value of the corresponding XML
  ///     attribute), as an UTF-8 encoded string.
  ///     The length of this attribute is indicated by the preceding four
  ///     bytes.
  ///
  /// This special Attribute was needed because we need those namespaces to be
  /// able to communicate `<Event>` property under a JavaScript's Element
  /// format: the browser's `DOMParser` API needs to know all potential
  /// namespaces that will appear in it.
  Namespace = 70,
}
