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
  combineLatest,
  merge,
  Observable,
  Observer,
  of,
  ReplaySubject,
} from "rxjs";
import {
  distinctUntilChanged,
  distinctUntilKeyChanged,
  filter,
  mergeMap,
  share,
  tap,
  withLatestFrom,
} from "rxjs/operators";
import find from "../../../../../utils/array_find";

import { SegmentConstuctionError } from "../../utils";

import { IParsedRepresentation } from "../../../../../parsers/manifest/types";
import {
  IProgressBarBuilderAbstract,
  IUtils,
  IVideoSettingsQualityInputType,
} from "../../types";
import {
  IDownloadManagerOutput,
  ILocalManifestOnline,
  Quality,
} from "../dash/types";

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
  quality: [number, number] | IVideoSettingsQualityInputType
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
      const builder$ = combineLatest([source$, progressFiltered$]).pipe(
        distinctUntilChanged(
          ([_, { progress: prevProgress }], [__, { progress: currProgress }]) =>
            prevProgress === currProgress
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
        share()
      );
      merge(
        builder$.pipe(
          filter(([_, { progress }]) =>
            storeManifestEvery && typeof storeManifestEvery === "function"
              ? storeManifestEvery(progress) || progress === 100
              : progress % 10 === 0
          )
        ),
        pause$
      )
        .pipe(withLatestFrom(builder$))
        .subscribe(
          ([_, [manifest, { progress, status, ...props }]]) => {
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
