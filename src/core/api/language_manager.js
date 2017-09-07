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

/**
 * Try to find the given track config in the adaptations given:
 *
 * If no track config return null.
 * If no adaptation are found return undefined.
 *
 * @param {Array.<Object>} adaptations
 * @param {Object} trackConfig
 * @param {string} trackConfig.language
 * @param {string} trackConfig.normalized
 * @param {string} trackConfig.closedCaption
 * @return {null|undefined|Object}
 */
const findTextAdaptation = (adaptations, trackConfig) => {
  if (!trackConfig) {
    return null;
  }

  if (!adaptations.length) {
    return void 0;
  }

  const foundTextTrack = arrayFind(adaptations, (textAdaptation) =>
    trackConfig.normalized === textAdaptation.normalizedLanguage &&
    trackConfig.closedCaption === textAdaptation.isClosedCaption
  );

  return foundTextTrack;
};

/**
 * Try to find the given track config in the adaptations given:
 *
 * If no track config return null.
 * If no adaptation are found return undefined.
 *
 * @param {Array.<Object>} adaptations
 * @param {Object} trackConfig
 * @param {string} trackConfig.language
 * @param {string} trackConfig.normalized
 * @param {string} trackConfig.audioDescription
 * @return {null|undefined|Object}
 */
const findAudioAdaptation = (adaptations, trackConfig) => {
  if (!adaptations.length || !trackConfig) {
    return undefined;
  }

  const foundAudioTrack = arrayFind(adaptations, (audioAdaptation) =>
    trackConfig.normalized === audioAdaptation.normalizedLanguage &&
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
   * @param {Array.<Adaptation>} adaptations.audio - The different audio
   * adaptations available right now.
   * Can be updated through the updateAdaptations method.
   * @param {Array.<Adaptation>} adaptations.text - The different text
   * adaptations available right now.
   * Can be updated through the updateAdaptations method.
   *
   * @param {Object} adaptations$
   * @param {Subject} adaptations$.audio$ - Subject through which the chosen
   * audio adaptation will be emitted.
   * Will emit the first choice before the constructor finish.
   * @param {Subject} adaptations$.text$ - Subject through which the chosen
   * text adaptation will be emitted
   * Will emit the first choice before the constructor finish.
   *
   * @param {Object} [options={}]
   * @param {Object} [options.defaultTextTrack] - The language and closedCaption
   * status of the text track chosen by default. If not set, the first
   * adaptation will be taken instead.
   * @param {Object} [options.defaultAudioTrack] - The language and
   * audiodescription status of the audio track chosen by default.
   * If not set, the first adaptation will be taken instead.
   */
  constructor({ text, audio }, { text$, audio$ }, options = {}) {
    const {
      defaultAudioTrack,
      defaultTextTrack,
    } = options;

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
      const initialAudioAdaptation = defaultAudioTrack ?
        findAudioAdaptation(audioAdaptations, defaultAudioTrack) ||
        audioAdaptations[0] : audioAdaptations[0];
      this._currentAudioAdaptation = initialAudioAdaptation;

      audio$.next(this._currentAudioAdaptation);
    }

    if (text$) {
      const initialTextAdaptation = defaultTextTrack ?
        findTextAdaptation(textAdaptations, defaultTextTrack) ||
        null : null;
      this._currentTextAdaptation = initialTextAdaptation;

      text$.next(this._currentTextAdaptation);
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
      const foundTrack = findAudioAdaptation(audio, {
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
   * @param {string|Number} wantedId - adaptation id of the wanted track
   * @throws Error - Throws if the given id is not found in any audio adaptation
   */
  setAudioTrack(wantedId) {
    const foundTrack = arrayFind(this._audioAdaptations, ({ id }) =>
      id === wantedId);

    if (foundTrack === undefined) {
      throw new Error("Audio Track not found.");
    }

    this._currentAudioAdaptation = foundTrack;
    this._audio$.next(this._currentAudioAdaptation);
  }

  /**
   * @param {string|Number} wantedId - adaptation id of the wanted track
   * @throws Error - Throws if the given id is not found in any text adaptation
   */
  setTextTrack(wantedId) {
    const foundTrack = arrayFind(this._textAdaptations, ({ id }) =>
      id === wantedId);

    if (foundTrack === undefined) {
      throw new Error("Text Track not found.");
    }

    this._currentTextAdaptation = foundTrack;
    this._text$.next(this._currentTextAdaptation);
  }

  disableTextTrack() {
    this._currentTextAdaptation = null;
    this._text$.next(this._currentTextAdaptation);
  }

  getCurrentAudioTrack() {
    const adaptation = this._currentAudioAdaptation;
    if (!adaptation) {
      return null;
    }
    return {
      language: adaptation.language,
      normalized: adaptation.normalizedLanguage,
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
      language: adaptation.language,
      normalized: adaptation.normalizedLanguage,
      closedCaption: adaptation.isClosedCaption,
      id: adaptation.id,
    };
  }

  getAvailableAudioTracks() {
    const currentTrack = this._currentAudioAdaptation;
    const currentId = currentTrack && currentTrack.id;
    return this._audioAdaptations
      .map((adaptation) => ({
        language: adaptation.language,
        normalized: adaptation.normalizedLanguage,
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
        language: adaptation.language,
        normalized: adaptation.normalizedLanguage,
        closedCaption: adaptation.isClosedCaption,
        id: adaptation.id,
        active: currentId == null ? false : currentId === adaptation.id,
      }));
  }
}

export default LanguageManager;
