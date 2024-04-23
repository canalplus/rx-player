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
import log from "../../../../log";
import arrayFind from "../../../../utils/array_find";
import objectAssign from "../../../../utils/object_assign";
import { convertSupplementalCodecsToRFC6381 } from "./convert_supplemental_codecs";
import { getWEBMHDRInformation } from "./get_hdr_information";
import parseRepresentationIndex from "./parse_representation_index";
import resolveBaseURLs from "./resolve_base_urls";
/**
 * Combine inband event streams from representation and
 * adaptation data.
 * @param {Object} representation
 * @param {Object} adaptation
 * @returns {undefined | Array.<Object>}
 */
function combineInbandEventStreams(representation, adaptation) {
    const newSchemeId = [];
    if (representation.children.inbandEventStreams !== undefined) {
        newSchemeId.push(...representation.children.inbandEventStreams);
    }
    if (adaptation.children.inbandEventStreams !== undefined) {
        newSchemeId.push(...adaptation.children.inbandEventStreams);
    }
    if (newSchemeId.length === 0) {
        return undefined;
    }
    return newSchemeId;
}
/**
 * Extract HDR information from manifest and codecs.
 * @param {Object}
 * @returns {Object | undefined}
 */
function getHDRInformation({ adaptationProfiles, essentialProperties, supplementalProperties, manifestProfiles, codecs, }) {
    const profiles = (adaptationProfiles !== null && adaptationProfiles !== void 0 ? adaptationProfiles : "") + (manifestProfiles !== null && manifestProfiles !== void 0 ? manifestProfiles : "");
    if (profiles.indexOf("http://dashif.org/guidelines/dash-if-uhd#hevc-hdr-pq10") !== -1) {
        if (codecs === "hvc1.2.4.L153.B0" || codecs === "hev1.2.4.L153.B0") {
            return { colorDepth: 10, eotf: "pq", colorSpace: "rec2020" };
        }
    }
    const transferCharacteristicScheme = arrayFind([...(essentialProperties !== null && essentialProperties !== void 0 ? essentialProperties : []), ...(supplementalProperties !== null && supplementalProperties !== void 0 ? supplementalProperties : [])], (p) => p.schemeIdUri === "urn:mpeg:mpegB:cicp:TransferCharacteristics");
    if (transferCharacteristicScheme !== undefined) {
        switch (transferCharacteristicScheme.value) {
            case "15":
                return undefined; // SDR
            case "16":
                return { eotf: "pq" };
            case "18":
                return { eotf: "hlg" };
        }
    }
    if (codecs !== undefined && /^vp(08|09|10)/.exec(codecs)) {
        return getWEBMHDRInformation(codecs);
    }
}
/**
 * Process intermediate representations to create final parsed representations.
 * @param {Array.<Object>} representationsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parseRepresentations(representationsIR, adaptation, context) {
    var _a, _b, _c, _d, _e;
    const parsedRepresentations = [];
    for (const representation of representationsIR) {
        // Compute Representation ID
        let representationID = representation.attributes.id !== undefined
            ? representation.attributes.id
            : String(representation.attributes.bitrate) +
                (representation.attributes.height !== undefined
                    ? `-${representation.attributes.height}`
                    : "") +
                (representation.attributes.width !== undefined
                    ? `-${representation.attributes.width}`
                    : "") +
                (representation.attributes.mimeType !== undefined
                    ? `-${representation.attributes.mimeType}`
                    : "") +
                (representation.attributes.codecs !== undefined
                    ? `-${representation.attributes.codecs}`
                    : "");
        // Avoid duplicate IDs
        while (parsedRepresentations.some((r) => r.id === representationID)) {
            representationID += "-dup";
        }
        // Retrieve previous version of the Representation, if one.
        const unsafelyBaseOnPreviousRepresentation = (_b = (_a = context.unsafelyBaseOnPreviousAdaptation) === null || _a === void 0 ? void 0 : _a.getRepresentation(representationID)) !== null && _b !== void 0 ? _b : null;
        const inbandEventStreams = combineInbandEventStreams(representation, adaptation);
        const availabilityTimeComplete = (_c = representation.attributes.availabilityTimeComplete) !== null && _c !== void 0 ? _c : context.availabilityTimeComplete;
        let availabilityTimeOffset;
        if (representation.attributes.availabilityTimeOffset !== undefined ||
            context.availabilityTimeOffset !== undefined) {
            availabilityTimeOffset =
                ((_d = representation.attributes.availabilityTimeOffset) !== null && _d !== void 0 ? _d : 0) +
                    ((_e = context.availabilityTimeOffset) !== null && _e !== void 0 ? _e : 0);
        }
        const reprIndexCtxt = objectAssign({}, context, {
            availabilityTimeOffset,
            availabilityTimeComplete,
            unsafelyBaseOnPreviousRepresentation,
            adaptation,
            inbandEventStreams,
        });
        const representationIndex = parseRepresentationIndex(representation, reprIndexCtxt);
        // Find bitrate
        let representationBitrate;
        if (representation.attributes.bitrate === undefined) {
            log.warn("DASH: No usable bitrate found in the Representation.");
            representationBitrate = 0;
        }
        else {
            representationBitrate = representation.attributes.bitrate;
        }
        const representationBaseURLs = resolveBaseURLs(context.baseURLs, representation.children.baseURLs);
        const cdnMetadata = representationBaseURLs.length === 0
            ? // No BaseURL seems to be associated to this Representation, nor to the MPD,
                // but underlying segments might have one. To indicate that segments should
                // still be available through a CDN without giving any root CDN URL here,
                // we just communicate about an empty `baseUrl`, as documented.
                [{ baseUrl: "", id: undefined }]
            : representationBaseURLs.map((x) => ({
                baseUrl: x.url,
                id: x.serviceLocation,
            }));
        // Construct Representation Base
        const parsedRepresentation = {
            bitrate: representationBitrate,
            cdnMetadata,
            index: representationIndex,
            id: representationID,
        };
        if (representation.children.supplementalProperties !== undefined &&
            arrayFind(representation.children.supplementalProperties, (r) => r.schemeIdUri === "tag:dolby.com,2018:dash:EC3_ExtensionType:2018" &&
                r.value === "JOC")) {
            parsedRepresentation.isSpatialAudio = true;
        }
        // Add optional attributes
        let codecs;
        if (representation.attributes.codecs !== undefined) {
            codecs = representation.attributes.codecs;
        }
        else if (adaptation.attributes.codecs !== undefined) {
            codecs = adaptation.attributes.codecs;
        }
        if (codecs !== undefined) {
            codecs = codecs === "mp4a.40.02" ? "mp4a.40.2" : codecs;
            parsedRepresentation.codecs = codecs;
        }
        let supplementalCodecs;
        if (representation.attributes.supplementalCodecs !== undefined) {
            supplementalCodecs = representation.attributes.supplementalCodecs;
        }
        else if (adaptation.attributes.supplementalCodecs !== undefined) {
            supplementalCodecs = adaptation.attributes.supplementalCodecs;
        }
        if (supplementalCodecs !== undefined) {
            parsedRepresentation.supplementalCodecs =
                convertSupplementalCodecsToRFC6381(supplementalCodecs);
        }
        if (representation.attributes.frameRate !== undefined) {
            parsedRepresentation.frameRate = representation.attributes.frameRate;
        }
        else if (adaptation.attributes.frameRate !== undefined) {
            parsedRepresentation.frameRate = adaptation.attributes.frameRate;
        }
        if (representation.attributes.height !== undefined) {
            parsedRepresentation.height = representation.attributes.height;
        }
        else if (adaptation.attributes.height !== undefined) {
            parsedRepresentation.height = adaptation.attributes.height;
        }
        if (representation.attributes.mimeType !== undefined) {
            parsedRepresentation.mimeType = representation.attributes.mimeType;
        }
        else if (adaptation.attributes.mimeType !== undefined) {
            parsedRepresentation.mimeType = adaptation.attributes.mimeType;
        }
        if (representation.attributes.width !== undefined) {
            parsedRepresentation.width = representation.attributes.width;
        }
        else if (adaptation.attributes.width !== undefined) {
            parsedRepresentation.width = adaptation.attributes.width;
        }
        const contentProtectionsIr = adaptation.children.contentProtections !== undefined
            ? adaptation.children.contentProtections
            : [];
        if (representation.children.contentProtections !== undefined) {
            contentProtectionsIr.push(...representation.children.contentProtections);
        }
        if (contentProtectionsIr.length > 0) {
            const contentProtections = contentProtectionsIr.reduce((acc, cp) => {
                let systemId;
                if (cp.attributes.schemeIdUri !== undefined &&
                    cp.attributes.schemeIdUri.substring(0, 9) === "urn:uuid:") {
                    systemId = cp.attributes.schemeIdUri
                        .substring(9)
                        .replace(/-/g, "")
                        .toLowerCase();
                }
                if (cp.attributes.keyId !== undefined && cp.attributes.keyId.length > 0) {
                    const kidObj = { keyId: cp.attributes.keyId, systemId };
                    if (acc.keyIds === undefined) {
                        acc.keyIds = [kidObj];
                    }
                    else {
                        acc.keyIds.push(kidObj);
                    }
                }
                if (systemId !== undefined) {
                    const { cencPssh } = cp.children;
                    const values = [];
                    for (const data of cencPssh) {
                        values.push({ systemId, data });
                    }
                    if (values.length > 0) {
                        const cencInitData = arrayFind(acc.initData, (i) => i.type === "cenc");
                        if (cencInitData === undefined) {
                            acc.initData.push({ type: "cenc", values });
                        }
                        else {
                            cencInitData.values.push(...values);
                        }
                    }
                }
                return acc;
            }, { keyIds: undefined, initData: [] });
            if (Object.keys(contentProtections.initData).length > 0 ||
                (contentProtections.keyIds !== undefined && contentProtections.keyIds.length > 0)) {
                parsedRepresentation.contentProtections = contentProtections;
            }
        }
        parsedRepresentation.hdrInfo = getHDRInformation({
            adaptationProfiles: adaptation.attributes.profiles,
            supplementalProperties: adaptation.children.supplementalProperties,
            essentialProperties: adaptation.children.essentialProperties,
            manifestProfiles: context.manifestProfiles,
            codecs,
        });
        parsedRepresentations.push(parsedRepresentation);
    }
    return parsedRepresentations;
}
