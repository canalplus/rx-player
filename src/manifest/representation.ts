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
import { IContentProtection } from "../core/eme";
import log from "../log";
import {
  IContentProtections,
  IParsedRepresentation,
} from "../parsers/manifest";
import areArraysOfNumbersEqual from "../utils/are_arrays_of_numbers_equal";
import { IRepresentationIndex } from "./representation_index";
import {
  IAdaptationType,
  IHDRInformation,
} from "./types";

/**
 * Normalized Representation structure.
 * @class Representation
 */
class Representation {
  /** ID uniquely identifying the Representation in the Adaptation. */
  public readonly id : string;

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
  public frameRate? : number;

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
   * If the track is HDR, give the characteristics of the content
   */
  public hdrInfo?: IHDRInformation;

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

  /**
   * @param {Object} args
   */
  constructor(args : IParsedRepresentation, opts : { type : IAdaptationType }) {
    this.id = args.id;
    this.bitrate = args.bitrate;
    this.codec = args.codecs;

    if (args.height !== undefined) {
      this.height = args.height;
    }

    if (args.width !== undefined) {
      this.width = args.width;
    }

    if (args.mimeType !== undefined) {
      this.mimeType = args.mimeType;
    }

    if (args.contentProtections !== undefined) {
      this.contentProtections = args.contentProtections;
    }

    if (args.frameRate !== undefined) {
      this.frameRate = args.frameRate;
    }

    if (args.hdrInfo !== undefined) {
      this.hdrInfo = args.hdrInfo;
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
  public getMimeTypeString() : string {
    return `${this.mimeType ?? ""};codecs="${this.codec ?? ""}"`;
  }

  /**
   * Returns encryption initialization data linked to the given DRM's system ID.
   * This data may be useful to decrypt encrypted media segments.
   *
   * Returns an empty array if there is no data found for that system ID at the
   * moment.
   *
   * When you know that all encryption data has been added to this
   * Representation, you can also call the `getAllEncryptionData` method.
   * This second function will return all encryption initialization data
   * regardless of the DRM system, and might thus be used in all cases.
   *
   * /!\ Note that encryption initialization data may be progressively added to
   * this Representation after `_addProtectionData` calls or Manifest updates.
   * Because of this, the return value of this function might change after those
   * events.
   *
   * @param {string} drmSystemId - The hexa-encoded DRM system ID
   * @returns {Array.<Object>}
   */
  public getEncryptionData(drmSystemId : string) : IContentProtection[] {
    const allInitData = this.getAllEncryptionData();
    const filtered = [];
    for (let i = 0; i < allInitData.length; i++) {
      let createdObjForType = false;
      const initData = allInitData[i];
      for (let j = 0; j < initData.values.length; j++) {
        if (initData.values[j].systemId.toLowerCase() === drmSystemId.toLowerCase()) {
          if (!createdObjForType) {
            const keyIds = this.contentProtections?.keyIds.map(val => val.keyId);
            filtered.push({ type: initData.type,
                            keyIds,
                            values: [initData.values[j]] });
            createdObjForType = true;
          } else {
            filtered[filtered.length - 1].values.push(initData.values[j]);
          }
        }
      }
    }
    return filtered;
  }


  /**
   * Returns all currently-known encryption initialization data linked to this
   * Representation.
   * Encryption initialization data is generally required to be able to decrypt
   * those Representation's media segments.
   *
   * Unlike `getEncryptionData`, this method will return all available
   * encryption data.
   * It might as such might be used when either the current drm's system id is
   * not known or when no encryption data specific to it was found. In that
   * case, providing every encryption data linked to this Representation might
   * still allow decryption.
   *
   * Returns an empty array in two cases:
   *   - the content is not encrypted.
   *   - We don't have any decryption data yet.
   *
   * /!\ Note that new encryption initialization data can be added progressively
   * through the `_addProtectionData` method or through Manifest updates.
   * It is thus highly advised to only rely on this method once every protection
   * data related to this Representation has been known to be added.
   *
   * The main situation where new encryption initialization data is added is
   * after parsing this Representation's initialization segment, if one exists.
   * @returns {Array.<Object>}
   */
  public getAllEncryptionData() : IContentProtection[] {
    if (this.contentProtections === undefined ||
        this.contentProtections.initData.length === 0)
    {
      return [];
    }
    const keyIds = this.contentProtections?.keyIds.map(val => val.keyId);
    return this.contentProtections.initData.map((x) => {
      return { type: x.type,
               keyIds,
               values: x.values };
    });
  }

  /**
   * Add new encryption initialization data to this Representation if it was not
   * already included.
   *
   * Returns `true` if new encryption initialization data has been added.
   * Returns `false` if none has been added (e.g. because it was already known).
   *
   * /!\ Mutates the current Representation
   *
   * TODO better handle use cases like key rotation by not always grouping
   * every protection data together? To check.
   * @param {string} initDataArr
   * @param {string} systemId
   * @param {Uint8Array} data
   * @returns {boolean}
   */
  public _addProtectionData(
    initDataType : string,
    data : Array<{
      systemId : string;
      data : Uint8Array;
    }>
  ) : boolean {
    let hasUpdatedProtectionData = false;
    if (this.contentProtections === undefined) {
      this.contentProtections = { keyIds: [],
                                  initData: [ { type: initDataType,
                                                values: data } ] };
      return true;
    }

    const cInitData = this.contentProtections.initData;
    for (let i = 0; i < cInitData.length; i++) {
      if (cInitData[i].type === initDataType) {
        const cValues = cInitData[i].values;

        // loop through data
        for (let dataI = 0; dataI < data.length; dataI++) {
          const dataToAdd = data[dataI];
          let cValuesIdx;
          for (cValuesIdx = 0; cValuesIdx < cValues.length; cValuesIdx++) {
            if (dataToAdd.systemId === cValues[cValuesIdx].systemId) {
              if (areArraysOfNumbersEqual(dataToAdd.data, cValues[cValuesIdx].data)) {
                // go to next dataToAdd
                break;
              } else {
                log.warn("Manifest: different init data for the same system ID");
              }
            }
          }
          if (cValuesIdx === cValues.length) {
            // we didn't break the loop === we didn't already find that value
            cValues.push(dataToAdd);
            hasUpdatedProtectionData = true;
          }
        }
        return hasUpdatedProtectionData;
      }
    }
    // If we are here, this means that we didn't find the corresponding
    // init data type in this.contentProtections.initData.
    this.contentProtections.initData.push({ type: initDataType,
                                            values: data });
    return true;
  }
}

export default Representation;
