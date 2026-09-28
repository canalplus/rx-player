use crate::events::AttributeName::*;

pub fn report_mpd_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"id" => Id.try_report_as_string(&attr),
                b"profiles" => Profiles.try_report_as_string(&attr),
                b"type" => Type.try_report_as_string(&attr),
                b"availabilityStartTime" => AvailabilityStartTime.try_report_as_string(&attr),
                b"availabilityEndTime" => AvailabilityEndTime.try_report_as_string(&attr),
                b"publishTime" => PublishTime.try_report_as_string(&attr),
                b"mediaPresentationDuration" => {
                    MediaPresentationDuration.try_report_as_iso_8601_duration(&attr)
                }
                b"minimumUpdatePeriod" => {
                    MinimumUpdatePeriod.try_report_as_iso_8601_duration(&attr)
                }
                b"minBufferTime" => MinBufferTime.try_report_as_iso_8601_duration(&attr),
                b"timeShiftBufferDepth" => {
                    TimeShiftBufferDepth.try_report_as_iso_8601_duration(&attr)
                }
                b"suggestedPresentationDelay" => {
                    SuggestedPresentationDelay.try_report_as_iso_8601_duration(&attr)
                }
                b"maxSegmentDuration" => MaxSegmentDuration.try_report_as_iso_8601_duration(&attr),
                b"maxSubsegmentDuration" => {
                    MaxSubsegmentDuration.try_report_as_iso_8601_duration(&attr)
                }
                x => {
                    if x.len() > 6 && &x[..6] == b"xmlns:" {
                        Namespace.try_report_as_key_value(&x[6..], &attr);
                    }
                }
            },
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_period_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"id" => Id.try_report_as_string(&attr),
                b"start" => Start.try_report_as_iso_8601_duration(&attr),
                b"duration" => Duration.try_report_as_iso_8601_duration(&attr),
                b"bitstreamSwitching" => BitstreamSwitching.try_report_as_bool(&attr),
                b"availabilityTimeOffset" => match attr.value {
                    b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                    _ => AvailabilityTimeOffset.try_report_as_f64(&attr),
                },
                b"xlink:href" => XLinkHref.try_report_as_string(&attr),
                b"xlink:actuate" => XLinkActuate.try_report_as_string(&attr),
                x => {
                    if x.len() > 6 && &x[..6] == b"xmlns:" {
                        Namespace.try_report_as_key_value(&x[6..], &attr);
                    }
                }
            },
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_adaptation_set_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
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
                b"subsegmentAlignment" => SubsegmentAlignment.try_report_as_u64_or_bool(&attr),
                b"bitstreamSwitching" => BitstreamSwitching.try_report_as_bool(&attr),
                b"audioSamplingRate" => AudioSamplingRate.try_report_as_string(&attr),
                b"codecs" => Codecs.try_report_as_string(&attr),
                b"scte214:supplementalCodecs" => SupplementalCodecs.try_report_as_string(&attr),
                b"profiles" => Profiles.try_report_as_string(&attr),
                b"segmentProfiles" => SegmentProfiles.try_report_as_string(&attr),
                b"mimeType" => MimeType.try_report_as_string(&attr),
                b"codingDependency" => CodingDependency.try_report_as_bool(&attr),
                b"frameRate" => FrameRate.try_report_as_maybe_division(&attr),
                b"height" => Height.try_report_as_u64(&attr),
                b"width" => Width.try_report_as_u64(&attr),
                b"maxPlayoutRate" => MaxPlayoutRate.try_report_as_f64(&attr),
                b"maxSAPPeriod" => MaxSAPPeriod.try_report_as_f64(&attr),
                b"availabilityTimeOffset" => match attr.value {
                    b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                    _ => AvailabilityTimeOffset.try_report_as_f64(&attr),
                },
                b"availabilityTimeComplete" => AvailabilityTimeComplete.try_report_as_bool(&attr),
                _ => {}
            },
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_representation_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"id" => Id.try_report_as_string(&attr),
                b"audioSamplingRate" => AudioSamplingRate.try_report_as_string(&attr),
                b"bandwidth" => Bitrate.try_report_as_u64(&attr),
                b"codecs" => Codecs.try_report_as_string(&attr),
                b"scte214:supplementalCodecs" => SupplementalCodecs.try_report_as_string(&attr),
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
                b"availabilityTimeOffset" => match attr.value {
                    b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                    _ => AvailabilityTimeOffset.try_report_as_f64(&attr),
                },
                b"availabilityTimeComplete" => AvailabilityTimeComplete.try_report_as_bool(&attr),
                _ => {}
            },
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_base_url_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => {
                if let b"serviceLocation" = attr.key {
                    ServiceLocation.try_report_as_string(&attr)
                }
            }
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_segment_template_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"initialization" => InitializationMedia.try_report_as_string(&attr),
                b"index" => Index.try_report_as_string(&attr),
                b"timescale" => TimeScale.try_report_as_u64(&attr),
                b"presentationTimeOffset" => PresentationTimeOffset.try_report_as_f64(&attr),
                b"indexRange" => IndexRange.try_report_as_range(&attr),
                b"indexRangeExact" => IndexRangeExact.try_report_as_bool(&attr),
                b"availabilityTimeOffset" => match attr.value {
                    b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                    _ => AvailabilityTimeOffset.try_report_as_f64(&attr),
                },
                b"availabilityTimeComplete" => AvailabilityTimeComplete.try_report_as_bool(&attr),
                b"duration" => Duration.try_report_as_u64(&attr),
                b"startNumber" => StartNumber.try_report_as_u64(&attr),
                b"endNumber" => EndNumber.try_report_as_u64(&attr),
                b"media" => Media.try_report_as_string(&attr),
                b"bitstreamSwitching" => BitstreamSwitching.try_report_as_bool(&attr),
                _ => {}
            },
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_segment_base_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"timescale" => TimeScale.try_report_as_u64(&attr),
                b"presentationTimeOffset" => PresentationTimeOffset.try_report_as_f64(&attr),
                b"indexRange" => IndexRange.try_report_as_range(&attr),
                b"indexRangeExact" => IndexRangeExact.try_report_as_bool(&attr),
                b"availabilityTimeOffset" => match attr.value {
                    b"INF" => AvailabilityTimeOffset.report(f64::INFINITY),
                    _ => AvailabilityTimeOffset.try_report_as_f64(&attr),
                },
                b"availabilityTimeComplete" => AvailabilityTimeComplete.try_report_as_bool(&attr),
                b"duration" => Duration.try_report_as_u64(&attr),
                b"startNumber" => StartNumber.try_report_as_u64(&attr),
                b"endNumber" => EndNumber.try_report_as_u64(&attr),
                _ => {}
            },
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_content_component_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"id" => Id.try_report_as_string(&attr),
                b"lang" => Language.try_report_as_string(&attr),
                b"contentType" => ContentType.try_report_as_string(&attr),
                b"par" => Par.try_report_as_string(&attr),
                _ => {}
            },
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_content_protection_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"schemeIdUri" => SchemeIdUri.try_report_as_string(&attr),
                b"value" => ContentProtectionValue.try_report_as_string(&attr),
                b"ref" => ContentProtectionRef.try_report_as_string(&attr),
                b"refId" => ContentProtectionRefId.try_report_as_string(&attr),

                // TODO convert hex to bytes here?
                b"cenc:default_KID" => ContentProtectionKeyId.try_report_as_string(&attr),
                _ => {}
            },
            Err(err) => err.report_err(),
        };
    }
}

/// Report attributes encountered in an `<Initialization>` element.
pub fn report_initialization_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"range" => InitializationRange.try_report_as_range(&attr),
                b"sourceURL" => InitializationMedia.try_report_as_string(&attr),
                _ => {}
            },
            Err(err) => err.report_err(),
        };
    }
}

/// Report attributes encountered in "Scheme-like" element.
///
/// A scheme-like element is an element containing two properties, both under
/// a string form:
///   - "schemeIdUri"
///   - "value"
pub fn report_scheme_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"schemeIdUri" => SchemeIdUri.try_report_as_string(&attr),
                b"value" => SchemeValue.try_report_as_string(&attr),
                _ => {}
            },
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_segment_url_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"index" => Index.try_report_as_string(&attr),
                b"indexRange" => IndexRange.try_report_as_range(&attr),
                b"media" => Media.try_report_as_string(&attr),
                b"mediaRange" => MediaRange.try_report_as_range(&attr),
                _ => {}
            },
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_event_stream_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
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
            Err(err) => err.report_err(),
        };
    }
}

pub fn report_event_stream_event_attrs(element: &crate::xml::Element) {
    for res_attr in element.attributes() {
        match res_attr {
            Ok(attr) => match attr.key {
                b"presentationTime" => EventPresentationTime.try_report_as_u64(&attr),
                b"duration" => Duration.try_report_as_u64(&attr),
                b"id" => Id.try_report_as_string(&attr),
                _ => {}
            },
            Err(err) => err.report_err(),
        };
    }
}
