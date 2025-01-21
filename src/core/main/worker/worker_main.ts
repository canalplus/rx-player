import config from "../../../config";
import { MediaError, OtherError } from "../../../errors";
import features from "../../../features";
import log from "../../../log";
import Manifest, { Adaptation, Period, Representation } from "../../../manifest/classes";
import type {
  IContentInitializationData,
  IDiscontinuityUpdateWorkerMessagePayload,
  IMainThreadMessage,
  IReferenceUpdateMessage,
  IThumbnailDataRequestMainMessage,
  IWorkerMessage,
} from "../../../multithread_types";
import { MainThreadMessageType, WorkerMessageType } from "../../../multithread_types";
import { ObservationPosition } from "../../../playback_observer";
import type { IWorkerPlaybackObservation } from "../../../playback_observer/worker_playback_observer";
import WorkerPlaybackObserver from "../../../playback_observer/worker_playback_observer";
import type { IPlayerError, ITrackType } from "../../../public_types";
import arrayFind from "../../../utils/array_find";
import assert, { assertUnreachable } from "../../../utils/assert";
import type { ILogFormat, ILoggerLevel } from "../../../utils/logger";
import { scaleTimestamp } from "../../../utils/monotonic_timestamp";
import objectAssign from "../../../utils/object_assign";
import type { IReadOnlySharedReference } from "../../../utils/reference";
import SharedReference from "../../../utils/reference";
import TaskCanceller from "../../../utils/task_canceller";
import type {
  INeedsMediaSourceReloadPayload,
  IStreamOrchestratorCallbacks,
  IStreamStatusPayload,
} from "../../stream";
import StreamOrchestrator from "../../stream";
import type { IResolutionInfo } from "../../types";
import createContentTimeBoundariesObserver from "../common/create_content_time_boundaries_observer";
import type { IFreezeResolution } from "../common/FreezeResolver";
import getBufferedDataPerMediaBuffer from "../common/get_buffered_data_per_media_buffer";
import getThumbnailData from "../common/get_thumbnail_data";
import synchronizeSegmentSinksOnObservation from "../common/synchronize_sinks_on_observation";
import ContentPreparer from "./content_preparer";
import { formatErrorForSender } from "./utils";

export type IMessageReceiverCallback = (evt: { data: IMainThreadMessage }) => void;

/**
 * Initialize a `WorkerMain`, which is the part of the RxPlayer acting as an
 * entry point to all its "core" code.
 *
 * Its role is to receive and react to messages coming from "main thead", which
 * may include loading and playing a content, and to send back messages for the main
 * thread.
 * @param {Function} setMessageReceiver - Declares the function that will
 * receive messages coming from the "main thread" part of the RxPlayer logic.
 * @param {Function} sendMessage - Function allowing to send messages to the
 * "main thread" part of the RxPlayer logic.
 */
export default function initializeWorkerMain(
  setMessageReceiver: (cb: IMessageReceiverCallback) => void,
  sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
): void {
  const {
    DEFAULT_WANTED_BUFFER_AHEAD,
    DEFAULT_MAX_VIDEO_BUFFER_SIZE,
    DEFAULT_MAX_BUFFER_AHEAD,
    DEFAULT_MAX_BUFFER_BEHIND,
  } = config.getCurrent();
  const refs: ICoreReferences = {
    wantedBufferAhead: new SharedReference(DEFAULT_WANTED_BUFFER_AHEAD),
    maxVideoBufferSize: new SharedReference(DEFAULT_MAX_VIDEO_BUFFER_SIZE),
    maxBufferAhead: new SharedReference(DEFAULT_MAX_BUFFER_AHEAD),
    maxBufferBehind: new SharedReference(DEFAULT_MAX_BUFFER_BEHIND),
    limitVideoResolution: new SharedReference<IResolutionInfo>({
      height: undefined,
      width: undefined,
      pixelRatio: 1,
    }),
    throttleVideoBitrate: new SharedReference(Infinity),
  };

  /**
   * `true` once the worker has been initialized.
   * Allow to enforce the fact that it is only initialized once.
   */
  let isInitialized = false;
  /**
   * Abstraction allowing to prepare contents (fetching its manifest as
   * well as creating and reloading its MediaSource) for playback.
   *
   * Creating a default one which may change on initialization.
   */
  let contentPreparer = new ContentPreparer({ hasVideo: true });
  /**
   * Object allowing to control the lifecycle of the current content (stop/reload etc.).
   * `null` if there's no content loaded currently.
   */
  let currentContentHandle: IContentHandle | null = null;

  /**
   * When set, emit playback observation made on the main thread.
   */
  let playbackObservationRef: SharedReference<IWorkerPlaybackObservation> | null = null;
  setMessageReceiver((e) => {
    log.debug("Core", "received message", { name: e.data.type });

    const msg = e.data;
    switch (msg.type) {
      case MainThreadMessageType.Init:
        {
          assert(!isInitialized);
          isInitialized = true;
          scaleTimestamp(msg.value);
          updateLoggerLevel(
            msg.value.logLevel,
            msg.value.logFormat,
            msg.value.sendBackLogs,
          );
          const dashWasmParser = features.dashParsers.wasm;
          if (
            dashWasmParser !== null &&
            msg.value.dashWasmUrl !== undefined &&
            dashWasmParser.isCompatible()
          ) {
            dashWasmParser.initialize({ wasmUrl: msg.value.dashWasmUrl }).catch((err) => {
              const error = err instanceof Error ? err.toString() : "Unknown Error";
              log.error("Core", "Could not initialize DASH_WASM parser", error);
            });
          }

          if (!msg.value.hasVideo) {
            contentPreparer.disposeCurrentContent();
            contentPreparer = new ContentPreparer({ hasVideo: msg.value.hasVideo });
          }

          sendMessage({ type: WorkerMessageType.InitSuccess, value: null });
        }
        break;

      case MainThreadMessageType.LogLevelUpdate:
        updateLoggerLevel(
          msg.value.logLevel,
          msg.value.logFormat,
          msg.value.sendBackLogs,
        );
        break;

      case MainThreadMessageType.PrepareContent:
        prepareNewContent(sendMessage, contentPreparer, msg.value, refs);
        break;

      case MainThreadMessageType.StartPreparedContent: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (msg.contentId !== preparedContent?.contentId) {
          return;
        }

        currentContentHandle?.stop();
        playbackObservationRef?.finish();

        const currentContentObservationRef =
          new SharedReference<IWorkerPlaybackObservation>(
            objectAssign(msg.value.initialObservation, {
              position: new ObservationPosition(...msg.value.initialObservation.position),
            }),
          );
        playbackObservationRef = currentContentObservationRef;
        loadPreparedContent(
          sendMessage,
          msg.value,
          contentPreparer,
          currentContentObservationRef,
          refs,
        );
        break;
      }

      case MainThreadMessageType.PlaybackObservation: {
        const currentContent = contentPreparer.getCurrentContent();
        if (msg.contentId !== currentContent?.contentId) {
          return;
        }
        const observation = msg.value;
        const { buffered } = observation;
        const newBuffered = getBufferedDataPerMediaBuffer(
          currentContent.mediaSource,
          null,
        );
        if (newBuffered.audio !== null) {
          buffered.audio = newBuffered.audio;
        }
        if (newBuffered.video !== null) {
          buffered.video = newBuffered.video;
        }
        playbackObservationRef?.setValue(
          objectAssign(observation, {
            position: new ObservationPosition(...msg.value.position),
          }),
        );
        break;
      }

      case MainThreadMessageType.ReferenceUpdate:
        updateCoreReference(msg, refs);
        break;

      case MainThreadMessageType.StopContent:
        if (msg.contentId !== contentPreparer.getCurrentContent()?.contentId) {
          return;
        }
        contentPreparer.disposeCurrentContent();

        currentContentHandle?.stop();
        currentContentHandle = null;

        playbackObservationRef?.finish();
        playbackObservationRef = null;
        break;

      case MainThreadMessageType.MediaSourceReload:
        {
          const preparedContent = contentPreparer.getCurrentContent();
          if (msg.mediaSourceId !== preparedContent?.mediaSource.id) {
            return;
          }
          currentContentHandle?.signalMediaSourceReload();
        }
        break;

      case MainThreadMessageType.SourceBufferSuccess: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (msg.mediaSourceId !== preparedContent?.mediaSource.id) {
          return;
        }
        const { sourceBuffers } = preparedContent.mediaSource;
        const sourceBuffer = arrayFind(
          sourceBuffers,
          (s) => s.type === msg.sourceBufferType,
        );
        if (sourceBuffer === undefined) {
          log.info("Core", "Success for an unknown SourceBuffer", {
            sourceBufferType: msg.sourceBufferType,
          });
          return;
        }
        if (sourceBuffer.onOperationSuccess === undefined) {
          log.warn(
            "Core",
            "A SourceBufferInterface with MSE performed a cross-thread operation",
            { sourceBufferType: msg.sourceBufferType },
          );
          return;
        }
        sourceBuffer.onOperationSuccess(msg.operationId, msg.value.buffered);
        break;
      }

      case MainThreadMessageType.SourceBufferError: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (msg.mediaSourceId !== preparedContent?.mediaSource.id) {
          return;
        }
        const { sourceBuffers } = preparedContent.mediaSource;
        const sourceBuffer = arrayFind(
          sourceBuffers,
          (s) => s.type === msg.sourceBufferType,
        );
        if (sourceBuffer === undefined) {
          log.info("Core", "Error for an unknown SourceBuffer", {
            sourceBufferType: msg.sourceBufferType,
          });
          return;
        }
        if (sourceBuffer.onOperationFailure === undefined) {
          log.warn(
            "Core",
            "A SourceBufferInterface with MSE performed a cross-thread operation",
            {
              sourceBufferType: msg.sourceBufferType,
            },
          );
          return;
        }
        sourceBuffer.onOperationFailure(msg.operationId, msg.value);
        break;
      }

      case MainThreadMessageType.MediaSourceReadyStateChange: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (msg.mediaSourceId !== preparedContent?.mediaSource.id) {
          return;
        }
        if (preparedContent.mediaSource.onMediaSourceReadyStateChanged === undefined) {
          log.warn(
            "Core",
            "A MediaSourceInterface with MSE performed a cross-thread operation",
          );
          return;
        }
        preparedContent.mediaSource.onMediaSourceReadyStateChanged(msg.value);
        break;
      }

      case MainThreadMessageType.DecipherabilityStatusUpdate: {
        if (msg.contentId !== contentPreparer.getCurrentContent()?.contentId) {
          return;
        }
        const currentContent = contentPreparer.getCurrentContent();
        if (currentContent === null || currentContent.manifest === null) {
          return;
        }
        const updates = msg.value;
        currentContent.manifest.updateRepresentationsDeciperability((content) => {
          for (const update of updates) {
            if (content.representation.uniqueId === update.representationUniqueId) {
              return update.decipherable;
            }
          }
          return content.representation.decipherable;
        });
        break;
      }

      case MainThreadMessageType.CodecSupportUpdate: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.manifest === null) {
          return;
        }
        const newEvaluatedCodecs = msg.value;
        try {
          const warning = preparedContent.manifest.updateCodecSupport(newEvaluatedCodecs);
          if (warning !== null) {
            sendMessage({
              type: WorkerMessageType.Warning,
              contentId: preparedContent.contentId,
              value: formatErrorForSender(warning),
            });
          }
        } catch (err) {
          sendMessage({
            type: WorkerMessageType.Error,
            contentId: preparedContent.contentId,
            value: formatErrorForSender(err),
          });
        }
        break;
      }

      case MainThreadMessageType.ContentUrlsUpdate: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
          return;
        }
        preparedContent.manifestFetcher.updateContentUrls(
          msg.value.urls,
          msg.value.refreshNow,
        );
        break;
      }

      case MainThreadMessageType.TrackUpdate: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
          return;
        }
        preparedContent.trackChoiceSetter.setTrack(
          msg.value.periodId,
          msg.value.bufferType,
          msg.value.choice,
        );
        break;
      }

      case MainThreadMessageType.RepresentationUpdate: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
          return;
        }
        preparedContent.trackChoiceSetter.updateRepresentations(
          msg.value.periodId,
          msg.value.adaptationId,
          msg.value.bufferType,
          msg.value.choice,
        );
        break;
      }

      case MainThreadMessageType.PushTextDataSuccess: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
          return;
        }
        if (preparedContent.workerTextSender === null) {
          log.error("Core", "Added text track but text track aren't enabled");
          return;
        }
        preparedContent.workerTextSender.onPushedTrackSuccess(msg.value.ranges);
        break;
      }

      case MainThreadMessageType.PushTextDataError: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
          return;
        }
        if (preparedContent.workerTextSender === null) {
          log.error("Core", "Added text track but text track aren't enabled");
          return;
        }
        preparedContent.workerTextSender.onPushedTrackError(new Error(msg.value.message));
        break;
      }

      case MainThreadMessageType.RemoveTextDataSuccess: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
          return;
        }
        if (preparedContent.workerTextSender === null) {
          log.error("Core", "Removed text track but text track aren't enabled");
          return;
        }
        preparedContent.workerTextSender.onRemoveSuccess(msg.value.ranges);
        break;
      }

      case MainThreadMessageType.RemoveTextDataError: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
          return;
        }
        if (preparedContent.workerTextSender === null) {
          log.error("Core", "Removed text track but text track aren't enabled");
          return;
        }
        preparedContent.workerTextSender.onRemoveError(new Error(msg.value.message));
        break;
      }

      case MainThreadMessageType.PullSegmentSinkStoreInfos: {
        sendSegmentSinksStoreInfos(sendMessage, contentPreparer, msg.value.requestId);
        break;
      }

      case MainThreadMessageType.ThumbnailDataRequest: {
        sendThumbnailData(sendMessage, contentPreparer, msg);
        break;
      }

      case MainThreadMessageType.ConfigUpdate: {
        config.update(msg.value);
        break;
      }

      default:
        assertUnreachable(msg);
    }
  });
}

/**
 * Performs steps needed to prepare a future content to be played:
 *   - Load its Manifest file
 *   - Create MSE `MediaSource` for that content.
 *   - Initialize all modules that will follow that content
 *   - etc.
 * @param {Function} sendMessage - Function allowing to send messages to the
 * "main thread" part of the RxPlayer logic.
 * @param {ContentPreparer} contentPreparer
 * @param {Object} contentInitData - Configuration wanted for the content to
 * load.
 * @param {Object} refs - Collection of so-called "references": values
 * configuring playback that may be updated at any time and that the
 * WorkerMain should react on.
 */
function prepareNewContent(
  sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
  contentPreparer: ContentPreparer,
  contentInitData: IContentInitializationData,
  refs: ICoreReferences,
): void {
  contentPreparer
    .initializeNewContent(sendMessage, contentInitData, {
      limitResolution: { video: refs.limitVideoResolution },
      throttleBitrate: { video: refs.throttleVideoBitrate },
    })
    .then(
      (manifest) => {
        sendMessage({
          type: WorkerMessageType.ManifestReady,
          contentId: contentInitData.contentId,
          value: { manifest },
        });
      },
      (err: unknown) => {
        sendMessage({
          type: WorkerMessageType.Error,
          contentId: contentInitData.contentId,
          value: formatErrorForSender(err),
        });
      },
    );
}

function updateCoreReference(msg: IReferenceUpdateMessage, refs: ICoreReferences): void {
  switch (msg.value.name) {
    case "wantedBufferAhead":
      refs.wantedBufferAhead.setValueIfChanged(msg.value.newVal);
      break;
    case "maxVideoBufferSize":
      refs.maxVideoBufferSize.setValueIfChanged(msg.value.newVal);
      break;
    case "maxBufferBehind":
      refs.maxBufferBehind.setValueIfChanged(msg.value.newVal);
      break;
    case "maxBufferAhead":
      refs.maxBufferAhead.setValueIfChanged(msg.value.newVal);
      break;
    case "limitVideoResolution":
      refs.limitVideoResolution.setValueIfChanged(msg.value.newVal);
      break;
    case "throttleVideoBitrate":
      refs.throttleVideoBitrate.setValueIfChanged(msg.value.newVal);
      break;
    default:
      assertUnreachable(msg.value);
  }
}

interface ILoadingContentParameters {
  /** The start time at which we should play, in seconds. */
  initialTime: number;
  /**
   * Hex-encoded string identifying the key system used.
   * May be cross-referenced with the content's metadata when performing
   * optimizations.
   */
  drmSystemId: string | undefined;
  /**
   * Enable/Disable fastSwitching: allow to replace lower-quality segments by
   * higher-quality ones to have a faster transition.
   */
  enableFastSwitching: boolean;
  /** Behavior when a new video and/or audio codec is encountered. */
  onCodecSwitch: "continue" | "reload";
}

interface IContentHandle {
  /**
   * Callback to call if a "MediaSource reload" was triggered by an external
   * component (e.g. main thread).
   */
  signalMediaSourceReload: () => void;
  /** Callback to call to stop the content and free all its related resources. */
  stop: () => void;
}

function loadPreparedContent(
  sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
  val: ILoadingContentParameters,
  contentPreparer: ContentPreparer,
  playbackObservationRef: IReadOnlySharedReference<IWorkerPlaybackObservation>,
  refs: ICoreReferences,
): IContentHandle {
  log.debug("Core", "Loading pepared content.");
  const contentCanceller = new TaskCanceller();

  let currentLoadCanceller: TaskCanceller | null = null;

  startLoadingAt(val.initialTime);
  return {
    signalMediaSourceReload: (): void => {
      return onMediaSourceReload();
    },
    stop: () => {
      contentCanceller.cancel();
    },
  };

  function startLoadingAt(startTime: number): void {
    currentLoadCanceller?.cancel();
    currentLoadCanceller = new TaskCanceller();
    currentLoadCanceller.linkToSignal(contentCanceller.signal);

    /**
     * Stores last discontinuity update sent to the worker for each Period and type
     * combinations, at least until the corresponding `PeriodStreamCleared`
     * message.
     *
     * This is an optimization to avoid sending too much discontinuity messages to
     * the main thread when it is not needed because nothing changed.
     */
    const lastSentDiscontinuitiesStore: Map<
      Period,
      Map<ITrackType, IDiscontinuityUpdateWorkerMessagePayload>
    > = new Map();

    const preparedContent = contentPreparer.getCurrentContent();
    if (preparedContent === null || preparedContent.manifest === null) {
      const error = new OtherError("NONE", "Loading content when none is prepared");
      sendMessage({
        type: WorkerMessageType.Error,
        contentId: undefined,
        value: formatErrorForSender(error),
      });
      throw error;
    }
    const {
      contentId,
      cmcdDataBuilder,
      enableRepresentationAvoidance,
      manifest,
      mediaSource,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
    } = preparedContent;
    const { drmSystemId, enableFastSwitching, onCodecSwitch } = val;

    playbackObservationRef.onUpdate(
      (observation) => {
        synchronizeSegmentSinksOnObservation(observation, segmentSinksStore);
        const freezeResolution =
          preparedContent.freezeResolver.onNewObservation(observation);
        if (freezeResolution !== null) {
          handleFreezeResolution(sendMessage, freezeResolution, {
            contentId,
            manifest,
            handleMediaSourceReload: performMediaSourceReload,
            enableRepresentationAvoidance,
          });
        }
      },
      { clearSignal: currentLoadCanceller.signal },
    );

    const initialPeriod =
      manifest.getPeriodForTime(startTime) ?? manifest.getNextPeriod(startTime);
    if (initialPeriod === undefined) {
      const error = new MediaError(
        "MEDIA_STARTING_TIME_NOT_FOUND",
        "Wanted starting time not found in the Manifest.",
      );
      sendMessage({
        type: WorkerMessageType.Error,
        contentId,
        value: formatErrorForSender(error),
      });
      throw error;
    }

    const playbackObserver = new WorkerPlaybackObserver(
      playbackObservationRef,
      contentId,
      sendMessage,
      currentLoadCanceller.signal,
    );
    cmcdDataBuilder?.startMonitoringPlayback(playbackObserver);
    currentLoadCanceller.signal.register(() => {
      cmcdDataBuilder?.stopMonitoringPlayback();
    });

    const contentTimeBoundariesObserver = createContentTimeBoundariesObserver(
      manifest,
      mediaSource,
      playbackObserver,
      segmentSinksStore,
      {
        onWarning: (err: IPlayerError) =>
          sendMessage({
            type: WorkerMessageType.Warning,
            contentId,
            value: formatErrorForSender(err),
          }),
        onPeriodChanged: (period: Period) => {
          sendMessage({
            type: WorkerMessageType.ActivePeriodChanged,
            contentId,
            value: { periodId: period.id },
          });
        },
      },
      currentLoadCanceller.signal,
    );

    StreamOrchestrator(
      { initialPeriod, manifest },
      playbackObserver,
      representationEstimator,
      segmentSinksStore,
      segmentQueueCreator,
      {
        wantedBufferAhead: refs.wantedBufferAhead,
        maxVideoBufferSize: refs.maxVideoBufferSize,
        maxBufferAhead: refs.maxBufferAhead,
        maxBufferBehind: refs.maxBufferBehind,
        drmSystemId,
        enableFastSwitching,
        onCodecSwitch,
      },
      handleStreamOrchestratorCallbacks(),
      currentLoadCanceller.signal,
    );

    /**
     * Returns Object handling the callbacks from a `StreamOrchestrator`, which
     * are basically how it communicates about events.
     * @returns {Object}
     */
    function handleStreamOrchestratorCallbacks(): IStreamOrchestratorCallbacks {
      return {
        needsBufferFlush(payload) {
          sendMessage({
            type: WorkerMessageType.NeedsBufferFlush,
            contentId,
            value: payload,
          });
        },

        streamStatusUpdate(value) {
          sendDiscontinuityUpdateIfNeeded(value);

          // If the status for the last Period indicates that segments are all loaded
          // or on the contrary that the loading resumed, announce it to the
          // ContentTimeBoundariesObserver.
          if (
            manifest.isLastPeriodKnown &&
            value.period.id === manifest.periods[manifest.periods.length - 1].id
          ) {
            const hasFinishedLoadingLastPeriod =
              value.hasFinishedLoading || value.isEmptyStream;
            if (hasFinishedLoadingLastPeriod) {
              contentTimeBoundariesObserver.onLastSegmentFinishedLoading(
                value.bufferType,
              );
            } else {
              contentTimeBoundariesObserver.onLastSegmentLoadingResume(value.bufferType);
            }
          }
        },

        needsManifestRefresh() {
          contentPreparer.scheduleManifestRefresh({
            enablePartialRefresh: true,
            canUseUnsafeMode: true,
          });
        },

        manifestMightBeOufOfSync() {
          const { OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config.getCurrent();
          contentPreparer.scheduleManifestRefresh({
            enablePartialRefresh: false,
            canUseUnsafeMode: false,
            delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY,
          });
        },

        lockedStream(payload) {
          sendMessage({
            type: WorkerMessageType.LockedStream,
            contentId,
            value: {
              periodId: payload.period.id,
              bufferType: payload.bufferType,
            },
          });
        },

        adaptationChange(value) {
          contentTimeBoundariesObserver.onAdaptationChange(
            value.type,
            value.period,
            value.adaptation,
          );
          if (
            currentLoadCanceller === null ||
            currentLoadCanceller.signal.isCancelled()
          ) {
            return;
          }
          sendMessage({
            type: WorkerMessageType.AdaptationChanged,
            contentId,
            value: {
              adaptationId: value.adaptation?.id ?? null,
              periodId: value.period.id,
              type: value.type,
            },
          });
        },

        representationChange(value) {
          contentTimeBoundariesObserver.onRepresentationChange(value.type, value.period);
          if (
            currentLoadCanceller === null ||
            currentLoadCanceller.signal.isCancelled()
          ) {
            return;
          }
          sendMessage({
            type: WorkerMessageType.RepresentationChanged,
            contentId,
            value: {
              adaptationId: value.adaptation.id,
              representationId: value.representation?.id ?? null,
              periodId: value.period.id,
              type: value.type,
            },
          });
        },

        inbandEvent(value) {
          sendMessage({
            type: WorkerMessageType.InbandEvent,
            contentId,
            value,
          });
        },

        warning(value) {
          sendMessage({
            type: WorkerMessageType.Warning,
            contentId,
            value: formatErrorForSender(value),
          });
        },

        periodStreamReady(value) {
          if (preparedContent === null) {
            return;
          }
          preparedContent.trackChoiceSetter.addTrackSetter(
            value.period.id,
            value.type,
            value.adaptationRef,
          );
          sendMessage({
            type: WorkerMessageType.PeriodStreamReady,
            contentId,
            value: { periodId: value.period.id, bufferType: value.type },
          });
        },

        periodStreamCleared(value) {
          if (preparedContent === null) {
            return;
          }

          const periodDiscontinuitiesStore = lastSentDiscontinuitiesStore.get(
            value.period,
          );
          if (periodDiscontinuitiesStore !== undefined) {
            periodDiscontinuitiesStore.delete(value.type);
            if (periodDiscontinuitiesStore.size === 0) {
              lastSentDiscontinuitiesStore.delete(value.period);
            }
          }

          contentTimeBoundariesObserver.onPeriodCleared(value.type, value.period);
          preparedContent.trackChoiceSetter.removeTrackSetter(
            value.period.id,
            value.type,
          );
          sendMessage({
            type: WorkerMessageType.PeriodStreamCleared,
            contentId,
            value: { periodId: value.period.id, bufferType: value.type },
          });
        },

        bitrateEstimateChange(payload) {
          if (preparedContent !== null) {
            preparedContent.cmcdDataBuilder?.updateThroughput(
              payload.type,
              payload.bitrate,
            );
          }

          // TODO for low-latency contents it is __VERY__ frequent.
          // Considering this is only for an unimportant undocumented API, we may
          // throttle such messages. (e.g. max one per 2 seconds for each type?).
          sendMessage({
            type: WorkerMessageType.BitrateEstimateChange,
            contentId,
            value: {
              bitrate: payload.bitrate,
              bufferType: payload.type,
            },
          });
        },

        needsMediaSourceReload(payload: INeedsMediaSourceReloadPayload) {
          performMediaSourceReload(payload);
        },

        needsDecipherabilityFlush() {
          sendMessage({
            type: WorkerMessageType.NeedsDecipherabilityFlush,
            contentId,
            value: null,
          });
        },

        encryptionDataEncountered(values) {
          for (const value of values) {
            const originalContent = value.content;
            const content = { ...originalContent };
            if (content.manifest instanceof Manifest) {
              content.manifest = content.manifest.getMetadataSnapshot();
            }
            if (content.period instanceof Period) {
              content.period = content.period.getMetadataSnapshot();
            }
            if (content.adaptation instanceof Adaptation) {
              content.adaptation = content.adaptation.getMetadataSnapshot();
            }
            if (content.representation instanceof Representation) {
              content.representation = content.representation.getMetadataSnapshot();
            }
            sendMessage({
              type: WorkerMessageType.EncryptionDataEncountered,
              contentId,
              value: {
                keyIds: value.keyIds,
                values: value.values,
                content,
                type: value.type,
              },
            });
          }
        },

        error(error: unknown) {
          sendMessage({
            type: WorkerMessageType.Error,
            contentId,
            value: formatErrorForSender(error),
          });
        },
      };
    }

    function sendDiscontinuityUpdateIfNeeded(value: IStreamStatusPayload): void {
      const { imminentDiscontinuity } = value;
      let periodMap = lastSentDiscontinuitiesStore.get(value.period);
      const sentObjInfo = periodMap?.get(value.bufferType);
      if (sentObjInfo !== undefined) {
        if (sentObjInfo.discontinuity === null) {
          if (imminentDiscontinuity === null) {
            return;
          }
        } else if (
          imminentDiscontinuity !== null &&
          sentObjInfo.discontinuity.start === imminentDiscontinuity.start &&
          sentObjInfo.discontinuity.end === imminentDiscontinuity.end
        ) {
          return;
        }
      }

      if (periodMap === undefined) {
        periodMap = new Map();
        lastSentDiscontinuitiesStore.set(value.period, periodMap);
      }

      const msgObj = {
        periodId: value.period.id,
        bufferType: value.bufferType,
        discontinuity: value.imminentDiscontinuity,
        position: value.position,
      };
      periodMap.set(value.bufferType, msgObj);
      sendMessage({
        type: WorkerMessageType.DiscontinuityUpdate,
        contentId,
        value: msgObj,
      });
    }
  }

  function performMediaSourceReload(payload: INeedsMediaSourceReloadPayload): void {
    if (currentLoadCanceller !== null) {
      currentLoadCanceller.cancel();
      currentLoadCanceller = null;
    }
    const mediaSourceId = contentPreparer.getCurrentContent()?.mediaSource.id;
    if (mediaSourceId === undefined) {
      log.warn("Core", "Cannot reload MediaSource: no MediaSource currently.");
      return;
    }
    log.debug("Core", "Reloading MediaSource", {
      timeOffset: payload.timeOffset,
      minimumPosition: payload.minimumPosition,
      maximumPosition: payload.maximumPosition,
    });

    sendMessage(
      {
        type: WorkerMessageType.ReloadingMediaSource,
        mediaSourceId,
        value: payload,
      },
      [],
    );
    onMediaSourceReload();
  }

  function onMediaSourceReload(): void {
    // TODO more precize one day?
    const lastObservation = playbackObservationRef.getValue();
    const newInitialTime = lastObservation.position.getWanted();
    if (currentLoadCanceller !== null) {
      currentLoadCanceller.cancel();
      currentLoadCanceller = null;
    }
    const contentId = contentPreparer.getCurrentContent()?.contentId;
    contentPreparer.reloadMediaSource(sendMessage).then(
      () => {
        log.info("Core", "MediaSource Reloaded, loading content again", {
          newInitialTime,
        });
        startLoadingAt(newInitialTime);
      },
      (err: unknown) => {
        if (TaskCanceller.isCancellationError(err)) {
          log.info("Core", "A reloading operation was cancelled");
          return;
        }
        sendMessage({
          type: WorkerMessageType.Error,
          contentId,
          value: formatErrorForSender(err),
        });
      },
    );
  }
}

function updateLoggerLevel(
  logLevel: ILoggerLevel,
  logFormat: ILogFormat,
  sendBackLogs: boolean,
): void {
  if (!sendBackLogs) {
    log.setLevel(logLevel, logFormat);
  } else {
    // Here we force the log format to "standard" as the full formatting will be
    // performed on main thread.
    log.setLevel(logLevel, "standard", (levelStr, namespace, logs) => {
      const sentLogs = logs.map((e) => {
        if (e instanceof Error) {
          return formatErrorForSender(e);
        }
        return e;
      });
      // Not relying on `sendMessage` as it also logs
      postMessage({
        type: WorkerMessageType.LogMessage,
        value: {
          namespace,
          logLevel: levelStr,
          logs: sentLogs,
        },
      });
    });
  }
}

/**
 * Send a message `SegmentSinkStoreUpdate` to the main thread with
 * a serialized object that represents the segmentSinksStore state.
 * @param {Function} sendMessage - Function allowing to send messages to the
 * "main thread" part of the RxPlayer logic.
 * @param {ContentPreparer} contentPreparer
 */
function sendSegmentSinksStoreInfos(
  sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
  contentPreparer: ContentPreparer,
  requestId: number,
): void {
  const currentContent = contentPreparer.getCurrentContent();
  if (currentContent === null) {
    return;
  }
  const segmentSinksMetrics = currentContent.segmentSinksStore.getSegmentSinksMetrics();
  sendMessage({
    type: WorkerMessageType.SegmentSinkStoreUpdate,
    contentId: currentContent.contentId,
    value: { segmentSinkMetrics: segmentSinksMetrics, requestId },
  });
}

/**
 * Handle accordingly an `IFreezeResolution` object.
 * @param {Function} sendMessage - Function allowing to send messages to the
 * "main thread" part of the RxPlayer logic.
 * @param {Object|null} freezeResolution - The `IFreezeResolution` suggested.
 * @param {Object} param - Parameters that might be needed to implement the
 * resolution.
 * @param {string} param.contentId - `contentId` for the current content, used
 * e.g. for message exchanges between threads.
 * @param {Object} param.manifest - The current content's Manifest object.
 * @param {Function} param.handleMediaSourceReload - Function to call if we need
 * to ask for a "MediaSource reload".
 * @param {Boolean} param.enableRepresentationAvoidance - If `true`, this
 * function is authorized to mark `Representation` as "to avoid" if the
 * `IFreezeResolution` object suggest it.
 */
function handleFreezeResolution(
  sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
  freezeResolution: IFreezeResolution,
  {
    contentId,
    manifest,
    handleMediaSourceReload,
    enableRepresentationAvoidance,
  }: {
    contentId: string;
    manifest: Manifest;
    handleMediaSourceReload: (payload: INeedsMediaSourceReloadPayload) => void;
    enableRepresentationAvoidance: boolean;
  },
): void {
  switch (freezeResolution.type) {
    case "reload": {
      log.info("Core", "Planning reload due to freeze");
      handleMediaSourceReload({
        timeOffset: 0,
        minimumPosition: 0,
        maximumPosition: Infinity,
      });
      break;
    }
    case "flush": {
      log.info("Core", "Flushing buffer due to freeze");
      sendMessage({
        type: WorkerMessageType.NeedsBufferFlush,
        contentId,
        value: {
          relativeResumingPosition: freezeResolution.value.relativeSeek,
          relativePosHasBeenDefaulted: false,
        },
      });
      break;
    }
    case "avoid-representations": {
      log.info("Core", "Planning Representation avoidance due to freeze");
      const content = freezeResolution.value;
      if (enableRepresentationAvoidance) {
        manifest.addRepresentationsToAvoid(content);
      }
      handleMediaSourceReload({
        timeOffset: 0,
        minimumPosition: 0,
        maximumPosition: Infinity,
      });
      break;
    }
    default:
      assertUnreachable(freezeResolution);
  }
}

/**
 * Handles thumbnail requests and send back the result to the main thread.
 * @param {ContentPreparer} contentPreparer
 * @returns {void}
 */
function sendThumbnailData(
  sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
  contentPreparer: ContentPreparer,
  msg: IThumbnailDataRequestMainMessage,
): void {
  const preparedContent = contentPreparer.getCurrentContent();
  const respondWithError = (err: unknown) => {
    sendMessage({
      type: WorkerMessageType.ThumbnailDataResponse,
      contentId: msg.contentId,
      value: {
        status: "error",
        requestId: msg.value.requestId,
        error: formatErrorForSender(err),
      },
    });
  };

  if (
    preparedContent === null ||
    preparedContent.manifest === null ||
    preparedContent.contentId !== msg.contentId
  ) {
    return respondWithError(new Error("Content changed"));
  }

  getThumbnailData(
    preparedContent.fetchThumbnailData,
    preparedContent.manifest,
    msg.value.periodId,
    msg.value.thumbnailTrackId,
    msg.value.time,
  ).then(
    (result) => {
      sendMessage(
        {
          type: WorkerMessageType.ThumbnailDataResponse,
          contentId: msg.contentId,
          value: {
            status: "success",
            requestId: msg.value.requestId,
            data: result,
          },
        },
        [result.data],
      );
    },
    (err) => {
      return respondWithError(err);
    },
  );
}

/**
 * Collection of so-called "references": values configuring playback that may
 * be updated at any time and that the WorkerMain should react on.
 */
export interface ICoreReferences {
  limitVideoResolution: SharedReference<IResolutionInfo>;
  /** Max buffer size after the current position, in seconds (we GC further up). */
  maxBufferAhead: SharedReference<number>;
  /** Max buffer size before the current position, in seconds (we GC further down). */
  maxBufferBehind: SharedReference<number>;
  /** Buffer maximum size in kiloBytes at which we stop downloading */
  maxVideoBufferSize: SharedReference<number>;
  throttleVideoBitrate: SharedReference<number>;
  /** Buffer "goal" at which we stop downloading new segments. */
  wantedBufferAhead: SharedReference<number>;
}
