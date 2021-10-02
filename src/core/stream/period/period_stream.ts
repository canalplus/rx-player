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
  catchError,
  concat as observableConcat,
  defer as observableDefer,
  EMPTY,
  ignoreElements,
  map,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  ReplaySubject,
  startWith,
  switchMap,
} from "rxjs";
import config from "../../../config";
import {
  formatError,
  MediaError,
} from "../../../errors";
import log from "../../../log";
import Manifest, {
  Adaptation,
  Period,
} from "../../../manifest";
import objectAssign from "../../../utils/object_assign";
import { getLeftSizeOfRange } from "../../../utils/ranges";
import createSharedReference, {
  IReadOnlySharedReference,
} from "../../../utils/reference";
import { CancellationSignal } from "../../../utils/task_canceller";
import WeakMapMemory from "../../../utils/weak_map_memory";
import { IRepresentationEstimator } from "../../adaptive";
import { IReadOnlyPlaybackObserver } from "../../api";
import { SegmentFetcherCreator } from "../../fetchers";
import SegmentBuffersStore, {
  IBufferType,
  ITextTrackSegmentBufferOptions,
  SegmentBuffer,
} from "../../segment_buffers";
import AdaptationStream, {
  IAdaptationStreamOptions,
  IAdaptationStreamPlaybackObservation,
  IPausedPlaybackObservation,
} from "../adaptation";
import EVENTS from "../events_generators";
import reloadAfterSwitch from "../reload_after_switch";
import { IPositionPlaybackObservation } from "../representation";
import {
  IAdaptationChoice,
  IAdaptationStreamEvent,
  IPeriodStreamEvent,
  IRepresentationsChoice,
  IStreamWarningEvent,
} from "../types";
import createEmptyStream from "./create_empty_adaptation_stream";
import getAdaptationSwitchStrategy from "./get_adaptation_switch_strategy";


/** Playback observation required by the `PeriodStream`. */
export interface IPeriodStreamPlaybackObservation {
  /**
   * Information on whether the media element was paused at the time of the
   * Observation.
   */
  paused : IPausedPlaybackObservation;
  /**
   * Information on the current media position in seconds at the time of the
   * Observation.
   */
  position : IPositionPlaybackObservation;
  /** `duration` property of the HTMLMediaElement. */
  duration : number;
  /** `readyState` property of the HTMLMediaElement. */
  readyState : number;
  /** Target playback rate at which we want to play the content. */
  speed : number;
  /** Theoretical maximum position on the content that can currently be played. */
  maximumPosition : number;
}

/** Arguments required by the `PeriodStream`. */
export interface IPeriodStreamArguments {
  bufferType : IBufferType;
  content : { manifest : Manifest;
              period : Period; };
  garbageCollectors : WeakMapMemory<SegmentBuffer, Observable<never>>;
  segmentFetcherCreator : SegmentFetcherCreator;
  segmentBuffersStore : SegmentBuffersStore;
  playbackObserver : IReadOnlyPlaybackObserver<IPeriodStreamPlaybackObservation>;
  options: IPeriodStreamOptions;
  representationEstimator : IRepresentationEstimator;
  wantedBufferAhead : IReadOnlySharedReference<number>;
  maxVideoBufferSize : IReadOnlySharedReference<number>;
}

/** Options tweaking the behavior of the PeriodStream. */
export type IPeriodStreamOptions =
  IAdaptationStreamOptions &
  {
    /** Behavior when a new video and/or audio codec is encountered. */
    onCodecSwitch : "continue" | "reload";
    /** Options specific to the text SegmentBuffer. */
    textTrackOptions? : ITextTrackSegmentBufferOptions;
  };
/**
 * Create single PeriodStream Observable:
 *   - Lazily create (or reuse) a SegmentBuffer for the given type.
 *   - Create a Stream linked to an Adaptation each time it changes, to
 *     download and append the corresponding segments to the SegmentBuffer.
 *   - Announce when the Stream is full or is awaiting new Segments through
 *     events
 * @param {Object} args
 * @returns {Observable}
 */
export default function PeriodStream({
  bufferType,
  content,
  garbageCollectors,
  playbackObserver,
  representationEstimator,
  segmentFetcherCreator,
  segmentBuffersStore,
  options,
  wantedBufferAhead,
  maxVideoBufferSize,
} : IPeriodStreamArguments) : Observable<IPeriodStreamEvent> {
  const { manifest, period } = content;

  // Emits the chosen Adaptation and Representation for the current type.
  // `null` when no Adaptation is chosen (e.g. no subtitles)
  const adaptation$ = new ReplaySubject<IAdaptationChoice | null>(1);
  return adaptation$.pipe(
    switchMap((
      choice : IAdaptationChoice | null,
      switchNb : number
    ) : Observable<IPeriodStreamEvent> => {
      /**
       * If this is not the first Adaptation choice, we might want to apply a
       * delta to the current position so we can re-play back some media in the
       * new Adaptation to give some context back.
       * This value contains this relative position, in seconds.
       * @see reloadAfterSwitch
       */
      const { DELTA_POSITION_AFTER_RELOAD } = config.getCurrent();
      const relativePosAfterSwitch =
        switchNb === 0 ? 0 :
        bufferType === "audio" ? DELTA_POSITION_AFTER_RELOAD.trackSwitch.audio :
        bufferType === "video" ? DELTA_POSITION_AFTER_RELOAD.trackSwitch.video :
                                 DELTA_POSITION_AFTER_RELOAD.trackSwitch.other;

      if (choice === null) { // Current type is disabled for that Period
        log.info(`Stream: Set no ${bufferType} Adaptation. P:`, period.start);
        const segmentBufferStatus = segmentBuffersStore.getStatus(bufferType);
        let cleanBuffer$ : Observable<unknown>;

        if (segmentBufferStatus.type === "initialized") {
          log.info(`Stream: Clearing previous ${bufferType} SegmentBuffer`);
          if (SegmentBuffersStore.isNative(bufferType)) {
            return reloadAfterSwitch(period, bufferType, playbackObserver, 0);
          }
          if (period.end === undefined) {
            cleanBuffer$ = segmentBufferStatus.value.removeBuffer(period.start,
                                                                  Infinity);
          } else if (period.end <= period.start) {
            cleanBuffer$ = observableOf(null);
          } else {
            cleanBuffer$ = segmentBufferStatus.value.removeBuffer(period.start,
                                                                  period.end);
          }
        } else {
          if (segmentBufferStatus.type === "uninitialized") {
            segmentBuffersStore.disableSegmentBuffer(bufferType);
          }
          cleanBuffer$ = observableOf(null);
        }

        return observableConcat(
          cleanBuffer$.pipe(map(() => EVENTS.adaptationChange(bufferType, null, period))),
          createEmptyStream(playbackObserver, wantedBufferAhead, bufferType, { period })
        );
      }

      if (SegmentBuffersStore.isNative(bufferType) &&
          segmentBuffersStore.getStatus(bufferType).type === "disabled")
      {
        return reloadAfterSwitch(period,
                                 bufferType,
                                 playbackObserver,
                                 relativePosAfterSwitch);
      }

      const { adaptation, representations } = choice;
      log.info(`Stream: Updating ${bufferType} adaptation`,
               `A: ${adaptation.id}`,
               `P: ${period.start}`);

      const newStream$ = observableDefer(() => {
        const readyState = playbackObserver.getReadyState();
        const segmentBuffer = createOrReuseSegmentBuffer(segmentBuffersStore,
                                                         bufferType,
                                                         adaptation,
                                                         options);
        const playbackInfos = { currentTime: playbackObserver.getCurrentTime(),
                                readyState };
        const strategy = getAdaptationSwitchStrategy(segmentBuffer,
                                                     period,
                                                     adaptation,
                                                     choice.switchingMode,
                                                     playbackInfos,
                                                     options);
        if (strategy.type === "needs-reload") {
          return reloadAfterSwitch(period,
                                   bufferType,
                                   playbackObserver,
                                   relativePosAfterSwitch);
        }

        const needsBufferFlush$ = strategy.type === "flush-buffer"
          ? observableOf(EVENTS.needsBufferFlush())
          : EMPTY;

        const cleanBuffer$ =
          strategy.type === "clean-buffer" || strategy.type === "flush-buffer" ?
            observableConcat(...strategy.value.map(({ start, end }) =>
              segmentBuffer.removeBuffer(start, end))
            // NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
            // first type parameter as `any` instead of the perfectly fine `unknown`,
            // leading to linter issues, as it forbids the usage of `any`.
            // This is why we're disabling the eslint rule.
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
            ).pipe(ignoreElements()) : EMPTY;

        const bufferGarbageCollector$ = garbageCollectors.get(segmentBuffer);
        const adaptationStream$ = createAdaptationStream(adaptation,
                                                         representations,
                                                         segmentBuffer);

        return segmentBuffersStore.waitForUsableBuffers().pipe(mergeMap(() => {
          return observableConcat(cleanBuffer$,
                                  needsBufferFlush$,
                                  observableMerge(adaptationStream$,
                                                  bufferGarbageCollector$));
        }));
      });

      return observableConcat(
        observableOf(EVENTS.adaptationChange(bufferType, adaptation, period)),
        newStream$
      );
    }),
    startWith(EVENTS.periodStreamReady(bufferType, manifest, period, adaptation$))
  );

  /**
   * @param {Object} adaptation
   * @param {Object} segmentBuffer
   * @returns {Observable}
   */
  function createAdaptationStream(
    adaptation : Adaptation,
    representations : IReadOnlySharedReference<IRepresentationsChoice>,
    segmentBuffer : SegmentBuffer
  ) : Observable<IAdaptationStreamEvent|IStreamWarningEvent> {
    const adaptationPlaybackObserver =
      createAdaptationStreamPlaybackObserver(playbackObserver, segmentBuffer);
    return AdaptationStream({ content: { manifest,
                                         period,
                                         adaptation,
                                         representations },
                              options,
                              playbackObserver: adaptationPlaybackObserver,
                              representationEstimator,
                              segmentBuffer,
                              segmentFetcherCreator,
                              wantedBufferAhead,
                              maxVideoBufferSize }).pipe(
      catchError((error : unknown) => {
        // Stream linked to a non-native media buffer should not impact the
        // stability of the player. ie: if a text buffer sends an error, we want
        // to continue playing without any subtitles
        if (!SegmentBuffersStore.isNative(bufferType)) {
          log.error(`Stream: ${bufferType} Stream crashed. Aborting it.`,
                    error instanceof Error ? error : "");
          segmentBuffersStore.disposeSegmentBuffer(bufferType);

          const formattedError = formatError(error, {
            defaultCode: "NONE",
            defaultReason: "Unknown `AdaptationStream` error",
          });
          return observableConcat(
            observableOf(EVENTS.warning(formattedError)),
            createEmptyStream(playbackObserver, wantedBufferAhead, bufferType, { period })
          );
        }
        log.error(`Stream: ${bufferType} Stream crashed. Stopping playback.`,
                  error instanceof Error ? error : "");
        throw error;
      }));
  }
}

/**
 * @param {string} bufferType
 * @param {Object} adaptation
 * @returns {Object}
 */
function createOrReuseSegmentBuffer(
  segmentBuffersStore : SegmentBuffersStore,
  bufferType : IBufferType,
  adaptation : Adaptation,
  options: { textTrackOptions? : ITextTrackSegmentBufferOptions }
) : SegmentBuffer {
  const segmentBufferStatus = segmentBuffersStore.getStatus(bufferType);
  if (segmentBufferStatus.type === "initialized") {
    log.info("Stream: Reusing a previous SegmentBuffer for the type", bufferType);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return segmentBufferStatus.value;
  }
  const codec = getFirstDeclaredMimeType(adaptation);
  const sbOptions = bufferType === "text" ?  options.textTrackOptions : undefined;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return segmentBuffersStore.createSegmentBuffer(bufferType, codec, sbOptions);
}

/**
 * Get mime-type string of the first representation declared in the given
 * adaptation.
 * @param {Adaptation} adaptation
 * @returns {string}
 */
function getFirstDeclaredMimeType(adaptation : Adaptation) : string {
  const representations = adaptation.getPlayableRepresentations();
  if (representations.length === 0) {
    const noRepErr = new MediaError("NO_PLAYABLE_REPRESENTATION",
                                    "No Representation in the chosen " +
                                    adaptation.type + " Adaptation can be played");
    throw noRepErr;
  }
  return representations[0].getMimeTypeString();
}

/**
 * Create AdaptationStream's version of a playback observer.
 * @param {Object} initialPlaybackObserver
 * @param {Object} segmentBuffer
 * @returns {Object}
 */
function createAdaptationStreamPlaybackObserver(
  initialPlaybackObserver : IReadOnlyPlaybackObserver<IPeriodStreamPlaybackObservation>,
  segmentBuffer : SegmentBuffer
) : IReadOnlyPlaybackObserver<IAdaptationStreamPlaybackObservation> {
  return initialPlaybackObserver.deriveReadOnlyObserver(function transform(
    observationRef : IReadOnlySharedReference<IPeriodStreamPlaybackObservation>,
    cancellationSignal : CancellationSignal
  ) : IReadOnlySharedReference<IAdaptationStreamPlaybackObservation> {
    const newRef = createSharedReference(constructAdaptationStreamPlaybackObservation());

    observationRef.onUpdate(emitAdaptationStreamPlaybackObservation, {
      clearSignal: cancellationSignal,
      emitCurrentValue: false,
    });

    cancellationSignal.register(() => {
      newRef.finish();
    });

    return newRef;

    function constructAdaptationStreamPlaybackObservation(
    ) : IAdaptationStreamPlaybackObservation {
      const baseObservation = observationRef.getValue();
      const buffered = segmentBuffer.getBufferedRanges();
      const bufferGap = getLeftSizeOfRange(buffered, baseObservation.position.last);
      return objectAssign({}, baseObservation, { bufferGap });
    }

    function emitAdaptationStreamPlaybackObservation() {
      newRef.setValue(constructAdaptationStreamPlaybackObservation());
    }
  });

}
