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

import log from "../../../common/log";
import areArraysOfNumbersEqual from "../../../common/utils/are_arrays_of_numbers_equal";
import { be4toi } from "../../../common/utils/byte_parsing";
import { getPsshSystemID } from "../../../worker/parsers/containers/isobmff";
import { PSSH_TO_INTEGER } from "./constants";

/** Data recuperated from parsing the payload of an `encrypted` event. */
export interface IEncryptedEventData {
  /**
   * Initialization data type.
   * String describing the format of the initialization data sent through this
   * event.
   * https://www.w3.org/TR/eme-initdata-registry/
   *
   * `undefined` if not known.
   */
  type : string | undefined;
  /** Every initialization data for that type. */
  values: Array<{
    /**
     * Hex encoded system id, which identifies the key system.
     * https://dashif.org/identifiers/content_protection/
     *
     * If `undefined`, we don't know the system id for that initialization data.
     * In that case, the initialization data might even be a concatenation of
     * the initialization data from multiple system ids.
     */
    systemId : string | undefined;
    /**
     * The initialization data itself for that type and systemId.
     * For example, with ISOBMFF "cenc" initialization data, this will be the
     * whole PSSH box.
     */
    data: Uint8Array;
  }>;
}

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
function getInitializationDataValues(
  initData : Uint8Array
) : Array<{ systemId : string | undefined; data : Uint8Array }> {
  const result : Array<{ systemId : string | undefined; data : Uint8Array }> = [];
  let offset = 0;

  while (offset < initData.length) {
    if (initData.length < offset + 8 ||
        be4toi(initData, offset + 4) !== PSSH_TO_INTEGER
    ) {
      log.warn("Compat: Unrecognized initialization data. Use as is.");
      return [ { systemId: undefined,
                 data: initData } ];
    }

    const len = be4toi(new Uint8Array(initData), offset);
    if (offset + len > initData.length) {
      log.warn("Compat: Unrecognized initialization data. Use as is.");
      return [ { systemId: undefined,
                 data: initData } ];
    }
    const currentPSSH = initData.subarray(offset, offset + len);
    const systemId = getPsshSystemID(currentPSSH, 8);
    const currentItem = { systemId, data: currentPSSH };
    if (isPSSHAlreadyEncountered(result, currentItem)) {
      // As we observed on some browsers (IE and Edge), the initialization data on
      // some segments have sometimes duplicated PSSH when sent through an encrypted
      // event (but not when the corresponding segment has been pushed to the
      // SourceBuffer).
      // We prefer filtering them out, to avoid further issues.
      log.warn("Compat: Duplicated PSSH found in initialization data, removing it.");
    } else {
      result.push(currentItem);
    }
    offset += len;
  }

  if (offset !== initData.length) {
    log.warn("Compat: Unrecognized initialization data. Use as is.");
    return [ { systemId: undefined,
               data: initData } ];
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
function isPSSHAlreadyEncountered(
  encounteredPSSHs : Array<{ systemId : string | undefined; data : Uint8Array }>,
  pssh : { systemId : string | undefined; data : Uint8Array }
) : boolean {
  for (let i = 0; i < encounteredPSSHs.length; i++) {
    const item = encounteredPSSHs[i];
    if (pssh.systemId === undefined ||
        item.systemId === undefined ||
        pssh.systemId === item.systemId)
    {
      if (areArraysOfNumbersEqual(pssh.data, item.data)) {
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
export default function getInitData(
  encryptedEvent : MediaEncryptedEvent
) : IEncryptedEventData | null {
  const { initData, initDataType } = encryptedEvent;
  if (initData == null) {
    log.warn("Compat: No init data found on media encrypted event.");
    return null;
  }

  const initDataBytes = new Uint8Array(initData);
  const values = getInitializationDataValues(initDataBytes);
  return { type: initDataType, values };
}
