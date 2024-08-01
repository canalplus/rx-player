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
import getUUIDKidFromKeyStatusKID from "../../../compat/eme/get_uuid_kid_from_keystatus_kid";
import { EncryptedMediaError } from "../../../errors";
import log from "../../../log";
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
    /**
     * Creates a new `DecommissionedSessionError`.
     * @param {Error} reason - Error that led to the decision to close the
     * current MediaKeySession. Should be used for reporting purposes.
     */
    constructor(reason) {
        super(reason.message);
        // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
        Object.setPrototypeOf(this, DecommissionedSessionError.prototype);
        this.reason = reason;
    }
}
const KEY_STATUSES = {
    EXPIRED: "expired",
    INTERNAL_ERROR: "internal-error",
    OUTPUT_RESTRICTED: "output-restricted",
};
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
export default function checkKeyStatuses(session, options, keySystem) {
    const { onKeyInternalError, onKeyOutputRestricted, onKeyExpiration } = options;
    const blacklistedKeyIds = [];
    const whitelistedKeyIds = [];
    const badKeyStatuses = [];
    session.keyStatuses.forEach((_arg1, _arg2) => {
        // Hack present because the order of the arguments has changed in spec
        // and is not the same between some versions of Edge and Chrome.
        const [keyStatus, keyStatusKeyId] = (() => {
            return (typeof _arg1 === "string" ? [_arg1, _arg2] : [_arg2, _arg1]);
        })();
        const keyId = getUUIDKidFromKeyStatusKID(keySystem, new Uint8Array(keyStatusKeyId));
        const keyStatusObj = { keyId: keyId.buffer, keyStatus };
        if (log.hasLevel("DEBUG")) {
            log.debug(`DRM: key status update (${bytesToHex(keyId)}): ${keyStatus}`);
        }
        switch (keyStatus) {
            case KEY_STATUSES.EXPIRED: {
                const error = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", `A decryption key expired (${bytesToHex(keyId)})`, { keyStatuses: [keyStatusObj, ...badKeyStatuses] });
                if (onKeyExpiration === "error" || onKeyExpiration === undefined) {
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
                        }
                        else {
                            // Compile-time check throwing when not all possible cases are handled
                            assertUnreachable(onKeyExpiration);
                        }
                        break;
                }
                badKeyStatuses.push(keyStatusObj);
                break;
            }
            case KEY_STATUSES.INTERNAL_ERROR: {
                const error = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`, { keyStatuses: [keyStatusObj, ...badKeyStatuses] });
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
                        // Weirdly enough, TypeScript is not checking properly
                        // `case undefined` (bug?)
                        if (onKeyInternalError !== undefined) {
                            assertUnreachable(onKeyInternalError);
                        }
                        else {
                            throw error;
                        }
                }
                badKeyStatuses.push(keyStatusObj);
                break;
            }
            case KEY_STATUSES.OUTPUT_RESTRICTED: {
                const error = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`, { keyStatuses: [keyStatusObj, ...badKeyStatuses] });
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
                        // Weirdly enough, TypeScript is not checking properly
                        // `case undefined` (bug?)
                        if (onKeyOutputRestricted !== undefined) {
                            assertUnreachable(onKeyOutputRestricted);
                        }
                        else {
                            throw error;
                        }
                }
                badKeyStatuses.push(keyStatusObj);
                break;
            }
            default:
                whitelistedKeyIds.push(keyId);
                break;
        }
    });
    let warning;
    if (badKeyStatuses.length > 0) {
        warning = new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", "One or several problematic key statuses have been encountered", { keyStatuses: badKeyStatuses });
    }
    return { warning, blacklistedKeyIds, whitelistedKeyIds };
}
