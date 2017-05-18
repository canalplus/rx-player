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
const {
  normalize: normalizeLang,
  normalizeLanguage,
  normalizeSubtitle,
} = require("../utils/languages");
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
 * VERY simple deepEqual function, optimized for the player
 * events.
 * @param {*} prev
 * @param {*} next
 * @returns {Boolean}
 */
function eventsAreEqual(prev, next) {
  if (prev === next) {
    return true;
  }

  if (typeof prev === "object" && typeof next === "object") {
    if (prev === null || next === null) {
      return false;
    }
    const prevKeys = Object.keys(prev);
    if (prevKeys.length !== Object.keys(next).length) {
      return false;
    }

    for (const prop of prevKeys) {
      if (
        !next.hasOwnProperty(prop) ||
        !eventsAreEqual(prev[prop], next[prop])
      ) {
        return false;
      }
    }
    return true;
  }

  return false;
}

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
   * TODO deprecate an switch to static get ErrorTypes, more idiomatic
   * (next-version)
   */
  static getErrorTypes() {
    return ErrorTypes;
  }

  /**
   * @returns {Object}
   * TODO deprecate an switch to static get ErrorCodes, more idiomatic
   * (next-version)
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
      defaultAudioTrack,
      defaultSubtitle,
      defaultSubtitlesTrack,
      initVideoBitrate,
      initialVideoBitrate,
      initAudioBitrate,
      initialAudioBitrate,
      maxVideoBitrate,
      maxAudioBitrate,
    } = options;

    super();

    // -- Deprecated checks

    let _initialVideoBitrate = initialVideoBitrate;
    let _initialAudioBitrate = initialAudioBitrate;
    let _defaultAudioTrack = defaultAudioTrack;
    let _defaultSubtitlesTrack = defaultSubtitlesTrack;

    if (initVideoBitrate != null && initialVideoBitrate == null) {
      console.warn("initVideoBitrate is deprecated. Use initialVideoBitrate instead");
      _initialVideoBitrate = initVideoBitrate;
    }
    if (initAudioBitrate != null && initialAudioBitrate == null) {
      console.warn("initAudioBitrate is deprecated. Use initialAudioBitrate instead");
      _initialAudioBitrate = initAudioBitrate;
    }
    if (defaultLanguage != null && defaultAudioTrack == null) {
      console.warn("defaultLanguage is deprecated. Use defaultAudioTrack instead");
      _defaultAudioTrack = defaultLanguage;
    }
    if (defaultSubtitle != null && defaultSubtitlesTrack == null) {
      console.warn("defaultSubtitle is deprecated. Use defaultSubtitlesTrack instead");
      _defaultSubtitlesTrack = defaultSubtitle;
    }

    // --

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
      _initialVideoBitrate,
      _initialAudioBitrate,
      maxVideoBitrate,
      maxAudioBitrate,
      defaultLanguage: normalizeLanguage(_defaultAudioTrack),
      defaultSubtitle: normalizeSubtitle(_defaultSubtitlesTrack),
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
   * @private
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
   * @private
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

  /**
   * Free the resources used by the player.
   */
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

  /**
   * Store and emit new player state (e.g. subtitle, videoBitrate...).
   * @private
   * @param {string} type - the type of the updated state (videoBitrate...)
   * @param {*} value - its new value
   */
  _recordState(type, value) {
    const prev = this.evts[type];
    if (!eventsAreEqual(prev, value)) {
      this.evts[type] = value;
      this.trigger(`${type}Change`, value);
    }
  }

  /**
   * Parse the options given as arguments to the loadVideo method.
   * @private
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

  /**
   * Load a new video.
   * @param {Object} options
   * @returns {Observable}
   */
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

    if (defaultLanguage != null) {
      this.adaptive.setLanguage(normalizeLanguage(defaultLanguage));
    }

    if (defaultSubtitle != null) {
      this.adaptive.setSubtitle(normalizeSubtitle(defaultSubtitle));
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

  /**
   * Called each time the Stream instance emits.
   * @private
   * @param {Object} streamInfos
   */
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

  /**
   * Called each time the Stream emits through its errorStream (non-fatal
   * errors).
   * @private
   * @param {Object} streamInfos
   */
  _streamError(error) {
    this.trigger("warning", error);
    this.stream.next({ type: "warning", value: error });
  }

  /**
   * Called when the Stream instance throws (fatal errors).
   * @private
   * @param {Object} streamInfos
   */
  _streamFatalError(error) {
    this._resetStates();
    this.error = error;
    this._setPlayerState(PLAYER_STOPPED);
    this._unsubscribe();
    this.trigger("error", error);
    this.stream.next({ type: "error", value: error });
  }

  /**
   * Called when the Stream instance complete.
   * @private
   * @param {Object} streamInfos
   */
  _streamComplete() {
    this._resetStates();
    this._setPlayerState(PLAYER_ENDED);
    this._unsubscribe();
    this.stream.next({ type: "ended", value: null });
  }

  /**
   * Called each time a manifest is downloaded.
   * @private
   * @param {Object} manifest
   */
  _manifestNext(manifest) {
    this.man = manifest;
    this.trigger("manifestChange", manifest);
  }

  /**
   * Called each time the Stream emits a buffer-related event.
   * @private
   * @param {Object} obj
   * @param {string} obj.bufferType
   * @param {Object} obj.adaptation
   * @param {Object} obj.representation
   */
  _bufferNext({ bufferType, adaptation, representation }) {
    this.reps[bufferType] = representation;
    this.adas[bufferType] = adaptation;

    if (bufferType == "text") {
      const track = adaptation && adaptation.lang ? {
        language: adaptation.lang,
        closedCaption: !!adaptation.closedCaption,
      } : null;
      this._recordState("subtitle", track);
    }

    if (bufferType == "video") {
      this._recordState("videoBitrate", representation && representation.bitrate || -1);
    }

    if (bufferType == "audio") {
      const track = {
        language: adaptation && adaptation.lang || "",
        audioDescription: !!(adaptation && adaptation.audioDescription),
      };
      this._recordState("language", track);
      this._recordState("audioBitrate", representation && representation.bitrate || -1);
    }
  }

  /**
   * Called each time the player alternates between play and pause.
   * @private
   * @param {Object} evt
   * @param {string} evt.type
   */
  _playPauseNext(evt) {
    if (this.video.ended !== true) {
      this.playing.next(evt.type == "play");
    }
  }

  /**
   * Called each time a textTrack is added to the video DOM Element.
   * @private
   * @param {Object} evt
   * @param {HTMLElement} evt.target
   */
  _textTrackChanges({ target: [trackElement] }) {
    if (trackElement) {
      this.trigger("nativeTextTrackChange", trackElement);
    }
  }

  /**
   * Called each time the player state updates.
   * @private
   * @param {string} s
   */
  _setPlayerState(s) {
    if (this.state !== s) {
      this.state = s;
      log.info("playerStateChange", s);
      this.trigger("playerStateChange", s);
    }
  }

  /**
   * Called each time a new timing object is emitted.
   * @param {Object} t
   */
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

  /**
   * Returns fatal error if one for the current content. null otherwise.
   * @returns {Object|null}
   */
  getError() {
    return this.error;
  }

  /**
   * Returns manifest/playlist object.
   * null if the player is STOPPED.
   * @returns {Object|null}
   * TODO Define manifest structure in documentation.
   */
  getManifest() {
    return this.man;
  }

  /**
   * Returns the video DOM element used by the player.
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

  /**
   * @returns {Observable}
   * TODO simpler option that an observable for an API?
   */
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
   * TODO Do not throw if STOPPED
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
   * TODO Do not throw if STOPPED
   * TODO Rename to getManifestUrl (next-version)
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

  /**
   * @returns {Number}
   */
  getStartTime() {
    return this.frag.start;
  }

  /**
   * @returns {Number}
   */
  getEndTime() {
    return this.frag.end;
  }

  /**
   * @returns {Number}
   */
  getPlaybackRate() {
    return this.video.playbackRate;
  }

  /**
   * @returns {Number}
   */
  getVolume() {
    return this.video.volume;
  }

  /**
   * @returns {Boolean}
   */
  isFullscreen() {
    return isFullscreen();
  }

  /**
   * @returns {Array.<string}
   */
  getAvailableLanguages() {
    console.warn(
      "getAvailableLanguages is deprecated and won't be available in the next major version." +
      " Use getAvailableAudioTracks instead."
    );
    return this.man &&
      manifestHelpers.getAvailableLanguages(this.man).map(l => l.language)
      || [];
  }

  /**
   * @returns {Array.<string}
   */
  getAvailableSubtitles() {
    console.warn(
      "getAvailableSubtitles is deprecated and won't be available in the next major version." +
      " Use getAvailableSubtitlesTracks instead."
    );
    return this.man &&
      manifestHelpers.getAvailableSubtitles(this.man).map(s =>  s.language)
      || [];
  }

  /**
   * Returns last chosen language.
   * @returns {string}
   */
  getLanguage() {
    console.warn(
      "getLanguage is deprecated and won't be available in the next major version." +
      " Use getAudioTrack instead."
    );
    return this.evts.language.language;
  }

  /**
   * Returns last chosen subtitle.
   * @returns {string}
   */
  getSubtitle() {
    console.warn(
      "getSubtitle is deprecated and won't be available in the next major version." +
      " Use getSubtitlesTrack instead."
    );
    return this.evts.subtitle;
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableVideoBitrates() {
    const video = manifestHelpers.getAdaptationsByType(this.man, "video");
    return (video[0] && video[0].bitrates.slice()) || [];
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableAudioBitrates() {
    const audio = this.adas.audio;
    return (audio && audio.bitrates.slice()) || [];
  }

  /**
   * Returns currently considered bitrate for video segments.
   * @returns {Number}
   */
  getVideoBitrate() {
    return this.evts.videoBitrate;
  }

  /**
   * Returns currently considered bitrate for audio segments.
   * @returns {Number}
   */
  getAudioBitrate() {
    return this.evts.audioBitrate;
  }

  /**
   * Returns max wanted video bitrate currently set.
   * @returns {Number}
   */
  getVideoMaxBitrate() {
    return this.adaptive.getVideoMaxBitrate();
  }

  /**
   * Returns max wanted audio bitrate currently set.
   * @returns {Number}
   */
  getAudioMaxBitrate() {
    return this.adaptive.getAudioMaxBitrate();
  }

  /**
   * Returns maximum buffer size wanted for video segments, in seconds.
   * @returns {Number}
   */
  getVideoBufferSize() {
    return this.adaptive.getVideoBufferSize();
  }

  /**
   * Returns maximum buffer size wanted for audio segments, in seconds.
   * @returns {Number}
   */
  getAudioBufferSize() {
    return this.adaptive.getAudioBufferSize();
  }

  /**
   * Get last calculated average bitrate, from an exponential moving average
   * formula.
   * @returns {Number}
   */
  getAverageBitrates() {
    return this.adaptive.getAverageBitrates();
  }

  /**
   * Returns metrics used to emit informations about the downloaded segments.
   * TODO deprecate
   */
  getMetrics() {
    return this.metrics;
  }

  /**
   * Play/Resume the current video.
   */
  play() {
    this.video.play();
  }

  /**
   * Pause playback of the video.
   */
  pause() {
    this.video.pause();
  }

  /**
   * Update the playback rate of the video (TODO adapt this with ABR).
   * @param {Number} rate
   */
  setPlaybackRate(rate) {
    this.video.playbackRate = rate;
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

  /**
   * Set/exit fullScreen.
   * @param {Boolean} [toggle=true] - if false, exit full screen.
   * TODO just toggleFullscreen API or setFullscreen + exitFullscreen
   * deprecate this one.
   */
  setFullscreen(toggle = true) {
    if (toggle === false) {
      exitFullscreen();
    } else {
      requestFullscreen(this.video);
    }
  }

  /**
   * @param {Number}
   */
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
   * @param {string|Object} lng
   * @returns {Boolean}
   */
  isLanguageAvailable(arg) {
    console.warn(
      "isLanguageAvailable is deprecated and won't be available in the next major version." +
      " Use hasAudioTrack instead."
    );
    const track = normalizeLanguage(arg);

    if (!track) {
      return false;
    }

    return !!this.getAvailableAudioTracks().find(lng =>
      lng.language === track.language &&
      lng.audioDescription === !!track.audioDescription
    );
  }

  /**
   * Returns true if the corresponding subtitles track, normalized,
   * is available.
   * @param {string|Object} lng
   * @returns {Boolean}
   * TODO Deprecate and rename to hasSubtitlesTrack (next-version)
   */
  isSubtitleAvailable(arg) {
    console.warn(
      "isSubtitleAvailable is deprecated and won't be available in the next major version." +
      " Use hasSubtitlesTrack instead."
    );
    const track = normalizeSubtitle(arg);

    if (!track) {
      return false;
    }

    return !!this.getAvailableSubtitlesTracks().find(lng =>
      lng.language === track.language &&
      lng.closedCaption === !!track.closedCaption
    );
  }

  /**
   * Update the audio language.
   * @param {string|Object} lng
   * TODO Deprecate and rename to setAudioTrack (next-version)
   */
  setLanguage(arg) {
    console.warn(
      "setLanguage is deprecated and won't be available in the next major version." +
      " Use setAudioTrack instead."
    );
    const track = normalizeLanguage(arg);
    assert(this.hasAudioTrack(track), "player: unknown language");
    this.adaptive.setLanguage(track);
  }

  /**
   * Update the audio language.
   * @param {string|Object} sub
   * TODO Deprecate and rename to setSubtitlesTrack (next-version)
   */
  setSubtitle(arg) {
    console.warn(
      "setSubtitle is deprecated and won't be available in the next major version." +
      " Use setSubtitlesTrack instead."
    );
    if (arg == null) { // deactivate subtitles
      this.adaptive.setSubtitle(null);
      this._recordState("subtitle", null);
      return;
    }

    const track = normalizeSubtitle(arg);
    assert(this.hasSubtitlesTrack(track), "player: unknown subtitle");
    this.adaptive.setSubtitle(track);
  }

  /**
   * Force the video bitrate to a given value.
   * Set to 0 or undefined to switch to automatic mode.
   * @throws Error - The bitrate given is not available as a video bitrate.
   * @param {Number} btr
   * TODO Stop throwing, act as a ceil instead
   */
  setVideoBitrate(btr) {
    assert(btr === 0 || this.getAvailableVideoBitrates().indexOf(btr) >= 0, "player: video bitrate unavailable");
    this.adaptive.setVideoBitrate(btr);
  }

  /**
   * Force the audio bitrate to a given value.
   * Set to 0 or undefined to switch to automatic mode.
   * @throws Error - The bitrate given is not available as an audio bitrate.
   * @param {Number} btr
   * TODO Stop throwing, act as a ceil instead
   */
  setAudioBitrate(btr) {
    assert(btr === 0 || this.getAvailableAudioBitrates().indexOf(btr) >= 0, "player: audio bitrate unavailable");
    this.adaptive.setAudioBitrate(btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setVideoMaxBitrate(btr) {
    this.adaptive.setVideoMaxBitrate(btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setAudioMaxBitrate(btr) {
    this.adaptive.setAudioMaxBitrate(btr);
  }

  /**
   * Update the maximum buffer size for the video segments, in second
   * @param {Number} size
   */
  setVideoBufferSize(size) {
    this.adaptive.setVideoBufferSize(size);
  }

  /**
   * Update the maximum buffer size for the audio segments, in second
   * @param {Number} size
   */
  setAudioBufferSize(size) {
    this.adaptive.setAudioBufferSize(size);
  }

  /**
   * TODO Deprecate this API
   */
  asObservable() {
    return this.stream;
  }

  /**
   * Returns multiple debugs informations.
   * TODO Document that
   * @returns {Object}
   */
  getDebug() {
    return debugPane.getDebug(this);
  }

  /**
   * Show debug overlay on the video element.
   */
  showDebug() {
    debugPane.showDebug(this, this.video);
  }

  /**
   * Hide debug overlay from the video element.
   */
  hideDebug() {
    debugPane.hideDebug();
  }

  /**
   * Show/Hide debug overlay from the video element.
   */
  toggleDebug() {
    debugPane.toggleDebug(this,this.video);
  }

  /**
   * Returns type of current keysystem (e.g. playready, widevine) if the content
   * is encrypted. null otherwise.
   * @returns {string}
   */
  getCurrentKeySystem() {
    return EME.getCurrentKeySystem();
  }

  /**
   * @returns {Array.<string}
   */
  getAvailableAudioTracks() {
    return this.man && manifestHelpers.getAvailableLanguages(this.man) || [];
  }

  /**
   * @returns {Array.<string}
   */
  getAvailableSubtitlesTracks() {
    return this.man && manifestHelpers.getAvailableSubtitles(this.man) || [];
  }

  /**
   * Returns last chosen language.
   * @returns {string}
   */
  getAudioTrack() {
    return this.evts.language;
  }

  /**
   * Returns last chosen subtitle.
   * @returns {string}
   */
  getSubtitlesTrack() {
    return this.evts.subtitle.language;
  }

  /**
   * Returns true if the corresponding audio language, normalized, is available.
   * @param {string|Object} lng
   * @returns {Boolean}
   */
  hasAudioTrack(arg) {
    const track = normalizeLanguage(arg);

    if (!track) {
      return false;
    }

    return !!this.getAvailableAudioTracks().find(lng =>
      lng.language === track.language &&
      lng.audioDescription === !!track.audioDescription
    );
  }

  /**
   * Returns true if the corresponding subtitles track, normalized,
   * is available.
   * @param {string|Object} lng
   * @returns {Boolean}
   */
  hasSubtitlesTrack(arg) {
    const track = normalizeSubtitle(arg);

    if (!track) {
      return false;
    }

    return !!this.getAvailableSubtitlesTracks().find(lng =>
      lng.language === track.language &&
      lng.closedCaption === !!track.closedCaption
    );
  }

  /**
   * Update the audio language.
   * @param {string|Object} lng
   */
  setAudioTrack(arg) {
    const track = normalizeLanguage(arg);
    assert(this.hasAudioTrack(track), "player: unknown language");
    this.adaptive.setLanguage(track);
  }

  /**
   * Update the audio language.
   * @param {string|Object} sub
   */
  setSubtitlesTrack(arg) {
    if (arg == null) { // deactivate subtitles
      this.adaptive.setSubtitle(null);
      this._recordState("subtitle", null);
      return;
    }

    const track = normalizeSubtitle(arg);
    assert(this.hasSubtitlesTrack(track), "player: unknown subtitle");
    this.adaptive.setSubtitle(track);
  }
}

module.exports = Player;
