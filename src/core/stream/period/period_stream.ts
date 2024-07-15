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

import config from "../../../config";
import { formatError, MediaError } from "../../../errors";
import log from "../../../log";
import type { IAdaptation, IPeriod } from "../../../manifest";
import { toTaggedTrack } from "../../../manifest";
import type { IReadOnlyPlaybackObserver } from "../../../playback_observer";
import type { ITrackType } from "../../../public_types";
import arrayFind from "../../../utils/array_find";
import objectAssign from "../../../utils/object_assign";
import queueMicrotask from "../../../utils/queue_microtask";
import { getLeftSizeOfRange } from "../../../utils/ranges";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import SharedReference from "../../../utils/reference";
import type { CancellationSignal } from "../../../utils/task_canceller";
import TaskCanceller, { CancellationError } from "../../../utils/task_canceller";
import type { IBufferType, SegmentSink } from "../../segment_sinks";
import SegmentSinksStore from "../../segment_sinks";
import type {
  IAdaptationChoice,
  IAdaptationStreamCallbacks,
  IAdaptationStreamPlaybackObservation,
} from "../adaptation";
import AdaptationStream from "../adaptation";
import type { IRepresentationsChoice } from "../representation";
import type {
  IPeriodStreamArguments,
  IPeriodStreamCallbacks,
  IPeriodStreamPlaybackObservation,
} from "./types";
import getAdaptationSwitchStrategy from "./utils/get_adaptation_switch_strategy";

/**
 * Create a single PeriodStream:
 *   - Lazily create (or reuse) a SegmentSink for the given type.
 *   - Create a Stream linked to an Adaptation each time it changes, to
 *     download and append the corresponding segments to the SegmentSink.
 *   - Announce when the Stream is full or is awaiting new Segments through
 *     events
 *
 * @param {Object} args - Various arguments allowing the `PeriodStream` to
 * determine which Adaptation and which Representation to choose, as well as
 * which segments to load from it.
 * You can check the corresponding type for more information.
 * @param {Object} callbacks - The `PeriodStream` relies on a system of
 * callbacks that it will call on various events.
 *
 * Depending on the event, the caller may be supposed to perform actions to
 * react upon some of them.
 *
 * This approach is taken instead of a more classical EventEmitter pattern to:
 *   - Allow callbacks to be called synchronously after the
 *     `AdaptationStream` is called.
 *   - Simplify bubbling events up, by just passing through callbacks
 *   - Force the caller to explicitely handle or not the different events.
 *
 * Callbacks may start being called immediately after the `AdaptationStream`
 * call and may be called until either the `parentCancelSignal` argument is
 * triggered, or until the `error` callback is called, whichever comes first.
 * @param {Object} parentCancelSignal - `CancellationSignal` allowing, when
 * triggered, to immediately stop all operations the `PeriodStream` is
 * doing.
 */
export default function PeriodStream(
  {
    bufferType,
    content,
    garbageCollectors,
    playbackObserver,
    representationEstimator,
    segmentFetcherCreator,
    segmentSinksStore,
    options,
    wantedBufferAhead,
    maxVideoBufferSize,
  }: IPeriodStreamArguments,
  callbacks: IPeriodStreamCallbacks,
  parentCancelSignal: CancellationSignal,
): void {
  const { manifest, period } = content;

  /**
   * Emits the chosen Adaptation and Representations for the current type.
   * `null` when no Adaptation is chosen (e.g. no subtitles)
   * `undefined` at the beginning (it can be ignored.).
   */
  const adaptationRef = new SharedReference<IAdaptationChoice | null | undefined>(
    undefined,
    parentCancelSignal,
  );

  callbacks.periodStreamReady({
    type: bufferType,
    manifest,
    period,
    adaptationRef,
  });
  if (parentCancelSignal.isCancelled()) {
    return;
  }

  let currentStreamCanceller: TaskCanceller | undefined;
  let isFirstAdaptationSwitch = true;

  adaptationRef.onUpdate(
    (choice: IAdaptationChoice | null | undefined) => {
      // As an IIFE to profit from async/await while respecting onUpdate's signature
      (async (): Promise<void> => {
        if (choice === undefined) {
          return;
        }

        const streamCanceller = new TaskCanceller();
        streamCanceller.linkToSignal(parentCancelSignal);
        currentStreamCanceller?.cancel(); // Cancel oreviously created stream if one
        currentStreamCanceller = streamCanceller;

        if (choice === null) {
          // Current type is disabled for that Period
          log.info(`Stream: Set no ${bufferType} Adaptation. P:`, period.start);
          const segmentSinkStatus = segmentSinksStore.getStatus(bufferType);

          if (segmentSinkStatus.type === "initialized") {
            log.info(`Stream: Clearing previous ${bufferType} SegmentSink`);
            if (SegmentSinksStore.isNative(bufferType)) {
              return askForMediaSourceReload(0, true, streamCanceller.signal);
            } else {
              const periodEnd = period.end ?? Infinity;
              if (period.start > periodEnd) {
                log.warn("Stream: Can't free buffer: period's start is after its end");
              } else {
                await segmentSinkStatus.value.removeBuffer(period.start, periodEnd);
                if (streamCanceller.isUsed()) {
                  return; // The stream has been cancelled
                }
              }
            }
          } else if (segmentSinkStatus.type === "uninitialized") {
            segmentSinksStore.disableSegmentSink(bufferType);
            if (streamCanceller.isUsed()) {
              return; // The stream has been cancelled
            }
          }

          callbacks.adaptationChange({
            type: bufferType,
            adaptation: null,
            period,
          });
          if (streamCanceller.isUsed()) {
            return; // Previous call has provoken Stream cancellation by side-effect
          }

          return createEmptyAdaptationStream(
            playbackObserver,
            wantedBufferAhead,
            bufferType,
            { period },
            callbacks,
            streamCanceller.signal,
          );
        }

        const adaptations = period.adaptations[bufferType];
        const adaptation = arrayFind(
          adaptations ?? [],
          (a) => a.id === choice.adaptationId,
        );
        if (adaptation === undefined) {
          currentStreamCanceller.cancel();
          log.warn("Stream: Unfound chosen Adaptation choice", choice.adaptationId);
          return;
        }

        /**
         * If this is not the first Adaptation choice, we might want to apply a
         * delta to the current position so we can re-play back some media in the
         * new Adaptation to give some context back.
         * This value contains this relative position, in seconds.
         * @see createMediaSourceReloadRequester
         */
        const { DELTA_POSITION_AFTER_RELOAD } = config.getCurrent();
        let relativePosHasBeenDefaulted: boolean = false;
        let relativePosAfterSwitch: number;
        if (isFirstAdaptationSwitch) {
          relativePosAfterSwitch = 0;
        } else if (choice.relativeResumingPosition !== undefined) {
          relativePosAfterSwitch = choice.relativeResumingPosition;
        } else {
          relativePosHasBeenDefaulted = true;
          switch (bufferType) {
            case "audio":
              relativePosAfterSwitch = DELTA_POSITION_AFTER_RELOAD.trackSwitch.audio;
              break;
            case "video":
              relativePosAfterSwitch = DELTA_POSITION_AFTER_RELOAD.trackSwitch.video;
              break;
            default:
              relativePosAfterSwitch = DELTA_POSITION_AFTER_RELOAD.trackSwitch.other;
              break;
          }
        }
        isFirstAdaptationSwitch = false;

        if (
          SegmentSinksStore.isNative(bufferType) &&
          segmentSinksStore.getStatus(bufferType).type === "disabled"
        ) {
          return askForMediaSourceReload(
            relativePosAfterSwitch,
            true,
            streamCanceller.signal,
          );
        }

        // Reload if the Adaptation disappears from the manifest
        manifest.addEventListener(
          "manifestUpdate",
          (updates) => {
            // If current period has been unexpectedly removed, ask to reload
            for (const element of updates.updatedPeriods) {
              if (element.period.id === period.id) {
                for (const adap of element.result.removedAdaptations) {
                  if (adap.id === adaptation.id) {
                    return askForMediaSourceReload(
                      relativePosAfterSwitch,
                      true,
                      streamCanceller.signal,
                    );
                  }
                }
              } else if (element.period.start > period.start) {
                break;
              }
            }
          },
          currentStreamCanceller.signal,
        );

        const { representations } = choice;
        log.info(
          `Stream: Updating ${bufferType} adaptation`,
          `A: ${adaptation.id}`,
          `P: ${period.start}`,
        );

        callbacks.adaptationChange({ type: bufferType, adaptation, period });
        if (streamCanceller.isUsed()) {
          return; // Previous call has provoken cancellation by side-effect
        }

        const segmentSink = createOrReuseSegmentSink(
          segmentSinksStore,
          bufferType,
          adaptation,
        );
        const strategy = getAdaptationSwitchStrategy(
          segmentSink,
          period,
          adaptation,
          choice.switchingMode,
          playbackObserver,
          options,
        );
        if (strategy.type === "needs-reload") {
          return askForMediaSourceReload(
            relativePosAfterSwitch,
            true,
            streamCanceller.signal,
          );
        }
        await segmentSinksStore.waitForUsableBuffers(streamCanceller.signal);
        if (streamCanceller.isUsed()) {
          return; // The Stream has since been cancelled
        }
        if (strategy.type === "flush-buffer" || strategy.type === "clean-buffer") {
          for (const { start, end } of strategy.value) {
            await segmentSink.removeBuffer(start, end);
            if (streamCanceller.isUsed()) {
              return; // The Stream has since been cancelled
            }
          }
          if (strategy.type === "flush-buffer") {
            // The seek to `relativePosAfterSwitch` is only performed if strategy.type
            // is "flush-buffer" because there should be no interuption when playing in
            // with `clean-buffer` strategy
            callbacks.needsBufferFlush({
              relativeResumingPosition: relativePosAfterSwitch,
              relativePosHasBeenDefaulted,
            });
            if (streamCanceller.isUsed()) {
              return; // Previous callback cancelled the Stream by side-effect
            }
          }
        }

        garbageCollectors.get(segmentSink)(streamCanceller.signal);
        createAdaptationStream(
          adaptation,
          representations,
          segmentSink,
          streamCanceller.signal,
        );
      })().catch((err) => {
        if (err instanceof CancellationError) {
          return;
        }
        currentStreamCanceller?.cancel();
        callbacks.error(err);
      });
    },
    { clearSignal: parentCancelSignal, emitCurrentValue: true },
  );

  /**
   * @param {Object} adaptation
   * @param {Object} representations
   * @param {Object} segmentSink
   * @param {Object} cancelSignal
   */
  function createAdaptationStream(
    adaptation: IAdaptation,
    representations: IReadOnlySharedReference<IRepresentationsChoice>,
    segmentSink: SegmentSink,
    cancelSignal: CancellationSignal,
  ): void {
    const adaptationPlaybackObserver = createAdaptationStreamPlaybackObserver(
      playbackObserver,
      adaptation.type,
    );

    AdaptationStream(
      {
        content: { manifest, period, adaptation, representations },
        options,
        playbackObserver: adaptationPlaybackObserver,
        representationEstimator,
        segmentSink,
        segmentFetcherCreator,
        wantedBufferAhead,
        maxVideoBufferSize,
      },
      { ...callbacks, error: onAdaptationStreamError },
      cancelSignal,
    );

    function onAdaptationStreamError(error: unknown): void {
      // Stream linked to a non-native media buffer should not impact the
      // stability of the player. ie: if a text buffer sends an error, we want
      // to continue playing without any subtitles
      if (!SegmentSinksStore.isNative(bufferType)) {
        log.error(
          `Stream: ${bufferType} Stream crashed. Aborting it.`,
          error instanceof Error ? error : "",
        );
        segmentSinksStore.disposeSegmentSink(bufferType);

        const formattedError = formatError(error, {
          defaultCode: "NONE",
          defaultReason: "Unknown `AdaptationStream` error",
        });
        callbacks.warning(formattedError);
        if (cancelSignal.isCancelled()) {
          return; // Previous callback cancelled the Stream by side-effect
        }

        return createEmptyAdaptationStream(
          playbackObserver,
          wantedBufferAhead,
          bufferType,
          { period },
          callbacks,
          cancelSignal,
        );
      }
      log.error(
        `Stream: ${bufferType} Stream crashed. Stopping playback.`,
        error instanceof Error ? error : "",
      );
      callbacks.error(error);
    }
  }

  /**
   * Regularly ask to reload the MediaSource on each playback observation
   * performed by the playback observer.
   *
   * @param {number} timeOffset - Relative position, compared to the current
   * playhead, at which we should restart playback after reloading.
   * For example `-2` will reload 2 seconds before the current position.
   * @param {boolean} stayInPeriod - If `true`, we will control that the position
   * we reload at, after applying `timeOffset`, is still part of the Period
   * `period`.
   *
   * If it isn't we will re-calculate that reloaded position to be:
   *   - either the Period's start if the calculated position is before the
   *     Period's start.
   *   - either the Period'end start if the calculated position is after the
   *     Period's end.
   * @param {Object} cancelSignal
   */
  function askForMediaSourceReload(
    timeOffset: number,
    stayInPeriod: boolean,
    cancelSignal: CancellationSignal,
  ): void {
    // We begin by scheduling a micro-task to reduce the possibility of race
    // conditions where `askForMediaSourceReload` would be called synchronously before
    // the next observation (which may reflect very different playback conditions)
    // is actually received.
    // It can happen when `askForMediaSourceReload` is called as a side-effect of
    // the same event that triggers the playback observation to be emitted.
    queueMicrotask(() => {
      playbackObserver.listen(
        () => {
          if (cancelSignal.isCancelled()) {
            return;
          }
          callbacks.waitingMediaSourceReload({
            bufferType,
            period,
            timeOffset,
            stayInPeriod,
          });
        },
        { includeLastObservation: true, clearSignal: cancelSignal },
      );
    });
  }
}

/**
 * @param {string} bufferType
 * @param {Object} adaptation
 * @returns {Object}
 */
function createOrReuseSegmentSink(
  segmentSinksStore: SegmentSinksStore,
  bufferType: IBufferType,
  adaptation: IAdaptation,
): SegmentSink {
  const segmentSinkStatus = segmentSinksStore.getStatus(bufferType);
  if (segmentSinkStatus.type === "initialized") {
    log.info("Stream: Reusing a previous SegmentSink for the type", bufferType);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return segmentSinkStatus.value;
  }
  const codec = getFirstDeclaredMimeType(adaptation);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return segmentSinksStore.createSegmentSink(bufferType, codec);
}

/**
 * Get mime-type string of the first representation declared in the given
 * adaptation.
 * @param {Adaptation} adaptation
 * @returns {string}
 */
function getFirstDeclaredMimeType(adaptation: IAdaptation): string {
  if (adaptation.representations.length === 0) {
    const noRepErr = new MediaError(
      "NO_PLAYABLE_REPRESENTATION",
      "No Representation in the chosen " + adaptation.type + " Adaptation can be played",
      { tracks: [toTaggedTrack(adaptation)] },
    );
    throw noRepErr;
  }

  const representations = adaptation.representations.filter((r) => {
    return r.isSupported === true && r.decipherable !== false;
  });
  if (representations.length === 0) {
    const noRepErr = new MediaError(
      "NO_PLAYABLE_REPRESENTATION",
      "No Representation in the chosen " + adaptation.type + " Adaptation can be played",
      { tracks: [toTaggedTrack(adaptation)] },
    );
    throw noRepErr;
  }
  return representations[0].getMimeTypeString();
}

/**
 * Create AdaptationStream's version of a playback observer.
 * @param {Object} initialPlaybackObserver
 * @param {string} trackType
 * @returns {Object}
 */
function createAdaptationStreamPlaybackObserver(
  initialPlaybackObserver: IReadOnlyPlaybackObserver<IPeriodStreamPlaybackObservation>,
  trackType: ITrackType,
): IReadOnlyPlaybackObserver<IAdaptationStreamPlaybackObservation> {
  return initialPlaybackObserver.deriveReadOnlyObserver(function transform(
    observationRef: IReadOnlySharedReference<IPeriodStreamPlaybackObservation>,
    cancellationSignal: CancellationSignal,
  ): IReadOnlySharedReference<IAdaptationStreamPlaybackObservation> {
    const newRef = new SharedReference(
      constructAdaptationStreamPlaybackObservation(),
      cancellationSignal,
    );

    observationRef.onUpdate(emitAdaptationStreamPlaybackObservation, {
      clearSignal: cancellationSignal,
      emitCurrentValue: false,
    });
    return newRef;

    function constructAdaptationStreamPlaybackObservation(): IAdaptationStreamPlaybackObservation {
      const baseObservation = observationRef.getValue();
      const buffered = baseObservation.buffered[trackType];
      const bufferGap =
        buffered !== null
          ? getLeftSizeOfRange(buffered, baseObservation.position.getWanted())
          : 0;
      return objectAssign({}, baseObservation, { bufferGap, buffered });
    }

    function emitAdaptationStreamPlaybackObservation() {
      newRef.setValue(constructAdaptationStreamPlaybackObservation());
    }
  });
}

/**
 * Create empty AdaptationStream, linked to a Period.
 * This AdaptationStream will never download any segment and just emit a "full"
 * event when reaching the end.
 * @param {Object} playbackObserver
 * @param {Object} wantedBufferAhead
 * @param {string} bufferType
 * @param {Object} content
 * @param {Object} callbacks
 * @param {Object} cancelSignal
 */
function createEmptyAdaptationStream(
  playbackObserver: IReadOnlyPlaybackObserver<IPeriodStreamPlaybackObservation>,
  wantedBufferAhead: IReadOnlySharedReference<number>,
  bufferType: IBufferType,
  content: { period: IPeriod },
  callbacks: Pick<IAdaptationStreamCallbacks, "streamStatusUpdate">,
  cancelSignal: CancellationSignal,
): void {
  const { period } = content;
  let hasFinishedLoading = false;
  wantedBufferAhead.onUpdate(sendStatus, {
    emitCurrentValue: false,
    clearSignal: cancelSignal,
  });
  playbackObserver.listen(sendStatus, {
    includeLastObservation: false,
    clearSignal: cancelSignal,
  });
  sendStatus();

  function sendStatus(): void {
    const observation = playbackObserver.getReference().getValue();
    const wba = wantedBufferAhead.getValue();
    const position = observation.position.getWanted();
    if (period.end !== undefined && position + wba >= period.end) {
      log.debug('Stream: full "empty" AdaptationStream', bufferType);
      hasFinishedLoading = true;
    }
    callbacks.streamStatusUpdate({
      period,
      bufferType,
      imminentDiscontinuity: null,
      position,
      isEmptyStream: true,
      hasFinishedLoading,
      neededSegments: [],
    });
  }
}
