"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Add to an URL a query string corresponding to `supplementaryQueryStringData`,
 * being tuples where the first element is a query string's property name and the
 * second element is its value (or null if there's no associated value.
 *
 * If the given URL already has a query string, the new query string elements
 * will just be appended.
 * @param {string} baseUrl
 * @param {Array.<Array.<string|null>>} supplementaryQueryStringData
 * @returns {string}
 */
function addQueryString(baseUrl, supplementaryQueryStringData) {
    if (supplementaryQueryStringData.length === 0) {
        return baseUrl;
    }
    var queryStringStartingChar;
    var urlFragment = "";
    var indexOfFragment = baseUrl.indexOf("#");
    var baseUrlWithoutFragment = baseUrl;
    if (indexOfFragment >= 0) {
        urlFragment = baseUrl.substring(indexOfFragment);
        baseUrlWithoutFragment = baseUrl.substring(0, indexOfFragment);
    }
    var indexOfQueryString = baseUrlWithoutFragment.indexOf("?");
    if (indexOfQueryString === -1) {
        queryStringStartingChar = "?";
    }
    else if (indexOfQueryString + 1 === baseUrlWithoutFragment.length) {
        queryStringStartingChar = "";
    }
    else {
        queryStringStartingChar = "&";
    }
    var url = baseUrlWithoutFragment + queryStringStartingChar;
    for (var i = 0; i < supplementaryQueryStringData.length; i++) {
        var queryStringElt = supplementaryQueryStringData[i];
        if (queryStringElt[1] === null) {
            url += queryStringElt[0];
        }
        else {
            url += "".concat(queryStringElt[0], "=").concat(queryStringElt[1]);
        }
        if (i < supplementaryQueryStringData.length - 1) {
            url += "&";
        }
    }
    if (urlFragment.length > 0) {
        url += urlFragment;
    }
    return url;
}
exports.default = addQueryString;
