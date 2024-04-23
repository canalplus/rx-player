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
exports.getLastSegmentBeforePeriod = exports.getFirstSegmentAfterPeriod = void 0;
var segment_inventory_1 = require("./segment_inventory");
exports.default = segment_inventory_1.default;
var utils_1 = require("./utils");
Object.defineProperty(exports, "getFirstSegmentAfterPeriod", { enumerable: true, get: function () { return utils_1.getFirstSegmentAfterPeriod; } });
Object.defineProperty(exports, "getLastSegmentBeforePeriod", { enumerable: true, get: function () { return utils_1.getLastSegmentBeforePeriod; } });
