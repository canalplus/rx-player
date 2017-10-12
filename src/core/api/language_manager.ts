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

import arrayFind = require("array-find");

import { Subject } from "rxjs/Subject";

import Adaptation from "../../manifest/adaptation";

export interface IAudioTrackConfiguration {
  language : string;
  normalized : string;
  audioDescription : boolean;
}
type AudioTrackPreference = null | IAudioTrackConfiguration;

export interface ITextTrackConfiguration {
  language : string;
  normalized : string;
  closedCaption : boolean;
}
type TextTrackPreference = null | ITextTrackConfiguration;

export interface ILMAudioTrack {
  language : string;
  normalized : string;
  audioDescription : boolean;
  id : number|string;
}

export interface ILMTextTrack {
  language : string;
  normalized : string;
  closedCaption : boolean;
  id : number|string;
}

export interface ILMAudioTrackListItem extends ILMAudioTrack {
  active : boolean;
}

export type ILMAudioTrackList = ILMAudioTrackListItem[];

export interface ILMTextTrackListItem extends ILMTextTrack {
  active : boolean;
}

export type ILMTextTrackList = ILMTextTrackListItem[];

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
const findTextAdaptation = (
  adaptations : Adaptation[],
  trackConfig : TextTrackPreference
) => {
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
const findAudioAdaptation = (
  adaptations : Adaptation[],
  trackConfig : AudioTrackPreference
) => {
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
  private _currentTextAdaptation? : Adaptation|null;
  private _currentAudioAdaptation? : Adaptation|null;
  private _textAdaptations : Adaptation[];
  private _audioAdaptations : Adaptation[];
  private _text$ : Subject<Adaptation|null>;
  private _audio$ : Subject<Adaptation|null>;

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
  constructor(
    { text, audio } : { text? : Adaptation[], audio? : Adaptation[] },
    { text$, audio$ } : {
      text$ : Subject<Adaptation|null>, audio$ : Subject<Adaptation|null>
    }
  ) {
    /**
     * The currently chosen audio adaptation.
     * undefined if none chosen yet
     * null if the audio track is disabled
     * @type {Adaptation|undefined|null}
     */
    this._currentAudioAdaptation = undefined;

    /**
     * The currently chosen text adaptation.
     * undefined if none chosen yet
     * null if the text track is disabled
     * @type {Adaptation|undefined|null}
     */
    this._currentTextAdaptation = undefined;

    /**
     * Every audio adaptations available.
     * @type {Array.<Adaptation>}
     */
    this._audioAdaptations = audio || [];

    /**
     * Every text adaptations available.
     * @type {Array.<Adaptation>}
     */
    this._textAdaptations = text || [];

    this._text$ = text$;
    this._audio$ = audio$;
  }

  /**
   * Update the adaptations in the current content.
   * Try to find the same adaptations than the ones previously chosen.
   * @param {Object} adaptationsObject
   * @param {Array.<Object>} audioAdaptationsObject.audio - The audio
   * adaptations available.
   * @param {Array.<Object>} audioAdaptationsObject.text - The text
   * adaptations available.
   */
  updateAdaptations(
    { text, audio } : { text?: Adaptation[], audio?: Adaptation[] }
  ) : void {
    this._audioAdaptations = audio || [];
    this._textAdaptations = text || [];

    const currentAudioAdaptation = this._currentAudioAdaptation;

    // if not set, it either means it is deactivated (null) or that is not set
    // (undefined). In both cases, we don't want to update the adaptation here.
    if (currentAudioAdaptation) {
      // try to find the same adaptation than the current one
      const currentAudioId = currentAudioAdaptation.id;
      const audioAdaptationFound = arrayFind(this._audioAdaptations, ({ id }) =>
        id === currentAudioId);

      if (!audioAdaptationFound) {
        const foundTrack = findAudioAdaptation(this._audioAdaptations, {
          // TODO AudioAdaptation type
          language: currentAudioAdaptation.language || "",
          normalized: currentAudioAdaptation.normalizedLanguage || "",
          audioDescription: !!currentAudioAdaptation.isAudioDescription,
        });

        const chosenTrack = foundTrack || this._audioAdaptations[0] || null;
        if (this._currentAudioAdaptation !== chosenTrack) {
          this._currentAudioAdaptation = chosenTrack;
          this._audio$.next(this._currentAudioAdaptation);
        }
      }
    }

    const currentTextAdaptation = this._currentTextAdaptation;

    // if not set, it either means it is deactivated (null) or that is not set
    // (undefined). In both cases, we don't want to update the adaptation here.
    if (currentTextAdaptation) {
      // try to find the same adaptation than the current one
      const currentTextId = currentTextAdaptation.id;

      const textAdaptationFound = arrayFind(this._textAdaptations, ({ id }) =>
        id === currentTextId);

      if (!textAdaptationFound) {
        const foundTrack =
          // TODO TextAdaptation type
          findTextAdaptation(this._textAdaptations, {
            language: currentTextAdaptation.language || "",
            normalized: currentTextAdaptation.normalizedLanguage || "",
            closedCaption: !!currentTextAdaptation.isClosedCaption,
          });

        const chosenTrack = foundTrack || this._textAdaptations[0];
        if (this._currentTextAdaptation !== chosenTrack) {
          this._currentTextAdaptation = chosenTrack;
          this._text$.next(this._currentTextAdaptation);
        }
      }
    }
  }

  /**
   * Set the audio track based on an optional given configuration.
   *
   * If no configuration is provided, set the first adaptation found.
   * If the given configuration is ``null``, disable the audio track.
   *
   * Else, If it fails to find one matching the wanted criteria, set the first
   * adaptation found instead.
   * If there is no available audio adaptation at all, disable the audio track.
   * @param {Object|null} [wantedTrack]
   * @param {string} wantedTrack.language
   * @param {string} wantedTrack.normalized
   * @param {Boolean} wantedTrack.audioDescription
   */
  setInitialAudioTrack(wantedTrack? : AudioTrackPreference) : void {
    let chosenAdaptation;

    if (wantedTrack) {
      chosenAdaptation =
        findAudioAdaptation(this._audioAdaptations, wantedTrack);
    } else if (wantedTrack === null) {
      chosenAdaptation = null;
    }

    if (chosenAdaptation === undefined) {
      chosenAdaptation = this._audioAdaptations[0] || null;
    }

    if (chosenAdaptation !== this._currentAudioAdaptation) {
      this._currentAudioAdaptation = chosenAdaptation;
      this._audio$.next(this._currentAudioAdaptation);
    }
  }

  /**
   * Set the text track based on an optional given configuration.
   * If the given configuration is not defined or null, disable the text track.
   * Else, If it fails to find one matching the wanted criteria, disable the
   * text track.
   * @param {Object|null|undefined} wantedTrack
   * @param {string} wantedTrack.language
   * @param {string} wantedTrack.normalized
   * @param {Boolean} wantedTrack.closedCaption
   */
  setInitialTextTrack(wantedTrack? : TextTrackPreference) : void {
    const chosenAdaptation = wantedTrack ?
      findTextAdaptation(this._textAdaptations, wantedTrack) || null :
      null;

    if (chosenAdaptation !== this._currentTextAdaptation) {
      this._currentTextAdaptation = chosenAdaptation;
      this._text$.next(this._currentTextAdaptation);
    }
  }

  /**
   * Set audio track based on the ID of its adaptation.
   * @param {string|Number} wantedId - adaptation id of the wanted track
   * @throws Error - Throws if the given id is not found in any audio adaptation
   */
  setAudioTrackByID(wantedId : string|number) : void {
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
   * Set text track based on the ID of its adaptation.
   * @param {string|Number} wantedId - adaptation id of the wanted track
   * @throws Error - Throws if the given id is not found in any text adaptation
   */
  setTextTrackByID(wantedId : string|number) : void {
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

  /**
   * Disable the current audio track.
   */
  disableAudioTrack() : void {
    if (this._currentAudioAdaptation === null) {
      return;
    }
    this._currentAudioAdaptation = null;
    this._audio$.next(this._currentAudioAdaptation);
  }

  /**
   * Disable the current text track.
   */
  disableTextTrack() : void {
    if (this._currentTextAdaptation === null) {
      return;
    }
    this._currentTextAdaptation = null;
    this._text$.next(this._currentTextAdaptation);
  }

  /**
   * Returns an object describing the current audio track.
   * This object has the following keys:
   *   - language {string}
   *   - normalized {string}
   *   - audioDescription {Boolean}
   *   - id {number|string}
   *
   * Returns null is the the current audio track is disabled or not
   * set yet.
   * @returns {Object|null}
   */
  getCurrentAudioTrack() : ILMAudioTrack|null {
    const adaptation = this._currentAudioAdaptation;
    if (!adaptation) {
      return null;
    }
    return {
      language: adaptation.language || "",
      normalized: adaptation.normalizedLanguage || "",
      audioDescription: !!adaptation.isAudioDescription,
      id: adaptation.id,
    };
  }

  /**
   * Returns an object describing the current text track.
   * This object has the following keys:
   *   - language {string}
   *   - normalized {string}
   *   - closedCaption {Boolean}
   *   - id {number|string}
   *
   * Returns null is the the current text track is disabled or not
   * set yet.
   * @returns {Object|null}
   */
  getCurrentTextTrack() : ILMTextTrack|null {
    const adaptation = this._currentTextAdaptation;
    if (!adaptation) {
      return null;
    }
    return {
      language: adaptation.language || "",
      normalized: adaptation.normalizedLanguage || "",
      closedCaption: !!adaptation.isClosedCaption,
      id: adaptation.id,
    };
  }

  /**
   * Returns all available audio tracks, as an array of objects.
   * Those objects have the following keys:
   *   - language {string}
   *   - normalized {string}
   *   - audioDescription {Boolean}
   *   - id {number|string}
   *   - active {Boolean}
   * @returns {Array.<Object>}
   */
  getAvailableAudioTracks() : ILMAudioTrackList {
    const currentTrack = this._currentAudioAdaptation;
    const currentId = currentTrack && currentTrack.id;
    return this._audioAdaptations
      .map((adaptation) => ({
        language: adaptation.language || "",
        normalized: adaptation.normalizedLanguage || "",
        audioDescription: !!adaptation.isAudioDescription,
        id: adaptation.id,
        active: currentId == null ? false : currentId === adaptation.id,
      }));
  }

  /**
   * Returns all available text tracks, as an array of objects.
   * Those objects have the following keys:
   *   - language {string}
   *   - normalized {string}
   *   - closedCaption {Boolean}
   *   - id {number|string}
   *   - active {Boolean}
   * @returns {Array.<Object>}
   */
  getAvailableTextTracks() : ILMTextTrackList {
    const currentTrack = this._currentTextAdaptation;
    const currentId = currentTrack && currentTrack.id;
    return this._textAdaptations
      .map((adaptation) => ({
        language: adaptation.language || "",
        normalized: adaptation.normalizedLanguage || "",
        closedCaption: !!adaptation.isClosedCaption,
        id: adaptation.id,
        active: currentId == null ? false : currentId === adaptation.id,
      }));
  }
}

export default LanguageManager;
