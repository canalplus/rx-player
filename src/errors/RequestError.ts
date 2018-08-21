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
 * Errors linked to the XHR implentation done in the RxPlayer.
 *
 * @class RequestError
 * @extends Error
 */
export default class RequestError extends Error {
  public readonly name : "RequestError";
  public readonly type : string;
  public readonly message : string;
  public readonly xhr : XMLHttpRequest;
  public readonly url : string;
  public readonly status : number;

  /**
   * @param {XMLHttpRequest} xhr
   * @param {string} url
   * @param {string} type
   */
  constructor(xhr : XMLHttpRequest, url : string, type : string) {
    super();
    // @see https://stackoverflow.com/questions/41102060/typescript-extending-error-class
    Object.setPrototypeOf(this, RequestError.prototype);

    this.name = "RequestError";
    this.url = url;
    this.xhr = xhr;
    this.status = xhr.status;
    this.type = type;
    this.message = type;
  }
}
