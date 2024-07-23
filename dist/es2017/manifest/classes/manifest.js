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
import { MediaError } from "../../errors";
import log from "../../log";
import arrayFind from "../../utils/array_find";
import EventEmitter from "../../utils/event_emitter";
import idGenerator from "../../utils/id_generator";
import warnOnce from "../../utils/warn_once";
import { getLivePosition, getMaximumSafePosition, getMinimumSafePosition, getPeriodForTime, getPeriodAfter, toTaggedTrack, } from "../utils";
import Period from "./period";
import { MANIFEST_UPDATE_TYPE } from "./types";
import { replacePeriods, updatePeriods } from "./update_periods";
const generateNewManifestId = idGenerator();
/**
 * Normalized Manifest structure.
 *
 * Details the current content being played:
 *   - the duration of the content
 *   - the available tracks
 *   - the available qualities
 *   - the segments defined in those qualities
 *   - ...
 * while staying agnostic of the transport protocol used (Smooth, DASH etc.).
 *
 * The Manifest and its contained information can evolve over time (like when
 * updating a dynamic manifest or when right management forbid some tracks from
 * being played).
 * To perform actions on those changes, any module using this Manifest can
 * listen to its sent events and react accordingly.
 *
 * @class Manifest
 */
export default class Manifest extends EventEmitter {
    /**
     * Construct a Manifest instance from a parsed Manifest object (as returned by
     * Manifest parsers) and options.
     *
     * Some minor errors can arise during that construction. `warnings`
     * will contain all such errors, in the order they have been encountered.
     * @param {Object} parsedManifest
     * @param {Object} options
     * @param {Array.<Object>} warnings - After construction, will be optionally
     * filled by errors expressing minor issues seen while parsing the Manifest.
     */
    constructor(parsedManifest, options, warnings) {
        var _a;
        super();
        const { representationFilter, manifestUpdateUrl } = options;
        this.manifestFormat = 0 /* ManifestMetadataFormat.Class */;
        this.id = generateNewManifestId();
        this.expired = (_a = parsedManifest.expired) !== null && _a !== void 0 ? _a : null;
        this.transport = parsedManifest.transportType;
        this.clockOffset = parsedManifest.clockOffset;
        const unsupportedAdaptations = [];
        this.periods = parsedManifest.periods
            .map((parsedPeriod) => {
            const period = new Period(parsedPeriod, unsupportedAdaptations, representationFilter);
            return period;
        })
            .sort((a, b) => a.start - b.start);
        if (unsupportedAdaptations.length > 0) {
            const error = new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "An Adaptation contains only incompatible codecs.", { tracks: unsupportedAdaptations.map(toTaggedTrack) });
            warnings.push(error);
        }
        /**
         * @deprecated It is here to ensure compatibility with the way the
         * v3.x.x manages adaptations at the Manifest level
         */
        /* eslint-disable import/no-deprecated */
        this.adaptations = this.periods[0] === undefined ? {} : this.periods[0].adaptations;
        /* eslint-enable import/no-deprecated */
        this.timeBounds = parsedManifest.timeBounds;
        this.isDynamic = parsedManifest.isDynamic;
        this.isLive = parsedManifest.isLive;
        this.isLastPeriodKnown = parsedManifest.isLastPeriodKnown;
        this.uris = parsedManifest.uris === undefined ? [] : parsedManifest.uris;
        this.updateUrl = manifestUpdateUrl;
        this.lifetime = parsedManifest.lifetime;
        this.clockOffset = parsedManifest.clockOffset;
        this.suggestedPresentationDelay = parsedManifest.suggestedPresentationDelay;
        this.availabilityStartTime = parsedManifest.availabilityStartTime;
        this.publishTime = parsedManifest.publishTime;
    }
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually with a clear list of codecs supported
     * once it has been requested on a compatible environment (e.g. in the main
     * thread) allows to work-around this issue.
     *
     * @param {Array.<Object>} supportList
     * @returns {Error|null} - Refreshing codec support might reveal that some
     * `Adaptation` don't have any of their `Representation`s supported.
     * In that case, an error object will be created and returned, so you can
     * e.g. later emit it as a warning through the RxPlayer API.
     */
    refreshCodecSupport(supportList) {
        const unsupportedAdaptations = [];
        for (const period of this.periods) {
            period.refreshCodecSupport(supportList, unsupportedAdaptations);
        }
        if (unsupportedAdaptations.length > 0) {
            return new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "An Adaptation contains only incompatible codecs.", { tracks: unsupportedAdaptations.map(toTaggedTrack) });
        }
        return null;
    }
    /**
     * Returns the Period corresponding to the given `id`.
     * Returns `undefined` if there is none.
     * @param {string} id
     * @returns {Object|undefined}
     */
    getPeriod(id) {
        return arrayFind(this.periods, (period) => {
            return id === period.id;
        });
    }
    /**
     * Returns the Period encountered at the given time.
     * Returns `undefined` if there is no Period exactly at the given time.
     * @param {number} time
     * @returns {Object|undefined}
     */
    getPeriodForTime(time) {
        return getPeriodForTime(this, time);
    }
    /**
     * Returns the first Period starting strictly after the given time.
     * Returns `undefined` if there is no Period starting after that time.
     * @param {number} time
     * @returns {Object|undefined}
     */
    getNextPeriod(time) {
        return arrayFind(this.periods, (period) => {
            return period.start > time;
        });
    }
    /**
     * Returns the Period coming chronologically just after another given Period.
     * Returns `undefined` if not found.
     * @param {Object} period
     * @returns {Object|null}
     */
    getPeriodAfter(period) {
        return getPeriodAfter(this, period);
    }
    /**
     * Returns the most important URL from which the Manifest can be refreshed.
     * `undefined` if no URL is found.
     * @returns {Array.<string>}
     */
    getUrls() {
        return this.uris;
    }
    /**
     * Update the current Manifest properties by giving a new updated version.
     * This instance will be updated with the new information coming from it.
     * @param {Object} newManifest
     */
    replace(newManifest) {
        this._performUpdate(newManifest, MANIFEST_UPDATE_TYPE.Full);
    }
    /**
     * Update the current Manifest properties by giving a new but shorter version
     * of it.
     * This instance will add the new information coming from it and will
     * automatically clean old Periods that shouldn't be available anymore.
     *
     * /!\ Throws if the given Manifest cannot be used or is not sufficient to
     * update the Manifest.
     * @param {Object} newManifest
     */
    update(newManifest) {
        this._performUpdate(newManifest, MANIFEST_UPDATE_TYPE.Partial);
    }
    /**
     * Returns the theoretical minimum playable position on the content
     * regardless of the current Adaptation chosen, as estimated at parsing
     * time.
     * @returns {number}
     */
    getMinimumSafePosition() {
        return getMinimumSafePosition(this);
    }
    /**
     * Get the position of the live edge - that is, the position of what is
     * currently being broadcasted, in seconds.
     * @returns {number|undefined}
     */
    getLivePosition() {
        return getLivePosition(this);
    }
    /**
     * Returns the theoretical maximum playable position on the content
     * regardless of the current Adaptation chosen, as estimated at parsing
     * time.
     */
    getMaximumSafePosition() {
        return getMaximumSafePosition(this);
    }
    /**
     * Look in the Manifest for Representations linked to the given key ID,
     * and mark them as being impossible to decrypt.
     * Then trigger a "decipherabilityUpdate" event to notify everyone of the
     * changes performed.
     * @param {Function} isDecipherableCb
     */
    updateRepresentationsDeciperability(isDecipherableCb) {
        const updates = updateDeciperability(this, isDecipherableCb);
        if (updates.length > 0) {
            this.trigger("decipherabilityUpdate", updates);
        }
    }
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptations() {
        warnOnce("manifest.getAdaptations() is deprecated." +
            " Please use manifest.period[].getAdaptations() instead");
        const firstPeriod = this.periods[0];
        if (firstPeriod === undefined) {
            return [];
        }
        const adaptationsByType = firstPeriod.adaptations;
        const adaptationsList = [];
        for (const adaptationType in adaptationsByType) {
            if (adaptationsByType.hasOwnProperty(adaptationType)) {
                const adaptations = adaptationsByType[adaptationType];
                adaptationsList.push(...adaptations);
            }
        }
        return adaptationsList;
    }
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptationsForType(adaptationType) {
        warnOnce("manifest.getAdaptationsForType(type) is deprecated." +
            " Please use manifest.period[].getAdaptationsForType(type) instead");
        const firstPeriod = this.periods[0];
        if (firstPeriod === undefined) {
            return [];
        }
        const adaptationsForType = firstPeriod.adaptations[adaptationType];
        return adaptationsForType === undefined ? [] : adaptationsForType;
    }
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    getAdaptation(wantedId) {
        warnOnce("manifest.getAdaptation(id) is deprecated." +
            " Please use manifest.period[].getAdaptation(id) instead");
        /* eslint-disable import/no-deprecated */
        return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
        /* eslint-enable import/no-deprecated */
    }
    /**
     * Format the current `Manifest`'s properties into a
     * `IManifestMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Manifest` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Manifest`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot() {
        const periods = [];
        for (const period of this.periods) {
            periods.push(period.getMetadataSnapshot());
        }
        return {
            manifestFormat: 1 /* ManifestMetadataFormat.MetadataObject */,
            id: this.id,
            periods,
            isDynamic: this.isDynamic,
            isLive: this.isLive,
            isLastPeriodKnown: this.isLastPeriodKnown,
            suggestedPresentationDelay: this.suggestedPresentationDelay,
            clockOffset: this.clockOffset,
            uris: this.uris,
            availabilityStartTime: this.availabilityStartTime,
            timeBounds: this.timeBounds,
        };
    }
    /**
     * @param {Object} newManifest
     * @param {number} updateType
     */
    _performUpdate(newManifest, updateType) {
        this.availabilityStartTime = newManifest.availabilityStartTime;
        this.expired = newManifest.expired;
        this.isDynamic = newManifest.isDynamic;
        this.isLive = newManifest.isLive;
        this.isLastPeriodKnown = newManifest.isLastPeriodKnown;
        this.lifetime = newManifest.lifetime;
        this.clockOffset = newManifest.clockOffset;
        this.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
        this.transport = newManifest.transport;
        this.publishTime = newManifest.publishTime;
        let updatedPeriodsResult;
        if (updateType === MANIFEST_UPDATE_TYPE.Full) {
            this.timeBounds = newManifest.timeBounds;
            this.uris = newManifest.uris;
            updatedPeriodsResult = replacePeriods(this.periods, newManifest.periods);
        }
        else {
            this.timeBounds.maximumTimeData = newManifest.timeBounds.maximumTimeData;
            this.updateUrl = newManifest.uris[0];
            updatedPeriodsResult = updatePeriods(this.periods, newManifest.periods);
            // Partial updates do not remove old Periods.
            // This can become a memory problem when playing a content long enough.
            // Let's clean manually Periods behind the minimum possible position.
            const min = this.getMinimumSafePosition();
            while (this.periods.length > 0) {
                const period = this.periods[0];
                if (period.end === undefined || period.end > min) {
                    break;
                }
                this.periods.shift();
            }
        }
        // Re-set this.adaptations for retro-compatibility in v3.x.x
        /* eslint-disable import/no-deprecated */
        this.adaptations = this.periods[0] === undefined ? {} : this.periods[0].adaptations;
        /* eslint-enable import/no-deprecated */
        // Let's trigger events at the end, as those can trigger side-effects.
        // We do not want the current Manifest object to be incomplete when those
        // happen.
        this.trigger("manifestUpdate", updatedPeriodsResult);
    }
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
function updateDeciperability(manifest, isDecipherable) {
    const updates = [];
    for (const period of manifest.periods) {
        for (const adaptation of period.getAdaptations()) {
            for (const representation of adaptation.representations) {
                const content = { manifest, period, adaptation, representation };
                const result = isDecipherable(content);
                if (result !== representation.decipherable) {
                    updates.push(content);
                    representation.decipherable = result;
                    log.debug(`Decipherability changed for "${representation.id}"`, `(${representation.bitrate})`, String(representation.decipherable));
                }
            }
        }
    }
    return updates;
}
