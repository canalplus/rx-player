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
var log_1 = require("../../../../../log");
var is_null_or_undefined_1 = require("../../../../../utils/is_null_or_undefined");
var string_parsing_1 = require("../../../../../utils/string_parsing");
var utils_1 = require("./utils");
/**
 * @param {Array.<Object | string>} contentProtectionChildren
 * @Returns {Object}
 */
function parseContentProtectionChildren(contentProtectionChildren) {
    var warnings = [];
    var cencPssh = [];
    for (var i = 0; i < contentProtectionChildren.length; i++) {
        var currentElement = contentProtectionChildren[i];
        if (typeof currentElement !== "string" && currentElement.tagName === "cenc:pssh") {
            var content = (0, utils_1.textContent)(currentElement.children);
            if (content !== null && content.length > 0) {
                var _a = __read((0, utils_1.parseBase64)(content, "cenc:pssh"), 2), toUint8Array = _a[0], error = _a[1];
                if (error !== null) {
                    log_1.default.warn(error.message);
                    warnings.push(error);
                }
                if (toUint8Array !== null) {
                    cencPssh.push(toUint8Array);
                }
            }
        }
    }
    return [{ cencPssh: cencPssh }, warnings];
}
/**
 * @param {Object} root
 * @returns {Object}
 */
function parseContentProtectionAttributes(root) {
    var e_1, _a;
    var ret = {};
    try {
        for (var _b = __values(Object.keys(root.attributes)), _c = _b.next(); !_c.done; _c = _b.next()) {
            var attributeName = _c.value;
            var attributeVal = root.attributes[attributeName];
            if ((0, is_null_or_undefined_1.default)(attributeVal)) {
                continue;
            }
            switch (attributeName) {
                case "schemeIdUri":
                    ret.schemeIdUri = attributeVal;
                    break;
                case "value":
                    ret.value = attributeVal;
                    break;
                case "cenc:default_KID":
                    ret.keyId = (0, string_parsing_1.hexToBytes)(attributeVal.replace(/-/g, ""));
                    break;
                case "ref":
                    ret.ref = attributeVal;
                    break;
                case "refId":
                    ret.refId = attributeVal;
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
    return ret;
}
/**
 * @param {Object} contentProtectionElement
 * @returns {Object}
 */
function parseContentProtection(contentProtectionElement) {
    var _a = __read(parseContentProtectionChildren(contentProtectionElement.children), 2), children = _a[0], childrenWarnings = _a[1];
    var attributes = parseContentProtectionAttributes(contentProtectionElement);
    return [{ children: children, attributes: attributes }, childrenWarnings];
}
exports.default = parseContentProtection;
