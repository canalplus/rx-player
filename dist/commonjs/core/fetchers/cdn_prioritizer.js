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
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("../../config");
var array_find_index_1 = require("../../utils/array_find_index");
var event_emitter_1 = require("../../utils/event_emitter");
/**
 * Class storing and signaling the priority between multiple CDN available for
 * any given resource.
 *
 * This class was first created to implement the complexities behind
 * Content Steering features, though its handling hasn't been added yet as we
 * wait for its specification to be both standardized and relied on in the wild.
 * In the meantime, it acts as an abstraction for the simple concept of
 * avoiding to request a CDN for any segment when an issue is encountered with
 * one (e.g. HTTP 500 statuses) and several CDN exist for a given resource. It
 * should be noted that this is also one of the planified features of the
 * Content Steering specification.
 *
 * @class CdnPrioritizer
 */
var CdnPrioritizer = /** @class */ (function (_super) {
    __extends(CdnPrioritizer, _super);
    /**
     * @param {Object} destroySignal
     */
    function CdnPrioritizer(destroySignal) {
        var _this = _super.call(this) || this;
        _this._downgradedCdnList = { metadata: [], timeouts: [] };
        destroySignal.register(function () {
            var e_1, _a;
            try {
                for (var _b = __values(_this._downgradedCdnList.timeouts), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var timeout = _c.value;
                    clearTimeout(timeout);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            _this._downgradedCdnList = { metadata: [], timeouts: [] };
        });
        return _this;
    }
    /**
     * From the list of __ALL__ CDNs available to a resource, return them in the
     * order in which requests should be performed.
     *
     * Note: It is VERY important to include all CDN that are able to reach the
     * wanted resource, even those which will in the end not be used anyway.
     * If some CDN are not communicated, the `CdnPrioritizer` might wrongly
     * consider that the current resource don't have any of the CDN prioritized
     * internally and return other CDN which should have been forbidden if it knew
     * about the other, non-used, ones.
     *
     * @param {Array.<string>} everyCdnForResource - Array of ALL available CDN
     * able to reach the wanted resource - even those which might not be used in
     * the end.
     * @returns {Array.<Object>} - Array of CDN that can be tried to reach the
     * resource, sorted by order of CDN preference, according to the
     * `CdnPrioritizer`'s own list of priorities.
     */
    CdnPrioritizer.prototype.getCdnPreferenceForResource = function (everyCdnForResource) {
        if (everyCdnForResource.length <= 1) {
            // The huge majority of contents have only one CDN available.
            // Here, prioritizing make no sense.
            return everyCdnForResource;
        }
        return this._innerGetCdnPreferenceForResource(everyCdnForResource);
    };
    /**
     * Limit usage of the CDN for a configured amount of time.
     * Call this method if you encountered an issue with that CDN which leads you
     * to want to prevent its usage currently.
     *
     * Note that the CDN can still be the preferred one if no other CDN exist for
     * a wanted resource.
     * @param {string} metadata
     */
    CdnPrioritizer.prototype.downgradeCdn = function (metadata) {
        var _this = this;
        var indexOf = indexOfMetadata(this._downgradedCdnList.metadata, metadata);
        if (indexOf >= 0) {
            this._removeIndexFromDowngradeList(indexOf);
        }
        var DEFAULT_CDN_DOWNGRADE_TIME = config_1.default.getCurrent().DEFAULT_CDN_DOWNGRADE_TIME;
        var downgradeTime = DEFAULT_CDN_DOWNGRADE_TIME;
        this._downgradedCdnList.metadata.push(metadata);
        var timeout = setTimeout(function () {
            var newIndex = indexOfMetadata(_this._downgradedCdnList.metadata, metadata);
            if (newIndex >= 0) {
                _this._removeIndexFromDowngradeList(newIndex);
            }
            _this.trigger("priorityChange", null);
        }, downgradeTime);
        this._downgradedCdnList.timeouts.push(timeout);
        this.trigger("priorityChange", null);
    };
    /**
     * From the list of __ALL__ CDNs available to a resource, return them in the
     * order in which requests should be performed.
     *
     * Note: It is VERY important to include all CDN that are able to reach the
     * wanted resource, even those which will in the end not be used anyway.
     * If some CDN are not communicated, the `CdnPrioritizer` might wrongly
     * consider that the current resource don't have any of the CDN prioritized
     * internally and return other CDN which should have been forbidden if it knew
     * about the other, non-used, ones.
     *
     * @param {Array.<string>} everyCdnForResource - Array of ALL available CDN
     * able to reach the wanted resource - even those which might not be used in
     * the end.
     * @returns {Array.<string>} - Array of CDN that can be tried to reach the
     * resource, sorted by order of CDN preference, according to the
     * `CdnPrioritizer`'s own list of priorities.
     */
    CdnPrioritizer.prototype._innerGetCdnPreferenceForResource = function (everyCdnForResource) {
        var _this = this;
        var _a = __read(everyCdnForResource.reduce(function (acc, elt) {
            if (_this._downgradedCdnList.metadata.some(function (c) { return c.id === elt.id && c.baseUrl === elt.baseUrl; })) {
                acc[1].push(elt);
            }
            else {
                acc[0].push(elt);
            }
            return acc;
        }, [[], []]), 2), allowedInOrder = _a[0], downgradedInOrder = _a[1];
        return allowedInOrder.concat(downgradedInOrder);
    };
    /**
     * @param {number} index
     */
    CdnPrioritizer.prototype._removeIndexFromDowngradeList = function (index) {
        this._downgradedCdnList.metadata.splice(index, 1);
        var oldTimeout = this._downgradedCdnList.timeouts.splice(index, 1);
        clearTimeout(oldTimeout[0]);
    };
    return CdnPrioritizer;
}(event_emitter_1.default));
exports.default = CdnPrioritizer;
/**
 * Find the index of the given CDN metadata in a CDN metadata array.
 * Returns `-1` if not found.
 * @param {Array.<Object>} arr
 * @param {Object} elt
 * @returns {number}
 */
function indexOfMetadata(arr, elt) {
    if (arr.length === 0) {
        return -1;
    }
    return elt.id !== undefined
        ? (0, array_find_index_1.default)(arr, function (m) { return m.id === elt.id; })
        : (0, array_find_index_1.default)(arr, function (m) { return m.baseUrl === elt.baseUrl; });
}
