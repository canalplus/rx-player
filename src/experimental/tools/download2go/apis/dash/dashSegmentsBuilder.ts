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

import {
  AsyncSubject,
  forkJoin,
  from,
  Observable,
  of,
  ReplaySubject,
  Subscription
} from "rxjs";
import {
  concatMap,
  last,
  map,
  mergeMap,
  retry,
  takeUntil,
} from "rxjs/operators";

import isOffline from "../../../../../compat/is_offline";
import IRepresentationIndex, {
  ISegment
} from "../../../../../manifest/representation_index/types";
import { getSegmentsFromSidx } from "../../../../../parsers/containers/isobmff";
import {
  IParsedAdaptation,
  IParsedManifest
} from "../../../../../parsers/manifest/types";
import arrayFindIndex from "../../../../../utils/array_find_index";
import { concat as concatBytes } from "../../../../../utils/byte_parsing";
import PPromise from "../../../../../utils/promise";
import xhrRequest from "../../../../../utils/request";
import {
  IProgressBarBuilderAbstract,
  ISettingsDownloader,
  IUtils,
} from "../../types";
import { SegmentConstuctionError } from "../../utils";
import getLicense from "../drm/keySystems";
import { initParsedManifest } from "../publicApi/offlineDownload";
import { createSegment } from "./dashConnectivity";
import { chooseVideoQuality, emitEveryNth } from "./dashTools";
import {
  IDownloaderManagerAbstract,
  IDownloadManagerOutput,
  ILoaderBuilder,
  ILocalManifestOnline,
  ILocalPeriodOnline,
  ISegmentBuilder,
  ISegmentIndex,
  ISegmentIndexBuilder
} from "./types";

/**
 * Build the init segments
 *
 * @param IRepresentationIndex - index segment we use to build segments
 * @param ILoaderBuilder - variables we need to create a Loader
 * @param IUtils - Utils to stock and emit
 * @returns An Observable of the segments freshly constructed
 *
 */
export const buildInitSegments = (
  index: IRepresentationIndex,
  loaderBuilder: ILoaderBuilder,
  utilsBuilder: IUtils
): Observable<ISegmentIndexBuilder> => {
  const Segment = index.getInitSegment();
  if (!Segment) {
    throw new SegmentConstuctionError("Impossible to get the init segment");
  }
  const { id, contentID, duration: durationCurrPeriod } = loaderBuilder;
  const { db, emitter, progressBarBuilder$ } = utilsBuilder;
  return getInitSegments(Segment).pipe(
    mergeMap(segmentData => {
      const {
        dataInit,
        nextSegmentsRanges = index.getSegments(0, durationCurrPeriod as number),
        type,
        mediaURL,
        duration,
      } = segmentData;
      if (!nextSegmentsRanges) {
        throw new SegmentConstuctionError(
          "Error when parsing Segments index box"
        );
      }
      if (!durationCurrPeriod && type === "TemplateRepresentationIndex") {
        throw new SegmentConstuctionError(
          "Error during the contruction of segments,\
          no duration of the current period given because \
          it's a TemplateRepresentationIndex"
        );
      }
      if (progressBarBuilder$) {
        progressBarBuilder$.next({
          id,
          segmentDownloaded: 0,
          totalSegments: nextSegmentsRanges.length,
        });
      }
      if (loaderBuilder.keySystemsOptions && loaderBuilder.type === "video") {
        return getLicense(loaderBuilder.keySystemsOptions, {
          codec: loaderBuilder.codecs || "",
          contentID,
          initSegment: dataInit,
          storageUtils: { emitter, db, progressBarBuilder$ },
        }).pipe(
          mergeMap(() =>
            from(
              db.put("segments", {
                contentID,
                data: dataInit,
                duration,
                segmentKey: `${id}--${contentID}--init`,
                size: dataInit.byteLength,
              })
            ).pipe(
              map(key => {
                if (typeof key !== "string") {
                  throw new Error(`Invalid Key for init segment: ${key}`);
                }
                const segmentsBuilder: ISegmentBuilder[] = [];
                for (let i = 0; i < nextSegmentsRanges.length; i++) {
                  segmentsBuilder.push({
                    segment: nextSegmentsRanges[i],
                    utils: {
                      contentID,
                      id,
                      segmentKey: [`${id}--${contentID}--${i}`, i],
                      type,
                      url: mediaURL || "",
                    },
                  });
                }
                return {
                  init: key,
                  segments: segmentsBuilder,
                };
              })
            )
          )
        );
      }
      return from(
        db.put("segments", {
          contentID,
          data: dataInit,
          duration,
          segmentKey: `${id}--${contentID}--init`,
          size: dataInit.byteLength,
        })
      ).pipe(
        map(key => {
          if (typeof key !== "string") {
            throw new Error(`Invalid Key for init segment: ${key}`);
          }
          const segmentsBuilder: ISegmentBuilder[] = [];
          for (let i = 0; i < nextSegmentsRanges.length; i++) {
            segmentsBuilder.push({
              segment: nextSegmentsRanges[i],
              utils: {
                contentID,
                id,
                segmentKey: [`${id}--${contentID}--${i}`, i],
                type,
                url: mediaURL || "",
              },
            });
          }
          return {
            init: key,
            segments: segmentsBuilder,
          };
        })
      );
    })
  );
};
/**
 * Get the init segments buffer from a server
 *
 * @param ISegment - index segment we use to build segments
 * @returns An Observable of init segment get on the server
 *
 */
const getInitSegments = (Segment: ISegment): Observable<ISegmentIndex> => {
  const { indexRange, range, mediaURL, duration = 0 } = Segment;
  if (indexRange && range) {
    return forkJoin({
      initSegment: xhrRequest({
        url: mediaURL || "",
        headers: { Range: `bytes=${range.join("-")}` },
        responseType: "arraybuffer",
      }).pipe(map(({ value }) => value.responseData)),
      indexSegment: xhrRequest({
        url: mediaURL || "",
        headers: { Range: `bytes=${indexRange.join("-")}` },
        responseType: "arraybuffer",
      }).pipe(map(({ value }) => value.responseData)),
    }).pipe(
      mergeMap(({ initSegment, indexSegment }) => {
        const dataInit = concatBytes(
          new Uint8Array(initSegment),
          new Uint8Array(indexSegment)
        );
        const nextSegmentsRanges = getSegmentsFromSidx(
          dataInit,
          indexRange ? indexRange[0] : 0
        );
        return of({
          dataInit,
          duration,
          mediaURL,
          nextSegmentsRanges,
          type: "BaseRepresentationIndex" as const,
        });
      })
    );
  }
  return xhrRequest({
    url: mediaURL || "",
    responseType: "arraybuffer",
  }).pipe(
    map(({ value }) => ({
        dataInit: value.responseData,
        mediaURL,
        type: "TemplateRepresentationIndex" as const,
      })
    )
  );
};

/**
 * A download manager that take all the representations to execute them
 * concurrently and tranform a Segment non built into a segment built
 *
 * @param utilsBuilder - Emitter and db instances
 * @param progress$ - A Subject observable to emit related with the progress percentage
 * @param pause$ - A Subject observable to emit when the user pause the download
 * @param contentID - A string that define the content id of the current download
 * @returns An Observable of rxpManifest flow
 *
 */
export const downloadManager = (
  utilsBuilder: IUtils,
  progress$: ReplaySubject<IProgressBarBuilderAbstract>,
  pause$: AsyncSubject<void>,
  contentID: string
) => (
  source$: Observable<ILocalManifestOnline>
): Observable<IDownloadManagerOutput> =>
  source$.pipe(
    concatMap(manifest => {
      if (!manifest) {
        return from([]);
      }
      return from(manifest.periods).pipe(
        concatMap(period =>
          from(period.adaptations).pipe(
            mergeMap(
              adaptation =>
                from(adaptation.representations).pipe(
                  mergeMap(
                    representation =>
                      from(representation.index.segments).pipe(
                        concatMap(segment => {
                          if (Array.isArray(segment)) {
                            return of(segment);
                          }
                          return createSegment(segment, utilsBuilder).pipe(
                            retry(2)
                          );
                        }),
                        map(segmentBuilt => {
                          const [[, i]] = segmentBuilt;
                          representation.index.segments[i] = segmentBuilt;
                          return segmentBuilt;
                        })
                      ),
                    adaptation.representations.length
                  )
                ),
              period.adaptations.length
            ),
            takeUntil(pause$)
          )
        ),
        map(() => manifest)
      );
    }),
    emitEveryNth(progress$, utilsBuilder, contentID, pause$)
  );

/**
 * A subscription manager that take care to choose between a start and a resume download
 *
 * @param IDownloaderManagerAbstract - Download manager need
 * @param IUtils- Some variables we need to emit and insert in DB
 * @returns The Subscription
 *
 */
export function downloadManagerSubscription(
  {
    settings,
    activeSubsDownloader,
    progress$,
    pause$,
    progressSetupUnsubFn,
  }: IDownloaderManagerAbstract,
  { db, emitter, storeManifestEvery, progressBarBuilder$ }: IUtils
): Subscription {
  const metaData =
    settings.type === "start"
      ? settings.dbSettings.metaData
      : settings.metaData;
  const contentID =
    settings.type === "start"
      ? settings.dbSettings.contentID
      : settings.contentID;
  const downloadManagerSub = (settings.type === "start"
    ? initAtStart(settings, { db, emitter, progressBarBuilder$ })
    : of(settings.rxpManifest)
  )
    .pipe(
      downloadManager(
        { emitter, db, storeManifestEvery, progressBarBuilder$ },
        progress$,
        pause$,
        contentID
      )
    )
    .subscribe(
      async ({ manifest, ...props }) => {
        await PPromise.all([
          db.put("manifests", {
            contentID,
            rxpManifest: manifest,
            ...(metaData && { metaData }),
            ...props,
          }),
          emitter.trigger("insertDB", {
            action: "store",
            contentID,
            progress: props.progress,
          }),
        ]);
      },
      (err: Error) => {
        progressSetupUnsubFn.unsubscribe();
        delete activeSubsDownloader[contentID];
        switch (err.message) {
          case "ERROR_EVENT":
            if (isOffline()) {
              emitter.trigger("error", {
                action: "download",
                contentID,
                error: new Error("NETWORK_ERROR"),
              });
              return;
            }
          default:
            emitter.trigger("error", {
              action: "download",
              contentID,
              error: err,
            });
            return;
        }
      },
      () => {
        progressSetupUnsubFn.unsubscribe();
        delete activeSubsDownloader[contentID];
      }
    );
  return downloadManagerSub;
}

/**
 * Create a local manifest type understandable by the manifest loader
 *
 * @returns An Observable of the local manifest type
 *
 */
export const buildLocalManifest = () => {
  return (
    source$: Observable<IParsedManifest>
  ): Observable<ILocalManifestOnline> => {
    return source$.pipe(
      map(
        (parsedManifest): ILocalManifestOnline => ({
          version: "0.2",
          duration: parsedManifest.duration || 0,
          periods: parsedManifest.periods.map(
            (period): ILocalPeriodOnline => ({
              start: period.start,
              duration: period.duration || 0,
              adaptations: Object.keys(period.adaptations)
                .reduce(
                  (accAdaptation: any, curr): IParsedAdaptation[] =>
                    accAdaptation.concat(period.adaptations[curr]),
                  []
                )
                .map(({ id, ...adaptation }: IParsedAdaptation) => ({
                  ...adaptation,
                  representations: adaptation.representations.map(
                    representation => ({
                      bitrate: representation.bitrate,
                      mimeType: representation.mimeType || "",
                      codecs: representation.codecs || "",
                      ...(representation.width && {
                        width: representation.width,
                      }),
                      ...(representation.height && {
                        height: representation.height,
                      }),
                      index: representation.index,
                    })
                  ),
                })),
            })
          ),
          isFinished: false,
        })
      )
    );
  };
};

/**
 * In case of start download type, take all the init segments we need
 *
 * @param ISettingsDownloader - Setting that the user provided
 * @param IUtils - Some variables we need to emit and insert in DB
 * @returns An Observable of Local manifest
 *
 */
export const initAtStart = (
  settings: ISettingsDownloader,
  { db, emitter, progressBarBuilder$ }: IUtils
) => {
  return initParsedManifest(settings.url).pipe(
    concatMap(manifest =>
      from(manifest.periods).pipe(
        concatMap(period => {
          const groupedAdaptation: IParsedAdaptation[] = Object.keys(
            period.adaptations
          ).reduce(
            (acc, curr) => acc.concat(period.adaptations[curr] as any),
            []
          );
          return from(groupedAdaptation).pipe(
            mergeMap(adaptation => {
              return from(
                adaptation.type === "video"
                  ? chooseVideoQuality(
                      adaptation.representations,
                      adaptation.type,
                      settings.videoSettings.quality
                    )
                  : adaptation.representations
              ).pipe(
                mergeMap(representation => {
                  return buildInitSegments(
                    representation.index,
                    {
                      codecs: `${representation.mimeType};codecs="${
                        representation.codecs
                      }"`,
                      contentID: settings.dbSettings.contentID,
                      duration: period.duration,
                      id: representation.id,
                      keySystemsOptions: settings.videoSettings.keySystems,
                      type: adaptation.type,
                    },
                    {
                      db,
                      emitter,
                      progressBarBuilder$,
                    }
                  ).pipe(retry(2));
                }),
                map(segmentInitBuilt => {
                  const representations = adaptation.representations;
                  const initID = segmentInitBuilt.init.split("--")[0];
                  const indexToReplace = arrayFindIndex(
                    representations,
                    representation => representation.id === initID
                  );
                  const indexKey = "index";
                  (representations[indexToReplace][
                    indexKey
                  ] as any) = segmentInitBuilt;
                  if (adaptation.type === "video") {
                    const representationToKeep = representations.filter(
                      (_, index) => {
                        return (
                          representations[index].id ===
                          adaptation.representations[indexToReplace].id
                        );
                      }
                    );
                    adaptation.representations = representationToKeep;
                  }
                  return segmentInitBuilt;
                })
              );
            })
          );
        }),
        map((): IParsedManifest => manifest)
      )
    ),
    last(),
    buildLocalManifest()
  );
};
