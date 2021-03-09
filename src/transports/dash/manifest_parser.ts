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

import PPromise from "pinkie";
import Manifest from "../../manifest";
import dashManifestParser, {
  IMPDParserResponse,
} from "../../parsers/manifest/dash";
import objectAssign from "../../utils/object_assign";
import request from "../../utils/request";
import TaskCanceller from "../../utils/task_canceller";
import {
  IManifestParserOptions,
  IManifestParserRequestScheduler,
  IManifestParserResult,
  IRequestedData,
  ITransportOptions,
} from "../types";

/**
 * Request external "xlink" ressource from a MPD.
 * @param {string} xlinkURL
 * @returns {Observable}
 */
function requestStringResource(
  url : string
) : Promise< IRequestedData< string > > {
  return request({ url,
                   responseType: "text" });
}

export default function generateManifestParser(
  options : ITransportOptions
) : (
    manifestData : IRequestedData<unknown>,
    parserOptions : IManifestParserOptions,
    onWarnings : (warnings : Error[]) => void,
    scheduleRequest : IManifestParserRequestScheduler
  ) => IManifestParserResult | Promise<IManifestParserResult>
{
  const { aggressiveMode,
          referenceDateTime } = options;
  const serverTimeOffset = options.serverSyncInfos !== undefined ?
    options.serverSyncInfos.serverTimestamp - options.serverSyncInfos.clientTime :
    undefined;
  return function manifestParser(
    manifestData : IRequestedData<unknown>,
    parserOptions : IManifestParserOptions,
    onWarnings : (warnings : Error[]) => void,
    scheduleRequest : IManifestParserRequestScheduler
  ) : IManifestParserResult | Promise<IManifestParserResult> {
    const argClockOffset = parserOptions.externalClockOffset;
    const url = manifestData.url ?? parserOptions.originalUrl;
    const data = typeof manifestData.responseData === "string" ?
                   new DOMParser().parseFromString(manifestData.responseData,
                                                   "text/xml") :
                   // TODO find a way to check if Document?
                   manifestData.responseData as Document;

    const externalClockOffset = serverTimeOffset ?? argClockOffset;
    const unsafelyBaseOnPreviousManifest = parserOptions.unsafeMode ?
      parserOptions.previousManifest :
      null;
    const parsedManifest = dashManifestParser(data, { aggressiveMode:
                                                        aggressiveMode === true,
                                                      unsafelyBaseOnPreviousManifest,
                                                      url,
                                                      referenceDateTime,
                                                      externalClockOffset });
    return loadExternalResources(parsedManifest);

    function loadExternalResources(
      parserResponse : IMPDParserResponse
    ) : IManifestParserResult | Promise<IManifestParserResult> {
      if (parserResponse.type === "done") {
        if (parserResponse.value.warnings.length > 0) {
          onWarnings(parserResponse.value.warnings);
        }
        const manifest = new Manifest(parserResponse.value.parsed, options);
        return { manifest, url };
      }

      const { ressources, continue: continueParsing } = parserResponse.value;

      const externalResources = ressources
        .map(resource => {
          const canceller = new TaskCanceller();
          return scheduleRequest(() => requestStringResource(resource), canceller);
        });

      return PPromise.all(externalResources).then(loadedResources => {
        const resources : Array<IRequestedData<string>> = [];
        for (let i = 0; i < loadedResources.length; i++) {
          const resource = loadedResources[i];
          if (typeof resource.responseData !== "string") {
            throw new Error("External DASH resources should only be strings");
          }
          // Normally not needed but TypeScript is just dumb here
          resources.push(objectAssign(resource,
                                      { responseData: resource.responseData }));
        }
        return loadExternalResources(continueParsing(resources));
      });
    }
  };
}
