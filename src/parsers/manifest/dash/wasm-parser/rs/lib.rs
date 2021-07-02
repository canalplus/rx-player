extern crate core;
extern crate quick_xml;

mod events;
mod errors;
mod processor;
mod reader;
mod reportable;
mod utils;

pub use errors::{ParsingError, Result};

use std::{cell::RefCell, io::BufReader};
use events::*;
use processor::MPDProcessor;
use reader::MPDReader;

extern "C" {
    /// JS callback called each time a new known tag is encountered in the MPD.
    ///
    /// The `tag_name` corresponds to the value of the TagName enum (@see
    /// events), casted as a single byte.
    ///
    /// # Arguments
    ///
    /// * `tag_name` - u8 describing the name of the tag encountered.
    fn onTagOpen(tag_name : TagName);

    /// JS callback called each time a previously-opened known tag is encountered in
    /// the MPD now closed.
    ///
    /// # Arguments
    ///
    /// * `tag_name` - u8 describing the name of the tag which just closed.
    fn onTagClose(tag_name : TagName);

    /// JS Callback called when a new attribute has been parsed in the last
    /// encountered element.
    ///
    /// # Arguments
    ///
    /// * `attr_name` - u8 describing the name of the attribute that has just
    /// been encountered.
    ///
    /// * `ptr` - Pointer to the beginning of the corresponding data in the
    /// WebAssembly's linear memory.
    ///
    /// * `len` - Length of the data - starting at `ptr` - in bytes.
    fn onAttribute(attr_name : AttributeName, ptr : *const u8, len : usize);

    /// JS callback for other specific operations, for example logging and warnings.
    ///
    /// # Arguments
    ///
    /// * `evt_type` - Identify the type of event that is wanted.
    ///
    /// * `ptr` - Pointer to the beginning of the corresponding data in the
    /// WebAssembly's linear memory.
    ///
    /// * `len` - Length of the data - starting at `ptr` - in bytes.
    fn onCustomEvent(evt_type : CustomEventType, ptr: *const u8, len : usize);

    /// JS callback allowing to read data from the MPD, which is stored in the
    /// JS-side.
    ///
    /// This function returns the number of bytes that have been read and put at
    /// `ptr`.
    ///
    /// # Arguments
    ///
    /// * `ptr` - Pointer to where the MPD data should be set, in WebAssembly's
    /// linear memory.
    ///
    /// * `size` - Optimal length of data that is wanted, in bytes.
    /// Less data (but not more) can be read. The true read length is returned
    /// by this function.
    fn readNext(ptr : *const u8,  size : usize) -> usize;
}

#[no_mangle]
pub extern "C" fn create_processor() -> u32 {
    let buf_read = BufReader::new(MPDReader {});
    let processor = MPDProcessor::new(buf_read);

    // Create a RefCell around the processor to keep an eye on potential
    // reentrancy situations (like a processor being owned multiple times).
    // Also put it in a box to store it on the heap
    // This line is inspired from how wasm_bindgen works internally.
    Box::into_raw(Box::new(RefCell::new(processor))) as u32
}

#[no_mangle]
pub unsafe extern "C" fn free_processor(processor_ptr: u32) {
    let processor_ptr = processor_ptr as *mut RefCell<MPDProcessor>;
    if processor_ptr.is_null() {
        panic!("Null pointer given to `free_processor`.");
    }
    (*processor_ptr).borrow_mut(); // ensure that there is no active borrows
    drop(Box::from_raw(processor_ptr));
}

#[no_mangle]
pub unsafe extern "C" fn parse_current_data(processor_ptr: u32) {
    let processor_ptr = processor_ptr as *mut RefCell<MPDProcessor>;
    if processor_ptr.is_null() {
        panic!("Invalid MPDProcessor pointer");
    }
    (&*processor_ptr).borrow_mut().continue_parsing()
}
