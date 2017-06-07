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

import arrayFind from "array-find";
import log from "../utils/log";
import warnOnce from "../utils/warnOnce.js";
import config from "../../config.js";

import { Subject } from "rxjs/Subject";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { combineLatest } from "rxjs/observable/combineLatest";

import { on } from "../utils/rx-utils";
import {
  normalize as normalizeLang,
  normalizeAudioTrack,
  normalizeTextTrack,
} from "../../utils/languages";
import EventEmitter from "../../utils/eventemitter";
import assert from "../../utils/assert";

import {
  HTMLVideoElement_,
  exitFullscreen,
  requestFullscreen,
  isFullscreen,
  onFullscreenChange,
} from "../../compat";

import {
  createTimingsSampler,
  toWallClockTime,
  fromWallClockTime,
  getMaximumBufferPosition,
  getMinimumBufferPosition,
} from "../timings";

import {
  ErrorTypes,
  ErrorCodes,
} from "../../errors";

import InitializationSegmentCache
  from "../../utils/initialization_segment_cache.js";
import { BufferedRanges } from "../ranges";
import DeviceEvents from "../../compat/device-events.js";

import PipeLines from "../pipelines";
import Adaptive from "../../adaptive";
import Stream from "../stream/index.js";
import { dispose as emeDispose , getCurrentKeySystem } from "../eme";

import { PLAYER_STATES } from "./constants.js";

import {
  inferPlayerState,
  assertManifest,
  filterStreamByType,
} from "./helpers.js";

import attachPrivateMethods from "./private.js";

/**
 * @class Player
 * @extends EventEmitter
 */
class Player extends EventEmitter {

  /**
   * @deprecated
   * @returns {Object}
   */
  static getErrorTypes() {
    warnOnce("getErrorTypes is deprecated. Use the ErrorTypes property instead");
    return ErrorTypes;
  }

  /**
   * @returns {Object}
   */
  static get ErrorTypes() {
    return ErrorTypes;
  }

  /**
   * @deprecated
   * @returns {Object}
   */
  static getErrorCodes() {
    warnOnce("getErrorCodes is deprecated. Use the ErrorCodes property instead");
    return ErrorCodes;
  }

  /**
   * @returns {Object}
   */
  static get ErrorCodes() {
    return ErrorCodes;
  }

  /**
   * @param {Object} [options={}]
   * @param {HTMLVideoElement_} options.videoElement
   */
  constructor(options = {}) {
    let { videoElement } = options;

    const {
      transport,
      transportOptions,
      defaultLanguage,
      defaultAudioTrack,
      defaultSubtitle,
      defaultTextTrack,
      initVideoBitrate,
      initialVideoBitrate,
      initAudioBitrate,
      initialAudioBitrate,
      maxVideoBitrate,
      maxAudioBitrate,
      limitVideoWidth,
      throttleWhenHidden,
    } = options;

    super();

    this._priv = attachPrivateMethods(this);

    // -- Deprecated checks

    let _initialVideoBitrate = initialVideoBitrate;
    let _initialAudioBitrate = initialAudioBitrate;
    let _defaultAudioTrack = defaultAudioTrack;
    let _defaultTextTrack = defaultTextTrack;

    if (initVideoBitrate != null && initialVideoBitrate == null) {
      warnOnce("initVideoBitrate is deprecated. Use initialVideoBitrate instead");
      _initialVideoBitrate = initVideoBitrate;
    }
    if (initAudioBitrate != null && initialAudioBitrate == null) {
      warnOnce("initAudioBitrate is deprecated. Use initialAudioBitrate instead");
      _initialAudioBitrate = initAudioBitrate;
    }
    if (defaultLanguage != null && defaultAudioTrack == null) {
      warnOnce("defaultLanguage is deprecated. Use defaultAudioTrack instead");
      _defaultAudioTrack = defaultLanguage;
    }
    if (defaultSubtitle != null && defaultTextTrack == null) {
      warnOnce("defaultSubtitle is deprecated. Use defaultTextTrack instead");
      _defaultTextTrack = defaultSubtitle;
    }

    // --

    if (transport) {
      this.defaultTransport = transport;
    }
    this.defaultTransportOptions = transportOptions || {};

    if (!videoElement) {
      videoElement = document.createElement("video");
    }

    assert((videoElement instanceof HTMLVideoElement_),
      "requires an actual HTMLVideoElement");

    // Workaround to support Firefox autoplay on FF 42.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
    videoElement.preload = "auto";

    this.version = /*PLAYER_VERSION*/"2.3.2";
    this.videoElement = videoElement;

    this._priv.fullscreen$ = onFullscreenChange(videoElement)
      .subscribe(() => this.trigger("fullscreenChange", this.isFullscreen()));

    this._priv.playing$ = new BehaviorSubject(); // playing state change.
    this._priv.clearLoaded$ = new Subject(); // clean ressources from loaded content
    this._priv.stream$ = new Subject(); // multicaster forwarding all streams events
    this._priv.imageTrack$ = new Subject();
    this._priv.errorStream$ = new Subject(); // Emits warnings

    const { createPipelines, metrics } = PipeLines();

    const deviceEvents = DeviceEvents(videoElement);

    this._priv.createPipelines = createPipelines;
    this._priv.metrics = metrics;
    this._priv.abrManager = Adaptive(metrics, deviceEvents, {
      initialVideoBitrate: _initialVideoBitrate,
      initialAudioBitrate: _initialAudioBitrate,
      maxVideoBitrate,
      maxAudioBitrate,
      limitVideoWidth,
      throttleWhenHidden,
    });

    this._priv.wantedBufferAhead$ =
      new BehaviorSubject(config.DEFAULT_WANTED_BUFFER_AHEAD);

    this._priv.maxBufferAhead$ =
      new BehaviorSubject(config.DEFAULT_MAX_BUFFER_AHEAD);

    this._priv.maxBufferBehind$ =
      new BehaviorSubject(config.DEFAULT_MAX_BUFFER_BEHIND);

    this._priv.defaultAudioTrack = _defaultAudioTrack;
    this._priv.defaultTextTrack = _defaultTextTrack;
    this._priv.lastAudioTrack = undefined;
    this._priv.lastTextTrack = undefined;

    this._priv.mutedMemory = 0.1; // memorize previous volume when muted

    this._priv.setPlayerState(PLAYER_STATES.STOPPED);
    this._priv.resetContentState();

    this.log = log;
  }

  /**
   * Stop the player.
   */
  stop() {
    if (this.state !== PLAYER_STATES.STOPPED) {
      this._priv.resetContentState();
      this._priv.clearLoaded$.next();
      this._priv.setPlayerState(PLAYER_STATES.STOPPED);
    }
  }

  /**
   * Free the resources used by the player.
   */
  dispose() {
    this.stop();

    const { _priv } = this;

    _priv.clearLoaded$.complete();
    _priv.metrics.unsubscribe();
    _priv.abrManager.unsubscribe();
    _priv.fullscreen$.unsubscribe();
    _priv.stream$.unsubscribe(); // @deprecated
    _priv.errorStream$.unsubscribe();
    emeDispose();

    _priv.clearLoaded$ = null;
    _priv.metrics = null;
    _priv.abrManager = null;
    _priv.fullscreen$ = null;
    _priv.stream$ = null; // @deprecated
    _priv.errorStream$ = null;
    _priv.createPipelines = null;

    _priv.wantedBufferAhead$.complete();
    _priv.wantedBufferAhead$ = null;

    _priv.maxBufferAhead$.complete();
    _priv.maxBufferAhead$ = null;

    _priv.maxBufferBehind$.complete();
    _priv.maxBufferBehind$ = null;

    this.videoElement = null;
  }

  /**
   * Load a new video.
   * @param {Object} options
   * @returns {Observable}
   */
  loadVideo(options = {}) {
    options = this._priv.parseLoadVideoOptions(options);
    log.info("loadvideo", options);

    const {
      url,
      keySystems,
      supplementaryTextTracks,
      hideNativeSubtitle,
      supplementaryImageTracks,
      timeFragment, // @deprecated
      autoPlay,
      transport,
      defaultAudioTrack,
      defaultTextTrack,
      startAt,
    } = options;

    this.stop();
    this._priv.timeFragment = timeFragment; // @deprecated
    this._priv.playing$.next(autoPlay);

    const {
      videoElement: videoElement,
    } = this;

    const {
      abrManager: adaptive,
      errorStream$: errorStream,
      createPipelines,
      clearLoaded$,
      wantedBufferAhead$,
      maxBufferAhead$,
      maxBufferBehind$,
    } = this._priv;

    const pipelines = createPipelines(transport, {
      errorStream,
      audio: { cache: new InitializationSegmentCache() },
      video: { cache: new InitializationSegmentCache() },
      image: { maxRetry: 0 }, // Deactivate BIF fetching if it fails
                              // TODO Better adaptive strategy
    });

    const withMediaSource = !transport.directFile;
    const timings = createTimingsSampler(videoElement, { withMediaSource });

    const stream = Stream({
      url,
      errorStream,
      keySystems,
      supplementaryTextTracks,
      hideNativeSubtitle,
      timings,
      supplementaryImageTracks,
      timeFragment, // @deprecated
      adaptive,
      pipelines,
      videoElement,
      autoPlay,
      startAt,
      defaultAudioTrack,
      defaultTextTrack,
      wantedBufferAhead$,
      maxBufferAhead$,
      maxBufferBehind$,
      withMediaSource,
    })
      .takeUntil(clearLoaded$)
      .publish();

    const stalled = filterStreamByType(stream, "stalled")
      .startWith(null);

    const loaded = filterStreamByType(stream, "loaded")
      .take(1)
      .share();

    const stateChanges = loaded.mapTo(PLAYER_STATES.LOADED)
      .concat(combineLatest(this._priv.playing$, stalled, inferPlayerState))
      .distinctUntilChanged()
      .startWith(PLAYER_STATES.LOADING);

    const playChanges = on(videoElement, ["play", "pause"]);
    const textTracksChanges = on(videoElement.textTracks, ["addtrack"]);

    let streamDisposable = void 0;
    let unsubscribed = false;

    clearLoaded$.take(1).subscribe(() => {
      unsubscribed = true;
      if (streamDisposable) {
        streamDisposable.unsubscribe();
      }
    });

    const noop = () => {};

    playChanges
      .takeUntil(clearLoaded$)
      .subscribe(x => this._priv.onPlayPauseNext(x), noop);

    textTracksChanges
      .takeUntil(clearLoaded$)
      .subscribe(x => this._priv.onNativeTextTrackNext(x), noop);

    timings
      .takeUntil(clearLoaded$)
      .subscribe(x => this._priv.triggerTimeChange(x), noop);

    stateChanges
      .subscribe(x => this._priv.setPlayerState(x), noop);

    stream.subscribe(
      x => this._priv.onStreamNext(x),
      err => this._priv.onStreamError(err),
      () => this._priv.onStreamComplete()
    );

    errorStream
      .takeUntil(clearLoaded$)
      .subscribe(
        x => this._priv.onErrorStreamNext(x)
      );

    streamDisposable = stream.connect();

    // ugly but needed in case the user stops the video on one of the events
    // declared here
    // TODO delete empty timings?
    if (!unsubscribed) {
      this._priv.triggerTimeChange();
    }
    return loaded;
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
   * @returns {Object|null}
   */
  getManifest() {
    return this._priv.manifest || null;
  }

  getCurrentAdaptations() {
    if (!this._priv.manifest){
      return null;
    }
    return this._priv.currentAdaptations;
  }

  getCurrentRepresentations() {
    if (!this._priv.manifest){
      return null;
    }
    return this._priv.currentRepresentations;
  }

  /**
   * Returns the video DOM element used by the player.
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
   * @deprecate
   * @returns {Observable}
   */
  getImageTrack() {
    return this._priv.imageTrack$.distinctUntilChanged();
  }

  /**
   * Returns the player's current state.
   * @returns {string}
   */
  getPlayerState() {
    return this.state;
  }

  /**
   * Returns true if the content is a live content.
   * @returns {Boolean}
   * TODO Do not throw if STOPPED
   * @throws Error - Throws if the given player has no manifest loaded.
   */
  isLive() {
    assertManifest(this);
    return this._priv.manifest.isLive;
  }

  /**
   * Returns the url of the content's manifest
   * @returns {string}
   * @throws Error - Throws if the given player has no manifest loaded.
   * TODO Do not throw if STOPPED
   */
  getUrl() {
    assertManifest(this);
    return this._priv.manifest.getUrl();
  }

  /**
   * Returns the video duration, in seconds.
   * NaN if no video is playing.
   * Infinity if a live content is playing.
   * @returns {Number}
   */
  getVideoDuration() {
    return this.videoElement.duration;
  }

  /**
   * Returns in seconds the difference between:
   *   - the start of the current contiguous loaded range.
   *   - the current time.
   * @returns {Number}
   */
  getVideoLoadedTime() {
    return new BufferedRanges(this.videoElement.buffered)
      .getSize(this.videoElement.currentTime);
  }

  /**
   * Returns in seconds the difference between:
   *   - the start of the current contiguous loaded range.
   *   - the current time.
   * @returns {Number}
   */
  getVideoPlayedTime() {
    return new BufferedRanges(this.videoElement.buffered)
      .getLoaded(this.videoElement.currentTime);
  }

  /**
   * Returns the current playback position :
   *   - 0 if no manifest is currently loaded
   *   - in seconds for an on-demand content
   *   - with a Date object for live content.
   * @deprecated
   * @returns {Number|Date}
   */
  getCurrentTime() {
    warnOnce(
      "getCurrentTime is deprecated and won't be available in the next major version." +
      " Use either getWallClockTime or getPosition instead."
    );
    if (!this._priv.manifest) {
      return 0;
    }

    const ct = this.videoElement.currentTime;
    if (this._priv.manifest.isLive) {
      return toWallClockTime(ct, this._priv.manifest);
    } else {
      return ct;
    }
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
   * @deprecated
   * @returns {Number}
   */
  getStartTime() {
    return this._priv.timeFragment.start;
  }

  /**
   * @deprecated
   * @returns {Number}
   */
  getEndTime() {
    return this._priv.timeFragment.end;
  }

  /**
   * @returns {Number}
   */
  getPlaybackRate() {
    return this.videoElement.playbackRate;
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
   * @deprecated
   * @returns {Array.<string}
   */
  getAvailableLanguages() {
    warnOnce(
      "getAvailableLanguages is deprecated and won't be available in the next major version." +
      " Use getAvailableAudioTracks instead."
    );
    return this._priv.languageManager &&
      this._priv.languageManager.getAvailableAudioTracks().map(l => l.language)
      || [];
  }

  /**
   * @deprecated
   * @returns {Array.<string}
   */
  getAvailableSubtitles() {
    warnOnce(
      "getAvailableSubtitles is deprecated and won't be available in the next major version." +
      " Use getAvailableTextTracks instead."
    );
    return this._priv.languageManager &&
      this._priv.languageManager.getAvailableTextTracks().map(s =>  s.language)
      || [];
  }

  /**
   * Returns last chosen language.
   * @deprecated
   * @returns {string}
   */
  getLanguage() {
    warnOnce(
      "getLanguage is deprecated and won't be available in the next major version." +
      " Use getAudioTrack instead."
    );

    if (!this._priv.languageManager) {
      return undefined;
    }
    const currentTrack = this._priv.languageManager.getCurrentAudioTrack();

    return currentTrack ?
      currentTrack.language : null;
  }

  /**
   * Returns last chosen subtitle.
   * @deprecated
   * @returns {string}
   */
  getSubtitle() {
    warnOnce(
      "getSubtitle is deprecated and won't be available in the next major version." +
      " Use getTextTrack instead."
    );

    if (!this._priv.languageManager) {
      return undefined;
    }

    const currentTrack = this._priv.languageManager.getCurrentTextTrack();
    return currentTrack && currentTrack.language;
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableVideoBitrates() {
    return this._priv.currentAdaptations.video &&
      this._priv.currentAdaptations.video.getAvailableBitrates() || [];
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableAudioBitrates() {
    return this._priv.currentAdaptations.audio &&
      this._priv.currentAdaptations.audio.getAvailableBitrates() || [];
  }

  /**
   * Returns currently considered bitrate for video segments.
   * @returns {Number}
   */
  getVideoBitrate() {
    return this._priv.recordedEvents.videoBitrate;
  }

  /**
   * Returns currently considered bitrate for audio segments.
   * @returns {Number}
   */
  getAudioBitrate() {
    return this._priv.recordedEvents.audioBitrate;
  }

  /**
   * Returns max wanted video bitrate currently set.
   * @deprecated
   * @returns {Number}
   */
  getVideoMaxBitrate() {
    warnOnce("getVideoMaxBitrate is deprecated. Use getMaxVideoBitrate instead");
    return this.getMaxVideoBitrate();
  }

  /**
   * Returns max wanted video bitrate currently set.
   * @returns {Number}
   */
  getMaxVideoBitrate() {
    return this._priv.abrManager.getVideoMaxBitrate();
  }

  /**
   * Returns max wanted audio bitrate currently set.
   * @deprecated
   * @returns {Number}
   */
  getAudioMaxBitrate() {
    warnOnce("getAudioMaxBitrate is deprecated. Use getMaxAudioBitrate instead");
    return this.getMaxAudioBitrate();
  }

  /**
   * Returns max wanted audio bitrate currently set.
   * @returns {Number}
   */
  getMaxAudioBitrate() {
    return this._priv.abrManager.getAudioMaxBitrate();
  }

  /**
   * Get last calculated average bitrate, from an exponential moving average
   * formula.
   * @deprecated
   * @returns {Number}
   */
  getAverageBitrates() {
    return this._priv.abrManager.getAverageBitrates();
  }

  /**
   * Returns metrics used to emit informations about the downloaded segments.
   * @deprecated
   */
  getMetrics() {
    return this._priv.metrics;
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
   * Update the playback rate of the video (TODO adapt this with ABR).
   * @param {Number} rate
   */
  setPlaybackRate(rate) {
    this.videoElement.playbackRate = rate;
  }

  /**
   * Seek to the start of the content.
   */
  goToStart() {
    return this.seekTo(this.getStartTime());
  }

  /**
   * Seek to a given absolute position.
   * Refer to getCurrentTime to give relative positions.
   * @param {Number} time
   * @returns {Number} - The time the player has seek to, relatively to the
   * video tag currentTime.
   */
  seekTo(time) {
    assertManifest(this);
    const currentTs = this.videoElement.currentTime;

    // NON-deprecated part
    if (time) {
      if (time.relative != null) {
        this.videoElement.currentTime = currentTs + time.relative;
        return;
      }
      else if (time.position != null) {
        this.videoElement.currentTime = time.position;
        return;
      }
      else if (time.wallClockTime != null) {
        this.videoElement.currentTime =
          fromWallClockTime(time.wallClockTime * 1000, this._priv.manifest);
        return;
      }
    }

    // deprecated part
    if (this._priv.manifest.isLive) {
      time = fromWallClockTime(time, this._priv.manifest);
    }
    if (time !== currentTs) {
      log.info("seek to", time);
      return (this.videoElement.currentTime = time);
    } else {
      return currentTs;
    }
  }

  exitFullscreen() {
    exitFullscreen();
  }

  /**
   * Set/exit fullScreen.
   * @deprecated
   * @param {Boolean} [toggle=true] - if false, exit full screen.
   */
  setFullscreen(toggle = true) {
    if (toggle === false) {
      warnOnce("setFullscreen(false) is deprecated. Use exitFullscreen instead");
      exitFullscreen();
    } else {
      requestFullscreen(this.videoElement);
    }
  }

  /**
   * @param {Number}
   */
  setVolume(volume) {
    if (volume !== this.videoElement.volume) {
      this.videoElement.volume = volume;
      this.trigger("volumeChange", volume);
    }
  }

  mute() {
    this._priv.mutedMemory = this.getVolume() || 0.1;
    this.setVolume(0);
  }

  unMute() {
    // TODO This is not perfect as volume can be set to 0 without being muted.
    // We should probably reset this.muted once unMute is called.
    const vol = this.getVolume();
    if (vol === 0) {
      this.setVolume(this._priv.mutedMemory);
    }
  }

  /**
   * Translate a generic language code, like the one defined in a manifest file,
   * to the code used by the player.
   * @param {string} lng
   * @returns {string}
   */
  normalizeLanguageCode(lng) {
    return normalizeLang(lng);
  }

  /**
   * Returns true if the corresponding audio language, normalized, is available.
   * @deprecated
   * @param {string|Object} lng
   * @returns {Boolean}
   */
  isLanguageAvailable(arg) {
    warnOnce(
      "isLanguageAvailable is deprecated and won't be available in the next major version."
    );
    const track = normalizeAudioTrack(arg);

    if (!track) {
      return false;
    }

    const availableTracks = this.getAvailableAudioTracks();
    if (!availableTracks) {
      return false;
    }

    return !!arrayFind(availableTracks, aT => aT.language === track.language);
  }

  /**
   * Returns true if the corresponding subtitles track, normalized,
   * @deprecated
   * is available.
   * @param {string|Object} lng
   * @returns {Boolean}
   */
  isSubtitleAvailable(arg) {
    warnOnce(
      "isSubtitleAvailable is deprecated and won't be available in the next major version."
    );
    const track = normalizeTextTrack(arg);

    if (!track) {
      return false;
    }

    const availableTracks = this.getAvailableTextTracks();
    if (!availableTracks) {
      return false;
    }

    return !!arrayFind(availableTracks, aT => aT.language === track.language);
  }

  /**
   * Update the audio language.
   * @deprecated
   * @param {string|Object} lng
   */
  setLanguage(arg) {
    warnOnce(
      "setLanguage is deprecated and won't be available in the next major version." +
      " Use setAudioTrack instead."
    );
    assert(this._priv.languageManager, "No compatible content launched.");

    try {
      this._priv.languageManager.setAudioTrackLegacy(arg);
    }
    catch (e) {
      throw new Error("player: unknown language");
    }
  }

  /**
   * Update the audio language.
   * @deprecated
   * @param {string|Object} sub
   */
  setSubtitle(arg) {
    warnOnce(
      "setSubtitle is deprecated and won't be available in the next major version." +
      " Use setTextTrack instead."
    );
    assert(this._priv.languageManager, "No compatible content launched.");

    if (arg == null) {
      this._priv.languageManager.disableTextTrack();
      return;
    }

    try {
      this._priv.languageManager.setTextTrackLegacy(arg);
    }
    catch (e) {
      throw new Error("player: unknown subtitle");
    }
  }

  /**
   * Force the video bitrate to a given value.
   * Set to 0 or undefined to switch to automatic mode.
   * @throws Error - The bitrate given is not available as a video bitrate.
   * @param {Number} btr
   * TODO Stop throwing, act as a ceil instead
   */
  setVideoBitrate(btr) {
    assertManifest(this);
    assert(btr === 0 || this.getAvailableVideoBitrates().indexOf(btr) >= 0, "player: video bitrate unavailable");
    this._priv.abrManager.setVideoBitrate(btr);
  }

  /**
   * Force the audio bitrate to a given value.
   * Set to 0 or undefined to switch to automatic mode.
   * @throws Error - The bitrate given is not available as an audio bitrate.
   * @param {Number} btr
   * TODO Stop throwing, act as a ceil instead
   */
  setAudioBitrate(btr) {
    assertManifest(this);
    assert(btr === 0 || this.getAvailableAudioBitrates().indexOf(btr) >= 0, "player: audio bitrate unavailable");
    this._priv.abrManager.setAudioBitrate(btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @deprecated
   * @param {Number} btr
   */
  setVideoMaxBitrate(btr) {
    warnOnce("setVideoMaxBitrate is deprecated. Use setMaxVideoBitrate instead");
    return this.setMaxVideoBitrate(btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setMaxVideoBitrate(btr) {
    this._priv.abrManager.setVideoMaxBitrate(btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @deprecated
   * @param {Number} btr
   */
  setAudioMaxBitrate(btr) {
    warnOnce("setAudioMaxBitrate is deprecated. Use setMaxAudioBitrate instead");
    return this.setMaxAudioBitrate(btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setMaxAudioBitrate(btr) {
    this._priv.abrManager.setAudioMaxBitrate(btr);
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
   * TODO Deprecate this API
   */
  asObservable() {
    return this._priv.stream$;
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

  // TODO normally, we should also integrate timeFragment.end into this
  // However. It would be very ugly to do so and keeping compatibility
  // hard.
  // As this is a new API, and as timeFragment is deprecated, I let it
  // pass (do not hit me!)
  getMaximumPosition() {
    if (!this._priv.manifest) {
      return null;
    }
    return getMaximumBufferPosition(this._priv.manifest);
  }
}

export default Player;
