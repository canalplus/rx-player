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
  mergeMap,
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
  IManifestParserArguments,
  IManifestResult,
  ITransportPipelines,
} from "../../../net/types";
import createLoader, {
  IPipelineLoaderOptions,
  IPipelineLoaderResponse,
} from "../create_loader";
import createParser from "../create_parser";

export interface IManifestTransportInfos {
  pipelines : ITransportPipelines;
  options : {
    representationFilter? : IRepresentationFilter;
    supplementaryImageTracks? : ISupplementaryImageTrack[];
    supplementaryTextTracks? : ISupplementaryTextTrack[];
  };
}

type IPipelineManifestOptions =
  IPipelineLoaderOptions<IManifestLoaderArguments, Document|string>;

/**
 * Create function allowing to easily fetch and parse the manifest from its URL.
 *
 * @example
 * ```js
 * const manifestPipeline = createManifestPipeline(transport, options, warning$);
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
  const loader = createLoader<
  IManifestLoaderArguments, Document|string
  >(transport.pipelines.manifest, pipelineOptions);

  const parser = createParser<
  IManifestParserArguments<Document|string>,
  IManifestResult
  >(transport.pipelines.manifest);

  /**
   * Fetch and parse the manifest corresponding to the URL given.
   * @param {string} url - URL of the manifest
   * @returns {Observable}
   */
  return function fetchManifest(url : string) : Observable<Manifest> {
    return loader({ url }).pipe(

      tap((arg) => {
        if (arg.type === "error") {
          warning$.next(arg.value);
        }
      }),

      filter((arg) : arg is IPipelineLoaderResponse<Document|string> =>
        arg.type === "response"
      ),

      mergeMap(({ value }) => parser({ response: value, url })),

      map(({ manifest }) : Manifest => {
        return new Manifest(manifest, warning$, transport.options);
      }),
      share()
    );
  };
}
