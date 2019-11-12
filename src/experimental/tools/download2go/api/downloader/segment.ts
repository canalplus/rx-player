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

import findIndex from "../../../../../utils/array_find_index";
import { concat, strToBytes } from "../../../../../utils/byte_parsing";

import { createBox } from "../../../../../parsers/containers/isobmff";
import { IndexDBError } from "../../utils";
import { ContentType } from "../context/types";
import {
  ContentVideoType,
  IAbstractContextCreation,
  IContext,
  IContextRicher,
  ICustomSegment,
  IGlobalContext,
  IInitGroupedSegments,
  IManifestDBState,
  ISegmentPipelineContext,
  IUtils,
} from "./types";

/**
 * Download a segment associated with a context.
 *
 * @remarks
 * We are downloading the segment 3 by 3 for now.
 * It's something that will look soon.
 *
 * @param IContext[] - An array of context we have to download.
 * > It's possibly a number, when the segment has already been download
 * @param KeyContextType - Tell what type of buffer it is (VIDEO/AUDIO/TEXT).
 * @returns ICustomSegment - An Object of the downloaded segment.
 *
 */
export function handleSegmentPipelineFromContexts<
  KeyContextType extends keyof Omit<IGlobalContext, "manifest">
>(
  ctxs: IContext[],
  contentType: KeyContextType,
  {
    segmentPipelinesManager,
    isInitData,
    nextSegments,
    progress,
    type,
  }: ISegmentPipelineContext
): Observable<ICustomSegment> {
  const segmentFetcherForCurrentContentType = segmentPipelinesManager.createPipeline(
    contentType,
    new Subject()
  );
  return of(...ctxs).pipe(
    mergeMap(
      (ctx, index) => {
        if (typeof ctx.segment === "number") {
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
          reduce((acc, { chunkData }) => {
            if (chunkData === null) {
              return acc;
            }
            if (
              contentType === ContentType.TEXT &&
              ctx.representation.mimeType &&
              ctx.representation.mimeType === "application/mp4"
            ) {
              return concat(
                acc,
                createBox("moof", new Uint8Array(0)),
                createBox("mdat", strToBytes(chunkData.data))
              );
            }
            return concat(acc, chunkData);
          }, new Uint8Array(0)),
          map(chunkData => {
            if (nextSegments && !isInitData) {
              (nextSegments[index] as any) = ctx.segment.time;
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
  contentType: ContentVideoType,
  {
    type,
    progress,
    segmentPipelinesManager,
    manifest,
  }: IAbstractContextCreation
) {
  return of(...contextsRicher).pipe(
    mergeMap<IContextRicher, Observable<ICustomSegment>>(contextRicher => {
      const { nextSegments, ...ctx } = contextRicher;
      return handleSegmentPipelineFromContexts(
        nextSegments.map(segment => ({ ...ctx, segment, manifest })),
        contentType,
        {
          type,
          progress,
          nextSegments,
          segmentPipelinesManager,
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
 * - It also store each segment downloaded in IndexDB.
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
        segmentPipelinesManager,
        manifest,
        progress,
        type,
      }) => {
        if (manifest == null || segmentPipelinesManager == null) {
          return EMPTY;
        }
        return merge(
          handleAbstractSegmentPipelineContextFor(video, ContentType.VIDEO, {
            type,
            progress,
            segmentPipelinesManager,
            manifest,
          }),
          handleAbstractSegmentPipelineContextFor(audio, ContentType.AUDIO, {
            type,
            progress,
            segmentPipelinesManager,
            manifest,
          }),
          handleAbstractSegmentPipelineContextFor(text, ContentType.AUDIO, {
            type,
            progress,
            segmentPipelinesManager,
            manifest,
          })
        );
      }
    ),
    tap(({ chunkData, representationID, ctx, contentType }) => {
      const { time, timescale, duration } = ctx.segment;
      db.put("segments", {
        contentID,
        contentType,
        representationID,
        segmentKey: `${time}--${representationID}`,
        time,
        timescale,
        duration,
        isInitData: false,
        data: chunkData,
        size: chunkData.byteLength,
      }).catch((err) => {
        throw new IndexDBError(`
          ${contentID}: Impossible
          to store the current segment (${contentType}) at ${time}: ${err.message}
        `);
      });
    }),
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
        if (progress) {
          acc.progress.overall = progress.overall;
        }
        acc.progress.current += 1;
        const percentage = (acc.progress.current / acc.progress.overall) * 100;
        acc.progress.percentage =
          percentage > 98 && percentage < 100
            ? percentage
            : Math.round(percentage);
        acc.size += chunkData.byteLength;
        if (!nextSegments) {
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
