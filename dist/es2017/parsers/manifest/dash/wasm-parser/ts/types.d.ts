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
export declare const enum CustomEventType {
    /**
     * Variant that can be used to log various information on the RxPlayer's
     * logger.
     *
     * Useful for debugging, for example.
     */
    Log = 0,
    /** Variant used to report parsing errors to the RxPlayer. */
    Error = 1
}
/**
 * Identify the name of a node encountered by the wasm-parser.
 *
 * This enum can simply be copy-pasted from the corresponding Rust file as both
 * the TypeScript syntax and the rust syntax for them are really close.
 */
export declare const enum TagName {
    MPD = 1,
    Period = 2,
    UtcTiming = 3,
    AdaptationSet = 4,
    EventStream = 5,
    EventStreamElt = 6,
    Representation = 7,
    Accessibility = 8,
    ContentComponent = 9,
    ContentProtection = 10,
    EssentialProperty = 11,
    Role = 12,
    SupplementalProperty = 13,
    BaseURL = 15,
    SegmentTemplate = 16,
    SegmentBase = 17,
    SegmentList = 18,
    InbandEventStream = 19,
    SegmentUrl = 20
}
/**
 * Identify the name of an attribute encountered by the wasm-parser.
 *
 * This enum can simply be copy-pasted from the corresponding Rust file as both
 * the TypeScript syntax and the rust syntax for them are really close.
 */
export declare const enum AttributeName {
    Id = 0,
    Duration = 1,
    Profiles = 2,
    AudioSamplingRate = 3,
    Codecs = 4,// String
    CodingDependency = 5,
    FrameRate = 6,
    Height = 7,// f64
    Width = 8,// f64
    MaxPlayoutRate = 9,
    MaxSAPPeriod = 10,
    MimeType = 11,// f64
    SegmentProfiles = 12,
    ContentProtectionValue = 13,// String
    ContentProtectionKeyId = 14,// ArrayBuffer
    ContentProtectionCencPSSH = 15,// ArrayBuffer
    SchemeIdUri = 16,// String
    SchemeValue = 17,// String
    MediaRange = 18,// [f64, f64]
    SegmentTimeline = 19,// Vec<SElement>
    StartNumber = 20,// f64
    SegmentBaseSegment = 21,// SegmentBaseSegment
    AvailabilityTimeComplete = 22,// u8 (bool)
    IndexRangeExact = 23,// u8 (bool)
    PresentationTimeOffset = 24,// f64
    EventPresentationTime = 25,// f64
    Element = 26,// String (XML)
    TimeScale = 27,// f64
    Index = 28,// String
    InitializationRange = 29,// [f64, f64]
    Media = 30,// String
    IndexRange = 31,// [f64, f64]
    BitstreamSwitching = 32,// u8 (bool)
    Type = 33,// String
    AvailabilityStartTime = 34,// f64
    AvailabilityEndTime = 35,// f64
    PublishTime = 36,// f64
    MinimumUpdatePeriod = 37,// f64
    MinBufferTime = 38,// f64
    TimeShiftBufferDepth = 39,// f64
    SuggestedPresentationDelay = 40,// f64
    MaxSegmentDuration = 41,// f64
    MaxSubsegmentDuration = 42,// f64
    AvailabilityTimeOffset = 43,// f64
    BaseUrlValue = 44,// String
    Start = 45,// f64
    XLinkHref = 46,// String
    XLinkActuate = 47,// String
    Group = 48,
    MaxBandwidth = 49,// f64
    MaxFrameRate = 50,// f64
    MaxHeight = 51,// f64
    MaxWidth = 52,// f64
    MinBandwidth = 53,// f64
    MinFrameRate = 54,// f64
    MinHeight = 55,// f64
    MinWidth = 56,// f64
    SelectionPriority = 57,
    SegmentAlignment = 58,
    SubsegmentAlignment = 59,
    Language = 60,// String
    ContentType = 61,// String
    Par = 62,
    Bitrate = 63,// f64
    Text = 64,
    QualityRanking = 65,
    Location = 66,
    InitializationMedia = 67,
    MediaPresentationDuration = 68,
    EventStreamEltRange = 69,
    Namespace = 70,
    Label = 71,// String
    ServiceLocation = 72,// String
    QueryBeforeStart = 73,// Boolean
    ProxyServerUrl = 74,// String
    DefaultServiceLocation = 75,
    EndNumber = 76,// f64
    SupplementalCodecs = 77
}
