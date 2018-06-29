!function webpackUniversalModuleDefinition(root, factory) {
    if ("object" == typeof exports && "object" == typeof module) module.exports = factory(); else if ("function" == typeof define && define.amd) define([], factory); else {
        var a = factory();
        for (var i in a) ("object" == typeof exports ? exports : root)[i] = a[i];
    }
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
        /******/ __webpack_require__.p = "", __webpack_require__(__webpack_require__.s = 0);
        /******/    }
    /************************************************************************/
    /******/ ([ 
    /* 0 */
    /***/ function(module, __webpack_exports__, __webpack_require__) {
        "use strict";
        __webpack_require__.r(__webpack_exports__);
        // CONCATENATED MODULE: ./src/experimental/tools/mediaCapabilitiesProber/utils/noop.ts
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
        /* harmony default export */ var noop = function() {}, LEVELS = {
            NONE: 0,
            ERROR: 1,
            WARNING: 2,
            INFO: 3,
            DEBUG: 4
        }, currentLevel = Object.keys(LEVELS)[0], log = {
            LEVELS: Object.keys(LEVELS),
            error: noop,
            warn: noop,
            info: noop,
            debug: noop,
            setLevel: function(levelStr) {
                var level, foundLevel = LEVELS[levelStr];
                foundLevel ? (level = foundLevel, currentLevel = levelStr) : (// either 0 or not found
                level = 0, currentLevel = "NONE")
                /* tslint:disable no-invalid-this */ , this.error = level >= LEVELS.ERROR ? console.error.bind(console) : noop, 
                this.warn = level >= LEVELS.WARNING ? console.warn.bind(console) : noop, this.info = level >= LEVELS.INFO ? console.info.bind(console) : noop, 
                this.debug = level >= LEVELS.DEBUG ? console.log.bind(console) : noop;
            },
            getLevel: function() {
                return currentLevel;
            }
        }, capabilites = {
            _decodingInfos_: [ "type", {
                video: [ "contentType", "width", "height", "bitrate", "framerate", "bitsPerComponent" ]
            }, {
                audio: [ "contentType", "channels", "bitrate", "samplerate" ]
            } ],
            _getStatusForPolicy_: [ {
                mediaProtection: [ {
                    output: [ "hdcp" ]
                } ]
            } ],
            _isTypeSupported_: [ {
                video: [ "contentType" ]
            }, {
                audio: [ "contentType" ]
            } ],
            _matchMedia_: [ {
                display: [ "colorSpace" ]
            } ],
            _requestMediaKeySystemAccess_: [ {
                mediaProtection: [ {
                    drm: [ "type", {
                        configuration: [ "persistentLicense", "persistentStateRequired", "distinctiveIdentifierRequired", "videoRobustnesses", "audioRobustnesses" ]
                    } ]
                } ]
            } ],
            _isTypeSupportedWithFeatures_: [ "type", {
                video: [ "contentType", "width", "height", "bitrate", "framerate", "bitsPerComponent" ]
            }, {
                audio: [ "contentType", "channels", "bitrate", "samplerate" ]
            }, {
                mediaProtection: [ {
                    output: [ "hdcp" ],
                    drm: [ "type", {
                        configuration: [ "persistentLicense", "persistentStateRequired", "distinctiveIdentifierRequired", "videoRobustnesses", "audioRobustnesses" ]
                    } ]
                } ]
            }, {
                display: [ "colorSpace", "width", "height", "bitsPerComponent" ]
            } ]
        };
        /* tslint:enable:no-empty */
        // CONCATENATED MODULE: ./src/experimental/tools/mediaCapabilitiesProber/utils/log.ts
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
 * Get probed configuration.
 * @param {Object} config
 * @param {Array<string>} probers
 */
        function getProbedConfiguration(config, probers) {
            var target = [];
            /**
 * Extends a capabilities array with others.
 * @param {Array<Object>} target
 * @param {Array<Object>} objects
 */
            return function extend(target, objects) {
                return objects.forEach(function(object) {
                    object.forEach(function(element) {
                        if ("string" == typeof element) target.find(function(targetElement) {
                            return targetElement === element;
                        }) || target.push(element); else {
                            var entry = Object.entries(element)[0], key_1 = entry[0], value = entry[1], foundTargetElement = target.find(function(targetElement) {
                                return "string" != typeof targetElement && !!targetElement[key_1];
                            });
                            if (foundTargetElement) {
                                if ("string" != typeof foundTargetElement) {
                                    var targetElementToExtend = foundTargetElement;
                                    targetElementToExtend[key_1] = extend(targetElementToExtend[key_1], [ value ]);
                                }
                            } else {
                                var toPush = {};
                                toPush[key_1] = extend([], [ value ]), target.push(toPush);
                            }
                        }
                    });
                }), target;
            }
            /**
 * From input config object and probed capabilities, create
 * probed configuration object.
 * @param {Array<Object>} capabilities
 * @param {Object} configuration
 */ (target, probers.map(function(prober) {
                return capabilites[prober];
            })), function filterConfigurationWithProbedCapabilities(capabilities, configuration) {
                var probedConfig = {};
                return capabilities.forEach(function(capability) {
                    if ("string" == typeof capability) void 0 !== configuration[capability] && (probedConfig[capability] = configuration[capability]); else {
                        var _a = Object.entries(capability)[0], key = _a[0], subProbedConfig = filterConfigurationWithProbedCapabilities(_a[1], configuration[key] || {});
                        Object.entries(subProbedConfig).length > 0 && (probedConfig[key] = subProbedConfig);
                    }
                }), probedConfig;
            }(target, config);
        }
        // CONCATENATED MODULE: ./src/experimental/tools/mediaCapabilitiesProber/probers/compatibility.ts
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
 */        function is_requestMKSA_APIAvailable() {
            return new Promise(function(resolve) {
                if (!("requestMediaKeySystemAccess" in navigator)) throw new Error("API_AVAILABILITY: MediaCapabilitiesProber >>> API_CALL: API not available");
                resolve();
            });
        }
        // CONCATENATED MODULE: ./src/experimental/tools/mediaCapabilitiesProber/probers/_decodingInfos_/index.ts
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
        var _isTypeSupportedWithFeatures_format = function(video, outputProtection, audio, display) {
            var str = null, defaultVideoCodec = function() {
                if (!window.MediaSource || !window.MediaSource.isTypeSupported) throw new Error();
                for (var _i = 0, videoCodecs_1 = [ 'video/mp4; codecs="avc1.4D401E"', 'video/webm; codecs="vp09.00.10.08"' ]; _i < videoCodecs_1.length; _i++) {
                    var codec = videoCodecs_1[_i];
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
        }, DEFAULT_WIDEVINE_ROBUSTNESSES = [ "HW_SECURE_ALL", "HW_SECURE_DECODE", "HW_SECURE_CRYPTO", "SW_SECURE_DECODE", "SW_SECURE_CRYPTO" ];
        /* harmony default export */        
        // CONCATENATED MODULE: ./src/experimental/tools/mediaCapabilitiesProber/probers/_requestMediaKeySystemAccess_/index.ts
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
            _isTypeSupported_: function(config) {
                return function is_isTypeSupported_Available() {
                    return new Promise(function(resolve) {
                        if (!("MediaSource" in window)) throw new Error("MediaCapabilitiesProber >>> API_CALL: MediaSource API not available");
                        if (!("isTypeSupported" in window.MediaSource)) throw new Error("MediaCapabilitiesProber >>> API_CALL: Decoding Info not available");
                        resolve();
                    });
                }().then(function() {
                    var contentTypes = [];
                    if (config.video && config.video.contentType && contentTypes.push(config.video.contentType), 
                    config.audio && config.audio.contentType && contentTypes.push(config.audio.contentType), 
                    null === contentTypes || !contentTypes.length) throw new Error("MediaCapabilitiesProber >>> API_CALL: Not enough arguments for calling isTypeSupported.");
                    return contentTypes.reduce(function(acc, val) {
                        var support = window.MediaSource.isTypeSupported(val) ? 2 : 0;
                        return Math.min(acc, support);
                    }, 2);
                });
            },
            _isTypeSupportedWithFeatures_: function(config) {
                return function is_isTypeSupportedWithFeatures_APIAvailable() {
                    return new Promise(function(resolve) {
                        if (!("MSMediaKeys" in window)) throw new Error("MediaCapabilitiesProber >>> API_CALL: MSMediaKeys API not available");
                        if (!("isTypeSupportedWithFeatures" in window.MSMediaKeys)) throw new Error("MediaCapabilitiesProber >>> API_CALL: Decoding Info not available");
                        resolve();
                    });
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
            _matchMedia_: function(config) {
                return function is_matchMedia_APIAvailable() {
                    return new Promise(function(resolve) {
                        if (!("matchMedia" in window)) throw new Error("MediaCapabilitiesProber >>> API_CALL: matchMedia API not available");
                        resolve();
                    });
                }().then(function() {
                    if (config.display) {
                        var formatted = (display = config.display, (gamut = display.colorSpace) ? "(color-gamut: " + gamut + ")" : null);
                        if (formatted) {
                            var match = window.matchMedia(formatted);
                            return match.matches && "not all" !== match.media ? 2 : 0;
                        }
                    }
                    var display, gamut;
                    throw new Error("MediaCapabilitiesProber >>> API_CALL: Not enough arguments for calling matchMedia.");
                });
            },
            _decodingInfos_: function(config) {
                return function is_mediaCapabilities_APIAvailable() {
                    return new Promise(function(resolve) {
                        if (!("mediaCapabilities" in navigator)) throw new Error("MediaCapabilitiesProber >>> API_CALL: MediaCapabilities API not available");
                        if (!("decodingInfo" in navigator.mediaCapabilities)) throw new Error("MediaCapabilitiesProber >>> API_CALL: Decoding Info not available");
                        resolve();
                    });
                }().then(function() {
                    if (config.type && config.video && config.video.bitrate && config.video.contentType && config.video.framerate && config.video.height && config.video.width && config.audio && config.audio.bitrate && config.audio.channels && config.audio.contentType && config.audio.samplerate) return navigator.mediaCapabilities.decodingInfo(config).then(function(result) {
                        return result.supported ? 2 : 0;
                    }).catch(function() {
                        throw new Error("MediaCapabilitiesProber >>> API_CALL: Bad arguments for calling mediaCapabilities.");
                    });
                    throw new Error("MediaCapabilitiesProber >>> API_CALL: Not enough arguments for calling mediaCapabilites.");
                });
            },
            _requestMediaKeySystemAccess_: function(config) {
                return is_requestMKSA_APIAvailable().then(function() {
                    var mediaProtection = config.mediaProtection;
                    if (mediaProtection) {
                        var drm = mediaProtection.drm;
                        if (drm && drm.type) {
                            var keySystem = drm.type, configuration = function buildKeySystemConfigurations(ksName, keySystem) {
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
                            }(keySystem, drm.configuration || {});
                            return navigator.requestMediaKeySystemAccess(keySystem, configuration).then(function() {
                                return 2;
                            }).catch(function() {
                                return 0;
                            });
                        }
                    }
                    throw new Error("MediaCapabilitiesProber >>> API_CALL: Not enough arguments for calling requestMediaKeySystemAccess.");
                });
            },
            _getStatusForPolicy_: function(config) {
                return function is_getStatusForPolicy_APIAvailable() {
                    return is_requestMKSA_APIAvailable().then(function() {
                        if (!("MediaKeys" in window)) throw new Error("MediaCapabilitiesProber >>> API_CALL: MediaKeys API not available");
                        if (!("getStatusForPolicy" in window.MediaKeys)) throw new Error("MediaCapabilitiesProber >>> API_CALL: getStatusForPolicy API not available");
                    });
                }().then(function() {
                    if (config.mediaProtection && config.mediaProtection.output) {
                        var object_1 = {
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
                            mediaKeys.getStatusForPolicy(object_1).then(function(result) {
                                return "usable" === result ? 2 : 0;
                            });
                        });
                    }
                    throw new Error("MediaCapabilitiesProber >>> API_CALL: Not enough arguments for calling getStatusForPolicy.");
                });
            }
        };
        /* harmony default export */        
        // CONCATENATED MODULE: ./src/experimental/tools/mediaCapabilitiesProber/utils/isEmpty.ts
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
        // CONCATENATED MODULE: ./src/experimental/tools/mediaCapabilitiesProber/utils/filterEmptyFields.ts
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
 */        var filterEmptyFields = function(object) {
            for (var filtered = {}, _i = 0, entries_1 = Object.entries(object); _i < entries_1.length; _i++) {
                var entry = entries_1[_i], key = entry[0], value = entry[1];
                if ("object" != typeof value && null != value) filtered[key] = value; else if ("object" == typeof value) {
                    var filteredValue = filterEmptyFields(value);
                    filteredValue && !isEmpty(filteredValue) && (filtered[key] = filteredValue);
                }
            }
            return filtered;
        }, utils_filterEmptyFields = filterEmptyFields, __awaiter = function(thisArg, _arguments, P, generator) {
            return new (P || (P = Promise))(function(resolve, reject) {
                function fulfilled(value) {
                    try {
                        step(generator.next(value));
                    } catch (e) {
                        reject(e);
                    }
                }
                function rejected(value) {
                    try {
                        step(generator.throw(value));
                    } catch (e) {
                        reject(e);
                    }
                }
                function step(result) {
                    result.done ? resolve(result.value) : new P(function(resolve) {
                        resolve(result.value);
                    }).then(fulfilled, rejected);
                }
                step((generator = generator.apply(thisArg, _arguments || [])).next());
            });
        }, __generator = function(thisArg, body) {
            var f, y, t, g, _ = {
                label: 0,
                sent: function() {
                    if (1 & t[0]) throw t[1];
                    return t[1];
                },
                trys: [],
                ops: []
            };
            return g = {
                next: verb(0),
                throw: verb(1),
                return: verb(2)
            }, "function" == typeof Symbol && (g[Symbol.iterator] = function() {
                return this;
            }), g;
            function verb(n) {
                return function(v) {
                    return function step(op) {
                        if (f) throw new TypeError("Generator is already executing.");
                        for (;_; ) try {
                            if (f = 1, y && (t = y[2 & op[0] ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
                            switch (y = 0, t && (op = [ 0, t.value ]), op[0]) {
                              case 0:
                              case 1:
                                t = op;
                                break;

                              case 4:
                                return _.label++, {
                                    value: op[1],
                                    done: !1
                                };

                              case 5:
                                _.label++, y = op[1], op = [ 0 ];
                                continue;

                              case 7:
                                op = _.ops.pop(), _.trys.pop();
                                continue;

                              default:
                                if (!(t = (t = _.trys).length > 0 && t[t.length - 1]) && (6 === op[0] || 2 === op[0])) {
                                    _ = 0;
                                    continue;
                                }
                                if (3 === op[0] && (!t || op[1] > t[0] && op[1] < t[3])) {
                                    _.label = op[1];
                                    break;
                                }
                                if (6 === op[0] && _.label < t[1]) {
                                    _.label = t[1], t = op;
                                    break;
                                }
                                if (t && _.label < t[2]) {
                                    _.label = t[2], _.ops.push(op);
                                    break;
                                }
                                t[2] && _.ops.pop(), _.trys.pop();
                                continue;
                            }
                            op = body.call(thisArg, _);
                        } catch (e) {
                            op = [ 6, e ], y = 0;
                        } finally {
                            f = t = 0;
                        }
                        if (5 & op[0]) throw op[1];
                        return {
                            value: op[0] ? op[1] : void 0,
                            done: !0
                        };
                    }([ n, v ]);
                };
            }
        }, browserAPIS = [ "_isTypeSupported_", "_isTypeSupportedWithFeatures_", "_matchMedia_", "_decodingInfos_", "_requestMediaKeySystemAccess_", "_getStatusForPolicy_" ], api_probeMediaConfiguration = function(_config) {
            return __awaiter(void 0, void 0, void 0, function() {
                var config, isProbablySupported, isMaybeSupported, isNotSupported, resultingAPI, _loop_1, _i, browserAPIS_1, browserAPI, probedCapabilities;
                return __generator(this, function(_a) {
                    switch (_a.label) {
                      case 0:
                        config = function(config) {
                            if (!config) throw new Error("MCP_CONF: Configuration is not defined.");
                            var filteredConfig = utils_filterEmptyFields(config);
                            if (isEmpty(filteredConfig)) throw new Error("MCP_CONF: Can't probe empty configuration.");
                            return filteredConfig;
                        }(_config), isProbablySupported = !1, isMaybeSupported = !1, isNotSupported = !1, 
                        resultingAPI = [], _loop_1 = function(browserAPI) {
                            var probeWithBrowser;
                            return __generator(this, function(_a) {
                                switch (_a.label) {
                                  case 0:
                                    return (probeWithBrowser = mediaCapabilitiesProber_probers[browserAPI]) ? [ 4 /*yield*/ , probeWithBrowser(config).then(function(probeResult) {
                                        resultingAPI.push(browserAPI), isNotSupported = isNotSupported || 0 === probeResult, 
                                        isMaybeSupported = isMaybeSupported || 1 === probeResult, isProbablySupported = isProbablySupported || 2 === probeResult;
                                    }).catch(function(err) {
                                        return log.debug(err);
                                    }) ] : [ 3 /*break*/ , 2 ];

                                  case 1:
                                    _a.sent(), _a.label = 2;

                                  case 2:
                                    return [ 2 /*return*/ ];
                                }
                            });
                        }, _i = 0, browserAPIS_1 = browserAPIS, _a.label = 1;

                      case 1:
                        return _i < browserAPIS_1.length ? (browserAPI = browserAPIS_1[_i], [ 5 /*yield**/ , _loop_1(browserAPI) ]) : [ 3 /*break*/ , 4 ];

                      case 2:
                        _a.sent(), _a.label = 3;

                      case 3:
                        return _i++, [ 3 /*break*/ , 1 ];

                      case 4:
                        return probedCapabilities = getProbedConfiguration(config, resultingAPI), isMaybeSupported = JSON.stringify(probedCapabilities) !== JSON.stringify(config) || isMaybeSupported, 
                        log.warn("MediaCapabilitiesProber >>> PROBER: Some capabilities could not be probed, due to the incompatibility of browser APIs, or the lack of arguments to call them. (See DEBUG logs for details)"), 
                        log.info("MediaCapabilitiesProber >>> PROBER: Probed capabilities: ", probedCapabilities), 
                        isNotSupported ? [ 2 /*return*/ , "Not Supported" ] : isMaybeSupported ? [ 2 /*return*/ , "Maybe" ] : isProbablySupported ? [ 2 /*return*/ , "Probably" ] : [ 2 /*return*/ , "Maybe" ];
                    }
                });
            });
        }, api_awaiter = function(thisArg, _arguments, P, generator) {
            return new (P || (P = Promise))(function(resolve, reject) {
                function fulfilled(value) {
                    try {
                        step(generator.next(value));
                    } catch (e) {
                        reject(e);
                    }
                }
                function rejected(value) {
                    try {
                        step(generator.throw(value));
                    } catch (e) {
                        reject(e);
                    }
                }
                function step(result) {
                    result.done ? resolve(result.value) : new P(function(resolve) {
                        resolve(result.value);
                    }).then(fulfilled, rejected);
                }
                step((generator = generator.apply(thisArg, _arguments || [])).next());
            });
        }, api_generator = function(thisArg, body) {
            var f, y, t, g, _ = {
                label: 0,
                sent: function() {
                    if (1 & t[0]) throw t[1];
                    return t[1];
                },
                trys: [],
                ops: []
            };
            return g = {
                next: verb(0),
                throw: verb(1),
                return: verb(2)
            }, "function" == typeof Symbol && (g[Symbol.iterator] = function() {
                return this;
            }), g;
            function verb(n) {
                return function(v) {
                    return function step(op) {
                        if (f) throw new TypeError("Generator is already executing.");
                        for (;_; ) try {
                            if (f = 1, y && (t = y[2 & op[0] ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
                            switch (y = 0, t && (op = [ 0, t.value ]), op[0]) {
                              case 0:
                              case 1:
                                t = op;
                                break;

                              case 4:
                                return _.label++, {
                                    value: op[1],
                                    done: !1
                                };

                              case 5:
                                _.label++, y = op[1], op = [ 0 ];
                                continue;

                              case 7:
                                op = _.ops.pop(), _.trys.pop();
                                continue;

                              default:
                                if (!(t = (t = _.trys).length > 0 && t[t.length - 1]) && (6 === op[0] || 2 === op[0])) {
                                    _ = 0;
                                    continue;
                                }
                                if (3 === op[0] && (!t || op[1] > t[0] && op[1] < t[3])) {
                                    _.label = op[1];
                                    break;
                                }
                                if (6 === op[0] && _.label < t[1]) {
                                    _.label = t[1], t = op;
                                    break;
                                }
                                if (t && _.label < t[2]) {
                                    _.label = t[2], _.ops.push(op);
                                    break;
                                }
                                t[2] && _.ops.pop(), _.trys.pop();
                                continue;
                            }
                            op = body.call(thisArg, _);
                        } catch (e) {
                            op = [ 6, e ], y = 0;
                        } finally {
                            f = t = 0;
                        }
                        if (5 & op[0]) throw op[1];
                        return {
                            value: op[0] ? op[1] : void 0,
                            done: !0
                        };
                    }([ n, v ]);
                };
            }
        }, api = {
            /**
     * Get capabilities for any configuration.
     * All possible attributes are accepted as argument.
     * @param {Object} config
     */
            getCapabilities: function(config) {
                return api_awaiter(void 0, void 0, void 0, function() {
                    return api_generator(this, function(_a) {
                        return [ 2 /*return*/ , api_probeMediaConfiguration(config) ];
                    });
                });
            },
            /**
     * Get HDCP status. Evaluates if current equipement support given
     * HDCP revision.
     */
            getStatusForHDCP: function(hdcp) {
                return hdcp ? api_probeMediaConfiguration({
                    mediaProtection: {
                        output: {
                            hdcp: hdcp
                        }
                    }
                }) : Promise.reject("MediaCapabilitiesProbers >>> Bad Arguments: No HDCP Policy specified.");
            },
            /**
     * Get decoding capabilities from a given video and/or audio
     * configuration.
     */
            getDecodingCapabilities: function(mediaConfig) {
                var config = {
                    type: mediaConfig.type,
                    video: mediaConfig.video,
                    audio: mediaConfig.audio
                };
                return api_probeMediaConfiguration(config);
            },
            /**
     * Get Status For DRM. Tells if browser support deciphering
     * with given drm type and configuration.
     */
            getStatusForDRM: function(type, drmConfig) {
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
            getDisplayCapabilities: function(displayConfig) {
                return api_probeMediaConfiguration({
                    display: displayConfig
                });
            },
            /**
     * Set logger level
     * @param {string} level
     */
            setLogLevel: function(level) {
                log.setLevel(level);
            },
            /**
     * Get logger level
     */
            getLogLevel: function() {
                log.getLevel();
            }
        };
        /* harmony default export */        
        // CONCATENATED MODULE: ./src/experimental/tools/mediaCapabilitiesProber/index.ts
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
        log.setLevel("DEBUG");
        /* harmony default export */ var tools_mediaCapabilitiesProber = api;
        // CONCATENATED MODULE: ./src/experimental/tools/index.ts
        /* concated harmony reexport */        __webpack_require__.d(__webpack_exports__, "MediaCapabilitiesProber", function() {
            return tools_mediaCapabilitiesProber;
        });
    }
    /******/ ]);
});