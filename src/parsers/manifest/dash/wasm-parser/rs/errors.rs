use crate::onCustomEvent;
use crate::events::CustomEventType;

pub type Result<T> = std::result::Result<T, ParsingError>;

/// Very simple error type, only used to generate a String description of a
/// parsing error, to then be reported on the JS-side.
#[derive(Debug, Clone)]
pub struct ParsingError(pub String);

impl ParsingError {
    /// Call JS-side callback with this ParsingError in argument to report an
    /// error.
    pub fn report_err(&self) {
        let len = self.0.len();
        // UNSAFE: We're using FFI, so we don't know how the pointer is used.
        // Hopefully, the JavaScript-side should clone that value synchronously.
        unsafe {
            onCustomEvent(CustomEventType::Error, (*self.0).as_ptr(), len);
        }
    }
}

impl<T : std::error::Error> From<T> for ParsingError {
    fn from(err : T) -> ParsingError {
        ParsingError(err.to_string())
    }
}
