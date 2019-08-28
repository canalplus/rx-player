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
  combineLatest as observableCombineLatest,
  Observable,
  of as observableOf,
} from "rxjs";
import {
  filter,
  map,
  mergeMap,
} from "rxjs/operators";
import Manifest from "../../manifest";
import dashManifestParser, {
  IMPDParserResponse,
} from "../../parsers/manifest/dash";
import request from "../../utils/request";
import {
  ILoaderDataLoadedValue,
  IManifestParserArguments,
  IManifestParserObservable,
  ITransportOptions,
} from "../types";

/**
 * Request external "xlink" ressource from a MPD.
 * @param {string} xlinkURL
 * @returns {Observable}
 */
function requestStringResource(
  url : string
) : Observable< ILoaderDataLoadedValue< string > > {
  return request({ url,
                   responseType: "text" })
  .pipe(
    filter((e) => e.type === "data-loaded"),
    map((e) => e.value)
  );
}

export default function generateManifestParser(
  options : ITransportOptions
) : (x : IManifestParserArguments) => IManifestParserObservable {
  const { lowLatencyMode, referenceDateTime } = options;
  return function manifestParser(
    { response, url: loaderURL, scheduleRequest, externalClockOffset } :
    IManifestParserArguments
  ) : IManifestParserObservable {
    const url = response.url == null ? loaderURL :
                                       response.url;
    const data = typeof response.responseData === "string" ?
                   new DOMParser().parseFromString(response.responseData,
                                                   "text/xml") :
                   // TODO find a way to check if Document?
                   response.responseData as Document;

    const parsedManifest = dashManifestParser(data, { lowLatencyMode,
                                                      url,
                                                      referenceDateTime,
                                                      externalClockOffset });
    return loadExternalResources(parsedManifest);

    function loadExternalResources(
      parserResponse : IMPDParserResponse
    ) : IManifestParserObservable {
      if (parserResponse.type === "done") {
        const manifest = new Manifest(parserResponse.value, options);
        return observableOf({ manifest, url });
      }

      const { ressources, continue: continueParsing } = parserResponse.value;

      const externalResources$ = ressources
        .map(resource => scheduleRequest(() => requestStringResource(resource)));

      return observableCombineLatest(externalResources$)
        .pipe(mergeMap(loadedResources => {
          const resourceData = loadedResources.map(r => {
            if (typeof r.responseData !== "string") {
              throw new Error("External DASH resources should only be strings");
            }
            return r.responseData;
          });
          return loadExternalResources(continueParsing(resourceData));
        }));
    }
  };
}
