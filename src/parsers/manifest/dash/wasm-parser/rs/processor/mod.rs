use std::io::BufReader;
use quick_xml::Reader;
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
        reader.trim_text(true);
        reader.check_end_names(false);
        MPDProcessor {
            reader,
            reader_buf: Vec::new(),
            segment_objs_buf: Vec::new(),
        }
    }

    /// "Process" MPD starting from the root of the document.
    ///
    /// The `MPDProcessor` will then call the right "reporting" functions as it
    /// encounters recognized tags and attributes.
    ///
    /// This is the main entry point of the MPDProcessor when you want to
    /// parse a new MPD.
    pub fn process_document(&mut self) {
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) if tag.name() == b"MPD" => {
                    TagName::MPD.report_tag_open();
                    attributes::report_mpd_attrs(&tag);
                    self.process_mpd_element();
                },
                Ok(Event::Empty(tag)) if tag.name() == b"MPD" => {
                    TagName::MPD.report_tag_open();
                    attributes::report_mpd_attrs(&tag);
                    TagName::MPD.report_tag_close();
                },
                Ok(Event::Eof) => break,
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    /// "Process" an XLink, which is an externalized sub-part of an MPD (usually
    /// only containing one or multiple <Period> elements).
    ///
    /// The `MPDProcessor` will then call the right "reporting" functions as it
    /// encounters recognized tags and attributes.
    pub fn process_xlink(&mut self) {
        self.reader_buf.clear();
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) if tag.name() == b"Period" => {
                    TagName::Period.report_tag_open();
                    attributes::report_period_attrs(&tag);
                    self.process_period_element();
                },
                Ok(Event::Empty(tag)) if tag.name() == b"Period" => {
                    TagName::Period.report_tag_open();
                    attributes::report_period_attrs(&tag);
                    TagName::Period.report_tag_close();
                },
                Ok(Event::Eof) => break, // exits the loop when reaching end of file
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
            self.reader_buf.clear();
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

    /// Browse through a just-encountered <MPD> node, calling the right reporting
    /// APIs when it encounters recognized inner tags and attributes.
    fn process_mpd_element(&mut self) {
        // Count inner MPD tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_mpd_tag : u32 = 0;
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) => match tag.name() {
                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        self.process_base_url_element();
                    },
                    b"Location" => self.process_location_element(),
                    b"Period" => {
                        TagName::Period.report_tag_open();
                        attributes::report_period_attrs(&tag);
                        self.process_period_element();
                    },
                    b"UTCTiming" => {
                        TagName::UtcTiming.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::UtcTiming.report_tag_close();
                    },
                    b"MPD" => inner_mpd_tag += 1,
                    _ => {}
                },
                Ok(Event::Empty(tag)) => match tag.name() {
                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        TagName::BaseURL.report_tag_close();
                    },
                    b"Location" => self.process_location_element(),
                    b"Period" => {
                        TagName::Period.report_tag_open();
                        attributes::report_period_attrs(&tag);
                        TagName::Period.report_tag_close();
                    },
                    b"UTCTiming" => {
                        TagName::UtcTiming.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::UtcTiming.report_tag_close();
                    },
                    _ => {}
                },
                Ok(Event::End(tag)) if tag.name() == b"MPD" => {
                    if inner_mpd_tag > 0 {
                        inner_mpd_tag -= 1;
                    } else {
                        TagName::MPD.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a MPD.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
        }
    }

    /// Loop over a Period's children (to call when a <Period> node just has
    /// been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing Period tag has been found or until EOF is encountered.
    fn process_period_element(&mut self) {
        // Count inner Period tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_period_tag : u32 = 0;
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) => match tag.name() {
                    b"AdaptationSet" => {
                        TagName::AdaptationSet.report_tag_open();
                        attributes::report_adaptation_set_attrs(&tag);
                        self.process_adaptation_set_element();
                    },
                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        self.process_base_url_element();
                    },
                    b"EventStream" => {
                        TagName::EventStream.report_tag_open();
                        attributes::report_event_stream_attrs(&tag);
                        self.process_event_stream_element();
                    },
                    b"SegmentTemplate" => {
                        TagName::SegmentTemplate.report_tag_open();
                        attributes::report_segment_template_attrs(&&tag);
                        self.process_segment_template_element();
                    },
                    b"Period" => inner_period_tag += 1,
                    _ => {}
                },
                Ok(Event::Empty(tag)) => match tag.name() {
                    b"AdaptationSet" => {
                        TagName::AdaptationSet.report_tag_open();
                        attributes::report_adaptation_set_attrs(&tag);
                        TagName::AdaptationSet.report_tag_close();
                    },
                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        TagName::BaseURL.report_tag_close();
                    },
                    b"EventStream" => {
                        TagName::EventStream.report_tag_open();
                        attributes::report_event_stream_attrs(&tag);
                        TagName::EventStream.report_tag_open();
                    },
                    b"SegmentTemplate" => {
                        TagName::SegmentTemplate.report_tag_open();
                        attributes::report_segment_template_attrs(&&tag);
                        TagName::SegmentTemplate.report_tag_close();
                    },
                    _ => {}
                },
                Ok(Event::End(tag)) if tag.name() == b"Period" => {
                    if inner_period_tag > 0 {
                        inner_period_tag -= 1;
                    } else {
                        TagName::Period.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a Period.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
        }
    }

    /// Loop over an AdaptationSet's children (to call when an <AdaptationSet>
    /// node just has been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing AdaptationSet tag has been found or until EOF is encountered.
    fn process_adaptation_set_element(&mut self) {
        // Count inner AdaptationSet tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_adaptation_set_tag : u32 = 0;
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) => match tag.name() {
                    b"Accessibility" => {
                        TagName::Accessibility.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::Accessibility.report_tag_close();
                    },
                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        self.process_base_url_element();
                    },
                    b"ContentComponent" => {
                        TagName::ContentComponent.report_tag_open();
                        attributes::report_content_component_attrs(&tag);
                        TagName::ContentComponent.report_tag_close();
                    },
                    b"ContentProtection" => {
                        TagName::ContentProtection.report_tag_open();
                        attributes::report_content_protection_attrs(&tag);
                        self.process_content_protection_element();
                    },
                    b"EssentialProperty" => {
                        TagName::EssentialProperty.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::EssentialProperty.report_tag_close();
                    },
                    b"InbandEventStream" => {
                        TagName::InbandEventStream.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::InbandEventStream.report_tag_close();
                    },
                    b"Representation" => {
                        TagName::Representation.report_tag_open();
                        attributes::report_representation_attrs(&tag);
                        self.process_representation_element();
                    },
                    b"Role" => {
                        TagName::Role.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::Role.report_tag_close();
                    },
                    b"SupplementalProperty" => {
                        TagName::SupplementalProperty.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::SupplementalProperty.report_tag_close();
                    },
                    b"SegmentBase" => {
                        TagName::SegmentBase.report_tag_open();
                        attributes::report_segment_base_attrs(&&tag);
                        self.process_segment_base_element();
                    },
                    b"SegmentList" => {
                        TagName::SegmentList.report_tag_open();

                        // Re-use SegmentBase-one as it should not be different
                        attributes::report_segment_base_attrs(&&tag);
                        self.process_segment_list_element();
                    },
                    b"SegmentTemplate" => {
                        TagName::SegmentTemplate.report_tag_open();
                        attributes::report_segment_template_attrs(&&tag);
                        self.process_segment_template_element();
                    },
                    b"AdaptationSet" => inner_adaptation_set_tag += 1,
                    _ => {}
                },
                Ok(Event::Empty(tag)) => match tag.name() {
                    b"Accessibility" => {
                        TagName::Accessibility.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::Accessibility.report_tag_close();
                    },
                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        TagName::BaseURL.report_tag_close();
                    },
                    b"ContentComponent" => {
                        TagName::ContentComponent.report_tag_open();
                        attributes::report_content_component_attrs(&tag);
                        TagName::ContentComponent.report_tag_close();
                    },
                    b"ContentProtection" => {
                        TagName::ContentProtection.report_tag_open();
                        attributes::report_content_protection_attrs(&tag);
                        TagName::ContentProtection.report_tag_close();
                    },
                    b"EssentialProperty" => {
                        TagName::EssentialProperty.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::EssentialProperty.report_tag_close();
                    },
                    b"InbandEventStream" => {
                        TagName::InbandEventStream.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::InbandEventStream.report_tag_close();
                    },
                    b"Representation" => {
                        TagName::Representation.report_tag_open();
                        attributes::report_representation_attrs(&tag);
                        TagName::Representation.report_tag_close();
                    },
                    b"Role" => {
                        TagName::Role.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::Role.report_tag_close();
                    },
                    b"SupplementalProperty" => {
                        TagName::SupplementalProperty.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::SupplementalProperty.report_tag_close();
                    },
                    b"SegmentBase" => {
                        TagName::SegmentBase.report_tag_open();
                        attributes::report_segment_base_attrs(&&tag);
                        TagName::SegmentBase.report_tag_close();
                    },
                    b"SegmentTemplate" => {
                        TagName::SegmentTemplate.report_tag_open();
                        attributes::report_segment_template_attrs(&tag);
                        TagName::SegmentTemplate.report_tag_close();
                    },
                    _ => {}
                },
                Ok(Event::End(tag)) if tag.name() == b"AdaptationSet" => {
                    if inner_adaptation_set_tag > 0 {
                        inner_adaptation_set_tag -= 1;
                    } else {
                        TagName::AdaptationSet.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in an AdaptationSet.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    /// Loop over a Representation's children (to call when a <Representation>
    /// node just has been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing Representation tag has been found or until EOF is encountered.
    fn process_representation_element(&mut self) {
        // Count inner Representation tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_representation_tag : u32 = 0;
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) => match tag.name() {
                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        self.process_base_url_element();
                    },
                    b"InbandEventStream" => {
                        TagName::InbandEventStream.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::InbandEventStream.report_tag_close();
                    },
                    b"SegmentBase" => {
                        TagName::SegmentBase.report_tag_open();
                        attributes::report_segment_base_attrs(&&tag);
                        self.process_segment_base_element();
                    },
                    b"SegmentList" => {
                        TagName::SegmentList.report_tag_open();

                        // Re-use SegmentBase-one as it should not be different
                        attributes::report_segment_base_attrs(&&tag);
                        self.process_segment_list_element();
                    },
                    b"SegmentTemplate" => {
                        TagName::SegmentTemplate.report_tag_open();
                        attributes::report_segment_template_attrs(&tag);
                        self.process_segment_template_element();
                    },
                    b"Representation" => inner_representation_tag += 1,
                    _ => {}
                },
                Ok(Event::Empty(tag)) => match tag.name() {
                    b"BaseURL" => {
                        TagName::BaseURL.report_tag_open();
                        attributes::report_base_url_attrs(&tag);
                        TagName::BaseURL.report_tag_close();
                    },
                    b"InbandEventStream" => {
                        TagName::InbandEventStream.report_tag_open();
                        attributes::report_scheme_attrs(&tag);
                        TagName::InbandEventStream.report_tag_close();
                    },
                    b"SegmentBase" => {
                        TagName::SegmentBase.report_tag_open();
                        attributes::report_segment_base_attrs(&&tag);
                        TagName::SegmentBase.report_tag_close();
                    },
                    b"SegmentTemplate" => {
                        TagName::SegmentTemplate.report_tag_open();
                        attributes::report_segment_template_attrs(&tag);
                        TagName::SegmentTemplate.report_tag_close();
                    },
                    _ => {}
                },
                Ok(Event::End(tag)) if tag.name() == b"Representation" => {
                    if inner_representation_tag > 0 {
                        inner_representation_tag -= 1;
                    } else {
                        TagName::Representation.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a Representation.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    /// Loop over a SegmentTemplate's children (to call when a <SegmentTemplate>
    /// node just has been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing SegmentTemplate tag has been found or until EOF is encountered.
    fn process_segment_template_element(&mut self) {
        // Count inner SegmentTemplate tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_tag : u32 = 0;
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) => match tag.name() {
                    b"SegmentTimeline" => self.process_segment_timeline_element(),
                    b"Initialization" => attributes::report_initialization_attrs(&tag),
                    b"SegmentTemplate" => inner_tag += 1,
                    _ => {},
                },
                Ok(Event::Empty(tag)) => match tag.name() {
                    b"SegmentTimeline" => self.process_segment_timeline_element(),
                    b"Initialization" => attributes::report_initialization_attrs(&tag),
                    _ => {},
                },
                Ok(Event::End(tag)) if tag.name() == b"SegmentTemplate" => {
                    if inner_tag > 0 {
                        inner_tag -= 1;
                    } else {
                        TagName::SegmentTemplate.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a SegmentTemplate.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
            self.reader_buf.clear();
        }
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
                Err(e) => ParsingError::from(e).report_err(),
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
                Err(e) => ParsingError::from(e).report_err(),
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
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    fn process_segment_base_element(&mut self) {
        // Count inner SegmentBase tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_tag : u32 = 0;

        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) | Ok(Event::Empty(tag))
                    if tag.name() == b"Initialization" => {
                        attributes::report_initialization_attrs(&tag);
                    }
                Ok(Event::Start(tag)) if tag.name() == b"SegmentBase" => inner_tag += 1,
                Ok(Event::End(tag)) if tag.name() == b"SegmentBase" => {
                    if inner_tag > 0 {
                        inner_tag -= 1;
                    } else {
                        TagName::SegmentBase.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a SegmentBase.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    fn process_content_protection_element(&mut self) {
        // Count inner ContentProtection tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_tag : u32 = 0;

        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) | Ok(Event::Empty(tag))
                    if tag.name() == b"cenc:pssh" => self.process_cenc_element(),
                Ok(Event::Start(tag)) if tag.name() == b"ContentProtection" =>
                    inner_tag += 1,
                Ok(Event::End(tag)) if tag.name() == b"ContentProtection" => {
                    if inner_tag > 0 {
                        inner_tag -= 1;
                    } else {
                        TagName::ContentProtection.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a ContentProtection.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => ParsingError::from(e).report_err(),
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
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    fn process_segment_list_element(&mut self) {
        // Count inner Location tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed
        let mut inner_tag : u32 = 0;

        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) | Ok(Event::Empty(tag))
                    if tag.name() == b"SegmentURL" => {
                        TagName::SegmentUrl.report_tag_open();
                        attributes::report_segment_url_attrs(&tag);
                        TagName::SegmentUrl.report_tag_close();
                    }
                Ok(Event::Start(tag)) if tag.name() == b"SegmentList" =>
                    inner_tag += 1,
                Ok(Event::End(tag)) if tag.name() == b"SegmentList" => {
                    if inner_tag > 0 {
                        inner_tag -= 1;
                    } else {
                        TagName::SegmentList.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    ParsingError("Unexpected end of file in a SegmentList.".to_owned())
                        .report_err();
                    break;
                }
                Err(e) => ParsingError::from(e).report_err(),
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
            // We need to keep the XML as-is in the JS-side when it comes to
            // EventStream's `<Event> elements, as this is part of its public API.
            //
            // That means that we have to communicate in some way this exact data.
            // Sadly, quick_xml doesn't seem to have corresponding APIs that would
            // make this easy.
            // In the meantime, we will just return the first and last position
            // in bytes of `<Event>` elements (by recording the position just before
            // it's opening tag is encountered and just after the closing one is).
            // It will then be up to the JS-side to slice and decode the
            // corresponding XML.
            let initial_buffer_pos = self.reader.buffer_position();

            let evt = self.read_next_event();
            match evt {
                Ok(Event::Start(tag)) if tag.name() == b"Event" => {
                    TagName::EventStreamElt.report_tag_open();
                    attributes::report_event_stream_event_attrs(&tag);
                    match self.get_event_stream_event_ending_position() {
                        Ok(ending_pos) => {
                            AttributeName::EventStreamEltRange
                                .report((initial_buffer_pos as f64, ending_pos as f64));
                        },
                        Err (e) => e.report_err(),
                    }
                    TagName::EventStreamElt.report_tag_close();
                },
                Ok(Event::Empty(tag)) if tag.name() == b"Event" => {
                    TagName::EventStreamElt.report_tag_open();
                    attributes::report_event_stream_event_attrs(&tag);
                    let curr_pos = self.reader.buffer_position();
                    AttributeName::EventStreamEltRange
                        .report((initial_buffer_pos as f64, curr_pos as f64));
                    TagName::EventStreamElt.report_tag_close();
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
                Err(e) => ParsingError::from(e).report_err(),
                _ => (),
            }
            self.reader_buf.clear();
        }
    }

    /// Returns the ending position (not included), in bytes in the whole parsed MPD, where the
    /// current `<Event>` element ends.
    fn get_event_stream_event_ending_position(&mut self) -> Result<usize, ParsingError> {
        let mut inner_event_tag = 0u32;
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) if tag.name() == b"Event" => inner_event_tag += 1,
                Ok(Event::End(tag)) if tag.name() == b"Event" => {
                    if inner_event_tag > 0 {
                        inner_event_tag -= 1;
                    } else {
                        return Ok(self.reader.buffer_position());
                    }
                }
                Ok(Event::Eof) => {
                    return Err(ParsingError("Unexpected end of file in an Event element.".to_owned()))
                }
                Err(e) => {
                    return Err(ParsingError::from(e))
                },
                _ => {},
            }
        }
    }
}
