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

import { EMPTY, merge, Observable, of, Subject } from "rxjs";
import { map, mergeMap, reduce, scan, takeUntil, tap } from "rxjs/operators";

import { ISegmentParserResponse } from "../../../../../transports";
import find from "../../../../../utils/array_find";
import findIndex from "../../../../../utils/array_find_index";
import { concat, strToBytes } from "../../../../../utils/byte_parsing";

import { createBox } from "../../../../../parsers/containers/isobmff";
import { IndexedDBError } from "../../utils";
import { ContentType } from "../context/types";
import {
  ContentBufferType,
  IAbstractContextCreation,
  IContext,
  IContextRicher,
  ICustomSegment,
  IGlobalContext,
  IInitGroupedSegments,
  IManifestDBState,
  ISegmentData,
  ISegmentPipelineContext,
  IUtils
} from "./types";

/**
 * Download a segment associated with a context.
 *
 * @remarks
 * We are downloading the segment 3 by 3 for now.
 * It's something that will look soon.
 *
 * @param {IContext[]} ctxs An array of segments context to download.
 * > It's possibly a number, when the segment context has already been download
 * @param {KeyContextType} contentType Tell what type of buffer it is (VIDEO/AUDIO/TEXT).
 * @param {ISegmentPipelineContext} - Segment pipeline context, values that are redundant.
 * @returns {Observable<ICustomSegment>} - An observable of a downloaded segments context.
 *
 */
export function handleSegmentPipelineFromContexts<
  KeyContextType extends keyof Omit<IGlobalContext, "manifest">
>(
  ctxs: IContext[],
  contentType: KeyContextType,
  {
    segmentPipelineCreator,
    isInitData,
    nextSegments,
    progress,
    type,
  }: ISegmentPipelineContext
): Observable<ICustomSegment> {
  const segmentFetcherForCurrentContentType = segmentPipelineCreator.createPipeline(
    contentType,
    new Subject()
  );
  return of(...ctxs).pipe(
    mergeMap(
      (ctx, index) => {
        if (Array.isArray(ctx.segment)) {
          return EMPTY;
        }
        return segmentFetcherForCurrentContentType.createRequest(ctx).pipe(
          mergeMap(evt => {
            switch (evt.type) {
              case "chunk":
                return evt.parse();
              default:
                return EMPTY;
            }
          }),
          reduce<ISegmentParserResponse<Uint8Array | string>, ISegmentData>(
            (acc, currSegparserResp) => {
              // For init segment...
              if (currSegparserResp.type === "parsed-init-segment") {
                const {
                  initializationData,
                  segmentProtections,
                } = currSegparserResp.value;
                if (
                  acc.contentProtection === undefined &&
                  segmentProtections !== null
                ) {
                  acc.contentProtection = new Uint8Array(0);
                }
                if (currSegparserResp.value.initializationData === null) {
                  return acc;
                }
                // create segment init concatened with segment protection cenc.
                if (
                  acc.contentProtection !== undefined &&
                  segmentProtections !== null &&
                  segmentProtections.length > 0
                ) {
                  const cencContentProtection = find(
                    segmentProtections,
                    segmentProtection => segmentProtection.type === "cenc"
                  )?.data;
                  if (cencContentProtection !== undefined) {
                    return {
                      data: concat(acc.data, initializationData as Uint8Array),
                      contentProtection: concat(
                        acc.contentProtection,
                        cencContentProtection
                      ),
                    };
                  }
                }
                return {
                  ...acc,
                  data: concat(acc.data, initializationData as Uint8Array),
                };
              }
              // For simple segment
              const { chunkData } = currSegparserResp.value;
              if (chunkData === null) {
                return acc;
              }
              if (
                contentType === ContentType.TEXT &&
                ctx.representation.mimeType !== undefined &&
                ctx.representation.mimeType === "application/mp4"
              ) {
                return {
                  data: concat(
                    acc.data,
                    createBox("moof", new Uint8Array(0)),
                    // May be chunkData.data for subtitles...
                    createBox("mdat", strToBytes(chunkData as string))
                  ),
                };
              }
              return {
                data: concat(acc.data, chunkData as Uint8Array),
              };
            },
            { data: new Uint8Array(0) }
          ),
          map(chunkData => {
            if (nextSegments !== undefined && !isInitData) {
              (nextSegments[index] as any) = [
                ctx.segment.time,
                ctx.segment.timescale,
                ctx.segment.duration,
              ];
            }
            return {
              chunkData,
              progress,
              type,
              contentType,
              ctx,
              index,
              isInitData,
              nextSegments,
              representationID: ctx.representation.id as string,
            };
          })
        );
      },
      3 // TODO: See If we limit the number of concurrent request at the same time.
    )
  );
}

/**
 * An Util function that abstract a redundant operation that consist
 * to create the different context depending a segment.
 *
 * @param IContextRicher[] - Array of IContext with few field added to it.
 * @param KeyContextType - Tell what type of buffer it is (VIDEO/AUDIO/TEXT).
 * @param IAbstractContextCreation - Usefull arguments we need to build
 * the IContext array.
 * @returns ICustomSegment - An Object of the downloaded segment.
 *
 */
function handleAbstractSegmentPipelineContextFor(
  contextsRicher: IContextRicher[],
  contentType: ContentBufferType,
  { type, progress, segmentPipelineCreator, manifest }: IAbstractContextCreation
) {
  return of(...contextsRicher).pipe(
    mergeMap(contextRicher => {
      const { nextSegments, ...ctx } = contextRicher;
      return handleSegmentPipelineFromContexts(
        nextSegments.map(segment => ({ ...ctx, segment, manifest })),
        contentType,
        {
          type,
          progress,
          nextSegments,
          segmentPipelineCreator,
          isInitData: false,
        }
      );
    })
  );
}

/**
 * The top level function downloader that should start the pipeline of
 * download for each buffer type (VIDEO/AUDIO/TEXT).
 *
 * @remarks
 * - It also store each segment downloaded in IndexedDB.
 * - Add the segment in the ProgressBarBuilder.
 * - Emit a global progress when a segment has been downloaded.
 * - Eventually, wait an event of the pause$ Subject to put the download in pause.
 *
 * @param Observable<IInitGroupedSegments> - A Observable that carry
 * all the data we need to start the download.
 * @param IManifestDBState - The current builder state of the download.
 * @param IUtils - Usefull tools to store/emit/pause the current content of the download.
 * @returns IManifestDBState - The state of the Manifest at the X time in the download.
 *
 */
export function segmentPipelineDownloader$(
  builderObs$: Observable<IInitGroupedSegments>,
  builderInit: IManifestDBState,
  { contentID, emitter, pause$, db }: IUtils
): Observable<IManifestDBState> {
  return builderObs$.pipe(
    mergeMap(
      ({
        video,
        audio,
        text,
        segmentPipelineCreator,
        manifest,
        progress,
        type,
      }) => {
        if (manifest == null || segmentPipelineCreator == null) {
          return EMPTY;
        }
        return merge(
          handleAbstractSegmentPipelineContextFor(video, ContentType.VIDEO, {
            type,
            progress,
            segmentPipelineCreator,
            manifest,
          }),
          handleAbstractSegmentPipelineContextFor(audio, ContentType.AUDIO, {
            type,
            progress,
            segmentPipelineCreator,
            manifest,
          }),
          handleAbstractSegmentPipelineContextFor(text, ContentType.TEXT, {
            type,
            progress,
            segmentPipelineCreator,
            manifest,
          })
        );
      }
    ),
    tap(
      ({
        chunkData,
        representationID,
        ctx: {
          segment: { time, timescale },
        },
        contentType,
      }) => {
        const timeScaled = (time / timescale) * 1000;
        db.put("segments", {
          contentID,
          segmentKey: `${timeScaled}--${representationID}--${contentID}`,
          data: chunkData.data,
          size: chunkData.data.byteLength,
        }).catch((err: Error) => {
          throw new IndexedDBError(`
          ${contentID}: Impossible
          to store the current segment (${contentType}) at ${timeScaled}: ${err.message}
        `);
        });
      }
    ),
    scan<ICustomSegment, IManifestDBState>(
      (
        acc,
        {
          progress,
          ctx,
          contentType,
          nextSegments,
          representationID,
          chunkData,
        }
      ) => {
        if (progress !== undefined) {
          acc.progress.totalSegments = progress.totalSegments;
        }
        acc.progress.segmentsDownloaded += 1;
        const percentage =
          (acc.progress.segmentsDownloaded / acc.progress.totalSegments) * 100;
        acc.progress.percentage =
          percentage > 98 && percentage < 100
            ? percentage
            : Math.round(percentage);
        acc.size += chunkData.data.byteLength;
        if (nextSegments === undefined) {
          return acc;
        }
        const indexRepresentation = findIndex(
          acc[contentType],
          ({ representation }) => representation.id === representationID
        );
        if (indexRepresentation === -1) {
          acc[contentType].push({
            nextSegments,
            period: ctx.period,
            adaptation: ctx.adaptation,
            representation: ctx.representation,
            id: representationID,
          });
          return { ...acc, manifest: ctx.manifest };
        }
        acc[contentType][indexRepresentation] = {
          nextSegments,
          period: ctx.period,
          adaptation: ctx.adaptation,
          representation: ctx.representation,
          id: representationID,
        };
        return { ...acc, manifest: ctx.manifest };
      },
      builderInit
    ),
    tap(({ size, progress }) => {
      emitter.trigger("progress", {
        contentID,
        progress: progress.percentage,
        size,
        status: "downloading",
      });
    }),
    takeUntil(pause$)
  );
}
