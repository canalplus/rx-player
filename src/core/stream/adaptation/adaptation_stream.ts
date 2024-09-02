import config from "../../../config";
import { formatError } from "../../../errors";
import log from "../../../log";
import type { IRepresentation } from "../../../manifest";
import arrayIncludes from "../../../utils/array_includes";
import { assertUnreachable } from "../../../utils/assert";
import cancellableSleep from "../../../utils/cancellable_sleep";
import noop from "../../../utils/noop";
import objectAssign from "../../../utils/object_assign";
import queueMicrotask from "../../../utils/queue_microtask";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import SharedReference, { createMappedReference } from "../../../utils/reference";
import type { CancellationSignal } from "../../../utils/task_canceller";
import TaskCanceller from "../../../utils/task_canceller";
import type {
  IRepresentationsChoice,
  IRepresentationStreamCallbacks,
  ITerminationOrder,
} from "../representation";
import RepresentationStream from "../representation";
import getRepresentationsSwitchingStrategy from "./get_representations_switch_strategy";
import type { IAdaptationStreamArguments, IAdaptationStreamCallbacks } from "./types";

/**
 * Create new `AdaptationStream` whose task will be to download the media data
 * for a given Adaptation (i.e. "track").
 *
 * It will rely on the IRepresentationEstimator to choose at any time the
 * best Representation for this Adaptation and then run the logic to download
 * and push the corresponding segments in the SegmentSink.
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
export default function AdaptationStream(
  {
    playbackObserver,
    content,
    options,
    representationEstimator,
    segmentSink,
    segmentFetcherCreator,
    wantedBufferAhead,
    maxVideoBufferSize,
  }: IAdaptationStreamArguments,
  callbacks: IAdaptationStreamCallbacks,
  parentCancelSignal: CancellationSignal,
): void {
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
  const currentRepresentation = new SharedReference<IRepresentation | null>(
    null,
    adapStreamCanceller.signal,
  );

  /** Stores the last emitted bitrate. */
  let previouslyEmittedBitrate: number | undefined;

  const initialRepIds = content.representations.getValue().representationIds;
  const initialRepresentations = getRepresentationList(
    content.adaptation.representations,
    initialRepIds,
  );

  /** Emit the list of Representation for the adaptive logic. */
  const representationsList = new SharedReference(
    initialRepresentations,
    adapStreamCanceller.signal,
  );

  // Start-up Adaptive logic
  const { estimates: estimateRef, callbacks: abrCallbacks } = representationEstimator(
    { manifest, period, adaptation },
    currentRepresentation,
    representationsList,
    playbackObserver,
    adapStreamCanceller.signal,
  );

  /** Allows a `RepresentationStream` to easily fetch media segments. */
  const segmentFetcher = segmentFetcherCreator.createSegmentFetcher(
    adaptation.type,
    /* eslint-disable @typescript-eslint/unbound-method */
    {
      onRequestBegin: abrCallbacks.requestBegin,
      onRequestEnd: abrCallbacks.requestEnd,
      onProgress: abrCallbacks.requestProgress,
      onMetrics: abrCallbacks.metrics,
    },
  );
  /* eslint-enable @typescript-eslint/unbound-method */

  /** Used to determine when "fast-switching" is possible. */
  const fastSwitchThreshold = new SharedReference<number | undefined>(0);

  estimateRef.onUpdate(
    ({ bitrate, knownStableBitrate }) => {
      if (options.enableFastSwitching) {
        fastSwitchThreshold.setValueIfChanged(knownStableBitrate);
      }
      if (bitrate === undefined || bitrate === previouslyEmittedBitrate) {
        return;
      }
      previouslyEmittedBitrate = bitrate;
      log.debug(`Stream: new ${adaptation.type} bitrate estimate`, bitrate);
      callbacks.bitrateEstimateChange({ type: adaptation.type, bitrate });
    },
    { emitCurrentValue: true, clearSignal: adapStreamCanceller.signal },
  );

  /**
   * When triggered, cancel all `RepresentationStream`s currently created.
   * Set to `undefined` initially.
   */
  let cancelCurrentStreams: TaskCanceller | undefined;

  // Each time the list of wanted Representations changes, we restart the logic
  content.representations.onUpdate(
    (val) => {
      if (cancelCurrentStreams !== undefined) {
        cancelCurrentStreams.cancel();
      }
      const newRepIds = content.representations.getValue().representationIds;

      // NOTE: We expect that the rest of the RxPlayer code is already handling
      // cases where the list of playable `Representation` changes:
      // decipherability updates, `Representation` deprecation etc.
      const newRepresentations = getRepresentationList(
        content.adaptation.representations,
        newRepIds,
      );
      representationsList.setValueIfChanged(newRepresentations);
      cancelCurrentStreams = new TaskCanceller();
      cancelCurrentStreams.linkToSignal(adapStreamCanceller.signal);
      onRepresentationsChoiceChange(val, cancelCurrentStreams.signal).catch((err) => {
        if (
          cancelCurrentStreams?.isUsed() === true &&
          TaskCanceller.isCancellationError(err)
        ) {
          return;
        }
        adapStreamCanceller.cancel();
        callbacks.error(err);
      });
    },
    { clearSignal: adapStreamCanceller.signal, emitCurrentValue: true },
  );

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
    choice: IRepresentationsChoice,
    fnCancelSignal: CancellationSignal,
  ): Promise<void> {
    // First check if we should perform any action regarding what was previously
    // in the buffer
    const switchStrat = getRepresentationsSwitchingStrategy(
      period,
      adaptation,
      choice,
      segmentSink,
      playbackObserver,
    );

    switch (switchStrat.type) {
      case "continue":
        break; // nothing to do
      case "needs-reload": // Just ask to reload
        // We begin by scheduling a micro-task to reduce the possibility of race
        // conditions where the inner logic would be called synchronously before
        // the next observation (which may reflect very different playback conditions)
        // is actually received.
        return queueMicrotask(() => {
          playbackObserver.listen(
            () => {
              if (fnCancelSignal.isCancelled()) {
                return;
              }
              const { DELTA_POSITION_AFTER_RELOAD } = config.getCurrent();
              const timeOffset = DELTA_POSITION_AFTER_RELOAD.bitrateSwitch;
              return callbacks.waitingMediaSourceReload({
                bufferType: adaptation.type,
                period,
                timeOffset,
                stayInPeriod: true,
              });
            },
            { includeLastObservation: true, clearSignal: fnCancelSignal },
          );
        });

      case "flush-buffer": // Clean + flush
      case "clean-buffer": // Just clean
        for (const range of switchStrat.value) {
          await segmentSink.removeBuffer(range.start, range.end);
          if (fnCancelSignal.isCancelled()) {
            return;
          }
        }
        if (switchStrat.type === "flush-buffer") {
          callbacks.needsBufferFlush();
          if (fnCancelSignal.isCancelled()) {
            return;
          }
        }
        break;
      default: // Should be impossible
        assertUnreachable(switchStrat);
    }

    recursivelyCreateRepresentationStreams(fnCancelSignal);
  }

  /**
   * Create `RepresentationStream`s starting with the Representation of the last
   * estimate performed.
   * Each time a new estimate is made, this function will create a new
   * `RepresentationStream` corresponding to that new estimate.
   * @param {Object} fnCancelSignal - `CancellationSignal` which will abort
   * anything this function is doing and free allocated resources.
   */
  function recursivelyCreateRepresentationStreams(
    fnCancelSignal: CancellationSignal,
  ): void {
    /**
     * `TaskCanceller` triggered when the current `RepresentationStream` is
     * terminating and as such the next one might be immediately created
     * recursively.
     */
    const repStreamTerminatingCanceller = new TaskCanceller();
    repStreamTerminatingCanceller.linkToSignal(fnCancelSignal);
    const { representation } = estimateRef.getValue();
    if (representation === null) {
      return;
    }

    /**
     * Stores the last estimate emitted, starting with `null`.
     * This allows to easily rely on that value in inner Observables which might also
     * need the last already-considered value.
     */
    const terminateCurrentStream = new SharedReference<ITerminationOrder | null>(
      null,
      repStreamTerminatingCanceller.signal,
    );

    /** Allows to stop listening to estimateRef on the following line. */
    estimateRef.onUpdate(
      (estimate) => {
        if (
          estimate.representation === null ||
          estimate.representation.id === representation.id
        ) {
          return;
        }
        if (estimate.urgent) {
          log.info("Stream: urgent Representation switch", adaptation.type);
          return terminateCurrentStream.setValue({ urgent: true });
        } else {
          log.info("Stream: slow Representation switch", adaptation.type);
          return terminateCurrentStream.setValue({ urgent: false });
        }
      },
      {
        clearSignal: repStreamTerminatingCanceller.signal,
        emitCurrentValue: true,
      },
    );

    const repInfo = {
      type: adaptation.type,
      adaptation,
      period,
      representation,
    };
    currentRepresentation.setValue(representation);
    if (adapStreamCanceller.isUsed()) {
      return; // previous callback has stopped everything by side-effect
    }
    callbacks.representationChange(repInfo);
    if (adapStreamCanceller.isUsed()) {
      return; // previous callback has stopped everything by side-effect
    }

    const representationStreamCallbacks: IRepresentationStreamCallbacks = {
      streamStatusUpdate: callbacks.streamStatusUpdate,
      encryptionDataEncountered: callbacks.encryptionDataEncountered,
      manifestMightBeOufOfSync: callbacks.manifestMightBeOufOfSync,
      needsManifestRefresh: callbacks.needsManifestRefresh,
      inbandEvent: callbacks.inbandEvent,
      warning: callbacks.warning,
      error(err: unknown) {
        adapStreamCanceller.cancel();
        callbacks.error(err);
      },
      addedSegment(segmentInfo) {
        abrCallbacks.addedSegment(segmentInfo);
      },
      terminating() {
        if (repStreamTerminatingCanceller.isUsed()) {
          return; // Already handled
        }
        repStreamTerminatingCanceller.cancel();
        return recursivelyCreateRepresentationStreams(fnCancelSignal);
      },
    };

    createRepresentationStream(
      representation,
      terminateCurrentStream,
      representationStreamCallbacks,
      fnCancelSignal,
    );
  }

  /**
   * Create and returns a new `RepresentationStream`, linked to the
   * given Representation.
   * @param {Object} representation - The Representation the
   * `RepresentationStream` has to be created for.
   * @param {Object} terminateCurrentStream - Gives termination orders,
   * indicating that the `RepresentationStream` should stop what it's doing.
   * @param {Object} representationStreamCallbacks - Callbacks to call on
   * various `RepresentationStream` events.
   * @param {Object} fnCancelSignal - `CancellationSignal` which will abort
   * anything this function is doing and free allocated resources.
   */
  function createRepresentationStream(
    representation: IRepresentation,
    terminateCurrentStream: IReadOnlySharedReference<ITerminationOrder | null>,
    representationStreamCallbacks: IRepresentationStreamCallbacks,
    fnCancelSignal: CancellationSignal,
  ): void {
    const bufferGoalCanceller = new TaskCanceller();
    bufferGoalCanceller.linkToSignal(fnCancelSignal);
    const bufferGoal = createMappedReference(
      wantedBufferAhead,
      (prev) => {
        return prev * getBufferGoalRatio(representation);
      },
      bufferGoalCanceller.signal,
    );
    const maxBufferSize =
      adaptation.type === "video" ? maxVideoBufferSize : new SharedReference(Infinity);
    log.info(
      "Stream: changing representation",
      adaptation.type,
      representation.id,
      representation.bitrate,
    );
    const updatedCallbacks = objectAssign({}, representationStreamCallbacks, {
      error(err: unknown) {
        const formattedError = formatError(err, {
          defaultCode: "NONE",
          defaultReason: "Unknown `RepresentationStream` error",
        });
        if (formattedError.code !== "BUFFER_FULL_ERROR") {
          representationStreamCallbacks.error(err);
        } else {
          const wba = wantedBufferAhead.getValue();
          const lastBufferGoalRatio = bufferGoalRatioMap.get(representation.id) ?? 1;
          // 70%, 49%, 34.3%, 24%, 16.81%, 11.76%, 8.24% and 5.76%
          const newBufferGoalRatio = lastBufferGoalRatio * 0.7;
          if (newBufferGoalRatio <= 0.05 || wba * newBufferGoalRatio <= 2) {
            throw formattedError;
          }
          bufferGoalRatioMap.set(representation.id, newBufferGoalRatio);

          // We wait 4 seconds to let the situation evolve by itself before
          // retrying loading segments with a lower buffer goal
          cancellableSleep(4000, adapStreamCanceller.signal)
            .then(() => {
              return createRepresentationStream(
                representation,
                terminateCurrentStream,
                representationStreamCallbacks,
                fnCancelSignal,
              );
            })
            .catch(noop);
        }
      },
      terminating() {
        bufferGoalCanceller.cancel();
        representationStreamCallbacks.terminating();
      },
    });
    RepresentationStream(
      {
        playbackObserver,
        content: { representation, adaptation, period, manifest },
        segmentSink,
        segmentFetcher,
        terminate: terminateCurrentStream,
        options: {
          bufferGoal,
          maxBufferSize,
          drmSystemId: options.drmSystemId,
          fastSwitchThreshold,
        },
      },
      updatedCallbacks,
      fnCancelSignal,
    );

    // reload if the Representation disappears from the Manifest
    manifest.addEventListener(
      "manifestUpdate",
      (updates) => {
        for (const element of updates.updatedPeriods) {
          if (element.period.id === period.id) {
            for (const updated of element.result.updatedAdaptations) {
              if (updated.adaptation === adaptation.id) {
                for (const rep of updated.removedRepresentations) {
                  if (rep === representation.id) {
                    if (fnCancelSignal.isCancelled()) {
                      return;
                    }
                    return callbacks.waitingMediaSourceReload({
                      bufferType: adaptation.type,
                      period,
                      timeOffset: 0,
                      stayInPeriod: true,
                    });
                  }
                }
              }
            }
          } else if (element.period.start > period.start) {
            break;
          }
        }
      },
      fnCancelSignal,
    );
  }

  /**
   * @param {Object} representation
   * @returns {number}
   */
  function getBufferGoalRatio(representation: IRepresentation): number {
    const oldBufferGoalRatio = bufferGoalRatioMap.get(representation.id);
    const bufferGoalRatio = oldBufferGoalRatio !== undefined ? oldBufferGoalRatio : 1;
    if (oldBufferGoalRatio === undefined) {
      bufferGoalRatioMap.set(representation.id, bufferGoalRatio);
    }
    return bufferGoalRatio;
  }
}

/**
 * Construct the list of the `Representation` to play, based on what's supported
 * and what the API seem to authorize.
 * @param {Array.<Object>} availableRepresentations - All available
 * Representation in the current `Adaptation`, including unsupported ones.
 * @param {Array.<string>} authorizedRepIds - The subset of `Representation`
 * that the API authorize us to play.
 * @returns {Array.<Object>}
 */
function getRepresentationList(
  availableRepresentations: IRepresentation[],
  authorizedRepIds: string[],
): IRepresentation[] {
  const filteredRepresentations = availableRepresentations.filter(
    (r) =>
      arrayIncludes(authorizedRepIds, r.id) &&
      r.decipherable !== false &&
      !r.deprecated &&
      r.isSupported !== false,
  );
  if (filteredRepresentations.length > 0) {
    return filteredRepresentations;
  }
  // Retry without deprecated `Representation`
  return availableRepresentations.filter(
    (r) =>
      arrayIncludes(authorizedRepIds, r.id) &&
      r.decipherable !== false &&
      r.isSupported !== false,
  );
}
