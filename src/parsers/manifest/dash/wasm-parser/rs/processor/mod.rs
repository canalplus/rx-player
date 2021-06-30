use std::io::{BufReader, Cursor};
use quick_xml::{Reader, Writer};
use quick_xml::events::Event;

mod attributes;
mod s_element;

use crate::events::*;
use crate::errors::ParsingError;
use crate::reader::MPDReader;

pub use s_element::SegmentObject;

pub struct MPDProcessor {
    reader : quick_xml::Reader<BufReader<MPDReader>>,
    reader_buf : Vec<u8>,
    segment_objs_buf : Vec<SegmentObject>,
}

impl MPDProcessor {
    /// Creates a new MPDProcessor.
    ///
    /// # Arguments
    ///
    /// * `reader` - A BufReader allowing to read the MPD document
    pub fn new(reader : BufReader<MPDReader>) -> Self {
        let mut reader = Reader::from_reader(reader);
        reader.expand_empty_elements(true);
        reader.trim_text(true);
        reader.check_end_names(false);
        MPDProcessor {
            reader,
            reader_buf: Vec::new(),
            segment_objs_buf: Vec::new(),
        }
    }

    pub fn process_tags(&mut self) {
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) => match tag.name() {
                    b"MPD" => {
                        TagName::MPD.report_tag_open();
                        attributes::report_mpd_attrs(&tag);
                    },
                    b"Period" => {
                        TagName::Period.report_tag_open();
                        attributes::report_period_attrs(&tag);
                    },
                    b"AdaptationSet" => {
                        TagName::AdaptationSet.report_tag_open();
                        attributes::report_adaptation_set_attrs(&tag);
                    },
                    b"Representation" => {
                        TagName::Representation.report_tag_open();
                        attributes::report_representation_attrs(&tag);
                    },
                    b"Accessibility" => {
                        TagName::Accessibility.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    },
                    b"ContentComponent" => {
                        TagName::ContentComponent.report_tag_open();
                        attributes::report_content_component_attrs(&tag);
                    },
                    b"ContentProtection" => {
                        TagName::ContentProtection.report_tag_open();
                        attributes::report_content_protection_attrs(&tag);
                    },
                    b"EssentialProperty" => {
                        TagName::EssentialProperty.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    },
                    b"InbandEventStream" => {
                        TagName::InbandEventStream.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    },
                    b"Role" => {
                        TagName::Role.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    },
                    b"SupplementalProperty" => {
                        TagName::SupplementalProperty.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    },
                    b"SegmentBase" => {
                        TagName::SegmentBase.report_tag_open();
                        attributes::report_segment_base_attrs(&&tag);
                    },
                    b"Initialization" => attributes::report_initialization_attrs(&tag),
                    b"SegmentTemplate" => {
                        TagName::SegmentTemplate.report_tag_open();
                        attributes::report_segment_template_attrs(&&tag);
                    },
                    b"SegmentList" => {
                        TagName::SegmentList.report_tag_open();

                        // Re-use SegmentBase-one as it should not be different
                        attributes::report_segment_base_attrs(&&tag);
                    },
                    b"SegmentURL" => {
                        TagName::SegmentUrl.report_tag_open();
                        attributes::report_segment_url_attrs(&tag);
                    },
                    b"UTCTiming" => {
                        TagName::UtcTiming.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                    },

                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        self.process_base_url_element();
                    },
                    b"cenc:pssh" => self.process_cenc_element(),
                    b"Location" => self.process_location_element(),
                    b"SegmentTimeline" =>
                        self.process_segment_timeline_element(),

                    b"EventStream" => {
                        TagName::EventStream.report_tag_open();
                        attributes::report_event_stream_attrs(&tag);
                        self.process_event_stream_element();
                    },

                    _ => {}
                },
                Ok(Event::End(tag)) => match tag.name() {
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
                    b"SupplementalProperty" =>
                        TagName::SupplementalProperty.report_tag_close(),
                    b"SegmentBase" => TagName::SegmentBase.report_tag_close(),
                    b"SegmentList" => TagName::SegmentList.report_tag_close(),
                    b"SegmentURL" => TagName::SegmentUrl.report_tag_close(),
                    b"SegmentTemplate" => TagName::SegmentTemplate.report_tag_close(),
                    b"UTCTiming" => TagName::UtcTiming.report_tag_close(),
                    _ => {},
                },
                Ok(Event::Eof) => {
                    break;
                }
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
        }
    }

    /// Read the MPD document until an "Event" (@see quick-xml documentation)
    /// is encountered.
    ///
    /// This method is always inlined for optimization reasons as it is both
    /// short and generally used in loops.
    #[inline(always)]
    fn read_next_event(&mut self) -> quick_xml::Result<quick_xml::events::Event> {
        if !self.reader_buf.is_empty() {
            self.reader_buf.clear();
        }
        self.reader.read_event(&mut self.reader_buf)
    }

    /// Loop over a SegmentTimeline's children (to call when a <SegmentTimeline>
    /// node just has been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing SegmentTemplate tag has been found or until EOF is encountered.
    fn process_segment_timeline_element(&mut self) {
        // Count inner SegmentTimeline tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_tag : u32 = 0;

        // Will store the ending timestamp of the previous <S> element, starting
        // at `0`.
        // Most subsequent <S> elements won't explicitly indicate a starting
        // timestamp which indicates that they start at the end of the previous
        // <S> element (its starting timestamp + its duration).
        let mut curr_time_base : f64 = 0.;

        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) | Ok(Event::Empty(tag)) if tag.name() == b"S" => {
                    match SegmentObject::from_s_element(&tag, curr_time_base) {
                        Ok(segment_obj) => {
                            if segment_obj.repeat_count == 0. {
                                curr_time_base = segment_obj.start + segment_obj.duration;
                            } else {
                                let duration = segment_obj.duration * (segment_obj.repeat_count + 1.);
                                curr_time_base = segment_obj.start + duration;
                            }
                            self.segment_objs_buf.push(segment_obj);
                        },
                        Err(err) => err.report_err(),
                    }
                },
                Ok(Event::Start(tag)) if tag.name() == b"SegmentTimeline" =>
                    inner_tag += 1,
                Ok(Event::End(tag)) if tag.name() == b"SegmentTimeline" => {
                    if inner_tag > 0 {
                        inner_tag -= 1;
                    } else {
                        AttributeName::SegmentTimeline.report(self.segment_objs_buf.as_slice());
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a SegmentTimeline.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => (),
            }
        }
        self.segment_objs_buf.clear();
    }

    fn process_location_element(&mut self) {
        // Count inner Location tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_tag : u32 = 0;

        loop {
            match self.read_next_event() {
                Ok(Event::Text(t)) => if t.len() > 0 {
                    match t.unescaped() {
                        Ok(unescaped) => AttributeName::Location.report(unescaped),
                        Err(err) => ParsingError::from(err).report_err(),
                    }
                },
                Ok(Event::Start(tag)) if tag.name() == b"Location" => inner_tag += 1,
                Ok(Event::End(tag)) if tag.name() == b"Location" => {
                    if inner_tag > 0 {
                        inner_tag -= 1;
                    } else {
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a Location tag.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    fn process_base_url_element(&mut self) {
        // Count inner BaseURL tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_tag : u32 = 0;

        loop {
            match self.read_next_event() {
                Ok(Event::Text(t)) => if t.len() > 0 {
                    match t.unescaped() {
                        Ok(unescaped) => AttributeName::Text.report(unescaped),
                        Err(err) => ParsingError::from(err).report_err(),
                    }
                },
                Ok(Event::Start(tag)) if tag.name() == b"BaseURL" => inner_tag += 1,
                Ok(Event::End(tag)) if tag.name() == b"BaseURL" => {
                    if inner_tag > 0 {
                        inner_tag -= 1;
                    } else {
                        TagName::BaseURL.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a BaseURL.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    fn process_cenc_element(&mut self) {
        // Count inner cenc:pssh tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_tag : u32 = 0;

        loop {
            match self.read_next_event() {
                Ok(Event::Text(t)) => if t.len() > 0 {
                    match t.unescaped() {
                        Ok(unescaped) =>
                            // TODO parse from base64 here?
                            AttributeName::ContentProtectionCencPSSH.report(unescaped),
                        Err(err) => ParsingError::from(err).report_err(),
                    }
                },
                Ok(Event::Start(tag)) if tag.name() == b"cenc:pssh" => inner_tag += 1,
                Ok(Event::End(tag)) if tag.name() == b"cenc:pssh" => {
                    if inner_tag > 0 {
                        inner_tag -= 1;
                    } else {
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a cenc:pssh tag.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    fn process_event_stream_element(&mut self) {
        // Count inner EventStream tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_tag = 0u32;


        loop {
            let evt = self.read_next_event();
            match evt {
                Ok(Event::Start(tag)) if tag.name() == b"Event" => {
                    TagName::EventStreamElt.report_tag_open();
                    attributes::report_event_stream_event_attrs(&tag);
                    let mut writer = Writer::new(Cursor::new(Vec::new()));
                    let _res = writer.write_event(Event::Start(tag));
                    self.process_event_stream_event_element(writer);
                },
                Ok(Event::Start(tag)) if tag.name() == b"EventStream" => inner_tag += 1,
                Ok(Event::End(tag)) if tag.name() == b"EventStream" => {
                    if inner_tag > 0 { inner_tag -= 1; }
                    else {
                        TagName::EventStream.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a EventStream.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    fn process_event_stream_event_element(
        &mut self,
        mut writer: Writer<std::io::Cursor<Vec<u8>>>
    ) {
        // We want to receive Text Events with the exact same format here, to
        // be able to report the exact Event's inner content
        self.reader.trim_text(false);
        let mut inner_event_tag = 0u32;
        loop {
            let read = self.read_next_event();
            if let Ok(ref evt) = read {
                let _res = writer.write_event(evt);
            }
            match read {
                Ok(Event::Start(tag)) if tag.name() == b"Event" => inner_event_tag += 1,
                Ok(Event::End(tag)) if tag.name() == b"Event" => {
                    if inner_event_tag > 0 {
                        inner_event_tag -= 1;
                    } else {
                        use crate::reportable::ReportableAttribute;
                        let content = writer.into_inner().into_inner();
                        content.report_as_attr(AttributeName::EventStreamEvent);
                        TagName::EventStreamElt.report_tag_close();
                        break;
                    }
                }
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in an Event element.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => {},
            }
        }
        self.reader.trim_text(true);
    }
}
