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
import areArraysOfNumbersEqual from "../../utils/are_arrays_of_numbers_equal";
import idGenerator from "../../utils/id_generator";
const generateRepresentationUniqueId = idGenerator();
/**
 * Normalized Representation structure.
 * @class Representation
 */
class Representation {
    /**
     * @param {Object} args
     * @param {string} trackType
     */
    constructor(args, trackType) {
        var _a, _b, _c, _d, _e;
        this.id = args.id;
        this.uniqueId = generateRepresentationUniqueId();
        this.bitrate = args.bitrate;
        this.codecs = [];
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
                    const isSupplementaryCodecSupported = features.codecSupportProber.isSupported((_a = this.mimeType) !== null && _a !== void 0 ? _a : "", (_b = args.supplementalCodecs) !== null && _b !== void 0 ? _b : "");
                    if (isSupplementaryCodecSupported !== false) {
                        this.codecs = [args.supplementalCodecs];
                        if (isSupplementaryCodecSupported === true) {
                            this.isSupported = true;
                        }
                    }
                }
                if (this.isSupported !== true) {
                    if (this.codecs.length > 0) {
                        // We couldn't check for support of another supplemental codec.
                        // Just push that codec without testing support yet, we'll check
                        // support later.
                        this.codecs.push((_c = args.codecs) !== null && _c !== void 0 ? _c : "");
                    }
                    else {
                        this.codecs = args.codecs === undefined ? [] : [args.codecs];
                        this.isSupported = features.codecSupportProber.isSupported((_d = this.mimeType) !== null && _d !== void 0 ? _d : "", (_e = args.codecs) !== null && _e !== void 0 ? _e : "");
                    }
                }
            }
            else {
                if (args.supplementalCodecs !== undefined) {
                    this.codecs.push(args.supplementalCodecs);
                }
                if (args.codecs !== undefined) {
                    this.codecs.push(args.codecs);
                }
            }
        }
        else {
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
     * Calling `refreshCodecSupport` manually with a clear list of codecs supported
     * once it has been requested on a compatible environment (e.g. in the main
     * thread) allows to work-around this issue.
     *
     * If the right mimetype+codec combination is found in the provided object,
     * this `Representation`'s `isSupported` property will be updated accordingly.
     *
     * @param {Array.<Object>} supportList
     */
    refreshCodecSupport(supportList) {
        var _a;
        const mimeType = (_a = this.mimeType) !== null && _a !== void 0 ? _a : "";
        let codecs = this.codecs;
        if (codecs.length === 0) {
            codecs = [""];
        }
        // Go through each codec, from the most detailed to the most compatible one
        for (let codecIdx = 0; codecIdx < codecs.length; codecIdx++) {
            // Find out if an entry is present for it in the support list
            for (const obj of supportList) {
                const codec = codecs[codecIdx];
                if (obj.codec === codec && obj.mimeType === mimeType) {
                    if (obj.result) {
                        // We found that this codec was supported. Remove all reference to
                        // other codecs which are either unsupported, less detailed, or
                        // both and anounce support.
                        this.isSupported = true;
                        this.codecs = [codec];
                        return;
                    }
                    else if (codecIdx === codecs.length) {
                        // The last more compatible codec, was still found unsupported,
                        // this Representation is not decodable.
                        // Put the more compatible codec only for the API.
                        this.isSupported = false;
                        this.codecs = [codec];
                        return;
                    }
                }
            }
        }
    }
    /**
     * Returns "mime-type string" which includes both the mime-type and the codec,
     * which is often needed when interacting with the browser's APIs.
     * @returns {string}
     */
    getMimeTypeString() {
        var _a, _b, _c;
        return `${(_a = this.mimeType) !== null && _a !== void 0 ? _a : ""};codecs="${(_c = (_b = this.codecs) === null || _b === void 0 ? void 0 : _b[0]) !== null && _c !== void 0 ? _c : ""}"`;
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
    getEncryptionData(drmSystemId) {
        var _a, _b;
        const allInitData = this.getAllEncryptionData();
        const filtered = [];
        for (let i = 0; i < allInitData.length; i++) {
            let createdObjForType = false;
            const initData = allInitData[i];
            for (let j = 0; j < initData.values.length; j++) {
                if (initData.values[j].systemId.toLowerCase() === drmSystemId.toLowerCase()) {
                    if (!createdObjForType) {
                        const keyIds = (_b = (_a = this.contentProtections) === null || _a === void 0 ? void 0 : _a.keyIds) === null || _b === void 0 ? void 0 : _b.map((val) => val.keyId);
                        filtered.push({
                            type: initData.type,
                            keyIds,
                            values: [initData.values[j]],
                        });
                        createdObjForType = true;
                    }
                    else {
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
    getAllEncryptionData() {
        var _a, _b;
        if (this.contentProtections === undefined ||
            this.contentProtections.initData.length === 0) {
            return [];
        }
        const keyIds = (_b = (_a = this.contentProtections) === null || _a === void 0 ? void 0 : _a.keyIds) === null || _b === void 0 ? void 0 : _b.map((val) => val.keyId);
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
    addProtectionData(initDataType, keyId, data) {
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
            }
            else {
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
                            }
                            else {
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
    getMetadataSnapshot() {
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
export default Representation;
