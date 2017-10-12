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
import log from "../../utils/log";
import onEvent from "../../utils/rx-onEvent";
import MediaError from "../../errors/MediaError";

/**
 * Returns an observable which throws the right MediaError as soon an "error"
 * event is received through the videoElement.
 * @see MediaError
 * @returns {Observable}
 */
export default function createMediaErrorStream(
  videoElement : HTMLMediaElement
) : Observable<never> {
  return onEvent(videoElement, "error").mergeMap(() => {
    const errorCode = videoElement.error.code;
    let errorDetail;

    switch (errorCode) {
      case 1:
        errorDetail = "MEDIA_ERR_ABORTED";
        break;
      case 2:
        errorDetail = "MEDIA_ERR_NETWORK";
        break;
      case 3:
        errorDetail = "MEDIA_ERR_DECODE";
        break;
      case 4:
        errorDetail = "MEDIA_ERR_SRC_NOT_SUPPORTED";
        break;
      default:
        errorDetail = "MEDIA_ERR_UNKNOWN";
        break;
    }
    log.error(`stream: video element MEDIA_ERR(${errorDetail})`);
    throw new MediaError(errorDetail, null, true);
  });
}
