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

import generateNewId from "../utils/id";
import IRepresentationIndex from "./representation_index";

interface IContentProtection {
  keyId?: string;
  systemId?: string;
}

export interface IRepresentationArguments {
  // -- required
  bitrate : number;
  index : IRepresentationIndex;

  // -- optional
  codecs? : string;
  height? : number;
  id? : string|number;
  mimeType? : string;
  width? : number;
  contentProtections? : IContentProtection[];
}

/**
 * Normalized Representation structure.
 * @class Representation
 */
class Representation {
  // required
  public readonly id : string|number;
  public index : IRepresentationIndex;
  public bitrate : number;

  // opt readonly onal
  public codec? : string;
  public height? : number;
  public mimeType? : string;
  public width? : number;
  public contentProtections? : IContentProtection[];

  /**
   * @constructor
   * @param {Object|undefined} args
   */
  constructor(args : IRepresentationArguments) {
    const nId = generateNewId();
    this.id = (args.id == null ? nId : args.id);
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

    this.index = args.index;
  }

  getMimeTypeString() {
    return `${this.mimeType};codecs="${this.codec}"`;
  }
}

export default Representation;
