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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../../log");
var monotonic_timestamp_1 = require("../../../../utils/monotonic_timestamp");
var types_1 = require("../types");
/**
 * SegmentSink implementation to add text data, most likely subtitles.
 * @class TextSegmentSink
 */
var TextSegmentSink = /** @class */ (function (_super) {
    __extends(TextSegmentSink, _super);
    /**
     * @param {Object} textDisplayerSender
     */
    function TextSegmentSink(textDisplayerSender) {
        var _this = this;
        log_1.default.debug("HTSB: Creating TextSegmentSink");
        _this = _super.call(this) || this;
        _this.bufferType = "text";
        _this._sender = textDisplayerSender;
        _this._pendingOperations = [];
        _this._sender.reset();
        return _this;
    }
    /**
     * @param {string} uniqueId
     */
    TextSegmentSink.prototype.declareInitSegment = function (uniqueId) {
        log_1.default.warn("HTSB: Declaring initialization segment for  Text SegmentSink", uniqueId);
    };
    /**
     * @param {string} uniqueId
     */
    TextSegmentSink.prototype.freeInitSegment = function (uniqueId) {
        log_1.default.warn("HTSB: Freeing initialization segment for  Text SegmentSink", uniqueId);
    };
    /**
     * Push text segment to the TextSegmentSink.
     * @param {Object} infos
     * @returns {Promise}
     */
    TextSegmentSink.prototype.pushChunk = function (infos) {
        return __awaiter(this, void 0, void 0, function () {
            var data, promise, ranges;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        data = infos.data;
                        assertChunkIsTextTrackSegmentData(data.chunk);
                        promise = this._sender.pushTextData(__assign(__assign({}, data), { chunk: data.chunk }));
                        this._addToOperationQueue(promise, {
                            type: types_1.SegmentSinkOperation.Push,
                            value: infos,
                        });
                        return [4 /*yield*/, promise];
                    case 1:
                        ranges = _a.sent();
                        if (infos.inventoryInfos !== null) {
                            this._segmentInventory.insertChunk(infos.inventoryInfos, true, (0, monotonic_timestamp_1.default)());
                        }
                        this._segmentInventory.synchronizeBuffered(ranges);
                        return [2 /*return*/, ranges];
                }
            });
        });
    };
    /**
     * Remove buffered data.
     * @param {number} start - start position, in seconds
     * @param {number} end - end position, in seconds
     * @returns {Promise}
     */
    TextSegmentSink.prototype.removeBuffer = function (start, end) {
        return __awaiter(this, void 0, void 0, function () {
            var promise, ranges;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        promise = this._sender.remove(start, end);
                        this._addToOperationQueue(promise, {
                            type: types_1.SegmentSinkOperation.Remove,
                            value: { start: start, end: end },
                        });
                        return [4 /*yield*/, promise];
                    case 1:
                        ranges = _a.sent();
                        this._segmentInventory.synchronizeBuffered(ranges);
                        return [2 /*return*/, ranges];
                }
            });
        });
    };
    /**
     * @param {Object} infos
     * @returns {Promise}
     */
    TextSegmentSink.prototype.signalSegmentComplete = function (infos) {
        return __awaiter(this, void 0, void 0, function () {
            var promise, _1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!(this._pendingOperations.length > 0)) return [3 /*break*/, 4];
                        promise = this._pendingOperations[this._pendingOperations.length - 1].promise;
                        this._addToOperationQueue(promise, {
                            type: types_1.SegmentSinkOperation.SignalSegmentComplete,
                            value: infos,
                        });
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, promise];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        _1 = _a.sent();
                        return [3 /*break*/, 4];
                    case 4:
                        this._segmentInventory.completeSegment(infos);
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * @returns {Array.<Object>}
     */
    TextSegmentSink.prototype.getPendingOperations = function () {
        return this._pendingOperations.map(function (p) { return p.operation; });
    };
    TextSegmentSink.prototype.dispose = function () {
        log_1.default.debug("HTSB: Disposing TextSegmentSink");
        this._sender.reset();
    };
    TextSegmentSink.prototype._addToOperationQueue = function (promise, operation) {
        var _this = this;
        var queueObject = { operation: operation, promise: promise };
        this._pendingOperations.push(queueObject);
        var endOperation = function () {
            var indexOf = _this._pendingOperations.indexOf(queueObject);
            if (indexOf >= 0) {
                _this._pendingOperations.splice(indexOf, 1);
            }
        };
        promise.then(endOperation, endOperation); // `finally` not supported everywhere
    };
    return TextSegmentSink;
}(types_1.SegmentSink));
exports.default = TextSegmentSink;
/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 * @param {Object} chunk
 */
function assertChunkIsTextTrackSegmentData(chunk) {
    if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 0 /* __ENVIRONMENT__.PRODUCTION */) {
        return;
    }
    if (typeof chunk !== "object" ||
        chunk === null ||
        typeof chunk.data !== "string" ||
        typeof chunk.type !== "string" ||
        (chunk.language !== undefined &&
            typeof chunk.language !== "string") ||
        (chunk.start !== undefined &&
            typeof chunk.start !== "number") ||
        (chunk.end !== undefined &&
            typeof chunk.end !== "number")) {
        throw new Error("Invalid format given to a TextSegmentSink");
    }
}
/*
 * The following ugly code is here to provide a compile-time check that an
 * `ITextTracksBufferSegmentData` (type of data pushed to a
 * `TextSegmentSink`) can be derived from a `ITextTrackSegmentData`
 * (text track data parsed from a segment).
 *
 * It doesn't correspond at all to real code that will be called. This is just
 * a hack to tell TypeScript to perform that check.
 */
if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 1 /* __ENVIRONMENT__.DEV */) {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    /* eslint-disable @typescript-eslint/ban-ts-comment */
    // @ts-ignore
    function _checkType(input) {
        function checkEqual(_arg) {
            /* nothing */
        }
        checkEqual(input);
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */
    /* eslint-enable @typescript-eslint/ban-ts-comment */
}
