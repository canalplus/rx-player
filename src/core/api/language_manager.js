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
 * @param {Boolean} trackConfig.closedCaption
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
   * @param {Subject} adaptations$.text$ - Subject through which the chosen
   * text adaptation will be emitted
   */
  constructor({ text, audio }, { text$, audio$ }) {
    const textAdaptations = text || [];
    const audioAdaptations = audio || [];

    this._currentAudioAdaptation = undefined;
    this._currentTextAdaptation = undefined;
    this._textAdaptations = textAdaptations;
    this._audioAdaptations = audioAdaptations;
    this._text$ = text$;
    this._audio$ = audio$;
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

      const chosenTrack = foundTrack || audio[0] || null;
      if (this._currentAudioAdaptation !== chosenTrack) {
        this._currentAudioAdaptation = chosenTrack;
        this._audio$.next(this._currentAudioAdaptation);
      }
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

      const chosenTrack = foundTrack || text[0];
      if (this._currentTextAdaptation !== chosenTrack) {
        this._currentTextAdaptation = chosenTrack;
        this._text$.next(this._currentTextAdaptation);
      }
    }
  }

  /**
   * Set the audio track based on its configuration.
   * @param {Object} wantedTrack
   * @param {string} wantedTrack.language
   * @param {string} wantedTrack.normalized
   * @param {Boolean} wantedTrack.audioDescription
   */
  setAudioTrackByConfiguration(wantedTrack) {
    const chosenAdaptation = wantedTrack ?
      findAudioAdaptation(this._audioAdaptations, wantedTrack) ||
      this._audioAdaptations[0] : this._audioAdaptations[0];

    if (chosenAdaptation === undefined) {
      throw new Error("Audio Track not found.");
    }
    if (chosenAdaptation !== this._currentAudioAdaptation) {
      this._currentAudioAdaptation = chosenAdaptation;
      this._audio$.next(this._currentAudioAdaptation);
    }
  }

  /**
   * Set the text track based on its configuration.
   * @param {Object} wantedTrack
   * @param {string} wantedTrack.language
   * @param {string} wantedTrack.normalized
   * @param {Boolean} wantedTrack.closedCaption
   */
  setTextTrackByConfiguration(wantedTrack) {
    const chosenAdaptation = wantedTrack ?
      findTextAdaptation(this._textAdaptations, wantedTrack) ||
      null : null;

    if (chosenAdaptation === undefined) {
      throw new Error("Text Track not found.");
    }
    if (chosenAdaptation !== this._currentTextAdaptation) {
      this._currentTextAdaptation = chosenAdaptation;
      this._text$.next(this._currentTextAdaptation);
    }
  }

  /**
   * @param {string|Number} wantedId - adaptation id of the wanted track
   * @throws Error - Throws if the given id is not found in any audio adaptation
   */
  setAudioTrackByID(wantedId) {
    const foundTrack = arrayFind(this._audioAdaptations, ({ id }) =>
      id === wantedId);

    if (foundTrack === undefined) {
      throw new Error("Audio Track not found.");
    }

    if (this._currentAudioAdaptation !== foundTrack) {
      this._currentAudioAdaptation = foundTrack;
      this._audio$.next(this._currentAudioAdaptation);
    }
  }

  /**
   * @param {string|Number} wantedId - adaptation id of the wanted track
   * @throws Error - Throws if the given id is not found in any text adaptation
   */
  setTextTrackByID(wantedId) {
    const foundTrack = arrayFind(this._textAdaptations, ({ id }) =>
      id === wantedId);

    if (foundTrack === undefined) {
      throw new Error("Text Track not found.");
    }

    if (this._currentTextAdaptation !== foundTrack) {
      this._currentTextAdaptation = foundTrack;
      this._text$.next(this._currentTextAdaptation);
    }
  }

  disableTextTrack() {
    if (this._currentTextAdaptation === null) {
      return;
    }
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
