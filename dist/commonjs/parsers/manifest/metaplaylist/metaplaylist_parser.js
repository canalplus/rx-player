"use strict";
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../log");
var manifest_1 = require("../../../manifest");
var classes_1 = require("../../../manifest/classes");
var id_generator_1 = require("../../../utils/id_generator");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var resolve_url_1 = require("../../../utils/resolve_url");
var representation_index_1 = require("./representation_index");
/**
 * Parse playlist string to JSON.
 * Returns an array of contents.
 * @param {string} data
 * @param {Object} parserOptions
 * @returns {Object}
 */
function parseMetaPlaylist(data, parserOptions) {
    var parsedData;
    if (typeof data === "object" && data !== null) {
        parsedData = data;
    }
    else if (typeof data === "string") {
        try {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            parsedData = JSON.parse(data);
        }
        catch (error) {
            throw new Error("MPL Parser: Bad MetaPlaylist file. Expected JSON.");
        }
    }
    else {
        throw new Error("MPL Parser: Parser input must be either a string " +
            "or the MetaPlaylist data directly.");
    }
    var _a = parsedData, contents = _a.contents, version = _a.version, type = _a.type;
    if (type !== "MPL") {
        throw new Error("MPL Parser: Bad MetaPlaylist. " + "The `type` property is not set to `MPL`");
    }
    if (version !== "0.1") {
        throw new Error("MPL Parser: Bad MetaPlaylist version");
    }
    // quick checks
    if ((0, is_null_or_undefined_1.default)(contents) || contents.length === 0) {
        throw new Error("MPL Parser: No content found.");
    }
    var ressources = [];
    for (var i = 0; i < contents.length; i++) {
        var content = contents[i];
        if ((0, is_null_or_undefined_1.default)(content.url) ||
            (0, is_null_or_undefined_1.default)(content.startTime) ||
            (0, is_null_or_undefined_1.default)(content.endTime) ||
            (0, is_null_or_undefined_1.default)(content.transport)) {
            throw new Error("MPL Parser: Malformed content.");
        }
        ressources.push({ url: content.url, transportType: content.transport });
    }
    var metaPlaylist = parsedData;
    return {
        type: "needs-manifest-loader",
        value: {
            ressources: ressources,
            continue: function parseWholeMPL(loadedRessources) {
                var parsedManifest = createManifest(metaPlaylist, loadedRessources, parserOptions);
                return { type: "done", value: parsedManifest };
            },
        },
    };
}
exports.default = parseMetaPlaylist;
/**
 * From several parsed manifests, generate a single bigger manifest.
 * Each content presents a start and end time, so that periods
 * boudaries could be adapted.
 * @param {Object} mplData
 * @param {Array<Object>} manifests
 * @param {Object} parserOptions
 * @returns {Object}
 */
function createManifest(mplData, manifests, parserOptions) {
    var url = parserOptions.url, serverSyncInfos = parserOptions.serverSyncInfos;
    var clockOffset = serverSyncInfos !== undefined
        ? serverSyncInfos.serverTimestamp - serverSyncInfos.clientTime
        : undefined;
    var generateAdaptationID = (0, id_generator_1.default)();
    var generateRepresentationID = (0, id_generator_1.default)();
    var contents = mplData.contents;
    var minimumTime = contents.length > 0 ? contents[0].startTime : 0;
    var maximumTime = contents.length > 0 ? contents[contents.length - 1].endTime : 0;
    var isDynamic = mplData.dynamic === true;
    var firstStart = null;
    var lastEnd = null;
    var periods = [];
    var _loop_1 = function (iMan) {
        var content = contents[iMan];
        firstStart =
            firstStart !== null ? Math.min(firstStart, content.startTime) : content.startTime;
        lastEnd = lastEnd !== null ? Math.max(lastEnd, content.endTime) : content.endTime;
        var currentManifest = manifests[iMan];
        if (currentManifest.periods.length <= 0) {
            return "continue";
        }
        var contentOffset = content.startTime - currentManifest.periods[0].start;
        var contentEnd = content.endTime;
        var manifestPeriods = [];
        var _loop_2 = function (iPer) {
            var _a;
            var currentPeriod = currentManifest.periods[iPer];
            var adaptations = manifest_1.SUPPORTED_ADAPTATIONS_TYPE.reduce(function (acc, type) {
                var currentAdaptations = currentPeriod.adaptations[type];
                if ((0, is_null_or_undefined_1.default)(currentAdaptations)) {
                    return acc;
                }
                var adaptationsForCurrentType = [];
                for (var iAda = 0; iAda < currentAdaptations.length; iAda++) {
                    var currentAdaptation = currentAdaptations[iAda];
                    var representations = [];
                    for (var iRep = 0; iRep < currentAdaptation.representations.length; iRep++) {
                        var currentRepresentation = currentAdaptation.representations[iRep];
                        var baseContentMetadata = {
                            isLive: currentManifest.isLive,
                            manifestPublishTime: currentManifest.publishTime,
                            periodStart: currentPeriod.start,
                            periodEnd: currentPeriod.end,
                        };
                        var newIndex = new representation_index_1.default(currentRepresentation.index, [contentOffset, contentEnd], content.transport, baseContentMetadata);
                        var supplementalCodecs = void 0;
                        if (currentRepresentation.codecs.length > 1) {
                            if (currentRepresentation.codecs.length > 2) {
                                log_1.default.warn("MP: MetaPlaylist relying on more than 2 groups of " +
                                    "codecs with retro-compatibility");
                            }
                            supplementalCodecs = currentRepresentation.codecs[0];
                        }
                        var codecs = currentRepresentation.codecs[currentRepresentation.codecs.length - 1];
                        representations.push({
                            bitrate: currentRepresentation.bitrate,
                            index: newIndex,
                            cdnMetadata: currentRepresentation.cdnMetadata,
                            id: currentRepresentation.id,
                            height: currentRepresentation.height,
                            width: currentRepresentation.width,
                            mimeType: currentRepresentation.mimeType,
                            frameRate: currentRepresentation.frameRate,
                            codecs: codecs,
                            supplementalCodecs: supplementalCodecs,
                            isSpatialAudio: currentRepresentation.isSpatialAudio,
                            contentProtections: currentRepresentation.contentProtections,
                        });
                    }
                    adaptationsForCurrentType.push({
                        id: currentAdaptation.id,
                        representations: representations,
                        type: currentAdaptation.type,
                        audioDescription: currentAdaptation.isAudioDescription,
                        closedCaption: currentAdaptation.isClosedCaption,
                        isDub: currentAdaptation.isDub,
                        language: currentAdaptation.language,
                        isSignInterpreted: currentAdaptation.isSignInterpreted,
                    });
                    acc[type] = adaptationsForCurrentType;
                }
                return acc;
            }, {});
            // TODO only first period?
            var textTracks = content.textTracks === undefined ? [] : content.textTracks;
            var newTextAdaptations = textTracks.map(function (track) {
                var adaptationID = "gen-text-ada-" + generateAdaptationID();
                var representationID = "gen-text-rep-" + generateRepresentationID();
                var indexOfFilename = (0, resolve_url_1.getFilenameIndexInUrl)(track.url);
                var cdnUrl = track.url.substring(0, indexOfFilename);
                var filename = track.url.substring(indexOfFilename);
                return {
                    id: adaptationID,
                    type: "text",
                    language: track.language,
                    closedCaption: track.closedCaption,
                    manuallyAdded: true,
                    representations: [
                        {
                            bitrate: 0,
                            cdnMetadata: [{ baseUrl: cdnUrl }],
                            id: representationID,
                            mimeType: track.mimeType,
                            codecs: track.codecs,
                            index: new classes_1.StaticRepresentationIndex({ media: filename }),
                        },
                    ],
                };
            }, []);
            if (newTextAdaptations.length > 0) {
                if ((0, is_null_or_undefined_1.default)(adaptations.text)) {
                    adaptations.text = newTextAdaptations;
                }
                else {
                    (_a = adaptations.text).push.apply(_a, __spreadArray([], __read(newTextAdaptations), false));
                }
            }
            var newPeriod = {
                id: formatId(currentManifest.id) + "_" + formatId(currentPeriod.id),
                adaptations: adaptations,
                duration: currentPeriod.duration,
                start: contentOffset + currentPeriod.start,
            };
            manifestPeriods.push(newPeriod);
        };
        for (var iPer = 0; iPer < currentManifest.periods.length; iPer++) {
            _loop_2(iPer);
        }
        for (var i = manifestPeriods.length - 1; i >= 0; i--) {
            var period = manifestPeriods[i];
            if (period.start >= content.endTime) {
                manifestPeriods.splice(i, 1);
            }
            else if (!(0, is_null_or_undefined_1.default)(period.duration)) {
                if (period.start + period.duration > content.endTime) {
                    period.duration = content.endTime - period.start;
                }
            }
            else if (i === manifestPeriods.length - 1) {
                period.duration = content.endTime - period.start;
            }
        }
        periods.push.apply(periods, __spreadArray([], __read(manifestPeriods), false));
    };
    for (var iMan = 0; iMan < contents.length; iMan++) {
        _loop_1(iMan);
    }
    var time = (0, monotonic_timestamp_1.default)();
    var isLastPeriodKnown = !isDynamic ||
        (mplData.pollInterval === undefined &&
            (manifests.length <= 0 || manifests[manifests.length - 1].isLastPeriodKnown));
    var manifest = {
        availabilityStartTime: 0,
        clockOffset: clockOffset,
        suggestedPresentationDelay: 10,
        periods: periods,
        transportType: "metaplaylist",
        isLive: isDynamic,
        isDynamic: isDynamic,
        isLastPeriodKnown: isLastPeriodKnown,
        uris: (0, is_null_or_undefined_1.default)(url) ? [] : [url],
        // TODO more precize time bounds?
        timeBounds: {
            minimumSafePosition: minimumTime,
            timeshiftDepth: null,
            maximumTimeData: {
                isLinear: false,
                maximumSafePosition: maximumTime,
                livePosition: undefined,
                time: time,
            },
        },
        lifetime: mplData.pollInterval,
    };
    return manifest;
}
function formatId(str) {
    return str.replace(/_/g, "_");
}
