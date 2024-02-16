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
import { EncryptedMediaError } from "../../../errors";
import type { IKeySystemOption, IPlayerError } from "../../../public_types";
/**
 * Error thrown when the MediaKeySession has to be closed due to a trigger
 * specified by user configuration.
 * Such MediaKeySession should be closed immediately and may be re-created if
 * needed again.
 * @class DecommissionedSessionError
 * @extends Error
 */
export declare class DecommissionedSessionError extends Error {
    reason: IPlayerError;
    /**
     * Creates a new `DecommissionedSessionError`.
     * @param {Error} reason - Error that led to the decision to close the
     * current MediaKeySession. Should be used for reporting purposes.
     */
    constructor(reason: IPlayerError);
}
export type IKeyStatusesCheckingOptions = Pick<IKeySystemOption, "onKeyOutputRestricted" | "onKeyInternalError" | "onKeyExpiration">;
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
export default function checkKeyStatuses(session: MediaKeySession | ICustomMediaKeySession, options: IKeyStatusesCheckingOptions, keySystem: string): {
    warning: EncryptedMediaError | undefined;
    blacklistedKeyIds: Uint8Array[];
    whitelistedKeyIds: Uint8Array[];
};
