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

import { IDBPDatabase } from "idb";
import { merge, of } from "rxjs";
import { map, mapTo, mergeMap, reduce, tap } from "rxjs/operators";

import { SegmentPipelinesManager } from "../../../../../core/pipelines";
import arrayIncludes from "../../../../../utils/array_includes";
import { IInitSettings } from "../../types";
import { IndexDBError, SegmentConstuctionError } from "../../utils";
import ContentManager from "../context/ContentsManager";
import { ContentType } from "../context/types";
import EMETransaction from "../drm/keySystems";
import { manifestLoader } from "./manifest";
import { handleSegmentPipelineFromContexts } from "./segment";
import { IInitGroupedSegments, IInitSegment } from "./types";

/**
 * This function take care of downloading the init segment for VIDEO/AUDIO/TEXT
 * buffer type.
 * Then, he also find out the nextSegments we have to download.
 *
 * @param IInitSettings - Argument we need to start the download.
 * @param IDBPDatabase - An instance of the IndexDB to store the init segment in base
 * @returns An observable
 *
 */
export function initDownloader$(
  { contentID, url, adv, transport, keySystems }: IInitSettings,
  db: IDBPDatabase
) {
  return manifestLoader(url, transport).pipe(
    mergeMap(({ manifest, transportPipelines }) => {
      const segmentPipelinesManager = new SegmentPipelinesManager<any>(
        transportPipelines,
        {
          lowLatencyMode: false,
        }
      );
      const contentManager = new ContentManager(
        manifest,
        adv ? adv.quality : undefined
      );
      return of(contentManager.getContextsForCurrentSession()).pipe(
        mergeMap(globalCtx => {
          const { video, audio, text } = contentManager.getContextsFormatted(
            globalCtx
          );
          return merge(
            handleSegmentPipelineFromContexts(video, ContentType.VIDEO, {
              segmentPipelinesManager,
              isInitData: true,
              type: "start",
            }),
            handleSegmentPipelineFromContexts(audio, ContentType.AUDIO, {
              segmentPipelinesManager,
              isInitData: true,
              type: "start",
            }),
            handleSegmentPipelineFromContexts(text, ContentType.TEXT, {
              segmentPipelinesManager,
              isInitData: true,
              type: "start",
            })
          );
        }),
        mergeMap(values => {
          if (
            arrayIncludes([ContentType.VIDEO, ContentType.AUDIO], values.contentType) &&
            keySystems &&
            Object.keys(keySystems).length > 0
          ) {
            const {
              ctx: { representation: { mimeType, codec } },
              contentType,
              chunkData,
            } = values;
            return EMETransaction(
              keySystems,
              {
                contentID,
                contentType,
                initSegment: chunkData,
                codec: `${mimeType};codecs="${codec}"`,
              },
              db
            ).pipe(mapTo(values));
          }
          return of(values);
        }),
        tap(({ ctx, chunkData, contentType }) => {
          const { id: representationID } = ctx.representation;
          const { time } = ctx.segment;
          db.put("segments", {
            contentID,
            segmentKey: `init--${representationID}--${contentID}`,
            data: chunkData,
            size: chunkData.byteLength,
          }).catch(err => {
            throw new IndexDBError(`
              ${contentID}: Impossible to store the current INIT
              segment (${contentType}) at ${time}: ${err.message}
            `);
          });
        }),
        map(({ ctx, contentType }) => {
          const durationForCurrentPeriod = ctx.period.duration;
          if (durationForCurrentPeriod === undefined) {
            throw new SegmentConstuctionError(`
              Impossible to get future video segments for ${contentType} buffer,
              the duration should be an valid integer but: ${durationForCurrentPeriod}
            `);
          }
          const nextSegments = ctx.representation.index.getSegments(
            0,
            durationForCurrentPeriod
          );
          return {
            nextSegments,
            ctx,
            segmentPipelinesManager,
            contentType,
          };
        })
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
        }
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
      }
    )
  );
}
