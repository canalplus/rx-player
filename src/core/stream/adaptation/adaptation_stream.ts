import nextTick from "next-tick";
import config from "../../../config";
import { formatError } from "../../../errors";
import log from "../../../log";
import { Representation } from "../../../manifest";
import assertUnreachable from "../../../utils/assert_unreachable";
import objectAssign from "../../../utils/object_assign";
import {
  createMappedReference,
  createSharedReference,
  IReadOnlySharedReference,
} from "../../../utils/reference";
import TaskCanceller, {
  CancellationSignal,
} from "../../../utils/task_canceller";
import {
  IABREstimate,
  IRepresentationEstimatorCallbacks,
} from "../../adaptive";
import { IPrioritizedSegmentFetcher } from "../../fetchers";
import RepresentationStream, {
  IRepresentationsChoice,
  IRepresentationStreamCallbacks,
  ITerminationOrder,
} from "../representation";
import getRepresentationsSwitchingStrategy from "./get_representations_switch_strategy";
import {
  IAdaptationStreamArguments,
  IAdaptationStreamCallbacks,
} from "./types";

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
  const { manifest, period, adaptation } = content;

  /** Allows to cancel everything the `AdaptationStream` is doing. */
  const adapStreamCanceller = new TaskCanceller({ cancelOn: parentCancelSignal });

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

  /** Stores the last emitted bitrate. */
  let previouslyEmittedBitrate : number | undefined;

  /** When triggered, cancel all `RepresentationStream`s currently created. */
  let cancelCurrentStreams : TaskCanceller | undefined;

  // Each time the list of wanted Representations changes, we restart the logic
  content.representations.onUpdate((val) => {
    cancelCurrentStreams?.cancel();
    cancelCurrentStreams = new TaskCanceller({ cancelOn: adapStreamCanceller.signal });
    onRepresentationsChoiceChange(val, cancelCurrentStreams.signal).catch((err) => {
      if (cancelCurrentStreams?.isUsed === true &&
          TaskCanceller.isCancellationError(err))
      {
        return;
      }
      adapStreamCanceller.cancel();
      callbacks.error(err);
    });
  }, { clearSignal: adapStreamCanceller.signal, emitCurrentValue: true });
  return;

  /**
   * Function called each time the list of wanted Representations is updated.
   *
   * Returns a Promise to profit from async/await syntax. The Promise resolution
   * does not indicate anything. The Promise may reject however, either on some
   * error or on some cancellation.
   * @param {Object} choice - The last Representations choice that has been
   * made.
   * @param {Object} fnCancelSignal - `CancellationSignal` allowing to cancel
   * everything this function is doing and free all related resources.
   */
  async function onRepresentationsChoiceChange(
    choice : IRepresentationsChoice,
    fnCancelSignal : CancellationSignal
  ) : Promise<void> {
    // First check if we should perform any action regarding what was previously
    // in the buffer
    const switchStrat = getRepresentationsSwitchingStrategy(period,
                                                            adaptation,
                                                            choice,
                                                            segmentBuffer,
                                                            playbackObserver);

    switch (switchStrat.type) {
      case "continue":
        break; // nothing to do
      case "needs-reload": // Just ask to reload
        // We begin by scheduling a micro-task to reduce the possibility of race
        // conditions where the inner logic would be called synchronously before
        // the next observation (which may reflect very different playback conditions)
        // is actually received.
        return nextTick(() => {
          const { DELTA_POSITION_AFTER_RELOAD } = config.getCurrent();
          playbackObserver.listen((observation) => {
            const currentTime = playbackObserver.getCurrentTime();
            const pos = currentTime + DELTA_POSITION_AFTER_RELOAD.bitrateSwitch;

            // Bind to Period start and end
            const position = Math.min(Math.max(period.start, pos),
                                      period.end ?? Infinity);
            const autoPlay = !(observation.paused.pending ??
                               playbackObserver.getIsPaused());
            callbacks.waitingMediaSourceReload({ bufferType: adaptation.type,
                                                 period,
                                                 position,
                                                 autoPlay });
          }, { includeLastObservation: true, clearSignal: fnCancelSignal });
        });

      case "flush-buffer": // Clean + flush
      case "clean-buffer": // Just clean
        for (const range of switchStrat.value) {
          await segmentBuffer.removeBuffer(range.start, range.end, fnCancelSignal);
          if (fnCancelSignal.isCancelled) {
            return;
          }
        }
        if (switchStrat.type === "flush-buffer") {
          callbacks.needsBufferFlush();
          if (fnCancelSignal.isCancelled) {
            return;
          }
        }
        break;
      default: // Should be impossible
        assertUnreachable(switchStrat);
    }

    // TODO not as reference anymore? There seem to be no need anymore
    const representationsList = createSharedReference(choice.representations);
    representationsList.finish();

    // Start-up Adaptive logic
    const { estimates: estimateRef, callbacks: abrCallbacks } =
      representationEstimator({ manifest, period, adaptation },
                              currentRepresentation,
                              representationsList,
                              playbackObserver,
                              fnCancelSignal);

    /** Emit at each bitrate estimate done by the IRepresentationEstimator. */
    estimateRef.onUpdate(({ bitrate }) => {
      if (bitrate === undefined || bitrate === previouslyEmittedBitrate) {
        return ;
      }
      previouslyEmittedBitrate = bitrate;
      log.debug(`Stream: new ${adaptation.type} bitrate estimate`, bitrate);
      callbacks.bitrateEstimateChange({ type: adaptation.type, bitrate });
    }, { emitCurrentValue: true, clearSignal: fnCancelSignal });

    recursivelyCreateRepresentationStreams(estimateRef, abrCallbacks, fnCancelSignal);
  }

  /**
   * Create `RepresentationStream`s starting with the Representation of the last
   * estimate performed.
   * Each time a new estimate is made, this function will create a new
   * `RepresentationStream` corresponding to that new estimate.
   * @param {Object} estimateRef - Reference through which ABR estimates are
   * set. May be updated at any time.
   * @param {Object} abrCallbacks - Callbacks defined by the ABR logic that have
   * to be called at the right time.
   * @param {Object} fnCancelSignal - `CancellationSignal` which will abort
   * anything this function is doing and free allocated resources.
   */
  function recursivelyCreateRepresentationStreams(
    estimateRef : IReadOnlySharedReference<IABREstimate>,
    abrCallbacks : IRepresentationEstimatorCallbacks,
    fnCancelSignal : CancellationSignal
  ) : void {
    /** Allows a `RepresentationStream` to easily fetch media segments. */
    const segmentFetcher = segmentFetcherCreator
      .createSegmentFetcher(adaptation.type,
                            /* eslint-disable @typescript-eslint/unbound-method */
                            { onRequestBegin: abrCallbacks.requestBegin,
                              onRequestEnd: abrCallbacks.requestEnd,
                              onProgress: abrCallbacks.requestProgress,
                              onMetrics: abrCallbacks.metrics });
                            /* eslint-enable @typescript-eslint/unbound-method */

    /**
     * `TaskCanceller` triggered when the current `RepresentationStream` is
     * terminating and as such the next one might be immediately created
     * recursively.
     */
    const repStreamTerminatingCanceller = new TaskCanceller({ cancelOn: fnCancelSignal });
    const { representation } = estimateRef.getValue();
    if (representation === null) {
      return;
    }

    /**
     * Stores the last estimate emitted, starting with `null`.
     * This allows to easily rely on that value in inner Observables which might also
     * need the last already-considered value.
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
     * Recursively create `RepresentationStream`s according to the last
     * Representation estimate.
     */
    const fastSwitchThreshold = createSharedReference<number | undefined>(0);
    if (options.enableFastSwitching) {
      estimateRef.onUpdate((estimate) => {
        fastSwitchThreshold.setValueIfChanged(estimate?.knownStableBitrate);
      }, { clearSignal: repStreamTerminatingCanceller.signal, emitCurrentValue: true });
    }

    const repInfo = { type: adaptation.type, period, representation };
    currentRepresentation.setValue(representation);
    if (adapStreamCanceller.isUsed) {
      return ; // previous callback has stopped everything by side-effect
    }
    callbacks.representationChange(repInfo);
    if (adapStreamCanceller.isUsed) {
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
        if (adapStreamCanceller.isUsed) {
          return;
        }
        callbacks.addedSegment(segmentInfo);
      },
      terminating() {
        if (repStreamTerminatingCanceller.isUsed) {
          return; // Already handled
        }
        repStreamTerminatingCanceller.cancel();
        return recursivelyCreateRepresentationStreams(estimateRef,
                                                      abrCallbacks,
                                                      fnCancelSignal);
      },
    };

    createRepresentationStream(representation,
                               segmentFetcher,
                               terminateCurrentStream,
                               fastSwitchThreshold,
                               representationStreamCallbacks,
                               fnCancelSignal);
  }

  /**
   * Create and returns a new `RepresentationStream`, linked to the
   * given Representation.
   * @param {Object} representation - The Representation the
   * `RepresentationStream` has to be created for.
   * @param {Object} segmentFetcher - Allows to easily fetch segments.
   * @param {Object} terminateCurrentStream - Gives termination orders,
   * indicating that the `RepresentationStream` should stop what it's doing.
   * @param {Object} fastSwitchThreshold - Used to determine when
   * "fast-switching" is possible.
   * @param {Object} representationStreamCallbacks - Callbacks to call on
   * various `RepresentationStream` events.
   * @param {Object} fnCancelSignal - `CancellationSignal` which will abort
   * anything this function is doing and free allocated resources.
   */
  function createRepresentationStream(
    representation : Representation,
    segmentFetcher : IPrioritizedSegmentFetcher<T>,
    terminateCurrentStream : IReadOnlySharedReference<ITerminationOrder | null>,
    fastSwitchThreshold : IReadOnlySharedReference<number | undefined>,
    representationStreamCallbacks : IRepresentationStreamCallbacks<T>,
    fnCancelSignal : CancellationSignal
  ) : void {
    const bufferGoalCanceller = new TaskCanceller({ cancelOn: fnCancelSignal });
    const bufferGoal = createMappedReference(wantedBufferAhead, prev => {
      return prev * getBufferGoalRatio(representation);
    }, bufferGoalCanceller.signal);
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
                                            segmentFetcher,
                                            terminateCurrentStream,
                                            fastSwitchThreshold,
                                            representationStreamCallbacks,
                                            fnCancelSignal);
        }
        representationStreamCallbacks.error(err);
      },
      terminating() {
        bufferGoalCanceller.cancel();
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
                         fnCancelSignal);
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
