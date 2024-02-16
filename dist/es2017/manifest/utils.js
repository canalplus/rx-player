import areArraysOfNumbersEqual from "../utils/are_arrays_of_numbers_equal";
import arrayFind from "../utils/array_find";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import getMonotonicTimeStamp from "../utils/monotonic_timestamp";
import { objectValues } from "../utils/object_values";
/** List in an array every possible value for the Adaptation's `type` property. */
export const SUPPORTED_ADAPTATIONS_TYPE = ["audio", "video", "text"];
/**
 * Returns the theoretical minimum playable position on the content
 * regardless of the current Adaptation chosen, as estimated at parsing
 * time.
 * @param {Object} manifest
 * @returns {number}
 */
export function getMinimumSafePosition(manifest) {
    var _a, _b;
    const windowData = manifest.timeBounds;
    if (windowData.timeshiftDepth === null) {
        return (_a = windowData.minimumSafePosition) !== null && _a !== void 0 ? _a : 0;
    }
    const { maximumTimeData } = windowData;
    let maximumTime;
    if (!windowData.maximumTimeData.isLinear) {
        maximumTime = maximumTimeData.maximumSafePosition;
    }
    else {
        const timeDiff = getMonotonicTimeStamp() - maximumTimeData.time;
        maximumTime = maximumTimeData.maximumSafePosition + timeDiff / 1000;
    }
    const theoricalMinimum = maximumTime - windowData.timeshiftDepth;
    return Math.max((_b = windowData.minimumSafePosition) !== null && _b !== void 0 ? _b : 0, theoricalMinimum);
}
/**
 * Get the position of the live edge - that is, the position of what is
 * currently being broadcasted, in seconds.
 * @param {Object} manifest
 * @returns {number|undefined}
 */
export function getLivePosition(manifest) {
    const { maximumTimeData } = manifest.timeBounds;
    if (!manifest.isLive || maximumTimeData.livePosition === undefined) {
        return undefined;
    }
    if (!maximumTimeData.isLinear) {
        return maximumTimeData.livePosition;
    }
    const timeDiff = getMonotonicTimeStamp() - maximumTimeData.time;
    return maximumTimeData.livePosition + timeDiff / 1000;
}
/**
 * Returns the theoretical maximum playable position on the content
 * regardless of the current Adaptation chosen, as estimated at parsing
 * time.
 * @param {Object} manifest
 * @returns {number}
 */
export function getMaximumSafePosition(manifest) {
    const { maximumTimeData } = manifest.timeBounds;
    if (!maximumTimeData.isLinear) {
        return maximumTimeData.maximumSafePosition;
    }
    const timeDiff = getMonotonicTimeStamp() - maximumTimeData.time;
    return maximumTimeData.maximumSafePosition + timeDiff / 1000;
}
export function getSupportedAdaptations(period, type) {
    if (type === undefined) {
        return getAdaptations(period).filter((ada) => {
            return ada.isSupported === true;
        });
    }
    const adaptationsForType = period.adaptations[type];
    if (adaptationsForType === undefined) {
        return [];
    }
    return adaptationsForType.filter((ada) => {
        return ada.isSupported === true;
    });
}
export function getPeriodForTime(manifest, time) {
    let nextPeriod = null;
    for (let i = manifest.periods.length - 1; i >= 0; i--) {
        const period = manifest.periods[i];
        if (periodContainsTime(period, time, nextPeriod)) {
            return period;
        }
        nextPeriod = period;
    }
}
export function getPeriodAfter(manifest, period) {
    const endOfPeriod = period.end;
    if (endOfPeriod === undefined) {
        return null;
    }
    const nextPeriod = arrayFind(manifest.periods, (_period) => {
        return _period.end === undefined || endOfPeriod < _period.end;
    });
    return nextPeriod === undefined ? null : nextPeriod;
}
/**
 * Returns true if the give time is in the time boundaries of this `Period`.
 * @param {Object} period - The `Period` which we want to check.
 * @param {number} time
 * @param {object|null} nextPeriod - Period coming chronologically just
 * after in the same Manifest. `null` if this instance is the last `Period`.
 * @returns {boolean}
 */
export function periodContainsTime(period, time, nextPeriod) {
    if (time >= period.start && (period.end === undefined || time < period.end)) {
        return true;
    }
    else if (time === period.end &&
        (nextPeriod === null || nextPeriod.start > period.end)) {
        // The last possible timed position of a Period is ambiguous as it is
        // frequently in common with the start of the next one: is it part of
        // the current or of the next Period?
        // Here we only consider it part of the current Period if it is the
        // only one with that position.
        return true;
    }
    return false;
}
export function getAdaptations(period) {
    const adaptationsByType = period.adaptations;
    return objectValues(adaptationsByType).reduce(
    // Note: the second case cannot happen. TS is just being dumb here
    (acc, adaptations) => !isNullOrUndefined(adaptations) ? acc.concat(adaptations) : acc, []);
}
/**
 * Format an `Adaptation`, generally of type `"audio"`, as an `IAudioTrack`.
 * @param {Object} adaptation
 * @param {boolean} filterPlayable - If `true` only "playable" Representation
 * will be returned.
 * @returns {Object}
 */
export function toAudioTrack(adaptation, filterPlayable) {
    var _a, _b;
    const formatted = {
        language: (_a = adaptation.language) !== null && _a !== void 0 ? _a : "",
        normalized: (_b = adaptation.normalizedLanguage) !== null && _b !== void 0 ? _b : "",
        audioDescription: adaptation.isAudioDescription === true,
        id: adaptation.id,
        representations: (filterPlayable
            ? adaptation.representations.filter((r) => r.isSupported === true && r.decipherable !== false)
            : adaptation.representations).map(toAudioRepresentation),
        label: adaptation.label,
    };
    if (adaptation.isDub === true) {
        formatted.dub = true;
    }
    return formatted;
}
/**
 * Format an `Adaptation`, generally of type `"audio"`, as an `IAudioTrack`.
 * @param {Object} adaptation
 * @returns {Object}
 */
export function toTextTrack(adaptation) {
    var _a, _b;
    return {
        language: (_a = adaptation.language) !== null && _a !== void 0 ? _a : "",
        normalized: (_b = adaptation.normalizedLanguage) !== null && _b !== void 0 ? _b : "",
        closedCaption: adaptation.isClosedCaption === true,
        id: adaptation.id,
        label: adaptation.label,
        forced: adaptation.isForcedSubtitles,
    };
}
/**
 * Format an `Adaptation`, generally of type `"video"`, as an `IAudioTrack`.
 * @param {Object} adaptation
 * @param {boolean} filterPlayable - If `true` only "playable" Representation
 * will be returned.
 * @returns {Object}
 */
export function toVideoTrack(adaptation, filterPlayable) {
    const trickModeTracks = adaptation.trickModeTracks !== undefined
        ? adaptation.trickModeTracks.map((trickModeAdaptation) => {
            const representations = (filterPlayable
                ? trickModeAdaptation.representations.filter((r) => r.isSupported === true && r.decipherable !== false)
                : trickModeAdaptation.representations).map(toVideoRepresentation);
            const trickMode = {
                id: trickModeAdaptation.id,
                representations,
                isTrickModeTrack: true,
            };
            if (trickModeAdaptation.isSignInterpreted === true) {
                trickMode.signInterpreted = true;
            }
            return trickMode;
        })
        : undefined;
    const videoTrack = {
        id: adaptation.id,
        representations: (filterPlayable
            ? adaptation.representations.filter((r) => r.isSupported === true && r.decipherable !== false)
            : adaptation.representations).map(toVideoRepresentation),
        label: adaptation.label,
    };
    if (adaptation.isSignInterpreted === true) {
        videoTrack.signInterpreted = true;
    }
    if (adaptation.isTrickModeTrack === true) {
        videoTrack.isTrickModeTrack = true;
    }
    if (trickModeTracks !== undefined) {
        videoTrack.trickModeTracks = trickModeTracks;
    }
    return videoTrack;
}
/**
 * Format Representation as an `IAudioRepresentation`.
 * @returns {Object}
 */
function toAudioRepresentation(representation) {
    const { id, bitrate, codecs, isSpatialAudio, isSupported, decipherable } = representation;
    return {
        id,
        bitrate,
        codec: codecs === null || codecs === void 0 ? void 0 : codecs[0],
        isSpatialAudio,
        isCodecSupported: isSupported,
        decipherable,
    };
}
/**
 * Format Representation as an `IVideoRepresentation`.
 * @returns {Object}
 */
function toVideoRepresentation(representation) {
    const { id, bitrate, frameRate, width, height, codecs, hdrInfo, isSupported, decipherable, } = representation;
    return {
        id,
        bitrate,
        frameRate,
        width,
        height,
        codec: codecs === null || codecs === void 0 ? void 0 : codecs[0],
        hdrInfo,
        isCodecSupported: isSupported,
        decipherable,
    };
}
export function toTaggedTrack(adaptation) {
    switch (adaptation.type) {
        case "audio":
            return { type: "audio", track: toAudioTrack(adaptation, false) };
        case "video":
            return { type: "video", track: toVideoTrack(adaptation, false) };
        case "text":
            return { type: "text", track: toTextTrack(adaptation) };
    }
}
/**
 * Change the decipherability of Representations which have their key id in one
 * of the given Arrays:
 *
 *   - Those who have a key id listed in `whitelistedKeyIds` will have their
 *     decipherability updated to `true`
 *
 *   - Those who have a key id listed in `blacklistedKeyIds` will have their
 *     decipherability updated to `false`
 *
 *   - Those who have a key id listed in `delistedKeyIds` will have their
 *     decipherability updated to `undefined`.
 *
 * @param {Object} manifest
 * @param {Array.<Uint8Array>} whitelistedKeyIds
 * @param {Array.<Uint8Array>} blacklistedKeyIds
 * @param {Array.<Uint8Array>} delistedKeyIds
 */
export function updateDecipherabilityFromKeyIds(manifest, updates) {
    const { whitelistedKeyIds, blacklistedKeyIds, delistedKeyIds } = updates;
    return updateRepresentationsDeciperability(manifest, (representation) => {
        if (representation.contentProtections === undefined) {
            return representation.decipherable;
        }
        const contentKIDs = representation.contentProtections.keyIds;
        if (contentKIDs !== undefined) {
            for (const elt of contentKIDs) {
                for (const blacklistedKeyId of blacklistedKeyIds) {
                    if (areArraysOfNumbersEqual(blacklistedKeyId, elt.keyId)) {
                        return false;
                    }
                }
                for (const whitelistedKeyId of whitelistedKeyIds) {
                    if (areArraysOfNumbersEqual(whitelistedKeyId, elt.keyId)) {
                        return true;
                    }
                }
                for (const delistedKeyId of delistedKeyIds) {
                    if (areArraysOfNumbersEqual(delistedKeyId, elt.keyId)) {
                        return undefined;
                    }
                }
            }
        }
        return representation.decipherable;
    });
}
/**
 * Update decipherability to `false` to any Representation which is linked to
 * the given initialization data.
 * @param {Object} manifest
 * @param {Object} initData
 */
export function updateDecipherabilityFromProtectionData(manifest, initData) {
    return updateRepresentationsDeciperability(manifest, (representation) => {
        var _a, _b;
        if (representation.decipherable === false) {
            return false;
        }
        const segmentProtections = (_b = (_a = representation.contentProtections) === null || _a === void 0 ? void 0 : _a.initData) !== null && _b !== void 0 ? _b : [];
        for (const protection of segmentProtections) {
            if (initData.type === undefined || protection.type === initData.type) {
                const containedInitData = initData.values
                    .getFormattedValues()
                    .every((undecipherableVal) => {
                    return protection.values.some((currVal) => {
                        return ((undecipherableVal.systemId === undefined ||
                            currVal.systemId === undecipherableVal.systemId) &&
                            areArraysOfNumbersEqual(currVal.data, undecipherableVal.data));
                    });
                });
                if (containedInitData) {
                    return false;
                }
            }
        }
        return representation.decipherable;
    });
}
/**
 * Update `decipherable` property of every `Representation` found in the
 * Manifest based on the result of a `isDecipherable` callback:
 *   - When that callback returns `true`, update `decipherable` to `true`
 *   - When that callback returns `false`, update `decipherable` to `false`
 *   - When that callback returns `undefined`, update `decipherable` to
 *     `undefined`
 * @param {Manifest} manifest
 * @param {Function} isDecipherable
 * @returns {Array.<Object>}
 */
function updateRepresentationsDeciperability(manifest, isDecipherable) {
    const updates = [];
    for (const period of manifest.periods) {
        const adaptationsByType = period.adaptations;
        const adaptations = objectValues(adaptationsByType).reduce(
        // Note: the second case cannot happen. TS is just being dumb here
        (acc, adaps) => (!isNullOrUndefined(adaps) ? acc.concat(adaps) : acc), []);
        for (const adaptation of adaptations) {
            for (const representation of adaptation.representations) {
                const result = isDecipherable(representation);
                if (result !== representation.decipherable) {
                    updates.push({ manifest, period, adaptation, representation });
                    representation.decipherable = result;
                }
            }
        }
    }
    return updates;
}
/**
 *
 * TODO that function is kind of very ugly, yet should work.
 * Maybe find out a better system for Manifest updates.
 * @param {Object} baseManifest
 * @param {Object} newManifest
 * @param {Array.<Object>} updates
 */
export function replicateUpdatesOnManifestMetadata(baseManifest, newManifest, updates) {
    var _a, _b;
    for (const prop of Object.keys(newManifest)) {
        if (prop !== "periods") {
            // eslint-disable-next-line
            baseManifest[prop] = newManifest[prop];
        }
    }
    for (const removedPeriod of updates.removedPeriods) {
        for (let periodIdx = 0; periodIdx < baseManifest.periods.length; periodIdx++) {
            if (baseManifest.periods[periodIdx].id === removedPeriod.id) {
                baseManifest.periods.splice(periodIdx, 1);
                break;
            }
        }
    }
    for (const updatedPeriod of updates.updatedPeriods) {
        for (let periodIdx = 0; periodIdx < baseManifest.periods.length; periodIdx++) {
            const newPeriod = updatedPeriod.period;
            if (baseManifest.periods[periodIdx].id === updatedPeriod.period.id) {
                const basePeriod = baseManifest.periods[periodIdx];
                for (const prop of Object.keys(newPeriod)) {
                    if (prop !== "adaptations") {
                        // eslint-disable-next-line
                        basePeriod[prop] = newPeriod[prop];
                    }
                }
                for (const removedAdaptation of updatedPeriod.result.removedAdaptations) {
                    const ttype = removedAdaptation.trackType;
                    const adaptationsForType = (_a = basePeriod.adaptations[ttype]) !== null && _a !== void 0 ? _a : [];
                    for (let adapIdx = 0; adapIdx < adaptationsForType.length; adapIdx++) {
                        if (adaptationsForType[adapIdx].id === removedAdaptation.id) {
                            adaptationsForType.splice(adapIdx, 1);
                            break;
                        }
                    }
                }
                for (const updatedAdaptation of updatedPeriod.result.updatedAdaptations) {
                    const newAdaptation = updatedAdaptation.adaptation;
                    const ttype = updatedAdaptation.trackType;
                    const adaptationsForType = (_b = basePeriod.adaptations[ttype]) !== null && _b !== void 0 ? _b : [];
                    for (let adapIdx = 0; adapIdx < adaptationsForType.length; adapIdx++) {
                        if (adaptationsForType[adapIdx].id === newAdaptation) {
                            const baseAdaptation = adaptationsForType[adapIdx];
                            for (const removedRepresentation of updatedAdaptation.removedRepresentations) {
                                for (let repIdx = 0; repIdx < baseAdaptation.representations.length; repIdx++) {
                                    if (baseAdaptation.representations[repIdx].id === removedRepresentation) {
                                        baseAdaptation.representations.splice(repIdx, 1);
                                        break;
                                    }
                                }
                            }
                            for (const newRepresentation of updatedAdaptation.updatedRepresentations) {
                                for (let repIdx = 0; repIdx < baseAdaptation.representations.length; repIdx++) {
                                    if (baseAdaptation.representations[repIdx].id === newRepresentation.id) {
                                        const baseRepresentation = baseAdaptation.representations[repIdx];
                                        for (const prop of Object.keys(newRepresentation)) {
                                            if (prop !== "decipherable" && prop !== "isSupported") {
                                                // eslint-disable-next-line
                                                baseRepresentation[prop] = newRepresentation[prop];
                                            }
                                        }
                                        break;
                                    }
                                }
                            }
                            for (const addedRepresentation of updatedAdaptation.addedRepresentations) {
                                baseAdaptation.representations.push(addedRepresentation);
                            }
                            break;
                        }
                    }
                }
                for (const addedAdaptation of updatedPeriod.result.addedAdaptations) {
                    const ttype = addedAdaptation.type;
                    const adaptationsForType = basePeriod.adaptations[ttype];
                    if (adaptationsForType === undefined) {
                        basePeriod.adaptations[ttype] = [addedAdaptation];
                    }
                    else {
                        adaptationsForType.push(addedAdaptation);
                    }
                }
                break;
            }
        }
    }
    for (const addedPeriod of updates.addedPeriods) {
        for (let periodIdx = 0; periodIdx < baseManifest.periods.length; periodIdx++) {
            if (baseManifest.periods[periodIdx].start > addedPeriod.start) {
                baseManifest.periods.splice(periodIdx, 0, addedPeriod);
                break;
            }
        }
        baseManifest.periods.push(addedPeriod);
    }
}
export function createRepresentationFilterFromFnString(fnString) {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    return new Function(`return (${fnString}(arguments[0], arguments[1]))`);
}
