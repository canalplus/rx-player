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
import type { IOtherErrorCode } from "./error_codes";
/**
 * @class OtherError
 * @extends Error
 */
export default class OtherError extends Error {
    readonly name: "OtherError";
    readonly type: "OTHER_ERROR";
    readonly code: IOtherErrorCode;
    fatal: boolean;
    private _originalMessage;
    /**
     * @param {string} code
     * @param {string} reason
     */
    constructor(code: IOtherErrorCode, reason: string);
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    serialize(): ISerializedOtherError;
}
/** Serializable object which allows to create an `OtherError` later. */
export interface ISerializedOtherError {
    name: "OtherError";
    code: IOtherErrorCode;
    reason: string;
}
//# sourceMappingURL=other_error.d.ts.map