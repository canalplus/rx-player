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
import Manifest from "../../manifest";
import log from "../../utils/log";
import EVENTS, { IManifestUpdateEvent } from "./stream_events";

/**
 * Re-fetch the manifest and merge it with the previous version.
 *
 * /!\ Mutates the given manifest
 * @param {Object} manifest
 * @returns {Observable}
 */
export default function refreshManifest(
    manifestPipeline : (url : string) => Observable<Manifest>,
    currentManifest : Manifest
  ) : Observable<IManifestUpdateEvent> {
    const refreshURL = currentManifest.getUrl();
    if (!refreshURL) {
      log.warn("Cannot refresh the manifest: no url");
      return Observable.empty();
    }

    return manifestPipeline(refreshURL)
      .do((parsed) => {
        currentManifest.update(parsed);
      })
      .share() // share the previous side effect
      .mapTo(EVENTS.manifestUpdate(currentManifest));
  }
