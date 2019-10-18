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

import log from "../log";
import {
  IContentProtections,
  IParsedRepresentation,
} from "../parsers/manifest";
import {
  areBytesEqual,
  concat,
} from "../utils/byte_parsing";
import IRepresentationIndex from "./representation_index";

/**
 * Normalized Representation structure.
 * @class Representation
 */
class Representation {
  // ID uniquely identifying the Representation in the Adaptation.
  // TODO unique for the whole manifest?
  public readonly id : string|number;

  // Interface allowing to request segments for specific times.
  public index : IRepresentationIndex;

  // Bitrate this Representation is in, in bits per seconds.
  public bitrate : number;

  // Frame-rate, when it can be applied, of this Representation, in any textual
  // indication possible (often under a ratio form).
  public frameRate? : string;

  // A string describing the codec used for this Representation.
  // Examples: vp9, hvc, stpp
  // undefined if we do not know.
  public codec? : string;

  // A string describing the mime-type for this Representation.
  // Examples: audio/mp4, video/webm, application/mp4, text/plain
  // undefined if we do not know.
  public mimeType? : string;

  // If this Representation is linked to video content, this value is the width
  // in pixel of the corresponding video data.
  public width? : number;

  // If this Representation is linked to video content, this value is the height
  // in pixel of the corresponding video data.
  public height? : number;

  // DRM Information for this Representation.
  public contentProtections? : IContentProtections;

  // Whether we are able to decrypt this Representation / unable to decrypt it or
  // if we don't know yet:
  //   - if `true`, it means that we know we were able to decrypt this
  //     Representation in the current content.
  //   - if `false`, it means that we know we were unable to decrypt this
  //     Representation
  //   - if `undefined` there is no certainty on this matter
  public decipherable? : boolean;

  /**
   * @param {Object} args
   */
  constructor(args : IParsedRepresentation) {
    this.id = args.id;
    this.bitrate = args.bitrate;
    this.codec = args.codecs;

    if (args.height != null) {
      this.height = args.height;
    }

    if (args.width != null) {
      this.width = args.width;
    }

    if (args.mimeType != null) {
      this.mimeType = args.mimeType;
    }

    if (Array.isArray(args.contentProtections)) {
      this.contentProtections = args.contentProtections;
    }

    if (args.frameRate != null) {
      this.frameRate = args.frameRate;
    }

    this.index = args.index;
  }

  /**
   * Returns "mime-type string" which includes both the mime-type and the codec,
   * which is often needed when interacting with the browser's APIs.
   * @returns {string}
   */
  getMimeTypeString() : string {
    return `${this.mimeType};codecs="${this.codec}"`;
  }

  /**
   * Returns every protection initialization data concatenated.
   * This data can then be used through the usual EME APIs.
   * `null` if this Representation has no detected protection initialization
   * data.
   * @returns {Uint8Array|null}
   */
  getProtectionInitializationData() : Uint8Array | null {
    if (this.contentProtections !== undefined &&
        this.contentProtections.pssh.length > 0) {
      return concat(...this.contentProtections.pssh.map(({ data }) => data));
    }
    return null;
  }

  /**
   * Add protection data to the Representation to be able to properly blacklist
   * it if that data is.
   * /!\ Mutates the current Representation
   * @param {string} systemId
   * @param {Uint8Array} data
   */
  _addProtectionData(systemId : string, data : Uint8Array) {
    const newElement = { systemId, data };
    if (this.contentProtections == null) {
      this.contentProtections = { keyIds: [], pssh: [newElement] };
      return;
    }
    const { pssh } = this.contentProtections;
    for (let i = pssh.length - 1; i >= 0; i--) {
      if (pssh[i].systemId === systemId) {
        if (areBytesEqual(pssh[i].data, data)) {
          return;
        }
        log.warn("Manifest: Two PSSH for the same system ID");
      }
    }
    this.contentProtections.pssh.push(newElement);
  }
}

export default Representation;
