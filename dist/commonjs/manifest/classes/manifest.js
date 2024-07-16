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
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
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
var errors_1 = require("../../errors");
var log_1 = require("../../log");
var array_find_1 = require("../../utils/array_find");
var event_emitter_1 = require("../../utils/event_emitter");
var id_generator_1 = require("../../utils/id_generator");
var warn_once_1 = require("../../utils/warn_once");
var utils_1 = require("../utils");
var period_1 = require("./period");
var types_1 = require("./types");
var update_periods_1 = require("./update_periods");
var generateNewManifestId = (0, id_generator_1.default)();
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
var Manifest = /** @class */ (function (_super) {
    __extends(Manifest, _super);
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
    function Manifest(parsedManifest, options, warnings) {
        var _a;
        var _this = _super.call(this) || this;
        var representationFilter = options.representationFilter, manifestUpdateUrl = options.manifestUpdateUrl;
        _this.manifestFormat = 0 /* ManifestMetadataFormat.Class */;
        _this.id = generateNewManifestId();
        _this.expired = (_a = parsedManifest.expired) !== null && _a !== void 0 ? _a : null;
        _this.transport = parsedManifest.transportType;
        _this.clockOffset = parsedManifest.clockOffset;
        var unsupportedAdaptations = [];
        _this.periods = parsedManifest.periods
            .map(function (parsedPeriod) {
            var period = new period_1.default(parsedPeriod, unsupportedAdaptations, representationFilter);
            return period;
        })
            .sort(function (a, b) { return a.start - b.start; });
        if (unsupportedAdaptations.length > 0) {
            var error = new errors_1.MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "An Adaptation contains only incompatible codecs.", { tracks: unsupportedAdaptations.map(utils_1.toTaggedTrack) });
            warnings.push(error);
        }
        /**
         * @deprecated It is here to ensure compatibility with the way the
         * v3.x.x manages adaptations at the Manifest level
         */
        /* eslint-disable import/no-deprecated */
        _this.adaptations = _this.periods[0] === undefined ? {} : _this.periods[0].adaptations;
        /* eslint-enable import/no-deprecated */
        _this.timeBounds = parsedManifest.timeBounds;
        _this.isDynamic = parsedManifest.isDynamic;
        _this.isLive = parsedManifest.isLive;
        _this.isLastPeriodKnown = parsedManifest.isLastPeriodKnown;
        _this.uris = parsedManifest.uris === undefined ? [] : parsedManifest.uris;
        _this.updateUrl = manifestUpdateUrl;
        _this.lifetime = parsedManifest.lifetime;
        _this.clockOffset = parsedManifest.clockOffset;
        _this.suggestedPresentationDelay = parsedManifest.suggestedPresentationDelay;
        _this.availabilityStartTime = parsedManifest.availabilityStartTime;
        _this.publishTime = parsedManifest.publishTime;
        return _this;
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
    Manifest.prototype.refreshCodecSupport = function (supportList) {
        var e_1, _a;
        var unsupportedAdaptations = [];
        try {
            for (var _b = __values(this.periods), _c = _b.next(); !_c.done; _c = _b.next()) {
                var period = _c.value;
                period.refreshCodecSupport(supportList, unsupportedAdaptations);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        if (unsupportedAdaptations.length > 0) {
            return new errors_1.MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "An Adaptation contains only incompatible codecs.", { tracks: unsupportedAdaptations.map(utils_1.toTaggedTrack) });
        }
        return null;
    };
    /**
     * Returns the Period corresponding to the given `id`.
     * Returns `undefined` if there is none.
     * @param {string} id
     * @returns {Object|undefined}
     */
    Manifest.prototype.getPeriod = function (id) {
        return (0, array_find_1.default)(this.periods, function (period) {
            return id === period.id;
        });
    };
    /**
     * Returns the Period encountered at the given time.
     * Returns `undefined` if there is no Period exactly at the given time.
     * @param {number} time
     * @returns {Object|undefined}
     */
    Manifest.prototype.getPeriodForTime = function (time) {
        return (0, utils_1.getPeriodForTime)(this, time);
    };
    /**
     * Returns the first Period starting strictly after the given time.
     * Returns `undefined` if there is no Period starting after that time.
     * @param {number} time
     * @returns {Object|undefined}
     */
    Manifest.prototype.getNextPeriod = function (time) {
        return (0, array_find_1.default)(this.periods, function (period) {
            return period.start > time;
        });
    };
    /**
     * Returns the Period coming chronologically just after another given Period.
     * Returns `undefined` if not found.
     * @param {Object} period
     * @returns {Object|null}
     */
    Manifest.prototype.getPeriodAfter = function (period) {
        return (0, utils_1.getPeriodAfter)(this, period);
    };
    /**
     * Returns the most important URL from which the Manifest can be refreshed.
     * `undefined` if no URL is found.
     * @returns {Array.<string>}
     */
    Manifest.prototype.getUrls = function () {
        return this.uris;
    };
    /**
     * Update the current Manifest properties by giving a new updated version.
     * This instance will be updated with the new information coming from it.
     * @param {Object} newManifest
     */
    Manifest.prototype.replace = function (newManifest) {
        this._performUpdate(newManifest, types_1.MANIFEST_UPDATE_TYPE.Full);
    };
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
    Manifest.prototype.update = function (newManifest) {
        this._performUpdate(newManifest, types_1.MANIFEST_UPDATE_TYPE.Partial);
    };
    /**
     * Returns the theoretical minimum playable position on the content
     * regardless of the current Adaptation chosen, as estimated at parsing
     * time.
     * @returns {number}
     */
    Manifest.prototype.getMinimumSafePosition = function () {
        return (0, utils_1.getMinimumSafePosition)(this);
    };
    /**
     * Get the position of the live edge - that is, the position of what is
     * currently being broadcasted, in seconds.
     * @returns {number|undefined}
     */
    Manifest.prototype.getLivePosition = function () {
        return (0, utils_1.getLivePosition)(this);
    };
    /**
     * Returns the theoretical maximum playable position on the content
     * regardless of the current Adaptation chosen, as estimated at parsing
     * time.
     */
    Manifest.prototype.getMaximumSafePosition = function () {
        return (0, utils_1.getMaximumSafePosition)(this);
    };
    /**
     * Look in the Manifest for Representations linked to the given key ID,
     * and mark them as being impossible to decrypt.
     * Then trigger a "decipherabilityUpdate" event to notify everyone of the
     * changes performed.
     * @param {Function} isDecipherableCb
     */
    Manifest.prototype.updateRepresentationsDeciperability = function (isDecipherableCb) {
        var updates = updateDeciperability(this, isDecipherableCb);
        if (updates.length > 0) {
            this.trigger("decipherabilityUpdate", updates);
        }
    };
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    Manifest.prototype.getAdaptations = function () {
        (0, warn_once_1.default)("manifest.getAdaptations() is deprecated." +
            " Please use manifest.period[].getAdaptations() instead");
        var firstPeriod = this.periods[0];
        if (firstPeriod === undefined) {
            return [];
        }
        var adaptationsByType = firstPeriod.adaptations;
        var adaptationsList = [];
        for (var adaptationType in adaptationsByType) {
            if (adaptationsByType.hasOwnProperty(adaptationType)) {
                var adaptations = adaptationsByType[adaptationType];
                adaptationsList.push.apply(adaptationsList, __spreadArray([], __read(adaptations), false));
            }
        }
        return adaptationsList;
    };
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    Manifest.prototype.getAdaptationsForType = function (adaptationType) {
        (0, warn_once_1.default)("manifest.getAdaptationsForType(type) is deprecated." +
            " Please use manifest.period[].getAdaptationsForType(type) instead");
        var firstPeriod = this.periods[0];
        if (firstPeriod === undefined) {
            return [];
        }
        var adaptationsForType = firstPeriod.adaptations[adaptationType];
        return adaptationsForType === undefined ? [] : adaptationsForType;
    };
    /**
     * @deprecated only returns adaptations for the first period
     * @returns {Array.<Object>}
     */
    Manifest.prototype.getAdaptation = function (wantedId) {
        (0, warn_once_1.default)("manifest.getAdaptation(id) is deprecated." +
            " Please use manifest.period[].getAdaptation(id) instead");
        /* eslint-disable import/no-deprecated */
        return (0, array_find_1.default)(this.getAdaptations(), function (_a) {
            var id = _a.id;
            return wantedId === id;
        });
        /* eslint-enable import/no-deprecated */
    };
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
    Manifest.prototype.getMetadataSnapshot = function () {
        var e_2, _a;
        var periods = [];
        try {
            for (var _b = __values(this.periods), _c = _b.next(); !_c.done; _c = _b.next()) {
                var period = _c.value;
                periods.push(period.getMetadataSnapshot());
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return {
            manifestFormat: 1 /* ManifestMetadataFormat.MetadataObject */,
            id: this.id,
            periods: periods,
            isDynamic: this.isDynamic,
            isLive: this.isLive,
            isLastPeriodKnown: this.isLastPeriodKnown,
            suggestedPresentationDelay: this.suggestedPresentationDelay,
            clockOffset: this.clockOffset,
            uris: this.uris,
            availabilityStartTime: this.availabilityStartTime,
            timeBounds: this.timeBounds,
        };
    };
    /**
     * @param {Object} newManifest
     * @param {number} updateType
     */
    Manifest.prototype._performUpdate = function (newManifest, updateType) {
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
        var updatedPeriodsResult;
        if (updateType === types_1.MANIFEST_UPDATE_TYPE.Full) {
            this.timeBounds = newManifest.timeBounds;
            this.uris = newManifest.uris;
            updatedPeriodsResult = (0, update_periods_1.replacePeriods)(this.periods, newManifest.periods);
        }
        else {
            this.timeBounds.maximumTimeData = newManifest.timeBounds.maximumTimeData;
            this.updateUrl = newManifest.uris[0];
            updatedPeriodsResult = (0, update_periods_1.updatePeriods)(this.periods, newManifest.periods);
            // Partial updates do not remove old Periods.
            // This can become a memory problem when playing a content long enough.
            // Let's clean manually Periods behind the minimum possible position.
            var min = this.getMinimumSafePosition();
            while (this.periods.length > 0) {
                var period = this.periods[0];
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
    };
    return Manifest;
}(event_emitter_1.default));
exports.default = Manifest;
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
    var e_3, _a, e_4, _b, e_5, _c;
    var updates = [];
    try {
        for (var _d = __values(manifest.periods), _e = _d.next(); !_e.done; _e = _d.next()) {
            var period = _e.value;
            try {
                for (var _f = (e_4 = void 0, __values(period.getAdaptations())), _g = _f.next(); !_g.done; _g = _f.next()) {
                    var adaptation = _g.value;
                    try {
                        for (var _h = (e_5 = void 0, __values(adaptation.representations)), _j = _h.next(); !_j.done; _j = _h.next()) {
                            var representation = _j.value;
                            var content = { manifest: manifest, period: period, adaptation: adaptation, representation: representation };
                            var result = isDecipherable(content);
                            if (result !== representation.decipherable) {
                                updates.push(content);
                                representation.decipherable = result;
                                log_1.default.debug("Decipherability changed for \"".concat(representation.id, "\""), "(".concat(representation.bitrate, ")"), String(representation.decipherable));
                            }
                        }
                    }
                    catch (e_5_1) { e_5 = { error: e_5_1 }; }
                    finally {
                        try {
                            if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                        }
                        finally { if (e_5) throw e_5.error; }
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                }
                finally { if (e_4) throw e_4.error; }
            }
        }
    }
    catch (e_3_1) { e_3 = { error: e_3_1 }; }
    finally {
        try {
            if (_e && !_e.done && (_a = _d.return)) _a.call(_d);
        }
        finally { if (e_3) throw e_3.error; }
    }
    return updates;
}
