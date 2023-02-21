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

import nextTick from "next-tick";
import config from "../../../config";
import { MediaError } from "../../../errors";
import log from "../../../log";
import Manifest, {
  IDecipherabilityUpdateElement,
  Period,
} from "../../../manifest";
import {
  createMappedReference,
  IReadOnlySharedReference,
} from "../../../utils/reference";
import SortedList from "../../../utils/sorted_list";
import TaskCanceller, {
  CancellationSignal,
} from "../../../utils/task_canceller";
import WeakMapMemory from "../../../utils/weak_map_memory";
import { IRepresentationEstimator } from "../../adaptive";
import type { IReadOnlyPlaybackObserver } from "../../api";
import { SegmentFetcherCreator } from "../../fetchers";
import SegmentBuffersStore, {
  BufferGarbageCollector,
  IBufferType,
  SegmentBuffer,
} from "../../segment_buffers";
import { IWaitingMediaSourceReloadPayload } from "../adaptation";
import PeriodStream, {
  IPeriodStreamCallbacks,
  IPeriodStreamOptions,
  IPeriodStreamPlaybackObservation,
  IPeriodStreamReadyPayload,
} from "../period";
import { IStreamStatusPayload } from "../representation";
import getTimeRangesForContent from "./get_time_ranges_for_content";

/**
 * Create and manage the various "Streams" needed for the content to
 * play:
 *
 *   - Create or dispose SegmentBuffers depending on the chosen Adaptations.
 *
 *   - Push the right segments to those SegmentBuffers depending on the user's
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
 * @param {Object} segmentBuffersStore - Will be used to lazily create
 * SegmentBuffer instances associated with the current content.
 * @param {Object} segmentFetcherCreator - Allow to download segments.
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
 * when triggered, to immediately stop all operations the `PeriodStream` is
 * doing.
 */
export default function StreamOrchestrator(
  content : { manifest : Manifest;
              initialPeriod : Period; },
  playbackObserver : IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>,
  representationEstimator : IRepresentationEstimator,
  segmentBuffersStore : SegmentBuffersStore,
  segmentFetcherCreator : SegmentFetcherCreator,
  options : IStreamOrchestratorOptions,
  callbacks : IStreamOrchestratorCallbacks,
  orchestratorCancelSignal : CancellationSignal
) : void {
  const { manifest, initialPeriod } = content;
  const { maxBufferAhead,
          maxBufferBehind,
          wantedBufferAhead,
          maxVideoBufferSize } = options;

  const { MAXIMUM_MAX_BUFFER_AHEAD,
          MAXIMUM_MAX_BUFFER_BEHIND } = config.getCurrent();

  // Keep track of a unique BufferGarbageCollector created per
  // SegmentBuffer.
  const garbageCollectors =
    new WeakMapMemory((segmentBuffer : SegmentBuffer) => {
      const { bufferType } = segmentBuffer;
      const defaultMaxBehind = MAXIMUM_MAX_BUFFER_BEHIND[bufferType] != null ?
                                 MAXIMUM_MAX_BUFFER_BEHIND[bufferType] as number :
                                 Infinity;
      const defaultMaxAhead = MAXIMUM_MAX_BUFFER_AHEAD[bufferType] != null ?
                                MAXIMUM_MAX_BUFFER_AHEAD[bufferType] as number :
                                Infinity;
      return (gcCancelSignal : CancellationSignal) => {
        BufferGarbageCollector(
          { segmentBuffer,
            playbackObserver,
            maxBufferBehind: createMappedReference(maxBufferBehind,
                                                   (val) =>
                                                     Math.min(val, defaultMaxBehind),
                                                   gcCancelSignal),
            maxBufferAhead: createMappedReference(maxBufferAhead,
                                                  (val) =>
                                                    Math.min(val, defaultMaxAhead),
                                                  gcCancelSignal) },
          gcCancelSignal
        );
      };
    });

  // Create automatically the right `PeriodStream` for every possible types
  for (const bufferType of segmentBuffersStore.getBufferTypes()) {
    manageEveryStreams(bufferType, initialPeriod);
  }

  /**
   * Manage creation and removal of Streams for every Periods for a given type.
   *
   * Works by creating consecutive Streams through the
   * `manageConsecutivePeriodStreams` function, and restarting it when the
   * current position goes out of the bounds of these Streams.
   * @param {string} bufferType - e.g. "audio" or "video"
   * @param {Period} basePeriod - Initial Period downloaded.
   */
  function manageEveryStreams(bufferType : IBufferType, basePeriod : Period) : void {
    /** Each Period for which there is currently a Stream, chronologically */
    const periodList = new SortedList<Period>((a, b) => a.start - b.start);

    /**
     * When set to `true`, all the currently active PeriodStream will be destroyed
     * and re-created from the new current position if we detect it to be out of
     * their bounds.
     * This is set to false when we're in the process of creating the first
     * PeriodStream, to avoid interferences while no PeriodStream is available.
     */
    let enableOutOfBoundsCheck = false;

    /** Cancels currently created `PeriodStream`s. */
    let currentCanceller = new TaskCanceller();
    currentCanceller.linkToSignal(orchestratorCancelSignal);

    // Restart the current Stream when the wanted time is in another period
    // than the ones already considered
    playbackObserver.listen(({ position }) => {
      const time = position.pending ?? position.last;
      if (!enableOutOfBoundsCheck || !isOutOfPeriodList(time)) {
        return ;
      }

      log.info("Stream: Destroying all PeriodStreams due to out of bounds situation",
               bufferType, time);
      enableOutOfBoundsCheck = false;
      while (periodList.length() > 0) {
        const period = periodList.get(periodList.length() - 1);
        periodList.removeElement(period);
        callbacks.periodStreamCleared({ type: bufferType, period });
      }
      currentCanceller.cancel();
      currentCanceller = new TaskCanceller();
      currentCanceller.linkToSignal(orchestratorCancelSignal);

      const nextPeriod = manifest.getPeriodForTime(time) ??
                         manifest.getNextPeriod(time);
      if (nextPeriod === undefined) {
        log.warn("Stream: The wanted position is not found in the Manifest.");
        return;
      }
      launchConsecutiveStreamsForPeriod(nextPeriod);
    }, { clearSignal: orchestratorCancelSignal, includeLastObservation: true });

    manifest.addEventListener("decipherabilityUpdate", (evt) => {
      onDecipherabilityUpdates(evt).catch(err => {
        currentCanceller.cancel();
        callbacks.error(err);
      });
    }, orchestratorCancelSignal);

    return launchConsecutiveStreamsForPeriod(basePeriod);

    /**
     * @param {Object} period
     */
    function launchConsecutiveStreamsForPeriod(period : Period) : void {
      const consecutivePeriodStreamCb = {
        ...callbacks,
        waitingMediaSourceReload(payload : IWaitingMediaSourceReloadPayload) : void {
          // Only reload the MediaSource when the more immediately required
          // Period is the one asking for it
          const firstPeriod = periodList.head();
          if (firstPeriod === undefined ||
              firstPeriod.id !== payload.period.id)
          {
            callbacks.lockedStream({ bufferType: payload.bufferType,
                                     period: payload.period });
          } else {
            const { position, autoPlay } = payload;
            callbacks.needsMediaSourceReload({ position, autoPlay });
          }
        },
        periodStreamReady(payload : IPeriodStreamReadyPayload) : void {
          enableOutOfBoundsCheck = true;
          periodList.add(payload.period);
          callbacks.periodStreamReady(payload);
        },
        periodStreamCleared(payload : IPeriodStreamClearedPayload) : void {
          periodList.removeElement(payload.period);
          callbacks.periodStreamCleared(payload);
        },
        error(err : unknown) : void {
          currentCanceller.cancel();
          callbacks.error(err);
        },
      };
      manageConsecutivePeriodStreams(bufferType,
                                     period,
                                     consecutivePeriodStreamCb,
                                     currentCanceller.signal);
    }

    /**
     * Returns true if the given time is either:
     *   - less than the start of the chronologically first Period
     *   - more than the end of the chronologically last Period
     * @param {number} time
     * @returns {boolean}
     */
    function isOutOfPeriodList(time : number) : boolean {
      const head = periodList.head();
      const last = periodList.last();
      if (head == null || last == null) { // if no period
        return true;
      }
      return head.start > time ||
            (last.end == null ? Infinity :
                                last.end) < time;
    }

    /**
     * React to a Manifest's decipherability updates.
     * @param {Array.<Object>}
     * @returns {Promise}
     */
    async function onDecipherabilityUpdates(
      updates : IDecipherabilityUpdateElement[]
    ) : Promise<void> {
      const segmentBufferStatus = segmentBuffersStore.getStatus(bufferType);
      const ofCurrentType = updates
        .filter(update => update.adaptation.type === bufferType);
      if (
        // No update concerns the current type of data
        ofCurrentType.length === 0 ||
        segmentBufferStatus.type !== "initialized" ||
        // The update only notifies of now-decipherable streams
        ofCurrentType.every(x => x.representation.decipherable === true)
      ) {
        // Data won't have to be removed from the buffers, no need to stop the
        // current Streams.
        return ;
      }

      const segmentBuffer = segmentBufferStatus.value;
      const resettedContent = ofCurrentType.filter(update =>
        update.representation.decipherable === undefined);
      const undecipherableContent = ofCurrentType.filter(update =>
        update.representation.decipherable === false);

      /**
       * Time ranges now containing undecipherable content.
       * Those should first be removed and, depending on the platform, may
       * need Supplementary actions as playback issues may remain even after
       * removal.
       */
      const undecipherableRanges = getTimeRangesForContent(segmentBuffer,
                                                           undecipherableContent);

      /**
       * Time ranges now containing content whose decipherability status came
       * back to being unknown.
       * To simplify its handling, those are just removed from the buffer.
       * Less considerations have to be taken than for the `undecipherableRanges`.
       */
      const rangesToRemove = getTimeRangesForContent(segmentBuffer,
                                                     resettedContent);

      // First close all Stream currently active so they don't continue to
      // load and push segments.
      enableOutOfBoundsCheck = false;

      log.info("Stream: Destroying all PeriodStreams for decipherability matters",
               bufferType);
      while (periodList.length() > 0) {
        const period = periodList.get(periodList.length() - 1);
        periodList.removeElement(period);
        callbacks.periodStreamCleared({ type: bufferType, period });
      }

      currentCanceller.cancel();
      currentCanceller = new TaskCanceller();
      currentCanceller.linkToSignal(orchestratorCancelSignal);

      /** Remove from the `SegmentBuffer` all the concerned time ranges. */
      for (const { start, end } of [...undecipherableRanges, ...rangesToRemove]) {
        if (start < end) {
          await segmentBuffer.removeBuffer(start, end, orchestratorCancelSignal);
        }
      }

      // Schedule micro task before checking the last playback observation
      // to reduce the risk of race conditions where the next observation
      // was going to be emitted synchronously.
      nextTick(() => {
        if (orchestratorCancelSignal.isCancelled()) {
          return ;
        }
        const observation = playbackObserver.getReference().getValue();
        if (needsFlushingAfterClean(observation, undecipherableRanges)) {
          const shouldAutoPlay = !(observation.paused.pending ??
                                   playbackObserver.getIsPaused());
          callbacks.needsDecipherabilityFlush({ position: observation.position.last,
                                                autoPlay: shouldAutoPlay,
                                                duration: observation.duration });
          if (orchestratorCancelSignal.isCancelled()) {
            return ;
          }
        } else if (needsFlushingAfterClean(observation, rangesToRemove)) {
          callbacks.needsBufferFlush();
          if (orchestratorCancelSignal.isCancelled()) {
            return ;
          }
        }

        const lastPosition = observation.position.pending ??
                             observation.position.last;
        const newInitialPeriod = manifest.getPeriodForTime(lastPosition);
        if (newInitialPeriod == null) {
          callbacks.error(
            new MediaError("MEDIA_TIME_NOT_FOUND",
                           "The wanted position is not found in the Manifest.")
          );
          return;
        }
        launchConsecutiveStreamsForPeriod(newInitialPeriod);
      });
    }
  }

  /**
   * Create lazily consecutive PeriodStreams:
   *
   * It first creates the `PeriodStream` for `basePeriod` and - once it becomes
   * full - automatically creates the next chronological one.
   * This process repeats until the `PeriodStream` linked to the last Period is
   * full.
   *
   * If an "old" `PeriodStream` becomes active again, it destroys all
   * `PeriodStream` coming after it (from the last chronological one to the
   * first).
   *
   * To clean-up PeriodStreams, each one of them are also automatically
   * destroyed once the current position is superior or equal to the end of
   * the concerned Period.
   *
   * The "periodStreamReady" callback is alled each times a new `PeriodStream`
   * is created.
   *
   * The "periodStreamCleared" callback is called each times a PeriodStream is
   * destroyed (this callback is though not called if it was destroyed due to
   * the given `cancelSignal` emitting or due to a fatal error).
   * @param {string} bufferType - e.g. "audio" or "video"
   * @param {Period} basePeriod - Initial Period downloaded.
   * @param {Object} consecutivePeriodStreamCb - Callbacks called on various
   * events. See type for more information.
   * @param {Object} cancelSignal - `CancellationSignal` allowing to stop
   * everything that this function was doing. Callbacks in
   * `consecutivePeriodStreamCb` might still be sent as a consequence of this
   * signal emitting.
   */
  function manageConsecutivePeriodStreams(
    bufferType : IBufferType,
    basePeriod : Period,
    consecutivePeriodStreamCb : IPeriodStreamCallbacks & {
      periodStreamCleared(payload : IPeriodStreamClearedPayload) : void;
    },
    cancelSignal : CancellationSignal
  ) : void {
    log.info("Stream: Creating new Stream for", bufferType, basePeriod.start);

    /**
     * Contains properties linnked to the next chronological `PeriodStream` that
     * may be created here.
     */
    let nextStreamInfo : {
      /** Emits when the `PeriodStreamfor should be destroyed, if created. */
      canceller : TaskCanceller;
      /** The `Period` concerned. */
      period : Period;
    } | null = null;

    /** Emits when the `PeriodStream` linked to `basePeriod` should be destroyed. */
    const currentStreamCanceller = new TaskCanceller();
    currentStreamCanceller.linkToSignal(cancelSignal);

    // Stop current PeriodStream when the current position goes over the end of
    // that Period.
    playbackObserver.listen(({ position }, stopListeningObservations) => {
      if (basePeriod.end !== undefined &&
          (position.pending ?? position.last) >= basePeriod.end)
      {
        log.info("Stream: Destroying PeriodStream as the current playhead moved above it",
                 bufferType,
                 basePeriod.start,
                 position.pending ?? position.last,
                 basePeriod.end);
        stopListeningObservations();
        consecutivePeriodStreamCb.periodStreamCleared({ type: bufferType,
                                                        period: basePeriod });
        currentStreamCanceller.cancel();
      }
    }, { clearSignal: cancelSignal, includeLastObservation: true });

    const periodStreamArgs = { bufferType,
                               content: { manifest, period: basePeriod },
                               garbageCollectors,
                               maxVideoBufferSize,
                               segmentFetcherCreator,
                               segmentBuffersStore,
                               options,
                               playbackObserver,
                               representationEstimator,
                               wantedBufferAhead };
    const periodStreamCallbacks : IPeriodStreamCallbacks = {
      ...consecutivePeriodStreamCb,
      streamStatusUpdate(value : IStreamStatusPayload) : void {
        if (value.hasFinishedLoading) {
          const nextPeriod = manifest.getPeriodAfter(basePeriod);
          if (nextPeriod !== null) {
            // current Stream is full, create the next one if not
            createNextPeriodStream(nextPeriod);
          }
        } else if (nextStreamInfo !== null) {
          // current Stream is active, destroy next Stream if created
          log.info("Stream: Destroying next PeriodStream due to current one being active",
                   bufferType, nextStreamInfo.period.start);
          consecutivePeriodStreamCb
            .periodStreamCleared({ type: bufferType, period: nextStreamInfo.period });
          nextStreamInfo.canceller.cancel();
          nextStreamInfo = null;
        }
        consecutivePeriodStreamCb.streamStatusUpdate(value);
      },
      error(err : unknown) : void {
        if (nextStreamInfo !== null) {
          nextStreamInfo.canceller.cancel();
          nextStreamInfo = null;
        }
        currentStreamCanceller.cancel();
        consecutivePeriodStreamCb.error(err);
      },
    };

    PeriodStream(periodStreamArgs, periodStreamCallbacks, currentStreamCanceller.signal);

    /**
     * Create `PeriodStream` for the next Period, specified under `nextPeriod`.
     * @param {Object} nextPeriod
     */
    function createNextPeriodStream(nextPeriod : Period) : void {
      if (nextStreamInfo !== null) {
        log.warn("Stream: Creating next `PeriodStream` while it was already created.");
        consecutivePeriodStreamCb.periodStreamCleared({ type: bufferType,
                                                        period: nextStreamInfo.period });
        nextStreamInfo.canceller.cancel();
      }
      const nextStreamCanceller = new TaskCanceller();
      nextStreamCanceller.linkToSignal(cancelSignal);
      nextStreamInfo = { canceller: nextStreamCanceller,
                         period: nextPeriod };
      manageConsecutivePeriodStreams(bufferType,
                                     nextPeriod,
                                     consecutivePeriodStreamCb,
                                     nextStreamInfo.canceller.signal);
    }
  }
}

export type IStreamOrchestratorPlaybackObservation = IPeriodStreamPlaybackObservation;

/** Options tweaking the behavior of the StreamOrchestrator. */
export type IStreamOrchestratorOptions =
  IPeriodStreamOptions &
  { wantedBufferAhead : IReadOnlySharedReference<number>;
    maxVideoBufferSize : IReadOnlySharedReference<number>;
    maxBufferAhead : IReadOnlySharedReference<number>;
    maxBufferBehind : IReadOnlySharedReference<number>; };

/** Callbacks called by the `StreamOrchestrator` on various events. */
export interface IStreamOrchestratorCallbacks
  extends Omit<IPeriodStreamCallbacks, "waitingMediaSourceReload">
{
  /**
   * Called when a `PeriodStream` has been removed.
   * This event can be used for clean-up purposes. For example, you are free to
   * remove from scope the object used to choose a track for that
   * `PeriodStream`.
   *
   * This callback might not be called when a `PeriodStream` is cleared due to
   * an `error` callback or to the `StreamOrchestrator` being cancellated as
   * both already indicate implicitly that all `PeriodStream` have been cleared.
   */
  periodStreamCleared(payload : IPeriodStreamClearedPayload) : void;
  /**
   * Called when a situation needs the MediaSource to be reloaded.
   *
   * Once the MediaSource is reloaded, the `StreamOrchestrator` need to be
   * restarted from scratch.
   */
  needsMediaSourceReload(payload : INeedsMediaSourceReloadPayload) : void;
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
  lockedStream(payload : ILockedStreamPayload) : void;
  /**
   * Called after the SegmentBuffer have been "cleaned" to remove from it
   * every non-decipherable segments - usually following an update of the
   * decipherability status of some `Representation`(s).
   *
   * When that event is emitted, the current HTMLMediaElement's buffer might need
   * to be "flushed" to continue (e.g. through a little seek operation) or in
   * worst cases completely removed and re-created through the "reload" mechanism,
   * depending on the platform.
   */
  needsDecipherabilityFlush(payload : INeedsDecipherabilityFlushPayload) : void;
}

/** Payload for the `periodStreamCleared` callback. */
export interface IPeriodStreamClearedPayload {
  /**
   * The type of buffer linked to the `PeriodStream` we just removed.
   *
   * The combination of this and `Period` should give you enough information
   * about which `PeriodStream` has been removed.
   */
  type : IBufferType;
  /**
   * The `Period` linked to the `PeriodStream` we just removed.
   *
   * The combination of this and `Period` should give you enough information
   * about which `PeriodStream` has been removed.
   */
  period : Period;
}

/** Payload for the `needsMediaSourceReload` callback. */
export interface INeedsMediaSourceReloadPayload {
  /**
   * The position in seconds and the time at which the MediaSource should be
   * reset once it has been reloaded.
   */
  position : number;
  /**
   * If `true`, we want the HTMLMediaElement to play right after the reload is
   * done.
   * If `false`, we want to stay in a paused state at that point.
   */
  autoPlay : boolean;
}

/** Payload for the `lockedStream` callback. */
export interface ILockedStreamPayload {
  /** Period concerned. */
  period : Period;
  /** Buffer type concerned. */
  bufferType : IBufferType;
}

/** Payload for the `needsDecipherabilityFlush` callback. */
export interface INeedsDecipherabilityFlushPayload {
  /**
   * Indicated in the case where the MediaSource has to be reloaded,
   * in which case the time of the HTMLMediaElement should be reset to that
   * position, in seconds, once reloaded.
   */
  position : number;
  /**
   * If `true`, we want the HTMLMediaElement to play right after the flush is
   * done.
   * If `false`, we want to stay in a paused state at that point.
   */
  autoPlay : boolean;
  /**
   * The duration (maximum seekable position) of the content.
   * This is indicated in the case where a seek has to be performed, to avoid
   * seeking too far in the content.
   */
  duration : number;
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
  observation : IStreamOrchestratorPlaybackObservation,
  cleanedRanges : Array<{ start: number; end: number }>
) : boolean {
  if (cleanedRanges.length === 0) {
    return false;
  }
  const curPos = observation.position.last;

  // Based on the playback direction, we just check whether we may encounter
  // the corresponding ranges, without seeking or re-switching playback
  // direction which is expected to lead to a low-level flush anyway.
  // There's a 5 seconds security, just to be sure.
  return observation.speed >= 0 ?
    cleanedRanges[cleanedRanges.length - 1] .end >= curPos - 5 :
    cleanedRanges[0].start <= curPos + 5;
}
