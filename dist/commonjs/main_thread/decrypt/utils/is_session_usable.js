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
var log_1 = require("../../../log");
var array_includes_1 = require("../../../utils/array_includes");
/**
 * If all key statuses attached to session are valid (either not
 * "expired" or "internal-error"), return true.
 * If not, return false.
 * @param {MediaKeySession} loadedSession
 * @returns {MediaKeySession}
 */
function isSessionUsable(loadedSession) {
    if (loadedSession.sessionId === "") {
        return false;
    }
    var keyStatusesMap = loadedSession.keyStatuses;
    var keyStatuses = [];
    keyStatusesMap.forEach(function (keyStatus) {
        keyStatuses.push(keyStatus);
    });
    if (keyStatuses.length <= 0) {
        log_1.default.debug("DRM: isSessionUsable: MediaKeySession given has an empty keyStatuses", loadedSession.sessionId);
        return false;
    }
    if ((0, array_includes_1.default)(keyStatuses, "expired")) {
        log_1.default.debug("DRM: isSessionUsable: MediaKeySession given has an expired key", loadedSession.sessionId);
        return false;
    }
    if ((0, array_includes_1.default)(keyStatuses, "internal-error")) {
        log_1.default.debug("DRM: isSessionUsable: MediaKeySession given has a key with an " + "internal-error", loadedSession.sessionId);
        return false;
    }
    log_1.default.debug("DRM: isSessionUsable: MediaKeySession is usable", loadedSession.sessionId);
    return true;
}
exports.default = isSessionUsable;
