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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSHTMLElement = exports.parseSElementNode = void 0;
var log_1 = require("../../../../../../log");
var is_null_or_undefined_1 = require("../../../../../../utils/is_null_or_undefined");
/**
 * Parse a given <S> element in the MPD under a parsed Node form into a JS
 * Object.
 * @param {Object} root
 * @returns {Object}
 */
function parseSElementNode(root) {
    var e_1, _a;
    var parsedS = {};
    try {
        for (var _b = __values(Object.keys(root.attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var attributeName = _c.value;
            var attributeVal = root.attributes[attributeName];
            if ((0, is_null_or_undefined_1.default)(attributeVal)) {
                continue;
            }
            switch (attributeName) {
                case "t":
                    var start = parseInt(attributeVal, 10);
                    if (isNaN(start)) {
                        log_1.default.warn("DASH: invalid t (\"".concat(attributeVal, "\")"));
                    }
                    else {
                        parsedS.start = start;
                    }
                    break;
                case "d":
                    var duration = parseInt(attributeVal, 10);
                    if (isNaN(duration)) {
                        log_1.default.warn("DASH: invalid d (\"".concat(attributeVal, "\")"));
                    }
                    else {
                        parsedS.duration = duration;
                    }
                    break;
                case "r":
                    var repeatCount = parseInt(attributeVal, 10);
                    if (isNaN(repeatCount)) {
                        log_1.default.warn("DASH: invalid r (\"".concat(attributeVal, "\")"));
                    }
                    else {
                        parsedS.repeatCount = repeatCount;
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
    return parsedS;
}
exports.parseSElementNode = parseSElementNode;
/**
 * Parse a given <S> element in the MPD under an `Element` form into a JS
 * Object.
 * @param {Element} root
 * @returns {Object}
 */
function parseSHTMLElement(root) {
    var parsedS = {};
    for (var j = 0; j < root.attributes.length; j++) {
        var attribute = root.attributes[j];
        switch (attribute.name) {
            case "t":
                var start = parseInt(attribute.value, 10);
                if (isNaN(start)) {
                    log_1.default.warn("DASH: invalid t (\"".concat(attribute.value, "\")"));
                }
                else {
                    parsedS.start = start;
                }
                break;
            case "d":
                var duration = parseInt(attribute.value, 10);
                if (isNaN(duration)) {
                    log_1.default.warn("DASH: invalid d (\"".concat(attribute.value, "\")"));
                }
                else {
                    parsedS.duration = duration;
                }
                break;
            case "r":
                var repeatCount = parseInt(attribute.value, 10);
                if (isNaN(repeatCount)) {
                    log_1.default.warn("DASH: invalid r (\"".concat(attribute.value, "\")"));
                }
                else {
                    parsedS.repeatCount = repeatCount;
                }
                break;
        }
    }
    return parsedS;
}
exports.parseSHTMLElement = parseSHTMLElement;
