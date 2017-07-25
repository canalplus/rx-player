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

import { Subject } from "rxjs/Subject";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { combineLatest } from "rxjs/observable/combineLatest";

import log from "../../utils/log";
import warnOnce from "../../utils/warnOnce.js";
import config from "../../config.js";
import { on } from "../../utils/rx-utils";
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

import DeviceEvents from "../../compat/device-events.js";
import { BufferedRanges } from "../ranges";

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
   * @param {Object} [options={}]
   * @param {HTMLVideoElement_} options.videoElement
   */
  constructor(options = {}) {
    let { videoElement } = options;

    const {
      transport,
      transportOptions,
      defaultLanguage, // @deprecated
      defaultAudioTrack, // TODO Rename initialAudioTrack
      defaultSubtitle, // @deprecated
      defaultTextTrack, // TODO Rename initialTextTrack
      initVideoBitrate, // @deprecated
      initialVideoBitrate,
      initAudioBitrate, // @deprecated
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
    let _initialAudioTrack = defaultAudioTrack;
    let _initialTextTrack = defaultTextTrack;

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
      _initialAudioTrack = defaultLanguage;
    }
    if (defaultSubtitle != null && defaultTextTrack == null) {
      warnOnce("defaultSubtitle is deprecated. Use defaultTextTrack instead");
      _initialTextTrack = defaultSubtitle;
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
      "videoElement needs to be an HTMLVideoElement");

    // Workaround to support Firefox autoplay on FF 42.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
    videoElement.preload = "auto";

    this.version = /*PLAYER_VERSION*/"2.3.2";
    this.videoElement = videoElement;

    this._priv.fullScreenSubscription = onFullscreenChange(videoElement)
      .subscribe(() => this.trigger("fullscreenChange", this.isFullscreen()));

    this._priv.playing$ = new BehaviorSubject(); // playing state change.
    this._priv.clearLoaded$ = new Subject(); // clean ressources from loaded content
    this._priv.stream$ = new Subject(); // multicaster forwarding all streams events
    this._priv.imageTrack$ = new Subject();

    // TODO Use regular Stream observable for that
    this._priv.errorStream$ = new Subject(); // Emits warnings

    this._priv.wantedBufferAhead$ =
      new BehaviorSubject(config.DEFAULT_WANTED_BUFFER_AHEAD);

    this._priv.maxBufferAhead$ =
      new BehaviorSubject(config.DEFAULT_MAX_BUFFER_AHEAD);

    this._priv.maxBufferBehind$ =
      new BehaviorSubject(config.DEFAULT_MAX_BUFFER_BEHIND);

    // keep track of the last set audio/text track
    this._priv.lastAudioTrack = _initialAudioTrack;
    this._priv.lastTextTrack = _initialTextTrack;

    // keep track of the last adaptive options
    this._priv.lastBitrates = {
      audio: _initialAudioBitrate,
      video: _initialVideoBitrate,
    };
    this._priv.maxAutoBitrates = {
      audio: maxAudioBitrate,
      video: maxVideoBitrate,
    };
    this._priv.manualBitrates = {};

    // adaptive initial private state
    this._priv.throttleWhenHidden = throttleWhenHidden;
    this._priv.limitVideoWidth = limitVideoWidth;

    this._priv.mutedMemory = 0.1; // memorize previous volume when muted

    this._priv.resetContentState();
    this.log = log;

    this._priv.setPlayerState(PLAYER_STATES.STOPPED);
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
    _priv.fullScreenSubscription.unsubscribe();
    _priv.stream$.unsubscribe(); // @deprecated
    _priv.errorStream$.unsubscribe();
    emeDispose();

    _priv.clearLoaded$ = null;
    _priv.fullScreenSubscription = null;
    _priv.stream$ = null; // @deprecated
    _priv.errorStream$ = null;

    _priv.lastBitrates = null;
    _priv.manualBitrates = null;
    _priv.maxAutoBitrates = null;

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
    this._priv.initialAudioTrack = defaultAudioTrack;
    this._priv.initialTextTrack = defaultTextTrack;

    this._priv.playing$.next(autoPlay);

    const { videoElement } = this;
    const {
      errorStream$: errorStream,
      clearLoaded$,
      wantedBufferAhead$,
      maxBufferAhead$,
      maxBufferBehind$,
    } = this._priv;

    const withMediaSource = !transport.directFile;
    const timings$ = createTimingsSampler(videoElement, { withMediaSource });

    const { videoWidth, inBackground } = DeviceEvents(videoElement);

    const adaptiveOptions = {
      initialBitrates: this._priv.lastBitrates,
      manualBitrates: this._priv.manualBitrates,
      maxAutoBitrates: this._priv.maxAutoBitrates,
      throttle: this._priv.throttleWhenHidden === false ? void 0 : {
        video: inBackground
          .map(isBg => isBg ? 0 : Infinity)
          .takeUntil(clearLoaded$),
      },
      limitWidth: this._priv.limitVideoWidth === false ? void 0 : {
        video: videoWidth
          .takeUntil(clearLoaded$),
      },
    };

    const stream = Stream({
      adaptiveOptions,
      autoPlay,
      errorStream,
      hideNativeSubtitle,
      keySystems,
      startAt,
      timeFragment, // @deprecated
      timings$,
      transport,
      url,
      videoElement,
      wantedBufferAhead$,
      maxBufferAhead$,
      maxBufferBehind$,
      withMediaSource,

      supplementaryImageTracks,
      supplementaryTextTracks,
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

    timings$
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
   * @returns {Number}
   */
  getMaxVideoBitrate() {
    if (this._priv.abrManager) {
      return undefined;
    }
    return this._priv.abrManager.getMaxAutoBitrate("video");
  }

  /**
   * Returns max wanted audio bitrate currently set.
   * @returns {Number}
   */
  getMaxAudioBitrate() {
    if (this._priv.abrManager) {
      return undefined;
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
   * Force the video bitrate to a given value. Act as a ceil.
   * -1 to set it on AUTO Mode
   * @param {Number} btr
   * TODO Allow this when no content is playing?
   */
  setVideoBitrate(btr) {
    assert(this._priv.abrManager);
    this._priv.manualBitrates.video = btr;
    this._priv.abrManager.setManualBitrate("video", btr);
  }

  /**
   * Force the audio bitrate to a given value. Act as a ceil.
   * -1 to set it on AUTO Mode
   * @param {Number} btr
   * TODO Allow this when no content is playing?
   */
  setAudioBitrate(btr) {
    assert(this._priv.abrManager);
    this._priv.manualBitrates.audio = btr;
    this._priv.abrManager.setManualBitrate("audio", btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   * TODO Allow this when no content is playing?
   */
  setMaxVideoBitrate(btr) {
    assert(this._priv.abrManager);
    this._priv.maxAutoBitrates.video = btr;
    this._priv.abrManager.setMaxAutoBitrate("video", btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   * TODO Allow this when no content is playing?
   */
  setMaxAudioBitrate(btr) {
    assert(this._priv.abrManager);
    this._priv.maxAutoBitrates.audio = btr;
    this._priv.abrManager.setMaxAutoBitrate("audio", btr);
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
