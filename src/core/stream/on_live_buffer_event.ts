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
  EMPTY,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  mapTo,
  share,
  tap,
} from "rxjs/operators";
import log from "../../log";
import Manifest from "../../manifest";
import { IPeriodBufferManagerEvent } from "../buffer";
import SourceBufferManager from "../source_buffers";
import EVENTS from "./events_generators";
import { IManifestUpdateEvent } from "./types";

/**
 * Re-fetch the manifest and merge it with the previous version.
 *
 * /!\ Mutates the given manifest
 * @param {Function} manifestPipeline - download the manifest
 * @param {Object} currentManifest
 * @returns {Observable}
 */
function refreshManifest(
  manifestPipeline : (url : string) => Observable<Manifest>,
  currentManifest : Manifest
) : Observable<IManifestUpdateEvent> {
  const refreshURL = currentManifest.getUrl();
  if (!refreshURL) {
    log.warn("Stream: Cannot refresh the manifest: no url");
    return EMPTY;
  }

  return manifestPipeline(refreshURL).pipe(
    tap((parsed) => {
      currentManifest.update(parsed);
    }),
    share(), // share the previous side effect
    mapTo(EVENTS.manifestUpdate(currentManifest))
  );
}

export type ILiveEventsHandlerEvent =
  IManifestUpdateEvent |
  IPeriodBufferManagerEvent;

/**
 * Create handler for Buffer events happening only in live contexts.
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} manifest
 * @param {Function} fetchManifest
 * @returns {Function}
 */
export default function liveEventsHandler(
  mediaElement : HTMLMediaElement,
  manifest : Manifest,
  fetchManifest : (url : string) => Observable<Manifest>
) : (message : IPeriodBufferManagerEvent) => Observable<ILiveEventsHandlerEvent> {
  return function handleLiveEvents(message) {
    switch (message.type) {
      case "discontinuity-encountered":
        if (SourceBufferManager.isNative(message.value.bufferType)) {
          log.warn("Stream: Explicit discontinuity seek", message.value.nextTime);
          mediaElement.currentTime = message.value.nextTime;
        }
        break;

      case "needs-manifest-refresh":
        log.debug("Stream: Needs manifest to be refreshed");

        // out-of-index messages require a complete reloading of the
        // manifest to refresh the current index
        return refreshManifest(fetchManifest, manifest);
    }
    return observableOf(message);
  };

}
