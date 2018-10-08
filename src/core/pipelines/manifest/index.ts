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
  IRepresentationFilter,
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "../../../manifest";
import {
  IManifestLoaderArguments,
  IManifestResult,
  ITransportPipelines,
} from "../../../net/types";
import Pipeline, {
  IPipelineCache,
  IPipelineData,
  IPipelineOptions,
} from "../core_pipeline";

export interface IManifestTransportInfos {
  pipelines : ITransportPipelines;
  options : {
    representationFilter? : IRepresentationFilter;
    supplementaryImageTracks? : ISupplementaryImageTrack[];
    supplementaryTextTracks? : ISupplementaryTextTrack[];
  };
}

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
  transport : IManifestTransportInfos,
  pipelineOptions : IPipelineManifestOptions,
  warning$ : Subject<Error|ICustomError>
) : (url : string) => Observable<Manifest> {
  return function fetchManifest(url : string) {
    const manifest$ = Pipeline<
      IManifestLoaderArguments, Document|string, IManifestResult
    >(transport.pipelines.manifest, pipelineOptions)({ url });

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
        return new Manifest(value.parsed.manifest, warning$, transport.options);
      }),
      share()
    );
  };
}
