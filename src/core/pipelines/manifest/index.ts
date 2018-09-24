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
  Observable,
  Subject,
} from "rxjs";
import {
  filter,
  map,
  share,
  tap,
} from "rxjs/operators";
import { ICustomError } from "../../../errors";
import Manifest, {
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "../../../manifest";
import createManifest from "../../../manifest/factory";
import {
  IManifestLoaderArguments,
  IManifestResult,
  ITransportPipelineInfos,
} from "../../../net/types";
import Pipeline, {
  IPipelineCache,
  IPipelineData,
  IPipelineOptions,
} from "../core_pipeline";

type IPipelineManifestResult =
  IPipelineData<IManifestResult> |
  IPipelineCache<IManifestResult>;

type IPipelineManifestOptions =
  IPipelineOptions<IManifestLoaderArguments, Document|string>;

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
 * @param {Array.<Object>|undefined} supplementaryTextTracks
 * @param {Array.<Object>|undefined} supplementaryImageTrack
 * @returns {Function}
 */
export default function createManifestPipeline(
  transportPipelineInfos : ITransportPipelineInfos,
  pipelineOptions : IPipelineManifestOptions,
  warning$ : Subject<Error|ICustomError>,
  supplementaryTextTracks : ISupplementaryTextTrack[] = [],
  supplementaryImageTracks : ISupplementaryImageTrack[] = []
) : (url : string) => Observable<Manifest> {
  return function fetchManifest(url : string) {
    const {
      transportPipelines,
      customRepresentationFilter,
    } = transportPipelineInfos;
    const manifest$ = Pipeline<
      IManifestLoaderArguments, Document|string, IManifestResult
    >(transportPipelines.manifest, pipelineOptions)({ url });

    return manifest$.pipe(

      tap((arg) => {
        if (arg.type === "error") {
          warning$.next(arg.value);
        }
      }),

      filter((arg) : arg is IPipelineManifestResult =>
        arg.type === "data" || arg.type === "cache"
      ),

      map(({ value }) : Manifest => {
        return createManifest(
          value.parsed.manifest,
          supplementaryTextTracks,
          supplementaryImageTracks,
          warning$,
          customRepresentationFilter
        );
      }),
      share()
    );
  };
}
