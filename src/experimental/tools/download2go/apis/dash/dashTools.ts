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
  AsyncSubject,
  combineLatest,
  Observable,
  Observer,
  of,
  ReplaySubject,
} from "rxjs";
import {
  distinctUntilChanged,
  distinctUntilKeyChanged,
  mergeMap,
  tap,
} from "rxjs/operators";
import find from "../../../../../utils/array_find";

import { makeHTTPRequest, SegmentConstuctionError } from "../../utils";
import { buildInitIndexSegment } from "./dashConnectivity";

import { ISegment } from "../../../../../manifest";
import { getSegmentsFromSidx } from "../../../../../parsers/containers/isobmff";
import { IParsedRepresentation } from "../../../../../parsers/manifest/types";
import {
  IProgressBarBuilderAbstract,
  IUtils,
  videoSettingsQualityInputType,
} from "../../types";
import {
  IDownloadManagerOutput,
  ILocalManifestOnline,
  Quality,
  SegmentIndex,
} from "../dash/types";
import { TypedArray } from "../drm/keySystems";

/**
 * A tool function to choose quality depending of what we receive
 *
 * @remarks
 * This function, try to define what quality we should use by either:
 * - determining the exact quality we want
 * - determine the quality by telling to get the HIGHEST, MEDIUM or LOWEST quality
 *
 * @param IParsedRepresentation[] - The representation video of the current
 * parsed dash content
 * @param currentTypeAdaptation - The current type of the adapation we are currently on.
 * @param quality - The quality we want to choose, either a exact number or
 * HIGH,MEDIUM,LOW
 * @returns The representation that correspond to the quality wanted
 *
 */
export const chooseVideoQuality = (
  representations: IParsedRepresentation[],
  currentTypeAdaptation: string,
  quality: [number, number] | videoSettingsQualityInputType
): IParsedRepresentation[] => {
  if (currentTypeAdaptation !== "video") {
    return representations;
  }

  if (!representations || representations.length === 0) {
    throw new SegmentConstuctionError("No representations video found");
  }

  if (Array.isArray(quality)) {
    const [widthWanted, heightWanted] = quality;
    const reprensentationQuality = find(
      representations,
      ({ width, height }) => width === widthWanted && height === heightWanted
    );
    if (reprensentationQuality) {
      return [reprensentationQuality];
    }
  }

  const sortedRepresentationsByDESC = representations.sort(
    (a: IParsedRepresentation, b: IParsedRepresentation) =>
      b.height && a.height ? b.height - a.height : 0
  );
  switch (quality) {
    case Quality.HIGH:
      return [sortedRepresentationsByDESC[0]];
    case Quality.MEDIUM:
      return [
        sortedRepresentationsByDESC[
          Math.floor(sortedRepresentationsByDESC.length / 2)
        ],
      ];
    case Quality.LOW:
      return [
        sortedRepresentationsByDESC[sortedRepresentationsByDESC.length - 1],
      ];
    default:
      return [
        sortedRepresentationsByDESC[
          Math.floor(sortedRepresentationsByDESC.length / 2)
        ],
      ];
  }
};

export const getBaseSegments = async (
  Segment: ISegment
): Promise<SegmentIndex> => {
  const { indexRange, range, mediaURL, duration = 0 } = Segment;
  if (indexRange && range) {
    const { initSegment, indexSegment } = await buildInitIndexSegment({
      initialization: { range, mediaURL },
      segmentBase: { indexRange },
    });
    const dataInit = concatBytes(
      new Uint8Array(initSegment),
      new Uint8Array(indexSegment)
    );
    const nextSegmentsRanges = getSegmentsFromSidx(
      dataInit,
      indexRange ? indexRange[0] : 0
    );
    return {
      dataInit,
      duration,
      mediaURL,
      nextSegmentsRanges,
      type: "BaseRepresentationIndex",
    };
  } else {
    const dataInit = await makeHTTPRequest<TypedArray | ArrayBuffer>(
      mediaURL || "",
      {
        method: "GET",
        responseType: "arraybuffer",
      }
    );
    return {
      dataInit,
      mediaURL,
      type: "TemplateRepresentationIndex",
    };
  }
};

/**
 * A tool function that is used to concat the initSegment buffer
 * and indexSegment buffer together to create the SIDX.
 *
 * @param tabs - An array of Uint8Array buffer
 * @returns The concatenated initSegment/indexSegment buffer
 *
 */
export function concatBytes(...args: Uint8Array[]): Uint8Array {
  const totalLengthBuffers = args.reduce(
    (acc, buffer) => acc + buffer.byteLength,
    0
  );
  const concatBuffer = args.reduce(
    (acc, buffer) => {
      if (buffer.byteLength > 0) {
        acc.newBuffer.set(buffer, acc.offset);
        acc.offset += buffer.byteLength;
        return acc;
      }
      return acc;
    },
    { newBuffer: new Uint8Array(totalLengthBuffers), offset: 0 }
  );
  return concatBuffer.newBuffer;
}

/**
 * A tool function that is used to filter depending
 * on a callback but also permit to emit immediately of the given subject is emiting.
 *
 * @param (value) => boolean - a callback that should return a boolean
 * @param AsyncSubject - An AsyncSubject that wait a single emission
 * @returns Observable source
 *
 */
export function takeUntilFilter<V, T>(
  shouldEmit: (value: [V, T]) => boolean,
  pause$: AsyncSubject<void>
) {
  let i = 0;
  return (source: Observable<[V, T]>): Observable<[V, T]> => {
    return new Observable<[V, T]>(obs => {
      const subscription = source.subscribe(
        value => {
          try {
            pause$.subscribe(() => {
              if (i === 0) {
                obs.next(value);
                i += 1;
              }
            });
            if (shouldEmit(value)) {
              obs.next(value);
              return;
            }
          } catch (err) {
            obs.error(err);
          }
        },
        err => obs.error(err),
        () => obs.complete()
      );

      return subscription;
    });
  };
}

/**
 * An operator that take a Observable in parameter that
 * is emitting a progress status. Then, decide when to emit next manifest.
 *
 * @param progress$ - An Observable under the form ProgressBarBuilder type
 * @returns - An Observable
 *
 */
export function emitEveryNth(
  progress$: ReplaySubject<IProgressBarBuilderAbstract>,
  utilsBuilder: IUtils,
  contentID: string,
  pause$: AsyncSubject<void>
) {
  return (
    source$: Observable<ILocalManifestOnline>
  ): Observable<IDownloadManagerOutput> => {
    const { storeManifestEvery, emitter } = utilsBuilder;
    return new Observable((obs: Observer<IDownloadManagerOutput>) => {
      const progressFiltered$ = progress$.pipe(
        mergeMap(({ progress, ...props }) =>
          of({
            progress:
              progress > 98 && progress < 100 ? progress : Math.round(progress),
            ...props,
          })
        ),
        distinctUntilKeyChanged("progress")
      );
      return combineLatest([source$, progressFiltered$])
        .pipe(
          distinctUntilChanged(
            (
              [_, { progress: prevProgress }],
              [__, { progress: currProgress }]
            ) => prevProgress === currProgress
          ),
          tap(builder => {
            const [, { status, progress, size }] = builder;
            emitter.trigger("progress", {
              contentID,
              progress,
              size,
              status,
            });
          }),
          takeUntilFilter(
            ([_, { progress }]) =>
              storeManifestEvery && typeof storeManifestEvery === "function"
                ? storeManifestEvery(progress) || progress === 100
                : progress % 10 === 0,
            pause$
          )
        )
        .subscribe(
          ([manifest, { progress, status, ...props }]) => {
            obs.next({
              manifest: { ...manifest, isFinished: progress === 100 },
              progress:
                (props.progressBarBuilder.progress /
                  props.progressBarBuilder.overall) *
                100,
              ...props,
            });
          },
          err => obs.error(err),
          () => obs.complete()
        );
    });
  };
}
