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

import log from "../../log";
import areArraysOfNumbersEqual from "../../utils/are_arrays_of_numbers_equal";
import {
  be4toi,
  concat,
} from "../../utils/byte_parsing";
import { PSSH_TO_INTEGER } from "./constants";

/**
 * As we observed on some browsers (IE and Edge), the initialization data on
 * some segments have sometimes duplicated PSSH when sent through an encrypted
 * event (but not when pushed to the SourceBuffer).
 *
 * This function tries to guess if the initialization data contains only PSSHs
 * concatenated (as it is usually the case).
 * If that's the case, it will filter duplicated PSSHs from it.
 *
 * @param {Uint8Array} initData - Raw initialization data
 * @returns {Uint8Array} - Initialization data, "cleaned"
 */
function cleanEncryptedEvent(initData : Uint8Array) : Uint8Array {
  let resInitData = new Uint8Array();
  const encounteredPSSHs : Uint8Array[] = [];

  let offset = 0;
  while (offset < initData.length) {
    if (initData.length < offset + 8 ||
        be4toi(initData, offset + 4) !== PSSH_TO_INTEGER
    ) {
      log.warn("Compat: Unrecognized initialization data. Use as is.");
      return initData;
    }

    const len = be4toi(new Uint8Array(initData), offset);
    if (offset + len > initData.length) {
      log.warn("Compat: Unrecognized initialization data. Use as is.");
      return initData;
    }
    const currentPSSH = initData.subarray(offset, offset + len);
    if (isPSSHAlreadyEncountered(encounteredPSSHs, currentPSSH)) {
      log.warn("Compat: Duplicated PSSH found in initialization data, removing it.");
    } else {
      resInitData = concat(resInitData, currentPSSH);
      encounteredPSSHs.push(initData);
    }
    offset += len;
  }

  if (offset !== initData.length) {
    log.warn("Compat: Unrecognized initialization data. Use as is.");
    return initData;
  }
  return resInitData;
}

/**
 * Returns `true` if the given PSSH has already been stored in the
 * `encounteredPSSHs` cache given.
 * Returns `false` otherwise.
 * @param {Array.<Object>} encounteredPSSHs
 * @param {Uint8Array} pssh
 * @returns {boolean}
 */
function isPSSHAlreadyEncountered(
  encounteredPSSHs : Uint8Array[],
  pssh : Uint8Array
) : boolean {
  for (let i = 0; i < encounteredPSSHs.length; i++) {
    const item = encounteredPSSHs[i];
    if (areArraysOfNumbersEqual(pssh, item)) {
      return true;
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
export default function getInitData(
  encryptedEvent : MediaEncryptedEvent
) : {
  initData : Uint8Array|null;
  initDataType : string|undefined;
} {
  const { initData, initDataType } = encryptedEvent;
  if (initData == null) {
    log.warn("Compat: No init data found on media encrypted event.");
    return { initData, initDataType };
  }

  const initDataBytes = new Uint8Array(initData);
  return { initData: cleanEncryptedEvent(initDataBytes),
           initDataType: encryptedEvent.initDataType };
}
