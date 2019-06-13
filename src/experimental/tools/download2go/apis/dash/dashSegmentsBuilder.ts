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
  from,
  Observable,
  Subscription,
  ReplaySubject,
  AsyncSubject,
} from "rxjs";
import { retry, concatMap, mergeMap, takeUntil } from "rxjs/operators";

import { chooseVideoQuality, emitEveryNth, getBaseSegments } from "./dashTools";
import { createSegment } from "./dashConnectivity";
import { SegmentConstuctionError } from "../../utils";
import { initDownloaderAssets } from "../publicApi/offlineDownload";
import getLicense from "../drm/keySystems";

import {
  IParsedAdaptation,
  IParsedPeriod,
  IParsedRepresentation,
  IParsedManifest,
} from "../../../../../parsers/manifest/types";
import { ISidxSegment } from "../../../../../parsers/containers/isobmff";
import IRepresentationIndex, {
  ISegment,
} from "../../../../../manifest/representation_index/types";
import {
  ILocalAdaptationOnline,
  ILocalIndexOnline,
  ILocalRepresentationOnline,
  ILocalManifestOnline,
  ILocalPeriodOnline,
  IOptionsBuilder,
  ILoaderBuilder,
  ISegmentBuilder,
  IDownloadManagerOutput,
  IDownloaderManagerAbstract,
} from "./types";
import { IProgressBarBuilderAbstract, IUtils } from "../../types";

/**
 * Pipeline that construct the wholes files that we need by assembling segments
 *
 * @param IRepresentationIndex - index segment we use to build segments
 * @param ILoaderBuilder - variables we need to create a Loader
 * @returns An array of the segments freshly constructed
 *
 */
const buildSegments = async (
  index: IRepresentationIndex,
  loaderBuilder: ILoaderBuilder,
  utilsBuilder: IUtils
): Promise<ILocalIndexOnline> => {
  const Segment = index.getInitSegment();
  if (!Segment) {
    throw new SegmentConstuctionError("Impossible to get the init segment");
  }
  const { id, contentID, duration: durationCurrPeriod } = loaderBuilder;
  const { db, emitter, progressBarBuilder$ } = utilsBuilder;
  const segmentData = await getBaseSegments(Segment);
  const {
    dataInit,
    nextSegmentsRanges = index.getSegments(0, durationCurrPeriod as number),
    duration,
    mediaURL,
    type,
  } = segmentData;
  if (!nextSegmentsRanges) {
    throw new SegmentConstuctionError("Error when parsing Segments index box");
  }
  if (!durationCurrPeriod && type === "TemplateRepresentationIndex") {
    throw new SegmentConstuctionError(
      "Error during the contruction of segments, no duration of the current period given because it's a TemplateRepresentationIndex"
    );
  }
  // GET ENCRYPTION INFORMATION
  if (loaderBuilder.keySystemsOptions && loaderBuilder.type === "video") {
    // Content is encrypted since, the user provided an encryption schema
    getLicense(loaderBuilder.keySystemsOptions, {
      codec: loaderBuilder.codecs || "",
      contentID,
      initSegment: dataInit,
      storageUtils: { emitter, db, progressBarBuilder$ },
    }).subscribe(
      () => {
        // tslint:disable-empty-block
      },
      err => {
        emitter.trigger("error", {
          action: "encryptionError",
          contentID,
          error: err,
        });
        throw new SegmentConstuctionError(
          "An error has been encountered during the handShake with the CDM and the license server"
        );
      }
    );
  }
  progressBarBuilder$!.next({
    id,
    segmentDownloaded: 0,
    totalSegments: nextSegmentsRanges.length,
  });
  return {
    init: (await db.put("segments", {
      contentID,
      data: dataInit,
      duration,
      segmentKey: `${id}--${contentID}--init`,
      size: dataInit.byteLength,
    })) as string,
    segments: (nextSegmentsRanges as any).map(
      (segment: ISidxSegment | ISegment, i: number): ISegmentBuilder => ({
        segment,
        utils: {
          contentID,
          id,
          segmentKey: [`${id}--${contentID}--${i}`, i],
          type,
          url: mediaURL || "",
        },
      })
    ),
  };
};

/**
 * Create the base structure of what expect the rx-player in local transport from the parsed dash
 *
 * @param IParsedManifest - The freshly parsed manifest
 * @returns The full manifest ready to be inserted in IndexDB
 *
 */
export const fillStructMapping = (
  builderOptions: IOptionsBuilder,
  utilsBuilder: IUtils
) => async (parsedManifest: IParsedManifest): Promise<ILocalManifestOnline> => {
  const { duration = 0, periods } = parsedManifest;
  const { quality, contentID, keySystemsOptions } = builderOptions;
  const { db, emitter, progressBarBuilder$ } = utilsBuilder;
  const rxpManifest = await periods.reduce(
    async (acc: any, period: IParsedPeriod): Promise<ILocalPeriodOnline[]> => {
      const concatAdaptations = Object.keys(period.adaptations).reduce(
        (accAdaptation: any, elem: string): IParsedAdaptation[] =>
          accAdaptation.concat(period.adaptations[elem]),
        []
      );
      return Promise.resolve([
        ...(await acc),
        {
          duration: period.duration,
          start: period.start,
          // tslint:disable-next-line:object-literal-sort-keys
          adaptations: await Promise.all(
            concatAdaptations.map(
              async (
                adaptation: IParsedAdaptation
              ): Promise<ILocalAdaptationOnline> => ({
                type: adaptation.type as
                  | "audio"
                  | "video"
                  | "text"
                  | "thumbnail",
                ...(adaptation.audioDescription && {
                  audioDescription: adaptation.audioDescription,
                }),
                ...(adaptation.closedCaption && {
                  closedCaption: adaptation.closedCaption,
                }),
                ...(adaptation.language && { language: adaptation.language }),
                representations: await Promise.all(
                  chooseVideoQuality(
                    adaptation.representations,
                    adaptation.type,
                    quality
                  ).map(
                    async (
                      representation: IParsedRepresentation
                    ): Promise<ILocalRepresentationOnline> => ({
                      bitrate: representation.bitrate,
                      codecs: representation.codecs || "",
                      mimeType: representation.mimeType || "",
                      ...(representation.width && {
                        width: representation.width,
                      }),
                      ...(representation.height && {
                        height: representation.height,
                      }),
                      id: representation.id,
                      index: await buildSegments(
                        representation.index,
                        {
                          codecs: `${representation.mimeType};codecs="${
                            representation.codecs
                          }"`,
                          contentID,
                          duration: period.duration,
                          id: representation.id,
                          keySystemsOptions,
                          type: adaptation.type,
                        },
                        {
                          db,
                          emitter,
                          progressBarBuilder$,
                        }
                      ),
                    })
                  )
                ),
              })
            )
          ),
        },
      ]);
    },
    Promise.resolve([])
  );
  // Change version with the right one
  return { version: "0.1", duration, periods: rxpManifest, isFinished: false };
};

/**
 * A download manager that take all the representations to execute them concurrently and tranform a Segment non built into a segment built
 *
 * @param rxpManifest - The rxpManifest where all the data reside
 * @param utilsBuilder - Emitter and db instances
 * @param progress$ - A Subject observable to emit in link with the progress percentage
 * @returns An Observable of rxpManifest flow
 *
 */
export const downloadManager = (
  rxpManifest: Promise<ILocalManifestOnline>,
  utilsBuilder: IUtils,
  progress$: ReplaySubject<IProgressBarBuilderAbstract>,
  pause$: AsyncSubject<void>,
  contentID: string
): Observable<IDownloadManagerOutput> =>
  from(rxpManifest).pipe(
    concatMap(
      val => {
        if (!val) {
          return from([]);
        }
        return from(val.periods).pipe(
          concatMap(period =>
            from(period.adaptations).pipe(
              mergeMap(
                adaptation =>
                  from(adaptation.representations).pipe(
                    mergeMap(
                      representation =>
                        from(representation.index.segments).pipe(
                          concatMap(segment =>
                            createSegment(segment, utilsBuilder).pipe(retry(2))
                          )
                        ),
                      (nextSegments, segmentInfos) => {
                        nextSegments.index.segments[
                          segmentInfos[0][1]
                        ] = segmentInfos;
                        return segmentInfos;
                      },
                      adaptation.representations.length
                    )
                  ),
                undefined,
                period.adaptations.length
              ),
              takeUntil(pause$)
            )
          )
        );
      },
      (localManifest, _) => localManifest
    ),
    emitEveryNth(progress$, utilsBuilder, contentID, pause$)
  );

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
  const downloadManagerSub = downloadManager(
    settings.type === "start"
      ? initDownloaderAssets(settings, { db, emitter, progressBarBuilder$ })
      : Promise.resolve(settings.rxpManifest),
    { emitter, db, storeManifestEvery, progressBarBuilder$ },
    progress$,
    pause$,
    contentID
  ).subscribe(
    async ({ manifest, ...props }) => {
      await Promise.all([
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
    err => {
      progressSetupUnsubFn.unsubscribe();
      delete activeSubsDownloader[contentID];
      emitter.trigger("error", {
        action: "download",
        contentID,
        error: err,
      });
    },
    () => {
      progressSetupUnsubFn.unsubscribe();
      delete activeSubsDownloader[contentID];
    }
  );
  return downloadManagerSub;
}
