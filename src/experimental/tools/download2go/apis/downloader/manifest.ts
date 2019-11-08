/**
 * Copyright 2019 CANAL+ Group
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

import { Observable, Subject } from "rxjs";
import { mergeMap, map } from "rxjs/operators";

import DASHFeature from "../../../../../transports/dash";
import SMOOTHFeature from "../../../../../transports/smooth";

import { createManifestPipeline } from "../../../../../core/pipelines";
import Manifest, { Representation } from "../../../../../manifest";
import { ITransportPipelines } from "../../../../../transports";
import { ILocalManifest } from "../../../../../parsers/manifest/local";
import { IStoredManifest } from "../../types";
import { IParsedPeriod } from "../../../../../parsers/manifest";
import {
  ILocalAdaptation,
  ILocalRepresentation,
  ILocalIndexSegment,
} from "../../../../../parsers/manifest/local/types";
import {
  IAdaptationForPeriodBuilder,
  IAdaptationStored,
  ContentVideoType,
  ISegmentStored,
} from "./types";
import { IDBPDatabase } from "idb";

/**
 * Get the TransportPipeline for current transport.
 *
 * @param transport - Transport option for current manifest.
 * @returns A instance of TransportPipelines for the current url.
 *
 */
export function getTransportPipelineByTransport(transport: "smooth" | "dash") {
  const pipelineTypes = {
    smooth: SMOOTHFeature,
    dash: DASHFeature,
  };
  return pipelineTypes[transport]({
    lowLatencyMode: false,
  });
}

/**
 * Get the manifest from an url.
 *
 * @param manifestURL - Manifest url on the web.
 * @param transport - Transport that need to be use.
 * @returns A instance of Manifest for the current url and the transportPipeline associated to it.
 *
 */
export function manifestLoader(
  manifestURL: string,
  transport: "smooth" | "dash" = "dash",
): Observable<{ manifest: Manifest; transportPipelines: ITransportPipelines }> {
  const transportPipelines = getTransportPipelineByTransport(transport);
  const manifestPipeline = createManifestPipeline(
    transportPipelines,
    {
      lowLatencyMode: false,
      manifestRetry: 5,
      offlineRetry: 5,
    },
    new Subject(),
  );
  return manifestPipeline
    .fetch(manifestURL)
    .pipe(
      mergeMap(response =>
        manifestPipeline
          .parse(response.value, manifestURL)
          .pipe(map(({ manifest }) => ({ manifest, transportPipelines }))),
      ),
    );
}

export function getBuilderFormatted({
  builder,
}: Pick<IStoredManifest, "builder">) {
  return Object.keys(builder).reduce(
    (acc, curr): IAdaptationForPeriodBuilder => {
      const ctxs = builder[curr as ContentVideoType];
      if (ctxs == null || ctxs.length === 0) {
        return acc;
      }
      for (let i = 0; i <= ctxs.length; i++) {
        const ctx = ctxs[i];
        const periodId = ctx.period.id;
        if (acc[periodId] === undefined) {
          acc[periodId] = [];
          acc[periodId].push({
            type: ctx.adaptation.type as ContentVideoType,
            audioDescription: ctx.adaptation.isAudioDescription,
            closedCaption: ctx.adaptation.isClosedCaption,
            language: ctx.adaptation.language,
            representations: [ctx.representation],
          });
          return acc;
        }
        acc[periodId].push({
          type: ctx.adaptation.type as ContentVideoType,
          audioDescription: ctx.adaptation.isAudioDescription,
          closedCaption: ctx.adaptation.isClosedCaption,
          language: ctx.adaptation.language,
          representations: [ctx.representation],
        });
        return acc;
      }
      return acc;
    },
    {} as IAdaptationForPeriodBuilder,
  );
}

/**
 * Returns the structure of the manifest needed by the rxPlayer transport local.
 *
 * @remarks
 * It's mandatory to construct again the rxpManifest
 * when the user want it because we can't insert function type in IndexDB
 *
 * @param ILocalManifestOnline - The rxpManifest we downloaded when online
 * @returns The manifest that the rxPlayer expect
 *
 */
export function offlineManifestLoader(
  manifest: any,
  segments: ISegmentStored[],
  adaptationsBuilder: IAdaptationForPeriodBuilder,
  duration: number,
  isFinished: boolean,
  db: IDBPDatabase<unknown>,
): ILocalManifest {
  return {
    type: "local",
    version: "0.1",
    duration,
    periods: manifest.periods.map((period: IParsedPeriod) => {
      return {
        start: period.start,
        duration: period.duration,
        adaptations: adaptationsBuilder[period.id].map(
          (adaptation: IAdaptationStored): ILocalAdaptation => ({
            type: adaptation.type as ContentVideoType,
            ...(adaptation.audioDescription && {
              audioDescription: adaptation.audioDescription,
            }),
            ...(adaptation.closedCaption && {
              closedCaption: adaptation.closedCaption,
            }),
            ...(adaptation.language && { language: adaptation.language }),
            representations: adaptation.representations.map(
              (representation: Representation): ILocalRepresentation => ({
                bitrate: representation.bitrate,
                mimeType: representation.mimeType || "",
                codecs: (representation as Representation).codec || "",
                width: representation.width,
                height: representation.height,
                index: {
                  loadInitSegment: ({ resolve, reject }) => {
                    db.get(
                      "segments",
                      `0--${representation.id}--init--${adaptation.type}`,
                    )
                      .then((segment: any) => {
                        resolve({
                          data: segment.data,
                        });
                      })
                      .catch((err: Error) => reject(err));
                  },
                  loadSegment: (
                    { time: reqSegmentTime },
                    { resolve, reject },
                  ) => {
                    db.get(
                      "segments",
                      `${reqSegmentTime}--${representation.id}`,
                    )
                      .then((segment: any) => {
                        resolve({
                          data: segment.data,
                        });
                      })
                      .catch((err: Error) => reject(err));
                  },
                  segments: segments
                    .reduce<ILocalIndexSegment[]>((acc, currSegment) => {
                      if (
                        !currSegment.isInitData &&
                        currSegment.representationID === representation.id
                      ) {
                        const { time, timescale, duration } = currSegment;
                        acc.push({
                          time,
                          timescale,
                          duration,
                        });
                        return acc;
                      }
                      return acc;
                    }, [])
                    .sort((a, b) => a.time - b.time),
                },
              }),
            ),
          }),
        ),
      };
    }),
    isFinished,
  };
}
