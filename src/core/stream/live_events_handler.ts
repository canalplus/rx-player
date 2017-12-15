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

import Manifest from "../../manifest";

import {
  IManifestUpdateEvent,
  StreamEvent,
} from "./types";

/**
 * Create handler for Buffer events happening only in live contexts.
 * @param {HTMLMediaElement} videoElement
 * @param {Object} manifest
 * @param {Function} refreshManifest
 * @returns {Function}
 */
export default function liveEventsHandler(
  videoElement : HTMLMediaElement,
  manifest : Manifest,
  refreshManifest : (manifest : Manifest) => Observable<IManifestUpdateEvent>
) : (message : StreamEvent) => Observable<StreamEvent> {
  /**
   * Handle individual stream events
   * @param {string} message
   * @returns {Observable}
   */
  return function handleLiveEvents(message) {
    switch (message.type) {
      case "discontinuity-encountered":
        log.warn("explicit discontinuity seek", message.value.nextTime);
        videoElement.currentTime = message.value.nextTime;
        break;

      case "needs-manifest-refresh":
        // out-of-index messages require a complete reloading of the
        // manifest to refresh the current index
        log.info("out of index");
        return refreshManifest(manifest);
    }
    return Observable.of(message);
  };

}
