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

import { IParsedRepresentation } from "../parsers/manifest";
import IRepresentationIndex from "./representation_index";

interface IContentProtection { keyId?: string;
                               systemId?: string; }

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

  public codec? : string;
  public mimeType? : string;
  public width? : number;
  public height? : number;

  // DRM Informations for this Representation.
  public contentProtections? : IContentProtection[];

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

    if (args.contentProtections) {
      this.contentProtections = args.contentProtections;
    }

    if (args.frameRate) {
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
}

export default Representation;
