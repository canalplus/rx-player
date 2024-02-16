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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLastSegmentBeforePeriod = exports.getFirstSegmentAfterPeriod = exports.SegmentSinkOperation = exports.SegmentSink = exports.BufferGarbageCollector = void 0;
var garbage_collector_1 = require("./garbage_collector");
exports.BufferGarbageCollector = garbage_collector_1.default;
var implementations_1 = require("./implementations");
Object.defineProperty(exports, "SegmentSink", { enumerable: true, get: function () { return implementations_1.SegmentSink; } });
Object.defineProperty(exports, "SegmentSinkOperation", { enumerable: true, get: function () { return implementations_1.SegmentSinkOperation; } });
var inventory_1 = require("./inventory");
Object.defineProperty(exports, "getFirstSegmentAfterPeriod", { enumerable: true, get: function () { return inventory_1.getFirstSegmentAfterPeriod; } });
Object.defineProperty(exports, "getLastSegmentBeforePeriod", { enumerable: true, get: function () { return inventory_1.getLastSegmentBeforePeriod; } });
var segment_buffers_store_1 = require("./segment_buffers_store");
exports.default = segment_buffers_store_1.default;
