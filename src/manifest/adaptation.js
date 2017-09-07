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

import objectAssign from "object-assign";
import arrayFind from "array-find";

import Representation from "./representation.js";
import generateNewId from "../utils/id.js";

/**
 * Normalized Adaptation structure.
 *
 * API Public Properties:
 *   - id {string|Number}:
 *   - type {string}
 *   - language {string|undefined}
 *   - normalizedLanguage {string|undefined}
 *   - isAudioDescription {Boolean|undefined}
 *   - isClosedCaption {Boolean|undefined}
 *   - representations {[]Representation}
 *
 * API Public Methods:
 *   - getAvailableBitrates () => {[]Number}
 */
class Adaptation {
  /**
   * @constructor
   * @param {Object} [args={}]
   * @param {string|Number} [args.id]
   * @param {string} args.type
   * @param {string} [args.language]
   * @param {string} [args.normalizedLanguage]
   * @param {Array.<Object>} args.representations
   * @param {Boolean} [args.closedCaption]
   * @param {Boolean} [args.audioDescription]
   * @param {Boolean} args.manual
   */
  constructor(args = {}) {
    const nId = generateNewId();
    this.id = args.id == null ? nId : "" + args.id;
    this.type = args.type || "";
    this.representations = Array.isArray(args.representations) ?
      args.representations
        .map(r => new Representation(objectAssign({ rootId: this.id }, r)))
        .sort((a, b) => a.bitrate - b.bitrate) : [];

    if (args.language != null) {
      this.language = args.language;
    }

    if (args.normalizedLanguage != null) {
      this.normalizedLanguage = args.normalizedLanguage;
    }

    if (args.closedCaption != null) {
      this.isClosedCaption = args.closedCaption;
    }
    if (args.audioDescription != null) {
      this.isAudioDescription = args.audioDescription;
    }

    // TODO rename both protectionData?
    if (args.contentProtection != null) {
      this.contentProtection = args.contentProtection;
    }
    if (args.smoothProtection != null) {
      this._smoothProtection = args.smoothProtection;
    }

    // for manual adaptations (not in the manifest)
    this.manual = args.manual;

    // ---------
    // this._rootURL = args.rootURL;
    // this._baseURL = args.baseURL;
  }

  /**
   * @returns {Array.<Number>}
   */
  getAvailableBitrates() {
    return this.representations
      .map(r => r.bitrate);
  }

  getRepresentation(wantedId) {
    return arrayFind(this.representations, ({ id }) => wantedId === id);
  }

  /**
   * @param {Number} bitrate
   * @returns {Representation|null}
   */
  getRepresentationsForBitrate(bitrate) {
    return this.representations.filter(r => r.bitrate === bitrate) || null;
  }
}

export default Adaptation;
