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
import features from "../../features";
import log from "../../log";
import Manifest from "../../manifest";
import { IDashParserResponse } from "../../parsers/manifest/dash/parsers_types";
import {
  IMPDParserInstance,
} from "../../parsers/manifest/dash/wasm-parser/ts/dash-wasm-parser";
import noop from "../../utils/noop";
import objectAssign from "../../utils/object_assign";
import request, {
  fetchRequest,
} from "../../utils/request";
import { CancellationSignal } from "../../utils/task_canceller";
import {
  IManifestParserOptions,
  IManifestParserRequestScheduler,
  IManifestParserResult,
  IManifestStreamingParser,
  IRequestedData,
  ITransportOptions,
} from "../types";

export default function generateManifestStreamingParser(
  url : string | null,
  options : ITransportOptions
) : IManifestStreamingParser | null
{
  const parsers = features.dashParsers;
  if (url === null ||
      parsers.wasm === null ||
      parsers.wasm.status === "uninitialized" ||
      parsers.wasm.status === "failure")
  {
    return null;
  }
  const dashWasmParser = parsers.wasm;
  const { aggressiveMode,
          referenceDateTime } = options;
  const serverTimeOffset = options.serverSyncInfos !== undefined ?
    options.serverSyncInfos.serverTimestamp - options.serverSyncInfos.clientTime :
    undefined;
  return function manifestStreamingParser(
    parserOptions : IManifestParserOptions,
    onParserWarnings : (warnings : Error[]) => void,
    scheduleRequest : IManifestParserRequestScheduler,
    cancelSignal : CancellationSignal
  ) : { requestPromise : Promise<IRequestedData<null>>;
        parsingPromise : Promise<IManifestParserResult>; }
  {
    let resolveParsing : (args : IManifestParserResult) => void = noop;
    let rejectParsing : (err : Error) => void = noop;
    const parsingPromise = new PPromise<IManifestParserResult>((res, rej) => {
      resolveParsing = res;
      rejectParsing = rej;
    });
    let parserInstanceProm : Promise<IMPDParserInstance>;
    if (dashWasmParser.status === "initialized") {
      log.debug("DASH: Creating WASM MPD Parser.");
      parserInstanceProm = PPromise.resolve(dashWasmParser.createMpdParser());
    } else {
      log.debug("DASH: Awaiting WASM initialization before parsing the MPD.");
      const initProm = dashWasmParser.waitForInitialization()
        .catch(() => { /* ignore errors, we will check the status later */ });

      parserInstanceProm = initProm.then(() => {
        if (dashWasmParser === null || dashWasmParser.status !== "initialized") {
          log.warn("DASH: WASM MPD parser initialization failed. " +
            "Running JS parser instead");
          // XXX TODO
          throw new Error("TOTO");
          // return runDefaultJsParser();
        }
        log.debug("DASH: Creating WASM MPD Parser.");
        return dashWasmParser.createMpdParser();
      });
    }
    const requestPromise = fetchRequest({
      url,
      onData(data) {
        parserInstanceProm
          .then((parserInstance) => {
            const now = performance.now();
            parserInstance.parseNextChunk(data.chunk);
            console.error("TIME: ", performance.now() - now);
          })
          .catch((err) => {
            rejectParsing(err);
            throw err;
          });
      },
      cancelSignal,
    }).then((response) : IRequestedData<null> => {
      const argClockOffset = parserOptions.externalClockOffset;
      // const url = manifestData.url ?? parserOptions.originalUrl;

      const optAggressiveMode = aggressiveMode === true;
      const externalClockOffset = serverTimeOffset ?? argClockOffset;
      const unsafelyBaseOnPreviousManifest = parserOptions.unsafeMode ?
        parserOptions.previousManifest :
        null;
      const dashParserOpts = { aggressiveMode: optAggressiveMode,
                               unsafelyBaseOnPreviousManifest,
                               url,
                               referenceDateTime,
                               externalClockOffset };
      parserInstanceProm
        .then((parserInstance) => {
          const now = performance.now();
          const parsed = parserInstance.end(dashParserOpts);
          console.error("END: ", performance.now() - now);
          return processMpdParserResponse(parsed);
        })
        .then((result) => { resolveParsing(result); })
        .catch((err) => {
          rejectParsing(err);
          throw err;
        });
      return { responseData: null,
               duration: response.duration,
               url: response.url,
               sendingTime: response.sendingTime,
               receivedTime: response.receivedTime,
               size: response.size };
    });

    return { requestPromise, parsingPromise };

//     /**
//      * Parse the MPD through the default JS-written parser (as opposed to the
//      * WebAssembly one).
//      * If it is not defined, throws.
//      * @returns {Observable}
//      */
//     function runDefaultJsParser() {
//       if (parsers.js === null) {
//         throw new Error("No MPD parser is imported");
//       }
//       const manifestDoc = getManifestAsDocument(responseData);
//       const parsedManifest = parsers.js(manifestDoc, dashParserOpts);
//       return processMpdParserResponse(parsedManifest);
//     }

    /**
     * Process return of one of the MPD parser.
     * If it asks for a resource, load it then continue.
     * @param {Object} parserResponse - Response returned from a MPD parser.
     * @returns {Observable}
     */
    function processMpdParserResponse(
      parserResponse : IDashParserResponse<string> | IDashParserResponse<ArrayBuffer>
    ) : IManifestParserResult | Promise<IManifestParserResult> {
      if (parserResponse.type === "done") {
        if (parserResponse.value.warnings.length > 0) {
          onParserWarnings(parserResponse.value.warnings);
        }
        if (cancelSignal.isCancelled) {
          return PPromise.reject(cancelSignal.cancellationError);
        }
        const manifest = new Manifest(parserResponse.value.parsed, options);
        return { manifest };
      }

      const { value } = parserResponse;

      const externalResources = value.urls.map(resourceUrl => {
        return scheduleRequest(() => {
          const req = value.format === "string" ?
            request({ url: resourceUrl,
                      responseType: "text" as const,
                      cancelSignal }) :
            request({ url: resourceUrl,
                      responseType: "arraybuffer" as const,
                      cancelSignal });
          return req;
        });
      });

      return PPromise.all(externalResources).then(loadedResources => {
        if (value.format === "string") {
          const resources = loadedResources.map(resource => {
            if (typeof resource.responseData !== "string") {
              throw new Error("External DASH resources should have been a string");
            }
            // Normally not needed but TypeScript is just dumb here
            return objectAssign(resource, { responseData: resource.responseData });
          });
          return processMpdParserResponse(value.continue(resources));
        } else {
          const resources = loadedResources.map(resource => {
            if (!(resource.responseData instanceof ArrayBuffer)) {
              throw new Error("External DASH resources should have been ArrayBuffers");
            }
            // Normally not needed but TypeScript is just dumb here
            return objectAssign(resource, { responseData: resource.responseData });
          });
          return processMpdParserResponse(value.continue(resources));
        }
      });
    }
  };
}
