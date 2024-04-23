/**
 * Error encountered when doing an operation on a `SourceBuffer`.
 * @class SourceBufferError
 * @extends Error
 */
export default class SourceBufferError extends Error {
    /**
     * @param {string} errorName - The original Error's name.
     * @param {string} message - The original Error's message.
     * @param {boolean} isBufferFull - If `true`, the Error is due to the fact
     * that the `SourceBuffer` was full.
     */
    constructor(errorName, message, isBufferFull) {
        super();
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(this, SourceBufferError.prototype);
        this.name = "SourceBufferError";
        this.errorName = errorName;
        this.message = message;
        this.isBufferFull = isBufferFull;
    }
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    serialize() {
        return {
            errorName: this.name,
            message: this.message,
            isBufferFull: this.isBufferFull,
        };
    }
    /**
     * When stringified, just try to replicate the original error as it may be
     * more informative.
     * @returns {string}
     */
    toString() {
        return `${this.errorName}: ${this.message}`;
    }
}
