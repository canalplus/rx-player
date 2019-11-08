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

import { of, merge } from "rxjs";
import { map, mergeMap, tap, reduce } from "rxjs/operators";
import { IInitSettings } from "../../types";
import { manifestLoader } from "./manifest";
import { handleSegmentPipelineFromContexts } from "./segment";
import { SegmentPipelinesManager } from "../../../../../core/pipelines";
import ContentManager from "../transports/ContentsManager";
import { IInitSegment, IInitGroupedSegments } from "./types";
import { IDBPDatabase } from "idb";
import { ContentType } from "../transports/types";

/**
 * A subscription manager that take care to choose between a start and a resume download
 *
 * @param IDownloaderManagerAbstract - Download manager need
 * @param IUtils- Some variables we need to emit and insert in DB
 * @returns The Subscription
 *
 */
export function initDownloader$(
  { contentID, url, adv, transport }: IInitSettings,
  db: IDBPDatabase<unknown>,
) {
  return manifestLoader(url, transport).pipe(
    mergeMap(({ manifest, transportPipelines }) => {
      const segmentPipelinesManager = new SegmentPipelinesManager<any>(
        transportPipelines,
        {
          lowLatencyMode: false,
        },
      );
      const contentManager = new ContentManager(
        manifest,
        adv ? adv.quality : undefined,
      );
      return of(contentManager.getContextsForCurrentSession()).pipe(
        mergeMap(globalCtx => {
          const { video, audio, text } = contentManager.getContextsFormatted(
            globalCtx,
          );
          return merge(
            handleSegmentPipelineFromContexts(video, ContentType.VIDEO, {
              segmentPipelinesManager,
              isInitData: true,
              type: "start",
            }).pipe(
              tap(values => {
                const { id: representationID } = values.ctx.representation;
                const { time, timescale, duration } = values.ctx.segment;
                db.put("segments", {
                  contentID,
                  contentType: ContentType.VIDEO,
                  representationID,
                  segmentKey: `${time}--${representationID}--init--${ContentType.VIDEO}`,
                  time,
                  timescale,
                  duration,
                  isInitData: true,
                  data: values.chunkData,
                  size: values.chunkData.byteLength,
                });
              }),
              map(({ ctx }) => {
                const durationForCurrentPeriod = ctx.period.duration;
                if (durationForCurrentPeriod === undefined) {
                  throw new Error("Impossible to get future video segments");
                }
                const nextSegments = ctx.representation.index.getSegments(
                  0,
                  durationForCurrentPeriod,
                );
                return {
                  nextSegments,
                  ctx,
                  segmentPipelinesManager,
                  contentType: ContentType.VIDEO,
                };
              }),
            ),
            handleSegmentPipelineFromContexts(audio, ContentType.AUDIO, {
              segmentPipelinesManager,
              isInitData: true,
              type: "start",
            }).pipe(
              tap(values => {
                const { id: representationID } = values.ctx.representation;
                const { time, timescale, duration } = values.ctx.segment;
                db.put("segments", {
                  contentID,
                  contentType: ContentType.AUDIO,
                  representationID,
                  segmentKey: `${time}--${representationID}--init--${ContentType.AUDIO}`,
                  time,
                  timescale,
                  duration,
                  isInitData: true,
                  data: values.chunkData,
                  size: values.chunkData.byteLength,
                });
              }),
              map(({ ctx }) => {
                const durationForCurrentPeriod = ctx.period.duration;
                if (durationForCurrentPeriod === undefined) {
                  throw new Error("Impossible to get future video segments");
                }
                const nextSegments = ctx.representation.index.getSegments(
                  0,
                  durationForCurrentPeriod,
                );
                return {
                  nextSegments,
                  ctx,
                  segmentPipelinesManager,
                  contentType: ContentType.AUDIO,
                };
              }),
            ),
            handleSegmentPipelineFromContexts(text, ContentType.TEXT, {
              segmentPipelinesManager,
              isInitData: true,
              type: "start",
            }).pipe(
              tap(values => {
                const { id: representationID } = values.ctx.representation;
                const { time, timescale, duration } = values.ctx.segment;
                db.put("segments", {
                  contentID,
                  contentType: ContentType.TEXT,
                  representationID,
                  segmentKey: `${time}--${representationID}--init--${ContentType.TEXT}`,
                  time,
                  timescale,
                  duration,
                  isInitData: true,
                  data: values.chunkData,
                  size: values.chunkData.byteLength,
                });
              }),
              map(({ ctx }) => {
                const durationForCurrentPeriod = ctx.period.duration;
                if (durationForCurrentPeriod === undefined) {
                  throw new Error("Impossible to get future video segments");
                }
                const nextSegments = ctx.representation.index.getSegments(
                  0,
                  durationForCurrentPeriod,
                );
                return {
                  nextSegments,
                  ctx,
                  segmentPipelinesManager,
                  contentType: ContentType.TEXT,
                };
              }),
            ),
          );
        }),
      );
    }),
    reduce<IInitSegment, IInitGroupedSegments>(
      (
        acc,
        {
          nextSegments,
          ctx: { period, adaptation, representation, manifest },
          contentType,
          segmentPipelinesManager,
        },
      ) => {
        acc.progress.overall += nextSegments.length;
        acc[contentType].push({
          nextSegments,
          period,
          adaptation,
          representation,
          id: representation.id as string,
        });
        return { ...acc, segmentPipelinesManager, manifest };
      },
      {
        progress: { percentage: 0, current: 0, overall: 0 },
        video: [],
        audio: [],
        text: [],
        segmentPipelinesManager: null,
        manifest: null,
        type: "start",
      },
    ),
  );
}
