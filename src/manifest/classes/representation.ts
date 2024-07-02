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

import features from "../../features";
import log from "../../log";
import type { IRepresentationMetadata } from "../../manifest";
import cdmCodecSupportProber from "../../mse/cdm_codec_support_prober";
import type {
  ICdnMetadata,
  IContentProtections,
  IParsedRepresentation,
} from "../../parsers/manifest";
import type { ITrackType, IHDRInformation } from "../../public_types";
import areArraysOfNumbersEqual from "../../utils/are_arrays_of_numbers_equal";
import idGenerator from "../../utils/id_generator";
import type { IRepresentationIndex } from "./representation_index";

const generateRepresentationUniqueId = idGenerator();

/**
 * Normalized Representation structure.
 * @class Representation
 */
class Representation implements IRepresentationMetadata {
  /** ID uniquely identifying the Representation in its parent Adaptation. */
  public readonly id: string;
  /**
   * @see IRepresentationMetadata
   */
  public readonly uniqueId: string;
  /**
   * @see IRepresentationMetadata
   */
  public bitrate: number;
  /**
   * @see IRepresentationMetadata
   */
  public frameRate?: number;
  /**
   * Interface allowing to get information about segments available for this
   * Representation.
   */
  public index: IRepresentationIndex;
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
  public cdnMetadata: ICdnMetadata[] | null;
  /**
   * @see IRepresentationMetadata
   */
  public isSpatialAudio?: boolean | undefined;
  /**
   * @see IRepresentationMetadata
   */
  public codecs: string[];
  /**
   * @see IRepresentationMetadata
   */
  public mimeType?: string;
  /**
   * @see IRepresentationMetadata
   */
  public width?: number;
  /**
   * @see IRepresentationMetadata
   */
  public height?: number;
  /**
   * @see IRepresentationMetadata
   */
  public contentProtections?: IContentProtections;
  /**
   * @see IRepresentationMetadata
   */
  public hdrInfo?: IHDRInformation;
  /**
   * @see IRepresentationMetadata
   */
  public decipherable?: boolean | undefined;
  /**
   * @see IRepresentationMetadata
   */
  public isSupported: boolean | undefined;
  /**
   * @see ITrackType
   */
  public trackType: ITrackType;

  /**
   * @param {Object} args
   * @param {string} trackType
   */
  constructor(args: IParsedRepresentation, trackType: ITrackType) {
    this.id = args.id;
    this.uniqueId = generateRepresentationUniqueId();
    this.bitrate = args.bitrate;
    this.codecs = [];
    this.trackType = trackType;

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

    if (trackType === "audio" || trackType === "video") {
      if (features.codecSupportProber !== null) {
        // Supplemental codecs are defined as backwards-compatible codecs enhancing
        // the experience of a base layer codec
        if (args.supplementalCodecs !== undefined) {
          const isSupplementaryCodecSupported = features.codecSupportProber.isSupported(
            this.mimeType ?? "",
            args.supplementalCodecs ?? "",
          );

          if (isSupplementaryCodecSupported !== false) {
            this.codecs = [args.supplementalCodecs];
            if (isSupplementaryCodecSupported === true) {
              const isSupportedByCDM = cdmCodecSupportProber.isSupported(
                this.mimeType ?? "",
                args.codecs ?? "",
              );
              this.isSupported = isSupportedByCDM;
            }
          }
        }
        if (this.isSupported !== true) {
          if (this.codecs.length > 0) {
            // We couldn't check for support of another supplemental codec.
            // Just push that codec without testing support yet, we'll check
            // support later.
            this.codecs.push(args.codecs ?? "");
          } else {
            this.codecs = args.codecs === undefined ? [] : [args.codecs];
            const isSupportedByMSE = isCodecSupportedByMSE(
              this.mimeType ?? "",
              args.codecs ?? "",
            );

            if (isSupportedByMSE !== true) {
              this.isSupported = isSupportedByMSE;
            } else {
              const isSupportedByCDM = isCodecSupportedByCDM(
                this.mimeType ?? "",
                args.codecs ?? "",
              );
              this.isSupported = isSupportedByCDM;
            }
          }
        }
      } else {
        if (args.supplementalCodecs !== undefined) {
          this.codecs.push(args.supplementalCodecs);
        }
        if (args.codecs !== undefined) {
          this.codecs.push(args.codecs);
        }
      }
    } else {
      if (args.codecs !== undefined) {
        this.codecs.push(args.codecs);
      }
      this.isSupported = true;
    }
  }

  /**
   * Some environments (e.g. in a WebWorker) may not have the capability to know
   * if a mimetype+codec combination is supported on the current platform.
   *
   * Calling `refreshCodecSupport` manually once the codecs supported are known
   * by the current environnement allows to work-around this issue.
   *
   * If the right mimetype+codec combination is found in the provided object,
   * this `Representation`'s `isSupported` property will be updated accordingly.
   *
   * @param {Array.<Object>} supportList
   */
  public refreshCodecSupport() {
    if (this.trackType === "text") {
      this.isSupported = true;
      return;
    }

    const isEncrypted = this.contentProtections !== undefined;
    let isSupported: boolean | undefined = false;
    const mimeType = this.mimeType ?? "";
    let codecs = this.codecs ?? [];
    if (codecs.length === 0) {
      codecs = [""];
    }
    for (const codec of codecs) {
      cdmCodecSupportProber.isSupported(mimeType, codec);
      const isSupportedByMSE = isCodecSupportedByMSE(mimeType, codec);
      // if MSE supports the codec, and the content is encrypted,
      // check further if the CDM also supports the codec.
      if (isSupportedByMSE === true && isEncrypted) {
        const isSupportedByCDM = isCodecSupportedByCDM(mimeType, codec);
        isSupported = isSupportedByMSE && isSupportedByCDM;
      } else {
        isSupported = isSupportedByMSE;
      }

      if (isSupported === true) {
        this.codecs = [codec];
        break;
      }
    }
    this.isSupported = isSupported;
  }

  /**
   * Returns "mime-type string" which includes both the mime-type and the codec,
   * which is often needed when interacting with the browser's APIs.
   * @returns {string}
   */
  public getMimeTypeString(): string {
    return `${this.mimeType ?? ""};codecs="${this.codecs?.[0] ?? ""}"`;
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
  public getEncryptionData(drmSystemId: string): IRepresentationProtectionData[] {
    const allInitData = this.getAllEncryptionData();
    const filtered = [];
    for (let i = 0; i < allInitData.length; i++) {
      let createdObjForType = false;
      const initData = allInitData[i];
      for (let j = 0; j < initData.values.length; j++) {
        if (initData.values[j].systemId.toLowerCase() === drmSystemId.toLowerCase()) {
          if (!createdObjForType) {
            const keyIds = this.contentProtections?.keyIds?.map((val) => val.keyId);
            filtered.push({
              type: initData.type,
              keyIds,
              values: [initData.values[j]],
            });
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
  public getAllEncryptionData(): IRepresentationProtectionData[] {
    if (
      this.contentProtections === undefined ||
      this.contentProtections.initData.length === 0
    ) {
      return [];
    }
    const keyIds = this.contentProtections?.keyIds?.map((val) => val.keyId);
    return this.contentProtections.initData.map((x) => {
      return { type: x.type, keyIds, values: x.values };
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
  public addProtectionData(
    initDataType: string,
    keyId: Uint8Array | undefined,
    data: Array<{
      systemId: string;
      data: Uint8Array;
    }>,
  ): boolean {
    let hasUpdatedProtectionData = false;
    if (this.contentProtections === undefined) {
      this.contentProtections = {
        keyIds: keyId !== undefined ? [{ keyId }] : [],
        initData: [{ type: initDataType, values: data }],
      };
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
    this.contentProtections.initData.push({ type: initDataType, values: data });
    return true;
  }

  /**
   * Format the current `Representation`'s properties into a
   * `IRepresentationMetadata` format which can better be communicated through
   * another thread.
   *
   * Please bear in mind however that the returned object will not be updated
   * when the current `Representation` instance is updated, it is only a
   * snapshot at the current time.
   *
   * If you want to keep that data up-to-date with the current `Representation`
   * instance, you will have to do it yourself.
   *
   * @returns {Object}
   */
  public getMetadataSnapshot(): IRepresentationMetadata {
    return {
      id: this.id,
      uniqueId: this.uniqueId,
      bitrate: this.bitrate,
      codecs: this.codecs,
      mimeType: this.mimeType,
      width: this.width,
      height: this.height,
      frameRate: this.frameRate,
      isSupported: this.isSupported,
      hdrInfo: this.hdrInfo,
      contentProtections: this.contentProtections,
      decipherable: this.decipherable,
    };
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
  keyIds: Uint8Array[] | undefined;
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

export type ICodecSupportList = Array<{
  codec: string;
  mimeType: string;
  result: boolean;
}>;

/**
 * Check if the codec is supported by the CDM (the Content Decryption Module).
 * There can be a disparity between what codecs are supported by MSE and the CDM.
 *
 * Ex: Chrome with Widevine is able to create MediaSource for codec HEVC but
 * Widevine L3 is not able to decipher HEVC because it requires hardware DRM.
 * As a result Chrome is not able to play HEVC when it's encrypted, but it can
 * be played if it's unencrypted.
 * @param {string} mimeType - The mimeType of the codec to test.
 * @param {string} codec - The codec to test.
 * @returns { boolean } True if the codec is supported by the CDM.
 */
function isCodecSupportedByCDM(mimeType: string, codec: string): boolean {
  return cdmCodecSupportProber.isSupported(mimeType, codec);
}

/**
 * Check if the codec is supported by MSE (Media Source Extension).
 * If the codec is supported, the browser should be able to create
 * a media source with the given codec.
 * @param {string} mimeType - The mimeType of the codec to test.
 * @param {string} codec - The codec to test.
 * @returns { boolean } True if the codec is supported by MSE.
 */
function isCodecSupportedByMSE(mimeType: string, codec: string): boolean | undefined {
  if (features.codecSupportProber === null) {
    return true;
  }
  return features.codecSupportProber.isSupported(mimeType, codec);
}

export default Representation;
