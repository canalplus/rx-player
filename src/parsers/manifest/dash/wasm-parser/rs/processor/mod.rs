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
    reader: quick_xml::Reader<BufReader<MPDReader>>,
    reader_buf: Vec<u8>,
    segment_objs_buf: Vec<SegmentObject>,
    state: MPDProcessorState,
}

/// Save the MPDProcessor's state each at instantiation and each time a parsing
/// operation is done through the `continue_parsing` method.
///
/// This allows the `MPDProcessor` to interrupt parsing when it encounters Eof,
/// while picking up exactly where it was when `continue_parsing` is called
/// again.
enum MPDProcessorState {
    /// We either never parsed yet or encountered Eof when parsing through the
    /// main parsing loop, which does not need to save state.
    Main,

    /// The last time we parsed, we encountered Eof inside a `<SegmentTimeline>`
    /// element.
    SegmentTimeline {
        /// Count of inner `<SegmentTimeline>` tags if they exists.
        /// This allows to not close the current node when it is an inner that is
        /// closed.
        inner_tags: u32,

        /// Ending timestamp of the previous <S> element, starting at `0`.
        /// Most subsequent <S> elements won't explicitly indicate a starting
        /// timestamp which indicates that they start at the end of the previous
        /// <S> element (its starting timestamp + its duration).
        initial_time: f64,
    },

    /// The last time we parsed, we encountered Eof inside a `<Location>`
    /// element.
    Location {
        /// Count of inner `<Location>` tags if they exists.
        /// This allows to not close the current node when it is an inner that is
        /// closed.
        inner_tags: u32,
    },

    /// The last time we parsed, we encountered Eof inside a `<BaseURL>`
    /// element.
    BaseURL {
        /// Count of inner `<BaseURL>` tags if they exists.
        /// This allows to not close the current node when it is an inner that is
        /// closed.
        inner_tags: u32,
    },

    /// The last time we parsed, we encountered Eof inside a `<cenc:pssh>`
    /// element.
    Cenc {
        /// Count of inner `<cenc:pssh>` tags if they exists.
        /// This allows to not close the current node when it is an inner that is
        /// closed.
        inner_tags: u32,
    },

    /// The last time we parsed, we encountered Eof inside a `<EventStream>`
    /// element.
    EventStream {
        /// Count of inner `<EventStream>` tags if they exists.
        /// This allows to not close the current node when it is an inner that is
        /// closed.
        inner_tags: u32,
    },

    /// The last time we parsed, we encountered Eof inside a `<Event>` element
    /// itself inside a `<EventStream>` element.
    EventStreamEvent {
        /// Count the parent's `<EventStream>` inner tags if they exists.
        /// This allows to not close the parent node when it is an inner that is
        /// closed.
        event_stream_inner_tags: u32,

        /// Count of inner `<Event>` tags if they exists.
        /// This allows to not close the current node when it is an inner that is
        /// closed.
        inner_tags: u32,

        /// Event need to be re-serialized into XML,
        /// This `Writer` interface allows to write back the XML in UTF-8 form.
        writer: Writer<Cursor<Vec<u8>>>,
    },
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
            state: MPDProcessorState::Main,
            reader,
            reader_buf: Vec::new(),
            segment_objs_buf: Vec::new(),
        }
    }

    /// Begin and continue parsing the MPD available through the MPDProcessor's
    /// associated reader.
    ///
    /// On encountering Eof on the read data, its state will be saved so calling this
    /// method again will continue where it left.
    pub fn continue_parsing(&mut self) {
        // Get and replace state with the default `Main` value, so we're owning
        // the old state here.
        let state = std::mem::replace(&mut self.state, MPDProcessorState::Main);
        match state {
            MPDProcessorState::Main => { self.process_main_elements(); },
            MPDProcessorState::SegmentTimeline { inner_tags, initial_time } => {
                if self.process_segment_timeline_element(inner_tags, initial_time) {
                    // The SegmentTimeline is completely parsed, we can continue
                    self.process_main_elements();
                }
            },
            MPDProcessorState::Location { inner_tags } => {
                if self.process_location_element(inner_tags) {
                    self.process_main_elements();
                }
            },
            MPDProcessorState::BaseURL { inner_tags } => {
                if self.process_base_url_element(inner_tags) {
                    self.process_main_elements();
                }
            },
            MPDProcessorState::Cenc { inner_tags } => {
                if self.process_cenc_element(inner_tags) {
                    self.process_main_elements();
                }
            },
            MPDProcessorState::EventStream { inner_tags } => {
                if self.process_event_stream_element(inner_tags) {
                    self.process_main_elements();
                }
            },
            MPDProcessorState::EventStreamEvent {
                inner_tags,
                event_stream_inner_tags,
                writer
            } => {
                let complete = self.process_event_stream_event_element(
                    inner_tags,
                    event_stream_inner_tags,
                    writer);
                if complete {
                    if self.process_event_stream_element(event_stream_inner_tags) {
                        self.process_main_elements();
                    }
                }
            },
        }
    }

    /// Read through the "principal" tags of the MPD.
    /// Returns on Eof
    pub fn process_main_elements(&mut self) {
        loop {
            match  self.read_next_event() {
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
                        if !self.process_base_url_element(0) {
                            break;
                        }
                    },
                    b"cenc:pssh" => if !self.process_cenc_element(0) {
                        break;
                    },
                    b"Location" => if !self.process_location_element(0) {
                        break;
                    },
                    b"SegmentTimeline" =>
                        if !self.process_segment_timeline_element(0, 0.) {
                            break;
                        },
                    b"EventStream" => {
                        TagName::EventStream.report_tag_open();
                        attributes::report_event_stream_attrs(&tag);
                        if !self.process_event_stream_element(0) {
                            break;
                        }
                    },

                    _ => {},
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
                    self.state = MPDProcessorState::Main;
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
        self.reader.try_clear_buffer(&mut self.reader_buf);
        self.reader.read_event(&mut self.reader_buf)
    }

    /// Loop over a SegmentTimeline's children (to call when a <SegmentTimeline>
    /// node just has been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing SegmentTemplate tag has been found or until EOF is encountered.
    ///
    /// If Eof has been encountered before the SegmentTimeline's ending tag,
    /// save state to `self.state` and return `false`.
    /// In any other cases, return `true`.
    fn process_segment_timeline_element(
        &mut self,
        mut inner_tags: u32,
        initial_time: f64
    ) -> bool {
        let mut curr_time_base = initial_time;
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) if tag.name() == b"S" => {
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
                    inner_tags += 1,
                Ok(Event::End(tag)) if tag.name() == b"SegmentTimeline" => {
                    if inner_tags > 0 {
                        inner_tags -= 1;
                    } else {
                        AttributeName::SegmentTimeline.report(self.segment_objs_buf.as_slice());
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    // Eof encountered in a SegmentTimeline. Save state and exit
                    self.state = MPDProcessorState::SegmentTimeline {
                        inner_tags,
                        initial_time: curr_time_base,
                    };
                    return false;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => (),
            }
        }
        self.segment_objs_buf.clear();
        true
    }

    /// Loop over a Location's element children (to call when a <Location> node
    /// has just been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing SegmentTemplate tag has been found or until EOF is encountered.
    ///
    /// If Eof has been encountered before the Location's ending tag, save state
    /// to `self.state` and return `false`. In any other cases, return `true`.
    fn process_location_element(&mut self, mut inner_tags: u32) -> bool {
        loop {
            match self.read_next_event() {
                Ok(Event::Text(t)) => if t.len() > 0 {
                    match t.unescaped() {
                        Ok(unescaped) => AttributeName::Location.report(unescaped),
                        Err(err) => ParsingError::from(err).report_err(),
                    }
                },
                Ok(Event::Start(tag)) if tag.name() == b"Location" => inner_tags += 1,
                Ok(Event::End(tag)) if tag.name() == b"Location" => {
                    if inner_tags > 0 {
                        inner_tags -= 1;
                    } else {
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    self.state = MPDProcessorState::Location { inner_tags };
                    return false;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => (),
            }
            self.reader.try_clear_buffer(&mut self.reader_buf);
        }
        true
    }

    /// Loop over a BaseURL's element children (to call when a <BaseURL> node
    /// has just been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing SegmentTemplate tag has been found or until EOF is encountered.
    ///
    /// If Eof has been encountered before the BaseURL's ending tag, save state
    /// to `self.state` and return `false`. In any other cases, return `true`.
    fn process_base_url_element(&mut self, mut inner_tags: u32) -> bool {
        loop {
            match self.read_next_event() {
                Ok(Event::Text(t)) => if t.len() > 0 {
                    match t.unescaped() {
                        Ok(unescaped) => AttributeName::Text.report(unescaped),
                        Err(err) => ParsingError::from(err).report_err(),
                    }
                },
                Ok(Event::Start(tag)) if tag.name() == b"BaseURL" => inner_tags += 1,
                Ok(Event::End(tag)) if tag.name() == b"BaseURL" => {
                    if inner_tags > 0 {
                        inner_tags -= 1;
                    } else {
                        TagName::BaseURL.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    self.state = MPDProcessorState::BaseURL { inner_tags };
                    return false;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => (),
            }
            self.reader.try_clear_buffer(&mut self.reader_buf);
        }
        true
    }

    /// Loop over a "cenc:pssh"'s element children (to call when a <cenc:pssh>
    /// node has just been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing SegmentTemplate tag has been found or until EOF is encountered.
    ///
    /// If Eof has been encountered before the "cenc:pssh"'s ending tag, save
    /// state to `self.state` and return `false`. In any other cases, return `true`.
    fn process_cenc_element(&mut self, mut inner_tags: u32) -> bool {
        // Count inner cenc:pssh tags if it exists.
        // Allowing to not close the current node when it is an inner that is closed

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
                Ok(Event::Start(tag)) if tag.name() == b"cenc:pssh" => inner_tags += 1,
                Ok(Event::End(tag)) if tag.name() == b"cenc:pssh" => {
                    if inner_tags > 0 {
                        inner_tags -= 1;
                    } else {
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    self.state = MPDProcessorState::Cenc { inner_tags };
                    return false;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => (),
            }
            self.reader.try_clear_buffer(&mut self.reader_buf);
        }
        true
    }

    /// Loop over a EventStream's element children (to call when a <EventStream>
    /// node has just been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing SegmentTemplate tag has been found or until EOF is encountered.
    ///
    /// If Eof has been encountered before the EventStream's ending tag, save
    /// state to `self.state` and return `false`. In any other cases, return
    /// `true`.
    fn process_event_stream_element(&mut self, mut inner_tags: u32) -> bool {
        loop {
            match self.read_next_event() {
                Ok(Event::Start(tag)) if tag.name() == b"Event" => {
                    TagName::EventStreamElt.report_tag_open();
                    attributes::report_event_stream_event_attrs(&tag);
                    let mut writer = Writer::new(Cursor::new(Vec::new()));
                    let _res = writer.write_event(Event::Start(tag));
                    let complete = self.process_event_stream_event_element(0, inner_tags, writer);
                    if !complete {
                        break;
                    }
                },
                Ok(Event::Start(tag)) if tag.name() == b"EventStream" => inner_tags += 1,
                Ok(Event::End(tag)) if tag.name() == b"EventStream" => {
                    if inner_tags > 0 { inner_tags -= 1; }
                    else {
                        TagName::EventStream.report_tag_close();
                        break;
                    }
                },
                Ok(Event::Eof) => {
                    self.state = MPDProcessorState::EventStream { inner_tags };
                    return false;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => (),
            }
            self.reader.try_clear_buffer(&mut self.reader_buf);
        }
        true
    }

    /// Loop over an Event's element children (to call when a <Event> node has
    /// just been found).
    ///
    /// Report its children tag and attributes until either its corresponding
    /// closing SegmentTemplate tag has been found or until EOF is encountered.
    ///
    /// If Eof has been encountered before the Event's ending tag, save
    /// state to `self.state` and return `false`. In any other cases, return
    /// `true`.
    fn process_event_stream_event_element(
        &mut self,
        mut inner_tags: u32,
        event_stream_inner_tags: u32,
        mut writer: Writer<Cursor<Vec<u8>>>
    ) -> bool {
        // We want to receive Text Events with the exact same format here, to
        // be able to report the exact Event's inner content
        self.reader.trim_text(false);
        loop {
            let read = self.read_next_event();
            if let Ok(ref evt) = read {
                let _res = writer.write_event(evt);
            }
            match read {
                Ok(Event::Start(tag)) if tag.name() == b"Event" => inner_tags += 1,
                Ok(Event::End(tag)) if tag.name() == b"Event" => {
                    if inner_tags > 0 {
                        inner_tags -= 1;
                    } else {
                        use crate::reportable::ReportableAttribute;
                        let content = writer.into_inner().into_inner();
                        content.report_as_attr(AttributeName::EventStreamEvent);
                        TagName::EventStreamElt.report_tag_close();
                        break;
                    }
                }
                Ok(Event::Eof) => {
                    self.state = MPDProcessorState::EventStreamEvent {
                        event_stream_inner_tags,
                        inner_tags,
                        writer,
                    };
                    self.reader.trim_text(true);
                    return false;
                }
                Err(e) => {
                    ParsingError::from(e).report_err();
                    break;
                },
                _ => {},
            }
        }
        self.reader.trim_text(true);
        true
    }
}
