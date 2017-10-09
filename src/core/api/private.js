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

/**
 * This file defines the private methods of the API.
 * This is isolated from the rest of the player class for different reasons:
 *
 *   - There is many private methods which "pollutes" the namespace, when a
 *     user wants to experiment the player (e.g. in a console).
 *
 *   - The player keeps a lot of state, which can be subject to change with
 *     future features. Keeping it isolated helps to know which one / convince
 *     users to not rely on them.
 */

import deepEqual from "deep-equal";

import log from "../../utils/log";
import assert from "../../utils/assert";

import {
  toWallClockTime,
  getMaximumBufferPosition,
} from "../../manifest/timings.js";

import { PLAYER_STATES } from "./constants.js";

import LanguageManager from "./language_manager.js";

export default (self) => ({
  /**
   * Reset all states relative to a playing content.
   */
  resetContentState() {
    // language management
    self._priv.initialAudioTrack = undefined;
    self._priv.initialTextTrack = undefined;
    self._priv.languageManager = null;

    self._priv.abrManager = null;

    self._priv.manifest = null;
    self._priv.currentRepresentations = {};
    self._priv.currentAdaptations = {};

    self._priv.recordedEvents = {}; // event memory

    self._priv.fatalError = null;
    self._priv.currentImagePlaylist = null;
  },

  /**
   * Store and emit new player state (e.g. text track, videoBitrate...).
   * We check for deep equality to avoid emitting 2 consecutive times the same
   * state.
   * @param {string} type - the type of the updated state (videoBitrate...)
   * @param {*} value - its new value
   */
  recordState(type, value) {
    const prev = self._priv.recordedEvents[type];
    if (!deepEqual(prev, value)) {
      self._priv.recordedEvents[type] = value;
      self.trigger(`${type}Change`, value);
    }
  },

  /**
   * Called each time the Stream Observable emits.
   * @param {Object} streamInfos - payload emitted
   */
  onStreamNext(streamInfos) {
    const { type, value } = streamInfos;

    switch (type) {
    case "representationChange":
      self._priv.onRepresentationChange(value);
      break;
    case "manifestUpdate":
      self._priv.onManifestUpdate(value);
      break;
    case "adaptationChange":
      self._priv.onAdaptationChange(value);
      break;
    case "bitrateEstimationChange":
      self._priv.onBitrateEstimationChange(value);
      break;
    case "manifestChange":
      self._priv.onManifestChange(value);
      break;
    case "pipeline":
      const { bufferType, parsed } = value;
      if (bufferType === "image") {
        const value = parsed.segmentData;

        // TODO merge multiple data from the same track together
        self._priv.currentImagePlaylist = value;
        self.trigger("imageTrackUpdate", {
          data: self._priv.currentImagePlaylist,
        });
      }
    }
  },

  /**
   * Called each time the Stream emits through its errorStream (non-fatal
   * errors).
   * @param {Object} streamInfos
   */
  onErrorStreamNext(error) {
    self.trigger("warning", error);
  },

  /**
   * Called when the Stream instance throws (fatal errors).
   * @param {Object} streamInfos
   */
  onStreamError(error) {
    self._priv.resetContentState();
    self._priv.fatalError = error;
    self._priv.unsubscribeLoadedVideo$.next();
    self._priv.setPlayerState(PLAYER_STATES.STOPPED);

    // TODO This condition is here because the eventual callback called when the
    // player state is updated can launch a new content, thus the error will not
    // be here anymore, in which case triggering the "error" event is unwanted.
    // This is not perfect however as technically, this condition could be true
    // even for a new content (I cannot see it happen with the current code but
    // that's not a reason). In that case, "error" would be triggered 2 times.
    // Find a better solution.
    if (self._priv.fatalError === error) {
      self.trigger("error", error);
    }
  },

  /**
   * Called when the Stream instance complete.
   * @param {Object} streamInfos
   */
  onStreamComplete() {
    self._priv.resetContentState();
    self._priv.unsubscribeLoadedVideo$.next();
    self._priv.setPlayerState(PLAYER_STATES.ENDED);
  },

  /**
   * Called when the manifest is first downloaded.
   * @param {Object} value
   * @param {Manifest} value.manifest - The Manifest instance
   * @param {Subject} value.adaptations$ - Subject to emit the chosen
   * adaptation for each type.
   */
  onManifestChange(value) {
    if (__DEV__) {
      assert(value && value.manifest, "no manifest received");
      assert(value && value.adaptations$, "no adaptations subject received");
      assert(value && value.abrManager, "no ABR Manager received");
    }

    const { manifest, adaptations$ = {} } = value;
    self._priv.manifest = manifest;

    // set language management for audio and text
    self._priv.languageManager =
      new LanguageManager(manifest.adaptations, {
        audio$: adaptations$.audio,
        text$: adaptations$.text,
      }, {
        defaultAudioTrack: self._priv.initialAudioTrack,
        defaultTextTrack: self._priv.initialTextTrack,
      });

    // Set first adaptation for the rest
    Object.keys(adaptations$).forEach((type) => {
      // audio and text is already completely managed by the languageManager
      if (type !== "audio" && type !== "text") {
        const adaptations = manifest.adaptations[type] || [];
        adaptations$[type].next(adaptations[0] || null);
      }
    });

    self._priv.abrManager = value.abrManager;

    self.trigger("manifestChange", manifest);
  },

  onManifestUpdate(value) {
    if (__DEV__) {
      assert(value && value.manifest, "no manifest received");
    }

    const { manifest } = value;
    self._priv.manifest = manifest;
    self._priv.languageManager.updateAdaptations(manifest.adaptations);

    self.trigger("manifestUpdate", manifest);
  },

  /**
   * @param {Object} obj
   * @param {string} obj.type
   * @param {Object} obj.adaptation
   */
  onAdaptationChange({ type, adaptation }) {
    self._priv.currentAdaptations[type] = adaptation;

    // TODO Emit adaptationChange?

    if (!self._priv.languageManager) {
      return;
    }
    if (type === "audio") {
      const audioTrack = self._priv.languageManager.getCurrentAudioTrack();
      self._priv.lastAudioTrack = audioTrack;
      self._priv.recordState("audioTrack", audioTrack);
    } else if (type === "text") {
      const textTrack = self._priv.languageManager.getCurrentTextTrack();
      self._priv.lastTextTrack = textTrack;
      self._priv.recordState("textTrack", textTrack);
    }
  },

  /**
   * Called each time a representation changes.
   * @param {Object} obj
   * @param {string} obj.type
   * @param {Object} obj.representation
   */
  onRepresentationChange({ type, representation }) {
    self._priv.currentRepresentations[type] = representation;

    const bitrate = representation && representation.bitrate;
    if (bitrate != null) {
      self._priv.lastBitrates[type] = bitrate;
    }

    // TODO Emit representationChange?

    if (type == "video") {
      self._priv.recordState("videoBitrate", bitrate != null ? bitrate : -1);
    } else if (type == "audio") {
      self._priv.recordState("audioBitrate", bitrate != null ? bitrate : -1);
    }
  },

  onBitrateEstimationChange({ type, bitrate }) {
    if (__DEV__) {
      assert(type != null);
      assert(bitrate != null);
    }
    self._priv.recordState("bitrateEstimation", { type, bitrate });
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
    self.trigger("nativeTextTrackChange", trackElement || null );
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
   * @param {Object} timing
   */
  triggerTimeChange(timing) {
    if (!self._priv.manifest || !timing) {
      return;
    }

    const positionData = {
      position: timing.currentTime,
      duration: timing.duration,
      playbackRate: timing.playbackRate,

      // TODO fix higher up?
      bufferGap: isFinite(timing.bufferGap) ? timing.bufferGap : 0,
    };

    if (self._priv.manifest.isLive && timing.currentTime > 0) {
      positionData.wallClockTime =
        toWallClockTime(timing.currentTime, self._priv.manifest)
          .getTime() / 1000;
      positionData.liveGap =
        getMaximumBufferPosition(self._priv.manifest) - timing.currentTime;
    }

    self.trigger("positionUpdate", positionData);
  },
});
