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
  normalizeAudioTrack,
  normalizeTextTrack,
} = require("../utils/languages");
const EventEmitter = require("../utils/eventemitter");
const debugPane = require("../utils/debug");
const assert = require("../utils/assert");
const { Manifest } = require("../manifest/manifest.js");
const { Adaptation } = require("../manifest/adaptation.js");
const { Representation } = require("../manifest/representation.js");

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
  getMaximumBufferPosition,
  getMinimumBufferPosition,
} = require("./timings");

const {
  ErrorTypes,
  ErrorCodes,
} = require("../errors");

const { InitializationSegmentCache } = require("./cache");
const { BufferedRanges } = require("./ranges");
const { parseTimeFragment } = require("./time-fragment");
const DeviceEvents = require("./device-events");
const {
  getAvailableTextTracks,
  getAvailableAudioTracks,
  getAdaptationsByType,
} = require("./manifest.js");

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
   * @deprecated
   * @returns {Object}
   */
  static getErrorTypes() {
    console.warn("getErrorTypes is deprecated. Use the ErrorTypes property instead");
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
    console.warn("getErrorCodes is deprecated. Use the ErrorCodes property instead");
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
      limitVideoWidth = true,
      throttleWhenHidden = true,
    } = options;

    super();

    // -- Deprecated checks

    let _initialVideoBitrate = initialVideoBitrate;
    let _initialAudioBitrate = initialAudioBitrate;
    let _defaultAudioTrack = defaultAudioTrack;
    let _defaultTextTrack = defaultTextTrack;

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
    if (defaultSubtitle != null && defaultTextTrack == null) {
      console.warn("defaultSubtitle is deprecated. Use defaultTextTrack instead");
      _defaultTextTrack = defaultSubtitle;
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
      initialVideoBitrate: _initialVideoBitrate,
      initialAudioBitrate: _initialAudioBitrate,
      maxVideoBitrate,
      maxAudioBitrate,
      defaultAudioTrack: normalizeAudioTrack(_defaultAudioTrack),
      defaultTextTrack: normalizeTextTrack(_defaultTextTrack),
      limitVideoWidth,
      throttleWhenHidden,
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
    this._currentImagePlaylist = null;
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
   * Store and emit new player state (e.g. text track, videoBitrate...).
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
      textTracks: [],
      imageTracks: [],
      autoPlay: false,
      hideNativeSubtitle: false,
      directFile: false,
    }, opts);

    let {
      transport,
      url,
      keySystems,
      timeFragment,
      supplementaryTextTracks,
      supplementaryImageTracks,
    } = opts;

    const {
      subtitles,
      images,
      transportOptions,
      manifests,
      autoPlay,
      directFile,
      defaultLanguage,
      defaultAudioTrack,
      defaultSubtitle,
      defaultTextTrack,
      hideNativeSubtitle, // TODO better name
      startAt,
    } = opts;

    // ---- Deprecated calls

    let _defaultAudioTrack = defaultAudioTrack;
    let _defaultTextTrack = defaultTextTrack;

    if (defaultLanguage != null && defaultAudioTrack == null) {
      console.warn("defaultLanguage is deprecated. Use defaultAudioTrack instead");
      _defaultAudioTrack = defaultLanguage;
    }
    if (defaultSubtitle != null && defaultTextTrack == null) {
      console.warn("defaultSubtitle is deprecated. Use defaultTextTrack instead");
      _defaultTextTrack = defaultSubtitle;
    }

    if (subtitles !== void 0 && supplementaryTextTracks === void 0) {
      console.warn(
        "the subtitles option is deprecated. Use supplementaryTextTracks instead"
      );
      supplementaryTextTracks = subtitles;
    }
    if (images !== void 0 && supplementaryImageTracks === void 0) {
      console.warn(
        "the images option is deprecated. Use supplementaryImageTracks instead"
      );
      supplementaryImageTracks = images;
    }

    // ----

    timeFragment = parseTimeFragment(timeFragment);

    // compatibility with directFile api
    if (directFile) {
      transport = "directfile";
    }

    // compatibility with old API authorizing to pass multiple
    // manifest url depending on the key system
    assert(!!manifests ^ !!url, "player: you have to pass either a url or a list of manifests");
    if (manifests) {
      console.warn(
        "the manifests options is deprecated, use url instead"
      );
      const firstManifest = manifests[0];
      url = firstManifest.url;

      supplementaryTextTracks = firstManifest.subtitles || [];
      supplementaryImageTracks = firstManifest.images || [];
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
      supplementaryTextTracks,
      hideNativeSubtitle,
      supplementaryImageTracks,
      timeFragment,
      autoPlay,
      defaultAudioTrack: _defaultAudioTrack,
      defaultTextTrack: _defaultTextTrack,
      transport,
      startAt,
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
      supplementaryTextTracks,
      hideNativeSubtitle,
      supplementaryImageTracks,
      timeFragment,
      autoPlay,
      transport,
      defaultAudioTrack,
      defaultTextTrack,
      startAt,
    } = options;

    this.stop();
    this.frag = timeFragment;
    this.playing.next(autoPlay);

    if (defaultAudioTrack != null) {
      this.adaptive.setAudioTrack(normalizeAudioTrack(defaultAudioTrack));
    }

    if (defaultTextTrack != null) {
      this.adaptive.setTextTrack(normalizeTextTrack(defaultTextTrack));
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
      image: { maxRetry: 0 }, // Deactivate BIF fetching if it fails
                              // TODO Better adaptive strategy
    });

    const timings = createTimingsSampler(videoElement, { requiresMediaSource: pipelines.requiresMediaSource() });
    const stream = Stream({
      url,
      errorStream,
      keySystems,
      supplementaryTextTracks,
      hideNativeSubtitle,
      timings,
      supplementaryImageTracks,
      timeFragment,
      adaptive,
      pipelines,
      videoElement,
      autoPlay,
      startAt,
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
      // TODO @deprecated
      this.trigger("progress", value.segment);
      const { bufferType, parsed } = value;
      if (bufferType === "image") {
        const value = parsed.segmentData;

        // TODO merge multiple data from the same track together
        this._currentImagePlaylist = value;
        this.trigger("imageTrackUpdate", {
          data: this._currentImagePlaylist,
        });

        // TODO @deprecated remove that
        this.images.next(value);
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
        id: adaptation.id,
      } : null;
      this._recordState("subtitle", track && track.language); // deprecated
      this._recordState("textTrack", track);
    }

    if (bufferType == "video") {
      this._recordState("videoBitrate", representation && representation.bitrate || -1);

    }

    if (bufferType == "audio") {
      const track = {
        language: adaptation && adaptation.lang || "",
        audioDescription: !!(adaptation && adaptation.audioDescription),
        id: adaptation.id,
      };
      this._recordState("language", track.language); // deprecated
      this._recordState("audioTrack", track);
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
      const positionData = {
        position: t.ts,
        duration: t.duration,
        bufferGap: isFinite(t.gap) ? t.gap : 0, // TODO fix higher up
        liveGap: t.liveGap,
        playbackRate: t.playback,
        wallClockTime: t.wallClockTime && t.wallClockTime.getTime() / 1000,
      };
      this.trigger("positionUpdate", positionData);

      // TODO @deprecate
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
   */
  getManifest() {
    if (!this.man){
      return null;
    }

    // TODO switch entirely to the Manifest class
    return new Manifest(this.man);
  }

  getCurrentAdaptations() {
    if (!this.man){
      return null;
    }

    // TODO switch entirely to the Manifest class
    const adas = this.adas || [];
    return Object.keys(adas).reduce((acc, val) => {
      if (adas[val]) {
        acc[val] = new Adaptation(adas[val]);
      }
      return acc;
    }, {});
  }

  getCurrentRepresentations() {
    if (!this.man){
      return null;
    }

    // TODO switch entirely to the Manifest class
    const reps = this.reps || [];
    return Object.keys(reps).reduce((acc, val) => {
      if (reps[val]) {
        acc[val] = new Representation(reps[val]);
      }
      return acc;
    }, {});
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
   * @deprecate
   * @returns {Observable}
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
   * Returns in seconds the difference between:
   *   - the start of the current contiguous loaded range.
   *   - the current time.
   * @returns {Number}
   */
  getVideoLoadedTime() {
    return new BufferedRanges(this.video.buffered).getSize(this.video.currentTime);
  }

  /**
   * Returns in seconds the difference between:
   *   - the start of the current contiguous loaded range.
   *   - the current time.
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
   * @deprecated
   * @returns {Number|Date}
   */
  getCurrentTime() {
    // console.warn(
    //   "getCurrentTime is deprecated and won't be available in the next major version." +
    //   " Use either getWallClockTime or getPosition instead."
    // );
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
    if (!this.man) {
      return 0;
    }
    const ct = this.video.currentTime;
    return this.isLive() ?
      (+toWallClockTime(ct, this.man) / 1000) : ct;
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
    return this.video.currentTime;
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
   * @deprecated
   * @returns {Array.<string}
   */
  getAvailableLanguages() {
    console.warn(
      "getAvailableLanguages is deprecated and won't be available in the next major version." +
      " Use getAvailableAudioTracks instead."
    );
    return this.man &&
      getAvailableAudioTracks(this.man).map(l => l.language)
      || [];
  }

  /**
   * @deprecated
   * @returns {Array.<string}
   */
  getAvailableSubtitles() {
    console.warn(
      "getAvailableSubtitles is deprecated and won't be available in the next major version." +
      " Use getAvailableTextTracks instead."
    );
    return this.man &&
      getAvailableTextTracks(this.man).map(s =>  s.language)
      || [];
  }

  /**
   * Returns last chosen language.
   * @deprecated
   * @returns {string}
   */
  getLanguage() {
    console.warn(
      "getLanguage is deprecated and won't be available in the next major version." +
      " Use getAudioTrack instead."
    );
    return this.evts.language;
  }

  /**
   * Returns last chosen subtitle.
   * @deprecated
   * @returns {string}
   */
  getSubtitle() {
    console.warn(
      "getSubtitle is deprecated and won't be available in the next major version." +
      " Use getTextTrack instead."
    );
    return this.evts.subtitle;
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableVideoBitrates() {
    const video = getAdaptationsByType(this.man, "video");
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
   * @deprecated
   * @returns {Number}
   */
  getVideoMaxBitrate() {
    console.warn("getVideoMaxBitrate is deprecated. Use getMaxVideoBitrate instead");
    return this.getMaxVideoBitrate();
  }

  /**
   * Returns max wanted video bitrate currently set.
   * @returns {Number}
   */
  getMaxVideoBitrate() {
    return this.adaptive.getVideoMaxBitrate();
  }

  /**
   * Returns max wanted audio bitrate currently set.
   * @deprecated
   * @returns {Number}
   */
  getAudioMaxBitrate() {
    console.warn("getAudioMaxBitrate is deprecated. Use getMaxAudioBitrate instead");
    return this.getMaxAudioBitrate();
  }

  /**
   * Returns max wanted audio bitrate currently set.
   * @returns {Number}
   */
  getMaxAudioBitrate() {
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
   * @deprecated
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

    // NON-deprecated part
    if (time) {
      if (time.relative) {
        this.video.currentTime = currentTs + time.relative;
        return;
      }
      else if (time.position) {
        this.video.currentTime = time.relative;
        return;
      }
      else if (time.wallClockTime) {
        this.video.currentTime =
          fromWallClockTime(time.wallClockTime * 1000, this.man);
        return;
      }
    }

    // deprecated part
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
      console.warn("setFullscreen(false) is deprecated. Use exitFullscreen instead");
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
    // TODO This is not perfect as volume can be set to 0 without being muted.
    // We should probably reset this.muted once unMute is called.
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
   * @deprecated
   * @param {string|Object} lng
   * @returns {Boolean}
   */
  isLanguageAvailable(arg) {
    // console.warn(
    //   "isLanguageAvailable is deprecated and won't be available in the next major version."
    // );
    const track = normalizeAudioTrack(arg);

    if (!track) {
      return false;
    }

    return !!this.getAvailableAudioTracks().find(lng =>
      lng.language === track.language
    );
  }

  /**
   * Returns true if the corresponding subtitles track, normalized,
   * @deprecated
   * is available.
   * @param {string|Object} lng
   * @returns {Boolean}
   */
  isSubtitleAvailable(arg) {
    // console.warn(
    //   "isSubtitleAvailable is deprecated and won't be available in the next major version."
    // );
    const track = normalizeTextTrack(arg);

    if (!track) {
      return false;
    }

    return !!this.getAvailableTextTracks().find(lng =>
      lng.language === track.language
    );
  }

  /**
   * Update the audio language.
   * @deprecated
   * @param {string|Object} lng
   */
  setLanguage(arg) {
    console.warn(
      "setLanguage is deprecated and won't be available in the next major version." +
      " Use setAudioTrack instead."
    );
    const track = normalizeAudioTrack(arg);
    assert(this.isLanguageAvailable(track), "player: unknown language");
    this.adaptive.setAudioTrack(track);
  }

  /**
   * Update the audio language.
   * @deprecated
   * @param {string|Object} sub
   */
  setSubtitle(arg) {
    console.warn(
      "setSubtitle is deprecated and won't be available in the next major version." +
      " Use setTextTrack instead."
    );
    if (arg == null) { // deactivate subtitles
      this.adaptive.setTextTrack(null);
      this._recordState("subtitle", null);
      return;
    }

    const track = normalizeTextTrack(arg);
    assert(this.isSubtitleAvailable(track), "player: unknown subtitle");
    this.adaptive.setTextTrack(track);
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
   * @deprecated
   * @param {Number} btr
   */
  setVideoMaxBitrate(btr) {
    console.warn("setVideoMaxBitrate is deprecated. Use setMaxVideoBitrate instead");
    return this.setMaxVideoBitrate(btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setMaxVideoBitrate(btr) {
    this.adaptive.setVideoMaxBitrate(btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @deprecated
   * @param {Number} btr
   */
  setAudioMaxBitrate(btr) {
    console.warn("setAudioMaxBitrate is deprecated. Use setMaxAudioBitrate instead");
    return this.setMaxAudioBitrate(btr);
  }

  /**
   * Update the maximum video bitrate the user can switch to.
   * @param {Number} btr
   */
  setMaxAudioBitrate(btr) {
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
   * @returns {Array.<Object>|null}
   */
  getAvailableAudioTracks() {
    const currentAudioTrack = this.getAudioTrack();

    if (!this.man) {
      return null;
    }

    return getAvailableAudioTracks(this.man)
      .map(track =>
        Object.assign({}, track, {
          active: currentAudioTrack.id === track.id,
        })
      );
  }

  /**
   * @returns {Array.<Object>|null}
   */
  getAvailableTextTracks() {
    const currentTextTrack = this.getTextTrack();

    if (!this.man) {
      return null;
    }

    return getAvailableTextTracks(this.man)
      .map(track =>
        Object.assign({}, track, {
          active: !!currentTextTrack && currentTextTrack.id === track.id,
        })
      );
  }

  /**
   * Returns last chosen language.
   * @returns {string}
   */
  getAudioTrack() {
    return this.evts.audioTrack;
  }

  /**
   * Returns last chosen subtitle.
   * @returns {string}
   */
  getTextTrack() {
    return this.evts.textTrack;
  }

  /**
   * Update the audio language.
   * @param {string} audioId
   */
  setAudioTrack(audioId) {
    const track = this.getAvailableAudioTracks()
      .find(({ id }) => id === audioId);
    assert(track, "player: unknown audio track");
    this.adaptive.setAudioTrack(track);
  }

  /**
   * Update the audio language.
   * @param {string} sub
   */
  setTextTrack(textId) {
    const track = this.getAvailableTextTracks()
      .find(({ id }) => id === textId);
    assert(track, "player: unknown text track");
    this.adaptive.setTextTrack(track);
  }

  disableTextTrack() {
    this.adaptive.setTextTrack(null);
    this._recordState("subtitle", null);
    return;
  }

  getImageTrackData() {
    if (!this.man) {
      return null;
    }

    return this._currentImagePlaylist;
  }

  getMinimumPosition() {
    if (!this.man) {
      return null;
    }

    return getMinimumBufferPosition(this.man);
  }

  getMaximumPosition() {
    if (!this.man) {
      return null;
    }

    return getMaximumBufferPosition(this.man);
  }
}

module.exports = Player;
