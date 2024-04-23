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
var log_1 = require("../../log");
var isobmff_1 = require("../../parsers/containers/isobmff");
var are_arrays_of_numbers_equal_1 = require("../../utils/are_arrays_of_numbers_equal");
var byte_parsing_1 = require("../../utils/byte_parsing");
var is_null_or_undefined_1 = require("../../utils/is_null_or_undefined");
var constants_1 = require("./constants");
/**
 * Take in input initialization data from an encrypted event and generate the
 * corresponding array of initialization data values from it.
 *
 * At the moment, this function only handles initialization data which have the
 * "cenc" initialization data type.
 * It will just return a single value with an `undefined` `systemId` for all
 * other types of data.
 * @param {Uint8Array} initData - Raw initialization data
 * @returns {Array.<Object>}
 */
function getInitializationDataValues(initData) {
    var result = [];
    var offset = 0;
    while (offset < initData.length) {
        if (initData.length < offset + 8 ||
            (0, byte_parsing_1.be4toi)(initData, offset + 4) !== constants_1.PSSH_TO_INTEGER) {
            log_1.default.warn("Compat: Unrecognized initialization data. Use as is.");
            return [{ systemId: undefined, data: initData }];
        }
        var len = (0, byte_parsing_1.be4toi)(new Uint8Array(initData), offset);
        if (offset + len > initData.length) {
            log_1.default.warn("Compat: Unrecognized initialization data. Use as is.");
            return [{ systemId: undefined, data: initData }];
        }
        var currentPSSH = initData.subarray(offset, offset + len);
        var systemId = (0, isobmff_1.getPsshSystemID)(currentPSSH, 8);
        var currentItem = { systemId: systemId, data: currentPSSH };
        if (isPSSHAlreadyEncountered(result, currentItem)) {
            // As we observed on some browsers (IE and Edge), the initialization data on
            // some segments have sometimes duplicated PSSH when sent through an encrypted
            // event (but not when the corresponding segment has been pushed to the
            // SourceBuffer).
            // We prefer filtering them out, to avoid further issues.
            log_1.default.warn("Compat: Duplicated PSSH found in initialization data, removing it.");
        }
        else {
            result.push(currentItem);
        }
        offset += len;
    }
    if (offset !== initData.length) {
        log_1.default.warn("Compat: Unrecognized initialization data. Use as is.");
        return [{ systemId: undefined, data: initData }];
    }
    return result;
}
/**
 * Returns `true` if the given PSSH has already been stored in the
 * `encounteredPSSHs` cache given.
 * Returns `false` otherwise.
 * @param {Array.<Object>} encounteredPSSHs
 * @param {Uint8Array} pssh
 * @returns {boolean}
 */
function isPSSHAlreadyEncountered(encounteredPSSHs, pssh) {
    for (var i = 0; i < encounteredPSSHs.length; i++) {
        var item = encounteredPSSHs[i];
        if (pssh.systemId === undefined ||
            item.systemId === undefined ||
            pssh.systemId === item.systemId) {
            if ((0, are_arrays_of_numbers_equal_1.default)(pssh.data, item.data)) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Take out the two things we need on an encryptedEvent:
 *   - the initialization Data
 *   - the initialization Data type
 *
 * @param {MediaEncryptedEvent} encryptedEvent - Payload received with an
 * "encrypted" event.
 * @returns {Object} - Initialization data and Initialization data type.
 * @throws {EncryptedMediaError} - Throws if no initialization data is
 * encountered in the given event.
 */
function getInitData(encryptedEvent) {
    var initData = encryptedEvent.initData, initDataType = encryptedEvent.initDataType;
    if ((0, is_null_or_undefined_1.default)(initData)) {
        log_1.default.warn("Compat: No init data found on media encrypted event.");
        return null;
    }
    var initDataBytes = new Uint8Array(initData);
    var values = getInitializationDataValues(initDataBytes);
    return { type: initDataType, values: values };
}
exports.default = getInitData;
