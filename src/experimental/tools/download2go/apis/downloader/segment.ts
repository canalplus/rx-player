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

import { merge, Observable, Subject, EMPTY, of } from "rxjs";
import { mergeMap, tap, map, reduce, scan, takeUntil } from "rxjs/operators";
import { concat, strToBytes } from "../../../../../utils/byte_parsing";
import {
  IUtils,
  IManifestDBState,
  ICustomSegment,
  IGlobalContext,
  IContext,
  IContextRicher,
  ISegmentPipelineContext,
  ContentVideoType,
  DownloadType,
} from "./types";
import { createBox } from "../../../../../parsers/containers/isobmff";
import Manifest from "../../../../../manifest";
import { IInitGroupedSegments } from "./types";
import { IProgressBuilder } from "../../types";
import { SegmentPipelinesManager } from "../../../../../core/pipelines";
import { ContentType } from "../transports/types";

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
  }: ISegmentPipelineContext,
): Observable<ICustomSegment> {
  const segmentFetcherForCurrentContentType = segmentPipelinesManager.createPipeline(
    contentType,
    new Subject(),
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
                createBox("mdat", strToBytes(chunkData.data)),
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
          }),
        );
      },
      3, // TODO: See If we limit the number of concurrent request at the same time.
    ),
  );
}

function handleAbstractSegmentPipelineContextFor(
  contextsRicher: IContextRicher[],
  contentType: ContentVideoType,
  {
    type,
    progress,
    segmentPipelinesManager,
    manifest,
  }: {
    type: DownloadType;
    progress: IProgressBuilder;
    segmentPipelinesManager: SegmentPipelinesManager<any>;
    manifest: Manifest;
  },
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
        },
      );
    }),
  );
}

export function segmentPipelineDownloader$(
  builderObs$: Observable<IInitGroupedSegments>,
  builderInit: IManifestDBState,
  { contentID, emitter, pause$, db }: IUtils,
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
          }),
        );
      },
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
        },
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
        const indexRepresentation = acc[contentType].findIndex(
          ({ representation }) => representation.id === representationID,
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
      builderInit,
    ),
    tap(({ size, progress }) => {
      emitter.trigger("progress", {
        contentID,
        progress: progress.percentage,
        size,
        status: "downloading",
      });
    }),
    takeUntil(pause$),
  );
}
