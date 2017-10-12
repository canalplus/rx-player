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
import castToObservable from "../../utils/castToObservable";
import { MockMediaKeys, IMockMediaKeys } from "./MediaKeys";

/**
 * Set the MediaKeys given on the media element.
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 * @returns {Promise}
 */
function _setMediaKeys(
  elt : HTMLMediaElement,
  mediaKeys : MediaKeys|IMockMediaKeys|null
) : any {
  if (mediaKeys instanceof MockMediaKeys) {
    return mediaKeys._setVideo(elt);
  }

  if (elt.setMediaKeys) {
    return elt.setMediaKeys(mediaKeys);
  }

  if (mediaKeys === null) {
    return;
  }

  if ((elt as any).WebkitSetMediaKeys) {
    return (elt as any).WebkitSetMediaKeys(mediaKeys);
  }

  if ((elt as any).mozSetMediaKeys) {
    return (elt as any).mozSetMediaKeys(mediaKeys);
  }

  if ((elt as any).msSetMediaKeys) {
    return (elt as any).msSetMediaKeys(mediaKeys);
  }
}

/**
 * @param {HTMLMediaElement} elt
 * @param {Object} mediaKeys
 * @returns {Observable}
 */
export default (
  elt : HTMLMediaElement,
  mediaKeys : MediaKeys|IMockMediaKeys|null
) : Observable<any> => {
  return Observable.defer(() =>
    castToObservable(_setMediaKeys(elt, mediaKeys))
  );
};
