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
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  ConnectableObservable,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
  Subject,
  Subscription,
} from "rxjs";
import {
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  mergeMap,
  mergeMapTo,
  publish,
  share,
  shareReplay,
  skipWhile,
  startWith,
  switchMapTo,
  take,
  takeUntil,
} from "rxjs/operators";
import {
  events,
  exitFullscreen,
  isFullscreen,
  requestFullscreen,
} from "../../compat";
/* eslint-disable-next-line max-len */
import canRelyOnVideoVisibilityAndSize from "../../compat/can_rely_on_video_visibility_and_size";
import config from "../../config";
import {
  ErrorCodes,
  ErrorTypes,
  formatError,
  ICustomError,
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
import { IBifThumbnail } from "../../parsers/images/bif";
import areArraysOfNumbersEqual from "../../utils/are_arrays_of_numbers_equal";
import EventEmitter, {
  fromEvent,
} from "../../utils/event_emitter";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import Logger from "../../utils/logger";
import noop from "../../utils/noop";
import objectAssign from "../../utils/object_assign";
import PPromise from "../../utils/promise";
import {
  getLeftSizeOfRange,
  getPlayedSizeOfRange,
  getSizeOfRange,
} from "../../utils/ranges";
import warnOnce from "../../utils/warn_once";
import {
  clearEMESession,
  disposeEME,
  getCurrentKeySystem,
} from "../eme";
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
import { IStreamEventData } from "../init/stream_events_emitter";
import SegmentBuffersStore, {
  IBufferedChunk,
  IBufferType,
} from "../segment_buffers";
import { IInbandEvent } from "../stream";
import createClock, {
  IClockTick,
} from "./clock";
import emitSeekEvents from "./emit_seek_events";
import getPlayerState, {
  IPlayerState,
  PLAYER_STATES,
} from "./get_player_state";
import MediaElementTrackChoiceManager from "./media_element_track_choice_manager";
import {
  checkReloadOptions,
  IConstructorOptions,
  ILoadVideoOptions,
  IParsedLoadVideoOptions,
  parseConstructorOptions,
  parseLoadVideoOptions,
} from "./option_utils";
import TrackChoiceManager, {
  IAudioTrackPreference,
  ITextTrackPreference,
  ITMAudioTrack,
  ITMAudioTrackListItem,
  ITMTextTrack,
  ITMTextTrackListItem,
  ITMVideoTrack,
  ITMVideoTrackListItem,
  IVideoTrackPreference,
} from "./track_choice_manager";

/* eslint-disable @typescript-eslint/naming-convention */

const { DEFAULT_UNMUTED_VOLUME } = config;

const { isActive,
        isVideoVisible,
        onEnded$,
        onFullscreenChange$,
        onPlayPause$,
        onPictureInPictureEvent$,
        onSeeking$,
        onTextTrackChanges$,
        videoWidth$ } = events;

/** Payload emitted with a `positionUpdate` event. */
interface IPositionUpdateItem {
  /** current position the player is in, in seconds. */
  position : number;
  /** Last position set for the current media currently, in seconds. */
  duration : number;
  /** Playback rate (i.e. speed) at which the current media is played. */
  playbackRate : number;
  /** Amount of buffer available for now in front of the current position, in seconds. */
  bufferGap : number;
  /** Current maximum seekable position. */
  maximumBufferTime? : number;
  wallClockTime? : number;
  /**
   * Only for live contents. Difference between the "live edge" and the current
   * position, in seconds.
   */
  liveGap? : number;
}

/** Payload emitted with a `bitrateEstimationChange` event. */
interface IBitrateEstimate {
  /** The type of buffer this estimate was done for (e.g. "audio). */
  type : IBufferType;
  /** The calculated bitrate, in bits per seconds. */
  bitrate : number | undefined;
}

export type IStreamEvent = { data: IStreamEventData;
                             start: number;
                             end: number;
                             onExit?: () => void; } |
                           { data: IStreamEventData;
                             start: number; };

/** Every events sent by the RxPlayer's public API. */
interface IPublicAPIEvent {
  playerStateChange : string;
  positionUpdate : IPositionUpdateItem;
  audioTrackChange : ITMAudioTrack | null;
  textTrackChange : ITMTextTrack | null;
  videoTrackChange : ITMVideoTrack | null;
  audioBitrateChange : number;
  videoBitrateChange : number;
  imageTrackUpdate : { data: IBifThumbnail[] };
  fullscreenChange : boolean;
  bitrateEstimationChange : IBitrateEstimate;
  volumeChange : number;
  error : ICustomError | Error;
  warning : ICustomError | Error;
  nativeTextTracksChange : TextTrack[];
  periodChange : Period;
  availableAudioBitratesChange : number[];
  availableVideoBitratesChange : number[];
  availableAudioTracksChange : ITMAudioTrackListItem[];
  availableTextTracksChange : ITMTextTrackListItem[];
  availableVideoTracksChange : ITMVideoTrackListItem[];
  decipherabilityUpdate : Array<{ manifest : Manifest;
                                  period : Period;
                                  adaptation : Adaptation;
                                  representation : Representation; }>;
  seeking : null;
  seeked : null;
  streamEvent : IStreamEvent;
  streamEventSkip : IStreamEvent;
  inbandEvent : IInbandEvent;
}

/**
 * @class Player
 * @extends EventEmitter
 */
class Player extends EventEmitter<IPublicAPIEvent> {

  /** Current version of the RxPlayer.  */
  public static version : string;

  /** Current version of the RxPlayer.  */
  public readonly version : string;

  /** Media element attached to the RxPlayer.  */
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
   * Emit true when the previous content is cleaning-up, false when it's done.
   * A new content cannot be launched until it emits false.
   */
  private readonly _priv_contentLock$ : BehaviorSubject<boolean>;

  /**
   * Changes on "play" and "pause" events from the media elements.
   * Switches to ``true`` whent the "play" event was the last received.
   * Switches to ``false`` whent the "pause" event was the last received.
   * ``false`` if no such event was received for the current loaded content.
   */
  private readonly _priv_playing$ : ReplaySubject<boolean>;

  /**
   * Last speed set by the user.
   * Used instead of videoElement.playbackRate to allow more flexibility.
   */
  private readonly _priv_speed$ : BehaviorSubject<number>;

  /** Store buffer-related options used needed when initializing a content. */
  private readonly _priv_bufferOptions : {
    /** Emit the last wanted buffer goal. */
    wantedBufferAhead$ : BehaviorSubject<number>;
    /** Maximum kept buffer ahead in the current position, in seconds. */
    maxBufferAhead$ : BehaviorSubject<number>;
    /** Maximum kept buffer behind in the current position, in seconds. */
    maxBufferBehind$ : BehaviorSubject<number>;
  };

  /** Information on the current bitrate settings. */
  private readonly _priv_bitrateInfos : {
    /**
     * Store last bitrates for each type for ABRManager instanciation.
     * Store the initial wanted bitrates at first.
     */
    lastBitrates : { audio? : number;
                     video? : number;
                     text? : number;
                     image? : number; };

    /** Store last wanted minAutoBitrates for the next ABRManager instanciation. */
    minAutoBitrates : { audio : BehaviorSubject<number>;
                        video : BehaviorSubject<number>; };

    /** Store last wanted maxAutoBitrates for the next ABRManager instanciation. */
    maxAutoBitrates : { audio : BehaviorSubject<number>;
                        video : BehaviorSubject<number>; };

    /** Store last wanted manual bitrates for the next ABRManager instanciation. */
    manualBitrates : { audio : BehaviorSubject<number>;
                       video : BehaviorSubject<number>; };
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
    url? : string;

    /** Subject allowing to stop playing that content. */
    stop$ : Subject<void>;

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

    /** Store starting audio track if one. */
    initialAudioTrack : undefined|IAudioTrackPreference;

    /** Store starting text track if one. */
    initialTextTrack : undefined|ITextTrackPreference;

    /** Keep information on the active SegmentBuffers. */
    segmentBuffersStore : SegmentBuffersStore | null;
  };

  /** List of favorite audio tracks, in preference order.  */
  private _priv_preferredAudioTracks : IAudioTrackPreference[];

  /** List of favorite text tracks, in preference order.  */
  private _priv_preferredTextTracks : ITextTrackPreference[];

  /** List of favorite video tracks, in preference order. */
  private _priv_preferredVideoTracks : IVideoTrackPreference[];

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

  /** Emit last picture in picture event. */
  private _priv_pictureInPictureEvent$ : ReplaySubject<events.IPictureInPictureEvent>;

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

  /** Determines whether or not the player should stop at the end of video playback. */
  private readonly _priv_stopAtEnd : boolean;

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
            stopAtEnd } = parseConstructorOptions(options);

    // Workaround to support Firefox autoplay on FF 42.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
    videoElement.preload = "auto";

    this.version = /* PLAYER_VERSION */"3.23.1";
    this.log = log;
    this.state = "STOPPED";
    this.videoElement = videoElement;

    this._priv_destroy$ = new Subject();

    this._priv_pictureInPictureEvent$ = new ReplaySubject(1);
    onPictureInPictureEvent$(videoElement)
      .pipe(takeUntil(this._priv_destroy$))
      .subscribe(this._priv_pictureInPictureEvent$);

    /** @deprecated */
    onFullscreenChange$(videoElement)
      .pipe(takeUntil(this._priv_destroy$))
      /* eslint-disable import/no-deprecated */
      .subscribe(() => this.trigger("fullscreenChange", this.isFullscreen()));
      /* eslint-enable import/no-deprecated */

    /** @deprecated */
    onTextTrackChanges$(videoElement.textTracks)
      .pipe(
        takeUntil(this._priv_destroy$),
        map((evt : Event) => { // prepare TextTrack array
          const target = evt.target as TextTrackList;
          const arr : TextTrack[] = [];
          for (let i = 0; i < target.length; i++) {
            const textTrack = target[i];
            arr.push(textTrack);
          }
          return arr;
        }),

        // We can have two consecutive textTrackChanges with the exact same
        // payload when we perform multiple texttrack operations before the event
        // loop is freed.
        // In that case we only want to fire one time the observable.
        distinctUntilChanged((textTracksA, textTracksB) => {
          if (textTracksA.length !== textTracksB.length) {
            return false;
          }
          for (let i = 0; i < textTracksA.length; i++) {
            if (textTracksA[i] !== textTracksB[i]) {
              return false;
            }
          }
          return true;
        })
      )
      .subscribe((x : TextTrack[]) => this._priv_onNativeTextTracksNext(x));

    this._priv_playing$ = new ReplaySubject(1);
    this._priv_speed$ = new BehaviorSubject(videoElement.playbackRate);
    this._priv_contentLock$ = new BehaviorSubject<boolean>(false);

    this._priv_bufferOptions = {
      wantedBufferAhead$: new BehaviorSubject(wantedBufferAhead),
      maxBufferAhead$: new BehaviorSubject(maxBufferAhead),
      maxBufferBehind$: new BehaviorSubject(maxBufferBehind),
    };

    this._priv_bitrateInfos = {
      lastBitrates: { audio: initialAudioBitrate,
                      video: initialVideoBitrate },
      minAutoBitrates: { audio: new BehaviorSubject(minAudioBitrate),
                         video: new BehaviorSubject(minVideoBitrate) },
      maxAutoBitrates: { audio: new BehaviorSubject(maxAudioBitrate),
                         video: new BehaviorSubject(maxVideoBitrate) },
      manualBitrates: { audio: new BehaviorSubject(-1),
                        video: new BehaviorSubject(-1) },
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

    this._priv_stopAtEnd = stopAtEnd;

    this._priv_setPlayerState(PLAYER_STATES.STOPPED);

    this._priv_preferredAudioTracks = preferredAudioTracks;
    this._priv_preferredTextTracks = preferredTextTracks;
    this._priv_preferredVideoTracks = preferredVideoTracks;

    this._priv_lastContentPlaybackInfos = {};
  }

  /**
   * Stop the playback for the current content.
   */
  stop() : void {
    if (this._priv_contentInfos !== null) {
      this._priv_contentInfos.stop$.next();
      this._priv_contentInfos.stop$.complete();
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
      // free resources used for EME management
      disposeEME(this.videoElement);
    }

    // free Observables linked to the Player instance
    this._priv_destroy$.next();
    this._priv_destroy$.complete();

    // Complete all subjects
    this._priv_playing$.complete();
    this._priv_speed$.complete();
    this._priv_contentLock$.complete();
    this._priv_bufferOptions.wantedBufferAhead$.complete();
    this._priv_bufferOptions.maxBufferAhead$.complete();
    this._priv_bufferOptions.maxBufferBehind$.complete();
    this._priv_pictureInPictureEvent$.complete();
    this._priv_bitrateInfos.manualBitrates.video.complete();
    this._priv_bitrateInfos.manualBitrates.audio.complete();
    this._priv_bitrateInfos.minAutoBitrates.video.complete();
    this._priv_bitrateInfos.minAutoBitrates.audio.complete();
    this._priv_bitrateInfos.maxAutoBitrates.video.complete();
    this._priv_bitrateInfos.maxAutoBitrates.audio.complete();

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
    log.info("API: Calling loadvideo", options);
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
            defaultAudioTrack,
            defaultTextTrack,
            enableFastSwitching,
            initialManifest,
            keySystems,
            lowLatencyMode,
            manualBitrateSwitchingMode,
            manifestUpdateUrl,
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
    const stopContent$ = new Subject<void>();

    /** Future `this._priv_contentInfos` related to this content. */
    const contentInfos = { url,
                           stop$: stopContent$,
                           isDirectFile,
                           segmentBuffersStore: null,
                           thumbnails: null,
                           manifest: null,
                           currentPeriod: null,
                           activeAdaptations: null,
                           activeRepresentations: null,
                           initialAudioTrack: defaultAudioTrack,
                           initialTextTrack: defaultTextTrack };

    const videoElement = this.videoElement;

    /** Global "clock" used for content playback */
    const clock$ = createClock(videoElement, { withMediaSource: !isDirectFile,
                                               lowLatencyMode });

    /** Emit playback events. */
    let playback$ : ConnectableObservable<IInitEvent>;

    if (!isDirectFile) {
      const transportFn = features.transports[transport];
      if (typeof transportFn !== "function") {
        // Stop previous content and reset its state
        this.stop();
        this._priv_currentError = null;
        this._priv_playing$.next(false);
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
      const segmentFetcherCreator = new SegmentFetcherCreator<any>(
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
      manifest$ = manifest$.pipe(takeUntil(stopContent$),
                                 shareReplay());
      manifest$.subscribe();

      // now that the Manifest is loading, stop previous content and reset state
      // This is done after fetching the Manifest as `stop` could technically
      // take time.
      this.stop();
      this._priv_currentError = null;
      this._priv_playing$.next(false);
      this._priv_contentInfos = contentInfos;

      const relyOnVideoVisibilityAndSize = canRelyOnVideoVisibilityAndSize();
      const throttlers = { throttle: {},
                           throttleBitrate: {},
                           limitWidth: {} };

      if (this._priv_throttleWhenHidden) {
        if (!relyOnVideoVisibilityAndSize) {
          log.warn("API: Can't apply throttleWhenHidden because " +
                   "browser can't be trusted for visibility.");
        } else {
          throttlers.throttle = {
            video: isActive().pipe(
              map(active => active ? Infinity :
                                       0),
              takeUntil(stopContent$)),
          };
        }
      }
      if (this._priv_throttleVideoBitrateWhenHidden) {
        if (!relyOnVideoVisibilityAndSize) {
          log.warn("API: Can't apply throttleVideoBitrateWhenHidden because " +
                   "browser can't be trusted for visibility.");
        } else {
          throttlers.throttleBitrate = {
            video: isVideoVisible(this._priv_pictureInPictureEvent$).pipe(
              map(active => active ? Infinity :
                                     0),
              takeUntil(stopContent$)),
          };
        }
      }
      if (this._priv_limitVideoWidth) {
        if (!relyOnVideoVisibilityAndSize) {
          log.warn("API: Can't apply limitVideoWidth because browser can't be " +
                   "trusted for video size.");
        } else {
          throttlers.limitWidth = {
            video: videoWidth$(videoElement, this._priv_pictureInPictureEvent$)
              .pipe(takeUntil(stopContent$)),
          };
        }
      }

      /** Options used by the ABR Manager. */
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
        { textTrackMode: "native" as const,
          hideNativeSubtitle: options.hideNativeSubtitle } :
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
                                                    clock$,
                                                    keySystems,
                                                    lowLatencyMode,
                                                    manifest$,
                                                    manifestFetcher,
                                                    manifestUpdateUrl,
                                                    mediaElement: videoElement,
                                                    minimumManifestUpdateInterval,
                                                    segmentFetcherCreator,
                                                    speed$: this._priv_speed$,
                                                    startAt,
                                                    textTrackOptions })
        .pipe(takeUntil(stopContent$));

      playback$ = publish<IInitEvent>()(init$);
    } else {
      // Stop previous content and reset its state
      this.stop();
      this._priv_currentError = null;
      this._priv_playing$.next(false);
      if (features.directfile === null) {
        throw new Error("DirectFile feature not activated in your build.");
      }
      this._priv_contentInfos = contentInfos;

      this._priv_mediaElementTrackChoiceManager =
        new features.directfile.mediaElementTrackChoiceManager(this.videoElement);

      const preferredAudioTracks = defaultAudioTrack === undefined ?
        this._priv_preferredAudioTracks :
        [defaultAudioTrack];
      this._priv_mediaElementTrackChoiceManager
        .setPreferredAudioTracks(preferredAudioTracks, true);

      const preferredTextTracks = defaultTextTrack === undefined ?
        this._priv_preferredTextTracks :
        [defaultTextTrack];
      this._priv_mediaElementTrackChoiceManager
        .setPreferredTextTracks(preferredTextTracks, true);

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
                                             clock$,
                                             keySystems,
                                             mediaElement: videoElement,
                                             speed$: this._priv_speed$,
                                             startAt,
                                             url })
          .pipe(takeUntil(stopContent$));

      playback$ = publish<IInitEvent>()(directfileInit$);
    }

    /** Emit an object when the player "stalls" and null when it un-stalls */
    const stalled$ = playback$.pipe(
      filter((evt) : evt is IStalledEvent => evt.type === "stalled" ||
                                             evt.type === "unstalled"),
      map(x => x.value),
      distinctUntilChanged((wasStalled, isStalled) => {
        return wasStalled === null && isStalled === null ||
               (wasStalled !== null && isStalled !== null &&
                wasStalled.reason === isStalled.reason);
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

    /** Emit when the media element emits an "ended" event. */
    const endedEvent$ = onEnded$(videoElement);

    /** Emit when the media element emits a "seeking" event. */
    const seekingEvent$ = onSeeking$(videoElement);

    /** Emit state updates once the content is considered "loaded". */
    const loadedStateUpdates$ = observableCombineLatest([
      this._priv_playing$,
      stalled$.pipe(startWith(null)),
      endedEvent$.pipe(startWith(null)),
      seekingEvent$.pipe(startWith(null)),
    ]).pipe(
      takeUntil(stopContent$),
      map(([isPlaying, stalledStatus]) =>
        getPlayerState(videoElement, isPlaying, stalledStatus)
      )
    );

    /** Emit all player "state" updates. */
    const playerState$ = observableConcat(
      observableOf(PLAYER_STATES.LOADING), // Begin with LOADING

      // LOADED as soon as the first "loaded" event is sent
      loaded$.pipe(take(1), mapTo(PLAYER_STATES.LOADED)),

      observableMerge(
        loadedStateUpdates$
          .pipe(
            // From the first reload onward, we enter another dynamic (below)
            takeUntil(reloading$),
            skipWhile(state => state === PLAYER_STATES.PAUSED)
          ),

        // when reloading
        reloading$.pipe(
          switchMapTo(
            loaded$.pipe(
              take(1), // wait for the next loaded event
              mergeMapTo(loadedStateUpdates$), // to update the state as usual
              startWith(PLAYER_STATES.RELOADING) // Starts with "RELOADING" state
            )
          )
        )
      )
    ).pipe(distinctUntilChanged());

    let playbackSubscription : Subscription|undefined;
    stopContent$
      .pipe(take(1))
      .subscribe(() => {
        if (playbackSubscription !== undefined) {
          playbackSubscription.unsubscribe();
        }
      });

    // Link `_priv_onPlayPauseNext` Observable to "play"/"pause" events
    onPlayPause$(videoElement)
      .pipe(takeUntil(stopContent$))
      .subscribe(e => this._priv_onPlayPauseNext(e.type === "play"), noop);

    // Link "positionUpdate" events to the clock
    clock$
      .pipe(takeUntil(stopContent$))
      .subscribe(x => this._priv_triggerPositionUpdate(x), noop);

    // Link "seeking" and "seeked" events (once the content is loaded)
    loaded$.pipe(
      switchMapTo(emitSeekEvents(this.videoElement, clock$)),
      takeUntil(stopContent$)
    ).subscribe((evt : "seeking" | "seeked") => {
      log.info(`API: Triggering "${evt}" event`);
      this.trigger(evt, null);
    });

    // Handle state updates
    playerState$
      .pipe(takeUntil(stopContent$))
      .subscribe(x => this._priv_setPlayerState(x), noop);

    (this._priv_stopAtEnd ? onEnded$(videoElement) :
                            EMPTY)
      .pipe(takeUntil(stopContent$))
      .subscribe(() => {
        stopContent$.next();
        stopContent$.complete();
      });


    // Link playback events to the corresponding callbacks
    playback$.subscribe(
      (x) => this._priv_onPlaybackEvent(x),
      (err : Error) => this._priv_onPlaybackError(err),
      () => this._priv_onPlaybackFinished()
    );

    // initialize the content only when the lock is inactive
    this._priv_contentLock$
      .pipe(
        filter((isLocked) => !isLocked),
        take(1),
        takeUntil(stopContent$)
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
  ) : Partial<Record<IBufferType, Adaptation|null>> | null {
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
  ) : Partial<Record<IBufferType, Representation|null>> | null {
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
   * If one returns the first native text-track element attached to the media element.
   * @deprecated
   * @returns {TextTrack} - The native TextTrack attached (`null` when none)
   */
  getNativeTextTrack() : TextTrack|null {
    warnOnce("getNativeTextTrack is deprecated." +
             " Please open an issue if you used this API.");
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }
    const videoElement = this.videoElement;
    const textTracks = videoElement.textTracks;
    if (textTracks.length > 0) {
      return videoElement.textTracks[0];
    } else {
      return null;
    }
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
      return this.videoElement.currentTime;
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
   * Returns the current speed at which the video plays.
   * @returns {Number}
   */
  getPlaybackRate() : number {
    return this._priv_speed$.getValue();
  }

  /**
   * Update the playback rate of the video.
   * @param {Number} rate
   */
  setPlaybackRate(rate : number) : void {
    this._priv_speed$.next(rate);
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
      return PPromise.resolve();
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
        positionWanted = (isDirectFile || manifest === null) ?
          timeObj.wallClockTime :
          timeObj.wallClockTime - (
            manifest.availabilityStartTime !== undefined ?
              manifest.availabilityStartTime :
              0);
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
   * Returns true if the media element is full screen.
   * @deprecated
   * @returns {Boolean}
   */
  isFullscreen() : boolean {
    warnOnce("isFullscreen is deprecated." +
             " Fullscreen management should now be managed by the application");
    return isFullscreen();
  }

  /**
   * Set/exit fullScreen.
   * @deprecated
   * @param {Boolean} [goFull=true] - if false, exit full screen.
   */
  setFullscreen(goFull : boolean = true) : void {
    warnOnce("setFullscreen is deprecated." +
             " Fullscreen management should now be managed by the application");
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }

    if (goFull) {
      requestFullscreen(this.videoElement);
    } else {
      exitFullscreen();
    }
  }

  /**
   * Exit from full screen mode.
   * @deprecated
   */
  exitFullscreen() : void {
    warnOnce("exitFullscreen is deprecated." +
             " Fullscreen management should now be managed by the application");
    exitFullscreen();
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
    this._priv_bitrateInfos.manualBitrates.video.next(btr);
  }

  /**
   * Force the audio bitrate to a given value. Act as a ceil.
   * -1 to set it on AUTO Mode
   * @param {Number} btr
   */
  setAudioBitrate(btr : number) : void {
    this._priv_bitrateInfos.manualBitrates.audio.next(btr);
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
    this._priv_bitrateInfos.minAutoBitrates.video.next(btr);
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
    this._priv_bitrateInfos.minAutoBitrates.audio.next(btr);
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
    this._priv_bitrateInfos.maxAutoBitrates.video.next(btr);
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
    this._priv_bitrateInfos.maxAutoBitrates.audio.next(btr);
  }

  /**
   * Set the max buffer size for the buffer behind the current position.
   * Every buffer data before will be removed.
   * @param {Number} depthInSeconds
   */
  setMaxBufferBehind(depthInSeconds : number) : void {
    this._priv_bufferOptions.maxBufferBehind$.next(depthInSeconds);
  }

  /**
   * Set the max buffer size for the buffer behind the current position.
   * Every buffer data before will be removed.
   * @param {Number} depthInSeconds
   */
  setMaxBufferAhead(depthInSeconds : number) : void {
    this._priv_bufferOptions.maxBufferAhead$.next(depthInSeconds);
  }

  /**
   * Set the max buffer size for the buffer ahead of the current position.
   * The player will stop downloading chunks when this size is reached.
   * @param {Number} sizeInSeconds
   */
  setWantedBufferAhead(sizeInSeconds : number) : void {
    this._priv_bufferOptions.wantedBufferAhead$.next(sizeInSeconds);
  }

  /**
   * Returns the max buffer size for the buffer behind the current position.
   * @returns {Number}
   */
  getMaxBufferBehind() : number {
    return this._priv_bufferOptions.maxBufferBehind$.getValue();
  }

  /**
   * Returns the max buffer size for the buffer behind the current position.
   * @returns {Number}
   */
  getMaxBufferAhead() : number {
    return this._priv_bufferOptions.maxBufferAhead$.getValue();
  }

  /**
   * Returns the max buffer size for the buffer ahead of the current position.
   * @returns {Number}
   */
  getWantedBufferAhead() : number {
    return this._priv_bufferOptions.wantedBufferAhead$.getValue();
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
  getAvailableAudioTracks() : ITMAudioTrackListItem[] {
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
  getAvailableTextTracks() : ITMTextTrackListItem[] {
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
  getAvailableVideoTracks() : ITMVideoTrackListItem[] {
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
  getAudioTrack() : ITMAudioTrack|null|undefined {
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
  getTextTrack() : ITMTextTrack|null|undefined {
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
  getVideoTrack() : ITMVideoTrack|null|undefined {
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
      return manifest.getMinimumPosition();
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
      return manifest.getMaximumPosition();
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
    this._priv_contentLock$.next(true);

    this._priv_contentInfos = null;
    this._priv_trackChoiceManager = null;
    this._priv_mediaElementTrackChoiceManager?.dispose();
    this._priv_mediaElementTrackChoiceManager = null;

    this._priv_contentEventsMemory = {};

    // EME cleaning
    const freeUpContentLock = () => {
      log.debug("Unlocking `contentLock`. Next content can begin.");
      this._priv_contentLock$.next(false);
    };

    if (!isNullOrUndefined(this.videoElement)) {
      clearEMESession(this.videoElement)
        .subscribe(
          noop,
          (err : unknown) => {
            log.error("API: An error arised when trying to clean-up the EME session:" +
                      (err instanceof Error ? err.toString() :
                                              "Unknown Error"));
            freeUpContentLock();
          },
          () => {
            log.debug("API: EME session cleaned-up with success!");
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
        const eventNbr = inbandEvents.length;
        for (let i = 0; i < eventNbr; i++) {
          const inbandEvent = inbandEvents[i];
          this.trigger("inbandEvent", inbandEvent);
        }
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
      this._priv_contentInfos.stop$.next();
      this._priv_contentInfos.stop$.complete();
    }
    this._priv_cleanUpCurrentContentState();
    this._priv_currentError = formattedError;
    log.error("API: The player stopped because of an error:", error);
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
   * Triggered when the playback Observable completes.
   * Clean-up ressources and signal that the content has ended.
   */
  private _priv_onPlaybackFinished() : void {
    log.info("API: Previous playback finished. Stopping and cleaning-up...");
    if (this._priv_contentInfos !== null) {
      this._priv_contentInfos.stop$.next();
      this._priv_contentInfos.stop$.complete();
    }
    this._priv_cleanUpCurrentContentState();
    this._priv_setPlayerState(PLAYER_STATES.ENDED);
  }

  /**
   * Triggered when we received a warning event during playback.
   * Trigger the right API event.
   * @param {Error} error
   */
  private _priv_onPlaybackWarning(error : ICustomError) : void {
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

    const { initialAudioTrack, initialTextTrack } = contentInfos;
    this._priv_trackChoiceManager = new TrackChoiceManager();

    const preferredAudioTracks = initialAudioTrack === undefined ?
      this._priv_preferredAudioTracks :
      [initialAudioTrack];
    this._priv_trackChoiceManager.setPreferredAudioTracks(preferredAudioTracks, true);

    const preferredTextTracks = initialTextTrack === undefined ?
      this._priv_preferredTextTracks :
      [initialTextTrack];
    this._priv_trackChoiceManager.setPreferredTextTracks(preferredTextTracks, true);

    this._priv_trackChoiceManager.setPreferredVideoTracks(this._priv_preferredVideoTracks,
                                                          true);

    fromEvent(manifest, "manifestUpdate")
      .pipe(takeUntil(contentInfos.stop$))
      .subscribe(() => {
        // Update the tracks chosen if it changed
        if (this._priv_trackChoiceManager !== null) {
          this._priv_trackChoiceManager.update();
        }
      });
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
   * Triggered each time the videoElement alternates between play and pause.
   *
   * Emit the info through the right Subject.
   *
   * @param {Boolean} isPlaying
   */
  private _priv_onPlayPauseNext(isPlaying : boolean) : void {
    if (this.videoElement === null) {
      throw new Error("Disposed player");
    }

    this._priv_playing$.next(isPlaying);
  }

  /**
   * Triggered each time a textTrack is added to the video DOM Element.
   *
   * Trigger the right Player Event.
   *
   * @param {Array.<TextTrackElement>} tracks
   */
  private _priv_onNativeTextTracksNext(tracks : TextTrack[]) : void {
    this.trigger("nativeTextTracksChange", tracks);
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
   * Triggered each time a new clock tick object is emitted.
   *
   * Trigger the right Player Event
   *
   * @param {Object} clockTick
   */
  private _priv_triggerPositionUpdate(clockTick : IClockTick) : void {
    if (this._priv_contentInfos === null) {
      log.warn("API: Cannot perform time update: no content loaded.");
      return;
    }

    if (this.state === PLAYER_STATES.RELOADING) {
      return;
    }

    const { isDirectFile, manifest } = this._priv_contentInfos;
    if ((!isDirectFile && manifest === null) || isNullOrUndefined(clockTick)) {
      return;
    }

    this._priv_lastContentPlaybackInfos.lastPlaybackPosition = clockTick.position;

    const maximumPosition = manifest !== null ? manifest.getMaximumPosition() :
                                                undefined;
    const positionData : IPositionUpdateItem = {
      position: clockTick.position,
      duration: clockTick.duration,
      playbackRate: clockTick.playbackRate,
      maximumBufferTime: maximumPosition,

      // TODO fix higher up?
      bufferGap: isFinite(clockTick.bufferGap) ? clockTick.bufferGap :
                                                 0,
    };

    if (manifest !== null &&
        maximumPosition !== undefined &&
        manifest.isLive &&
        clockTick.position > 0
    ) {
      const ast = manifest.availabilityStartTime ?? 0;
      positionData.wallClockTime = clockTick.position + ast;
      positionData.liveGap = maximumPosition - clockTick.position;
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
    if (prevVal === undefined || areArraysOfNumbersEqual(newVal, prevVal)) {
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
Player.version = /* PLAYER_VERSION */"3.23.1";

export default Player;
export { IStreamEventData };
