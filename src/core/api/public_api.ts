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

/**
 * This file defines the public API for the RxPlayer.
 * It also starts the different sub-parts of the player on various API calls.
 */

import {
  events,
  getStartDate,
} from "../../compat";
/* eslint-disable-next-line max-len */
import canRelyOnVideoVisibilityAndSize from "../../compat/can_rely_on_video_visibility_and_size";
import config from "../../config";
import {
  ErrorCodes,
  ErrorTypes,
  formatError,
  IErrorCode,
  IErrorType,
  MediaError,
} from "../../errors";
import features from "../../features";
import log from "../../log";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import {
  IAudioRepresentation,
  IAudioRepresentationsSwitchingMode,
  IAudioTrack,
  IAudioTrackSetting,
  IAudioTrackSwitchingMode,
  IAvailableAudioTrack,
  IAvailableTextTrack,
  IAvailableVideoTrack,
  IBitrateEstimate,
  IBrokenRepresentationsLockContext,
  IConstructorOptions,
  IDecipherabilityUpdateContent,
  IKeySystemConfigurationOutput,
  ILoadVideoOptions,
  ILockedAudioRepresentationsProperties,
  ILockedVideoRepresentationsProperties,
  ILostAudioTrackEventPayload,
  ILostTextTrackEventPayload,
  ILostVideoTrackEventPayload,
  IPeriod,
  IPeriodChangeEvent,
  IPlayerError,
  IPlayerState,
  IPositionUpdate,
  IStreamEvent,
  ITextTrack,
  IVideoRepresentation,
  ITextTrackSetting,
  IVideoRepresentationsSwitchingMode,
  IVideoTrack,
  IVideoTrackSetting,
  IVideoTrackSwitchingMode,
} from "../../public_types";
import assert from "../../utils/assert";
import assertUnreachable from "../../utils/assert_unreachable";
import EventEmitter, {
  IEventPayload,
  IListener,
} from "../../utils/event_emitter";
import idGenerator from "../../utils/id_generator";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import Logger from "../../utils/logger";
import objectAssign from "../../utils/object_assign";
import { getLeftSizeOfRange } from "../../utils/ranges";
import createSharedReference, {
  createMappedReference,
  IReadOnlySharedReference,
  ISharedReference,
} from "../../utils/reference";
import TaskCanceller, {
  CancellationSignal,
} from "../../utils/task_canceller";
import warnOnce from "../../utils/warn_once";
import { IABRThrottlers } from "../adaptive";
import {
  clearOnStop,
  disposeDecryptionResources,
  getKeySystemConfiguration,
  getCurrentKeySystem,
} from "../decrypt";
import { ContentInitializer } from "../init";
import MediaSourceContentInitializer from "../init/media_source_content_initializer";
import SegmentBuffersStore, {
  IBufferedChunk,
  IBufferType,
} from "../segment_buffers";
import {
  IAdaptationChoice,
  IInbandEvent,
} from "../stream";
import {
  checkReloadOptions,
  IParsedLoadVideoOptions,
  IParsedStartAtOption,
  parseConstructorOptions,
  parseLoadVideoOptions,
} from "./option_utils";
import PlaybackObserver, {
  IPlaybackObservation,
} from "./playback_observer";
/* eslint-disable-next-line max-len */
import MediaElementTracksStore from "./track_management/media_element_tracks_store";
import TracksStore, {
  ITMPeriodObject,
} from "./track_management/tracks_store";
import {
  constructPlayerStateReference,
  emitSeekEvents,
  isLoadedState,
  // emitSeekEvents,
  PLAYER_STATES,
} from "./utils";

/* eslint-disable @typescript-eslint/naming-convention */

const generateContentId = idGenerator();

const { getPictureOnPictureStateRef,
        getVideoVisibilityRef,
        getVideoWidthRef } = events;

/**
 * @class Player
 * @extends EventEmitter
 */
class Player extends EventEmitter<IPublicAPIEvent> {

  /** Current version of the RxPlayer.  */
  public static version : string;

  /** Current version of the RxPlayer.  */
  public readonly version : string;

  /**
   * Media element attached to the RxPlayer.
   * Set to `null` when the RxPlayer is disposed.
   */
  public videoElement : HTMLMediaElement|null; // null on dispose

  /** Logger the RxPlayer uses.  */
  public readonly log : Logger;

  /**
   * Current state of the RxPlayer.
   * Please use `getPlayerState()` instead.
   */
  public state : IPlayerState;

  /**
   * Emit when the the RxPlayer is not needed anymore and thus all resources
   * used for its normal functionment can be freed.
   * The player will be unusable after that.
   */
  private readonly _destroyCanceller : TaskCanceller;

  /**
   * Contains `true` when the previous content is cleaning-up, `false` when it's
   * done.
   * A new content cannot be launched until it stores `false`.
   */
  private readonly _priv_contentLock : ISharedReference<boolean>;

  /**
   * The speed that should be applied to playback.
   * Used instead of videoElement.playbackRate to allow more flexibility.
   */
  private readonly _priv_speed : ISharedReference<number>;

  /** Store buffer-related options used needed when initializing a content. */
  private readonly _priv_bufferOptions : {
    /** Last wanted buffer goal. */
    wantedBufferAhead : ISharedReference<number>;
    /** Maximum kept buffer ahead in the current position, in seconds. */
    maxBufferAhead : ISharedReference<number>;
    /** Maximum kept buffer behind in the current position, in seconds. */
    maxBufferBehind : ISharedReference<number>;
    /** Maximum size of video buffer , in kiloBytes */
    maxVideoBufferSize : ISharedReference<number>;
  };

  /** Information on the current bitrate settings. */
  private readonly _priv_bitrateInfos : {
    /**
     * Store last bitrates for each media type for the adaptive logic.
     * Store the initial wanted bitrates at first.
     */
    lastBitrates : { audio? : number;
                     video? : number;
                     text? : number; };

    /** Store last wanted minAutoBitrates for the adaptive logic. */
    minAutoBitrates : { audio : ISharedReference<number>;
                        video : ISharedReference<number>; };

    /** Store last wanted maxAutoBitrates for the adaptive logic. */
    maxAutoBitrates : { audio : ISharedReference<number>;
                        video : ISharedReference<number>; };

    /** Store last wanted manual bitrates for the adaptive logic. */
    manualBitrates : { audio : ISharedReference<number>;
                       video : ISharedReference<number>; };
  };

  /**
   * Current fatal error which STOPPED the player.
   * `null` if no fatal error was received for the current or last content.
   */
  private _priv_currentError : Error|null;

  /**
   * Information about the current content being played.
   * `null` when no content is currently loading or loaded.
   */
  private _priv_contentInfos : IPublicApiContentInfos | null;

  /** If `true` trickMode video tracks will be chosen if available. */
  private _priv_preferTrickModeTracks : boolean;

  /** Refer to last picture in picture event received. */
  private _priv_pictureInPictureRef : IReadOnlySharedReference<
    events.IPictureInPictureEvent
  >;

  /** Store wanted configuration for the `limitVideoWidth` option. */
  private readonly _priv_limitVideoWidth : boolean;

  /** Store wanted configuration for the `throttleVideoBitrateWhenHidden` option. */
  private readonly _priv_throttleVideoBitrateWhenHidden : boolean;

  /** Store volume when mute is called, to restore it on unmute. */
  private _priv_mutedMemory : number;

  /**
   * Store last state of various values sent as events, to avoid re-triggering
   * them multiple times in a row.
   *
   * All those events are linked to the content being played and can be cleaned
   * on stop.
   */
  private _priv_contentEventsMemory : {
    [P in keyof IPublicAPIEvent]? : IPublicAPIEvent[P];
  };

  /**
   * Information that can be relied on once `reload` is called.
   * It should refer to the last content being played.
   */
  private _priv_reloadingMetadata : {
    /**
     * `loadVideo` options communicated for the last content that will be re-used
     * on reload.
     */
    options?: IParsedLoadVideoOptions;
    /**
     * Manifest loaded for the last content that should be used once `reload`
     * is called.
     */
    manifest?: Manifest;
    /**
     * If `true`, the player should be paused after reloading.
     * If `false`, the player should be playing after reloading.
     * If `undefined`, `reload` should depend on other criteria (such as the
     * `autoPlay` option, to know whether the content should play or not after
     * reloading.
     */
    reloadInPause?: boolean;
    /**
     * If set this is the position that should be seeked to by default after
     * reloading.
     */
    reloadPosition?: number;
  };

  /** All possible Error types emitted by the RxPlayer. */
  static get ErrorTypes() : Record<IErrorType, IErrorType> {
    return ErrorTypes;
  }

  /** All possible Error codes emitted by the RxPlayer. */
  static get ErrorCodes() : Record<IErrorCode, IErrorCode> {
    return ErrorCodes;
  }

  /**
   * Current log level.
   * Update current log level.
   * Should be either (by verbosity ascending):
   *   - "NONE"
   *   - "ERROR"
   *   - "WARNING"
   *   - "INFO"
   *   - "DEBUG"
   * Any other value will be translated to "NONE".
   */
  static get LogLevel() : string {
    return log.getLevel();
  }
  static set LogLevel(logLevel : string) {
    log.setLevel(logLevel);
  }

  /**
   * @constructor
   * @param {Object} options
   */
  constructor(options : IConstructorOptions = {}) {
    super();
    const { initialAudioBitrate,
            initialVideoBitrate,
            limitVideoWidth,
            minAudioBitrate,
            minVideoBitrate,
            maxAudioBitrate,
            maxBufferAhead,
            maxBufferBehind,
            maxVideoBitrate,
            throttleVideoBitrateWhenHidden,
            videoElement,
            wantedBufferAhead,
            maxVideoBufferSize } = parseConstructorOptions(options);
    const { DEFAULT_UNMUTED_VOLUME } = config.getCurrent();
    // Workaround to support Firefox autoplay on FF 42.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
    videoElement.preload = "auto";

    this.version = /* PLAYER_VERSION */"3.29.0";
    this.log = log;
    this.state = "STOPPED";
    this.videoElement = videoElement;

    const destroyCanceller = new TaskCanceller();
    this._destroyCanceller = destroyCanceller;

    this._priv_pictureInPictureRef = getPictureOnPictureStateRef(videoElement,
                                                                 destroyCanceller.signal);
    this._priv_speed = createSharedReference(videoElement.playbackRate,
                                             this._destroyCanceller.signal);
    this._priv_preferTrickModeTracks = false;
    this._priv_contentLock = createSharedReference<boolean>(
      false,
      this._destroyCanceller.signal);

    this._priv_bufferOptions = {
      wantedBufferAhead: createSharedReference(wantedBufferAhead,
                                               this._destroyCanceller.signal),
      maxBufferAhead: createSharedReference(maxBufferAhead,
                                            this._destroyCanceller.signal),
      maxBufferBehind: createSharedReference(maxBufferBehind,
                                             this._destroyCanceller.signal),
      maxVideoBufferSize: createSharedReference(maxVideoBufferSize,
                                                this._destroyCanceller.signal),
    };

    this._priv_bitrateInfos = {
      lastBitrates: { audio: initialAudioBitrate,
                      video: initialVideoBitrate },
      minAutoBitrates: { audio: createSharedReference(minAudioBitrate,
                                                      this._destroyCanceller.signal),
                         video: createSharedReference(minVideoBitrate,
                                                      this._destroyCanceller.signal) },
      maxAutoBitrates: { audio: createSharedReference(maxAudioBitrate,
                                                      this._destroyCanceller.signal),
                         video: createSharedReference(maxVideoBitrate,
                                                      this._destroyCanceller.signal) },
      manualBitrates: { audio: createSharedReference(-1, this._destroyCanceller.signal),
                        video: createSharedReference(-1, this._destroyCanceller.signal) },
    };

    this._priv_throttleVideoBitrateWhenHidden = throttleVideoBitrateWhenHidden;
    this._priv_limitVideoWidth = limitVideoWidth;
    this._priv_mutedMemory = DEFAULT_UNMUTED_VOLUME;

    this._priv_currentError = null;
    this._priv_contentInfos = null;

    this._priv_contentEventsMemory = {};

    this._priv_setPlayerState(PLAYER_STATES.STOPPED);

    this._priv_reloadingMetadata = {};
  }

  /**
   * Register a new callback for a player event event.
   *
   * @param {string} evt - The event to register a callback to
   * @param {Function} fn - The callback to call as that event is triggered.
   * The callback will take as argument the eventual payload of the event
   * (single argument).
   */
  addEventListener<TEventName extends keyof IPublicAPIEvent>(
    evt: TEventName,
    fn: IListener<IPublicAPIEvent, TEventName>
  ) : void {
    // The EventEmitter's `addEventListener` method takes an optional third
    // argument that we do not want to expose in the public API.
    // We thus overwrite that function to remove any possible usage of that
    // third argument.
    return super.addEventListener(evt, fn);
  }

  /**
   * Stop the playback for the current content.
   */
  stop() : void {
    if (this._priv_contentInfos !== null) {
      this._priv_contentInfos.currentContentCanceller.cancel();
    }
    this._priv_cleanUpCurrentContentState();
    if (this.state !== PLAYER_STATES.STOPPED) {
      this._priv_setPlayerState(PLAYER_STATES.STOPPED);
    }
  }

  /**
   * Free the resources used by the player.
   * /!\ The player cannot be "used" anymore after this method has been called.
   */
  dispose() : void {
    // free resources linked to the loaded content
    this.stop();

    if (this.videoElement !== null) {
      // free resources used for decryption management
      disposeDecryptionResources(this.videoElement)
        .catch((err : unknown) => {
          const message = err instanceof Error ? err.message :
                                                 "Unknown error";
          log.error("API: Could not dispose decryption resources: " + message);
        });
    }

    // free resources linked to the Player instance
    this._destroyCanceller.cancel();

    this._priv_reloadingMetadata = {};

    // un-attach video element
    this.videoElement = null;
  }

  /**
   * Load a new video.
   * @param {Object} opts
   */
  loadVideo(opts : ILoadVideoOptions) : void {
    const options = parseLoadVideoOptions(opts);
    log.info("API: Calling loadvideo", options.url, options.transport);
    this._priv_reloadingMetadata = { options };
    this._priv_initializeContentPlayback(options);
  }

  /**
   * Reload the last loaded content.
   * @param {Object} reloadOpts
   */
  reload(reloadOpts?: {
    reloadAt?: { position?: number; relative?: number };
    autoPlay?: boolean;
  }): void {
    const { options,
            manifest,
            reloadPosition,
            reloadInPause } = this._priv_reloadingMetadata;
    if (options === undefined) {
      throw new Error("API: Can't reload without having previously loaded a content.");
    }
    checkReloadOptions(reloadOpts);
    let startAt : IParsedStartAtOption | undefined;
    if (reloadOpts?.reloadAt?.position !== undefined) {
      startAt = { position: reloadOpts.reloadAt.position };
    } else if (reloadOpts?.reloadAt?.relative !== undefined) {
      if (reloadPosition === undefined) {
        throw new Error(
          "Can't reload to a relative position when previous content was not loaded."
        );
      } else {
        startAt = { position: reloadOpts.reloadAt.relative + reloadPosition };
      }
    } else if (reloadPosition !== undefined) {
      startAt = { position: reloadPosition };
    }

    let autoPlay : boolean | undefined;
    if (reloadOpts?.autoPlay !== undefined) {
      autoPlay = reloadOpts.autoPlay;
    } else if (reloadInPause !== undefined) {
      autoPlay = !reloadInPause;
    }

    const newOptions = { ...options,
                         initialManifest: manifest };
    if (startAt !== undefined) {
      newOptions.startAt = startAt;
    }
    if (autoPlay !== undefined) {
      newOptions.autoPlay = autoPlay;
    }
    this._priv_initializeContentPlayback(newOptions);
  }

  /**
   * From given options, initialize content playback.
   * @param {Object} options
   */
  private _priv_initializeContentPlayback(options : IParsedLoadVideoOptions) : void {
    const { autoPlay,
            enableFastSwitching,
            initialManifest,
            keySystems,
            lowLatencyMode,
            manualBitrateSwitchingMode,
            minimumManifestUpdateInterval,
            networkConfig,
            onCodecSwitch,
            startAt,
            transport,
            transportOptions,
            url } = options;

    // Perform multiple checks on the given options
    if (this.videoElement === null) {
      throw new Error("the attached video element is disposed");
    }

    const isDirectFile = transport === "directfile";

    /** Emit to stop the current content. */
    const currentContentCanceller = new TaskCanceller();

    const videoElement = this.videoElement;

    let initializer : ContentInitializer;

    let mediaElementTracksStore : MediaElementTracksStore | null =
      null;
    if (!isDirectFile) {
      const transportFn = features.transports[transport];
      if (typeof transportFn !== "function") {
        // Stop previous content and reset its state
        this.stop();
        this._priv_currentError = null;
        throw new Error(`transport "${transport}" not supported`);
      }

      const transportPipelines = transportFn(transportOptions);

      const { offlineRetry,
              segmentRetry,
              manifestRetry,
              manifestRequestTimeout,
              segmentRequestTimeout } = networkConfig;

      /** Interface used to load and refresh the Manifest. */
      const manifestRequestSettings = { lowLatencyMode,
                                        maxRetryRegular: manifestRetry,
                                        maxRetryOffline: offlineRetry,
                                        requestTimeout:  manifestRequestTimeout,
                                        minimumManifestUpdateInterval,
                                        initialManifest };

      const relyOnVideoVisibilityAndSize = canRelyOnVideoVisibilityAndSize();
      const throttlers : IABRThrottlers = { throttleBitrate: {},
                                            limitWidth: {} };

      if (this._priv_throttleVideoBitrateWhenHidden) {
        if (!relyOnVideoVisibilityAndSize) {
          log.warn("API: Can't apply throttleVideoBitrateWhenHidden because " +
                   "browser can't be trusted for visibility.");
        } else {
          throttlers.throttleBitrate = {
            video: createMappedReference(
              getVideoVisibilityRef(this._priv_pictureInPictureRef,
                                    currentContentCanceller.signal),
              isActive => isActive ? Infinity : 0,
              currentContentCanceller.signal),
          };
        }
      }
      if (this._priv_limitVideoWidth) {
        if (!relyOnVideoVisibilityAndSize) {
          log.warn("API: Can't apply limitVideoWidth because browser can't be " +
                   "trusted for video size.");
        } else {
          throttlers.limitWidth = {
            video: getVideoWidthRef(videoElement,
                                    this._priv_pictureInPictureRef,
                                    currentContentCanceller.signal),
          };
        }
      }

      /** Options used by the adaptive logic. */
      const adaptiveOptions = {
        initialBitrates: this._priv_bitrateInfos.lastBitrates,
        lowLatencyMode,
        manualBitrates: this._priv_bitrateInfos.manualBitrates,
        minAutoBitrates: this._priv_bitrateInfos.minAutoBitrates,
        maxAutoBitrates: this._priv_bitrateInfos.maxAutoBitrates,
        throttlers,
      };

      /** Options used by the TextTrack SegmentBuffer. */
      const textTrackOptions = options.textTrackMode === "native" ?
        { textTrackMode: "native" as const } :
        { textTrackMode: "html" as const,
          textTrackElement: options.textTrackElement };

      const bufferOptions = objectAssign({ enableFastSwitching,
                                           manualBitrateSwitchingMode,
                                           onCodecSwitch },
                                         this._priv_bufferOptions);

      const segmentRequestOptions = { lowLatencyMode,
                                      maxRetryRegular: segmentRetry,
                                      requestTimeout: segmentRequestTimeout,
                                      maxRetryOffline: offlineRetry };

      initializer = new MediaSourceContentInitializer({
        adaptiveOptions,
        autoPlay,
        bufferOptions,
        keySystems,
        lowLatencyMode,
        manifestRequestSettings,
        transport: transportPipelines,
        segmentRequestOptions,
        speed: this._priv_speed,
        startAt,
        textTrackOptions,
        url,
      });
    } else {
      if (features.directfile === null) {
        this.stop();
        this._priv_currentError = null;
        throw new Error("DirectFile feature not activated in your build.");
      }
      mediaElementTracksStore =
        this._priv_initializeMediaElementTracksStore(
          currentContentCanceller.signal
        );
      if (currentContentCanceller.isUsed) {
        return;
      }
      initializer = new features.directfile.initDirectFile({ autoPlay,
                                                             keySystems,
                                                             speed: this._priv_speed,
                                                             startAt,
                                                             url });
    }

    /** Future `this._priv_contentInfos` related to this content. */
    const contentInfos : IPublicApiContentInfos = {
      contentId: generateContentId(),
      originalUrl: url,
      currentContentCanceller,
      initializer,
      isDirectFile,
      segmentBuffersStore: null,
      manifest: null,
      currentPeriod: null,
      activeAdaptations: null,
      activeRepresentations: null,
      tracksStore: null,
      mediaElementTracksStore,
    };

    // Bind events
    initializer.addEventListener("error", (error) => {
      const formattedError = formatError(error, {
        defaultCode: "NONE",
        defaultReason: "An unknown error stopped content playback.",
      });
      formattedError.fatal = true;

      contentInfos.currentContentCanceller.cancel();
      this._priv_cleanUpCurrentContentState();
      this._priv_currentError = formattedError;
      log.error("API: The player stopped because of an error",
                error instanceof Error ? error : "");
      this._priv_setPlayerState(PLAYER_STATES.STOPPED);

      // TODO This condition is here because the eventual callback called when the
      // player state is updated can launch a new content, thus the error will not
      // be here anymore, in which case triggering the "error" event is unwanted.
      // This is very ugly though, and we should probable have a better solution
      if (this._priv_currentError === formattedError) {
        this.trigger("error", formattedError);
      }
    });
    initializer.addEventListener("warning", (error) => {
      const formattedError = formatError(error, {
        defaultCode: "NONE",
        defaultReason: "An unknown error happened.",
      });
      log.warn("API: Sending warning:", formattedError);
      this.trigger("warning", formattedError);
    });
    initializer.addEventListener("reloadingMediaSource", () => {
      contentInfos.segmentBuffersStore = null;
      if (contentInfos.tracksStore !== null) {
        contentInfos.tracksStore.resetPeriodObjects();
      }
    });
    initializer.addEventListener("inbandEvents", (inbandEvents) =>
      this.trigger("inbandEvents", inbandEvents));
    initializer.addEventListener("streamEvent", (streamEvent) =>
      this.trigger("streamEvent", streamEvent));
    initializer.addEventListener("streamEventSkip", (streamEventSkip) =>
      this.trigger("streamEventSkip", streamEventSkip));
    initializer.addEventListener("decipherabilityUpdate", (decipherabilityUpdate) =>
      this.trigger("decipherabilityUpdate", decipherabilityUpdate.map((i) => {
        return { periodInfo: { start: i.period.start,
                               end: i.period.end,
                               id: i.period.id },
                 trackType: i.adaptation.type,
                 trackId: i.adaptation.id,
                 representationId: i.representation.id,
                 isDecipherable: i.representation.decipherable };
      })));
    initializer.addEventListener("activePeriodChanged", (periodInfo) =>
      this._priv_onActivePeriodChanged(contentInfos, periodInfo));
    initializer.addEventListener("periodStreamReady", (periodReadyInfo) =>
      this._priv_onPeriodStreamReady(contentInfos, periodReadyInfo));
    initializer.addEventListener("periodStreamCleared", (periodClearedInfo) =>
      this._priv_onPeriodStreamCleared(contentInfos, periodClearedInfo));
    initializer.addEventListener("representationChange", (representationInfo) =>
      this._priv_onRepresentationChange(contentInfos, representationInfo));
    initializer.addEventListener("adaptationChange", (adaptationInfo) =>
      this._priv_onAdaptationChange(contentInfos, adaptationInfo));
    initializer.addEventListener("bitrateEstimationChange", (bitrateEstimationInfo) =>
      this._priv_onBitrateEstimationChange(bitrateEstimationInfo));
    initializer.addEventListener("manifestReady", (manifest) =>
      this._priv_onManifestReady(contentInfos, manifest));
    initializer.addEventListener("loaded", (evt) => {
      contentInfos.segmentBuffersStore = evt.segmentBuffersStore;
    });

    // Now, that most events are linked, prepare the next content.
    initializer.prepare();

    // Now that the content is prepared, stop previous content and reset state
    // This is done after content preparation as `stop` could technically have
    // a long and synchronous blocking time.
    // Note that this call is done **synchronously** after all events linking.
    // This is **VERY** important so:
    //   - the `STOPPED` state is switched to synchronously after loading a new
    //     content.
    //   - we can avoid involontarily catching events linked to the previous
    //     content.
    this.stop();

    /** Global "playback observer" which will emit playback conditions */
    const playbackObserver = new PlaybackObserver(videoElement, {
      withMediaSource: !isDirectFile,
      lowLatencyMode,
    });

    currentContentCanceller.signal.register(() => {
      playbackObserver.stop();
    });

    // Update the RxPlayer's state at the right events
    const playerStateRef = constructPlayerStateReference(initializer,
                                                         videoElement,
                                                         playbackObserver,
                                                         currentContentCanceller.signal);
    currentContentCanceller.signal.register(() => {
      initializer.dispose();
    });

    /**
     * Function updating `this._priv_reloadingMetadata` in function of the
     * current state and playback conditions.
     * To call when either might change.
     * @param {string} state - The player state we're about to switch to.
     */
    const updateReloadingMetadata = (state : IPlayerState) => {
      switch (state) {
        case "STOPPED":
        case "RELOADING":
        case "LOADING":
          break; // keep previous metadata
        case "ENDED":
          this._priv_reloadingMetadata.reloadInPause = true;
          this._priv_reloadingMetadata.reloadPosition =
            playbackObserver.getReference().getValue().position;
          break;
        default:
          const o = playbackObserver.getReference().getValue();
          this._priv_reloadingMetadata.reloadInPause = o.paused;
          this._priv_reloadingMetadata.reloadPosition = o.position;
          break;
      }
    };

    /**
     * `TaskCanceller` allowing to stop emitting `"seeking"` and `"seeked"`
     * events.
     * `null` when such events are not emitted currently.
     */
    let seekEventsCanceller : TaskCanceller | null = null;

    // React to player state change
    playerStateRef.onUpdate((newState : IPlayerState) => {
      updateReloadingMetadata(newState);
      this._priv_setPlayerState(newState);

      if (currentContentCanceller.isUsed) {
        return;
      }

      if (seekEventsCanceller !== null) {
        if (!isLoadedState(this.state)) {
          seekEventsCanceller.cancel();
          seekEventsCanceller = null;
        }
      } else if (isLoadedState(this.state)) {
        seekEventsCanceller = new TaskCanceller({
          cancelOn: currentContentCanceller.signal,
        });
        emitSeekEvents(videoElement,
                       playbackObserver,
                       () => this.trigger("seeking", null),
                       () => this.trigger("seeked", null),
                       seekEventsCanceller.signal);
      }
    }, { emitCurrentValue: true, clearSignal: currentContentCanceller.signal });

    // React to playback conditions change
    playbackObserver.listen((observation) => {
      updateReloadingMetadata(this.state);
      this._priv_triggerPositionUpdate(contentInfos, observation);
    }, { clearSignal: currentContentCanceller.signal });

    this._priv_currentError = null;
    this._priv_contentInfos = contentInfos;

    currentContentCanceller.signal.register(() => {
      initializer.removeEventListener();
    });

    // initialize the content only when the lock is inactive
    this._priv_contentLock.onUpdate((isLocked, stopListeningToLock) => {
      if (!isLocked) {
        stopListeningToLock();

        // start playback!
        initializer.start(videoElement, playbackObserver);
      }
    }, { emitCurrentValue: true, clearSignal: currentContentCanceller.signal });
  }

  /**
   * Returns fatal error if one for the current content.
   * null otherwise.
   * @returns {Object|null} - The current Error (`null` when no error).
   */
  getError() : Error|null {
    return this._priv_currentError;
  }

  /**
   * Returns the media DOM element used by the player.
   * You should not its HTML5 API directly and use the player's method instead,
   * to ensure a well-behaved player.
   * @returns {HTMLMediaElement|null} - The HTMLMediaElement used (`null` when
   * disposed)
   */
  getVideoElement() : HTMLMediaElement|null {
    return this.videoElement;
  }

  /**
   * Returns the player's current state.
   * @returns {string} - The current Player's state
   */
  getPlayerState() : string {
    return this.state;
  }

  /**
   * Returns true if both:
   *   - a content is loaded
   *   - the content loaded is a live content
   * @returns {Boolean} - `true` if we're playing a live content, `false` otherwise.
   */
  isLive() : boolean {
    if (this._priv_contentInfos === null) {
      return false;
    }
    const { isDirectFile, manifest } = this._priv_contentInfos;
    if (isDirectFile || manifest === null) {
      return false;
    }
    return manifest.isLive;
  }

  /**
   * Returns `true` if trickmode playback is active (usually through the usage
   * of the `setPlaybackRate` method), which means that the RxPlayer selects
   * "trickmode" video tracks in priority.
   * @returns {Boolean}
   */
  areTrickModeTracksEnabled(): boolean {
    return this._priv_preferTrickModeTracks;
  }

  /**
   * Returns the url of the currently considered Manifest, or of the content for
   * directfile content.
   * @returns {string|undefined} - Current URL. `undefined` if not known or no
   * URL yet.
   */
  getUrl() : string|undefined {
    if (this._priv_contentInfos === null) {
      return undefined;
    }
    const { isDirectFile, manifest, originalUrl } = this._priv_contentInfos;
    if (isDirectFile) {
      return originalUrl;
    }
    if (manifest !== null) {
      return manifest.getUrl();
    }
    return undefined;
  }

  /**
   * Update URL of the content currently being played (e.g. DASH's MPD).
   * @param {Array.<string>|undefined} urls - URLs to reach that content /
   * Manifest from the most prioritized URL to the least prioritized URL.
   * @param {Object|undefined} [params]
   * @param {boolean} params.refresh - If `true` the resource in question
   * (e.g. DASH's MPD) will be refreshed immediately.
   */
  public updateContentUrls(
    urls : string[] | undefined,
    params? : { refresh?: boolean } | undefined
  ) : void {
    if (this._priv_contentInfos === null) {
      throw new Error("No content loaded");
    }
    const refreshNow = params?.refresh === true;
    this._priv_contentInfos.initializer.updateContentUrls(urls, refreshNow);
  }

  /**
   * Returns the video duration, in seconds.
   * NaN if no video is playing.
   * @returns {Number}
   */
  getMediaDuration() : number {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    return this.videoElement.duration;
  }

  /**
   * Returns in seconds the difference between:
   *   - the end of the current contiguous loaded range.
   *   - the current time
   * @returns {Number}
   */
  getCurrentBufferGap() : number {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    const videoElement = this.videoElement;
    return getLeftSizeOfRange(videoElement.buffered, videoElement.currentTime);
  }

  /**
   * Get the current position, in s, in wall-clock time.
   * That is:
   *   - for live content, get a timestamp, in s, of the current played content.
   *   - for static content, returns the position from beginning in s.
   *
   * If you do not know if you want to use this method or getPosition:
   *   - If what you want is to display the current time to the user, use this
   *     one.
   *   - If what you want is to interact with the player's API or perform other
   *     actions (like statistics) with the real player data, use getPosition.
   *
   * @returns {Number}
   */
  getWallClockTime() : number {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    if (this._priv_contentInfos === null) {
      return this.videoElement.currentTime;
    }

    const { isDirectFile, manifest } = this._priv_contentInfos;
    if (isDirectFile) {
      const startDate = getStartDate(this.videoElement);
      return (startDate ?? 0) + this.videoElement.currentTime;
    }
    if (manifest !== null) {
      const currentTime = this.videoElement.currentTime;
      const ast = manifest.availabilityStartTime !== undefined ?
        manifest.availabilityStartTime :
        0;
      return currentTime + ast;
    }
    return 0;
  }

  /**
   * Get the current position, in seconds, of the video element.
   *
   * If you do not know if you want to use this method or getWallClockTime:
   *   - If what you want is to display the current time to the user, use
   *     getWallClockTime.
   *   - If what you want is to interact with the player's API or perform other
   *     actions (like statistics) with the real player data, use this one.
   *
   * @returns {Number}
   */
  getPosition() : number {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    return this.videoElement.currentTime;
  }

  /**
   * Returns the current playback rate at which the video plays.
   * @returns {Number}
   */
  getPlaybackRate() : number {
    return this._priv_speed.getValue();
  }

  /**
   * Update the playback rate of the video.
   *
   * This method's effect is persisted from content to content, and can be
   * called even when no content is playing (it will still have an effect for
   * the next contents).
   *
   * If you want to reverse effects provoked by `setPlaybackRate` before playing
   * another content, you will have to call `setPlaybackRate` first with the
   * default settings you want to set.
   *
   * As an example, to reset the speed to "normal" (x1) speed and to disable
   * trickMode video tracks (which may have been enabled by a previous
   * `setPlaybackRate` call), you can call:
   * ```js
   * player.setPlaybackRate(1, { preferTrickModeTracks: false });
   * ```
   *
   * --
   *
   * This method can be used to switch to or exit from "trickMode" video tracks,
   * which are tracks specifically defined to mimic the visual aspect of a VCR's
   * fast forward/rewind feature, by only displaying a few video frames during
   * playback.
   *
   * This behavior is configurable through the second argument, by adding a
   * property named `preferTrickModeTracks` to that object.
   *
   * You can set that value to `true` to switch to trickMode video tracks when
   * available, and set it to `false` when you want to disable that logic.
   * Note that like any configuration given to `setPlaybackRate`, this setting
   * is persisted through all future contents played by the player.
   *
   * If you want to stop enabling trickMode tracks, you will have to call
   * `setPlaybackRate` again with `preferTrickModeTracks` set to `false`.
   *
   * You can know at any moment whether this behavior is enabled by calling
   * the `areTrickModeTracksEnabled` method. This will only means that the
   * RxPlayer will select in priority trickmode video tracks, not that the
   * currently chosen video tracks is a trickmode track (for example, some
   * contents may have no trickmode tracks available).
   *
   * If you want to know about the latter instead, you can call `getVideoTrack`
   * and/or listen to `videoTrackChange` events. The track returned may have an
   * `isTrickModeTrack` property set to `true`, indicating that it is a
   * trickmode track.
   *
   * Note that switching to or getting out of a trickmode video track may
   * lead to the player being a brief instant in a `"RELOADING"` state (notified
   * through `playerStateChange` events and the `getLoadedContentState` method).
   * When in that state, a black screen may be displayed and multiple RxPlayer
   * APIs will not be usable.
   *
   * @param {Number} rate
   * @param {Object} opts
   */
  setPlaybackRate(
    rate : number,
    opts? : { preferTrickModeTracks? : boolean }
  ) : void {
    if (rate !== this._priv_speed.getValue()) {
      this._priv_speed.setValue(rate);
    }

    const preferTrickModeTracks = opts?.preferTrickModeTracks;
    if (typeof preferTrickModeTracks !== "boolean") {
      return;
    }
    this._priv_preferTrickModeTracks = preferTrickModeTracks;
    const tracksStore = this._priv_contentInfos?.tracksStore;
    if (!isNullOrUndefined(tracksStore)) {
      if (preferTrickModeTracks && !tracksStore.isTrickModeEnabled()) {
        tracksStore.enableVideoTrickModeTracks();
      } else if (!preferTrickModeTracks && tracksStore.isTrickModeEnabled()) {
        tracksStore.disableVideoTrickModeTracks();
      }
    }
  }

  /**
   * Returns currently considered bitrate for video segments.
   * @returns {Number|undefined}
   */
  getVideoBitrate() : number|undefined {
    const representations = this._priv_getCurrentRepresentations();
    if (representations === null || isNullOrUndefined(representations.video)) {
      return undefined;
    }
    return representations.video.bitrate;
  }

  /**
   * Returns currently considered bitrate for audio segments.
   * @returns {Number|undefined}
   */
  getAudioBitrate() : number|undefined {
    const representations = this._priv_getCurrentRepresentations();
    if (representations === null || isNullOrUndefined(representations.audio)) {
      return undefined;
    }
    return representations.audio.bitrate;
  }

  /**
   * Returns minimum wanted video bitrate currently set.
   * @returns {Number}
   */
  getMinVideoBitrate() : number {
    return this._priv_bitrateInfos.minAutoBitrates.video.getValue();
  }

  /**
   * Returns minimum wanted audio bitrate currently set.
   * @returns {Number}
   */
  getMinAudioBitrate() : number {
    return this._priv_bitrateInfos.minAutoBitrates.audio.getValue();
  }

  /**
   * Returns maximum wanted video bitrate currently set.
   * @returns {Number}
   */
  getMaxVideoBitrate() : number {
    return this._priv_bitrateInfos.maxAutoBitrates.video.getValue();
  }

  /**
   * Returns maximum wanted audio bitrate currently set.
   * @returns {Number}
   */
  getMaxAudioBitrate() : number {
    return this._priv_bitrateInfos.maxAutoBitrates.audio.getValue();
  }

  /**
   * Play/Resume the current video.
   * @returns {Promise}
   */
  play() : Promise<void> {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }

    const playPromise = this.videoElement.play();
    /* eslint-disable @typescript-eslint/unbound-method */
    if (isNullOrUndefined(playPromise) || typeof playPromise.catch !== "function") {
    /* eslint-enable @typescript-eslint/unbound-method */
      return Promise.resolve();
    }
    return playPromise.catch((error: Error) => {
      if (error.name === "NotAllowedError") {
        const warning = new MediaError("MEDIA_ERR_PLAY_NOT_ALLOWED",
                                       error.toString());
        this.trigger("warning", warning);
      }
      throw error;
    });
  }

  /**
   * Pause the current video.
   */
  pause() : void {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    this.videoElement.pause();
  }

  /**
   * Seek to a given absolute position.
   * @param {Number|Object} time
   * @returns {Number} - The time the player has seek to
   */
  seekTo(
    time : number | { relative : number } | { position : number } |
    { wallClockTime : number }
  ) : number {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    if (this._priv_contentInfos === null) {
      throw new Error("player: no content loaded");
    }

    const { isDirectFile, manifest } = this._priv_contentInfos;
    if (!isDirectFile && manifest === null) {
      throw new Error("player: the content did not load yet");
    }

    let positionWanted : number|undefined;

    if (typeof time === "number") {
      positionWanted = time;
    } else if (typeof time === "object") {
      const timeObj : { time? : number;
                        relative? : number;
                        position? : number;
                        wallClockTime? : number; } = time;
      const currentTs = this.videoElement.currentTime;
      if (!isNullOrUndefined(timeObj.relative)) {
        positionWanted = currentTs + timeObj.relative;
      } else if (!isNullOrUndefined(timeObj.position)) {
        positionWanted = timeObj.position;
      } else if (!isNullOrUndefined(timeObj.wallClockTime)) {
        if (manifest !== null) {
          positionWanted = timeObj.wallClockTime - (
            manifest.availabilityStartTime ?? 0
          );
        } else if (isDirectFile && this.videoElement !== null) {
          const startDate = getStartDate(this.videoElement);
          if (startDate !== undefined) {
            positionWanted = timeObj.wallClockTime - startDate;
          }
        }
        if (positionWanted === undefined) {
          positionWanted = timeObj.wallClockTime;
        }
      } else {
        throw new Error("invalid time object. You must set one of the " +
                        "following properties: \"relative\", \"position\" or " +
                        "\"wallClockTime\"");
      }
    }

    if (positionWanted === undefined) {
      throw new Error("invalid time given");
    }
    this.videoElement.currentTime = positionWanted;
    return positionWanted;
  }

  /**
   * Returns the current player's audio volume on the media element.
   * From 0 (no audio) to 1 (maximum volume).
   * @returns {Number}
   */
  getVolume() : number {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    return this.videoElement.volume;
  }

  /**
   * Set the player's audio volume. From 0 (no volume) to 1 (maximum volume).
   * @param {Number} volume
   */
  setVolume(volume : number) : void {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }

    const videoElement = this.videoElement;
    if (volume !== videoElement.volume) {
      videoElement.volume = volume;
      this.trigger("volumeChange", volume);
    }
  }

  /**
   * Returns true if the volume is set to 0. false otherwise.
   * @returns {Boolean}
   */
  isMute() : boolean {
    return this.getVolume() === 0;
  }

  /**
   * Set the volume to 0 and save current one for when unmuted.
   */
  mute() : void {
    this._priv_mutedMemory = this.getVolume();
    this.setVolume(0);
  }

  /**
   * Set the volume back to when it was when mute was last called.
   * If the volume was set to 0, set a default volume instead (see config).
   */
  unMute() : void {
    const { DEFAULT_UNMUTED_VOLUME } = config.getCurrent();
    const vol = this.getVolume();
    if (vol === 0) {
      this.setVolume(this._priv_mutedMemory === 0 ? DEFAULT_UNMUTED_VOLUME :
                                                    this._priv_mutedMemory);
    }
  }

  /**
   * Update the minimum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setMinVideoBitrate(btr : number) : void {
    const maxVideoBitrate = this._priv_bitrateInfos.maxAutoBitrates.video.getValue();
    if (btr > maxVideoBitrate) {
      throw new Error("Invalid minimum video bitrate given. " +
                      `Its value, "${btr}" is superior the current maximum ` +
                      `video birate, "${maxVideoBitrate}".`);
    }
    this._priv_bitrateInfos.minAutoBitrates.video.setValue(btr);
  }

  /**
   * Update the minimum audio bitrate the user can switch to.
   * @param {Number} btr
   */
  setMinAudioBitrate(btr : number) : void {
    const maxAudioBitrate = this._priv_bitrateInfos.maxAutoBitrates.audio.getValue();
    if (btr > maxAudioBitrate) {
      throw new Error("Invalid minimum audio bitrate given. " +
                      `Its value, "${btr}" is superior the current maximum ` +
                      `audio birate, "${maxAudioBitrate}".`);
    }
    this._priv_bitrateInfos.minAutoBitrates.audio.setValue(btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setMaxVideoBitrate(btr : number) : void {
    const minVideoBitrate = this._priv_bitrateInfos.minAutoBitrates.video.getValue();
    if (btr < minVideoBitrate) {
      throw new Error("Invalid maximum video bitrate given. " +
                      `Its value, "${btr}" is inferior the current minimum ` +
                      `video birate, "${minVideoBitrate}".`);
    }
    this._priv_bitrateInfos.maxAutoBitrates.video.setValue(btr);
  }

  /**
   * Update the maximum audio bitrate the user can switch to.
   * @param {Number} btr
   */
  setMaxAudioBitrate(btr : number) : void {
    const minAudioBitrate = this._priv_bitrateInfos.minAutoBitrates.audio.getValue();
    if (btr < minAudioBitrate) {
      throw new Error("Invalid maximum audio bitrate given. " +
                      `Its value, "${btr}" is inferior the current minimum ` +
                      `audio birate, "${minAudioBitrate}".`);
    }
    this._priv_bitrateInfos.maxAutoBitrates.audio.setValue(btr);
  }

  /**
   * Set the max buffer size for the buffer behind the current position.
   * Every buffer data before will be removed.
   * @param {Number} depthInSeconds
   */
  setMaxBufferBehind(depthInSeconds : number) : void {
    this._priv_bufferOptions.maxBufferBehind.setValue(depthInSeconds);
  }

  /**
   * Set the max buffer size for the buffer behind the current position.
   * Every buffer data before will be removed.
   * @param {Number} depthInSeconds
   */
  setMaxBufferAhead(depthInSeconds : number) : void {
    this._priv_bufferOptions.maxBufferAhead.setValue(depthInSeconds);
  }

  /**
   * Set the max buffer size for the buffer ahead of the current position.
   * The player will stop downloading chunks when this size is reached.
   * @param {Number} sizeInSeconds
   */
  setWantedBufferAhead(sizeInSeconds : number) : void {
    this._priv_bufferOptions.wantedBufferAhead.setValue(sizeInSeconds);
  }

  /**
   * Set the max buffer size the buffer should take in memory
   * The player . will stop downloading chunks when this size is reached.
   * @param {Number} sizeInKBytes
   */
  setMaxVideoBufferSize(sizeInKBytes : number) : void {
    this._priv_bufferOptions.maxVideoBufferSize.setValue(sizeInKBytes);
  }

  /**
   * Returns the max buffer size for the buffer behind the current position.
   * @returns {Number}
   */
  getMaxBufferBehind() : number {
    return this._priv_bufferOptions.maxBufferBehind.getValue();
  }

  /**
   * Returns the max buffer size for the buffer behind the current position.
   * @returns {Number}
   */
  getMaxBufferAhead() : number {
    return this._priv_bufferOptions.maxBufferAhead.getValue();
  }

  /**
   * Returns the max buffer size for the buffer ahead of the current position.
   * @returns {Number}
   */
  getWantedBufferAhead() : number {
    return this._priv_bufferOptions.wantedBufferAhead.getValue();
  }

  /**
   * Returns the max buffer memory size for the buffer in kilobytes
   * @returns {Number}
   */
  getMaxVideoBufferSize() : number {
    return this._priv_bufferOptions.maxVideoBufferSize.getValue();
  }

  /**
   * Returns type of current keysystem (e.g. playready, widevine) if the content
   * is encrypted. null otherwise.
   * @deprecated
   * @returns {string|null}
   */
  getCurrentKeySystem() : string|null {
    warnOnce("`getCurrentKeySystem` is deprecated." +
             "Please use the `getKeySystemConfiguration` method instead.");
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    return getCurrentKeySystem(this.videoElement);
  }

  getCurrentPeriod() : IPeriod | null {
    const currentPeriod = this._priv_contentInfos?.currentPeriod;
    if (isNullOrUndefined(currentPeriod)) {
      return null;
    }
    return { id: currentPeriod.id, start: currentPeriod.start, end: currentPeriod.end };
  }

  /**
   * Returns both the name of the key system (e.g. `"com.widevine.alpha"`) and
   * the `MediaKeySystemConfiguration` currently associated to the
   * HTMLMediaElement linked to the RxPlayer.
   *
   * Returns `null` if no such capabilities is associated or if unknown.
   * @returns {Object|null}
   */
  getKeySystemConfiguration() : IKeySystemConfigurationOutput | null {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    const values = getKeySystemConfiguration(this.videoElement);
    if (values === null) {
      return null;
    }
    return { keySystem: values[0], configuration: values[1] };
  }

  /**
   * Returns the list of available Periods for which the current audio, video or
   * text track can now be changed.
   * @returns {Array.<Object>}
   */
  getAvailablePeriods() : IPeriod[] {
    if (this._priv_contentInfos === null) {
      return [];
    }
    const { isDirectFile, tracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      return [];
    }
    if (tracksStore === null) {
      return [];
    }
    return tracksStore.getAvailablePeriods().slice();
  }

  /**
   * Returns every available audio tracks for a given Period - or the current
   * one if no `periodId` is given.
   * @param {string|undefined} [periodId]
   * @returns {Array.<Object>}
   */
  getAvailableAudioTracks(periodId? : string | undefined) : IAvailableAudioTrack[] {
    if (this._priv_contentInfos === null) {
      return [];
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      return mediaElementTracksStore?.getAvailableAudioTracks() ?? [];
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      [],
      (tcm, periodRef) => tcm.getAvailableAudioTracks(periodRef) ?? []);
  }

  /**
   * Returns every available text tracks for a given Period - or the current
   * one if no `periodId` is given.
   * @param {string|undefined} [periodId]
   * @returns {Array.<Object>}
   */
  getAvailableTextTracks(periodId? : string | undefined) : IAvailableTextTrack[] {
    if (this._priv_contentInfos === null) {
      return [];
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      return mediaElementTracksStore?.getAvailableTextTracks() ?? [];
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      [],
      (tcm, periodRef) => tcm.getAvailableTextTracks(periodRef) ?? []);
  }

  /**
   * Returns every available video tracks for the current Period.
   * @param {string|undefined} [periodId]
   * @returns {Array.<Object>}
   */
  getAvailableVideoTracks(periodId? : string | undefined) : IAvailableVideoTrack[] {
    if (this._priv_contentInfos === null) {
      return [];
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      return mediaElementTracksStore?.getAvailableVideoTracks() ?? [];
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      [],
      (tcm, periodRef) => tcm.getAvailableVideoTracks(periodRef) ?? []);
  }

  /**
   * Returns currently chosen audio language for the current Period.
   * @param {string|undefined} [periodId]
   * @returns {Object|null|undefined}
   */
  getAudioTrack(periodId? : string | undefined) : IAudioTrack|null|undefined {
    if (this._priv_contentInfos === null) {
      return undefined;
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      if (mediaElementTracksStore === null) {
        return undefined;
      }
      return mediaElementTracksStore.getChosenAudioTrack();
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) => tcm.getChosenAudioTrack(periodRef));
  }

  /**
   * Returns currently chosen subtitle for the current Period.
   * @param {string|undefined} [periodId]
   * @returns {Object|null|undefined}
   */
  getTextTrack(periodId? : string | undefined) : ITextTrack|null|undefined {
    if (this._priv_contentInfos === null) {
      return undefined;
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      if (mediaElementTracksStore === null) {
        return undefined;
      }
      return mediaElementTracksStore.getChosenTextTrack();
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) => tcm.getChosenTextTrack(periodRef));
  }

  /**
   * Returns currently chosen video track for the current Period.
   * @param {string|undefined} [periodId]
   * @returns {Object|null|undefined}
   */
  getVideoTrack(periodId? : string | undefined) : IVideoTrack|null|undefined {
    if (this._priv_contentInfos === null) {
      return undefined;
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      if (mediaElementTracksStore === null) {
        return undefined;
      }
      return mediaElementTracksStore.getChosenVideoTrack();
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) => tcm.getChosenVideoTrack(periodRef));
  }

  /**
   * Update the audio language for the current Period.
   * @param {string | object} arg
   * @throws Error - the current content has no TracksStore.
   * @throws Error - the given id is linked to no audio track.
   */
  setAudioTrack(arg : string | IAudioTrackSetting) : void {
    if (this._priv_contentInfos === null) {
      throw new Error("No content loaded");
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      try {
        const audioId = typeof arg === "string" ? arg :
                                                  arg.trackId;
        mediaElementTracksStore?.setAudioTrackById(audioId);
        return;
      } catch (e) {
        throw new Error("player: unknown audio track");
      }
    }

    let periodId : string | undefined;
    let trackId : string;
    let switchingMode : IAudioTrackSwitchingMode | undefined;
    let reprsToLock : string[] | null = null;
    if (typeof arg === "string") {
      trackId = arg;
    } else {
      trackId = arg.trackId;
      periodId = arg.periodId;
      switchingMode = arg.switchingMode;
      reprsToLock = arg.lockedRepresentations ?? null;
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) =>
        tcm.setAudioTrack(periodRef, trackId, switchingMode, reprsToLock));
  }

  /**
   * Update the text language for the current Period.
   * @param {string | Object} arg
   * @throws Error - the current content has no TracksStore.
   * @throws Error - the given id is linked to no text track.
   */
  setTextTrack(arg : string | ITextTrackSetting) : void {
    if (this._priv_contentInfos === null) {
      throw new Error("No content loaded");
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      try {
        const textId = typeof arg === "string" ? arg :
                                                 arg.trackId;
        mediaElementTracksStore?.setTextTrackById(textId);
        return;
      } catch (e) {
        throw new Error("player: unknown text track");
      }
    }

    let periodId : string | undefined;
    let trackId : string;
    if (typeof arg === "string") {
      trackId = arg;
    } else {
      trackId = arg.trackId;
      periodId = arg.periodId;
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) => tcm.setTextTrack(periodRef, trackId));
  }

  /**
   * Disable subtitles for the current content.
   * @param {string|undefined} [periodId]
   */
  disableTextTrack(periodId? : string | undefined) : void {
    if (this._priv_contentInfos === null) {
      return;
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      mediaElementTracksStore?.disableTextTrack();
      return;
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) => tcm.disableTrack(periodRef, "text"));
  }

  /**
   * Update the video track for the current Period.
   * @param {string | Object} arg
   * @throws Error - the current content has no TracksStore.
   * @throws Error - the given id is linked to no video track.
   */
  setVideoTrack(arg : string | IVideoTrackSetting) : void {
    if (this._priv_contentInfos === null) {
      throw new Error("No content loaded");
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile) {
      try {
        const videoId = typeof arg === "string" ? arg :
                                                  arg.trackId;
        mediaElementTracksStore?.setVideoTrackById(videoId);
        return;
      } catch (e) {
        throw new Error("player: unknown video track");
      }
    }

    let periodId : string | undefined;
    let trackId : string;
    let switchingMode : IVideoTrackSwitchingMode | undefined;
    let reprsToLock : string[] | null = null;
    if (typeof arg === "string") {
      trackId = arg;
    } else {
      trackId = arg.trackId;
      periodId = arg.periodId;
      switchingMode = arg.switchingMode;
      reprsToLock = arg.lockedRepresentations ?? null;
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) =>
        tcm.setVideoTrack(periodRef, trackId, switchingMode, reprsToLock));
  }

  /**
   * Disable video track for the current content.
   * @param {string|undefined} [periodId]
   */
  disableVideoTrack(periodId? : string | undefined) : void {
    if (this._priv_contentInfos === null) {
      return;
    }
    const { isDirectFile, mediaElementTracksStore } = this._priv_contentInfos;
    if (isDirectFile && mediaElementTracksStore !== null) {
      return mediaElementTracksStore.disableVideoTrack();
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) => tcm.disableTrack(periodRef, "video"));
  }

  lockVideoRepresentations(
    arg : string[] | ILockedVideoRepresentationsProperties
  ) : void {
    if (this._priv_contentInfos === null) {
      throw new Error("No content loaded");
    }
    const { isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      throw new Error("Cannot lock video Representations in directfile mode.");
    }

    let repsId : string[];
    let periodId : string | undefined;
    let switchingMode : IVideoRepresentationsSwitchingMode | undefined;
    if (Array.isArray(arg)) {
      repsId = arg;
      periodId = undefined;
    } else {
      repsId = arg.representations;
      periodId = arg.periodId;
      switchingMode = arg.switchingMode;
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) =>
        tcm.lockVideoRepresentations(periodRef, { representations: repsId,
                                                  switchingMode }));
  }

  lockAudioRepresentations(
    arg : string[] | ILockedAudioRepresentationsProperties
  ) : void {
    if (this._priv_contentInfos === null) {
      throw new Error("No content loaded");
    }
    const { isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      throw new Error("Cannot lock audio Representations in directfile mode.");
    }


    let repsId : string[];
    let periodId : string | undefined;
    let switchingMode : IAudioRepresentationsSwitchingMode | undefined;
    if (Array.isArray(arg)) {
      repsId = arg;
      periodId = undefined;
    } else {
      repsId = arg.representations;
      periodId = arg.periodId;
      switchingMode = arg.switchingMode;
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) =>
        tcm.lockAudioRepresentations(periodRef, { representations: repsId,
                                                  switchingMode }));
  }

  getLockedVideoRepresentations(periodId? : string | undefined) : string[] | null {
    if (this._priv_contentInfos === null) {
      return null;
    }
    const { isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      return null;
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      null,
      (tcm, periodRef) => tcm.getLockedVideoRepresentations(periodRef));
  }

  getLockedAudioRepresentations(periodId? : string | undefined) : string[] | null {
    if (this._priv_contentInfos === null) {
      return null;
    }
    const { isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      return null;
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      null,
      (tcm, periodRef) => tcm.getLockedAudioRepresentations(periodRef));
  }

  unlockVideoRepresentations(periodId? : string | undefined) : void {
    if (this._priv_contentInfos === null) {
      return;
    }
    const { isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      return;
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) => tcm.unlockVideoRepresentations(periodRef));
  }

  unlockAudioRepresentations(periodId? : string | undefined) : void {
    if (this._priv_contentInfos === null) {
      return;
    }
    const { isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      return;
    }
    return this._priv_callTracksStoreGetterSetter(
      periodId,
      undefined,
      (tcm, periodRef) => tcm.unlockAudioRepresentations(periodRef));
  }

  /**
   * Get minimum seek-able position.
   * @returns {number}
   */
  getMinimumPosition() : number|null {
    if (this._priv_contentInfos === null) {
      return null;
    }

    if (this._priv_contentInfos.isDirectFile) {
      return 0;
    }

    const { manifest } = this._priv_contentInfos;
    if (manifest !== null) {
      return manifest.getMinimumSafePosition();
    }
    return null;
  }

  /**
   * Get maximum seek-able position.
   * @returns {number}
   */
  getMaximumPosition() : number|null {
    if (this._priv_contentInfos === null) {
      return null;
    }

    const { isDirectFile, manifest } = this._priv_contentInfos;

    if (isDirectFile) {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      return this.videoElement.duration;
    }

    if (manifest !== null) {
      if (!manifest.isDynamic && this.videoElement !== null) {
        return this.videoElement.duration;
      }
      return manifest.getMaximumSafePosition();
    }
    return null;
  }

  // ---- Undocumented Private methods. ----
  //
  // Those methods are just here either to allow some tools relying on the
  // RxPlayer instance to work or to improve the RxPlayer's demo.
  //
  // They should not be used by any external code.

  /**
   * /!\ For demo use only! Do not touch!
   *
   * Returns every chunk buffered for a given buffer type.
   * Returns `null` if no SegmentBuffer was created for this type of buffer.
   * @param {string} bufferType
   * @returns {Array.<Object>|null}
   */
  __priv_getSegmentBufferContent(bufferType : IBufferType) : IBufferedChunk[] | null {
    if (this._priv_contentInfos === null ||
        this._priv_contentInfos.segmentBuffersStore === null)
    {
      return null;
    }
    const segmentBufferStatus = this._priv_contentInfos
      .segmentBuffersStore.getStatus(bufferType);
    return segmentBufferStatus.type === "initialized" ?
      segmentBufferStatus.value.getInventory() :
      null;
  }

  /**
   * /!\ For tools use only! Do not touch!
   *
   * Returns manifest/playlist object.
   * null if the player is STOPPED.
   * @returns {Manifest|null} - The current Manifest (`null` when not known).
   */
  __priv_getManifest() : Manifest|null {
    if (this._priv_contentInfos === null) {
      return null;
    }
    return this._priv_contentInfos.manifest;
  }

  // ---- Private methods ----

  /**
   * Reset all state properties relative to a playing content.
   */
  private _priv_cleanUpCurrentContentState() : void {
    log.debug("Locking `contentLock` to clean-up the current content.");

    // lock playback of new contents while cleaning up is pending
    this._priv_contentLock.setValue(true);

    this._priv_contentInfos?.tracksStore?.dispose();
    this._priv_contentInfos?.mediaElementTracksStore?.dispose();
    this._priv_contentInfos = null;

    this._priv_contentEventsMemory = {};

    // DRM-related clean-up
    const freeUpContentLock = () => {
      if (this.videoElement !== null) { // If not disposed
        log.debug("Unlocking `contentLock`. Next content can begin.");
        this._priv_contentLock.setValue(false);
      }
    };

    if (!isNullOrUndefined(this.videoElement)) {
      clearOnStop(this.videoElement).then(
        () => {
          log.debug("API: DRM session cleaned-up with success!");
          freeUpContentLock();
        },
        (err : unknown) => {
          log.error("API: An error arised when trying to clean-up the DRM session:" +
                    (err instanceof Error ? err.toString() :
                                            "Unknown Error"));
          freeUpContentLock();
        });
    } else {
      freeUpContentLock();
    }
  }

  /**
   * Triggered when the Manifest has been loaded for the current content.
   * Initialize various private properties and emit initial event.
   * @param {Object} contentInfos
   * @param {Object} manifest
   */
  private _priv_onManifestReady(
    contentInfos : IPublicApiContentInfos,
    manifest : Manifest
  ) : void {
    if (contentInfos.contentId !== this._priv_contentInfos?.contentId) {
      return; // Event for another content
    }
    contentInfos.manifest = manifest;
    const cancelSignal = contentInfos.currentContentCanceller.signal;
    this._priv_reloadingMetadata.manifest = manifest;

    contentInfos.tracksStore = new TracksStore({
      preferTrickModeTracks: this._priv_preferTrickModeTracks,
    });
    contentInfos.tracksStore.addEventListener("newAvailablePeriods", (p) => {
      this.trigger("newAvailablePeriods", p);
    });
    contentInfos.tracksStore.addEventListener("brokenRepresentationsLock", (e) => {
      this.trigger("brokenRepresentationsLock", e);
    });
    contentInfos.tracksStore.addEventListener("lostVideoTrack", (e) => {
      this.trigger("lostVideoTrack", e);
    });
    contentInfos.tracksStore.addEventListener("lostAudioTrack", (e) => {
      this.trigger("lostAudioTrack", e);
    });
    contentInfos.tracksStore.addEventListener("lostTextTrack", (e) => {
      this.trigger("lostTextTrack", e);
    });

    contentInfos.tracksStore.updatePeriodList(manifest);

    manifest.addEventListener("manifestUpdate", (updates) => {
      // Update the tracks chosen if it changed
      if (!isNullOrUndefined(contentInfos?.tracksStore)) {
        contentInfos.tracksStore.updatePeriodList(manifest);
      }
      const currentPeriod = this._priv_contentInfos?.currentPeriod ?? undefined;
      const tracksStore = this._priv_contentInfos?.tracksStore;
      if (currentPeriod === undefined || isNullOrUndefined(tracksStore)) {
        return;
      }
      for (const update of updates.updatedPeriods) {
        if (update.period.id === currentPeriod.id) {
          if (update.result.addedAdaptations.length > 0 ||
              update.result.removedAdaptations.length > 0)
          {
            // We might have new (or less) tracks, send events just to be sure
            const periodRef = tracksStore.getPeriodObjectFromPeriod(currentPeriod);
            if (periodRef === undefined) {
              return;
            }
            const audioTracks = tracksStore.getAvailableAudioTracks(periodRef);
            this._priv_triggerEventIfNotStopped("availableAudioTracksChange",
                                                audioTracks ?? [],
                                                cancelSignal);
            const textTracks = tracksStore.getAvailableTextTracks(periodRef);
            this._priv_triggerEventIfNotStopped("availableTextTracksChange",
                                                textTracks ?? [],
                                                cancelSignal);
            const videoTracks = tracksStore.getAvailableVideoTracks(periodRef);
            this._priv_triggerEventIfNotStopped("availableVideoTracksChange",
                                                videoTracks ?? [],
                                                cancelSignal);
          }
        }
        return;
      }
    }, contentInfos.currentContentCanceller.signal);
  }

  /**
   * Triggered each times the current Period Changed.
   * Store and emit initial state for the Period.
   *
   * @param {Object} contentInfos
   * @param {Object} periodInfo
   */
  private _priv_onActivePeriodChanged(
    contentInfos : IPublicApiContentInfos,
    { period } : { period : Period }
  ) : void {
    if (contentInfos.contentId !== this._priv_contentInfos?.contentId) {
      return; // Event for another content
    }
    contentInfos.currentPeriod = period;

    const cancelSignal = contentInfos.currentContentCanceller.signal;
    if (this._priv_contentEventsMemory.periodChange !== period) {
      this._priv_contentEventsMemory.periodChange = period;
      this._priv_triggerEventIfNotStopped("periodChange",
                                          { start: period.start,
                                            end: period.end,
                                            id: period.id },
                                          cancelSignal);
    }

    this._priv_triggerEventIfNotStopped("availableAudioTracksChange",
                                        this.getAvailableAudioTracks(),
                                        cancelSignal);
    this._priv_triggerEventIfNotStopped("availableTextTracksChange",
                                        this.getAvailableTextTracks(),
                                        cancelSignal);
    this._priv_triggerEventIfNotStopped("availableVideoTracksChange",
                                        this.getAvailableVideoTracks(),
                                        cancelSignal);

    const tracksStore = this._priv_contentInfos?.tracksStore;

    // Emit initial events for the Period
    if (!isNullOrUndefined(tracksStore)) {
      const periodRef = tracksStore.getPeriodObjectFromPeriod(period);
      if (periodRef) {
        const audioTrack = tracksStore.getChosenAudioTrack(periodRef);
        this._priv_triggerEventIfNotStopped("audioTrackChange",
                                            audioTrack,
                                            cancelSignal);
        const textTrack = tracksStore.getChosenTextTrack(periodRef);
        this._priv_triggerEventIfNotStopped("textTrackChange",
                                            textTrack,
                                            cancelSignal);
        const videoTrack = tracksStore.getChosenVideoTrack(periodRef);
        this._priv_triggerEventIfNotStopped("videoTrackChange",
                                            videoTrack,
                                            cancelSignal);
      }
    } else {
      this._priv_triggerEventIfNotStopped("audioTrackChange", null, cancelSignal);
      this._priv_triggerEventIfNotStopped("textTrackChange", null, cancelSignal);
      this._priv_triggerEventIfNotStopped("videoTrackChange", null, cancelSignal);
    }

    const audioRepresentation = this._priv_getCurrentRepresentations()?.audio ?? null;
    this._priv_triggerEventIfNotStopped("audioRepresentationChange",
                                        audioRepresentation,
                                        cancelSignal);
    if (contentInfos.currentContentCanceller.isUsed) {
      return;
    }

    const videoRepresentation = this._priv_getCurrentRepresentations()?.video ?? null;
    this._priv_triggerEventIfNotStopped("videoRepresentationChange",
                                        videoRepresentation,
                                        cancelSignal);
  }

  /**
   * Triggered each times a new "PeriodStream" is ready.
   * Choose the right Adaptation for the Period and emit it.
   * @param {Object} contentInfos
   * @param {Object} value
   */
  private _priv_onPeriodStreamReady(
    contentInfos : IPublicApiContentInfos,
    value : {
      type : IBufferType;
      manifest : Manifest;
      period : Period;
      adaptationRef : ISharedReference<IAdaptationChoice|null|undefined>;
    }
  ) : void {
    if (contentInfos.contentId !== this._priv_contentInfos?.contentId) {
      return; // Event for another content
    }
    const { type, manifest, period, adaptationRef } = value;
    const tracksStore = contentInfos.tracksStore;

    switch (type) {

      case "video":
      case "audio":
      case "text":
        if (isNullOrUndefined(tracksStore)) {
          log.error(`API: TracksStore not instanciated for a new ${type} period`);
          adaptationRef.setValue(null);
        } else {
          tracksStore.addTrackReference(type, manifest, period, adaptationRef);
        }
        break;
      default:
        assertUnreachable(type);
    }
  }

  /**
   * Triggered each times we "remove" a PeriodStream.
   * @param {Object} contentInfos
   * @param {Object} value
   */
  private _priv_onPeriodStreamCleared(
    contentInfos : IPublicApiContentInfos,
    value : { type : IBufferType; period : Period }
  ) : void {
    if (contentInfos.contentId !== this._priv_contentInfos?.contentId) {
      return; // Event for another content
    }
    const { type, period } = value;
    const tracksStore = contentInfos.tracksStore;

    // Clean-up track choices from TracksStore
    switch (type) {
      case "audio":
      case "text":
      case "video":
        if (!isNullOrUndefined(tracksStore)) {
          tracksStore.removeTrackReference(type, period);
        }
        break;
    }

    // Clean-up stored Representation and Adaptation information
    const { activeAdaptations, activeRepresentations } = contentInfos;
    if (!isNullOrUndefined(activeAdaptations) &&
        !isNullOrUndefined(activeAdaptations[period.id]))
    {
      const activePeriodAdaptations = activeAdaptations[period.id];
      delete activePeriodAdaptations[type];
      if (Object.keys(activePeriodAdaptations).length === 0) {
        delete activeAdaptations[period.id];
      }
    }

    if (!isNullOrUndefined(activeRepresentations) &&
        !isNullOrUndefined(activeRepresentations[period.id]))
    {
      const activePeriodRepresentations = activeRepresentations[period.id];
      delete activePeriodRepresentations[type];
      if (Object.keys(activePeriodRepresentations).length === 0) {
        delete activeRepresentations[period.id];
      }
    }
  }

  /**
   * Triggered each times a new Adaptation is considered for the current
   * content.
   * Store given Adaptation and emit it if from the current Period.
   * @param {Object} contentInfos
   * @param {Object} value
   */
  private _priv_onAdaptationChange(
    contentInfos : IPublicApiContentInfos,
    { type, adaptation, period } : { type : IBufferType;
                                     adaptation : Adaptation|null;
                                     period : Period; }
  ) : void {
    if (contentInfos.contentId !== this._priv_contentInfos?.contentId) {
      return; // Event for another content
    }

    // lazily create contentInfos.activeAdaptations
    if (contentInfos.activeAdaptations === null) {
      contentInfos.activeAdaptations = {};
    }

    const { activeAdaptations, currentPeriod } = contentInfos;
    const activePeriodAdaptations = activeAdaptations[period.id];
    if (isNullOrUndefined(activePeriodAdaptations)) {
      activeAdaptations[period.id] = { [type]: adaptation };
    } else {
      activePeriodAdaptations[type] = adaptation;
    }

    const { tracksStore } = contentInfos;
    const cancelSignal = contentInfos.currentContentCanceller.signal;
    if (tracksStore !== null &&
        currentPeriod !== null && !isNullOrUndefined(period) &&
        period.id === currentPeriod.id)
    {
      const periodRef = tracksStore.getPeriodObjectFromPeriod(period);
      if (periodRef === undefined) {
        return;
      }
      switch (type) {
        case "audio":
          const audioTrack = tracksStore.getChosenAudioTrack(periodRef);
          this._priv_triggerEventIfNotStopped("audioTrackChange",
                                              audioTrack,
                                              cancelSignal);
          break;
        case "text":
          const textTrack = tracksStore.getChosenTextTrack(periodRef);
          this._priv_triggerEventIfNotStopped("textTrackChange",
                                              textTrack,
                                              cancelSignal);
          break;
        case "video":
          const videoTrack = tracksStore.getChosenVideoTrack(periodRef);
          this._priv_triggerEventIfNotStopped("videoTrackChange",
                                              videoTrack,
                                              cancelSignal);
          break;
      }
    }
  }

  /**
   * Triggered each times a new Representation is considered during playback.
   *
   * Store given Representation and emit it if from the current Period.
   *
   * @param {Object} contentInfos
   * @param {Object} obj
   */
  private _priv_onRepresentationChange(
    contentInfos : IPublicApiContentInfos,
    { type, period, representation }: { type : IBufferType;
                                        period : Period;
                                        representation : Representation|null; }
  ) : void {
    if (contentInfos.contentId !== this._priv_contentInfos?.contentId) {
      return; // Event for another content
    }

    // lazily create contentInfos.activeRepresentations
    if (contentInfos.activeRepresentations === null) {
      contentInfos.activeRepresentations = {};
    }

    const { activeRepresentations, currentPeriod } = contentInfos;

    const activePeriodRepresentations = activeRepresentations[period.id];
    if (isNullOrUndefined(activePeriodRepresentations)) {
      activeRepresentations[period.id] = { [type]: representation };
    } else {
      activePeriodRepresentations[type] = representation;
    }

    if (!isNullOrUndefined(period) &&
        currentPeriod !== null &&
        currentPeriod.id === period.id)
    {
      const cancelSignal = this._priv_contentInfos.currentContentCanceller.signal;
      if (type === "video") {
        this._priv_triggerEventIfNotStopped("videoRepresentationChange",
                                            representation,
                                            cancelSignal);
      } else if (type === "audio") {
        this._priv_triggerEventIfNotStopped("audioRepresentationChange",
                                            representation,
                                            cancelSignal);
      }
    }
  }

  /**
   * Triggered each time a bitrate estimate is calculated.
   *
   * Emit it.
   *
   * @param {Object} value
   */
  private _priv_onBitrateEstimationChange({
    type,
    bitrate,
  } : { type : IBufferType;
        bitrate : number|undefined; }
  ) : void {
    if (bitrate !== undefined) {
      this._priv_bitrateInfos.lastBitrates[type] = bitrate;
    }
    this.trigger("bitrateEstimationChange", { type, bitrate });
  }

  /**
   * Triggered each time the player state updates.
   *
   * Trigger the right Player Event.
   *
   * @param {string} newState
   */
  private _priv_setPlayerState(newState : IPlayerState) : void {
    if (this.state !== newState) {
      this.state = newState;
      log.info("API: playerStateChange event", newState);
      this.trigger("playerStateChange", newState);
    }
  }

  /**
   * Triggered each time a playback observation.
   *
   * Trigger the right Player Event
   *
   * @param {Object} contentInfos
   * @param {Object} observation
   */
  private _priv_triggerPositionUpdate(
    contentInfos : IPublicApiContentInfos,
    observation : IPlaybackObservation
  ) : void {
    if (contentInfos.contentId !== this._priv_contentInfos?.contentId) {
      return; // Event for another content
    }

    const { isDirectFile, manifest } = contentInfos;
    if ((!isDirectFile && manifest === null) || isNullOrUndefined(observation)) {
      return;
    }

    const maximumPosition = manifest !== null ? manifest.getMaximumSafePosition() :
                                                undefined;
    const positionData : IPositionUpdate = {
      position: observation.position,
      duration: observation.duration,
      playbackRate: observation.playbackRate,
      maximumPosition,

      // TODO bufferGap may be undefined
      bufferGap: observation.bufferGap === undefined ||
                 !isFinite(observation.bufferGap) ?
        0 :
        observation.bufferGap,
    };

    if (manifest !== null &&
        manifest.isLive &&
        observation.position > 0
    ) {
      const ast = manifest.availabilityStartTime ?? 0;
      positionData.wallClockTime = observation.position + ast;
      const livePosition = manifest.getLivePosition();
      if (livePosition !== undefined) {
        positionData.liveGap = livePosition - observation.position;
      }
    } else if (isDirectFile && this.videoElement !== null) {
      const startDate = getStartDate(this.videoElement);
      if (startDate !== undefined) {
        positionData.wallClockTime = startDate + observation.position;
      }
    }
    this.trigger("positionUpdate", positionData);
  }

  private _priv_getCurrentRepresentations(
  ) : Partial<Record<IBufferType, Representation|null>> | null {
    if (this._priv_contentInfos === null) {
      return null;
    }
    const { currentPeriod, activeRepresentations } = this._priv_contentInfos;
    if (currentPeriod === null ||
        activeRepresentations === null ||
        isNullOrUndefined(activeRepresentations[currentPeriod.id]))
    {
      return null;
    }
    return activeRepresentations[currentPeriod.id];
  }

  /**
   * @param {string} evt
   * @param {*} arg
   * @param {Object} currentContentCancelSignal
   */
  private _priv_triggerEventIfNotStopped<TEventName extends keyof IPublicAPIEvent>(
    evt : TEventName,
    arg : IEventPayload<IPublicAPIEvent, TEventName>,
    currentContentCancelSignal  : CancellationSignal
  ) {
    if (!currentContentCancelSignal.isCancelled) {
      this.trigger(evt, arg);
    }
  }

  /**
   * @param {Object} cancelSignal
   * @returns {Object}
   */
  private _priv_initializeMediaElementTracksStore(
    cancelSignal : CancellationSignal
  ) : MediaElementTracksStore {
    assert(features.directfile !== null,
           "Initializing `MediaElementTracksStore` without Directfile feature");
    assert(this.videoElement !== null,
           "Initializing `MediaElementTracksStore` on a disposed RxPlayer");

    const mediaElementTracksStore =
      new features.directfile.mediaElementTracksStore(this.videoElement);

    this._priv_triggerEventIfNotStopped(
      "availableAudioTracksChange",
      mediaElementTracksStore.getAvailableAudioTracks(),
      cancelSignal);
    this._priv_triggerEventIfNotStopped(
      "availableVideoTracksChange",
      mediaElementTracksStore.getAvailableVideoTracks(),
      cancelSignal);
    this._priv_triggerEventIfNotStopped(
      "availableTextTracksChange",
      mediaElementTracksStore.getAvailableTextTracks(),
      cancelSignal);

    this._priv_triggerEventIfNotStopped(
      "audioTrackChange",
      mediaElementTracksStore.getChosenAudioTrack() ?? null,
      cancelSignal);
    this._priv_triggerEventIfNotStopped(
      "textTrackChange",
      mediaElementTracksStore.getChosenTextTrack() ?? null,
      cancelSignal);
    this._priv_triggerEventIfNotStopped(
      "videoTrackChange",
      mediaElementTracksStore.getChosenVideoTrack() ?? null,
      cancelSignal);

    mediaElementTracksStore
      .addEventListener("availableVideoTracksChange", (val) =>
        this.trigger("availableVideoTracksChange", val));
    mediaElementTracksStore
      .addEventListener("availableAudioTracksChange", (val) =>
        this.trigger("availableAudioTracksChange", val));
    mediaElementTracksStore
      .addEventListener("availableTextTracksChange", (val) =>
        this.trigger("availableTextTracksChange", val));

    mediaElementTracksStore
      .addEventListener("audioTrackChange", (val) =>
        this.trigger("audioTrackChange", val));
    mediaElementTracksStore
      .addEventListener("videoTrackChange", (val) =>
        this.trigger("videoTrackChange", val));
    mediaElementTracksStore
      .addEventListener("textTrackChange", (val) =>
        this.trigger("textTrackChange", val));

    return mediaElementTracksStore;
  }

  private _priv_callTracksStoreGetterSetter<T, U>(
    periodId : string | undefined,
    defaultValue : U,
    cb : (tcm : TracksStore, periodRef : ITMPeriodObject) => T
  ) : T | U {
    if (this._priv_contentInfos === null ||
        this._priv_contentInfos.tracksStore === null)
    {
      log.warn("API: Trying to call TracksStore method while not created");
      return defaultValue;
    }
    const { tracksStore } = this._priv_contentInfos;
    const currentPeriod = this._priv_contentInfos?.currentPeriod ?? undefined;
    const wantedPeriodId = periodId ?? currentPeriod?.id;
    if (wantedPeriodId === undefined) {
      return defaultValue;
    }
    const periodRef = wantedPeriodId === currentPeriod?.id ?
      tracksStore.getPeriodObjectFromPeriod(currentPeriod) :
      tracksStore.getPeriodObjectFromId(wantedPeriodId);

    if (periodRef === undefined) {
      return defaultValue;
    }
    return cb(tracksStore, periodRef);
  }
}
Player.version = /* PLAYER_VERSION */"3.29.0";

/** Every events sent by the RxPlayer's public API. */
interface IPublicAPIEvent {
  playerStateChange : string;
  positionUpdate : IPositionUpdate;
  audioTrackChange : IAudioTrack | null;
  textTrackChange : ITextTrack | null;
  videoTrackChange : IVideoTrack | null;
  audioRepresentationChange : IVideoRepresentation | null;
  videoRepresentationChange : IAudioRepresentation | null;
  bitrateEstimationChange : IBitrateEstimate;
  volumeChange : number;
  error : IPlayerError | Error;
  warning : IPlayerError | Error;
  periodChange : IPeriodChangeEvent;
  availableAudioTracksChange : IAvailableAudioTrack[];
  availableTextTracksChange : IAvailableTextTrack[];
  availableVideoTracksChange : IAvailableVideoTrack[];
  decipherabilityUpdate : IDecipherabilityUpdateContent[];
  newAvailablePeriods : IPeriod[];
  brokenRepresentationsLock : IBrokenRepresentationsLockContext;
  lostVideoTrack : ILostVideoTrackEventPayload;
  lostAudioTrack : ILostAudioTrackEventPayload;
  lostTextTrack : ILostTextTrackEventPayload;
  seeking : null;
  seeked : null;
  streamEvent : IStreamEvent;
  streamEventSkip : IStreamEvent;
  inbandEvents : IInbandEvent[];
}

/** State linked to a particular contents loaded by the public API. */
interface IPublicApiContentInfos {
  /**
   * Unique identifier for this `IPublicApiContentInfos` object.
   * Allows to identify and thus compare this `contentInfos` object with another
   * one.
   */
  contentId : string;
  /** Original URL set to load the content. */
  originalUrl : string | undefined;
  /** `ContentInitializer` used to load the content. */
  initializer : ContentInitializer;
  /** TaskCanceller triggered when it's time to stop the current content. */
  currentContentCanceller : TaskCanceller;
  /**
   * `true` if the current content is in DirectFile mode.
   * `false` is the current content has a transport protocol (Smooth/DASH...).
   */
  isDirectFile : boolean;
  /**
   * Manifest linked to the current content.
   * `null` if the current content loaded has no manifest or if the content is
   * not yet loaded.
   */
  manifest : Manifest|null;
  /**
   * Current Period being played.
   * `null` if no Period is being played.
   */
  currentPeriod : Period|null;
  /**
   * Store currently considered adaptations, per active period.
   * `null` if no Adaptation is active
   */
  activeAdaptations : {
    [periodId : string] : Partial<Record<IBufferType, Adaptation|null>>;
  } | null;
  /**
   * Store currently considered representations, per active period.
   * `null` if no Representation is active
   */
  activeRepresentations : {
    [periodId : string] : Partial<Record<IBufferType, Representation|null>>;
  } | null;
  /** Keep information on the active SegmentBuffers. */
  segmentBuffersStore : SegmentBuffersStore | null;
  /**
   * TracksStore instance linked to the current content.
   * `null` if no content has been loaded or if the current content loaded
   * has no TracksStore.
   */
  tracksStore : TracksStore|null;
  /**
   * MediaElementTracksStore instance linked to the current content.
   * `null` if no content has been loaded or if the current content loaded
   * has no MediaElementTracksStore.
   */
  mediaElementTracksStore : MediaElementTracksStore|null;
}

export default Player;
