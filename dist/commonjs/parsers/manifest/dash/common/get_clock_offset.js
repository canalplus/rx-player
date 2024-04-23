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
var log_1 = require("../../../../log");
var monotonic_timestamp_1 = require("../../../../utils/monotonic_timestamp");
/**
 * Get difference between the server's clock, in milliseconds, and the
 * monotonically-raising timestamp used by the RxPlayer.
 * This property allows to calculate the server time at any moment.
 *
 * `undefined` if we could not define such offset (in which case, you could have
 * to rely on the user's clock instead).
 *
 * For example, a response of 1000 would mean that the timestamp is 1 second
 * behind the server's time.
 * @param {string} serverClock
 * @returns {number|undefined}
 */
function getClockOffset(serverClock) {
    var httpOffset = Date.parse(serverClock) - (0, monotonic_timestamp_1.default)();
    if (isNaN(httpOffset)) {
        log_1.default.warn("DASH Parser: Invalid clock received: ", serverClock);
        return undefined;
    }
    return httpOffset;
}
exports.default = getClockOffset;
