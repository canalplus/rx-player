use crate::events::AttributeName;
use crate::onAttribute;
use crate::processor::SegmentObject;
use std::borrow::Cow;

/// Trait implemented for values that can be "reported" as an attribute to the
/// JS-side.
///
/// Reportable values can be sent to JavaScript as an attribute's value, through
/// the `report_as_attr` function.
pub trait ReportableAttribute {
    /// Report that value as the `attr_name` AttributeName to JS.
    /// Note that calling this function will in turn call a JS callback to
    /// receive that value through a pointer to it.
    fn report_as_attr(&self, attr_name: AttributeName);
}

// Note: I'm not "impl"ing ReportableAttribute generically to have more control over
// which variants are actually called.
// There should only be few ways `report_as_attr` can be called, those few impl
// blocks ensure of that.

impl ReportableAttribute for bool {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        debug_assert!(attr_name as u64 <= u8::MAX as u64);

        let val: u8 = if *self { 1 } else { 0 };
        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        unsafe {
            onAttribute(attr_name, &val, 1);
        };
    }
}

impl ReportableAttribute for f64 {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        debug_assert!(attr_name as u64 <= u8::MAX as u64);

        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        //
        // Also, we're casting so that the f64 value is actually treated as if it
        // was a *const u8 (immutable raw pointer to an u8) as it's what the JS
        // callback expects.
        // This should not matter: Rust types are not communicated to
        // JavaScript anyway.
        unsafe {
            onAttribute(attr_name, self as *const f64 as *const u8, 8);
        };
    }
}

impl ReportableAttribute for (f64, f64) {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        debug_assert!(attr_name as u64 <= u8::MAX as u64);

        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        //
        // Also, we're casting so that &(f64, f64) is treated as a *const u8, as the JS
        // callback expects.
        // This should not matter: Rust types are not communicated to
        // JavaScript anyway.
        unsafe {
            onAttribute(attr_name, self as *const (f64, f64) as *const u8, 16);
        };
    }
}

impl ReportableAttribute for &[SegmentObject] {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        debug_assert!(attr_name as u64 <= u8::MAX as u64);

        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        unsafe {
            let len = std::mem::size_of_val(*self);
            onAttribute(attr_name, self.as_ptr() as *const u8, len);
        }
    }
}

// For XML namespace key-value pairs.
impl<'a> ReportableAttribute for (&'a [u8], Cow<'a, [u8]>) {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        use crate::utils;
        let len_key = self.0.len() as u32;
        let len_val = self.1.len() as u32;

        let mut msg = Vec::with_capacity((len_key + len_val + 8) as usize);
        msg.extend(utils::u32_to_u8_slice_be(len_key));
        msg.extend(self.0);
        msg.extend(utils::u32_to_u8_slice_be(len_val));
        msg.extend(self.1.as_ref());

        unsafe {
            onAttribute(attr_name, msg.as_ptr(), msg.len());
        };
    }
}

impl<'a> ReportableAttribute for Cow<'a, [u8]> {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        debug_assert!(attr_name as u64 <= u8::MAX as u64);

        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        unsafe {
            onAttribute(attr_name, self.as_ptr(), self.len());
        };
    }
}
