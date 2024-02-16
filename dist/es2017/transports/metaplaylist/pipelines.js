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
import config from "../../config";
import features from "../../features";
import Manifest from "../../manifest/classes";
import parseMetaPlaylist from "../../parsers/manifest/metaplaylist";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import objectAssign from "../../utils/object_assign";
import generateManifestLoader from "./manifest_loader";
/**
 * Get base - real - content from an offseted metaplaylist content.
 * @param {Object} mplContext
 * @returns {Object}
 */
function getOriginalContext(mplContext) {
    var _a;
    const { segment } = mplContext;
    if (((_a = segment.privateInfos) === null || _a === void 0 ? void 0 : _a.metaplaylistInfos) === undefined) {
        throw new Error("MetaPlaylist: missing private infos");
    }
    const { isLive, periodStart, periodEnd, manifestPublishTime } = segment.privateInfos.metaplaylistInfos;
    const { originalSegment } = segment.privateInfos.metaplaylistInfos;
    return {
        segment: originalSegment,
        type: mplContext.type,
        language: mplContext.language,
        mimeType: mplContext.mimeType,
        codecs: mplContext.codecs,
        isLive,
        periodStart,
        periodEnd,
        manifestPublishTime,
    };
}
/**
 * @param {Object} transports
 * @param {string} transportName
 * @param {Object} options
 * @returns {Object}
 */
function getTransportPipelines(transports, transportName, options) {
    const initialTransport = transports[transportName];
    if (initialTransport !== undefined) {
        return initialTransport;
    }
    const feature = features.transports[transportName];
    if (feature === undefined) {
        throw new Error(`MetaPlaylist: Unknown transport ${transportName}.`);
    }
    const transport = feature(options);
    transports[transportName] = transport;
    return transport;
}
/**
 * @param {Object} segment
 * @returns {Object}
 */
function getMetaPlaylistPrivateInfos(segment) {
    const { privateInfos } = segment;
    if ((privateInfos === null || privateInfos === void 0 ? void 0 : privateInfos.metaplaylistInfos) === undefined) {
        throw new Error("MetaPlaylist: Undefined transport for content for metaplaylist.");
    }
    return privateInfos.metaplaylistInfos;
}
export default function (options) {
    const transports = {};
    const manifestLoader = generateManifestLoader({
        customManifestLoader: options.manifestLoader,
    });
    // remove some options that we might not want to apply to the
    // other streaming protocols used here
    const otherTransportOptions = objectAssign({}, options, {
        manifestLoader: undefined,
    });
    const manifestPipeline = {
        loadManifest: manifestLoader,
        parseManifest(manifestData, parserOptions, onWarnings, cancelSignal, scheduleRequest) {
            var _a;
            const url = (_a = manifestData.url) !== null && _a !== void 0 ? _a : parserOptions.originalUrl;
            const { responseData } = manifestData;
            const mplParserOptions = {
                url,
                serverSyncInfos: options.serverSyncInfos,
            };
            const parsed = parseMetaPlaylist(responseData, mplParserOptions);
            return handleParsedResult(parsed);
            function handleParsedResult(parsedResult) {
                if (parsedResult.type === "done") {
                    const warnings = [];
                    const manifest = new Manifest(parsedResult.value, options, warnings);
                    return Promise.resolve({ manifest, warnings });
                }
                const parsedValue = parsedResult.value;
                const loaderProms = parsedValue.ressources.map((resource) => {
                    const transport = getTransportPipelines(transports, resource.transportType, otherTransportOptions);
                    return scheduleRequest(loadSubManifest).then((data) => transport.manifest.parseManifest(data, Object.assign(Object.assign({}, parserOptions), { originalUrl: resource.url }), onWarnings, cancelSignal, scheduleRequest));
                    function loadSubManifest() {
                        /*
                         * Whether a ManifestLoader's timeout should be relied on here
                         * is ambiguous.
                         */
                        const manOpts = {
                            timeout: config.getCurrent().DEFAULT_REQUEST_TIMEOUT,
                            connectionTimeout: config.getCurrent().DEFAULT_CONNECTION_TIMEOUT,
                        };
                        return transport.manifest.loadManifest(resource.url, manOpts, cancelSignal);
                    }
                });
                return Promise.all(loaderProms).then((parsedReqs) => {
                    const loadedRessources = parsedReqs.map((e) => e.manifest);
                    return handleParsedResult(parsedResult.value.continue(loadedRessources));
                });
            }
        },
    };
    /**
     * @param {Object} segment
     * @returns {Object}
     */
    function getTransportPipelinesFromSegment(segment) {
        const { transportType } = getMetaPlaylistPrivateInfos(segment);
        return getTransportPipelines(transports, transportType, otherTransportOptions);
    }
    /**
     * @param {number} contentOffset
     * @param {number|undefined} contentEnd
     * @param {Object} segmentResponse
     * @returns {Object}
     */
    function offsetTimeInfos(contentOffset, contentEnd, segmentResponse) {
        const offsetedSegmentOffset = segmentResponse.chunkOffset + contentOffset;
        if (isNullOrUndefined(segmentResponse.chunkData)) {
            return {
                chunkInfos: segmentResponse.chunkInfos,
                chunkOffset: offsetedSegmentOffset,
                appendWindow: [undefined, undefined],
            };
        }
        // clone chunkInfos
        const { chunkInfos, appendWindow } = segmentResponse;
        const offsetedChunkInfos = chunkInfos === null ? null : objectAssign({}, chunkInfos);
        if (offsetedChunkInfos !== null) {
            offsetedChunkInfos.time += contentOffset;
        }
        const offsetedWindowStart = appendWindow[0] !== undefined
            ? Math.max(appendWindow[0] + contentOffset, contentOffset)
            : contentOffset;
        let offsetedWindowEnd;
        if (appendWindow[1] !== undefined) {
            offsetedWindowEnd =
                contentEnd !== undefined
                    ? Math.min(appendWindow[1] + contentOffset, contentEnd)
                    : appendWindow[1] + contentOffset;
        }
        else if (contentEnd !== undefined) {
            offsetedWindowEnd = contentEnd;
        }
        return {
            chunkInfos: offsetedChunkInfos,
            chunkOffset: offsetedSegmentOffset,
            appendWindow: [offsetedWindowStart, offsetedWindowEnd],
        };
    }
    const audioPipeline = {
        loadSegment(wantedCdn, context, loaderOptions, cancelToken, callbacks) {
            const { segment } = context;
            const { audio } = getTransportPipelinesFromSegment(segment);
            const ogContext = getOriginalContext(context);
            return audio.loadSegment(wantedCdn, ogContext, loaderOptions, cancelToken, callbacks);
        },
        parseSegment(loadedSegment, context, initTimescale) {
            const { segment } = context;
            const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
            const { audio } = getTransportPipelinesFromSegment(segment);
            const ogContext = getOriginalContext(context);
            const parsed = audio.parseSegment(loadedSegment, ogContext, initTimescale);
            if (parsed.segmentType === "init") {
                return parsed;
            }
            const timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
            return objectAssign({}, parsed, timeInfos);
        },
    };
    const videoPipeline = {
        loadSegment(wantedCdn, context, loaderOptions, cancelToken, callbacks) {
            const { segment } = context;
            const { video } = getTransportPipelinesFromSegment(segment);
            const ogContext = getOriginalContext(context);
            return video.loadSegment(wantedCdn, ogContext, loaderOptions, cancelToken, callbacks);
        },
        parseSegment(loadedSegment, context, initTimescale) {
            const { segment } = context;
            const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
            const { video } = getTransportPipelinesFromSegment(segment);
            const ogContext = getOriginalContext(context);
            const parsed = video.parseSegment(loadedSegment, ogContext, initTimescale);
            if (parsed.segmentType === "init") {
                return parsed;
            }
            const timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
            return objectAssign({}, parsed, timeInfos);
        },
    };
    const textTrackPipeline = {
        loadSegment(wantedCdn, context, loaderOptions, cancelToken, callbacks) {
            const { segment } = context;
            const { text } = getTransportPipelinesFromSegment(segment);
            const ogContext = getOriginalContext(context);
            return text.loadSegment(wantedCdn, ogContext, loaderOptions, cancelToken, callbacks);
        },
        parseSegment(loadedSegment, context, initTimescale) {
            const { segment } = context;
            const { contentStart, contentEnd } = getMetaPlaylistPrivateInfos(segment);
            const { text } = getTransportPipelinesFromSegment(segment);
            const ogContext = getOriginalContext(context);
            const parsed = text.parseSegment(loadedSegment, ogContext, initTimescale);
            if (parsed.segmentType === "init") {
                return parsed;
            }
            const timeInfos = offsetTimeInfos(contentStart, contentEnd, parsed);
            return objectAssign({}, parsed, timeInfos);
        },
    };
    return {
        manifest: manifestPipeline,
        audio: audioPipeline,
        video: videoPipeline,
        text: textTrackPipeline,
    };
}
