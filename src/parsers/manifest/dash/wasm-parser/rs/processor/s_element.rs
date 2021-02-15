use crate::errors::{ ParsingError, Result };
use crate::utils::parse_u64;

/// Represents a parsed <S> node, itself in a <SegmentTimeline> node from an
/// MPD.
///
/// Attributes are defined as f64 despite being u64 to simplify Rust-to-JS
/// communication.
#[repr(C)] // Used in FFI
#[derive(Debug, Clone, Copy, Default)]
pub struct SegmentObject {

  /// Starting timestamp for the segment, in the corresponding Timescale
  ///
  /// This is either equivalent to the `t` attribute of an `<S>` element, or to
  /// the end of the previous one if no `t` attribute is found.
  pub start : f64,

  /// Duration of the segment, in the corresponding Timescale.
  ///
  /// This is the data contained in the `d` attribute of an `<S>` element.
  /// If not found, it is set to `0`.
  pub duration : f64,

  /// Amount of time contiguous segments of the duration are encountered.
  ///
  /// This is the data contained in the `r` attribute of an `<S>` element.
  /// If not found, it is set to `0`.
  pub repeat_count : f64
}

impl SegmentObject {
    /// Creates a new SegmentObject from the attributes encountered in an <S>
    /// element in the MPD.
    ///
    /// This function is called very very often on the more large MPDs based
    /// on a SegmentTimeline segment indexing scheme.
    #[inline(always)]
    pub fn from_s_element(
        e : &quick_xml::events::BytesStart,
        time_base : f64
    ) -> Result<SegmentObject> {
        let mut segment_obj = SegmentObject::default();
        let mut has_t = false;

        for res_attr in e.attributes() {
            match res_attr {
                Ok(attr) => {
                    let key = attr.key;
                    match key {
                        b"t" => {
                            segment_obj.start = parse_u64(&attr.value)? as f64;
                            has_t = true;
                        },
                        b"d" => {
                            segment_obj.duration = parse_u64(&attr.value)? as f64;
                        },
                        b"r" => {
                            segment_obj.repeat_count = parse_u64(&attr.value)? as f64;
                        },
                        _ => {},
                    }
                },
                Err(err) => ParsingError::from(err).report_err(),
            };
        }
        if !has_t {
            segment_obj.start = time_base;
        }
        Ok(segment_obj)
    }
}

