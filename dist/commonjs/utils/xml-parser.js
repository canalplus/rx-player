"use strict";
/**
 * This code is mainly a modified version of the tXml library.
 *
 * @author: Tobias Nickel
 * created: 06.04.2015
 * https://github.com/TobiasNickel/tXml
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
exports.toContentString = exports.parseXml = exports.getElementsByClassName = exports.getElementById = exports.filter = void 0;
var openBracket = "<";
var openBracketCC = "<".charCodeAt(0);
var closeBracket = ">";
var closeBracketCC = ">".charCodeAt(0);
var minusCC = "-".charCodeAt(0);
var slashCC = "/".charCodeAt(0);
var exclamationCC = "!".charCodeAt(0);
var singleQuoteCC = "'".charCodeAt(0);
var doubleQuoteCC = '"'.charCodeAt(0);
var openCornerBracketCC = "[".charCodeAt(0);
var closeCornerBracketCC = "]".charCodeAt(0);
/** Character marking end of attribute and node name. */
var nameSpacer = "\r\n\t>/= ";
/**
 * parseXML / html into a DOM Object. with no validation and some failur tolerance
 * @param {string} src - Your XML to parse
 * @param {Object} [options = {}] -  all other options:
 * @return {Array.<Object | string>}
 */
function parseXml(src, options) {
    var _a, _b;
    if (options === void 0) { options = {}; }
    var pos = (_a = options.pos) !== null && _a !== void 0 ? _a : 0;
    var keepComments = options.keepComments === true;
    var keepWhitespace = options.keepWhitespace === true;
    var out;
    if (options.attrValue !== undefined) {
        options.attrName = (_b = options.attrName) !== null && _b !== void 0 ? _b : "id";
        out = [];
        while ((pos = findElements()) !== -1) {
            pos = src.lastIndexOf("<", pos);
            if (pos !== -1) {
                out.push(parseNode());
            }
            // eslint-disable-next-line no-param-reassign
            src = src.substring(pos);
            pos = 0;
        }
    }
    else {
        out = parseChildren("");
    }
    if (options.filter) {
        out = filter(out, options.filter);
    }
    return out;
    /**
     * parsing a list of entries
     * @param {string} tagName
     * @returns {Array.<ITNode | string>}
     */
    function parseChildren(tagName) {
        var children = [];
        while (src[pos]) {
            if (src.charCodeAt(pos) === openBracketCC) {
                if (src.charCodeAt(pos + 1) === slashCC) {
                    var closeStart = pos + 2;
                    pos = src.indexOf(closeBracket, pos);
                    var closeTag = src.substring(closeStart, pos);
                    if (closeTag.indexOf(tagName) === -1) {
                        var parsedText = src.substring(0, pos).split("\n");
                        throw new Error("Unexpected close tag\nLine: " +
                            (parsedText.length - 1) +
                            "\nColumn: " +
                            (parsedText[parsedText.length - 1].length + 1) +
                            "\nChar: " +
                            src[pos]);
                    }
                    if (pos !== -1) {
                        pos += 1;
                    }
                    return children;
                }
                else if (src.charCodeAt(pos + 1) === exclamationCC) {
                    if (src.charCodeAt(pos + 2) === minusCC) {
                        // comment support
                        var startCommentPos = pos;
                        while (pos !== -1 &&
                            !(src.charCodeAt(pos) === closeBracketCC &&
                                src.charCodeAt(pos - 1) === minusCC &&
                                src.charCodeAt(pos - 2) === minusCC)) {
                            pos = src.indexOf(closeBracket, pos + 1);
                        }
                        if (pos === -1) {
                            pos = src.length;
                        }
                        if (keepComments) {
                            children.push(src.substring(startCommentPos, pos + 1));
                        }
                    }
                    else if (src.charCodeAt(pos + 2) === openCornerBracketCC &&
                        src.charCodeAt(pos + 8) === openCornerBracketCC &&
                        src.substring(pos + 3, pos + 8).toLowerCase() === "cdata") {
                        // cdata
                        var cdataEndIndex = src.indexOf("]]>", pos);
                        if (cdataEndIndex === -1) {
                            children.push(src.substring(pos + 9));
                            pos = src.length;
                        }
                        else {
                            children.push(src.substring(pos + 9, cdataEndIndex));
                            pos = cdataEndIndex + 3;
                        }
                        continue;
                    }
                    else {
                        // doctypesupport
                        var startDoctype = pos + 1;
                        pos += 2;
                        var encapsuled = false;
                        while ((src.charCodeAt(pos) !== closeBracketCC || encapsuled) && src[pos]) {
                            if (src.charCodeAt(pos) === openCornerBracketCC) {
                                encapsuled = true;
                            }
                            else if (encapsuled && src.charCodeAt(pos) === closeCornerBracketCC) {
                                encapsuled = false;
                            }
                            pos++;
                        }
                        children.push(src.substring(startDoctype, pos));
                    }
                    pos++;
                    continue;
                }
                var node = parseNode();
                children.push(node);
                if (node.tagName[0] === "?") {
                    children.push.apply(children, __spreadArray([], __read(node.children), false));
                    node.children = [];
                }
            }
            else {
                var text = parseText();
                if (keepWhitespace) {
                    if (text.length > 0) {
                        children.push(text);
                    }
                }
                else {
                    var trimmed = text.trim();
                    if (trimmed.length > 0) {
                        children.push(trimmed);
                    }
                }
                pos++;
            }
        }
        return children;
    }
    /**
     *    returns the text outside of texts until the first '<'
     */
    function parseText() {
        var start = pos;
        pos = src.indexOf(openBracket, pos) - 1;
        if (pos === -2) {
            pos = src.length;
        }
        return src.slice(start, pos + 1);
    }
    function parseName() {
        var start = pos;
        while (nameSpacer.indexOf(src[pos]) === -1 && src[pos]) {
            pos++;
        }
        return src.slice(start, pos);
    }
    function parseNode() {
        var posStart = pos;
        pos++;
        var tagName = parseName();
        var attributes = {};
        var children = [];
        // parsing attributes
        while (src.charCodeAt(pos) !== closeBracketCC && src[pos]) {
            var c = src.charCodeAt(pos);
            if ((c > 64 && c < 91) || (c > 96 && c < 123)) {
                // if('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.indexOf(src[pos])!==-1 ){
                var name_1 = parseName();
                // search beginning of the string
                var code = src.charCodeAt(pos);
                while (code &&
                    code !== singleQuoteCC &&
                    code !== doubleQuoteCC &&
                    !((code > 64 && code < 91) || (code > 96 && code < 123)) &&
                    code !== closeBracketCC) {
                    pos++;
                    code = src.charCodeAt(pos);
                }
                var value = void 0;
                if (code === singleQuoteCC || code === doubleQuoteCC) {
                    value = parseString();
                }
                else {
                    value = null;
                    pos--;
                }
                attributes[name_1] = value === null ? null : translateEntities(value);
            }
            pos++;
        }
        // optional parsing of children
        if (src.charCodeAt(pos - 1) !== slashCC) {
            pos++;
            children = parseChildren(tagName);
        }
        else {
            pos++;
        }
        return {
            tagName: tagName,
            attributes: attributes,
            children: children,
            posStart: posStart,
            posEnd: pos,
        };
    }
    /**
     * Parses a string, that starts with a char and with the same usually ' or "
     * character starting at `pos`.
     * @returns {string}
     */
    function parseString() {
        var startChar = src[pos];
        var startpos = pos + 1;
        pos = src.indexOf(startChar, startpos);
        return src.slice(startpos, pos);
    }
    /**
     *
     */
    function findElements() {
        var r = new RegExp("\\s" + options.attrName + "\\s*=['\"]" + options.attrValue + "['\"]").exec(src);
        if (r) {
            return r.index;
        }
        else {
            return -1;
        }
    }
}
exports.parseXml = parseXml;
/**
 * behaves the same way as Array.filter, if the filter method return true, the element is in the resultList
 * @params {Array} children - the children of a node
 * @param {function} f - the filter method
 */
function filter(children, f, dept, path) {
    if (dept === void 0) { dept = 0; }
    if (path === void 0) { path = ""; }
    var out = [];
    children.forEach(function (child, i) {
        if (typeof child === "object") {
            if (f(child, i, dept, path)) {
                out.push(child);
            }
            if (child.children.length > 0) {
                var kids = filter(child.children, f, dept + 1, (path ? path + "." : "") + i + "." + child.tagName);
                out = out.concat(kids);
            }
        }
    });
    return out;
}
exports.filter = filter;
/**
 * use this method to read the text content, of some node.
 * It is great if you have mixed content like:
 * this text has some <b>big</b> text and a <a href=''>link</a>
 * @return {string}
 */
function toContentString(tDom) {
    if (Array.isArray(tDom)) {
        var out_1 = "";
        tDom.forEach(function (e) {
            out_1 += " " + toContentString(e);
            out_1 = out_1.trim();
        });
        return out_1;
    }
    else if (typeof tDom === "object") {
        return toContentString(tDom.children);
    }
    else {
        return " " + translateEntities(tDom);
    }
}
exports.toContentString = toContentString;
/**
 * @param {string} str
 * @returns {string}
 */
function translateEntities(str) {
    if (str.indexOf("&") < 0) {
        // Fast path for when there's no entity
        return str;
    }
    return str
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#x([A-Fa-f0-9]+);/g, function (_, code) {
        return String.fromCharCode(parseInt(code, 16));
    })
        .replace(/&amp;/g, "&");
}
function getElementById(src, id) {
    var out = parseXml(src, {
        attrValue: id,
    });
    return out[0];
}
exports.getElementById = getElementById;
function getElementsByClassName(src, classname) {
    var out = parseXml(src, {
        attrName: "class",
        attrValue: "[a-zA-Z0-9- ]*" + classname + "[a-zA-Z0-9- ]*",
    });
    return out;
}
exports.getElementsByClassName = getElementsByClassName;
