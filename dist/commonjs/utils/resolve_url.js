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
exports.getFilenameIndexInUrl = exports.resolveURL = void 0;
var starts_with_1 = require("./starts_with");
// Scheme part of an url (e.g. "http://").
var schemeRe = /^(?:[a-z]+:)?\/\//i;
/**
 * Match the different components of an URL.
 *
 *     foo://example.com:8042/over/there?name=ferret#nose
       \_/   \______________/\_________/ \_________/ \__/
        |           |            |            |        |
      scheme     authority       path        query   fragment
 * 1st match is the scheme: (e.g. "foo://")
 * 2nd match is the authority (e.g "example.com:8042")
 * 3rd match is the path (e.g "/over/there")
 * 4th match is the query params (e.g "name=ferret")
 * 5th match is the fragment (e.g "nose")
 * */
var urlComponentRegex = /^(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/;
/**
 * In a given URL, find the index at which the filename begins.
 * That is, this function finds the index of the last `/` character and returns
 * the index after it, returning the length of the whole URL if no `/` was found
 * after the scheme (i.e. in `http://`, the slashes are not considered).
 * @param {string} url
 * @returns {number}
 */
function getFilenameIndexInUrl(url) {
    var indexOfLastSlash = url.lastIndexOf("/");
    if (indexOfLastSlash < 0) {
        return url.length;
    }
    if (schemeRe.test(url)) {
        var firstSlashIndex = url.indexOf("/");
        if (firstSlashIndex >= 0 && indexOfLastSlash === firstSlashIndex + 1) {
            // The "/" detected is actually the one from the protocol part of the URL
            // ("https://")
            return url.length;
        }
    }
    var indexOfQuestionMark = url.indexOf("?");
    if (indexOfQuestionMark >= 0 && indexOfQuestionMark < indexOfLastSlash) {
        // There are query parameters. Let's ignore them and re-run the logic
        // without
        return getFilenameIndexInUrl(url.substring(0, indexOfQuestionMark));
    }
    return indexOfLastSlash + 1;
}
exports.getFilenameIndexInUrl = getFilenameIndexInUrl;
/**
 * Resolve the output URL from the baseURL and the relative reference as
 * specified by RFC 3986 section 5.
 * @param base
 * @param relative
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5
 * @example base: http://example.com | relative: /b/c | output: http://example.com/b/c
 * @returns the resolved url
 */
function _resolveURL(base, relative) {
    var baseParts = parseURL(base);
    var relativeParts = parseURL(relative);
    if (relativeParts.scheme) {
        return formatURL(relativeParts);
    }
    var target = {
        scheme: baseParts.scheme,
        authority: baseParts.authority,
        path: "",
        query: relativeParts.query,
        fragment: relativeParts.fragment,
    };
    if (relativeParts.authority) {
        target.authority = relativeParts.authority;
        target.path = removeDotSegment(relativeParts.path);
        return formatURL(target);
    }
    if (relativeParts.path === "") {
        target.path = baseParts.path;
        if (!relativeParts.query) {
            target.query = baseParts.query;
        }
    }
    else {
        if ((0, starts_with_1.default)(relativeParts.path, "/")) {
            // path is absolute
            target.path = removeDotSegment(relativeParts.path);
        }
        else {
            // path is relative
            target.path = removeDotSegment(mergePaths(baseParts, relativeParts.path));
        }
    }
    return formatURL(target);
}
/**
 * Cache to store already parsed URLs to avoid unnecessary computation when parsing the same URL again.
 */
var parsedUrlCache = new Map();
/**
 * Sets the maximum number of entries allowed in the parsedUrlCache map.
 * This limit helps prevent excessive memory usage. The value is arbitrary.
 */
var MAX_URL_CACHE_ENTRIES = 200;
/**
 * Parses a URL into its components.
 * @param {string} url - The URL to parse.
 * @returns {IParsedURL} The parsed URL components.
 */
function parseURL(url) {
    var _a, _b, _c, _d, _e;
    if (parsedUrlCache.has(url)) {
        return parsedUrlCache.get(url);
    }
    var matches = url.match(urlComponentRegex);
    var parsed;
    if (matches === null) {
        parsed = {
            scheme: "",
            authority: "",
            path: "",
            query: "",
            fragment: "",
        };
    }
    else {
        parsed = {
            scheme: (_a = matches[1]) !== null && _a !== void 0 ? _a : "",
            authority: (_b = matches[2]) !== null && _b !== void 0 ? _b : "",
            path: (_c = matches[3]) !== null && _c !== void 0 ? _c : "",
            query: (_d = matches[4]) !== null && _d !== void 0 ? _d : "",
            fragment: (_e = matches[5]) !== null && _e !== void 0 ? _e : "",
        };
    }
    if (parsedUrlCache.size >= MAX_URL_CACHE_ENTRIES) {
        parsedUrlCache.clear();
    }
    parsedUrlCache.set(url, parsed);
    return parsed;
}
/**
 * Formats a parsed URL into a string.
 * @param {IParsedURL} parts - The parsed URL components.
 * @returns {string} The formatted URL string.
 */
function formatURL(parts) {
    var url = "";
    if (parts.scheme) {
        url += parts.scheme + ":";
    }
    if (parts.authority) {
        url += "//" + parts.authority;
    }
    url += parts.path;
    if (parts.query) {
        url += "?" + parts.query;
    }
    if (parts.fragment) {
        url += "#" + parts.fragment;
    }
    return url;
}
/**
 * Removes "." and ".." from the URL path, as described by the algorithm
 * in RFC 3986 Section 5.2.4. Remove Dot Segments
 * @param {string} path - The URL path
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.4
 * @returns The path with dot segments removed.
 * @example "/baz/booz/../biz" => "/baz/biz"
 */
function removeDotSegment(path) {
    var segments = path.split(/(?=\/)/);
    var output = [];
    for (var i = 0; i < segments.length; i++) {
        var segment = segments[i];
        if (segment === ".." || segment === "." || segment === "") {
            continue;
        }
        if (segment === "/..") {
            output.pop();
            // if it's last segment push a trailing "/"
            if (i === segments.length - 1) {
                output.push("/");
            }
            continue;
        }
        if (segment === "/.") {
            // if it's last segment push a trailing "/"
            if (i === segments.length - 1) {
                output.push("/");
            }
            continue;
        }
        output.push(segment);
    }
    return output.join("");
}
/**
 * Merges a base URL path with a relative URL path, as described by
 * the algorithm merge paths in RFC 3986 Section 5.2.3. Merge Paths
 * @param {IParsedURL} baseParts - The parsed base URL components.
 * @param {string} relativePath - The relative URL path.
 * @returns {string} The merged URL path.
 * @see https://datatracker.ietf.org/doc/html/rfc3986#section-5.2.3
 */
function mergePaths(baseParts, relativePath) {
    if (baseParts.authority && baseParts.path === "") {
        return "/" + relativePath;
    }
    var basePath = baseParts.path;
    return basePath.substring(0, basePath.lastIndexOf("/") + 1) + relativePath;
}
/**
 * Resolves multiple URL segments using the RFC 3986 URL resolution algorithm.
 *
 * This function takes a variable number of URL segments and resolves them
 * sequentially according to the RFC 3986 URL resolution algorithm.
 * First argument is the base URL.
 * Empty string arguments are ignored.
 *
 * @param {...(string|undefined)} args - The URL segments to resolve.
 * @returns {string} The resolved URL as a string.
 */
function resolveURL() {
    var _a, _b, _c;
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var filteredArgs = args.filter(function (val) { return val !== ""; });
    var len = filteredArgs.length;
    if (len === 0) {
        return "";
    }
    if (len === 1) {
        return (_a = filteredArgs[0]) !== null && _a !== void 0 ? _a : "";
    }
    else {
        var basePart = (_b = filteredArgs[0]) !== null && _b !== void 0 ? _b : "";
        var relativeParts = (_c = filteredArgs[1]) !== null && _c !== void 0 ? _c : "";
        var resolvedURL = _resolveURL(basePart, relativeParts);
        var remainingArgs = filteredArgs.slice(2);
        return resolveURL.apply(void 0, __spreadArray([resolvedURL], __read(remainingArgs), false));
    }
}
exports.resolveURL = resolveURL;
exports.default = resolveURL;
