/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use self file except in compliance with the License.
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

import objectAssign from "object-assign";

import log from "../../utils/log";
import assert from "../../utils/assert";
import warnOnce from "../../utils/warnOnce.js";
import { parseTimeFragment } from "./time-fragment";
import Transports from "../../net";

import {
  getEmptyTimings,
  toWallClockTime,
  getMaximumBufferPosition,
  getMaximumSecureBufferPosition,
} from "../timings";

import { PLAYER_STATES } from "./constants.js";

export default (self) => ({
  /**
   * Reset all states relative to a playing content.
   */
  resetContentState() {
    self._priv.manifest = null;
    self._priv.languageManager = null;
    self._priv.currentRepresentations = {
      video: null,
      audio: null,
      text: null,
      images: null,
    };
    self._priv.currentAdaptations = {
      video: null,
      audio: null,
      text: null,
      images: null,
    };
    self._priv.recordedEvents = {};

    self._priv.timeFragment = { start: null, end: null }; // @deprecated
    self._priv.fatalError = null;
    self._priv.imageTrack$.next(null); // @deprecated
    self._priv.currentImagePlaylist = null;
  },

  /**
   * Store and emit new player state (e.g. text track, videoBitrate...).
   * @param {string} type - the type of the updated state (videoBitrate...)
   * @param {*} value - its new value
   */
  recordState(type, value) {
    const prev = self._priv.recordedEvents[type];
    if (prev !== value) {
      self._priv.recordedEvents[type] = value;
      self.trigger(`${type}Change`, value);
    }
  },

  /**
   * Called each time the Stream instance emits.
   * @param {Object} streamInfos
   */
  onStreamNext(streamInfos) {
    const { type, value } = streamInfos;

    switch (type) {
    case "buffer":
      self._priv.onBufferNext(value);
      break;
    case "manifest":
      self._priv.onManifestNext(value);
      break;
    case "manifestUpdate":
      self._priv.onManifestUpdateNext(value);
      break;
    case "pipeline":
      self.trigger("progress", value.segment);
      const { bufferType, parsed } = value;
      if (bufferType === "image") {
        const value = parsed.segmentData;

        // TODO merge multiple data from the same track together
        self._priv.currentImagePlaylist = value;
        self.trigger("imageTrackUpdate", {
          data: self._priv.currentImagePlaylist,
        });

        // TODO @deprecated remove that
        self._priv.imageTrack$.next(value);
      }
    }

    // stream could be unset following the previous triggers
    // @deprecated
    if (self._priv.stream$) {
      self._priv.stream$.next(streamInfos);
    }
  },

  /**
   * Called each time the Stream emits through its errorStream (non-fatal
   * errors).
   * @param {Object} streamInfos
   */
  onErrorStreamNext(error) {
    self.trigger("warning", error);

    // stream could be unset following the previous triggers
    // @deprecated
    if (self._priv.stream$) {
      self._priv.stream$.next({ type: "warning", value: error });
    }
  },

  /**
   * Called when the Stream instance throws (fatal errors).
   * @param {Object} streamInfos
   */
  onStreamError(error) {
    self._priv.resetContentState();
    self._priv.fatalError = error;
    self._priv.setPlayerState(PLAYER_STATES.STOPPED);
    self._priv.clearLoaded$.next();
    self.trigger("error", error);

    // stream could be unset following the previous triggers
    // @deprecated
    if (self._priv.stream$) {
      self._priv.stream$.next({ type: "error", value: error });
    }
  },

  /**
   * Called when the Stream instance complete.
   * @param {Object} streamInfos
   */
  onStreamComplete() {
    self._priv.resetContentState();
    self._priv.setPlayerState(PLAYER_STATES.ENDED);
    self._priv.clearLoaded$.next();

    // stream could be unset following the previous triggers
    // @deprecated
    if (self._priv.stream$) {
      self._priv.stream$.next({ type: "ended", value: null });
    }
  },

  /**
   * Subscribe to audio and text track updates.
   */
  addLanguageSubscriptions() {
    assert(self._priv.languageManager, "no languageManager received");

    // listen for audio track change
    self._priv.languageManager.audioAdaptation$
      .map(() => self._priv.languageManager.getCurrentAudioTrack())
      .takeUntil(self._priv.clearLoaded$)
      .subscribe((track) => {
        self._priv.lastAudioTrack = track;
        self.trigger("languageChange", track.language); // deprecated
        self.trigger("audioTrackChange", track);
      });

    // listen for text track change
    self._priv.languageManager.textAdaptation$
      .map(() => self._priv.languageManager.getCurrentTextTrack())
      .takeUntil(self._priv.clearLoaded$)
      .subscribe(track => {
        self._priv.lastTextTrack = track;
        self.trigger("subtitleChange", track && track.language); // deprecated
        self.trigger("textTrackChange", track);
      });
  },

  /**
   * Called when the manifest is first downloaded.
   * @param {Object} value
   * @param {Manifest} value.manifest
   * @param {LanguageManager} value.languageManager
   */
  onManifestNext(value) {
    if (__DEV__) {
      assert(value && value.manifest, "no manifest received");
      assert(value.languageManager, "no languageManager received");
    }

    self._priv.manifest = value.manifest;
    self._priv.languageManager = value.languageManager;
    self.trigger("manifestChange", value.manifest);
    self._priv.addLanguageSubscriptions();
  },

  onManifestUpdateNext(value) {
    if (__DEV__) {
      assert(value && value.manifest, "no manifest received");
    }

    self._priv.manifest = value.manifest;
    self.trigger("manifestUpdate", value.manifest);
  },

  /**
   * Called each time the Stream emits a buffer-related event.
   * @param {Object} obj
   * @param {string} obj.bufferType
   * @param {Object} obj.adaptation
   * @param {Object} obj.representation
   */
  onBufferNext({ bufferType, adaptation, representation }) {
    self._priv.currentRepresentations[bufferType] = representation;
    self._priv.currentAdaptations[bufferType] = adaptation;

    if (bufferType == "video") {
      self._priv.recordState("videoBitrate",
        representation && representation.bitrate || -1);

    }

    if (bufferType == "audio") {
      self._priv.recordState("audioBitrate",
        representation && representation.bitrate || -1);
    }
  },

  /**
   * Called each time the player alternates between play and pause.
   * @param {Object} evt
   * @param {string} evt.type
   */
  onPlayPauseNext(evt) {
    if (self.videoElement.ended !== true) {
      self._priv.playing$.next(evt.type == "play");
    }
  },

  /**
   * Called each time a textTrack is added to the video DOM Element.
   * @param {Object} evt
   * @param {HTMLElement} evt.target
   */
  onNativeTextTrackNext({ target: [trackElement] }) {
    if (trackElement) {
      self.trigger("nativeTextTrackChange", trackElement);
    }
  },

  /**
   * Called each time the player state updates.
   * @param {string} s
   */
  setPlayerState(s) {
    if (self.state !== s) {
      self.state = s;
      log.info("playerStateChange", s);
      self.trigger("playerStateChange", s);
    }
  },

  /**
   * Called each time a new timing object is emitted.
   * @param {Object} t
   */
  triggerTimeChange(t) {
    if (!self._priv.manifest || !t) {
      self.trigger("currentTimeChange", getEmptyTimings());
    } else {
      if (self._priv.manifest.isLive && t.ts > 0) {
        t.wallClockTime = toWallClockTime(t.ts, self._priv.manifest);
        t.liveGap = getMaximumBufferPosition(self._priv.manifest) - t.ts;
      }
      const positionData = {
        position: t.ts,
        duration: t.duration,
        bufferGap: isFinite(t.gap) ? t.gap : 0, // TODO fix higher up
        liveGap: t.liveGap,
        playbackRate: t.playback,
        wallClockTime: t.wallClockTime && t.wallClockTime.getTime() / 1000,

        // TODO This property should be removed in a next version (after
        // multiple tests) to only have liveGap
        // We should be the closest to the live edge when it comes to buffering.
        // TODO normally, we should also integrate timeFragment.end into this
        // However. It would be very ugly to do so and keeping compatibility
        // hard.
        // As this is a new API, and as timeFragment is deprecated, I let it
        // pass (do not hit me!)
        maximumBufferTime: getMaximumSecureBufferPosition(this._manifest),
      };
      self.trigger("positionUpdate", positionData);

      // TODO @deprecate
      // compatibilty with a previous API where the liveGap was about the
      // last buffer-isable position
      t.liveGap = positionData.maximumBufferTime - t.ts;
      self.trigger("currentTimeChange", t);
    }
  },

  /**
   * Parse the options given as arguments to the loadVideo method.
   * @param {Player} player
   * @param {Object} opts
   * @returns {Object}
   */
  parseLoadVideoOptions(opts) {
    opts = objectAssign({
      transport: self.defaultTransport,
      transportOptions: {},
      keySystems: [],
      timeFragment: {}, // @deprecated
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
      timeFragment, // @deprecated
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
      emeRobustnesses,
    } = opts;

    // ---- Deprecated calls

    let _defaultAudioTrack = defaultAudioTrack;
    let _defaultTextTrack = defaultTextTrack;

    if (defaultLanguage != null && defaultAudioTrack == null) {
      warnOnce("defaultLanguage is deprecated. Use defaultAudioTrack instead");
      _defaultAudioTrack = defaultLanguage;
    }
    if (
      opts.hasOwnProperty("defaultSubtitle") &&
      !opts.hasOwnProperty("defaultTextTrack")
    ) {
      warnOnce("defaultSubtitle is deprecated. Use defaultTextTrack instead");
      _defaultTextTrack = defaultSubtitle;
    }

    if (subtitles !== void 0 && supplementaryTextTracks === void 0) {
      warnOnce(
        "the subtitles option is deprecated. Use supplementaryTextTracks instead"
      );
      supplementaryTextTracks = subtitles;
    }
    if (images !== void 0 && supplementaryImageTracks === void 0) {
      warnOnce(
        "the images option is deprecated. Use supplementaryImageTracks instead"
      );
      supplementaryImageTracks = images;
    }

    // ----

    if (_defaultAudioTrack === undefined) {
      _defaultAudioTrack = self._priv.lastAudioTrack;
    }

    if (_defaultTextTrack === undefined) {
      _defaultTextTrack = self._priv.lastTextTrack;
    }

    timeFragment = parseTimeFragment(timeFragment); // @deprecated

    // compatibility with directFile api
    if (directFile) {
      transport = "directfile";
    }

    // compatibility with old API authorizing to pass multiple
    // manifest url depending on the key system
    assert(!!manifests ^ !!url, "player: you have to pass either a url or a list of manifests");
    if (manifests) {
      warnOnce(
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
      transport = transport(objectAssign(
        {},
        self.defaultTransportOptions,
        transportOptions
      ));
    }

    assert(transport, "player: transport " + opts.transport + " is not supported");

    return {
      url,
      keySystems,
      supplementaryTextTracks,
      hideNativeSubtitle,
      supplementaryImageTracks,
      timeFragment, // @deprecated
      autoPlay,
      defaultAudioTrack: _defaultAudioTrack,
      defaultTextTrack: _defaultTextTrack,
      transport,
      startAt,
      emeRobustnesses,
    };
  },
});
