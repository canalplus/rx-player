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
import { IPipelineOptions } from "../../../core/pipelines/segment";
import {
  IPeriodLoaderArguments,
  IPeriodParserArguments,
  IPeriodResult,
  ITransportPipelines,
} from "../../../net/types";
import {
  IParsedManifest,
  IParsedPeriod,
} from "../../../parsers/manifest/types";
import createLoader, {
  IPipelineLoaderResponse,
} from "../create_loader";
import createParser from "../create_parser";

/**
 * Load periods from links in manifest.
 * @param {String} transport
 * @param {Object} pipelineOptions
 * @param {Object} periods
 * @returns {Observable}
 */
export default function loadPeriodFromLink(
  pipelines : ITransportPipelines,
  pipelineOptions : IPipelineOptions<IPeriodLoaderArguments, string>,
  manifest: IParsedManifest
): Observable<IParsedPeriod[]> {
  const { periods } = manifest;
  const { period: periodPipeline } = pipelines;
  if (periodPipeline) {
    const periods$ =
      periods.reduce((
        acc: Array<Observable<IParsedPeriod|IParsedPeriod[]>>, period, i
      ) => {
        const prevPeriodInfos = periods[i - 1];
        const nextPeriodInfos = periods[i + 1];
        if (period.linkURL != null) {
          if (period.resolveAtLoad) {
            const periodLoader = createLoader<
              IPeriodLoaderArguments, string
            >(periodPipeline, pipelineOptions);
            const periodParser = createParser<
              IPeriodParserArguments,
              IPeriodResult
            >(periodPipeline);
            const period$ = periodLoader({ url: period.linkURL }).pipe(
              filter((response): response is IPipelineLoaderResponse<string> =>
                response.type === "response"),
              mergeMap(({ value }) => {
                return periodParser({
                  response: value,
                  prevPeriodInfos,
                  nextPeriodInfos,
                });
              })
            );
            acc.push(
              period$.pipe(map((result) => result.periods))
            );
          } else {
            throw new Error(
              "Can\"t lazy load periods.");
          }
        } else {
          acc.push(observableOf(period));
        }
        return acc;
      }, []);
    return observableCombineLatest(
      ... periods$
    ).pipe(
      map((elements) => {
        return elements.reduce((acc: IParsedPeriod[], value) => {
          if ((value as IParsedPeriod[]).length != null) {
            (value as IParsedPeriod[]).forEach((element) => {
              acc.push(element);
            });
          } else {
            acc.push(value as IParsedPeriod);
          }
          return acc;
        }, []);
      })
    );
  } else {
    return observableOf(
      periods.filter((period) => period.linkURL == null)
    );
  }
}
