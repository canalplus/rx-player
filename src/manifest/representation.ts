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

import { isCodecSupported } from "../compat";
import log from "../log";
import { IInbandEvent } from "../parsers/containers/isobmff";
import {
  IContentProtections,
  IParsedRepresentation,
} from "../parsers/manifest";
import { IScheme } from "../parsers/manifest/dash/node_parsers/utils";
import areArraysOfNumbersEqual from "../utils/are_arrays_of_numbers_equal";
import { concat } from "../utils/byte_parsing";
import { IRepresentationIndex } from "./representation_index";
import { IAdaptationType } from "./types";

export interface IContentProtectionsInitDataObject {
  type : string;
  data : Uint8Array;
}

/**
 * Normalized Representation structure.
 * @class Representation
 */
class Representation {
  /** ID uniquely identifying the Representation in the Adaptation. */
  public readonly id : string|number;

  /**
   * Interface allowing to get information about segments available for this
   * Representation.
   */
  public index : IRepresentationIndex;

  /** Bitrate this Representation is in, in bits per seconds. */
  public bitrate : number;

  /**
   * Frame-rate, when it can be applied, of this Representation, in any textual
   * indication possible (often under a ratio form).
   */
  public frameRate? : string;

  /**
   * A string describing the codec used for this Representation.
   * undefined if we do not know.
   */
  public codec? : string;

  /**
   * A string describing the mime-type for this Representation.
   * Examples: audio/mp4, video/webm, application/mp4, text/plain
   * undefined if we do not know.
   */
  public mimeType? : string;

  /**
   * If this Representation is linked to video content, this value is the width
   * in pixel of the corresponding video data.
   */
  public width? : number;

  /**
   * If this Representation is linked to video content, this value is the height
   * in pixel of the corresponding video data.
   */
  public height? : number;

  /** Encryption information for this Representation. */
  public contentProtections? : IContentProtections;

  /**
   * Whether we are able to decrypt this Representation / unable to decrypt it or
   * if we don't know yet:
   *   - if `true`, it means that we know we were able to decrypt this
   *     Representation in the current content.
   *   - if `false`, it means that we know we were unable to decrypt this
   *     Representation
   *   - if `undefined` there is no certainty on this matter
   */
  public decipherable? : boolean;

  /** `true` if the Representation is in a supported codec, false otherwise. */
  public isSupported : boolean;

  /** List of signaled inband event scheme ids */
  private _signaledInbandEventSchemeIds?: IScheme[];

  /**
   * @param {Object} args
   */
  constructor(args : IParsedRepresentation, opts : { type : IAdaptationType }) {
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

    if (args.contentProtections !== undefined) {
      this.contentProtections = args.contentProtections;
    }

    if (args.frameRate != null) {
      this.frameRate = args.frameRate;
    }

    if (args.signaledInbandEventSchemeIds !== undefined) {
      this._signaledInbandEventSchemeIds = args.signaledInbandEventSchemeIds;
    }

    this.index = args.index;
    this.isSupported = opts.type === "audio" ||
                       opts.type === "video" ?
      isCodecSupported(this.getMimeTypeString()) :
      true; // TODO for other types
  }

  /**
   * Returns "mime-type string" which includes both the mime-type and the codec,
   * which is often needed when interacting with the browser's APIs.
   * @returns {string}
   */
  getMimeTypeString() : string {
    return `${this.mimeType ?? ""};codecs="${this.codec ?? ""}"`;
  }

  /**
   * Returns every protection initialization data concatenated.
   * This data can then be used through the usual EME APIs.
   * `null` if this Representation has no detected protection initialization
   * data.
   * @returns {Array.<Object>|null}
   */
  getProtectionsInitializationData() : IContentProtectionsInitDataObject[] {
    const contentProtections = this.contentProtections;
    if (contentProtections === undefined) {
      return [];
    }
    return Object.keys(contentProtections.initData)
      .reduce<IContentProtectionsInitDataObject[]>((acc, initDataType) => {
        const initDataArr = contentProtections.initData[initDataType];
        if (initDataArr === undefined || initDataArr.length === 0) {
          return acc;
        }
        const initData = concat(...initDataArr.map(({ data }) => data));
        acc.push({ type: initDataType,
                   data: initData });
        return acc;
      }, []);
  }

  /**
   * Add protection data to the Representation to be able to properly blacklist
   * it if that data is.
   * /!\ Mutates the current Representation
   * @param {string} initDataArr
   * @param {string} systemId
   * @param {Uint8Array} data
   */
  _addProtectionData(
    initDataType : string,
    systemId : string,
    data : Uint8Array
  ) : void {
    const newElement = { systemId, data };
    if (this.contentProtections === undefined) {
      this.contentProtections = { keyIds: [],
                                  initData: { [initDataType] : [newElement] } };
      return;
    }

    const initDataArr = this.contentProtections.initData[initDataType];

    if (initDataArr === undefined) {
      this.contentProtections.initData[initDataType] = [newElement];
      return;
    }

    for (let i = initDataArr.length - 1; i >= 0; i--) {
      if (initDataArr[i].systemId === systemId) {
        if (areArraysOfNumbersEqual(initDataArr[i].data, data)) {
          return;
        }
        log.warn("Manifest: Two PSSH for the same system ID");
      }
    }
    initDataArr.push(newElement);
  }

  /**
   * Some inband events may not be allowed and filtered out.
   * Example : MPEG-DASH tells about inband events presence on stream with an
   * InbandEventStream tag. Each inband event from stream must have a scheme id
   * that is defined in one of the InbandEventStream. If not, the event must be
   * ignored.
   * @param {Object} inbandEvent
   * @returns {boolean}
   */
  _isInbandEventAllowed(inbandEvent: IInbandEvent): boolean {
    if (this._signaledInbandEventSchemeIds === undefined) {
      return false;
    }
    return this._signaledInbandEventSchemeIds.some(({ schemeIdUri }) => {
      return schemeIdUri === inbandEvent.schemeId;
    });
  }
}

export default Representation;
