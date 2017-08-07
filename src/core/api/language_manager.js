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

import {
  normalize as normalizeLang,
  normalizeAudioTrack,
  normalizeTextTrack,
} from "../../utils/languages";

import config from "../../config.js";

const findTextAdaptation = (adaptations, trackConfig) => {
  if (!trackConfig) {
    return null;
  }

  if (!adaptations.length) {
    return void 0;
  }

  const foundTextTrack = arrayFind(adaptations, (textAdaptation) =>
    normalizeLang(trackConfig.language) ===
      normalizeLang(textAdaptation.language) &&
    trackConfig.closedCaption === textAdaptation.isClosedCaption
  );
  return foundTextTrack;
};

const findAudioAdaptation = (adaptations, trackConfig) => {
  if (!adaptations.length || !trackConfig) {
    return undefined;
  }

  const foundAudioTrack = arrayFind(adaptations, (audioAdaptation) =>
    normalizeLang(trackConfig.language) ===
      normalizeLang(audioAdaptation.language) &&
    trackConfig.audioDescription === audioAdaptation.isAudioDescription
  );
  return foundAudioTrack;
};

/**
 * # LanguageManager
 *
 * ## Overview
 *
 * Takes in the text and audio adaptations parsed from a manifest and provide
 * various methods and properties to set/get the right adaption based on a
 * language configuration.
 */
class LanguageManager {
  /**
   * Set the adaptations from where to choose from and find the default
   * audio/text track.
   *
   * @constructor
   *
   * @param {Object} adaptations
   * @param {Array.<Adaptation>} adaptations.audio
   * @param {Array.<Adaptation>} adaptations.text
   *
   * @param {Object} adaptations$
   * @param {Subject} adaptations$.audio$
   * @param {Subject} adaptations$.text$
   *
   * @param {Object} [options={}]
   * @param {Object|null} [options.defaultTextTrack]
   * @param {Object|null} [options.defaultAudioTrack]
   */
  constructor({ text, audio }, { text$, audio$ }, options = {}) {
    const defaultAudioTrack = options.defaultAudioTrack === undefined ?
      config.DEFAULT_AUDIO_TRACK : options.defaultAudioTrack;

    const defaultTextTrack = options.defaultTextTrack === undefined ?
      config.DEFAULT_TEXT_TRACK : options.defaultTextTrack;

    const normalizedAudioTrack = normalizeAudioTrack(defaultAudioTrack);
    const normalizedTextTrack = normalizeTextTrack(defaultTextTrack);

    const textAdaptations = text || [];
    const audioAdaptations = audio || [];

    // set class context
    this._currentAudioAdaptation = null;
    this._currentTextAdaptation = null;
    this._textAdaptations = textAdaptations;
    this._audioAdaptations = audioAdaptations;
    this._text$ = text$;
    this._audio$ = audio$;

    if (audio$) {
      // emit initial adaptations
      const initialAudioAdaptation =
        findAudioAdaptation(audioAdaptations, normalizedAudioTrack) ||
        audioAdaptations[0];
      this._currentAudioAdaptation = initialAudioAdaptation;

      audio$.next(initialAudioAdaptation);
    }

    if (text$) {
      const initialTextAdaptation =
        findTextAdaptation(textAdaptations, normalizedTextTrack) ||
        null;
      this._currentTextAdaptation = initialTextAdaptation;

      text$.next(initialTextAdaptation);
    }
  }

  updateAdaptations({ audio, text }) {
    this._audioAdaptations = audio || [];
    this._textAdaptations = text || [];

    const currentAudioAdaptation = this._currentAudioAdaptation;
    const currentAudioId = currentAudioAdaptation && currentAudioAdaptation.id;

    let audioAdaptationFound;
    if (currentAudioId != null) {
      audioAdaptationFound = arrayFind(audio, ({ id }) =>
        id === currentAudioId);
    }

    if (!audioAdaptationFound) {
      const foundTrack =
        findAudioAdaptation(audio, {
          language: currentAudioAdaptation.language,
          audioDescription: !!currentAudioAdaptation.isAudioDescription,
        });

      this._currentAudioAdaptation = foundTrack || audio[0];
      this._audio$.next(this._currentAudioAdaptation);
    }

    const currentTextAdaptation = this._currentTextAdaptation;
    const currentTextId = currentTextAdaptation && currentTextAdaptation.id;

    let textAdaptationFound;
    if (currentTextId != null) {
      textAdaptationFound = arrayFind(text, ({ id }) =>
        id === currentTextId);
    }

    if (currentTextId !== null && !textAdaptationFound) {
      const foundTrack =
        findTextAdaptation(text, {
          language: currentTextAdaptation.language,
          closedCaption: !!currentTextAdaptation.isClosedCaption,
        });

      this._currentTextAdaptation = foundTrack || text[0];
      this._text$.next(this._currentTextAdaptation);
    }
  }

  /**
   * @deprecated
   */
  setAudioTrackLegacy(trackConfig) {
    const foundTrack = findAudioAdaptation(
      this._audioAdaptations,
      normalizeAudioTrack(trackConfig)
    );

    if (!foundTrack) {
      throw new Error("Audio Track not found.");
    }

    this._audio$.next(foundTrack);
  }

  /**
   * @deprecated
   */
  setTextTrackLegacy(trackConfig) {
    const foundTrack = findTextAdaptation(
      this._textAdaptations,
      normalizeTextTrack(trackConfig)
    );

    if (foundTrack === undefined) {
      throw new Error("Text Track not found.");
    }

    this._text$.next(foundTrack);
  }

  setAudioTrack(wantedId) {
    const foundTrack = arrayFind(this._audioAdaptations, ({ id }) =>
      id === wantedId);

    if (foundTrack === undefined) {
      throw new Error("Audio Track not found.");
    }

    this._audio$.next(foundTrack);
  }

  setTextTrack(wantedId) {
    const foundTrack = arrayFind(this._textAdaptations, ({ id }) =>
      id === wantedId);

    if (foundTrack === undefined) {
      throw new Error("Text Track not found.");
    }

    this._text$.next(foundTrack);
  }

  disableTextTrack() {
    this._text$.next(null);
  }

  getCurrentAudioTrack() {
    const adaptation = this._currentAudioAdaptation;
    if (!adaptation) {
      return null;
    }
    return {
      language: normalizeLang(adaptation.language),
      audioDescription: adaptation.isAudioDescription,
      id: adaptation.id,
    };
  }

  getCurrentTextTrack() {
    const adaptation = this._currentTextAdaptation;
    if (!adaptation) {
      return null;
    }
    return {
      language: normalizeLang(adaptation.language),
      closedCaption: adaptation.isClosedCaption,
      id: adaptation.id,
    };
  }

  getAvailableAudioTracks() {
    const currentTrack = this._currentAudioAdaptation;
    const currentId = currentTrack && currentTrack.id;
    return this._audioAdaptations
      .map((adaptation) => ({
        language: normalizeLang(adaptation.language),
        audioDescription: adaptation.isAudioDescription,
        id: adaptation.id,
        active: currentId == null ? false : currentId === adaptation.id,
      }));
  }

  getAvailableTextTracks() {
    const currentTrack = this._currentTextAdaptation;
    const currentId = currentTrack && currentTrack.id;
    return this._textAdaptations
      .map((adaptation) => ({
        language: normalizeLang(adaptation.language),
        closedCaption: adaptation.isClosedCaption,
        id: adaptation.id,
        active: currentId == null ? false : currentId === adaptation.id,
      }));
  }
}

export default LanguageManager;
