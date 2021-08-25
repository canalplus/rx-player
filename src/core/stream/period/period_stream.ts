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
  BehaviorSubject,
  concat as observableConcat,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
} from "rxjs";
import {
  catchError,
  ignoreElements,
  map,
  mapTo,
  mergeMap,
  startWith,
  switchMap,
  take,
} from "rxjs/operators";
import config from "../../../config";
import { formatError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  Adaptation,
  Period,
} from "../../../manifest";
import objectAssign from "../../../utils/object_assign";
import { getLeftSizeOfRange } from "../../../utils/ranges";
import WeakMapMemory from "../../../utils/weak_map_memory";
import ABRManager from "../../abr";
import { IStalledStatus } from "../../api";
import { SegmentFetcherCreator } from "../../fetchers";
import SegmentBuffersStore, {
  IBufferType,
  ITextTrackSegmentBufferOptions,
  SegmentBuffer,
} from "../../segment_buffers";
import AdaptationStream, {
  IAdaptationStreamOptions,
} from "../adaptation";
import EVENTS from "../events_generators";
import reloadAfterSwitch from "../reload_after_switch";
import {
  IAdaptationStreamEvent,
  IPeriodStreamEvent,
  IStreamWarningEvent,
} from "../types";
import createEmptyStream from "./create_empty_adaptation_stream";
import getAdaptationSwitchStrategy from "./get_adaptation_switch_strategy";

const { DELTA_POSITION_AFTER_RELOAD } = config;

export interface IPeriodStreamClockTick {
  position : number; // the position we are in the video in s at the time of the tic
  getCurrentTime : () => number; // fetch the current time
  duration : number; // duration of the HTMLMediaElement
  isPaused: boolean; // If true, the player is on pause
  liveGap? : number; // gap between the current position and the edge of a
                     // live content. Not set for non-live contents
  readyState : number; // readyState of the HTMLMediaElement
  speed : number; // playback rate at which the content plays
  stalled : IStalledStatus|null; // if set, the player is currently stalled
  wantedTimeOffset : number; // offset in s to add to the time to obtain the
                             // position we actually want to download from
}

export interface IPeriodStreamArguments {
  abrManager : ABRManager;
  bufferType : IBufferType;
  clock$ : Observable<IPeriodStreamClockTick>;
  content : { manifest : Manifest;
              period : Period; };
  garbageCollectors : WeakMapMemory<SegmentBuffer<unknown>, Observable<never>>;
  segmentFetcherCreator : SegmentFetcherCreator;
  segmentBuffersStore : SegmentBuffersStore;
  options: IPeriodStreamOptions;
  wantedBufferAhead$ : BehaviorSubject<number>;
}

/** Options tweaking the behavior of the PeriodStream. */
export type IPeriodStreamOptions =
  IAdaptationStreamOptions &
  {
    /**
     * Strategy to adopt when manually switching of audio adaptation.
     * Can be either:
     *    - "seamless": transitions are smooth but could be not immediate.
     *    - "direct": strategy will be "smart", if the mimetype and the codec,
     *    change, we will perform a hard reload of the media source, however, if it
     *    doesn't change, we will just perform a small flush by removing buffered range
     *    and performing, a small seek on the media element.
     *    Transitions are faster, but, we could see appear a reloading or seeking state.
     */
    audioTrackSwitchingMode : "seamless" | "direct";

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
  abrManager,
  bufferType,
  clock$,
  content,
  garbageCollectors,
  segmentFetcherCreator,
  segmentBuffersStore,
  options,
  wantedBufferAhead$,
} : IPeriodStreamArguments) : Observable<IPeriodStreamEvent> {
  const { period } = content;

  // Emits the chosen Adaptation for the current type.
  // `null` when no Adaptation is chosen (e.g. no subtitles)
  const adaptation$ = new ReplaySubject<Adaptation|null>(1);
  return adaptation$.pipe(
    switchMap((
      adaptation : Adaptation | null,
      switchNb : number
    ) : Observable<IPeriodStreamEvent> => {
      /**
       * If this is not the first Adaptation choice, we might want to apply a
       * delta to the current position so we can re-play back some media in the
       * new Adaptation to give some context back.
       * This value contains this relative position, in seconds.
       * @see reloadAfterSwitch
       */
      const relativePosAfterSwitch =
        switchNb === 0 ? 0 :
        bufferType === "audio" ? DELTA_POSITION_AFTER_RELOAD.trackSwitch.audio :
        bufferType === "video" ? DELTA_POSITION_AFTER_RELOAD.trackSwitch.video :
                                 DELTA_POSITION_AFTER_RELOAD.trackSwitch.other;

      if (adaptation === null) { // Current type is disabled for that Period
        log.info(`Stream: Set no ${bufferType} Adaptation`, period);
        const segmentBufferStatus = segmentBuffersStore.getStatus(bufferType);
        let cleanBuffer$ : Observable<unknown>;

        if (segmentBufferStatus.type === "initialized") {
          log.info(`Stream: Clearing previous ${bufferType} SegmentBuffer`);
          if (SegmentBuffersStore.isNative(bufferType)) {
            return reloadAfterSwitch(period, clock$, 0);
          }
          cleanBuffer$ = segmentBufferStatus.value
            .removeBuffer(period.start,
                          period.end == null ? Infinity :
                                               period.end);
        } else {
          if (segmentBufferStatus.type === "uninitialized") {
            segmentBuffersStore.disableSegmentBuffer(bufferType);
          }
          cleanBuffer$ = observableOf(null);
        }

        return observableConcat(
          cleanBuffer$.pipe(mapTo(EVENTS.adaptationChange(bufferType, null, period))),
          createEmptyStream(clock$, wantedBufferAhead$, bufferType, { period })
        );
      }

      if (SegmentBuffersStore.isNative(bufferType) &&
          segmentBuffersStore.getStatus(bufferType).type === "disabled")
      {
        return reloadAfterSwitch(period, clock$, relativePosAfterSwitch);
      }

      log.info(`Stream: Updating ${bufferType} adaptation`, adaptation, period);

      const newStream$ = clock$.pipe(
        take(1),
        mergeMap((tick) => {
          const segmentBuffer = createOrReuseSegmentBuffer(segmentBuffersStore,
                                                           bufferType,
                                                           adaptation,
                                                           options);
          const playbackInfos = { currentTime: tick.getCurrentTime(),
                                  readyState: tick.readyState };
          const strategy = getAdaptationSwitchStrategy(segmentBuffer,
                                                       period,
                                                       adaptation,
                                                       playbackInfos,
                                                       options);
          if (strategy.type === "needs-reload") {
            return reloadAfterSwitch(period, clock$, relativePosAfterSwitch);
          }

          const needsBufferFlush$ = strategy.type === "flush-buffer"
            ? observableOf(EVENTS.needsBufferFlush())
            : EMPTY;

          const cleanBuffer$ =
            strategy.type === "clean-buffer" || strategy.type === "flush-buffer" ?
              observableConcat(...strategy.value.map(({ start, end }) =>
                segmentBuffer.removeBuffer(start, end))
              ).pipe(ignoreElements()) : EMPTY;

          const bufferGarbageCollector$ = garbageCollectors.get(segmentBuffer);
          const adaptationStream$ = createAdaptationStream(adaptation, segmentBuffer);

          return segmentBuffersStore.waitForUsableBuffers().pipe(mergeMap(() => {
            return observableConcat(cleanBuffer$,
                                    needsBufferFlush$,
                                    observableMerge(adaptationStream$,
                                                    bufferGarbageCollector$));
          }));
        }));

      return observableConcat(
        observableOf(EVENTS.adaptationChange(bufferType, adaptation, period)),
        newStream$
      );
    }),
    startWith(EVENTS.periodStreamReady(bufferType, period, adaptation$))
  );

  /**
   * @param {Object} adaptation
   * @param {Object} segmentBuffer
   * @returns {Observable}
   */
  function createAdaptationStream<T>(
    adaptation : Adaptation,
    segmentBuffer : SegmentBuffer<T>
  ) : Observable<IAdaptationStreamEvent<T>|IStreamWarningEvent> {
    const { manifest } = content;
    const adaptationStreamClock$ = clock$.pipe(map(tick => {
      const buffered = segmentBuffer.getBufferedRanges();
      return objectAssign({},
                          tick,
                          { bufferGap: getLeftSizeOfRange(buffered,
                                                          tick.position) });
    }));
    return AdaptationStream({ abrManager,
                              clock$: adaptationStreamClock$,
                              content: { manifest, period, adaptation },
                              options,
                              segmentBuffer,
                              segmentFetcherCreator,
                              wantedBufferAhead$ }).pipe(
      catchError((error : unknown) => {
        // Stream linked to a non-native media buffer should not impact the
        // stability of the player. ie: if a text buffer sends an error, we want
        // to continue playing without any subtitles
        if (!SegmentBuffersStore.isNative(bufferType)) {
          log.error(`Stream: ${bufferType} Stream crashed. Aborting it.`, error);
          segmentBuffersStore.disposeSegmentBuffer(bufferType);

          const formattedError = formatError(error, {
            defaultCode: "NONE",
            defaultReason: "Unknown `AdaptationStream` error",
          });
          return observableConcat(
            observableOf(EVENTS.warning(formattedError)),
            createEmptyStream(clock$, wantedBufferAhead$, bufferType, { period })
          );
        }
        log.error(`Stream: ${bufferType} Stream crashed. Stopping playback.`, error);
        throw error;
      }));
  }
}

/**
 * @param {string} bufferType
 * @param {Object} adaptation
 * @returns {Object}
 */
function createOrReuseSegmentBuffer<T>(
  segmentBuffersStore : SegmentBuffersStore,
  bufferType : IBufferType,
  adaptation : Adaptation,
  options: { textTrackOptions? : ITextTrackSegmentBufferOptions }
) : SegmentBuffer<T> {
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
  const { representations } = adaptation;
  if (representations[0] == null) {
    return "";
  }
  return representations[0].getMimeTypeString();
}
