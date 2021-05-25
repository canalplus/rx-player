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
  Observable,
  of as observableOf,
  ReplaySubject,
  Subscription,
  merge as observableMerge,
  Subject,
} from "rxjs";
import {
  filter,
  map,
  mapTo,
  mergeMap,
  tap,
} from "rxjs/operators";
import {
  ISegmentLoaderContent,
  ISegmentLoaderEvent,
} from "../../../core/fetchers/segment/create_segment_loader";
import { AudioVideoSegmentBuffer } from "../../../core/segment_buffers/implementations";
import { ISegment } from "../../../manifest";
import prepareSourceBuffer from "./prepare_source_buffer";
import {
  IContentInfos,
  IThumbnailLoaderSegmentParser,
} from "./types";

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
                             segmentParser: IThumbnailLoaderSegmentParser,
                             segmentLoader: (
                               x : ISegmentLoaderContent
                             ) => Observable<ISegmentLoaderEvent<Uint8Array |
                                                                 ArrayBuffer |
                                                                 null>>) {
  const inventoryInfos = { manifest: contentInfos.manifest,
                           period: contentInfos.period,
                           adaptation: contentInfos.adaptation,
                           representation: contentInfos.representation,
                           segment: initSegment };
  return segmentLoader(inventoryInfos).pipe(
    filter((evt): evt is { type: "data"; value: { responseData: Uint8Array } } =>
      evt.type === "data"),
    mergeMap((evt) => {
      return segmentParser({
        response: {
          data: evt.value.responseData,
          isChunked: false,
        },
        content: inventoryInfos,
      }).pipe(
        mergeMap((parserEvent) => {
          if (parserEvent.type !== "parsed-init-segment") {
            return EMPTY;
          }
          const { initializationData } = parserEvent.value;
          const initSegmentData = initializationData instanceof ArrayBuffer ?
            new Uint8Array(initializationData) : initializationData;
          return sourceBuffer
            .pushChunk({ data: { initSegment: initSegmentData,
                                 chunk: null,
                                 appendWindow: [undefined, undefined],
                                 timestampOffset: 0,
                                 codec: contentInfos
                                   .representation.getMimeTypeString() },
                         inventoryInfos: null });
        })
      );
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
  { segmentLoader,
    segmentParser }: {
    segmentLoader: (
      x : ISegmentLoaderContent
    ) => Observable<ISegmentLoaderEvent<Uint8Array |
                                        ArrayBuffer |
                                        null>>;
    segmentParser: IThumbnailLoaderSegmentParser;
  }
): Observable<AudioVideoSegmentBuffer> {
  if (hasAlreadyPushedInitData(contentInfos)) {
    return sourceBuffer$;
  }

  const { representation } = contentInfos;
  const mediaSourceError$ = new Subject();

  if (mediaSourceSubscription === undefined) {
    mediaSourceSubscription =
      prepareSourceBuffer(element, representation.getMimeTypeString())
        .subscribe(
          (sourceBuffer) => sourceBuffer$.next(sourceBuffer),
          (err: Error) => {
            mediaSourceError$.next(
              new Error("VideoThumbnailLoaderError: Error when creating" +
                      " media source or source buffer: " + err.toString())
            );
          }
        );
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
                                 segmentParser,
                                 segmentLoader)
        .pipe(mapTo(sourceBuffer));
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
