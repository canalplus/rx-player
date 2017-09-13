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

import { Observable } from "rxjs/Observable";
import castToObservable from "../../utils/castToObservable.js";
import { MockMediaKeys } from "./MediaKeys.js";

/**
 * Set the MediaKeys given on the media element.
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 * @returns {Promise}
 */
function _setMediaKeys(elt, mediaKeys) {
  if (mediaKeys instanceof MockMediaKeys) {
    return mediaKeys._setVideo(elt);
  }

  if (elt.setMediaKeys) {
    return elt.setMediaKeys(mediaKeys);
  }

  if (mediaKeys === null) {
    return;
  }

  if (elt.WebkitSetMediaKeys) {
    return elt.WebkitSetMediaKeys(mediaKeys);
  }

  if (elt.mozSetMediaKeys) {
    return elt.mozSetMediaKeys(mediaKeys);
  }

  if (elt.msSetMediaKeys) {
    return elt.msSetMediaKeys(mediaKeys);
  }
}

/**
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 * @returns {Observable}
 */
export default (elt, mediaKeys) => {
  return Observable.defer(() =>
    castToObservable(_setMediaKeys(elt, mediaKeys))
  );
};
