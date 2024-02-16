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
Object.defineProperty(exports, "__esModule", { value: true });
var id_generator_1 = require("../../../utils/id_generator");
var monotonic_timestamp_1 = require("../../../utils/monotonic_timestamp");
var representation_index_1 = require("./representation_index");
/**
 * @param {Object} localManifest
 * @returns {Object}
 */
function parseLocalManifest(localManifest) {
    if (localManifest.type !== "local") {
        throw new Error("Invalid local manifest given. It misses the `type` property.");
    }
    if (localManifest.version !== "0.2") {
        throw new Error("The current Local Manifest version (".concat(localManifest.version, ")") +
            " is not compatible with the current version of the RxPlayer");
    }
    var periodIdGenerator = (0, id_generator_1.default)();
    var minimumPosition = localManifest.minimumPosition, maximumPosition = localManifest.maximumPosition, isFinished = localManifest.isFinished;
    var parsedPeriods = localManifest.periods.map(function (period) {
        return parsePeriod(period, { periodIdGenerator: periodIdGenerator });
    });
    return {
        availabilityStartTime: 0,
        expired: localManifest.expired,
        transportType: "local",
        isDynamic: !isFinished,
        isLastPeriodKnown: true,
        isLive: false,
        uris: [],
        timeBounds: {
            minimumSafePosition: minimumPosition !== null && minimumPosition !== void 0 ? minimumPosition : 0,
            timeshiftDepth: null,
            maximumTimeData: {
                isLinear: false,
                maximumSafePosition: maximumPosition,
                livePosition: undefined,
                time: (0, monotonic_timestamp_1.default)(),
            },
        },
        periods: parsedPeriods,
    };
}
exports.default = parseLocalManifest;
/**
 * @param {Object} period
 * @param {Object} ctxt
 * @returns {Object}
 */
function parsePeriod(period, ctxt) {
    var adaptationIdGenerator = (0, id_generator_1.default)();
    return {
        id: "period-" + ctxt.periodIdGenerator(),
        start: period.start,
        end: period.end,
        duration: period.end - period.start,
        adaptations: period.adaptations.reduce(function (acc, ada) {
            var type = ada.type;
            var adaps = acc[type];
            if (adaps === undefined) {
                adaps = [];
                acc[type] = adaps;
            }
            adaps.push(parseAdaptation(ada, { adaptationIdGenerator: adaptationIdGenerator }));
            return acc;
        }, {}),
    };
}
/**
 * @param {Object} adaptation
 * @param {Object} ctxt
 * @returns {Object}
 */
function parseAdaptation(adaptation, ctxt) {
    var representationIdGenerator = (0, id_generator_1.default)();
    return {
        id: "adaptation-" + ctxt.adaptationIdGenerator(),
        type: adaptation.type,
        audioDescription: adaptation.audioDescription,
        closedCaption: adaptation.closedCaption,
        language: adaptation.language,
        representations: adaptation.representations.map(function (representation) {
            return parseRepresentation(representation, { representationIdGenerator: representationIdGenerator });
        }),
    };
}
/**
 * @param {Object} representation
 * @returns {Object}
 */
function parseRepresentation(representation, ctxt) {
    var id = "representation-" + ctxt.representationIdGenerator();
    var contentProtections = representation.contentProtections === undefined
        ? undefined
        : formatContentProtections(representation.contentProtections);
    return {
        id: id,
        cdnMetadata: null,
        bitrate: representation.bitrate,
        height: representation.height,
        width: representation.width,
        codecs: representation.codecs,
        isSpatialAudio: representation.isSpatialAudio,
        mimeType: representation.mimeType,
        index: new representation_index_1.default(representation.index, id),
        contentProtections: contentProtections,
    };
}
/**
 * Translate Local Manifest's `contentProtections` attribute to the one defined
 * for a `Manifest` structure.
 * @param {Object} localContentProtections
 * @returns {Object}
 */
function formatContentProtections(localContentProtections) {
    var keyIds = localContentProtections.keyIds;
    var initData = Object.keys(localContentProtections.initData).map(function (currType) {
        var _a;
        var localInitData = (_a = localContentProtections.initData[currType]) !== null && _a !== void 0 ? _a : [];
        return { type: currType, values: localInitData };
    });
    return { keyIds: keyIds, initData: initData };
}
