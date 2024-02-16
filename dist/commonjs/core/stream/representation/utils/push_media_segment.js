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
var config_1 = require("../../../../config");
var object_assign_1 = require("../../../../utils/object_assign");
var append_segment_to_buffer_1 = require("./append_segment_to_buffer");
/**
 * Push a given media segment (non-init segment) to a SegmentSink.
 * @param {Object} args
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
function pushMediaSegment(_a, cancelSignal) {
    var _b, _c;
    var playbackObserver = _a.playbackObserver, bufferGoal = _a.bufferGoal, content = _a.content, initSegmentUniqueId = _a.initSegmentUniqueId, parsedSegment = _a.parsedSegment, segment = _a.segment, segmentSink = _a.segmentSink;
    return __awaiter(this, void 0, void 0, function () {
        var chunkData, chunkInfos, chunkOffset, chunkSize, appendWindow, codec, APPEND_WINDOW_SECURITIES, safeAppendWindow, data, estimatedStart, estimatedDuration, estimatedEnd, inventoryInfos, buffered;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (parsedSegment.chunkData === null) {
                        return [2 /*return*/, null];
                    }
                    if (cancelSignal.cancellationError !== null) {
                        throw cancelSignal.cancellationError;
                    }
                    chunkData = parsedSegment.chunkData, chunkInfos = parsedSegment.chunkInfos, chunkOffset = parsedSegment.chunkOffset, chunkSize = parsedSegment.chunkSize, appendWindow = parsedSegment.appendWindow;
                    codec = content.representation.getMimeTypeString();
                    APPEND_WINDOW_SECURITIES = config_1.default.getCurrent().APPEND_WINDOW_SECURITIES;
                    safeAppendWindow = [
                        appendWindow[0] !== undefined
                            ? Math.max(0, appendWindow[0] - APPEND_WINDOW_SECURITIES.START)
                            : undefined,
                        appendWindow[1] !== undefined
                            ? appendWindow[1] + APPEND_WINDOW_SECURITIES.END
                            : undefined,
                    ];
                    data = {
                        initSegmentUniqueId: initSegmentUniqueId,
                        chunk: chunkData,
                        timestampOffset: chunkOffset,
                        appendWindow: safeAppendWindow,
                        codec: codec,
                    };
                    estimatedStart = (_b = chunkInfos === null || chunkInfos === void 0 ? void 0 : chunkInfos.time) !== null && _b !== void 0 ? _b : segment.time;
                    estimatedDuration = (_c = chunkInfos === null || chunkInfos === void 0 ? void 0 : chunkInfos.duration) !== null && _c !== void 0 ? _c : segment.duration;
                    estimatedEnd = estimatedStart + estimatedDuration;
                    if (safeAppendWindow[0] !== undefined) {
                        estimatedStart = Math.max(estimatedStart, safeAppendWindow[0]);
                    }
                    if (safeAppendWindow[1] !== undefined) {
                        estimatedEnd = Math.min(estimatedEnd, safeAppendWindow[1]);
                    }
                    inventoryInfos = (0, object_assign_1.default)({ segment: segment, chunkSize: chunkSize, start: estimatedStart, end: estimatedEnd }, content);
                    return [4 /*yield*/, (0, append_segment_to_buffer_1.default)(playbackObserver, segmentSink, { data: data, inventoryInfos: inventoryInfos }, bufferGoal, cancelSignal)];
                case 1:
                    buffered = _d.sent();
                    return [2 /*return*/, { content: content, segment: segment, buffered: buffered }];
            }
        });
    });
}
exports.default = pushMediaSegment;
