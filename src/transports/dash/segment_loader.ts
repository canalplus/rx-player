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
  Observer,
  of as observableOf,
} from "rxjs";
import {
  mergeMap,
  scan,
} from "rxjs/operators";
import log from "../../log";
import { concat } from "../../utils/byte_parsing";
import xhrRequest from "../../utils/request";
import fetchRequest, {
  IDataChunk,
  IDataComplete,
} from "../../utils/request/fetch";
import {
  CustomSegmentLoader,
  ILoaderChunkedDataEvent,
  ILoaderRegularDataEvent,
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
} from "../types";
import byteRange from "../utils/byte_range";
import extractCompleteChunks from "./extract_complete_chunks";

interface IRegularSegmentLoaderArguments extends ISegmentLoaderArguments {
  url : string;
}

type ICustomSegmentLoaderObserver =
  Observer<ILoaderRegularDataEvent<Uint8Array|ArrayBuffer>>;

/**
 * Segment loader triggered if there was no custom-defined one in the API.
 * @param {Object} opt
 * @returns {Observable}
 */
function regularSegmentLoader(
  { url, segment } : IRegularSegmentLoaderArguments
) : ISegmentLoaderObservable<ArrayBuffer> {
  const headers = segment.range != null ? { Range: byteRange(segment.range) } :
                                          undefined;

  // Items emitted after processing fetch events
  interface IScannedChunk {
    event: IDataChunk | IDataComplete | null; // Event received from fetch
    completeChunks: Uint8Array[]; // Complete chunks received on the event
    partialChunk: Uint8Array | null; // Remaining incomplete chunk received on the event
  }

  if (segment.isInit) {
    return xhrRequest({ url,
                        headers,
                        responseType: "arraybuffer",
                        sendProgressEvents: true });
  }

  return fetchRequest({ url, headers })
    .pipe(

      scan<IDataChunk | IDataComplete, IScannedChunk>((acc, evt) => {
        if (evt.type === "data-complete") {
          if (acc.partialChunk != null) {
            log.warn("DASH Pipelines: remaining chunk does not belong to any segment");
          }
          return { event: evt, completeChunks: [], partialChunk: null };
        }

        const data = new Uint8Array(evt.value.chunk);
        const concatenated = acc.partialChunk != null ? concat(acc.partialChunk,
                                                               data) :
                                                        data;
        const [ completeChunks,
                partialChunk ] = extractCompleteChunks(concatenated);
        return { event: evt, completeChunks, partialChunk };
      }, { event: null, completeChunks: [], partialChunk: null }),

      mergeMap((evt : IScannedChunk) => {
        const emitted : ILoaderChunkedDataEvent[] = [];
        for (let i = 0; i < evt.completeChunks.length; i++) {
          emitted.push({ type: "data-chunk",
                         value: { responseData: evt.completeChunks[i] } });
        }
        const { event } = evt;
        if (event != null && event.type === "data-chunk") {
          const { value } = event;
          emitted.push({ type: "progress",
                         value: { duration: value.duration,
                                  size: value.size,
                                  url: value.url,
                                  totalSize: value.totalSize } });
        } else if (event != null && event.type === "data-complete") {
          const { value } = event;
          emitted.push({ type: "data-chunk-complete",
                         value: { duration: value.duration,
                                  receivedTime: value.receivedTime,
                                  sendingTime: value.sendingTime,
                                  size: value.size,
                                  status: value.status,
                                  url: value.url } });
        }
        return observableOf(...emitted);
      }));
}

/**
 * Generate a segment loader for the application
 * @param {Function} [customSegmentLoader]
 * @returns {Function}
 */
const segmentPreLoader = (customSegmentLoader? : CustomSegmentLoader) => ({
  adaptation,
  manifest,
  period,
  representation,
  segment,
} : ISegmentLoaderArguments)
  : ISegmentLoaderObservable< Uint8Array | ArrayBuffer | null> => {
  const { mediaURL } = segment;

  if (mediaURL == null) {
    return observableOf({ type: "data-created" as const,
                          value: { responseData: null } });
  }

  const args = { adaptation,
                 manifest,
                 period,
                 representation,
                 segment,
                 transport: "dash",
                 url: mediaURL };

  if (!customSegmentLoader) {
    return regularSegmentLoader(args);
  }

  return new Observable((obs : ICustomSegmentLoaderObserver) => {
    let hasFinished = false;
    let hasFallbacked = false;

    /**
     * Callback triggered when the custom segment loader has a response.
     * @param {Object} args
     */
    const resolve = (_args : {
      data : ArrayBuffer|Uint8Array;
      size : number;
      duration : number;
    }) => {
      if (!hasFallbacked) {
        hasFinished = true;
        obs.next({ type: "data-loaded" as const,
                   value: { responseData: _args.data,
                            size: _args.size,
                            duration: _args.duration } });
        obs.complete();
      }
    };

    /**
     * Callback triggered when the custom segment loader fails
     * @param {*} err - The corresponding error encountered
     */
    const reject = (err = {}) => {
      if (!hasFallbacked) {
        hasFinished = true;
        obs.error(err);
      }
    };

    /**
     * Callback triggered when the custom segment loader wants to fallback to
     * the "regular" implementation
     */
    const fallback = () => {
      hasFallbacked = true;

      // HACK What is TypeScript/RxJS doing here??????
      /* tslint:disable deprecation */
      // @ts-ignore
      regularSegmentLoader(args).subscribe(obs);
      /* tslint:enable deprecation */
    };

    const callbacks = { reject, resolve, fallback };
    const abort = customSegmentLoader(args, callbacks);

    return () => {
      if (!hasFinished && !hasFallbacked && typeof abort === "function") {
        abort();
      }
    };
  });
};

export default segmentPreLoader;
