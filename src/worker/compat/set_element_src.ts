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

import {
  Observable,
  Observer,
} from "rxjs";
import log from "../log";
import clearElementSrc from "./clear_element_src";

/**
 * Set an URL to the element's src.
 * Emit ``undefined`` when done.
 * Unlink src on unsubscription.
 *
 * @param {HTMLMediaElement} mediaElement
 * @param {string} url
 * @returns {Observable}
 */
export default function setElementSrc$(
  mediaElement : HTMLMediaElement,
  url : string
) : Observable<void> {
  return new Observable((observer : Observer<void>) => {
    log.info("Setting URL to HTMLMediaElement", url);

    mediaElement.src = url;

    observer.next(undefined);
    return () => {
      clearElementSrc(mediaElement);
    };
  });
}
