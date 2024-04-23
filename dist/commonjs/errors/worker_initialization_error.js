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
var error_message_1 = require("./error_message");
/**
 * Error linked to the WebWorker initialization.
 *
 * @class WorkerInitializationError
 * @extends Error
 */
var WorkerInitializationError = /** @class */ (function (_super) {
    __extends(WorkerInitializationError, _super);
    /**
     * @param {string} code
     * @param {string} message
     */
    function WorkerInitializationError(code, message) {
        var _this = _super.call(this) || this;
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(_this, WorkerInitializationError.prototype);
        _this.name = "WorkerInitializationError";
        _this.type = "WORKER_INITIALIZATION_ERROR";
        _this.code = code;
        _this.message = (0, error_message_1.default)(_this.code, message);
        return _this;
    }
    return WorkerInitializationError;
}(Error));
exports.default = WorkerInitializationError;
