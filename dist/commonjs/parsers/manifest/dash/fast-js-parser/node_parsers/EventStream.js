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
exports.createEventStreamIntermediateRepresentation = void 0;
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var starts_with_1 = require("../../../../../utils/starts_with");
var utils_1 = require("./utils");
/**
 * @param {Object} root
 * @returns {Array}
 */
function parseEventStreamAttributes(root) {
    var e_1, _a;
    var res = {};
    var warnings = [];
    var parseValue = (0, utils_1.ValueParser)(res, warnings);
    try {
        for (var _b = __values(Object.keys(root.attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var attributeName = _c.value;
            var attributeVal = root.attributes[attributeName];
            if ((0, is_null_or_undefined_1.default)(attributeVal)) {
                continue;
            }
            switch (attributeName) {
                case "schemeIdUri":
                    res.schemeIdUri = attributeVal;
                    break;
                case "value":
                    res.value = attributeVal;
                    break;
                case "timescale":
                    parseValue(attributeVal, {
                        asKey: "timescale",
                        parser: utils_1.parseMPDInteger,
                        dashName: "timescale",
                    });
                    break;
                default:
                    if ((0, starts_with_1.default)(attributeName, "xmlns:")) {
                        if (res.namespaces === undefined) {
                            res.namespaces = [];
                        }
                        res.namespaces.push({
                            key: attributeName.substring(6),
                            value: attributeVal,
                        });
                    }
                    break;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return [res, warnings];
}
/**
 * @param {Object} root
 * @param {string} fullMpd
 * @returns {Array}
 */
function createEventStreamIntermediateRepresentation(root, fullMpd) {
    var e_2, _a;
    var _b = __read(parseEventStreamAttributes(root), 2), attributes = _b[0], warnings = _b[1];
    var events = [];
    try {
        for (var _c = __values(root.children), _d = _c.next(); !_d.done; _d = _c.next()) {
            var child = _d.value;
            if (typeof child !== "string" && child.tagName === "Event") {
                var data = {};
                if (!(0, is_null_or_undefined_1.default)(child.attributes.id)) {
                    data.id = child.attributes.id;
                }
                if (!(0, is_null_or_undefined_1.default)(child.attributes.presentationTime)) {
                    var _e = __read((0, utils_1.parseMPDInteger)(child.attributes.presentationTime, "presentationTime"), 2), val = _e[0], parsedWarning = _e[1];
                    if (parsedWarning !== null) {
                        warnings.push(parsedWarning);
                    }
                    if (val !== null) {
                        data.presentationTime = val;
                    }
                }
                if (!(0, is_null_or_undefined_1.default)(child.attributes.duration)) {
                    var _f = __read((0, utils_1.parseMPDInteger)(child.attributes.duration, "duration"), 2), val = _f[0], parsedWarning = _f[1];
                    if (parsedWarning !== null) {
                        warnings.push(parsedWarning);
                    }
                    if (val !== null) {
                        data.duration = val;
                    }
                }
                if (child.posStart < child.posEnd) {
                    var eventStr = fullMpd.substring(child.posStart, child.posEnd);
                    data.eventStreamData = eventStr;
                }
                events.push(data);
            }
        }
    }
    catch (e_2_1) { e_2 = { error: e_2_1 }; }
    finally {
        try {
            if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
        }
        finally { if (e_2) throw e_2.error; }
    }
    return [{ children: { events: events }, attributes: attributes }, warnings];
}
exports.createEventStreamIntermediateRepresentation = createEventStreamIntermediateRepresentation;
