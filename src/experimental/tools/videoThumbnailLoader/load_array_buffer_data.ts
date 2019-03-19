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

import PPromise from "../../../utils/promise";

/**
 * Fetch data from URL
 * @param {string} url
 * @returns {Observable<ArrayBuffer>}
 */
export default function loadArrayBufferData(url: string): Promise<ArrayBuffer> {
  return new PPromise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = (evt: any) => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const { response } = evt.target;
        if (response instanceof ArrayBuffer) {
          resolve(response);
          return;
        }
      }
      reject("Couldn't load data.");
    };
    xhr.send();
  });
}
