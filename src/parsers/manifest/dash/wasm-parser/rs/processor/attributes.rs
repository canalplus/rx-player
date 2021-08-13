use crate::errors::ParsingError;
use crate::events::AttributeName::*;

pub fn report_mpd_attrs(e : &quick_xml::events::BytesStart) {
    for res_attr in e.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"id" => Id.try_report_as_string(&attr),
                b"profiles" => Profiles.try_report_as_string(&attr),
                b"type" => Type.try_report_as_string(&attr),
                b"availabilityStartTime" => AvailabilityStartTime.try_report_as_string(&attr),
                b"availabilityEndTime" => AvailabilityEndTime.try_report_as_string(&attr),
                b"publishTime" => PublishTime.try_report_as_string(&attr),
                b"mediaPresentationDuration" =>
                    MediaPresentationDuration.try_report_as_iso_8601_duration(&attr),
                b"minimumUpdatePeriod" =>
                    MinimumUpdatePeriod.try_report_as_iso_8601_duration(&attr),
                b"minBufferTime" =>
                    MinBufferTime.try_report_as_iso_8601_duration(&attr),
                b"timeShiftBufferDepth" =>
                    TimeShiftBufferDepth.try_report_as_iso_8601_duration(&attr),
                b"suggestedPresentationDelay" =>
                    SuggestedPresentationDelay.try_report_as_iso_8601_duration(&attr),
                b"maxSegmentDuration" =>
                    MaxSegmentDuration.try_report_as_iso_8601_duration(&attr),
                b"maxSubsegmentDuration" =>
                    MaxSubsegmentDuration.try_report_as_iso_8601_duration(&attr),
                x => {
                    if x.len() > 6 && &x[..6] == b"xmlns:" {
                        Namespace.try_report_as_key_value(&x[6..], &attr);
                    }
                }
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_period_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"id" => Id.try_report_as_string(&attr),
                b"start" => Start.try_report_as_iso_8601_duration(&attr),
                b"duration" => Duration.try_report_as_iso_8601_duration(&attr),
                b"bitstreamSwitching" => BitstreamSwitching.try_report_as_bool(&attr),
                b"availabilityTimeOffset" => match attr.value.as_ref() {
                    b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                    _ => AvailabilityTimeOffset.try_report_as_u64(&attr),
                },
                b"xlink:href" => XLinkHref.try_report_as_string(&attr),
                b"xlink:actuate" => XLinkActuate.try_report_as_string(&attr),
                x => {
                    if x.len() > 6 && &x[..6] == b"xmlns:" {
                        Namespace.try_report_as_key_value(&x[6..], &attr);
                    }
                }
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_adaptation_set_attrs(e : &quick_xml::events::BytesStart) {
    for res_attr in e.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"id" => Id.try_report_as_string(&attr),
                b"group" => Group.try_report_as_u64(&attr),
                b"lang" => Language.try_report_as_string(&attr),
                b"contentType" => ContentType.try_report_as_string(&attr),
                b"par" => Par.try_report_as_string(&attr),
                b"minBandwidth" => MinBandwidth.try_report_as_u64(&attr),
                b"maxBandwidth" => MaxBandwidth.try_report_as_u64(&attr),
                b"minWidth" => MinWidth.try_report_as_u64(&attr),
                b"maxWidth" => MaxWidth.try_report_as_u64(&attr),
                b"minHeight" => MinHeight.try_report_as_u64(&attr),
                b"maxHeight" => MaxHeight.try_report_as_u64(&attr),
                b"minFrameRate" => MinFrameRate.try_report_as_maybe_division(&attr),
                b"maxFrameRate" => MaxFrameRate.try_report_as_maybe_division(&attr),
                b"selectionPriority" => SelectionPriority.try_report_as_u64(&attr),
                b"segmentAlignment" => SegmentAlignment.try_report_as_u64_or_bool(&attr),
                b"subsegmentAlignment" =>
                    SubsegmentAlignment.try_report_as_u64_or_bool(&attr),
                b"bitstreamSwitching" => BitstreamSwitching.try_report_as_bool(&attr),
                b"audioSamplingRate" => AudioSamplingRate.try_report_as_string(&attr),
                b"codecs" => Codecs.try_report_as_string(&attr),
                b"profiles" => Profiles.try_report_as_string(&attr),
                b"segmentProfiles" => SegmentProfiles.try_report_as_string(&attr),
                b"mimeType" => MimeType.try_report_as_string(&attr),
                b"codingDependency" => CodingDependency.try_report_as_bool(&attr),
                b"frameRate" => FrameRate.try_report_as_maybe_division(&attr),
                b"height" => Height.try_report_as_u64(&attr),
                b"width" => Width.try_report_as_u64(&attr),
                b"maxPlayoutRate" => MaxPlayoutRate.try_report_as_f64(&attr),
                b"maxSAPPeriod" => MaxSAPPeriod.try_report_as_f64(&attr),
                b"availabilityTimeOffset" => match attr.value.as_ref() {
                    b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                    _ => AvailabilityTimeOffset.try_report_as_u64(&attr),
                },
                b"availabilityTimeComplete" =>
                    AvailabilityTimeComplete.try_report_as_bool(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_representation_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"id" => Id.try_report_as_string(&attr),
                b"audioSamplingRate" => AudioSamplingRate.try_report_as_string(&attr),
                b"bandwidth" => Bitrate.try_report_as_u64(&attr),
                b"codecs" => Codecs.try_report_as_string(&attr),
                b"codingDependency" => CodingDependency.try_report_as_bool(&attr),
                b"frameRate" => FrameRate.try_report_as_maybe_division(&attr),
                b"height" => Height.try_report_as_u64(&attr),
                b"width" => Width.try_report_as_u64(&attr),
                b"maxPlayoutRate" => MaxPlayoutRate.try_report_as_f64(&attr),
                b"maxSAPPeriod" => MaxSAPPeriod.try_report_as_f64(&attr),
                b"mimeType" => MimeType.try_report_as_string(&attr),
                b"profiles" => Profiles.try_report_as_string(&attr),
                b"qualityRanking" => QualityRanking.try_report_as_u64(&attr),
                b"segmentProfiles" => SegmentProfiles.try_report_as_string(&attr),
                b"availabilityTimeOffset" => match attr.value.as_ref() {
                    b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                    _ => AvailabilityTimeOffset.try_report_as_u64(&attr),
                },
                b"availabilityTimeComplete" =>
                    AvailabilityTimeComplete.try_report_as_bool(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_base_url_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"availabilityTimeOffset" => {
                    match attr.value.as_ref() {
                        b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                        _ => AvailabilityTimeOffset.try_report_as_u64(&attr),
                    }
                },
                b"availabilityTimeComplete" =>
                    AvailabilityTimeComplete.try_report_as_bool(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_segment_template_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"initialization" => InitializationMedia.try_report_as_string(&attr),
                b"index" => Index.try_report_as_string(&attr),
                b"timescale" => TimeScale.try_report_as_u64(&attr),
                b"presentationTimeOffset" =>
                    PresentationTimeOffset.try_report_as_f64(&attr),
                b"indexRange" =>
                    IndexRange.try_report_as_range(&attr),
                b"IndexRangeExact" =>
                    IndexRangeExact.try_report_as_bool(&attr),
                b"availabilityTimeOffset" => match attr.value.as_ref() {
                    b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                    _ => AvailabilityTimeOffset.try_report_as_u64(&attr),
                },
                b"availabilityTimeComplete" =>
                    AvailabilityTimeComplete.try_report_as_bool(&attr),
                b"duration" =>
                    Duration.try_report_as_u64(&attr),
                b"startNumber" =>
                    StartNumber.try_report_as_u64(&attr),
                b"media" => Media.try_report_as_string(&attr),
                b"bitstreamSwitching" => BitstreamSwitching.try_report_as_bool(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_segment_base_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"timescale" => TimeScale.try_report_as_u64(&attr),
                b"presentationTimeOffset" =>
                    PresentationTimeOffset.try_report_as_f64(&attr),
                b"indexRange" => IndexRange.try_report_as_range(&attr),
                b"indexRangeExact" => IndexRangeExact.try_report_as_bool(&attr),
                b"availabilityTimeOffset" => match attr.value.as_ref() {
                    b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                    _ => AvailabilityTimeOffset.try_report_as_u64(&attr),
                },
                b"availabilityTimeComplete" =>
                    AvailabilityTimeComplete.try_report_as_bool(&attr),
                b"duration" =>
                    Duration.try_report_as_u64(&attr),
                b"startNumber" =>
                    StartNumber.try_report_as_u64(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_content_component_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"id" => Id.try_report_as_string(&attr),
                b"lang" => Language.try_report_as_string(&attr),
                b"contentType" => ContentType.try_report_as_string(&attr),
                b"par" => Par.try_report_as_string(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_content_protection_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"schemeIdUri" => SchemeIdUri.try_report_as_string(&attr),
                b"value" => ContentProtectionValue.try_report_as_string(&attr),

                // TODO convert hex to bytes here?
                b"cenc:default_KID" => ContentProtectionKeyId.try_report_as_string(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

/// Report attributes encountered in an `<Initialization>` element.
pub fn report_initialization_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"range" => InitializationRange.try_report_as_range(&attr),
                b"sourceURL" => InitializationMedia.try_report_as_string(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

/// Report attributes encountered in "Scheme-like" element.
///
/// A scheme-like element is an element containing two properties, both under
/// a string form:
///   - "schemeIdUri"
///   - "value"
pub fn report_scheme_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"schemeIdUri" => SchemeIdUri.try_report_as_string(&attr),
                b"value" => SchemeValue.try_report_as_string(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_segment_url_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"index" => Index.try_report_as_string(&attr),
                b"indexRange" => IndexRange.try_report_as_range(&attr),
                b"media" => Media.try_report_as_string(&attr),
                b"mediaRange" => MediaRange.try_report_as_range(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_event_stream_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"schemeIdUri" => SchemeIdUri.try_report_as_string(&attr),
                b"value" => SchemeValue.try_report_as_string(&attr),
                b"timescale" => TimeScale.try_report_as_u64(&attr),
                x => {
                    if x.len() > 6 && &x[..6] == b"xmlns:" {
                        Namespace.try_report_as_key_value(&x[6..], &attr);
                    }
                }
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

pub fn report_event_stream_event_attrs(tag_bs : &quick_xml::events::BytesStart) {
    for res_attr in tag_bs.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"presentationTime" => EventPresentationTime.try_report_as_u64(&attr),
                b"duration" => Duration.try_report_as_u64(&attr),
                b"id" => Id.try_report_as_string(&attr),
                _ => {},
            },
            Err(err) => ParsingError::from(err).report_err(),
        };
    };
}

//use std::ffi::CString;

//#[repr(C)]
//enum ParsedAttribute<T> {
//    Nothing,
//    Value(T),

//    /// CString (nul-terminated CString) for now for simplicity reasons with
//    /// regards to FFI.
//    ///
//    /// TODO solution with raw pointer + length?
//    Failure(CString),
//    // Failure(*const  u8, i32),
//}

//impl<T> Default for ParsedAttribute<T> {
//    fn default() -> Self { ParsedAttribute::Nothing }
//}

//use std::borrow::Cow;

//#[repr(C)]
//#[derive(Default)]
//struct MpdAttributes<'a> {
//    id: ParsedAttribute<&'a [u8]>,
//    profiles: ParsedAttribute<&'a [u8]>,
//    mpd_type: ParsedAttribute<&'a [u8]>,
//    availability_start_time: ParsedAttribute<&'a [u8]>,
//    availability_end_time: ParsedAttribute<&'a [u8]>,
//    publish_time: ParsedAttribute<&'a [u8]>,
//    media_presentation_duration: ParsedAttribute<f64>,
//    minimum_update_period: ParsedAttribute<f64>,
//    min_buffer_time: ParsedAttribute<f64>,
//    time_shift_buffer_depth: ParsedAttribute<f64>,
//    suggested_presentation_delay: ParsedAttribute<f64>,
//    max_segment_duration: ParsedAttribute<f64>,
//    max_subsegment_duration: ParsedAttribute<f64>,
//}

//fn extract_iso_8601_duration_attr(
//    attr_val : &Cow<[u8]>
//) -> ParsedAttribute<f64> {
//    use crate::utils::*;
//    match parse_iso_8601_duration(&attr_val) {
//        Ok(val) => ParsedAttribute::Value(val),
//        Err(error) => ParsedAttribute::Failure(error.into())
//    }
//}

//pub fn get_mpd_attrs<'a>(e : &'a quick_xml::events::BytesStart) -> MpdAttributes<'a> {
//    use crate::utils::*;
//    let mut mpd_attrs = MpdAttributes::default();
//    for res_attr in e.attributes() {
//        match res_attr {
//            Ok(attr) => match attr.key {
//                b"id" => { mpd_attrs.id = extract_string_attr(&attr); },
//                b"profiles" => { mpd_attrs.profiles = extract_string_attr(&attr); }
//                b"type" => { mpd_attrs.mpd_type = extract_string_attr(&attr); }
//                b"availabilityStartTime" => {
//                    mpd_attrs.availability_start_time = extract_string_attr(&attr);
//                }
//                b"availabilityEndTime" => {
//                    mpd_attrs.availability_end_time = extract_string_attr(&attr);
//                }
//                b"publish_time" => {
//                    mpd_attrs.publish_time = extract_string_attr(&attr);
//                }
//                b"mediaPresentationDuration" =>
//                    mpd_attrs.media_presentation_duration =
//                        extract_iso_8601_duration_attr(&attr.value),
//                b"minimumUpdatePeriod" =>
//                    mpd_attrs.minimum_update_period =
//                        extract_iso_8601_duration_attr(&attr.value),
//                b"minBufferTime" =>
//                    mpd_attrs.min_buffer_time =
//                        match parse_iso_8601_duration(&attr.value) {
//                            Ok(val) => ParsedAttribute::Value(val),
//                            Err(error) => ParsedAttribute::Failure(error.into())
//                        },
//                b"timeShiftBufferDepth" =>
//                    mpd_attrs.time_shift_buffer_depth =
//                        extract_iso_8601_duration_attr(&attr.value),
//                b"suggestedPresentationDelay" =>
//                    mpd_attrs.suggested_presentation_delay =
//                        extract_iso_8601_duration_attr(&attr.value),
//                b"maxSegmentDuration" =>
//                    mpd_attrs.max_segment_duration =
//                        extract_iso_8601_duration_attr(&attr.value),
//                b"maxSubsegmentDuration" =>
//                    mpd_attrs.max_subsegment_duration =
//                        extract_iso_8601_duration_attr(&attr.value),
//                _ => {},
//            },
//            Err(err) => ParsingError::from(err).report_err(),
//        };
//    }
//    mpd_attrs
//}
