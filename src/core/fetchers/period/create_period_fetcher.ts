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
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
  throwError as observableThrow,
} from "rxjs";
import {
  catchError,
  map,
  mergeMap,
} from "rxjs/operators";
import {
  formatError,
  ICustomError,
  OtherError,
} from "../../../errors";
import Manifest, {
  LoadedPeriod,
  PartialPeriod,
} from "../../../manifest";
import {
  ILoaderDataLoadedValue,
  IPeriodLoaderArguments,
  IPeriodParserEvent,
  IPeriodParserFunction,
  ITransportPipelines,
} from "../../../transports";
import getManifestBackoffOptions from "../manifest/get_manifest_backoff_options";
import createRequestScheduler from "../utils/create_request_scheduler";
import createPeriodLoader, {
  IPeriodLoaderEvent,
} from "./create_period_loader";

/** What will be sent once parsed. */
export interface IPeriodFetcherParsedResult {
  /** To differentiate it from a "warning" event. */
  type : "parsed";

  /** The resulting Periods */
  value : Array<LoadedPeriod | PartialPeriod>;
}

/** Emitted when a fetching or parsing minor error happened. */
export interface IPeriodFetcherWarningEvent {
  /** To differentiate it from other events. */
  type : "warning";

  /** The error in question. */
  value : ICustomError;
}

/** Response emitted by a Period fetcher. */
export interface IPeriodFetcherResponse {
  /** To differentiate it from a "warning" event. */
  type : "response";

  /** Allows to parse fetched Period(s). */
  parse(parserOptions : { externalClockOffset? : number }) :
    Observable<IPeriodFetcherWarningEvent |
               IPeriodFetcherParsedResult>;
}

/** The Period fetcher generated here. */
export interface IPeriodFetcher {
  /** Allows to perform the Period request. */
  fetch(content : IPartialPeriodFetchingRequest) : Observable<IPeriodFetcherWarningEvent |
                                                              IPeriodFetcherResponse>;
}

/** Argument given to fetch a request. */
export interface IPartialPeriodFetchingRequest {
  /** The Period you want to load. */
  period : PartialPeriod;
  /** The Manifest containing this PartialPeriod. */
  manifest : Manifest;
}

/** Options used by `createPeriodFetcher`. */
export interface IPeriodFetcherBackoffOptions {
  /**
   * Whether the content is played in a low-latency mode.
   * This has an impact on default backoff delays.
   */
  lowLatencyMode : boolean;
  /** Maximum number of time a request on error will be retried. */
  manifestRetry? : number;
  /** Maximum number of time a request be retried when the user is offline. */
  offlineRetry? : number;
}

/**
 * Create function allowing to easily fetch and parse Periods from the Manifest.
 * Avoid multiple concurrent fetch of the same ressources.
 * @example
 * ```js
 * const periodFetcher = createPeriodFetcher(pipelines, options);
 * periodFetcher.fetch({ manifest, period }).pipe(
 *   // Filter only responses (might also receive warning events)
 *   filter((evt) => evt.type === "response");
 *   // Parse the Manifest
 *   mergeMap(res => res.parse({ externalClockOffset }))
 *   // (again)
 *   filter((evt) => evt.type === "parsed");
 * ).subscribe(({ value }) => {
 *   console.log("Periods:", value.periods);
 * });
 * ```
 * @param {Object} pipelines
 * @param {Subject} options
 * @param {Subject} warning$
 * @returns {Function}
 */
export default function createPeriodFetcher(
  pipelines : ITransportPipelines,
  options : IPeriodFetcherBackoffOptions
) : IPeriodFetcher {
  // XXX TODO
  const backoffOptions = getManifestBackoffOptions(options);

  let periodLoader : (x : IPeriodLoaderArguments) => Observable<IPeriodLoaderEvent>;
  let periodParser : IPeriodParserFunction;

  const periodPipeline = pipelines.period;
  if (periodPipeline === undefined) {
    periodLoader = () =>
      observableThrow(new OtherError("NONE", "Shouldn't ask to load a Period " +
                                             "under the current transport."));
    periodParser = () =>
      observableThrow(new OtherError("NONE", "Shouldn't ask to parse a Period " +
                                             "under the current transport."));
  } else {
    periodLoader = createPeriodLoader(periodPipeline, backoffOptions);
    periodParser = periodPipeline.parser;
  }

  return {
    fetch(
      content : IPartialPeriodFetchingRequest
    ) : Observable<any> {
      return periodLoader(content).pipe(
        map((evt) => {
          if (evt.type === "warning") {
            return evt;
          }

          // Prepare RequestScheduler
          // TODO Remove the need of a subject
          type IRequestSchedulerData = ILoaderDataLoadedValue<string | Document>;
          const schedulerWarnings$ = new Subject<ICustomError>();
          const scheduleRequest =
            createRequestScheduler<IRequestSchedulerData>(backoffOptions,
                                                          schedulerWarnings$);
          return {
            type: "response",
            parse() {
              return observableMerge(
                schedulerWarnings$
                  .pipe(map(err => ({ type: "warning", value: err }))),
                periodParser({ response: evt.value,
                               manifest: content.manifest,
                               externalClockOffset: content.manifest.clockOffset,
                               scheduleRequest,
                               period: content.period }).pipe(
                  catchError((error: unknown) => {
                    throw formatError(error, {
                      defaultCode: "PIPELINE_PARSE_ERROR",
                      defaultReason: "Unknown error when parsing the Period",
                    });
                  }),

                  mergeMap((res : IPeriodParserEvent) => {
                    if (res.type === "warning") {
                      return observableOf(res);
                    }
                    // 1 - send warnings first
                    let warningEvts$ : Observable<IPeriodFetcherWarningEvent> = EMPTY;

                    const { periods } = res;
                    for (let i = 0; i < periods.length; i++) {
                      const period = periods[i];
                      if (period.isLoaded) {
                        const warnings = period.parsingErrors;
                        for (let j = 0; j < warnings.length; j++) {
                          const warning = warnings[i];
                          warningEvts$ =
                            observableConcat(warningEvts$,
                                             observableOf({ type: "warning" as const,
                                                            value: warning }));
                        }
                      }
                    }

                    // XXX TODO
                    const id = content.period.id;
                    content.manifest.setLoadedPeriod(id, periods);
                    return observableConcat(warningEvts$,
                                            observableOf({ type: "parsed" as const,
                                                           value: res }));
                  })));
            },
          };
      }));
    },
  };
}
