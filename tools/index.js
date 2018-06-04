!function webpackUniversalModuleDefinition(root, factory) {
    "object" == typeof exports && "object" == typeof module ? module.exports = factory() : "function" == typeof define && define.amd ? define([], factory) : "object" == typeof exports ? exports.RxPlayer = factory() : root.RxPlayer = factory();
}(window, function() {
    /******/
    return function(modules) {
        // webpackBootstrap
        /******/ // The module cache
        /******/ var installedModules = {};
        /******/
        /******/ // The require function
        /******/        function __webpack_require__(moduleId) {
            /******/
            /******/ // Check if module is in cache
            /******/ if (installedModules[moduleId]) 
            /******/ return installedModules[moduleId].exports;
            /******/
            /******/ // Create a new module (and put it into the cache)
            /******/            var module = installedModules[moduleId] = {
                /******/ i: moduleId,
                /******/ l: !1,
                /******/ exports: {}
                /******/            };
            /******/
            /******/ // Execute the module function
            /******/            
            /******/
            /******/ // Return the exports of the module
            /******/ return modules[moduleId].call(module.exports, module, module.exports, __webpack_require__), 
            /******/
            /******/ // Flag the module as loaded
            /******/ module.l = !0, module.exports;
            /******/        }
        /******/
        /******/
        /******/ // expose the modules object (__webpack_modules__)
        /******/        
        /******/
        /******/
        /******/ // Load entry module and return exports
        /******/ return __webpack_require__.m = modules, 
        /******/
        /******/ // expose the module cache
        /******/ __webpack_require__.c = installedModules, 
        /******/
        /******/ // define getter function for harmony exports
        /******/ __webpack_require__.d = function(exports, name, getter) {
            /******/ __webpack_require__.o(exports, name) || 
            /******/ Object.defineProperty(exports, name, {
                enumerable: !0,
                get: getter
            })
            /******/;
        }, 
        /******/
        /******/ // define __esModule on exports
        /******/ __webpack_require__.r = function(exports) {
            /******/ "undefined" != typeof Symbol && Symbol.toStringTag && 
            /******/ Object.defineProperty(exports, Symbol.toStringTag, {
                value: "Module"
            })
            /******/ , Object.defineProperty(exports, "__esModule", {
                value: !0
            });
        }, 
        /******/
        /******/ // create a fake namespace object
        /******/ // mode & 1: value is a module id, require it
        /******/ // mode & 2: merge all properties of value into the ns
        /******/ // mode & 4: return value when already ns object
        /******/ // mode & 8|1: behave like require
        /******/ __webpack_require__.t = function(value, mode) {
            /******/ if (
            /******/ 1 & mode && (value = __webpack_require__(value)), 8 & mode) return value;
            /******/            if (4 & mode && "object" == typeof value && value && value.__esModule) return value;
            /******/            var ns = Object.create(null);
            /******/            
            /******/ if (__webpack_require__.r(ns), 
            /******/ Object.defineProperty(ns, "default", {
                enumerable: !0,
                value: value
            }), 2 & mode && "string" != typeof value) for (var key in value) __webpack_require__.d(ns, key, function(key) {
                return value[key];
            }.bind(null, key));
            /******/            return ns;
            /******/        }, 
        /******/
        /******/ // getDefaultExport function for compatibility with non-harmony modules
        /******/ __webpack_require__.n = function(module) {
            /******/ var getter = module && module.__esModule ? 
            /******/ function getDefault() {
                return module.default;
            } : 
            /******/ function getModuleExports() {
                return module;
            };
            /******/            
            /******/ return __webpack_require__.d(getter, "a", getter), getter;
            /******/        }, 
        /******/
        /******/ // Object.prototype.hasOwnProperty.call
        /******/ __webpack_require__.o = function(object, property) {
            return Object.prototype.hasOwnProperty.call(object, property);
        }, 
        /******/
        /******/ // __webpack_public_path__
        /******/ __webpack_require__.p = "", __webpack_require__(__webpack_require__.s = 92);
        /******/    }
    /************************************************************************/
    /******/ ({
        /***/ 0: 
        /***/ function(module, __webpack_exports__, __webpack_require__) {
            "use strict";
            /* harmony import */            var _noop__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(16), LEVELS = {
                NONE: 0,
                ERROR: 1,
                WARNING: 2,
                INFO: 3,
                DEBUG: 4
            }, currentLevel = Object.keys(LEVELS)[0], logger = {
                LEVELS: Object.keys(LEVELS),
                error: _noop__WEBPACK_IMPORTED_MODULE_0__.a,
                warn: _noop__WEBPACK_IMPORTED_MODULE_0__.a,
                info: _noop__WEBPACK_IMPORTED_MODULE_0__.a,
                debug: _noop__WEBPACK_IMPORTED_MODULE_0__.a,
                setLevel: function setLevel(levelStr) {
                    var level = void 0, foundLevel = LEVELS[levelStr];
                    foundLevel ? (level = foundLevel, currentLevel = levelStr) : (
                    // either 0 or not found
                    level = 0, currentLevel = "NONE")
                    /* tslint:disable no-invalid-this */ , this.error = level >= LEVELS.ERROR ? console.error.bind(console) : _noop__WEBPACK_IMPORTED_MODULE_0__.a, 
                    this.warn = level >= LEVELS.WARNING ? console.warn.bind(console) : _noop__WEBPACK_IMPORTED_MODULE_0__.a, 
                    this.info = level >= LEVELS.INFO ? console.info.bind(console) : _noop__WEBPACK_IMPORTED_MODULE_0__.a, 
                    this.debug = level >= LEVELS.DEBUG ? console.log.bind(console) : _noop__WEBPACK_IMPORTED_MODULE_0__.a;
                },
                getLevel: function getLevel() {
                    return currentLevel;
                }
            };
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
            /* harmony default export */ __webpack_exports__.a = logger;
        },
        /***/ 16: 
        /***/ function(module, __webpack_exports__, __webpack_require__) {
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
            /**
 * Do nothing, well.
 */
            /* tslint:disable:no-empty */
            /* harmony default export */            __webpack_exports__.a = function() {};
        },
        /***/ 92: 
        /***/ function(module, __webpack_exports__, __webpack_require__) {
            "use strict";
            function is_requestMKSA_APIAvailable() {
                return "requestMediaKeySystemAccess" in navigator ? Promise.resolve() : Promise.reject("API_AVAILABILITY: requestMediaKeySystemAccess API not available");
            }
            __webpack_require__.r(__webpack_exports__);
            // CONCATENATED MODULE: ./src/tools/mediaCapabilitiesProber/probers/_decodingInfos_/index.ts
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
            var _isTypeSupportedWithFeatures_format = function formatConfigForAPI(video, outputProtection, audio, display) {
                var str = null, defaultVideoCodec = function findDefaultVideoCodec() {
                    if (!window.MediaSource || !window.MediaSource.isTypeSupported) throw new Error();
                    var _iterator = [ 'video/mp4; codecs="avc1.4D401E"', 'video/webm; codecs="vp09.00.10.08"' ], _isArray = Array.isArray(_iterator), _i = 0;
                    for (_iterator = _isArray ? _iterator : _iterator[Symbol.iterator](); ;) {
                        var _ref;
                        if (_isArray) {
                            if (_i >= _iterator.length) break;
                            _ref = _iterator[_i++];
                        } else {
                            if ((_i = _iterator.next()).done) break;
                            _ref = _i.value;
                        }
                        var codec = _ref;
                        if (window.MediaSource.isTypeSupported(codec)) return codec;
                    }
                    throw new Error();
                }(), contentType = video && video.contentType || defaultVideoCodec;
                if (str = str || "" + contentType, audio && audio.contentType) {
                    var match = audio.contentType.match(/codecs="(.*?)"/);
                    if (match) {
                        var codec = match[1];
                        str = str.substring(0, str.length - 2) + "," + codec;
                    }
                }
                var feat = [];
                if (video && video.width && feat.push("decode-res-x=" + video.width), video && video.height && feat.push("decode-res-y=" + video.height), 
                video && video.bitsPerComponent && feat.push("decode-bpc=" + video.bitsPerComponent), 
                video && video.bitrate && feat.push("decode-bitrate=" + video.bitrate), video && video.framerate && feat.push("decode-fps=" + video.framerate), 
                display && (display.width && feat.push("display-res-x=" + display.width), display.height && feat.push("display-res-y=" + display.height), 
                display.bitsPerComponent && feat.push("display-bpc=" + display.bitsPerComponent)), 
                outputProtection && outputProtection.hdcp) {
                    var hdcp = parseFloat(outputProtection.hdcp) >= 2.2 ? 2 : 1;
                    feat.push("hdcp=" + hdcp);
                }
                return feat.length > 0 && (str += ";features=", str += '"' + feat.join(",") + '"'), 
                str;
            }, _matchMedia_format = function formatConfigForAPI(display) {
                var gamut = display.colorSpace;
                return gamut ? "(color-gamut: " + gamut + ")" : null;
            }, DEFAULT_WIDEVINE_ROBUSTNESSES = [ "HW_SECURE_ALL", "HW_SECURE_DECODE", "HW_SECURE_CRYPTO", "SW_SECURE_DECODE", "SW_SECURE_CRYPTO" ];
            /* harmony default export */            
            // CONCATENATED MODULE: ./src/tools/mediaCapabilitiesProber/probers/_requestMediaKeySystemAccess_/index.ts
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
            var mediaCapabilitiesProber_probers = {
                _isTypeSupported_: function probe(config) {
                    return function is_isTypeSupported_Available() {
                        return "MediaSource" in window ? "isTypeSupported" in window.MediaSource ? Promise.resolve() : Promise.reject("API_AVAILABILITY: Decoding Info not available") : Promise.reject("API_AVAILABILITY: MediaSource API not available");
                    }().then(function() {
                        var contentTypes = [];
                        if (config.video && config.video.contentType && contentTypes.push(config.video.contentType), 
                        config.audio && config.audio.contentType && contentTypes.push(config.audio.contentType), 
                        null === contentTypes || !contentTypes.length) throw new Error("API_CALL: Not enough arguments for calling isTypeSupported.");
                        return contentTypes.reduce(function(acc, val) {
                            var support = window.MediaSource.isTypeSupported(val) ? 2 : 0;
                            return Math.min(acc, support);
                        }, 2);
                    });
                },
                _isTypeSupportedWithFeatures_: function probe(config) {
                    return function is_isTypeSupportedWithFeatures_APIAvailable() {
                        return "MSMediaKeys" in window ? "isTypeSupportedWithFeatures" in window.MSMediaKeys ? Promise.resolve() : Promise.reject("API_AVAILABILITY: Decoding Info not available") : Promise.reject("API_AVAILABILITY: MSMediaKeys API not available");
                    }().then(function() {
                        var mediaProtection = config.mediaProtection, keySystem = mediaProtection && mediaProtection.drm && mediaProtection.drm.type || "org.w3.clearkey", output = mediaProtection ? mediaProtection.output : void 0, video = config.video, audio = config.audio, display = config.display, features = _isTypeSupportedWithFeatures_format(video, output, audio, display);
                        return function formatSupport(support) {
                            if ("" === support) return 1;
                            switch (support) {
                              case "Maybe":
                                return 1;

                              case "Probably":
                                return 2;

                              case "Not Supported":
                                return 0;

                              default:
                                return 1;
                            }
                        }(window.MSMediaKeys.isTypeSupportedWithFeatures(keySystem, features));
                    });
                },
                _matchMedia_: function probe(config) {
                    return function is_matchMedia_APIAvailable() {
                        return "matchMedia" in window ? Promise.resolve() : Promise.reject("API_AVAILABILITY: matchMedia API not available");
                    }().then(function() {
                        if (config.display) {
                            var formatted = _matchMedia_format(config.display);
                            if (formatted) {
                                var match = window.matchMedia(formatted);
                                return match.matches && "not all" !== match.media ? 2 : 0;
                            }
                        }
                        throw new Error("API_CALL: Not enough arguments for calling matchMedia.");
                    });
                },
                _decodingInfos_: function probe(config) {
                    // CONCATENATED MODULE: ./src/tools/mediaCapabilitiesProber/probers/compatibility.ts
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
                    /**
 * Check if API are availables in current system/browsers.
 */
                    return function is_mediaCapabilities_APIAvailable() {
                        return "mediaCapabilities" in navigator ? "decodingInfo" in navigator.mediaCapabilities ? Promise.resolve() : Promise.reject("API_AVAILABILITY: Decoding Info not available") : Promise.reject("API_AVAILABILITY: MediaCapabilities API not available");
                    }().then(function() {
                        if (config.type && config.video && config.video.bitrate && config.video.contentType && config.video.framerate && config.video.height && config.video.width && config.audio && config.audio.bitrate && config.audio.channels && config.audio.contentType && config.audio.samplerate) return navigator.mediaCapabilities.decodingInfo(config).then(function(result) {
                            return result.supported ? 2 : 0;
                        }).catch(function() {
                            throw new Error("API_CALL: Bad arguments for calling mediaCapabilities.");
                        });
                        throw new Error("API_CALL: Not enough arguments for calling mediaCapabilites.");
                    });
                },
                _requestMediaKeySystemAccess_: function probe(config) {
                    return is_requestMKSA_APIAvailable().then(function() {
                        var mediaProtection = config.mediaProtection;
                        if (mediaProtection) {
                            var drm = mediaProtection.drm;
                            if (drm && drm.type) {
                                var configuration = function buildKeySystemConfigurations(ksName, keySystem) {
                                    var sessionTypes = [ "temporary" ], persistentState = "optional", distinctiveIdentifier = "optional";
                                    keySystem.persistentLicense && (persistentState = "required", sessionTypes.push("persistent-license")), 
                                    keySystem.persistentStateRequired && (persistentState = "required"), keySystem.distinctiveIdentifierRequired && (distinctiveIdentifier = "required");
                                    // Set robustness, in order of consideration:
                                    //   1. the user specified its own robustnesses
                                    //   2. a "widevine" key system is used, in that case set the default widevine
                                    //      robustnesses as defined in the config
                                    //   3. set an undefined robustness
                                    var videoRobustnesses = keySystem.videoRobustnesses || ("widevine" === ksName ? DEFAULT_WIDEVINE_ROBUSTNESSES : []), audioRobustnesses = keySystem.audioRobustnesses || ("widevine" === ksName ? DEFAULT_WIDEVINE_ROBUSTNESSES : []);
                                    return videoRobustnesses.length || videoRobustnesses.push(void 0), audioRobustnesses.length || audioRobustnesses.push(void 0), 
                                    [ {
                                        initDataTypes: [ "cenc" ],
                                        videoCapabilities: videoRobustnesses.map(function(robustness) {
                                            return {
                                                contentType: 'video/mp4;codecs="avc1.4d401e"',
                                                robustness: robustness
                                            };
                                        }),
                                        audioCapabilities: audioRobustnesses.map(function(robustness) {
                                            return {
                                                contentType: 'audio/mp4;codecs="mp4a.40.2"',
                                                robustness: robustness
                                            };
                                        }),
                                        distinctiveIdentifier: distinctiveIdentifier,
                                        persistentState: persistentState,
                                        sessionTypes: sessionTypes
                                    } ];
                                }(drm.type, drm.configuration || {});
                                return navigator.requestMediaKeySystemAccess(name, configuration).then(function() {
                                    return 2;
                                }).catch(function() {
                                    return 0;
                                });
                            }
                        }
                        throw new Error("API_CALL: Not enough arguments for calling requestMediaKeySystemAccess.");
                    });
                },
                _getStatusForPolicy_: function probe(config) {
                    return function is_getStatusForPolicy_APIAvailable() {
                        return is_requestMKSA_APIAvailable().then(function() {
                            return "MediaKeys" in window ? "getStatusForPolicy" in window.MediaKeys ? Promise.resolve() : Promise.reject("API_AVAILABILITY: getStatusForPolicy API not available") : Promise.reject("API_AVAILABILITY: MediaKeys API not available");
                        });
                    }().then(function() {
                        if (config.mediaProtection && config.mediaProtection.output) {
                            var object = {
                                minHdcpVersion: "hdcp-" + config.mediaProtection.output.hdcp
                            };
                            return window.requestMediaKeySystemAccess("w3.org.clearkey", {
                                initDataTypes: [ "cenc" ],
                                videoCapabilities: [],
                                audioCapabilities: [],
                                distinctiveIdentifier: "optional",
                                persistentState: "optional",
                                sessionTypes: [ "temporary" ]
                            }).then(function(mediaKeys) {
                                mediaKeys.getStatusForPolicy(object).then(function(result) {
                                    return "usable" === result ? 2 : 0;
                                });
                            });
                        }
                        throw new Error("API_CALL: Not enough arguments for calling getStatusForPolicy.");
                    });
                }
            }, log = __webpack_require__(0);
            /* harmony default export */            
            // CONCATENATED MODULE: ./src/tools/mediaCapabilitiesProber/utils/isEmpty.ts
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
            /**
 * Tells if object is empty.
 * @param {Object} obj
 */
            function isEmpty(obj) {
                return 0 === Object.keys(obj).length && obj.constructor === Object;
            }
            // CONCATENATED MODULE: ./src/tools/mediaCapabilitiesProber/utils/filterEmptyFields.ts
                        var _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(obj) {
                return typeof obj;
            } : function(obj) {
                return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
            }, utils_filterEmptyFields = function filterEmptyFields(object) {
                var filtered = {}, _iterator = Object.entries(object), _isArray = Array.isArray(_iterator), _i = 0;
                for (_iterator = _isArray ? _iterator : _iterator[Symbol.iterator](); ;) {
                    var _ref;
                    if (_isArray) {
                        if (_i >= _iterator.length) break;
                        _ref = _iterator[_i++];
                    } else {
                        if ((_i = _iterator.next()).done) break;
                        _ref = _i.value;
                    }
                    var entry = _ref, key = entry[0], value = entry[1];
                    if ("object" !== (void 0 === value ? "undefined" : _typeof(value)) && null != value) filtered[key] = value; else if ("object" === (void 0 === value ? "undefined" : _typeof(value))) {
                        var filteredValue = filterEmptyFields(value);
                        filteredValue && !isEmpty(filteredValue) && (filtered[key] = filteredValue);
                    }
                }
                return filtered;
            };
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
            /**
 * Assert that configuration is valid before probing:
 * 1 - Filter empty fields.
 * 2 - Check for emptyness.
 * 3 - Check for unsupported configuration attributes.
 * @param {Object} config
 */
            var _ref, probeMediaConfiguration_validateConfiguration = function validateConfiguration(config) {
                if (!config) throw new Error("MCP_CONF: Configuration is not defined.");
                var filteredConfig = utils_filterEmptyFields(config);
                if (isEmpty(filteredConfig)) throw new Error("MCP_CONF: Can't probe empty configuration.");
                return filteredConfig;
            }, browserAPIS = [ "_isTypeSupported_", "_isTypeSupportedWithFeatures_", "_matchMedia_", "_decodingInfos_", "_requestMediaKeySystemAccess_", "_getStatusForPolicy_" ], api_probeMediaConfiguration = (_ref = function _asyncToGenerator(fn) {
                return function() {
                    var gen = fn.apply(this, arguments);
                    return new Promise(function(resolve, reject) {
                        return function step(key, arg) {
                            try {
                                var info = gen[key](arg), value = info.value;
                            } catch (error) {
                                return void reject(error);
                            }
                            if (!info.done) return Promise.resolve(value).then(function(value) {
                                step("next", value);
                            }, function(err) {
                                step("throw", err);
                            });
                            resolve(value);
                        }("next");
                    });
                };
            }(/* */ regeneratorRuntime.mark(function _callee(_config) {
                var config, isProbablySupported, isMaybeSupported, isNotSupported, _iterator, _isArray, _i, _ref2, probeWithBrowser;
                return regeneratorRuntime.wrap(function _callee$(_context) {
                    for (;;) switch (_context.prev = _context.next) {
                      case 0:
                        config = probeMediaConfiguration_validateConfiguration(_config), isProbablySupported = !1, 
                        isMaybeSupported = !1, isNotSupported = !1, _iterator = browserAPIS, _isArray = Array.isArray(_iterator), 
                        _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();

                      case 5:
                        if (!_isArray) {
                            _context.next = 11;
                            break;
                        }
                        if (!(_i >= _iterator.length)) {
                            _context.next = 8;
                            break;
                        }
                        return _context.abrupt("break", 22);

                      case 8:
                        _ref2 = _iterator[_i++], _context.next = 15;
                        break;

                      case 11:
                        if (!(_i = _iterator.next()).done) {
                            _context.next = 14;
                            break;
                        }
                        return _context.abrupt("break", 22);

                      case 14:
                        _ref2 = _i.value;

                      case 15:
                        if (!(probeWithBrowser = mediaCapabilitiesProber_probers[_ref2])) {
                            _context.next = 20;
                            break;
                        }
                        return _context.next = 20, probeWithBrowser(config).then(function(probeResult) {
                            isNotSupported = isNotSupported || 0 === probeResult, isMaybeSupported = isMaybeSupported || 1 === probeResult, 
                            isProbablySupported = isProbablySupported || 2 === probeResult;
                        }).catch(function(err) {
                            return log.a.debug(err);
                        });

                      case 20:
                        _context.next = 5;
                        break;

                      case 22:
                        if (!isNotSupported) {
                            _context.next = 26;
                            break;
                        }
                        return _context.abrupt("return", "Not Supported");

                      case 26:
                        if (!isMaybeSupported) {
                            _context.next = 30;
                            break;
                        }
                        return _context.abrupt("return", "Maybe");

                      case 30:
                        if (!isProbablySupported) {
                            _context.next = 32;
                            break;
                        }
                        return _context.abrupt("return", "Probably");

                      case 32:
                        return _context.abrupt("return", "Maybe");

                      case 33:
                      case "end":
                        return _context.stop();
                    }
                }, _callee, void 0);
            })), function probeMediaConfiguration(_x) {
                return _ref.apply(this, arguments);
            });
            /**
 * Probe media capabilities, evaluating capabilities with available browsers API.
 *
 * Probe every given features with configuration.
 * If the browser API is not available OR we can't call browser API with enough arguments,
 * do nothing but warn user (e.g. HDCP is not specified for calling "getStatusForPolicy"
 * API, "mediaCapabilites" API is not available.).
 *
 * if we call the browser API, we get from it a number which means:
 * - 0 : Probably
 * - 1 : Maybe
 * - 2 : Not Supported
 *
 * From all API results, we return worst of states (e.g. if one API returns
 * "Not Supported" among "Probably" statuses, return "Not Supported").
 *
 * If no API was called or some capabilites could not be probed and status is "Probably",
 * return "Maybe".
 * @param {Object} config
 */            
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
            /**
 * A set of API to probe media capabilites.
 * Each API allow to evalute a specific feature (HDCP support, decoding infos, etc)
 * and relies on different browser API to probe capabilites.
 */
            var tools_mediaCapabilitiesProber = {
                /**
     * Get capabilities for any configuration.
     * All possible attributes are accepted as argument.
     * @param {Object} config
     */
                getCapabilities: function() {
                    var _ref = function api_asyncToGenerator(fn) {
                        return function() {
                            var gen = fn.apply(this, arguments);
                            return new Promise(function(resolve, reject) {
                                return function step(key, arg) {
                                    try {
                                        var info = gen[key](arg), value = info.value;
                                    } catch (error) {
                                        return void reject(error);
                                    }
                                    if (!info.done) return Promise.resolve(value).then(function(value) {
                                        step("next", value);
                                    }, function(err) {
                                        step("throw", err);
                                    });
                                    resolve(value);
                                }("next");
                            });
                        };
                    }(/* */ regeneratorRuntime.mark(function _callee(config) {
                        return regeneratorRuntime.wrap(function _callee$(_context) {
                            for (;;) switch (_context.prev = _context.next) {
                              case 0:
                                return _context.abrupt("return", api_probeMediaConfiguration(config));

                              case 1:
                              case "end":
                                return _context.stop();
                            }
                        }, _callee, void 0);
                    }));
                    return function getCapabilities(_x) {
                        return _ref.apply(this, arguments);
                    };
                }(),
                /**
     * Get HDCP status. Evaluates if current equipement support given
     * HDCP revision.
     */
                getStatusForHDCP: function getStatusForHDCP(hdcp) {
                    return hdcp ? api_probeMediaConfiguration({
                        mediaProtection: {
                            output: {
                                hdcp: hdcp
                            }
                        }
                    }) : Promise.reject("BAD_ARGUMENT: No HDCP Policy specified.");
                },
                /**
     * Get decoding capabilities from a given video and/or audio
     * configuration.
     */
                getDecodingCapabilities: function getDecodingCapabilities(type, video, audio) {
                    return api_probeMediaConfiguration({
                        type: type,
                        video: video,
                        audio: audio
                    });
                },
                /**
     * Get Status For DRM. Tells if browser support deciphering
     * with given drm type and configuration.
     */
                getStatusForDRM: function getStatusForDRM(type, drmConfig) {
                    return api_probeMediaConfiguration({
                        mediaProtection: {
                            drm: {
                                type: type,
                                configuration: drmConfig
                            }
                        }
                    });
                },
                /**
     * Get display capabilites. Tells if display can output
     * with specific video and/or audio constrains.
     */
                getDisplayCapabilities: function getDisplayCapabilities(displayConfig) {
                    return api_probeMediaConfiguration({
                        display: displayConfig
                    });
                }
            };
            /* harmony default export */            
            // CONCATENATED MODULE: ./src/tools/index.ts
            /* concated harmony reexport */ __webpack_require__.d(__webpack_exports__, "MediaCapabilitiesProber", function() {
                return tools_mediaCapabilitiesProber;
            });
        }
        /******/    });
});