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
 * This file defines the public player API
 */

import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";
import { BehaviorSubject } from "rxjs/BehaviorSubject";

import config from "../../config.js";

import log from "../../utils/log";
import onEvent from "../../utils/rx-onEvent.js";
import EventEmitter from "../../utils/eventemitter";
import assert from "../../utils/assert";
import {
  getLeftSizeOfRange,
  getSizeOfRange,
  getPlayedSizeOfRange,
} from "../../utils/ranges.js";

import {
  HTMLVideoElement_,
  exitFullscreen,
  requestFullscreen,
  isFullscreen,
} from "../../compat";
import {
  fullscreenChange as fullscreenChange$,
  inBackground as inBackground$,
  videoWidth as videoWidth$,
} from "../../compat/events.js";
import Transports from "../../net";
import {
  toWallClockTime,
  fromWallClockTime,
  getMaximumBufferPosition,
  getMinimumBufferPosition,
} from "../../manifest/timings.js";
import {
  ErrorTypes,
  ErrorCodes,
} from "../../errors";

import Stream from "../stream/index.js";
import { dispose as emeDispose , getCurrentKeySystem } from "../eme";

import { PLAYER_STATES } from "./constants.js";
import createClock from "./clock.js";
import attachPrivateMethods from "./private.js";
import inferPlayerState from "./infer_player_state.js";
import {
  parseConstructorOptions,
  parseLoadVideoOptions,
} from "./option_parsers.js";

const {
  DEFAULT_UNMUTED_VOLUME,
} = config;

/**
 * @param {Observable} stream
 * @param {string} type
 * @returns {Observable}
 */
function filterStreamByType(stream, type) {
  return stream
    .filter((o) => o.type == type)
    .map((o) => o.value);
}

/**
 * @class Player
 * @extends EventEmitter
 */
class Player extends EventEmitter {
  /**
   * @returns {Object}
   */
  static get ErrorTypes() {
    return ErrorTypes;
  }

  /**
   * @returns {Object}
   */
  static get ErrorCodes() {
    return ErrorCodes;
  }

  /**
   * Note: as the private state from this class can be pretty heavy, every
   * private properties should be initialized here for better visibility.
   * @param {Object} options
   * @param {HTMLVideoElement_} options.videoElement
   */
  constructor(options) {
    super();
    const {
      defaultAudioTrack,
      defaultTextTrack,
      initialAudioBitrate,
      initialVideoBitrate,
      limitVideoWidth,
      maxAudioBitrate,
      maxBufferAhead,
      maxBufferBehind,
      maxVideoBitrate,
      throttleWhenHidden,
      transport,
      transportOptions,
      videoElement,
      wantedBufferAhead,
    } = parseConstructorOptions(options);

    assert((videoElement instanceof HTMLVideoElement_),
      "videoElement needs to be an HTMLVideoElement");

    // Workaround to support Firefox autoplay on FF 42.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
    videoElement.preload = "auto";

    this.version = /*PLAYER_VERSION*/"3.0.0-rc1";
    this.log = log;
    this.state = undefined;
    this.defaultTransport = transport;
    this.defaultTransportOptions = transportOptions;
    this.videoElement = videoElement;

    this._priv = attachPrivateMethods(this);

    this._priv.destroy$ = new Subject();
    this._priv.fullScreenSubscription = fullscreenChange$(videoElement)
      .takeUntil(this._priv.destroy$)
      .subscribe(() => this.trigger("fullscreenChange", this.isFullscreen()));

    // TODO Use regular Stream observable for that
    this._priv.errorStream$ = new Subject() // Emits warnings
      .takeUntil(this._priv.destroy$);

    // emit true when the player plays, false when it pauses
    this._priv.playing$ = new BehaviorSubject();

    // last speed set by the user
    this._priv.speed$ = new BehaviorSubject(videoElement.playbackRate);

    // clean ressources from loaded content
    this._priv.clearLoadedContent$ = new Subject()
      .takeUntil(this._priv.destroy$);

    // @deprecated
    this._priv.imageTrack$ = new Subject()
      .takeUntil(this._priv.destroy$);

    this._priv.wantedBufferAhead$ = new BehaviorSubject(wantedBufferAhead);
    this._priv.maxBufferAhead$ = new BehaviorSubject(maxBufferAhead);
    this._priv.maxBufferBehind$ = new BehaviorSubject(maxBufferBehind);

    // keep track of the last set audio/text track
    this._priv.lastAudioTrack = defaultAudioTrack;
    this._priv.lastTextTrack = defaultTextTrack;

    // keep track of the last adaptive options
    this._priv.lastBitrates = {
      audio: initialAudioBitrate,
      video: initialVideoBitrate,
    };
    this._priv.initialMaxAutoBitrates = {
      audio: maxAudioBitrate,
      video: maxVideoBitrate,
    };
    this._priv.manualBitrates = {
      audio: -1,
      video: -1,
    };

    // adaptive initial private state
    this._priv.throttleWhenHidden = throttleWhenHidden;
    this._priv.limitVideoWidth = limitVideoWidth;

    this._priv.mutedMemory = DEFAULT_UNMUTED_VOLUME;

    // private state set later
    [
      "abrManager", "currentAdaptations", "currentImagePlaylist",
      "currentRepresentations", "fatalError", "initialAudioTrack",
      "initialTextTrack", "languageManager", "manifest", "recordedEvents",
    ].forEach(key => {
      this._priv[key] = undefined;
    });

    // populate initial values for content-related state
    this._priv.resetContentState();

    this._priv.setPlayerState(PLAYER_STATES.STOPPED);
  }

  /**
   * Stop the player.
   */
  stop() {
    if (this.state !== PLAYER_STATES.STOPPED) {
      this._priv.resetContentState();
      this._priv.clearLoadedContent$.next();
      this._priv.setPlayerState(PLAYER_STATES.STOPPED);
    }
  }

  /**
   * Free the resources used by the player.
   */
  dispose() {
    // free resources linked to the loaded content
    this.stop();

    // free resources used for EME management
    emeDispose();

    const { _priv } = this;

    // free resources linked to the Player instance
    _priv.destroy$.next();
    _priv.destroy$.complete();

    // clean up BehaviorSubjects
    _priv.playing$.complete();
    _priv.speed$.complete();
    _priv.wantedBufferAhead$.complete();
    _priv.maxBufferAhead$.complete();
    _priv.maxBufferBehind$.complete();

    // clean up potentially heavy objects
    _priv.playing$ = null;
    _priv.speed$ = null;
    _priv.wantedBufferAhead$ = null;
    _priv.maxBufferAhead$ = null;
    _priv.maxBufferBehind$ = null;
    _priv.clearLoadedContent$ = null;
    _priv.imageTrack$ = null;
    _priv.fullScreenSubscription = null;
    _priv.errorStream$ = null;
    _priv.lastBitrates = null;
    _priv.manualBitrates = null;
    _priv.initialMaxAutoBitrates = null;
    this.videoElement = null;
  }

  /**
   * Load a new video.
   * @param {Object} options
   * @returns {Observable}
   * @throws Error - throws if no url is given.
   * @throws Error - throws if no transport is given and no default transport
   * has been set.
   * @throws Error - throws if the asked transport does not exist
   */
  loadVideo(options = {}) {
    options = parseLoadVideoOptions(options, this);
    log.info("loadvideo", options);

    const {
      autoPlay,
      defaultAudioTrack,
      defaultTextTrack,
      hideNativeSubtitle,
      keySystems,
      startAt,
      supplementaryImageTracks,
      supplementaryTextTracks,
      transport,
      transportOptions,
      url,
    } = options;

    assert(url, "you have to give an url");
    assert(transport, "you have to set the transport type");

    const Transport = Transports[transport];
    assert(Transport, `transport "${transport}" not supported`);
    const transportObj = Transport(transportOptions);

    this.stop();

    this._priv.initialAudioTrack = defaultAudioTrack;
    this._priv.initialTextTrack = defaultTextTrack;

    this._priv.playing$.next(autoPlay);

    const { videoElement } = this;
    const {
      errorStream$: errorStream,
      clearLoadedContent$,
      wantedBufferAhead$,
      maxBufferAhead$,
      maxBufferBehind$,
    } = this._priv;

    const withMediaSource = !transport.directFile;
    const timings$ = createClock(videoElement, { withMediaSource });

    const adaptiveOptions = {
      initialBitrates: this._priv.lastBitrates,
      manualBitrates: this._priv.manualBitrates,
      maxAutoBitrates: this._priv.initialMaxAutoBitrates,
      throttle: this._priv.throttleWhenHidden && {
        video: inBackground$()
          .map(isBg => isBg ? 0 : Infinity)
          .takeUntil(clearLoadedContent$),
      },
      limitWidth: this._priv.limitVideoWidth && {
        video: videoWidth$(videoElement)
          .takeUntil(clearLoadedContent$),
      },
    };

    const bufferOptions = {
      wantedBufferAhead$,
      maxBufferAhead$,
      maxBufferBehind$,
    };

    const stream = Stream({
      adaptiveOptions,
      autoPlay,
      bufferOptions,
      errorStream,
      hideNativeSubtitle,
      keySystems,
      speed$: this._priv.speed$,
      startAt,
      timings$,
      transport: transportObj,
      url,
      videoElement,
      withMediaSource,

      supplementaryImageTracks,
      supplementaryTextTracks,
    })
      .takeUntil(clearLoadedContent$)
      .publish();

    const stalled$ = filterStreamByType(stream, "stalled")
      .startWith(null);

    const loaded = filterStreamByType(stream, "loaded")
      .take(1)
      .share();

    const stateChanges = loaded.mapTo(PLAYER_STATES.LOADED)
      .concat(Observable.combineLatest(
        this._priv.playing$,
        stalled$,
        inferPlayerState
      ))
      .distinctUntilChanged()
      .startWith(PLAYER_STATES.LOADING);

    const playChanges = onEvent(videoElement, ["play", "pause"]);
    const textTracksChanges = onEvent(videoElement.textTracks, ["addtrack"]);

    let streamDisposable = void 0;
    clearLoadedContent$.take(1).subscribe(() => {
      if (streamDisposable) {
        streamDisposable.unsubscribe();
      }
    });

    const noop = () => {};

    playChanges
      .takeUntil(clearLoadedContent$)
      .subscribe(x => this._priv.onPlayPauseNext(x), noop);

    textTracksChanges
      .takeUntil(clearLoadedContent$)
      .subscribe(x => this._priv.onNativeTextTrackNext(x), noop);

    timings$
      .takeUntil(clearLoadedContent$)
      .subscribe(x => this._priv.triggerTimeChange(x), noop);

    stateChanges
      .takeUntil(clearLoadedContent$)
      .subscribe(x => this._priv.setPlayerState(x), noop);

    stream.subscribe(
      x => this._priv.onStreamNext(x),
      err => this._priv.onStreamError(err),
      () => this._priv.onStreamComplete()
    );

    errorStream
      .takeUntil(clearLoadedContent$)
      .subscribe(
        x => this._priv.onErrorStreamNext(x)
      );

    streamDisposable = stream.connect();

    // TODO Return promise here?
    // Not done for now because the unhandled promise rejection warnings can
    // be an annoyance.
    // return new Promise((resolve, reject) => {
    //   const _loaded$ = loaded
    //     .map(() => ({ type: "loaded" }));

    //   const _canceled$ = clearLoadedContent$
    //     .map(() => ({ type: "canceled" }));

    //   const _errored$ = stream.ignoreElements()
    //     .catch((error) => ({ type: "error", error }));

    //   Observable.merge(_loaded$, _canceled$, _errored$)
    //     .take(1)
    //     .subscribe((item) => {
    //       switch(item.type) {
    //       case "loaded":
    //         resolve(item);
    //         break;
    //       case "canceled":
    //       case "error":
    //         reject(item);
    //       }
    //     });
    // });
  }

  /**
   * Returns fatal error if one for the current content. null otherwise.
   * @returns {Object|null}
   */
  getError() {
    return this._priv.fatalError;
  }

  /**
   * Returns manifest/playlist object.
   * null if the player is STOPPED.
   * @returns {Manifest|null}
   */
  getManifest() {
    return this._priv.manifest || null;
  }

  /**
   * Returns adaptations (tracks) for every currently playing type
   * (audio/video/text...).
   * @returns {Object|null}
   */
  getCurrentAdaptations() {
    if (!this._priv.manifest){
      return null;
    }
    return this._priv.currentAdaptations;
  }

  /**
   * Returns representations (qualities) for every currently playing type
   * (audio/video/text...).
   * @returns {Object|null}
   */
  getCurrentRepresentations() {
    if (!this._priv.manifest){
      return null;
    }
    return this._priv.currentRepresentations;
  }

  /**
   * Returns the video DOM element used by the player.
   * You should not its HTML5 API directly and use the player's method instead,
   * to ensure a well-behaved player.
   * @returns {HMTLMediaElement}
   */
  getVideoElement() {
    return this.videoElement;
  }

  /**
   * Returns the text-track element used by the player to inject subtitles.
   * @returns {TextTrack}
   */
  getNativeTextTrack() {
    const textTracks = this.videoElement.textTracks;
    if (textTracks.length > 0) {
      return this.videoElement.textTracks[0];
    } else {
      return null;
    }
  }

  /**
   * Returns the player's current state.
   * @returns {string}
   */
  getPlayerState() {
    return this.state;
  }

  /**
   * Returns true if:
   *   - a content is loaded
   *   - the content is a live content
   * @returns {Boolean}
   */
  isLive() {
    if (!this._priv.manifest) {
      return false;
    }
    return this._priv.manifest.isLive;
  }

  /**
   * Returns the url of the content's manifest
   * @returns {string"undefined}
   */
  getUrl() {
    if (!this._priv.manifest) {
      return;
    }
    return this._priv.manifest.getUrl();
  }

  /**
   * Returns the video duration, in seconds.
   * NaN if no video is playing.
   * @returns {Number}
   */
  getVideoDuration() {
    return this.videoElement.duration;
  }

  /**
   * Returns in seconds the difference between:
   *   - the end of the current contiguous loaded range.
   *   - the current time
   * @returns {Number}
   */
  getVideoBufferGap() {
    return getLeftSizeOfRange(
      this.videoElement.buffered,
      this.videoElement.currentTime
    );
  }

  /**
   * Returns in seconds the difference between:
   *   - the end of the current contiguous loaded range.
   *   - the start of the current contiguous loaded range.
   * @returns {Number}
   */
  getVideoLoadedTime() {
    return getSizeOfRange(
      this.videoElement.buffered,
      this.videoElement.currentTime
    );
  }

  /**
   * Returns in seconds the difference between:
   *   - the current time.
   *   - the start of the current contiguous loaded range.
   * @returns {Number}
   */
  getVideoPlayedTime() {
    return getPlayedSizeOfRange(
      this.videoElement.buffered,
      this.videoElement.currentTime
    );
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
  getWallClockTime() {
    if (!this._priv.manifest) {
      return 0;
    }
    const ct = this.videoElement.currentTime;
    return this.isLive() ?
      (+toWallClockTime(ct, this._priv.manifest) / 1000) : ct;
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
  getPosition() {
    return this.videoElement.currentTime;
  }

  /**
   * Returns the current speed at which the video plays.
   * @returns {Number}
   */
  getPlaybackRate() {
    return this._priv.speed$.getValue();
  }

  /**
   * @returns {Number}
   */
  getVolume() {
    return this.videoElement.volume;
  }

  /**
   * @returns {Boolean}
   */
  isFullscreen() {
    return isFullscreen();
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableVideoBitrates() {
    const videoAdaptation = this._priv.currentAdaptations.video;
    if (!videoAdaptation) {
      return [];
    }

    return videoAdaptation.representations
      .map(({ bitrate }) => bitrate);
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableAudioBitrates() {
    const audioAdaptation = this._priv.currentAdaptations.audio;
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
  getManualAudioBitrate() {
    return this._priv.manualBitrates.audio;
  }

  /**
   * Returns the manual video bitrate set. -1 if in AUTO mode.
   * @returns {Number}
   */
  getManualVideoBitrate() {
    return this._priv.manualBitrates.video;
  }

  /**
   * Returns currently considered bitrate for video segments.
   * @returns {Number|undefined}
   */
  getVideoBitrate() {
    return this._priv.recordedEvents.videoBitrate;
  }

  /**
   * Returns currently considered bitrate for audio segments.
   * @returns {Number|undefined}
   */
  getAudioBitrate() {
    return this._priv.recordedEvents.audioBitrate;
  }

  /**
   * Returns max wanted video bitrate currently set.
   * @returns {Number}
   */
  getMaxVideoBitrate() {
    if (!this._priv.abrManager) {
      return this._priv.initialMaxAutoBitrates.video;
    }
    return this._priv.abrManager.getMaxAutoBitrate("video");
  }

  /**
   * Returns max wanted audio bitrate currently set.
   * @returns {Number}
   */
  getMaxAudioBitrate() {
    if (!this._priv.abrManager) {
      return this._priv.initialMaxAutoBitrates.audio;
    }
    return this._priv.abrManager.getMaxAutoBitrate("audio");
  }

  /**
   * Play/Resume the current video.
   */
  play() {
    this.videoElement.play();
  }

  /**
   * Pause playback of the video.
   */
  pause() {
    this.videoElement.pause();
  }

  /**
   * Update the playback rate of the video.
   * @param {Number} rate
   */
  setPlaybackRate(rate) {
    this._priv.speed$.next(rate);
  }

  /**
   * Seek to a given absolute position.
   * @param {Number|Object} time
   * @returns {Number} - The time the player has seek to
   */
  seekTo(time) {
    assert(this._priv.manifest, "player: no manifest loaded");

    let positionWanted;
    const type = typeof time;

    if (type === "number") {
      positionWanted = time;
    } else if (type === "object") {
      const currentTs = this.videoElement.currentTime;
      if (time.relative != null) {
        positionWanted = currentTs + time.relative;
      } else if (time.position != null) {
        positionWanted = time.position;
      } else if (time.wallClockTime) {
        positionWanted =
          fromWallClockTime(time.wallClockTime * 1000, this._priv.manifest);
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

  exitFullscreen() {
    exitFullscreen();
  }

  /**
   * Set/exit fullScreen.
   * @param {Boolean} [goFull=true] - if false, exit full screen.
   */
  setFullscreen(goFull = true) {
    if (goFull) {
      requestFullscreen(this.videoElement);
    } else {
      exitFullscreen();
    }
  }

  /**
   * Set the player's volume. From 0 (muted volume) to 1 (maximum volume).
   * @param {Number}
   */
  setVolume(volume) {
    if (volume !== this.videoElement.volume) {
      this.videoElement.volume = volume;
      this.trigger("volumeChange", volume);
    }
  }

  /**
   * Returns true if the volume is set to 0. false otherwise.
   * @returns {Boolean}
   */
  isMute() {
    return !this.getVolume();
  }

  /**
   * Set the volume to 0 and save current one for when unmuted.
   */
  mute() {
    this._priv.mutedMemory = this.getVolume();
    this.setVolume(0);
  }

  /**
   * Set the volume back to when it was when mute was last called.
   * If the volume was set to 0, set a default volume instead (see config).
   */
  unMute() {
    const vol = this.getVolume();
    if (vol === 0) {
      this.setVolume(this._priv.mutedMemory || DEFAULT_UNMUTED_VOLUME);
    }
  }

  /**
   * Force the video bitrate to a given value. Act as a ceil.
   * -1 to set it on AUTO Mode
   * @param {Number} btr
   */
  setVideoBitrate(btr) {
    this._priv.manualBitrates.video = btr;
    if (this._priv.abrManager) {
      this._priv.abrManager.setManualBitrate("video", btr);
    }
  }

  /**
   * Force the audio bitrate to a given value. Act as a ceil.
   * -1 to set it on AUTO Mode
   * @param {Number} btr
   */
  setAudioBitrate(btr) {
    this._priv.manualBitrates.audio = btr;
    if (this._priv.abrManager) {
      this._priv.abrManager.setManualBitrate("audio", btr);
    }
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setMaxVideoBitrate(btr) {
    // set it for the next content loaded
    this._priv.initialMaxAutoBitrates.video = btr;

    // set it for the current if one is loaded
    if (this._priv.abrManager) {
      this._priv.abrManager.setMaxAutoBitrate("video", btr);
    }
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setMaxAudioBitrate(btr) {
    // set it for the next content loaded
    this._priv.initialMaxAutoBitrates.audio = btr;

    // set it for the current if one is loaded
    if (this._priv.abrManager) {
      this._priv.abrManager.setMaxAutoBitrate("audio", btr);
    }
  }

  /**
   * Set the max buffer size for the buffer behind the current position.
   * Every buffer data before will be removed.
   * @param {Number} depthInSeconds
   */
  setMaxBufferBehind(depthInSeconds) {
    this._priv.maxBufferBehind$.next(depthInSeconds);
  }

  /**
   * Set the max buffer size for the buffer behind the current position.
   * Every buffer data before will be removed.
   * @param {Number} depthInSeconds
   */
  setMaxBufferAhead(depthInSeconds) {
    this._priv.maxBufferAhead$.next(depthInSeconds);
  }

  /**
   * Set the max buffer size for the buffer ahead of the current position.
   * The player will stop downloading chunks when this size is reached.
   * @param {Number} sizeInSeconds
   */
  setWantedBufferAhead(sizeInSeconds) {
    this._priv.wantedBufferAhead$.next(sizeInSeconds);
  }

  /**
   * Returns the max buffer size for the buffer behind the current position.
   * @returns {Number}
   */
  getMaxBufferBehind() {
    return this._priv.maxBufferBehind$.getValue();
  }

  /**
   * Returns the max buffer size for the buffer behind the current position.
   * @returns {Number}
   */
  getMaxBufferAhead() {
    return this._priv.maxBufferAhead$.getValue();
  }

  /**
   * Returns the max buffer size for the buffer ahead of the current position.
   * @returns {Number}
   */
  getWantedBufferAhead() {
    return this._priv.wantedBufferAhead$.getValue();
  }

  /**
   * Returns type of current keysystem (e.g. playready, widevine) if the content
   * is encrypted. null otherwise.
   * @returns {string|null}
   */
  getCurrentKeySystem() {
    return getCurrentKeySystem();
  }

  /**
   * @returns {Array.<Object>|null}
   */
  getAvailableAudioTracks() {
    if (!this._priv.languageManager) {
      return null;
    }
    return this._priv.languageManager.getAvailableAudioTracks();
  }

  /**
   * @returns {Array.<Object>|null}
   */
  getAvailableTextTracks() {
    if (!this._priv.languageManager) {
      return null;
    }
    return this._priv.languageManager.getAvailableTextTracks();
  }

  /**
   * Returns last chosen language.
   * @returns {string}
   */
  getAudioTrack() {
    if (!this._priv.languageManager) {
      return undefined;
    }
    return this._priv.languageManager.getCurrentAudioTrack();
  }

  /**
   * Returns last chosen subtitle.
   * @returns {string}
   */
  getTextTrack() {
    if (!this._priv.languageManager) {
      return undefined;
    }
    return this._priv.languageManager.getCurrentTextTrack();
  }

  /**
   * Update the audio language.
   * @param {string} audioId
   */
  setAudioTrack(audioId) {
    assert(this._priv.languageManager, "No compatible content launched.");
    try {
      this._priv.languageManager.setAudioTrack(audioId);
    }
    catch (e) {
      throw new Error("player: unknown audio track");
    }
  }

  /**
   * Update the audio language.
   * @param {string} sub
   */
  setTextTrack(textId) {
    assert(this._priv.languageManager, "No compatible content launched.");
    try {
      this._priv.languageManager.setTextTrack(textId);
    }
    catch (e) {
      throw new Error("player: unknown text track");
    }
  }

  disableTextTrack() {
    if (!this._priv.languageManager) {
      return undefined;
    }
    return this._priv.languageManager.disableTextTrack();
  }

  getImageTrackData() {
    if (!this._priv.manifest) {
      return null;
    }
    return this._priv.currentImagePlaylist;
  }

  getMinimumPosition() {
    if (!this._priv.manifest) {
      return null;
    }
    return getMinimumBufferPosition(this._priv.manifest);
  }

  getMaximumPosition() {
    if (!this._priv.manifest) {
      return null;
    }
    return getMaximumBufferPosition(this._priv.manifest);
  }
}

export default Player;
