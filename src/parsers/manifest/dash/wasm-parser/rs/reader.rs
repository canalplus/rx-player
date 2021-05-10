use std::io::{ self, Read };

pub struct MPDReader {}

impl Read for MPDReader {
    #[inline]
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        let actual_size;
        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should just put data maximum until
        // `buf.len()`.
        unsafe {
            actual_size = super::readNext((*buf).as_ptr(), buf.len());
        }
        Ok(actual_size as usize)
    }
}
