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
import { map, mergeMap } from "rxjs/operators";

import DASHFeature from "../../../../../transports/dash";
import SMOOTHFeature from "../../../../../transports/smooth";

import { IPersistedSessionData } from "../../../../../core/eme";
import { createManifestPipeline } from "../../../../../core/pipelines";
import Manifest, { Representation } from "../../../../../manifest";
import { IParsedPeriod } from "../../../../../parsers/manifest";
import { ILocalManifest } from "../../../../../parsers/manifest/local";
import {
  ILocalAdaptation,
  ILocalRepresentation,
} from "../../../../../parsers/manifest/local/types";
import { ITransportPipelines } from "../../../../../transports";
import { IStoredManifest } from "../../types";
import { IContentProtection } from "../drm/types";
import {
  ContentBufferType,
  IAdaptationForPeriodBuilder,
  IAdaptationStored,
  ISegmentForRepresentationBuilder,
  IUtilsOfflineLoader,
} from "./types";

/**
 * Get the TransportPipeline for current transport.
 *
 * @param transport - Transport option for current manifest.
 * @returns A instance of TransportPipelines for the current url manifest.
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
 * @returns A instance of Manifest for the current url and the
 * transportPipeline associated to it.
 *
 */
export function manifestLoader(
  manifestURL: string,
  transport: "smooth" | "dash" = "dash"
): Observable<{ manifest: Manifest; transportPipelines: ITransportPipelines }> {
  const transportPipelines = getTransportPipelineByTransport(transport);
  const manifestPipeline = createManifestPipeline(
    transportPipelines,
    {
      lowLatencyMode: false,
      manifestRetry: 5,
      offlineRetry: 5,
    },
    new Subject()
  );
  return manifestPipeline
    .fetch(manifestURL)
    .pipe(
      mergeMap(response =>
        manifestPipeline
          .parse(response.value, manifestURL)
          .pipe(map(({ manifest }) => ({ manifest, transportPipelines })))
      )
    );
}

/**
 * Get the adaptations for the current period.
 *
 * @param IStoredManifest - The global builder we insert in IndexDB
 * @returns An Object of period associated with an array of adaptations.
 *
 */
export function getBuilderFormattedForAdaptations({
  builder,
}: Pick<IStoredManifest, "builder">) {
  return Object.keys(builder).reduce<IAdaptationForPeriodBuilder>(
    (acc, curr) => {
      const ctxs = builder[curr as ContentBufferType];
      if (ctxs == null || ctxs.length === 0) {
        return acc;
      }
      for (let i = 0; i <= ctxs.length; i++) {
        const ctx = ctxs[i];
        const periodId = ctx.period.id;
        if (acc[periodId] === undefined) {
          acc[periodId] = [];
          acc[periodId].push({
            type: ctx.adaptation.type as ContentBufferType,
            audioDescription: ctx.adaptation.isAudioDescription,
            closedCaption: ctx.adaptation.isClosedCaption,
            language: ctx.adaptation.language,
            representations: [ctx.representation],
          });
          return acc;
        }
        acc[periodId].push({
          type: ctx.adaptation.type as ContentBufferType,
          audioDescription: ctx.adaptation.isAudioDescription,
          closedCaption: ctx.adaptation.isClosedCaption,
          language: ctx.adaptation.language,
          representations: [ctx.representation],
        });
        return acc;
      }
      return acc;
    },
    {}
  );
}

/**
 * Get the segment for the current representation.
 *
 * @param IStoredManifest - The global builder we insert in IndexDB
 * @returns An Object of representation associated with an array of segments.
 *
 */
export function getBuilderFormattedForSegments({
  builder,
}: Pick<IStoredManifest, "builder">) {
  return Object.keys(builder).reduce<ISegmentForRepresentationBuilder>(
    (acc, curr) => {
      const ctxs = builder[curr as ContentBufferType];
      if (ctxs == null || ctxs.length === 0) {
        return acc;
      }
      for (let i = 0; i <= ctxs.length; i++) {
        const ctx = ctxs[i];
        const repreId = ctx.representation.id as string;
        acc[repreId] = (ctx.nextSegments as any).map(
          ([time, timescale, duration] : [number, number, number]) =>
            ({ time, timescale, duration })
          );
        return acc;
      }
      return acc;
    },
    {}
  );
}

export function getKeySystemsSessionsOffline(
  contentsProtection : IContentProtection[] | undefined
) {
  if (contentsProtection === undefined || contentsProtection.length === 0) {
    return undefined;
  }
  const flattenedSessionsIDS = contentsProtection
    .reduce<{ sessionsIDS: IPersistedSessionData[]; type: string}>((acc, curr) => {
    acc.type = curr.keySystems.type;
    for (let i = 0; i < curr.keySystems.sessionsIDS.length; ++i) {
      acc.sessionsIDS.push(...curr.keySystems.sessionsIDS);
    }
    return acc;
  }, { type: "", sessionsIDS: [] });
  return {
    ...flattenedSessionsIDS,
    sessionsIDS: flattenedSessionsIDS.sessionsIDS
      .filter((sessionID, index) =>
        flattenedSessionsIDS.sessionsIDS
          .map(session => session.initData).indexOf(sessionID.initData) === index),
  };
}

/**
 * Returns the structure of the manifest needed by the RxPlayer transport local.
 *
 * @remarks
 * It's mandatory to rebuild again the local manifest
 * when we want to play an offline content because we lose every reference
 * when storing in IndexDB.
 *
 * @param Manifest - The Manifest we downloaded when online
 * @param ISegmentStored[] - The segments we downloaded online for the current content
 * @param IAdaptationForPeriodBuilder - The Adaptations by period
 * @param number - The global duration of the content
 * @param boolean - Tell if the content is 100% complete
 * @param IDBPDatabase - An Instance of IndexDB to be able to retrieve content in base
 * @returns A ILocalManifest to the RxPlayer transport local understand
 *
 */
export function offlineManifestLoader(
  manifest: any,
  adaptationsBuilder: IAdaptationForPeriodBuilder,
  representationsBuilder: ISegmentForRepresentationBuilder,
  { contentID, duration, isFinished, db }: IUtilsOfflineLoader
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
            type: adaptation.type,
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
                codecs: representation.codec || "",
                width: representation.width,
                height: representation.height,
                index: {
                  loadInitSegment: ({ resolve, reject }) => {
                    db.get(
                      "segments",
                      `init--${representation.id}--${contentID}`
                    )
                      .then((segment: any) => {
                        resolve({
                          data: segment.data,
                        });
                      })
                      .catch(reject);
                  },
                  loadSegment: (
                    { time: reqSegmentTime },
                    { resolve, reject }
                  ) => {
                    db.get(
                      "segments",
                      `${reqSegmentTime}--${representation.id}--${contentID}`
                    )
                      .then((segment: any) => {
                        resolve({
                          data: segment.data,
                        });
                      })
                      .catch(reject);
                  },
                  segments: representationsBuilder[representation.id],
                },
              })
            ),
          })
        ),
      };
    }),
    isFinished,
  };
}
