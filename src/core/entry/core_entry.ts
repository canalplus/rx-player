import config from "../../config";
import { MediaError, OtherError } from "../../errors";
import features from "../../features";
import log from "../../log";
import type {
  IContentInitializationData,
  IMainThreadMessage,
  IReferenceUpdateMessage,
  IThumbnailDataRequestMainMessage,
} from "../../main_thread/types";
import { MainThreadMessageType } from "../../main_thread/types";
import Manifest, { Adaptation, Period, Representation } from "../../manifest/classes";
import { ObservationPosition } from "../../playback_observer";
import type { ICorePlaybackObservation } from "../../playback_observer/core_playback_observer";
import CorePlaybackObserver from "../../playback_observer/core_playback_observer";
import type { IPlayerError, ITrackType } from "../../public_types";
import arrayFind from "../../utils/array_find";
import assert, { assertUnreachable } from "../../utils/assert";
import type { ILogFormat, ILoggerLevel } from "../../utils/logger";
import { scaleTimestamp } from "../../utils/monotonic_timestamp";
import objectAssign from "../../utils/object_assign";
import type { IReadOnlySharedReference } from "../../utils/reference";
import SharedReference from "../../utils/reference";
import type { CancellationSignal } from "../../utils/task_canceller";
import TaskCanceller from "../../utils/task_canceller";
import type {
  INeedsMediaSourceReloadPayload,
  IStreamOrchestratorCallbacks,
  IStreamStatusPayload,
} from "../stream";
import StreamOrchestrator from "../stream";
import type {
  ICoreMessage,
  IDiscontinuityUpdateCoreMessagePayload,
  IResolutionInfo,
} from "../types";
import { CoreMessageType } from "../types";
import ContentPreparer from "./content_preparer";
import createContentTimeBoundariesObserver from "./create_content_time_boundaries_observer";
import type { IFreezeResolution } from "./FreezeResolver";
import getBufferedDataPerMediaBuffer from "./get_buffered_data_per_media_buffer";
import getThumbnailData from "./get_thumbnail_data";
import synchronizeSegmentSinksOnObservation from "./synchronize_sinks_on_observation";
import { formatErrorForSender } from "./utils";

export type IMessageReceiverCallback = (evt: { data: IMainThreadMessage }) => void;

/**
 * Initialize a `CoreEntry`, which is the part of the RxPlayer acting as an
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
export default function initializeCoreEntry(
  setMessageReceiver: (cb: IMessageReceiverCallback) => void,
  sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
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
   * `true` once the CoreEntry has been initialized.
   * Allow to enforce the fact that it is only initialized once.
   */
  let isInitialized = false;
  /**
   * Abstraction allowing to load contents (fetching its manifest as
   * well as creating and reloading its MediaSource).
   *
   * Creating a default one which may change on initialization.
   */
  let contentPreparer = new ContentPreparer({ hasVideo: true });

  /**
   * Abort all operations relative to the currently loaded content.
   * `null` when there's no loaded content currently or when it is reloaidng.
   */
  let currentLoadedContentTaskCanceller: TaskCanceller | null = null;

  /**
   * When set, emit playback observation made on the main thread.
   */
  let playbackObservationRef: SharedReference<ICorePlaybackObservation> | null = null;
  setMessageReceiver((e) => {
    log.debug("CE: received message", e.data.type);

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
              log.error("CE: Could not initialize DASH_WASM parser", error);
            });
          }

          if (!msg.value.hasVideo) {
            contentPreparer.disposeCurrentContent();
            contentPreparer = new ContentPreparer({ hasVideo: msg.value.hasVideo });
          }

          sendMessage({ type: CoreMessageType.InitSuccess, value: null });
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
        if (currentLoadedContentTaskCanceller !== null) {
          currentLoadedContentTaskCanceller.cancel();
          currentLoadedContentTaskCanceller = null;
        }

        const currentCanceller = new TaskCanceller();
        const currentContentObservationRef =
          new SharedReference<ICorePlaybackObservation>(
            objectAssign(msg.value.initialObservation, {
              position: new ObservationPosition(...msg.value.initialObservation.position),
            }),
          );
        playbackObservationRef = currentContentObservationRef;
        currentLoadedContentTaskCanceller = currentCanceller;
        currentLoadedContentTaskCanceller.signal.register(() => {
          currentContentObservationRef.finish();
        });
        log.debug("WP: Loading new pepared content.");
        loadOrReloadPreparedContent(
          sendMessage,
          msg.value,
          contentPreparer,
          currentContentObservationRef,
          refs,
          currentCanceller.signal,
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
        if (currentLoadedContentTaskCanceller !== null) {
          currentLoadedContentTaskCanceller.cancel();
          currentLoadedContentTaskCanceller = null;
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
          log.info("WP: Success for an unknown SourceBuffer", msg.sourceBufferType);
          return;
        }
        if (sourceBuffer.onOperationSuccess === undefined) {
          log.warn(
            "WP: A SourceBufferInterface with MSE performed a cross-thread operation",
            msg.sourceBufferType,
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
          log.info("WP: Error for an unknown SourceBuffer", msg.sourceBufferType);
          return;
        }
        if (sourceBuffer.onOperationFailure === undefined) {
          log.warn(
            "WP: A SourceBufferInterface with MSE performed a cross-thread operation",
            msg.sourceBufferType,
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
            "WP: A MediaSourceInterface with MSE performed a cross-thread operation",
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
              type: CoreMessageType.Warning,
              contentId: preparedContent.contentId,
              value: formatErrorForSender(warning),
            });
          }
        } catch (err) {
          sendMessage({
            type: CoreMessageType.Error,
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
        if (preparedContent.coreTextSender === null) {
          log.error("WP: Added text track but text track aren't enabled");
          return;
        }
        preparedContent.coreTextSender.onPushedTrackSuccess(msg.value.ranges);
        break;
      }

      case MainThreadMessageType.PushTextDataError: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
          return;
        }
        if (preparedContent.coreTextSender === null) {
          log.error("WP: Added text track but text track aren't enabled");
          return;
        }
        preparedContent.coreTextSender.onPushedTrackError(new Error(msg.value.message));
        break;
      }

      case MainThreadMessageType.RemoveTextDataSuccess: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
          return;
        }
        if (preparedContent.coreTextSender === null) {
          log.error("WP: Removed text track but text track aren't enabled");
          return;
        }
        preparedContent.coreTextSender.onRemoveSuccess(msg.value.ranges);
        break;
      }

      case MainThreadMessageType.RemoveTextDataError: {
        const preparedContent = contentPreparer.getCurrentContent();
        if (preparedContent === null || preparedContent.contentId !== msg.contentId) {
          return;
        }
        if (preparedContent.coreTextSender === null) {
          log.error("WP: Removed text track but text track aren't enabled");
          return;
        }
        preparedContent.coreTextSender.onRemoveError(new Error(msg.value.message));
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
 * CoreEntry should react on.
 */
function prepareNewContent(
  sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
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
          type: CoreMessageType.ManifestReady,
          contentId: contentInitData.contentId,
          value: { manifest },
        });
      },
      (err: unknown) => {
        sendMessage({
          type: CoreMessageType.Error,
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

interface IBufferingInitializationInformation {
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

function loadOrReloadPreparedContent(
  sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
  val: IBufferingInitializationInformation,
  contentPreparer: ContentPreparer,
  playbackObservationRef: IReadOnlySharedReference<ICorePlaybackObservation>,
  refs: ICoreReferences,
  parentCancelSignal: CancellationSignal,
) {
  log.debug("WP: Loading prepared content");
  const currentLoadCanceller = new TaskCanceller();
  currentLoadCanceller.linkToSignal(parentCancelSignal);

  /**
   * Stores last discontinuity update sent to the Core for each Period and type
   * combinations, at least until the corresponding `PeriodStreamCleared`
   * message.
   *
   * This is an optimization to avoid sending too much discontinuity messages to
   * the main thread when it is not needed because nothing changed.
   */
  const lastSentDiscontinuitiesStore: Map<
    Period,
    Map<ITrackType, IDiscontinuityUpdateCoreMessagePayload>
  > = new Map();

  const preparedContent = contentPreparer.getCurrentContent();
  if (preparedContent === null || preparedContent.manifest === null) {
    const error = new OtherError("NONE", "Loading content when none is prepared");
    sendMessage({
      type: CoreMessageType.Error,
      contentId: undefined,
      value: formatErrorForSender(error),
    });
    return;
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
  const { drmSystemId, enableFastSwitching, initialTime, onCodecSwitch } = val;

  playbackObservationRef.onUpdate(
    (observation) => {
      synchronizeSegmentSinksOnObservation(observation, segmentSinksStore);
      const freezeResolution =
        preparedContent.freezeResolver.onNewObservation(observation);
      if (freezeResolution !== null) {
        handleFreezeResolution(sendMessage, freezeResolution, {
          contentId,
          manifest,
          handleMediaSourceReload,
          enableRepresentationAvoidance,
        });
      }
    },
    { clearSignal: currentLoadCanceller.signal },
  );

  const initialPeriod =
    manifest.getPeriodForTime(initialTime) ?? manifest.getNextPeriod(initialTime);
  if (initialPeriod === undefined) {
    const error = new MediaError(
      "MEDIA_STARTING_TIME_NOT_FOUND",
      "Wanted starting time not found in the Manifest.",
    );
    sendMessage({
      type: CoreMessageType.Error,
      contentId,
      value: formatErrorForSender(error),
    });
    return;
  }

  const playbackObserver = new CorePlaybackObserver(
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
          type: CoreMessageType.Warning,
          contentId,
          value: formatErrorForSender(err),
        }),
      onPeriodChanged: (period: Period) => {
        sendMessage({
          type: CoreMessageType.ActivePeriodChanged,
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
          type: CoreMessageType.NeedsBufferFlush,
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
            contentTimeBoundariesObserver.onLastSegmentFinishedLoading(value.bufferType);
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
          type: CoreMessageType.LockedStream,
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
        if (currentLoadCanceller.signal.isCancelled()) {
          return;
        }
        sendMessage({
          type: CoreMessageType.AdaptationChanged,
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
        if (currentLoadCanceller.signal.isCancelled()) {
          return;
        }
        sendMessage({
          type: CoreMessageType.RepresentationChanged,
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
          type: CoreMessageType.InbandEvent,
          contentId,
          value,
        });
      },

      warning(value) {
        sendMessage({
          type: CoreMessageType.Warning,
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
          type: CoreMessageType.PeriodStreamReady,
          contentId,
          value: { periodId: value.period.id, bufferType: value.type },
        });
      },

      periodStreamCleared(value) {
        if (preparedContent === null) {
          return;
        }

        const periodDiscontinuitiesStore = lastSentDiscontinuitiesStore.get(value.period);
        if (periodDiscontinuitiesStore !== undefined) {
          periodDiscontinuitiesStore.delete(value.type);
          if (periodDiscontinuitiesStore.size === 0) {
            lastSentDiscontinuitiesStore.delete(value.period);
          }
        }

        contentTimeBoundariesObserver.onPeriodCleared(value.type, value.period);
        preparedContent.trackChoiceSetter.removeTrackSetter(value.period.id, value.type);
        sendMessage({
          type: CoreMessageType.PeriodStreamCleared,
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
          type: CoreMessageType.BitrateEstimateChange,
          contentId,
          value: {
            bitrate: payload.bitrate,
            bufferType: payload.type,
          },
        });
      },

      needsMediaSourceReload(payload: INeedsMediaSourceReloadPayload) {
        handleMediaSourceReload(payload);
      },

      needsDecipherabilityFlush() {
        sendMessage({
          type: CoreMessageType.NeedsDecipherabilityFlush,
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
            type: CoreMessageType.EncryptionDataEncountered,
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
          type: CoreMessageType.Error,
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
      type: CoreMessageType.DiscontinuityUpdate,
      contentId,
      value: msgObj,
    });
  }

  function handleMediaSourceReload(payload: INeedsMediaSourceReloadPayload) {
    // TODO more precize one day?
    const lastObservation = playbackObservationRef.getValue();
    const newInitialTime = lastObservation.position.getWanted();
    if (currentLoadCanceller !== null) {
      currentLoadCanceller.cancel();
    }
    log.debug(
      "WP: Reloading MediaSource",
      payload.timeOffset,
      payload.minimumPosition,
      payload.maximumPosition,
    );
    contentPreparer.reloadMediaSource(sendMessage, payload).then(
      () => {
        log.info("WP: MediaSource Reloaded, loading content again");
        loadOrReloadPreparedContent(
          sendMessage,
          {
            initialTime: newInitialTime,
            drmSystemId: val.drmSystemId,
            enableFastSwitching: val.enableFastSwitching,
            onCodecSwitch: val.onCodecSwitch,
          },
          contentPreparer,
          playbackObservationRef,
          refs,
          parentCancelSignal,
        );
      },
      (err: unknown) => {
        if (TaskCanceller.isCancellationError(err)) {
          log.info("WP: A reloading operation was cancelled");
          return;
        }
        sendMessage({
          type: CoreMessageType.Error,
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
    log.setLevel(logLevel, "standard", (levelStr, logs) => {
      const sentLogs = logs.map((e) => {
        if (e instanceof Error) {
          return formatErrorForSender(e);
        }
        return e;
      });
      // Not relying on `sendMessage` as it also logs
      postMessage({
        type: CoreMessageType.LogMessage,
        value: {
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
  sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
  contentPreparer: ContentPreparer,
  requestId: number,
): void {
  const currentContent = contentPreparer.getCurrentContent();
  if (currentContent === null) {
    return;
  }
  const segmentSinksMetrics = currentContent.segmentSinksStore.getSegmentSinksMetrics();
  sendMessage({
    type: CoreMessageType.SegmentSinkStoreUpdate,
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
  sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
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
      log.info("WP: Planning reload due to freeze");
      handleMediaSourceReload({
        timeOffset: 0,
        minimumPosition: 0,
        maximumPosition: Infinity,
      });
      break;
    }
    case "flush": {
      log.info("WP: Flushing buffer due to freeze");
      sendMessage({
        type: CoreMessageType.NeedsBufferFlush,
        contentId,
        value: {
          relativeResumingPosition: freezeResolution.value.relativeSeek,
          relativePosHasBeenDefaulted: false,
        },
      });
      break;
    }
    case "avoid-representations": {
      log.info("WP: Planning Representation avoidance due to freeze");
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
  sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
  contentPreparer: ContentPreparer,
  msg: IThumbnailDataRequestMainMessage,
): void {
  const preparedContent = contentPreparer.getCurrentContent();
  const respondWithError = (err: unknown) => {
    sendMessage({
      type: CoreMessageType.ThumbnailDataResponse,
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
          type: CoreMessageType.ThumbnailDataResponse,
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
 * be updated at any time and that the CoreEntry should react on.
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
