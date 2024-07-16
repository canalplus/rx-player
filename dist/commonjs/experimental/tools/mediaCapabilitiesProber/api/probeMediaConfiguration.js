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
Object.defineProperty(exports, "__esModule", { value: true });
var is_null_or_undefined_1 = require("../../../../utils/is_null_or_undefined");
var capabilities_1 = require("../capabilities");
var log_1 = require("../log");
var probers_1 = require("../probers");
var types_1 = require("../types");
/**
 * Probe media capabilities, evaluating capabilities with available browsers
 * API.
 *
 * Probe every given features with configuration.
 * If the browser API is not available OR we can't call browser API with enough
 * arguments, do nothing but warn the user (e.g. HDCP is not specified for
 * calling "getStatusForPolicy" API, "mediaCapabilites" API is not available.).
 *
 * From all API results, we return the worst state (e.g. if one API returns a
 * "Not Supported" status among other "Probably" statuses, we return
 * "Not Supported").
 *
 * @param {Object} config
 * @param {Array.<Object>} browserAPIS
 * @returns {Promise}
 */
function probeMediaConfiguration(config, browserAPIS) {
    var e_1, _a;
    var globalStatus;
    var resultsFromAPIS = [];
    var promises = [];
    var _loop_1 = function (browserAPI) {
        var probeWithBrowser = probers_1.default[browserAPI];
        if (probeWithBrowser !== undefined) {
            var prom = probeWithBrowser(config)
                .then(function (_a) {
                var _b = __read(_a, 2), currentStatus = _b[0], result = _b[1];
                resultsFromAPIS.push({ APIName: browserAPI, result: result });
                if ((0, is_null_or_undefined_1.default)(globalStatus)) {
                    globalStatus = currentStatus;
                }
                else {
                    switch (currentStatus) {
                        // Here, globalStatus can't be null. Hence, if the new current status is
                        // 'worse' than global status, then re-assign the latter.
                        case types_1.ProberStatus.NotSupported:
                            // `NotSupported` is either worse or equal.
                            globalStatus = types_1.ProberStatus.NotSupported;
                            break;
                        case types_1.ProberStatus.Unknown:
                            // `Unknown` is worse than 'Supported' only.
                            if (globalStatus === types_1.ProberStatus.Supported) {
                                globalStatus = types_1.ProberStatus.Unknown;
                            }
                            break;
                        default:
                            // new status is either `Supported` or unknown status. Global status
                            // shouldn't be changed.
                            break;
                    }
                }
            })
                .catch(function (error) {
                if (error instanceof Error) {
                    log_1.default.debug(error.message);
                }
            });
            promises.push(prom);
        }
    };
    try {
        for (var browserAPIS_1 = __values(browserAPIS), browserAPIS_1_1 = browserAPIS_1.next(); !browserAPIS_1_1.done; browserAPIS_1_1 = browserAPIS_1.next()) {
            var browserAPI = browserAPIS_1_1.value;
            _loop_1(browserAPI);
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (browserAPIS_1_1 && !browserAPIS_1_1.done && (_a = browserAPIS_1.return)) _a.call(browserAPIS_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return Promise.all(promises).then(function () {
        if (globalStatus === undefined) {
            globalStatus = types_1.ProberStatus.Unknown;
        }
        var probedCapabilities = (0, capabilities_1.default)(config, resultsFromAPIS.map(function (a) { return a.APIName; }));
        var areUnprobedCapabilities = JSON.stringify(probedCapabilities).length !== JSON.stringify(config).length;
        if (areUnprobedCapabilities && globalStatus === types_1.ProberStatus.Supported) {
            globalStatus = types_1.ProberStatus.Unknown;
        }
        if (areUnprobedCapabilities) {
            log_1.default.warn("MediaCapabilitiesProber >>> PROBER: Some capabilities " +
                "could not be probed, due to the incompatibility of browser APIs, or the " +
                "lack of arguments to call them. See debug logs for more details.");
        }
        if (log_1.default.hasLevel("INFO")) {
            log_1.default.info("MediaCapabilitiesProber >>> PROBER: Probed capabilities: ", JSON.stringify(probedCapabilities));
        }
        return { globalStatus: globalStatus, resultsFromAPIS: resultsFromAPIS };
    });
}
exports.default = probeMediaConfiguration;
