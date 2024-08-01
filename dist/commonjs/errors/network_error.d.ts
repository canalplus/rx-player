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
import type { RequestError, ISerializedRequestError } from "../utils/request";
import type { INetworkErrorCode, INetworkErrorType } from "./error_codes";
/**
 * Error linked to network interactions (requests).
 *
 * @class NetworkError
 * @extends Error
 */
export default class NetworkError extends Error {
    readonly name: "NetworkError";
    readonly type: "NETWORK_ERROR";
    readonly code: INetworkErrorCode;
    readonly url: string;
    readonly status: number;
    readonly errorType: INetworkErrorType;
    fatal: boolean;
    private _baseError;
    /**
     * @param {string} code
     * @param {Error} baseError
     */
    constructor(code: INetworkErrorCode, baseError: RequestError);
    /**
     * Returns true if the NetworkError is due to the given http error code
     * @param {number} httpErrorCode
     * @returns {Boolean}
     */
    isHttpError(httpErrorCode: number): boolean;
    /**
     * If that error has to be communicated through another thread, this method
     * allows to obtain its main defining properties in an Object so the Error can
     * be reconstructed in the other thread.
     * @returns {Object}
     */
    serialize(): ISerializedNetworkError;
}
/** Serializable object which allows to create a `NetworkError` later. */
export interface ISerializedNetworkError {
    name: "NetworkError";
    code: INetworkErrorCode;
    baseError: ISerializedRequestError;
}
//# sourceMappingURL=network_error.d.ts.map