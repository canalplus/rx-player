use crate::{ParsingError, onTagClose, onTagOpen};

#[derive(Clone, Copy)]
#[repr(C)]
pub enum CustomEventType {
    /// Variant that can be used to log various information on the RxPlayer's
    /// logger.
    ///
    /// Useful for debugging, for example.
    #[allow(dead_code)]
    Log = 0,

    /// Variant used to report parsing errors to the RxPlayer.
    Error = 1,
}

/// `TagName` enumerates parsed XML elements in an MPD.
///
/// Note that not all parsed elements have an entry in `TagName`, the simpler
/// ones might actually have an entry in `AttributeName` instead to simplify
/// the parser's implementation.
#[derive(PartialEq, Clone, Copy)]
#[repr(C)]
pub enum TagName {
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

#[derive(PartialEq, Clone, Copy)]
#[repr(C)]
pub enum AttributeName {
    /// Describes the "id" attribute that can be found in many, many elements.
    ///
    /// It is reported as an UTF-8 sequence of bytes (through a pointer into
    /// WebAssembly's memory and length).
    ///
    /// Among the elements concerned:
    ///   - <MPD>
    ///   - <Period>
    ///   - <AdaptationSet>
    ///   - <Representation>
    ///   - <ContentComponent>
    ///   - <Event> (from <EventStream> elements)
    Id = 0,

    /// Describes the "duration" attribute that can be found in multiple MPD
    /// elements.
    ///
    /// It is reported as an f64, for easier JS manipulation.
    ///
    /// The Duration attribute can be found in:
    ///   - <Period> elements. In that case this value will be reported as a
    ///     number of seconds.
    ///   - <SegmentTemplate> elements
    ///   - <SegmentBase> elements
    ///   - <Event> elements (from <EventStream> elements)
    Duration = 1,

    /// Describes the "profiles" attribute, found in `<MPD>` elements.
    ///
    /// It is reported as an UTF-8 sequence of bytes (through a pointer and
    /// length into WebAssembly's memory).
    Profiles = 2,

    // AdaptationSet + Representation
    AudioSamplingRate = 3,
    Codecs = 4, // String
    CodingDependency = 5,
    FrameRate = 6, // f64
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

    // SegmentTemplate + SegmentBase
    AvailabilityTimeComplete = 22, // u8 (bool)
    IndexRangeExact = 23, // u8 (bool)
    PresentationTimeOffset = 24, // f64

    // EventStream
    EventPresentationTime = 25, // f64

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
    
    Label = 71, // String
}

impl TagName {
    /// Signal a new tag opening to the application
    pub fn report_tag_open(self) {
        debug_assert!(self as u64 <= u8::MAX as u64);

        // UNSAFE: We're using FFI, but there should be no risk at all here
        unsafe { onTagOpen(self) };
    }

    /// Signal that a previously-open tag closed to the application
    pub fn report_tag_close(self) {
        debug_assert!(self as u64 <= u8::MAX as u64);

        // UNSAFE: We're using FFI, but there should be no risk at all here
        unsafe { onTagClose(self) };
    }
}

use crate::reportable::ReportableAttribute;
use crate::utils;

impl AttributeName {
    #[inline(always)]
    pub fn report<T: ReportableAttribute>(self, val: T) {
        val.report_as_attr(self)
    }

    pub fn try_report_as_string(
        self,
        attr : &quick_xml::events::attributes::Attribute
    ) {
        match attr.unescaped_value() {
            Ok(val) => self.report(val),
            Err(_) =>
                ParsingError("Could not escape original value".to_owned())
                    .report_err(),
        }
    }

    pub fn try_report_as_f64(
        self,
        attr : &quick_xml::events::attributes::Attribute
    ) {
        match utils::parse_f64(&attr.value) {
            Ok(val) => self.report(val),
            Err(error) => error.report_err(),
        }
    }

    pub fn try_report_as_iso_8601_duration(
        self,
        attr : &quick_xml::events::attributes::Attribute
    ) {
        match utils::parse_iso_8601_duration(&attr.value) {
            Ok(val) => self.report(val),
            Err(error) => error.report_err(),
        }
    }

    pub fn try_report_as_maybe_division(
        self,
        attr : &quick_xml::events::attributes::Attribute
    ) {
        match utils::parse_maybe_division(&attr.value) {
            Ok(val) => self.report(val),
            Err(error) => error.report_err(),
        }
    }

    pub fn try_report_as_u64(
        self,
        attr : &quick_xml::events::attributes::Attribute
    ) {
        match utils::parse_u64(&attr.value) {
            Ok(val) => self.report(val as f64),
            Err(error) => error.report_err(),
        }
    }

    pub fn try_report_as_u64_or_bool(
        self,
        attr : &quick_xml::events::attributes::Attribute
    ) {
        match utils::parse_u64_or_bool(&attr.value) {
            Ok(val) => self.report(val),
            Err(error) => error.report_err(),
        }
    }

    pub fn try_report_as_bool(
        self,
        attr : &quick_xml::events::attributes::Attribute
    ) {
        match utils::parse_bool(&attr.value) {
            Ok(val) => self.report(val),
            Err(error) => error.report_err(),
        }
    }

    pub fn try_report_as_range(
        self,
        attr : &quick_xml::events::attributes::Attribute
    ) {
        match utils::parse_byte_range(&attr.value) {
            Ok(val) => self.report(val),
            Err(error) => error.report_err(),
        }
    }

    pub fn try_report_as_key_value(
        self,
        key : &[u8],
        value: &quick_xml::events::attributes::Attribute
    ) {
        match value.unescaped_value() {
            Ok(val) => self.report((key, val)),
            Err(_) =>
                ParsingError("Could not escape original value".to_owned())
                    .report_err(),
        }
    }
}
