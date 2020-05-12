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
  concat as observableConcat,
  EMPTY,
  Observable,
  of as observableOf,
} from "rxjs";
import Manifest from "../../manifest";
import {
  IManifestParserEvent,
  IManifestParserWarningEvent,
} from "../../transports";

/**
 * As a Manifest instance is obtained, emit the right `warning` events
 * (according to the Manifest's `parsingErrors` property`) followed by the right
 * `parsed` event, as expected from a Manifest parser.
 * @param {Manifest} manifest
 * @param {string|undefined} url
 * @returns {Observable}
 */
export default function returnParsedManifest(
  manifest : Manifest,
  url? : string
) : Observable<IManifestParserEvent> {
  let warningEvts$ : Observable<IManifestParserWarningEvent> = EMPTY;
  for (let i = 0; i < manifest.parsingErrors.length; i++) {
    const warning = manifest.parsingErrors[i];
    warningEvts$ = observableConcat(warningEvts$,
                                    observableOf({ type: "warning" as const,
                                                   value: warning }));
  }
  return observableConcat(warningEvts$,
                          observableOf({ type: "parsed" as const,
                                         value: { manifest, url } }));
}
