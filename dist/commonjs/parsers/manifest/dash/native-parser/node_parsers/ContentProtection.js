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
Object.defineProperty(exports, "__esModule", { value: true });
var log_1 = require("../../../../../log");
var string_parsing_1 = require("../../../../../utils/string_parsing");
var utils_1 = require("./utils");
/**
 * @param {NodeList} contentProtectionChildren
 * @Returns {Object}
 */
function parseContentProtectionChildren(contentProtectionChildren) {
    var warnings = [];
    var cencPssh = [];
    for (var i = 0; i < contentProtectionChildren.length; i++) {
        if (contentProtectionChildren[i].nodeType === Node.ELEMENT_NODE) {
            var currentElement = contentProtectionChildren[i];
            if (currentElement.nodeName === "cenc:pssh") {
                var content = currentElement.textContent;
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
    }
    return [{ cencPssh: cencPssh }, warnings];
}
/**
 * @param {Element} root
 * @returns {Object}
 */
function parseContentProtectionAttributes(root) {
    var ret = {};
    for (var i = 0; i < root.attributes.length; i++) {
        var attribute = root.attributes[i];
        switch (attribute.name) {
            case "schemeIdUri":
                ret.schemeIdUri = attribute.value;
                break;
            case "value":
                ret.value = attribute.value;
                break;
            case "cenc:default_KID":
                ret.keyId = (0, string_parsing_1.hexToBytes)(attribute.value.replace(/-/g, ""));
        }
    }
    return ret;
}
/**
 * @param {Element} contentProtectionElement
 * @returns {Object}
 */
function parseContentProtection(contentProtectionElement) {
    var _a = __read(parseContentProtectionChildren(contentProtectionElement.childNodes), 2), children = _a[0], childrenWarnings = _a[1];
    var attributes = parseContentProtectionAttributes(contentProtectionElement);
    return [{ children: children, attributes: attributes }, childrenWarnings];
}
exports.default = parseContentProtection;
