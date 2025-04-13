import type { IMediaElement } from "../../compat/browser_compatibility_types";
import disableRemotePlaybackOnManagedMediaSource from "../../compat/disable_remote_playback_on_managed_media_source";
import getEmeApiImplementation from "../../compat/eme";
import mayMediaElementFailOnUndecipherableData from "../../compat/may_media_element_fail_on_undecipherable_data";
import resetMediaElement from "../../compat/reset_media_element";
import shouldReloadMediaSourceOnDecipherabilityUpdate from "../../compat/should_reload_media_source_on_decipherability_update";
import type { ISegmentSinkMetrics } from "../../core/segment_sinks/segment_sinks_store";
import type {
  IAdaptiveRepresentationSelectorArguments,
  IAdaptationChoice,
  IResolutionInfo,
  ICreateMediaSourceCoreMessage,
  ISentError,
  ICoreMessage,
  ISentLogValue,
} from "../../core/types";
import { CoreMessageType } from "../../core/types";
import {
  EncryptedMediaError,
  MediaError,
  NetworkError,
  OtherError,
  SourceBufferError,
} from "../../errors";
import features from "../../features";
import log from "../../log";
import type { IManifestMetadata } from "../../manifest";
import {
  replicateUpdatesOnManifestMetadata,
  updateDecipherabilityFromKeyIds,
  updateDecipherabilityFromProtectionData,
} from "../../manifest";
import MainMediaSourceInterface from "../../mse/main_media_source_interface";
import type {
  IReadOnlyPlaybackObserver,
  IMediaElementPlaybackObserver,
} from "../../playback_observer";
import type {
  ICmcdOptions,
  IInitialManifest,
  IKeySystemOption,
  IPlayerError,
  IRepresentationFilter,
  IManifestLoader,
  ISegmentLoader,
} from "../../public_types";
import type { IThumbnailResponse, ITransportOptions } from "../../transports";
import arrayFind from "../../utils/array_find";
import assert, { assertUnreachable } from "../../utils/assert";
import idGenerator from "../../utils/id_generator";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import type { IAcceptedLogValue } from "../../utils/logger";
import objectAssign from "../../utils/object_assign";
import type { IReadOnlySharedReference } from "../../utils/reference";
import SharedReference from "../../utils/reference";
import { RequestError } from "../../utils/request";
import type { CancellationSignal } from "../../utils/task_canceller";
import TaskCanceller, { CancellationError } from "../../utils/task_canceller";
import type CoreInterface from "../core_interface/types";
import type { IContentProtection } from "../decrypt";
import type IContentDecryptor from "../decrypt";
import { ContentDecryptorState, getKeySystemConfiguration } from "../decrypt";
import type { ITextDisplayer } from "../text_displayer";
import { MainThreadMessageType } from "../types";
import type { ITextDisplayerOptions } from "./types";
import { ContentInitializer } from "./types";
import type { ICorePlaybackObservation } from "./utils/create_core_playback_observer";
import createCorePlaybackObserver from "./utils/create_core_playback_observer";
import type { IInitialTimeOptions } from "./utils/get_initial_time";
import getInitialTime from "./utils/get_initial_time";
import getLoadedReference from "./utils/get_loaded_reference";
import performInitialSeekAndPlay from "./utils/initial_seek_and_play";
import RebufferingController from "./utils/rebuffering_controller";
import StreamEventsEmitter from "./utils/stream_events_emitter/stream_events_emitter";
import listenToMediaError from "./utils/throw_on_media_error";
import { updateManifestCodecSupport } from "./utils/update_manifest_codec_support";

const generateContentId = idGenerator();

/**
 * @class MediaSourceContentInitializer
 */
export default class MediaSourceContentInitializer extends ContentInitializer {
  /** Constructor settings associated to this `MediaSourceContentInitializer`. */
  private _settings: IInitializeArguments;

  /**
   * The Core may be sending messages as soon as we're preparing the content but
   * the `MediaSourceContentInitializer` is only able to handle all of them only
   * once `start`ed.
   *
   * As such `_queuedCoreMessages` is set to an Array  when `prepare` has been
   * called but not `start` yet, and contains all core messages that have to
   * be processed when `start` is called.
   *
   * It is set to `null` when there's no need to rely on that queue (either not
   * yet `prepare`d or already `start`ed).
   */
  private _queuedCoreMessages: ICoreMessage[] | null;

  /**
   * Information relative to the current loaded content.
   *
   * `null` when no content is prepared yet.
   */
  private _currentContentInfo: IMediaSourceContentInitializerContentInfos | null;
  /**
   * `TaskCanceller` allowing to abort everything that the
   * `MediaSourceContentInitializer` is doing.
   */
  private _initCanceller: TaskCanceller;
  /**
   * `TaskCanceller` allowing to abort and clean-up every task and resource
   * linked to the current `MediaSource` instance.
   *
   * It may be triggered either at content stop (and thus at the same time than
   * the `_initCanceller`) or when reloading the content.
   */
  private _currentMediaSourceCanceller: TaskCanceller;

  private _awaitingRequests: {
    nextRequestId: number;
    /**
     * Stores the resolvers and the current messageId that is sent to the core to
     * receive segment sink metrics.
     * The purpose of collecting metrics is for monitoring and debugging.
     */
    pendingSinkMetrics: Map<
      number /* request id */,
      {
        resolve: (value: ISegmentSinkMetrics | undefined) => void;
      }
    >;
    /**
     * Stores the resolvers and the current messageId that is sent to the web worker to
     * receive image thumbnails.
     */
    pendingThumbnailFetching: Map<
      number /* request id */,
      {
        resolve: (value: IThumbnailResponse) => void;
        reject: (error: Error) => void;
      }
    >;
  };

  /**
   * Create a new `MediaSourceContentInitializer`, associated to the given
   * settings.
   * @param {Object} settings
   */
  constructor(settings: IInitializeArguments) {
    super();
    this._settings = settings;
    this._initCanceller = new TaskCanceller("Init");
    this._currentMediaSourceCanceller = new TaskCanceller("Init MediaSource");
    this._currentMediaSourceCanceller.linkToSignal(this._initCanceller.signal);
    this._currentContentInfo = null;
    this._awaitingRequests = {
      nextRequestId: 0,
      pendingSinkMetrics: new Map(),
      pendingThumbnailFetching: new Map(),
    };
    this._queuedCoreMessages = null;
  }

  /**
   * Perform non-destructive preparation steps, to prepare a future content.
   */
  public prepare(): void {
    if (this._currentContentInfo !== null || this._initCanceller.isUsed()) {
      return;
    }
    const contentId = generateContentId();
    const {
      adaptiveOptions,
      transport,
      transportOptions,
      useMseInWorker,
      coreInterface,
    } = this._settings;
    const { wantedBufferAhead, maxVideoBufferSize, maxBufferAhead, maxBufferBehind } =
      this._settings.bufferOptions;
    const initialVideoBitrate = adaptiveOptions.initialBitrates.video;
    const initialAudioBitrate = adaptiveOptions.initialBitrates.audio;
    this._currentContentInfo = {
      contentId,
      contentDecryptor: null,
      manifest: null,
      mediaSourceInfo: null,
      rebufferingController: null,
      streamEventsEmitter: null,
      initialTime: undefined,
      autoPlay: undefined,
      initialPlayPerformed: null,
      useMseInWorker,
    };
    coreInterface.sendMessage({
      type: MainThreadMessageType.PrepareContent,
      value: {
        contentId,
        cmcd: this._settings.cmcd,
        enableRepresentationAvoidance: this._settings.enableRepresentationAvoidance,
        url: this._settings.url,
        hasText: this._hasTextBufferFeature(),
        transport,
        transportOptions,
        initialVideoBitrate,
        initialAudioBitrate,
        manifestRetryOptions: {
          ...this._settings.manifestRequestSettings,
          lowLatencyMode: this._settings.lowLatencyMode,
        },
        segmentRetryOptions: this._settings.segmentRequestOptions,
        useMseInWorker,
      },
    });
    this._initCanceller.signal.register(() => {
      coreInterface.sendMessage({
        type: MainThreadMessageType.StopContent,
        contentId,
        value: null,
      });
    });
    if (this._initCanceller.isUsed()) {
      return;
    }
    this._queuedCoreMessages = [];
    log.debug("Init", "addEventListener prepare buffering core messages");
    const onmessage = (msgData: ICoreMessage): void => {
      if (msgData.type !== CoreMessageType.LogMessage) {
        log.debug("Init", "Core message received", msgData.type);
      }
      const type = msgData.type;
      switch (type) {
        case CoreMessageType.LogMessage: {
          const formatted: IAcceptedLogValue[] = msgData.value.logs.map((l) => {
            switch (typeof l) {
              case "string":
              case "number":
              case "boolean":
              case "undefined":
                return l;
              case "object":
                if (l === null) {
                  return null;
                }
                return formatSentLogObject(l);
              default:
                assertUnreachable(l);
            }
          });
          switch (msgData.value.logLevel) {
            case "NONE":
              break;
            case "ERROR":
              log.error(msgData.value.namespace, ...formatted);
              break;
            case "WARNING":
              log.warn(msgData.value.namespace, ...formatted);
              break;
            case "INFO":
              log.info(msgData.value.namespace, ...formatted);
              break;
            case "DEBUG":
              log.debug(msgData.value.namespace, ...formatted);
              break;
            default:
              assertUnreachable(msgData.value.logLevel);
          }
          break;
        }
        default:
          if (this._queuedCoreMessages !== null) {
            this._queuedCoreMessages.push(msgData);
          }
          break;
      }
    };
    this._settings.coreInterface.addMessageListener(onmessage);
    const onmessageerror = () => {
      log.error("Init", "Error when receiving message from core.");
    };
    this._settings.coreInterface.addErrorListener(onmessageerror);
    this._initCanceller.signal.register(() => {
      log.debug("Init", "removeEventListener prepare for core message");
      this._settings.coreInterface.removeMessageListener(onmessage);
      this._settings.coreInterface.removeErrorListener(onmessageerror);
    });

    // Also bind all `SharedReference` objects:

    const throttleVideoBitrate =
      adaptiveOptions.throttlers.throttleBitrate.video ?? new SharedReference(Infinity);
    bindNumberReferencesToCore(
      coreInterface,
      this._initCanceller.signal,
      [wantedBufferAhead, "wantedBufferAhead"],
      [maxVideoBufferSize, "maxVideoBufferSize"],
      [maxBufferAhead, "maxBufferAhead"],
      [maxBufferBehind, "maxBufferBehind"],
      [throttleVideoBitrate, "throttleVideoBitrate"],
    );

    const limitVideoResolution =
      adaptiveOptions.throttlers.limitResolution.video ??
      new SharedReference<IResolutionInfo>({
        height: undefined,
        width: undefined,
        pixelRatio: 1,
      });
    limitVideoResolution.onUpdate(
      (newVal) => {
        coreInterface.sendMessage({
          type: MainThreadMessageType.ReferenceUpdate,
          value: { name: "limitVideoResolution", newVal },
        });
      },
      { clearSignal: this._initCanceller.signal, emitCurrentValue: true },
    );
  }

  /**
   * Update URL of the Manifest.
   * @param {Array.<string>|undefined} urls - URLs to reach that Manifest from
   * the most prioritized URL to the least prioritized URL.
   * @param {boolean} refreshNow - If `true` the resource in question (e.g.
   * DASH's MPD) will be refreshed immediately.
   */
  public updateContentUrls(urls: string[] | undefined, refreshNow: boolean): void {
    if (this._currentContentInfo === null) {
      return;
    }
    this._settings.coreInterface.sendMessage({
      type: MainThreadMessageType.ContentUrlsUpdate,
      contentId: this._currentContentInfo.contentId,
      value: { urls, refreshNow },
    });
  }

  /**
   * @param {HTMLMediaElement} mediaElement
   * @param {Object} playbackObserver
   */
  public start(
    mediaElement: IMediaElement,
    playbackObserver: IMediaElementPlaybackObserver,
  ): void {
    this.prepare(); // Load Manifest if not already done
    if (this._initCanceller.isUsed()) {
      return;
    }

    let textDisplayer: ITextDisplayer | null = null;
    if (
      this._settings.textTrackOptions.textTrackMode === "html" &&
      features.htmlTextDisplayer !== null
    ) {
      assert(this._hasTextBufferFeature());
      textDisplayer = new features.htmlTextDisplayer(
        mediaElement,
        this._settings.textTrackOptions.textTrackElement,
      );
    } else if (features.nativeTextDisplayer !== null) {
      assert(this._hasTextBufferFeature());
      textDisplayer = new features.nativeTextDisplayer(mediaElement);
    } else {
      assert(!this._hasTextBufferFeature());
    }
    this._initCanceller.signal.register((err) => {
      textDisplayer?.stop(err.reason);
    });

    /** Translate errors coming from the media element into RxPlayer errors. */
    listenToMediaError(
      mediaElement,
      (error: MediaError) => this._onFatalError(error),
      this._initCanceller.signal,
    );

    /**
     * Send content protection initialization data.
     * TODO remove and use ContentDecryptor directly when possible.
     */
    const lastContentProtection = new SharedReference<IContentProtection | null>(null);

    const mediaSourceStatus = new SharedReference<MediaSourceInitializationStatus>(
      MediaSourceInitializationStatus.Nothing,
    );

    const { statusRef: drmInitializationStatus, contentDecryptor } =
      this._initializeContentDecryption(
        mediaElement,
        lastContentProtection,
        mediaSourceStatus,
        () => notifyAndStartMediaSourceReload(0, undefined, undefined),
        this._initCanceller.signal,
      );
    const contentInfo = this._currentContentInfo;
    if (contentInfo !== null) {
      contentInfo.contentDecryptor = contentDecryptor;
    }

    const playbackStartParams = {
      mediaElement,
      textDisplayer,
      playbackObserver,
      drmInitializationStatus,
      mediaSourceStatus,
    };
    mediaSourceStatus.onUpdate(
      (msInitStatus, stopListeningMSStatus) => {
        if (msInitStatus === MediaSourceInitializationStatus.Attached) {
          stopListeningMSStatus();
          this._startPlaybackIfReady(playbackStartParams);
        }
      },
      { clearSignal: this._initCanceller.signal, emitCurrentValue: true },
    );
    drmInitializationStatus.onUpdate(
      (initializationStatus, stopListeningDrm) => {
        if (initializationStatus.initializationState.type === "initialized") {
          stopListeningDrm();
          this._startPlaybackIfReady(playbackStartParams);
        }
      },
      { emitCurrentValue: true, clearSignal: this._initCanceller.signal },
    );

    /**
     * Reset directly (synchronously) the current `MediaSource` and signal to
     * the core that we did so.
     * @param {number} deltaPosition - Position you want to seek to after
     * reloading, as a delta in seconds from the last polled playing position.
     * @param {number|undefined} minimumPosition - If set, minimum time bound
     * in seconds after `deltaPosition` has been applied.
     * @param {number|undefined} maximumPosition - If set, minimum time bound
     * in seconds after `deltaPosition` has been applied.
     */
    const notifyAndStartMediaSourceReload = (
      deltaPosition: number,
      minimumPosition: number | undefined,
      maximumPosition: number | undefined,
    ): void => {
      const reloadingContentInfo = this._currentContentInfo;
      if (reloadingContentInfo === null) {
        log.warn("Init", "Asked to reload when no content is loaded.");
        return;
      }
      if (
        reloadingContentInfo === null ||
        reloadingContentInfo.mediaSourceInfo === null
      ) {
        log.warn("Init", "Asked to reload when no MediaSource is active.");
        return;
      }

      const mediaSourceId =
        reloadingContentInfo.mediaSourceInfo.type === "main"
          ? reloadingContentInfo.mediaSourceInfo.mediaSource.id
          : reloadingContentInfo.mediaSourceInfo.mediaSourceId;
      this._settings.coreInterface.sendMessage({
        type: MainThreadMessageType.MediaSourceReload,
        mediaSourceId,
        value: null,
      });
      reloadMediaSource(deltaPosition, minimumPosition, maximumPosition);
    };

    /**
     * Reset directly (synchronously) the current `MediaSource`.
     *
     * It is assumed that `core` already knows about this action. If not, call
     * `notifyAndStartMediaSourceReload` instead.
     * @param {number} deltaPosition - Position you want to seek to after
     * reloading, as a delta in seconds from the last polled playing position.
     * @param {number|undefined} minimumPosition - If set, minimum time bound
     * in seconds after `deltaPosition` has been applied.
     * @param {number|undefined} maximumPosition - If set, minimum time bound
     * in seconds after `deltaPosition` has been applied.
     */
    const reloadMediaSource = (
      deltaPosition: number,
      minimumPosition: number | undefined,
      maximumPosition: number | undefined,
    ): void => {
      const reloadingContentInfo = this._currentContentInfo;
      if (reloadingContentInfo === null) {
        log.warn("Init", "Asked to reload when no content is loaded.");
        return;
      }
      const lastObservation = playbackObserver.getReference().getValue();
      const currentPosition = lastObservation.position.getWanted();
      const isPaused =
        reloadingContentInfo.initialPlayPerformed?.getValue() === true ||
        reloadingContentInfo.autoPlay === undefined
          ? lastObservation.paused
          : !reloadingContentInfo.autoPlay;
      let position = currentPosition + deltaPosition;
      if (minimumPosition !== undefined) {
        position = Math.max(minimumPosition, position);
      }
      if (maximumPosition !== undefined) {
        position = Math.min(maximumPosition, position);
      }

      this._reload(
        mediaElement,
        textDisplayer,
        playbackObserver,
        mediaSourceStatus,
        position,
        !isPaused,
      );
    };

    const onmessage = (msgData: ICoreMessage) => {
      switch (msgData.type) {
        case CoreMessageType.AttachMediaSource: {
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          if (this._currentContentInfo !== null) {
            if (this._currentContentInfo.mediaSourceInfo?.type === "main") {
              this._currentContentInfo.mediaSourceInfo.mediaSource.dispose(
                "new AttachMediaSource message",
              );
            }
            this._currentContentInfo.mediaSourceInfo = {
              type: "core",
              mediaSourceId: msgData.mediaSourceId,
            };
          }
          const mediaSourceLink = msgData.value;
          mediaSourceStatus.onUpdate(
            (currStatus, stopListening) => {
              if (currStatus === MediaSourceInitializationStatus.AttachNow) {
                stopListening();
                log.info("media", "Attaching MediaSource URL to the media element");
                if (mediaSourceLink.type === "handle") {
                  mediaElement.srcObject = mediaSourceLink.value;
                  this._currentMediaSourceCanceller.signal.register(() => {
                    mediaElement.srcObject = null;
                  });
                } else {
                  mediaElement.src = mediaSourceLink.value;
                  this._currentMediaSourceCanceller.signal.register(() => {
                    resetMediaElement(mediaElement, mediaSourceLink.value);
                  });
                }
                disableRemotePlaybackOnManagedMediaSource(
                  mediaElement,
                  this._currentMediaSourceCanceller.signal,
                );
                mediaSourceStatus.setValue(MediaSourceInitializationStatus.Attached);
              }
            },
            { emitCurrentValue: true, clearSignal: this._initCanceller.signal },
          );
          break;
        }

        case CoreMessageType.Warning:
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          this.trigger("warning", formatCoreError(msgData.value));
          break;

        case CoreMessageType.Error:
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          this._onFatalError(formatCoreError(msgData.value));
          break;

        case CoreMessageType.CreateMediaSource:
          this._onCreateMediaSourceMessage(
            msgData,
            mediaElement,
            mediaSourceStatus,
            this._settings.coreInterface,
          );
          break;

        case CoreMessageType.AddSourceBuffer:
          {
            if (
              this._currentContentInfo?.mediaSourceInfo?.type !== "main" ||
              this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                msgData.mediaSourceId
            ) {
              return;
            }
            const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
            mediaSource.addSourceBuffer(
              msgData.value.sourceBufferType,
              msgData.value.codec,
            );
          }
          break;

        case CoreMessageType.SourceBufferAppend:
          {
            if (
              this._currentContentInfo?.mediaSourceInfo?.type !== "main" ||
              this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                msgData.mediaSourceId
            ) {
              return;
            }
            const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
            const sourceBuffer = arrayFind(
              mediaSource.sourceBuffers,
              (s) => s.type === msgData.sourceBufferType,
            );
            if (sourceBuffer === undefined) {
              return;
            }
            sourceBuffer
              .appendBuffer(msgData.value.data, msgData.value.params)
              .then((buffered) => {
                this._settings.coreInterface.sendMessage({
                  type: MainThreadMessageType.SourceBufferSuccess,
                  mediaSourceId: mediaSource.id,
                  sourceBufferType: sourceBuffer.type,
                  operationId: msgData.operationId,
                  value: { buffered },
                });
              })
              .catch((error) => {
                this._settings.coreInterface.sendMessage({
                  type: MainThreadMessageType.SourceBufferError,
                  mediaSourceId: mediaSource.id,
                  sourceBufferType: sourceBuffer.type,
                  operationId: msgData.operationId,
                  value:
                    error instanceof CancellationError
                      ? { errorName: "CancellationError" }
                      : formatSourceBufferError(error).serialize(),
                });
              });
          }
          break;

        case CoreMessageType.SourceBufferRemove:
          {
            if (
              this._currentContentInfo?.mediaSourceInfo?.type !== "main" ||
              this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                msgData.mediaSourceId
            ) {
              return;
            }
            const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
            const sourceBuffer = arrayFind(
              mediaSource.sourceBuffers,
              (s) => s.type === msgData.sourceBufferType,
            );
            if (sourceBuffer === undefined) {
              return;
            }
            sourceBuffer
              .remove(msgData.value.start, msgData.value.end)
              .then((buffered) => {
                this._settings.coreInterface.sendMessage({
                  type: MainThreadMessageType.SourceBufferSuccess,
                  mediaSourceId: mediaSource.id,
                  sourceBufferType: sourceBuffer.type,
                  operationId: msgData.operationId,
                  value: { buffered },
                });
              })
              .catch((error) => {
                this._settings.coreInterface.sendMessage({
                  type: MainThreadMessageType.SourceBufferError,
                  mediaSourceId: mediaSource.id,
                  sourceBufferType: sourceBuffer.type,
                  operationId: msgData.operationId,
                  value:
                    error instanceof CancellationError
                      ? { errorName: "CancellationError" }
                      : formatSourceBufferError(error).serialize(),
                });
              });
          }
          break;

        case CoreMessageType.AbortSourceBuffer:
          {
            if (
              this._currentContentInfo?.mediaSourceInfo?.type !== "main" ||
              this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                msgData.mediaSourceId
            ) {
              return;
            }
            const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
            const sourceBuffer = arrayFind(
              mediaSource.sourceBuffers,
              (s) => s.type === msgData.sourceBufferType,
            );
            if (sourceBuffer === undefined) {
              return;
            }
            sourceBuffer.abort("received AbortSourceBuffer message");
          }
          break;

        case CoreMessageType.UpdateMediaSourceDuration:
          {
            if (
              this._currentContentInfo?.mediaSourceInfo?.type !== "main" ||
              this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                msgData.mediaSourceId
            ) {
              return;
            }
            const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
            if (mediaSource?.id !== msgData.mediaSourceId) {
              return;
            }
            mediaSource.setDuration(msgData.value.duration, msgData.value.isRealEndKnown);
          }
          break;

        case CoreMessageType.InterruptMediaSourceDurationUpdate:
          {
            if (
              this._currentContentInfo?.mediaSourceInfo?.type !== "main" ||
              this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                msgData.mediaSourceId
            ) {
              return;
            }
            const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
            if (mediaSource?.id !== msgData.mediaSourceId) {
              return;
            }
            mediaSource.interruptDurationSetting(
              "received InterrupMediaSourceDurationUpdate message",
            );
          }
          break;

        case CoreMessageType.EndOfStream:
          {
            if (
              this._currentContentInfo?.mediaSourceInfo?.type !== "main" ||
              this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                msgData.mediaSourceId
            ) {
              return;
            }
            const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
            mediaSource.maintainEndOfStream();
          }
          break;

        case CoreMessageType.InterruptEndOfStream:
          {
            if (
              this._currentContentInfo?.mediaSourceInfo?.type !== "main" ||
              this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                msgData.mediaSourceId
            ) {
              return;
            }
            const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
            mediaSource.stopEndOfStream();
          }
          break;

        case CoreMessageType.DisposeMediaSource:
          {
            if (
              this._currentContentInfo?.mediaSourceInfo?.type !== "main" ||
              this._currentContentInfo.mediaSourceInfo.mediaSource.id !==
                msgData.mediaSourceId
            ) {
              return;
            }
            const { mediaSource } = this._currentContentInfo.mediaSourceInfo;
            mediaSource.dispose("DisposeMediaSource message");
          }
          break;

        case CoreMessageType.NeedsBufferFlush: {
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          const lastObservation = playbackObserver.getReference().getValue();
          const currentTime = lastObservation.position.isAwaitingFuturePosition()
            ? lastObservation.position.getWanted()
            : mediaElement.currentTime;
          const relativeResumingPosition = msgData.value?.relativeResumingPosition ?? 0;
          const canBeApproximateSeek = Boolean(
            msgData.value?.relativePosHasBeenDefaulted,
          );
          let wantedSeekingTime: number;

          if (relativeResumingPosition === 0 && canBeApproximateSeek) {
            // in case relativeResumingPosition is 0, we still perform
            // a tiny seek to be sure that the browser will correclty reload the video.
            wantedSeekingTime = currentTime + 0.001;
          } else {
            wantedSeekingTime = currentTime + relativeResumingPosition;
          }
          playbackObserver.setCurrentTime(wantedSeekingTime);
          break;
        }

        case CoreMessageType.ActivePeriodChanged: {
          if (
            this._currentContentInfo?.contentId !== msgData.contentId ||
            this._currentContentInfo.manifest === null
          ) {
            return;
          }
          const period = arrayFind(
            this._currentContentInfo.manifest.periods,
            (p) => p.id === msgData.value.periodId,
          );
          if (period !== undefined) {
            this.trigger("activePeriodChanged", { period });
          }
          break;
        }

        case CoreMessageType.AdaptationChanged: {
          if (
            this._currentContentInfo?.contentId !== msgData.contentId ||
            this._currentContentInfo.manifest === null
          ) {
            return;
          }
          const period = arrayFind(
            this._currentContentInfo.manifest.periods,
            (p) => p.id === msgData.value.periodId,
          );
          if (period === undefined) {
            return;
          }
          if (msgData.value.adaptationId === null) {
            this.trigger("adaptationChange", {
              period,
              adaptation: null,
              type: msgData.value.type,
            });
            return;
          }
          const adaptations = period.adaptations[msgData.value.type] ?? [];
          const adaptation = arrayFind(
            adaptations,
            (a) => a.id === msgData.value.adaptationId,
          );
          if (adaptation !== undefined) {
            this.trigger("adaptationChange", {
              period,
              adaptation,
              type: msgData.value.type,
            });
          }
          break;
        }

        case CoreMessageType.RepresentationChanged: {
          if (
            this._currentContentInfo?.contentId !== msgData.contentId ||
            this._currentContentInfo.manifest === null
          ) {
            return;
          }
          const period = arrayFind(
            this._currentContentInfo.manifest.periods,
            (p) => p.id === msgData.value.periodId,
          );
          if (period === undefined) {
            return;
          }
          if (msgData.value.representationId === null) {
            this.trigger("representationChange", {
              period,
              type: msgData.value.type,
              representation: null,
            });
            return;
          }
          const adaptations = period.adaptations[msgData.value.type] ?? [];
          const adaptation = arrayFind(
            adaptations,
            (a) => a.id === msgData.value.adaptationId,
          );
          if (adaptation === undefined) {
            return;
          }
          const representation = arrayFind(
            adaptation.representations,
            (r) => r.id === msgData.value.representationId,
          );
          if (representation !== undefined) {
            this.trigger("representationChange", {
              period,
              type: msgData.value.type,
              representation,
            });
          }
          break;
        }

        case CoreMessageType.EncryptionDataEncountered:
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          lastContentProtection.setValue(msgData.value);
          break;

        case CoreMessageType.ManifestReady: {
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          const manifest = msgData.value.manifest;
          this._currentContentInfo.manifest = manifest;
          this._updateCodecSupport(manifest, mediaElement);
          this._startPlaybackIfReady(playbackStartParams);
          break;
        }

        case CoreMessageType.ManifestUpdate: {
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          const manifest = this._currentContentInfo?.manifest;
          if (isNullOrUndefined(manifest)) {
            log.error("Init", "Manifest update but no Manifest loaded");
            return;
          }

          replicateUpdatesOnManifestMetadata(
            manifest,
            msgData.value.manifest,
            msgData.value.updates,
          );
          this._currentContentInfo?.streamEventsEmitter?.onManifestUpdate(manifest);

          this._updateCodecSupport(manifest, mediaElement);
          this.trigger("manifestUpdate", msgData.value.updates);
          break;
        }

        case CoreMessageType.UpdatePlaybackRate:
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          playbackObserver.setPlaybackRate(msgData.value);
          break;

        case CoreMessageType.BitrateEstimateChange:
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          this.trigger("bitrateEstimateChange", {
            type: msgData.value.bufferType,
            bitrate: msgData.value.bitrate,
          });
          break;

        case CoreMessageType.InbandEvent:
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          this.trigger("inbandEvents", msgData.value);
          break;

        case CoreMessageType.LockedStream: {
          if (
            this._currentContentInfo?.contentId !== msgData.contentId ||
            this._currentContentInfo.manifest === null
          ) {
            return;
          }
          const period = arrayFind(
            this._currentContentInfo.manifest.periods,
            (p) => p.id === msgData.value.periodId,
          );
          if (period === undefined) {
            return;
          }
          this._currentContentInfo.rebufferingController?.onLockedStream(
            msgData.value.bufferType,
            period,
          );
          break;
        }

        case CoreMessageType.PeriodStreamReady: {
          if (
            this._currentContentInfo?.contentId !== msgData.contentId ||
            this._currentContentInfo.manifest === null
          ) {
            return;
          }
          const period = arrayFind(
            this._currentContentInfo.manifest.periods,
            (p) => p.id === msgData.value.periodId,
          );
          if (period === undefined) {
            return;
          }
          const ref = new SharedReference<IAdaptationChoice | null | undefined>(
            undefined,
          );
          ref.onUpdate(
            (adapChoice) => {
              if (this._currentContentInfo === null) {
                ref.finish();
                return;
              }
              if (!isNullOrUndefined(adapChoice)) {
                adapChoice.representations.onUpdate(
                  (repChoice, stopListening) => {
                    if (this._currentContentInfo === null) {
                      stopListening();
                      return;
                    }
                    this._settings.coreInterface.sendMessage({
                      type: MainThreadMessageType.RepresentationUpdate,
                      contentId: this._currentContentInfo.contentId,
                      value: {
                        periodId: msgData.value.periodId,
                        adaptationId: adapChoice.adaptationId,
                        bufferType: msgData.value.bufferType,
                        choice: repChoice,
                      },
                    });
                  },
                  { clearSignal: this._initCanceller.signal },
                );
              }
              this._settings.coreInterface.sendMessage({
                type: MainThreadMessageType.TrackUpdate,
                contentId: this._currentContentInfo.contentId,
                value: {
                  periodId: msgData.value.periodId,
                  bufferType: msgData.value.bufferType,
                  choice: isNullOrUndefined(adapChoice)
                    ? adapChoice
                    : {
                        adaptationId: adapChoice.adaptationId,
                        switchingMode: adapChoice.switchingMode,
                        initialRepresentations: adapChoice.representations.getValue(),
                        relativeResumingPosition: adapChoice.relativeResumingPosition,
                      },
                },
              });
            },
            { clearSignal: this._initCanceller.signal },
          );
          this.trigger("periodStreamReady", {
            period,
            type: msgData.value.bufferType,
            adaptationRef: ref,
          });
          break;
        }

        case CoreMessageType.PeriodStreamCleared: {
          if (
            this._currentContentInfo?.contentId !== msgData.contentId ||
            this._currentContentInfo.manifest === null
          ) {
            return;
          }
          this.trigger("periodStreamCleared", {
            periodId: msgData.value.periodId,
            type: msgData.value.bufferType,
          });
          break;
        }

        case CoreMessageType.DiscontinuityUpdate: {
          if (
            this._currentContentInfo?.contentId !== msgData.contentId ||
            this._currentContentInfo.manifest === null
          ) {
            return;
          }
          const period = arrayFind(
            this._currentContentInfo.manifest.periods,
            (p) => p.id === msgData.value.periodId,
          );
          if (period === undefined) {
            log.warn("Init", "Discontinuity's Period not found", {
              periodId: msgData.value.periodId,
            });
            return;
          }
          this._currentContentInfo.rebufferingController?.updateDiscontinuityInfo({
            period,
            bufferType: msgData.value.bufferType,
            discontinuity: msgData.value.discontinuity,
            position: msgData.value.position,
          });
          break;
        }

        case CoreMessageType.PushTextData: {
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          if (textDisplayer === null) {
            log.warn("text", "Received AddTextData message but no text displayer exists");
          } else {
            try {
              const ranges = textDisplayer.pushTextData(msgData.value);
              this._settings.coreInterface.sendMessage({
                type: MainThreadMessageType.PushTextDataSuccess,
                contentId: msgData.contentId,
                value: { ranges },
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Unknown error";
              this._settings.coreInterface.sendMessage({
                type: MainThreadMessageType.PushTextDataError,
                contentId: msgData.contentId,
                value: { message },
              });
            }
          }
          break;
        }

        case CoreMessageType.RemoveTextData: {
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          if (textDisplayer === null) {
            log.warn(
              "text",
              "Received RemoveTextData message but no text displayer exists",
            );
          } else {
            try {
              const ranges = textDisplayer.removeBuffer(
                msgData.value.start,
                msgData.value.end,
              );
              this._settings.coreInterface.sendMessage({
                type: MainThreadMessageType.RemoveTextDataSuccess,
                contentId: msgData.contentId,
                value: { ranges },
              });
            } catch (err) {
              const message = err instanceof Error ? err.message : "Unknown error";
              this._settings.coreInterface.sendMessage({
                type: MainThreadMessageType.RemoveTextDataError,
                contentId: msgData.contentId,
                value: { message },
              });
            }
          }
          break;
        }

        case CoreMessageType.ResetTextDisplayer: {
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          if (textDisplayer === null) {
            log.warn(
              "text",
              "Received ResetTextDisplayer message but no text displayer exists",
            );
          } else {
            textDisplayer.reset();
          }
          break;
        }

        case CoreMessageType.StopTextDisplayer: {
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          if (textDisplayer === null) {
            log.warn(
              "text",
              "Received StopTextDisplayer message but no text displayer exists",
            );
          } else {
            textDisplayer.stop("received StopTextDisplayer message");
          }
          break;
        }

        case CoreMessageType.ReloadingMediaSource:
          {
            if (
              this._currentContentInfo === null ||
              this._currentContentInfo.mediaSourceInfo === null
            ) {
              return;
            }
            const mediaSourceId =
              this._currentContentInfo.mediaSourceInfo.type === "main"
                ? this._currentContentInfo.mediaSourceInfo.mediaSource.id
                : this._currentContentInfo.mediaSourceInfo.mediaSourceId;

            if (mediaSourceId !== msgData.mediaSourceId) {
              return;
            }
            reloadMediaSource(
              msgData.value.timeOffset,
              msgData.value.minimumPosition,
              msgData.value.maximumPosition,
            );
          }
          break;

        case CoreMessageType.NeedsDecipherabilityFlush:
          {
            if (this._currentContentInfo?.contentId !== msgData.contentId) {
              return;
            }

            const keySystem = getKeySystemConfiguration(mediaElement);
            if (shouldReloadMediaSourceOnDecipherabilityUpdate(keySystem?.[0])) {
              notifyAndStartMediaSourceReload(0, undefined, undefined);
            } else {
              const lastObservation = playbackObserver.getReference().getValue();

              const currentPosition = lastObservation.position.getWanted();

              // simple seek close to the current position
              // to flush the buffers
              if (currentPosition + 0.001 < lastObservation.duration) {
                playbackObserver.setCurrentTime(mediaElement.currentTime + 0.001);
              } else {
                playbackObserver.setCurrentTime(currentPosition);
              }
            }
          }
          break;

        case CoreMessageType.SegmentSinkStoreUpdate: {
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          const sinkObj = this._awaitingRequests.pendingSinkMetrics.get(
            msgData.value.requestId,
          );
          if (sinkObj !== undefined) {
            sinkObj.resolve(msgData.value.segmentSinkMetrics);
          } else {
            log.error("Init", "Failed to send segment sink store update");
          }
          break;
        }

        case CoreMessageType.InitSuccess:
        case CoreMessageType.InitError:
          // Should already be handled by the API
          break;

        case CoreMessageType.LogMessage:
          // Already handled by prepare's handler
          break;
        case CoreMessageType.ThumbnailDataResponse: {
          if (this._currentContentInfo?.contentId !== msgData.contentId) {
            return;
          }
          const tObj = this._awaitingRequests.pendingThumbnailFetching.get(
            msgData.value.requestId,
          );
          if (tObj !== undefined) {
            if (msgData.value.status === "error") {
              tObj.reject(formatCoreError(msgData.value.error));
            } else {
              tObj.resolve(msgData.value.data);
            }
          } else {
            log.error("Init", "Failed to send segment sink store update");
          }
          break;
        }
        case CoreMessageType.AppDefined:
          break;
        default:
          assertUnreachable(msgData);
      }
    };

    log.debug("Init", "addEventListener for core message");
    if (this._queuedCoreMessages !== null) {
      const bufferedMessages = this._queuedCoreMessages.slice();
      log.debug("Init", "Processing buffered messages", {
        ammount: bufferedMessages.length,
      });
      for (const message of bufferedMessages) {
        onmessage(message);
      }
      this._queuedCoreMessages = null;
    }
    this._settings.coreInterface.addMessageListener(onmessage);
    this._initCanceller.signal.register(() => {
      log.debug("Init", "removeEventListener for core message");
      this._settings.coreInterface.removeMessageListener(onmessage);
    });
  }

  public dispose(reason: string | undefined): void {
    this._initCanceller.cancel("Init dispose");
    if (this._currentContentInfo !== null) {
      if (this._currentContentInfo.mediaSourceInfo?.type === "main") {
        this._currentContentInfo.mediaSourceInfo.mediaSource.dispose(reason);
      }
      this._currentContentInfo = null;
    }
  }

  private _onFatalError(err: unknown) {
    if (this._initCanceller.isUsed()) {
      return;
    }
    this._initCanceller.cancel("Init dispose due to fatal Error");
    this.trigger("error", err);
  }

  private _initializeContentDecryption(
    mediaElement: IMediaElement,
    lastContentProtection: IReadOnlySharedReference<null | IContentProtection>,
    mediaSourceStatus: SharedReference<MediaSourceInitializationStatus>,
    reloadMediaSource: () => void,
    cancelSignal: CancellationSignal,
  ): {
    statusRef: IReadOnlySharedReference<IDrmInitializationStatus>;
    contentDecryptor: IContentDecryptor | null;
  } {
    const { keySystems } = this._settings;

    // TODO private?
    const createEmeDisabledReference = (errMsg: string) => {
      mediaSourceStatus.setValue(MediaSourceInitializationStatus.AttachNow);
      lastContentProtection.onUpdate(
        (data, stopListening) => {
          if (data === null) {
            // initial value
            return;
          }
          stopListening();
          const err = new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR", errMsg, {
            keyStatuses: undefined,
            keySystemConfiguration: undefined,
            keySystem: undefined,
          });
          this._onFatalError(err);
        },
        { clearSignal: cancelSignal },
      );
      const ref = new SharedReference({
        initializationState: {
          type: "initialized" as const,
          value: null,
        },
        contentDecryptor: null,
        drmSystemId: undefined,
      });
      ref.finish(); // We know that no new value will be triggered
      return { statusRef: ref, contentDecryptor: null };
    };

    if (keySystems.length === 0) {
      return createEmeDisabledReference("No `keySystems` option given.");
    } else if (features.decrypt === null) {
      return createEmeDisabledReference("EME feature not activated.");
    }

    const emeApi = mediaElement.FORCED_EME_API ?? getEmeApiImplementation("auto");
    if (emeApi === null) {
      return createEmeDisabledReference("EME API not available on the current page.");
    }

    log.debug("Init", "Creating ContentDecryptor");

    const ContentDecryptor = features.decrypt;
    const contentDecryptor = new ContentDecryptor(emeApi, mediaElement, keySystems);
    const drmStatusRef = new SharedReference<IDrmInitializationStatus>(
      {
        initializationState: { type: "uninitialized", value: null },
        drmSystemId: undefined,
      },
      cancelSignal,
    );

    const updateCodecSupportOnStateChange = (state: ContentDecryptorState) => {
      if (state > ContentDecryptorState.Initializing) {
        const manifest = this._currentContentInfo?.manifest;
        if (isNullOrUndefined(manifest)) {
          return;
        }
        this._updateCodecSupport(manifest, mediaElement);
        contentDecryptor.removeEventListener(
          "stateChange",
          updateCodecSupportOnStateChange,
        );
      }
    };
    contentDecryptor.addEventListener("stateChange", updateCodecSupportOnStateChange);

    contentDecryptor.addEventListener("keyIdsCompatibilityUpdate", (updates) => {
      if (
        this._currentContentInfo === null ||
        this._currentContentInfo.manifest === null
      ) {
        return;
      }
      const manUpdates = updateDecipherabilityFromKeyIds(
        this._currentContentInfo.manifest,
        updates,
      );
      if (
        mayMediaElementFailOnUndecipherableData() &&
        manUpdates.some((e) => e.representation.decipherable !== true)
      ) {
        reloadMediaSource();
      } else {
        this._settings.coreInterface.sendMessage({
          type: MainThreadMessageType.DecipherabilityStatusUpdate,
          contentId: this._currentContentInfo.contentId,
          value: manUpdates.map((s) => ({
            representationUniqueId: s.representation.uniqueId,
            decipherable: s.representation.decipherable,
          })),
        });
      }
      this.trigger("decipherabilityUpdate", manUpdates);
    });
    contentDecryptor.addEventListener("blackListProtectionData", (protData) => {
      if (
        this._currentContentInfo === null ||
        this._currentContentInfo.manifest === null
      ) {
        return;
      }
      const manUpdates = updateDecipherabilityFromProtectionData(
        this._currentContentInfo.manifest,
        protData,
      );
      if (
        mayMediaElementFailOnUndecipherableData() &&
        manUpdates.some((e) => e.representation.decipherable !== true)
      ) {
        reloadMediaSource();
      } else {
        this._settings.coreInterface.sendMessage({
          type: MainThreadMessageType.DecipherabilityStatusUpdate,
          contentId: this._currentContentInfo.contentId,
          value: manUpdates.map((s) => ({
            representationUniqueId: s.representation.uniqueId,
            decipherable: s.representation.decipherable,
          })),
        });
      }
      this.trigger("decipherabilityUpdate", manUpdates);
    });
    contentDecryptor.addEventListener("stateChange", (state) => {
      if (state === ContentDecryptorState.WaitingForAttachment) {
        mediaSourceStatus.onUpdate(
          (currStatus, stopListening) => {
            if (currStatus === MediaSourceInitializationStatus.Nothing) {
              mediaSourceStatus.setValue(MediaSourceInitializationStatus.AttachNow);
            } else if (currStatus === MediaSourceInitializationStatus.Attached) {
              stopListening();
              if (state === ContentDecryptorState.WaitingForAttachment) {
                contentDecryptor.attach();
              }
            }
          },
          { clearSignal: cancelSignal, emitCurrentValue: true },
        );
      } else if (state === ContentDecryptorState.ReadyForContent) {
        drmStatusRef.setValue({
          initializationState: { type: "initialized", value: null },
          drmSystemId: contentDecryptor.systemId,
        });
        contentDecryptor.removeEventListener("stateChange");
      }
    });

    contentDecryptor.addEventListener("error", (error) => {
      this._onFatalError(error);
    });

    contentDecryptor.addEventListener("warning", (error) => {
      this.trigger("warning", error);
    });

    lastContentProtection.onUpdate(
      (data) => {
        if (data === null) {
          return;
        }
        contentDecryptor.onInitializationData(data);
      },
      { clearSignal: cancelSignal },
    );

    cancelSignal.register((err) => {
      contentDecryptor.dispose(err.reason);
    });

    return { statusRef: drmStatusRef, contentDecryptor };
  }
  /**
   * Retrieves all unknown codecs from the current manifest, checks these unknown codecs
   * to determine if they are supported, updates the manifest with the support
   * status of these codecs, and forwards the list of supported codecs to core.
   * @param manifest
   */
  private _updateCodecSupport(manifest: IManifestMetadata, mediaElement: IMediaElement) {
    try {
      const updatedCodecs = updateManifestCodecSupport(
        manifest,
        this._currentContentInfo?.contentDecryptor ?? null,
        mediaElement,
        this._currentContentInfo?.useMseInWorker ?? false,
      );
      if (updatedCodecs.length > 0) {
        this._settings.coreInterface.sendMessage({
          type: MainThreadMessageType.CodecSupportUpdate,
          value: updatedCodecs,
        });
        // TODO what if one day the core updates codec support by itself?
        // We wouldn't know...
        this.trigger("codecSupportUpdate", null);
      }
    } catch (err) {
      this._onFatalError(err);
    }
  }

  private _hasTextBufferFeature(): boolean {
    return (
      (this._settings.textTrackOptions.textTrackMode === "html" &&
        features.htmlTextDisplayer !== null) ||
      features.nativeTextDisplayer !== null
    );
  }

  private _reload(
    mediaElement: IMediaElement,
    textDisplayer: ITextDisplayer | null,
    playbackObserver: IMediaElementPlaybackObserver,
    mediaSourceStatus: SharedReference<MediaSourceInitializationStatus>,
    position: number,
    autoPlay: boolean,
  ) {
    this._currentMediaSourceCanceller.cancel("Init MediaSource Reload");
    this._currentMediaSourceCanceller = new TaskCanceller("Init MediaSource");
    this._currentMediaSourceCanceller.linkToSignal(this._initCanceller.signal);
    mediaSourceStatus.setValue(MediaSourceInitializationStatus.AttachNow);
    this.trigger("reloadingMediaSource", { position, autoPlay });

    mediaSourceStatus.onUpdate(
      (status, stopListeningMSStatusUpdates) => {
        if (status !== MediaSourceInitializationStatus.Attached) {
          return;
        }
        stopListeningMSStatusUpdates();
        const corePlaybackObserver = this._setUpModulesOnNewMediaSource(
          {
            initialTime: position,
            autoPlay,
            mediaElement,
            textDisplayer,
            playbackObserver,
          },
          this._currentMediaSourceCanceller.signal,
        );

        if (
          !this._currentMediaSourceCanceller.isUsed() &&
          corePlaybackObserver !== null &&
          this._currentContentInfo !== null
        ) {
          const contentId = this._currentContentInfo.contentId;
          corePlaybackObserver.listen(
            (obs) => {
              this._settings.coreInterface.sendMessage({
                type: MainThreadMessageType.PlaybackObservation,
                contentId,
                value: objectAssign(obs, {
                  position: obs.position.serialize(),
                }),
              });
            },
            {
              includeLastObservation: true,
              clearSignal: this._currentMediaSourceCanceller.signal,
            },
          );
        }
      },
      {
        clearSignal: this._currentMediaSourceCanceller.signal,
        emitCurrentValue: true,
      },
    );
  }

  /**
   * Start-up modules and mechanisms (initial seek, auto-play etc.) needed each
   * time a content is loaded AND re-loaded on a `HTMLMediaElement`, when the
   * manifest is known.
   *
   * Note that this does not include reacting to incoming core messages nor
   * sending them, those actions have to be handled separately.
   *
   * @param {Object} parameters
   * @param {Object} cancelSignal
   * @returns {Object|null} - Playback Observer created for this content. `null`
   * only if playback initialization failed (most likely because it has been
   * cancelled).
   */
  private _setUpModulesOnNewMediaSource(
    parameters: {
      initialTime: number;
      autoPlay: boolean;
      mediaElement: IMediaElement;
      textDisplayer: ITextDisplayer | null;
      playbackObserver: IMediaElementPlaybackObserver;
    },
    cancelSignal: CancellationSignal,
  ): IReadOnlyPlaybackObserver<ICorePlaybackObservation> | null {
    if (cancelSignal.isCancelled()) {
      return null;
    }
    if (this._currentContentInfo === null) {
      log.error("Init", "Setting up modules without a contentId");
      return null;
    }
    if (this._currentContentInfo.manifest === null) {
      log.error("Init", "Setting up modules without a loaded Manifest");
      return null;
    }

    const { manifest, mediaSourceInfo } = this._currentContentInfo;
    const { speed } = this._settings;
    const { initialTime, autoPlay, mediaElement, textDisplayer, playbackObserver } =
      parameters;
    this._currentContentInfo.initialTime = initialTime;
    this._currentContentInfo.autoPlay = autoPlay;

    const { autoPlayResult, initialPlayPerformed } = performInitialSeekAndPlay(
      {
        mediaElement,
        playbackObserver,
        startTime: initialTime,
        mustAutoPlay: autoPlay,
        onWarning: (err) => this.trigger("warning", err),
        isDirectfile: false,
      },
      cancelSignal,
    );
    this._currentContentInfo.initialPlayPerformed = initialPlayPerformed;
    const corePlaybackObserver = createCorePlaybackObserver(
      playbackObserver,
      {
        autoPlay,
        initialPlayPerformed,
        manifest,
        mediaSource:
          mediaSourceInfo?.type === "main" ? mediaSourceInfo.mediaSource : null,
        speed,
        textDisplayer,
      },
      cancelSignal,
    );

    if (cancelSignal.isCancelled()) {
      return null;
    }

    /**
     * Class trying to avoid various stalling situations, emitting "stalled"
     * events when it cannot, as well as "unstalled" events when it get out of one.
     */
    const rebufferingController = new RebufferingController(
      playbackObserver,
      manifest,
      speed,
    );
    rebufferingController.addEventListener("stalled", (evt) =>
      this.trigger("stalled", evt),
    );
    rebufferingController.addEventListener("unstalled", () =>
      this.trigger("unstalled", null),
    );
    rebufferingController.addEventListener("warning", (err) =>
      this.trigger("warning", err),
    );
    cancelSignal.register((err) => {
      rebufferingController.destroy(err.reason);
    });
    rebufferingController.start();
    this._currentContentInfo.rebufferingController = rebufferingController;

    const currentContentInfo = this._currentContentInfo;
    initialPlayPerformed.onUpdate(
      (isPerformed, stopListening) => {
        if (isPerformed) {
          stopListening();
          const streamEventsEmitter = new StreamEventsEmitter(manifest, playbackObserver);
          currentContentInfo.streamEventsEmitter = streamEventsEmitter;
          streamEventsEmitter.addEventListener(
            "event",
            (payload) => {
              this.trigger("streamEvent", payload);
            },
            cancelSignal,
          );
          streamEventsEmitter.addEventListener(
            "eventSkip",
            (payload) => {
              this.trigger("streamEventSkip", payload);
            },
            cancelSignal,
          );
          streamEventsEmitter.start();
          cancelSignal.register((err) => {
            streamEventsEmitter.stop(err.reason);
          });
        }
      },
      { clearSignal: cancelSignal, emitCurrentValue: true },
    );

    const _getSegmentSinkMetrics = async (): Promise<ISegmentSinkMetrics | undefined> => {
      this._awaitingRequests.nextRequestId++;
      const requestId = this._awaitingRequests.nextRequestId;
      this._settings.coreInterface.sendMessage({
        type: MainThreadMessageType.PullSegmentSinkStoreInfos,
        value: { requestId },
      });
      return new Promise((resolve, reject) => {
        const rejectFn = (err: CancellationError) => {
          cancelSignal.deregister(rejectFn);
          this._awaitingRequests.pendingSinkMetrics.delete(requestId);
          return reject(err);
        };
        this._awaitingRequests.pendingSinkMetrics.set(requestId, {
          resolve: (value: ISegmentSinkMetrics | undefined) => {
            cancelSignal.deregister(rejectFn);
            this._awaitingRequests.pendingSinkMetrics.delete(requestId);
            resolve(value);
          },
        });
        cancelSignal.register(rejectFn);
      });
    };
    const _getThumbnailsData = async (
      periodId: string,
      thumbnailTrackId: string,
      time: number,
    ): Promise<IThumbnailResponse> => {
      if (this._currentContentInfo === null) {
        return Promise.reject(new Error("Cannot fetch thumbnails: No content loaded."));
      }
      this._awaitingRequests.nextRequestId++;
      const requestId = this._awaitingRequests.nextRequestId;
      this._settings.coreInterface.sendMessage({
        type: MainThreadMessageType.ThumbnailDataRequest,
        contentId: this._currentContentInfo.contentId,
        value: { requestId, periodId, thumbnailTrackId, time },
      });

      return new Promise((resolve, reject) => {
        const rejectFn = (err: CancellationError) => {
          cleanUp();
          reject(err);
        };
        const cleanUp = () => {
          cancelSignal.deregister(rejectFn);
          this._awaitingRequests.pendingThumbnailFetching.delete(requestId);
        };

        this._awaitingRequests.pendingThumbnailFetching.set(requestId, {
          resolve: (value: IThumbnailResponse) => {
            cleanUp();
            resolve(value);
          },
          reject: (value: unknown) => {
            cleanUp();
            reject(value);
          },
        });
        cancelSignal.register(rejectFn);
      });
    };
    /**
     * Emit a "loaded" events once the initial play has been performed and the
     * media can begin playback.
     * Also emits warning events if issues arise when doing so.
     */
    autoPlayResult
      .then(() => {
        getLoadedReference(playbackObserver, false, cancelSignal).onUpdate(
          (isLoaded, stopListening) => {
            if (isLoaded) {
              stopListening();
              this.trigger("loaded", {
                getSegmentSinkMetrics: _getSegmentSinkMetrics,
                getThumbnailData: _getThumbnailsData,
              });
            }
          },
          { emitCurrentValue: true, clearSignal: cancelSignal },
        );
      })
      .catch((err) => {
        if (cancelSignal.isCancelled()) {
          return;
        }
        this._onFatalError(err);
      });

    return corePlaybackObserver;
  }

  /**
   * Initialize content playback if and only if those conditions are filled:
   *   - The Manifest is fetched and stored in `this._currentContentInfo`.
   *   - `drmInitializationStatus` indicates that DRM matters are initialized.
   *   - `mediaSourceStatus` indicates that the MediaSource is attached to the
   *     `mediaElement`.
   *
   * In other cases, this method will do nothing.
   *
   * To call when any of those conditions might become `true`, to start-up
   * playback.
   *
   * @param {Object} parameters
   * @returns {boolean} - Returns `true` if all conditions where met for
   * playback start.
   */
  private _startPlaybackIfReady(parameters: {
    mediaElement: IMediaElement;
    textDisplayer: ITextDisplayer | null;
    playbackObserver: IMediaElementPlaybackObserver;
    drmInitializationStatus: IReadOnlySharedReference<IDrmInitializationStatus>;
    mediaSourceStatus: IReadOnlySharedReference<MediaSourceInitializationStatus>;
  }): boolean {
    if (this._currentContentInfo === null || this._currentContentInfo.manifest === null) {
      return false;
    }
    const drmInitStatus = parameters.drmInitializationStatus.getValue();
    if (drmInitStatus.initializationState.type !== "initialized") {
      return false;
    }
    const msInitStatus = parameters.mediaSourceStatus.getValue();
    if (msInitStatus !== MediaSourceInitializationStatus.Attached) {
      return false;
    }

    const { contentId, manifest } = this._currentContentInfo;
    log.debug("Init", "Calculating initial time");
    const initialTime = getInitialTime(
      manifest,
      this._settings.lowLatencyMode,
      this._settings.startAt,
    );
    log.debug("Init", "Initial time calculated", { initialTime });
    const { enableFastSwitching, onCodecSwitch } = this._settings.bufferOptions;
    const corePlaybackObserver = this._setUpModulesOnNewMediaSource(
      {
        initialTime,
        autoPlay: this._settings.autoPlay,
        mediaElement: parameters.mediaElement,
        textDisplayer: parameters.textDisplayer,
        playbackObserver: parameters.playbackObserver,
      },
      this._currentMediaSourceCanceller.signal,
    );

    if (this._currentMediaSourceCanceller.isUsed() || corePlaybackObserver === null) {
      return true;
    }
    const initialObservation = corePlaybackObserver.getReference().getValue();
    const sentInitialObservation = objectAssign(initialObservation, {
      position: initialObservation.position.serialize(),
    });
    this._settings.coreInterface.sendMessage({
      type: MainThreadMessageType.StartPreparedContent,
      contentId,
      value: {
        initialTime,
        initialObservation: sentInitialObservation,
        drmSystemId: drmInitStatus.drmSystemId,
        enableFastSwitching,
        onCodecSwitch,
      },
    });

    corePlaybackObserver.listen(
      (obs) => {
        this._settings.coreInterface.sendMessage({
          type: MainThreadMessageType.PlaybackObservation,
          contentId,
          value: objectAssign(obs, { position: obs.position.serialize() }),
        });
      },
      {
        includeLastObservation: false,
        clearSignal: this._currentMediaSourceCanceller.signal,
      },
    );
    this.trigger("manifestReady", manifest);
    return true;
  }

  /**
   * Handles core messages asking to create a MediaSource.
   * @param {Object} msg - The core's message received.
   * @param {HTMLMediaElement} mediaElement - HTMLMediaElement on which the
   * content plays.
   * @param {Object} coreInterface - The interface to the core.
   */
  private _onCreateMediaSourceMessage(
    msg: ICreateMediaSourceCoreMessage,
    mediaElement: IMediaElement,
    mediaSourceStatus: SharedReference<MediaSourceInitializationStatus>,
    coreInterface: CoreInterface,
  ): void {
    if (this._currentContentInfo?.contentId !== msg.contentId) {
      log.info("Init", "Ignoring MediaSource attachment due to wrong `contentId`");
    } else {
      const { mediaSourceId } = msg;
      try {
        mediaSourceStatus.onUpdate(
          (currStatus, stopListening) => {
            if (this._currentContentInfo === null) {
              stopListening();
              return;
            }
            if (currStatus === MediaSourceInitializationStatus.AttachNow) {
              stopListening();
              const mediaSource = new MainMediaSourceInterface(
                mediaSourceId,
                "FORCED_MEDIA_SOURCE" in mediaElement
                  ? mediaElement.FORCED_MEDIA_SOURCE
                  : undefined,
              );
              if (this._currentContentInfo.mediaSourceInfo?.type === "main") {
                this._currentContentInfo.mediaSourceInfo.mediaSource.dispose(
                  "Attaching new MediaSource",
                );
              }
              this._currentContentInfo.mediaSourceInfo = {
                type: "main",
                mediaSource,
              };
              mediaSource.addEventListener("mediaSourceOpen", () => {
                coreInterface.sendMessage({
                  type: MainThreadMessageType.MediaSourceReadyStateChange,
                  mediaSourceId,
                  value: "open",
                });
              });
              mediaSource.addEventListener("mediaSourceEnded", () => {
                coreInterface.sendMessage({
                  type: MainThreadMessageType.MediaSourceReadyStateChange,
                  mediaSourceId,
                  value: "ended",
                });
              });
              mediaSource.addEventListener("mediaSourceClose", () => {
                coreInterface.sendMessage({
                  type: MainThreadMessageType.MediaSourceReadyStateChange,
                  mediaSourceId,
                  value: "closed",
                });
              });
              let url: string | null = null;
              if (mediaSource.handle.type === "handle") {
                mediaElement.srcObject = mediaSource.handle.value;
              } else {
                url = URL.createObjectURL(mediaSource.handle.value);
                mediaElement.src = url;
              }
              this._currentMediaSourceCanceller.signal.register((err) => {
                mediaSource.dispose(err.reason);
                resetMediaElement(mediaElement, url);
              });
              mediaSourceStatus.setValue(MediaSourceInitializationStatus.Attached);
              disableRemotePlaybackOnManagedMediaSource(
                mediaElement,
                this._currentMediaSourceCanceller.signal,
              );
            }
          },
          {
            emitCurrentValue: true,
            clearSignal: this._currentMediaSourceCanceller.signal,
          },
        );
      } catch (_err) {
        const error = new OtherError(
          "NONE",
          "Unknown error when creating the MediaSource",
        );
        this._onFatalError(error);
      }
    }
  }
}

export interface IMediaSourceContentInitializerContentInfos {
  /**
   * "contentId", which is the identifier for the currently loaded content.
   * Allows to ensure that the Core is referencing the current content, not
   * a previously stopped one.
   */
  contentId: string;
  /**
   * Current parsed Manifest.
   * `null` if not fetched / parsed yet.
   */
  manifest: IManifestMetadata | null;

  /**
   * Current MediaSource linked to the content.
   *
   * `null` if no MediaSource is currently created for the content.
   */
  mediaSourceInfo:
    | {
        type: "main";
        mediaSource: MainMediaSourceInterface;
      }
    | {
        type: "core";
        mediaSourceId: string;
      }
    | null;
  /**
   * Current `RebufferingController` linked to the content, allowing to
   * detect and handle rebuffering situations.
   *
   * `null` if none is currently created for the content.
   */
  rebufferingController: RebufferingController | null;
  /**
   * Current `StreamEventsEmitter` linked to the content, allowing to
   * send events found in the Manifest.
   *
   * `null` if none is currently created for the content.
   */
  streamEventsEmitter: StreamEventsEmitter | null;
  /**
   * The initial position to seek to in seconds once the content is loadeed.
   * `undefined` if unknown yet.
   */
  initialTime: number | undefined;
  /**
   * Whether to automatically play once the content is loaded.
   * `undefined` if unknown yet.
   */
  autoPlay: boolean | undefined;
  /**
   * Set to `true` once the initial play (or skipping the initial play when
   * autoplay is not enabled) has been done.
   * Set to `false` when it hasn't been done yet.
   *
   * Set to `null` when those considerations are not taken yet.
   */
  initialPlayPerformed: IReadOnlySharedReference<boolean> | null;
  /**
   * Set to the initialized `ContentDecryptor` instance linked to that content.
   *
   * Set to `null` when those considerations are not taken.
   */
  contentDecryptor: IContentDecryptor | null;
  /**
   * If `true`, MSE API should be used in the core part of the RxPlayer (in the
   * WebWorker).
   * If `false`, they should be relied on on main thread.
   */
  useMseInWorker: boolean;
}

/** Arguments to give to the `InitializeOnMediaSource` function. */
export interface IInitializeArguments {
  /**
   * The `MediaSourceContentInitializer` will interact with the RxPlayer's core
   * logic (the one loading media data) by exchanging messages through an
   * interface called the `CoreInterface`.
   *
   * This `CoreInterface` allows to abstract its actual current implementation.
   * E.g., the core logic could be running in a WebWorker or in main thread, in
   * which cases message exchanging mechanisms would be different.
   */
  coreInterface: CoreInterface;
  /**
   * If `true`, MSE API should be used in the core part of the RxPlayer (in the
   * WebWorker).
   * If `false`, they should be relied on on main thread.
   *
   * This might depend on both browser capabilities and preferences. It is
   * assumed that the caller perform all those checks, the `ContentInitializer`
   * won't check again the validity of this value.
   */
  useMseInWorker: boolean;
  /** Options concerning the ABR logic. */
  adaptiveOptions: IAdaptiveRepresentationSelectorArguments;
  /** `true` if we should play when loaded. */
  autoPlay: boolean;
  /** Options concerning the media buffers. */
  bufferOptions: {
    /** Buffer "goal" at which we stop downloading new segments. */
    wantedBufferAhead: IReadOnlySharedReference<number>;
    /** Buffer maximum size in kiloBytes at which we stop downloading */
    maxVideoBufferSize: IReadOnlySharedReference<number>;
    /** Max buffer size after the current position, in seconds (we GC further up). */
    maxBufferAhead: IReadOnlySharedReference<number>;
    /** Max buffer size before the current position, in seconds (we GC further down). */
    maxBufferBehind: IReadOnlySharedReference<number>;
    /**
     * Enable/Disable fastSwitching: allow to replace lower-quality segments by
     * higher-quality ones to have a faster transition.
     */
    enableFastSwitching: boolean;
    /** Behavior when a new video and/or audio codec is encountered. */
    onCodecSwitch: "continue" | "reload";
  };
  /**
   * When set to an object, enable "Common Media Client Data", or "CMCD".
   */
  cmcd?: ICmcdOptions | undefined;
  /**
   * If `true`, the RxPlayer can enable its "Representation avoidance"
   * mechanism, where it avoid loading Representation that it suspect
   * have issues being decoded on the current device.
   */
  enableRepresentationAvoidance: boolean;
  /** Every encryption configuration set. */
  keySystems: IKeySystemOption[];
  /** `true` to play low-latency contents optimally. */
  lowLatencyMode: boolean;
  /**
   * The type of "transport" wanted, e.g. "dash" or "smooth".
   */
  transport: string;
  /** Options relative to the streaming protocol. */
  transportOptions: Omit<
    ITransportOptions,
    "representationFilter" | "manifestLoader" | "segmentLoader"
  > & {
    manifestLoader:
      | undefined
      | {
          fn?: IManifestLoader | undefined;
          workerId?: string | undefined;
        };
    segmentLoader:
      | undefined
      | {
          fn?: ISegmentLoader | undefined;
          workerId?: string | undefined;
        };
    representationFilter:
      | undefined
      | {
          fn?: IRepresentationFilter | undefined;
          eval?: string | undefined;
          workerId?: string | undefined;
        };
  };
  /** Settings linked to Manifest requests. */
  manifestRequestSettings: {
    /** Maximum number of time a request on error will be retried. */
    maxRetry: number | undefined;
    /**
     * Timeout after which request are aborted and, depending on other options,
     * retried.
     * To set to `-1` for no timeout.
     * `undefined` will lead to a default, large, timeout being used.
     */
    requestTimeout: number | undefined;
    /**
     * Connection timeout, in milliseconds, after which the request is canceled
     * if the responses headers has not being received.
     * Do not set or set to "undefined" to disable it.
     */
    connectionTimeout: number | undefined;
    /** Limit the frequency of Manifest updates. */
    minimumManifestUpdateInterval: number;
    /**
     * Potential first Manifest to rely on, allowing to skip the initial Manifest
     * request.
     */
    initialManifest: IInitialManifest | undefined;
  };
  /** Configuration for the segment requesting logic. */
  segmentRequestOptions: {
    lowLatencyMode: boolean;
    /**
     * Amount of time after which a request should be aborted.
     * `undefined` indicates that a default value is wanted.
     * `-1` indicates no timeout.
     */
    requestTimeout: number | undefined;
    /**
     * Amount of time, in milliseconds, after which a request that hasn't receive
     * the headers and status code should be aborted and optionnaly retried,
     * depending on the maxRetry configuration.
     */
    connectionTimeout: number | undefined;
    /** Maximum number of time a request on error will be retried. */
    maxRetry: number | undefined;
  };
  /** Emit the playback rate (speed) set by the user. */
  speed: IReadOnlySharedReference<number>;
  /** The configured starting position. */
  startAt?: IInitialTimeOptions | undefined;
  /** Configuration specific to the text track. */
  textTrackOptions: ITextDisplayerOptions;
  /** URL of the Manifest. `undefined` if unknown or not pertinent. */
  url: string | undefined;
}

function bindNumberReferencesToCore(
  coreInterface: CoreInterface,
  cancellationSignal: CancellationSignal,
  ...refs: Array<
    [
      IReadOnlySharedReference<number>,
      (
        | "wantedBufferAhead"
        | "maxVideoBufferSize"
        | "maxBufferBehind"
        | "maxBufferAhead"
        | "throttleVideoBitrate"
      ),
    ]
  >
): void {
  for (const ref of refs) {
    ref[0].onUpdate(
      (newVal) => {
        // NOTE: The TypeScript checks have already been made by this function's
        // overload, but the body here is not aware of that.
        coreInterface.sendMessage({
          type: MainThreadMessageType.ReferenceUpdate,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
          value: { name: ref[1] as any, newVal: newVal as any },
        });
      },
      { clearSignal: cancellationSignal, emitCurrentValue: true },
    );
  }
}

function formatCoreError(sentError: ISentError): IPlayerError {
  switch (sentError.name) {
    case "NetworkError":
      return new NetworkError(
        sentError.code,
        new RequestError(
          sentError.baseError.url,
          sentError.baseError.status,
          sentError.baseError.type,
        ),
      );
    case "MediaError":
      // eslint-disable-next-line
      return new MediaError(sentError.code as any, sentError.reason, {
        tracks: sentError.tracks,
      });
    case "EncryptedMediaError":
      // We assume that everything have already been checked Worker-side here
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return new EncryptedMediaError(sentError.code, sentError.reason, {
        keyStatuses: sentError.keyStatuses,
        keySystemConfiguration: sentError.keySystemConfiguration,
        keySystem: sentError.keySystem,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    case "OtherError":
      return new OtherError(sentError.code, sentError.reason);
  }
}

/** Enume allowing to state what is the current status of MediaSource initialization. */
const enum MediaSourceInitializationStatus {
  /**
   * The `MediaSource` is not attached to the `HTMLMediaElement` and shouldn't
   * be yet.
   */
  Nothing,
  /**
   * The `MediaSource` is not yet attached to the `HTMLMediaElement` but it
   * now can and should be.
   *
   * The purpose of this enum variant is to be set when wanting to indicate
   * that `MediaSource` attachment has to be done, in code that do not have
   * the capability to do so.
   *
   * The code that can do so would then read that value and then set this enum
   * to `Attached` once the `MediaSource` is attached.
   */
  AttachNow,
  /** The `MediaSource` is attached to the `HTMLMediaElement`. */
  Attached,
}

interface IDrmInitializationStatus {
  /** Current initialization state the decryption logic is in. */
  initializationState: IDecryptionInitializationState;
  /**
   * If set, corresponds to the hex string describing the current key system
   * used.
   * `undefined` if unknown or if it does not apply.
   */
  drmSystemId: string | undefined;
}

/** Initialization steps to add decryption capabilities to an `HTMLMediaElement`. */
type IDecryptionInitializationState =
  /**
   * Decryption capabilities have not been initialized yet.
   * You should wait before performing any action on the concerned
   * `HTMLMediaElement` (such as linking a content / `MediaSource` to it).
   */
  | { type: "uninitialized"; value: null }
  /**
   * The `MediaSource` or media url can be linked AND segments can be pushed to
   * the `HTMLMediaElement` on which decryption capabilities were wanted.
   */
  | {
      type: "initialized";
      value: null;
    };

function formatSourceBufferError(error: unknown): SourceBufferError {
  if (error instanceof SourceBufferError) {
    return error;
  } else if (error instanceof Error) {
    return new SourceBufferError(
      error.name,
      error.message,
      error.name === "QuotaExceededError",
    );
  } else {
    return new SourceBufferError("Error", "Unknown SourceBufferError Error", false);
  }
}

/**
 * The Core might send back logs. In that situation, the message might be
 * formatted slightly differently to be able to cross threads (so a
 * serializable format has to be sent).
 *
 * This function translates that Core format to what's expected by the
 * logger.
 *
 * @param {*} arg
 * @returns {*}
 */
function formatSentLogObject(arg: ISentLogValue): IAcceptedLogValue {
  if (typeof arg !== "object") {
    return arg;
  }

  if (arg?.isSerializedError === true) {
    return formatCoreError(arg as ISentError);
  }
  return arg as Exclude<ISentLogValue, ISentError>;
}
