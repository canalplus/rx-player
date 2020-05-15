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

import { Observable } from "rxjs";
import { filter, map, mergeMap } from "rxjs/operators";

import features from "../../../../../features/";

import { IPersistentSessionInfo } from "../../../../../core/eme";
import createManifestFetcher, {
  IManifestFetcherParsedResult,
  IManifestFetcherResponse,
} from "../../../../../core/fetchers/manifest/create_manifest_fetcher";
import Manifest, { ISegment } from "../../../../../manifest";
import { ILocalManifest } from "../../../../../parsers/manifest/local";
import {
  ILocalAdaptation,
  ILocalIndexSegment,
  ILocalPeriod,
  ILocalRepresentation,
} from "../../../../../parsers/manifest/local/types";
import { ITransportPipelines } from "../../../../../transports";
import { IStoredManifest } from "../../types";
import { SegmentConstuctionError } from "../../utils";
import { IContentProtection } from "../drm/types";
import {
  ContentBufferType,
  IAdaptationForPeriod,
  ISegmentForRepresentation,
  ISegmentStored,
  IUtilsOfflineLoader,
} from "./types";

/**
 * Get the TransportPipeline for current transport.
 *
 * @param {smooth|dash} transport HTTP streaming transport protocol
 *  type for current download to use.
 * @returns {ITransportPipelines} A instance of TransportPipelines
 *  for the current download.
 *
 */
export function getTransportPipelineByTransport(transport: string) {
  const transportFn = features.transports[transport];
  if (typeof transportFn !== "function") {
    throw new Error(`transport "${transport}" not supported`);
  }
  return transportFn({
    lowLatencyMode: false,
  });
}

/**
 * Get the manifest from an url.
 *
 * @param {string} manifestURL - Manifest url.
 * @param {smooth|dash} transport HTTP streaming transport protocol type to use.
 * @returns {Observable<{Manifest, ITransportPipelines}>} An observable that contain
 *  instance of Manifest for the current url and the transportPipelines associated to it.
 *
 */
export function manifestLoader(
  manifestURL: string,
  transport: string
): Observable<{ manifest: Manifest; transportPipelines: ITransportPipelines }> {
  const transportPipelines = getTransportPipelineByTransport(transport);
  const manifestPipeline = createManifestFetcher(
    transportPipelines,
    {
      lowLatencyMode: false,
      maxRetryRegular: 5,
      maxRetryOffline: 5,
    }
  );
  return manifestPipeline
  .fetch(manifestURL)
  .pipe(
    filter((evt): evt is IManifestFetcherResponse => evt.type === "response"),
    mergeMap((response) => response.parse({ previousManifest: null, unsafeMode: false })),
    filter((res): res is IManifestFetcherParsedResult  => res.type === "parsed"),
    map(({ manifest }) => ({ manifest, transportPipelines }))
  );
}

/**
 * Get the adaptations for the current period.
 *
 * @param {Object} builder The global builder context for each
 * bufferType we insert in IndexedDB
 * @returns {Object} Periods associated with an array of adaptations
 *
 */
export function getBuilderFormattedForAdaptations({
  builder,
}: Pick<IStoredManifest, "builder">): IAdaptationForPeriod {
  return Object.keys(builder).reduce<IAdaptationForPeriod>(
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
 * Get the segments for the current representation.
 *
 * @param {Pick<IStoredManifest, "builder">} builder The global builder context for each
 * bufferType we insert in IndexedDB
 * @returns {ISegmentForRepresentation} Representation associated
 *  with an array of segments.
 *
 */
export function getBuilderFormattedForSegments({
  builder,
}: Pick<IStoredManifest, "builder">) {
  return Object.keys(builder).reduce<ISegmentForRepresentation>(
    (acc, curr) => {
      const ctxs = builder[curr as ContentBufferType];
      if (ctxs == null || ctxs.length === 0) {
        return acc;
      }
      for (let i = 0; i <= ctxs.length; i++) {
        const ctx = ctxs[i];
        const repreId = ctx.representation.id as string;
        acc[repreId] = (ctx.nextSegments as Array<ISegment | [number, number, number]>)
          .reduce<ILocalIndexSegment[]>(
            (accSegts, currSegment) => {
              if (Array.isArray(currSegment)) {
                const [time, timescale, duration] = currSegment;
                accSegts.push({
                  time: (time / timescale) * 1000,
                  duration: (duration / timescale) * 1000,
                });
                return accSegts;
              }
            return accSegts;
          }, []);
        return acc;
      }
      return acc;
    },
    {}
  );
}

/**
 * Get the segments for the current representation.
 *
 * @param {Pick<IStoredManifest, "builder">} builder The global builder context for each
 * bufferType we insert in IndexedDB
 * @returns {ISegmentForRepresentation} Representation associated
 *  with an array of segments.
 *
 */
export function getKeySystemsSessionsOffline(
  contentsProtection : IContentProtection[] | undefined
) {
  if (contentsProtection === undefined || contentsProtection.length === 0) {
    return undefined;
  }
  const flattenedSessionsIDS = contentsProtection
    .reduce<{ sessionsIDS: IPersistentSessionInfo[]; type: string}>((acc, curr) => {
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
 * when storing in IndexedDB.
 *
 * @param {Object} manifest - The Manifest we downloaded when online
 * @param {Object} adaptationsBuilder Periods associated with
 *  an array of adaptations
 * @param {Object} representationsBuilder - Representation
 *  associatedwith an array of segments.
 * @param {Object} IAdaptationForPeriod Additional utils...
 * @returns {Object} A ILocalManifest to the RxPlayer transport local
 *
 */
export function offlineManifestLoader(
  manifest: Manifest,
  adaptations: IAdaptationForPeriod,
  representations: ISegmentForRepresentation,
  { contentID, duration, isFinished, db }: IUtilsOfflineLoader
): ILocalManifest {
  return {
    type: "local",
    version: "0.1",
    duration,
    periods: manifest.periods.map<ILocalPeriod>((period): ILocalPeriod => {
      return {
        start: period.start,
        duration: period.duration !== undefined ? period.duration : Number.MAX_VALUE,
        adaptations: adaptations[period.id].map(
          (adaptation): ILocalAdaptation => ({
            type: adaptation.type,
            audioDescription: adaptation.audioDescription,
            closedCaption: adaptation.closedCaption,
            language: adaptation.language,
            representations: adaptation.representations.map(
              ({ mimeType, codec, id, ...representation }): ILocalRepresentation => ({
                bitrate: representation.bitrate,
                mimeType: mimeType !== undefined ? mimeType : "",
                codecs: codec !== undefined ? codec : "",
                width: representation.width,
                height: representation.height,
                index: {
                  loadInitSegment: ({ resolve, reject }) => {
                    db.get(
                      "segments",
                      `init--${id}--${contentID}`
                    )
                      .then((segment: ISegmentStored | undefined) => {
                        if (segment === undefined) {
                          return reject(
                            new SegmentConstuctionError(`${contentID}:
                              Impossible to retrieve INIT segment in IndexedDB for
                              representation: ${id}, got: undefined`
                            )
                          );
                        }
                        return resolve({
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
                      `${reqSegmentTime}--${id}--${contentID}`
                    )
                      .then((segment: ISegmentStored | undefined) => {
                        if (segment === undefined) {
                          return resolve({
                            data: new Uint8Array(0),
                          });
                        }
                        return resolve({
                          data: segment.data,
                        });
                      })
                      .catch(reject);
                  },
                  segments: representations[id],
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
