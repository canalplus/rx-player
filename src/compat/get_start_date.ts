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
 * Calculating a live-offseted media position necessitate to obtain first an
 * offset, and then adding that offset to the wanted position.
 *
 * That offset is in most case present inside the Manifest file, yet in cases
 * without it or without a Manifest, such as the "directfile" mode, the RxPlayer
 * won't know that offset.
 *
 * Thankfully Safari declares a `getStartDate` method allowing to obtain that
 * offset when available. This logic is mainly useful when playing HLS contents
 * in directfile mode on Safari.
 * @param {HTMLMediaElement} mediaElement
 * @returns {number|undefined}
 */
export default function getStartDate(
  mediaElement : HTMLMediaElement
) : number | undefined {
  const _mediaElement : HTMLMediaElement & {
    getStartDate? : () => number | null | undefined;
  } = mediaElement;
  if (typeof _mediaElement.getStartDate === "function") {
    const startDate = _mediaElement.getStartDate();
    if (typeof startDate === "number" && !isNaN(startDate)) {
      return startDate;
    }
  }
}
