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
  public readonly name: "RequestError";
  public readonly type: IRequestErrorType;
  public readonly message: string;
  public readonly url: string;
  public readonly status: number;

  /**
   * @param {string} url
   * @param {number} status
   * @param {string} type
   */
  constructor(url: string, status: number, type: IRequestErrorType) {
    let message: string;
    switch (type) {
      case "TIMEOUT":
        message = "The request timed out";
        break;
      case "ERROR_EVENT":
        message = "An error prevented the request to be performed successfully";
        break;
      case "PARSE_ERROR":
        message = "An error happened while formatting the response data";
        break;
      case "ERROR_HTTP_CODE":
        message =
          "An HTTP status code indicating failure was received: " + String(status);
        break;
    }

    super(message);

    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, RequestError.prototype);

    this.name = "RequestError";
    this.url = url;
    this.status = status;
    this.type = type;
    this.message = message;
  }

  public serialize(): ISerializedRequestError {
    return { url: this.url, status: this.status, type: this.type };
  }
}

/** Serializable object which allows to create a `RequestError` later. */
export interface ISerializedRequestError {
  url: string;
  status: number;
  type: IRequestErrorType;
}

export type IRequestErrorType =
  | "TIMEOUT"
  | "ERROR_EVENT"
  | "PARSE_ERROR"
  | "ERROR_HTTP_CODE";

const RequestErrorTypes: Record<IRequestErrorType, IRequestErrorType> = {
  TIMEOUT: "TIMEOUT",
  ERROR_EVENT: "ERROR_EVENT",
  ERROR_HTTP_CODE: "ERROR_HTTP_CODE",
  PARSE_ERROR: "PARSE_ERROR",
};

export { RequestErrorTypes };
