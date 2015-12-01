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

var Promise_ = require("canal-js-utils/promise");

var _ = require("canal-js-utils/misc");
var log = require("canal-js-utils/log");
var { Subscription, BehaviorSubject, Observable, Subject } = require("canal-js-utils/rx");
var { combineLatest, defer, zip } = Observable;
var { on } = require("canal-js-utils/rx-ext");
var EventEmitter = require("canal-js-utils/eventemitter");
var debugPane = require("../utils/debug");
var assert = require("canal-js-utils/assert");

var {
  HTMLVideoElement_,
  exitFullscreen,
  requestFullscreen,
  isFullscreen,
  onFullscreenChange
} = require("./compat");

var {
  getEmptyTimings,
  timingsSampler,
  toWallClockTime,
  fromWallClockTime,
  getLiveGap,
} = require("./timings");

var { InitializationSegmentCache } = require("./cache");
var { BufferedRanges } = require("./ranges");
var { parseTimeFragment } = require("./time-fragment");
var DeviceEvents = require("./device-events");
var manifestHelpers = require("./manifest");
// TODO(pierre): separate transports from main build
var Transports = require("../net");
var PipeLines = require("./pipelines");
var Adaptive = require("../adaptive");
var Stream = require("./stream");
var EME = require("./eme");

var PLAYER_STOPPED   = "STOPPED";
var PLAYER_LOADED    = "LOADED";
var PLAYER_LOADING   = "LOADING";
var PLAYER_PLAYING   = "PLAYING";
var PLAYER_PAUSED    = "PAUSED";
var PLAYER_ENDED     = "ENDED";
var PLAYER_BUFFERING = "BUFFERING";
var PLAYER_SEEKING   = "SEEKING";

function createDirectFileManifest() {
  return {
    isLive: false,
    duration: Infinity,
  };
}

function assertMan(player) {
  assert(player.man, "player: no manifest loaded");
}

function filterStreamByType(stream, type) {
  return stream.filter(o => o.type == type).pluck("value");
}

class Player extends EventEmitter {

  constructor(options) {
    var {
      videoElement,
      transport,
      transportOptions,
      defaultLanguage,
      defaultSubtitle,
      initVideoBitrate,
      initAudioBitrate
    } = options;

    super();
    this.defaultTransport = transport;
    this.defaultTransportOptions = transportOptions || {};

    if (!videoElement)
      videoElement = document.createElement("video");

    assert((videoElement instanceof HTMLVideoElement_),
      "requires an actual HTMLVideoElement");

    // Workaroud to support Firefox autoplay on FF 42.
    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1194624
    videoElement.preload = "auto";

    this.version = __RX_PLAYER_VERSION_PLACEHOLDER__;
    this.video = videoElement;

    // fullscreen change
    this.fullscreen = onFullscreenChange(videoElement)
      .subscribe(() => this.trigger("fullscreenChange", this.isFullscreen()));

    // playing state change
    this.playing = new BehaviorSubject();

    // multicaster forwarding all streams events
    this.stream = new Subject();

    var { createPipelines, metrics } = PipeLines();

    var timings = timingsSampler(videoElement);
    var deviceEvents = DeviceEvents(videoElement);

    this.createPipelines = createPipelines;
    this.metrics = metrics;
    this.timings = timings;

    this.adaptive = Adaptive(metrics, timings, deviceEvents, {
      initVideoBitrate,
      initAudioBitrate,
      defaultLanguage,
      defaultSubtitle,
    });

    // volume muted memory
    this.muted = 0.1;

    // states
    this._setState(PLAYER_STOPPED);
    this.resetStates();

    this.log = log;
  }

  resetStates() {
    this.man = null;
    this.reps = { video: null, audio: null, text: null };
    this.adas = { video: null, audio: null, text: null };
    this.evts = {};
    this.frag = { start: null, end: null };
  }

  _clear() {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
      this.subscriptions = null;
    }
  }

  stop() {
    if (this.state !== PLAYER_STOPPED) {
      this.resetStates();
      this._clear();
      this._setState(PLAYER_STOPPED);
    }
  }

  dispose() {
    this.stop();
    this.metrics.unsubscribe();
    this.adaptive.unsubscribe();
    this.fullscreen.unsubscribe();
    this.stream.unsubscribe();

    this.metrics = null;
    this.adaptive = null;
    this.fullscreen = null;
    this.stream = null;

    this.timings = null;
    this.createPipelines = null;
    this.video = null;
  }

  __recordState(type, value) {
    var prev = this.evts[type];
    if (prev !== value) {
      this.evts[type] = value;
      this.trigger(`${type}Change`, value);
    }
  }

  _parseOptions(opts) {
    var {
      transport,
      transportOptions,
      url,
      manifests,
      keySystems,
      timeFragment,
      subtitles,
      autoPlay,
      directFile
    } = _.defaults(_.cloneObject(opts), {
      transport: this.defaultTransport,
      transportOptions: {},
      keySystems: [],
      timeFragment: {},
      subtitles: [],
      autoPlay: false,
      directFile: false,
    });

    timeFragment = parseTimeFragment(timeFragment);

    // compatibility with old API authorizing to pass multiple
    // manifest url depending on the key system
    assert(!!manifests ^ !!url, "player: you have to pass either a url or a list of manifests");
    if (manifests) {
      var firstManifest = manifests[0];
      url = firstManifest.url;
      subtitles = firstManifest.subtitles || [];
      keySystems = _.compact(_.pluck(manifests, "keySystem"));
    }

    if (_.isString(transport))
      transport = Transports[transport];

    if (_.isFunction(transport))
      transport = transport(_.defaults(transportOptions, this.defaultTransportOptions));

    assert(transport, "player: transport " + opts.transport + " is not supported");

    if (directFile)
      directFile = createDirectFileManifest();

    return { url, keySystems, subtitles, timeFragment, autoPlay, transport, directFile };
  }

  loadVideo(options = {}) {
    options = this._parseOptions(options);
    log.info("loadvideo", options);

    var {
      url,
      keySystems,
      subtitles,
      timeFragment,
      autoPlay,
      transport,
      directFile
    } = options;

    this.stop();
    this.frag = timeFragment;
    this.playing.next(autoPlay);

    var pipelines = this.createPipelines(transport, {
      audio: { cache: new InitializationSegmentCache() },
      video: { cache: new InitializationSegmentCache() },
    });

    var { adaptive, timings, video } = this;
    var stream;
    try {
      stream = Stream({
        url,
        keySystems,
        subtitles,
        timings,
        timeFragment,
        adaptive,
        pipelines,
        videoElement: video,
        autoPlay,
        directFile,
      });
    }
    catch(err) {
      stream = defer(() => { throw err; });
    }

    stream = stream.publish();

    var segments = filterStreamByType(stream, "segment");
    var manifests = filterStreamByType(stream, "manifest");

    var stalled = filterStreamByType(stream, "stalled").startWith(null);
    var canPlay = filterStreamByType(stream, "loaded").filter(v => v === true);

    var loaded;

    if (directFile) {
      loaded = canPlay;
    } else {
      loaded = zip(
        canPlay,
        filterStreamByType(segments.pluck("adaptation"), "audio"),
        filterStreamByType(segments.pluck("adaptation"), "video"),
        _.noop);
    }

    loaded = loaded.take(1);

    var stateChanges = loaded.map(PLAYER_LOADED)
      .concat(combineLatest(this.playing, stalled,
        (isPlaying, isStalled) => {
          if (isStalled)
            return (isStalled.name == "seeking")
              ? PLAYER_SEEKING
              : PLAYER_BUFFERING;

          if (isPlaying)
            return PLAYER_PLAYING;

          return PLAYER_PAUSED;
        })
      )
      .distinctUntilChanged()
      .startWith(PLAYER_LOADING);

    var subscriptions = this.subscriptions = new Subscription();
    var subs = [
      on(video, ["play", "pause"])
        .each(evt => this.playing.next(evt.type == "play")),

      segments.each((segment) => {
        var type = segment.adaptation.type;

        var rep = segment.representation;
        var ada = segment.adaptation;
        this.reps[type] = rep;
        this.adas[type] = ada;

        if (type == "text") {
          this.__recordState("subtitle", ada.lang);
        }
        if (type == "video") {
          this.__recordState("videoBitrate", rep.bitrate);
        }
        if (type == "audio") {
          this.__recordState("language", ada.lang);
          this.__recordState("audioBitrate", rep.bitrate);
        }

        this.trigger("progress", segment);
      }),

      manifests.each(m => {
        this.man = m;
        this.trigger("manifestChange", m);
      }),

      stateChanges
        .each(s => this._setState(s)),

      timings.each(t => this._triggerTimeChange(t)),

      stream.subscribe(
        () => {},
        (e) => {
          this.resetStates();
          this.trigger("error", e);
          this._setState(PLAYER_STOPPED);
          this._clear();
        },
        () => {
          this.resetStates();
          this._setState(PLAYER_ENDED);
          this._clear();
        }
      ),

      stream.subscribe(
        n => this.stream.next(n),
        e => this.stream.next({ type: "error", value: e })
      ),

      stream.connect()
    ];

    _.each(subs, s => subscriptions.add(s));

    // _clear may have been called synchronously on early disposable
    if (!this.subscriptions) {
      subscriptions.unsubscribe();
    }

    this._triggerTimeChange();

    return loaded.toPromise();
  }

  _setState(s) {
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

  getManifest() {
    return this.man;
  }

  getVideoElement() {
    return this.video;
  }

  getNativeTextTrack() {
    return this.video.textTracks[0];
  }

  getPlayerState() {
    return this.state;
  }

  isLive() {
    assertMan(this);
    return this.man.isLive;
  }

  getUrl() {
    assertMan(this);
    return this.man.locations[0];
  }

  getVideoDuration() {
    return this.video.duration;
  }

  getVideoLoadedTime() {
    return new BufferedRanges(this.video.buffered).getSize(this.video.currentTime);
  }

  getVideoPlayedTime() {
    return new BufferedRanges(this.video.buffered).getLoaded(this.video.currentTime);
  }

  getCurrentTime() {
    if (!this.man)
      return 0;

    var ct = this.video.currentTime;
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
    var video = this.man && this.man.adaptations.video[0];
    return (video && video.bitrates) || [];
  }

  getAvailableAudioBitrates() {
    var audio = this.adas.audio;
    return (audio && audio.bitrates) || [];
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

  getTimings() {
    return this.timings;
  }

  play() {
    this.video.play();
  }

  pause() {
    this.video.pause();
  }

  setPlaybackRate(rate) {
    return new Promise_(res => res(this.video.playbackRate = rate));
  }

  goToStart() {
    return this.seekTo(this.getStartTime());
  }

  seekTo(time) {
    return new Promise_(res => {
      assert(this.man);
      var currentTs = this.video.currentTime;
      if (this.man.isLive) time = fromWallClockTime(time, this.man);
      if (time !== currentTs) {
        log.info("seek to", time);
        res(this.video.currentTime = time);
      } else {
        res(currentTs);
      }
    });
  }

  setFullscreen(toggle = true) {
    if (toggle === false)
      exitFullscreen();
    else
      requestFullscreen(this.video);
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
    var vol = this.getVolume();
    if (vol === 0) this.setVolume(this.muted);
  }

  setLanguage(lng) {
    // TODO(pierre): proper promise
    return new Promise_(res => {
      assert(_.contains(this.getAvailableLanguages(), lng), "player: unknown language");
      res(this.adaptive.setLanguage(lng));
    });
  }

  setSubtitle(sub) {
    // TODO(pierre): proper promise
    return new Promise_(res => {
      assert(!sub || _.contains(this.getAvailableSubtitles(), sub), "player: unknown subtitle");
      res(this.adaptive.setSubtitle(sub || ""));
    })
      .then(() => {
        if (!sub)
          this.__recordState("subtitle", null);
      });
  }

  setVideoBitrate(btr) {
    // TODO(pierre): proper promise
    return new Promise_(res => {
      assert(btr === 0 || _.contains(this.getAvailableVideoBitrates(), btr), "player: video bitrate unavailable");
      res(this.adaptive.setVideoBitrate(btr));
    });
  }

  setAudioBitrate(btr) {
    // TODO(pierre): proper promise
    return new Promise_(res => {
      assert(btr === 0 || _.contains(this.getAvailableAudioBitrates(), btr), "player: audio bitrate unavailable");
      res(this.adaptive.setAudioBitrate(btr));
    });
  }

  setVideoMaxBitrate(btr) {
    // TODO(pierre): proper promise
    return new Promise_(res => {
      res(this.adaptive.setVideoMaxBitrate(btr));
    });
  }

  setAudioMaxBitrate(btr) {
    // TODO(pierre): proper promise
    return new Promise_(res => {
      res(this.adaptive.setAudioMaxBitrate(btr));
    });
  }

  setVideoBufferSize(size) {
    // TODO(pierre): proper promise
    return new Promise_(res => res(this.adaptive.setVideoBufferSize(size)));
  }

  setAudioBufferSize(size) {
    // TODO(pierre): proper promise
    return new Promise_(res => res(this.adaptive.setAudioBufferSize(size)));
  }

  getStreamObservable() {
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
