"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Error encountered when doing an operation on a `SourceBuffer`.
 * @class SourceBufferError
 * @extends Error
 */
var SourceBufferError = /** @class */ (function (_super) {
    __extends(SourceBufferError, _super);
    /**
     * @param {string} errorName - The original Error's name.
     * @param {string} message - The original Error's message.
     * @param {boolean} isBufferFull - If `true`, the Error is due to the fact
     * that the `SourceBuffer` was full.
     */
    function SourceBufferError(errorName, message, isBufferFull) {
        var _this = _super.call(this) || this;
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(_this, SourceBufferError.prototype);
        _this.name = "SourceBufferError";
        _this.errorName = errorName;
        _this.message = message;
        _this.isBufferFull = isBufferFull;
        return _this;
    }
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    SourceBufferError.prototype.serialize = function () {
        return {
            errorName: this.name,
            message: this.message,
            isBufferFull: this.isBufferFull,
        };
    };
    /**
     * When stringified, just try to replicate the original error as it may be
     * more informative.
     * @returns {string}
     */
    SourceBufferError.prototype.toString = function () {
        return "".concat(this.errorName, ": ").concat(this.message);
    };
    return SourceBufferError;
}(Error));
exports.default = SourceBufferError;
