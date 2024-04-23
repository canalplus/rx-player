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
/**
 * Internal Error used when doing requests through fetch / XHRs.
 *
 * It is not part of the API, as such it is only a temporary error which is
 * later converted to another Error instance (e.g. NETWORK_ERROR).
 *
 * @class RequestError
 * @extends Error
 */
export default class RequestError extends Error {
    readonly name: "RequestError";
    readonly type: IRequestErrorType;
    readonly message: string;
    readonly url: string;
    readonly status: number;
    /**
     * @param {string} url
     * @param {number} status
     * @param {string} type
     */
    constructor(url: string, status: number, type: IRequestErrorType);
    serialize(): ISerializedRequestError;
}
/** Serializable object which allows to create a `RequestError` later. */
export interface ISerializedRequestError {
    url: string;
    status: number;
    type: IRequestErrorType;
}
export type IRequestErrorType = "TIMEOUT" | "ERROR_EVENT" | "PARSE_ERROR" | "ERROR_HTTP_CODE";
declare const RequestErrorTypes: Record<IRequestErrorType, IRequestErrorType>;
export { RequestErrorTypes };
