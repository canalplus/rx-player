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
} from "rxjs";
import { tap } from "rxjs/operators";
import log from "../../log";
import Manifest from "../../manifest";
import isNonEmptyString from "../../utils/is_non_empty_string";
import {
  IFetchManifestResult,
} from "../pipelines";

export type IManifestFetcher =
    (manifestURL? : string, externalClockOffset?: number) =>
      Observable<IFetchManifestResult>;

/**
 * Refresh the manifest on subscription.
 * @returns {Observable}
 */
export default function refreshManifest(
  manifest : Manifest,
  fetchManifest : IManifestFetcher
) : Observable<IFetchManifestResult> {
  const refreshURL = manifest.getUrl();
  if (!isNonEmptyString(refreshURL)) {
    log.warn("Init: Cannot refresh the manifest: no url");
    return EMPTY;
  }

  const externalClockOffset = manifest.getClockOffset();
  return fetchManifest(refreshURL, externalClockOffset)
    .pipe(tap(({ manifest: newManifest }) => {
            manifest.update(newManifest);
          }));
}
