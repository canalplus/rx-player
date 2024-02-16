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
var string_parsing_1 = require("../../utils/string_parsing");
/**
 * From an array of EMSGs with manifest validity scheme id,
 * tells if the manifest needs to be refreshed.
 * @param {Array.<Object>} emsgs
 * @param {number} manifestPublishTime
 * @returns {boolean}
 */
function manifestNeedsToBeRefreshed(emsgs, manifestPublishTime) {
    if (emsgs.length <= 0) {
        return false;
    }
    var len = emsgs.length;
    for (var i = 0; i < len; i++) {
        var manifestRefreshEventFromEMSGs = emsgs[i];
        var currentManifestPublishTime = manifestPublishTime;
        var messageData = manifestRefreshEventFromEMSGs.messageData;
        var strPublishTime = (0, string_parsing_1.utf8ToStr)(messageData);
        var eventManifestPublishTime = Date.parse(strPublishTime);
        if (currentManifestPublishTime === undefined ||
            eventManifestPublishTime === undefined ||
            isNaN(eventManifestPublishTime) ||
            // DASH-if 4.3 tells (4.5.2.1) :
            // "The media presentation time beyond the event time (indicated
            // time by presentation_time_delta) is correctly described only
            // by MPDs with publish time greater than indicated value in the
            // message_data field."
            //
            // Here, if the current manifest has its publish time inferior or
            // identical to the event manifest publish time, then the manifest needs
            // to be updated
            eventManifestPublishTime >= currentManifestPublishTime) {
            return true;
        }
    }
    return false;
}
/**
 * Get wrapped inband events and manifest refresh event from
 * parsed ISOBMFF EMSG boxes.
 * @param {Array.<Object>} parsedEMSGs
 * @param {undefined | number} manifestPublishTime
 * @returns {Object}
 */
function getEventsOutOfEMSGs(parsedEMSGs, manifestPublishTime) {
    if (parsedEMSGs.length === 0) {
        return undefined;
    }
    var _a = parsedEMSGs.reduce(function (acc, val) {
        // Scheme that signals manifest update
        if (val.schemeIdUri === "urn:mpeg:dash:event:2012" &&
            // TODO support value 2 and 3
            val.value === "1") {
            if (acc.manifestRefreshEventsFromEMSGs === undefined) {
                acc.manifestRefreshEventsFromEMSGs = [];
            }
            acc.manifestRefreshEventsFromEMSGs.push(val);
        }
        else {
            if (acc.EMSGs === undefined) {
                acc.EMSGs = [];
            }
            acc.EMSGs.push(val);
        }
        return acc;
    }, {
        manifestRefreshEventsFromEMSGs: undefined,
        EMSGs: undefined,
    }), manifestRefreshEventsFromEMSGs = _a.manifestRefreshEventsFromEMSGs, EMSGs = _a.EMSGs;
    var inbandEvents = EMSGs === null || EMSGs === void 0 ? void 0 : EMSGs.map(function (evt) { return ({
        type: "emsg",
        value: evt,
    }); });
    var needsManifestRefresh = manifestPublishTime === undefined || manifestRefreshEventsFromEMSGs === undefined
        ? false
        : manifestNeedsToBeRefreshed(manifestRefreshEventsFromEMSGs, manifestPublishTime);
    return { inbandEvents: inbandEvents, needsManifestRefresh: needsManifestRefresh };
}
exports.default = getEventsOutOfEMSGs;
