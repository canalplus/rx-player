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
import idGenerator from "../../../utils/id_generator";
import getMonotonicTimeStamp from "../../../utils/monotonic_timestamp";
import LocalRepresentationIndex from "./representation_index";
/**
 * @param {Object} localManifest
 * @returns {Object}
 */
export default function parseLocalManifest(localManifest) {
    if (localManifest.type !== "local") {
        throw new Error("Invalid local manifest given. It misses the `type` property.");
    }
    if (localManifest.version !== "0.2") {
        throw new Error(`The current Local Manifest version (${localManifest.version})` +
            " is not compatible with the current version of the RxPlayer");
    }
    const periodIdGenerator = idGenerator();
    const { minimumPosition, maximumPosition, isFinished } = localManifest;
    const parsedPeriods = localManifest.periods.map((period) => parsePeriod(period, { periodIdGenerator }));
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
                time: getMonotonicTimeStamp(),
            },
        },
        periods: parsedPeriods,
    };
}
/**
 * @param {Object} period
 * @param {Object} ctxt
 * @returns {Object}
 */
function parsePeriod(period, ctxt) {
    const adaptationIdGenerator = idGenerator();
    return {
        id: "period-" + ctxt.periodIdGenerator(),
        start: period.start,
        end: period.end,
        duration: period.end - period.start,
        adaptations: period.adaptations.reduce((acc, ada) => {
            const type = ada.type;
            let adaps = acc[type];
            if (adaps === undefined) {
                adaps = [];
                acc[type] = adaps;
            }
            adaps.push(parseAdaptation(ada, { adaptationIdGenerator }));
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
    const representationIdGenerator = idGenerator();
    return {
        id: "adaptation-" + ctxt.adaptationIdGenerator(),
        type: adaptation.type,
        audioDescription: adaptation.audioDescription,
        closedCaption: adaptation.closedCaption,
        language: adaptation.language,
        representations: adaptation.representations.map((representation) => parseRepresentation(representation, { representationIdGenerator })),
    };
}
/**
 * @param {Object} representation
 * @returns {Object}
 */
function parseRepresentation(representation, ctxt) {
    const id = "representation-" + ctxt.representationIdGenerator();
    const contentProtections = representation.contentProtections === undefined
        ? undefined
        : formatContentProtections(representation.contentProtections);
    return {
        id,
        cdnMetadata: null,
        bitrate: representation.bitrate,
        height: representation.height,
        width: representation.width,
        codecs: representation.codecs,
        isSpatialAudio: representation.isSpatialAudio,
        mimeType: representation.mimeType,
        index: new LocalRepresentationIndex(representation.index, id),
        contentProtections,
    };
}
/**
 * Translate Local Manifest's `contentProtections` attribute to the one defined
 * for a `Manifest` structure.
 * @param {Object} localContentProtections
 * @returns {Object}
 */
function formatContentProtections(localContentProtections) {
    const keyIds = localContentProtections.keyIds;
    const initData = Object.keys(localContentProtections.initData).map((currType) => {
        var _a;
        const localInitData = (_a = localContentProtections.initData[currType]) !== null && _a !== void 0 ? _a : [];
        return { type: currType, values: localInitData };
    });
    return { keyIds, initData };
}
