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
var make_vtt_cue_1 = require("../../../compat/make_vtt_cue");
var is_non_empty_string_1 = require("../../../utils/is_non_empty_string");
var is_null_or_undefined_1 = require("../../../utils/is_null_or_undefined");
var HTML_ENTITIES = /&#([0-9]+);/g;
var BR = /<br>/gi;
var STYLE = /<style[^>]*>([\s\S]*?)<\/style[^>]*>/i;
var PARAG = /\s*<p (?:class=([^>]+))?>(.*)/i;
var START = /<sync[^>]+?start="?([0-9]*)"?[^0-9]/i;
/**
 * Creates an array of VTTCue/TextTrackCue from a given array of cue objects.
 * @param {Array.<Object>} cuesArray - Objects containing the start, end and
 * text.
 * @returns {Array.<VTTCue>}
 */
function createCuesFromArray(cuesArray) {
    var nativeCues = [];
    for (var i = 0; i < cuesArray.length; i++) {
        var _a = cuesArray[i], start = _a.start, end = _a.end, text = _a.text;
        if ((0, is_non_empty_string_1.default)(text) && !(0, is_null_or_undefined_1.default)(end)) {
            var cue = (0, make_vtt_cue_1.default)(start, end, text);
            if (cue !== null) {
                nativeCues.push(cue);
            }
        }
    }
    return nativeCues;
}
/**
 * Returns classnames for every languages.
 * @param {string} str
 * @returns {Object}
 */
function getClassNameByLang(str) {
    var ruleRe = /\.(\S+)\s*{([^}]*)}/gi;
    var langs = {};
    var m = ruleRe.exec(str);
    while (Array.isArray(m)) {
        var name_1 = m[1];
        var lang = getCSSProperty(m[2], "lang");
        if (!(0, is_null_or_undefined_1.default)(name_1) && !(0, is_null_or_undefined_1.default)(lang)) {
            langs[lang] = name_1;
        }
        m = ruleRe.exec(str);
    }
    return langs;
}
/**
 * @param {string} str - entire CSS rule
 * @param {string} name - name of the property
 * @returns {string|null} - value of the property. Null if not found.
 */
function getCSSProperty(str, name) {
    var matches = new RegExp("\\s*" + name + ":\\s*(\\S+);", "i").exec(str);
    return Array.isArray(matches) ? matches[1] : null;
}
/**
 * Decode HMTL formatting into a string.
 * @param {string} text
 * @returns {string}
 */
function decodeEntities(text) {
    return text
        .replace(BR, "\n")
        .replace(HTML_ENTITIES, function (_, $1) { return String.fromCharCode(Number($1)); });
}
/**
 * Because sami is not really html... we have to use
 * some kind of regular expressions to parse it...
 * the cthulhu way :)
 * The specification being quite clunky, this parser
 * may not work for every sami input.
 *
 * @param {string} smi
 * @param {Number} timeOffset
 * @param {string} lang
 * @returns {Array.<VTTCue|TextTrackCue>}
 */
function parseSami(smi, timeOffset, lang) {
    var syncOpen = /<sync[ >]/gi;
    var syncClose = /<sync[ >]|<\/body>/gi;
    var subs = [];
    var styleMatches = STYLE.exec(smi);
    var css = styleMatches !== null ? styleMatches[1] : "";
    var up;
    var to;
    // FIXME Is that wanted?
    // previously written as let to = SyncClose.exec(smi); but never used
    syncClose.exec(smi);
    var langs = getClassNameByLang(css);
    var klass;
    if ((0, is_non_empty_string_1.default)(lang)) {
        klass = langs[lang];
        if (klass === undefined) {
            throw new Error("sami: could not find lang ".concat(lang, " in CSS"));
        }
    }
    while (true) {
        up = syncOpen.exec(smi);
        to = syncClose.exec(smi);
        if (up === null && to === null) {
            break;
        }
        if (up === null || to === null || up.index >= to.index) {
            throw new Error("parse error");
        }
        var str = smi.slice(up.index, to.index);
        var tim = START.exec(str);
        if (tim === null) {
            throw new Error("parse error (sync time attribute)");
        }
        var start = +tim[1];
        if (isNaN(start)) {
            throw new Error("parse error (sync time attribute NaN)");
        }
        appendToSubs(str.split("\n"), start / 1000);
    }
    return createCuesFromArray(subs);
    function appendToSubs(lines, start) {
        var i = lines.length;
        var m;
        while (--i >= 0) {
            m = PARAG.exec(lines[i]);
            if (m === null) {
                continue;
            }
            var _a = __read(m, 3), kl = _a[1], txt = _a[2];
            if (klass !== kl) {
                continue;
            }
            if (txt === "&nbsp;") {
                subs[subs.length - 1].end = start;
            }
            else {
                subs.push({ text: decodeEntities(txt), start: start + timeOffset });
            }
        }
    }
}
exports.default = parseSami;
