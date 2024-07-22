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
import log from "../../log";
import Manifest from "../../manifest/classes";
import { getMDAT } from "../../parsers/containers/isobmff";
import createSmoothManifestParser from "../../parsers/manifest/smooth";
import request from "../../utils/request";
import { strToUtf8, utf8ToStr } from "../../utils/string_parsing";
import addQueryString from "../utils/add_query_string";
import checkISOBMFFIntegrity from "../utils/check_isobmff_integrity";
import generateManifestLoader from "../utils/generate_manifest_loader";
import extractTimingsInfos from "./extract_timings_infos";
import isMP4EmbeddedTrack from "./is_mp4_embedded_track";
import { patchSegment } from "./isobmff";
import generateSegmentLoader from "./segment_loader";
import { constructSegmentUrl } from "./utils";
export default function (transportOptions) {
    const smoothManifestParser = createSmoothManifestParser(transportOptions);
    const segmentLoader = generateSegmentLoader(transportOptions);
    const manifestLoaderOptions = {
        customManifestLoader: transportOptions.manifestLoader,
    };
    const manifestLoader = generateManifestLoader(manifestLoaderOptions, "text", null);
    const manifestPipeline = {
        loadManifest: manifestLoader,
        parseManifest(manifestData, parserOptions) {
            var _a;
            const url = (_a = manifestData.url) !== null && _a !== void 0 ? _a : parserOptions.originalUrl;
            const { receivedTime: manifestReceivedTime, responseData } = manifestData;
            const documentData = typeof responseData === "string"
                ? new DOMParser().parseFromString(responseData, "text/xml")
                : responseData; // TODO find a way to check if Document?
            const parserResult = smoothManifestParser(documentData, url, manifestReceivedTime);
            const warnings = [];
            const manifest = new Manifest(parserResult, {
                representationFilter: transportOptions.representationFilter,
            }, warnings);
            return { manifest, url, warnings };
        },
    };
    /**
     * Export functions allowing to load and parse audio and video smooth
     * segments.
     */
    const audioVideoPipeline = {
        /**
         * Load a Smooth audio/video segment.
         * @param {Object|null} wantedCdn
         * @param {Object} context
         * @param {Object} loaderOptions
         * @param {Object} cancelSignal
         * @param {Object} callbacks
         * @returns {Promise}
         */
        loadSegment(wantedCdn, context, loaderOptions, cancelSignal, callbacks) {
            const url = constructSegmentUrl(wantedCdn, context.segment);
            return segmentLoader(url, context, loaderOptions, cancelSignal, callbacks);
        },
        parseSegment(loadedSegment, context, initTimescale) {
            var _a, _b;
            const { segment } = context;
            const { data, isChunked } = loadedSegment;
            if (data === null) {
                if (segment.isInit) {
                    return {
                        segmentType: "init",
                        initializationData: null,
                        initializationDataSize: 0,
                        protectionData: [],
                        initTimescale: undefined,
                    };
                }
                return {
                    segmentType: "media",
                    chunkData: null,
                    chunkInfos: null,
                    chunkOffset: 0,
                    chunkSize: 0,
                    protectionData: [],
                    appendWindow: [undefined, undefined],
                };
            }
            const responseBuffer = data instanceof Uint8Array ? data : new Uint8Array(data);
            if (segment.isInit) {
                const timescale = (_b = (_a = segment.privateInfos) === null || _a === void 0 ? void 0 : _a.smoothInitSegment) === null || _b === void 0 ? void 0 : _b.timescale;
                return {
                    segmentType: "init",
                    initializationData: data,
                    initializationDataSize: data.byteLength,
                    // smooth init segments are crafted by hand.
                    // Their timescale is the one from the manifest.
                    initTimescale: timescale,
                    protectionData: [],
                };
            }
            const timingInfos = initTimescale !== undefined
                ? extractTimingsInfos(responseBuffer, isChunked, initTimescale, segment, context.isLive)
                : null;
            if (timingInfos === null ||
                timingInfos.chunkInfos === null ||
                timingInfos.scaledSegmentTime === undefined) {
                throw new Error("Smooth Segment without time information");
            }
            const { nextSegments, chunkInfos, scaledSegmentTime } = timingInfos;
            const chunkData = patchSegment(responseBuffer, scaledSegmentTime);
            const predictedSegments = nextSegments.length > 0 ? nextSegments : undefined;
            return {
                segmentType: "media",
                chunkData,
                chunkInfos,
                chunkOffset: 0,
                chunkSize: chunkData.length,
                protectionData: [],
                predictedSegments,
                appendWindow: [undefined, undefined],
            };
        },
    };
    const textTrackPipeline = {
        loadSegment(wantedCdn, context, loaderOptions, cancelSignal, callbacks) {
            var _a, _b, _c, _d;
            const { segment } = context;
            const url = constructSegmentUrl(wantedCdn, segment);
            if (segment.isInit || url === null) {
                return Promise.resolve({
                    resultType: "segment-created",
                    resultData: null,
                });
            }
            const isMP4 = isMP4EmbeddedTrack(context.mimeType);
            if (!isMP4) {
                return request({
                    url: ((_a = loaderOptions.cmcdPayload) === null || _a === void 0 ? void 0 : _a.type) === "query"
                        ? addQueryString(url, loaderOptions.cmcdPayload.value)
                        : url,
                    headers: ((_b = loaderOptions.cmcdPayload) === null || _b === void 0 ? void 0 : _b.type) === "headers"
                        ? loaderOptions.cmcdPayload.value
                        : undefined,
                    responseType: "text",
                    timeout: loaderOptions.timeout,
                    connectionTimeout: loaderOptions.connectionTimeout,
                    cancelSignal,
                    onProgress: callbacks.onProgress,
                }).then((data) => ({
                    resultType: "segment-loaded",
                    resultData: data,
                }));
            }
            else {
                return request({
                    url: ((_c = loaderOptions.cmcdPayload) === null || _c === void 0 ? void 0 : _c.type) === "query"
                        ? addQueryString(url, loaderOptions.cmcdPayload.value)
                        : url,
                    headers: ((_d = loaderOptions.cmcdPayload) === null || _d === void 0 ? void 0 : _d.type) === "headers"
                        ? loaderOptions.cmcdPayload.value
                        : undefined,
                    responseType: "arraybuffer",
                    timeout: loaderOptions.timeout,
                    connectionTimeout: loaderOptions.connectionTimeout,
                    cancelSignal,
                    onProgress: callbacks.onProgress,
                }).then((data) => {
                    if (transportOptions.checkMediaSegmentIntegrity !== true) {
                        return { resultType: "segment-loaded", resultData: data };
                    }
                    const dataU8 = new Uint8Array(data.responseData);
                    checkISOBMFFIntegrity(dataU8, context.segment.isInit);
                    return {
                        resultType: "segment-loaded",
                        resultData: Object.assign(Object.assign({}, data), { responseData: dataU8 }),
                    };
                });
            }
        },
        parseSegment(loadedSegment, context, initTimescale) {
            var _a;
            const { segment, language, mimeType = "", codecs = "" } = context;
            const isMP4 = isMP4EmbeddedTrack(context.mimeType);
            const { data, isChunked } = loadedSegment;
            let chunkSize;
            if (segment.isInit) {
                // text init segment has no use in HSS
                return {
                    segmentType: "init",
                    initializationData: null,
                    initializationDataSize: 0,
                    protectionData: [],
                    initTimescale: undefined,
                };
            }
            if (data === null) {
                return {
                    segmentType: "media",
                    chunkData: null,
                    chunkInfos: null,
                    chunkOffset: 0,
                    chunkSize: 0,
                    protectionData: [],
                    appendWindow: [undefined, undefined],
                };
            }
            let nextSegments;
            let chunkInfos = null;
            let segmentStart;
            let segmentEnd;
            let _sdData;
            let _sdType;
            if (isMP4) {
                let chunkBytes;
                if (typeof data === "string") {
                    chunkBytes = strToUtf8(data);
                }
                else {
                    chunkBytes = data instanceof Uint8Array ? data : new Uint8Array(data);
                }
                chunkSize = chunkBytes.length;
                const timingInfos = initTimescale !== undefined
                    ? extractTimingsInfos(chunkBytes, isChunked, initTimescale, segment, context.isLive)
                    : null;
                nextSegments = timingInfos === null || timingInfos === void 0 ? void 0 : timingInfos.nextSegments;
                chunkInfos = (_a = timingInfos === null || timingInfos === void 0 ? void 0 : timingInfos.chunkInfos) !== null && _a !== void 0 ? _a : null;
                if (chunkInfos === null) {
                    if (isChunked) {
                        log.warn("Smooth: Unavailable time data for current text track.");
                    }
                    else {
                        segmentStart = segment.time;
                        segmentEnd = segment.end;
                    }
                }
                else {
                    segmentStart = chunkInfos.time;
                    segmentEnd =
                        chunkInfos.duration !== undefined
                            ? chunkInfos.time + chunkInfos.duration
                            : segment.end;
                }
                const lcCodec = codecs.toLowerCase();
                if (mimeType === "application/ttml+xml+mp4" ||
                    lcCodec === "stpp" ||
                    lcCodec === "stpp.ttml.im1t") {
                    _sdType = "ttml";
                }
                else if (lcCodec === "wvtt") {
                    _sdType = "vtt";
                }
                else {
                    throw new Error(`could not find a text-track parser for the type ${mimeType}`);
                }
                const mdat = getMDAT(chunkBytes);
                _sdData = mdat === null ? "" : utf8ToStr(mdat);
            }
            else {
                // not MP4
                segmentStart = segment.time;
                segmentEnd = segment.end;
                let chunkString;
                if (typeof data !== "string") {
                    const bytesData = data instanceof Uint8Array ? data : new Uint8Array(data);
                    chunkSize = bytesData.length;
                    chunkString = utf8ToStr(bytesData);
                }
                else {
                    chunkString = data;
                }
                switch (mimeType) {
                    case "application/x-sami":
                    case "application/smil": // TODO SMIL should be its own format, no?
                        _sdType = "sami";
                        break;
                    case "application/ttml+xml":
                        _sdType = "ttml";
                        break;
                    case "text/vtt":
                        _sdType = "vtt";
                        break;
                }
                if (_sdType === undefined) {
                    const lcCodec = codecs.toLowerCase();
                    if (lcCodec === "srt") {
                        _sdType = "srt";
                    }
                    else {
                        throw new Error(`could not find a text-track parser for the type ${mimeType}`);
                    }
                }
                _sdData = chunkString;
            }
            const predictedSegments = Array.isArray(nextSegments) && nextSegments.length > 0 ? nextSegments : undefined;
            const chunkOffset = segmentStart !== null && segmentStart !== void 0 ? segmentStart : 0;
            return {
                segmentType: "media",
                chunkData: {
                    type: _sdType,
                    data: _sdData,
                    start: segmentStart,
                    end: segmentEnd,
                    language,
                },
                chunkSize,
                chunkInfos,
                chunkOffset,
                protectionData: [],
                predictedSegments,
                appendWindow: [undefined, undefined],
            };
        },
    };
    return {
        transportName: "smooth",
        manifest: manifestPipeline,
        audio: audioVideoPipeline,
        video: audioVideoPipeline,
        text: textTrackPipeline,
    };
}
