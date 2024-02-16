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
exports.patchInitData = void 0;
var log_1 = require("../../log");
var isobmff_1 = require("../../parsers/containers/isobmff");
var byte_parsing_1 = require("../../utils/byte_parsing");
var constants_1 = require("./constants");
/**
 * Modify "initialization data" sent to a `generateKeyRequest` EME call to
 * improve the player's browser compatibility:
 *
 *   1. some browsers/CDM have problems when the CENC PSSH box is the first
 *      encountered PSSH box in the initialization data (for the moment just
 *      Edge was noted with this behavior).
 *      We found however that it works on every browser when the CENC pssh
 *      box(es) is/are the last box(es) encountered.
 *
 *      To that end, we move CENC pssh boxes at the end of the initialization
 *      data in this function.
 *
 *   2. Some poorly encoded/packaged contents communicate both a CENC with a
 *      pssh version of 0 and one with a version of 1. We found out that this is
 *      not always well handled on some devices/browsers (on Edge and some other
 *      embedded devices that shall remain nameless for now!).
 *
 *      Here this function will filter out CENC pssh with a version different to
 *      1 when one(s) with a version of 1 is/are already present.
 *
 * If the initData is unrecognized or if a CENC PSSH is not found, this function
 * throws.
 * @param {Uint8Array} initData - Initialization data you want to patch
 * @returns {Uint8Array} - Initialization data, patched
 */
function patchInitData(initData) {
    log_1.default.info("Compat: Trying to move CENC PSSH from init data at the end of it.");
    var foundCencV1 = false;
    var concatenatedCencs = new Uint8Array();
    var resInitData = new Uint8Array();
    var offset = 0;
    while (offset < initData.length) {
        if (initData.length < offset + 8 ||
            (0, byte_parsing_1.be4toi)(initData, offset + 4) !== constants_1.PSSH_TO_INTEGER) {
            log_1.default.warn("Compat: unrecognized initialization data. Cannot patch it.");
            throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
        }
        var len = (0, byte_parsing_1.be4toi)(new Uint8Array(initData), offset);
        if (offset + len > initData.length) {
            log_1.default.warn("Compat: unrecognized initialization data. Cannot patch it.");
            throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
        }
        var currentPSSH = initData.subarray(offset, offset + len);
        // yep
        if (initData[offset + 12] === 0x10 &&
            initData[offset + 13] === 0x77 &&
            initData[offset + 14] === 0xef &&
            initData[offset + 15] === 0xec &&
            initData[offset + 16] === 0xc0 &&
            initData[offset + 17] === 0xb2 &&
            initData[offset + 18] === 0x4d &&
            initData[offset + 19] === 0x02 &&
            initData[offset + 20] === 0xac &&
            initData[offset + 21] === 0xe3 &&
            initData[offset + 22] === 0x3c &&
            initData[offset + 23] === 0x1e &&
            initData[offset + 24] === 0x52 &&
            initData[offset + 25] === 0xe2 &&
            initData[offset + 26] === 0xfb &&
            initData[offset + 27] === 0x4b) {
            var cencOffsets = (0, isobmff_1.getNextBoxOffsets)(currentPSSH);
            var version = cencOffsets === null ? undefined : currentPSSH[cencOffsets[1]];
            log_1.default.info("Compat: CENC PSSH found with version", version);
            if (version === undefined) {
                log_1.default.warn("Compat: could not read version of CENC PSSH");
            }
            else if (foundCencV1 === (version === 1)) {
                // Either `concatenatedCencs` only contains v1 or does not contain any
                concatenatedCencs = (0, byte_parsing_1.concat)(concatenatedCencs, currentPSSH);
            }
            else if (version === 1) {
                log_1.default.warn("Compat: cenc version 1 encountered, " + "removing every other cenc pssh box.");
                concatenatedCencs = currentPSSH;
                foundCencV1 = true;
            }
            else {
                log_1.default.warn("Compat: filtering out cenc pssh box with wrong version", version);
            }
        }
        else {
            resInitData = (0, byte_parsing_1.concat)(resInitData, currentPSSH);
        }
        offset += len;
    }
    if (offset !== initData.length) {
        log_1.default.warn("Compat: unrecognized initialization data. Cannot patch it.");
        throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
    }
    return (0, byte_parsing_1.concat)(resInitData, concatenatedCencs);
}
exports.patchInitData = patchInitData;
/**
 * Generate a request from session.
 * @param {MediaKeySession} session - MediaKeySession on which the request will
 * be done.
 * @param {string} initializationDataType - Initialization data type given e.g.
 * by the "encrypted" event for the corresponding request.
 * @param {Uint8Array} initializationData - Initialization data given e.g. by
 * the "encrypted" event for the corresponding request.
 * @returns {Promise} - Emit when done. Errors if fails.
 */
function generateKeyRequest(session, initializationDataType, initializationData) {
    log_1.default.debug("Compat: Calling generateRequest on the MediaKeySession");
    var patchedInit;
    try {
        patchedInit = patchInitData(initializationData);
    }
    catch (_e) {
        patchedInit = initializationData;
    }
    var initDataType = initializationDataType !== null && initializationDataType !== void 0 ? initializationDataType : "";
    return session.generateRequest(initDataType, patchedInit).catch(function (error) {
        if (initDataType !== "" || !(error instanceof TypeError)) {
            throw error;
        }
        // On newer EME versions of the specification, the initialization data
        // type given to generateRequest cannot be an empty string (it returns
        // a rejected promise with a TypeError in that case).
        // Retry with a default "cenc" value for initialization data type if
        // we're in that condition.
        log_1.default.warn("Compat: error while calling `generateRequest` with an empty " +
            'initialization data type. Retrying with a default "cenc" value.', error);
        return session.generateRequest("cenc", patchedInit);
    });
}
exports.default = generateKeyRequest;
