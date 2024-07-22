"use strict";
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
exports.addManifestIntegrityChecks = exports.addSegmentIntegrityChecks = void 0;
var errors_1 = require("../../errors");
var global_scope_1 = require("../../utils/global_scope");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var task_canceller_1 = require("../../utils/task_canceller");
var check_isobmff_integrity_1 = require("../utils/check_isobmff_integrity");
var infer_segment_container_1 = require("../utils/infer_segment_container");
/**
 * Add multiple checks on the response given by the `segmentLoader` in argument.
 * If the response appear to be corrupted, the returned Promise will reject with
 * an error with an `INTEGRITY_ERROR` code.
 * @param {Function} segmentLoader
 * @returns {Function}
 */
function addSegmentIntegrityChecks(segmentLoader) {
    return function (url, context, loaderOptions, initialCancelSignal, callbacks) {
        return new Promise(function (resolve, reject) {
            var requestCanceller = new task_canceller_1.default();
            var unlinkCanceller = requestCanceller.linkToSignal(initialCancelSignal);
            requestCanceller.signal.register(reject);
            segmentLoader(url, context, loaderOptions, requestCanceller.signal, __assign(__assign({}, callbacks), { onNewChunk: function (data) {
                    try {
                        throwOnIntegrityError(data);
                        callbacks.onNewChunk(data);
                    }
                    catch (err) {
                        // Do not reject with a `CancellationError` after cancelling the request
                        cleanUpCancellers();
                        // Cancel the request
                        requestCanceller.cancel();
                        // Reject with thrown error
                        reject(err);
                    }
                } })).then(function (info) {
                cleanUpCancellers();
                if (requestCanceller.isUsed()) {
                    return;
                }
                if (info.resultType === "segment-loaded") {
                    try {
                        throwOnIntegrityError(info.resultData.responseData);
                    }
                    catch (err) {
                        reject(err);
                        return;
                    }
                }
                resolve(info);
            }, function (err) {
                cleanUpCancellers();
                reject(err);
            });
            function cleanUpCancellers() {
                requestCanceller.signal.deregister(reject);
                unlinkCanceller();
            }
        });
        /**
         * If the data's seems to be corrupted, throws an `INTEGRITY_ERROR` error.
         * @param {*} data
         */
        function throwOnIntegrityError(data) {
            if ((!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) ||
                (0, infer_segment_container_1.default)(context.type, context.mimeType) !== "mp4") {
                return;
            }
            (0, check_isobmff_integrity_1.default)(new Uint8Array(data), context.segment.isInit);
        }
    };
}
exports.addSegmentIntegrityChecks = addSegmentIntegrityChecks;
/**
 * Add multiple checks on the response given by the `manifestLoader` in argument.
 * If the response appear to be corrupted, the returned Promise will reject with
 * an error with an `INTEGRITY_ERROR` code.
 * @param {Function} manifestLoader
 * @returns {Function}
 */
function addManifestIntegrityChecks(manifestLoader) {
    var _this = this;
    return function (url, options, initialCancelSignal) { return __awaiter(_this, void 0, void 0, function () {
        /**
         * If the data's seems to be corrupted, throws an `INTEGRITY_ERROR` error.
         * @param {*} data
         */
        function throwOnIntegrityError(data) {
            if (typeof data === "string") {
                var currOffset = data.length - 1;
                var expectedStrings = ["</", "MPD", ">"];
                for (var i = expectedStrings.length - 1; i >= 0; i--) {
                    var currentExpectedStr = expectedStrings[i];
                    while (isCharXmlWhiteSpace(data[currOffset])) {
                        currOffset--;
                    }
                    for (var j = currentExpectedStr.length - 1; j >= 0; j--) {
                        if (data[currOffset] !== currentExpectedStr[j]) {
                            throw new Error("INTEGRITY_ERROR MPD does not end with </MPD>");
                        }
                        else {
                            currOffset--;
                        }
                    }
                }
            }
            else if (data instanceof ArrayBuffer) {
                var currOffset = data.byteLength - 1;
                var dv = new DataView(data);
                var expectedCharGroups = [[0x3c, 0x2f], [0x4d, 0x50, 0x44], [0x3e]];
                for (var i = expectedCharGroups.length - 1; i >= 0; i--) {
                    var currentExpectedCharGroup = expectedCharGroups[i];
                    while (isUtf8XmlWhiteSpace(dv.getUint8(currOffset))) {
                        currOffset--;
                    }
                    for (var j = currentExpectedCharGroup.length - 1; j >= 0; j--) {
                        if (dv.getUint8(currOffset) !== currentExpectedCharGroup[j]) {
                            throw new Error("INTEGRITY_ERROR MPD does not end with </MPD>");
                        }
                        else {
                            currOffset--;
                        }
                    }
                }
            }
            else if (!(0, is_null_or_undefined_1.default)(global_scope_1.default.Document) &&
                data instanceof global_scope_1.default.Document) {
                if (data.documentElement.nodeName !== "MPD") {
                    throw new errors_1.OtherError("INTEGRITY_ERROR", "MPD does not end with </MPD>");
                }
            }
        }
        var res;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, manifestLoader(url, options, initialCancelSignal)];
                case 1:
                    res = _a.sent();
                    throwOnIntegrityError(res.responseData);
                    return [2 /*return*/, res];
            }
        });
    }); };
}
exports.addManifestIntegrityChecks = addManifestIntegrityChecks;
/**
 * Returns `true` if the character given can be considered as
 * whitespace according to the XML spec.
 * @param {string} char
 * @returns {boolean}
 */
function isCharXmlWhiteSpace(char) {
    return char === " " || char === "\t" || char === "\r" || char === "\n";
}
/**
 * Returns `true` if the character given can be considered as an ASCII
 * whitespace according to the HTML spec.
 * @param {string} char
 * @returns {boolean}
 */
function isUtf8XmlWhiteSpace(char) {
    return char === 0x20 || char === 0x9 || char === 0xd || char === 0xa;
}
