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
  combineLatest as observableCombineLatest,
  Connectable,
  concat as observableConcat,
  connectable,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  share,
  shareReplay,
  skipWhile,
  startWith,
  Subject,
  Subscription,
  switchMap,
  take,
  takeUntil,
} from "rxjs";
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
  IAdaptation,
  IAudioTrack,
  IAudioTrackPreference,
  IAvailableAudioTrack,
  IAvailableTextTrack,
  IAvailableVideoTrack,
  IBifThumbnail,
  IBitrateEstimate,
  IConstructorOptions,
  IDecipherabilityUpdateContent,
  ILoadVideoOptions,
  IPeriod,
  IPlayerError,
  IPlayerState,
  IPositionUpdate,
  IRepresentation,
  IStreamEvent,
  ITextTrack,
  ITextTrackPreference,
  IVideoTrack,
  IVideoTrackPreference,
} from "../../public_types";
import areArraysOfNumbersEqual from "../../utils/are_arrays_of_numbers_equal";
import EventEmitter, {
  IListener,
} from "../../utils/event_emitter";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import Logger from "../../utils/logger";
import objectAssign from "../../utils/object_assign";
import {
  getLeftSizeOfRange,
  getPlayedSizeOfRange,
  getSizeOfRange,
} from "../../utils/ranges";
import createSharedReference, {
  createMappedReference,
  IReadOnlySharedReference,
  ISharedReference,
} from "../../utils/reference";
import TaskCanceller from "../../utils/task_canceller";
import warnOnce from "../../utils/warn_once";
import { IABRThrottlers } from "../adaptive";
import {
  clearOnStop,
  disposeDecryptionResources,
  getCurrentKeySystem,
} from "../decrypt";
import {
  IManifestFetcherParsedResult,
  IManifestFetcherWarningEvent,
  ManifestFetcher,
  SegmentFetcherCreator,
} from "../fetchers";
import initializeMediaSourcePlayback, {
  IInitEvent,
  ILoadedEvent,
  IReloadingMediaSourceEvent,
  IStalledEvent,
} from "../init";
import SegmentBuffersStore, {
  IBufferedChunk,
  IBufferType,
} from "../segment_buffers";
import { IInbandEvent } from "../stream";
import emitSeekEvents from "./emit_seek_events";
import getPlayerState, {
  PLAYER_STATES,
} from "./get_player_state";
import MediaElementTrackChoiceManager from "./media_element_track_choice_manager";
import {
  checkReloadOptions,
  IParsedLoadVideoOptions,
  parseConstructorOptions,
  parseLoadVideoOptions,
} from "./option_utils";
import PlaybackObserver, {
  IPlaybackObservation,
} from "./playback_observer";
import TrackChoiceManager from "./track_choice_manager";

/* eslint-disable @typescript-eslint/naming-convention */


const { getPageActivityRef,
        getPictureOnPictureStateRef,
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
  private readonly _priv_destroy$ : Subject<void>;

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
                     text? : number;
                     image? : number; };

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
  private _priv_contentInfos : null | {
    /**
     * URL of the Manifest (or just of the content for DirectFile contents)
     * currently being played.
     */
    url : string | undefined;

    /** TaskCanceller triggered when it's time to stop the current content. */
    currentContentCanceller : TaskCanceller;

    /**
     * `true` if the current content is in DirectFile mode.
     * `false` is the current content has a transport protocol (Smooth/DASH...).
     */
    isDirectFile : boolean;

    /**
     * Current Image Track Data associated to the content.
     * `null` if the current content has no image playlist linked to it.
     * @deprecated
     */
    thumbnails : IBifThumbnail[]|null;

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
  };

  /** List of favorite audio tracks, in preference order.  */
  private _priv_preferredAudioTracks : IAudioTrackPreference[];

  /** List of favorite text tracks, in preference order.  */
  private _priv_preferredTextTracks : ITextTrackPreference[];

  /** List of favorite video tracks, in preference order. */
  private _priv_preferredVideoTracks : IVideoTrackPreference[];

  /** If `true` trickMode video tracks will be chosen if available. */
  private _priv_preferTrickModeTracks : boolean;

  /**
   * TrackChoiceManager instance linked to the current content.
   * `null` if no content has been loaded or if the current content loaded
   * has no TrackChoiceManager.
   */
  private _priv_trackChoiceManager : TrackChoiceManager|null;

  /**
   * MediaElementTrackChoiceManager instance linked to the current content.
   * `null` if no content has been loaded or if the current content loaded
   * has no MediaElementTrackChoiceManager.
   */
  private _priv_mediaElementTrackChoiceManager : MediaElementTrackChoiceManager|null;

  /** Refer to last picture in picture event received. */
  private _priv_pictureInPictureRef : IReadOnlySharedReference<
    events.IPictureInPictureEvent
  >;

  /** Store wanted configuration for the `limitVideoWidth` option. */
  private readonly _priv_limitVideoWidth : boolean;

  /** Store wanted configuration for the `throttleWhenHidden` option. */
  private readonly _priv_throttleWhenHidden : boolean;

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

  /** Information about last content being played. */
  private _priv_lastContentPlaybackInfos : { options?: IParsedLoadVideoOptions;
                                             manifest?: Manifest;
                                             lastPlaybackPosition?: number; };

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
            preferredAudioTracks,
            preferredTextTracks,
            preferredVideoTracks,
            throttleWhenHidden,
            throttleVideoBitrateWhenHidden,
            videoElement,
            wantedBufferAhead,
            maxVideoBufferSize } = parseConstructorOptions(options);
    const { DEFAULT_UNMUTED_VOLUME } = config.getCurrent();
    // Workaround to support Firefox autoplay on FF 42.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
    videoElement.preload = "auto";

    this.version = /* PLAYER_VERSION */"3.28.0";
    this.log = log;
    this.state = "STOPPED";
    this.videoElement = videoElement;

    const destroyCanceller = new TaskCanceller();
    this._priv_destroy$ = new Subject(); // TODO Remove the need for this Subject
    this._priv_destroy$.pipe(take(1)).subscribe(() => {
      destroyCanceller.cancel();
    });

    this._priv_pictureInPictureRef = getPictureOnPictureStateRef(videoElement,
                                                                 destroyCanceller.signal);

    this._priv_speed = createSharedReference(videoElement.playbackRate);
    this._priv_preferTrickModeTracks = false;
    this._priv_contentLock = createSharedReference<boolean>(false);

    this._priv_bufferOptions = {
      wantedBufferAhead: createSharedReference(wantedBufferAhead),
      maxBufferAhead: createSharedReference(maxBufferAhead),
      maxBufferBehind: createSharedReference(maxBufferBehind),
      maxVideoBufferSize: createSharedReference(maxVideoBufferSize),
    };

    this._priv_bitrateInfos = {
      lastBitrates: { audio: initialAudioBitrate,
                      video: initialVideoBitrate },
      minAutoBitrates: { audio: createSharedReference(minAudioBitrate),
                         video: createSharedReference(minVideoBitrate) },
      maxAutoBitrates: { audio: createSharedReference(maxAudioBitrate),
                         video: createSharedReference(maxVideoBitrate) },
      manualBitrates: { audio: createSharedReference(-1),
                        video: createSharedReference(-1) },
    };

    this._priv_throttleWhenHidden = throttleWhenHidden;
    this._priv_throttleVideoBitrateWhenHidden = throttleVideoBitrateWhenHidden;
    this._priv_limitVideoWidth = limitVideoWidth;
    this._priv_mutedMemory = DEFAULT_UNMUTED_VOLUME;

    this._priv_trackChoiceManager = null;
    this._priv_mediaElementTrackChoiceManager = null;
    this._priv_currentError = null;
    this._priv_contentInfos = null;

    this._priv_contentEventsMemory = {};

    this._priv_setPlayerState(PLAYER_STATES.STOPPED);

    this._priv_preferredAudioTracks = preferredAudioTracks;
    this._priv_preferredTextTracks = preferredTextTracks;
    this._priv_preferredVideoTracks = preferredVideoTracks;

    this._priv_lastContentPlaybackInfos = {};
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

    // free Observables linked to the Player instance
    this._priv_destroy$.next();
    this._priv_destroy$.complete();

    // Complete all subjects and references
    this._priv_speed.finish();
    this._priv_contentLock.finish();
    this._priv_bufferOptions.wantedBufferAhead.finish();
    this._priv_bufferOptions.maxVideoBufferSize.finish();
    this._priv_bufferOptions.maxBufferAhead.finish();
    this._priv_bufferOptions.maxBufferBehind.finish();
    this._priv_bitrateInfos.manualBitrates.video.finish();
    this._priv_bitrateInfos.manualBitrates.audio.finish();
    this._priv_bitrateInfos.minAutoBitrates.video.finish();
    this._priv_bitrateInfos.minAutoBitrates.audio.finish();
    this._priv_bitrateInfos.maxAutoBitrates.video.finish();
    this._priv_bitrateInfos.maxAutoBitrates.audio.finish();

    this._priv_lastContentPlaybackInfos = {};

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
    this._priv_lastContentPlaybackInfos = { options };
    this._priv_initializeContentPlayback(options);
  }

  /**
   * Reload last content. Init media playback without fetching again
   * the manifest.
   * @param {Object} reloadOpts
   */
  reload(reloadOpts?: { reloadAt?: { position?: number; relative?: number } }): void {
    const { options,
            manifest,
            lastPlaybackPosition } = this._priv_lastContentPlaybackInfos;
    if (options === undefined ||
        manifest === undefined ||
        lastPlaybackPosition === undefined) {
      throw new Error("API: Can't reload without having previously loaded a content.");
    }
    checkReloadOptions(reloadOpts);
    let startAtPositon: number;
    if (reloadOpts !== undefined &&
        reloadOpts.reloadAt !== undefined &&
        reloadOpts.reloadAt.position !== undefined) {
      startAtPositon = reloadOpts.reloadAt.position;
    } else {
      let playbackPosition: number;
      if (this.state === "STOPPED" || this.state === "ENDED") {
        playbackPosition = lastPlaybackPosition;
      } else {
        if (this.videoElement === null) {
          throw new Error("Can't reload when video element does not exist.");
        }
        playbackPosition = this.videoElement.currentTime;
      }
      if (reloadOpts !== undefined &&
          reloadOpts.reloadAt !== undefined &&
          reloadOpts.reloadAt.relative !== undefined) {
        startAtPositon = reloadOpts.reloadAt.relative + playbackPosition;
      } else {
        startAtPositon = playbackPosition;
      }
    }
    const newOptions = { ...options,
                         initialManifest: manifest };
    newOptions.startAt = { position: startAtPositon };
    this._priv_initializeContentPlayback(newOptions);
  }

  /**
   * From given options, initialize content playback.
   * @param {Object} options
   */
  private _priv_initializeContentPlayback(options : IParsedLoadVideoOptions) : void {
    const { autoPlay,
            audioTrackSwitchingMode,
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

    /** Subject which will emit to stop the current content. */
    const currentContentCanceller = new TaskCanceller();

    // Some logic needs the equivalent of the `currentContentCanceller` under
    // an Observable form
    // TODO remove the need for `stoppedContent$`
    const stoppedContent$ = new Observable((obs) => {
      currentContentCanceller.signal.register(() => {
        obs.next();
        obs.complete();
      });
    });

    /** Future `this._priv_contentInfos` related to this content. */
    const contentInfos = { url,
                           currentContentCanceller,
                           isDirectFile,
                           segmentBuffersStore: null,
                           thumbnails: null,
                           manifest: null,
                           currentPeriod: null,
                           activeAdaptations: null,
                           activeRepresentations: null };


    const videoElement = this.videoElement;

    /** Global "playback observer" which will emit playback conditions */
    const playbackObserver = new PlaybackObserver(videoElement, {
      withMediaSource: !isDirectFile,
      lowLatencyMode,
    });

    currentContentCanceller.signal.register(() => {
      playbackObserver.stop();
    });

    /** Emit playback events. */
    let playback$ : Connectable<IInitEvent>;

    if (!isDirectFile) {
      const transportFn = features.transports[transport];
      if (typeof transportFn !== "function") {
        // Stop previous content and reset its state
        this.stop();
        this._priv_currentError = null;
        throw new Error(`transport "${transport}" not supported`);
      }

      const transportPipelines = transportFn(transportOptions);

      const { offlineRetry, segmentRetry, manifestRetry } = networkConfig;

      /** Interface used to load and refresh the Manifest. */
      const manifestFetcher = new ManifestFetcher(url,
                                                  transportPipelines,
                                                  { lowLatencyMode,
                                                    maxRetryRegular: manifestRetry,
                                                    maxRetryOffline: offlineRetry });

      /** Interface used to download segments. */
      const segmentFetcherCreator = new SegmentFetcherCreator(
        transportPipelines,
        { lowLatencyMode,
          maxRetryOffline: offlineRetry,
          maxRetryRegular: segmentRetry });

      /** Observable emitting the initial Manifest */
      let manifest$ : Observable<IManifestFetcherParsedResult |
                                 IManifestFetcherWarningEvent>;

      if (initialManifest instanceof Manifest) {
        manifest$ = observableOf({ type: "parsed",
                                   manifest: initialManifest });
      } else if (initialManifest !== undefined) {
        manifest$ = manifestFetcher.parse(initialManifest, { previousManifest: null,
                                                             unsafeMode: false });
      } else {
        manifest$ = manifestFetcher.fetch(url).pipe(
          mergeMap((response) => response.type === "warning" ?
            observableOf(response) : // bubble-up warnings
            response.parse({ previousManifest: null, unsafeMode: false })));
      }

      // Load the Manifest right now and share it with every subscriber until
      // the content is stopped
      manifest$ = manifest$.pipe(takeUntil(stoppedContent$),
                                 shareReplay());
      manifest$.subscribe();

      // now that the Manifest is loading, stop previous content and reset state
      // This is done after fetching the Manifest as `stop` could technically
      // take time.
      this.stop();

      this._priv_currentError = null;
      this._priv_contentInfos = contentInfos;

      const relyOnVideoVisibilityAndSize = canRelyOnVideoVisibilityAndSize();
      const throttlers : IABRThrottlers = { throttle: {},
                                            throttleBitrate: {},
                                            limitWidth: {} };

      if (this._priv_throttleWhenHidden) {
        if (!relyOnVideoVisibilityAndSize) {
          log.warn("API: Can't apply throttleWhenHidden because " +
                   "browser can't be trusted for visibility.");
        } else {
          throttlers.throttle = {
            video: createMappedReference(
              getPageActivityRef(currentContentCanceller.signal),
              isActive => isActive ? Infinity : 0,
              currentContentCanceller.signal),
          };
        }
      }
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

      const bufferOptions = objectAssign({ audioTrackSwitchingMode,
                                           enableFastSwitching,
                                           manualBitrateSwitchingMode,
                                           onCodecSwitch },
                                         this._priv_bufferOptions);

      // We've every options set up. Start everything now
      const init$ = initializeMediaSourcePlayback({ adaptiveOptions,
                                                    autoPlay,
                                                    bufferOptions,
                                                    playbackObserver,
                                                    keySystems,
                                                    lowLatencyMode,
                                                    manifest$,
                                                    manifestFetcher,
                                                    mediaElement: videoElement,
                                                    minimumManifestUpdateInterval,
                                                    segmentFetcherCreator,
                                                    speed: this._priv_speed,
                                                    startAt,
                                                    textTrackOptions })
        .pipe(takeUntil(stoppedContent$));

      playback$ = connectable(init$, { connector: () => new Subject(),
                                       resetOnDisconnect: false });
    } else {
      // Stop previous content and reset its state
      this.stop();
      this._priv_currentError = null;
      if (features.directfile === null) {
        throw new Error("DirectFile feature not activated in your build.");
      }
      this._priv_contentInfos = contentInfos;

      this._priv_mediaElementTrackChoiceManager =
        new features.directfile.mediaElementTrackChoiceManager(this.videoElement);

      this._priv_mediaElementTrackChoiceManager
        .setPreferredAudioTracks(this._priv_preferredAudioTracks, true);
      this._priv_mediaElementTrackChoiceManager
        .setPreferredTextTracks(this._priv_preferredTextTracks, true);

      this._priv_mediaElementTrackChoiceManager
        .setPreferredVideoTracks(this._priv_preferredVideoTracks, true);

      this.trigger("availableAudioTracksChange",
                   this._priv_mediaElementTrackChoiceManager.getAvailableAudioTracks());
      this.trigger("availableVideoTracksChange",
                   this._priv_mediaElementTrackChoiceManager.getAvailableVideoTracks());
      this.trigger("availableTextTracksChange",
                   this._priv_mediaElementTrackChoiceManager.getAvailableTextTracks());

      this.trigger("audioTrackChange",
                   this._priv_mediaElementTrackChoiceManager.getChosenAudioTrack()
                   ?? null);
      this.trigger("textTrackChange",
                   this._priv_mediaElementTrackChoiceManager.getChosenTextTrack()
                   ?? null);
      this.trigger("videoTrackChange",
                   this._priv_mediaElementTrackChoiceManager.getChosenVideoTrack()
                   ?? null);

      this._priv_mediaElementTrackChoiceManager
        .addEventListener("availableVideoTracksChange", (val) =>
          this.trigger("availableVideoTracksChange", val));
      this._priv_mediaElementTrackChoiceManager
        .addEventListener("availableAudioTracksChange", (val) =>
          this.trigger("availableAudioTracksChange", val));
      this._priv_mediaElementTrackChoiceManager
        .addEventListener("availableTextTracksChange", (val) =>
          this.trigger("availableTextTracksChange", val));

      this._priv_mediaElementTrackChoiceManager
        .addEventListener("audioTrackChange", (val) =>
          this.trigger("audioTrackChange", val));
      this._priv_mediaElementTrackChoiceManager
        .addEventListener("videoTrackChange", (val) =>
          this.trigger("videoTrackChange", val));
      this._priv_mediaElementTrackChoiceManager
        .addEventListener("textTrackChange", (val) =>
          this.trigger("textTrackChange", val));

      const directfileInit$ =
        features.directfile.initDirectFile({ autoPlay,
                                             keySystems,
                                             mediaElement: videoElement,
                                             speed: this._priv_speed,
                                             playbackObserver,
                                             startAt,
                                             url })
          .pipe(takeUntil(stoppedContent$));

      playback$ = connectable(directfileInit$, { connector: () => new Subject(),
                                                 resetOnDisconnect: false });
    }

    /** Emit an object when the player "stalls" and null when it un-stalls */
    const stalled$ = playback$.pipe(
      filter((evt) : evt is IStalledEvent => evt.type === "stalled" ||
                                             evt.type === "unstalled"),
      map(x => x.value),
      distinctUntilChanged((prevStallReason, currStallReason) => {
        return prevStallReason === null && currStallReason === null ||
               (prevStallReason !== null && currStallReason !== null &&
                prevStallReason === currStallReason);
      }));

    /** Emit when the content is considered "loaded". */
    const loaded$ = playback$.pipe(
      filter((evt) : evt is ILoadedEvent => evt.type === "loaded"),
      share()
    );

    /** Emit when we will "reload" the MediaSource. */
    const reloading$ = playback$
      .pipe(filter((evt) : evt is IReloadingMediaSourceEvent =>
        evt.type === "reloading-media-source"
      ),
            share());

    /** Emit when the media element emits a "seeking" event. */
    const observation$ = playbackObserver.getReference().asObservable();

    const stateChangingEvent$ = observation$.pipe(filter(o => {
      return o.event === "seeking" || o.event === "ended" ||
             o.event === "play" || o.event === "pause";
    }));

    /** Emit state updates once the content is considered "loaded". */
    const loadedStateUpdates$ = observableCombineLatest([
      stalled$.pipe(startWith(null)),
      stateChangingEvent$.pipe(startWith(null)),
    ]).pipe(
      takeUntil(stoppedContent$),
      map(([stalledStatus]) =>
        getPlayerState(videoElement, stalledStatus)
      )
    );

    /** Emit all player "state" updates. */
    const playerState$ = observableConcat(
      observableOf(PLAYER_STATES.LOADING), // Begin with LOADING

      loaded$.pipe(switchMap((_, i) => {
        const isFirstLoad = i === 0;
        return observableMerge(
          // Purposely subscribed first so a RELOADING triggered synchronously
          // after a LOADED state is catched.
          reloading$.pipe(map(() => PLAYER_STATES.RELOADING)),
          // Only switch to LOADED state for the first (i.e. non-RELOADING) load
          isFirstLoad ? observableOf(PLAYER_STATES.LOADED) :
                        EMPTY,
          // Purposely put last so any other state change happens after we've
          // already switched to LOADED
          loadedStateUpdates$.pipe(
            takeUntil(reloading$),
            // For the first load, we prefer staying at the LOADED state over
            // PAUSED when autoPlay is disabled.
            // For consecutive loads however, there's no LOADED state.
            skipWhile(state => isFirstLoad && state === PLAYER_STATES.PAUSED)
          )
        );
      }))
    ).pipe(distinctUntilChanged());

    let playbackSubscription : Subscription|undefined;
    stoppedContent$.subscribe(() => {
      if (playbackSubscription !== undefined) {
        playbackSubscription.unsubscribe();
      }
    });

    // Link "positionUpdate" events to the PlaybackObserver
    observation$
      .pipe(takeUntil(stoppedContent$))
      .subscribe(o => this._priv_triggerPositionUpdate(o));

    // Link "seeking" and "seeked" events (once the content is loaded)
    loaded$.pipe(
      switchMap(() => emitSeekEvents(this.videoElement, observation$)),
      takeUntil(stoppedContent$)
    ).subscribe((evt : "seeking" | "seeked") => {
      log.info(`API: Triggering "${evt}" event`);
      this.trigger(evt, null);
    });

    // Handle state updates
    playerState$
      .pipe(takeUntil(stoppedContent$))
      .subscribe(x => this._priv_setPlayerState(x));

    // Link playback events to the corresponding callbacks
    playback$.subscribe({
      next: (x) => this._priv_onPlaybackEvent(x),
      error: (err : Error) => this._priv_onPlaybackError(err),
      complete: () => {
        if (!contentInfos.currentContentCanceller.isUsed) {
          log.info("API: Previous playback finished. Stopping and cleaning-up...");
          contentInfos.currentContentCanceller.cancel();
          this._priv_cleanUpCurrentContentState();
          this._priv_setPlayerState(PLAYER_STATES.STOPPED);
        }
      },
    });

    // initialize the content only when the lock is inactive
    this._priv_contentLock.asObservable()
      .pipe(
        filter((isLocked) => !isLocked),
        take(1),
        takeUntil(stoppedContent$)
      )
      .subscribe(() => {
        // start playback!
        playbackSubscription = playback$.connect();
      });
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
   * Returns manifest/playlist object.
   * null if the player is STOPPED.
   * @deprecated
   * @returns {Manifest|null} - The current Manifest (`null` when not known).
   */
  getManifest() : Manifest|null {
    warnOnce("getManifest is deprecated." +
             " Please open an issue if you used this API.");
    if (this._priv_contentInfos === null) {
      return null;
    }
    return this._priv_contentInfos.manifest;
  }

  /**
   * Returns Adaptations (tracks) for every currently playing type
   * (audio/video/text...).
   * @deprecated
   * @returns {Object|null} - The current Adaptation objects, per type (`null`
   * when none is known for now.
   */
  getCurrentAdaptations(
  ) : Partial<Record<IBufferType, IAdaptation|null>> | null {
    warnOnce("getCurrentAdaptations is deprecated." +
             " Please open an issue if you used this API.");
    if (this._priv_contentInfos === null) {
      return null;
    }
    const { currentPeriod, activeAdaptations } = this._priv_contentInfos;
    if (currentPeriod === null ||
        activeAdaptations === null ||
        isNullOrUndefined(activeAdaptations[currentPeriod.id]))
    {
      return null;
    }
    return activeAdaptations[currentPeriod.id];
  }

  /**
   * Returns representations (qualities) for every currently playing type
   * (audio/video/text...).
   * @deprecated
   * @returns {Object|null} - The current Representation objects, per type
   * (`null` when none is known for now.
   */
  getCurrentRepresentations(
  ) : Partial<Record<IBufferType, IRepresentation|null>> | null {
    warnOnce("getCurrentRepresentations is deprecated." +
             " Please open an issue if you used this API.");
    return this._priv_getCurrentRepresentations();
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
   * Returns the url of the content's manifest
   * @returns {string|undefined} - Current URL. `undefined` if not known or no
   * URL yet.
   */
  getUrl() : string|undefined {
    if (this._priv_contentInfos === null) {
      return undefined;
    }
    const { isDirectFile, manifest, url } = this._priv_contentInfos;
    if (isDirectFile) {
      return url;
    }
    if (manifest !== null) {
      return manifest.getUrl();
    }
    return undefined;
  }

  /**
   * Returns the video duration, in seconds.
   * NaN if no video is playing.
   * @returns {Number}
   */
  getVideoDuration() : number {
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
  getVideoBufferGap() : number {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    const videoElement = this.videoElement;
    return getLeftSizeOfRange(videoElement.buffered, videoElement.currentTime);
  }

  /**
   * Returns in seconds the difference between:
   *   - the end of the current contiguous loaded range.
   *   - the start of the current contiguous loaded range.
   * @returns {Number}
   */
  getVideoLoadedTime() : number {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    const videoElement = this.videoElement;
    return getSizeOfRange(videoElement.buffered, videoElement.currentTime);
  }

  /**
   * Returns in seconds the difference between:
   *   - the current time.
   *   - the start of the current contiguous loaded range.
   * @returns {Number}
   */
  getVideoPlayedTime() : number {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    const videoElement = this.videoElement;
    return getPlayedSizeOfRange(videoElement.buffered, videoElement.currentTime);
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
   * through `playerStateChange` events and the `getPlayerState` method). When in
   * that state, a black screen may be displayed and multiple RxPlayer APIs will
   * not be usable.
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
    if (this._priv_trackChoiceManager !== null) {
      if (preferTrickModeTracks &&
          !this._priv_trackChoiceManager.isTrickModeEnabled())
      {
        this._priv_trackChoiceManager.enableVideoTrickModeTracks();
      } else if (!preferTrickModeTracks &&
                 this._priv_trackChoiceManager.isTrickModeEnabled())
      {
        this._priv_trackChoiceManager.disableVideoTrickModeTracks();
      }
    }
  }

  /**
   * Returns all available bitrates for the current video Adaptation.
   * @returns {Array.<Number>}
   */
  getAvailableVideoBitrates() : number[] {
    if (this._priv_contentInfos === null) {
      return [];
    }
    const { currentPeriod, activeAdaptations } = this._priv_contentInfos;
    if (currentPeriod === null || activeAdaptations === null) {
      return [];
    }
    const adaptations = activeAdaptations[currentPeriod.id];
    if (adaptations === undefined || isNullOrUndefined(adaptations.video)) {
      return [];
    }

    return adaptations.video.getAvailableBitrates();
  }

  /**
   * Returns all available bitrates for the current audio Adaptation.
   * @returns {Array.<Number>}
   */
  getAvailableAudioBitrates() : number[] {
    if (this._priv_contentInfos === null) {
      return [];
    }
    const { currentPeriod, activeAdaptations } = this._priv_contentInfos;
    if (currentPeriod === null || activeAdaptations === null) {
      return [];
    }
    const adaptations = activeAdaptations[currentPeriod.id];
    if (adaptations === undefined || isNullOrUndefined(adaptations.audio)) {
      return [];
    }

    return adaptations.audio.getAvailableBitrates();
  }

  /**
   * Returns the manual audio bitrate set. -1 if in AUTO mode.
   * @returns {Number}
   */
  getManualAudioBitrate() : number {
    return this._priv_bitrateInfos.manualBitrates.audio.getValue();
  }

  /**
   * Returns the manual video bitrate set. -1 if in AUTO mode.
   * @returns {Number}
   */
  getManualVideoBitrate() : number {
    return this._priv_bitrateInfos.manualBitrates.video.getValue();
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
   * Force the video bitrate to a given value. Act as a ceil.
   * -1 to set it on AUTO Mode
   * @param {Number} btr
   */
  setVideoBitrate(btr : number) : void {
    this._priv_bitrateInfos.manualBitrates.video.setValue(btr);
  }

  /**
   * Force the audio bitrate to a given value. Act as a ceil.
   * -1 to set it on AUTO Mode
   * @param {Number} btr
   */
  setAudioBitrate(btr : number) : void {
    this._priv_bitrateInfos.manualBitrates.audio.setValue(btr);
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
   * @returns {string|null}
   */
  getCurrentKeySystem() : string|null {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    return getCurrentKeySystem(this.videoElement);
  }

  /**
   * Returns every available audio tracks for the current Period.
   * @returns {Array.<Object>|null}
   */
  getAvailableAudioTracks() : IAvailableAudioTrack[] {
    if (this._priv_contentInfos === null) {
      return [];
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      return this._priv_mediaElementTrackChoiceManager?.getAvailableAudioTracks() ?? [];
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      return [];
    }
    return this._priv_trackChoiceManager.getAvailableAudioTracks(currentPeriod);
  }

  /**
   * Returns every available text tracks for the current Period.
   * @returns {Array.<Object>|null}
   */
  getAvailableTextTracks() : IAvailableTextTrack[] {
    if (this._priv_contentInfos === null) {
      return [];
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      return this._priv_mediaElementTrackChoiceManager?.getAvailableTextTracks() ?? [];
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      return [];
    }
    return this._priv_trackChoiceManager.getAvailableTextTracks(currentPeriod);
  }

  /**
   * Returns every available video tracks for the current Period.
   * @returns {Array.<Object>|null}
   */
  getAvailableVideoTracks() : IAvailableVideoTrack[] {
    if (this._priv_contentInfos === null) {
      return [];
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      return this._priv_mediaElementTrackChoiceManager?.getAvailableVideoTracks() ?? [];
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      return [];
    }
    return this._priv_trackChoiceManager.getAvailableVideoTracks(currentPeriod);
  }

  /**
   * Returns currently chosen audio language for the current Period.
   * @returns {string}
   */
  getAudioTrack() : IAudioTrack|null|undefined {
    if (this._priv_contentInfos === null) {
      return undefined;
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      if (this._priv_mediaElementTrackChoiceManager === null) {
        return undefined;
      }
      return this._priv_mediaElementTrackChoiceManager.getChosenAudioTrack();
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      return undefined;
    }
    return this._priv_trackChoiceManager.getChosenAudioTrack(currentPeriod);
  }

  /**
   * Returns currently chosen subtitle for the current Period.
   * @returns {string}
   */
  getTextTrack() : ITextTrack|null|undefined {
    if (this._priv_contentInfos === null) {
      return undefined;
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      if (this._priv_mediaElementTrackChoiceManager === null) {
        return undefined;
      }
      return this._priv_mediaElementTrackChoiceManager.getChosenTextTrack();
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      return undefined;
    }
    return this._priv_trackChoiceManager.getChosenTextTrack(currentPeriod);
  }

  /**
   * Returns currently chosen video track for the current Period.
   * @returns {string}
   */
  getVideoTrack() : IVideoTrack|null|undefined {
    if (this._priv_contentInfos === null) {
      return undefined;
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      if (this._priv_mediaElementTrackChoiceManager === null) {
        return undefined;
      }
      return this._priv_mediaElementTrackChoiceManager.getChosenVideoTrack();
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      return undefined;
    }
    return this._priv_trackChoiceManager.getChosenVideoTrack(currentPeriod);
  }

  /**
   * Update the audio language for the current Period.
   * @param {string} audioId
   * @throws Error - the current content has no TrackChoiceManager.
   * @throws Error - the given id is linked to no audio track.
   */
  setAudioTrack(audioId : string) : void {
    if (this._priv_contentInfos === null) {
      throw new Error("No content loaded");
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      try {
        this._priv_mediaElementTrackChoiceManager?.setAudioTrackById(audioId);
        return;
      } catch (e) {
        throw new Error("player: unknown audio track");
      }
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      throw new Error("No compatible content launched.");
    }
    try {
      this._priv_trackChoiceManager.setAudioTrackByID(currentPeriod, audioId);
    }
    catch (e) {
      throw new Error("player: unknown audio track");
    }
  }

  /**
   * Update the text language for the current Period.
   * @param {string} sub
   * @throws Error - the current content has no TrackChoiceManager.
   * @throws Error - the given id is linked to no text track.
   */
  setTextTrack(textId : string) : void {
    if (this._priv_contentInfos === null) {
      throw new Error("No content loaded");
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      try {
        this._priv_mediaElementTrackChoiceManager?.setTextTrackById(textId);
        return;
      } catch (e) {
        throw new Error("player: unknown text track");
      }
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      throw new Error("No compatible content launched.");
    }
    try {
      this._priv_trackChoiceManager.setTextTrackByID(currentPeriod, textId);
    }
    catch (e) {
      throw new Error("player: unknown text track");
    }
  }

  /**
   * Disable subtitles for the current content.
   */
  disableTextTrack() : void {
    if (this._priv_contentInfos === null) {
      return;
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      this._priv_mediaElementTrackChoiceManager?.disableTextTrack();
      return;
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      return;
    }
    return this._priv_trackChoiceManager.disableTextTrack(currentPeriod);
  }

  /**
   * Update the video track for the current Period.
   * @param {string} videoId
   * @throws Error - the current content has no TrackChoiceManager.
   * @throws Error - the given id is linked to no video track.
   */
  setVideoTrack(videoId : string) : void {
    if (this._priv_contentInfos === null) {
      throw new Error("No content loaded");
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile) {
      try {
        this._priv_mediaElementTrackChoiceManager?.setVideoTrackById(videoId);
        return;
      } catch (e) {
        throw new Error("player: unknown video track");
      }
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      throw new Error("No compatible content launched.");
    }
    try {
      this._priv_trackChoiceManager.setVideoTrackByID(currentPeriod, videoId);
    }
    catch (e) {
      throw new Error("player: unknown video track");
    }
  }

  /**
   * Disable video track for the current content.
   */
  disableVideoTrack() : void {
    if (this._priv_contentInfos === null) {
      return;
    }
    const { currentPeriod, isDirectFile } = this._priv_contentInfos;
    if (isDirectFile && this._priv_mediaElementTrackChoiceManager !== null) {
      return this._priv_mediaElementTrackChoiceManager.disableVideoTrack();
    }
    if (this._priv_trackChoiceManager === null || currentPeriod === null) {
      return;
    }
    return this._priv_trackChoiceManager.disableVideoTrack(currentPeriod);
  }

  /**
   * Returns the current list of preferred audio tracks, in preference order.
   * @returns {Array.<Object>}
   */
  getPreferredAudioTracks() : IAudioTrackPreference[] {
    return this._priv_preferredAudioTracks;
  }

  /**
   * Returns the current list of preferred text tracks, in preference order.
   * @returns {Array.<Object>}
   */
  getPreferredTextTracks() : ITextTrackPreference[] {
    return this._priv_preferredTextTracks;
  }

  /**
   * Returns the current list of preferred text tracks, in preference order.
   * @returns {Array.<Object>}
   */
  getPreferredVideoTracks() : IVideoTrackPreference[] {
    return this._priv_preferredVideoTracks;
  }

  /**
   * Set the list of preferred audio tracks, in preference order.
   * @param {Array.<Object>} tracks
   * @param {boolean} shouldApply - `true` if those preferences should be
   * applied on the currently loaded Period. `false` if it should only
   * be applied to new content.
   */
  setPreferredAudioTracks(
    tracks : IAudioTrackPreference[],
    shouldApply : boolean = false
  ) : void {
    if (!Array.isArray(tracks)) {
      throw new Error("Invalid `setPreferredAudioTracks` argument. " +
                      "Should have been an Array.");
    }
    this._priv_preferredAudioTracks = tracks;
    if (this._priv_trackChoiceManager !== null) {
      this._priv_trackChoiceManager.setPreferredAudioTracks(tracks, shouldApply);
    } else if (this._priv_mediaElementTrackChoiceManager !== null) {
      this._priv_mediaElementTrackChoiceManager.setPreferredAudioTracks(tracks,
                                                                        shouldApply);
    }
  }

  /**
   * Set the list of preferred text tracks, in preference order.
   * @param {Array.<Object>} tracks
   * @param {boolean} shouldApply - `true` if those preferences should be
   * applied on the currently loaded Periods. `false` if it should only
   * be applied to new content.
   */
  setPreferredTextTracks(
    tracks : ITextTrackPreference[],
    shouldApply : boolean = false
  ) : void {
    if (!Array.isArray(tracks)) {
      throw new Error("Invalid `setPreferredTextTracks` argument. " +
                      "Should have been an Array.");
    }
    this._priv_preferredTextTracks = tracks;
    if (this._priv_trackChoiceManager !== null) {
      this._priv_trackChoiceManager.setPreferredTextTracks(tracks, shouldApply);
    } else if (this._priv_mediaElementTrackChoiceManager !== null) {
      this._priv_mediaElementTrackChoiceManager.setPreferredTextTracks(tracks,
                                                                       shouldApply);
    }
  }

  /**
   * Set the list of preferred text tracks, in preference order.
   * @param {Array.<Object>} tracks
   * @param {boolean} shouldApply - `true` if those preferences should be
   * applied on the currently loaded Period. `false` if it should only
   * be applied to new content.
   */
  setPreferredVideoTracks(
    tracks : IVideoTrackPreference[],
    shouldApply : boolean =  false
  ) : void {
    if (!Array.isArray(tracks)) {
      throw new Error("Invalid `setPreferredVideoTracks` argument. " +
                      "Should have been an Array.");
    }
    this._priv_preferredVideoTracks = tracks;
    if (this._priv_trackChoiceManager !== null) {
      this._priv_trackChoiceManager.setPreferredVideoTracks(tracks, shouldApply);
    } else if (this._priv_mediaElementTrackChoiceManager !== null) {
      this._priv_mediaElementTrackChoiceManager.setPreferredVideoTracks(tracks,
                                                                        shouldApply);
    }
  }


  /**
   * @returns {Array.<Object>|null}
   * @deprecated
   */
  getImageTrackData() : IBifThumbnail[] | null {
    warnOnce("`getImageTrackData` is deprecated." +
             "Please use the `parseBifThumbnails` tool instead.");
    if (this._priv_contentInfos === null) {
      return null;
    }
    /* eslint-disable import/no-deprecated */
    return this._priv_contentInfos.thumbnails;
    /* eslint-enable import/no-deprecated */
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
   * Reset all state properties relative to a playing content.
   */
  private _priv_cleanUpCurrentContentState() : void {
    log.debug("Locking `contentLock` to clean-up the current content.");

    // lock playback of new contents while cleaning up is pending
    this._priv_contentLock.setValue(true);

    this._priv_contentInfos = null;
    this._priv_trackChoiceManager = null;
    this._priv_mediaElementTrackChoiceManager?.dispose();
    this._priv_mediaElementTrackChoiceManager = null;

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
   * Triggered each time the playback Observable emits.
   *
   * React to various events.
   *
   * @param {Object} event - payload emitted
   */
  private _priv_onPlaybackEvent(event : IInitEvent) : void {
    switch (event.type) {
      case "inband-events":
        const inbandEvents = event.value;
        this.trigger("inbandEvents", inbandEvents);
        return;
      case "stream-event":
        this.trigger("streamEvent", event.value);
        break;
      case "stream-event-skip":
        this.trigger("streamEventSkip", event.value);
        break;
      case "activePeriodChanged":
        this._priv_onActivePeriodChanged(event.value);
        break;
      case "periodStreamReady":
        this._priv_onPeriodStreamReady(event.value);
        break;
      case "periodStreamCleared":
        this._priv_onPeriodStreamCleared(event.value);
        break;
      case "reloading-media-source":
        this._priv_onReloadingMediaSource();
        break;
      case "representationChange":
        this._priv_onRepresentationChange(event.value);
        break;
      case "adaptationChange":
        this._priv_onAdaptationChange(event.value);
        break;
      case "bitrateEstimationChange":
        this._priv_onBitrateEstimationChange(event.value);
        break;
      case "manifestReady":
        this._priv_onManifestReady(event.value);
        break;
      case "warning":
        this._priv_onPlaybackWarning(event.value);
        break;
      case "loaded":
        if (this._priv_contentInfos === null) {
          log.error("API: Loaded event while no content is loaded");
          return;
        }
        this._priv_contentInfos.segmentBuffersStore = event.value.segmentBuffersStore;
        break;
      case "decipherabilityUpdate":
        this.trigger("decipherabilityUpdate", event.value);
        break;
      case "added-segment":
        if (this._priv_contentInfos === null) {
          log.error("API: Added segment while no content is loaded");
          return;
        }

        // Manage image tracks
        // @deprecated
        const { content, segmentData } = event.value;
        if (content.adaptation.type === "image") {
          if (!isNullOrUndefined(segmentData) &&
              (segmentData as { type : string }).type === "bif")
          {
            const imageData = (segmentData as { data : IBifThumbnail[] }).data;
            /* eslint-disable import/no-deprecated */
            this._priv_contentInfos.thumbnails = imageData;
            this.trigger("imageTrackUpdate",
                         { data: this._priv_contentInfos.thumbnails });
            /* eslint-enable import/no-deprecated */
          }
        }
    }
  }

  /**
   * Triggered when we received a fatal error.
   * Clean-up ressources and signal that the content has stopped on error.
   * @param {Error} error
   */
  private _priv_onPlaybackError(error : unknown) : void {
    const formattedError = formatError(error, {
      defaultCode: "NONE",
      defaultReason: "An unknown error stopped content playback.",
    });
    formattedError.fatal = true;

    if (this._priv_contentInfos !== null) {
      this._priv_contentInfos.currentContentCanceller.cancel();
    }
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
  }

  /**
   * Triggered when we received a warning event during playback.
   * Trigger the right API event.
   * @param {Error} error
   */
  private _priv_onPlaybackWarning(error : IPlayerError) : void {
    const formattedError = formatError(error, {
      defaultCode: "NONE",
      defaultReason: "An unknown error happened.",
    });
    log.warn("API: Sending warning:", formattedError);
    this.trigger("warning", formattedError);
  }

  /**
   * Triggered when the Manifest has been loaded for the current content.
   * Initialize various private properties and emit initial event.
   * @param {Object} value
   */
  private _priv_onManifestReady({ manifest } : { manifest : Manifest }) : void {
    const contentInfos = this._priv_contentInfos;
    if (contentInfos === null) {
      log.error("API: The manifest is loaded but no content is.");
      return;
    }
    contentInfos.manifest = manifest;
    this._priv_lastContentPlaybackInfos.manifest = manifest;

    this._priv_trackChoiceManager = new TrackChoiceManager({
      preferTrickModeTracks: this._priv_preferTrickModeTracks,
    });

    this._priv_trackChoiceManager
      .setPreferredAudioTracks(this._priv_preferredAudioTracks, true);
    this._priv_trackChoiceManager
      .setPreferredTextTracks(this._priv_preferredTextTracks, true);
    this._priv_trackChoiceManager
      .setPreferredVideoTracks(this._priv_preferredVideoTracks, true);

    manifest.addEventListener("manifestUpdate", () => {
      // Update the tracks chosen if it changed
      if (this._priv_trackChoiceManager !== null) {
        this._priv_trackChoiceManager.update();
      }
    }, contentInfos.currentContentCanceller.signal);
  }

  /**
   * Triggered each times the current Period Changed.
   * Store and emit initial state for the Period.
   *
   * @param {Object} value
   */
  private _priv_onActivePeriodChanged({ period } : { period : Period }) : void {
    if (this._priv_contentInfos === null) {
      log.error("API: The active period changed but no content is loaded");
      return;
    }
    this._priv_contentInfos.currentPeriod = period;

    if (this._priv_contentEventsMemory.periodChange !== period) {
      this._priv_contentEventsMemory.periodChange = period;
      this.trigger("periodChange", period);
    }

    this.trigger("availableAudioTracksChange", this.getAvailableAudioTracks());
    this.trigger("availableTextTracksChange", this.getAvailableTextTracks());
    this.trigger("availableVideoTracksChange", this.getAvailableVideoTracks());

    // Emit intial events for the Period
    if (this._priv_trackChoiceManager !== null) {
      const audioTrack = this._priv_trackChoiceManager.getChosenAudioTrack(period);
      const textTrack = this._priv_trackChoiceManager.getChosenTextTrack(period);
      const videoTrack = this._priv_trackChoiceManager.getChosenVideoTrack(period);

      this.trigger("audioTrackChange", audioTrack);
      this.trigger("textTrackChange", textTrack);
      this.trigger("videoTrackChange", videoTrack);
    } else {
      this.trigger("audioTrackChange", null);
      this.trigger("textTrackChange", null);
      this.trigger("videoTrackChange", null);
    }

    this._priv_triggerAvailableBitratesChangeEvent("availableAudioBitratesChange",
                                                   this.getAvailableAudioBitrates());
    this._priv_triggerAvailableBitratesChangeEvent("availableVideoBitratesChange",
                                                   this.getAvailableVideoBitrates());

    const audioBitrate = this._priv_getCurrentRepresentations()?.audio?.bitrate ?? -1;
    this._priv_triggerCurrentBitrateChangeEvent("audioBitrateChange", audioBitrate);

    const videoBitrate = this._priv_getCurrentRepresentations()?.video?.bitrate ?? -1;
    this._priv_triggerCurrentBitrateChangeEvent("videoBitrateChange", videoBitrate);
  }

  /**
   * Triggered each times a new "PeriodStream" is ready.
   * Choose the right Adaptation for the Period and emit it.
   * @param {Object} value
   */
  private _priv_onPeriodStreamReady(value : {
    type : IBufferType;
    period : Period;
    adaptation$ : Subject<Adaptation|null>;
  }) : void {
    const { type, period, adaptation$ } = value;

    switch (type) {

      case "video":
        if (this._priv_trackChoiceManager === null) {
          log.error("API: TrackChoiceManager not instanciated for a new video period");
          adaptation$.next(null);
        } else {
          this._priv_trackChoiceManager.addPeriod(type, period, adaptation$);
          this._priv_trackChoiceManager.setInitialVideoTrack(period);
        }
        break;

      case "audio":
        if (this._priv_trackChoiceManager === null) {
          log.error(`API: TrackChoiceManager not instanciated for a new ${type} period`);
          adaptation$.next(null);
        } else {
          this._priv_trackChoiceManager.addPeriod(type, period, adaptation$);
          this._priv_trackChoiceManager.setInitialAudioTrack(period);
        }
        break;

      case "text":
        if (this._priv_trackChoiceManager === null) {
          log.error(`API: TrackChoiceManager not instanciated for a new ${type} period`);
          adaptation$.next(null);
        } else {
          this._priv_trackChoiceManager.addPeriod(type, period, adaptation$);
          this._priv_trackChoiceManager.setInitialTextTrack(period);
        }
        break;

      default:
        const adaptations = period.adaptations[type];
        if (!isNullOrUndefined(adaptations) && adaptations.length > 0) {
          adaptation$.next(adaptations[0]);
        } else {
          adaptation$.next(null);
        }
        break;
    }
  }

  /**
   * Triggered each times we "remove" a PeriodStream.
   * @param {Object} value
   */
  private _priv_onPeriodStreamCleared(value : {
    type : IBufferType;
    period : Period;
  }) : void {
    const { type, period } = value;

    // Clean-up track choice from TrackChoiceManager
    switch (type) {
      case "audio":
      case "text":
      case "video":
        if (this._priv_trackChoiceManager !== null) {
          this._priv_trackChoiceManager.removePeriod(type, period);
        }
        break;
    }

    // Clean-up stored Representation and Adaptation information
    if (this._priv_contentInfos === null) {
      return ;
    }
    const { activeAdaptations, activeRepresentations } = this._priv_contentInfos;
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
   * Triggered each time the content is re-loaded on the MediaSource.
   */
  private _priv_onReloadingMediaSource() {
    if (this._priv_contentInfos !== null) {
      this._priv_contentInfos.segmentBuffersStore = null;
    }
    if (this._priv_trackChoiceManager !== null) {
      this._priv_trackChoiceManager.resetPeriods();
    }
  }

  /**
   * Triggered each times a new Adaptation is considered for the current
   * content.
   * Store given Adaptation and emit it if from the current Period.
   * @param {Object} value
   */
  private _priv_onAdaptationChange({
    type,
    adaptation,
    period,
  } : {
    type : IBufferType;
    adaptation : Adaptation|null;
    period : Period;
  }) : void {
    if (this._priv_contentInfos === null) {
      log.error("API: The adaptations changed but no content is loaded");
      return;
    }

    // lazily create this._priv_contentInfos.activeAdaptations
    if (this._priv_contentInfos.activeAdaptations === null) {
      this._priv_contentInfos.activeAdaptations = {};
    }

    const { activeAdaptations, currentPeriod } = this._priv_contentInfos;
    const activePeriodAdaptations = activeAdaptations[period.id];
    if (isNullOrUndefined(activePeriodAdaptations)) {
      activeAdaptations[period.id] = { [type]: adaptation };
    } else {
      activePeriodAdaptations[type] = adaptation;
    }

    if (this._priv_trackChoiceManager !== null &&
        currentPeriod !== null && !isNullOrUndefined(period) &&
        period.id === currentPeriod.id)
    {
      switch (type) {
        case "audio":
          const audioTrack = this._priv_trackChoiceManager
            .getChosenAudioTrack(currentPeriod);
          this.trigger("audioTrackChange", audioTrack);

          const availableAudioBitrates = this.getAvailableAudioBitrates();
          this._priv_triggerAvailableBitratesChangeEvent("availableAudioBitratesChange",
                                                         availableAudioBitrates);
          break;
        case "text":
          const textTrack = this._priv_trackChoiceManager
            .getChosenTextTrack(currentPeriod);
          this.trigger("textTrackChange", textTrack);
          break;
        case "video":
          const videoTrack = this._priv_trackChoiceManager
            .getChosenVideoTrack(currentPeriod);
          this.trigger("videoTrackChange", videoTrack);

          const availableVideoBitrates = this.getAvailableVideoBitrates();
          this._priv_triggerAvailableBitratesChangeEvent("availableVideoBitratesChange",
                                                         availableVideoBitrates);
          break;
      }
    }
  }

  /**
   * Triggered each times a new Representation is considered during playback.
   *
   * Store given Representation and emit it if from the current Period.
   *
   * @param {Object} obj
   */
  private _priv_onRepresentationChange({
    type,
    period,
    representation,
  }: {
    type : IBufferType;
    period : Period;
    representation : Representation|null;
  }) : void {
    if (this._priv_contentInfos === null) {
      log.error("API: The representations changed but no content is loaded");
      return;
    }

    // lazily create this._priv_contentInfos.activeRepresentations
    if (this._priv_contentInfos.activeRepresentations === null) {
      this._priv_contentInfos.activeRepresentations = {};
    }

    const { activeRepresentations, currentPeriod } = this._priv_contentInfos;

    const activePeriodRepresentations = activeRepresentations[period.id];
    if (isNullOrUndefined(activePeriodRepresentations)) {
      activeRepresentations[period.id] = { [type]: representation };
    } else {
      activePeriodRepresentations[type] = representation;
    }

    const bitrate = representation?.bitrate ?? -1;
    if (!isNullOrUndefined(period) &&
        currentPeriod !== null &&
        currentPeriod.id === period.id)
    {
      if (type === "video") {
        this._priv_triggerCurrentBitrateChangeEvent("videoBitrateChange", bitrate);
      } else if (type === "audio") {
        this._priv_triggerCurrentBitrateChangeEvent("audioBitrateChange", bitrate);
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
   * @param {Object} observation
   */
  private _priv_triggerPositionUpdate(observation : IPlaybackObservation) : void {
    if (this._priv_contentInfos === null) {
      log.warn("API: Cannot perform time update: no content loaded.");
      return;
    }

    if (this.state === PLAYER_STATES.RELOADING) {
      return;
    }

    const { isDirectFile, manifest } = this._priv_contentInfos;
    if ((!isDirectFile && manifest === null) || isNullOrUndefined(observation)) {
      return;
    }

    this._priv_lastContentPlaybackInfos.lastPlaybackPosition = observation.position;

    const maximumPosition = manifest !== null ? manifest.getMaximumSafePosition() :
                                                undefined;
    const positionData : IPositionUpdate = {
      position: observation.position,
      duration: observation.duration,
      playbackRate: observation.playbackRate,
      maximumBufferTime: maximumPosition,

      // TODO fix higher up?
      bufferGap: isFinite(observation.bufferGap) ? observation.bufferGap :
                                                   0,
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

  /**
   * Trigger one of the "availableBitratesChange" event only if it changed from
   * the previously stored value.
   * @param {string} event
   * @param {Array.<number>} newVal
   */
  private _priv_triggerAvailableBitratesChangeEvent(
    event : "availableAudioBitratesChange" | "availableVideoBitratesChange",
    newVal : number[]
  ) : void {
    const prevVal = this._priv_contentEventsMemory[event];
    if (prevVal === undefined || !areArraysOfNumbersEqual(newVal, prevVal)) {
      this._priv_contentEventsMemory[event] = newVal;
      this.trigger(event, newVal);
    }
  }

  /**
   * Trigger one of the "bitrateChange" event only if it changed from the
   * previously stored value.
   * @param {string} event
   * @param {number} newVal
   */
  private _priv_triggerCurrentBitrateChangeEvent(
    event : "audioBitrateChange" | "videoBitrateChange",
    newVal : number
  ) : void {
    if (newVal !== this._priv_contentEventsMemory[event]) {
      this._priv_contentEventsMemory[event] = newVal;
      this.trigger(event, newVal);
    }
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
}
Player.version = /* PLAYER_VERSION */"3.28.0";

/** Every events sent by the RxPlayer's public API. */
interface IPublicAPIEvent {
  playerStateChange : string;
  positionUpdate : IPositionUpdate;
  audioTrackChange : IAudioTrack | null;
  textTrackChange : ITextTrack | null;
  videoTrackChange : IVideoTrack | null;
  audioBitrateChange : number;
  videoBitrateChange : number;
  imageTrackUpdate : { data: IBifThumbnail[] };
  bitrateEstimationChange : IBitrateEstimate;
  volumeChange : number;
  error : IPlayerError | Error;
  warning : IPlayerError | Error;
  periodChange : IPeriod;
  availableAudioBitratesChange : number[];
  availableVideoBitratesChange : number[];
  availableAudioTracksChange : IAvailableAudioTrack[];
  availableTextTracksChange : IAvailableTextTrack[];
  availableVideoTracksChange : IAvailableVideoTrack[];
  decipherabilityUpdate : IDecipherabilityUpdateContent[];
  seeking : null;
  seeked : null;
  streamEvent : IStreamEvent;
  streamEventSkip : IStreamEvent;
  inbandEvents : IInbandEvent[];
}

export default Player;
