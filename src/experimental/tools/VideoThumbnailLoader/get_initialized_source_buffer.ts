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
  EMPTY,
  map,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  ReplaySubject,
  Subject,
  Subscription,
  tap,
} from "rxjs";
import { ISegmentFetcher } from "../../../core/fetchers/segment/segment_fetcher";
import { AudioVideoSegmentBuffer } from "../../../core/segment_buffers/implementations";
import { ISegment } from "../../../manifest";
import fromCancellablePromise from "../../../utils/rx-from_cancellable_promise";
import TaskCanceller from "../../../utils/task_canceller";
import prepareSourceBuffer from "./prepare_source_buffer";
import { IContentInfos } from "./types";

let mediaSourceSubscription: Subscription | undefined;
let sourceBufferContent: IContentInfos | undefined;

let sourceBuffer$: ReplaySubject<AudioVideoSegmentBuffer> =
  new ReplaySubject();

/**
 * Check if new content is the same from the already pushed init data
 * content
 * @param {Object} contentInfos
 * @returns {Boolean}
 */
function hasAlreadyPushedInitData(contentInfos: IContentInfos): boolean {
  if (sourceBufferContent === undefined) {
    return false;
  }
  const initSegment = contentInfos.representation.index.getInitSegment();
  const currentInitSegmentId =
    sourceBufferContent.representation.index.getInitSegment()?.id;
  return (currentInitSegmentId === initSegment?.id &&
          contentInfos.representation.id === sourceBufferContent.representation.id &&
          contentInfos.adaptation.id === sourceBufferContent.adaptation.id &&
          contentInfos.period.id === sourceBufferContent.period.id &&
          contentInfos.manifest.id === sourceBufferContent.manifest.id);
}

/**
 * @param {Object} contentInfos
 * @param {Object} initSegment
 * @param {Object} sourceBuffer
 * @param {Function} segmentParser
 * @param {Function} segmentLoader
 * @returns {Object}
 */
function loadAndPushInitData(contentInfos: IContentInfos,
                             initSegment: ISegment,
                             sourceBuffer: AudioVideoSegmentBuffer,
                             segmentFetcher: ISegmentFetcher<ArrayBuffer | Uint8Array>) {
  const segmentInfos = { manifest: contentInfos.manifest,
                         period: contentInfos.period,
                         adaptation: contentInfos.adaptation,
                         representation: contentInfos.representation,
                         segment: initSegment };
  return segmentFetcher(segmentInfos).pipe(
    mergeMap((evt) => {
      if (evt.type !== "chunk") {
        return EMPTY;
      }
      const parsed = evt.parse();
      if (parsed.segmentType !== "init") {
        return EMPTY;
      }
      const { initializationData } = parsed;
      const initSegmentData = initializationData instanceof ArrayBuffer ?
        new Uint8Array(initializationData) :
        initializationData;

      const pushCanceller = new TaskCanceller();
      return fromCancellablePromise(pushCanceller, () => sourceBuffer
        .pushChunk({ data: { initSegment: initSegmentData,
                             chunk: null,
                             appendWindow: [undefined, undefined],
                             timestampOffset: 0,
                             codec: contentInfos
                               .representation.getMimeTypeString() },
                     inventoryInfos: null },
                   pushCanceller.signal));
    })
  );
}

/**
 * Get video source buffer :
 * - If it is already created for the media element, then reuse it.
 * - Else, create a new one and load and append the init segment.
 * @param {Object} contentInfos
 * @param {HTMLVideoElement} element
 * @returns {Observable}
 */
export function getInitializedSourceBuffer$(
  contentInfos: IContentInfos,
  element: HTMLVideoElement,
  segmentFetcher : ISegmentFetcher<ArrayBuffer | Uint8Array>
): Observable<AudioVideoSegmentBuffer> {
  if (hasAlreadyPushedInitData(contentInfos)) {
    return sourceBuffer$;
  }

  const { representation } = contentInfos;
  const mediaSourceError$ = new Subject();

  if (mediaSourceSubscription === undefined) {
    mediaSourceSubscription =
      prepareSourceBuffer(element, representation.getMimeTypeString())
        .subscribe({
          next: (sourceBuffer) => sourceBuffer$.next(sourceBuffer),
          error: (err: Error) => {
            mediaSourceError$.next(
              new Error("VideoThumbnailLoaderError: Error when creating" +
                      " media source or source buffer: " + err.toString())
            );
          },
        });
  }

  return observableMerge(sourceBuffer$,
                         mediaSourceError$.pipe(map((err) => { throw err; }))
  ).pipe(
    mergeMap((sourceBuffer) => {
      const initSegment = representation.index.getInitSegment();
      if (initSegment === null) {
        return observableOf(sourceBuffer);
      }
      return loadAndPushInitData(contentInfos,
                                 initSegment,
                                 sourceBuffer,
                                 segmentFetcher)
        .pipe(map(() => sourceBuffer));
    }),
    tap(() => { sourceBufferContent = contentInfos; })
  );
}

/**
 * Reset the source buffers
 * @returns {void}
 */
export function disposeMediaSource(): void {
  sourceBufferContent = undefined;
  if (mediaSourceSubscription !== undefined) {
    mediaSourceSubscription.unsubscribe();
  }
  mediaSourceSubscription = undefined;
  sourceBuffer$ = new ReplaySubject();
}
