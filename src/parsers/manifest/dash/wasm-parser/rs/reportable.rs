use crate::events::AttributeName;
use crate::processor::SegmentObject;
use crate::{onAttribute, onAttributeBatch};
use core::mem;
use std::borrow::Cow;
use std::cell::{Cell, RefCell};

thread_local! {
    static ATTRIBUTE_BATCH: RefCell<Vec<u8>> = const { RefCell::new(Vec::new()) };
    static ATTRIBUTE_BATCH_ACTIVE: Cell<bool> = const { Cell::new(false) };
}

/// Keeps a single temporary allocation whose size is bounded by the largest
/// attribute list encountered on one XML element.
pub struct AttributeBatchGuard;

impl AttributeBatchGuard {
    pub fn new() -> Self {
        ATTRIBUTE_BATCH.with(|batch| {
            batch.borrow_mut().clear();
        });
        ATTRIBUTE_BATCH_ACTIVE.with(|active| active.set(true));
        Self
    }
}

impl Drop for AttributeBatchGuard {
    fn drop(&mut self) {
        ATTRIBUTE_BATCH_ACTIVE.with(|active| active.set(false));
        ATTRIBUTE_BATCH.with(|batch| {
            let buffer = batch.borrow();
            if !buffer.is_empty() {
                unsafe { onAttributeBatch(buffer.as_ptr(), buffer.len()) };
            }
        });
    }
}

#[inline(always)]
fn report_bytes(attr_name: AttributeName, bytes: &[u8]) {
    let was_batched = ATTRIBUTE_BATCH_ACTIVE.with(|active| active.get());
    if was_batched {
        ATTRIBUTE_BATCH.with(|batch| {
            let mut batch = batch.borrow_mut();
            batch.push(attr_name as u8);
            batch.extend((bytes.len() as u32).to_le_bytes());
            batch.extend(bytes);
        });
    } else {
        unsafe { onAttribute(attr_name, bytes.as_ptr(), bytes.len()) };
    }
}

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

// Note 2: Most reported raw pointers are actually generated from &T (a
// reference to that type).
// I'm not completely sure that a reference will always be structurally
// (in-memory) the exact same value than a raw pointer, so this might break in
// the futue.
// However, transmuting from &T to *const _ (from an immutable reference to an
// immutable raw pointer) seems to be a VERY widespread trick.
// So even if there's a structural change in the future (e.g. reference becoming
// a pointer PLUS some added metadata), I guess/hope that they will be careful
// as to not break this trick.

impl ReportableAttribute for bool {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        debug_assert!(attr_name as u64 <= u8::MAX as u64);

        let val: u8 = if *self { 1 } else { 0 };
        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        report_bytes(attr_name, std::slice::from_ref(&val));
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
        report_bytes(attr_name, &self.to_le_bytes());
    }
}

impl ReportableAttribute for (f64, f64) {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        debug_assert!(attr_name as u64 <= u8::MAX as u64);

        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        //
        // Also, we're transmuting so that &(f64, f64) is actually treated as if it
        // was a *const u8 (immutable raw pointer to an u8) as it's what the JS
        // callback expects.
        // This should not matter: Rust types are not communicated to
        // JavaScript anyway.
        let mut bytes = [0; 16];
        bytes[..8].copy_from_slice(&self.0.to_le_bytes());
        bytes[8..].copy_from_slice(&self.1.to_le_bytes());
        report_bytes(attr_name, &bytes);
    }
}

impl ReportableAttribute for &[SegmentObject] {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        debug_assert!(attr_name as u64 <= u8::MAX as u64);

        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        let len = self.len() * mem::size_of::<SegmentObject>();
        let bytes = unsafe { std::slice::from_raw_parts(self.as_ptr() as *const u8, len) };
        report_bytes(attr_name, bytes);
    }
}

// For key-value couples (such as XML namespaces)
impl<'a> ReportableAttribute for (&'a [u8], Cow<'a, str>) {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        use crate::utils;
        let len_key = self.0.len() as u32;
        let len_val = self.1.len() as u32;

        let mut msg = Vec::with_capacity((len_key + len_val + 8) as usize);
        msg.extend(utils::u32_to_u8_slice_be(len_key));
        msg.extend(self.0);
        msg.extend(utils::u32_to_u8_slice_be(len_val));
        msg.extend(self.1.as_bytes());

        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        report_bytes(attr_name, &msg);
    }
}

impl<'a> ReportableAttribute for Cow<'a, [u8]> {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        debug_assert!(attr_name as u64 <= u8::MAX as u64);

        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        report_bytes(attr_name, self);
    }
}

impl<'a> ReportableAttribute for Cow<'a, str> {
    #[inline(always)]
    fn report_as_attr(&self, attr_name: AttributeName) {
        debug_assert!(attr_name as u64 <= u8::MAX as u64);

        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        report_bytes(attr_name, self.as_bytes());
    }
}
