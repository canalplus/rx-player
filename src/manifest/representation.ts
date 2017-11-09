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
import RepresentationIndex from "./representation_index";

export interface IRepresentationArguments {
  // -- required
  bitrate : number;
  index : any; /* TODO @ index refacto */

  // -- optional
  baseURL? : string;
  bitsPerSample? : number;
  channels? : number;
  codecPrivateData? : string;
  codecs? : string;
  height? : number;
  id? : string|number;
  mimeType? : string;
  packetSize? : number;
  samplingRate? : number;
  width? : number;
}

/**
 * Normalized Representation structure.
 * @class Representation
 */
class Representation {
  // required
  public id : string|number;
  public index : RepresentationIndex;

  // optional
  public baseURL? : string;
  public bitrate : number;
  public codec? : string;
  public height? : number;
  public mimeType? : string;
  public width? : number;

  public _bitsPerSample? : number;
  public _channels? : number;
  public _codecPrivateData? : string;
  public _packetSize? : number;
  public _samplingRate? : number;

  /**
   * @constructor
   * @param {Object} [args={}]
   * @param {string|Number} [args.id]
   * @param {Number} args.bitrate
   * @param {string} args.codecs
   * @param {Number} args.height
   * @param {Number} args.width
   * @param {string} args.mimeType
   * @param {Object} args.index
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

    this.index = new RepresentationIndex({
      index: args.index,
      rootId: this.id,
    });

    this.baseURL = args.baseURL;

    // Most of those are for the smooth init segment
    if (args.codecPrivateData != null) {
      this._codecPrivateData = args.codecPrivateData;
    }
    if (args.channels != null) {
      this._channels = args.channels;
    }
    if (args.bitsPerSample != null) {
      this._bitsPerSample = args.bitsPerSample;
    }
    if (args.packetSize != null) {
      this._packetSize = args.packetSize;
    }
    if (args.samplingRate != null) {
      this._samplingRate = args.samplingRate;
    }

    // this._audioSamplingRate = args.audioSamplingRate;
    // this._codingDependency = args.codingDependency;
    // this._frameRate = args.frameRate;
    // this._maxPlayoutRate = args.maxPlayoutRate;
    // this._maximumSAPPeriod = args.maximumSAPPeriod;
    // this._profiles = args.profiles;
    // this._segmentProfiles = args.segmentProfiles;
  }
}

export default Representation;
