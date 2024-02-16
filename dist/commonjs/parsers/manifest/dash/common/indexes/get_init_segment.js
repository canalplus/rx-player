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
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
/**
 * Construct init segment for the given index.
 * @param {Object} index
 * @param {function} isEMSGWhitelisted
 * @returns {Object}
 */
function getInitSegment(index, isEMSGWhitelisted) {
    var _a;
    var initialization = index.initialization;
    var privateInfos = {};
    if (isEMSGWhitelisted !== undefined) {
        privateInfos.isEMSGWhitelisted = isEMSGWhitelisted;
    }
    return {
        id: "init",
        isInit: true,
        time: 0,
        end: 0,
        duration: 0,
        timescale: 1,
        range: !(0, is_null_or_undefined_1.default)(initialization) ? initialization.range : undefined,
        indexRange: index.indexRange,
        url: (_a = initialization === null || initialization === void 0 ? void 0 : initialization.url) !== null && _a !== void 0 ? _a : null,
        complete: true,
        privateInfos: privateInfos,
        timestampOffset: -(index.indexTimeOffset / index.timescale),
    };
}
exports.default = getInitSegment;
