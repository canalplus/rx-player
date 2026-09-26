use crate::errors::{ParsingError, Result};
use std::borrow::Cow;
use std::fmt;
use std::io::Read;

const READ_SIZE: usize = 8 * 1024;

pub enum Event<'a> {
    Start(Element<'a>),
    Empty(Element<'a>),
    End(Name<'a>),
    Text(Text<'a>),
    Other,
    Eof,
}

pub struct Name<'a>(&'a [u8]);

impl<'a> Name<'a> {
    #[inline(always)]
    pub fn as_ref(&self) -> &'a [u8] {
        self.0
    }

    #[inline(always)]
    pub fn name(&self) -> Name<'a> {
        Name(self.0)
    }
}

pub struct Text<'a> {
    data: &'a [u8],
    should_unescape: bool,
}

impl<'a> Text<'a> {
    #[inline(always)]
    pub fn len(&self) -> usize {
        self.data.len()
    }

    #[inline]
    pub fn unescape(&self) -> Result<Cow<'a, [u8]>> {
        if self.should_unescape {
            unescape(self.data)
        } else {
            Ok(Cow::Borrowed(self.data))
        }
    }
}

pub struct Element<'a> {
    data: &'a [u8],
    name_end: usize,
}

impl<'a> Element<'a> {
    #[inline(always)]
    pub fn name(&self) -> Name<'a> {
        Name(&self.data[..self.name_end])
    }

    #[inline(always)]
    pub fn attributes(&self) -> Attributes<'a> {
        Attributes {
            data: self.data,
            offset: self.name_end,
        }
    }
}

pub struct Attribute<'a> {
    pub key: &'a [u8],
    pub value: &'a [u8],
}

impl<'a> Attribute<'a> {
    #[inline]
    pub fn unescape_value(&self) -> Result<Cow<'a, [u8]>> {
        unescape(self.value)
    }
}

pub struct Attributes<'a> {
    data: &'a [u8],
    offset: usize,
}

impl<'a> Iterator for Attributes<'a> {
    type Item = Result<Attribute<'a>>;

    fn next(&mut self) -> Option<Self::Item> {
        self.offset = skip_space(self.data, self.offset);
        if self.offset >= self.data.len() {
            return None;
        }

        let key_start = self.offset;
        while self.offset < self.data.len()
            && !is_space(self.data[self.offset])
            && self.data[self.offset] != b'='
        {
            self.offset += 1;
        }
        let key_end = self.offset;
        self.offset = skip_space(self.data, self.offset);
        if key_start == key_end || self.data.get(self.offset) != Some(&b'=') {
            self.offset = self.data.len();
            return Some(Err(ParsingError("Invalid XML attribute".to_owned())));
        }

        self.offset = skip_space(self.data, self.offset + 1);
        let quote = match self.data.get(self.offset) {
            Some(b'\'') => b'\'',
            Some(b'"') => b'"',
            _ => {
                self.offset = self.data.len();
                return Some(Err(ParsingError(
                    "XML attribute value should be quoted".to_owned(),
                )));
            }
        };
        self.offset += 1;
        let value_start = self.offset;
        while self.offset < self.data.len() && self.data[self.offset] != quote {
            self.offset += 1;
        }
        if self.offset == self.data.len() {
            return Some(Err(ParsingError("Unclosed XML attribute value".to_owned())));
        }
        let value_end = self.offset;
        self.offset += 1;
        Some(Ok(Attribute {
            key: &self.data[key_start..key_end],
            value: &self.data[value_start..value_end],
        }))
    }
}

pub struct Reader<R: Read> {
    source: R,
    buffer: Vec<u8>,
    offset: usize,
    absolute_offset: usize,
    eof: bool,
}

enum ParsedEvent {
    Start {
        end: usize,
        data_start: usize,
        content_end: usize,
        name_end: usize,
        empty: bool,
    },
    End {
        end: usize,
        name_start: usize,
        name_end: usize,
    },
    Text {
        end: usize,
        trimmed_start: usize,
        trimmed_end: usize,
        should_unescape: bool,
    },
    Other {
        end: usize,
    },
    Eof,
}

impl<R: Read> Reader<R> {
    pub fn new(source: R) -> Self {
        Self {
            source,
            buffer: Vec::with_capacity(READ_SIZE),
            offset: 0,
            absolute_offset: 0,
            eof: false,
        }
    }

    #[inline(always)]
    pub fn buffer_position(&self) -> usize {
        self.absolute_offset + self.offset
    }

    pub fn read_event(&mut self) -> Result<Event<'_>> {
        let parsed = self.read_event_range()?;
        match parsed {
            ParsedEvent::Start {
                end,
                data_start,
                content_end,
                name_end,
                empty,
            } => {
                self.offset = end + 1;
                let element = Element {
                    data: &self.buffer[data_start..content_end],
                    name_end,
                };
                Ok(if empty {
                    Event::Empty(element)
                } else {
                    Event::Start(element)
                })
            }
            ParsedEvent::End {
                end,
                name_start,
                name_end,
            } => {
                self.offset = end + 1;
                Ok(Event::End(Name(&self.buffer[name_start..name_end])))
            }
            ParsedEvent::Text {
                end,
                trimmed_start,
                trimmed_end,
                should_unescape,
            } => {
                self.offset = end;
                Ok(Event::Text(Text {
                    data: &self.buffer[trimmed_start..trimmed_end],
                    should_unescape,
                }))
            }
            ParsedEvent::Other { end } => {
                self.offset = end;
                Ok(Event::Other)
            }
            ParsedEvent::Eof => Ok(Event::Eof),
        }
    }

    fn read_event_range(&mut self) -> Result<ParsedEvent> {
        loop {
            self.compact_if_needed();
            if self.offset == self.buffer.len() && !self.fill()? {
                return Ok(ParsedEvent::Eof);
            }

            let base = self.offset;

            if self.absolute_offset + base == 0 && self.buffer[base] == 0xef {
                while self.buffer.len() - base < 3 && !self.eof {
                    self.fill()?;
                }
                if self.buffer[base..].starts_with(&[0xef, 0xbb, 0xbf]) {
                    self.offset = base + 3;
                    continue;
                }
            }

            if self.buffer[base] != b'<' {
                match find_byte(&self.buffer, b'<', base) {
                    Some(end) => {
                        let (trimmed_start, trimmed_end) =
                            trim_ascii_range(&self.buffer[base..end]);
                        let trimmed_start = base + trimmed_start;
                        let trimmed_end = base + trimmed_end;
                        if trimmed_start == trimmed_end {
                            self.offset = end;
                            continue;
                        }
                        return Ok(ParsedEvent::Text {
                            end,
                            trimmed_start,
                            trimmed_end,
                            should_unescape: true,
                        });
                    }
                    None if self.eof => {
                        let end = self.buffer.len();
                        let (trimmed_start, trimmed_end) = trim_ascii_range(&self.buffer[base..]);
                        let trimmed_start = base + trimmed_start;
                        let trimmed_end = base + trimmed_end;
                        if trimmed_start == trimmed_end {
                            self.offset = end;
                            continue;
                        }
                        return Ok(ParsedEvent::Text {
                            end,
                            trimmed_start,
                            trimmed_end,
                            should_unescape: true,
                        });
                    }
                    None => {
                        self.fill()?;
                        continue;
                    }
                }
            }

            // The marker identifying a closing tag, comment, CDATA section or
            // processing instruction may itself cross a read boundary.
            while self.buffer.len() - base < 9 && !self.eof {
                self.fill()?;
            }

            if self.buffer[base..].starts_with(b"<!--") {
                if let Some(end) = self.find_sequence(b"-->", base + 4)? {
                    return Ok(ParsedEvent::Other { end: end + 3 });
                }
                return self.unclosed("XML comment");
            }
            if self.buffer[base..].starts_with(b"<![CDATA[") {
                if let Some(end) = self.find_sequence(b"]]>", base + 9)? {
                    let (trimmed_start, trimmed_end) =
                        trim_ascii_range(&self.buffer[base + 9..end]);
                    return Ok(ParsedEvent::Text {
                        end: end + 3,
                        trimmed_start: base + 9 + trimmed_start,
                        trimmed_end: base + 9 + trimmed_end,
                        should_unescape: false,
                    });
                }
                return self.unclosed("CDATA section");
            }
            if self.buffer[base..].starts_with(b"<?") {
                if let Some(end) = self.find_sequence(b"?>", base + 2)? {
                    return Ok(ParsedEvent::Other { end: end + 2 });
                }
                return self.unclosed("XML processing instruction");
            }
            if self.buffer[base..].starts_with(b"<!") {
                if let Some(end) = self.find_declaration_end(base + 2)? {
                    return Ok(ParsedEvent::Other { end: end + 1 });
                }
                return self.unclosed("XML declaration");
            }
            if self.buffer[base..].starts_with(b"</") {
                if let Some(end) = self.find_tag_end(base + 2)? {
                    let name_start = base + 2;
                    let mut name_end = name_start;
                    while name_end < end && !is_space(self.buffer[name_end]) {
                        name_end += 1;
                    }
                    return Ok(ParsedEvent::End {
                        end,
                        name_start,
                        name_end,
                    });
                }
                return self.unclosed("XML closing tag");
            }

            if let Some(end) = self.find_tag_end(base + 1)? {
                let mut content_end = end;
                while content_end > base + 1 && is_space(self.buffer[content_end - 1]) {
                    content_end -= 1;
                }
                let empty = content_end > base + 1 && self.buffer[content_end - 1] == b'/';
                if empty {
                    content_end -= 1;
                    while content_end > base + 1 && is_space(self.buffer[content_end - 1]) {
                        content_end -= 1;
                    }
                }
                let data_start = base + 1;
                let mut absolute_name_end = data_start;
                while absolute_name_end < content_end && !is_space(self.buffer[absolute_name_end]) {
                    absolute_name_end += 1;
                }
                let name_end = absolute_name_end - data_start;
                if name_end == 0 {
                    self.offset = end + 1;
                    return Err(ParsingError("Empty XML tag name".to_owned()));
                }
                return Ok(ParsedEvent::Start {
                    end,
                    data_start,
                    content_end,
                    name_end,
                    empty,
                });
            }
            return self.unclosed("XML opening tag");
        }
    }

    fn compact_if_needed(&mut self) {
        if self.offset == 0 || (self.offset < READ_SIZE / 2 && self.offset < self.buffer.len()) {
            return;
        }
        let remaining = self.buffer.len() - self.offset;
        self.buffer.copy_within(self.offset.., 0);
        self.buffer.truncate(remaining);
        self.absolute_offset += self.offset;
        self.offset = 0;
    }

    fn fill(&mut self) -> Result<bool> {
        if self.eof {
            return Ok(false);
        }
        let mut chunk = [0u8; READ_SIZE];
        let read = self.source.read(&mut chunk).map_err(ParsingError::from)?;
        if read == 0 {
            self.eof = true;
            Ok(false)
        } else {
            self.buffer.extend_from_slice(&chunk[..read]);
            Ok(true)
        }
    }

    fn find_sequence(&mut self, sequence: &[u8], from: usize) -> Result<Option<usize>> {
        loop {
            if let Some(pos) = find_slice(&self.buffer, sequence, from) {
                return Ok(Some(pos));
            }
            if !self.fill()? {
                return Ok(None);
            }
        }
    }

    fn find_tag_end(&mut self, from: usize) -> Result<Option<usize>> {
        let mut pos = from;
        let mut quote = None;
        loop {
            while pos < self.buffer.len() {
                let byte = self.buffer[pos];
                match quote {
                    Some(q) if byte == q => quote = None,
                    Some(_) => {}
                    None if byte == b'\'' || byte == b'"' => quote = Some(byte),
                    None if byte == b'>' => return Ok(Some(pos)),
                    None => {}
                }
                pos += 1;
            }
            if !self.fill()? {
                return Ok(None);
            }
        }
    }

    fn find_declaration_end(&mut self, mut pos: usize) -> Result<Option<usize>> {
        let mut quote = None;
        let mut bracket_depth = 0usize;
        loop {
            while pos < self.buffer.len() {
                let byte = self.buffer[pos];
                match quote {
                    Some(q) if byte == q => quote = None,
                    Some(_) => {}
                    None if byte == b'\'' || byte == b'"' => quote = Some(byte),
                    None if byte == b'[' => bracket_depth += 1,
                    None if byte == b']' && bracket_depth > 0 => bracket_depth -= 1,
                    None if byte == b'>' && bracket_depth == 0 => return Ok(Some(pos)),
                    None => {}
                }
                pos += 1;
            }
            if !self.fill()? {
                return Ok(None);
            }
        }
    }

    fn unclosed<T>(&mut self, what: &str) -> Result<T> {
        self.offset = self.buffer.len().max(1);
        Err(ParsingError(format!("Unclosed {what}")))
    }
}

pub fn unescape(input: &[u8]) -> Result<Cow<'_, [u8]>> {
    if !input.contains(&b'&') {
        return Ok(Cow::Borrowed(input));
    }
    let mut output = Vec::with_capacity(input.len());
    let mut offset = 0;
    while let Some(relative) = input[offset..].iter().position(|byte| *byte == b'&') {
        let amp = offset + relative;
        output.extend_from_slice(&input[offset..amp]);
        let semi = input[amp + 1..]
            .iter()
            .position(|byte| *byte == b';')
            .map(|relative| amp + 1 + relative)
            .ok_or_else(|| ParsingError("Unclosed XML entity".to_owned()))?;
        let entity = &input[amp + 1..semi];
        match entity {
            b"lt" => output.push(b'<'),
            b"gt" => output.push(b'>'),
            b"amp" => output.push(b'&'),
            b"quot" => output.push(b'"'),
            b"apos" => output.push(b'\''),
            _ if entity.starts_with(b"#x") => push_codepoint(&mut output, &entity[2..], 16)?,
            _ if entity.starts_with(b"#") => push_codepoint(&mut output, &entity[1..], 10)?,
            _ => return Err(ParsingError("Unknown XML entity".to_owned())),
        }
        offset = semi + 1;
    }
    output.extend_from_slice(&input[offset..]);
    Ok(Cow::Owned(output))
}

fn push_codepoint(output: &mut Vec<u8>, value: &[u8], radix: u32) -> Result<()> {
    let value = std::str::from_utf8(value)
        .ok()
        .and_then(|value| u32::from_str_radix(value, radix).ok())
        .and_then(char::from_u32)
        .ok_or_else(|| ParsingError("Invalid numeric XML entity".to_owned()))?;
    let mut encoded = [0u8; 4];
    output.extend_from_slice(value.encode_utf8(&mut encoded).as_bytes());
    Ok(())
}

#[inline]
fn is_space(byte: u8) -> bool {
    matches!(byte, b' ' | b'\t' | b'\n' | b'\r')
}

fn skip_space(data: &[u8], mut offset: usize) -> usize {
    while offset < data.len() && is_space(data[offset]) {
        offset += 1;
    }
    offset
}

fn trim_ascii_range(data: &[u8]) -> (usize, usize) {
    let mut start = 0;
    while start < data.len() && is_space(data[start]) {
        start += 1;
    }
    let mut end = data.len();
    while end > start && is_space(data[end - 1]) {
        end -= 1;
    }
    (start, end)
}

fn find_byte(data: &[u8], byte: u8, from: usize) -> Option<usize> {
    data.get(from..)?
        .iter()
        .position(|current| *current == byte)
        .map(|relative| from + relative)
}

fn find_slice(data: &[u8], needle: &[u8], from: usize) -> Option<usize> {
    data.get(from..)?
        .windows(needle.len())
        .position(|window| window == needle)
        .map(|relative| from + relative)
}

impl fmt::Debug for Event<'_> {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("XML event")
    }
}

#[cfg(test)]
mod tests {
    use super::{Event, Reader, READ_SIZE};
    use std::io::{self, Read};

    #[derive(Debug, PartialEq)]
    enum OwnedEvent {
        Start(Vec<u8>, Vec<(Vec<u8>, Vec<u8>)>),
        Empty(Vec<u8>, Vec<(Vec<u8>, Vec<u8>)>),
        End(Vec<u8>),
        Text(Vec<u8>),
        Other,
        Eof,
    }

    struct Chunked<'a> {
        data: &'a [u8],
        offset: usize,
        chunk_size: usize,
    }

    impl Read for Chunked<'_> {
        fn read(&mut self, output: &mut [u8]) -> io::Result<usize> {
            let len = self
                .chunk_size
                .min(output.len())
                .min(self.data.len() - self.offset);
            output[..len].copy_from_slice(&self.data[self.offset..self.offset + len]);
            self.offset += len;
            Ok(len)
        }
    }

    fn reader(data: &[u8], chunk_size: usize) -> Reader<Chunked<'_>> {
        Reader::new(Chunked {
            data,
            offset: 0,
            chunk_size,
        })
    }

    fn collect_events(data: &[u8], chunk_size: usize) -> Vec<(usize, OwnedEvent)> {
        let mut reader = reader(data, chunk_size);
        let mut events = Vec::new();
        loop {
            let event = match reader.read_event().unwrap() {
                Event::Start(element) => OwnedEvent::Start(
                    element.name().as_ref().to_vec(),
                    element
                        .attributes()
                        .map(|attribute| {
                            let attribute = attribute.unwrap();
                            (attribute.key.to_vec(), attribute.value.to_vec())
                        })
                        .collect(),
                ),
                Event::Empty(element) => OwnedEvent::Empty(
                    element.name().as_ref().to_vec(),
                    element
                        .attributes()
                        .map(|attribute| {
                            let attribute = attribute.unwrap();
                            (attribute.key.to_vec(), attribute.value.to_vec())
                        })
                        .collect(),
                ),
                Event::End(name) => OwnedEvent::End(name.as_ref().to_vec()),
                Event::Text(text) => OwnedEvent::Text(text.unescape().unwrap().into_owned()),
                Event::Other => OwnedEvent::Other,
                Event::Eof => OwnedEvent::Eof,
            };
            let is_eof = event == OwnedEvent::Eof;
            events.push((reader.buffer_position(), event));
            if is_eof {
                return events;
            }
        }
    }

    #[test]
    fn parses_elements_and_attributes_across_chunks() {
        let mut reader = reader(b"<MPD id='foo>bar'><Period id=\"p0\" /></MPD>", 2);

        let Event::Start(mpd) = reader.read_event().unwrap() else {
            panic!("expected MPD start");
        };
        assert_eq!(mpd.name().as_ref(), b"MPD");
        let attributes: Vec<_> = mpd.attributes().map(|attr| attr.unwrap()).collect();
        assert_eq!(attributes[0].key, b"id");
        assert_eq!(attributes[0].value, b"foo>bar");

        let Event::Empty(period) = reader.read_event().unwrap() else {
            panic!("expected empty Period");
        };
        assert_eq!(period.name().as_ref(), b"Period");
        assert_eq!(period.attributes().next().unwrap().unwrap().value, b"p0");

        let Event::End(mpd) = reader.read_event().unwrap() else {
            panic!("expected MPD end");
        };
        assert_eq!(mpd.as_ref(), b"MPD");
        assert!(matches!(reader.read_event().unwrap(), Event::Eof));
    }

    #[test]
    fn unescapes_text_and_attribute_entities() {
        let mut reader = reader(b"<Label value=\"a&amp;&#x20AC;\"> &lt;&#65; </Label>", 3);
        let Event::Start(label) = reader.read_event().unwrap() else {
            panic!("expected Label start");
        };
        let value = label
            .attributes()
            .next()
            .unwrap()
            .unwrap()
            .unescape_value()
            .unwrap();
        assert_eq!(value.as_ref(), "a&€".as_bytes());

        let Event::Text(text) = reader.read_event().unwrap() else {
            panic!("expected text");
        };
        assert_eq!(text.unescape().unwrap().as_ref(), b"<A");
    }

    #[test]
    fn parsing_does_not_depend_on_read_boundaries() {
        let document = concat!(
            "\u{feff}<?xml version='1.0'?>",
            "<!DOCTYPE MPD [<!ELEMENT MPD ANY><!ENTITY ignored 'a>b'>]>",
            "<!-- before root -->",
            "<MPD id='a>b' xmlns:x=\"urn:test\">",
            "<Period><Label> A&amp;&#x20AC; </Label>",
            "<![CDATA[ignored <data>]]><?inside value?>",
            "<x:Node value=\"quotes '&quot;\" /></Period>",
            "</MPD>",
        );
        let expected = collect_events(document.as_bytes(), document.len());
        for chunk_size in 1..=32 {
            assert_eq!(
                collect_events(document.as_bytes(), chunk_size),
                expected,
                "different events with {chunk_size}-byte reads"
            );
        }
    }

    #[test]
    fn parses_long_individual_tokens_with_proportional_memory() {
        let long = "a".repeat(64 * 1024);
        let document = format!("<!--{long}--><MPD id='{long}'>{long}</MPD>");
        let mut reader = reader(document.as_bytes(), 37);

        assert!(matches!(reader.read_event().unwrap(), Event::Other));
        let Event::Start(mpd) = reader.read_event().unwrap() else {
            panic!("expected MPD start");
        };
        assert_eq!(
            mpd.attributes().next().unwrap().unwrap().value.len(),
            long.len()
        );
        let Event::Text(text) = reader.read_event().unwrap() else {
            panic!("expected MPD text");
        };
        assert_eq!(text.len(), long.len());
        assert!(matches!(reader.read_event().unwrap(), Event::End(_)));
        assert!(reader.buffer.capacity() <= 2 * (long.len() + READ_SIZE));
    }

    #[test]
    fn arbitrary_bounded_input_terminates_without_invalid_positions() {
        let chunk_sizes = [1, 2, 3, 7, 31];
        let mut state = 0x1234_5678u32;
        for len in 0..=256 {
            let mut data = Vec::with_capacity(len);
            for _ in 0..len {
                state ^= state << 13;
                state ^= state >> 17;
                state ^= state << 5;
                data.push(state as u8);
            }

            for chunk_size in chunk_sizes {
                let mut reader = reader(&data, chunk_size);
                let mut previous_position = 0;
                let mut terminated = false;
                for _ in 0..=(data.len() * 2 + 16) {
                    let reached_end = match reader.read_event() {
                        Ok(Event::Eof) | Err(_) => true,
                        Ok(_) => false,
                    };
                    let position = reader.buffer_position();
                    assert!(position >= previous_position);
                    assert!(position <= data.len());
                    previous_position = position;
                    if reached_end {
                        terminated = true;
                        break;
                    }
                }
                assert!(terminated, "did not terminate for {} bytes", len);
            }
        }
    }

    #[test]
    fn exposes_ignored_constructs_as_separate_events() {
        let data = b"<EventStream><!-- x --><Event /></EventStream>";
        let mut reader = reader(data, 4);
        assert!(matches!(reader.read_event().unwrap(), Event::Start(_)));
        assert_eq!(reader.buffer_position(), b"<EventStream>".len());
        assert!(matches!(reader.read_event().unwrap(), Event::Other));
        assert_eq!(reader.buffer_position(), b"<EventStream><!-- x -->".len());
        assert!(matches!(reader.read_event().unwrap(), Event::Empty(_)));
    }

    #[test]
    fn reads_every_element_after_multiple_buffer_refills() {
        let manifest = include_bytes!(concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../../../../tests/contents/static/DASH_static_SegmentTimeline/media/multi-AdaptationSets.mpd"
        ));
        let mut reader = reader(manifest, 8 * 1024);
        let mut adaptations = 0;
        let mut stack: Vec<Vec<u8>> = Vec::new();
        loop {
            match reader.read_event().unwrap() {
                Event::Start(element) => {
                    if element.name().as_ref() == b"AdaptationSet" {
                        adaptations += 1;
                    }
                    stack.push(element.name().as_ref().to_vec());
                }
                Event::Empty(element) => {
                    if element.name().as_ref() == b"AdaptationSet" {
                        adaptations += 1;
                    }
                }
                Event::End(element) => assert_eq!(stack.pop().unwrap(), element.as_ref()),
                Event::Eof => break,
                _ => {}
            }
        }
        assert_eq!(adaptations, 37);
        assert!(stack.is_empty());
    }
}
