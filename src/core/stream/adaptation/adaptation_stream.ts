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
import { formatError } from "../../../errors";
import log from "../../../log";
import { Representation } from "../../../manifest";
import objectAssign from "../../../utils/object_assign";
import {
  createMappedReference,
  createSharedReference,
  IReadOnlySharedReference,
} from "../../../utils/reference";
import TaskCanceller, {
  CancellationSignal,
} from "../../../utils/task_canceller";
import RepresentationStream, {
  IRepresentationStreamCallbacks,
  ITerminationOrder,
} from "../representation";
import {
  IAdaptationStreamArguments,
  IAdaptationStreamCallbacks,
} from "./types";
import createRepresentationEstimator from "./utils/create_representation_estimator";

/**
 * Create new `AdaptationStream` whose task will be to download the media data
 * for a given Adaptation (i.e. "track").
 *
 * It will rely on the IRepresentationEstimator to choose at any time the
 * best Representation for this Adaptation and then run the logic to download
 * and push the corresponding segments in the SegmentBuffer.
 *
 * @param {Object} args - Various arguments allowing the `AdaptationStream` to
 * determine which Representation to choose and which segments to load from it.
 * You can check the corresponding type for more information.
 * @param {Object} callbacks - The `AdaptationStream` relies on a system of
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
 * triggered, to immediately stop all operations the `AdaptationStream` is
 * doing.
 */
export default function AdaptationStream<T>(
  { playbackObserver,
    content,
    options,
    representationEstimator,
    segmentBuffer,
    segmentFetcherCreator,
    wantedBufferAhead,
    maxVideoBufferSize } : IAdaptationStreamArguments,
  callbacks : IAdaptationStreamCallbacks<T>,
  parentCancelSignal : CancellationSignal
) : void {
  const directManualBitrateSwitching = options.manualBitrateSwitchingMode === "direct";
  const { manifest, period, adaptation } = content;

  /** Allows to cancel everything the `AdaptationStream` is doing. */
  const adapStreamCanceller = new TaskCanceller();
  adapStreamCanceller.linkToSignal(parentCancelSignal);

  /**
   * The buffer goal ratio base itself on the value given by `wantedBufferAhead`
   * to determine a more dynamic buffer goal for a given Representation.
   *
   * It can help in cases such as : the current browser has issues with
   * buffering and tells us that we should try to bufferize less data :
   * https://developers.google.com/web/updates/2017/10/quotaexceedederror
   */
  const bufferGoalRatioMap: Map<string, number> = new Map();

  /**
   * Emit the currently chosen `Representation`.
   * `null` if no Representation is chosen for now.
   */
  const currentRepresentation = createSharedReference<Representation | null>(
    null,
    adapStreamCanceller.signal
  );

  const { estimateRef, abrCallbacks } = createRepresentationEstimator(
    content,
    representationEstimator,
    currentRepresentation,
    playbackObserver,
    (err) => {
      adapStreamCanceller.cancel();
      callbacks.error(err);
    },
    adapStreamCanceller.signal
  );

  /** Allows the `RepresentationStream` to easily fetch media segments. */
  const segmentFetcher = segmentFetcherCreator
    .createSegmentFetcher(adaptation.type,
                          /* eslint-disable @typescript-eslint/unbound-method */
                          { onRequestBegin: abrCallbacks.requestBegin,
                            onRequestEnd: abrCallbacks.requestEnd,
                            onProgress: abrCallbacks.requestProgress,
                            onMetrics: abrCallbacks.metrics });
                          /* eslint-enable @typescript-eslint/unbound-method */

  /** Stores the last emitted bitrate. */
  let previousBitrate : number | undefined;

  /** Emit at each bitrate estimate done by the IRepresentationEstimator. */
  estimateRef.onUpdate(({ bitrate }) => {
    if (bitrate === undefined) {
      return ;
    }

    if (bitrate === previousBitrate) {
      return ;
    }
    previousBitrate = bitrate;
    log.debug(`Stream: new ${adaptation.type} bitrate estimate`, bitrate);
    callbacks.bitrateEstimationChange({ type: adaptation.type, bitrate });
  }, { emitCurrentValue: true, clearSignal: adapStreamCanceller.signal });

  recursivelyCreateRepresentationStreams(true);

  /**
   * Create `RepresentationStream`s starting with the Representation of the last
   * estimate performed.
   * Each time a new estimate is made, this function will create a new
   * `RepresentationStream` corresponding to that new estimate.
   * @param {boolean} isFirstEstimate - Whether this is the first time we're
   * creating a `RepresentationStream` in the corresponding `AdaptationStream`.
   * This is important because manual quality switches might need a full reload
   * of the MediaSource _except_ if we are talking about the first quality chosen.
   */
  function recursivelyCreateRepresentationStreams(isFirstEstimate : boolean) : void {
    /**
     * `TaskCanceller` triggered when the current `RepresentationStream` is
     * terminating and as such the next one might be immediately created
     * recursively.
     */
    const repStreamTerminatingCanceller = new TaskCanceller();
    repStreamTerminatingCanceller.linkToSignal(adapStreamCanceller.signal);
    const { representation, manual } = estimateRef.getValue();
    if (representation === null) {
      return;
    }

    // A manual bitrate switch might need an immediate feedback.
    // To do that properly, we need to reload the MediaSource
    if (directManualBitrateSwitching && manual && !isFirstEstimate) {
      const { DELTA_POSITION_AFTER_RELOAD } = config.getCurrent();

      // We begin by scheduling a micro-task to reduce the possibility of race
      // conditions where the inner logic would be called synchronously before
      // the next observation (which may reflect very different playback conditions)
      // is actually received.
      return nextTick(() => {
        playbackObserver.listen((observation) => {
          const { manual: newManual } = estimateRef.getValue();
          if (!newManual) {
            return;
          }
          const currentTime = playbackObserver.getCurrentTime();
          const pos = currentTime + DELTA_POSITION_AFTER_RELOAD.bitrateSwitch;

          // Bind to Period start and end
          const position = Math.min(Math.max(period.start, pos),
                                    period.end ?? Infinity);
          const autoPlay = !(observation.paused.pending ??
                             playbackObserver.getIsPaused());
          return callbacks.waitingMediaSourceReload({ bufferType: adaptation.type,
                                                      period,
                                                      position,
                                                      autoPlay });
        }, { includeLastObservation: true,
             clearSignal: repStreamTerminatingCanceller.signal });
      });
    }

    /**
     * Emit when the current RepresentationStream should be terminated to make
     * place for a new one (e.g. when switching quality).
     */
    const terminateCurrentStream = createSharedReference<ITerminationOrder | null>(
      null,
      repStreamTerminatingCanceller.signal
    );

    /** Allows to stop listening to estimateRef on the following line. */
    estimateRef.onUpdate((estimate) => {
      if (estimate.representation === null ||
          estimate.representation.id === representation.id)
      {
        return;
      }
      if (estimate.urgent) {
        log.info("Stream: urgent Representation switch", adaptation.type);
        return terminateCurrentStream.setValue({ urgent: true });
      } else {
        log.info("Stream: slow Representation switch", adaptation.type);
        return terminateCurrentStream.setValue({ urgent: false });
      }
    }, { clearSignal: repStreamTerminatingCanceller.signal, emitCurrentValue: true });

    /**
     * "Fast-switching" is a behavior allowing to replace low-quality segments
     * (i.e. with a low bitrate) with higher-quality segments (higher bitrate) in
     * the buffer.
     * This threshold defines a bitrate from which "fast-switching" is disabled.
     * For example with a fastSwitchThreshold set to `100`, segments with a
     * bitrate of `90` can be replaced. But segments with a bitrate of `100`
     * onward won't be replaced by higher quality segments.
     * Set to `undefined` to indicate that there's no threshold (anything can be
     * replaced by higher-quality segments).
     */
    const fastSwitchThreshold = createSharedReference<number | undefined>(0);
    if (options.enableFastSwitching) {
      estimateRef.onUpdate((estimate) => {
        fastSwitchThreshold.setValueIfChanged(estimate?.knownStableBitrate);
      }, { clearSignal: repStreamTerminatingCanceller.signal, emitCurrentValue: true });
    }

    const repInfo = { type: adaptation.type, period, representation };
    currentRepresentation.setValue(representation);
    if (adapStreamCanceller.isUsed()) {
      return ; // previous callback has stopped everything by side-effect
    }
    callbacks.representationChange(repInfo);
    if (adapStreamCanceller.isUsed()) {
      return ; // previous callback has stopped everything by side-effect
    }

    const representationStreamCallbacks : IRepresentationStreamCallbacks<T> = {
      streamStatusUpdate: callbacks.streamStatusUpdate,
      encryptionDataEncountered: callbacks.encryptionDataEncountered,
      manifestMightBeOufOfSync: callbacks.manifestMightBeOufOfSync,
      needsManifestRefresh: callbacks.needsManifestRefresh,
      inbandEvent: callbacks.inbandEvent,
      warning: callbacks.warning,
      error(err : unknown) {
        adapStreamCanceller.cancel();
        callbacks.error(err);
      },
      addedSegment(segmentInfo) {
        abrCallbacks.addedSegment(segmentInfo);
        if (adapStreamCanceller.isUsed()) {
          return;
        }
        callbacks.addedSegment(segmentInfo);
      },
      terminating() {
        if (repStreamTerminatingCanceller.isUsed()) {
          return; // Already handled
        }
        repStreamTerminatingCanceller.cancel();
        return recursivelyCreateRepresentationStreams(false);
      },
    };

    createRepresentationStream(representation,
                               terminateCurrentStream,
                               fastSwitchThreshold,
                               representationStreamCallbacks);
  }

  /**
   * Create and returns a new `RepresentationStream`, linked to the
   * given Representation.
   * @param {Object} representation
   * @param {Object} terminateCurrentStream
   * @param {Object} fastSwitchThreshold
   * @param {Object} representationStreamCallbacks
   */
  function createRepresentationStream(
    representation : Representation,
    terminateCurrentStream : IReadOnlySharedReference<ITerminationOrder | null>,
    fastSwitchThreshold : IReadOnlySharedReference<number | undefined>,
    representationStreamCallbacks : IRepresentationStreamCallbacks<T>
  ) : void {
    /**
     * `TaskCanceller` triggered when the `RepresentationStream` calls its
     * `terminating` callback.
     */
    const terminatingRepStreamCanceller = new TaskCanceller();
    terminatingRepStreamCanceller.linkToSignal(adapStreamCanceller.signal);
    const bufferGoal = createMappedReference(wantedBufferAhead, prev => {
      return prev * getBufferGoalRatio(representation);
    }, terminatingRepStreamCanceller.signal);
    const maxBufferSize = adaptation.type === "video" ?
      maxVideoBufferSize :
      createSharedReference(Infinity);

    log.info("Stream: changing representation",
             adaptation.type,
             representation.id,
             representation.bitrate);
    const updatedCallbacks = objectAssign({}, representationStreamCallbacks, {
      error(err : unknown) {
        const formattedError = formatError(err, {
          defaultCode: "NONE",
          defaultReason: "Unknown `RepresentationStream` error",
        });
        if (formattedError.code === "BUFFER_FULL_ERROR") {
          const wba = wantedBufferAhead.getValue();
          const lastBufferGoalRatio = bufferGoalRatioMap.get(representation.id) ?? 1;
          if (lastBufferGoalRatio <= 0.25 || wba * lastBufferGoalRatio <= 2) {
            throw formattedError;
          }
          bufferGoalRatioMap.set(representation.id, lastBufferGoalRatio - 0.25);
          return createRepresentationStream(representation,
                                            terminateCurrentStream,
                                            fastSwitchThreshold,
                                            representationStreamCallbacks);
        }
        representationStreamCallbacks.error(err);
      },
      terminating() {
        terminatingRepStreamCanceller.cancel();
        representationStreamCallbacks.terminating();
      },
    });
    RepresentationStream({ playbackObserver,
                           content: { representation,
                                      adaptation,
                                      period,
                                      manifest },
                           segmentBuffer,
                           segmentFetcher,
                           terminate: terminateCurrentStream,
                           options: { bufferGoal,
                                      maxBufferSize,
                                      drmSystemId: options.drmSystemId,
                                      fastSwitchThreshold } },
                         updatedCallbacks,
                         adapStreamCanceller.signal);
  }

  /**
   * @param {Object} representation
   * @returns {number}
   */
  function getBufferGoalRatio(representation : Representation) : number {
    const oldBufferGoalRatio = bufferGoalRatioMap.get(representation.id);
    const bufferGoalRatio = oldBufferGoalRatio !== undefined ? oldBufferGoalRatio :
                                                               1;
    if (oldBufferGoalRatio === undefined) {
      bufferGoalRatioMap.set(representation.id, bufferGoalRatio);
    }
    return bufferGoalRatio;
  }
}
