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

import config from "../../../config.ts";
import { MediaError } from "../../../errors/index.ts";
import log from "../../../log.ts";
import type { IManifest, IUpdatedRepresentationInfo, IPeriod } from "../../../manifest/index.ts";
import type { IReadOnlyPlaybackObserver } from "../../../playback_observer/index.ts";
import isNullOrUndefined from "../../../utils/is_null_or_undefined.ts";
import queueMicrotask from "../../../utils/queue_microtask.ts";
import type { IReadOnlySharedReference } from "../../../utils/reference.ts";
import { createMappedReference } from "../../../utils/reference.ts";
import SortedList from "../../../utils/sorted_list.ts";
import type { CancellationSignal } from "../../../utils/task_canceller.ts";
import TaskCanceller from "../../../utils/task_canceller.ts";
import WeakMapMemory from "../../../utils/weak_map_memory.ts";
import type { IRepresentationEstimator } from "../../adaptive/index.ts";
import type { SegmentQueueCreator } from "../../fetchers/index.ts";
import type { IBufferType, SegmentSink } from "../../segment_sinks/index.ts";
import type SegmentSinksStore from "../../segment_sinks/index.ts";
import { BufferGarbageCollector } from "../../segment_sinks/index.ts";
import type {
  ITrackSelectorStreamCallbacks,
  ITrackSelectorStreamOptions,
  ITrackSelectorStreamPlaybackObservation,
  IStreamReadyPayload,
} from "../2-Track_selection/index.ts";
import TrackSelectorStream from "../2-Track_selection/index.ts";
import type { IWaitingMediaSourceReloadPayload } from "../3-Representation_selection/index.ts";
import type { IStreamStatusPayload } from "../4-Segment_selection/index.ts";
import getTimeRangesForContent from "./get_time_ranges_for_content.ts";

/**
 * Create and manage the various "Streams" needed for the content to
 * play:
 *
 *   - Create or dispose SegmentSinks depending on the chosen Adaptations.
 *
 *   - Push the right segments to those SegmentSinks depending on the user's
 *     preferences, the current position, the bandwidth, the decryption
 *     conditions...
 *
 *   - Concatenate Streams for adaptation from separate Periods at the right
 *     time, to allow smooth transitions between periods.
 *
 *   - Call various callbacks to notify of its health and issues
 *
 * @param {Object} content
 * @param {Object} playbackObserver - Emit position information
 * @param {Object} representationEstimator - Emit bitrate estimates and best
 * Representation to play.
 * @param {Object} segmentSinksStore - Will be used to lazily create
 * SegmentSink instances associated with the current content.
 * @param {Object} segmentQueueCreator - Allow to download segments.
 * @param {Object} options
 * @param {Object} callbacks - The `StreamOrchestrator` relies on a system of
 * callbacks that it will call on various events.
 *
 * Depending on the event, the caller may be supposed to perform actions to
 * react upon some of them.
 *
 * This approach is taken instead of a more classical EventEmitter pattern to:
 *   - Allow callbacks to be called synchronously after the
 *     `StreamOrchestrator` is called.
 *   - Simplify bubbling events up, by just passing through callbacks
 *   - Force the caller to explicitely handle or not the different events.
 *
 * Callbacks may start being called immediately after the `StreamOrchestrator`
 * call and may be called until either the `parentCancelSignal` argument is
 * triggered, or until the `error` callback is called, whichever comes first.
 * @param {Object} orchestratorCancelSignal - `CancellationSignal` allowing,
 * when triggered, to immediately stop all operations the `TrackSelectorStream` is
 * doing.
 */
export default function StreamOrchestrator(
  content: { manifest: IManifest; initialPeriod: IPeriod },
  playbackObserver: IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>,
  representationEstimator: IRepresentationEstimator,
  segmentSinksStore: SegmentSinksStore,
  segmentQueueCreator: SegmentQueueCreator,
  options: IStreamOrchestratorOptions,
  callbacks: IStreamOrchestratorCallbacks,
  orchestratorCancelSignal: CancellationSignal,
): void {
  const { manifest, initialPeriod } = content;
  const { maxBufferAhead, maxBufferBehind, wantedBufferAhead, maxVideoBufferSize } =
    options;

  const {
    MINIMUM_MAX_BUFFER_AHEAD,
    MAXIMUM_MAX_BUFFER_AHEAD,
    MAXIMUM_MAX_BUFFER_BEHIND,
  } = config.getCurrent();

  // Keep track of a unique BufferGarbageCollector created per
  // SegmentSink.
  const garbageCollectors = new WeakMapMemory((segmentSink: SegmentSink) => {
    const { bufferType } = segmentSink;
    const defaultMaxBehind = MAXIMUM_MAX_BUFFER_BEHIND[bufferType] ?? Infinity;
    const maxAheadHigherBound = MAXIMUM_MAX_BUFFER_AHEAD[bufferType] ?? Infinity;
    return (gcCancelSignal: CancellationSignal) => {
      BufferGarbageCollector(
        {
          segmentSink,
          playbackObserver,
          maxBufferBehind: createMappedReference(
            maxBufferBehind,
            (val) => Math.min(val, defaultMaxBehind),
            gcCancelSignal,
          ),
          maxBufferAhead: createMappedReference(
            maxBufferAhead,
            (val) => {
              const lowerBound = Math.max(val, MINIMUM_MAX_BUFFER_AHEAD[bufferType] ?? 0);
              return Math.min(lowerBound, maxAheadHigherBound);
            },
            gcCancelSignal,
          ),
        },
        gcCancelSignal,
      );
    };
  });

  // Create automatically the right `TrackSelectorStream` for every possible types
  for (const bufferType of segmentSinksStore.getBufferTypes()) {
    manageEveryStreams(bufferType, initialPeriod);
  }

  /**
   * Manage creation and removal of Streams for every Periods for a given type.
   *
   * Works by creating consecutive Streams through the
   * `manageConsecutiveTrackSelectorStreams` function, and restarting it when the
   * current position goes out of the bounds of these Streams.
   * @param {string} bufferType - e.g. "audio" or "video"
   * @param {Period} basePeriod - Initial Period downloaded.
   */
  function manageEveryStreams(bufferType: IBufferType, basePeriod: IPeriod): void {
    /** Each Period for which there is currently a Stream, chronologically */
    const periodList = new SortedList<IPeriod>((a, b) => a.start - b.start);

    /**
     * When set to `true`, all the currently active TrackSelectorStream will be destroyed
     * and re-created from the new current position if we detect it to be out of
     * their bounds.
     * This is set to false when we're in the process of creating the first
     * TrackSelectorStream, to avoid interferences while no TrackSelectorStream is available.
     */
    let enableOutOfBoundsCheck = false;

    /** Cancels all currently created `TrackSelectorStream`s. */
    let allStreamsCanceller = new TaskCanceller(
      "StreamOrchestrator Streams for " + bufferType,
    );
    allStreamsCanceller.linkToSignal(orchestratorCancelSignal);

    // Restart the current Stream when the wanted time is in another period
    // than the ones already considered
    playbackObserver.listen(
      ({ position }) => {
        const time = position.getWanted();
        if (!enableOutOfBoundsCheck || !isOutOfPeriodList(time)) {
          return;
        }

        const getNewBasePeriod = (): IPeriod | undefined =>
          manifest.getPeriodForTime(time) ?? manifest.getNextPeriod(time);

        let nextPeriod = getNewBasePeriod();
        if (!isNullOrUndefined(nextPeriod) && periodList.has(nextPeriod)) {
          // Last check just for resilience reasons that the wanted Period is
          // not one of the already-handled ones
          return;
        }

        log.info(
          "Stream",
          "Destroying all TrackSelectorStreams due to out of bounds situation",
          { bufferType, time },
        );
        enableOutOfBoundsCheck = false;
        while (periodList.length() > 0) {
          const period = periodList.get(periodList.length() - 1);
          periodList.removeElement(period);
          callbacks.streamCleared({ type: bufferType, manifest, period });
        }
        allStreamsCanceller.cancel("TrackSelectorStream is out of bounds");
        allStreamsCanceller = new TaskCanceller(
          "StreamOrchestrator Streams for " + bufferType,
        );
        allStreamsCanceller.linkToSignal(orchestratorCancelSignal);

        // As previous callbacks may have performed unknown side-effects, just
        // re-compute the next Period now.
        nextPeriod = getNewBasePeriod();
        if (nextPeriod === undefined) {
          log.warn("Stream", "The wanted position is not found in the Manifest.");
          enableOutOfBoundsCheck = true;
          return;
        }
        launchConsecutiveStreamsForPeriod(nextPeriod);
      },
      { clearSignal: orchestratorCancelSignal, includeLastObservation: true },
    );

    manifest.addEventListener(
      "decipherabilityUpdate",
      (evt) => {
        if (orchestratorCancelSignal.isCancelled()) {
          return;
        }
        onDecipherabilityUpdates(evt).catch((err) => {
          if (orchestratorCancelSignal.isCancelled()) {
            return;
          }
          allStreamsCanceller.cancel("decipherabilityUpdate event");
          callbacks.error(err);
        });
      },
      orchestratorCancelSignal,
    );

    return launchConsecutiveStreamsForPeriod(basePeriod);

    /**
     * @param {Object} period
     */
    function launchConsecutiveStreamsForPeriod(period: IPeriod): void {
      const consecutiveTrackSelectorStreamCb = {
        ...callbacks,
        waitingMediaSourceReload(payload: IWaitingMediaSourceReloadPayload): void {
          // Only reload the MediaSource when the more immediately required
          // Period is the one it is asked for
          const firstPeriod = periodList.head();
          if (firstPeriod === undefined || firstPeriod.id !== payload.period.id) {
            callbacks.lockedStream({
              bufferType: payload.bufferType,
              period: payload.period,
            });
          } else {
            callbacks.needsMediaSourceReload({
              timeOffset: payload.timeOffset,
              minimumPosition: payload.stayInPeriod ? payload.period.start : undefined,
              maximumPosition: payload.stayInPeriod ? payload.period.end : undefined,
            });
          }
        },
        streamReady(payload: IStreamReadyPayload): void {
          enableOutOfBoundsCheck = true;
          periodList.add(payload.period);
          callbacks.streamReady(payload);
        },
        streamCleared(payload: ITrackSelectorStreamClearedPayload): void {
          periodList.removeElement(payload.period);
          callbacks.streamCleared(payload);
        },
        error(err: unknown): void {
          allStreamsCanceller.cancel("TrackSelectorStream err callback");
          callbacks.error(err);
        },
      };
      manageConsecutiveTrackSelectorStreams(
        bufferType,
        period,
        consecutiveTrackSelectorStreamCb,
        allStreamsCanceller.signal,
      );
    }

    /**
     * Returns true if the given time is either:
     *   - less than the start of the chronologically first Period
     *   - more than the end of the chronologically last Period
     * @param {number} time
     * @returns {boolean}
     */
    function isOutOfPeriodList(time: number): boolean {
      const head = periodList.head();
      const last = periodList.last();
      if (head === undefined || last === undefined) {
        // if no period
        return true;
      }
      return (
        head.start > time || (isNullOrUndefined(last.end) ? Infinity : last.end) < time
      );
    }

    /**
     * React to a Manifest's `decipherabilityUpdate` event.
     * @param {Array.<Object>} updates
     * @returns {Promise}
     */
    async function onDecipherabilityUpdates(
      updates: IUpdatedRepresentationInfo[],
    ): Promise<void> {
      const segmentSinkStatus = segmentSinksStore.getStatus(bufferType);
      const ofCurrentType = updates.filter(
        (update) => update.adaptation.type === bufferType,
      );
      if (
        // No update concerns the current type of data
        ofCurrentType.length === 0 ||
        segmentSinkStatus.type !== "initialized" ||
        // The update only notifies of now-decipherable streams
        ofCurrentType.every((x) => x.representation.decipherable === true)
      ) {
        // Data won't have to be removed from the buffers, no need to stop the
        // current Streams.
        return;
      }

      const segmentSink = segmentSinkStatus.value;
      const resettedContent = ofCurrentType.filter(
        (update) => update.representation.decipherable === undefined,
      );
      const undecipherableContent = ofCurrentType.filter(
        (update) => update.representation.decipherable === false,
      );

      /**
       * Time ranges now containing undecipherable content.
       * Those should first be removed and, depending on the platform, may
       * need Supplementary actions as playback issues may remain even after
       * removal.
       */
      const undecipherableRanges = getTimeRangesForContent(
        segmentSink,
        undecipherableContent,
      );

      /**
       * Time ranges now containing content whose decipherability status came
       * back to being unknown.
       * To simplify its handling, those are just removed from the buffer.
       * Less considerations have to be taken than for the `undecipherableRanges`.
       */
      const rangesToRemove = getTimeRangesForContent(segmentSink, resettedContent);

      // First close all Stream currently active so they don't continue to
      // load and push segments.
      enableOutOfBoundsCheck = false;

      log.info(
        "Stream",
        "Destroying all TrackSelectorStreams for decipherability matters",
        {
          bufferType,
        },
      );
      while (periodList.length() > 0) {
        const period = periodList.get(periodList.length() - 1);
        periodList.removeElement(period);
        callbacks.streamCleared({ type: bufferType, manifest, period });
      }

      allStreamsCanceller.cancel("decipherability update");
      allStreamsCanceller = new TaskCanceller(
        "StreamOrchestrator Streams for " + bufferType,
      );
      allStreamsCanceller.linkToSignal(orchestratorCancelSignal);

      /**
       * Re-capture of this new `allStreamsCanceller` in a local context, to be
       * able to re-check specifically it after asynchronous tasks or side-effects
       */
      const restartCanceller = allStreamsCanceller;

      /** Remove from the `SegmentSink` all the concerned time ranges. */
      for (const { start, end } of [...undecipherableRanges, ...rangesToRemove]) {
        // NOTE: This check is **voluntarily** inside the loop, as side-effects
        // might happen during it
        if (restartCanceller.isUsed()) {
          return;
        }
        if (start < end) {
          await segmentSink.removeBuffer(start, end);
        }
      }

      // Schedule micro task before checking the last playback observation
      // to reduce the risk of race conditions where the next observation
      // was going to be emitted synchronously.
      queueMicrotask(() => {
        if (restartCanceller.signal.isCancelled()) {
          return;
        }
        const observation = playbackObserver.getReference().getValue();
        if (needsFlushingAfterClean(observation, undecipherableRanges)) {
          // Bind to Period start and end
          callbacks.needsDecipherabilityFlush();
          if (restartCanceller.isUsed()) {
            return;
          }
        } else if (needsFlushingAfterClean(observation, rangesToRemove)) {
          callbacks.needsBufferFlush();
          if (restartCanceller.isUsed()) {
            return;
          }
        }

        const lastPosition = observation.position.getWanted();
        let newInitialPeriod = manifest.getPeriodForTime(lastPosition);
        if (newInitialPeriod === undefined) {
          // If there's no Period for the current position exactly, select the next one
          newInitialPeriod = manifest.getNextPeriod(lastPosition);
          log.warn(
            "Stream",
            "No Period found for the reloading position, selecting next one instead",
            {
              reloadPosition: lastPosition,
              nextPeriodStart: newInitialPeriod?.start,
            },
          );
        }
        if (newInitialPeriod === undefined) {
          // If there's no Period after the current position, select the last one
          newInitialPeriod = manifest.periods[manifest.periods.length - 1];
          log.warn(
            "Stream",
            "No Period found for of after the reloading position, selecting the last one",
            {
              reloadPosition: lastPosition,
              nextPeriodStart: newInitialPeriod?.start,
              nextPeriodEnd: newInitialPeriod?.end,
            },
          );
        }
        if (newInitialPeriod === undefined) {
          callbacks.error(
            new MediaError(
              "MEDIA_TIME_NOT_FOUND",
              "The wanted position is not found in the Manifest.",
            ),
          );
          return;
        }
        launchConsecutiveStreamsForPeriod(newInitialPeriod);
      });
    }
  }

  /**
   * Create lazily consecutive TrackSelectorStreams:
   *
   * It first creates the `TrackSelectorStream` for `basePeriod` and - once it becomes
   * full - automatically creates the next chronological one.
   * This process repeats until the `TrackSelectorStream` linked to the last Period is
   * full.
   *
   * If an "old" `TrackSelectorStream` becomes active again, it destroys all
   * `TrackSelectorStream` coming after it (from the last chronological one to the
   * first).
   *
   * To clean-up TrackSelectorStreams, each one of them are also automatically
   * destroyed once the current position is superior or equal to the end of
   * the concerned Period.
   *
   * The "streamReady" callback is alled each times a new `TrackSelectorStream`
   * is created.
   *
   * The "streamCleared" callback is called each times a TrackSelectorStream is
   * destroyed (this callback is though not called if it was destroyed due to
   * the given `cancelSignal` emitting or due to a fatal error).
   * @param {string} bufferType - e.g. "audio" or "video"
   * @param {Period} basePeriod - Initial Period downloaded.
   * @param {Object} consecutiveTrackSelectorStreamCb - Callbacks called on various
   * events. See type for more information.
   * @param {Object} cancelSignal - `CancellationSignal` allowing to stop
   * everything that this function was doing. Callbacks in
   * `consecutiveTrackSelectorStreamCb` might still be sent as a consequence of this
   * signal emitting.
   */
  function manageConsecutiveTrackSelectorStreams(
    bufferType: IBufferType,
    basePeriod: IPeriod,
    consecutiveTrackSelectorStreamCb: ITrackSelectorStreamCallbacks & {
      streamCleared(payload: ITrackSelectorStreamClearedPayload): void;
    },
    cancelSignal: CancellationSignal,
  ): void {
    log.info("Stream", "Creating new TrackSelectorStream", {
      bufferType,
      periodStart: basePeriod.start,
    });

    /**
     * Contains properties linnked to the next chronological `TrackSelectorStream` that
     * may be created here.
     */
    let nextStreamInfo: {
      /** Emits when the `TrackSelectorStreamfor should be destroyed, if created. */
      canceller: TaskCanceller;
      /** The `Period` concerned. */
      period: IPeriod;
    } | null = null;

    /** Emits when the `TrackSelectorStream` linked to `basePeriod` should be destroyed. */
    const currentStreamCanceller = new TaskCanceller(
      "StreamOrchestrator current consecutive Streams " + bufferType,
    );
    currentStreamCanceller.linkToSignal(cancelSignal);

    // Stop current TrackSelectorStream when the current position goes over the end of
    // that Period.
    playbackObserver.listen(
      ({ position }, stopListeningObservations) => {
        if (basePeriod.end !== undefined && position.getWanted() >= basePeriod.end) {
          const nextPeriod = manifest.getPeriodAfter(basePeriod);

          // Handle special wantedPosition === basePeriod.end cases
          if (basePeriod.containsTime(position.getWanted(), nextPeriod)) {
            return;
          }
          log.info(
            "Stream",
            "Destroying TrackSelectorStream as the current playhead moved above it",
            {
              bufferType,
              periodStart: basePeriod.start,
              periodEnd: basePeriod.end,
              position: position.getWanted(),
            },
          );
          stopListeningObservations();
          consecutiveTrackSelectorStreamCb.streamCleared({
            type: bufferType,
            manifest,
            period: basePeriod,
          });
          currentStreamCanceller.cancel("Position ahead of TrackSelectorStream");
        }
      },
      { clearSignal: cancelSignal, includeLastObservation: true },
    );

    const trackSelectorStreamArgs = {
      bufferType,
      content: { manifest, period: basePeriod },
      garbageCollectors,
      maxVideoBufferSize,
      segmentQueueCreator,
      segmentSinksStore,
      options,
      playbackObserver,
      representationEstimator,
      wantedBufferAhead,
    };
    const trackSelectorStreamCallbacks: ITrackSelectorStreamCallbacks = {
      ...consecutiveTrackSelectorStreamCb,
      streamStatusUpdate(value: IStreamStatusPayload): void {
        if (value.hasFinishedLoading) {
          const nextPeriod = manifest.getPeriodAfter(basePeriod);
          if (nextPeriod !== null) {
            // current Stream is full, create the next one if not
            checkOrCreateNextTrackSelectorStream(nextPeriod);
          }
        } else if (nextStreamInfo !== null) {
          // current Stream is active, destroy next Stream if created
          log.info(
            "Stream",
            "Destroying next TrackSelectorStream due to current one being active",
            {
              bufferType,
              periodStart: basePeriod.start,
              nextPeriodStart: nextStreamInfo.period.start,
            },
          );
          consecutiveTrackSelectorStreamCb.streamCleared({
            type: bufferType,
            manifest,
            period: nextStreamInfo.period,
          });
          nextStreamInfo.canceller.cancel("previous TrackSelectorStream is active");
          nextStreamInfo = null;
        }
        consecutiveTrackSelectorStreamCb.streamStatusUpdate(value);
      },
      error(err: unknown): void {
        if (nextStreamInfo !== null) {
          nextStreamInfo.canceller.cancel("previous TrackSelectorStream err");
          nextStreamInfo = null;
        }
        currentStreamCanceller.cancel("TrackSelectorStream err");
        consecutiveTrackSelectorStreamCb.error(err);
      },
    };

    TrackSelectorStream(
      trackSelectorStreamArgs,
      trackSelectorStreamCallbacks,
      currentStreamCanceller.signal,
    );
    handleUnexpectedManifestUpdates(currentStreamCanceller.signal);

    /**
     * Create `TrackSelectorStream` for the next Period, specified under `nextPeriod`.
     * @param {Object} nextPeriod
     */
    function checkOrCreateNextTrackSelectorStream(nextPeriod: IPeriod): void {
      if (nextStreamInfo !== null) {
        if (nextStreamInfo.period.id === nextPeriod.id) {
          return;
        }
        log.warn(
          "Stream",
          "Creating next `TrackSelectorStream` while one was already created.",
          {
            bufferType,
            nextPeriodStart: nextPeriod.start,
          },
        );
        consecutiveTrackSelectorStreamCb.streamCleared({
          type: bufferType,
          manifest,
          period: nextStreamInfo.period,
        });
        nextStreamInfo.canceller.cancel("TrackSelectorStream recreation");
      }
      const nextStreamCanceller = new TaskCanceller(
        "StreamOrchestrator next TrackSelectorStream " + bufferType,
      );
      nextStreamCanceller.linkToSignal(cancelSignal);
      nextStreamInfo = { canceller: nextStreamCanceller, period: nextPeriod };
      manageConsecutiveTrackSelectorStreams(
        bufferType,
        nextPeriod,
        consecutiveTrackSelectorStreamCb,
        nextStreamInfo.canceller.signal,
      );
    }

    /**
     * Check on Manifest updates that the Manifest still appears coherent
     * regarding its internal Period structure to what we created for now,
     * handling cases where it does not.
     * @param {Object} innerCancelSignal - When that cancel signal emits, stop
     * performing checks.
     */
    function handleUnexpectedManifestUpdates(innerCancelSignal: CancellationSignal) {
      manifest.addEventListener(
        "manifestUpdate",
        (updates) => {
          // If current period has been unexpectedly removed, ask to reload
          for (const period of updates.removedPeriods) {
            if (period.id === basePeriod.id) {
              // Check that this was not just one  of the earliests Periods that
              // was removed, in which case this is a normal cleanup scenario
              if (
                manifest.periods.length > 0 &&
                manifest.periods[0].start <= period.start
              ) {
                // We begin by scheduling a micro-task to reduce the possibility of race
                // conditions where the inner logic would be called synchronously before
                // the next observation (which may reflect very different playback
                // conditions) is actually received.
                return queueMicrotask(() => {
                  if (innerCancelSignal.isCancelled()) {
                    return;
                  }
                  return callbacks.needsMediaSourceReload({
                    timeOffset: 0,
                    minimumPosition: undefined,
                    maximumPosition: undefined,
                  });
                });
              }
            } else if (period.start > basePeriod.start) {
              break;
            }
          }

          // If the next period changed, cancel the next created one if one
          if (nextStreamInfo !== null) {
            const newNextPeriod = manifest.getPeriodAfter(basePeriod);
            if (newNextPeriod === null || nextStreamInfo.period.id !== newNextPeriod.id) {
              log.warn(
                "Stream",
                "Destroying next TrackSelectorStream due to manifest update",
                {
                  bufferType,
                  nextPeriodStart: nextStreamInfo.period.start,
                },
              );
              consecutiveTrackSelectorStreamCb.streamCleared({
                type: bufferType,
                manifest,
                period: nextStreamInfo.period,
              });
              nextStreamInfo.canceller.cancel("Next Period changed");
              nextStreamInfo = null;
            }
          }
        },
        innerCancelSignal,
      );
    }
  }
}

export type IStreamOrchestratorPlaybackObservation =
  ITrackSelectorStreamPlaybackObservation;

/** Options tweaking the behavior of the StreamOrchestrator. */
export type IStreamOrchestratorOptions = ITrackSelectorStreamOptions & {
  wantedBufferAhead: IReadOnlySharedReference<number>;
  maxVideoBufferSize: IReadOnlySharedReference<number>;
  maxBufferAhead: IReadOnlySharedReference<number>;
  maxBufferBehind: IReadOnlySharedReference<number>;
};

/** Callbacks called by the `StreamOrchestrator` on various events. */
export interface IStreamOrchestratorCallbacks
  extends Omit<ITrackSelectorStreamCallbacks, "waitingMediaSourceReload"> {
  /**
   * Called when a `TrackSelectorStream` has been removed.
   * This event can be used for clean-up purposes. For example, you are free to
   * remove from scope the object used to choose a track for that
   * `TrackSelectorStream`.
   *
   * This callback might not be called when a `TrackSelectorStream` is cleared due to
   * an `error` callback or to the `StreamOrchestrator` being cancellated as
   * both already indicate implicitly that all `TrackSelectorStream` have been cleared.
   */
  streamCleared(payload: ITrackSelectorStreamClearedPayload): void;
  /**
   * Called when a situation needs the MediaSource to be reloaded.
   *
   * Once the MediaSource is reloaded, the `StreamOrchestrator` need to be
   * restarted from scratch.
   */
  needsMediaSourceReload(payload: INeedsMediaSourceReloadPayload): void;
  /**
   * Called when the stream is unable to load segments for a particular Period
   * and buffer type until that Period becomes the currently-played Period.
   *
   * This might be the case for example when a track change happened for an
   * upcoming Period, which necessitates the reloading of the media source
   * once the Period is the current one.
   * Here, the stream might stay in a locked mode for segments linked to that
   * Period and buffer type, meaning it will not load any such segment until that
   * next Period becomes the current one (in which case it will probably ask to
   * reload through the proper callback, `needsMediaSourceReload`).
   *
   * This callback can be useful when investigating rebuffering situation: one
   * might be due to the next Period not loading segment of a certain type
   * because of a locked stream. In that case, playing until or seeking at the
   * start of the corresponding Period should be enough to "unlock" the stream.
   */
  lockedStream(payload: ILockedStreamPayload): void;
  /**
   * Called after the SegmentSink have been "cleaned" to remove from it
   * every non-decipherable segments - usually following an update of the
   * decipherability status of some `Representation`(s).
   *
   * When that event is emitted, the current HTMLMediaElement's buffer might need
   * to be "flushed" to continue (e.g. through a little seek operation) or in
   * worst cases completely removed and re-created through the "reload" mechanism,
   * depending on the platform.
   */
  needsDecipherabilityFlush(): void;
}

/** Payload for the `streamCleared` callback. */
export interface ITrackSelectorStreamClearedPayload {
  /**
   * The type of buffer linked to the `TrackSelectorStream` we just removed.
   *
   * The combination of this and `Period` should give you enough information
   * about which `TrackSelectorStream` has been removed.
   */
  type: IBufferType;
  /** The `Manifest` linked to the `TrackSelectorStream` we just cleared. */
  manifest: IManifest;
  /**
   * The `Period` linked to the `TrackSelectorStream` we just removed.
   *
   * The combination of this and `Period` should give you enough information
   * about which `TrackSelectorStream` has been removed.
   */
  period: IPeriod;
}

/** Payload for the `needsMediaSourceReload` callback. */
export interface INeedsMediaSourceReloadPayload {
  /**
   * Relative position, compared to the current one, at which we should
   * restart playback after reloading. For example `-2` will reload 2 seconds
   * before the current position.
   */
  timeOffset: number;
  /**
   * If defined and if the new position obtained after relying on
   * `timeOffset` is before `minimumPosition`, then we will reload at
   * `minimumPosition`  instead.
   */
  minimumPosition?: number | undefined;
  /**
   * If defined and if the new position obtained after relying on
   * `timeOffset` is after `maximumPosition`, then we will reload at
   * `maximumPosition`  instead.
   */
  maximumPosition?: number | undefined;
}

/** Payload for the `lockedStream` callback. */
export interface ILockedStreamPayload {
  /** Period concerned. */
  period: IPeriod;
  /** Buffer type concerned. */
  bufferType: IBufferType;
}

/**
 * Returns `true` if low-level buffers have to be "flushed" after the given
 * `cleanedRanges` time ranges have been removed from an audio or video
 * SourceBuffer, to prevent playback issues.
 * @param {Object} observation
 * @param {Array.<Object>} cleanedRanges
 * @returns {boolean}
 */
function needsFlushingAfterClean(
  observation: IStreamOrchestratorPlaybackObservation,
  cleanedRanges: Array<{ start: number; end: number }>,
): boolean {
  if (cleanedRanges.length === 0) {
    return false;
  }
  const curPos = observation.position.getPolled();

  // Based on the playback direction, we just check whether we may encounter
  // the corresponding ranges, without seeking or re-switching playback
  // direction which is expected to lead to a low-level flush anyway.
  // There's a 5 seconds security, just to be sure.
  return observation.speed >= 0
    ? cleanedRanges[cleanedRanges.length - 1].end >= curPos - 5
    : cleanedRanges[0].start <= curPos + 5;
}
