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
import {
  ICdnMetadata,
  IContentProtections,
  IParsedRepresentation,
} from "../parsers/manifest";
import {
  IAudioRepresentation,
  IHDRInformation,
  IVideoRepresentation,
} from "../public_types";
import areArraysOfNumbersEqual from "../utils/are_arrays_of_numbers_equal";
import idGenerator from "../utils/id_generator";
import { IRepresentationIndex } from "./representation_index";
import {
  IAdaptationType,
} from "./types";

const generateRepresentationUniqueId = idGenerator();

/**
 * Normalized Representation structure.
 * @class Representation
 */
class Representation {
  /**
   * ID uniquely identifying the `Representation` in its parent `Adaptation`.
   *
   * This identifier might be linked to an identifier present in the original
   * Manifest file, it is thus the identifier to use to determine if a
   * `Representation` from a refreshed `Manifest` is actually the same one than
   * one in the previously loaded Manifest (as long as the `Adaptation` and
   * `Period` are also the same).
   *
   * For a globally unique identifier regardless of the `Adaptation`, `Period`
   * or even `Manifest`, you can rely on `uniqueId` instead.
   */
  public readonly id : string;

  /**
   * Globally unique identifier for this `Representation` object.
   *
   * This identifier is guaranteed to be unique for any `Representation`s of all
   * `Manifest` objects created in the current JS Realm.
   * As such, it can be used as an identifier for the JS object itself, whereas
   * `id` is the identifier for the original Manifest's Representation in the
   * scope of its parent `Adaptation`.
   */
  public readonly uniqueId : string;

  /**
   * Interface allowing to get information about segments available for this
   * Representation.
   */
  public index : IRepresentationIndex;

  /**
   * Information on the CDN(s) on which requests should be done to request this
   * Representation's initialization and media segments.
   *
   * `null` if there's no CDN involved here (e.g. resources are not requested
   * through the network).
   *
   * An empty array means that no CDN are left to request the resource. As such,
   * no resource can be loaded in that situation.
   */
  public cdnMetadata : ICdnMetadata[] | null;

  /** Bitrate this Representation is in, in bits per seconds. */
  public bitrate : number;

  /**
   * Frame-rate, when it can be applied, of this Representation, in any textual
   * indication possible (often under a ratio form).
   */
  public frameRate? : number;

  /**
   * `true` if this `Representation` is linked to a spatial audio technology.
   * For example, it may be set to `true` if the Representation relies on the
   * "Dolby Atmos". technology.
   *
   * `false` if it is known that this `Representation` does not contain any
   * spatial audio.
   *
   * `undefined` if we do not know whether this `Representation` contains
   * spatial audio or not.
   */
  public isSpatialAudio? : boolean | undefined;

  /**
   * A string describing the codec used for this Representation.
   * undefined if we do not know.
   */
  public codec : string | undefined;

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
  public decipherable? : boolean  | undefined;

  /** `true` if the Representation is in a supported codec, false otherwise. */
  public isSupported : boolean;

  /**
   * @param {Object} args
   */
  constructor(args : IParsedRepresentation, opts : { type : IAdaptationType }) {
    this.id = args.id;
    this.uniqueId = generateRepresentationUniqueId();
    this.bitrate = args.bitrate;
    this.codec = args.codecs;

    if (args.isSpatialAudio !== undefined) {
      this.isSpatialAudio = args.isSpatialAudio;
    }

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

    this.cdnMetadata = args.cdnMetadata;
    this.index = args.index;

    if (opts.type === "audio" || opts.type === "video") {
      this.isSupported = false;
        // Supplemental codecs are defined as backwards-compatible codecs enhancing
        // the experience of a base layer codec
      if (args.supplementalCodecs !== undefined) {
        const supplementalCodecMimeTypeStr =
            `${this.mimeType ?? ""};codecs="${args.supplementalCodecs}"`;
        if (isCodecSupported(supplementalCodecMimeTypeStr)) {
          this.codec = args.supplementalCodecs;
          this.isSupported = true;
        }
      }
      if (!this.isSupported) {
        const mimeTypeStr = this.getMimeTypeString();
        const isSupported = isCodecSupported(mimeTypeStr);
        if (!isSupported) {
          log.info("Unsupported Representation", mimeTypeStr, this.id, this.bitrate);
        }
        this.isSupported = isSupported;
      }
    } else {
      this.isSupported = true; // TODO for other types
    }
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
  public getEncryptionData(drmSystemId : string) : IRepresentationProtectionData[] {
    const allInitData = this.getAllEncryptionData();
    const filtered = [];
    for (let i = 0; i < allInitData.length; i++) {
      let createdObjForType = false;
      const initData = allInitData[i];
      for (let j = 0; j < initData.values.length; j++) {
        if (initData.values[j].systemId.toLowerCase() === drmSystemId.toLowerCase()) {
          if (!createdObjForType) {
            const keyIds = this.contentProtections?.keyIds?.map(val => val.keyId);
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
  public getAllEncryptionData() : IRepresentationProtectionData[] {
    if (this.contentProtections === undefined ||
        this.contentProtections.initData.length === 0)
    {
      return [];
    }
    const keyIds = this.contentProtections?.keyIds?.map(val => val.keyId);
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
   * @param {string} initDataType
   * @param {Uint8Array|undefined} keyId
   * @param {Uint8Array} data
   * @returns {boolean}
   */
  public _addProtectionData(
    initDataType : string,
    keyId: Uint8Array | undefined,
    data : Array<{
      systemId : string;
      data : Uint8Array;
    }>
  ) : boolean {
    let hasUpdatedProtectionData = false;
    if (this.contentProtections === undefined) {
      this.contentProtections = { keyIds: keyId !== undefined ? [{ keyId }] : [],
                                  initData: [ { type: initDataType,
                                                values: data } ] };
      return true;
    }

    if (keyId !== undefined) {
      const keyIds = this.contentProtections.keyIds;
      if (keyIds === undefined) {
        this.contentProtections.keyIds = [{ keyId }];
      } else {
        let foundKeyId = false;
        for (const knownKeyId of keyIds) {
          if (areArraysOfNumbersEqual(knownKeyId.keyId, keyId)) {
            foundKeyId = true;
          }
        }
        if (!foundKeyId) {
          log.warn("Manifest: found unanounced key id.");
          keyIds.push({ keyId });
        }
      }
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

  /**
   * Format Representation as an `IAudioRepresentation`.
   * @returns {Object}
   */
  public toAudioRepresentation(): IAudioRepresentation {
    const { id, isSpatialAudio, bitrate, codec } = this;
    return { id, isSpatialAudio, bitrate, codec };
  }

  /**
   * Format Representation as an `IVideoRepresentation`.
   * @returns {Object}
   */
  public toVideoRepresentation(): IVideoRepresentation {
    const { id, bitrate, frameRate, width, height, codec, hdrInfo } = this;
    return { id, bitrate, frameRate, width, height, codec, hdrInfo };
  }
}

/** Protection data as returned by a Representation. */
export interface IRepresentationProtectionData {
  /**
   * Initialization data type.
   * String describing the format of the initialization data sent through this
   * event.
   * https://www.w3.org/TR/eme-initdata-registry/
   */
  type: string;
  /**
   * The key ids linked to those initialization data.
   * This should be the key ids for the key concerned by the media which have
   * the present initialization data.
   *
   * `undefined` when not known (different from an empty array - which would
   * just mean that there's no key id involved).
   */
  keyIds : Uint8Array[] | undefined;
  /** Every initialization data for that type. */
  values: Array<{
    /**
     * Hex encoded system id, which identifies the key system.
     * https://dashif.org/identifiers/content_protection/
     */
    systemId: string;
    /**
     * The initialization data itself for that type and systemId.
     * For example, with "cenc" initialization data found in an ISOBMFF file,
     * this will be the whole PSSH box.
     */
     data: Uint8Array;
  }>;
}

export default Representation;
