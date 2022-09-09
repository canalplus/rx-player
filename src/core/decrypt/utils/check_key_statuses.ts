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

import { ICustomMediaKeySession } from "../../../compat";
/* eslint-disable-next-line max-len */
import getUUIDKidFromKeyStatusKID from "../../../compat/eme/get_uuid_kid_from_keystatus_kid";
import { EncryptedMediaError } from "../../../errors";
import {
  IEncryptedMediaErrorKeyStatusObject,
  IKeySystemOption,
  IPlayerError,
} from "../../../public_types";
import assertUnreachable from "../../../utils/assert_unreachable";
import { bytesToHex } from "../../../utils/string_parsing";

/**
 * Error thrown when the MediaKeySession has to be closed due to a trigger
 * specified by user configuration.
 * Such MediaKeySession should be closed immediately and may be re-created if
 * needed again.
 * @class DecommissionedSessionError
 * @extends Error
 */
export class DecommissionedSessionError extends Error {
  public reason : IPlayerError;

  /**
   * Creates a new `DecommissionedSessionError`.
   * @param {Error} reason - Error that led to the decision to close the
   * current MediaKeySession. Should be used for reporting purposes.
   */
  constructor(reason : IPlayerError) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, DecommissionedSessionError.prototype);
    this.reason = reason;
  }
}

const KEY_STATUSES = { EXPIRED: "expired",
                       INTERNAL_ERROR: "internal-error",
                       OUTPUT_RESTRICTED: "output-restricted" };

export type IKeyStatusesCheckingOptions =
  Pick<IKeySystemOption, "throwOnLicenseExpiration" | "fallbackOn" | "onKeyExpiration">;

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
) : { warning : EncryptedMediaError | undefined;
      blacklistedKeyIds : Uint8Array[];
      whitelistedKeyIds : Uint8Array[]; }
{
  const { fallbackOn = {},
          throwOnLicenseExpiration,
          onKeyExpiration } = options;
  const blacklistedKeyIds : Uint8Array[] = [];
  const whitelistedKeyIds : Uint8Array[] = [];
  const badKeyStatuses: IEncryptedMediaErrorKeyStatusObject[] = [];

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

    const keyStatusObj = { keyId: keyId.buffer, keyStatus };
    switch (keyStatus) {
      case KEY_STATUSES.EXPIRED: {
        const error = new EncryptedMediaError(
          "KEY_STATUS_CHANGE_ERROR",
          `A decryption key expired (${bytesToHex(keyId)})`,
          { keyStatuses: [keyStatusObj, ...badKeyStatuses] });

        if (onKeyExpiration === "error" ||
            (onKeyExpiration === undefined && throwOnLicenseExpiration === false))
        {
          throw error;
        }

        switch (onKeyExpiration) {
          case "close-session":
            throw new DecommissionedSessionError(error);
          case "fallback":
            blacklistedKeyIds.push(keyId);
            break;
          default:
            // I weirdly stopped relying on switch-cases here due to some TypeScript
            // issue, not checking properly `case undefined` (bug?)
            if (onKeyExpiration === "continue" || onKeyExpiration === undefined) {
              whitelistedKeyIds.push(keyId);
            } else {
              // Compile-time check throwing when not all possible cases are handled
              assertUnreachable(onKeyExpiration);
            }
            break;
        }

        badKeyStatuses.push(keyStatusObj);
        break;
      }

      case KEY_STATUSES.INTERNAL_ERROR: {
        if (fallbackOn.keyInternalError !== true) {
          throw new EncryptedMediaError(
            "KEY_STATUS_CHANGE_ERROR",
            `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`,
            { keyStatuses: [keyStatusObj, ...badKeyStatuses] });
        }
        badKeyStatuses.push(keyStatusObj);
        blacklistedKeyIds.push(keyId);
        break;
      }

      case KEY_STATUSES.OUTPUT_RESTRICTED: {
        if (fallbackOn.keyOutputRestricted !== true) {
          throw new EncryptedMediaError(
            "KEY_STATUS_CHANGE_ERROR",
            `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`,
            { keyStatuses: [keyStatusObj, ...badKeyStatuses] });
        }
        badKeyStatuses.push(keyStatusObj);
        blacklistedKeyIds.push(keyId);
        break;
      }

      default:
        whitelistedKeyIds.push(keyId);
        break;
    }
  });

  let warning;
  if (badKeyStatuses.length > 0) {
    warning = new EncryptedMediaError(
      "KEY_STATUS_CHANGE_ERROR",
      "One or several problematic key statuses have been encountered",
      { keyStatuses: badKeyStatuses });
  }
  return { warning,
           blacklistedKeyIds,
           whitelistedKeyIds };
}
