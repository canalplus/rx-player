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

import type { ICustomMediaKeySession } from "../../../compat/eme";
import getUUIDKidFromKeyStatusKID from "../../../compat/eme/get_uuid_kid_from_keystatus_kid";
import { EncryptedMediaError } from "../../../errors";
import log from "../../../log";
import type {
  IEncryptedMediaErrorKeyStatusObject,
  IKeySystemOption,
  IPlayerError,
} from "../../../public_types";
import { assertUnreachable } from "../../../utils/assert";
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
  public reason: IPlayerError;

  /**
   * Creates a new `DecommissionedSessionError`.
   * @param {Error} reason - Error that led to the decision to close the
   * current MediaKeySession. Should be used for reporting purposes.
   */
  constructor(reason: IPlayerError) {
    super(reason.message);
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, DecommissionedSessionError.prototype);
    this.reason = reason;
  }
}

export type IKeyStatusesCheckingOptions = Pick<
  IKeySystemOption,
  "onKeyOutputRestricted" | "onKeyInternalError" | "onKeyExpiration"
>;

/**
 * MediaKeyStatusMap's iterator seems to be quite peculiar and wrongly defined
 * by TypeScript.
 */
type IKeyStatusesForEach = (
  callback:
    | ((arg1: MediaKeyStatus, arg2: ArrayBuffer) => void)
    | ((arg1: ArrayBuffer, arg2: MediaKeyStatus) => void),
) => void;

/**
 * Look at the current key statuses in the sessions and construct the
 * appropriate warnings, whitelisted and blacklisted key ids.
 *
 * Throws if one of the keyID is on an error.
 * @see  https://w3c.github.io/encrypted-media/#dom-mediakeystatus
 * @param {MediaKeySession} session - The MediaKeySession from which the keys
 * will be checked.
 * @param {Object} options
 * @param {String} keySystem - The configuration keySystem used for deciphering
 * @returns {Object} - Warnings to send, whitelisted and blacklisted key ids.
 */
export default function checkKeyStatuses(
  session: MediaKeySession | ICustomMediaKeySession,
  options: IKeyStatusesCheckingOptions,
  keySystem: string,
): {
  warning: EncryptedMediaError | undefined;
  blacklistedKeyIds: Uint8Array[];
  whitelistedKeyIds: Uint8Array[];
} {
  const { onKeyInternalError, onKeyOutputRestricted, onKeyExpiration } = options;
  const blacklistedKeyIds: Uint8Array[] = [];
  const whitelistedKeyIds: Uint8Array[] = [];
  const badKeyStatuses: IEncryptedMediaErrorKeyStatusObject[] = [];

  (session.keyStatuses.forEach as IKeyStatusesForEach)(
    (_arg1: unknown, _arg2: unknown) => {
      // Hack present because the order of the arguments has changed in spec
      // and is not the same between some versions of Edge and Chrome.
      const [keyStatus, keyStatusKeyId] = (() => {
        return (typeof _arg1 === "string" ? [_arg1, _arg2] : [_arg2, _arg1]) as [
          MediaKeyStatus,
          ArrayBuffer,
        ];
      })();

      const keyId = getUUIDKidFromKeyStatusKID(keySystem, new Uint8Array(keyStatusKeyId));

      const keyStatusObj = { keyId: keyId.buffer, keyStatus };

      if (log.hasLevel("DEBUG")) {
        log.debug(`DRM: key status update (${bytesToHex(keyId)}): ${keyStatus}`);
      }

      switch (keyStatus) {
        case "expired": {
          const error = new EncryptedMediaError(
            "KEY_STATUS_CHANGE_ERROR",
            `A decryption key expired (${bytesToHex(keyId)})`,
            { keyStatuses: [keyStatusObj, ...badKeyStatuses] },
          );

          switch (onKeyExpiration) {
            case undefined:
            case "error":
              throw error;
            case "close-session":
              throw new DecommissionedSessionError(error);
            case "fallback":
              blacklistedKeyIds.push(keyId);
              break;
            case "continue":
              whitelistedKeyIds.push(keyId);
              break;
            default:
              // typescript don't know that the value cannot be undefined here
              // https://github.com/microsoft/TypeScript/issues/57999
              if (onKeyExpiration !== undefined) {
                assertUnreachable(onKeyExpiration);
              }
              break;
          }
          badKeyStatuses.push(keyStatusObj);
          break;
        }

        case "internal-error": {
          const error = new EncryptedMediaError(
            "KEY_STATUS_CHANGE_ERROR",
            `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`,
            { keyStatuses: [keyStatusObj, ...badKeyStatuses] },
          );
          switch (onKeyInternalError) {
            case undefined:
            case "error":
              throw error;
            case "close-session":
              throw new DecommissionedSessionError(error);
            case "fallback":
              blacklistedKeyIds.push(keyId);
              break;
            case "continue":
              whitelistedKeyIds.push(keyId);
              break;
            default:
              // typescript don't know that the value cannot be undefined here
              // https://github.com/microsoft/TypeScript/issues/57999
              if (onKeyInternalError !== undefined) {
                assertUnreachable(onKeyInternalError);
              } else {
                throw error;
              }
          }

          badKeyStatuses.push(keyStatusObj);
          break;
        }

        case "output-restricted": {
          const error = new EncryptedMediaError(
            "KEY_STATUS_CHANGE_ERROR",
            `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`,
            { keyStatuses: [keyStatusObj, ...badKeyStatuses] },
          );
          switch (onKeyOutputRestricted) {
            case undefined:
            case "error":
              throw error;
            case "fallback":
              blacklistedKeyIds.push(keyId);
              break;
            case "continue":
              whitelistedKeyIds.push(keyId);
              break;
            default:
              // typescript don't know that the value cannot be undefined here
              // https://github.com/microsoft/TypeScript/issues/57999
              if (onKeyOutputRestricted !== undefined) {
                assertUnreachable(onKeyOutputRestricted);
              } else {
                throw error;
              }
          }

          badKeyStatuses.push(keyStatusObj);
          break;
        }

        case "usable-in-future": {
          /**
           * The key is not yet usable for decryption because the start time is in the future.
           */
          blacklistedKeyIds.push(keyId);
          break;
        }

        case "usable": {
          whitelistedKeyIds.push(keyId);
          break;
        }

        case "output-downscaled": {
          /**
           * The video content has been downscaled, probably because the device is
           * insufficiently protected and does not met the security policy to play
           * the content with the original quality (resolution).
           * The key is usable to play the downscaled content.
           * */
          whitelistedKeyIds.push(keyId);
          break;
        }

        case "status-pending": {
          /**
           * The status of the key is not yet known.
           * It should not be blacklisted nor whitelisted until the actual status
           * is determined.
           * */
          break;
        }

        case "released": {
          const error = new EncryptedMediaError(
            "KEY_STATUS_CHANGE_ERROR",
            `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`,
            { keyStatuses: [keyStatusObj, ...badKeyStatuses] },
          );
          throw error;
        }

        default:
          assertUnreachable(keyStatus);
      }
    },
  );

  let warning;
  if (badKeyStatuses.length > 0) {
    warning = new EncryptedMediaError(
      "KEY_STATUS_CHANGE_ERROR",
      "One or several problematic key statuses have been encountered",
      { keyStatuses: badKeyStatuses },
    );
  }
  return { warning, blacklistedKeyIds, whitelistedKeyIds };
}
