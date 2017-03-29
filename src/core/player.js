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

const log = require("../utils/log");
const { Subscription } = require("rxjs/Subscription");
const { Subject } = require("rxjs/Subject");
const { BehaviorSubject } = require("rxjs/BehaviorSubject");
const { combineLatest } = require("rxjs/observable/combineLatest");
const { on } = require("../utils/rx-utils");
const { normalize: normalizeLang } = require("../utils/languages");
const EventEmitter = require("../utils/eventemitter");
const debugPane = require("../utils/debug");
const assert = require("../utils/assert");

const {
  HTMLVideoElement_,
  exitFullscreen,
  requestFullscreen,
  isFullscreen,
  onFullscreenChange,
} = require("./compat");

const {
  getEmptyTimings,
  createTimingsSampler,
  toWallClockTime,
  fromWallClockTime,
  getLiveGap,
} = require("./timings");

const {
  ErrorTypes,
  ErrorCodes,
} = require("../errors");

const { InitializationSegmentCache } = require("./cache");
const { BufferedRanges } = require("./ranges");
const { parseTimeFragment } = require("./time-fragment");
const DeviceEvents = require("./device-events");
const manifestHelpers = require("./manifest");
// TODO(pierre): separate transports from main build
const Transports = require("../net");
const PipeLines = require("./pipelines");
const Adaptive = require("../adaptive");
const Stream = require("./stream");
const EME = require("./eme");

// -- PLAYER STATES --
const PLAYER_STOPPED   = "STOPPED";
const PLAYER_LOADED    = "LOADED";
const PLAYER_LOADING   = "LOADING";
const PLAYER_PLAYING   = "PLAYING";
const PLAYER_PAUSED    = "PAUSED";
const PLAYER_ENDED     = "ENDED";
const PLAYER_BUFFERING = "BUFFERING";
const PLAYER_SEEKING   = "SEEKING";

/**
 * Returns current playback state for the current content.
 * /!\ Only pertinent for a content that is currently loaded and playing
 * (i.e. not loading, ended or stopped).
 * @param {Boolean} isPlaying - Whether the player is currently playing
 * (not paused).
 * @param {Boolean} stalled - Whether the player is currently "stalled".
 *
 * @returns {string}
 */
function calcPlayerState(isPlaying, stalled) {
  if (stalled) {
    return (stalled.name == "seeking")
      ? PLAYER_SEEKING
      : PLAYER_BUFFERING;
  }

  if (isPlaying) {
    return PLAYER_PLAYING;
  }

  return PLAYER_PAUSED;
}

/**
 * Function with no effect. Created as a placeholder function.
 * TODO remove? Might not be needed.
 */
function noop() {}

/**
 * Assert that a manifest has been loaded (throws otherwise).
 * @param {Player} player
 * @throws Error - Throws if the given player has no manifest loaded.
 */
function assertMan(player) {
  assert(player.man, "player: no manifest loaded");
}

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
  static getErrorTypes() {
    return ErrorTypes;
  }

  /**
   * @returns {Object}
   */
  static getErrorCodes() {
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
      defaultSubtitle,
      initVideoBitrate,
      initAudioBitrate,
      maxVideoBitrate,
      maxAudioBitrate,
    } = options;

    super();

    // auto-bindings. TODO Needed? Pollute the namespace / Only one use for each
    this._playPauseNext$ = this._playPauseNext.bind(this);
    this._textTrackChanges$ = this._textTrackChanges.bind(this);
    this._setPlayerState$ = this._setPlayerState.bind(this);
    this._triggerTimeChange$ = this._triggerTimeChange.bind(this);
    this._streamNext$ = this._streamNext.bind(this);
    this._streamError$ = this._streamError.bind(this);
    this._streamFatalError$ = this._streamFatalError.bind(this);
    this._streamComplete$ = this._streamComplete.bind(this);

    this.defaultTransport = transport;
    this.defaultTransportOptions = transportOptions || {};

    if (!videoElement) {
      videoElement = document.createElement("video");
    }

    assert((videoElement instanceof HTMLVideoElement_),
      "requires an actual HTMLVideoElement");

    // Workaround to support Firefox autoplay on FF 42.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
    videoElement.preload = "auto";

    this.version = /*PLAYER_VERSION*/"2.0.12";
    this.video = videoElement;

    // fullscreen change subscription.
    // TODO prepend '_' to indicate private status?
    this.fullscreen = onFullscreenChange(videoElement)
      .subscribe(() => this.trigger("fullscreenChange", this.isFullscreen()));

    // playing state change.
    // TODO prepend '_' to indicate private status?
    this.playing = new BehaviorSubject();

    // multicaster forwarding all streams events
    // TODO prepend '_' to indicate private status?
    this.stream = new Subject();
    this.images = new Subject();
    this.errorStream = new Subject();

    const { createPipelines, metrics } = PipeLines();

    const deviceEvents = DeviceEvents(videoElement);

    this.createPipelines = createPipelines;
    this.metrics = metrics;

    this.adaptive = Adaptive(metrics, deviceEvents, {
      initVideoBitrate,
      initAudioBitrate,
      maxVideoBitrate,
      maxAudioBitrate,
      defaultLanguage: normalizeLang(defaultLanguage),
      defaultSubtitle: normalizeLang(defaultSubtitle),
    });

    // memorize previous volume when muted - minimum at first
    this.muted = 0.1;

    // states
    this._setPlayerState(PLAYER_STOPPED);
    this._resetStates();

    this.log = log;
  }

  /**
   * Reset all states relative to a playing content.
   */
  _resetStates() {
    this.man = null;
    this.reps = { video: null, audio: null, text: null, images: null };
    this.adas = { video: null, audio: null, text: null, images: null };
    this.evts = {};
    this.frag = { start: null, end: null };
    this.error = null;
    this.images.next(null);
  }

  /**
   * Unsubscribe from subscriptions done in loadVideo for the current content.
   * This also stops the current video as a side-effect.
   */
  _unsubscribe() {
    if (this.subscriptions) {
      const subscriptions = this.subscriptions;
      this.subscriptions = null;
      subscriptions.unsubscribe();
    }
  }

  /**
   * Stop the player.
   */
  stop() {
    if (this.state !== PLAYER_STOPPED) {
      this._resetStates();
      this._unsubscribe();
      this._setPlayerState(PLAYER_STOPPED);
    }
  }

  dispose() {
    this.stop();
    this.metrics.unsubscribe();
    this.adaptive.unsubscribe();
    this.fullscreen.unsubscribe();
    this.stream.unsubscribe();
    EME.dispose();

    this.metrics = null;
    this.adaptive = null;
    this.fullscreen = null;
    this.stream = null;

    this.createPipelines = null;
    this.video = null;
  }

  _recordState(type, value) {
    const prev = this.evts[type];
    if (prev !== value) {
      this.evts[type] = value;
      this.trigger(`${type}Change`, value);
    }
  }

  /**
   * Parse the options given as arguments to the loadVideo method.
   * @param {Object} opts
   * @returns {Object}
   */
  _parseOptions(opts) {
    opts = Object.assign({
      transport: this.defaultTransport,
      transportOptions: {},
      keySystems: [],
      timeFragment: {},
      subtitles: [],
      images: [],
      autoPlay: false,
      hideNativeSubtitle: false,
      directFile: false,
    }, opts);

    let {
      transport,
      url,
      keySystems,
      timeFragment,
      subtitles,
      images,
    } = opts;

    const {
      transportOptions,
      manifests,
      autoPlay,
      directFile,
      defaultLanguage,
      defaultSubtitle,
      hideNativeSubtitle,
    } = opts;

    timeFragment = parseTimeFragment(timeFragment);

    // compatibility with directFile api
    if (directFile) {
      transport = "directfile";
    }

    // compatibility with old API authorizing to pass multiple
    // manifest url depending on the key system
    assert(!!manifests ^ !!url, "player: you have to pass either a url or a list of manifests");
    if (manifests) {
      const firstManifest = manifests[0];
      url = firstManifest.url;
      subtitles = firstManifest.subtitles || [];
      images = firstManifest.images || [];
      keySystems = manifests.map((man) => man.keySystem).filter(Boolean);
    }

    if (typeof transport == "string") {
      transport = Transports[transport];
    }

    if (typeof transport == "function") {
      transport = transport(Object.assign({}, this.defaultTransportOptions, transportOptions));
    }

    assert(transport, "player: transport " + opts.transport + " is not supported");

    return {
      url,
      keySystems,
      subtitles,
      hideNativeSubtitle,
      images,
      timeFragment,
      autoPlay,
      defaultLanguage,
      defaultSubtitle,
      transport,
    };
  }

  loadVideo(options = {}) {
    options = this._parseOptions(options);
    log.info("loadvideo", options);

    const {
      url,
      keySystems,
      subtitles,
      hideNativeSubtitle,
      images,
      timeFragment,
      autoPlay,
      transport,
      defaultLanguage,
      defaultSubtitle,
    } = options;

    this.stop();
    this.frag = timeFragment;
    this.playing.next(autoPlay);

    if (defaultLanguage) {
      this.adaptive.setLanguage(normalizeLang(defaultLanguage));
    }

    if (defaultSubtitle) {
      this.adaptive.setSubtitle(normalizeLang(defaultSubtitle));
    }

    const {
      video: videoElement,
      adaptive,
      errorStream,
    } = this;

    const pipelines = this.createPipelines(transport, {
      errorStream: errorStream,
      audio: { cache: new InitializationSegmentCache() },
      video: { cache: new InitializationSegmentCache() },
    });

    const timings = createTimingsSampler(videoElement, { requiresMediaSource: pipelines.requiresMediaSource() });
    const stream = Stream({
      url,
      errorStream,
      keySystems,
      subtitles,
      hideNativeSubtitle,
      timings,
      images,
      timeFragment,
      adaptive,
      pipelines,
      videoElement,
      autoPlay,
    })
      .publish();

    const stalled = filterStreamByType(stream, "stalled").startWith(null);
    const loaded = filterStreamByType(stream, "loaded").take(1).share();

    const stateChanges = loaded.mapTo(PLAYER_LOADED)
      .concat(combineLatest(this.playing, stalled, calcPlayerState))
      .distinctUntilChanged()
      .startWith(PLAYER_LOADING);

    const playChanges = on(videoElement, ["play", "pause"]);
    const textTracksChanges = on(videoElement.textTracks, ["addtrack"]);

    const subs = this.subscriptions = new Subscription();
    subs.add(playChanges.subscribe(this._playPauseNext$, noop));
    subs.add(textTracksChanges.subscribe(this._textTrackChanges$, noop));
    subs.add(stateChanges.subscribe(this._setPlayerState$, noop));
    subs.add(timings.subscribe(this._triggerTimeChange$, noop));
    subs.add(stream.subscribe(
      this._streamNext$,
      this._streamFatalError$,
      this._streamComplete$
    ));
    subs.add(errorStream.subscribe(this._streamError$));
    subs.add(stream.connect());

    // _unsubscribe may have been called synchronously on early disposable
    if (!this.subscriptions) {
      subs.unsubscribe();
    } else {
      this._triggerTimeChange();
    }

    return loaded;
  }

  _streamNext(streamInfos) {
    const { type, value } = streamInfos;

    if (type == "buffer") {
      this._bufferNext(value);
    }
    if (type == "manifest") {
      this._manifestNext(value);
    }
    if (type == "pipeline") {
      this.trigger("progress", value.segment);
      const { bufferType, parsed } = value;
      if (bufferType === "image") {
        this.images.next(parsed.segmentData);
      }
    }

    this.stream.next(streamInfos);
  }

  _streamError(error) {
    this.trigger("warning", error);
    this.stream.next({ type: "warning", value: error });
  }

  _streamFatalError(error) {
    this._resetStates();
    this.error = error;
    this._setPlayerState(PLAYER_STOPPED);
    this._unsubscribe();
    this.trigger("error", error);
    this.stream.next({ type: "error", value: error });
  }

  _streamComplete() {
    this._resetStates();
    this._setPlayerState(PLAYER_ENDED);
    this._unsubscribe();
    this.stream.next({ type: "ended", value: null });
  }

  _manifestNext(manifest) {
    this.man = manifest;
    this.trigger("manifestChange", manifest);
  }

  _bufferNext({ bufferType, adaptation, representation }) {
    this.reps[bufferType] = representation;
    this.adas[bufferType] = adaptation;

    if (bufferType == "text") {
      this._recordState("subtitle", adaptation && adaptation.lang || "");
    }

    if (bufferType == "video") {
      this._recordState("videoBitrate", representation && representation.bitrate || -1);
    }

    if (bufferType == "audio") {
      this._recordState("language", adaptation && adaptation.lang || "");
      this._recordState("audioBitrate", representation && representation.bitrate || -1);
    }
  }

  _playPauseNext(evt) {
    if (this.video.ended !== true) {
      this.playing.next(evt.type == "play");
    }
  }

  _textTrackChanges({ target: [trackElement] }) {
    if (trackElement) {
      this.trigger("nativeTextTrackChange", trackElement);
    }
  }

  _setPlayerState(s) {
    if (this.state !== s) {
      this.state = s;
      log.info("playerStateChange", s);
      this.trigger("playerStateChange", s);
    }
  }

  _triggerTimeChange(t) {
    if (!this.man || !t) {
      this.trigger("currentTimeChange", getEmptyTimings());
    } else {
      if (this.man.isLive && t.ts > 0) {
        t.wallClockTime = toWallClockTime(t.ts, this.man);
        t.liveGap = getLiveGap(t.ts, this.man);
      }
      this.trigger("currentTimeChange", t);
    }
  }

  getError() {
    return this.error;
  }

  getManifest() {
    return this.man;
  }

  /**
   * Returns the DOM element used by the player.
   * @returns {HMTLMediaElement}
   */
  getVideoElement() {
    return this.video;
  }

  /**
   * Returns the text-track element used by the player to inject subtitles.
   * @returns {TextTrack}
   */
  getNativeTextTrack() {
    const textTracks = this.video.textTracks;
    if (textTracks.length > 0) {
      return this.video.textTracks[0];
    } else {
      return null;
    }
  }

  getImageTrack() {
    return this.images.distinctUntilChanged();
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
   * @throws Error - Throws if the given player has no manifest loaded.
   */
  isLive() {
    assertMan(this);
    return this.man.isLive;
  }

  /**
   * Returns the url of the content's manifest
   * @returns {string}
   * @throws Error - Throws if the given player has no manifest loaded.
   */
  getUrl() {
    assertMan(this);
    return this.man.locations[0];
  }

  /**
   * Returns the video duration, in seconds.
   * NaN if no video is playing.
   * Infinity if a live content is playing.
   * @returns {Number}
   */
  getVideoDuration() {
    return this.video.duration;
  }

  /**
   * Returns in seconds the duration of the loaded video on the current range.
   * @returns {Number}
   */
  getVideoLoadedTime() {
    return new BufferedRanges(this.video.buffered).getSize(this.video.currentTime);
  }

  /**
   * Returns in seconds the duration of the played video on the current range.
   * @returns {Number}
   */
  getVideoPlayedTime() {
    return new BufferedRanges(this.video.buffered).getLoaded(this.video.currentTime);
  }

    /**
     * Returns the current playback position :
     *   - 0 if no manifest is currently loaded
     *   - in seconds for an on-demand content
     *   - with a Date object for live content.
     * @returns {Number|Date}
     */
  getCurrentTime() {
    if (!this.man) {
      return 0;
    }

    const ct = this.video.currentTime;
    if (this.man.isLive) {
      return toWallClockTime(ct, this.man);
    } else {
      return ct;
    }
  }

  getStartTime() {
    return this.frag.start;
  }

  getEndTime() {
    return this.frag.end;
  }

  getPlaybackRate() {
    return this.video.playbackRate;
  }

  getVolume() {
    return this.video.volume;
  }

  isFullscreen() {
    return isFullscreen();
  }

  getAvailableLanguages() {
    return this.man && manifestHelpers.getAvailableLanguages(this.man) || [];
  }

  getAvailableSubtitles() {
    return this.man && manifestHelpers.getAvailableSubtitles(this.man) || [];
  }

  getLanguage() {
    return this.adaptive.getLanguage();
  }

  getSubtitle() {
    return this.adaptive.getSubtitle();
  }

  getAvailableVideoBitrates() {
    const video = manifestHelpers.getAdaptationsByType(this.man, "video");
    return (video[0] && video[0].bitrates.slice()) || [];
  }

  getAvailableAudioBitrates() {
    const audio = this.adas.audio;
    return (audio && audio.bitrates.slice()) || [];
  }

  getVideoBitrate() {
    return this.evts.videoBitrate;
  }

  getAudioBitrate() {
    return this.evts.audioBitrate;
  }

  getVideoMaxBitrate() {
    return this.adaptive.getVideoMaxBitrate();
  }

  getAudioMaxBitrate() {
    return this.adaptive.getAudioMaxBitrate();
  }

  getVideoBufferSize() {
    return this.adaptive.getVideoBufferSize();
  }

  getAudioBufferSize() {
    return this.adaptive.getAudioBufferSize();
  }

  getAverageBitrates() {
    return this.adaptive.getAverageBitrates();
  }

  getMetrics() {
    return this.metrics;
  }

  play() {
    this.video.play();
  }

  pause() {
    this.video.pause();
  }

  setPlaybackRate(rate) {
    this.video.playbackRate = rate;
  }

  goToStart() {
    return this.seekTo(this.getStartTime());
  }

  seekTo(time) {
    assert(this.man);
    const currentTs = this.video.currentTime;
    if (this.man.isLive) {
      time = fromWallClockTime(time, this.man);
    }
    if (time !== currentTs) {
      log.info("seek to", time);
      return (this.video.currentTime = time);
    } else {
      return currentTs;
    }
  }

  setFullscreen(toggle = true) {
    if (toggle === false) {
      exitFullscreen();
    } else {
      requestFullscreen(this.video);
    }
  }

  setVolume(volume) {
    if (volume !== this.video.volume) {
      this.video.volume = volume;
      this.trigger("volumeChange", volume);
    }
  }

  mute() {
    this.muted = this.getVolume() || 0.1;
    this.setVolume(0);
  }

  unMute() {
    const vol = this.getVolume();
    if (vol === 0) {
      this.setVolume(this.muted);
    }
  }

  normalizeLanguageCode(lng) {
    return normalizeLang(lng);
  }

  isLanguageAvailable(lng) {
    return this.getAvailableLanguages().indexOf(normalizeLang(lng)) >= 0;
  }

  isSubtitleAvailable(sub) {
    return this.getAvailableSubtitles().indexOf(normalizeLang(sub)) >= 0;
  }

  setLanguage(lng) {
    lng = normalizeLang(lng);
    assert(this.isLanguageAvailable(lng), "player: unknown language");
    this.adaptive.setLanguage(lng);
  }

  setSubtitle(sub) {
    sub = normalizeLang(sub);
    assert(!sub || this.isSubtitleAvailable(sub), "player: unknown subtitle");
    this.adaptive.setSubtitle(sub || "");
    if (!sub) {
      this._recordState("subtitle", "");
    }
  }

  setVideoBitrate(btr) {
    assert(btr === 0 || this.getAvailableVideoBitrates().indexOf(btr) >= 0, "player: video bitrate unavailable");
    this.adaptive.setVideoBitrate(btr);
  }

  setAudioBitrate(btr) {
    assert(btr === 0 || this.getAvailableAudioBitrates().indexOf(btr) >= 0, "player: audio bitrate unavailable");
    this.adaptive.setAudioBitrate(btr);
  }

  setVideoMaxBitrate(btr) {
    this.adaptive.setVideoMaxBitrate(btr);
  }

  setAudioMaxBitrate(btr) {
    this.adaptive.setAudioMaxBitrate(btr);
  }

  setVideoBufferSize(size) {
    this.adaptive.setVideoBufferSize(size);
  }

  setAudioBufferSize(size) {
    this.adaptive.setAudioBufferSize(size);
  }

  asObservable() {
    return this.stream;
  }

  getDebug() {
    return debugPane.getDebug(this);
  }

  showDebug() {
    debugPane.showDebug(this, this.video);
  }

  hideDebug() {
    debugPane.hideDebug();
  }

  toggleDebug() {
    debugPane.toggleDebug(this,this.video);
  }

  getCurrentKeySystem() {
    return EME.getCurrentKeySystem();
  }
}

module.exports = Player;
