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
/**
 * @param {Object} mpdIR
 * @returns {string|undefined}
 */
function getHTTPUTCTimingURL(mpdIR) {
    var UTCTimingHTTP = mpdIR.children.utcTimings.filter(function (utcTiming) {
        return (utcTiming.schemeIdUri === "urn:mpeg:dash:utc:http-iso:2014" ||
            utcTiming.schemeIdUri === "urn:mpeg:dash:utc:http-xsdate:2014") &&
            utcTiming.value !== undefined;
    });
    return UTCTimingHTTP.length > 0 ? UTCTimingHTTP[0].value : undefined;
}
exports.default = getHTTPUTCTimingURL;
