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

import IRepresentationIndex from "./representation_index";

interface IContentProtection { keyId : Uint8Array;
                               systemId?: string; }

export interface IRepresentationArguments { bitrate : number;
                                            id : string;
                                            index : IRepresentationIndex;

                                            // -- optional
                                            codecs? : string;
                                            contentProtections? : IContentProtection[];
                                            frameRate? : string;
                                            height? : number;
                                            mimeType? : string;
                                            width? : number; }

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
  public contentProtections? : IContentProtection[];

  /**
   * @param {Object} args
   */
  constructor(args : IRepresentationArguments) {
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
