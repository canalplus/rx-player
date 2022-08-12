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
  fromEvent as observableFromEvent,
  mergeMap,
  Observable,
} from "rxjs";
import { MediaError } from "../../../common/errors";
import isNullOrUndefined from "../../../common/utils/is_null_or_undefined";

/**
 * Returns an observable which throws the right MediaError as soon an "error"
 * event is received through the media element.
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
export default function throwOnMediaError(
  mediaElement : HTMLMediaElement
) : Observable<never> {
  return observableFromEvent(mediaElement, "error")
    .pipe(mergeMap(() => {
      const mediaError = mediaElement.error;
      let errorCode : number | undefined;
      let errorMessage : string | undefined;
      if (!isNullOrUndefined(mediaError)) {
        errorCode = mediaError.code;
        errorMessage = mediaError.message;
      }

      switch (errorCode) {
        case 1:
          errorMessage = errorMessage ??
            "The fetching of the associated resource was aborted by the user's request.";
          throw new MediaError("MEDIA_ERR_ABORTED", errorMessage);
        case 2:
          errorMessage = errorMessage ??
            "A network error occurred which prevented the media from being " +
            "successfully fetched";
          throw new MediaError("MEDIA_ERR_NETWORK", errorMessage);
        case 3:
          errorMessage = errorMessage ??
            "An error occurred while trying to decode the media resource";
          throw new MediaError("MEDIA_ERR_DECODE", errorMessage);
        case 4:
          errorMessage = errorMessage ??
            "The media resource has been found to be unsuitable.";
          throw new MediaError("MEDIA_ERR_SRC_NOT_SUPPORTED", errorMessage);
        default:
          errorMessage = errorMessage ??
            "The HTMLMediaElement errored due to an unknown reason.";
          throw new MediaError("MEDIA_ERR_UNKNOWN", errorMessage);
      }
    }));
}
