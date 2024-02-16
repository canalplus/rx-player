"use strict";
/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
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
var config_1 = require("../../../config");
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
var xhr_1 = require("../../../utils/request/xhr");
var task_canceller_1 = require("../../../utils/task_canceller");
var iso8601Duration = /^P(([\d.]*)Y)?(([\d.]*)M)?(([\d.]*)D)?T?(([\d.]*)H)?(([\d.]*)M)?(([\d.]*)S)?/;
/**
 * Parse MPD ISO8601 duration attributes into seconds.
 *
 * The returned value is a tuple of two elements where:
 *   1. the first value is the parsed value - or `null` if we could not parse
 *      it
 *   2. the second value is a possible error encountered while parsing this
 *      value - set to `null` if no error was encountered.
 * @param {string} val - The value to parse
 * @returns {number | null}
 */
function parseDuration(val) {
    if (!(0, is_non_empty_string_1.default)(val)) {
        return null;
    }
    var match = iso8601Duration.exec(val);
    if (match === null) {
        return null;
    }
    var duration = parseFloat((0, is_non_empty_string_1.default)(match[2]) ? match[2] : "0") * 365 * 24 * 60 * 60 +
        parseFloat((0, is_non_empty_string_1.default)(match[4]) ? match[4] : "0") * 30 * 24 * 60 * 60 +
        parseFloat((0, is_non_empty_string_1.default)(match[6]) ? match[6] : "0") * 24 * 60 * 60 +
        parseFloat((0, is_non_empty_string_1.default)(match[8]) ? match[8] : "0") * 60 * 60 +
        parseFloat((0, is_non_empty_string_1.default)(match[10]) ? match[10] : "0") * 60 +
        parseFloat((0, is_non_empty_string_1.default)(match[12]) ? match[12] : "0");
    return duration;
}
/**
 * Load manifest and get duration from it.
 * @param {String} url
 * @param {String} transport
 * @returns {Promise.<number>}
 */
function getDurationFromManifest(url, transport) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var response_1, responseData_1, root, dashDurationAttribute, periodElements, firstDASHStartAttribute, firstDASHStart, dashDuration, smoothDurationAttribute, smoothTimeScaleAttribute, timescale, response, responseData, metaplaylist, contents, lastEnd, firstStart;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (transport !== "dash" && transport !== "smooth" && transport !== "metaplaylist") {
                        throw new Error("createMetaplaylist: Unknown transport type.");
                    }
                    if (!(transport === "dash" || transport === "smooth")) return [3 /*break*/, 2];
                    return [4 /*yield*/, (0, xhr_1.default)({
                            url: url,
                            responseType: "document",
                            timeout: config_1.default.getCurrent().DEFAULT_REQUEST_TIMEOUT,
                            connectionTimeout: config_1.default.getCurrent().DEFAULT_CONNECTION_TIMEOUT,
                            // We won't cancel
                            cancelSignal: new task_canceller_1.default().signal,
                        })];
                case 1:
                    response_1 = _b.sent();
                    responseData_1 = response_1.responseData;
                    root = responseData_1.documentElement;
                    if (transport === "dash") {
                        dashDurationAttribute = root.getAttribute("mediaPresentationDuration");
                        if (dashDurationAttribute === null) {
                            throw new Error("createMetaplaylist: No duration on DASH content.");
                        }
                        periodElements = root.getElementsByTagName("Period");
                        firstDASHStartAttribute = (_a = periodElements[0]) === null || _a === void 0 ? void 0 : _a.getAttribute("start");
                        firstDASHStart = firstDASHStartAttribute !== null ? parseDuration(firstDASHStartAttribute) : 0;
                        dashDuration = parseDuration(dashDurationAttribute);
                        if (firstDASHStart === null || dashDuration === null) {
                            throw new Error("createMetaplaylist: Cannot parse " + "the duration from a DASH content.");
                        }
                        return [2 /*return*/, dashDuration - firstDASHStart];
                    }
                    smoothDurationAttribute = root.getAttribute("Duration");
                    smoothTimeScaleAttribute = root.getAttribute("TimeScale");
                    if (smoothDurationAttribute === null) {
                        throw new Error("createMetaplaylist: No duration on smooth content.");
                    }
                    timescale = smoothTimeScaleAttribute !== null
                        ? parseInt(smoothTimeScaleAttribute, 10)
                        : 10000000;
                    return [2 /*return*/, parseInt(smoothDurationAttribute, 10) / timescale];
                case 2: return [4 /*yield*/, (0, xhr_1.default)({
                        url: url,
                        responseType: "text",
                        timeout: config_1.default.getCurrent().DEFAULT_REQUEST_TIMEOUT,
                        connectionTimeout: config_1.default.getCurrent().DEFAULT_CONNECTION_TIMEOUT,
                        // We won't cancel
                        cancelSignal: new task_canceller_1.default().signal,
                    })];
                case 3:
                    response = _b.sent();
                    responseData = response.responseData;
                    metaplaylist = JSON.parse(responseData);
                    if (metaplaylist.contents === undefined ||
                        metaplaylist.contents.length === undefined ||
                        metaplaylist.contents.length === 0) {
                        throw new Error("createMetaplaylist: No duration on Metaplaylist content.");
                    }
                    contents = metaplaylist.contents;
                    lastEnd = contents[contents.length - 1].endTime;
                    firstStart = contents[0].startTime;
                    return [2 /*return*/, lastEnd - firstStart];
            }
        });
    });
}
exports.default = getDurationFromManifest;
