mod attributes;
mod s_element;

use crate::errors::ParsingError;
use crate::events::*;
use crate::reader::MPDReader;
use crate::xml::{Event, Reader};

pub use s_element::SegmentObject;

pub struct MPDProcessor {
    reader: Reader<MPDReader>,
    segment_objs_buf: Vec<SegmentObject>,
}

impl MPDProcessor {
    /// Creates a new MPDProcessor.
    ///
    /// # Arguments
    ///
    /// * `reader` - Reader allowing to read the MPD document
    pub fn new(reader: MPDReader) -> Self {
        MPDProcessor {
            reader: Reader::new(reader),
            segment_objs_buf: Vec::new(),
        }
    }

    pub fn process(&mut self) {
        loop {
            match self.reader.read_event() {
                Ok(Event::Start(tag)) => match tag.name() {
                    b"MPD" => {
                        TagName::MPD.report_tag_open();
                        attributes::report_mpd_attrs(&tag);
                    }
                    b"Period" => {
                        TagName::Period.report_tag_open();
                        attributes::report_period_attrs(&tag);
                    }
                    b"AdaptationSet" => {
                        TagName::AdaptationSet.report_tag_open();
                        attributes::report_adaptation_set_attrs(&tag);
                    }
                    b"Representation" => {
                        TagName::Representation.report_tag_open();
                        attributes::report_representation_attrs(&tag);
                    }
                    b"Accessibility" => {
                        TagName::Accessibility.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    }
                    b"ContentComponent" => {
                        TagName::ContentComponent.report_tag_open();
                        attributes::report_content_component_attrs(&tag);
                    }
                    b"ContentProtection" => {
                        TagName::ContentProtection.report_tag_open();
                        attributes::report_content_protection_attrs(&tag);
                    }
                    b"EssentialProperty" => {
                        TagName::EssentialProperty.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    }
                    b"InbandEventStream" => {
                        TagName::InbandEventStream.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    }
                    b"Role" => {
                        TagName::Role.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    }
                    b"SupplementalProperty" => {
                        TagName::SupplementalProperty.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    }
                    b"SegmentBase" => {
                        TagName::SegmentBase.report_tag_open();
                        attributes::report_segment_base_attrs(&tag);
                    }
                    b"Initialization" => {
                        TagName::Initialization.report_tag_open();
                        attributes::report_initialization_attrs(&tag);
                    }
                    b"SegmentTemplate" => {
                        TagName::SegmentTemplate.report_tag_open();
                        attributes::report_segment_template_attrs(&tag);
                    }
                    b"SegmentList" => {
                        TagName::SegmentList.report_tag_open();

                        // Re-use SegmentBase-one as it should not be different
                        attributes::report_segment_base_attrs(&tag);
                    }
                    b"SegmentURL" => {
                        TagName::SegmentUrl.report_tag_open();
                        attributes::report_segment_url_attrs(&tag);
                    }
                    b"UTCTiming" => {
                        TagName::UtcTiming.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    }

                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        self.process_base_url_element();
                    }
                    b"cenc:pssh" => self.process_cenc_pssh_element(),
                    b"Location" => self.process_location_element(),
                    b"Label" => {
                        TagName::Label.report_tag_open();
                        self.process_label_element();
                    }
                    b"SegmentTimeline" => self.process_segment_timeline_element(),

                    b"EventStream" => {
                        TagName::EventStream.report_tag_open();
                        attributes::report_event_stream_attrs(&tag);
                        self.process_event_stream_element();
                    }

                    _ => {}
                },
                // Handle empty elements directly. Expanding them into synthetic Start and End
                // events adds substantial work on large explicit SegmentTimelines, where every
                // `<S />` is empty.
                Ok(Event::Empty(tag)) => match tag.name() {
                    b"MPD" => {
                        TagName::MPD.report_tag_open();
                        attributes::report_mpd_attrs(&tag);
                        TagName::MPD.report_tag_close();
                    }
                    b"Period" => {
                        TagName::Period.report_tag_open();
                        attributes::report_period_attrs(&tag);
                        TagName::Period.report_tag_close();
                    }
                    b"AdaptationSet" => {
                        TagName::AdaptationSet.report_tag_open();
                        attributes::report_adaptation_set_attrs(&tag);
                        TagName::AdaptationSet.report_tag_close();
                    }
                    b"Representation" => {
                        TagName::Representation.report_tag_open();
                        attributes::report_representation_attrs(&tag);
                        TagName::Representation.report_tag_close();
                    }
                    b"Accessibility" => {
                        TagName::Accessibility.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::Accessibility.report_tag_close();
                    }
                    b"ContentComponent" => {
                        TagName::ContentComponent.report_tag_open();
                        attributes::report_content_component_attrs(&tag);
                        TagName::ContentComponent.report_tag_close();
                    }
                    b"ContentProtection" => {
                        TagName::ContentProtection.report_tag_open();
                        attributes::report_content_protection_attrs(&tag);
                        TagName::ContentProtection.report_tag_close();
                    }
                    b"EssentialProperty" => {
                        TagName::EssentialProperty.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::EssentialProperty.report_tag_close();
                    }
                    b"InbandEventStream" => {
                        TagName::InbandEventStream.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::InbandEventStream.report_tag_close();
                    }
                    b"Role" => {
                        TagName::Role.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::Role.report_tag_close();
                    }
                    b"SupplementalProperty" => {
                        TagName::SupplementalProperty.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::SupplementalProperty.report_tag_close();
                    }
                    b"SegmentBase" => {
                        TagName::SegmentBase.report_tag_open();
                        attributes::report_segment_base_attrs(&tag);
                        TagName::SegmentBase.report_tag_close();
                    }
                    b"Initialization" => {
                        TagName::Initialization.report_tag_open();
                        attributes::report_initialization_attrs(&tag);
                        TagName::Initialization.report_tag_close();
                    }
                    b"SegmentTemplate" => {
                        TagName::SegmentTemplate.report_tag_open();
                        attributes::report_segment_template_attrs(&tag);
                        TagName::SegmentTemplate.report_tag_close();
                    }
                    b"SegmentList" => {
                        TagName::SegmentList.report_tag_open();
                        attributes::report_segment_base_attrs(&tag);
                        TagName::SegmentList.report_tag_close();
                    }
                    b"SegmentURL" => {
                        TagName::SegmentUrl.report_tag_open();
                        attributes::report_segment_url_attrs(&tag);
                        TagName::SegmentUrl.report_tag_close();
                    }
                    b"UTCTiming" => {
                        TagName::UtcTiming.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::UtcTiming.report_tag_close();
                    }
                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        TagName::BaseURL.report_tag_close();
                    }
                    b"Label" => {
                        TagName::Label.report_tag_open();
                        TagName::Label.report_tag_close();
                    }
                    b"SegmentTimeline" => {
                        AttributeName::SegmentTimeline.report(&[] as &[SegmentObject])
                    }
                    b"EventStream" => {
                        TagName::EventStream.report_tag_open();
                        attributes::report_event_stream_attrs(&tag);
                        TagName::EventStream.report_tag_close();
                    }
                    // Empty Location and cenc:pssh elements have no content to report.
                    _ => {}
                },
                Ok(Event::End(tag)) => match tag {
                    b"MPD" => TagName::MPD.report_tag_close(),
                    b"Period" => TagName::Period.report_tag_close(),
                    b"AdaptationSet" => TagName::AdaptationSet.report_tag_close(),
                    b"Representation" => TagName::Representation.report_tag_close(),
                    b"Accessibility" => TagName::Accessibility.report_tag_close(),
                    b"ContentComponent" => TagName::ContentComponent.report_tag_close(),
                    b"ContentProtection" => TagName::ContentProtection.report_tag_close(),
                    b"EssentialProperty" => TagName::EssentialProperty.report_tag_close(),
                    b"InbandEventStream" => TagName::InbandEventStream.report_tag_close(),
                    b"Role" => TagName::Role.report_tag_close(),
                    b"SupplementalProperty" => TagName::SupplementalProperty.report_tag_close(),
                    b"SegmentBase" => TagName::SegmentBase.report_tag_close(),
                    b"SegmentList" => TagName::SegmentList.report_tag_close(),
                    b"SegmentURL" => TagName::SegmentUrl.report_tag_close(),
                    b"SegmentTemplate" => TagName::SegmentTemplate.report_tag_close(),
                    b"Initialization" => TagName::Initialization.report_tag_close(),
                    b"UTCTiming" => TagName::UtcTiming.report_tag_close(),
                    _ => {}
                },
                Ok(Event::Eof) => {
                    break;
                }
                Err(e) => e.report_err(),
                _ => (),
            }
        }
    }

    /// Loop over a SegmentTimeline's children (to call when a <SegmentTimeline>
    /// node just has been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing SegmentTimeline tag has been found or until EOF is encountered.
    fn process_segment_timeline_element(&mut self) {
        // Will store the ending timestamp of the previous <S> element, starting
        // at `0`.
        // Most subsequent <S> elements won't explicitly indicate a starting
        // timestamp which indicates that they start at the end of the previous
        // <S> element (its starting timestamp + its duration).
        let mut curr_time_base: f64 = 0.;

        loop {
            match self.reader.read_event() {
                Ok(Event::Start(tag)) | Ok(Event::Empty(tag)) if tag.name() == b"S" => {
                    match SegmentObject::from_s_element(&tag, curr_time_base) {
                        Ok(segment_obj) => {
                            if segment_obj.repeat_count == 0. {
                                curr_time_base = segment_obj.start + segment_obj.duration;
                            } else {
                                let duration =
                                    segment_obj.duration * (segment_obj.repeat_count + 1.);
                                curr_time_base = segment_obj.start + duration;
                            }
                            self.segment_objs_buf.push(segment_obj);
                        }
                        Err(err) => err.report_err(),
                    }
                }
                Ok(Event::End(name)) if name == b"SegmentTimeline" => {
                    AttributeName::SegmentTimeline.report(self.segment_objs_buf.as_slice());
                    break;
                }
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a SegmentTimeline.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => {
                    e.report_err();
                    break;
                }
                _ => (),
            }
        }
        self.segment_objs_buf.clear();
    }

    fn process_location_element(&mut self) {
        self.process_text_element(
            b"Location",
            AttributeName::Location,
            None,
            "Unexpected end of file in a Location tag.",
        );
    }

    fn process_label_element(&mut self) {
        self.process_text_element(
            b"Label",
            AttributeName::Text,
            Some(TagName::Label),
            "Unexpected end of file in a Label tag.",
        );
    }

    fn process_base_url_element(&mut self) {
        self.process_text_element(
            b"BaseURL",
            AttributeName::Text,
            Some(TagName::BaseURL),
            "Unexpected end of file in a BaseURL.",
        );
    }

    fn process_cenc_pssh_element(&mut self) {
        self.process_text_element(
            b"cenc:pssh",
            AttributeName::ContentProtectionCencPSSH,
            None,
            "Unexpected end of file in a cenc:pssh tag.",
        );
    }

    fn process_text_element(
        &mut self,
        element_name: &[u8],
        attribute_name: AttributeName,
        reported_tag: Option<TagName>,
        eof_error: &str,
    ) {
        loop {
            match self.reader.read_event() {
                Ok(Event::Text(text)) if text.len() > 0 => match text.unescape() {
                    Ok(value) => attribute_name.report(value),
                    Err(error) => error.report_err(),
                },
                Ok(Event::End(name)) if name == element_name => {
                    if let Some(tag_name) = reported_tag {
                        tag_name.report_tag_close();
                    }
                    break;
                }
                Ok(Event::Eof) => {
                    ParsingError(eof_error.to_owned()).report_err();
                    break;
                }
                Err(error) => {
                    error.report_err();
                    break;
                }
                _ => {}
            }
        }
    }

    fn process_event_stream_element(&mut self) {
        // Count inner EventStream tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        // A foreign namespace may reuse the EventStream local name inside this element.
        let mut nested_event_streams = 0u32;

        loop {
            // Event contents are exposed through the public API as XML. Report their byte range
            // so JavaScript can retain the original serialization, including namespaces.
            let event_start_position = self.reader.position();

            match self.reader.read_event() {
                Ok(Event::Start(tag)) if tag.name() == b"Event" => {
                    TagName::EventStreamElt.report_tag_open();
                    attributes::report_event_stream_event_attrs(&tag);
                    match self.read_event_end_position() {
                        Ok(event_end_position) => {
                            AttributeName::EventStreamEltRange
                                .report((event_start_position as f64, event_end_position as f64));
                        }
                        Err(e) => e.report_err(),
                    }
                    TagName::EventStreamElt.report_tag_close();
                }
                Ok(Event::Empty(tag)) if tag.name() == b"Event" => {
                    TagName::EventStreamElt.report_tag_open();
                    attributes::report_event_stream_event_attrs(&tag);
                    let event_end_position = self.reader.position();
                    AttributeName::EventStreamEltRange
                        .report((event_start_position as f64, event_end_position as f64));
                    TagName::EventStreamElt.report_tag_close();
                }
                Ok(Event::Start(tag)) if tag.name() == b"EventStream" => nested_event_streams += 1,
                Ok(Event::End(tag)) if tag == b"EventStream" => {
                    if nested_event_streams > 0 {
                        nested_event_streams -= 1;
                    } else {
                        TagName::EventStream.report_tag_close();
                        break;
                    }
                }
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a EventStream.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => {
                    e.report_err();
                    break;
                }
                _ => (),
            }
        }
    }

    /// Read through the current Event and return the position just after its closing tag.
    fn read_event_end_position(&mut self) -> Result<usize, ParsingError> {
        // A foreign namespace may reuse the Event local name inside the DASH Event.
        let mut nested_events = 0u32;
        loop {
            match self.reader.read_event()? {
                Event::Start(tag) if tag.name() == b"Event" => nested_events += 1,
                Event::End(tag) if tag == b"Event" => {
                    if nested_events > 0 {
                        nested_events -= 1;
                    } else {
                        return Ok(self.reader.position());
                    }
                }
                Event::Eof => {
                    return Err(ParsingError(
                        "Unexpected end of file in an Event element.".to_owned(),
                    ));
                }
                _ => {}
            }
        }
    }
}
