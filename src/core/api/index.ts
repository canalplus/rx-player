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
 * This file and directory defines the public API for the RxPlayer.
 *
 * It also starts the different sub-parts of the player on various API calls.
 */

import deepEqual from "deep-equal";
import {
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  ConnectableObservable,
  EMPTY,
  merge as observableMerge,
  Observable,
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
  publish,
  share,
  skipUntil,
  startWith,
  take,
  takeUntil,
} from "rxjs/operators";
import config from "../../config";
import log from "../../log";
import assert from "../../utils/assert";
import EventEmitter from "../../utils/eventemitter";
import Logger from "../../utils/logger";
import noop from "../../utils/noop";
import {
  getLeftSizeOfRange,
  getPlayedSizeOfRange,
  getSizeOfRange,
} from "../../utils/ranges";

import {
  exitFullscreen,
  isFullscreen,
  requestFullscreen,
} from "../../compat";
import {
  isInBackground$,
  onEnded$,
  onFullscreenChange$,
  onPlayPause$,
  onSeeking$,
  onTextTrackChanges$,
  videoWidth$,
} from "../../compat/events";
import {
  ErrorCodes,
  ErrorTypes,
} from "../../errors";
import features from "../../features";
import Manifest, {
  Adaptation,
  Period,
  Representation,
} from "../../manifest";
import {
  fromWallClockTime,
  getMaximumBufferPosition,
  getMinimumBufferPosition,
  toWallClockTime,
} from "../../manifest/timings";
import { IBifThumbnail } from "../../parsers/images/bif";
import ABRManager from "../abr";
import {
  clearEMESession,
  disposeEME,
  getCurrentKeySystem,
} from "../eme";
import { IBufferType } from "../source_buffers";
import Stream, {
  IStreamEvent,
} from "../stream";
import createClock, {
  IClockTick
} from "./clock";
import { PLAYER_STATES } from "./constants";
import getPlayerState from "./get_player_state";
import LanguageManager, {
  IAudioTrackPreference,
  ILMAudioTrack,
  ILMAudioTrackListItem,
  ILMTextTrack,
  ILMTextTrackListItem,
  ITextTrackPreference,
} from "./language_manager";
import {
  IConstructorOptions,
  ILoadVideoOptions,
  parseConstructorOptions,
  parseLoadVideoOptions,
} from "./option_parsers";

const {
  DEFAULT_UNMUTED_VOLUME,
} = config;

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

type PLAYER_EVENT_STRINGS =
  "playerStateChange" |
  "positionUpdate" |
  "audioTrackChange" |
  "textTrackChange" |
  "audioBitrateChange" |
  "videoBitrateChange" |
  "imageTrackUpdate" |
  "fullscreenChange" |
  "bitrateEstimationChange" |
  "volumeChange" |
  "error" |
  "warning" |
  "nativeTextTracksChange" |
  "manifestChange" |
  "manifestUpdate" |
  "periodChange";

/**
 * @class Player
 * @extends EventEmitter
 */
class Player extends EventEmitter<PLAYER_EVENT_STRINGS, any> {

  /**
   * Current version of the RxPlayer.
   * @type {string}
   */
  public static version = /*PLAYER_VERSION*/"3.5.1";
  public readonly version : string;

  /**
   * Video element attached to the RxPlayer.
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
  private readonly _priv_streamLock$ : BehaviorSubject<boolean>;

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
   * Store buffer-related infos and options used when calling the Stream.
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
    currentPeriod : Period|null;

    /**
     * Store currently considered adaptations, per active period.
     *
     * null if no adaptation is active
     * @type {Map}
     */
    activeAdaptations :
      Map<
        Period,
        Partial<Record<IBufferType, Adaptation|null>>
      > | null;

    /**
     * Store currently considered representations, per active period.
     *
     * null if no representation is active
     * @type {Map}
     */
    activeRepresentations :
      Map<
        Period,
        Partial<Record<IBufferType, Representation|null>>
      > | null;

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
   * LanguageManager instance linked to the current content.
   * Null if no content has been loaded or if the current content loaded
   * has no LanguageManager.
   * @private
   * @type {Object|null}
   */
  private _priv_languageManager : LanguageManager|null;

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
    period: null|Period; // current Period
    audioTrack: null|ILMAudioTrack; // audioTrack for the current Period
    textTrack: null|ILMTextTrack; // textTrack for the current Period
    videoBitrate: null|number; // audioBitrate for the current Period
    audioBitrate: null|number; // videoBitrate for the current Period
    bitrateEstimation: undefined|IBitrateEstimate; // last calculated bitrate
                                                   // estimation for a type
  };

  /**
   * Determines whether or not player should stop at the end of video playback.
   */
  private readonly _priv_stopAtEnd : boolean;

  /**
   * @returns {Object}
   */
  static get ErrorTypes() : Partial<Record<string, string>> {
    return ErrorTypes;
  }

  /**
   * @returns {Object}
   */
  static get ErrorCodes() : Partial<Record<string, string>> {
    return ErrorCodes;
  }

  /**
   * @returns {string} - current log level
   */
  static get LogLevel() : string {
    return log.getLevel();
  }

  /**
   * @param {string} logLevel - should be either (by verbosity ascending):
   *   - "NONE"
   *   - "ERROR"
   *   - "WARNING"
   *   - "INFO"
   *   - "DEBUG"
   * Any other value will be translated to "NONE".
   */
  static set LogLevel(logLevel : string) {
    log.setLevel(logLevel);
  }

  /**
   * Note: as the private state from this class can be pretty heavy, every
   * private properties should be initialized here for better visibility.
   * @constructor
   * @param {Object} options
   */
  constructor(options : IConstructorOptions = {}) {
    super();
    const {
      initialAudioBitrate,
      initialVideoBitrate,
      limitVideoWidth,
      maxAudioBitrate,
      maxBufferAhead,
      maxBufferBehind,
      maxVideoBitrate,
      throttleWhenHidden,
      videoElement,
      wantedBufferAhead,
      stopAtEnd,
    } = parseConstructorOptions(options);

    // Workaround to support Firefox autoplay on FF 42.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
    videoElement.preload = "auto";

    this.version = /*PLAYER_VERSION*/"3.5.1";
    this.log = log;
    this.state = "STOPPED";
    this.videoElement = videoElement;

    this._priv_destroy$ = new Subject();

    onFullscreenChange$(videoElement)
      .pipe(takeUntil(this._priv_destroy$))
      .subscribe(() => this.trigger("fullscreenChange", this.isFullscreen()));

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
    this._priv_streamLock$ = new BehaviorSubject(false);

    this._priv_bufferOptions = {
      wantedBufferAhead$: new BehaviorSubject(wantedBufferAhead),
      maxBufferAhead$: new BehaviorSubject(maxBufferAhead),
      maxBufferBehind$: new BehaviorSubject(maxBufferBehind),
    };

    this._priv_bitrateInfos = {
      lastBitrates: {
        audio: initialAudioBitrate,
        video: initialVideoBitrate,
      },
      initialMaxAutoBitrates: {
        audio: maxAudioBitrate,
        video: maxVideoBitrate,
      },
      manualBitrates: {
        audio: -1,
        video: -1,
      },
    };

    this._priv_throttleWhenHidden = throttleWhenHidden;
    this._priv_limitVideoWidth = limitVideoWidth;
    this._priv_mutedMemory = DEFAULT_UNMUTED_VOLUME;

    this._priv_languageManager = null;
    this._priv_abrManager = null;
    this._priv_currentError = null;
    this._priv_contentInfos = null;

    this._priv_contentEventsMemory = {
      period: null,
      audioTrack: null,
      textTrack: null,
      videoBitrate: null,
      audioBitrate: null,
      bitrateEstimation: undefined,
    };

    this._priv_stopAtEnd = stopAtEnd;

    this._priv_setPlayerState(PLAYER_STATES.STOPPED);
  }

  /**
   * Stop the player.
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
    this._priv_streamLock$.complete();
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
    log.info("loadvideo", options);

    const {
      autoPlay,
      defaultAudioTrack,
      defaultTextTrack,
      keySystems,
      networkConfig,
      startAt,
      supplementaryImageTracks,
      supplementaryTextTracks,
      transport,
      transportOptions,
      url,
    } = options;

    // Perform multiple checks on the given options
    if (!this.videoElement) {
      throw new Error("the attached video element is disposed");
    }

    // now that every check has passed, stop previous content
    // TODO First stop?
    this.stop();

    const isDirectFile = transport === "directfile";

    this._priv_currentError = null;
    this._priv_contentInfos = {
      url,
      isDirectFile,
      thumbnails: null,
      manifest: null,
      currentPeriod: null,
      activeAdaptations: null,
      activeRepresentations: null,
      initialAudioTrack: defaultAudioTrack,
      initialTextTrack: defaultTextTrack,
    };

    // inilialize to false
    this._priv_playing$.next(false);

    // get every properties used from context for clarity
    const videoElement = this.videoElement;

    /**
     * Global clock used for the whole application.
     * @type {Observable.<Object>}
     */
    const clock$ = createClock(videoElement, {
      withMediaSource: !isDirectFile,
    });

    const closeStream$ = observableMerge(
      this._priv_stopCurrentContent$,
      this._priv_stopAtEnd ? onEnded$(videoElement) : EMPTY
    ).pipe(take(1));

    let stream : ConnectableObservable<IStreamEvent>;

    if (!isDirectFile) {
      const transportFn = features.transports[transport];
      if (!transportFn) {
        throw new Error(`transport "${transport}" not supported`);
      }

      const transportObj = transportFn(transportOptions);

      /**
       * Options used by the ABR Manager.
       * @type {Object}
       */
      const adaptiveOptions = {
        initialBitrates: this._priv_bitrateInfos.lastBitrates,
        manualBitrates: this._priv_bitrateInfos.manualBitrates,
        maxAutoBitrates: this._priv_bitrateInfos.initialMaxAutoBitrates,
        throttle: this._priv_throttleWhenHidden ? {
          video: isInBackground$()
          .pipe(
            map(isBg => isBg ? 0 : Infinity),
            takeUntil(this._priv_stopCurrentContent$)
          ),
        } : {},
        limitWidth: this._priv_limitVideoWidth ? {
          video: videoWidth$(videoElement)
            .pipe(takeUntil(this._priv_stopCurrentContent$)),
        } : {},
      };

      /**
       * Options used by the TextTrack SourceBuffer
       * @type {Object}
       */
      const textTrackOptions = options.textTrackMode === "native" ? {
        textTrackMode: "native" as "native",
        hideNativeSubtitle: options.hideNativeSubtitle,
      } : {
        textTrackMode: "html" as "html",
        textTrackElement: options.textTrackElement,
      };

      // Stream Observable, through which the content will be launched.
      stream = Stream({
        adaptiveOptions,
        autoPlay,
        bufferOptions: this._priv_bufferOptions,
        clock$,
        keySystems,
        networkConfig,
        speed$: this._priv_speed$,
        startAt,
        supplementaryImageTracks,
        supplementaryTextTracks,
        textTrackOptions,
        transport: transportObj,
        url,
        videoElement,
      })
        .pipe(takeUntil(closeStream$))
        .pipe(publish()) as ConnectableObservable<IStreamEvent>;
    } else {
      if (features.directfile == null) {
        throw new Error("DirectFile feature not activated in your build.");
      }
      stream = features.directfile({
        autoPlay,
        clock$,
        keySystems,
        mediaElement: videoElement,
        speed$: this._priv_speed$,
        startAt,
        url,
      })
        .pipe(takeUntil(closeStream$))
        .pipe(publish()) as ConnectableObservable<IStreamEvent>;
    }

    /**
     * Emit a truthy value when the player stalls, a falsy value as it unstalls.
     * TODO Find a way with TS
     * @type {Observable}
     */
    const stalled$ = stream
      .pipe(
        filter(({ type }) => type === "stalled"),
        map(x => x.value)
      )  as Observable<null|{ reason : string }>;

    /**
     * Emit when the stream is considered "loaded".
     * @type {Observable}
     */
    const loaded = stream
      .pipe(
        filter(({ type }) => type === "loaded"),
        take(1),
        share()
      );

    /**
     * Emit when the media element emits an "ended" event.
     * @type {Observable}
     */
    const endedEvent$ = onEnded$(videoElement)
      .pipe(mapTo(null));

    /**
     * Emit when the media element emits a "seeking" event.
     * @type {Observable}
     */
    const seekingEvent$ = onSeeking$(videoElement)
      .pipe(mapTo(null));

    /**
     * Emit the player state as it changes.
     * TODO only way to call setPlayerState?
     * @type {Observable.<string>}
     */
    const stateChanges$ = observableConcat(
      loaded.pipe(mapTo(PLAYER_STATES.LOADED)),

      observableCombineLatest(
        this._priv_playing$,
        stalled$.pipe(startWith(null as { reason : string }|null)),
        endedEvent$.pipe(startWith(null)),
        seekingEvent$.pipe(startWith(null))
      )
      .pipe(
        takeUntil(this._priv_stopCurrentContent$),
        map(([isPlaying, stalledStatus]) => {
          return getPlayerState(videoElement, isPlaying, stalledStatus);
        }),

        // begin emitting those only when the content start to play
        skipUntil(
          this._priv_playing$
          .pipe(filter(isPlaying => isPlaying))
        )
      )
    ).pipe(distinctUntilChanged(), startWith(PLAYER_STATES.LOADING));

    /**
     * Emit true each time the player goes into a "play" state.
     * @type {Observable.<Boolean>}
     */
    const videoPlays$ = onPlayPause$(videoElement)
      .pipe(map(evt => evt.type === "play"));

    let streamDisposable : Subscription|undefined;
    this._priv_stopCurrentContent$
      .pipe(take(1))
      .subscribe(() => {
        if (streamDisposable) {
          streamDisposable.unsubscribe();
        }
      });

    videoPlays$
      .pipe(takeUntil(this._priv_stopCurrentContent$))
      .subscribe(x => this._priv_onPlayPauseNext(x), noop);

    clock$
      .pipe(takeUntil(this._priv_stopCurrentContent$))
      .subscribe(x => this._priv_triggerTimeChange(x), noop);

    stateChanges$
      .pipe(takeUntil(this._priv_stopCurrentContent$))
      .subscribe(x => this._priv_setPlayerState(x), noop);

    stream.subscribe(
      (x) => this._priv_onStreamNext(x),
      (err : Error) => this._priv_onStreamError(err),
      () => this._priv_onStreamComplete()
    );

    // connect the stream when the lock is inactive
    this._priv_streamLock$
      .pipe(
        filter((isLocked) => !isLocked),
        take(1),
        takeUntil(this._priv_stopCurrentContent$)
      )
      .subscribe(() => {
        streamDisposable = stream.connect();
      });
  }

  /**
   * Returns fatal error if one for the current content. null otherwise.
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
    return this._priv_contentInfos && this._priv_contentInfos.manifest;
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
    const {
      currentPeriod,
      activeAdaptations,
    } = this._priv_contentInfos;
    if (!currentPeriod || !activeAdaptations) {
      return null;
    }
    return activeAdaptations.get(currentPeriod) || null;
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
    const {
      currentPeriod,
      activeRepresentations,
    } = this._priv_contentInfos;
    if (!currentPeriod || !activeRepresentations) {
      return null;
    }
    return activeRepresentations.get(currentPeriod) || null;
  }

  /**
   * Returns the video DOM element used by the player.
   * You should not its HTML5 API directly and use the player's method instead,
   * to ensure a well-behaved player.
   * @returns {HTMLMediaElement|null}
   */
  getVideoElement() : HTMLMediaElement|null {
    return this.videoElement;
  }

  /**
   * Returns the text-track element used by the player to inject subtitles.
   * @returns {TextTrack}
   */
  getNativeTextTrack() : TextTrack|null {
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
   * Returns true if:
   *   - a content is loaded
   *   - the content is a live content
   * @returns {Boolean}
   */
  isLive() : boolean {
    if (!this._priv_contentInfos) {
      return false;
    }
    const {
      isDirectFile,
      manifest,
    } = this._priv_contentInfos;
    if (isDirectFile || !manifest) {
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
    const {
      isDirectFile,
      manifest,
      url,
    } = this._priv_contentInfos;
    if (isDirectFile) {
      return url;
    }
    if (manifest) {
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

    const {
      isDirectFile,
      manifest,
    } = this._priv_contentInfos;
    if (isDirectFile) {
      return this.videoElement.currentTime;
    }
    if (manifest) {
      const currentTime = this.videoElement.currentTime;
      return this.isLive() ?
        (+toWallClockTime(currentTime, manifest) / 1000) :
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
   * @returns {Number}
   */
  getVolume() : number {
    if (!this.videoElement) {
      throw new Error("Disposed player");
    }
    return this.videoElement.volume;
  }

  /**
   * @returns {Boolean}
   */
  isFullscreen() : boolean {
    return isFullscreen();
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableVideoBitrates() : number[] {
    if (!this._priv_contentInfos) {
      return [];
    }
    const {
      currentPeriod,
      activeAdaptations,
    } = this._priv_contentInfos;
    if (!currentPeriod || !activeAdaptations) {
      return [];
    }
    const adaptations = activeAdaptations.get(currentPeriod);
    const videoAdaptation = adaptations && adaptations.video;
    if (!videoAdaptation) {
      return [];
    }

    return videoAdaptation.representations
      .map(({ bitrate }) => bitrate);
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableAudioBitrates() : number[] {
    if (!this._priv_contentInfos) {
      return [];
    }
    const {
      currentPeriod,
      activeAdaptations,
    } = this._priv_contentInfos;
    if (!currentPeriod || !activeAdaptations) {
      return [];
    }
    const adaptations = activeAdaptations.get(currentPeriod);
    const audioAdaptation = adaptations && adaptations.audio;
    if (!audioAdaptation) {
      return [];
    }

    return audioAdaptation.representations
      .map(({ bitrate }) => bitrate);
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
   */
  play() : void {
    if (!this.videoElement) {
      throw new Error("Disposed player");
    }
    /* tslint:disable no-floating-promises */
    this.videoElement.play();
    /* tslint:enable no-floating-promises */
  }

  /**
   * Pause playback of the video.
   */
  pause() : void {
    if (!this.videoElement) {
      throw new Error("Disposed player");
    }
    this.videoElement.pause();
  }

  /**
   * Update the playback rate of the video.
   * @param {Number} rate
   */
  setPlaybackRate(rate : number) : void {
    this._priv_speed$.next(rate);
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

    const {
      isDirectFile,
      manifest,
    } = this._priv_contentInfos;
    if (!isDirectFile && !manifest) {
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
          fromWallClockTime(
            (time as { wallClockTime : number }).wallClockTime * 1000,
            manifest as Manifest // is TS or I dumb here?
          );
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

  exitFullscreen() : void {
    exitFullscreen();
  }

  /**
   * Set/exit fullScreen.
   * @param {Boolean} [goFull=true] - if false, exit full screen.
   */
  setFullscreen(goFull : boolean = true) : void {
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
   * Set the player's volume. From 0 (muted volume) to 1 (maximum volume).
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
  getAvailableAudioTracks() : ILMAudioTrackListItem[] {
    if (!this._priv_contentInfos) {
      return [];
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_languageManager || !currentPeriod) {
      return [];
    }
    return this._priv_languageManager.getAvailableAudioTracks(currentPeriod);
  }

  /**
   * Returns every available text tracks for the current Period.
   * @returns {Array.<Object>|null}
   */
  getAvailableTextTracks() : ILMTextTrackListItem[] {
    if (!this._priv_contentInfos) {
      return [];
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_languageManager || !currentPeriod) {
      return [];
    }
    return this._priv_languageManager.getAvailableTextTracks(currentPeriod);
  }

  /**
   * Returns currently chosen audio language for the current Period.
   * @returns {string}
   */
  getAudioTrack() : ILMAudioTrack|null|undefined {
    if (!this._priv_contentInfos) {
      return undefined;
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_languageManager || !currentPeriod) {
      return undefined;
    }
    return this._priv_languageManager.getChosenAudioTrack(currentPeriod);
  }

  /**
   * Returns currently chosen subtitle for the current Period.
   * @returns {string}
   */
  getTextTrack() : ILMTextTrack|null|undefined {
    if (!this._priv_contentInfos) {
      return undefined;
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_languageManager || !currentPeriod) {
      return undefined;
    }
    return this._priv_languageManager.getChosenTextTrack(currentPeriod);
  }

  /**
   * Update the audio language for the current Period.
   * @param {string} audioId
   * @throws Error - the current content has no LanguageManager.
   * @throws Error - the given id is linked to no audio track.
   */
  setAudioTrack(audioId : string) : void {
    if (!this._priv_contentInfos) {
      throw new Error("No content loaded");
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_languageManager || !currentPeriod) {
      throw new Error("No compatible content launched.");
    }
    try {
      this._priv_languageManager.setAudioTrackByID(currentPeriod, audioId);
    }
    catch (e) {
      throw new Error("player: unknown audio track");
    }
  }

  /**
   * Update the text language for the current Period.
   * @param {string} sub
   * @throws Error - the current content has no LanguageManager.
   * @throws Error - the given id is linked to no text track.
   */
  setTextTrack(textId : string) : void {
    if (!this._priv_contentInfos) {
      throw new Error("No content loaded");
    }
    const { currentPeriod } = this._priv_contentInfos;
    if (!this._priv_languageManager || !currentPeriod) {
      throw new Error("No compatible content launched.");
    }
    try {
      this._priv_languageManager.setTextTrackByID(currentPeriod, textId);
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
    if (!this._priv_languageManager || !currentPeriod) {
      return;
    }
    return this._priv_languageManager.disableTextTrack(currentPeriod);
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
    if (manifest) {
      return getMinimumBufferPosition(manifest);
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

    const {
      isDirectFile,
      manifest,
    } = this._priv_contentInfos;

    if (isDirectFile) {
      if (!this.videoElement) {
        throw new Error("Disposed player");
      }
      return this.videoElement.duration;
    }

    if (manifest) {
      return getMaximumBufferPosition(manifest);
    }
    return null;
  }

  /**
   * Reset all state properties relative to a playing content.
   */
  private _priv_cleanUpCurrentContentState() : void {
    // lock creation of new streams while cleaning up is pending
    this._priv_streamLock$.next(true);

    this._priv_contentInfos = null;
    this._priv_languageManager = null;

    if (this._priv_abrManager) {
      this._priv_abrManager.dispose();
      this._priv_abrManager = null;
    }

    this._priv_contentEventsMemory = {
      period: null,
      audioTrack: null,
      textTrack: null,
      videoBitrate: null,
      audioBitrate: null,
      bitrateEstimation: undefined,
    };

    // EME cleaning
    const freeUpStreamLock = () => {
      this._priv_streamLock$.next(false);
    };

    if (this.videoElement) {
      clearEMESession(this.videoElement)
        .pipe(catchError(() => EMPTY))
        .subscribe(noop, freeUpStreamLock, freeUpStreamLock);
    } else {
      freeUpStreamLock();
    }
  }

  /**
   * Store and emit new player state (e.g. text track, videoBitrate...).
   * We check for deep equality to avoid emitting 2 consecutive times the same
   * state.
   * @param {string} type - the type of the updated state (videoBitrate...)
   * @param {*} value - its new value
   */
  private _priv_triggerContentEvent(
    type : "audioTrack",
    value : ILMAudioTrack|null
  ) : void;
  private _priv_triggerContentEvent(
    type : "textTrack",
    value : ILMTextTrack|null
  ) : void;
  private _priv_triggerContentEvent(
    type : "period",
    value : Period
  ) : void;
  private _priv_triggerContentEvent(
    type : "bitrateEstimation",
    value : IBitrateEstimate
  ) : void;
  private _priv_triggerContentEvent(
    type : "videoBitrate"|"audioBitrate",
    value : number|null
  ) : void;
  private _priv_triggerContentEvent(
    type :
      "audioTrack" |
      "textTrack" |
      "period" |
      "videoBitrate" |
      "audioBitrate" |
      "bitrateEstimation",
    value : ILMAudioTrack|ILMTextTrack|Period|IBitrateEstimate|number|null
  ) : void {
    const prev = this._priv_contentEventsMemory[type];
    if (!deepEqual(prev, value)) {
      this._priv_contentEventsMemory[type] = value;

      // SAD
      this.trigger(type + "Change" as PLAYER_EVENT_STRINGS, value);
    }
  }

  /**
   * Triggered each time the Stream Observable emits.
   *
   * React to various events.
   *
   * @param {Object} streamInfos - payload emitted
   */
  private _priv_onStreamNext(streamInfos : IStreamEvent) : void {
    switch (streamInfos.type) {
      case "activePeriodChanged":
        this._priv_onActivePeriodChanged(streamInfos.value);
        break;
      case "periodBufferReady":
        this._priv_onPeriodBufferReady(streamInfos.value);
        break;
      case "periodBufferCleared":
        this._priv_onPeriodBufferCleared(streamInfos.value);
        break;
      case "representationChange":
        this._priv_onRepresentationChange(streamInfos.value);
        break;
      case "adaptationChange":
        this._priv_onAdaptationChange(streamInfos.value);
        break;
      case "manifestUpdate":
        this._priv_onManifestUpdate(streamInfos.value);
        break;
      case "bitrateEstimationChange":
        this._priv_onBitrateEstimationChange(streamInfos.value);
        break;
      case "manifestReady":
        this._priv_onManifestReady(streamInfos.value);
        break;
      case "warning":
        this._priv_onStreamWarning(streamInfos.value);
        break;
      case "added-segment":

        if (!this._priv_contentInfos) {
          log.error("Added segment while no content is loaded");
          return;
        }

        // Manage image tracks
        // TODO Better way? Perhaps linked to an ImageSourceBuffer
        // implementation
        const { bufferType, segmentData } = streamInfos.value;
        if (bufferType === "image") {
          if (segmentData != null && segmentData.type === "bif") {
            const imageData = segmentData.data as IBifThumbnail[];

            // TODO merge multiple data from the same track together
            this._priv_contentInfos.thumbnails = imageData;
            this.trigger("imageTrackUpdate", {
              data: this._priv_contentInfos.thumbnails,
            });
          }
        }
    }
  }

  /**
   * Triggered when the Stream throws (fatal errors).
   *
   * Clean-up ressources and signal that the content has stopped on error.
   *
   * @param {Error} error
   */
  private _priv_onStreamError(error : Error) : void {
    this._priv_stopCurrentContent$.next();
    this._priv_cleanUpCurrentContentState();
    this._priv_currentError = error;
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
   * Triggered when the Stream instance ends.
   *
   * Clean-up ressources and signal that the content has ended.
   */
  private _priv_onStreamComplete() : void {
    this._priv_stopCurrentContent$.next();
    this._priv_cleanUpCurrentContentState();
    this._priv_setPlayerState(PLAYER_STATES.ENDED);
  }

  /**
   * Triggered when the Stream emits a warning.
   *
   * Trigger the right Player event.
   * @param {Object} streamInfos
   */
  private _priv_onStreamWarning(error : Error) : void {
    this.trigger("warning", error);
  }

  /**
   * Triggered when the stream starts.
   *
   * Initialize various private properties and emit initial event.
   *
   * @param {Object} value
   */
  private _priv_onManifestReady(value : {
    abrManager : ABRManager;
    manifest : Manifest;
  }) : void {
    if (!this._priv_contentInfos) {
      log.error("The manifest is loaded but no content is.");
      return;
    }
    const { manifest, abrManager } = value;
    this._priv_contentInfos.manifest = manifest;
    this._priv_abrManager = abrManager;

    const {
      initialAudioTrack,
      initialTextTrack,
    } = this._priv_contentInfos;
    this._priv_languageManager = new LanguageManager({
      preferredAudioTracks: initialAudioTrack === undefined ?
        undefined : [initialAudioTrack],
      preferredTextTracks: initialTextTrack === undefined ?
        undefined : [initialTextTrack],
    });
    this.trigger("manifestChange", manifest);
  }

  /**
   * Triggered each times the current Period Changed.
   *
   * Store and emit initial state for the Period.
   *
   * @param {Object} value
   */
  private _priv_onActivePeriodChanged({ period } : { period : Period }) : void {
    if (!this._priv_contentInfos) {
      log.error("The active period changed but no content is loaded");
      return;
    }
    this._priv_contentInfos.currentPeriod = period;
    this._priv_triggerContentEvent("period", period);

    // Emit intial events for the Period
    if (this._priv_languageManager) {
      const audioTrack = this._priv_languageManager.getChosenAudioTrack(period);
      const textTrack = this._priv_languageManager.getChosenTextTrack(period);

      this._priv_triggerContentEvent("audioTrack", audioTrack);
      this._priv_triggerContentEvent("textTrack", textTrack);
    } else {
      this._priv_triggerContentEvent("audioTrack", null);
      this._priv_triggerContentEvent("textTrack", null);
    }

    const activeAudioRepresentations = this.getCurrentRepresentations();
    if (activeAudioRepresentations && activeAudioRepresentations.audio != null) {
      const bitrate = activeAudioRepresentations.audio.bitrate;
      this._priv_triggerContentEvent("audioBitrate", bitrate != null ? bitrate : -1);
    } else {
      this._priv_triggerContentEvent("audioBitrate", null);
    }

    const activeVideoRepresentations = this.getCurrentRepresentations();
    if (activeVideoRepresentations && activeVideoRepresentations.video != null) {
      const bitrate = activeVideoRepresentations.video.bitrate;
      this._priv_triggerContentEvent("videoBitrate", bitrate != null ? bitrate : -1);
    } else {
      this._priv_triggerContentEvent("videoBitrate", null);
    }
  }

  /**
   * Triggered each times the Stream "prepares" a new Period, and
   * needs the API to send it its chosen Adaptation.
   *
   * Choose the right Adaptation for the Period and emit it.
   *
   * @param {Object} value
   */
  private _priv_onPeriodBufferReady(value : {
    type : IBufferType;
    period : Period;
    adaptation$ : Subject<Adaptation|null>;
  }) : void {
    const { type, period, adaptation$ } = value;

    switch (type) {

      case "audio":
        if (!this._priv_languageManager) {
          log.error(`LanguageManager not instanciated for a new ${type} period`);
          adaptation$.next(null);
        } else {
          this._priv_languageManager.addPeriod(type, period, adaptation$);
          this._priv_languageManager.setInitialAudioTrack(period);
        }
        break;

      case "text":
        if (!this._priv_languageManager) {
          log.error(`LanguageManager not instanciated for a new ${type} period`);
          adaptation$.next(null);
        } else {
          this._priv_languageManager.addPeriod(type, period, adaptation$);
          this._priv_languageManager.setInitialTextTrack(period);
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
   * Triggered each times the Stream "removes" a Period.
   *
   * Update the LanguageManager to remove the corresponding Period.
   *
   * @param {Object} value
   */
  private _priv_onPeriodBufferCleared(value : {
    type : IBufferType;
    period : Period;
  }) : void {
    const { type, period } = value;

    if (type === "audio" || type === "text") {
      if (this._priv_languageManager) {
        this._priv_languageManager.removePeriod(type, period);
      }
    }
  }

  /**
   * Triggered each times the Manifest is updated.
   *
   * Update the LanguageManager and emit events.
   *
   * @param {Object} value
   */
  private _priv_onManifestUpdate(value : { manifest : Manifest }) : void {
    if (!this._priv_contentInfos) {
      log.error("The manifest is updated but no content is loaded.");
      return;
    }
    const { manifest } = value;
    this._priv_contentInfos.manifest = manifest;

    // Update the languages chosen if it changed
    if (this._priv_languageManager) {
      this._priv_languageManager.update();
    }

    this.trigger("manifestUpdate", manifest);
  }

  /**
   * Triggered each times a new Adaptation is considered by the Stream.
   *
   * Store given Adaptation and emit it if from the current Period.
   *
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
    if (!this._priv_contentInfos) {
      log.error("The adaptations changed but no content is loaded");
      return;
    }

    // lazily create this._priv_contentInfos.activeAdaptations
    if (!this._priv_contentInfos.activeAdaptations) {
      this._priv_contentInfos.activeAdaptations = new Map();
    }

    const {
      activeAdaptations,
      currentPeriod,
    } = this._priv_contentInfos;

    const activePeriodAdaptations = activeAdaptations.get(period);
    if (!activePeriodAdaptations) {
      activeAdaptations.set(period, { [type]: adaptation });
    } else {
      activePeriodAdaptations[type] = adaptation;
    }

    if (
      this._priv_languageManager &&
      period != null && period === currentPeriod
    ) {
      if (type === "audio") {
        const audioTrack = this._priv_languageManager
          .getChosenAudioTrack(currentPeriod);
        this._priv_triggerContentEvent("audioTrack", audioTrack);
      } else if (type === "text") {
        const textTrack = this._priv_languageManager
          .getChosenTextTrack(currentPeriod);
        this._priv_triggerContentEvent("textTrack", textTrack);
      }
    }
  }

  /**
   * Triggered each times a new Representation is considered by the Stream.
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
    if (!this._priv_contentInfos) {
      log.error("The representations changed but no content is loaded");
      return;
    }

    // lazily create this._priv_contentInfos.activeRepresentations
    if (!this._priv_contentInfos.activeRepresentations) {
      this._priv_contentInfos.activeRepresentations = new Map();
    }

    const {
      activeRepresentations,
      currentPeriod,
    } = this._priv_contentInfos;

    const activePeriodRepresentations = activeRepresentations.get(period);
    if (!activePeriodRepresentations) {
      activeRepresentations.set(period, { [type]: representation });
    } else {
      activePeriodRepresentations[type] = representation;
    }

    const bitrate = representation && representation.bitrate;
    if (bitrate != null) {
      this._priv_bitrateInfos.lastBitrates[type] = bitrate;
    }

    if (period != null && currentPeriod === period) {
      if (type === "video") {
        this._priv_triggerContentEvent("videoBitrate", bitrate != null ? bitrate : -1);
      } else if (type === "audio") {
        this._priv_triggerContentEvent("audioBitrate", bitrate != null ? bitrate : -1);
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
  } : {
    type : IBufferType;
    bitrate : number|undefined;
  }) : void {
    if (__DEV__) {
      assert(type != null);
      assert(bitrate != null);
    }
    this._priv_triggerContentEvent("bitrateEstimation", { type, bitrate });
  }

  /**
   * Triggered each time the videoElement alternates between play and pause.
   *
   * Emit the info through the right Subject.
   *
   * @param {Boolean} isPlaying
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
  private _priv_setPlayerState(newState : string) : void {
    if (this.state !== newState) {
      this.state = newState;
      log.info("playerStateChange", newState);
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
  private _priv_triggerTimeChange(clockTick : IClockTick) : void {
    if (!this._priv_contentInfos) {
      log.warn("Cannot perform time update: no content loaded.");
      return;
    }

    const {
      isDirectFile,
      manifest,
    } = this._priv_contentInfos;
    if ((!isDirectFile && !manifest) || !clockTick) {
      return;
    }

    const positionData : IPositionUpdateItem = {
      position: clockTick.currentTime,
      duration: clockTick.duration,
      playbackRate: clockTick.playbackRate,

      // TODO fix higher up?
      bufferGap: isFinite(clockTick.bufferGap) ? clockTick.bufferGap : 0,
    };

    if (
      manifest &&
      manifest.isLive &&
      clockTick.currentTime > 0
    ) {
      positionData.wallClockTime =
        toWallClockTime(clockTick.currentTime, manifest)
          .getTime() / 1000;
      positionData.liveGap =
        getMaximumBufferPosition(manifest) - clockTick.currentTime;
    }

    this.trigger("positionUpdate", positionData);
  }
}

export default Player;
