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

import deepEqual from "deep-equal";
import objectAssign from "object-assign";
import {
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  ConnectableObservable,
  EMPTY,
  merge as observableMerge,
  of as observableOf,
  ReplaySubject,
  Subject,
  Subscription,
} from "rxjs";
import {
  catchError,
  distinctUntilChanged,
  filter,
  map,
  mapTo,
  mergeMapTo,
  publish,
  share,
  skipWhile,
  startWith,
  switchMapTo,
  take,
  takeUntil,
} from "rxjs/operators";
import config from "../../config";
import log from "../../log";
import EventEmitter, {
  fromEvent,
} from "../../utils/event_emitter";
import Logger from "../../utils/logger";
import noop from "../../utils/noop";
import PPromise from "../../utils/promise";
import {
  getLeftSizeOfRange,
  getPlayedSizeOfRange,
  getSizeOfRange,
} from "../../utils/ranges";
import warnOnce from "../../utils/warn_once";

import {
  events,
  exitFullscreen,
  isFullscreen,
  requestFullscreen,
} from "../../compat";
import {
  ErrorCodes,
  ErrorTypes,
  ICustomError,
  MediaError,
} from "../../errors";
import features from "../../features";
import Manifest, {
  Adaptation,
  IFetchedPeriod,
  Representation,
} from "../../manifest";
import { IBifThumbnail } from "../../parsers/images/bif";
import ABRManager from "../abr";
import {
  clearEMESession,
  disposeEME,
  getCurrentKeySystem,
} from "../eme";
import initializeMediaSourcePlayback, {
  IInitEvent,
  ILoadedEvent,
  IReloadingMediaSourceEvent,
  IStalledEvent,
} from "../init";
import { IBufferType } from "../source_buffers";
import createClock, {
  IClockTick
} from "./clock";
import getPlayerState, {
  PLAYER_STATES,
} from "./get_player_state";
import {
  IConstructorOptions,
  ILoadVideoOptions,
  parseConstructorOptions,
  parseLoadVideoOptions,
} from "./option_parsers";
import TrackManager, {
  IAudioTrackPreference,
  ITextTrackPreference,
  ITMAudioTrack,
  ITMAudioTrackListItem,
  ITMTextTrack,
  ITMTextTrackListItem,
  ITMVideoTrack,
  ITMVideoTrackListItem
} from "./track_manager";

const {
  DEFAULT_UNMUTED_VOLUME,
} = config;

const {
  isInBackground$,
  onEnded$,
  onFullscreenChange$,
  onPlayPause$,
  onSeeking$,
  onTextTrackChanges$,
  videoWidth$,
} = events;

interface IPositionUpdateItem {
  position : number;
  duration : number;
  playbackRate : number;
  bufferGap : number;
  wallClockTime? : number;
  liveGap? : number;
}

interface IBitrateEstimate {
  type : IBufferType;
  bitrate : number|undefined;
}

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
  periodChange : IFetchedPeriod;
  availableAudioBitratesChange : number[];
  availableVideoBitratesChange : number[];
  availableAudioTracksChange : ITMAudioTrackListItem[];
  availableTextTracksChange : ITMTextTrackListItem[];
  availableVideoTracksChange : ITMVideoTrackListItem[];
}

/**
 * @class Player
 * @extends EventEmitter
 */
class Player extends EventEmitter<IPublicAPIEvent> {

  /**
   * Current version of the RxPlayer.
   * @type {string}
   */
  public static version : string;

  /**
   * Current version of the RxPlayer.
   * @type {string}
   */
  public readonly version : string;

  /**
   * Media element attached to the RxPlayer.
   * @type {HTMLMediaElement|null}
   */
  public videoElement : HTMLMediaElement|null; // null on dispose

  /**
   * Logger the RxPlayer uses.
   * @type {Object}
   */
  public readonly log : Logger;

  /**
   * Current state of the RxPlayer.
   * Please use `getPlayerState()` instead.
   * @type {string}
   */
  public state : string;

  /**
   * Emit when the player is disposed to perform clean-up.
   * The player will be unusable after that.
   * @private
   * @type {Subject}
   */
  private readonly _priv_destroy$ : Subject<void>;

  /**
   * Emit to stop the current content and clean-up all related ressources.
   * @private
   * @type {Subject}
   */
  private readonly _priv_stopCurrentContent$ : Subject<void>;

  /**
   * Emit true when the previous content is cleaning-up, false when it's done.
   * A new content cannot be launched until it emits false.
   * @private
   * @type {BehaviorSubject}
   */
  private readonly _priv_contentLock$ : BehaviorSubject<boolean>;

  /**
   * Changes on "play" and "pause" events from the media elements.
   * Switches to ``true`` whent the "play" event was the last received.
   * Switches to ``false`` whent the "pause" event was the last received.
   *
   * ``false`` if no such event was received for the current loaded content.
   * @private
   * @type {ReplaySubject}
   */
  private readonly _priv_playing$ : ReplaySubject<boolean>;

  /**
   * Last speed set by the user.
   * Used instead of videoElement.playbackRate to allow more flexibility.
   * @private
   * @type {BehaviorSubject>}
   */
  private readonly _priv_speed$ : BehaviorSubject<number>;

  /**
   * Store buffer-related options used needed when initializing a content.
   * @private
   * @type {Object}
   */
  private readonly _priv_bufferOptions : {
    /**
     * Emit the last wanted buffer goal.
     * @type {BehaviorSubject}
     */
    wantedBufferAhead$ : BehaviorSubject<number>;

    /**
     * Maximum kept buffer ahead in the current position, in seconds.
     * @type {BehaviorSubject}
     */
    maxBufferAhead$ : BehaviorSubject<number>;

    /**
     * Maximum kept buffer behind in the current position, in seconds.
     * @type {BehaviorSubject}
     */
    maxBufferBehind$ : BehaviorSubject<number>;
  };

  /**
   * Informations on the current bitrate settings.
   * @private
   * @type {Object}
   */
  private readonly _priv_bitrateInfos : {
    /**
     * Store last bitrates for each type for ABRManager instanciation.
     * Store the initial wanted bitrates at first.
     * @type {Object}
     */
    lastBitrates : {
      audio? : number;
      video? : number;
      text? : number;
      image? : number;
    };

    /**
     * Store last wanted maxAutoBitrates for the next ABRManager instanciation.
     * @type {Object}
     */
    initialMaxAutoBitrates : {
      audio : number; // has a default in the config
      video : number; // has a default in the config
      text? : number;
      image? : number;
    };

    /**
     * Store last wanted manual bitrates for the next ABRManager instanciation.
     * @type {Object}
     */
    manualBitrates : {
      audio : number; // has a default in the config
      video : number; // has a default in the config
      text? : number;
      image? : number;
    };
  };

  /**
   * Current fatal error which STOPPED the player.
   * @type {Error|null}
   */
  private _priv_currentError : Error|null;

  /**
   * Informations about the current content being played.
   * null when no content is launched.
   * @private
   * @type {Object|null}
   */
  private _priv_contentInfos : null | {
    /**
     * URL of the content currently being played.
     * @type {string}
     */
    url : string;

    /**
     * true if the current content is in DirectFile mode.
     * false is the current content has a transport protocol (Smooth/DASH...).
     * @type {Boolean}
     */
    isDirectFile : boolean;

    /**
     * Current Image Track Data associated to the content.
     *
     * null if the current content has no image playlist linked to it.
     *
     * TODO Need complete refactoring for live or multi-periods contents
     * @type {Object|null}
     */
    thumbnails : IBifThumbnail[]|null;

    /**
     * Manifest linked to the current content.
     * Null if the current content loaded has no manifest or if the content is
     * not yet loaded.
     * @type {Object|null}
     */
    manifest : Manifest|null;

    /**
     * Current Period being played.
     * null if no Period is being played.
     * @type {Object}
     */
    currentPeriod : IFetchedPeriod|null;

    /**
     * Store currently considered adaptations, per active period.
     *
     * null if no adaptation is active
     * @type {Object}
     */
    activeAdaptations : {
      [periodId : string] : Partial<Record<IBufferType, Adaptation|null>>;
    } | null;

    /**
     * Store currently considered representations, per active period.
     *
     * null if no representation is active
     * @type {Object}
     */
    activeRepresentations : {
      [periodId : string] : Partial<Record<IBufferType, Representation|null>>;
    } | null;

    /**
     * Store starting audio track if one.
     * @type {undefined|null|Object}
     */
    initialAudioTrack : undefined|IAudioTrackPreference;

    /**
     * Store starting text track if one.
     * @type {undefined|null|Object}
     */
    initialTextTrack : undefined|ITextTrackPreference;
  };

  /**
   * List of favorite audio tracks, in preference order.
   * @type {Array.<Object>}
   */
  private _priv_preferredAudioTracks : BehaviorSubject<IAudioTrackPreference[]>;

  /**
   * List of favorite text tracks, in preference order.
   * @type {Array.<Object>}
   */
  private _priv_preferredTextTracks : BehaviorSubject<ITextTrackPreference[]>;

  /**
   * TrackManager instance linked to the current content.
   * Null if no content has been loaded or if the current content loaded
   * has no TrackManager.
   * @private
   * @type {Object|null}
   */
  private _priv_trackManager : TrackManager|null;

  /**
   * ABRManager instance linked to the current content.
   * Null if no content has been loaded or if the current content loaded
   * has no ABRManager.
   * @private
   * @type {Object|null}
   */
  private _priv_abrManager : ABRManager|null;

  /**
   * Store wanted configuration for the limitVideoWidth option.
   * @private
   * @type {boolean}
   */
  private readonly _priv_limitVideoWidth : boolean;

  /**
   * Store wanted configuration for the throttleWhenHidden option.
   * @private
   * @type {boolean}
   */
  private readonly _priv_throttleWhenHidden : boolean;

  /**
   * Store volume when mute is called, to restore it on unmute.
   * @private
   * @type {Number}
   */
  private _priv_mutedMemory : number;

  /**
   * Store last state of various values sent as events, to avoid re-triggering
   * them multiple times in a row.
   *
   * All those events are linked to the content being played and can be cleaned
   * on stop.
   *
   * @private
   * @type {Object}
   */
  private _priv_contentEventsMemory : {
    [P in keyof IPublicAPIEvent]? : IPublicAPIEvent[P];
  };

  /**
   * Determines whether or not player should stop at the end of video playback.
   * @private
   */
  private readonly _priv_stopAtEnd : boolean;

  /**
   * All possible Error types emitted by the RxPlayer.
   * @type {Object}
   */
  static get ErrorTypes() : Partial<Record<string, string>> {
    return ErrorTypes;
  }

  /**
   * All possible Error codes emitted by the RxPlayer.
   * @type {Object}
   */
  static get ErrorCodes() : Partial<Record<string, string>> {
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
   * @type {string}
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
            maxAudioBitrate,
            maxBufferAhead,
            maxBufferBehind,
            maxVideoBitrate,
            preferredAudioTracks,
            preferredTextTracks,
            throttleWhenHidden,
            videoElement,
            wantedBufferAhead,
            stopAtEnd } = parseConstructorOptions(options);

    // Workaround to support Firefox autoplay on FF 42.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
    videoElement.preload = "auto";

    this.version = /*PLAYER_VERSION*/"3.13.0";
    this.log = log;
    this.state = "STOPPED";
    this.videoElement = videoElement;

    this._priv_destroy$ = new Subject();

    /** @deprecated */
    onFullscreenChange$(videoElement)
      .pipe(takeUntil(this._priv_destroy$))
      /* tslint:disable deprecation */
      .subscribe(() => this.trigger("fullscreenChange", this.isFullscreen()));
      /* tslint:enable deprecation */

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
    this._priv_stopCurrentContent$ = new Subject();
    this._priv_contentLock$ = new BehaviorSubject<boolean>(false);

    this._priv_bufferOptions = {
      wantedBufferAhead$: new BehaviorSubject(wantedBufferAhead),
      maxBufferAhead$: new BehaviorSubject(maxBufferAhead),
      maxBufferBehind$: new BehaviorSubject(maxBufferBehind),
    };

    this._priv_bitrateInfos = {
      lastBitrates: { audio: initialAudioBitrate,
                      video: initialVideoBitrate },
      initialMaxAutoBitrates: { audio: maxAudioBitrate,
                                video: maxVideoBitrate },
      manualBitrates: { audio: -1,
                        video: -1 },
    };

    this._priv_throttleWhenHidden = throttleWhenHidden;
    this._priv_limitVideoWidth = limitVideoWidth;
    this._priv_mutedMemory = DEFAULT_UNMUTED_VOLUME;

    this._priv_trackManager = null;
    this._priv_abrManager = null;
    this._priv_currentError = null;
    this._priv_contentInfos = null;

    this._priv_contentEventsMemory = {};

    this._priv_stopAtEnd = stopAtEnd;

    this._priv_setPlayerState(PLAYER_STATES.STOPPED);

    this._priv_preferredAudioTracks = new BehaviorSubject(preferredAudioTracks);
    this._priv_preferredTextTracks = new BehaviorSubject(preferredTextTracks);
  }

  /**
   * Stop the playback for the current content.
   */
  stop() : void {
    if (this.state !== PLAYER_STATES.STOPPED) {
      this._priv_stopCurrentContent$.next();
      this._priv_cleanUpCurrentContentState();
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

    if (this.videoElement) {
      // free resources used for EME management
      disposeEME(this.videoElement);
    }

    // free Observables linked to the Player instance
    this._priv_destroy$.next();
    this._priv_destroy$.complete();

    // Complete all subjects
    this._priv_stopCurrentContent$.complete();
    this._priv_playing$.complete();
    this._priv_speed$.complete();
    this._priv_contentLock$.complete();
    this._priv_bufferOptions.wantedBufferAhead$.complete();
    this._priv_bufferOptions.maxBufferAhead$.complete();
    this._priv_bufferOptions.maxBufferBehind$.complete();

    // un-attach video element
    this.videoElement = null;
  }

  /**
   * Load a new video.
   * @param {Object} opts
   * @returns {Observable}
   * @throws Error - throws if no url is given.
   * @throws Error - throws if no transport is given and no default transport
   * has been set.
   * @throws Error - throws if the asked transport does not exist
   */
  loadVideo(opts : ILoadVideoOptions) : void {
    const options = parseLoadVideoOptions(opts);
    log.info("API: Calling loadvideo", options);

    const { autoPlay,
            defaultAudioTrack,
            defaultTextTrack,
            keySystems,
            manualBitrateSwitchingMode,
            networkConfig,
            startAt,
            supplementaryImageTracks,
            supplementaryTextTracks,
            transport,
            transportOptions,
            url } = options;

    // Perform multiple checks on the given options
    if (!this.videoElement) {
      throw new Error("the attached video element is disposed");
    }

    // now that every check has passed, stop previous content
    this.stop();

    const isDirectFile = transport === "directfile";

    this._priv_currentError = null;
    this._priv_contentInfos = { url,
                                isDirectFile,
                                thumbnails: null,
                                manifest: null,
                                currentPeriod: null,
                                activeAdaptations: null,
                                activeRepresentations: null,
                                initialAudioTrack: defaultAudioTrack,
                                initialTextTrack: defaultTextTrack };

    // inilialize to false
    this._priv_playing$.next(false);

    // get every properties used from context for clarity
    const videoElement = this.videoElement;

    // Global clock used for the whole application.
    const clock$ = createClock(videoElement, { withMediaSource: !isDirectFile });

    const contentIsStopped$ = observableMerge(
      this._priv_stopCurrentContent$,
      this._priv_stopAtEnd ? onEnded$(videoElement) :
                             EMPTY
    ).pipe(take(1));

    let playback$ : ConnectableObservable<IInitEvent>;

    if (!isDirectFile) {
      const transportFn = features.transports[transport];
      if (!transportFn) {
        throw new Error(`transport "${transport}" not supported`);
      }

      const pipelines = transportFn(objectAssign({ supplementaryTextTracks,
                                                   supplementaryImageTracks },
                                                 transportOptions));

      // Options used by the ABR Manager.
      const adaptiveOptions = {
        initialBitrates: this._priv_bitrateInfos.lastBitrates,
        manualBitrates: this._priv_bitrateInfos.manualBitrates,
        maxAutoBitrates: this._priv_bitrateInfos.initialMaxAutoBitrates,
        throttle: this._priv_throttleWhenHidden ?
        { video: isInBackground$()
            .pipe(
              map(isBg => isBg ? 0 :
                                 Infinity),
              takeUntil(this._priv_stopCurrentContent$)
            ), } :
        {},
        limitWidth: this._priv_limitVideoWidth ?
        { video: videoWidth$(videoElement)
            .pipe(takeUntil(this._priv_stopCurrentContent$)), } :
        {},
      };

      // Options used by the TextTrack SourceBuffer
      const textTrackOptions = options.textTrackMode === "native" ?
        { textTrackMode: "native" as "native",
          hideNativeSubtitle: options.hideNativeSubtitle } :
        { textTrackMode: "html" as "html",
          textTrackElement: options.textTrackElement };

      // playback$ Observable, through which the content will be launched.
      playback$ = initializeMediaSourcePlayback({
        adaptiveOptions,
        autoPlay,
        bufferOptions: objectAssign({ manualBitrateSwitchingMode },
                                    this._priv_bufferOptions),
        clock$,
        keySystems,
        mediaElement: videoElement,
        networkConfig,
        pipelines,
        speed$: this._priv_speed$,
        startAt,
        textTrackOptions,
        url,
      })
        .pipe(takeUntil(contentIsStopped$))
        .pipe(publish()) as ConnectableObservable<IInitEvent>;
    } else {
      if (features.directfile == null) {
        throw new Error("DirectFile feature not activated in your build.");
      }
      playback$ = features.directfile({ autoPlay,
                                        clock$,
                                        keySystems,
                                        mediaElement: videoElement,
                                        speed$: this._priv_speed$,
                                        startAt,
                                        url }
      ).pipe(takeUntil(contentIsStopped$))
       .pipe(publish()) as ConnectableObservable<IInitEvent>;
    }

    // Emit an object when the player stalls and null when it unstall
    const stalled$ = playback$.pipe(
      filter((evt) : evt is IStalledEvent => evt.type === "stalled"),
      map(x => x.value)
    );

    // Emit when the content is considered "loaded".
    const loaded$ = playback$.pipe(
      filter((evt) : evt is ILoadedEvent => evt.type === "loaded"),
      share()
    );

    // Emit when we "reload" the MediaSource
    const reloading$ = playback$
      .pipe(filter((evt) : evt is IReloadingMediaSourceEvent =>
        evt.type === "reloading-media-source"
      ),
      share()
    );

    // Emit when the media element emits an "ended" event.
    const endedEvent$ = onEnded$(videoElement);

    // Emit when the media element emits a "seeking" event.
    const seekingEvent$ = onSeeking$(videoElement);

    // State updates when the content is considered "loaded"
    const loadedStateUpdates$ = observableCombineLatest([
      this._priv_playing$,
      stalled$.pipe(startWith(null)),
      endedEvent$.pipe(startWith(null)),
      seekingEvent$.pipe(startWith(null)),
    ]).pipe(
      takeUntil(this._priv_stopCurrentContent$),
      map(([isPlaying, stalledStatus]) =>
        getPlayerState(videoElement, isPlaying, stalledStatus)
      )
    );

    // Emit the player state as it changes.
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
    this._priv_stopCurrentContent$
      .pipe(take(1))
      .subscribe(() => {
        if (playbackSubscription) {
          playbackSubscription.unsubscribe();
        }
      });

    onPlayPause$(videoElement)
      .pipe(takeUntil(this._priv_stopCurrentContent$))
      .subscribe(e => this._priv_onPlayPauseNext(e.type === "play"), noop);

    clock$
      .pipe(takeUntil(this._priv_stopCurrentContent$))
      .subscribe(x => this._priv_triggerTimeChange(x), noop);

    playerState$
      .pipe(takeUntil(this._priv_stopCurrentContent$))
      .subscribe(x => this._priv_setPlayerState(x), noop);

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
        takeUntil(this._priv_stopCurrentContent$)
      )
      .subscribe(() => {
        playbackSubscription = playback$.connect();
      });
  }

  /**
   * Returns fatal error if one for the current content.
   * null otherwise.
   * @returns {Object|null}
   */
  getError() : Error|null {
    return this._priv_currentError;
  }

  /**
   * Returns manifest/playlist object.
   * null if the player is STOPPED.
   * @returns {Manifest|null}
   */
  getManifest() : Manifest|null {
    return this._priv_contentInfos &&
           this._priv_contentInfos.manifest;
  }

  /**
   * Returns adaptations (tracks) for every currently playing type
   * (audio/video/text...).
   * @returns {Object|null}
   */
  getCurrentAdaptations(
  ) : Partial<Record<IBufferType, Adaptation|null>> | null {
    if (!this._priv_contentInfos) {
      return null;
    }
    const { currentPeriod, activeAdaptations } = this._priv_contentInfos;
    if (!currentPeriod || !activeAdaptations) {
      return null;
    }
    return activeAdaptations[currentPeriod.id] || null;
  }

  /**
   * Returns representations (qualities) for every currently playing type
   * (audio/video/text...).
   * @returns {Object|null}
   */
  getCurrentRepresentations(
  ) : Partial<Record<IBufferType, Representation|null>> | null {
    if (!this._priv_contentInfos) {
      return null;
    }
    const { currentPeriod, activeRepresentations } = this._priv_contentInfos;
    if (!currentPeriod || !activeRepresentations) {
      return null;
    }
    return activeRepresentations[currentPeriod.id] ||
           null;
  }

  /**
   * Returns the media DOM element used by the player.
   * You should not its HTML5 API directly and use the player's method instead,
   * to ensure a well-behaved player.
   * @returns {HTMLMediaElement|null}
   */
  getVideoElement() : HTMLMediaElement|null {
    return this.videoElement;
  }

  /**
   * If one returns the first native text-track element attached to the media element.
   * @deprecated
   * @returns {TextTrack}
   */
  getNativeTextTrack() : TextTrack|null {
    warnOnce("getNativeTextTrack is deprecated." +
             " Please open an issue if you used this API.");
    if (!this.videoElement) {
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
   * @returns {string}
   */
  getPlayerState() : string|undefined {
    return this.state;
  }

  /**
   * Returns true if both:
   *   - a content is loaded
   *   - the content loaded is a live content
   * @returns {Boolean}
   */
  isLive() : boolean {
    if (!this._priv_contentInfos) {
      return false;
    }
    const { isDirectFile, manifest } = this._priv_contentInfos;
    if (isDirectFile || manifest == null) {
      return false;
    }
    return manifest.isLive;
  }

  /**
   * Returns the url of the content's manifest
   * @returns {string|undefined}
   */
  getUrl() : string|undefined {
    if (!this._priv_contentInfos) {
      return undefined;
    }
    const { isDirectFile, manifest, url } = this._priv_contentInfos;
    if (isDirectFile) {
      return url;
    }
    if (manifest != null) {
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
    if (!this.videoElement) {
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
    if (!this.videoElement) {
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
    if (!this.videoElement) {
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
    if (!this.videoElement) {
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
    if (!this.videoElement) {
      throw new Error("Disposed player");
    }
    if (!this._priv_contentInfos) {
      return this.videoElement.currentTime;
    }

    const { isDirectFile, manifest } = this._priv_contentInfos;
    if (isDirectFile) {
      return this.videoElement.currentTime;
    }
    if (manifest != null) {
      const currentTime = this.videoElement.currentTime;
      return this.isLive() ? (currentTime + (manifest.availabilityStartTime || 0)) :
                             currentTime;
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
    if (!this.videoElement) {
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
    if (!this._priv_contentInfos) {
      return [];
    }
    const { currentPeriod, activeAdaptations } = this._priv_contentInfos;
    if (!currentPeriod || !activeAdaptations) {
      return [];
    }
    const adaptations = activeAdaptations[currentPeriod.id];
    const videoAdaptation = adaptations && adaptations.video;
    if (!videoAdaptation) {
      return [];
    }

    return videoAdaptation.getAvailableBitrates();
  }

  /**
   * Returns all available bitrates for the current audio Adaptation.
   * @returns {Array.<Number>}
   */
  getAvailableAudioBitrates() : number[] {
    if (!this._priv_contentInfos) {
      return [];
    }
    const { currentPeriod, activeAdaptations } = this._priv_contentInfos;
    if (!currentPeriod || !activeAdaptations) {
      return [];
    }
    const adaptations = activeAdaptations[currentPeriod.id];
    const audioAdaptation = adaptations && adaptations.audio;
    if (!audioAdaptation) {
      return [];
    }

    return audioAdaptation.getAvailableBitrates();
  }

  /**
   * Returns the manual audio bitrate set. -1 if in AUTO mode.
   * @returns {Number}
   */
  getManualAudioBitrate() : number {
    return this._priv_bitrateInfos.manualBitrates.audio;
  }

  /**
   * Returns the manual video bitrate set. -1 if in AUTO mode.
   * @returns {Number}
   */
  getManualVideoBitrate() : number {
    return this._priv_bitrateInfos.manualBitrates.video;
  }

  /**
   * Returns currently considered bitrate for video segments.
   * @returns {Number|undefined}
   */
  getVideoBitrate() : number|undefined {
    const representations = this.getCurrentRepresentations();
    if (!representations || !representations.video) {
      return undefined;
    }
    return representations.video.bitrate;
  }

  /**
   * Returns currently considered bitrate for audio segments.
   * @returns {Number|undefined}
   */
  getAudioBitrate() : number|undefined {
    const representations = this.getCurrentRepresentations();
    if (!representations || !representations.audio) {
      return undefined;
    }
    return representations.audio.bitrate;
  }

  /**
   * Returns max wanted video bitrate currently set.
   * @returns {Number}
   */
  getMaxVideoBitrate() : number|undefined {
    if (!this._priv_abrManager) {
      return this._priv_bitrateInfos.initialMaxAutoBitrates.video;
    }
    return this._priv_abrManager.getMaxAutoBitrate("video");
  }

  /**
   * Returns max wanted audio bitrate currently set.
   * @returns {Number}
   */
  getMaxAudioBitrate() : number|undefined {
    if (!this._priv_abrManager) {
      return this._priv_bitrateInfos.initialMaxAutoBitrates.audio;
    }
    return this._priv_abrManager.getMaxAutoBitrate("audio");
  }

  /**
   * Play/Resume the current video.
   * @returns {Promise}
   */
  play() : Promise<void> {
    if (!this.videoElement) {
      throw new Error("Disposed player");
    }

    const playPromise = this.videoElement.play();
    /* tslint:disable no-unbound-method */
    if (playPromise == null || typeof playPromise.catch !== "function") {
    /* tslint:enable no-unbound-method */
      return PPromise.resolve();
    }
    return playPromise.catch((error: Error) => {
      if (error.name === "NotAllowedError") {
        const warning = new MediaError("MEDIA_ERR_PLAY_NOT_ALLOWED",
                                       error.toString(),
                                       false);
        this.trigger("warning", warning);
      }
      throw error;
    });
  }

  /**
   * Pause the current video.
   */
  pause() : void {
    if (!this.videoElement) {
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
    if (!this.videoElement) {
      throw new Error("Disposed player");
    }
    if (!this._priv_contentInfos) {
      throw new Error("player: no content loaded");
    }

    const { isDirectFile, manifest } = this._priv_contentInfos;
    if (!isDirectFile && manifest == null) {
      throw new Error("player: the content did not load yet");
    }

    let positionWanted : number|undefined;
    const typeOf = typeof time;

    if (typeOf === "number") {
      positionWanted = time as number;
    } else if (typeOf === "object") {
      const currentTs = this.videoElement.currentTime;
      if ((time as { relative? : number }).relative != null) {
        positionWanted = currentTs + (time as { relative : number }).relative;
      } else if ((time as { position? : number }).position != null) {
        positionWanted = (time as { position : number }).position;
      } else if ((time as { wallClockTime? : number }).wallClockTime != null) {
        positionWanted = isDirectFile ?
          (time as { wallClockTime : number }).wallClockTime :
          (time as { wallClockTime : number }).wallClockTime -
            ((manifest as Manifest).availabilityStartTime || 0);
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
    if (!this.videoElement) {
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
    if (!this.videoElement) {
      throw new Error("Disposed player");
    }
    return this.videoElement.volume;
  }

  /**
   * Set the player's audio volume. From 0 (no volume) to 1 (maximum volume).
   * @param {Number} volume
   */
  setVolume(volume : number) : void {
    if (!this.videoElement) {
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
    return !this.getVolume();
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
      this.setVolume(this._priv_mutedMemory || DEFAULT_UNMUTED_VOLUME);
    }
  }

  /**
   * Force the video bitrate to a given value. Act as a ceil.
   * -1 to set it on AUTO Mode
   * @param {Number} btr
   */
  setVideoBitrate(btr : number) : void {
    this._priv_bitrateInfos.manualBitrates.video = btr;
    if (this._priv_abrManager) {
      this._priv_abrManager.setManualBitrate("video", btr);
    }
  }

  /**
   * Force the audio bitrate to a given value. Act as a ceil.
   * -1 to set it on AUTO Mode
   * @param {Number} btr
   */
  setAudioBitrate(btr : number) : void {
    this._priv_bitrateInfos.manualBitrates.audio = btr;
    if (this._priv_abrManager) {
      this._priv_abrManager.setManualBitrate("audio", btr);
    }
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setMaxVideoBitrate(btr : number) : void {
    // set it for the next content loaded
    this._priv_bitrateInfos.initialMaxAutoBitrates.video = btr;

    // set it for the current if one is loaded
    if (this._priv_abrManager) {
      this._priv_abrManager.setMaxAutoBitrate("video", btr);
    }
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setMaxAudioBitrate(btr : number) : void {
    // set it for the next content loaded
    this._priv_bitrateInfos.initialMaxAutoBitrates.audio = btr;

    // set it for the current if one is loaded
    if (this._priv_abrManager) {
      this._priv_abrManager.setMaxAutoBitrate("audio", btr);
    }
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
    if (!this.videoElement) {
      throw new Error("Disposed player");
    }
    return getCurrentKeySystem(this.videoElement);
  }

  /**
   * Returns every available audio tracks for the current Period.
   * @returns {Array.<Object>|null}
   */
  getAvailableAudioTracks() : ITMAudioTrackListItem[] {
    if (!this._priv_contentInfos) {
      return [];
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_trackManager || !currentPeriod) {
      return [];
    }
    return this._priv_trackManager.getAvailableAudioTracks(currentPeriod);
  }

  /**
   * Returns every available text tracks for the current Period.
   * @returns {Array.<Object>|null}
   */
  getAvailableTextTracks() : ITMTextTrackListItem[] {
    if (!this._priv_contentInfos) {
      return [];
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_trackManager || !currentPeriod) {
      return [];
    }
    return this._priv_trackManager.getAvailableTextTracks(currentPeriod);
  }

  /**
   * Returns every available video tracks for the current Period.
   * @returns {Array.<Object>|null}
   */
  getAvailableVideoTracks() : ITMVideoTrackListItem[] {
    if (!this._priv_contentInfos) {
      return [];
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_trackManager || !currentPeriod) {
      return [];
    }
    return this._priv_trackManager.getAvailableVideoTracks(currentPeriod);
  }

  /**
   * Returns currently chosen audio language for the current Period.
   * @returns {string}
   */
  getAudioTrack() : ITMAudioTrack|null|undefined {
    if (!this._priv_contentInfos) {
      return undefined;
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_trackManager || !currentPeriod) {
      return undefined;
    }
    return this._priv_trackManager.getChosenAudioTrack(currentPeriod);
  }

  /**
   * Returns currently chosen subtitle for the current Period.
   * @returns {string}
   */
  getTextTrack() : ITMTextTrack|null|undefined {
    if (!this._priv_contentInfos) {
      return undefined;
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_trackManager || !currentPeriod) {
      return undefined;
    }
    return this._priv_trackManager.getChosenTextTrack(currentPeriod);
  }

  /**
   * Returns currently chosen video track for the current Period.
   * @returns {string}
   */
  getVideoTrack() : ITMVideoTrack|null|undefined {
    if (!this._priv_contentInfos) {
      return undefined;
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_trackManager || !currentPeriod) {
      return undefined;
    }
    return this._priv_trackManager.getChosenVideoTrack(currentPeriod);
  }

  /**
   * Update the audio language for the current Period.
   * @param {string} audioId
   * @throws Error - the current content has no TrackManager.
   * @throws Error - the given id is linked to no audio track.
   */
  setAudioTrack(audioId : string) : void {
    if (!this._priv_contentInfos) {
      throw new Error("No content loaded");
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_trackManager || !currentPeriod) {
      throw new Error("No compatible content launched.");
    }
    try {
      this._priv_trackManager.setAudioTrackByID(currentPeriod, audioId);
    }
    catch (e) {
      throw new Error("player: unknown audio track");
    }
  }

  /**
   * Update the text language for the current Period.
   * @param {string} sub
   * @throws Error - the current content has no TrackManager.
   * @throws Error - the given id is linked to no text track.
   */
  setTextTrack(textId : string) : void {
    if (!this._priv_contentInfos) {
      throw new Error("No content loaded");
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_trackManager || !currentPeriod) {
      throw new Error("No compatible content launched.");
    }
    try {
      this._priv_trackManager.setTextTrackByID(currentPeriod, textId);
    }
    catch (e) {
      throw new Error("player: unknown text track");
    }
  }

  /**
   * Disable subtitles for the current content.
   */
  disableTextTrack() : void {
    if (!this._priv_contentInfos) {
      return;
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_trackManager || !currentPeriod) {
      return;
    }
    return this._priv_trackManager.disableTextTrack(currentPeriod);
  }

  /**
   * Update the video track for the current Period.
   * @param {string} videoId
   * @throws Error - the current content has no TrackManager.
   * @throws Error - the given id is linked to no video track.
   */
  setVideoTrack(videoId : string) : void {
    if (!this._priv_contentInfos) {
      throw new Error("No content loaded");
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_trackManager || !currentPeriod) {
      throw new Error("No compatible content launched.");
    }
    try {
      this._priv_trackManager.setVideoTrackByID(currentPeriod, videoId);
    }
    catch (e) {
      throw new Error("player: unknown video track");
    }
  }

  /**
   * Returns the current list of preferred audio tracks, in preference order.
   * @returns {Array.<Object>}
   */
  getPreferredAudioTracks() : IAudioTrackPreference[] {
    return this._priv_preferredAudioTracks.getValue();
  }

  /**
   * Returns the current list of preferred text tracks, in preference order.
   * @returns {Array.<Object>}
   */
  getPreferredTextTracks() : ITextTrackPreference[] {
    return this._priv_preferredTextTracks.getValue();
  }

  /**
   * Set the list of preferred audio tracks, in preference order.
   * @param {Array.<Object>} tracks
   */
  setPreferredAudioTracks(tracks : IAudioTrackPreference[]) : void {
    return this._priv_preferredAudioTracks.next(tracks);
  }

  /**
   * Set the list of preferred text tracks, in preference order.
   * @param {Array.<Object>} tracks
   */
  setPreferredTextTracks(tracks : ITextTrackPreference[]) : void {
    return this._priv_preferredTextTracks.next(tracks);
  }

  /**
   * @returns {Array.<Object>|null}
   */
  getImageTrackData() : IBifThumbnail[] | null {
    return this._priv_contentInfos && this._priv_contentInfos.thumbnails;
  }

  /**
   * Get minimum seek-able position.
   * @returns {number}
   */
  getMinimumPosition() : number|null {
    if (!this._priv_contentInfos) {
      return null;
    }

    if (this._priv_contentInfos.isDirectFile) {
      return 0;
    }

    const { manifest } = this._priv_contentInfos;
    if (manifest != null) {
      return manifest.getMinimumPosition();
    }
    return null;
  }

  /**
   * Get maximum seek-able position.
   * @returns {number}
   */
  getMaximumPosition() : number|null {
    if (!this._priv_contentInfos) {
      return null;
    }

    const { isDirectFile, manifest } = this._priv_contentInfos;

    if (isDirectFile) {
      if (!this.videoElement) {
        throw new Error("Disposed player");
      }
      return this.videoElement.duration;
    }

    if (manifest != null) {
      return manifest.getMaximumPosition();
    }
    return null;
  }

  /**
   * Reset all state properties relative to a playing content.
   * @private
   */
  private _priv_cleanUpCurrentContentState() : void {
    // lock playback of new contents while cleaning up is pending
    this._priv_contentLock$.next(true);

    this._priv_contentInfos = null;
    this._priv_trackManager = null;

    if (this._priv_abrManager) {
      this._priv_abrManager.dispose();
      this._priv_abrManager = null;
    }

    this._priv_contentEventsMemory = {};

    // EME cleaning
    const freeUpContentLock = () => {
      this._priv_contentLock$.next(false);
    };

    if (this.videoElement) {
      clearEMESession(this.videoElement)
        .pipe(catchError(() => EMPTY))
        .subscribe(noop, freeUpContentLock, freeUpContentLock);
    } else {
      freeUpContentLock();
    }
  }

  /**
   * Store and emit new player state (e.g. text track, videoBitrate...).
   * We check for deep equality to avoid emitting 2 consecutive times the same
   * state.
   * @param {string} eventName
   * @param {*} value - its new value
   * @private
   */
  private _priv_triggerContentEvent<TEventName extends keyof IPublicAPIEvent>(
    eventName : TEventName,
    value : IPublicAPIEvent[TEventName]
  ) : void {
    const prev = this._priv_contentEventsMemory[eventName];
    if (!deepEqual(prev, value)) {
      this._priv_contentEventsMemory[eventName] = value;
      this.trigger(eventName, value);
    }
  }

  /**
   * Triggered each time the playback Observable emits.
   *
   * React to various events.
   *
   * @param {Object} event - payload emitted
   * @private
   */
  private _priv_onPlaybackEvent(event : IInitEvent) : void {
    switch (event.type) {
      case "activePeriodChanged":
        this._priv_onActivePeriodChanged(event.value);
        break;
      case "periodBufferReady":
        this._priv_onPeriodBufferReady(event.value);
        break;
      case "periodBufferCleared":
        this._priv_onPeriodBufferCleared(event.value);
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
      case "added-segment":
        if (!this._priv_contentInfos) {
          log.error("API: Added segment while no content is loaded");
          return;
        }

        // Manage image tracks
        // TODO Better way? Perhaps linked to an ImageSourceBuffer
        // implementation
        const { bufferType, segmentData } = event.value;
        if (bufferType === "image") {
          if (segmentData != null && (segmentData as { type : string }).type === "bif") {
            const imageData = (segmentData as { data : IBifThumbnail[] }).data;

            // TODO merge multiple data from the same track together
            this._priv_contentInfos.thumbnails = imageData;
            this.trigger("imageTrackUpdate",
                         { data: this._priv_contentInfos.thumbnails });
          }
        }
    }
  }

  /**
   * Triggered when we received a fatal error.
   * Clean-up ressources and signal that the content has stopped on error.
   * @param {Error} error
   * @private
   */
  private _priv_onPlaybackError(error : ICustomError | Error) : void {
    this._priv_stopCurrentContent$.next();
    this._priv_cleanUpCurrentContentState();
    this._priv_currentError = error;
    log.error("API: The player stopped because of an error:", error);
    this._priv_setPlayerState(PLAYER_STATES.STOPPED);

    // TODO This condition is here because the eventual callback called when the
    // player state is updated can launch a new content, thus the error will not
    // be here anymore, in which case triggering the "error" event is unwanted.
    // This is very ugly though, and we should probable have a better solution
    if (this._priv_currentError === error) {
      this.trigger("error", error);
    }
  }

  /**
   * Triggered when the playback Observable completes.
   * Clean-up ressources and signal that the content has ended.
   * @private
   */
  private _priv_onPlaybackFinished() : void {
    this._priv_stopCurrentContent$.next();
    this._priv_cleanUpCurrentContentState();
    this._priv_setPlayerState(PLAYER_STATES.ENDED);
  }

  /**
   * Triggered when we received a warning event during playback.
   * Trigger the right API event.
   * @param {Error} error
   * @private
   */
  private _priv_onPlaybackWarning(error : Error) : void {
    log.warn("API: Sending warning:", error);
    this.trigger("warning", error);
  }

  /**
   * Triggered when the Manifest has been loaded for the current content.
   * Initialize various private properties and emit initial event.
   * @param {Object} value
   * @private
   */
  private _priv_onManifestReady(value : {
    abrManager : ABRManager;
    manifest : Manifest;
  }) : void {
    if (!this._priv_contentInfos) {
      log.error("API: The manifest is loaded but no content is.");
      return;
    }
    const { manifest, abrManager } = value;
    this._priv_contentInfos.manifest = manifest;
    this._priv_abrManager = abrManager;

    const { initialAudioTrack, initialTextTrack } = this._priv_contentInfos;
    this._priv_trackManager = new TrackManager({
      preferredAudioTracks: initialAudioTrack === undefined ?
        this._priv_preferredAudioTracks :
        new BehaviorSubject([initialAudioTrack]),
      preferredTextTracks: initialTextTrack === undefined ?
        this._priv_preferredTextTracks :
        new BehaviorSubject([initialTextTrack]),
    });

    fromEvent(manifest, "manifestUpdate")
      .pipe(takeUntil(this._priv_stopCurrentContent$))
      .subscribe(() => {
        // Update the tracks chosen if it changed
        if (this._priv_trackManager) {
          this._priv_trackManager.update();
        }
      });
  }

  /**
   * Triggered each times the current Period Changed.
   * Store and emit initial state for the Period.
   *
   * @param {Object} value
   * @private
   */
  private _priv_onActivePeriodChanged({ period } : { period : IFetchedPeriod }) : void {
    if (!this._priv_contentInfos) {
      log.error("API: The active period changed but no content is loaded");
      return;
    }
    this._priv_contentInfos.currentPeriod = period;

    this._priv_triggerContentEvent("periodChange", period);
    this._priv_triggerContentEvent("availableAudioTracksChange",
                                   this.getAvailableAudioTracks());
    this._priv_triggerContentEvent("availableTextTracksChange",
                                   this.getAvailableTextTracks());
    this._priv_triggerContentEvent("availableVideoTracksChange",
                                    this.getAvailableVideoTracks());

    // Emit intial events for the Period
    if (this._priv_trackManager) {
      const audioTrack = this._priv_trackManager.getChosenAudioTrack(period);
      const textTrack = this._priv_trackManager.getChosenTextTrack(period);
      const videoTrack = this._priv_trackManager.getChosenVideoTrack(period);

      this._priv_triggerContentEvent("audioTrackChange", audioTrack);
      this._priv_triggerContentEvent("textTrackChange", textTrack);
      this._priv_triggerContentEvent("videoTrackChange", videoTrack);
    } else {
      this._priv_triggerContentEvent("audioTrackChange", null);
      this._priv_triggerContentEvent("textTrackChange", null);
      this._priv_triggerContentEvent("videoTrackChange", null);
    }

    this._priv_triggerContentEvent("availableAudioBitratesChange",
                                   this.getAvailableAudioBitrates());
    this._priv_triggerContentEvent("availableVideoBitratesChange",
                                   this.getAvailableVideoBitrates());

    const activeAudioRepresentations = this.getCurrentRepresentations();
    if (activeAudioRepresentations && activeAudioRepresentations.audio != null) {
      const bitrate = activeAudioRepresentations.audio.bitrate;
      this._priv_triggerContentEvent("audioBitrateChange",
                                     bitrate != null ? bitrate : -1);
    } else {
      this._priv_triggerContentEvent("audioBitrateChange", -1);
    }

    const activeVideoRepresentations = this.getCurrentRepresentations();
    if (activeVideoRepresentations && activeVideoRepresentations.video != null) {
      const bitrate = activeVideoRepresentations.video.bitrate;
      this._priv_triggerContentEvent("videoBitrateChange",
                                     bitrate != null ? bitrate : -1);
    } else {
      this._priv_triggerContentEvent("videoBitrateChange", -1);
    }
  }

  /**
   * Triggered each times a new "PeriodBuffer" is ready.
   * Choose the right Adaptation for the Period and emit it.
   * @param {Object} value
   * @private
   */
  private _priv_onPeriodBufferReady(value : {
    type : IBufferType;
    period : IFetchedPeriod;
    adaptation$ : Subject<Adaptation|null>;
  }) : void {
    const { type, period, adaptation$ } = value;

    switch (type) {

      case "video":
        if (!this._priv_trackManager) {
          log.error("API: TrackManager not instanciated for a new video period");
          adaptation$.next(null);
        } else {
          this._priv_trackManager.addPeriod(type, period, adaptation$);
          this._priv_trackManager.setInitialVideoTrack(period);
        }
        break;

      case "audio":
        if (!this._priv_trackManager) {
          log.error(`API: TrackManager not instanciated for a new ${type} period`);
          adaptation$.next(null);
        } else {
          this._priv_trackManager.addPeriod(type, period, adaptation$);
          this._priv_trackManager.setInitialAudioTrack(period);
        }
        break;

      case "text":
        if (!this._priv_trackManager) {
          log.error(`API: TrackManager not instanciated for a new ${type} period`);
          adaptation$.next(null);
        } else {
          this._priv_trackManager.addPeriod(type, period, adaptation$);
          this._priv_trackManager.setInitialTextTrack(period);
        }
        break;

      default:
        const adaptations = period.adaptations[type];
        if (adaptations && adaptations.length) {
          adaptation$.next(adaptations[0]);
        } else {
          adaptation$.next(null);
        }
        break;
    }
  }

  /**
   * Triggered each times the we "remove" a PeriodBuffer.
   * @param {Object} value
   * @private
   */
  private _priv_onPeriodBufferCleared(value : {
    type : IBufferType;
    period : IFetchedPeriod;
  }) : void {
    const { type, period } = value;

    // Clean-up track choice from TrackManager
    switch (type) {
      case "audio":
      case "text":
      case "video":
        if (this._priv_trackManager) {
          this._priv_trackManager.removePeriod(type, period);
        }
        break;
    }

    // Clean-up stored Representation and Adaptation information
    if (this._priv_contentInfos == null) {
      return ;
    }
    const { activeAdaptations, activeRepresentations } = this._priv_contentInfos;
    if (activeAdaptations && activeAdaptations[period.id]) {
      const activePeriodAdaptations = activeAdaptations[period.id];
      delete activePeriodAdaptations[type];
      if (!Object.keys(activePeriodAdaptations).length) {
        delete activeAdaptations[period.id];
      }
    }

    if (activeRepresentations && activeRepresentations[period.id]) {
      const activePeriodRepresentations = activeRepresentations[period.id];
      delete activePeriodRepresentations[type];
      if (!Object.keys(activePeriodRepresentations).length) {
        delete activeRepresentations[period.id];
      }
    }
  }

  /**
   * Triggered each time the content is re-loaded on the MediaSource.
   */
  private _priv_onReloadingMediaSource() {
    if (this._priv_trackManager) {
      this._priv_trackManager.resetPeriods();
    }
  }

  /**
   * Triggered each times a new Adaptation is considered for the current
   * content.
   * Store given Adaptation and emit it if from the current Period.
   * @param {Object} value
   * @private
   */
  private _priv_onAdaptationChange({
    type,
    adaptation,
    period,
  } : {
    type : IBufferType;
    adaptation : Adaptation|null;
    period : IFetchedPeriod;
  }) : void {
    if (!this._priv_contentInfos) {
      log.error("API: The adaptations changed but no content is loaded");
      return;
    }

    // lazily create this._priv_contentInfos.activeAdaptations
    if (!this._priv_contentInfos.activeAdaptations) {
      this._priv_contentInfos.activeAdaptations = {};
    }

    const { activeAdaptations, currentPeriod } = this._priv_contentInfos;
    const activePeriodAdaptations = activeAdaptations[period.id];
    if (!activePeriodAdaptations) {
      activeAdaptations[period.id] = { [type]: adaptation };
    } else {
      activePeriodAdaptations[type] = adaptation;
    }

    if (this._priv_trackManager &&
        currentPeriod != null && period != null &&
        period.id === currentPeriod.id
    ) {
      switch (type) {
        case "audio":
          const audioTrack = this._priv_trackManager.getChosenAudioTrack(currentPeriod);
          this._priv_triggerContentEvent("audioTrackChange", audioTrack);
          this._priv_triggerContentEvent("availableAudioBitratesChange",
                                         this.getAvailableVideoBitrates());
          break;
        case "text":
          const textTrack = this._priv_trackManager.getChosenTextTrack(currentPeriod);
          this._priv_triggerContentEvent("textTrackChange", textTrack);
          break;
        case "video":
          const videoTrack = this._priv_trackManager.getChosenVideoTrack(currentPeriod);
          this._priv_triggerContentEvent("videoTrackChange", videoTrack);
          this._priv_triggerContentEvent("availableVideoBitratesChange",
                                         this.getAvailableVideoBitrates());
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
   * @private
   */
  private _priv_onRepresentationChange({
    type,
    period,
    representation,
  }: {
    type : IBufferType;
    period : IFetchedPeriod;
    representation : Representation|null;
  }) : void {
    if (!this._priv_contentInfos) {
      log.error("API: The representations changed but no content is loaded");
      return;
    }

    // lazily create this._priv_contentInfos.activeRepresentations
    if (!this._priv_contentInfos.activeRepresentations) {
      this._priv_contentInfos.activeRepresentations = {};
    }

    const { activeRepresentations, currentPeriod } = this._priv_contentInfos;

    const activePeriodRepresentations = activeRepresentations[period.id];
    if (!activePeriodRepresentations) {
      activeRepresentations[period.id] = { [type]: representation };
    } else {
      activePeriodRepresentations[type] = representation;
    }

    const bitrate = representation && representation.bitrate;
    if (bitrate != null) {
      this._priv_bitrateInfos.lastBitrates[type] = bitrate;
    }

    if (period != null && currentPeriod != null && currentPeriod.id === period.id) {
      if (type === "video") {
        this._priv_triggerContentEvent("videoBitrateChange",
                                       bitrate != null ? bitrate : -1);
      } else if (type === "audio") {
        this._priv_triggerContentEvent("audioBitrateChange",
                                       bitrate != null ? bitrate : -1);
      }
    }
  }

  /**
   * Triggered each time a bitrate estimate is calculated.
   *
   * Emit it.
   *
   * @param {Object} value
   * @private
   */
  private _priv_onBitrateEstimationChange({
    type,
    bitrate,
  } : { type : IBufferType;
        bitrate : number|undefined; }
  ) : void {
    this._priv_triggerContentEvent("bitrateEstimationChange", { type, bitrate });
  }

  /**
   * Triggered each time the videoElement alternates between play and pause.
   *
   * Emit the info through the right Subject.
   *
   * @param {Boolean} isPlaying
   * @private
   */
  private _priv_onPlayPauseNext(isPlaying : boolean) : void {
    if (!this.videoElement) {
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
   * @private
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
   * @private
   */
  private _priv_setPlayerState(newState : string) : void {
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
   * @private
   */
  private _priv_triggerTimeChange(clockTick : IClockTick) : void {
    if (!this._priv_contentInfos) {
      log.warn("API: Cannot perform time update: no content loaded.");
      return;
    }

    if (this.state === PLAYER_STATES.RELOADING) {
      return;
    }

    const { isDirectFile, manifest } = this._priv_contentInfos;
    if ((!isDirectFile && manifest == null) || !clockTick) {
      return;
    }

    const positionData : IPositionUpdateItem = {
      position: clockTick.currentTime,
      duration: clockTick.duration,
      playbackRate: clockTick.playbackRate,

      // TODO fix higher up?
      bufferGap: isFinite(clockTick.bufferGap) ? clockTick.bufferGap :
                                                 0,
    };

    if (manifest != null &&
        manifest.isLive &&
        clockTick.currentTime > 0
    ) {
      positionData.wallClockTime = clockTick.currentTime +
                                   (manifest.availabilityStartTime || 0);
      positionData.liveGap = manifest.getMaximumPosition() - clockTick.currentTime;
    }

    this.trigger("positionUpdate", positionData);
  }
}
Player.version = /*PLAYER_VERSION*/"3.13.0";

export default Player;
