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
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("../../config");
var errors_1 = require("../../errors");
var features_1 = require("../../features");
var log_1 = require("../../log");
var classes_1 = require("../../manifest/classes");
var object_assign_1 = require("../../utils/object_assign");
var request_1 = require("../../utils/request");
var string_parsing_1 = require("../../utils/string_parsing");
function generateManifestParser(options) {
    var referenceDateTime = options.referenceDateTime;
    var serverTimeOffset = options.serverSyncInfos !== undefined
        ? options.serverSyncInfos.serverTimestamp - options.serverSyncInfos.clientTime
        : undefined;
    return function manifestParser(manifestData, parserOptions, onWarnings, cancelSignal, scheduleRequest) {
        var _a;
        var responseData = manifestData.responseData;
        var argClockOffset = parserOptions.externalClockOffset;
        var url = (_a = manifestData.url) !== null && _a !== void 0 ? _a : parserOptions.originalUrl;
        var externalClockOffset = serverTimeOffset !== null && serverTimeOffset !== void 0 ? serverTimeOffset : argClockOffset;
        var unsafelyBaseOnPreviousManifest = parserOptions.unsafeMode
            ? parserOptions.previousManifest
            : null;
        var dashParserOpts = {
            unsafelyBaseOnPreviousManifest: unsafelyBaseOnPreviousManifest,
            url: url,
            referenceDateTime: referenceDateTime,
            externalClockOffset: externalClockOffset,
        };
        var parsers = features_1.default.dashParsers;
        if (parsers.wasm === null ||
            parsers.wasm.status === "uninitialized" ||
            parsers.wasm.status === "failure") {
            log_1.default.debug("DASH: WASM MPD Parser not initialized. Running JS one.");
            return runDefaultJsParser();
        }
        else {
            var manifestAB_1 = getManifestAsArrayBuffer(responseData);
            if (!doesXmlSeemsUtf8Encoded(manifestAB_1)) {
                log_1.default.info("DASH: MPD doesn't seem to be UTF-8-encoded. " +
                    "Running JS parser instead of the WASM one.");
                return runDefaultJsParser();
            }
            if (parsers.wasm.status === "initialized") {
                log_1.default.debug("DASH: Running WASM MPD Parser.");
                var parsed = parsers.wasm.runWasmParser(manifestAB_1, dashParserOpts);
                return processMpdParserResponse(parsed);
            }
            else {
                log_1.default.debug("DASH: Awaiting WASM initialization before parsing the MPD.");
                var initProm = parsers.wasm.waitForInitialization().catch(function () {
                    /* ignore errors, we will check the status later */
                });
                return initProm.then(function () {
                    if (parsers.wasm === null || parsers.wasm.status !== "initialized") {
                        log_1.default.warn("DASH: WASM MPD parser initialization failed. " +
                            "Running JS parser instead");
                        return runDefaultJsParser();
                    }
                    log_1.default.debug("DASH: Running WASM MPD Parser.");
                    var parsed = parsers.wasm.runWasmParser(manifestAB_1, dashParserOpts);
                    return processMpdParserResponse(parsed);
                });
            }
        }
        /**
         * Parse the MPD through the default JS-written parser (as opposed to the
         * WebAssembly one).
         * If it is not defined, throws.
         * @returns {Object|Promise.<Object>}
         */
        function runDefaultJsParser() {
            if (parsers.fastJs !== null) {
                var manifestStr = getManifestAsString(responseData);
                var parsedManifest = parsers.fastJs(manifestStr, dashParserOpts);
                return processMpdParserResponse(parsedManifest);
            }
            else if (parsers.native !== null) {
                var manifestDocument = getManifestAsDocument(responseData);
                var parsedManifest = parsers.native(manifestDocument, dashParserOpts);
                return processMpdParserResponse(parsedManifest);
            }
            else {
                throw new Error("No MPD parser is imported");
            }
        }
        /**
         * Process return of one of the MPD parser.
         * If it asks for a resource, load it then continue.
         * @param {Object} parserResponse - Response returned from a MPD parser.
         * @returns {Object|Promise.<Object>}
         */
        function processMpdParserResponse(parserResponse) {
            if (parserResponse.type === "done") {
                if (parserResponse.value.warnings.length > 0) {
                    onWarnings(parserResponse.value.warnings);
                }
                if (cancelSignal.isCancelled()) {
                    return Promise.reject(cancelSignal.cancellationError);
                }
                var warnings = [];
                var manifest = new classes_1.default(parserResponse.value.parsed, options, warnings);
                return { manifest: manifest, url: url, warnings: warnings };
            }
            var value = parserResponse.value;
            var externalResources = value.urls.map(function (resourceUrl) {
                return scheduleRequest(function () {
                    var defaultTimeout = config_1.default.getCurrent().DEFAULT_REQUEST_TIMEOUT;
                    var defaultConnectionTimeout = config_1.default.getCurrent().DEFAULT_CONNECTION_TIMEOUT;
                    return value.format === "string"
                        ? (0, request_1.default)({
                            url: resourceUrl,
                            responseType: "text",
                            timeout: defaultTimeout,
                            connectionTimeout: defaultConnectionTimeout,
                            cancelSignal: cancelSignal,
                        })
                        : (0, request_1.default)({
                            url: resourceUrl,
                            responseType: "arraybuffer",
                            timeout: defaultTimeout,
                            connectionTimeout: defaultConnectionTimeout,
                            cancelSignal: cancelSignal,
                        });
                }).then(function (res) {
                    if (value.format === "string") {
                        if (typeof res.responseData !== "string") {
                            throw new Error("External DASH resources should have been a string");
                        }
                        return (0, object_assign_1.default)(res, {
                            responseData: {
                                success: true,
                                data: res.responseData,
                            },
                        });
                    }
                    else {
                        if (!(res.responseData instanceof ArrayBuffer)) {
                            throw new Error("External DASH resources should have been ArrayBuffers");
                        }
                        return (0, object_assign_1.default)(res, {
                            responseData: {
                                success: true,
                                data: res.responseData,
                            },
                        });
                    }
                }, function (err) {
                    var error = (0, errors_1.formatError)(err, {
                        defaultCode: "PIPELINE_PARSE_ERROR",
                        defaultReason: "An unknown error occured when parsing ressources.",
                    });
                    return (0, object_assign_1.default)({}, {
                        size: undefined,
                        requestDuration: undefined,
                        responseData: {
                            success: false,
                            error: error,
                        },
                    });
                });
            });
            return Promise.all(externalResources).then(function (loadedResources) {
                if (value.format === "string") {
                    assertLoadedResourcesFormatString(loadedResources);
                    return processMpdParserResponse(value.continue(loadedResources));
                }
                else {
                    assertLoadedResourcesFormatArrayBuffer(loadedResources);
                    return processMpdParserResponse(value.continue(loadedResources));
                }
            });
        }
    };
}
exports.default = generateManifestParser;
/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 *
 * @param loadedResource
 * @returns
 */
function assertLoadedResourcesFormatString(loadedResources) {
    if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 0 /* __ENVIRONMENT__.PRODUCTION */) {
        return;
    }
    loadedResources.forEach(function (loadedResource) {
        var responseData = loadedResource.responseData;
        if (responseData.success && typeof responseData.data === "string") {
            return;
        }
        else if (!responseData.success) {
            return;
        }
        throw new Error("Invalid data given to the LoadedRessource");
    });
}
/**
 * Throw if the given input is not in the expected format.
 * Allows to enforce runtime type-checking as compile-time type-checking here is
 * difficult to enforce.
 *
 * @param loadedResource
 * @returns
 */
function assertLoadedResourcesFormatArrayBuffer(loadedResources) {
    if (0 /* __ENVIRONMENT__.CURRENT_ENV */ === 0 /* __ENVIRONMENT__.PRODUCTION */) {
        return;
    }
    loadedResources.forEach(function (loadedResource) {
        var responseData = loadedResource.responseData;
        if (responseData.success && responseData.data instanceof ArrayBuffer) {
            return;
        }
        else if (!responseData.success) {
            return;
        }
        throw new Error("Invalid data given to the LoadedRessource");
    });
}
/**
 * Try to convert a Manifest from an unknown format to an array of nodes as
 * parsed by our XML DOM parser.
 *
 * Throws if the format cannot be converted.
 * @param {*} manifestSrc
 * @returns {Array.<Object | string>}
 */
function getManifestAsString(manifestSrc) {
    if (manifestSrc instanceof ArrayBuffer) {
        return (0, string_parsing_1.utf8ToStr)(new Uint8Array(manifestSrc));
    }
    else if (typeof manifestSrc === "string") {
        return manifestSrc;
    }
    else if (manifestSrc instanceof Document) {
        return manifestSrc.documentElement.outerHTML;
    }
    else {
        throw new Error("DASH Manifest Parser: Unrecognized Manifest format");
    }
}
/**
 * Try to convert a Manifest from an unknown format to a `Document` format.
 * Useful to exploit DOM-parsing APIs to quickly parse an XML Manifest.
 *
 * Throws if the format cannot be converted.
 * @param {*} manifestSrc
 * @returns {Document}
 */
function getManifestAsDocument(manifestSrc) {
    if (manifestSrc instanceof ArrayBuffer) {
        return new DOMParser().parseFromString((0, string_parsing_1.utf8ToStr)(new Uint8Array(manifestSrc)), "text/xml");
    }
    else if (typeof manifestSrc === "string") {
        return new DOMParser().parseFromString(manifestSrc, "text/xml");
    }
    else if (manifestSrc instanceof Document) {
        return manifestSrc;
    }
    else {
        throw new Error("DASH Manifest Parser: Unrecognized Manifest format");
    }
}
/**
 * Try to convert a Manifest from an unknown format to an `ArrayBuffer` format.
 * Throws if the format cannot be converted.
 * @param {*} manifestSrc
 * @returns {ArrayBuffer}
 */
function getManifestAsArrayBuffer(manifestSrc) {
    if (manifestSrc instanceof ArrayBuffer) {
        return manifestSrc;
    }
    else if (typeof manifestSrc === "string") {
        return (0, string_parsing_1.strToUtf8)(manifestSrc).buffer;
    }
    else if (manifestSrc instanceof Document) {
        return (0, string_parsing_1.strToUtf8)(manifestSrc.documentElement.innerHTML).buffer;
    }
    else {
        throw new Error("DASH Manifest Parser: Unrecognized Manifest format");
    }
}
/**
 * Returns true if the given XML appears to be encoded in UTF-8.
 *
 * For now, this function can return a lot of false positives, but it should
 * mostly work with real use cases.
 * @param {ArrayBuffer} xmlData
 * @returns {boolean}
 */
function doesXmlSeemsUtf8Encoded(xmlData) {
    var dv = new DataView(xmlData);
    if (dv.getUint16(0) === 0xefbb && dv.getUint8(2) === 0xbf) {
        // (UTF-8 BOM)
        return true;
    }
    else if (dv.getUint16(0) === 0xfeff || dv.getUint16(0) === 0xfffe) {
        // (UTF-16 BOM)
        return false;
    }
    // TODO check encoding from request mimeType and text declaration?
    // https://www.w3.org/TR/xml/#sec-TextDecl
    return true;
}
