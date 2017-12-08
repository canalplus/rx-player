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
import { Subject } from "rxjs/Subject";
import { CustomError } from "../../errors";
import Manifest, {
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "../../manifest";
import createManifest from "../../manifest/factory";
import { ITransportPipelines } from "../../net";
import Pipeline, {
  IPipelineCache,
  IPipelineData,
} from "./pipeline";

/**
 * Create function allowing to easily fetch and parse the manifest from its URL.
 *
 * @example
 * ```js
 * const manifestPipeline = createManifestPipeline(transport, warning$);
 * manifestPipeline(manifestURL)
 *  .subscribe(manifest => console.log("Manifest:", manifest));
 * ```
 *
 * @param {Object} transport
 * @param {Subject} warning$
 * @param {Array.<Object>} [supplementaryTextTracks=[]]
 * @param {Array.<Object>} [supplementaryImageTrack=[]]
 * @returns {Function}
 */
export default function createManifestPipeline(
  transport : ITransportPipelines<any, any, any, any, any>,
  warning$ : Subject<Error | CustomError>,
  supplementaryTextTracks : ISupplementaryTextTrack[] = [],
  supplementaryImageTracks : ISupplementaryImageTrack[] = []
) : (url : string) => Observable<Manifest> {
  return function fetchManifest(url : string) {
    const manifest$ = Pipeline(transport.manifest)({ url });

    return manifest$
      .do(({ type, value }) => {
        if (type === "error") {
          warning$.next(value);
        }
      })
      .share()
      .filter((arg) : arg is IPipelineData|IPipelineCache =>
        arg.type === "data" || arg.type === "cache"
      )
      .map(({ value }) : Manifest => {
        return createManifest(
          value.parsed.manifest,
          supplementaryTextTracks,
          supplementaryImageTracks
        );
      });
  };
}
