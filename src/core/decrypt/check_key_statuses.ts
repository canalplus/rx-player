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

import { ICustomMediaKeySession } from "../../compat";
import getUUIDKidFromKeyStatusKID from "../../compat/eme/get_uuid_kid_from_keystatus_kid";
import { EncryptedMediaError } from "../../errors";
import { bytesToHex } from "../../utils/string_parsing";
import { IEMEWarningEvent } from "./types";

const KEY_STATUSES = { EXPIRED: "expired",
                       INTERNAL_ERROR: "internal-error",
                       OUTPUT_RESTRICTED: "output-restricted" };

export interface IKeyStatusesCheckingOptions {
  /**
   * If explicitely set to `false`, we won't throw on error when a used license
   * is expired.
   */
  throwOnLicenseExpiration? : boolean;
  /** Avoid throwing when invalid key statuses are encountered. */
  fallbackOn? : {
    /**
     * If set to `true`, we won't throw when an "internal-error" key status is
     * encountered but just add a warning and the corresponding key id to the list
     * of blacklisted key ids.
     */
    keyInternalError? : boolean;
    /**
     * If set to `true`, we won't throw when an "output-restricted" key status is
     * encountered but just add a warning and the corresponding key id to the list
     * of blacklisted key ids.
     */
    keyOutputRestricted? : boolean;
  };
}

/**
 * MediaKeyStatusMap's iterator seems to be quite peculiar and wrongly defined
 * by TypeScript.
 */
type IKeyStatusesForEach = (
  callback: (
    ((arg1 : MediaKeyStatus, arg2 : ArrayBuffer) => void) |
    ((arg1 : ArrayBuffer, arg2 : MediaKeyStatus) => void)
  )
) => void;

/**
 * Look at the current key statuses in the sessions and construct the
 * appropriate warnings, whitelisted and blacklisted key ids.
 *
 * Throws if one of the keyID is on an error.
 * @param {MediaKeySession} session - The MediaKeySession from which the keys
 * will be checked.
 * @param {Object} options
 * @param {String} keySystem - The configuration keySystem used for deciphering
 * @returns {Object} - Warnings to send, whitelisted and blacklisted key ids.
 */
export default function checkKeyStatuses(
  session : MediaKeySession | ICustomMediaKeySession,
  options: IKeyStatusesCheckingOptions,
  keySystem: string
) : { warnings : IEMEWarningEvent[];
      blacklistedKeyIDs : Uint8Array[];
      whitelistedKeyIds : Uint8Array[]; }
{
  const warnings : IEMEWarningEvent[] = [];
  const blacklistedKeyIDs : Uint8Array[] = [];
  const whitelistedKeyIds : Uint8Array[] = [];
  const { fallbackOn = {}, throwOnLicenseExpiration } = options;

  (session.keyStatuses.forEach as IKeyStatusesForEach)((
    _arg1 : unknown,
    _arg2 : unknown) => {
    // Hack present because the order of the arguments has changed in spec
    // and is not the same between some versions of Edge and Chrome.
    const [keyStatus, keyStatusKeyId] = (() => {
      return (typeof _arg1  === "string" ? [_arg1, _arg2] :
                                           [_arg2, _arg1]) as [ MediaKeyStatus,
                                                                ArrayBuffer ];
    })();

    const keyId = getUUIDKidFromKeyStatusKID(keySystem,
                                             new Uint8Array(keyStatusKeyId));
    switch (keyStatus) {
      case KEY_STATUSES.EXPIRED: {
        const error = new EncryptedMediaError(
          "KEY_STATUS_CHANGE_ERROR",
          `A decryption key expired (${bytesToHex(keyId)})`);

        if (throwOnLicenseExpiration !== false) {
          throw error;
        }
        warnings.push({ type: "warning", value: error });
        whitelistedKeyIds.push(keyId);
        break;
      }

      case KEY_STATUSES.INTERNAL_ERROR: {
        const error = new EncryptedMediaError(
          "KEY_STATUS_CHANGE_ERROR",
          `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`);
        if (fallbackOn.keyInternalError !== true) {
          throw error;
        }
        warnings.push({ type: "warning", value: error });
        blacklistedKeyIDs.push(keyId);
        break;
      }

      case KEY_STATUSES.OUTPUT_RESTRICTED: {
        const error = new EncryptedMediaError(
          "KEY_STATUS_CHANGE_ERROR",
          `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`);
        if (fallbackOn.keyOutputRestricted !== true) {
          throw error;
        }
        warnings.push({ type: "warning", value: error });
        blacklistedKeyIDs.push(keyId);
        break;
      }

      default:
        whitelistedKeyIds.push(keyId);
        break;
    }
  });
  return { warnings, blacklistedKeyIDs, whitelistedKeyIds };
}
