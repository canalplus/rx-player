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
var assert_1 = require("../../../../utils/assert");
var xml_parser_1 = require("../../../../utils/xml-parser");
var common_1 = require("../common");
var MPD_1 = require("./node_parsers/MPD");
var Period_1 = require("./node_parsers/Period");
/**
 * Parse MPD through the Fast JS parser.
 * @param {string} xml - MPD under a string format
 * @param {Object} args - Various parsing options and information.
 * @returns {Object} - Response returned by the DASH-JS parser.
 */
function parseFromString(xml, args) {
    var root = (0, xml_parser_1.parseXml)(xml);
    var lastChild = root[root.length - 1];
    if (lastChild === undefined ||
        typeof lastChild === "string" ||
        lastChild.tagName !== "MPD") {
        throw new Error("DASH Parser: document root should be MPD");
    }
    var _a = __read((0, MPD_1.createMPDIntermediateRepresentation)(lastChild, xml), 2), mpdIR = _a[0], warnings = _a[1];
    var ret = (0, common_1.default)(mpdIR, args, warnings);
    return processReturn(ret);
    /**
     * Handle `parseMpdIr` return values, asking for resources if they are needed
     * and pre-processing them before continuing parsing.
     *
     * @param {Object} initialRes
     * @returns {Object}
     */
    function processReturn(initialRes) {
        if (initialRes.type === "done") {
            return initialRes;
        }
        else if (initialRes.type === "needs-clock") {
            return {
                type: "needs-resources",
                value: {
                    urls: [initialRes.value.url],
                    format: "string",
                    continue: function (loadedClock) {
                        if (loadedClock.length !== 1) {
                            throw new Error("DASH parser: wrong number of loaded ressources.");
                        }
                        var newRet = initialRes.value.continue(loadedClock[0].responseData);
                        return processReturn(newRet);
                    },
                },
            };
        }
        else if (initialRes.type === "needs-xlinks") {
            return {
                type: "needs-resources",
                value: {
                    urls: initialRes.value.xlinksUrls,
                    format: "string",
                    continue: function (loadedXlinks) {
                        var resourceInfos = [];
                        for (var i = 0; i < loadedXlinks.length; i++) {
                            var _a = loadedXlinks[i], xlinkResp = _a.responseData, receivedTime = _a.receivedTime, sendingTime = _a.sendingTime, url = _a.url;
                            if (!xlinkResp.success) {
                                throw xlinkResp.error;
                            }
                            var wrappedData = "<root>" + xlinkResp.data + "</root>";
                            var dataAsXML = (0, xml_parser_1.parseXml)(wrappedData);
                            var innerParsed = dataAsXML[dataAsXML.length - 1];
                            if (innerParsed === undefined || typeof innerParsed === "string") {
                                throw new Error("DASH parser: Invalid external ressources");
                            }
                            var periods = innerParsed.children;
                            var periodsIR = [];
                            var periodsIRWarnings = [];
                            for (var j = 0; j < periods.length; j++) {
                                var period = periods[j];
                                if (typeof period === "string" || period.tagName !== "Period") {
                                    continue;
                                }
                                var _b = __read((0, Period_1.createPeriodIntermediateRepresentation)(period, wrappedData), 2), periodIR = _b[0], periodWarnings = _b[1];
                                periodsIRWarnings.push.apply(periodsIRWarnings, __spreadArray([], __read(periodWarnings), false));
                                periodsIR.push(periodIR);
                            }
                            resourceInfos.push({
                                url: url,
                                receivedTime: receivedTime,
                                sendingTime: sendingTime,
                                parsed: periodsIR,
                                warnings: periodsIRWarnings,
                            });
                        }
                        var newRet = initialRes.value.continue(resourceInfos);
                        return processReturn(newRet);
                    },
                },
            };
        }
        else {
            (0, assert_1.assertUnreachable)(initialRes);
        }
    }
}
exports.default = parseFromString;
