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

import {
  defer as observableDefer,
  Observable,
} from "rxjs";
import { catchError } from "rxjs/operators";
import log from "../../log";
import {
  be4toi,
  concat,
} from "../../utils/byte_parsing";
import castToObservable from "../../utils/cast_to_observable";
import { isIEOrEdge } from "../browser_detection";
import { PSSH_TO_INTEGER } from "./constants";
import { ICustomMediaKeySession } from "./custom_media_keys";

/**
 * Some browsers have problems when the CENC PSSH box is the first managed PSSH
 * encountered (for the moment just Edge was noted with this behavior).
 *
 * This function tries to remove the CENC PSSH box in the given init data.
 *
 * If the initData is unrecognized or if a CENC PSSH is not found, this function
 * throws.
 * @param {Uint8Array} initData
 * @returns {Uint8Array}
 */
export function patchInitData(initData : Uint8Array) : Uint8Array {
  const initialLength = initData.byteLength;
  log.info("Compat: Trying to remove CENC PSSH from init data.");
  let resInitData = new Uint8Array();

  let offset = 0;
  while (offset < initData.length) {
    if (
      initData.length < offset + 8 ||
      be4toi(initData, offset + 4) !== PSSH_TO_INTEGER
    ) {
      log.warn("Compat: unrecognized initialization data. Cannot patch it.");
      throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
    }

    const len = be4toi(new Uint8Array(initData), offset);
    if (offset + len > initData.length) {
      log.warn("Compat: unrecognized initialization data. Cannot patch it.");
      throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
    }
    if (
      // yep
      initData[offset + 12] === 0x10 &&
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
      initData[offset + 27] === 0x4b
    ) {
      log.info("Compat: CENC PSSH found. Removing it.");
    } else {
      const currentPSSH = initData.subarray(offset, offset + len);
      resInitData = concat(resInitData, currentPSSH);
    }
    offset += len;
  }

  if (offset !== initData.length) {
    log.warn("Compat: unrecognized initialization data. Cannot patch it.");
    throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
  }

  if (resInitData.byteLength === initialLength) {
    log.warn("Compat: CENC PSSH not found. Cannot patch it");
    throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
  }
  return resInitData;
}

/**
 * Generate a request from session.
 * @param {MediaKeySession} session
 * @param {Uint8Array} initData
 * @param {string} initDataType
 * @param {string} sessionType
 * @returns {Observable}
 */
export default function generateKeyRequest(
  session: MediaKeySession|ICustomMediaKeySession,
  initData: Uint8Array,
  initDataType: string|undefined
) : Observable<unknown> {
  return observableDefer(() => {
    log.debug("Compat: Calling generateRequest on the MediaKeySession");
    return castToObservable(
      session.generateRequest(initDataType || "", initData)
    ).pipe(catchError((error) => {
      if (isIEOrEdge) {
        let patchedInit : Uint8Array;
        try {
          patchedInit = patchInitData(initData);
        } catch (_e) {
          throw error;
        }
        return castToObservable(
          session.generateRequest(initDataType || "", patchedInit)
        );
      }
      throw error;
    }));
  });
}
