"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from2, except, desc) => {
    if (from2 && typeof from2 === "object" || typeof from2 === "function") {
      for (let key of __getOwnPropNames(from2))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from2[key], enumerable: !(desc = __getOwnPropDesc(from2, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // <define:__ENVIRONMENT__>
  var define_ENVIRONMENT_default;
  var init_define_ENVIRONMENT = __esm({
    "<define:__ENVIRONMENT__>"() {
      define_ENVIRONMENT_default = { PRODUCTION: 0, DEV: 1, CURRENT_ENV: 1 };
    }
  });

  // node_modules/rxjs/node_modules/tslib/tslib.js
  var require_tslib = __commonJS({
    "node_modules/rxjs/node_modules/tslib/tslib.js"(exports, module) {
      init_define_ENVIRONMENT();
      var __extends2;
      var __assign2;
      var __rest2;
      var __decorate2;
      var __param2;
      var __metadata2;
      var __awaiter2;
      var __generator2;
      var __exportStar2;
      var __values2;
      var __read2;
      var __spread2;
      var __spreadArrays2;
      var __spreadArray2;
      var __await2;
      var __asyncGenerator2;
      var __asyncDelegator2;
      var __asyncValues2;
      var __makeTemplateObject2;
      var __importStar2;
      var __importDefault2;
      var __classPrivateFieldGet2;
      var __classPrivateFieldSet2;
      var __createBinding2;
      (function(factory) {
        var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
        if (typeof define === "function" && define.amd) {
          define("tslib", ["exports"], function(exports2) {
            factory(createExporter(root, createExporter(exports2)));
          });
        } else if (typeof module === "object" && typeof module.exports === "object") {
          factory(createExporter(root, createExporter(module.exports)));
        } else {
          factory(createExporter(root));
        }
        function createExporter(exports2, previous) {
          if (exports2 !== root) {
            if (typeof Object.create === "function") {
              Object.defineProperty(exports2, "__esModule", { value: true });
            } else {
              exports2.__esModule = true;
            }
          }
          return function(id, v) {
            return exports2[id] = previous ? previous(id, v) : v;
          };
        }
      })(function(exporter) {
        var extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d, b) {
          d.__proto__ = b;
        } || function(d, b) {
          for (var p in b)
            if (Object.prototype.hasOwnProperty.call(b, p))
              d[p] = b[p];
        };
        __extends2 = function(d, b) {
          if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
          extendStatics(d, b);
          function __() {
            this.constructor = d;
          }
          d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
        __assign2 = Object.assign || function(t) {
          for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s)
              if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
          }
          return t;
        };
        __rest2 = function(s, e) {
          var t = {};
          for (var p in s)
            if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
              t[p] = s[p];
          if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
              if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
            }
          return t;
        };
        __decorate2 = function(decorators, target, key, desc) {
          var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
          if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
            r = Reflect.decorate(decorators, target, key, desc);
          else
            for (var i = decorators.length - 1; i >= 0; i--)
              if (d = decorators[i])
                r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
          return c > 3 && r && Object.defineProperty(target, key, r), r;
        };
        __param2 = function(paramIndex, decorator) {
          return function(target, key) {
            decorator(target, key, paramIndex);
          };
        };
        __metadata2 = function(metadataKey, metadataValue) {
          if (typeof Reflect === "object" && typeof Reflect.metadata === "function")
            return Reflect.metadata(metadataKey, metadataValue);
        };
        __awaiter2 = function(thisArg, _arguments, P, generator) {
          function adopt(value) {
            return value instanceof P ? value : new P(function(resolve) {
              resolve(value);
            });
          }
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
                step(generator["throw"](value));
              } catch (e) {
                reject(e);
              }
            }
            function step(result) {
              result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
            }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
          });
        };
        __generator2 = function(thisArg, body) {
          var _ = { label: 0, sent: function() {
            if (t[0] & 1)
              throw t[1];
            return t[1];
          }, trys: [], ops: [] }, f, y, t, g;
          return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
            return this;
          }), g;
          function verb(n) {
            return function(v) {
              return step([n, v]);
            };
          }
          function step(op) {
            if (f)
              throw new TypeError("Generator is already executing.");
            while (_)
              try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done)
                  return t;
                if (y = 0, t)
                  op = [op[0] & 2, t.value];
                switch (op[0]) {
                  case 0:
                  case 1:
                    t = op;
                    break;
                  case 4:
                    _.label++;
                    return { value: op[1], done: false };
                  case 5:
                    _.label++;
                    y = op[1];
                    op = [0];
                    continue;
                  case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                  default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                      _ = 0;
                      continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                      _.label = op[1];
                      break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                      _.label = t[1];
                      t = op;
                      break;
                    }
                    if (t && _.label < t[2]) {
                      _.label = t[2];
                      _.ops.push(op);
                      break;
                    }
                    if (t[2])
                      _.ops.pop();
                    _.trys.pop();
                    continue;
                }
                op = body.call(thisArg, _);
              } catch (e) {
                op = [6, e];
                y = 0;
              } finally {
                f = t = 0;
              }
            if (op[0] & 5)
              throw op[1];
            return { value: op[0] ? op[1] : void 0, done: true };
          }
        };
        __exportStar2 = function(m, o) {
          for (var p in m)
            if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p))
              __createBinding2(o, m, p);
        };
        __createBinding2 = Object.create ? function(o, m, k, k2) {
          if (k2 === void 0)
            k2 = k;
          Object.defineProperty(o, k2, { enumerable: true, get: function() {
            return m[k];
          } });
        } : function(o, m, k, k2) {
          if (k2 === void 0)
            k2 = k;
          o[k2] = m[k];
        };
        __values2 = function(o) {
          var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
          if (m)
            return m.call(o);
          if (o && typeof o.length === "number")
            return {
              next: function() {
                if (o && i >= o.length)
                  o = void 0;
                return { value: o && o[i++], done: !o };
              }
            };
          throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
        };
        __read2 = function(o, n) {
          var m = typeof Symbol === "function" && o[Symbol.iterator];
          if (!m)
            return o;
          var i = m.call(o), r, ar = [], e;
          try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done)
              ar.push(r.value);
          } catch (error) {
            e = { error };
          } finally {
            try {
              if (r && !r.done && (m = i["return"]))
                m.call(i);
            } finally {
              if (e)
                throw e.error;
            }
          }
          return ar;
        };
        __spread2 = function() {
          for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read2(arguments[i]));
          return ar;
        };
        __spreadArrays2 = function() {
          for (var s = 0, i = 0, il = arguments.length; i < il; i++)
            s += arguments[i].length;
          for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
              r[k] = a[j];
          return r;
        };
        __spreadArray2 = function(to, from2) {
          for (var i = 0, il = from2.length, j = to.length; i < il; i++, j++)
            to[j] = from2[i];
          return to;
        };
        __await2 = function(v) {
          return this instanceof __await2 ? (this.v = v, this) : new __await2(v);
        };
        __asyncGenerator2 = function(thisArg, _arguments, generator) {
          if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
          var g = generator.apply(thisArg, _arguments || []), i, q = [];
          return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
            return this;
          }, i;
          function verb(n) {
            if (g[n])
              i[n] = function(v) {
                return new Promise(function(a, b) {
                  q.push([n, v, a, b]) > 1 || resume(n, v);
                });
              };
          }
          function resume(n, v) {
            try {
              step(g[n](v));
            } catch (e) {
              settle(q[0][3], e);
            }
          }
          function step(r) {
            r.value instanceof __await2 ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);
          }
          function fulfill(value) {
            resume("next", value);
          }
          function reject(value) {
            resume("throw", value);
          }
          function settle(f, v) {
            if (f(v), q.shift(), q.length)
              resume(q[0][0], q[0][1]);
          }
        };
        __asyncDelegator2 = function(o) {
          var i, p;
          return i = {}, verb("next"), verb("throw", function(e) {
            throw e;
          }), verb("return"), i[Symbol.iterator] = function() {
            return this;
          }, i;
          function verb(n, f) {
            i[n] = o[n] ? function(v) {
              return (p = !p) ? { value: __await2(o[n](v)), done: n === "return" } : f ? f(v) : v;
            } : f;
          }
        };
        __asyncValues2 = function(o) {
          if (!Symbol.asyncIterator)
            throw new TypeError("Symbol.asyncIterator is not defined.");
          var m = o[Symbol.asyncIterator], i;
          return m ? m.call(o) : (o = typeof __values2 === "function" ? __values2(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function() {
            return this;
          }, i);
          function verb(n) {
            i[n] = o[n] && function(v) {
              return new Promise(function(resolve, reject) {
                v = o[n](v), settle(resolve, reject, v.done, v.value);
              });
            };
          }
          function settle(resolve, reject, d, v) {
            Promise.resolve(v).then(function(v2) {
              resolve({ value: v2, done: d });
            }, reject);
          }
        };
        __makeTemplateObject2 = function(cooked, raw) {
          if (Object.defineProperty) {
            Object.defineProperty(cooked, "raw", { value: raw });
          } else {
            cooked.raw = raw;
          }
          return cooked;
        };
        var __setModuleDefault = Object.create ? function(o, v) {
          Object.defineProperty(o, "default", { enumerable: true, value: v });
        } : function(o, v) {
          o["default"] = v;
        };
        __importStar2 = function(mod) {
          if (mod && mod.__esModule)
            return mod;
          var result = {};
          if (mod != null) {
            for (var k in mod)
              if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
                __createBinding2(result, mod, k);
          }
          __setModuleDefault(result, mod);
          return result;
        };
        __importDefault2 = function(mod) {
          return mod && mod.__esModule ? mod : { "default": mod };
        };
        __classPrivateFieldGet2 = function(receiver, privateMap) {
          if (!privateMap.has(receiver)) {
            throw new TypeError("attempted to get private field on non-instance");
          }
          return privateMap.get(receiver);
        };
        __classPrivateFieldSet2 = function(receiver, privateMap, value) {
          if (!privateMap.has(receiver)) {
            throw new TypeError("attempted to set private field on non-instance");
          }
          privateMap.set(receiver, value);
          return value;
        };
        exporter("__extends", __extends2);
        exporter("__assign", __assign2);
        exporter("__rest", __rest2);
        exporter("__decorate", __decorate2);
        exporter("__param", __param2);
        exporter("__metadata", __metadata2);
        exporter("__awaiter", __awaiter2);
        exporter("__generator", __generator2);
        exporter("__exportStar", __exportStar2);
        exporter("__createBinding", __createBinding2);
        exporter("__values", __values2);
        exporter("__read", __read2);
        exporter("__spread", __spread2);
        exporter("__spreadArrays", __spreadArrays2);
        exporter("__spreadArray", __spreadArray2);
        exporter("__await", __await2);
        exporter("__asyncGenerator", __asyncGenerator2);
        exporter("__asyncDelegator", __asyncDelegator2);
        exporter("__asyncValues", __asyncValues2);
        exporter("__makeTemplateObject", __makeTemplateObject2);
        exporter("__importStar", __importStar2);
        exporter("__importDefault", __importDefault2);
        exporter("__classPrivateFieldGet", __classPrivateFieldGet2);
        exporter("__classPrivateFieldSet", __classPrivateFieldSet2);
      });
    }
  });

  // node_modules/next-tick/index.js
  var require_next_tick = __commonJS({
    "node_modules/next-tick/index.js"(exports, module) {
      "use strict";
      init_define_ENVIRONMENT();
      var ensureCallable = function(fn) {
        if (typeof fn !== "function")
          throw new TypeError(fn + " is not a function");
        return fn;
      };
      var byObserver = function(Observer) {
        var node = document.createTextNode(""), queue, currentQueue, i = 0;
        new Observer(function() {
          var callback;
          if (!queue) {
            if (!currentQueue)
              return;
            queue = currentQueue;
          } else if (currentQueue) {
            queue = currentQueue.concat(queue);
          }
          currentQueue = queue;
          queue = null;
          if (typeof currentQueue === "function") {
            callback = currentQueue;
            currentQueue = null;
            callback();
            return;
          }
          node.data = i = ++i % 2;
          while (currentQueue) {
            callback = currentQueue.shift();
            if (!currentQueue.length)
              currentQueue = null;
            callback();
          }
        }).observe(node, { characterData: true });
        return function(fn) {
          ensureCallable(fn);
          if (queue) {
            if (typeof queue === "function")
              queue = [queue, fn];
            else
              queue.push(fn);
            return;
          }
          queue = fn;
          node.data = i = ++i % 2;
        };
      };
      module.exports = function() {
        if (typeof process === "object" && process && typeof process.nextTick === "function") {
          return process.nextTick;
        }
        if (typeof queueMicrotask === "function") {
          return function(cb) {
            queueMicrotask(ensureCallable(cb));
          };
        }
        if (typeof document === "object" && document) {
          if (typeof MutationObserver === "function")
            return byObserver(MutationObserver);
          if (typeof WebKitMutationObserver === "function")
            return byObserver(WebKitMutationObserver);
        }
        if (typeof setImmediate === "function") {
          return function(cb) {
            setImmediate(ensureCallable(cb));
          };
        }
        if (typeof setTimeout === "function" || typeof setTimeout === "object") {
          return function(cb) {
            setTimeout(ensureCallable(cb), 0);
          };
        }
        return null;
      }();
    }
  });

  // src/main/index.ts
  init_define_ENVIRONMENT();

  // src/main/core/api/index.ts
  init_define_ENVIRONMENT();

  // src/main/core/api/playback_observer.ts
  init_define_ENVIRONMENT();

  // src/common/config.ts
  init_define_ENVIRONMENT();

  // src/common/default_config.ts
  init_define_ENVIRONMENT();
  var DEFAULT_CONFIG = {
    DEFAULT_UNMUTED_VOLUME: 0.1,
    DEFAULT_REQUEST_TIMEOUT: 30 * 1e3,
    DEFAULT_TEXT_TRACK_MODE: "native",
    DEFAULT_MANUAL_BITRATE_SWITCHING_MODE: "seamless",
    DEFAULT_ENABLE_FAST_SWITCHING: true,
    DEFAULT_AUDIO_TRACK_SWITCHING_MODE: "seamless",
    DELTA_POSITION_AFTER_RELOAD: {
      bitrateSwitch: -0.1,
      trackSwitch: {
        audio: -0.7,
        video: -0.1,
        other: 0
      }
    },
    DEFAULT_CODEC_SWITCHING_BEHAVIOR: "continue",
    DEFAULT_AUTO_PLAY: false,
    DEFAULT_SHOW_NATIVE_SUBTITLE: true,
    DEFAULT_STOP_AT_END: true,
    DEFAULT_WANTED_BUFFER_AHEAD: 30,
    DEFAULT_MAX_BUFFER_AHEAD: Infinity,
    DEFAULT_MAX_BUFFER_BEHIND: Infinity,
    DEFAULT_MAX_VIDEO_BUFFER_SIZE: Infinity,
    MAXIMUM_MAX_BUFFER_AHEAD: {
      text: 5 * 60 * 60
    },
    MAXIMUM_MAX_BUFFER_BEHIND: {
      text: 5 * 60 * 60
    },
    DEFAULT_INITIAL_BITRATES: {
      audio: 0,
      video: 0,
      other: 0
    },
    DEFAULT_MIN_BITRATES: {
      audio: 0,
      video: 0,
      other: 0
    },
    DEFAULT_MAX_BITRATES: {
      audio: Infinity,
      video: Infinity,
      other: Infinity
    },
    INACTIVITY_DELAY: 60 * 1e3,
    DEFAULT_THROTTLE_WHEN_HIDDEN: false,
    DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN: false,
    DEFAULT_LIMIT_VIDEO_WIDTH: false,
    DEFAULT_LIVE_GAP: {
      DEFAULT: 10,
      LOW_LATENCY: 3.5
    },
    BUFFER_DISCONTINUITY_THRESHOLD: 0.2,
    FORCE_DISCONTINUITY_SEEK_DELAY: 2e3,
    BITRATE_REBUFFERING_RATIO: 1.5,
    BUFFER_GC_GAPS: {
      CALM: 240,
      BEEFY: 30
    },
    DEFAULT_MAX_MANIFEST_REQUEST_RETRY: 4,
    DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR: 4,
    DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE: Infinity,
    INITIAL_BACKOFF_DELAY_BASE: {
      REGULAR: 200,
      LOW_LATENCY: 50
    },
    MAX_BACKOFF_DELAY_BASE: {
      REGULAR: 3e3,
      LOW_LATENCY: 1e3
    },
    SAMPLING_INTERVAL_MEDIASOURCE: 1e3,
    SAMPLING_INTERVAL_LOW_LATENCY: 250,
    SAMPLING_INTERVAL_NO_MEDIASOURCE: 500,
    ABR_MINIMUM_TOTAL_BYTES: 15e4,
    ABR_MINIMUM_CHUNK_SIZE: 16e3,
    ABR_STARVATION_FACTOR: {
      DEFAULT: 0.72,
      LOW_LATENCY: 0.72
    },
    ABR_REGULAR_FACTOR: {
      DEFAULT: 0.8,
      LOW_LATENCY: 0.8
    },
    ABR_STARVATION_GAP: {
      DEFAULT: 5,
      LOW_LATENCY: 5
    },
    OUT_OF_STARVATION_GAP: {
      DEFAULT: 7,
      LOW_LATENCY: 7
    },
    ABR_STARVATION_DURATION_DELTA: 0.1,
    ABR_FAST_EMA: 2,
    ABR_SLOW_EMA: 10,
    RESUME_GAP_AFTER_SEEKING: {
      DEFAULT: 1.5,
      LOW_LATENCY: 0.5
    },
    RESUME_GAP_AFTER_NOT_ENOUGH_DATA: {
      DEFAULT: 0.5,
      LOW_LATENCY: 0.5
    },
    RESUME_GAP_AFTER_BUFFERING: {
      DEFAULT: 5,
      LOW_LATENCY: 0.5
    },
    REBUFFERING_GAP: {
      DEFAULT: 0.5,
      LOW_LATENCY: 0.2
    },
    MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING: 2,
    UNFREEZING_SEEK_DELAY: 6e3,
    FREEZING_STALLED_DELAY: 600,
    UNFREEZING_DELTA_POSITION: 1e-3,
    MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT: 0.15,
    MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE: 0.4,
    MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE: 0.3,
    MINIMUM_SEGMENT_SIZE: 5e-3,
    APPEND_WINDOW_SECURITIES: {
      START: 0.2,
      END: 0.1
    },
    MAXIMUM_HTML_TEXT_TRACK_UPDATE_INTERVAL: 50,
    TEXT_TRACK_SIZE_CHECKS_INTERVAL: 250,
    BUFFER_PADDING: {
      audio: 1,
      video: 3,
      other: 1
    },
    SEGMENT_PRIORITIES_STEPS: [
      2,
      4,
      8,
      12,
      18,
      25
    ],
    MAX_HIGH_PRIORITY_LEVEL: 1,
    MIN_CANCELABLE_PRIORITY: 3,
    EME_DEFAULT_WIDEVINE_ROBUSTNESSES: [
      "HW_SECURE_ALL",
      "HW_SECURE_DECODE",
      "HW_SECURE_CRYPTO",
      "SW_SECURE_DECODE",
      "SW_SECURE_CRYPTO"
    ],
    EME_KEY_SYSTEMS: {
      clearkey: [
        "webkit-org.w3.clearkey",
        "org.w3.clearkey"
      ],
      widevine: ["com.widevine.alpha"],
      playready: [
        "com.microsoft.playready",
        "com.chromecast.playready",
        "com.youtube.playready"
      ],
      fairplay: ["com.apple.fps.1_0"]
    },
    MAX_CONSECUTIVE_MANIFEST_PARSING_IN_UNSAFE_MODE: 10,
    MIN_MANIFEST_PARSING_TIME_TO_ENTER_UNSAFE_MODE: 200,
    MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY: 300,
    OUT_OF_SYNC_MANIFEST_REFRESH_DELAY: 3e3,
    FAILED_PARTIAL_UPDATE_MANIFEST_REFRESH_DELAY: 3e3,
    DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0: 3,
    EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS: 15,
    EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION: 1e3,
    EME_WAITING_DELAY_LOADED_SESSION_EMPTY_KEYSTATUSES: 100,
    FORCED_ENDED_THRESHOLD: 8e-4,
    ADAPTATION_SWITCH_BUFFER_PADDINGS: {
      video: { before: 5, after: 5 },
      audio: { before: 2, after: 2.5 },
      text: { before: 0, after: 0 },
      image: { before: 0, after: 0 }
    },
    SOURCE_BUFFER_FLUSHING_INTERVAL: 500,
    CONTENT_REPLACEMENT_PADDING: 1.2,
    CACHE_LOAD_DURATION_THRESHOLDS: {
      video: 50,
      audio: 10
    },
    STREAM_EVENT_EMITTER_POLL_INTERVAL: 250,
    DEFAULT_MAXIMUM_TIME_ROUNDING_ERROR: 1 / 1e3,
    BUFFERED_HISTORY_RETENTION_TIME: 6e4,
    BUFFERED_HISTORY_MAXIMUM_ENTRIES: 200,
    MIN_BUFFER_AHEAD: 5,
    UPTO_CURRENT_POSITION_CLEANUP: 5
  };
  var default_config_default = DEFAULT_CONFIG;

  // src/common/utils/deep_merge.ts
  init_define_ENVIRONMENT();

  // src/common/utils/object_assign.ts
  init_define_ENVIRONMENT();
  function objectAssign(target, ...sources) {
    if (target === null || target === void 0) {
      throw new TypeError("Cannot convert undefined or null to object");
    }
    const to = Object(target);
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          to[key] = source[key];
        }
      }
    }
    return to;
  }
  var object_assign_default = typeof Object.assign === "function" ? Object.assign : objectAssign;

  // src/common/utils/deep_merge.ts
  function isObject(item) {
    return item !== null && item !== void 0 && !Array.isArray(item) && typeof item === "object";
  }
  function deepMerge(target, ...sources) {
    if (sources.length === 0) {
      return target;
    }
    const source = sources.shift();
    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (target[key] === void 0) {
            object_assign_default(target, { [key]: {} });
          }
          const newTarget = target[key];
          deepMerge(newTarget, source[key]);
        } else {
          object_assign_default(target, { [key]: source[key] });
        }
      }
    }
    return deepMerge(target, ...sources);
  }

  // src/common/config.ts
  var ConfigHandler = class {
    _config = default_config_default;
    update(config2) {
      const newConfig = deepMerge(this._config, config2);
      this._config = newConfig;
    }
    getCurrent() {
      return this._config;
    }
  };
  var configHandler = new ConfigHandler();
  var config_default = configHandler;

  // src/common/log.ts
  init_define_ENVIRONMENT();

  // src/common/utils/logger.ts
  init_define_ENVIRONMENT();

  // src/common/utils/noop.ts
  init_define_ENVIRONMENT();
  function noop_default() {
  }

  // src/common/utils/logger.ts
  var DEFAULT_LOG_LEVEL = "NONE";
  var Logger = class {
    error;
    warn;
    info;
    debug;
    _currentLevel;
    _levels;
    constructor() {
      this.error = noop_default;
      this.warn = noop_default;
      this.info = noop_default;
      this.debug = noop_default;
      this._levels = {
        NONE: 0,
        ERROR: 1,
        WARNING: 2,
        INFO: 3,
        DEBUG: 4
      };
      this._currentLevel = DEFAULT_LOG_LEVEL;
    }
    setLevel(levelStr) {
      let level;
      const foundLevel = this._levels[levelStr];
      if (typeof foundLevel === "number") {
        level = foundLevel;
        this._currentLevel = levelStr;
      } else {
        level = 0;
        this._currentLevel = "NONE";
      }
      this.error = level >= this._levels.ERROR ? console.error.bind(console) : noop_default;
      this.warn = level >= this._levels.WARNING ? console.warn.bind(console) : noop_default;
      this.info = level >= this._levels.INFO ? console.info.bind(console) : noop_default;
      this.debug = level >= this._levels.DEBUG ? console.log.bind(console) : noop_default;
    }
    getLevel() {
      return this._currentLevel;
    }
    hasLevel(logLevel) {
      return this._levels[logLevel] >= this._levels[this._currentLevel];
    }
  };

  // src/common/log.ts
  var logger = new Logger();
  var log_default = logger;

  // src/common/utils/ranges.ts
  init_define_ENVIRONMENT();
  var EPSILON = 1 / 60;
  function getRange(timeRanges, time) {
    for (let i = timeRanges.length - 1; i >= 0; i--) {
      const start = timeRanges.start(i);
      if (time >= start) {
        const end = timeRanges.end(i);
        if (time < end) {
          return {
            start,
            end
          };
        }
      }
    }
    return null;
  }
  function getSizeOfRange(timeRanges, currentTime) {
    const range = getRange(timeRanges, currentTime);
    return range !== null ? range.end - range.start : 0;
  }
  function getPlayedSizeOfRange(timeRanges, currentTime) {
    const range = getRange(timeRanges, currentTime);
    return range !== null ? currentTime - range.start : 0;
  }
  function getLeftSizeOfRange(timeRanges, currentTime) {
    const range = getRange(timeRanges, currentTime);
    return range !== null ? range.end - currentTime : Infinity;
  }

  // src/common/utils/reference.ts
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/index.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/Observable.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/Subscriber.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/node_modules/tslib/modules/index.js
  init_define_ENVIRONMENT();
  var import_tslib = __toESM(require_tslib(), 1);
  var {
    __extends,
    __assign,
    __rest,
    __decorate,
    __param,
    __metadata,
    __awaiter,
    __generator,
    __exportStar,
    __createBinding,
    __values,
    __read,
    __spread,
    __spreadArrays,
    __spreadArray,
    __await,
    __asyncGenerator,
    __asyncDelegator,
    __asyncValues,
    __makeTemplateObject,
    __importStar,
    __importDefault,
    __classPrivateFieldGet,
    __classPrivateFieldSet
  } = import_tslib.default;

  // node_modules/rxjs/dist/esm5/internal/util/isFunction.js
  init_define_ENVIRONMENT();
  function isFunction(value) {
    return typeof value === "function";
  }

  // node_modules/rxjs/dist/esm5/internal/Subscription.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/UnsubscriptionError.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js
  init_define_ENVIRONMENT();
  function createErrorClass(createImpl) {
    var _super = function(instance) {
      Error.call(instance);
      instance.stack = new Error().stack;
    };
    var ctorFunc = createImpl(_super);
    ctorFunc.prototype = Object.create(Error.prototype);
    ctorFunc.prototype.constructor = ctorFunc;
    return ctorFunc;
  }

  // node_modules/rxjs/dist/esm5/internal/util/UnsubscriptionError.js
  var UnsubscriptionError = createErrorClass(function(_super) {
    return function UnsubscriptionErrorImpl(errors) {
      _super(this);
      this.message = errors ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function(err, i) {
        return i + 1 + ") " + err.toString();
      }).join("\n  ") : "";
      this.name = "UnsubscriptionError";
      this.errors = errors;
    };
  });

  // node_modules/rxjs/dist/esm5/internal/util/arrRemove.js
  init_define_ENVIRONMENT();
  function arrRemove(arr, item) {
    if (arr) {
      var index = arr.indexOf(item);
      0 <= index && arr.splice(index, 1);
    }
  }

  // node_modules/rxjs/dist/esm5/internal/Subscription.js
  var Subscription = function() {
    function Subscription3(initialTeardown) {
      this.initialTeardown = initialTeardown;
      this.closed = false;
      this._parentage = null;
      this._teardowns = null;
    }
    Subscription3.prototype.unsubscribe = function() {
      var e_1, _a, e_2, _b;
      var errors;
      if (!this.closed) {
        this.closed = true;
        var _parentage = this._parentage;
        if (_parentage) {
          this._parentage = null;
          if (Array.isArray(_parentage)) {
            try {
              for (var _parentage_1 = __values(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
                var parent_1 = _parentage_1_1.value;
                parent_1.remove(this);
              }
            } catch (e_1_1) {
              e_1 = { error: e_1_1 };
            } finally {
              try {
                if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return))
                  _a.call(_parentage_1);
              } finally {
                if (e_1)
                  throw e_1.error;
              }
            }
          } else {
            _parentage.remove(this);
          }
        }
        var initialTeardown = this.initialTeardown;
        if (isFunction(initialTeardown)) {
          try {
            initialTeardown();
          } catch (e) {
            errors = e instanceof UnsubscriptionError ? e.errors : [e];
          }
        }
        var _teardowns = this._teardowns;
        if (_teardowns) {
          this._teardowns = null;
          try {
            for (var _teardowns_1 = __values(_teardowns), _teardowns_1_1 = _teardowns_1.next(); !_teardowns_1_1.done; _teardowns_1_1 = _teardowns_1.next()) {
              var teardown_1 = _teardowns_1_1.value;
              try {
                execTeardown(teardown_1);
              } catch (err) {
                errors = errors !== null && errors !== void 0 ? errors : [];
                if (err instanceof UnsubscriptionError) {
                  errors = __spreadArray(__spreadArray([], __read(errors)), __read(err.errors));
                } else {
                  errors.push(err);
                }
              }
            }
          } catch (e_2_1) {
            e_2 = { error: e_2_1 };
          } finally {
            try {
              if (_teardowns_1_1 && !_teardowns_1_1.done && (_b = _teardowns_1.return))
                _b.call(_teardowns_1);
            } finally {
              if (e_2)
                throw e_2.error;
            }
          }
        }
        if (errors) {
          throw new UnsubscriptionError(errors);
        }
      }
    };
    Subscription3.prototype.add = function(teardown) {
      var _a;
      if (teardown && teardown !== this) {
        if (this.closed) {
          execTeardown(teardown);
        } else {
          if (teardown instanceof Subscription3) {
            if (teardown.closed || teardown._hasParent(this)) {
              return;
            }
            teardown._addParent(this);
          }
          (this._teardowns = (_a = this._teardowns) !== null && _a !== void 0 ? _a : []).push(teardown);
        }
      }
    };
    Subscription3.prototype._hasParent = function(parent) {
      var _parentage = this._parentage;
      return _parentage === parent || Array.isArray(_parentage) && _parentage.includes(parent);
    };
    Subscription3.prototype._addParent = function(parent) {
      var _parentage = this._parentage;
      this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
    };
    Subscription3.prototype._removeParent = function(parent) {
      var _parentage = this._parentage;
      if (_parentage === parent) {
        this._parentage = null;
      } else if (Array.isArray(_parentage)) {
        arrRemove(_parentage, parent);
      }
    };
    Subscription3.prototype.remove = function(teardown) {
      var _teardowns = this._teardowns;
      _teardowns && arrRemove(_teardowns, teardown);
      if (teardown instanceof Subscription3) {
        teardown._removeParent(this);
      }
    };
    Subscription3.EMPTY = function() {
      var empty = new Subscription3();
      empty.closed = true;
      return empty;
    }();
    return Subscription3;
  }();
  var EMPTY_SUBSCRIPTION = Subscription.EMPTY;
  function isSubscription(value) {
    return value instanceof Subscription || value && "closed" in value && isFunction(value.remove) && isFunction(value.add) && isFunction(value.unsubscribe);
  }
  function execTeardown(teardown) {
    if (isFunction(teardown)) {
      teardown();
    } else {
      teardown.unsubscribe();
    }
  }

  // node_modules/rxjs/dist/esm5/internal/config.js
  init_define_ENVIRONMENT();
  var config = {
    onUnhandledError: null,
    onStoppedNotification: null,
    Promise: void 0,
    useDeprecatedSynchronousErrorHandling: false,
    useDeprecatedNextContext: false
  };

  // node_modules/rxjs/dist/esm5/internal/util/reportUnhandledError.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/scheduler/timeoutProvider.js
  init_define_ENVIRONMENT();
  var timeoutProvider = {
    setTimeout: function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      var delegate = timeoutProvider.delegate;
      return ((delegate === null || delegate === void 0 ? void 0 : delegate.setTimeout) || setTimeout).apply(void 0, __spreadArray([], __read(args)));
    },
    clearTimeout: function(handle) {
      var delegate = timeoutProvider.delegate;
      return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
    },
    delegate: void 0
  };

  // node_modules/rxjs/dist/esm5/internal/util/reportUnhandledError.js
  function reportUnhandledError(err) {
    timeoutProvider.setTimeout(function() {
      var onUnhandledError = config.onUnhandledError;
      if (onUnhandledError) {
        onUnhandledError(err);
      } else {
        throw err;
      }
    });
  }

  // node_modules/rxjs/dist/esm5/internal/util/noop.js
  init_define_ENVIRONMENT();
  function noop() {
  }

  // node_modules/rxjs/dist/esm5/internal/NotificationFactories.js
  init_define_ENVIRONMENT();
  var COMPLETE_NOTIFICATION = function() {
    return createNotification("C", void 0, void 0);
  }();
  function errorNotification(error) {
    return createNotification("E", void 0, error);
  }
  function nextNotification(value) {
    return createNotification("N", value, void 0);
  }
  function createNotification(kind, value, error) {
    return {
      kind,
      value,
      error
    };
  }

  // node_modules/rxjs/dist/esm5/internal/util/errorContext.js
  init_define_ENVIRONMENT();
  var context = null;
  function errorContext(cb) {
    if (config.useDeprecatedSynchronousErrorHandling) {
      var isRoot = !context;
      if (isRoot) {
        context = { errorThrown: false, error: null };
      }
      cb();
      if (isRoot) {
        var _a = context, errorThrown = _a.errorThrown, error = _a.error;
        context = null;
        if (errorThrown) {
          throw error;
        }
      }
    } else {
      cb();
    }
  }
  function captureError(err) {
    if (config.useDeprecatedSynchronousErrorHandling && context) {
      context.errorThrown = true;
      context.error = err;
    }
  }

  // node_modules/rxjs/dist/esm5/internal/Subscriber.js
  var Subscriber = function(_super) {
    __extends(Subscriber3, _super);
    function Subscriber3(destination) {
      var _this = _super.call(this) || this;
      _this.isStopped = false;
      if (destination) {
        _this.destination = destination;
        if (isSubscription(destination)) {
          destination.add(_this);
        }
      } else {
        _this.destination = EMPTY_OBSERVER;
      }
      return _this;
    }
    Subscriber3.create = function(next, error, complete) {
      return new SafeSubscriber(next, error, complete);
    };
    Subscriber3.prototype.next = function(value) {
      if (this.isStopped) {
        handleStoppedNotification(nextNotification(value), this);
      } else {
        this._next(value);
      }
    };
    Subscriber3.prototype.error = function(err) {
      if (this.isStopped) {
        handleStoppedNotification(errorNotification(err), this);
      } else {
        this.isStopped = true;
        this._error(err);
      }
    };
    Subscriber3.prototype.complete = function() {
      if (this.isStopped) {
        handleStoppedNotification(COMPLETE_NOTIFICATION, this);
      } else {
        this.isStopped = true;
        this._complete();
      }
    };
    Subscriber3.prototype.unsubscribe = function() {
      if (!this.closed) {
        this.isStopped = true;
        _super.prototype.unsubscribe.call(this);
        this.destination = null;
      }
    };
    Subscriber3.prototype._next = function(value) {
      this.destination.next(value);
    };
    Subscriber3.prototype._error = function(err) {
      try {
        this.destination.error(err);
      } finally {
        this.unsubscribe();
      }
    };
    Subscriber3.prototype._complete = function() {
      try {
        this.destination.complete();
      } finally {
        this.unsubscribe();
      }
    };
    return Subscriber3;
  }(Subscription);
  var SafeSubscriber = function(_super) {
    __extends(SafeSubscriber2, _super);
    function SafeSubscriber2(observerOrNext, error, complete) {
      var _this = _super.call(this) || this;
      var next;
      if (isFunction(observerOrNext)) {
        next = observerOrNext;
      } else if (observerOrNext) {
        next = observerOrNext.next, error = observerOrNext.error, complete = observerOrNext.complete;
        var context_1;
        if (_this && config.useDeprecatedNextContext) {
          context_1 = Object.create(observerOrNext);
          context_1.unsubscribe = function() {
            return _this.unsubscribe();
          };
        } else {
          context_1 = observerOrNext;
        }
        next = next === null || next === void 0 ? void 0 : next.bind(context_1);
        error = error === null || error === void 0 ? void 0 : error.bind(context_1);
        complete = complete === null || complete === void 0 ? void 0 : complete.bind(context_1);
      }
      _this.destination = {
        next: next ? wrapForErrorHandling(next, _this) : noop,
        error: wrapForErrorHandling(error !== null && error !== void 0 ? error : defaultErrorHandler, _this),
        complete: complete ? wrapForErrorHandling(complete, _this) : noop
      };
      return _this;
    }
    return SafeSubscriber2;
  }(Subscriber);
  function wrapForErrorHandling(handler, instance) {
    return function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      try {
        handler.apply(void 0, __spreadArray([], __read(args)));
      } catch (err) {
        if (config.useDeprecatedSynchronousErrorHandling) {
          captureError(err);
        } else {
          reportUnhandledError(err);
        }
      }
    };
  }
  function defaultErrorHandler(err) {
    throw err;
  }
  function handleStoppedNotification(notification, subscriber) {
    var onStoppedNotification = config.onStoppedNotification;
    onStoppedNotification && timeoutProvider.setTimeout(function() {
      return onStoppedNotification(notification, subscriber);
    });
  }
  var EMPTY_OBSERVER = {
    closed: true,
    next: noop,
    error: defaultErrorHandler,
    complete: noop
  };

  // node_modules/rxjs/dist/esm5/internal/symbol/observable.js
  init_define_ENVIRONMENT();
  var observable = function() {
    return typeof Symbol === "function" && Symbol.observable || "@@observable";
  }();

  // node_modules/rxjs/dist/esm5/internal/util/pipe.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/identity.js
  init_define_ENVIRONMENT();
  function identity(x) {
    return x;
  }

  // node_modules/rxjs/dist/esm5/internal/util/pipe.js
  function pipeFromArray(fns) {
    if (fns.length === 0) {
      return identity;
    }
    if (fns.length === 1) {
      return fns[0];
    }
    return function piped(input) {
      return fns.reduce(function(prev, fn) {
        return fn(prev);
      }, input);
    };
  }

  // node_modules/rxjs/dist/esm5/internal/Observable.js
  var Observable = function() {
    function Observable13(subscribe) {
      if (subscribe) {
        this._subscribe = subscribe;
      }
    }
    Observable13.prototype.lift = function(operator) {
      var observable2 = new Observable13();
      observable2.source = this;
      observable2.operator = operator;
      return observable2;
    };
    Observable13.prototype.subscribe = function(observerOrNext, error, complete) {
      var _this = this;
      var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
      errorContext(function() {
        var _a = _this, operator = _a.operator, source = _a.source;
        subscriber.add(operator ? operator.call(subscriber, source) : source ? _this._subscribe(subscriber) : _this._trySubscribe(subscriber));
      });
      return subscriber;
    };
    Observable13.prototype._trySubscribe = function(sink) {
      try {
        return this._subscribe(sink);
      } catch (err) {
        sink.error(err);
      }
    };
    Observable13.prototype.forEach = function(next, promiseCtor) {
      var _this = this;
      promiseCtor = getPromiseCtor(promiseCtor);
      return new promiseCtor(function(resolve, reject) {
        var subscription;
        subscription = _this.subscribe(function(value) {
          try {
            next(value);
          } catch (err) {
            reject(err);
            subscription === null || subscription === void 0 ? void 0 : subscription.unsubscribe();
          }
        }, reject, resolve);
      });
    };
    Observable13.prototype._subscribe = function(subscriber) {
      var _a;
      return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
    };
    Observable13.prototype[observable] = function() {
      return this;
    };
    Observable13.prototype.pipe = function() {
      var operations = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        operations[_i] = arguments[_i];
      }
      return pipeFromArray(operations)(this);
    };
    Observable13.prototype.toPromise = function(promiseCtor) {
      var _this = this;
      promiseCtor = getPromiseCtor(promiseCtor);
      return new promiseCtor(function(resolve, reject) {
        var value;
        _this.subscribe(function(x) {
          return value = x;
        }, function(err) {
          return reject(err);
        }, function() {
          return resolve(value);
        });
      });
    };
    Observable13.create = function(subscribe) {
      return new Observable13(subscribe);
    };
    return Observable13;
  }();
  function getPromiseCtor(promiseCtor) {
    var _a;
    return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : config.Promise) !== null && _a !== void 0 ? _a : Promise;
  }
  function isObserver(value) {
    return value && isFunction(value.next) && isFunction(value.error) && isFunction(value.complete);
  }
  function isSubscriber(value) {
    return value && value instanceof Subscriber || isObserver(value) && isSubscription(value);
  }

  // node_modules/rxjs/dist/esm5/internal/util/lift.js
  init_define_ENVIRONMENT();
  function hasLift(source) {
    return isFunction(source === null || source === void 0 ? void 0 : source.lift);
  }
  function operate(init) {
    return function(source) {
      if (hasLift(source)) {
        return source.lift(function(liftedSource) {
          try {
            return init(liftedSource, this);
          } catch (err) {
            this.error(err);
          }
        });
      }
      throw new TypeError("Unable to lift unknown Observable type");
    };
  }

  // node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js
  init_define_ENVIRONMENT();
  var OperatorSubscriber = function(_super) {
    __extends(OperatorSubscriber2, _super);
    function OperatorSubscriber2(destination, onNext, onComplete, onError, onFinalize) {
      var _this = _super.call(this, destination) || this;
      _this.onFinalize = onFinalize;
      _this._next = onNext ? function(value) {
        try {
          onNext(value);
        } catch (err) {
          destination.error(err);
        }
      } : _super.prototype._next;
      _this._error = onError ? function(err) {
        try {
          onError(err);
        } catch (err2) {
          destination.error(err2);
        } finally {
          this.unsubscribe();
        }
      } : _super.prototype._error;
      _this._complete = onComplete ? function() {
        try {
          onComplete();
        } catch (err) {
          destination.error(err);
        } finally {
          this.unsubscribe();
        }
      } : _super.prototype._complete;
      return _this;
    }
    OperatorSubscriber2.prototype.unsubscribe = function() {
      var _a;
      var closed = this.closed;
      _super.prototype.unsubscribe.call(this);
      !closed && ((_a = this.onFinalize) === null || _a === void 0 ? void 0 : _a.call(this));
    };
    return OperatorSubscriber2;
  }(Subscriber);

  // node_modules/rxjs/dist/esm5/internal/Subject.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/ObjectUnsubscribedError.js
  init_define_ENVIRONMENT();
  var ObjectUnsubscribedError = createErrorClass(function(_super) {
    return function ObjectUnsubscribedErrorImpl() {
      _super(this);
      this.name = "ObjectUnsubscribedError";
      this.message = "object unsubscribed";
    };
  });

  // node_modules/rxjs/dist/esm5/internal/Subject.js
  var Subject = function(_super) {
    __extends(Subject2, _super);
    function Subject2() {
      var _this = _super.call(this) || this;
      _this.closed = false;
      _this.observers = [];
      _this.isStopped = false;
      _this.hasError = false;
      _this.thrownError = null;
      return _this;
    }
    Subject2.prototype.lift = function(operator) {
      var subject = new AnonymousSubject(this, this);
      subject.operator = operator;
      return subject;
    };
    Subject2.prototype._throwIfClosed = function() {
      if (this.closed) {
        throw new ObjectUnsubscribedError();
      }
    };
    Subject2.prototype.next = function(value) {
      var _this = this;
      errorContext(function() {
        var e_1, _a;
        _this._throwIfClosed();
        if (!_this.isStopped) {
          var copy = _this.observers.slice();
          try {
            for (var copy_1 = __values(copy), copy_1_1 = copy_1.next(); !copy_1_1.done; copy_1_1 = copy_1.next()) {
              var observer = copy_1_1.value;
              observer.next(value);
            }
          } catch (e_1_1) {
            e_1 = { error: e_1_1 };
          } finally {
            try {
              if (copy_1_1 && !copy_1_1.done && (_a = copy_1.return))
                _a.call(copy_1);
            } finally {
              if (e_1)
                throw e_1.error;
            }
          }
        }
      });
    };
    Subject2.prototype.error = function(err) {
      var _this = this;
      errorContext(function() {
        _this._throwIfClosed();
        if (!_this.isStopped) {
          _this.hasError = _this.isStopped = true;
          _this.thrownError = err;
          var observers = _this.observers;
          while (observers.length) {
            observers.shift().error(err);
          }
        }
      });
    };
    Subject2.prototype.complete = function() {
      var _this = this;
      errorContext(function() {
        _this._throwIfClosed();
        if (!_this.isStopped) {
          _this.isStopped = true;
          var observers = _this.observers;
          while (observers.length) {
            observers.shift().complete();
          }
        }
      });
    };
    Subject2.prototype.unsubscribe = function() {
      this.isStopped = this.closed = true;
      this.observers = null;
    };
    Object.defineProperty(Subject2.prototype, "observed", {
      get: function() {
        var _a;
        return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
      },
      enumerable: false,
      configurable: true
    });
    Subject2.prototype._trySubscribe = function(subscriber) {
      this._throwIfClosed();
      return _super.prototype._trySubscribe.call(this, subscriber);
    };
    Subject2.prototype._subscribe = function(subscriber) {
      this._throwIfClosed();
      this._checkFinalizedStatuses(subscriber);
      return this._innerSubscribe(subscriber);
    };
    Subject2.prototype._innerSubscribe = function(subscriber) {
      var _a = this, hasError = _a.hasError, isStopped = _a.isStopped, observers = _a.observers;
      return hasError || isStopped ? EMPTY_SUBSCRIPTION : (observers.push(subscriber), new Subscription(function() {
        return arrRemove(observers, subscriber);
      }));
    };
    Subject2.prototype._checkFinalizedStatuses = function(subscriber) {
      var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, isStopped = _a.isStopped;
      if (hasError) {
        subscriber.error(thrownError);
      } else if (isStopped) {
        subscriber.complete();
      }
    };
    Subject2.prototype.asObservable = function() {
      var observable2 = new Observable();
      observable2.source = this;
      return observable2;
    };
    Subject2.create = function(destination, source) {
      return new AnonymousSubject(destination, source);
    };
    return Subject2;
  }(Observable);
  var AnonymousSubject = function(_super) {
    __extends(AnonymousSubject2, _super);
    function AnonymousSubject2(destination, source) {
      var _this = _super.call(this) || this;
      _this.destination = destination;
      _this.source = source;
      return _this;
    }
    AnonymousSubject2.prototype.next = function(value) {
      var _a, _b;
      (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0 ? void 0 : _b.call(_a, value);
    };
    AnonymousSubject2.prototype.error = function(err) {
      var _a, _b;
      (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err);
    };
    AnonymousSubject2.prototype.complete = function() {
      var _a, _b;
      (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0 ? void 0 : _b.call(_a);
    };
    AnonymousSubject2.prototype._subscribe = function(subscriber) {
      var _a, _b;
      return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null && _b !== void 0 ? _b : EMPTY_SUBSCRIPTION;
    };
    return AnonymousSubject2;
  }(Subject);

  // node_modules/rxjs/dist/esm5/internal/ReplaySubject.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/scheduler/dateTimestampProvider.js
  init_define_ENVIRONMENT();
  var dateTimestampProvider = {
    now: function() {
      return (dateTimestampProvider.delegate || Date).now();
    },
    delegate: void 0
  };

  // node_modules/rxjs/dist/esm5/internal/ReplaySubject.js
  var ReplaySubject = function(_super) {
    __extends(ReplaySubject2, _super);
    function ReplaySubject2(_bufferSize, _windowTime, _timestampProvider) {
      if (_bufferSize === void 0) {
        _bufferSize = Infinity;
      }
      if (_windowTime === void 0) {
        _windowTime = Infinity;
      }
      if (_timestampProvider === void 0) {
        _timestampProvider = dateTimestampProvider;
      }
      var _this = _super.call(this) || this;
      _this._bufferSize = _bufferSize;
      _this._windowTime = _windowTime;
      _this._timestampProvider = _timestampProvider;
      _this._buffer = [];
      _this._infiniteTimeWindow = true;
      _this._infiniteTimeWindow = _windowTime === Infinity;
      _this._bufferSize = Math.max(1, _bufferSize);
      _this._windowTime = Math.max(1, _windowTime);
      return _this;
    }
    ReplaySubject2.prototype.next = function(value) {
      var _a = this, isStopped = _a.isStopped, _buffer = _a._buffer, _infiniteTimeWindow = _a._infiniteTimeWindow, _timestampProvider = _a._timestampProvider, _windowTime = _a._windowTime;
      if (!isStopped) {
        _buffer.push(value);
        !_infiniteTimeWindow && _buffer.push(_timestampProvider.now() + _windowTime);
      }
      this._trimBuffer();
      _super.prototype.next.call(this, value);
    };
    ReplaySubject2.prototype._subscribe = function(subscriber) {
      this._throwIfClosed();
      this._trimBuffer();
      var subscription = this._innerSubscribe(subscriber);
      var _a = this, _infiniteTimeWindow = _a._infiniteTimeWindow, _buffer = _a._buffer;
      var copy = _buffer.slice();
      for (var i = 0; i < copy.length && !subscriber.closed; i += _infiniteTimeWindow ? 1 : 2) {
        subscriber.next(copy[i]);
      }
      this._checkFinalizedStatuses(subscriber);
      return subscription;
    };
    ReplaySubject2.prototype._trimBuffer = function() {
      var _a = this, _bufferSize = _a._bufferSize, _timestampProvider = _a._timestampProvider, _buffer = _a._buffer, _infiniteTimeWindow = _a._infiniteTimeWindow;
      var adjustedBufferSize = (_infiniteTimeWindow ? 1 : 2) * _bufferSize;
      _bufferSize < Infinity && adjustedBufferSize < _buffer.length && _buffer.splice(0, _buffer.length - adjustedBufferSize);
      if (!_infiniteTimeWindow) {
        var now = _timestampProvider.now();
        var last2 = 0;
        for (var i = 1; i < _buffer.length && _buffer[i] <= now; i += 2) {
          last2 = i;
        }
        last2 && _buffer.splice(0, last2 + 1);
      }
    };
    return ReplaySubject2;
  }(Subject);

  // node_modules/rxjs/dist/esm5/internal/scheduler/AsyncAction.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/scheduler/Action.js
  init_define_ENVIRONMENT();
  var Action = function(_super) {
    __extends(Action2, _super);
    function Action2(scheduler, work) {
      return _super.call(this) || this;
    }
    Action2.prototype.schedule = function(state, delay) {
      if (delay === void 0) {
        delay = 0;
      }
      return this;
    };
    return Action2;
  }(Subscription);

  // node_modules/rxjs/dist/esm5/internal/scheduler/intervalProvider.js
  init_define_ENVIRONMENT();
  var intervalProvider = {
    setInterval: function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      var delegate = intervalProvider.delegate;
      return ((delegate === null || delegate === void 0 ? void 0 : delegate.setInterval) || setInterval).apply(void 0, __spreadArray([], __read(args)));
    },
    clearInterval: function(handle) {
      var delegate = intervalProvider.delegate;
      return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearInterval) || clearInterval)(handle);
    },
    delegate: void 0
  };

  // node_modules/rxjs/dist/esm5/internal/scheduler/AsyncAction.js
  var AsyncAction = function(_super) {
    __extends(AsyncAction2, _super);
    function AsyncAction2(scheduler, work) {
      var _this = _super.call(this, scheduler, work) || this;
      _this.scheduler = scheduler;
      _this.work = work;
      _this.pending = false;
      return _this;
    }
    AsyncAction2.prototype.schedule = function(state, delay) {
      if (delay === void 0) {
        delay = 0;
      }
      if (this.closed) {
        return this;
      }
      this.state = state;
      var id = this.id;
      var scheduler = this.scheduler;
      if (id != null) {
        this.id = this.recycleAsyncId(scheduler, id, delay);
      }
      this.pending = true;
      this.delay = delay;
      this.id = this.id || this.requestAsyncId(scheduler, this.id, delay);
      return this;
    };
    AsyncAction2.prototype.requestAsyncId = function(scheduler, _id, delay) {
      if (delay === void 0) {
        delay = 0;
      }
      return intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay);
    };
    AsyncAction2.prototype.recycleAsyncId = function(_scheduler, id, delay) {
      if (delay === void 0) {
        delay = 0;
      }
      if (delay != null && this.delay === delay && this.pending === false) {
        return id;
      }
      intervalProvider.clearInterval(id);
      return void 0;
    };
    AsyncAction2.prototype.execute = function(state, delay) {
      if (this.closed) {
        return new Error("executing a cancelled action");
      }
      this.pending = false;
      var error = this._execute(state, delay);
      if (error) {
        return error;
      } else if (this.pending === false && this.id != null) {
        this.id = this.recycleAsyncId(this.scheduler, this.id, null);
      }
    };
    AsyncAction2.prototype._execute = function(state, _delay) {
      var errored = false;
      var errorValue;
      try {
        this.work(state);
      } catch (e) {
        errored = true;
        errorValue = e ? e : new Error("Scheduled action threw falsy error");
      }
      if (errored) {
        this.unsubscribe();
        return errorValue;
      }
    };
    AsyncAction2.prototype.unsubscribe = function() {
      if (!this.closed) {
        var _a = this, id = _a.id, scheduler = _a.scheduler;
        var actions = scheduler.actions;
        this.work = this.state = this.scheduler = null;
        this.pending = false;
        arrRemove(actions, this);
        if (id != null) {
          this.id = this.recycleAsyncId(scheduler, id, null);
        }
        this.delay = null;
        _super.prototype.unsubscribe.call(this);
      }
    };
    return AsyncAction2;
  }(Action);

  // node_modules/rxjs/dist/esm5/internal/scheduler/AsyncScheduler.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/Scheduler.js
  init_define_ENVIRONMENT();
  var Scheduler = function() {
    function Scheduler2(schedulerActionCtor, now) {
      if (now === void 0) {
        now = Scheduler2.now;
      }
      this.schedulerActionCtor = schedulerActionCtor;
      this.now = now;
    }
    Scheduler2.prototype.schedule = function(work, delay, state) {
      if (delay === void 0) {
        delay = 0;
      }
      return new this.schedulerActionCtor(this, work).schedule(state, delay);
    };
    Scheduler2.now = dateTimestampProvider.now;
    return Scheduler2;
  }();

  // node_modules/rxjs/dist/esm5/internal/scheduler/AsyncScheduler.js
  var AsyncScheduler = function(_super) {
    __extends(AsyncScheduler2, _super);
    function AsyncScheduler2(SchedulerAction, now) {
      if (now === void 0) {
        now = Scheduler.now;
      }
      var _this = _super.call(this, SchedulerAction, now) || this;
      _this.actions = [];
      _this._active = false;
      _this._scheduled = void 0;
      return _this;
    }
    AsyncScheduler2.prototype.flush = function(action) {
      var actions = this.actions;
      if (this._active) {
        actions.push(action);
        return;
      }
      var error;
      this._active = true;
      do {
        if (error = action.execute(action.state, action.delay)) {
          break;
        }
      } while (action = actions.shift());
      this._active = false;
      if (error) {
        while (action = actions.shift()) {
          action.unsubscribe();
        }
        throw error;
      }
    };
    return AsyncScheduler2;
  }(Scheduler);

  // node_modules/rxjs/dist/esm5/internal/scheduler/async.js
  init_define_ENVIRONMENT();
  var asyncScheduler = new AsyncScheduler(AsyncAction);
  var async = asyncScheduler;

  // node_modules/rxjs/dist/esm5/internal/observable/empty.js
  init_define_ENVIRONMENT();
  var EMPTY = new Observable(function(subscriber) {
    return subscriber.complete();
  });

  // node_modules/rxjs/dist/esm5/internal/observable/of.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/args.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/isScheduler.js
  init_define_ENVIRONMENT();
  function isScheduler(value) {
    return value && isFunction(value.schedule);
  }

  // node_modules/rxjs/dist/esm5/internal/util/args.js
  function last(arr) {
    return arr[arr.length - 1];
  }
  function popResultSelector(args) {
    return isFunction(last(args)) ? args.pop() : void 0;
  }
  function popScheduler(args) {
    return isScheduler(last(args)) ? args.pop() : void 0;
  }
  function popNumber(args, defaultValue) {
    return typeof last(args) === "number" ? args.pop() : defaultValue;
  }

  // node_modules/rxjs/dist/esm5/internal/observable/from.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduled.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleObservable.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/observable/innerFrom.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/isArrayLike.js
  init_define_ENVIRONMENT();
  var isArrayLike = function(x) {
    return x && typeof x.length === "number" && typeof x !== "function";
  };

  // node_modules/rxjs/dist/esm5/internal/util/isPromise.js
  init_define_ENVIRONMENT();
  function isPromise(value) {
    return isFunction(value === null || value === void 0 ? void 0 : value.then);
  }

  // node_modules/rxjs/dist/esm5/internal/util/isInteropObservable.js
  init_define_ENVIRONMENT();
  function isInteropObservable(input) {
    return isFunction(input[observable]);
  }

  // node_modules/rxjs/dist/esm5/internal/util/isAsyncIterable.js
  init_define_ENVIRONMENT();
  function isAsyncIterable(obj) {
    return Symbol.asyncIterator && isFunction(obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]);
  }

  // node_modules/rxjs/dist/esm5/internal/util/throwUnobservableError.js
  init_define_ENVIRONMENT();
  function createInvalidObservableTypeError(input) {
    return new TypeError("You provided " + (input !== null && typeof input === "object" ? "an invalid object" : "'" + input + "'") + " where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.");
  }

  // node_modules/rxjs/dist/esm5/internal/util/isIterable.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/symbol/iterator.js
  init_define_ENVIRONMENT();
  function getSymbolIterator() {
    if (typeof Symbol !== "function" || !Symbol.iterator) {
      return "@@iterator";
    }
    return Symbol.iterator;
  }
  var iterator = getSymbolIterator();

  // node_modules/rxjs/dist/esm5/internal/util/isIterable.js
  function isIterable(input) {
    return isFunction(input === null || input === void 0 ? void 0 : input[iterator]);
  }

  // node_modules/rxjs/dist/esm5/internal/util/isReadableStreamLike.js
  init_define_ENVIRONMENT();
  function readableStreamLikeToAsyncGenerator(readableStream) {
    return __asyncGenerator(this, arguments, function readableStreamLikeToAsyncGenerator_1() {
      var reader, _a, value, done;
      return __generator(this, function(_b) {
        switch (_b.label) {
          case 0:
            reader = readableStream.getReader();
            _b.label = 1;
          case 1:
            _b.trys.push([1, , 9, 10]);
            _b.label = 2;
          case 2:
            if (false)
              return [3, 8];
            return [4, __await(reader.read())];
          case 3:
            _a = _b.sent(), value = _a.value, done = _a.done;
            if (!done)
              return [3, 5];
            return [4, __await(void 0)];
          case 4:
            return [2, _b.sent()];
          case 5:
            return [4, __await(value)];
          case 6:
            return [4, _b.sent()];
          case 7:
            _b.sent();
            return [3, 2];
          case 8:
            return [3, 10];
          case 9:
            reader.releaseLock();
            return [7];
          case 10:
            return [2];
        }
      });
    });
  }
  function isReadableStreamLike(obj) {
    return isFunction(obj === null || obj === void 0 ? void 0 : obj.getReader);
  }

  // node_modules/rxjs/dist/esm5/internal/observable/innerFrom.js
  function innerFrom(input) {
    if (input instanceof Observable) {
      return input;
    }
    if (input != null) {
      if (isInteropObservable(input)) {
        return fromInteropObservable(input);
      }
      if (isArrayLike(input)) {
        return fromArrayLike(input);
      }
      if (isPromise(input)) {
        return fromPromise(input);
      }
      if (isAsyncIterable(input)) {
        return fromAsyncIterable(input);
      }
      if (isIterable(input)) {
        return fromIterable(input);
      }
      if (isReadableStreamLike(input)) {
        return fromReadableStreamLike(input);
      }
    }
    throw createInvalidObservableTypeError(input);
  }
  function fromInteropObservable(obj) {
    return new Observable(function(subscriber) {
      var obs = obj[observable]();
      if (isFunction(obs.subscribe)) {
        return obs.subscribe(subscriber);
      }
      throw new TypeError("Provided object does not correctly implement Symbol.observable");
    });
  }
  function fromArrayLike(array) {
    return new Observable(function(subscriber) {
      for (var i = 0; i < array.length && !subscriber.closed; i++) {
        subscriber.next(array[i]);
      }
      subscriber.complete();
    });
  }
  function fromPromise(promise) {
    return new Observable(function(subscriber) {
      promise.then(function(value) {
        if (!subscriber.closed) {
          subscriber.next(value);
          subscriber.complete();
        }
      }, function(err) {
        return subscriber.error(err);
      }).then(null, reportUnhandledError);
    });
  }
  function fromIterable(iterable) {
    return new Observable(function(subscriber) {
      var e_1, _a;
      try {
        for (var iterable_1 = __values(iterable), iterable_1_1 = iterable_1.next(); !iterable_1_1.done; iterable_1_1 = iterable_1.next()) {
          var value = iterable_1_1.value;
          subscriber.next(value);
          if (subscriber.closed) {
            return;
          }
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (iterable_1_1 && !iterable_1_1.done && (_a = iterable_1.return))
            _a.call(iterable_1);
        } finally {
          if (e_1)
            throw e_1.error;
        }
      }
      subscriber.complete();
    });
  }
  function fromAsyncIterable(asyncIterable) {
    return new Observable(function(subscriber) {
      process2(asyncIterable, subscriber).catch(function(err) {
        return subscriber.error(err);
      });
    });
  }
  function fromReadableStreamLike(readableStream) {
    return fromAsyncIterable(readableStreamLikeToAsyncGenerator(readableStream));
  }
  function process2(asyncIterable, subscriber) {
    var asyncIterable_1, asyncIterable_1_1;
    var e_2, _a;
    return __awaiter(this, void 0, void 0, function() {
      var value, e_2_1;
      return __generator(this, function(_b) {
        switch (_b.label) {
          case 0:
            _b.trys.push([0, 5, 6, 11]);
            asyncIterable_1 = __asyncValues(asyncIterable);
            _b.label = 1;
          case 1:
            return [4, asyncIterable_1.next()];
          case 2:
            if (!(asyncIterable_1_1 = _b.sent(), !asyncIterable_1_1.done))
              return [3, 4];
            value = asyncIterable_1_1.value;
            subscriber.next(value);
            if (subscriber.closed) {
              return [2];
            }
            _b.label = 3;
          case 3:
            return [3, 1];
          case 4:
            return [3, 11];
          case 5:
            e_2_1 = _b.sent();
            e_2 = { error: e_2_1 };
            return [3, 11];
          case 6:
            _b.trys.push([6, , 9, 10]);
            if (!(asyncIterable_1_1 && !asyncIterable_1_1.done && (_a = asyncIterable_1.return)))
              return [3, 8];
            return [4, _a.call(asyncIterable_1)];
          case 7:
            _b.sent();
            _b.label = 8;
          case 8:
            return [3, 10];
          case 9:
            if (e_2)
              throw e_2.error;
            return [7];
          case 10:
            return [7];
          case 11:
            subscriber.complete();
            return [2];
        }
      });
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/observeOn.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/executeSchedule.js
  init_define_ENVIRONMENT();
  function executeSchedule(parentSubscription, scheduler, work, delay, repeat) {
    if (delay === void 0) {
      delay = 0;
    }
    if (repeat === void 0) {
      repeat = false;
    }
    var scheduleSubscription = scheduler.schedule(function() {
      work();
      if (repeat) {
        parentSubscription.add(this.schedule(null, delay));
      } else {
        this.unsubscribe();
      }
    }, delay);
    parentSubscription.add(scheduleSubscription);
    if (!repeat) {
      return scheduleSubscription;
    }
  }

  // node_modules/rxjs/dist/esm5/internal/operators/observeOn.js
  function observeOn(scheduler, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    return operate(function(source, subscriber) {
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        return executeSchedule(subscriber, scheduler, function() {
          return subscriber.next(value);
        }, delay);
      }, function() {
        return executeSchedule(subscriber, scheduler, function() {
          return subscriber.complete();
        }, delay);
      }, function(err) {
        return executeSchedule(subscriber, scheduler, function() {
          return subscriber.error(err);
        }, delay);
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/subscribeOn.js
  init_define_ENVIRONMENT();
  function subscribeOn(scheduler, delay) {
    if (delay === void 0) {
      delay = 0;
    }
    return operate(function(source, subscriber) {
      subscriber.add(scheduler.schedule(function() {
        return source.subscribe(subscriber);
      }, delay));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleObservable.js
  function scheduleObservable(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/schedulePromise.js
  init_define_ENVIRONMENT();
  function schedulePromise(input, scheduler) {
    return innerFrom(input).pipe(subscribeOn(scheduler), observeOn(scheduler));
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleArray.js
  init_define_ENVIRONMENT();
  function scheduleArray(input, scheduler) {
    return new Observable(function(subscriber) {
      var i = 0;
      return scheduler.schedule(function() {
        if (i === input.length) {
          subscriber.complete();
        } else {
          subscriber.next(input[i++]);
          if (!subscriber.closed) {
            this.schedule();
          }
        }
      });
    });
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleIterable.js
  init_define_ENVIRONMENT();
  function scheduleIterable(input, scheduler) {
    return new Observable(function(subscriber) {
      var iterator2;
      executeSchedule(subscriber, scheduler, function() {
        iterator2 = input[iterator]();
        executeSchedule(subscriber, scheduler, function() {
          var _a;
          var value;
          var done;
          try {
            _a = iterator2.next(), value = _a.value, done = _a.done;
          } catch (err) {
            subscriber.error(err);
            return;
          }
          if (done) {
            subscriber.complete();
          } else {
            subscriber.next(value);
          }
        }, 0, true);
      });
      return function() {
        return isFunction(iterator2 === null || iterator2 === void 0 ? void 0 : iterator2.return) && iterator2.return();
      };
    });
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleAsyncIterable.js
  init_define_ENVIRONMENT();
  function scheduleAsyncIterable(input, scheduler) {
    if (!input) {
      throw new Error("Iterable cannot be null");
    }
    return new Observable(function(subscriber) {
      executeSchedule(subscriber, scheduler, function() {
        var iterator2 = input[Symbol.asyncIterator]();
        executeSchedule(subscriber, scheduler, function() {
          iterator2.next().then(function(result) {
            if (result.done) {
              subscriber.complete();
            } else {
              subscriber.next(result.value);
            }
          });
        }, 0, true);
      });
    });
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduleReadableStreamLike.js
  init_define_ENVIRONMENT();
  function scheduleReadableStreamLike(input, scheduler) {
    return scheduleAsyncIterable(readableStreamLikeToAsyncGenerator(input), scheduler);
  }

  // node_modules/rxjs/dist/esm5/internal/scheduled/scheduled.js
  function scheduled(input, scheduler) {
    if (input != null) {
      if (isInteropObservable(input)) {
        return scheduleObservable(input, scheduler);
      }
      if (isArrayLike(input)) {
        return scheduleArray(input, scheduler);
      }
      if (isPromise(input)) {
        return schedulePromise(input, scheduler);
      }
      if (isAsyncIterable(input)) {
        return scheduleAsyncIterable(input, scheduler);
      }
      if (isIterable(input)) {
        return scheduleIterable(input, scheduler);
      }
      if (isReadableStreamLike(input)) {
        return scheduleReadableStreamLike(input, scheduler);
      }
    }
    throw createInvalidObservableTypeError(input);
  }

  // node_modules/rxjs/dist/esm5/internal/observable/from.js
  function from(input, scheduler) {
    return scheduler ? scheduled(input, scheduler) : innerFrom(input);
  }

  // node_modules/rxjs/dist/esm5/internal/observable/of.js
  function of() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    return from(args, scheduler);
  }

  // node_modules/rxjs/dist/esm5/internal/observable/throwError.js
  init_define_ENVIRONMENT();
  function throwError(errorOrErrorFactory, scheduler) {
    var errorFactory = isFunction(errorOrErrorFactory) ? errorOrErrorFactory : function() {
      return errorOrErrorFactory;
    };
    var init = function(subscriber) {
      return subscriber.error(errorFactory());
    };
    return new Observable(scheduler ? function(subscriber) {
      return scheduler.schedule(init, 0, subscriber);
    } : init);
  }

  // node_modules/rxjs/dist/esm5/internal/operators/timeout.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/isDate.js
  init_define_ENVIRONMENT();
  function isValidDate(value) {
    return value instanceof Date && !isNaN(value);
  }

  // node_modules/rxjs/dist/esm5/internal/operators/timeout.js
  var TimeoutError = createErrorClass(function(_super) {
    return function TimeoutErrorImpl(info) {
      if (info === void 0) {
        info = null;
      }
      _super(this);
      this.message = "Timeout has occurred";
      this.name = "TimeoutError";
      this.info = info;
    };
  });
  function timeout(config2, schedulerArg) {
    var _a = isValidDate(config2) ? { first: config2 } : typeof config2 === "number" ? { each: config2 } : config2, first = _a.first, each = _a.each, _b = _a.with, _with = _b === void 0 ? timeoutErrorFactory : _b, _c = _a.scheduler, scheduler = _c === void 0 ? schedulerArg !== null && schedulerArg !== void 0 ? schedulerArg : asyncScheduler : _c, _d = _a.meta, meta = _d === void 0 ? null : _d;
    if (first == null && each == null) {
      throw new TypeError("No timeout provided.");
    }
    return operate(function(source, subscriber) {
      var originalSourceSubscription;
      var timerSubscription;
      var lastValue = null;
      var seen = 0;
      var startTimer = function(delay) {
        timerSubscription = executeSchedule(subscriber, scheduler, function() {
          try {
            originalSourceSubscription.unsubscribe();
            innerFrom(_with({
              meta,
              lastValue,
              seen
            })).subscribe(subscriber);
          } catch (err) {
            subscriber.error(err);
          }
        }, delay);
      };
      originalSourceSubscription = source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.unsubscribe();
        seen++;
        subscriber.next(lastValue = value);
        each > 0 && startTimer(each);
      }, void 0, void 0, function() {
        if (!(timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.closed)) {
          timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.unsubscribe();
        }
        lastValue = null;
      }));
      startTimer(first != null ? typeof first === "number" ? first : +first - scheduler.now() : each);
    });
  }
  function timeoutErrorFactory(info) {
    throw new TimeoutError(info);
  }

  // node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/operators/map.js
  init_define_ENVIRONMENT();
  function map(project, thisArg) {
    return operate(function(source, subscriber) {
      var index = 0;
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        subscriber.next(project.call(thisArg, value, index++));
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js
  var isArray = Array.isArray;
  function callOrApply(fn, args) {
    return isArray(args) ? fn.apply(void 0, __spreadArray([], __read(args))) : fn(args);
  }
  function mapOneOrManyArgs(fn) {
    return map(function(args) {
      return callOrApply(fn, args);
    });
  }

  // node_modules/rxjs/dist/esm5/internal/observable/combineLatest.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/argsArgArrayOrObject.js
  init_define_ENVIRONMENT();
  var isArray2 = Array.isArray;
  var getPrototypeOf = Object.getPrototypeOf;
  var objectProto = Object.prototype;
  var getKeys = Object.keys;
  function argsArgArrayOrObject(args) {
    if (args.length === 1) {
      var first_1 = args[0];
      if (isArray2(first_1)) {
        return { args: first_1, keys: null };
      }
      if (isPOJO(first_1)) {
        var keys = getKeys(first_1);
        return {
          args: keys.map(function(key) {
            return first_1[key];
          }),
          keys
        };
      }
    }
    return { args, keys: null };
  }
  function isPOJO(obj) {
    return obj && typeof obj === "object" && getPrototypeOf(obj) === objectProto;
  }

  // node_modules/rxjs/dist/esm5/internal/util/createObject.js
  init_define_ENVIRONMENT();
  function createObject(keys, values) {
    return keys.reduce(function(result, key, i) {
      return result[key] = values[i], result;
    }, {});
  }

  // node_modules/rxjs/dist/esm5/internal/observable/combineLatest.js
  function combineLatest() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    var resultSelector = popResultSelector(args);
    var _a = argsArgArrayOrObject(args), observables = _a.args, keys = _a.keys;
    if (observables.length === 0) {
      return from([], scheduler);
    }
    var result = new Observable(combineLatestInit(observables, scheduler, keys ? function(values) {
      return createObject(keys, values);
    } : identity));
    return resultSelector ? result.pipe(mapOneOrManyArgs(resultSelector)) : result;
  }
  function combineLatestInit(observables, scheduler, valueTransform) {
    if (valueTransform === void 0) {
      valueTransform = identity;
    }
    return function(subscriber) {
      maybeSchedule(scheduler, function() {
        var length = observables.length;
        var values = new Array(length);
        var active = length;
        var remainingFirstValues = length;
        var _loop_1 = function(i2) {
          maybeSchedule(scheduler, function() {
            var source = from(observables[i2], scheduler);
            var hasFirstValue = false;
            source.subscribe(new OperatorSubscriber(subscriber, function(value) {
              values[i2] = value;
              if (!hasFirstValue) {
                hasFirstValue = true;
                remainingFirstValues--;
              }
              if (!remainingFirstValues) {
                subscriber.next(valueTransform(values.slice()));
              }
            }, function() {
              if (!--active) {
                subscriber.complete();
              }
            }));
          }, subscriber);
        };
        for (var i = 0; i < length; i++) {
          _loop_1(i);
        }
      }, subscriber);
    };
  }
  function maybeSchedule(scheduler, execute, subscription) {
    if (scheduler) {
      executeSchedule(subscription, scheduler, execute);
    } else {
      execute();
    }
  }

  // node_modules/rxjs/dist/esm5/internal/observable/concat.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/operators/concatAll.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/operators/mergeAll.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/operators/mergeInternals.js
  init_define_ENVIRONMENT();
  function mergeInternals(source, subscriber, project, concurrent, onBeforeNext, expand, innerSubScheduler, additionalTeardown) {
    var buffer = [];
    var active = 0;
    var index = 0;
    var isComplete = false;
    var checkComplete = function() {
      if (isComplete && !buffer.length && !active) {
        subscriber.complete();
      }
    };
    var outerNext = function(value) {
      return active < concurrent ? doInnerSub(value) : buffer.push(value);
    };
    var doInnerSub = function(value) {
      expand && subscriber.next(value);
      active++;
      var innerComplete = false;
      innerFrom(project(value, index++)).subscribe(new OperatorSubscriber(subscriber, function(innerValue) {
        onBeforeNext === null || onBeforeNext === void 0 ? void 0 : onBeforeNext(innerValue);
        if (expand) {
          outerNext(innerValue);
        } else {
          subscriber.next(innerValue);
        }
      }, function() {
        innerComplete = true;
      }, void 0, function() {
        if (innerComplete) {
          try {
            active--;
            var _loop_1 = function() {
              var bufferedValue = buffer.shift();
              if (innerSubScheduler) {
                executeSchedule(subscriber, innerSubScheduler, function() {
                  return doInnerSub(bufferedValue);
                });
              } else {
                doInnerSub(bufferedValue);
              }
            };
            while (buffer.length && active < concurrent) {
              _loop_1();
            }
            checkComplete();
          } catch (err) {
            subscriber.error(err);
          }
        }
      }));
    };
    source.subscribe(new OperatorSubscriber(subscriber, outerNext, function() {
      isComplete = true;
      checkComplete();
    }));
    return function() {
      additionalTeardown === null || additionalTeardown === void 0 ? void 0 : additionalTeardown();
    };
  }

  // node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js
  function mergeMap(project, resultSelector, concurrent) {
    if (concurrent === void 0) {
      concurrent = Infinity;
    }
    if (isFunction(resultSelector)) {
      return mergeMap(function(a, i) {
        return map(function(b, ii) {
          return resultSelector(a, b, i, ii);
        })(innerFrom(project(a, i)));
      }, concurrent);
    } else if (typeof resultSelector === "number") {
      concurrent = resultSelector;
    }
    return operate(function(source, subscriber) {
      return mergeInternals(source, subscriber, project, concurrent);
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/mergeAll.js
  function mergeAll(concurrent) {
    if (concurrent === void 0) {
      concurrent = Infinity;
    }
    return mergeMap(identity, concurrent);
  }

  // node_modules/rxjs/dist/esm5/internal/operators/concatAll.js
  function concatAll() {
    return mergeAll(1);
  }

  // node_modules/rxjs/dist/esm5/internal/observable/concat.js
  function concat() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    return concatAll()(from(args, popScheduler(args)));
  }

  // node_modules/rxjs/dist/esm5/internal/observable/connectable.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/observable/defer.js
  init_define_ENVIRONMENT();
  function defer(observableFactory) {
    return new Observable(function(subscriber) {
      innerFrom(observableFactory()).subscribe(subscriber);
    });
  }

  // node_modules/rxjs/dist/esm5/internal/observable/connectable.js
  var DEFAULT_CONFIG2 = {
    connector: function() {
      return new Subject();
    },
    resetOnDisconnect: true
  };
  function connectable(source, config2) {
    if (config2 === void 0) {
      config2 = DEFAULT_CONFIG2;
    }
    var connection = null;
    var connector = config2.connector, _a = config2.resetOnDisconnect, resetOnDisconnect = _a === void 0 ? true : _a;
    var subject = connector();
    var result = new Observable(function(subscriber) {
      return subject.subscribe(subscriber);
    });
    result.connect = function() {
      if (!connection || connection.closed) {
        connection = defer(function() {
          return source;
        }).subscribe(subject);
        if (resetOnDisconnect) {
          connection.add(function() {
            return subject = connector();
          });
        }
      }
      return connection;
    };
    return result;
  }

  // node_modules/rxjs/dist/esm5/internal/observable/fromEvent.js
  init_define_ENVIRONMENT();
  var nodeEventEmitterMethods = ["addListener", "removeListener"];
  var eventTargetMethods = ["addEventListener", "removeEventListener"];
  var jqueryMethods = ["on", "off"];
  function fromEvent(target, eventName, options, resultSelector) {
    if (isFunction(options)) {
      resultSelector = options;
      options = void 0;
    }
    if (resultSelector) {
      return fromEvent(target, eventName, options).pipe(mapOneOrManyArgs(resultSelector));
    }
    var _a = __read(isEventTarget(target) ? eventTargetMethods.map(function(methodName) {
      return function(handler) {
        return target[methodName](eventName, handler, options);
      };
    }) : isNodeStyleEventEmitter(target) ? nodeEventEmitterMethods.map(toCommonHandlerRegistry(target, eventName)) : isJQueryStyleEventEmitter(target) ? jqueryMethods.map(toCommonHandlerRegistry(target, eventName)) : [], 2), add = _a[0], remove = _a[1];
    if (!add) {
      if (isArrayLike(target)) {
        return mergeMap(function(subTarget) {
          return fromEvent(subTarget, eventName, options);
        })(innerFrom(target));
      }
    }
    if (!add) {
      throw new TypeError("Invalid event target");
    }
    return new Observable(function(subscriber) {
      var handler = function() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
          args[_i] = arguments[_i];
        }
        return subscriber.next(1 < args.length ? args : args[0]);
      };
      add(handler);
      return function() {
        return remove(handler);
      };
    });
  }
  function toCommonHandlerRegistry(target, eventName) {
    return function(methodName) {
      return function(handler) {
        return target[methodName](eventName, handler);
      };
    };
  }
  function isNodeStyleEventEmitter(target) {
    return isFunction(target.addListener) && isFunction(target.removeListener);
  }
  function isJQueryStyleEventEmitter(target) {
    return isFunction(target.on) && isFunction(target.off);
  }
  function isEventTarget(target) {
    return isFunction(target.addEventListener) && isFunction(target.removeEventListener);
  }

  // node_modules/rxjs/dist/esm5/internal/observable/timer.js
  init_define_ENVIRONMENT();
  function timer(dueTime, intervalOrScheduler, scheduler) {
    if (dueTime === void 0) {
      dueTime = 0;
    }
    if (scheduler === void 0) {
      scheduler = async;
    }
    var intervalDuration = -1;
    if (intervalOrScheduler != null) {
      if (isScheduler(intervalOrScheduler)) {
        scheduler = intervalOrScheduler;
      } else {
        intervalDuration = intervalOrScheduler;
      }
    }
    return new Observable(function(subscriber) {
      var due = isValidDate(dueTime) ? +dueTime - scheduler.now() : dueTime;
      if (due < 0) {
        due = 0;
      }
      var n = 0;
      return scheduler.schedule(function() {
        if (!subscriber.closed) {
          subscriber.next(n++);
          if (0 <= intervalDuration) {
            this.schedule(void 0, intervalDuration);
          } else {
            subscriber.complete();
          }
        }
      }, due);
    });
  }

  // node_modules/rxjs/dist/esm5/internal/observable/merge.js
  init_define_ENVIRONMENT();
  function merge() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var scheduler = popScheduler(args);
    var concurrent = popNumber(args, Infinity);
    var sources = args;
    return !sources.length ? EMPTY : sources.length === 1 ? innerFrom(sources[0]) : mergeAll(concurrent)(from(sources, scheduler));
  }

  // node_modules/rxjs/dist/esm5/internal/observable/never.js
  init_define_ENVIRONMENT();
  var NEVER = new Observable(noop);

  // node_modules/rxjs/dist/esm5/internal/operators/filter.js
  init_define_ENVIRONMENT();
  function filter(predicate, thisArg) {
    return operate(function(source, subscriber) {
      var index = 0;
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        return predicate.call(thisArg, value, index++) && subscriber.next(value);
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/catchError.js
  init_define_ENVIRONMENT();
  function catchError(selector) {
    return operate(function(source, subscriber) {
      var innerSub = null;
      var syncUnsub = false;
      var handledResult;
      innerSub = source.subscribe(new OperatorSubscriber(subscriber, void 0, void 0, function(err) {
        handledResult = innerFrom(selector(err, catchError(selector)(source)));
        if (innerSub) {
          innerSub.unsubscribe();
          innerSub = null;
          handledResult.subscribe(subscriber);
        } else {
          syncUnsub = true;
        }
      }));
      if (syncUnsub) {
        innerSub.unsubscribe();
        innerSub = null;
        handledResult.subscribe(subscriber);
      }
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/concatMap.js
  init_define_ENVIRONMENT();
  function concatMap(project, resultSelector) {
    return isFunction(resultSelector) ? mergeMap(project, resultSelector, 1) : mergeMap(project, 1);
  }

  // node_modules/rxjs/dist/esm5/internal/operators/take.js
  init_define_ENVIRONMENT();
  function take(count) {
    return count <= 0 ? function() {
      return EMPTY;
    } : operate(function(source, subscriber) {
      var seen = 0;
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        if (++seen <= count) {
          subscriber.next(value);
          if (count <= seen) {
            subscriber.complete();
          }
        }
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/ignoreElements.js
  init_define_ENVIRONMENT();
  function ignoreElements() {
    return operate(function(source, subscriber) {
      source.subscribe(new OperatorSubscriber(subscriber, noop));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/distinctUntilChanged.js
  init_define_ENVIRONMENT();
  function distinctUntilChanged(comparator, keySelector) {
    if (keySelector === void 0) {
      keySelector = identity;
    }
    comparator = comparator !== null && comparator !== void 0 ? comparator : defaultCompare;
    return operate(function(source, subscriber) {
      var previousKey;
      var first = true;
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        var currentKey = keySelector(value);
        if (first || !comparator(previousKey, currentKey)) {
          first = false;
          previousKey = currentKey;
          subscriber.next(value);
        }
      }));
    });
  }
  function defaultCompare(a, b) {
    return a === b;
  }

  // node_modules/rxjs/dist/esm5/internal/operators/share.js
  init_define_ENVIRONMENT();
  function share(options) {
    if (options === void 0) {
      options = {};
    }
    var _a = options.connector, connector = _a === void 0 ? function() {
      return new Subject();
    } : _a, _b = options.resetOnError, resetOnError = _b === void 0 ? true : _b, _c = options.resetOnComplete, resetOnComplete = _c === void 0 ? true : _c, _d = options.resetOnRefCountZero, resetOnRefCountZero = _d === void 0 ? true : _d;
    return function(wrapperSource) {
      var connection = null;
      var resetConnection = null;
      var subject = null;
      var refCount = 0;
      var hasCompleted = false;
      var hasErrored = false;
      var cancelReset = function() {
        resetConnection === null || resetConnection === void 0 ? void 0 : resetConnection.unsubscribe();
        resetConnection = null;
      };
      var reset = function() {
        cancelReset();
        connection = subject = null;
        hasCompleted = hasErrored = false;
      };
      var resetAndUnsubscribe = function() {
        var conn = connection;
        reset();
        conn === null || conn === void 0 ? void 0 : conn.unsubscribe();
      };
      return operate(function(source, subscriber) {
        refCount++;
        if (!hasErrored && !hasCompleted) {
          cancelReset();
        }
        var dest = subject = subject !== null && subject !== void 0 ? subject : connector();
        subscriber.add(function() {
          refCount--;
          if (refCount === 0 && !hasErrored && !hasCompleted) {
            resetConnection = handleReset(resetAndUnsubscribe, resetOnRefCountZero);
          }
        });
        dest.subscribe(subscriber);
        if (!connection) {
          connection = new SafeSubscriber({
            next: function(value) {
              return dest.next(value);
            },
            error: function(err) {
              hasErrored = true;
              cancelReset();
              resetConnection = handleReset(reset, resetOnError, err);
              dest.error(err);
            },
            complete: function() {
              hasCompleted = true;
              cancelReset();
              resetConnection = handleReset(reset, resetOnComplete);
              dest.complete();
            }
          });
          from(source).subscribe(connection);
        }
      })(wrapperSource);
    };
  }
  function handleReset(reset, on) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
      args[_i - 2] = arguments[_i];
    }
    if (on === true) {
      reset();
      return null;
    }
    if (on === false) {
      return null;
    }
    return on.apply(void 0, __spreadArray([], __read(args))).pipe(take(1)).subscribe(function() {
      return reset();
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/shareReplay.js
  init_define_ENVIRONMENT();
  function shareReplay(configOrBufferSize, windowTime, scheduler) {
    var _a, _b;
    var bufferSize;
    var refCount = false;
    if (configOrBufferSize && typeof configOrBufferSize === "object") {
      bufferSize = (_a = configOrBufferSize.bufferSize) !== null && _a !== void 0 ? _a : Infinity;
      windowTime = (_b = configOrBufferSize.windowTime) !== null && _b !== void 0 ? _b : Infinity;
      refCount = !!configOrBufferSize.refCount;
      scheduler = configOrBufferSize.scheduler;
    } else {
      bufferSize = configOrBufferSize !== null && configOrBufferSize !== void 0 ? configOrBufferSize : Infinity;
    }
    return share({
      connector: function() {
        return new ReplaySubject(bufferSize, windowTime, scheduler);
      },
      resetOnError: true,
      resetOnComplete: false,
      resetOnRefCountZero: refCount
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/skipWhile.js
  init_define_ENVIRONMENT();
  function skipWhile(predicate) {
    return operate(function(source, subscriber) {
      var taking = false;
      var index = 0;
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        return (taking || (taking = !predicate(value, index++))) && subscriber.next(value);
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/startWith.js
  init_define_ENVIRONMENT();
  function startWith() {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      values[_i] = arguments[_i];
    }
    var scheduler = popScheduler(values);
    return operate(function(source, subscriber) {
      (scheduler ? concat(values, source, scheduler) : concat(values, source)).subscribe(subscriber);
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/switchMap.js
  init_define_ENVIRONMENT();
  function switchMap(project, resultSelector) {
    return operate(function(source, subscriber) {
      var innerSubscriber = null;
      var index = 0;
      var isComplete = false;
      var checkComplete = function() {
        return isComplete && !innerSubscriber && subscriber.complete();
      };
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        innerSubscriber === null || innerSubscriber === void 0 ? void 0 : innerSubscriber.unsubscribe();
        var innerIndex = 0;
        var outerIndex = index++;
        innerFrom(project(value, outerIndex)).subscribe(innerSubscriber = new OperatorSubscriber(subscriber, function(innerValue) {
          return subscriber.next(resultSelector ? resultSelector(value, innerValue, outerIndex, innerIndex++) : innerValue);
        }, function() {
          innerSubscriber = null;
          checkComplete();
        }));
      }, function() {
        isComplete = true;
        checkComplete();
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/takeUntil.js
  init_define_ENVIRONMENT();
  function takeUntil(notifier) {
    return operate(function(source, subscriber) {
      innerFrom(notifier).subscribe(new OperatorSubscriber(subscriber, function() {
        return subscriber.complete();
      }, noop));
      !subscriber.closed && source.subscribe(subscriber);
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/tap.js
  init_define_ENVIRONMENT();
  function tap(observerOrNext, error, complete) {
    var tapObserver = isFunction(observerOrNext) || error || complete ? { next: observerOrNext, error, complete } : observerOrNext;
    return tapObserver ? operate(function(source, subscriber) {
      var _a;
      (_a = tapObserver.subscribe) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
      var isUnsub = true;
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        var _a2;
        (_a2 = tapObserver.next) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver, value);
        subscriber.next(value);
      }, function() {
        var _a2;
        isUnsub = false;
        (_a2 = tapObserver.complete) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver);
        subscriber.complete();
      }, function(err) {
        var _a2;
        isUnsub = false;
        (_a2 = tapObserver.error) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver, err);
        subscriber.error(err);
      }, function() {
        var _a2, _b;
        if (isUnsub) {
          (_a2 = tapObserver.unsubscribe) === null || _a2 === void 0 ? void 0 : _a2.call(tapObserver);
        }
        (_b = tapObserver.finalize) === null || _b === void 0 ? void 0 : _b.call(tapObserver);
      }));
    }) : identity;
  }

  // src/common/utils/reference.ts
  function createSharedReference(initialValue) {
    let value = initialValue;
    const cbs = [];
    let isFinished = false;
    return {
      getValue() {
        return value;
      },
      setValue(newVal) {
        if (isFinished) {
          if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.DEV) {
            console.error("Finished shared references cannot be updated");
          }
          return;
        }
        value = newVal;
        if (cbs.length === 0) {
          return;
        }
        const clonedCbs = cbs.slice();
        for (const cbObj of clonedCbs) {
          try {
            if (!cbObj.hasBeenCleared) {
              cbObj.trigger(newVal);
            }
          } catch (_) {
          }
        }
      },
      setValueIfChanged(newVal) {
        if (newVal !== value) {
          this.setValue(newVal);
        }
      },
      asObservable(skipCurrentValue) {
        return new Observable((obs) => {
          if (skipCurrentValue !== true) {
            obs.next(value);
          }
          if (isFinished) {
            obs.complete();
            return void 0;
          }
          const cbObj = {
            trigger: obs.next.bind(obs),
            complete: obs.complete.bind(obs),
            hasBeenCleared: false
          };
          cbs.push(cbObj);
          return () => {
            cbObj.hasBeenCleared = true;
            const indexOf = cbs.indexOf(cbObj);
            if (indexOf >= 0) {
              cbs.splice(indexOf, 1);
            }
          };
        });
      },
      onUpdate(cb, options) {
        if (options?.emitCurrentValue === true) {
          cb(value);
        }
        if (isFinished) {
          return;
        }
        const cbObj = {
          trigger: cb,
          complete: unlisten,
          hasBeenCleared: false
        };
        cbs.push(cbObj);
        if (options?.clearSignal === void 0) {
          return;
        }
        options.clearSignal.register(unlisten);
        function unlisten() {
          cbObj.hasBeenCleared = true;
          const indexOf = cbs.indexOf(cbObj);
          if (indexOf >= 0) {
            cbs.splice(indexOf, 1);
          }
        }
      },
      finish() {
        isFinished = true;
        const clonedCbs = cbs.slice();
        for (const cbObj of clonedCbs) {
          try {
            if (!cbObj.hasBeenCleared) {
              cbObj.complete();
            }
            cbObj.hasBeenCleared = true;
          } catch (_) {
          }
        }
        cbs.length = 0;
      }
    };
  }
  function createMappedReference(originalRef, mappingFn, cancellationSignal) {
    const newRef = createSharedReference(mappingFn(originalRef.getValue()));
    originalRef.onUpdate(function mapOriginalReference(x) {
      newRef.setValue(mappingFn(x));
    }, { clearSignal: cancellationSignal });
    if (cancellationSignal !== void 0) {
      cancellationSignal.register(() => {
        newRef.finish();
      });
    }
    return newRef;
  }
  var reference_default = createSharedReference;

  // src/common/utils/task_canceller.ts
  init_define_ENVIRONMENT();

  // src/common/utils/assert.ts
  init_define_ENVIRONMENT();

  // src/common/errors/index.ts
  init_define_ENVIRONMENT();

  // src/common/errors/assertion_error.ts
  init_define_ENVIRONMENT();
  var AssertionError = class extends Error {
    name;
    message;
    constructor(message) {
      super();
      Object.setPrototypeOf(this, AssertionError.prototype);
      this.name = "AssertionError";
      this.message = message;
    }
  };

  // src/common/errors/encrypted_media_error.ts
  init_define_ENVIRONMENT();

  // src/common/errors/error_codes.ts
  init_define_ENVIRONMENT();
  var ErrorTypes = {
    NETWORK_ERROR: "NETWORK_ERROR",
    MEDIA_ERROR: "MEDIA_ERROR",
    ENCRYPTED_MEDIA_ERROR: "ENCRYPTED_MEDIA_ERROR",
    OTHER_ERROR: "OTHER_ERROR"
  };
  var NetworkErrorTypes = {
    TIMEOUT: "TIMEOUT",
    ERROR_EVENT: "ERROR_EVENT",
    ERROR_HTTP_CODE: "ERROR_HTTP_CODE",
    PARSE_ERROR: "PARSE_ERROR"
  };
  var ErrorCodes = {
    PIPELINE_LOAD_ERROR: "PIPELINE_LOAD_ERROR",
    PIPELINE_PARSE_ERROR: "PIPELINE_PARSE_ERROR",
    INTEGRITY_ERROR: "INTEGRITY_ERROR",
    MANIFEST_PARSE_ERROR: "MANIFEST_PARSE_ERROR",
    MANIFEST_INCOMPATIBLE_CODECS_ERROR: "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
    MANIFEST_UPDATE_ERROR: "MANIFEST_UPDATE_ERROR",
    MANIFEST_UNSUPPORTED_ADAPTATION_TYPE: "MANIFEST_UNSUPPORTED_ADAPTATION_TYPE",
    MEDIA_STARTING_TIME_NOT_FOUND: "MEDIA_STARTING_TIME_NOT_FOUND",
    MEDIA_TIME_BEFORE_MANIFEST: "MEDIA_TIME_BEFORE_MANIFEST",
    MEDIA_TIME_AFTER_MANIFEST: "MEDIA_TIME_AFTER_MANIFEST",
    MEDIA_TIME_NOT_FOUND: "MEDIA_TIME_NOT_FOUND",
    NO_PLAYABLE_REPRESENTATION: "NO_PLAYABLE_REPRESENTATION",
    MEDIA_IS_ENCRYPTED_ERROR: "MEDIA_IS_ENCRYPTED_ERROR",
    CREATE_MEDIA_KEYS_ERROR: "CREATE_MEDIA_KEYS_ERROR",
    KEY_ERROR: "KEY_ERROR",
    KEY_STATUS_CHANGE_ERROR: "KEY_STATUS_CHANGE_ERROR",
    KEY_UPDATE_ERROR: "KEY_UPDATE_ERROR",
    KEY_LOAD_ERROR: "KEY_LOAD_ERROR",
    KEY_LOAD_TIMEOUT: "KEY_LOAD_TIMEOUT",
    KEY_GENERATE_REQUEST_ERROR: "KEY_GENERATE_REQUEST_ERROR",
    INCOMPATIBLE_KEYSYSTEMS: "INCOMPATIBLE_KEYSYSTEMS",
    INVALID_ENCRYPTED_EVENT: "INVALID_ENCRYPTED_EVENT",
    INVALID_KEY_SYSTEM: "INVALID_KEY_SYSTEM",
    LICENSE_SERVER_CERTIFICATE_ERROR: "LICENSE_SERVER_CERTIFICATE_ERROR",
    MULTIPLE_SESSIONS_SAME_INIT_DATA: "MULTIPLE_SESSIONS_SAME_INIT_DATA",
    BUFFER_APPEND_ERROR: "BUFFER_APPEND_ERROR",
    BUFFER_FULL_ERROR: "BUFFER_FULL_ERROR",
    BUFFER_TYPE_UNKNOWN: "BUFFER_TYPE_UNKNOWN",
    MEDIA_ERR_BLOCKED_AUTOPLAY: "MEDIA_ERR_BLOCKED_AUTOPLAY",
    MEDIA_ERR_PLAY_NOT_ALLOWED: "MEDIA_ERR_PLAY_NOT_ALLOWED",
    MEDIA_ERR_NOT_LOADED_METADATA: "MEDIA_ERR_NOT_LOADED_METADATA",
    MEDIA_ERR_ABORTED: "MEDIA_ERR_ABORTED",
    MEDIA_ERR_NETWORK: "MEDIA_ERR_NETWORK",
    MEDIA_ERR_DECODE: "MEDIA_ERR_DECODE",
    MEDIA_ERR_SRC_NOT_SUPPORTED: "MEDIA_ERR_SRC_NOT_SUPPORTED",
    MEDIA_ERR_UNKNOWN: "MEDIA_ERR_UNKNOWN",
    MEDIA_SOURCE_NOT_SUPPORTED: "MEDIA_SOURCE_NOT_SUPPORTED",
    MEDIA_KEYS_NOT_SUPPORTED: "MEDIA_KEYS_NOT_SUPPORTED",
    DISCONTINUITY_ENCOUNTERED: "DISCONTINUITY_ENCOUNTERED",
    NONE: "NONE"
  };

  // src/common/errors/error_message.ts
  init_define_ENVIRONMENT();
  function errorMessage(name, code, reason) {
    return `${name} (${code}) ${reason}`;
  }

  // src/common/errors/encrypted_media_error.ts
  var EncryptedMediaError = class extends Error {
    name;
    type;
    code;
    message;
    fatal;
    constructor(code, reason) {
      super();
      Object.setPrototypeOf(this, EncryptedMediaError.prototype);
      this.name = "EncryptedMediaError";
      this.type = ErrorTypes.ENCRYPTED_MEDIA_ERROR;
      this.code = code;
      this.message = errorMessage(this.name, this.code, reason);
      this.fatal = false;
    }
  };

  // src/common/errors/format_error.ts
  init_define_ENVIRONMENT();

  // src/common/errors/is_known_error.ts
  init_define_ENVIRONMENT();

  // src/common/errors/media_error.ts
  init_define_ENVIRONMENT();
  var MediaError = class extends Error {
    name;
    type;
    message;
    code;
    fatal;
    constructor(code, reason) {
      super();
      Object.setPrototypeOf(this, MediaError.prototype);
      this.name = "MediaError";
      this.type = ErrorTypes.MEDIA_ERROR;
      this.code = code;
      this.message = errorMessage(this.name, this.code, reason);
      this.fatal = false;
    }
  };

  // src/common/errors/network_error.ts
  init_define_ENVIRONMENT();
  var NetworkError = class extends Error {
    name;
    type;
    message;
    code;
    xhr;
    url;
    status;
    errorType;
    fatal;
    constructor(code, baseError) {
      super();
      Object.setPrototypeOf(this, NetworkError.prototype);
      this.name = "NetworkError";
      this.type = ErrorTypes.NETWORK_ERROR;
      this.xhr = baseError.xhr === void 0 ? null : baseError.xhr;
      this.url = baseError.url;
      this.status = baseError.status;
      this.errorType = baseError.type;
      this.code = code;
      this.message = errorMessage(this.name, this.code, baseError.message);
      this.fatal = false;
    }
    isHttpError(httpErrorCode) {
      return this.errorType === NetworkErrorTypes.ERROR_HTTP_CODE && this.status === httpErrorCode;
    }
  };

  // src/common/errors/other_error.ts
  init_define_ENVIRONMENT();
  var OtherError = class extends Error {
    name;
    type;
    message;
    code;
    fatal;
    constructor(code, reason) {
      super();
      Object.setPrototypeOf(this, OtherError.prototype);
      this.name = "OtherError";
      this.type = ErrorTypes.OTHER_ERROR;
      this.code = code;
      this.message = errorMessage(this.name, this.code, reason);
      this.fatal = false;
    }
  };

  // src/common/errors/is_known_error.ts
  function isKnownError(error) {
    return (error instanceof EncryptedMediaError || error instanceof MediaError || error instanceof OtherError || error instanceof NetworkError) && Object.keys(ErrorTypes).indexOf(error.type) >= 0;
  }

  // src/common/errors/format_error.ts
  function formatError(error, { defaultCode, defaultReason }) {
    if (isKnownError(error)) {
      return error;
    }
    const reason = error instanceof Error ? error.toString() : defaultReason;
    return new OtherError(defaultCode, reason);
  }

  // src/common/errors/request_error.ts
  init_define_ENVIRONMENT();
  var RequestError = class extends Error {
    name;
    type;
    message;
    xhr;
    url;
    status;
    constructor(url, status, type, xhr) {
      super();
      Object.setPrototypeOf(this, RequestError.prototype);
      this.name = "RequestError";
      this.url = url;
      if (xhr !== void 0) {
        this.xhr = xhr;
      }
      this.status = status;
      this.type = type;
      this.message = type;
    }
  };

  // src/common/utils/is_null_or_undefined.ts
  init_define_ENVIRONMENT();
  function isNullOrUndefined(x) {
    return x === null || x === void 0;
  }

  // src/common/utils/assert.ts
  function assert(assertion, message) {
    if (define_ENVIRONMENT_default.DEV === define_ENVIRONMENT_default.CURRENT_ENV && !assertion) {
      throw new AssertionError(message === void 0 ? "invalid assertion" : message);
    }
  }
  function assertInterface(o, iface, name = "object") {
    assert(!isNullOrUndefined(o), `${name} should be an object`);
    for (const k in iface) {
      if (iface.hasOwnProperty(k)) {
        assert(typeof o[k] === iface[k], `${name} should have property ${k} as a ${iface[k]}`);
      }
    }
  }

  // src/common/utils/task_canceller.ts
  var TaskCanceller = class {
    signal;
    isUsed;
    _trigger;
    constructor(options) {
      const [trigger, register] = createCancellationFunctions();
      this.isUsed = false;
      this._trigger = trigger;
      this.signal = new CancellationSignal(register);
      if (options?.cancelOn !== void 0) {
        const unregisterParent = options.cancelOn.register(() => {
          this.cancel();
        });
        this.signal.register(unregisterParent);
      }
    }
    cancel(srcError) {
      if (this.isUsed) {
        return;
      }
      this.isUsed = true;
      const cancellationError = srcError ?? new CancellationError();
      this._trigger(cancellationError);
    }
    static isCancellationError(error) {
      return error instanceof CancellationError;
    }
  };
  var CancellationSignal = class {
    isCancelled;
    cancellationError;
    _listeners;
    constructor(registerToSource) {
      this.isCancelled = false;
      this.cancellationError = null;
      this._listeners = [];
      registerToSource((cancellationError) => {
        this.cancellationError = cancellationError;
        this.isCancelled = true;
        while (this._listeners.length > 0) {
          const listener = this._listeners.splice(this._listeners.length - 1, 1)[0];
          listener(cancellationError);
        }
      });
    }
    register(fn) {
      if (this.isCancelled) {
        assert(this.cancellationError !== null);
        fn(this.cancellationError);
      }
      this._listeners.push(fn);
      return () => this.deregister(fn);
    }
    deregister(fn) {
      if (this.isCancelled) {
        return;
      }
      for (let i = 0; i < this._listeners.length; i++) {
        if (this._listeners[i] === fn) {
          this._listeners.splice(i, 1);
          return;
        }
      }
    }
  };
  var CancellationError = class extends Error {
    name;
    message;
    constructor() {
      super();
      Object.setPrototypeOf(this, CancellationError.prototype);
      this.name = "CancellationError";
      this.message = "This task was cancelled.";
    }
  };
  function createCancellationFunctions() {
    let listener = noop_default;
    return [
      function trigger(error) {
        listener(error);
      },
      function register(newListener) {
        listener = newListener;
      }
    ];
  }

  // src/main/core/api/playback_observer.ts
  var SCANNED_MEDIA_ELEMENTS_EVENTS = [
    "canplay",
    "ended",
    "play",
    "pause",
    "seeking",
    "seeked",
    "loadedmetadata",
    "ratechange"
  ];
  var PlaybackObserver = class {
    _mediaElement;
    _withMediaSource;
    _lowLatencyMode;
    _internalSeekingEventsIncomingCounter;
    _observationRef;
    _canceller;
    constructor(mediaElement, options) {
      this._internalSeekingEventsIncomingCounter = 0;
      this._mediaElement = mediaElement;
      this._withMediaSource = options.withMediaSource;
      this._lowLatencyMode = options.lowLatencyMode;
      this._canceller = new TaskCanceller();
      this._observationRef = this._createSharedReference();
    }
    stop() {
      this._canceller.cancel();
    }
    getCurrentTime() {
      return this._mediaElement.currentTime;
    }
    getIsPaused() {
      return this._mediaElement.paused;
    }
    setCurrentTime(time) {
      this._internalSeekingEventsIncomingCounter += 1;
      this._mediaElement.currentTime = time;
    }
    getReadyState() {
      return this._mediaElement.readyState;
    }
    getReference() {
      return this._observationRef;
    }
    listen(cb, options) {
      if (this._canceller.isUsed || options?.clearSignal?.isCancelled === true) {
        return noop_default;
      }
      this._observationRef.onUpdate(cb, {
        clearSignal: options?.clearSignal,
        emitCurrentValue: options?.includeLastObservation
      });
    }
    deriveReadOnlyObserver(transform) {
      return generateReadOnlyObserver(this, transform, this._canceller.signal);
    }
    _createSharedReference() {
      if (this._observationRef !== void 0) {
        return this._observationRef;
      }
      let lastObservation;
      const {
        SAMPLING_INTERVAL_MEDIASOURCE,
        SAMPLING_INTERVAL_LOW_LATENCY,
        SAMPLING_INTERVAL_NO_MEDIASOURCE
      } = config_default.getCurrent();
      const getCurrentObservation = (event) => {
        let tmpEvt = event;
        if (tmpEvt === "seeking" && this._internalSeekingEventsIncomingCounter > 0) {
          tmpEvt = "internal-seeking";
          this._internalSeekingEventsIncomingCounter -= 1;
        }
        const _lastObservation = lastObservation ?? this._generateInitialObservation();
        const mediaTimings = getMediaInfos(this._mediaElement, tmpEvt);
        const internalSeeking = mediaTimings.seeking && (tmpEvt === "internal-seeking" || _lastObservation.internalSeeking && tmpEvt !== "seeking");
        const rebufferingStatus = getRebufferingStatus(
          _lastObservation,
          mediaTimings,
          {
            lowLatencyMode: this._lowLatencyMode,
            withMediaSource: this._withMediaSource
          }
        );
        const freezingStatus = getFreezingStatus(_lastObservation, mediaTimings);
        const timings = object_assign_default(
          {},
          {
            rebuffering: rebufferingStatus,
            freezing: freezingStatus,
            internalSeeking
          },
          mediaTimings
        );
        if (log_default.hasLevel("DEBUG")) {
          log_default.debug(
            "API: current media element state tick",
            "event",
            timings.event,
            "position",
            timings.position,
            "seeking",
            timings.seeking,
            "internalSeeking",
            timings.internalSeeking,
            "rebuffering",
            timings.rebuffering !== null,
            "freezing",
            timings.freezing !== null,
            "ended",
            timings.ended,
            "paused",
            timings.paused,
            "playbackRate",
            timings.playbackRate,
            "readyState",
            timings.readyState
          );
        }
        return timings;
      };
      const returnedSharedReference = reference_default(getCurrentObservation("init"));
      const generateObservationForEvent = (event) => {
        const newObservation = getCurrentObservation(event);
        if (log_default.hasLevel("DEBUG")) {
          log_default.debug(
            "API: current playback timeline:\n" + prettyPrintBuffered(
              newObservation.buffered,
              newObservation.position
            ),
            `
${event}`
          );
        }
        lastObservation = newObservation;
        returnedSharedReference.setValue(newObservation);
      };
      const interval = this._lowLatencyMode ? SAMPLING_INTERVAL_LOW_LATENCY : this._withMediaSource ? SAMPLING_INTERVAL_MEDIASOURCE : SAMPLING_INTERVAL_NO_MEDIASOURCE;
      let intervalId = setInterval(onInterval, interval);
      const removeEventListeners = SCANNED_MEDIA_ELEMENTS_EVENTS.map((eventName) => {
        this._mediaElement.addEventListener(eventName, onMediaEvent);
        function onMediaEvent() {
          restartInterval();
          generateObservationForEvent(eventName);
        }
        return () => {
          this._mediaElement.removeEventListener(eventName, onMediaEvent);
        };
      });
      this._canceller.signal.register(() => {
        clearInterval(intervalId);
        removeEventListeners.forEach((cb) => cb());
        returnedSharedReference.finish();
      });
      return returnedSharedReference;
      function onInterval() {
        generateObservationForEvent("timeupdate");
      }
      function restartInterval() {
        clearInterval(intervalId);
        intervalId = setInterval(onInterval, interval);
      }
    }
    _generateInitialObservation() {
      return object_assign_default(
        getMediaInfos(this._mediaElement, "init"),
        {
          rebuffering: null,
          freezing: null,
          internalSeeking: false
        }
      );
    }
  };
  function getRebufferingEndGap(rebufferingStatus, lowLatencyMode) {
    if (rebufferingStatus === null) {
      return 0;
    }
    const suffix = lowLatencyMode ? "LOW_LATENCY" : "DEFAULT";
    const {
      RESUME_GAP_AFTER_SEEKING,
      RESUME_GAP_AFTER_NOT_ENOUGH_DATA,
      RESUME_GAP_AFTER_BUFFERING
    } = config_default.getCurrent();
    switch (rebufferingStatus.reason) {
      case "seeking":
        return RESUME_GAP_AFTER_SEEKING[suffix];
      case "not-ready":
        return RESUME_GAP_AFTER_NOT_ENOUGH_DATA[suffix];
      case "buffering":
        return RESUME_GAP_AFTER_BUFFERING[suffix];
    }
  }
  function hasLoadedUntilTheEnd(currentRange, duration, lowLatencyMode) {
    const { REBUFFERING_GAP } = config_default.getCurrent();
    const suffix = lowLatencyMode ? "LOW_LATENCY" : "DEFAULT";
    return currentRange !== null && duration - currentRange.end <= REBUFFERING_GAP[suffix];
  }
  function getMediaInfos(mediaElement, event) {
    const {
      buffered,
      currentTime,
      duration,
      ended,
      paused,
      playbackRate,
      readyState,
      seeking
    } = mediaElement;
    const currentRange = getRange(buffered, currentTime);
    return {
      bufferGap: currentRange !== null ? currentRange.end - currentTime : Infinity,
      buffered,
      currentRange,
      position: currentTime,
      duration,
      ended,
      paused,
      playbackRate,
      readyState,
      seeking,
      event
    };
  }
  function getRebufferingStatus(prevObservation, currentInfo, { withMediaSource, lowLatencyMode }) {
    const { REBUFFERING_GAP } = config_default.getCurrent();
    const {
      event: currentEvt,
      position: currentTime,
      bufferGap,
      currentRange,
      duration,
      paused,
      readyState,
      ended
    } = currentInfo;
    const {
      rebuffering: prevRebuffering,
      event: prevEvt,
      position: prevTime
    } = prevObservation;
    const fullyLoaded = hasLoadedUntilTheEnd(currentRange, duration, lowLatencyMode);
    const canSwitchToRebuffering = readyState >= 1 && currentEvt !== "loadedmetadata" && prevRebuffering === null && !(fullyLoaded || ended);
    let rebufferEndPosition = null;
    let shouldRebuffer;
    let shouldStopRebuffer;
    const rebufferGap = lowLatencyMode ? REBUFFERING_GAP.LOW_LATENCY : REBUFFERING_GAP.DEFAULT;
    if (withMediaSource) {
      if (canSwitchToRebuffering) {
        if (bufferGap <= rebufferGap) {
          shouldRebuffer = true;
          rebufferEndPosition = currentTime + bufferGap;
        } else if (bufferGap === Infinity) {
          shouldRebuffer = true;
          rebufferEndPosition = currentTime;
        }
      } else if (prevRebuffering !== null) {
        const resumeGap = getRebufferingEndGap(prevRebuffering, lowLatencyMode);
        if (shouldRebuffer !== true && prevRebuffering !== null && readyState > 1 && (fullyLoaded || ended || bufferGap < Infinity && bufferGap > resumeGap)) {
          shouldStopRebuffer = true;
        } else if (bufferGap === Infinity || bufferGap <= resumeGap) {
          rebufferEndPosition = bufferGap === Infinity ? currentTime : currentTime + bufferGap;
        }
      }
    } else {
      if (canSwitchToRebuffering && (!paused && currentEvt === "timeupdate" && prevEvt === "timeupdate" && currentTime === prevTime || currentEvt === "seeking" && bufferGap === Infinity)) {
        shouldRebuffer = true;
      } else if (prevRebuffering !== null && (currentEvt !== "seeking" && currentTime !== prevTime || currentEvt === "canplay" || bufferGap < Infinity && (bufferGap > getRebufferingEndGap(prevRebuffering, lowLatencyMode) || fullyLoaded || ended))) {
        shouldStopRebuffer = true;
      }
    }
    if (shouldStopRebuffer === true) {
      return null;
    } else if (shouldRebuffer === true || prevRebuffering !== null) {
      let reason;
      if (currentEvt === "seeking" || prevRebuffering !== null && prevRebuffering.reason === "seeking") {
        reason = "seeking";
      } else if (currentInfo.seeking) {
        reason = "seeking";
      } else if (readyState === 1) {
        reason = "not-ready";
      } else {
        reason = "buffering";
      }
      if (prevRebuffering !== null && prevRebuffering.reason === reason) {
        return {
          reason: prevRebuffering.reason,
          timestamp: prevRebuffering.timestamp,
          position: rebufferEndPosition
        };
      }
      return {
        reason,
        timestamp: performance.now(),
        position: rebufferEndPosition
      };
    }
    return null;
  }
  function getFreezingStatus(prevObservation, currentInfo) {
    const { MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING } = config_default.getCurrent();
    if (prevObservation.freezing) {
      if (currentInfo.ended || currentInfo.paused || currentInfo.readyState === 0 || currentInfo.playbackRate === 0 || prevObservation.position !== currentInfo.position) {
        return null;
      }
      return prevObservation.freezing;
    }
    return currentInfo.event === "timeupdate" && currentInfo.bufferGap > MINIMUM_BUFFER_AMOUNT_BEFORE_FREEZING && !currentInfo.ended && !currentInfo.paused && currentInfo.readyState >= 1 && currentInfo.playbackRate !== 0 && currentInfo.position === prevObservation.position ? { timestamp: performance.now() } : null;
  }
  function prettyPrintBuffered(buffered, currentTime) {
    let str = "";
    let currentTimeStr = "";
    for (let i = 0; i < buffered.length; i++) {
      const start = buffered.start(i);
      const end = buffered.end(i);
      const fixedStart = start.toFixed(2);
      const fixedEnd = end.toFixed(2);
      const fixedDuration = (end - start).toFixed(2);
      const newIntervalStr = `${fixedStart}|==${fixedDuration}==|${fixedEnd}`;
      str += newIntervalStr;
      if (currentTimeStr.length === 0 && end > currentTime) {
        const padBefore = str.length - Math.floor(newIntervalStr.length / 2);
        currentTimeStr = " ".repeat(padBefore) + `^${currentTime}`;
      }
      if (i < buffered.length - 1) {
        const nextStart = buffered.start(i + 1);
        const fixedDiff = (nextStart - end).toFixed(2);
        const holeStr = ` ~${fixedDiff}~ `;
        str += holeStr;
        if (currentTimeStr.length === 0 && currentTime < nextStart) {
          const padBefore = str.length - Math.floor(holeStr.length / 2);
          currentTimeStr = " ".repeat(padBefore) + `^${currentTime}`;
        }
      }
    }
    if (currentTimeStr.length === 0) {
      currentTimeStr = " ".repeat(str.length) + `^${currentTime}`;
    }
    return str + "\n" + currentTimeStr;
  }
  function generateReadOnlyObserver(src, transform, cancellationSignal) {
    const mappedRef = transform(src.getReference(), cancellationSignal);
    return {
      getCurrentTime() {
        return src.getCurrentTime();
      },
      getReadyState() {
        return src.getReadyState();
      },
      getIsPaused() {
        return src.getIsPaused();
      },
      getReference() {
        return mappedRef;
      },
      listen(cb, options) {
        if (cancellationSignal.isCancelled || options?.clearSignal?.isCancelled === true) {
          return;
        }
        mappedRef.onUpdate(cb, {
          clearSignal: options?.clearSignal,
          emitCurrentValue: options?.includeLastObservation
        });
      },
      deriveReadOnlyObserver(newTransformFn) {
        return generateReadOnlyObserver(this, newTransformFn, cancellationSignal);
      }
    };
  }

  // src/main/core/api/public_api.ts
  init_define_ENVIRONMENT();

  // src/common/utils/are_arrays_of_numbers_equal.ts
  init_define_ENVIRONMENT();
  function areArraysOfNumbersEqual(arr1, arr2) {
    if (arr1.length !== arr2.length) {
      return false;
    }
    for (let i = arr1.length - 1; i >= 0; i--) {
      if (arr1[i] !== arr2[i]) {
        return false;
      }
    }
    return true;
  }

  // src/common/utils/event_emitter.ts
  init_define_ENVIRONMENT();
  var EventEmitter = class {
    _listeners;
    constructor() {
      this._listeners = {};
    }
    addEventListener(evt, fn, cancellationSignal) {
      const listeners = this._listeners[evt];
      if (!Array.isArray(listeners)) {
        this._listeners[evt] = [fn];
      } else {
        listeners.push(fn);
      }
      if (cancellationSignal !== void 0) {
        cancellationSignal.register(() => {
          this.removeEventListener(evt, fn);
        });
      }
    }
    removeEventListener(evt, fn) {
      if (isNullOrUndefined(evt)) {
        this._listeners = {};
        return;
      }
      const listeners = this._listeners[evt];
      if (!Array.isArray(listeners)) {
        return;
      }
      if (isNullOrUndefined(fn)) {
        delete this._listeners[evt];
        return;
      }
      const index = listeners.indexOf(fn);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      if (listeners.length === 0) {
        delete this._listeners[evt];
      }
    }
    trigger(evt, arg) {
      const listeners = this._listeners[evt];
      if (!Array.isArray(listeners)) {
        return;
      }
      listeners.slice().forEach((listener) => {
        try {
          listener(arg);
        } catch (e) {
          log_default.error("EventEmitter: listener error", e instanceof Error ? e : null);
        }
      });
    }
  };

  // src/common/utils/uniq.ts
  init_define_ENVIRONMENT();
  function uniqFromFilter(arr) {
    return arr.filter((val, i, self2) => self2.indexOf(val) === i);
  }
  function uniqFromSet(arr) {
    return Array.from(new Set(arr));
  }
  var uniq_default = typeof window !== "undefined" && typeof window.Set === "function" && typeof Array.from === "function" ? uniqFromSet : uniqFromFilter;

  // src/common/utils/warn_once.ts
  init_define_ENVIRONMENT();

  // src/common/utils/array_includes.ts
  init_define_ENVIRONMENT();
  function arrayIncludes(arr, searchElement, fromIndex) {
    if (typeof Array.prototype.includes === "function") {
      return arr.includes(searchElement, fromIndex);
    }
    const len = arr.length >>> 0;
    if (len === 0) {
      return false;
    }
    const n = fromIndex | 0;
    let k = n >= 0 ? Math.min(n, len - 1) : Math.max(len + n, 0);
    const areTheSame = (x, y) => x === y || typeof x === "number" && typeof y === "number" && isNaN(x) && isNaN(y);
    while (k < len) {
      if (areTheSame(arr[k], searchElement)) {
        return true;
      }
      k++;
    }
    return false;
  }

  // src/common/utils/warn_once.ts
  var WARNED_MESSAGES = [];
  function warnOnce(message) {
    if (!arrayIncludes(WARNED_MESSAGES, message)) {
      console.warn(message);
      WARNED_MESSAGES.push(message);
    }
  }

  // src/main/compat/index.ts
  init_define_ENVIRONMENT();

  // src/main/compat/browser_detection.ts
  init_define_ENVIRONMENT();

  // src/main/compat/is_node.ts
  init_define_ENVIRONMENT();
  var isNode = typeof window === "undefined";
  var is_node_default = isNode;

  // src/main/compat/browser_detection.ts
  var isIE11 = !is_node_default && typeof window.MSInputMethodContext !== "undefined" && typeof document.documentMode !== "undefined";
  var isIEOrEdge = is_node_default ? false : navigator.appName === "Microsoft Internet Explorer" || navigator.appName === "Netscape" && /(Trident|Edge)\//.test(navigator.userAgent);
  var isEdgeChromium = !is_node_default && navigator.userAgent.toLowerCase().indexOf("edg/") !== -1;
  var isFirefox = !is_node_default && navigator.userAgent.toLowerCase().indexOf("firefox") !== -1;
  var isSamsungBrowser = !is_node_default && /SamsungBrowser/.test(navigator.userAgent);
  var isTizen = !is_node_default && /Tizen/.test(navigator.userAgent);
  var isSafariDesktop = !is_node_default && (Object.prototype.toString.call(window.HTMLElement).indexOf("Constructor") >= 0 || window.safari?.pushNotification?.toString() === "[object SafariRemoteNotification]");
  var isSafariMobile = !is_node_default && typeof navigator.platform === "string" && /iPad|iPhone|iPod/.test(navigator.platform);

  // src/main/compat/browser_compatibility_types.ts
  init_define_ENVIRONMENT();
  var win = is_node_default ? void 0 : window;
  var MediaSource_ = win === void 0 ? void 0 : !isNullOrUndefined(win.MediaSource) ? win.MediaSource : !isNullOrUndefined(win.MozMediaSource) ? win.MozMediaSource : !isNullOrUndefined(win.WebKitMediaSource) ? win.WebKitMediaSource : win.MSMediaSource;
  var READY_STATES = {
    HAVE_NOTHING: 0,
    HAVE_METADATA: 1,
    HAVE_CURRENT_DATA: 2,
    HAVE_FUTURE_DATA: 3,
    HAVE_ENOUGH_DATA: 4
  };

  // src/main/compat/can_rely_on_video_visibility_and_size.ts
  init_define_ENVIRONMENT();

  // src/main/compat/browser_version.ts
  init_define_ENVIRONMENT();
  function getFirefoxVersion() {
    if (!isFirefox) {
      log_default.warn("Compat: Can't access Firefox version on no firefox browser.");
      return null;
    }
    const userAgent = navigator.userAgent;
    const match = /Firefox\/([0-9]+)\./.exec(userAgent);
    if (match === null) {
      return -1;
    }
    const result = parseInt(match[1], 10);
    if (isNaN(result)) {
      return -1;
    }
    return result;
  }

  // src/main/compat/can_rely_on_video_visibility_and_size.ts
  function canRelyOnVideoVisibilityAndSize() {
    if (!isFirefox) {
      return true;
    }
    const firefoxVersion = getFirefoxVersion();
    if (firefoxVersion === null || firefoxVersion < 67) {
      return true;
    }
    const proto = HTMLVideoElement?.prototype;
    return proto?.requirePictureInPicture !== void 0;
  }

  // src/main/compat/eme/index.ts
  init_define_ENVIRONMENT();

  // src/main/compat/eme/close_session.ts
  init_define_ENVIRONMENT();

  // src/common/utils/cancellable_sleep.ts
  init_define_ENVIRONMENT();
  function cancellableSleep(delay, cancellationSignal) {
    return new Promise((res, rej) => {
      const timeout2 = setTimeout(() => {
        unregisterCancelSignal();
        res();
      }, delay);
      const unregisterCancelSignal = cancellationSignal.register(function onCancel(cancellationError) {
        clearTimeout(timeout2);
        rej(cancellationError);
      });
    });
  }

  // src/main/compat/eme/close_session.ts
  function closeSession(session) {
    const timeoutCanceller = new TaskCanceller();
    return Promise.race([
      session.close().then(() => {
        timeoutCanceller.cancel();
      }),
      session.closed.then(() => {
        timeoutCanceller.cancel();
      }),
      waitTimeoutAndCheck()
    ]);
    async function waitTimeoutAndCheck() {
      try {
        await cancellableSleep(1e3, timeoutCanceller.signal);
        await tryUpdatingSession();
      } catch (err) {
        if (err instanceof CancellationError) {
          return;
        }
        const message = err instanceof Error ? err.message : "Unknown error made it impossible to close the session";
        log_default.error(`DRM: ${message}`);
      }
    }
    async function tryUpdatingSession() {
      try {
        await session.update(new Uint8Array(1));
      } catch (err) {
        if (timeoutCanceller.isUsed) {
          return;
        }
        if (err instanceof Error && err.message === "The session is already closed.") {
          return;
        }
        await cancellableSleep(1e3, timeoutCanceller.signal);
      }
      if (timeoutCanceller.isUsed) {
        return;
      }
      throw new Error("Compat: Couldn't know if session is closed");
    }
  }

  // src/main/compat/eme/custom_key_system_access.ts
  init_define_ENVIRONMENT();
  var CustomMediaKeySystemAccess = class {
    constructor(_keyType, _mediaKeys, _configuration) {
      this._keyType = _keyType;
      this._mediaKeys = _mediaKeys;
      this._configuration = _configuration;
    }
    get keySystem() {
      return this._keyType;
    }
    createMediaKeys() {
      return new Promise((res) => res(this._mediaKeys));
    }
    getConfiguration() {
      return this._configuration;
    }
  };

  // src/main/compat/eme/custom_media_keys/index.ts
  init_define_ENVIRONMENT();

  // src/main/compat/should_favour_custom_safari_EME.ts
  init_define_ENVIRONMENT();

  // src/main/compat/eme/custom_media_keys/webkit_media_keys_constructor.ts
  init_define_ENVIRONMENT();
  var WebKitMediaKeysConstructor;
  if (!is_node_default) {
    const { WebKitMediaKeys } = window;
    if (WebKitMediaKeys !== void 0 && typeof WebKitMediaKeys.isTypeSupported === "function" && typeof WebKitMediaKeys.prototype.createSession === "function" && typeof HTMLMediaElement.prototype.webkitSetMediaKeys === "function") {
      WebKitMediaKeysConstructor = WebKitMediaKeys;
    }
  }

  // src/main/compat/should_favour_custom_safari_EME.ts
  function shouldFavourCustomSafariEME() {
    return (isSafariDesktop || isSafariMobile) && WebKitMediaKeysConstructor !== void 0;
  }

  // src/main/compat/eme/custom_media_keys/ie11_media_keys.ts
  init_define_ENVIRONMENT();

  // src/main/compat/event_listeners.ts
  var event_listeners_exports = {};
  __export(event_listeners_exports, {
    addEventListener: () => addEventListener,
    getPageActivityRef: () => getPageActivityRef,
    getPictureOnPictureStateRef: () => getPictureOnPictureStateRef,
    getVideoVisibilityRef: () => getVideoVisibilityRef,
    getVideoWidthRef: () => getVideoWidthRef,
    onEncrypted$: () => onEncrypted$,
    onEnded$: () => onEnded$,
    onFullscreenChange$: () => onFullscreenChange$,
    onKeyAdded$: () => onKeyAdded$,
    onKeyError$: () => onKeyError$,
    onKeyMessage$: () => onKeyMessage$,
    onKeyStatusesChange$: () => onKeyStatusesChange$,
    onLoadedMetadata$: () => onLoadedMetadata$,
    onRemoveSourceBuffers$: () => onRemoveSourceBuffers$,
    onSeeked$: () => onSeeked$,
    onSeeking$: () => onSeeking$,
    onSourceClose$: () => onSourceClose$,
    onSourceEnded$: () => onSourceEnded$,
    onSourceOpen$: () => onSourceOpen$,
    onTextTrackChanges$: () => onTextTrackChanges$,
    onTimeUpdate$: () => onTimeUpdate$,
    onUpdate$: () => onUpdate$
  });
  init_define_ENVIRONMENT();

  // src/common/utils/is_non_empty_string.ts
  init_define_ENVIRONMENT();
  function isNonEmptyString(x) {
    return typeof x === "string" && x.length > 0;
  }

  // src/main/compat/event_listeners.ts
  var BROWSER_PREFIXES = ["", "webkit", "moz", "ms"];
  var pixelRatio = is_node_default || window.devicePixelRatio == null || window.devicePixelRatio === 0 ? 1 : window.devicePixelRatio;
  function isEventSupported(element, eventNameSuffix) {
    const clone = document.createElement(element.tagName);
    const eventName = "on" + eventNameSuffix;
    if (eventName in clone) {
      return true;
    } else {
      clone.setAttribute(eventName, "return;");
      return typeof clone[eventName] === "function";
    }
  }
  function findSupportedEvent(element, eventNames) {
    return eventNames.filter((name) => isEventSupported(element, name))[0];
  }
  function eventPrefixed(eventNames, prefixes) {
    return eventNames.reduce((parent, name) => parent.concat((prefixes == null ? BROWSER_PREFIXES : prefixes).map((p) => p + name)), []);
  }
  function compatibleListener(eventNames, prefixes) {
    let mem;
    const prefixedEvents = eventPrefixed(eventNames, prefixes);
    return (element) => {
      if (element instanceof HTMLElement) {
        if (typeof mem === "undefined") {
          mem = findSupportedEvent(element, prefixedEvents);
        }
        if (isNonEmptyString(mem)) {
          return fromEvent(element, mem);
        } else {
          if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.DEV) {
            log_default.warn(`compat: element ${element.tagName} does not support any of these events: ` + prefixedEvents.join(", "));
          }
          return NEVER;
        }
      }
      return merge(...prefixedEvents.map((eventName) => fromEvent(element, eventName)));
    };
  }
  function getDocumentVisibilityRef(stopListening) {
    let prefix;
    const doc = document;
    if (doc.hidden != null) {
      prefix = "";
    } else if (doc.mozHidden != null) {
      prefix = "moz";
    } else if (doc.msHidden != null) {
      prefix = "ms";
    } else if (doc.webkitHidden != null) {
      prefix = "webkit";
    }
    const hidden = isNonEmptyString(prefix) ? prefix + "Hidden" : "hidden";
    const visibilityChangeEvent = isNonEmptyString(prefix) ? prefix + "visibilitychange" : "visibilitychange";
    const isHidden = document[hidden];
    const ref = reference_default(!isHidden);
    addEventListener(document, visibilityChangeEvent, () => {
      const isVisible = !document[hidden];
      ref.setValueIfChanged(isVisible);
    }, stopListening);
    stopListening.register(() => {
      ref.finish();
    });
    return ref;
  }
  function getPageActivityRef(stopListening) {
    const isDocVisibleRef = getDocumentVisibilityRef(stopListening);
    let currentTimeout;
    const ref = reference_default(true);
    stopListening.register(() => {
      clearTimeout(currentTimeout);
      currentTimeout = void 0;
      ref.finish();
    });
    isDocVisibleRef.onUpdate(function onDocVisibilityChange(isVisible) {
      clearTimeout(currentTimeout);
      currentTimeout = void 0;
      if (!isVisible) {
        const { INACTIVITY_DELAY } = config_default.getCurrent();
        currentTimeout = window.setTimeout(() => {
          ref.setValueIfChanged(false);
        }, INACTIVITY_DELAY);
      }
      ref.setValueIfChanged(true);
    }, { clearSignal: stopListening, emitCurrentValue: true });
    return ref;
  }
  function getVideoWidthFromPIPWindow(mediaElement, pipWindow) {
    const { width, height } = pipWindow;
    const videoRatio = mediaElement.clientHeight / mediaElement.clientWidth;
    const calcWidth = height / videoRatio;
    return Math.min(width, calcWidth);
  }
  function getPictureOnPictureStateRef(elt, stopListening) {
    const mediaElement = elt;
    if (mediaElement.webkitSupportsPresentationMode === true && typeof mediaElement.webkitSetPresentationMode === "function") {
      const isWebKitPIPEnabled = mediaElement.webkitPresentationMode === "picture-in-picture";
      const ref2 = reference_default({
        isEnabled: isWebKitPIPEnabled,
        pipWindow: null
      });
      addEventListener(mediaElement, "webkitpresentationmodechanged", () => {
        const isEnabled = mediaElement.webkitPresentationMode === "picture-in-picture";
        ref2.setValue({ isEnabled, pipWindow: null });
      }, stopListening);
      stopListening.register(() => {
        ref2.finish();
      });
      return ref2;
    }
    const isPIPEnabled = document.pictureInPictureElement === mediaElement;
    const ref = reference_default({
      isEnabled: isPIPEnabled,
      pipWindow: null
    });
    addEventListener(mediaElement, "enterpictureinpicture", (evt) => {
      ref.setValue({
        isEnabled: true,
        pipWindow: evt.pictureInPictureWindow ?? null
      });
    }, stopListening);
    addEventListener(mediaElement, "leavepictureinpicture", () => {
      ref.setValue({ isEnabled: false, pipWindow: null });
    }, stopListening);
    stopListening.register(() => {
      ref.finish();
    });
    return ref;
  }
  function getVideoVisibilityRef(pipStatus, stopListening) {
    const isDocVisibleRef = getDocumentVisibilityRef(stopListening);
    let currentTimeout;
    const ref = reference_default(true);
    stopListening.register(() => {
      clearTimeout(currentTimeout);
      currentTimeout = void 0;
      ref.finish();
    });
    isDocVisibleRef.onUpdate(
      checkCurrentVisibility,
      { clearSignal: stopListening }
    );
    pipStatus.onUpdate(
      checkCurrentVisibility,
      { clearSignal: stopListening }
    );
    checkCurrentVisibility();
    return ref;
    function checkCurrentVisibility() {
      clearTimeout(currentTimeout);
      currentTimeout = void 0;
      if (pipStatus.getValue().isEnabled || isDocVisibleRef.getValue()) {
        ref.setValueIfChanged(true);
      } else {
        const { INACTIVITY_DELAY } = config_default.getCurrent();
        currentTimeout = window.setTimeout(() => {
          ref.setValueIfChanged(false);
        }, INACTIVITY_DELAY);
      }
    }
  }
  function getVideoWidthRef(mediaElement, pipStatusRef, stopListening) {
    const ref = reference_default(mediaElement.clientWidth * pixelRatio);
    let clearPreviousEventListener = noop_default;
    pipStatusRef.onUpdate(checkVideoWidth, { clearSignal: stopListening });
    addEventListener(window, "resize", checkVideoWidth, stopListening);
    const interval = window.setInterval(checkVideoWidth, 2e4);
    checkVideoWidth();
    stopListening.register(function stopUpdatingVideoWidthRef() {
      clearPreviousEventListener();
      clearInterval(interval);
      ref.finish();
    });
    return ref;
    function checkVideoWidth() {
      clearPreviousEventListener();
      const pipStatus = pipStatusRef.getValue();
      if (!pipStatus.isEnabled) {
        ref.setValueIfChanged(mediaElement.clientWidth * pixelRatio);
      } else if (!isNullOrUndefined(pipStatus.pipWindow)) {
        const { pipWindow } = pipStatus;
        const firstWidth = getVideoWidthFromPIPWindow(mediaElement, pipWindow);
        const onPipResize = () => {
          ref.setValueIfChanged(
            getVideoWidthFromPIPWindow(mediaElement, pipWindow) * pixelRatio
          );
        };
        pipWindow.addEventListener("resize", onPipResize);
        clearPreviousEventListener = () => {
          pipWindow.removeEventListener("resize", onPipResize);
          clearPreviousEventListener = noop_default;
        };
        ref.setValueIfChanged(firstWidth * pixelRatio);
      } else {
        ref.setValueIfChanged(Infinity);
      }
    }
  }
  var onLoadedMetadata$ = compatibleListener(["loadedmetadata"]);
  var onSeeking$ = compatibleListener(["seeking"]);
  var onSeeked$ = compatibleListener(["seeked"]);
  var onEnded$ = compatibleListener(["ended"]);
  var onTimeUpdate$ = compatibleListener(["timeupdate"]);
  var onFullscreenChange$ = compatibleListener(
    ["fullscreenchange", "FullscreenChange"],
    BROWSER_PREFIXES.concat("MS")
  );
  var onTextTrackChanges$ = (textTrackList) => merge(
    compatibleListener(["addtrack"])(textTrackList),
    compatibleListener(["removetrack"])(textTrackList)
  );
  var onSourceOpen$ = compatibleListener(["sourceopen", "webkitsourceopen"]);
  var onSourceClose$ = compatibleListener(["sourceclose", "webkitsourceclose"]);
  var onSourceEnded$ = compatibleListener(["sourceended", "webkitsourceended"]);
  var onUpdate$ = compatibleListener(["update"]);
  var onRemoveSourceBuffers$ = compatibleListener(["onremovesourcebuffer"]);
  var onEncrypted$ = compatibleListener(
    shouldFavourCustomSafariEME() ? ["needkey"] : ["encrypted", "needkey"]
  );
  var onKeyMessage$ = compatibleListener(["keymessage", "message"]);
  var onKeyAdded$ = compatibleListener(["keyadded", "ready"]);
  var onKeyError$ = compatibleListener(["keyerror", "error"]);
  var onKeyStatusesChange$ = compatibleListener(["keystatuseschange"]);
  function addEventListener(elt, evt, listener, stopListening) {
    elt.addEventListener(evt, listener);
    stopListening.register(() => {
      elt.removeEventListener(evt, listener);
    });
  }

  // src/main/compat/eme/custom_media_keys/ms_media_keys_constructor.ts
  init_define_ENVIRONMENT();
  var MSMediaKeysConstructor;
  if (!is_node_default) {
    const { MSMediaKeys: MSMediaKeys2 } = window;
    if (MSMediaKeys2 !== void 0 && MSMediaKeys2.prototype !== void 0 && typeof MSMediaKeys2.isTypeSupported === "function" && typeof MSMediaKeys2.prototype.createSession === "function") {
      MSMediaKeysConstructor = MSMediaKeys2;
    }
  }

  // src/main/compat/eme/custom_media_keys/ie11_media_keys.ts
  var IE11MediaKeySession = class extends EventEmitter {
    update;
    closed;
    expiration;
    keyStatuses;
    _mk;
    _closeSession$;
    _ss;
    constructor(mk) {
      super();
      this.expiration = NaN;
      this.keyStatuses = /* @__PURE__ */ new Map();
      this._mk = mk;
      this._closeSession$ = new Subject();
      this.closed = new Promise((resolve) => {
        this._closeSession$.subscribe(resolve);
      });
      this.update = (license) => {
        return new Promise((resolve, reject) => {
          if (this._ss === void 0) {
            return reject("MediaKeySession not set.");
          }
          try {
            resolve(
              this._ss.update(license, "")
            );
          } catch (err) {
            reject(err);
          }
        });
      };
    }
    generateRequest(_initDataType, initData) {
      return new Promise((resolve) => {
        const initDataU8 = initData instanceof Uint8Array ? initData : initData instanceof ArrayBuffer ? new Uint8Array(initData) : new Uint8Array(initData.buffer);
        this._ss = this._mk.createSession("video/mp4", initDataU8);
        merge(
          onKeyMessage$(this._ss),
          onKeyAdded$(this._ss),
          onKeyError$(this._ss)
        ).pipe(takeUntil(this._closeSession$)).subscribe((evt) => this.trigger(evt.type, evt));
        resolve();
      });
    }
    close() {
      return new Promise((resolve) => {
        if (this._ss != null) {
          this._ss.close();
          this._ss = void 0;
        }
        this._closeSession$.next();
        this._closeSession$.complete();
        resolve();
      });
    }
    load() {
      return Promise.resolve(false);
    }
    remove() {
      return Promise.resolve();
    }
    get sessionId() {
      return this._ss?.sessionId ?? "";
    }
  };
  var IE11CustomMediaKeys = class {
    _videoElement;
    _mediaKeys;
    constructor(keyType) {
      if (MSMediaKeysConstructor === void 0) {
        throw new Error("No MSMediaKeys API.");
      }
      this._mediaKeys = new MSMediaKeysConstructor(keyType);
    }
    _setVideo(videoElement) {
      this._videoElement = videoElement;
      if (this._videoElement.msSetMediaKeys !== void 0) {
        return this._videoElement.msSetMediaKeys(this._mediaKeys);
      }
    }
    createSession() {
      if (this._videoElement === void 0 || this._mediaKeys === void 0) {
        throw new Error("Video not attached to the MediaKeys");
      }
      return new IE11MediaKeySession(this._mediaKeys);
    }
    setServerCertificate() {
      throw new Error("Server certificate is not implemented in your browser");
    }
  };
  function getIE11MediaKeysCallbacks() {
    const isTypeSupported = (keySystem, type) => {
      if (MSMediaKeysConstructor === void 0) {
        throw new Error("No MSMediaKeys API.");
      }
      if (type !== void 0) {
        return MSMediaKeysConstructor.isTypeSupported(keySystem, type);
      }
      return MSMediaKeysConstructor.isTypeSupported(keySystem);
    };
    const createCustomMediaKeys = (keyType) => new IE11CustomMediaKeys(keyType);
    const setMediaKeys2 = (elt, mediaKeys) => {
      if (mediaKeys === null) {
        return;
      }
      if (!(mediaKeys instanceof IE11CustomMediaKeys)) {
        throw new Error("Custom setMediaKeys is supposed to be called with IE11 custom MediaKeys.");
      }
      return mediaKeys._setVideo(elt);
    };
    return {
      isTypeSupported,
      createCustomMediaKeys,
      setMediaKeys: setMediaKeys2
    };
  }

  // src/main/compat/eme/custom_media_keys/moz_media_keys_constructor.ts
  init_define_ENVIRONMENT();
  var MozMediaKeysConstructor;
  if (!is_node_default) {
    const { MozMediaKeys } = window;
    if (MozMediaKeys !== void 0 && MozMediaKeys.prototype !== void 0 && typeof MozMediaKeys.isTypeSupported === "function" && typeof MozMediaKeys.prototype.createSession === "function") {
      MozMediaKeysConstructor = MozMediaKeys;
    }
  }
  function getMozMediaKeysCallbacks() {
    const isTypeSupported = (keySystem, type) => {
      if (MozMediaKeysConstructor === void 0) {
        throw new Error("No MozMediaKeys API.");
      }
      if (type !== void 0) {
        return MozMediaKeysConstructor.isTypeSupported(keySystem, type);
      }
      return MozMediaKeysConstructor.isTypeSupported(keySystem);
    };
    const createCustomMediaKeys = (keyType) => {
      if (MozMediaKeysConstructor === void 0) {
        throw new Error("No MozMediaKeys API.");
      }
      return new MozMediaKeysConstructor(keyType);
    };
    const setMediaKeys2 = (mediaElement, mediaKeys) => {
      const elt = mediaElement;
      if (elt.mozSetMediaKeys === void 0 || typeof elt.mozSetMediaKeys !== "function") {
        throw new Error("Can't set video on MozMediaKeys.");
      }
      return elt.mozSetMediaKeys(mediaKeys);
    };
    return {
      isTypeSupported,
      createCustomMediaKeys,
      setMediaKeys: setMediaKeys2
    };
  }

  // src/main/compat/eme/custom_media_keys/old_webkit_media_keys.ts
  init_define_ENVIRONMENT();

  // src/common/utils/base64.ts
  init_define_ENVIRONMENT();
  var base64abc = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
    "i",
    "j",
    "k",
    "l",
    "m",
    "n",
    "o",
    "p",
    "q",
    "r",
    "s",
    "t",
    "u",
    "v",
    "w",
    "x",
    "y",
    "z",
    "0",
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "+",
    "/"
  ];
  var base64codes = [
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    255,
    62,
    255,
    255,
    255,
    63,
    52,
    53,
    54,
    55,
    56,
    57,
    58,
    59,
    60,
    61,
    255,
    255,
    255,
    0,
    255,
    255,
    255,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    21,
    22,
    23,
    24,
    25,
    255,
    255,
    255,
    255,
    255,
    255,
    26,
    27,
    28,
    29,
    30,
    31,
    32,
    33,
    34,
    35,
    36,
    37,
    38,
    39,
    40,
    41,
    42,
    43,
    44,
    45,
    46,
    47,
    48,
    49,
    50,
    51
  ];
  function getBase64Code(charCode) {
    if (charCode >= base64codes.length) {
      throw new Error("Unable to parse base64 string.");
    }
    const code = base64codes[charCode];
    if (code === 255) {
      throw new Error("Unable to parse base64 string.");
    }
    return code;
  }
  function bytesToBase64(bytes) {
    let result = "";
    let i;
    const length = bytes.length;
    for (i = 2; i < length; i += 3) {
      result += base64abc[bytes[i - 2] >> 2];
      result += base64abc[(bytes[i - 2] & 3) << 4 | bytes[i - 1] >> 4];
      result += base64abc[(bytes[i - 1] & 15) << 2 | bytes[i] >> 6];
      result += base64abc[bytes[i] & 63];
    }
    if (i === length + 1) {
      result += base64abc[bytes[i - 2] >> 2];
      result += base64abc[(bytes[i - 2] & 3) << 4];
      result += "==";
    }
    if (i === length) {
      result += base64abc[bytes[i - 2] >> 2];
      result += base64abc[(bytes[i - 2] & 3) << 4 | bytes[i - 1] >> 4];
      result += base64abc[(bytes[i - 1] & 15) << 2];
      result += "=";
    }
    return result;
  }
  function base64ToBytes(str) {
    const paddingNeeded = str.length % 4;
    let paddedStr = str;
    if (paddingNeeded !== 0) {
      log_default.warn("base64ToBytes: base64 given miss padding");
      paddedStr += paddingNeeded === 3 ? "=" : paddingNeeded === 2 ? "==" : "===";
    }
    const index = paddedStr.indexOf("=");
    if (index !== -1 && index < paddedStr.length - 2) {
      throw new Error("Unable to parse base64 string.");
    }
    const missingOctets = paddedStr.endsWith("==") ? 2 : paddedStr.endsWith("=") ? 1 : 0;
    const n = paddedStr.length;
    const result = new Uint8Array(n / 4 * 3);
    let buffer;
    for (let i = 0, j = 0; i < n; i += 4, j += 3) {
      buffer = getBase64Code(paddedStr.charCodeAt(i)) << 18 | getBase64Code(paddedStr.charCodeAt(i + 1)) << 12 | getBase64Code(paddedStr.charCodeAt(i + 2)) << 6 | getBase64Code(paddedStr.charCodeAt(i + 3));
      result[j] = buffer >> 16;
      result[j + 1] = buffer >> 8 & 255;
      result[j + 2] = buffer & 255;
    }
    return result.subarray(0, result.length - missingOctets);
  }

  // src/common/utils/string_parsing.ts
  init_define_ENVIRONMENT();
  var hasTextDecoder = typeof window === "object" && typeof window.TextDecoder === "function";
  var hasTextEncoder = typeof window === "object" && typeof window.TextEncoder === "function";
  function strToUtf16LE(str) {
    const buffer = new ArrayBuffer(str.length * 2);
    const res = new Uint8Array(buffer);
    for (let i = 0; i < res.length; i += 2) {
      const value = str.charCodeAt(i / 2);
      res[i] = value & 255;
      res[i + 1] = value >> 8 & 255;
    }
    return res;
  }
  function utf16LEToStr(bytes) {
    if (hasTextDecoder) {
      try {
        const decoder = new TextDecoder("utf-16le");
        return decoder.decode(bytes);
      } catch (e) {
        const err = e instanceof Error ? e : "";
        log_default.warn("Utils: could not use TextDecoder to parse UTF-16LE, fallbacking to another implementation", err);
      }
    }
    let str = "";
    for (let i = 0; i < bytes.length; i += 2) {
      str += String.fromCharCode((bytes[i + 1] << 8) + bytes[i]);
    }
    return str;
  }
  function strToUtf8(str) {
    if (hasTextEncoder) {
      try {
        const encoder = new TextEncoder();
        return encoder.encode(str);
      } catch (e) {
        const err = e instanceof Error ? e : "";
        log_default.warn("Utils: could not use TextEncoder to encode string into UTF-8, fallbacking to another implementation", err);
      }
    }
    let utf8Str;
    const pcStr = encodeURIComponent(str);
    if (typeof unescape === "function") {
      utf8Str = unescape(pcStr);
    } else {
      const isHexChar = /[0-9a-fA-F]/;
      const pcStrLen = pcStr.length;
      utf8Str = "";
      for (let i = 0; i < pcStr.length; i++) {
        let wasPercentEncoded = false;
        if (pcStr[i] === "%") {
          if (i <= pcStrLen - 6 && pcStr[i + 1] === "u" && isHexChar.test(pcStr[i + 2]) && isHexChar.test(pcStr[i + 3]) && isHexChar.test(pcStr[i + 4]) && isHexChar.test(pcStr[i + 5])) {
            const charCode = parseInt(pcStr.substring(i + 1, i + 6), 16);
            utf8Str += String.fromCharCode(charCode);
            wasPercentEncoded = true;
            i += 5;
          } else if (i <= pcStrLen - 3 && isHexChar.test(pcStr[i + 1]) && isHexChar.test(pcStr[i + 2])) {
            const charCode = parseInt(pcStr.substring(i + 1, i + 3), 16);
            utf8Str += String.fromCharCode(charCode);
            wasPercentEncoded = true;
            i += 2;
          }
        }
        if (!wasPercentEncoded) {
          utf8Str += pcStr[i];
        }
      }
    }
    const res = new Uint8Array(utf8Str.length);
    for (let i = 0; i < utf8Str.length; i++) {
      res[i] = utf8Str.charCodeAt(i) & 255;
    }
    return res;
  }
  function stringFromCharCodes(args) {
    const max = 16e3;
    let ret = "";
    for (let i = 0; i < args.length; i += max) {
      const subArray = args.subarray(i, i + max);
      ret += String.fromCharCode.apply(null, subArray);
    }
    return ret;
  }
  function intToHex(num, size) {
    const toStr = num.toString(16);
    return toStr.length >= size ? toStr : new Array(size - toStr.length + 1).join("0") + toStr;
  }
  function utf8ToStr(data) {
    if (hasTextDecoder) {
      try {
        const decoder = new TextDecoder();
        return decoder.decode(data);
      } catch (e) {
        const err = e instanceof Error ? e : "";
        log_default.warn("Utils: could not use TextDecoder to parse UTF-8, fallbacking to another implementation", err);
      }
    }
    let uint8 = data;
    if (uint8[0] === 239 && uint8[1] === 187 && uint8[2] === 191) {
      uint8 = uint8.subarray(3);
    }
    const utf8Str = stringFromCharCodes(uint8);
    let escaped;
    if (typeof escape === "function") {
      escaped = escape(utf8Str);
    } else {
      const nonEscapedChar = /[A-Za-z0-9*_\+-\.\/]/;
      escaped = "";
      for (let i = 0; i < utf8Str.length; i++) {
        if (nonEscapedChar.test(utf8Str[i])) {
          escaped += utf8Str[i];
        } else {
          const charCode = utf8Str.charCodeAt(i);
          escaped += charCode >= 256 ? "%u" + intToHex(charCode, 4) : "%" + intToHex(charCode, 2);
        }
      }
    }
    return decodeURIComponent(escaped);
  }
  function bytesToHex(bytes, sep = "") {
    let hex = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      hex += (bytes[i] >>> 4).toString(16);
      hex += (bytes[i] & 15).toString(16);
      if (sep.length > 0 && i < bytes.byteLength - 1) {
        hex += sep;
      }
    }
    return hex;
  }
  function guidToUuid(guid) {
    assert(guid.length === 16, "GUID length should be 16");
    const p1A = guid[0];
    const p1B = guid[1];
    const p1C = guid[2];
    const p1D = guid[3];
    const p2A = guid[4];
    const p2B = guid[5];
    const p3A = guid[6];
    const p3B = guid[7];
    const uuid = new Uint8Array(16);
    uuid[0] = p1D;
    uuid[1] = p1C;
    uuid[2] = p1B;
    uuid[3] = p1A;
    uuid[4] = p2B;
    uuid[5] = p2A;
    uuid[6] = p3B;
    uuid[7] = p3A;
    uuid.set(guid.subarray(8, 16), 8);
    return uuid;
  }

  // src/main/compat/eme/custom_media_keys/old_webkit_media_keys.ts
  function isOldWebkitMediaElement(element) {
    return typeof element.webkitGenerateKeyRequest === "function";
  }
  var OldWebkitMediaKeySession = class extends EventEmitter {
    closed;
    expiration;
    keyStatuses;
    sessionId;
    _vid;
    _key;
    _closeSession;
    constructor(mediaElement, keySystem) {
      super();
      this._vid = mediaElement;
      this._key = keySystem;
      this.sessionId = "";
      this._closeSession = noop_default;
      this.keyStatuses = /* @__PURE__ */ new Map();
      this.expiration = NaN;
      const onSessionRelatedEvent = (evt) => {
        this.trigger(evt.type, evt);
      };
      this.closed = new Promise((resolve) => {
        this._closeSession = () => {
          ["keymessage", "message", "keyadded", "ready", "keyerror", "error"].forEach((evt) => {
            mediaElement.removeEventListener(evt, onSessionRelatedEvent);
            mediaElement.removeEventListener(`webkit${evt}`, onSessionRelatedEvent);
          });
          resolve();
        };
      });
      ["keymessage", "message", "keyadded", "ready", "keyerror", "error"].forEach((evt) => {
        mediaElement.addEventListener(evt, onSessionRelatedEvent);
        mediaElement.addEventListener(`webkit${evt}`, onSessionRelatedEvent);
      });
    }
    update(license) {
      return new Promise((resolve, reject) => {
        try {
          if (this._key.indexOf("clearkey") >= 0) {
            const licenseTypedArray = license instanceof ArrayBuffer ? new Uint8Array(license) : license;
            const json = JSON.parse(utf8ToStr(licenseTypedArray));
            const key = base64ToBytes(json.keys[0].k);
            const kid = base64ToBytes(json.keys[0].kid);
            resolve(this._vid.webkitAddKey(this._key, key, kid, ""));
          } else {
            resolve(this._vid.webkitAddKey(this._key, license, null, ""));
          }
        } catch (err) {
          reject(err);
        }
      });
    }
    generateRequest(_initDataType, initData) {
      return new Promise((resolve) => {
        this._vid.webkitGenerateKeyRequest(this._key, initData);
        resolve();
      });
    }
    close() {
      return new Promise((resolve) => {
        this._closeSession();
        resolve();
      });
    }
    load() {
      return Promise.resolve(false);
    }
    remove() {
      return Promise.resolve();
    }
  };
  var OldWebKitCustomMediaKeys = class {
    _keySystem;
    _videoElement;
    constructor(keySystem) {
      this._keySystem = keySystem;
    }
    _setVideo(videoElement) {
      if (!isOldWebkitMediaElement(videoElement)) {
        throw new Error("Video not attached to the MediaKeys");
      }
      this._videoElement = videoElement;
    }
    createSession() {
      if (this._videoElement == null) {
        throw new Error("Video not attached to the MediaKeys");
      }
      return new OldWebkitMediaKeySession(this._videoElement, this._keySystem);
    }
    setServerCertificate() {
      throw new Error("Server certificate is not implemented in your browser");
    }
  };
  function getOldWebKitMediaKeysCallbacks() {
    const isTypeSupported = function(keyType) {
      let videoElement = document.querySelector("video");
      if (videoElement == null) {
        videoElement = document.createElement("video");
      }
      if (videoElement != null && typeof videoElement.canPlayType === "function") {
        return !!videoElement.canPlayType("video/mp4", keyType);
      } else {
        return false;
      }
    };
    const createCustomMediaKeys = (keyType) => new OldWebKitCustomMediaKeys(keyType);
    const setMediaKeys2 = (elt, mediaKeys) => {
      if (mediaKeys === null) {
        return;
      }
      if (!(mediaKeys instanceof OldWebKitCustomMediaKeys)) {
        throw new Error("Custom setMediaKeys is supposed to be called with old webkit custom MediaKeys.");
      }
      return mediaKeys._setVideo(elt);
    };
    return {
      isTypeSupported,
      createCustomMediaKeys,
      setMediaKeys: setMediaKeys2
    };
  }

  // src/main/compat/eme/custom_media_keys/webkit_media_keys.ts
  init_define_ENVIRONMENT();

  // src/main/compat/eme/get_webkit_fairplay_initdata.ts
  init_define_ENVIRONMENT();

  // src/common/utils/byte_parsing.ts
  init_define_ENVIRONMENT();
  function concat2(...args) {
    const l = args.length;
    let i = -1;
    let len = 0;
    let arg;
    while (++i < l) {
      arg = args[i];
      len += typeof arg === "number" ? arg : arg.length;
    }
    const arr = new Uint8Array(len);
    let offset = 0;
    i = -1;
    while (++i < l) {
      arg = args[i];
      if (typeof arg === "number") {
        offset += arg;
      } else if (arg.length > 0) {
        arr.set(arg, offset);
        offset += arg.length;
      }
    }
    return arr;
  }
  function be4toi(bytes, offset) {
    return bytes[offset + 0] * 16777216 + bytes[offset + 1] * 65536 + bytes[offset + 2] * 256 + bytes[offset + 3];
  }
  function be8toi(bytes, offset) {
    return (bytes[offset + 0] * 16777216 + bytes[offset + 1] * 65536 + bytes[offset + 2] * 256 + bytes[offset + 3]) * 4294967296 + bytes[offset + 4] * 16777216 + bytes[offset + 5] * 65536 + bytes[offset + 6] * 256 + bytes[offset + 7];
  }
  function le4toi(bytes, offset) {
    return bytes[offset + 0] + bytes[offset + 1] * 256 + bytes[offset + 2] * 65536 + bytes[offset + 3] * 16777216;
  }
  function itole4(num) {
    return new Uint8Array([
      num & 255,
      num >>> 8 & 255,
      num >>> 16 & 255,
      num >>> 24 & 255
    ]);
  }

  // src/main/compat/eme/get_webkit_fairplay_initdata.ts
  function getWebKitFairPlayInitData(initDataBytes, serverCertificateBytes) {
    const initData = initDataBytes instanceof Uint8Array ? initDataBytes : new Uint8Array(initDataBytes);
    const serverCertificate = serverCertificateBytes instanceof Uint8Array ? serverCertificateBytes : new Uint8Array(serverCertificateBytes);
    const length = le4toi(initData, 0);
    if (length + 4 !== initData.length) {
      throw new Error("Unsupported WebKit initData.");
    }
    const initDataUri = utf16LEToStr(initData);
    const skdIndexInInitData = initDataUri.indexOf("skd://");
    const contentIdStr = skdIndexInInitData > -1 ? initDataUri.substring(skdIndexInInitData + 6) : initDataUri;
    const id = strToUtf16LE(contentIdStr);
    let offset = 0;
    const res = new Uint8Array(initData.byteLength + 4 + id.byteLength + 4 + serverCertificate.byteLength);
    res.set(initData);
    offset += initData.length;
    res.set(itole4(id.byteLength), offset);
    offset += 4;
    res.set(id, offset);
    offset += id.byteLength;
    res.set(itole4(serverCertificate.byteLength), offset);
    offset += 4;
    res.set(serverCertificate, offset);
    return res;
  }

  // src/main/compat/eme/custom_media_keys/webkit_media_keys.ts
  function isFairplayKeyType(keyType) {
    return keyType === "com.apple.fps.1_0" || keyType === "com.apple.fps.2_0";
  }
  function setWebKitMediaKeys(videoElement, mediaKeys) {
    const elt = videoElement;
    if (elt.webkitSetMediaKeys === void 0) {
      throw new Error("No webKitMediaKeys API.");
    }
    return elt.webkitSetMediaKeys(mediaKeys);
  }
  var WebkitMediaKeySession = class extends EventEmitter {
    closed;
    expiration;
    keyStatuses;
    _videoElement;
    _keyType;
    _nativeSession;
    _serverCertificate;
    _closeSession;
    _unbindSession;
    constructor(mediaElement, keyType, serverCertificate) {
      super();
      this._serverCertificate = serverCertificate;
      this._videoElement = mediaElement;
      this._keyType = keyType;
      this._unbindSession = noop_default;
      this._closeSession = noop_default;
      this.closed = new Promise((resolve) => {
        this._closeSession = resolve;
      });
      this.keyStatuses = /* @__PURE__ */ new Map();
      this.expiration = NaN;
    }
    update(license) {
      return new Promise((resolve, reject) => {
        if (this._nativeSession === void 0 || this._nativeSession.update === void 0 || typeof this._nativeSession.update !== "function") {
          return reject("Unavailable WebKit key session.");
        }
        try {
          let uInt8Arraylicense;
          if (license instanceof ArrayBuffer) {
            uInt8Arraylicense = new Uint8Array(license);
          } else if (license instanceof Uint8Array) {
            uInt8Arraylicense = license;
          } else {
            uInt8Arraylicense = new Uint8Array(license.buffer);
          }
          resolve(this._nativeSession.update(uInt8Arraylicense));
        } catch (err) {
          reject(err);
        }
      });
    }
    generateRequest(_initDataType, initData) {
      return new Promise((resolve) => {
        const elt = this._videoElement;
        if (elt.webkitKeys?.createSession === void 0) {
          throw new Error("No WebKitMediaKeys API.");
        }
        let formattedInitData;
        if (isFairplayKeyType(this._keyType)) {
          if (this._serverCertificate === void 0) {
            throw new Error(
              "A server certificate is needed for creating fairplay session."
            );
          }
          formattedInitData = getWebKitFairPlayInitData(initData, this._serverCertificate);
        } else {
          formattedInitData = initData;
        }
        const keySession = elt.webkitKeys.createSession("video/mp4", formattedInitData);
        if (keySession === void 0 || keySession === null) {
          throw new Error("Impossible to get the key sessions");
        }
        this._listenEvent(keySession);
        this._nativeSession = keySession;
        resolve();
      });
    }
    close() {
      return new Promise((resolve, reject) => {
        this._unbindSession();
        this._closeSession();
        if (this._nativeSession === void 0) {
          reject("No session to close.");
          return;
        }
        this._nativeSession.close();
        resolve();
      });
    }
    load() {
      return Promise.resolve(false);
    }
    remove() {
      return Promise.resolve();
    }
    get sessionId() {
      return this._nativeSession?.sessionId ?? "";
    }
    _listenEvent(session) {
      this._unbindSession();
      const onEvent = (evt) => {
        this.trigger(evt.type, evt);
      };
      ["keymessage", "message", "keyadded", "ready", "keyerror", "error"].forEach((evt) => {
        session.addEventListener(evt, onEvent);
        session.addEventListener(`webkit${evt}`, onEvent);
      });
      this._unbindSession = () => {
        ["keymessage", "message", "keyadded", "ready", "keyerror", "error"].forEach((evt) => {
          session.removeEventListener(evt, onEvent);
          session.removeEventListener(`webkit${evt}`, onEvent);
        });
      };
    }
  };
  var WebKitCustomMediaKeys = class {
    _videoElement;
    _mediaKeys;
    _serverCertificate;
    _keyType;
    constructor(keyType) {
      if (WebKitMediaKeysConstructor === void 0) {
        throw new Error("No WebKitMediaKeys API.");
      }
      this._keyType = keyType;
      this._mediaKeys = new WebKitMediaKeysConstructor(keyType);
    }
    _setVideo(videoElement) {
      this._videoElement = videoElement;
      if (this._videoElement === void 0) {
        throw new Error("Video not attached to the MediaKeys");
      }
      return setWebKitMediaKeys(this._videoElement, this._mediaKeys);
    }
    createSession() {
      if (this._videoElement === void 0 || this._mediaKeys === void 0) {
        throw new Error("Video not attached to the MediaKeys");
      }
      return new WebkitMediaKeySession(
        this._videoElement,
        this._keyType,
        this._serverCertificate
      );
    }
    setServerCertificate(serverCertificate) {
      this._serverCertificate = serverCertificate;
      return Promise.resolve();
    }
  };
  function getWebKitMediaKeysCallbacks() {
    if (WebKitMediaKeysConstructor === void 0) {
      throw new Error("No WebKitMediaKeys API.");
    }
    const isTypeSupported = WebKitMediaKeysConstructor.isTypeSupported;
    const createCustomMediaKeys = (keyType) => new WebKitCustomMediaKeys(keyType);
    const setMediaKeys2 = (elt, mediaKeys) => {
      if (mediaKeys === null) {
        return setWebKitMediaKeys(elt, mediaKeys);
      }
      if (!(mediaKeys instanceof WebKitCustomMediaKeys)) {
        throw new Error("Custom setMediaKeys is supposed to be called with webkit custom MediaKeys.");
      }
      return mediaKeys._setVideo(elt);
    };
    return {
      isTypeSupported,
      createCustomMediaKeys,
      setMediaKeys: setMediaKeys2
    };
  }

  // src/main/compat/eme/custom_media_keys/index.ts
  var requestMediaKeySystemAccess = null;
  var setMediaKeys = function defaultSetMediaKeys(mediaElement, mediaKeys) {
    const elt = mediaElement;
    if (typeof elt.setMediaKeys === "function") {
      return elt.setMediaKeys(mediaKeys);
    }
    if (typeof elt.webkitSetMediaKeys === "function") {
      return elt.webkitSetMediaKeys(mediaKeys);
    }
    if (typeof elt.mozSetMediaKeys === "function") {
      return elt.mozSetMediaKeys(mediaKeys);
    }
    if (typeof elt.msSetMediaKeys === "function" && mediaKeys !== null) {
      return elt.msSetMediaKeys(mediaKeys);
    }
  };
  if (is_node_default || navigator.requestMediaKeySystemAccess != null && !shouldFavourCustomSafariEME()) {
    requestMediaKeySystemAccess = (...args) => navigator.requestMediaKeySystemAccess(...args);
  } else {
    let isTypeSupported;
    let createCustomMediaKeys;
    if (isOldWebkitMediaElement(HTMLVideoElement.prototype)) {
      const callbacks = getOldWebKitMediaKeysCallbacks();
      isTypeSupported = callbacks.isTypeSupported;
      createCustomMediaKeys = callbacks.createCustomMediaKeys;
      setMediaKeys = callbacks.setMediaKeys;
    } else if (WebKitMediaKeysConstructor !== void 0) {
      const callbacks = getWebKitMediaKeysCallbacks();
      isTypeSupported = callbacks.isTypeSupported;
      createCustomMediaKeys = callbacks.createCustomMediaKeys;
      setMediaKeys = callbacks.setMediaKeys;
    } else if (isIE11 && MSMediaKeysConstructor !== void 0) {
      const callbacks = getIE11MediaKeysCallbacks();
      isTypeSupported = callbacks.isTypeSupported;
      createCustomMediaKeys = callbacks.createCustomMediaKeys;
      setMediaKeys = callbacks.setMediaKeys;
    } else if (MozMediaKeysConstructor !== void 0) {
      const callbacks = getMozMediaKeysCallbacks();
      isTypeSupported = callbacks.isTypeSupported;
      createCustomMediaKeys = callbacks.createCustomMediaKeys;
      setMediaKeys = callbacks.setMediaKeys;
    } else {
      const MK = window.MediaKeys;
      const checkForStandardMediaKeys = () => {
        if (MK === void 0) {
          throw new MediaError(
            "MEDIA_KEYS_NOT_SUPPORTED",
            "No `MediaKeys` implementation found in the current browser."
          );
        }
        if (typeof MK.isTypeSupported === "undefined") {
          const message = "This browser seems to be unable to play encrypted contents currently. Note: Some browsers do not allow decryption in some situations, like when not using HTTPS.";
          throw new Error(message);
        }
      };
      isTypeSupported = (keyType) => {
        checkForStandardMediaKeys();
        assert(typeof MK.isTypeSupported === "function");
        return MK.isTypeSupported(keyType);
      };
      createCustomMediaKeys = (keyType) => {
        checkForStandardMediaKeys();
        return new MK(keyType);
      };
    }
    requestMediaKeySystemAccess = function(keyType, keySystemConfigurations) {
      if (!isTypeSupported(keyType)) {
        return Promise.reject(new Error("Unsupported key type"));
      }
      for (let i = 0; i < keySystemConfigurations.length; i++) {
        const keySystemConfiguration = keySystemConfigurations[i];
        const {
          videoCapabilities,
          audioCapabilities,
          initDataTypes,
          distinctiveIdentifier
        } = keySystemConfiguration;
        let supported = true;
        supported = supported && (initDataTypes == null || initDataTypes.some((idt) => idt === "cenc"));
        supported = supported && distinctiveIdentifier !== "required";
        if (supported) {
          const keySystemConfigurationResponse = {
            initDataTypes: ["cenc"],
            distinctiveIdentifier: "not-allowed",
            persistentState: "required",
            sessionTypes: ["temporary", "persistent-license"]
          };
          if (videoCapabilities !== void 0) {
            keySystemConfigurationResponse.videoCapabilities = videoCapabilities;
          }
          if (audioCapabilities !== void 0) {
            keySystemConfigurationResponse.audioCapabilities = audioCapabilities;
          }
          const customMediaKeys = createCustomMediaKeys(keyType);
          return Promise.resolve(
            new CustomMediaKeySystemAccess(
              keyType,
              customMediaKeys,
              keySystemConfigurationResponse
            )
          );
        }
      }
      return Promise.reject(new Error("Unsupported configuration"));
    };
  }

  // src/main/compat/eme/generate_key_request.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/containers/isobmff/index.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/containers/isobmff/take_pssh_out.ts
  init_define_ENVIRONMENT();

  // src/common/utils/slice_uint8array.ts
  init_define_ENVIRONMENT();
  function arraySlice(arr, start, end) {
    return new Uint8Array(Array.prototype.slice.call(arr, start, end));
  }
  function uint8ArraySlice(arr, start, end) {
    return arr.slice(start, end);
  }
  var slice_uint8array_default = typeof Uint8Array.prototype.slice === "function" ? uint8ArraySlice : arraySlice;

  // src/worker/parsers/containers/isobmff/get_box.ts
  init_define_ENVIRONMENT();
  function getNextBoxOffsets(buf) {
    const len = buf.length;
    if (len < 8) {
      log_default.warn("ISOBMFF: box inferior to 8 bytes, cannot find offsets");
      return null;
    }
    let lastOffset = 0;
    let boxSize = be4toi(buf, lastOffset);
    lastOffset += 4;
    const name = be4toi(buf, lastOffset);
    lastOffset += 4;
    if (boxSize === 0) {
      boxSize = len;
    } else if (boxSize === 1) {
      if (lastOffset + 8 > len) {
        log_default.warn("ISOBMFF: box too short, cannot find offsets");
        return null;
      }
      boxSize = be8toi(buf, lastOffset);
      lastOffset += 8;
    }
    if (boxSize < 0) {
      throw new Error("ISOBMFF: Size out of range");
    }
    if (name === 1970628964) {
      lastOffset += 16;
    }
    return [0, lastOffset, boxSize];
  }

  // src/worker/parsers/containers/isobmff/take_pssh_out.ts
  function getPsshSystemID(buff, initialDataOffset) {
    if (buff[initialDataOffset] > 1) {
      log_default.warn("ISOBMFF: un-handled PSSH version");
      return void 0;
    }
    const offset = initialDataOffset + 4;
    if (offset + 16 > buff.length) {
      return void 0;
    }
    const systemIDBytes = slice_uint8array_default(buff, offset, offset + 16);
    return bytesToHex(systemIDBytes);
  }

  // src/main/compat/eme/constants.ts
  init_define_ENVIRONMENT();
  var PSSH_TO_INTEGER = be4toi(strToUtf8("pssh"), 0);

  // src/main/compat/eme/generate_key_request.ts
  function patchInitData(initData) {
    log_default.info("Compat: Trying to move CENC PSSH from init data at the end of it.");
    let foundCencV1 = false;
    let concatenatedCencs = new Uint8Array();
    let resInitData = new Uint8Array();
    let offset = 0;
    while (offset < initData.length) {
      if (initData.length < offset + 8 || be4toi(initData, offset + 4) !== PSSH_TO_INTEGER) {
        log_default.warn("Compat: unrecognized initialization data. Cannot patch it.");
        throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
      }
      const len = be4toi(new Uint8Array(initData), offset);
      if (offset + len > initData.length) {
        log_default.warn("Compat: unrecognized initialization data. Cannot patch it.");
        throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
      }
      const currentPSSH = initData.subarray(offset, offset + len);
      if (initData[offset + 12] === 16 && initData[offset + 13] === 119 && initData[offset + 14] === 239 && initData[offset + 15] === 236 && initData[offset + 16] === 192 && initData[offset + 17] === 178 && initData[offset + 18] === 77 && initData[offset + 19] === 2 && initData[offset + 20] === 172 && initData[offset + 21] === 227 && initData[offset + 22] === 60 && initData[offset + 23] === 30 && initData[offset + 24] === 82 && initData[offset + 25] === 226 && initData[offset + 26] === 251 && initData[offset + 27] === 75) {
        const cencOffsets = getNextBoxOffsets(currentPSSH);
        const version = cencOffsets === null ? void 0 : currentPSSH[cencOffsets[1]];
        log_default.info("Compat: CENC PSSH found with version", version);
        if (version === void 0) {
          log_default.warn("Compat: could not read version of CENC PSSH");
        } else if (foundCencV1 === (version === 1)) {
          concatenatedCencs = concat2(concatenatedCencs, currentPSSH);
        } else if (version === 1) {
          log_default.warn("Compat: cenc version 1 encountered, removing every other cenc pssh box.");
          concatenatedCencs = currentPSSH;
          foundCencV1 = true;
        } else {
          log_default.warn(
            "Compat: filtering out cenc pssh box with wrong version",
            version
          );
        }
      } else {
        resInitData = concat2(resInitData, currentPSSH);
      }
      offset += len;
    }
    if (offset !== initData.length) {
      log_default.warn("Compat: unrecognized initialization data. Cannot patch it.");
      throw new Error("Compat: unrecognized initialization data. Cannot patch it.");
    }
    return concat2(resInitData, concatenatedCencs);
  }
  function generateKeyRequest(session, initializationDataType, initializationData) {
    log_default.debug("Compat: Calling generateRequest on the MediaKeySession");
    let patchedInit;
    try {
      patchedInit = patchInitData(initializationData);
    } catch (_e) {
      patchedInit = initializationData;
    }
    const initDataType = initializationDataType ?? "";
    return session.generateRequest(initDataType, patchedInit).catch((error) => {
      if (initDataType !== "" || !(error instanceof TypeError)) {
        throw error;
      }
      log_default.warn(
        'Compat: error while calling `generateRequest` with an empty initialization data type. Retrying with a default "cenc" value.',
        error
      );
      return session.generateRequest("cenc", patchedInit);
    });
  }

  // src/main/compat/eme/get_init_data.ts
  init_define_ENVIRONMENT();
  function getInitializationDataValues(initData) {
    const result = [];
    let offset = 0;
    while (offset < initData.length) {
      if (initData.length < offset + 8 || be4toi(initData, offset + 4) !== PSSH_TO_INTEGER) {
        log_default.warn("Compat: Unrecognized initialization data. Use as is.");
        return [{
          systemId: void 0,
          data: initData
        }];
      }
      const len = be4toi(new Uint8Array(initData), offset);
      if (offset + len > initData.length) {
        log_default.warn("Compat: Unrecognized initialization data. Use as is.");
        return [{
          systemId: void 0,
          data: initData
        }];
      }
      const currentPSSH = initData.subarray(offset, offset + len);
      const systemId = getPsshSystemID(currentPSSH, 8);
      const currentItem = { systemId, data: currentPSSH };
      if (isPSSHAlreadyEncountered(result, currentItem)) {
        log_default.warn("Compat: Duplicated PSSH found in initialization data, removing it.");
      } else {
        result.push(currentItem);
      }
      offset += len;
    }
    if (offset !== initData.length) {
      log_default.warn("Compat: Unrecognized initialization data. Use as is.");
      return [{
        systemId: void 0,
        data: initData
      }];
    }
    return result;
  }
  function isPSSHAlreadyEncountered(encounteredPSSHs, pssh) {
    for (let i = 0; i < encounteredPSSHs.length; i++) {
      const item = encounteredPSSHs[i];
      if (pssh.systemId === void 0 || item.systemId === void 0 || pssh.systemId === item.systemId) {
        if (areArraysOfNumbersEqual(pssh.data, item.data)) {
          return true;
        }
      }
    }
    return false;
  }
  function getInitData(encryptedEvent) {
    const { initData, initDataType } = encryptedEvent;
    if (initData == null) {
      log_default.warn("Compat: No init data found on media encrypted event.");
      return null;
    }
    const initDataBytes = new Uint8Array(initData);
    const values = getInitializationDataValues(initDataBytes);
    return { type: initDataType, values };
  }

  // src/main/compat/eme/load_session.ts
  init_define_ENVIRONMENT();
  var EME_WAITING_DELAY_LOADED_SESSION_EMPTY_KEYSTATUSES = 100;
  async function loadSession(session, sessionId) {
    log_default.info("Compat/DRM: Load persisted session", sessionId);
    const isLoaded = await session.load(sessionId);
    if (!isLoaded || session.keyStatuses.size > 0) {
      return isLoaded;
    }
    return new Promise((resolve) => {
      session.addEventListener(
        "keystatuseschange",
        resolveWithLoadedStatus
      );
      const timeout2 = setTimeout(
        resolveWithLoadedStatus,
        EME_WAITING_DELAY_LOADED_SESSION_EMPTY_KEYSTATUSES
      );
      function resolveWithLoadedStatus() {
        cleanUp();
        resolve(isLoaded);
      }
      function cleanUp() {
        clearTimeout(timeout2);
        session.removeEventListener(
          "keystatuseschange",
          resolveWithLoadedStatus
        );
      }
    });
  }

  // src/main/compat/fullscreen.ts
  init_define_ENVIRONMENT();
  function requestFullscreen(element) {
    if (!isFullscreen()) {
      const elt = element;
      if (typeof elt.requestFullscreen === "function") {
        elt.requestFullscreen();
      } else if (typeof elt.msRequestFullscreen === "function") {
        elt.msRequestFullscreen();
      } else if (typeof elt.mozRequestFullScreen === "function") {
        elt.mozRequestFullScreen();
      } else if (typeof elt.webkitRequestFullscreen === "function") {
        elt.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
      }
    }
  }
  function exitFullscreen() {
    if (isFullscreen()) {
      const doc = document;
      if (typeof doc.exitFullscreen === "function") {
        doc.exitFullscreen();
      } else if (typeof doc.msExitFullscreen === "function") {
        doc.msExitFullscreen();
      } else if (typeof doc.mozCancelFullScreen === "function") {
        doc.mozCancelFullScreen();
      } else if (typeof doc.webkitExitFullscreen === "function") {
        doc.webkitExitFullscreen();
      }
    }
  }
  function isFullscreen() {
    const doc = document;
    return doc.fullscreenElement != null || doc.mozFullScreenElement != null || doc.webkitFullscreenElement != null || doc.msFullscreenElement != null;
  }

  // src/main/compat/get_start_date.ts
  init_define_ENVIRONMENT();
  function getStartDate(mediaElement) {
    const _mediaElement = mediaElement;
    if (typeof _mediaElement.getStartDate === "function") {
      const startDate = _mediaElement.getStartDate();
      if (typeof startDate === "object" && startDate !== null) {
        const startDateNum = +startDate;
        if (!isNaN(startDateNum)) {
          return startDateNum / 1e3;
        }
      } else if (typeof startDate === "number" && !isNaN(startDate)) {
        return startDate;
      }
    }
  }

  // src/main/compat/has_eme_apis.ts
  init_define_ENVIRONMENT();
  function hasEMEAPIs() {
    return typeof requestMediaKeySystemAccess === "function";
  }

  // src/main/compat/patch_webkit_source_buffer.ts
  init_define_ENVIRONMENT();
  var import_next_tick = __toESM(require_next_tick());
  function patchWebkitSourceBuffer() {
    if (!is_node_default && window.WebKitSourceBuffer != null && window.WebKitSourceBuffer.prototype.addEventListener === void 0) {
      const sourceBufferWebkitRef = window.WebKitSourceBuffer;
      const sourceBufferWebkitProto = sourceBufferWebkitRef.prototype;
      for (const fnName in EventEmitter.prototype) {
        if (EventEmitter.prototype.hasOwnProperty(fnName)) {
          sourceBufferWebkitProto[fnName] = EventEmitter.prototype[fnName];
        }
      }
      sourceBufferWebkitProto._listeners = [];
      sourceBufferWebkitProto._emitUpdate = function(eventName, val) {
        (0, import_next_tick.default)(() => {
          this.trigger(eventName, val);
          this.updating = false;
          this.trigger("updateend");
        });
      };
      sourceBufferWebkitProto.appendBuffer = function(data) {
        if (this.updating) {
          throw new Error("updating");
        }
        this.trigger("updatestart");
        this.updating = true;
        try {
          this.append(data);
        } catch (error) {
          this._emitUpdate("error", error);
          return;
        }
        this._emitUpdate("update");
      };
    }
  }

  // src/main/compat/play.ts
  init_define_ENVIRONMENT();

  // src/common/utils/cast_to_observable.ts
  init_define_ENVIRONMENT();
  function castToObservable(value) {
    if (value instanceof Observable) {
      return value;
    } else if (value instanceof Promise || !isNullOrUndefined(value) && typeof value.then === "function") {
      return from(value);
    }
    return of(value);
  }
  var cast_to_observable_default = castToObservable;

  // src/common/utils/rx-try_catch.ts
  init_define_ENVIRONMENT();
  function tryCatch(func, argsForFunc) {
    try {
      return func(argsForFunc);
    } catch (e) {
      return throwError(() => e);
    }
  }

  // src/main/compat/play.ts
  function play(mediaElement) {
    return defer(
      () => tryCatch(() => cast_to_observable_default(mediaElement.play()), void 0)
    );
  }

  // src/main/compat/should_renew_media_keys.ts
  init_define_ENVIRONMENT();
  function shouldRenewMediaKeys() {
    return isIE11;
  }

  // src/main/compat/should_unset_media_keys.ts
  init_define_ENVIRONMENT();
  function shouldUnsetMediaKeys() {
    return isIE11;
  }

  // src/main/compat/should_validate_metadata.ts
  init_define_ENVIRONMENT();
  function shouldValidateMetadata() {
    return isSamsungBrowser;
  }

  // src/main/compat/should_wait_for_data_before_loaded.ts
  init_define_ENVIRONMENT();
  function shouldWaitForDataBeforeLoaded(isDirectfile, mustPlayInline) {
    if (isDirectfile && isSafariMobile) {
      return mustPlayInline;
    }
    return true;
  }

  // src/main/compat/when_loaded_metadata.ts
  init_define_ENVIRONMENT();
  function whenLoadedMetadata$(mediaElement) {
    if (mediaElement.readyState >= READY_STATES.HAVE_METADATA) {
      return of(null);
    } else {
      return onLoadedMetadata$(mediaElement).pipe(take(1));
    }
  }

  // src/main/compat/index.ts
  patchWebkitSourceBuffer();

  // src/main/features/index.ts
  init_define_ENVIRONMENT();

  // src/main/features/features_object.ts
  init_define_ENVIRONMENT();
  var features = {
    dashParsers: {
      wasm: null,
      js: null
    },
    directfile: null,
    ContentDecryptor: null,
    htmlTextTracksBuffer: null,
    htmlTextTracksParsers: {},
    imageBuffer: null,
    imageParser: null,
    nativeTextTracksBuffer: null,
    nativeTextTracksParsers: {},
    transports: {}
  };
  var features_object_default = features;

  // src/main/features/index.ts
  var features_default = features_object_default;

  // src/main/core/decrypt/index.ts
  init_define_ENVIRONMENT();

  // src/main/core/decrypt/clear_on_stop.ts
  init_define_ENVIRONMENT();

  // src/main/core/decrypt/dispose_decryption_resources.ts
  init_define_ENVIRONMENT();

  // src/main/core/decrypt/utils/media_keys_infos_store.ts
  init_define_ENVIRONMENT();
  var currentMediaState = /* @__PURE__ */ new WeakMap();
  var media_keys_infos_store_default = {
    setState(mediaElement, state) {
      currentMediaState.set(mediaElement, state);
    },
    getState(mediaElement) {
      const currentState = currentMediaState.get(mediaElement);
      return currentState === void 0 ? null : currentState;
    },
    clearState(mediaElement) {
      currentMediaState.set(mediaElement, null);
    }
  };

  // src/main/core/decrypt/dispose_decryption_resources.ts
  async function disposeDecryptionResources(mediaElement) {
    const currentState = media_keys_infos_store_default.getState(mediaElement);
    if (currentState === null) {
      return;
    }
    log_default.info("DRM: Disposing of the current MediaKeys");
    const { loadedSessionsStore } = currentState;
    media_keys_infos_store_default.clearState(mediaElement);
    await loadedSessionsStore.closeAllSessions();
    setMediaKeys(mediaElement, null);
  }

  // src/main/core/decrypt/clear_on_stop.ts
  function clearOnStop(mediaElement) {
    log_default.info("DRM: Clearing-up DRM session.");
    if (shouldUnsetMediaKeys()) {
      log_default.info("DRM: disposing current MediaKeys.");
      return disposeDecryptionResources(mediaElement);
    }
    const currentState = media_keys_infos_store_default.getState(mediaElement);
    if (currentState !== null && currentState.keySystemOptions.closeSessionsOnStop === true) {
      log_default.info("DRM: closing all current sessions.");
      return currentState.loadedSessionsStore.closeAllSessions();
    }
    log_default.info(
      "DRM: Nothing to clear. Returning right away. No state =",
      currentState === null
    );
    return Promise.resolve();
  }

  // src/main/core/decrypt/content_decryptor.ts
  init_define_ENVIRONMENT();

  // src/common/utils/array_find.ts
  init_define_ENVIRONMENT();
  function arrayFind(arr, predicate, thisArg) {
    if (typeof Array.prototype.find === "function") {
      return arr.find(predicate, thisArg);
    }
    const len = arr.length >>> 0;
    for (let i = 0; i < len; i++) {
      const val = arr[i];
      if (predicate.call(thisArg, val, i, arr)) {
        return val;
      }
    }
    return void 0;
  }

  // src/main/core/decrypt/attach_media_keys.ts
  init_define_ENVIRONMENT();
  function disableMediaKeys(mediaElement) {
    media_keys_infos_store_default.setState(mediaElement, null);
    setMediaKeys(mediaElement, null);
  }
  async function attachMediaKeys(mediaElement, {
    keySystemOptions,
    loadedSessionsStore,
    mediaKeySystemAccess,
    mediaKeys
  }, cancelSignal) {
    const previousState = media_keys_infos_store_default.getState(mediaElement);
    const closeAllSessions = previousState !== null && previousState.loadedSessionsStore !== loadedSessionsStore ? previousState.loadedSessionsStore.closeAllSessions() : Promise.resolve();
    await closeAllSessions;
    if (cancelSignal.isCancelled) {
      throw cancelSignal.cancellationError;
    }
    media_keys_infos_store_default.setState(mediaElement, {
      keySystemOptions,
      mediaKeySystemAccess,
      mediaKeys,
      loadedSessionsStore
    });
    if (mediaElement.mediaKeys === mediaKeys) {
      return;
    }
    log_default.info("DRM: Attaching MediaKeys to the media element");
    setMediaKeys(mediaElement, mediaKeys);
    log_default.info("DRM: MediaKeys attached with success");
  }

  // src/main/core/decrypt/create_or_load_session.ts
  init_define_ENVIRONMENT();

  // src/main/core/decrypt/create_session.ts
  init_define_ENVIRONMENT();

  // src/main/core/decrypt/utils/is_session_usable.ts
  init_define_ENVIRONMENT();
  function isSessionUsable(loadedSession) {
    if (loadedSession.sessionId === "") {
      return false;
    }
    const keyStatusesMap = loadedSession.keyStatuses;
    const keyStatuses = [];
    keyStatusesMap.forEach((keyStatus) => {
      keyStatuses.push(keyStatus);
    });
    if (keyStatuses.length <= 0) {
      log_default.debug(
        "DRM: isSessionUsable: MediaKeySession given has an empty keyStatuses",
        loadedSession.sessionId
      );
      return false;
    }
    if (arrayIncludes(keyStatuses, "expired")) {
      log_default.debug(
        "DRM: isSessionUsable: MediaKeySession given has an expired key",
        loadedSession.sessionId
      );
      return false;
    }
    if (arrayIncludes(keyStatuses, "internal-error")) {
      log_default.debug(
        "DRM: isSessionUsable: MediaKeySession given has a key with an internal-error",
        loadedSession.sessionId
      );
      return false;
    }
    log_default.debug("DRM: isSessionUsable: MediaKeySession is usable", loadedSession.sessionId);
    return true;
  }

  // src/main/core/decrypt/create_session.ts
  function createSession(stores, initData, wantedSessionType, cancelSignal) {
    const {
      loadedSessionsStore,
      persistentSessionsStore
    } = stores;
    if (wantedSessionType === "temporary") {
      return createTemporarySession(loadedSessionsStore, initData);
    } else if (persistentSessionsStore === null) {
      log_default.warn("DRM: Cannot create persistent MediaKeySession, PersistentSessionsStore not created.");
      return createTemporarySession(loadedSessionsStore, initData);
    }
    return createAndTryToRetrievePersistentSession(
      loadedSessionsStore,
      persistentSessionsStore,
      initData,
      cancelSignal
    );
  }
  function createTemporarySession(loadedSessionsStore, initData) {
    log_default.info("DRM: Creating a new temporary session");
    const entry = loadedSessionsStore.createSession(initData, "temporary");
    return Promise.resolve({
      type: "created-session" /* Created */,
      value: entry
    });
  }
  async function createAndTryToRetrievePersistentSession(loadedSessionsStore, persistentSessionsStore, initData, cancelSignal) {
    if (cancelSignal.cancellationError !== null) {
      throw cancelSignal.cancellationError;
    }
    log_default.info("DRM: Creating persistent MediaKeySession");
    const entry = loadedSessionsStore.createSession(initData, "persistent-license");
    const storedEntry = persistentSessionsStore.getAndReuse(initData);
    if (storedEntry === null) {
      return {
        type: "created-session" /* Created */,
        value: entry
      };
    }
    try {
      const hasLoadedSession = await loadedSessionsStore.loadPersistentSession(
        entry.mediaKeySession,
        storedEntry.sessionId
      );
      if (!hasLoadedSession) {
        log_default.warn("DRM: No data stored for the loaded session");
        persistentSessionsStore.delete(storedEntry.sessionId);
        return {
          type: "created-session" /* Created */,
          value: entry
        };
      }
      if (hasLoadedSession && isSessionUsable(entry.mediaKeySession)) {
        persistentSessionsStore.add(initData, initData.keyIds, entry.mediaKeySession);
        log_default.info("DRM: Succeeded to load persistent session.");
        return {
          type: "loaded-persistent-session" /* LoadedPersistentSession */,
          value: entry
        };
      }
      log_default.warn("DRM: Previous persistent session not usable anymore.");
      return recreatePersistentSession();
    } catch (err) {
      log_default.warn("DRM: Unable to load persistent session: " + (err instanceof Error ? err.toString() : "Unknown Error"));
      return recreatePersistentSession();
    }
    async function recreatePersistentSession() {
      if (cancelSignal.cancellationError !== null) {
        throw cancelSignal.cancellationError;
      }
      log_default.info("DRM: Removing previous persistent session.");
      const persistentEntry = persistentSessionsStore.get(initData);
      if (persistentEntry !== null) {
        persistentSessionsStore.delete(persistentEntry.sessionId);
      }
      await loadedSessionsStore.closeSession(entry.mediaKeySession);
      if (cancelSignal.cancellationError !== null) {
        throw cancelSignal.cancellationError;
      }
      const newEntry = loadedSessionsStore.createSession(
        initData,
        "persistent-license"
      );
      return {
        type: "created-session" /* Created */,
        value: newEntry
      };
    }
  }

  // src/main/core/decrypt/utils/clean_old_loaded_sessions.ts
  init_define_ENVIRONMENT();
  async function cleanOldLoadedSessions(loadedSessionsStore, limit) {
    if (limit < 0 || limit >= loadedSessionsStore.getLength()) {
      return;
    }
    const proms = [];
    const entries = loadedSessionsStore.getAll().slice();
    const toDelete = entries.length - limit;
    for (let i = 0; i < toDelete; i++) {
      const entry = entries[i];
      proms.push(loadedSessionsStore.closeSession(entry.mediaKeySession));
    }
    await Promise.all(proms);
  }

  // src/main/core/decrypt/create_or_load_session.ts
  async function createOrLoadSession(initializationData, stores, wantedSessionType, maxSessionCacheSize, cancelSignal) {
    let previousLoadedSession = null;
    const { loadedSessionsStore, persistentSessionsStore } = stores;
    const entry = loadedSessionsStore.reuse(initializationData);
    if (entry !== null) {
      previousLoadedSession = entry.mediaKeySession;
      if (isSessionUsable(previousLoadedSession)) {
        log_default.info("DRM: Reuse loaded session", previousLoadedSession.sessionId);
        return {
          type: "loaded-open-session" /* LoadedOpenSession */,
          value: {
            mediaKeySession: previousLoadedSession,
            sessionType: entry.sessionType,
            keySessionRecord: entry.keySessionRecord
          }
        };
      } else if (persistentSessionsStore !== null) {
        if (entry.mediaKeySession.sessionId !== "") {
          persistentSessionsStore.delete(entry.mediaKeySession.sessionId);
        }
      }
    }
    if (previousLoadedSession !== null) {
      await loadedSessionsStore.closeSession(previousLoadedSession);
      if (cancelSignal.cancellationError !== null) {
        throw cancelSignal.cancellationError;
      }
    }
    await cleanOldLoadedSessions(loadedSessionsStore, maxSessionCacheSize);
    if (cancelSignal.cancellationError !== null) {
      throw cancelSignal.cancellationError;
    }
    const evt = await createSession(
      stores,
      initializationData,
      wantedSessionType,
      cancelSignal
    );
    return {
      type: evt.type,
      value: {
        mediaKeySession: evt.value.mediaKeySession,
        sessionType: evt.value.sessionType,
        keySessionRecord: evt.value.keySessionRecord
      }
    };
  }

  // src/main/core/decrypt/init_media_keys.ts
  init_define_ENVIRONMENT();

  // src/main/core/decrypt/get_media_keys.ts
  init_define_ENVIRONMENT();

  // src/main/core/decrypt/find_key_system.ts
  init_define_ENVIRONMENT();

  // src/common/utils/flat_map.ts
  init_define_ENVIRONMENT();
  function flatMap(originalArray, fn) {
    if (typeof Array.prototype.flatMap === "function") {
      return originalArray.flatMap(fn);
    }
    return originalArray.reduce((acc, arg) => {
      const r = fn(arg);
      if (Array.isArray(r)) {
        acc.push(...r);
        return acc;
      }
      acc.push(r);
      return acc;
    }, []);
  }

  // src/main/core/decrypt/find_key_system.ts
  function checkCachedMediaKeySystemAccess(keySystems, currentKeySystemAccess, currentKeySystemOptions) {
    const mksConfiguration = currentKeySystemAccess.getConfiguration();
    if (shouldRenewMediaKeys() || mksConfiguration == null) {
      return null;
    }
    const firstCompatibleOption = keySystems.filter((ks) => {
      if (ks.type !== currentKeySystemOptions.type) {
        return false;
      }
      if ((ks.persistentLicense === true || ks.persistentStateRequired === true) && mksConfiguration.persistentState !== "required") {
        return false;
      }
      if (ks.distinctiveIdentifierRequired === true && mksConfiguration.distinctiveIdentifier !== "required") {
        return false;
      }
      return true;
    })[0];
    if (firstCompatibleOption != null) {
      return {
        keySystemOptions: firstCompatibleOption,
        keySystemAccess: currentKeySystemAccess
      };
    }
    return null;
  }
  function findKeySystemCanonicalName(ksType) {
    const { EME_KEY_SYSTEMS } = config_default.getCurrent();
    for (const ksName of Object.keys(EME_KEY_SYSTEMS)) {
      if (arrayIncludes(EME_KEY_SYSTEMS[ksName], ksType)) {
        return ksName;
      }
    }
    return void 0;
  }
  function buildKeySystemConfigurations(ksName, keySystem) {
    const sessionTypes = ["temporary"];
    let persistentState = "optional";
    let distinctiveIdentifier = "optional";
    if (keySystem.persistentLicense === true) {
      persistentState = "required";
      sessionTypes.push("persistent-license");
    }
    if (keySystem.persistentStateRequired === true) {
      persistentState = "required";
    }
    if (keySystem.distinctiveIdentifierRequired === true) {
      distinctiveIdentifier = "required";
    }
    const { EME_DEFAULT_WIDEVINE_ROBUSTNESSES } = config_default.getCurrent();
    const videoRobustnesses = keySystem.videoRobustnesses != null ? keySystem.videoRobustnesses : ksName === "widevine" ? EME_DEFAULT_WIDEVINE_ROBUSTNESSES : [];
    const audioRobustnesses = keySystem.audioRobustnesses != null ? keySystem.audioRobustnesses : ksName === "widevine" ? EME_DEFAULT_WIDEVINE_ROBUSTNESSES : [];
    if (videoRobustnesses.length === 0) {
      videoRobustnesses.push(void 0);
    }
    if (audioRobustnesses.length === 0) {
      audioRobustnesses.push(void 0);
    }
    const videoCapabilities = flatMap(audioRobustnesses, (robustness) => [
      'video/mp4;codecs="avc1.4d401e"',
      'video/mp4;codecs="avc1.42e01e"',
      'video/webm;codecs="vp8"'
    ].map((contentType) => {
      return robustness !== void 0 ? { contentType, robustness } : { contentType };
    }));
    const audioCapabilities = flatMap(audioRobustnesses, (robustness) => [
      'audio/mp4;codecs="mp4a.40.2"',
      "audio/webm;codecs=opus"
    ].map((contentType) => {
      return robustness !== void 0 ? { contentType, robustness } : { contentType };
    }));
    return [{
      initDataTypes: ["cenc"],
      videoCapabilities,
      audioCapabilities,
      distinctiveIdentifier,
      persistentState,
      sessionTypes
    }];
  }
  function getMediaKeySystemAccess(mediaElement, keySystemsConfigs, cancelSignal) {
    log_default.info("DRM: Searching for compatible MediaKeySystemAccess");
    const currentState = media_keys_infos_store_default.getState(mediaElement);
    if (currentState != null) {
      const cachedKeySystemAccess = checkCachedMediaKeySystemAccess(
        keySystemsConfigs,
        currentState.mediaKeySystemAccess,
        currentState.keySystemOptions
      );
      if (cachedKeySystemAccess !== null) {
        log_default.info("DRM: Found cached compatible keySystem");
        return Promise.resolve({
          type: "reuse-media-key-system-access",
          value: {
            mediaKeySystemAccess: cachedKeySystemAccess.keySystemAccess,
            options: cachedKeySystemAccess.keySystemOptions
          }
        });
      }
    }
    const keySystemsType = keySystemsConfigs.reduce(
      (arr, keySystemOptions) => {
        const { EME_KEY_SYSTEMS } = config_default.getCurrent();
        const managedRDNs = EME_KEY_SYSTEMS[keySystemOptions.type];
        let ksType;
        if (managedRDNs != null) {
          ksType = managedRDNs.map((keyType) => {
            const keyName = keySystemOptions.type;
            return { keyName, keyType, keySystemOptions };
          });
        } else {
          const keyName = findKeySystemCanonicalName(keySystemOptions.type);
          const keyType = keySystemOptions.type;
          ksType = [{ keyName, keyType, keySystemOptions }];
        }
        return arr.concat(ksType);
      },
      []
    );
    return recursivelyTestKeySystems(0);
    async function recursivelyTestKeySystems(index) {
      if (index >= keySystemsType.length) {
        throw new EncryptedMediaError(
          "INCOMPATIBLE_KEYSYSTEMS",
          "No key system compatible with your wanted configuration has been found in the current browser."
        );
      }
      if (requestMediaKeySystemAccess == null) {
        throw new Error("requestMediaKeySystemAccess is not implemented in your browser.");
      }
      const { keyName, keyType, keySystemOptions } = keySystemsType[index];
      const keySystemConfigurations = buildKeySystemConfigurations(
        keyName,
        keySystemOptions
      );
      log_default.debug(`DRM: Request keysystem access ${keyType},${index + 1} of ${keySystemsType.length}`);
      try {
        const keySystemAccess = await requestMediaKeySystemAccess(
          keyType,
          keySystemConfigurations
        );
        log_default.info("DRM: Found compatible keysystem", keyType, index + 1);
        return {
          type: "create-media-key-system-access",
          value: {
            options: keySystemOptions,
            mediaKeySystemAccess: keySystemAccess
          }
        };
      } catch (_) {
        log_default.debug("DRM: Rejected access to keysystem", keyType, index + 1);
        if (cancelSignal.cancellationError !== null) {
          throw cancelSignal.cancellationError;
        }
        return recursivelyTestKeySystems(index + 1);
      }
    }
  }

  // src/main/core/decrypt/utils/loaded_sessions_store.ts
  init_define_ENVIRONMENT();

  // src/main/core/decrypt/utils/key_session_record.ts
  init_define_ENVIRONMENT();

  // src/main/core/decrypt/utils/key_id_comparison.ts
  init_define_ENVIRONMENT();
  function areKeyIdsEqual(keyId1, keyId2) {
    return keyId1 === keyId2 || areArraysOfNumbersEqual(keyId1, keyId2);
  }
  function isKeyIdContainedIn(wantedKeyId, keyIdsArr) {
    return keyIdsArr.some((k) => areKeyIdsEqual(k, wantedKeyId));
  }
  function areAllKeyIdsContainedIn(wantedKeyIds, keyIdsArr) {
    for (const keyId of wantedKeyIds) {
      const found = keyIdsArr.some((k) => areKeyIdsEqual(k, keyId));
      if (!found) {
        return false;
      }
    }
    return true;
  }
  function areSomeKeyIdsContainedIn(wantedKeyIds, keyIdsArr) {
    for (const keyId of wantedKeyIds) {
      const found = keyIdsArr.some((k) => areKeyIdsEqual(k, keyId));
      if (found) {
        return true;
      }
    }
    return false;
  }

  // src/main/core/decrypt/utils/key_session_record.ts
  var KeySessionRecord = class {
    _initializationData;
    _keyIds;
    constructor(initializationData) {
      this._initializationData = initializationData;
      this._keyIds = null;
    }
    associateKeyIds(keyIds) {
      if (this._keyIds === null) {
        this._keyIds = [];
      }
      const keyIdsArr = Array.from(keyIds);
      for (const keyId of keyIdsArr) {
        if (!this.isAssociatedWithKeyId(keyId)) {
          this._keyIds.push(keyId);
        }
      }
    }
    isAssociatedWithKeyId(keyId) {
      if (this._keyIds === null) {
        return false;
      }
      for (const storedKeyId of this._keyIds) {
        if (areKeyIdsEqual(storedKeyId, keyId)) {
          return true;
        }
      }
      return false;
    }
    getAssociatedKeyIds() {
      if (this._keyIds === null) {
        return [];
      }
      return this._keyIds;
    }
    isCompatibleWith(initializationData) {
      const { keyIds } = initializationData;
      if (keyIds !== void 0 && keyIds.length > 0) {
        if (this._keyIds !== null && areAllKeyIdsContainedIn(keyIds, this._keyIds)) {
          return true;
        }
        if (this._initializationData.keyIds !== void 0) {
          return areAllKeyIdsContainedIn(keyIds, this._initializationData.keyIds);
        }
      }
      return this._checkInitializationDataCompatibility(initializationData);
    }
    _checkInitializationDataCompatibility(initializationData) {
      if (initializationData.keyIds !== void 0 && initializationData.keyIds.length > 0 && this._initializationData.keyIds !== void 0) {
        return areAllKeyIdsContainedIn(
          initializationData.keyIds,
          this._initializationData.keyIds
        );
      }
      if (this._initializationData.type !== initializationData.type) {
        return false;
      }
      return this._initializationData.values.isCompatibleWith(initializationData.values);
    }
  };

  // src/main/core/decrypt/utils/loaded_sessions_store.ts
  var LoadedSessionsStore = class {
    _mediaKeys;
    _storage;
    constructor(mediaKeys) {
      this._mediaKeys = mediaKeys;
      this._storage = [];
    }
    createSession(initData, sessionType) {
      const keySessionRecord = new KeySessionRecord(initData);
      const mediaKeySession = this._mediaKeys.createSession(sessionType);
      const entry = {
        mediaKeySession,
        sessionType,
        keySessionRecord,
        isGeneratingRequest: false,
        isLoadingPersistentSession: false,
        closingStatus: { type: "none" }
      };
      if (!isNullOrUndefined(mediaKeySession.closed)) {
        mediaKeySession.closed.then(() => {
          const index = this.getIndex(keySessionRecord);
          if (index >= 0 && this._storage[index].mediaKeySession === mediaKeySession) {
            this._storage.splice(index, 1);
          }
        }).catch((e) => {
          log_default.warn(`DRM-LSS: MediaKeySession.closed rejected: ${e}`);
        });
      }
      log_default.debug("DRM-LSS: Add MediaKeySession", entry.sessionType);
      this._storage.push({ ...entry });
      return entry;
    }
    reuse(initializationData) {
      for (let i = this._storage.length - 1; i >= 0; i--) {
        const stored = this._storage[i];
        if (stored.keySessionRecord.isCompatibleWith(initializationData)) {
          this._storage.splice(i, 1);
          this._storage.push(stored);
          return { ...stored };
        }
      }
      return null;
    }
    getEntryForSession(mediaKeySession) {
      for (let i = this._storage.length - 1; i >= 0; i--) {
        const stored = this._storage[i];
        if (stored.mediaKeySession === mediaKeySession) {
          return { ...stored };
        }
      }
      return null;
    }
    async generateLicenseRequest(mediaKeySession, initializationDataType, initializationData) {
      let entry;
      for (const stored of this._storage) {
        if (stored.mediaKeySession === mediaKeySession) {
          entry = stored;
          break;
        }
      }
      if (entry === void 0) {
        log_default.error("DRM-LSS: generateRequest error. No MediaKeySession found with the given initData and initDataType");
        return generateKeyRequest(
          mediaKeySession,
          initializationDataType,
          initializationData
        );
      }
      entry.isGeneratingRequest = true;
      if (entry.closingStatus.type !== "none") {
        throw new Error("The `MediaKeySession` is being closed.");
      }
      try {
        await generateKeyRequest(
          mediaKeySession,
          initializationDataType,
          initializationData
        );
      } catch (err) {
        if (entry === void 0) {
          throw err;
        }
        entry.isGeneratingRequest = false;
        if (entry.closingStatus.type === "awaiting") {
          entry.closingStatus.start();
        }
        throw err;
      }
      if (entry === void 0) {
        return void 0;
      }
      entry.isGeneratingRequest = false;
      if (entry.closingStatus.type === "awaiting") {
        entry.closingStatus.start();
      }
    }
    async loadPersistentSession(mediaKeySession, sessionId) {
      let entry;
      for (const stored of this._storage) {
        if (stored.mediaKeySession === mediaKeySession) {
          entry = stored;
          break;
        }
      }
      if (entry === void 0) {
        log_default.error("DRM-LSS: loadPersistentSession error. No MediaKeySession found with the given initData and initDataType");
        return loadSession(mediaKeySession, sessionId);
      }
      entry.isLoadingPersistentSession = true;
      if (entry.closingStatus.type !== "none") {
        throw new Error("The `MediaKeySession` is being closed.");
      }
      let ret;
      try {
        ret = await loadSession(mediaKeySession, sessionId);
      } catch (err) {
        if (entry === void 0) {
          throw err;
        }
        entry.isLoadingPersistentSession = false;
        if (entry.closingStatus.type === "awaiting") {
          entry.closingStatus.start();
        }
        throw err;
      }
      if (entry === void 0) {
        return ret;
      }
      entry.isLoadingPersistentSession = false;
      if (entry.closingStatus.type === "awaiting") {
        entry.closingStatus.start();
      }
      return ret;
    }
    async closeSession(mediaKeySession) {
      let entry;
      for (const stored of this._storage) {
        if (stored.mediaKeySession === mediaKeySession) {
          entry = stored;
          break;
        }
      }
      if (entry === void 0) {
        log_default.warn("DRM-LSS: No MediaKeySession found with the given initData and initDataType");
        return Promise.resolve(false);
      }
      return this._closeEntry(entry);
    }
    getLength() {
      return this._storage.length;
    }
    getAll() {
      return this._storage;
    }
    async closeAllSessions() {
      const allEntries = this._storage;
      log_default.debug("DRM-LSS: Closing all current MediaKeySessions", allEntries.length);
      this._storage = [];
      const closingProms = allEntries.map((entry) => this._closeEntry(entry));
      await Promise.all(closingProms);
    }
    getIndex(record) {
      for (let i = 0; i < this._storage.length; i++) {
        const stored = this._storage[i];
        if (stored.keySessionRecord === record) {
          return i;
        }
      }
      return -1;
    }
    async _closeEntry(entry) {
      const { mediaKeySession } = entry;
      return new Promise((resolve, reject) => {
        if (entry !== void 0 && (entry.isLoadingPersistentSession || entry.isGeneratingRequest)) {
          entry.closingStatus = {
            type: "awaiting",
            start: tryClosingEntryAndResolve
          };
        } else {
          tryClosingEntryAndResolve();
        }
        function tryClosingEntryAndResolve() {
          if (entry !== void 0) {
            entry.closingStatus = { type: "pending" };
          }
          safelyCloseMediaKeySession(mediaKeySession).then(() => {
            if (entry !== void 0) {
              entry.closingStatus = { type: "done" };
            }
            resolve(true);
          }).catch((err) => {
            if (entry !== void 0) {
              entry.closingStatus = { type: "failed" };
            }
            reject(err);
          });
        }
      });
    }
  };
  async function safelyCloseMediaKeySession(mediaKeySession) {
    log_default.debug("DRM: Trying to close a MediaKeySession", mediaKeySession.sessionId);
    try {
      await closeSession(mediaKeySession);
      log_default.debug("DRM: Succeeded to close MediaKeySession");
      return;
    } catch (err) {
      log_default.error("DRM: Could not close MediaKeySession: " + (err instanceof Error ? err.toString() : "Unknown error"));
      return;
    }
  }

  // src/main/core/decrypt/utils/persistent_sessions_store.ts
  init_define_ENVIRONMENT();

  // src/common/utils/hash_buffer.ts
  init_define_ENVIRONMENT();
  function hashBuffer(buffer) {
    let hash = 0;
    let char;
    for (let i = 0; i < buffer.length; i++) {
      char = buffer[i];
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  // src/main/core/decrypt/utils/are_init_values_compatible.ts
  init_define_ENVIRONMENT();

  // src/main/core/decrypt/utils/serializable_bytes.ts
  init_define_ENVIRONMENT();
  var SerializableBytes = class {
    initData;
    constructor(initData) {
      this.initData = initData;
    }
    toJSON() {
      return bytesToBase64(this.initData);
    }
    static decode(base64) {
      return base64ToBytes(base64);
    }
  };

  // src/main/core/decrypt/utils/are_init_values_compatible.ts
  function areInitializationValuesCompatible(stored, newElts) {
    return _isAInB(stored, newElts) ?? _isAInB(newElts, stored) ?? false;
  }
  function _isAInB(a, b) {
    if (a.length === 0) {
      return false;
    }
    if (b.length < a.length) {
      return null;
    }
    const firstAElt = a[0];
    let aIdx = 0;
    let bIdx = 0;
    for (; bIdx < b.length; bIdx++) {
      const bElt = b[bIdx];
      if (bElt.systemId !== firstAElt.systemId) {
        continue;
      }
      if (bElt.hash !== firstAElt.hash) {
        return false;
      }
      const aData = firstAElt.data instanceof Uint8Array ? firstAElt.data : typeof firstAElt.data === "string" ? SerializableBytes.decode(firstAElt.data) : firstAElt.data.initData;
      const bData = bElt.data instanceof Uint8Array ? bElt.data : typeof bElt.data === "string" ? SerializableBytes.decode(bElt.data) : bElt.data.initData;
      if (!areArraysOfNumbersEqual(aData, bData)) {
        return false;
      }
      if (b.length - bIdx < a.length) {
        return null;
      }
      for (aIdx = 1; aIdx < a.length; aIdx++) {
        const aElt = a[aIdx];
        for (bIdx += 1; bIdx < b.length; bIdx++) {
          const bNewElt = b[bIdx];
          if (aElt.systemId !== bNewElt.systemId) {
            continue;
          }
          if (aElt.hash !== bNewElt.hash) {
            return false;
          }
          const aNewData = aElt.data instanceof Uint8Array ? aElt.data : typeof aElt.data === "string" ? SerializableBytes.decode(aElt.data) : aElt.data.initData;
          const bNewData = bNewElt.data instanceof Uint8Array ? bNewElt.data : typeof bNewElt.data === "string" ? SerializableBytes.decode(bNewElt.data) : bNewElt.data.initData;
          if (!areArraysOfNumbersEqual(aNewData, bNewData)) {
            return false;
          }
          break;
        }
        if (aIdx === b.length) {
          return null;
        }
      }
      return true;
    }
    return null;
  }

  // src/main/core/decrypt/utils/persistent_sessions_store.ts
  function checkStorage(storage) {
    assertInterface(
      storage,
      { save: "function", load: "function" },
      "licenseStorage"
    );
  }
  var PersistentSessionsStore = class {
    _storage;
    _entries;
    constructor(storage) {
      checkStorage(storage);
      this._entries = [];
      this._storage = storage;
      try {
        let entries = this._storage.load();
        if (!Array.isArray(entries)) {
          entries = [];
        }
        this._entries = entries;
      } catch (e) {
        log_default.warn(
          "DRM-PSS: Could not get entries from license storage",
          e instanceof Error ? e : ""
        );
        this.dispose();
      }
    }
    getLength() {
      return this._entries.length;
    }
    getAll() {
      return this._entries;
    }
    get(initData) {
      const index = this._getIndex(initData);
      return index === -1 ? null : this._entries[index];
    }
    getAndReuse(initData) {
      const index = this._getIndex(initData);
      if (index === -1) {
        return null;
      }
      const item = this._entries.splice(index, 1)[0];
      this._entries.push(item);
      return item;
    }
    add(initData, keyIds, session) {
      if (isNullOrUndefined(session) || !isNonEmptyString(session.sessionId)) {
        log_default.warn("DRM-PSS: Invalid Persisten Session given.");
        return;
      }
      const { sessionId } = session;
      const currentIndex = this._getIndex(initData);
      if (currentIndex >= 0) {
        const currVersion = keyIds === void 0 ? 3 : 4;
        const currentEntry = this._entries[currentIndex];
        const entryVersion = currentEntry.version ?? -1;
        if (entryVersion >= currVersion && sessionId === currentEntry.sessionId) {
          return;
        }
        log_default.info("DRM-PSS: Updating session info.", sessionId);
        this._entries.splice(currentIndex, 1);
      } else {
        log_default.info("DRM-PSS: Add new session", sessionId);
      }
      const storedValues = prepareValuesForStore(initData.values.getFormattedValues());
      if (keyIds === void 0) {
        this._entries.push({
          version: 3,
          sessionId,
          values: storedValues,
          initDataType: initData.type
        });
      } else {
        this._entries.push({
          version: 4,
          sessionId,
          keyIds: keyIds.map((k) => new SerializableBytes(k)),
          values: storedValues,
          initDataType: initData.type
        });
      }
      this._save();
    }
    delete(sessionId) {
      let index = -1;
      for (let i = 0; i < this._entries.length; i++) {
        const entry2 = this._entries[i];
        if (entry2.sessionId === sessionId) {
          index = i;
          break;
        }
      }
      if (index === -1) {
        log_default.warn("DRM-PSS: initData to delete not found.");
        return;
      }
      const entry = this._entries[index];
      log_default.warn("DRM-PSS: Delete session from store", entry.sessionId);
      this._entries.splice(index, 1);
      this._save();
    }
    deleteOldSessions(sessionsToDelete) {
      log_default.info(`DRM-PSS: Deleting last ${sessionsToDelete} sessions.`);
      if (sessionsToDelete <= 0) {
        return;
      }
      if (sessionsToDelete <= this._entries.length) {
        this._entries.splice(0, sessionsToDelete);
      } else {
        log_default.warn(
          "DRM-PSS: Asked to remove more information that it contains",
          sessionsToDelete,
          this._entries.length
        );
        this._entries = [];
      }
      this._save();
    }
    dispose() {
      this._entries = [];
      this._save();
    }
    _getIndex(initData) {
      let lazyConcatenatedData = null;
      function getConcatenatedInitDataInfo() {
        if (lazyConcatenatedData === null) {
          const concatInitData = initData.values.constructRequestData();
          lazyConcatenatedData = {
            initData: concatInitData,
            initDataHash: hashBuffer(concatInitData)
          };
        }
        return lazyConcatenatedData;
      }
      for (let i = 0; i < this._entries.length; i++) {
        const entry = this._entries[i];
        if (entry.initDataType === initData.type) {
          switch (entry.version) {
            case 4:
              if (initData.keyIds !== void 0) {
                const foundCompatible = initData.keyIds.every((keyId) => {
                  const keyIdB64 = bytesToBase64(keyId);
                  for (const entryKid of entry.keyIds) {
                    if (typeof entryKid === "string") {
                      if (keyIdB64 === entryKid) {
                        return true;
                      }
                    } else if (areKeyIdsEqual(
                      entryKid.initData,
                      keyId
                    )) {
                      return true;
                    }
                  }
                  return false;
                });
                if (foundCompatible) {
                  return i;
                }
              } else {
                const formatted2 = initData.values.getFormattedValues();
                if (areInitializationValuesCompatible(formatted2, entry.values)) {
                  return i;
                }
              }
              break;
            case 3:
              const formatted = initData.values.getFormattedValues();
              if (areInitializationValuesCompatible(formatted, entry.values)) {
                return i;
              }
              break;
            case 2: {
              const {
                initData: concatInitData,
                initDataHash: concatHash
              } = getConcatenatedInitDataInfo();
              if (entry.initDataHash === concatHash) {
                try {
                  const decodedInitData = typeof entry.initData === "string" ? SerializableBytes.decode(entry.initData) : entry.initData.initData;
                  if (areArraysOfNumbersEqual(decodedInitData, concatInitData)) {
                    return i;
                  }
                } catch (e) {
                  log_default.warn(
                    "DRM-PSS: Could not decode initialization data.",
                    e instanceof Error ? e : ""
                  );
                }
              }
              break;
            }
            case 1: {
              const {
                initData: concatInitData,
                initDataHash: concatHash
              } = getConcatenatedInitDataInfo();
              if (entry.initDataHash === concatHash) {
                if (typeof entry.initData.length === "undefined") {
                  return i;
                } else if (areArraysOfNumbersEqual(entry.initData, concatInitData)) {
                  return i;
                }
              }
              break;
            }
            default: {
              const { initDataHash: concatHash } = getConcatenatedInitDataInfo();
              if (entry.initData === concatHash) {
                return i;
              }
            }
          }
        }
      }
      return -1;
    }
    _save() {
      try {
        this._storage.save(this._entries);
      } catch (e) {
        log_default.warn("DRM-PSS: Could not save licenses in localStorage");
      }
    }
  };
  function prepareValuesForStore(initialValues) {
    return initialValues.map(({ systemId, data, hash }) => ({
      systemId,
      hash,
      data: new SerializableBytes(data)
    }));
  }

  // src/main/core/decrypt/utils/server_certificate_store.ts
  init_define_ENVIRONMENT();
  var serverCertificateHashesMap = /* @__PURE__ */ new WeakMap();
  var server_certificate_store_default = {
    prepare(mediaKeys) {
      serverCertificateHashesMap.set(mediaKeys, null);
    },
    set(mediaKeys, serverCertificate) {
      const formattedServerCertificate = serverCertificate instanceof Uint8Array ? serverCertificate : new Uint8Array(
        serverCertificate instanceof ArrayBuffer ? serverCertificate : serverCertificate.buffer
      );
      const hash = hashBuffer(formattedServerCertificate);
      serverCertificateHashesMap.set(
        mediaKeys,
        { hash, serverCertificate: formattedServerCertificate }
      );
    },
    hasOne(mediaKeys) {
      const currentServerCertificate = serverCertificateHashesMap.get(mediaKeys);
      return currentServerCertificate === void 0 ? false : currentServerCertificate === null ? void 0 : true;
    },
    has(mediaKeys, serverCertificate) {
      const serverCertificateHash = serverCertificateHashesMap.get(mediaKeys);
      if (serverCertificateHash === void 0 || serverCertificateHash === null) {
        return false;
      }
      const { hash: oldHash, serverCertificate: oldServerCertificate } = serverCertificateHash;
      const newServerCertificate = serverCertificate instanceof Uint8Array ? serverCertificate : new Uint8Array(
        serverCertificate instanceof ArrayBuffer ? serverCertificate : serverCertificate.buffer
      );
      const newHash = hashBuffer(newServerCertificate);
      if (newHash !== oldHash || oldServerCertificate.length !== newServerCertificate.length) {
        return false;
      }
      for (let i = 0; i < oldServerCertificate.length; i++) {
        if (oldServerCertificate[i] !== newServerCertificate[i]) {
          return false;
        }
      }
      return true;
    }
  };

  // src/main/core/decrypt/get_media_keys.ts
  function createPersistentSessionsStorage(keySystemOptions) {
    if (keySystemOptions.persistentLicense !== true) {
      return null;
    }
    const { licenseStorage } = keySystemOptions;
    if (licenseStorage == null) {
      throw new EncryptedMediaError(
        "INVALID_KEY_SYSTEM",
        "No license storage found for persistent license."
      );
    }
    log_default.debug("DRM: Set the given license storage");
    return new PersistentSessionsStore(licenseStorage);
  }
  async function getMediaKeysInfos(mediaElement, keySystemsConfigs, cancelSignal) {
    const evt = await getMediaKeySystemAccess(
      mediaElement,
      keySystemsConfigs,
      cancelSignal
    );
    if (cancelSignal.cancellationError !== null) {
      throw cancelSignal.cancellationError;
    }
    const { options, mediaKeySystemAccess } = evt.value;
    const currentState = media_keys_infos_store_default.getState(mediaElement);
    const persistentSessionsStore = createPersistentSessionsStorage(options);
    if (currentState !== null && evt.type === "reuse-media-key-system-access") {
      const { mediaKeys: mediaKeys2, loadedSessionsStore: loadedSessionsStore2 } = currentState;
      if (server_certificate_store_default.hasOne(mediaKeys2) === false || !isNullOrUndefined(options.serverCertificate) && server_certificate_store_default.has(mediaKeys2, options.serverCertificate)) {
        return {
          mediaKeys: mediaKeys2,
          mediaKeySystemAccess,
          stores: { loadedSessionsStore: loadedSessionsStore2, persistentSessionsStore },
          options
        };
      }
    }
    const mediaKeys = await createMediaKeys(mediaKeySystemAccess);
    log_default.info("DRM: MediaKeys created with success");
    const loadedSessionsStore = new LoadedSessionsStore(mediaKeys);
    return {
      mediaKeys,
      mediaKeySystemAccess,
      stores: { loadedSessionsStore, persistentSessionsStore },
      options
    };
  }
  async function createMediaKeys(mediaKeySystemAccess) {
    log_default.info("DRM: Calling createMediaKeys on the MediaKeySystemAccess");
    try {
      const mediaKeys = await mediaKeySystemAccess.createMediaKeys();
      return mediaKeys;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error when creating MediaKeys.";
      throw new EncryptedMediaError("CREATE_MEDIA_KEYS_ERROR", message);
    }
  }

  // src/main/core/decrypt/init_media_keys.ts
  async function initMediaKeys(mediaElement, keySystemsConfigs, cancelSignal) {
    const mediaKeysInfo = await getMediaKeysInfos(mediaElement, keySystemsConfigs, cancelSignal);
    const { mediaKeys } = mediaKeysInfo;
    const shouldDisableOldMediaKeys = mediaElement.mediaKeys !== null && mediaElement.mediaKeys !== void 0 && mediaKeys !== mediaElement.mediaKeys;
    if (shouldDisableOldMediaKeys) {
      log_default.debug("DRM: Disabling old MediaKeys");
      disableMediaKeys(mediaElement);
    }
    return mediaKeysInfo;
  }

  // src/main/core/decrypt/session_events_listener.ts
  init_define_ENVIRONMENT();

  // src/common/utils/rx-retry_with_backoff.ts
  init_define_ENVIRONMENT();

  // src/common/utils/get_fuzzed_delay.ts
  init_define_ENVIRONMENT();
  var FUZZ_FACTOR = 0.3;
  function getFuzzedDelay(retryDelay) {
    const fuzzingFactor = (Math.random() * 2 - 1) * FUZZ_FACTOR;
    return retryDelay * (fuzzingFactor + 1);
  }

  // src/common/utils/rx-retry_with_backoff.ts
  function retryObsWithBackoff(obs$, options) {
    const {
      baseDelay,
      maxDelay,
      totalRetry,
      shouldRetry,
      onRetry
    } = options;
    let retryCount = 0;
    return obs$.pipe(catchError((error, source) => {
      if (!isNullOrUndefined(shouldRetry) && !shouldRetry(error) || retryCount++ >= totalRetry) {
        throw error;
      }
      if (typeof onRetry === "function") {
        onRetry(error, retryCount);
      }
      const delay = Math.min(
        baseDelay * Math.pow(2, retryCount - 1),
        maxDelay
      );
      const fuzzedDelay = getFuzzedDelay(delay);
      return timer(fuzzedDelay).pipe(mergeMap(() => source));
    }));
  }

  // src/main/core/decrypt/utils/check_key_statuses.ts
  init_define_ENVIRONMENT();

  // src/main/compat/eme/get_uuid_kid_from_keystatus_kid.ts
  init_define_ENVIRONMENT();
  function getUUIDKIDFromKeyStatusKID(keySystem, baseKeyId) {
    if (keySystem.indexOf("playready") !== -1 && (isIEOrEdge || isEdgeChromium)) {
      return guidToUuid(baseKeyId);
    }
    return baseKeyId;
  }

  // src/main/core/decrypt/utils/check_key_statuses.ts
  var KEY_STATUSES = {
    EXPIRED: "expired",
    INTERNAL_ERROR: "internal-error",
    OUTPUT_RESTRICTED: "output-restricted"
  };
  function checkKeyStatuses(session, options, keySystem) {
    const warnings = [];
    const blacklistedKeyIDs = [];
    const whitelistedKeyIds = [];
    const { fallbackOn = {}, throwOnLicenseExpiration } = options;
    session.keyStatuses.forEach((_arg1, _arg2) => {
      const [keyStatus, keyStatusKeyId] = (() => {
        return typeof _arg1 === "string" ? [_arg1, _arg2] : [_arg2, _arg1];
      })();
      const keyId = getUUIDKIDFromKeyStatusKID(
        keySystem,
        new Uint8Array(keyStatusKeyId)
      );
      switch (keyStatus) {
        case KEY_STATUSES.EXPIRED: {
          const error = new EncryptedMediaError(
            "KEY_STATUS_CHANGE_ERROR",
            `A decryption key expired (${bytesToHex(keyId)})`
          );
          if (throwOnLicenseExpiration !== false) {
            throw error;
          }
          warnings.push({ type: "warning", value: error });
          whitelistedKeyIds.push(keyId);
          break;
        }
        case KEY_STATUSES.INTERNAL_ERROR: {
          const error = new EncryptedMediaError(
            "KEY_STATUS_CHANGE_ERROR",
            `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`
          );
          if (fallbackOn.keyInternalError !== true) {
            throw error;
          }
          warnings.push({ type: "warning", value: error });
          blacklistedKeyIDs.push(keyId);
          break;
        }
        case KEY_STATUSES.OUTPUT_RESTRICTED: {
          const error = new EncryptedMediaError(
            "KEY_STATUS_CHANGE_ERROR",
            `A "${keyStatus}" status has been encountered (${bytesToHex(keyId)})`
          );
          if (fallbackOn.keyOutputRestricted !== true) {
            throw error;
          }
          warnings.push({ type: "warning", value: error });
          blacklistedKeyIDs.push(keyId);
          break;
        }
        default:
          whitelistedKeyIds.push(keyId);
          break;
      }
    });
    return { warnings, blacklistedKeyIDs, whitelistedKeyIds };
  }

  // src/main/core/decrypt/session_events_listener.ts
  var {
    onKeyError$: onKeyError$2,
    onKeyMessage$: onKeyMessage$2,
    onKeyStatusesChange$: onKeyStatusesChange$2
  } = event_listeners_exports;
  var BlacklistedSessionError = class extends Error {
    sessionError;
    constructor(sessionError) {
      super();
      Object.setPrototypeOf(this, BlacklistedSessionError.prototype);
      this.sessionError = sessionError;
    }
  };
  function SessionEventsListener(session, keySystemOptions, keySystem) {
    log_default.info("DRM: Binding session events", session.sessionId);
    const sessionWarningSubject$ = new Subject();
    const { getLicenseConfig = {} } = keySystemOptions;
    const keyErrors = onKeyError$2(session).pipe(map((error) => {
      throw new EncryptedMediaError("KEY_ERROR", error.type);
    }));
    const keyStatusesChange$ = onKeyStatusesChange$2(session).pipe(mergeMap((keyStatusesEvent) => handleKeyStatusesChangeEvent(
      session,
      keySystemOptions,
      keySystem,
      keyStatusesEvent
    )));
    const keyMessages$ = onKeyMessage$2(session).pipe(mergeMap((messageEvent) => {
      const message = new Uint8Array(messageEvent.message);
      const messageType = isNonEmptyString(messageEvent.messageType) ? messageEvent.messageType : "license-request";
      log_default.info(
        `DRM: Received message event, type ${messageType}`,
        session.sessionId
      );
      const getLicense$ = defer(() => {
        const getLicense = keySystemOptions.getLicense(message, messageType);
        const getLicenseTimeout = isNullOrUndefined(getLicenseConfig.timeout) ? 10 * 1e3 : getLicenseConfig.timeout;
        return cast_to_observable_default(getLicense).pipe(getLicenseTimeout >= 0 ? timeout(getLicenseTimeout) : identity);
      });
      const backoffOptions = getLicenseBackoffOptions(
        sessionWarningSubject$,
        getLicenseConfig.retry
      );
      return retryObsWithBackoff(getLicense$, backoffOptions).pipe(
        map((licenseObject) => ({
          type: "key-message-handled",
          value: { session, license: licenseObject }
        })),
        catchError((err) => {
          const formattedError = formatGetLicenseError(err);
          if (!isNullOrUndefined(err)) {
            const { fallbackOnLastTry } = err;
            if (fallbackOnLastTry === true) {
              log_default.warn("DRM: Last `getLicense` attempt failed. Blacklisting the current session.");
              throw new BlacklistedSessionError(formattedError);
            }
          }
          throw formattedError;
        })
      );
    }));
    const sessionUpdates = merge(keyMessages$, keyStatusesChange$).pipe(concatMap((evt) => {
      switch (evt.type) {
        case "key-message-handled":
        case "key-status-change-handled":
          if (isNullOrUndefined(evt.value.license)) {
            log_default.info("DRM: No message given, skipping session.update");
            return EMPTY;
          }
          return updateSessionWithMessage(session, evt.value.license);
        default:
          return of(evt);
      }
    }));
    const sessionEvents = merge(
      getKeyStatusesEvents(session, keySystemOptions, keySystem),
      sessionUpdates,
      keyErrors,
      sessionWarningSubject$
    );
    return !isNullOrUndefined(session.closed) ? sessionEvents.pipe(takeUntil(cast_to_observable_default(session.closed))) : sessionEvents;
  }
  function getKeyStatusesEvents(session, options, keySystem) {
    return defer(() => {
      if (session.keyStatuses.size === 0) {
        return EMPTY;
      }
      const { warnings, blacklistedKeyIDs, whitelistedKeyIds } = checkKeyStatuses(session, options, keySystem);
      const warnings$ = warnings.length > 0 ? of(...warnings) : EMPTY;
      const keysUpdate$ = of({
        type: "keys-update",
        value: {
          whitelistedKeyIds,
          blacklistedKeyIDs
        }
      });
      return concat(warnings$, keysUpdate$);
    });
  }
  function formatGetLicenseError(error) {
    if (error instanceof TimeoutError) {
      return new EncryptedMediaError(
        "KEY_LOAD_TIMEOUT",
        "The license server took too much time to respond."
      );
    }
    const err = new EncryptedMediaError(
      "KEY_LOAD_ERROR",
      "An error occured when calling `getLicense`."
    );
    if (!isNullOrUndefined(error) && isNonEmptyString(error.message)) {
      err.message = error.message;
    }
    return err;
  }
  function updateSessionWithMessage(session, message) {
    log_default.info("DRM: Updating MediaKeySession with message");
    return cast_to_observable_default(session.update(message)).pipe(
      catchError((error) => {
        const reason = error instanceof Error ? error.toString() : "`session.update` failed";
        throw new EncryptedMediaError("KEY_UPDATE_ERROR", reason);
      }),
      tap(() => {
        log_default.info("DRM: MediaKeySession update succeeded.");
      }),
      ignoreElements()
    );
  }
  function handleKeyStatusesChangeEvent(session, keySystemOptions, keySystem, keyStatusesEvent) {
    log_default.info("DRM: keystatuseschange event received", session.sessionId);
    const callback$ = defer(() => {
      return tryCatch(() => {
        if (typeof keySystemOptions.onKeyStatusesChange !== "function") {
          return EMPTY;
        }
        return cast_to_observable_default(keySystemOptions.onKeyStatusesChange(
          keyStatusesEvent,
          session
        ));
      }, void 0);
    }).pipe(
      map((licenseObject) => ({
        type: "key-status-change-handled",
        value: { session, license: licenseObject }
      })),
      catchError((error) => {
        const err = new EncryptedMediaError(
          "KEY_STATUS_CHANGE_ERROR",
          "Unknown `onKeyStatusesChange` error"
        );
        if (!isNullOrUndefined(error) && isNonEmptyString(error.message)) {
          err.message = error.message;
        }
        throw err;
      })
    );
    return merge(
      getKeyStatusesEvents(session, keySystemOptions, keySystem),
      callback$
    );
  }
  function getLicenseBackoffOptions(sessionWarningSubject$, numberOfRetry) {
    return {
      totalRetry: numberOfRetry ?? 2,
      baseDelay: 200,
      maxDelay: 3e3,
      shouldRetry: (error) => error instanceof TimeoutError || isNullOrUndefined(error) || error.noRetry !== true,
      onRetry: (error) => sessionWarningSubject$.next({
        type: "warning",
        value: formatGetLicenseError(error)
      })
    };
  }

  // src/main/core/decrypt/set_server_certificate.ts
  init_define_ENVIRONMENT();
  async function setServerCertificate(mediaKeys, serverCertificate) {
    try {
      const res = await mediaKeys.setServerCertificate(serverCertificate);
      return res;
    } catch (error) {
      log_default.warn(
        "DRM: mediaKeys.setServerCertificate returned an error",
        error instanceof Error ? error : ""
      );
      const reason = error instanceof Error ? error.toString() : "`setServerCertificate` error";
      throw new EncryptedMediaError("LICENSE_SERVER_CERTIFICATE_ERROR", reason);
    }
  }
  async function trySettingServerCertificate(mediaKeys, serverCertificate) {
    if (server_certificate_store_default.hasOne(mediaKeys) === true) {
      log_default.info("DRM: The MediaKeys already has a server certificate, skipping...");
      return { type: "already-has-one" };
    }
    if (typeof mediaKeys.setServerCertificate !== "function") {
      log_default.warn("DRM: Could not set the server certificate. mediaKeys.setServerCertificate is not a function");
      return { type: "method-not-implemented" };
    }
    log_default.info("DRM: Setting server certificate on the MediaKeys");
    server_certificate_store_default.prepare(mediaKeys);
    try {
      const result = await setServerCertificate(mediaKeys, serverCertificate);
      server_certificate_store_default.set(mediaKeys, serverCertificate);
      return { type: "success", value: result };
    } catch (error) {
      const formattedErr = isKnownError(error) ? error : new EncryptedMediaError(
        "LICENSE_SERVER_CERTIFICATE_ERROR",
        "Unknown error when setting the server certificate."
      );
      return { type: "error", value: formattedErr };
    }
  }

  // src/main/core/decrypt/utils/clean_old_stored_persistent_info.ts
  init_define_ENVIRONMENT();
  function cleanOldStoredPersistentInfo(persistentSessionsStore, limit) {
    if (isNaN(limit) || limit < 0 || limit >= persistentSessionsStore.getLength()) {
      return;
    }
    const numberOfPersistentSessions = persistentSessionsStore.getLength();
    const toDelete = numberOfPersistentSessions - limit;
    log_default.info(
      "DRM: Too many stored persistent sessions, removing some.",
      numberOfPersistentSessions,
      toDelete
    );
    persistentSessionsStore.deleteOldSessions(toDelete);
  }

  // src/main/core/decrypt/utils/get_drm_system_id.ts
  init_define_ENVIRONMENT();

  // src/common/utils/starts_with.ts
  init_define_ENVIRONMENT();
  function startsWith(completeString, searchString, position) {
    if (typeof String.prototype.startsWith === "function") {
      return completeString.startsWith(searchString, position);
    }
    const initialPosition = typeof position === "number" ? Math.max(position, 0) : 0;
    return completeString.substring(
      initialPosition,
      initialPosition + searchString.length
    ) === searchString;
  }

  // src/main/core/decrypt/utils/get_drm_system_id.ts
  function getDrmSystemId(keySystem) {
    if (startsWith(keySystem, "com.microsoft.playready") || keySystem === "com.chromecast.playready" || keySystem === "com.youtube.playready") {
      return "9a04f07998404286ab92e65be0885f95";
    }
    if (keySystem === "com.widevine.alpha") {
      return "edef8ba979d64acea3c827dcd51d21ed";
    }
    if (startsWith(keySystem, "com.apple.fps")) {
      return "94ce86fb07ff4f43adb893d2fa968ca2";
    }
    if (startsWith(keySystem, "com.nagra.")) {
      return "adb41c242dbf4a6d958b4457c0d27b95";
    }
    return void 0;
  }

  // src/main/core/decrypt/utils/init_data_values_container.ts
  init_define_ENVIRONMENT();
  var InitDataValuesContainer = class {
    _innerValues;
    _lazyFormattedValues;
    constructor(initDataValues) {
      this._innerValues = initDataValues;
      this._lazyFormattedValues = null;
    }
    constructRequestData() {
      return concat2(...this._innerValues.map((i) => i.data));
    }
    isCompatibleWith(initDataValues) {
      const formatted = initDataValues instanceof InitDataValuesContainer ? initDataValues.getFormattedValues() : initDataValues;
      return areInitializationValuesCompatible(this.getFormattedValues(), formatted);
    }
    getFormattedValues() {
      if (this._lazyFormattedValues === null) {
        this._lazyFormattedValues = formatInitDataValues(this._innerValues);
      }
      return this._lazyFormattedValues;
    }
  };
  function formatInitDataValues(initialValues) {
    return initialValues.slice().sort((a, b) => a.systemId === b.systemId ? 0 : a.systemId === void 0 ? 1 : b.systemId === void 0 ? -1 : a.systemId < b.systemId ? -1 : 1).map(({ systemId, data }) => ({
      systemId,
      data,
      hash: hashBuffer(data)
    }));
  }

  // src/main/core/decrypt/content_decryptor.ts
  var { onEncrypted$: onEncrypted$2 } = event_listeners_exports;
  var ContentDecryptor = class extends EventEmitter {
    systemId;
    error;
    _stateData;
    _currentSessions;
    _canceller;
    _wasAttachCalled;
    _initDataQueue;
    constructor(mediaElement, ksOptions) {
      super();
      log_default.debug("DRM: Starting ContentDecryptor logic.");
      const canceller = new TaskCanceller();
      this._currentSessions = [];
      this._canceller = canceller;
      this._wasAttachCalled = false;
      this._initDataQueue = [];
      this._stateData = {
        state: ContentDecryptorState.Initializing,
        isMediaKeysAttached: false,
        isInitDataQueueLocked: true,
        data: null
      };
      this.error = null;
      const listenerSub = onEncrypted$2(mediaElement).subscribe((evt) => {
        log_default.debug("DRM: Encrypted event received from media element.");
        const initData = getInitData(evt);
        if (initData !== null) {
          this.onInitializationData(initData);
        }
      });
      canceller.signal.register(() => {
        listenerSub.unsubscribe();
      });
      initMediaKeys(mediaElement, ksOptions, canceller.signal).then((mediaKeysInfo) => {
        const { options, mediaKeySystemAccess } = mediaKeysInfo;
        let systemId;
        if (isNullOrUndefined(options.licenseStorage) || options.licenseStorage.disableRetroCompatibility === true) {
          systemId = getDrmSystemId(mediaKeySystemAccess.keySystem);
        }
        this.systemId = systemId;
        if (this._stateData.state === ContentDecryptorState.Initializing) {
          this._stateData = {
            state: ContentDecryptorState.WaitingForAttachment,
            isInitDataQueueLocked: true,
            isMediaKeysAttached: false,
            data: {
              mediaKeysInfo,
              mediaElement
            }
          };
          this.trigger("stateChange", this._stateData.state);
        }
      }).catch((err) => {
        this._onFatalError(err);
      });
    }
    getState() {
      return this._stateData.state;
    }
    attach() {
      if (this._stateData.state !== ContentDecryptorState.WaitingForAttachment) {
        throw new Error("`attach` should only be called when in the WaitingForAttachment state");
      } else if (this._wasAttachCalled) {
        log_default.warn("DRM: ContentDecryptor's `attach` method called more than once.");
        return;
      }
      this._wasAttachCalled = true;
      const { mediaElement, mediaKeysInfo } = this._stateData.data;
      const { options, mediaKeys, mediaKeySystemAccess, stores } = mediaKeysInfo;
      const stateToAttatch = {
        loadedSessionsStore: stores.loadedSessionsStore,
        mediaKeySystemAccess,
        mediaKeys,
        keySystemOptions: options
      };
      const shouldDisableLock = options.disableMediaKeysAttachmentLock === true;
      if (shouldDisableLock) {
        this._stateData = {
          state: ContentDecryptorState.ReadyForContent,
          isInitDataQueueLocked: true,
          isMediaKeysAttached: false,
          data: null
        };
        this.trigger("stateChange", this._stateData.state);
        if (this._isStopped()) {
          return;
        }
      }
      log_default.debug("DRM: Attaching current MediaKeys");
      attachMediaKeys(mediaElement, stateToAttatch, this._canceller.signal).then(async () => {
        const { serverCertificate } = options;
        if (!isNullOrUndefined(serverCertificate)) {
          const resSsc = await trySettingServerCertificate(mediaKeys, serverCertificate);
          if (resSsc.type === "error") {
            this.trigger("warning", resSsc.value);
          }
        }
        if (this._isStopped()) {
          return;
        }
        const prevState = this._stateData.state;
        this._stateData = {
          state: ContentDecryptorState.ReadyForContent,
          isMediaKeysAttached: true,
          isInitDataQueueLocked: false,
          data: { mediaKeysData: mediaKeysInfo }
        };
        if (prevState !== ContentDecryptorState.ReadyForContent) {
          this.trigger("stateChange", ContentDecryptorState.ReadyForContent);
        }
        if (!this._isStopped()) {
          this._processCurrentInitDataQueue();
        }
      }).catch((err) => {
        this._onFatalError(err);
      });
    }
    dispose() {
      this.removeEventListener();
      this._stateData = {
        state: ContentDecryptorState.Disposed,
        isMediaKeysAttached: void 0,
        isInitDataQueueLocked: void 0,
        data: null
      };
      this._canceller.cancel();
      this.trigger("stateChange", this._stateData.state);
    }
    onInitializationData(initializationData) {
      if (this._stateData.isInitDataQueueLocked !== false) {
        if (this._isStopped()) {
          throw new Error("ContentDecryptor either disposed or stopped.");
        }
        this._initDataQueue.push(initializationData);
        return;
      }
      const { mediaKeysData } = this._stateData.data;
      const processedInitializationData = {
        ...initializationData,
        values: new InitDataValuesContainer(initializationData.values)
      };
      this._processInitializationData(processedInitializationData, mediaKeysData).catch((err) => {
        this._onFatalError(err);
      });
    }
    async _processInitializationData(initializationData, mediaKeysData) {
      const { mediaKeySystemAccess, stores, options } = mediaKeysData;
      if (this._tryToUseAlreadyCreatedSession(initializationData, mediaKeysData) || this._isStopped()) {
        return;
      }
      if (options.singleLicensePer === "content") {
        const firstCreatedSession = arrayFind(this._currentSessions, (x) => x.source === "created-session" /* Created */);
        if (firstCreatedSession !== void 0) {
          const keyIds = initializationData.keyIds;
          if (keyIds === void 0) {
            if (initializationData.content === void 0) {
              log_default.warn("DRM: Unable to fallback from a non-decipherable quality.");
            } else {
              blackListProtectionData(
                initializationData.content.manifest,
                initializationData
              );
            }
            return;
          }
          firstCreatedSession.record.associateKeyIds(keyIds);
          if (initializationData.content !== void 0) {
            if (log_default.hasLevel("DEBUG")) {
              const hexKids = keyIds.reduce((acc, kid) => `${acc}, ${bytesToHex(kid)}`, "");
              log_default.debug("DRM: Blacklisting new key ids", hexKids);
            }
            updateDecipherability(initializationData.content.manifest, [], keyIds);
          }
          return;
        }
      } else if (options.singleLicensePer === "periods" && initializationData.content !== void 0) {
        const { period } = initializationData.content;
        const createdSessions = this._currentSessions.filter((x) => x.source === "created-session" /* Created */);
        const periodKeys = /* @__PURE__ */ new Set();
        addKeyIdsFromPeriod(periodKeys, period);
        for (const createdSess of createdSessions) {
          const periodKeysArr = Array.from(periodKeys);
          for (const kid of periodKeysArr) {
            if (createdSess.record.isAssociatedWithKeyId(kid)) {
              createdSess.record.associateKeyIds(periodKeys.values());
              for (const innerKid of periodKeysArr) {
                if (!isKeyIdContainedIn(innerKid, createdSess.keyStatuses.whitelisted) && !isKeyIdContainedIn(innerKid, createdSess.keyStatuses.blacklisted)) {
                  createdSess.keyStatuses.blacklisted.push(innerKid);
                }
              }
              updateDecipherability(
                initializationData.content.manifest,
                createdSess.keyStatuses.whitelisted,
                createdSess.keyStatuses.blacklisted
              );
              return;
            }
          }
        }
      }
      this._lockInitDataQueue();
      let wantedSessionType;
      if (options.persistentLicense !== true) {
        wantedSessionType = "temporary";
      } else if (!canCreatePersistentSession(mediaKeySystemAccess)) {
        log_default.warn('DRM: Cannot create "persistent-license" session: not supported');
        wantedSessionType = "temporary";
      } else {
        wantedSessionType = "persistent-license";
      }
      const {
        EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS,
        EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION
      } = config_default.getCurrent();
      const maxSessionCacheSize = typeof options.maxSessionCacheSize === "number" ? options.maxSessionCacheSize : EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS;
      const sessionRes = await createOrLoadSession(
        initializationData,
        stores,
        wantedSessionType,
        maxSessionCacheSize,
        this._canceller.signal
      );
      if (this._isStopped()) {
        return;
      }
      const sessionInfo = {
        record: sessionRes.value.keySessionRecord,
        source: sessionRes.type,
        keyStatuses: { whitelisted: [], blacklisted: [] },
        blacklistedSessionError: null
      };
      this._currentSessions.push(sessionInfo);
      const { mediaKeySession, sessionType } = sessionRes.value;
      let isSessionPersisted = false;
      const sub = SessionEventsListener(
        mediaKeySession,
        options,
        mediaKeySystemAccess.keySystem
      ).subscribe({
        next: (evt) => {
          switch (evt.type) {
            case "warning":
              this.trigger("warning", evt.value);
              return;
          }
          const linkedKeys = getKeyIdsLinkedToSession(
            initializationData,
            sessionInfo.record,
            options.singleLicensePer,
            sessionInfo.source === "created-session" /* Created */,
            evt.value.whitelistedKeyIds,
            evt.value.blacklistedKeyIDs
          );
          sessionInfo.record.associateKeyIds(linkedKeys.whitelisted);
          sessionInfo.record.associateKeyIds(linkedKeys.blacklisted);
          sessionInfo.keyStatuses = {
            whitelisted: linkedKeys.whitelisted,
            blacklisted: linkedKeys.blacklisted
          };
          if (sessionInfo.record.getAssociatedKeyIds().length !== 0 && sessionType === "persistent-license" && stores.persistentSessionsStore !== null && !isSessionPersisted) {
            const { persistentSessionsStore } = stores;
            cleanOldStoredPersistentInfo(
              persistentSessionsStore,
              EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION - 1
            );
            persistentSessionsStore.add(
              initializationData,
              sessionInfo.record.getAssociatedKeyIds(),
              mediaKeySession
            );
            isSessionPersisted = true;
          }
          if (initializationData.content !== void 0) {
            updateDecipherability(
              initializationData.content.manifest,
              linkedKeys.whitelisted,
              linkedKeys.blacklisted
            );
          }
          this._unlockInitDataQueue();
        },
        error: (err) => {
          if (!(err instanceof BlacklistedSessionError)) {
            this._onFatalError(err);
            return;
          }
          sessionInfo.blacklistedSessionError = err;
          if (initializationData.content !== void 0) {
            const { manifest } = initializationData.content;
            log_default.info("DRM: blacklisting Representations based on protection data.");
            blackListProtectionData(manifest, initializationData);
          }
          this._unlockInitDataQueue();
        }
      });
      this._canceller.signal.register(() => {
        sub.unsubscribe();
      });
      if (options.singleLicensePer === void 0 || options.singleLicensePer === "init-data") {
        this._unlockInitDataQueue();
      }
      if (sessionRes.type === "created-session" /* Created */) {
        const requestData = initializationData.values.constructRequestData();
        try {
          await stores.loadedSessionsStore.generateLicenseRequest(
            mediaKeySession,
            initializationData.type,
            requestData
          );
        } catch (error) {
          const entry = stores.loadedSessionsStore.getEntryForSession(mediaKeySession);
          if (entry === null || entry.closingStatus.type !== "none") {
            const indexInCurrent = this._currentSessions.indexOf(sessionInfo);
            if (indexInCurrent >= 0) {
              this._currentSessions.splice(indexInCurrent, 1);
            }
            return Promise.resolve();
          }
          throw new EncryptedMediaError(
            "KEY_GENERATE_REQUEST_ERROR",
            error instanceof Error ? error.toString() : "Unknown error"
          );
        }
      }
      return Promise.resolve();
    }
    _tryToUseAlreadyCreatedSession(initializationData, mediaKeysData) {
      const { stores, options } = mediaKeysData;
      const compatibleSessionInfo = arrayFind(
        this._currentSessions,
        (x) => x.record.isCompatibleWith(initializationData)
      );
      if (compatibleSessionInfo === void 0) {
        return false;
      }
      const blacklistedSessionError = compatibleSessionInfo.blacklistedSessionError;
      if (!isNullOrUndefined(blacklistedSessionError)) {
        if (initializationData.type === void 0 || initializationData.content === void 0) {
          log_default.error("DRM: This initialization data has already been blacklisted but the current content is not known.");
          return true;
        } else {
          log_default.info("DRM: This initialization data has already been blacklisted. Blacklisting the related content.");
          const { manifest } = initializationData.content;
          blackListProtectionData(manifest, initializationData);
          return true;
        }
      }
      if (initializationData.keyIds !== void 0) {
        let isUndecipherable;
        if (options.singleLicensePer === void 0 || options.singleLicensePer === "init-data") {
          const { blacklisted } = compatibleSessionInfo.keyStatuses;
          isUndecipherable = areSomeKeyIdsContainedIn(
            initializationData.keyIds,
            blacklisted
          );
        } else {
          const { whitelisted } = compatibleSessionInfo.keyStatuses;
          isUndecipherable = !areAllKeyIdsContainedIn(
            initializationData.keyIds,
            whitelisted
          );
        }
        if (isUndecipherable) {
          if (initializationData.content === void 0) {
            log_default.error("DRM: Cannot forbid key id, the content is unknown.");
            return true;
          }
          log_default.info("DRM: Current initialization data is linked to blacklisted keys. Marking Representations as not decipherable");
          updateDecipherability(
            initializationData.content.manifest,
            [],
            initializationData.keyIds
          );
          return true;
        }
      }
      const entry = stores.loadedSessionsStore.reuse(initializationData);
      if (entry !== null) {
        log_default.debug("DRM: Init data already processed. Skipping it.");
        return true;
      }
      const indexOf = this._currentSessions.indexOf(compatibleSessionInfo);
      if (indexOf === -1) {
        log_default.error("DRM: Unable to remove processed init data: not found.");
      } else {
        log_default.debug("DRM: A session from a processed init data is not available anymore. Re-processing it.");
        this._currentSessions.splice(indexOf, 1);
      }
      return false;
    }
    _onFatalError(err) {
      if (this._canceller.isUsed) {
        return;
      }
      const formattedErr = err instanceof Error ? err : new OtherError("NONE", "Unknown encryption error");
      this.error = formattedErr;
      this._initDataQueue.length = 0;
      this._stateData = {
        state: ContentDecryptorState.Error,
        isMediaKeysAttached: void 0,
        isInitDataQueueLocked: void 0,
        data: null
      };
      this._canceller.cancel();
      this.trigger("error", formattedErr);
      if (this._stateData.state === ContentDecryptorState.Error) {
        this.trigger("stateChange", this._stateData.state);
      }
    }
    _isStopped() {
      return this._stateData.state === ContentDecryptorState.Disposed || this._stateData.state === ContentDecryptorState.Error;
    }
    _processCurrentInitDataQueue() {
      while (this._stateData.isInitDataQueueLocked === false) {
        const initData = this._initDataQueue.shift();
        if (initData === void 0) {
          return;
        }
        this.onInitializationData(initData);
      }
    }
    _lockInitDataQueue() {
      if (this._stateData.isInitDataQueueLocked === false) {
        this._stateData.isInitDataQueueLocked = true;
      }
    }
    _unlockInitDataQueue() {
      if (this._stateData.isMediaKeysAttached !== true) {
        log_default.error("DRM: Trying to unlock in the wrong state");
        return;
      }
      this._stateData.isInitDataQueueLocked = false;
      this._processCurrentInitDataQueue();
    }
  };
  function canCreatePersistentSession(mediaKeySystemAccess) {
    const { sessionTypes } = mediaKeySystemAccess.getConfiguration();
    return sessionTypes !== void 0 && arrayIncludes(sessionTypes, "persistent-license");
  }
  function updateDecipherability(manifest, whitelistedKeyIds, blacklistedKeyIDs) {
    manifest.updateRepresentationsDeciperability((representation) => {
      if (representation.contentProtections === void 0) {
        return representation.decipherable;
      }
      const contentKIDs = representation.contentProtections.keyIds;
      if (contentKIDs !== void 0) {
        for (let i = 0; i < contentKIDs.length; i++) {
          const elt = contentKIDs[i];
          for (let j = 0; j < blacklistedKeyIDs.length; j++) {
            if (areKeyIdsEqual(blacklistedKeyIDs[j], elt.keyId)) {
              return false;
            }
          }
          for (let j = 0; j < whitelistedKeyIds.length; j++) {
            if (areKeyIdsEqual(whitelistedKeyIds[j], elt.keyId)) {
              return true;
            }
          }
        }
      }
      return representation.decipherable;
    });
  }
  function blackListProtectionData(manifest, initData) {
    manifest.updateRepresentationsDeciperability((representation) => {
      if (representation.decipherable === false) {
        return false;
      }
      const segmentProtections = representation.contentProtections?.initData ?? [];
      for (let i = 0; i < segmentProtections.length; i++) {
        if (initData.type === void 0 || segmentProtections[i].type === initData.type) {
          const containedInitData = initData.values.getFormattedValues().every((undecipherableVal) => {
            return segmentProtections[i].values.some((currVal) => {
              return (undecipherableVal.systemId === void 0 || currVal.systemId === undecipherableVal.systemId) && areArraysOfNumbersEqual(
                currVal.data,
                undecipherableVal.data
              );
            });
          });
          if (containedInitData) {
            return false;
          }
        }
      }
      return representation.decipherable;
    });
  }
  var ContentDecryptorState = /* @__PURE__ */ ((ContentDecryptorState2) => {
    ContentDecryptorState2[ContentDecryptorState2["Initializing"] = 0] = "Initializing";
    ContentDecryptorState2[ContentDecryptorState2["WaitingForAttachment"] = 1] = "WaitingForAttachment";
    ContentDecryptorState2[ContentDecryptorState2["ReadyForContent"] = 2] = "ReadyForContent";
    ContentDecryptorState2[ContentDecryptorState2["Error"] = 3] = "Error";
    ContentDecryptorState2[ContentDecryptorState2["Disposed"] = 4] = "Disposed";
    return ContentDecryptorState2;
  })(ContentDecryptorState || {});
  function getKeyIdsLinkedToSession(initializationData, keySessionRecord, singleLicensePer, isCurrentLicense, usableKeyIds, unusableKeyIds) {
    const associatedKeyIds = [
      ...usableKeyIds,
      ...unusableKeyIds
    ];
    const allKnownKeyIds = keySessionRecord.getAssociatedKeyIds();
    for (const kid of allKnownKeyIds) {
      if (!associatedKeyIds.some((ak) => areKeyIdsEqual(ak, kid))) {
        if (log_default.hasLevel("DEBUG")) {
          log_default.debug(
            "DRM: KeySessionRecord's key missing in the license, blacklisting it",
            bytesToHex(kid)
          );
        }
        associatedKeyIds.push(kid);
      }
    }
    if (singleLicensePer !== void 0 && singleLicensePer !== "init-data") {
      const {
        keyIds: expectedKeyIds,
        content
      } = initializationData;
      if (expectedKeyIds !== void 0) {
        const missingKeyIds = expectedKeyIds.filter((expected) => {
          return !associatedKeyIds.some((k) => areKeyIdsEqual(k, expected));
        });
        if (missingKeyIds.length > 0) {
          if (log_default.hasLevel("DEBUG")) {
            log_default.debug(
              "DRM: init data keys missing in the license, blacklisting them",
              missingKeyIds.map((m) => bytesToHex(m)).join(", ")
            );
          }
          associatedKeyIds.push(...missingKeyIds);
        }
      }
      if (isCurrentLicense && content !== void 0) {
        if (singleLicensePer === "content") {
          const contentKeys = /* @__PURE__ */ new Set();
          const { manifest } = content;
          for (const period of manifest.periods) {
            addKeyIdsFromPeriod(contentKeys, period);
          }
          mergeKeyIdSetIntoArray(contentKeys, associatedKeyIds);
        } else if (singleLicensePer === "periods") {
          const { manifest } = content;
          for (const period of manifest.periods) {
            const periodKeys = /* @__PURE__ */ new Set();
            addKeyIdsFromPeriod(periodKeys, period);
            if (initializationData.content?.period.id === period.id) {
              mergeKeyIdSetIntoArray(periodKeys, associatedKeyIds);
            } else {
              const periodKeysArr = Array.from(periodKeys);
              for (const kid of periodKeysArr) {
                const isFound = associatedKeyIds.some((k) => areKeyIdsEqual(k, kid));
                if (isFound) {
                  mergeKeyIdSetIntoArray(periodKeys, associatedKeyIds);
                  break;
                }
              }
            }
          }
        }
      }
    }
    return {
      whitelisted: usableKeyIds,
      blacklisted: associatedKeyIds.slice(usableKeyIds.length)
    };
  }
  function mergeKeyIdSetIntoArray(set, arr) {
    const setArr = Array.from(set.values());
    for (const kid of setArr) {
      const isFound = arr.some((k) => areKeyIdsEqual(k, kid));
      if (!isFound) {
        arr.push(kid);
      }
    }
  }
  function addKeyIdsFromPeriod(set, period) {
    for (const adaptation of period.getAdaptations()) {
      for (const representation of adaptation.representations) {
        if (representation.contentProtections !== void 0 && representation.contentProtections.keyIds !== void 0) {
          for (const kidInf of representation.contentProtections.keyIds) {
            set.add(kidInf.keyId);
          }
        }
      }
    }
  }

  // src/main/core/decrypt/get_current_key_system.ts
  init_define_ENVIRONMENT();
  function getCurrentKeySystem(mediaElement) {
    const currentState = media_keys_infos_store_default.getState(mediaElement);
    return currentState == null ? null : currentState.keySystemOptions.type;
  }

  // src/main/core/decrypt/index.ts
  var decrypt_default = ContentDecryptor;

  // src/main/core/init/worker_init.ts
  init_define_ENVIRONMENT();

  // src/main/send_message.ts
  init_define_ENVIRONMENT();
  function sendMessage(worker, msg, transferables) {
    if (transferables === void 0) {
      worker.postMessage(msg);
    } else {
      worker.postMessage(msg, transferables);
    }
  }

  // src/main/core/init/emit_loaded_event.ts
  init_define_ENVIRONMENT();

  // src/common/utils/filter_map.ts
  init_define_ENVIRONMENT();
  function filterMap(callback, filteringToken) {
    return (source) => defer(() => {
      return source.pipe(
        map(callback),
        filter((x) => x !== filteringToken)
      );
    });
  }

  // src/main/core/init/events_generators.ts
  init_define_ENVIRONMENT();
  function loaded() {
    return { type: "loaded", value: null };
  }
  function stalled(rebuffering) {
    return { type: "stalled", value: rebuffering };
  }
  function unstalled() {
    return { type: "unstalled", value: null };
  }
  function decipherabilityUpdate(arg) {
    return { type: "decipherabilityUpdate", value: arg };
  }
  function manifestReady(manifest) {
    return { type: "manifestReady", value: { manifest } };
  }
  function manifestUpdate() {
    return { type: "manifestUpdate", value: null };
  }
  function nullRepresentation(type, period) {
    return {
      type: "representationChange",
      value: {
        type,
        representation: null,
        period
      }
    };
  }
  function warning(value) {
    return { type: "warning", value };
  }
  function reloadingMediaSource() {
    return { type: "reloading-media-source", value: void 0 };
  }
  var INIT_EVENTS = {
    loaded,
    decipherabilityUpdate,
    manifestReady,
    manifestUpdate,
    nullRepresentation,
    reloadingMediaSource,
    stalled,
    unstalled,
    warning
  };
  var events_generators_default = INIT_EVENTS;

  // src/main/core/init/emit_loaded_event.ts
  function emitLoadedEvent(observation$, mediaElement, isDirectfile) {
    return observation$.pipe(
      filterMap((observation) => {
        if (observation.rebuffering !== null || observation.freezing !== null || observation.readyState === 0) {
          return null;
        }
        if (!shouldWaitForDataBeforeLoaded(
          isDirectfile,
          mediaElement.hasAttribute("playsinline")
        )) {
          return mediaElement.duration > 0 ? events_generators_default.loaded() : null;
        }
        if (observation.readyState >= 3 && observation.currentRange !== null) {
          if (!shouldValidateMetadata() || mediaElement.duration > 0) {
            return events_generators_default.loaded();
          }
          return null;
        }
        return null;
      }, null),
      take(1)
    );
  }

  // src/main/core/init/get_initial_time.ts
  init_define_ENVIRONMENT();
  function getInitialTime(manifest, lowLatencyMode, startAt) {
    if (!isNullOrUndefined(startAt)) {
      const min = getMinimumSafePosition(manifest);
      let max;
      if (manifest.isLive) {
        max = getLivePosition(manifest);
      }
      if (max === void 0) {
        max = getMaximumSafePosition(manifest);
      }
      if (!isNullOrUndefined(startAt.position)) {
        log_default.debug("Init: using startAt.minimumPosition");
        return Math.max(Math.min(startAt.position, max), min);
      } else if (!isNullOrUndefined(startAt.wallClockTime)) {
        log_default.debug("Init: using startAt.wallClockTime");
        const ast = manifest.availabilityStartTime === void 0 ? 0 : manifest.availabilityStartTime;
        const position = startAt.wallClockTime - ast;
        return Math.max(Math.min(position, max), min);
      } else if (!isNullOrUndefined(startAt.fromFirstPosition)) {
        log_default.debug("Init: using startAt.fromFirstPosition");
        const { fromFirstPosition } = startAt;
        return fromFirstPosition <= 0 ? min : Math.min(max, min + fromFirstPosition);
      } else if (!isNullOrUndefined(startAt.fromLastPosition)) {
        log_default.debug("Init: using startAt.fromLastPosition");
        const { fromLastPosition } = startAt;
        return fromLastPosition >= 0 ? max : Math.max(min, max + fromLastPosition);
      } else if (!isNullOrUndefined(startAt.percentage)) {
        log_default.debug("Init: using startAt.percentage");
        const { percentage } = startAt;
        if (percentage > 100) {
          return max;
        } else if (percentage < 0) {
          return min;
        }
        const ratio = +percentage / 100;
        const extent = max - min;
        return min + extent * ratio;
      }
    }
    const minimumPosition = getMinimumSafePosition(manifest);
    if (manifest.isLive) {
      const {
        suggestedPresentationDelay,
        clockOffset
      } = manifest;
      const maximumPosition = getMaximumSafePosition(manifest);
      let liveTime;
      const { DEFAULT_LIVE_GAP } = config_default.getCurrent();
      if (clockOffset === void 0) {
        log_default.info("Init: no clock offset found for a live content, starting close to maximum available position");
        liveTime = maximumPosition;
      } else {
        log_default.info("Init: clock offset found for a live content, checking if we can start close to it");
        const ast = manifest.availabilityStartTime === void 0 ? 0 : manifest.availabilityStartTime;
        const clockRelativeLiveTime = (performance.now() + clockOffset) / 1e3 - ast;
        liveTime = Math.min(
          maximumPosition,
          clockRelativeLiveTime
        );
      }
      const diffFromLiveTime = suggestedPresentationDelay !== void 0 ? suggestedPresentationDelay : lowLatencyMode ? DEFAULT_LIVE_GAP.LOW_LATENCY : DEFAULT_LIVE_GAP.DEFAULT;
      log_default.debug(`Init: ${liveTime} defined as the live time, applying a live gap of ${diffFromLiveTime}`);
      return Math.max(liveTime - diffFromLiveTime, minimumPosition);
    }
    log_default.info("Init: starting at the minimum available position:", minimumPosition);
    return minimumPosition;
  }
  function getMinimumSafePosition(manifest) {
    const windowData = manifest.timeBounds;
    if (windowData.timeshiftDepth === null) {
      return windowData.minimumSafePosition ?? 0;
    }
    const { maximumTimeData } = windowData;
    let maximumTime;
    if (!windowData.maximumTimeData.isLinear) {
      maximumTime = maximumTimeData.maximumSafePosition;
    } else {
      const timeDiff = performance.now() - maximumTimeData.time;
      maximumTime = maximumTimeData.maximumSafePosition + timeDiff / 1e3;
    }
    const theoricalMinimum = maximumTime - windowData.timeshiftDepth;
    return Math.max(windowData.minimumSafePosition ?? 0, theoricalMinimum);
  }
  function getLivePosition(manifest) {
    const { maximumTimeData } = manifest.timeBounds;
    if (!manifest.isLive || maximumTimeData.livePosition === void 0) {
      return void 0;
    }
    if (!maximumTimeData.isLinear) {
      return maximumTimeData.livePosition;
    }
    const timeDiff = performance.now() - maximumTimeData.time;
    return maximumTimeData.livePosition + timeDiff / 1e3;
  }
  function getMaximumSafePosition(manifest) {
    const { maximumTimeData } = manifest.timeBounds;
    if (!maximumTimeData.isLinear) {
      return maximumTimeData.maximumSafePosition;
    }
    const timeDiff = performance.now() - maximumTimeData.time;
    return maximumTimeData.maximumSafePosition + timeDiff / 1e3;
  }

  // src/main/core/init/initial_seek_and_play.ts
  init_define_ENVIRONMENT();
  function waitUntilPlayable(observation$) {
    return observation$.pipe(
      filter(({ seeking, rebuffering, readyState }) => !seeking && rebuffering === null && readyState >= 1),
      take(1),
      map(() => void 0)
    );
  }
  function autoPlay(mediaElement) {
    return play(mediaElement).pipe(
      map(() => "autoplay"),
      catchError((error) => {
        if (error instanceof Error && error.name === "NotAllowedError") {
          log_default.warn("Init: Media element can't play. It may be due to browser auto-play policies.");
          return of("autoplay-blocked");
        } else {
          throw error;
        }
      })
    );
  }
  function initialSeekAndPlay({
    mediaElement,
    playbackObserver,
    startTime,
    mustAutoPlay
  }) {
    const initialSeekPerformed = createSharedReference(false);
    const initialPlayPerformed = createSharedReference(false);
    const seek$ = whenLoadedMetadata$(mediaElement).pipe(
      take(1),
      tap(() => {
        const initialTime = typeof startTime === "function" ? startTime() : startTime;
        log_default.info("Init: Set initial time", initialTime);
        playbackObserver.setCurrentTime(initialTime);
        initialSeekPerformed.setValue(true);
        initialSeekPerformed.finish();
      }),
      shareReplay({ refCount: true })
    );
    const seekAndPlay$ = seek$.pipe(
      mergeMap(() => {
        if (!shouldValidateMetadata() || mediaElement.duration > 0) {
          return waitUntilPlayable(playbackObserver.getReference().asObservable());
        } else {
          const error = new MediaError(
            "MEDIA_ERR_NOT_LOADED_METADATA",
            "Cannot load automatically: your browser falsely announced having loaded the content."
          );
          return waitUntilPlayable(playbackObserver.getReference().asObservable()).pipe(startWith(events_generators_default.warning(error)));
        }
      }),
      mergeMap((evt) => {
        if (evt !== void 0) {
          return of(evt);
        }
        log_default.info("Init: Can begin to play content");
        if (!mustAutoPlay) {
          if (mediaElement.autoplay) {
            log_default.warn("Init: autoplay is enabled on HTML media element. Media will play as soon as possible.");
          }
          initialPlayPerformed.setValue(true);
          initialPlayPerformed.finish();
          return of({ type: "skipped" });
        }
        return autoPlay(mediaElement).pipe(mergeMap((autoplayEvt) => {
          initialPlayPerformed.setValue(true);
          initialPlayPerformed.finish();
          if (autoplayEvt === "autoplay") {
            return of({ type: "autoplay" });
          } else {
            const error = new MediaError(
              "MEDIA_ERR_BLOCKED_AUTOPLAY",
              "Cannot trigger auto-play automatically: your browser does not allow it."
            );
            return concat(
              of(events_generators_default.warning(error)),
              of({ type: "autoplay-blocked" })
            );
          }
        }));
      }),
      shareReplay({ refCount: true })
    );
    return { seekAndPlay$, initialPlayPerformed, initialSeekPerformed };
  }

  // src/main/core/init/throw_on_media_error.ts
  init_define_ENVIRONMENT();
  function throwOnMediaError(mediaElement) {
    return fromEvent(mediaElement, "error").pipe(mergeMap(() => {
      const mediaError = mediaElement.error;
      let errorCode;
      let errorMessage2;
      if (!isNullOrUndefined(mediaError)) {
        errorCode = mediaError.code;
        errorMessage2 = mediaError.message;
      }
      switch (errorCode) {
        case 1:
          errorMessage2 = errorMessage2 ?? "The fetching of the associated resource was aborted by the user's request.";
          throw new MediaError("MEDIA_ERR_ABORTED", errorMessage2);
        case 2:
          errorMessage2 = errorMessage2 ?? "A network error occurred which prevented the media from being successfully fetched";
          throw new MediaError("MEDIA_ERR_NETWORK", errorMessage2);
        case 3:
          errorMessage2 = errorMessage2 ?? "An error occurred while trying to decode the media resource";
          throw new MediaError("MEDIA_ERR_DECODE", errorMessage2);
        case 4:
          errorMessage2 = errorMessage2 ?? "The media resource has been found to be unsuitable.";
          throw new MediaError("MEDIA_ERR_SRC_NOT_SUPPORTED", errorMessage2);
        default:
          errorMessage2 = errorMessage2 ?? "The HTMLMediaElement errored due to an unknown reason.";
          throw new MediaError("MEDIA_ERR_UNKNOWN", errorMessage2);
      }
    }));
  }

  // src/main/core/init/worker_init.ts
  var lastContentId = 0;
  function InitializeOnMediaSource(worker, {
    playbackObserver,
    adaptiveOptions,
    mediaElement,
    autoPlay: autoPlay2,
    keySystems,
    url,
    minimumManifestUpdateInterval,
    lowLatencyMode,
    startAt,
    bufferOptions
  }) {
    let manifest;
    const {
      enableFastSwitching,
      audioTrackSwitchingMode,
      wantedBufferAhead,
      maxVideoBufferSize,
      maxBufferAhead,
      maxBufferBehind,
      onCodecSwitch,
      manualBitrateSwitchingMode
    } = bufferOptions;
    const initialVideoBitrate = adaptiveOptions.initialBitrates.video;
    const initialAudioBitrate = adaptiveOptions.initialBitrates.audio;
    const limitVideoWidth = adaptiveOptions.throttlers.limitWidth.video ?? reference_default(Infinity);
    const throttleVideo = adaptiveOptions.throttlers.throttle.video ?? reference_default(Infinity);
    const throttleVideoBitrate = adaptiveOptions.throttlers.throttleBitrate.video ?? reference_default(Infinity);
    const minAudioBitrate = adaptiveOptions.minAutoBitrates.audio ?? reference_default(0);
    const minVideoBitrate = adaptiveOptions.minAutoBitrates.video ?? reference_default(0);
    const maxAudioBitrate = adaptiveOptions.maxAutoBitrates.audio ?? reference_default(Infinity);
    const maxVideoBitrate = adaptiveOptions.maxAutoBitrates.video ?? reference_default(Infinity);
    const manualAudioBitrate = adaptiveOptions.manualBitrates.audio ?? reference_default(-1);
    const manualVideoBitrate = adaptiveOptions.manualBitrates.video ?? reference_default(-1);
    const initCanceller = new TaskCanceller();
    const cancelSignal = initCanceller.signal;
    const finish$ = cancellationSignalToObservable(cancelSignal);
    const initSubject = new Subject();
    bindReferenceUpdates(worker, wantedBufferAhead, "wantedBufferAhead", cancelSignal);
    bindReferenceUpdates(worker, maxVideoBufferSize, "maxVideoBufferSize", cancelSignal);
    bindReferenceUpdates(worker, maxBufferAhead, "maxBufferAhead", cancelSignal);
    bindReferenceUpdates(worker, maxBufferBehind, "maxBufferBehind", cancelSignal);
    bindReferenceUpdates(worker, minAudioBitrate, "minAudioBitrate", cancelSignal);
    bindReferenceUpdates(worker, minVideoBitrate, "minVideoBitrate", cancelSignal);
    bindReferenceUpdates(worker, maxAudioBitrate, "maxAudioBitrate", cancelSignal);
    bindReferenceUpdates(worker, maxVideoBitrate, "maxVideoBitrate", cancelSignal);
    bindReferenceUpdates(worker, manualAudioBitrate, "manualAudioBitrate", cancelSignal);
    bindReferenceUpdates(worker, manualVideoBitrate, "manualVideoBitrate", cancelSignal);
    bindReferenceUpdates(worker, limitVideoWidth, "limitVideoWidth", cancelSignal);
    bindReferenceUpdates(worker, throttleVideo, "throttleVideo", cancelSignal);
    bindReferenceUpdates(
      worker,
      throttleVideoBitrate,
      "throttleVideoBitrate",
      cancelSignal
    );
    const lastContentProtection = reference_default(null);
    const mediaSourceStatus = reference_default(
      0 /* Nothing */
    );
    const drmCallbacks = {
      onWarning(err) {
        initSubject.next({ type: "warning", value: err });
      },
      onError(err) {
        initSubject.error(err);
        initCanceller.cancel();
      }
    };
    const drmInitialization = initializeContentDecryption(
      mediaElement,
      keySystems,
      lastContentProtection,
      mediaSourceStatus,
      drmCallbacks,
      initCanceller.signal
    );
    const mediaError$ = throwOnMediaError(mediaElement);
    if (url === void 0) {
      return throwError(() => new Error("URL should not be null"));
    }
    worker.onmessage = function onWorkerMessage(msg) {
      switch (msg.data.type) {
        case "media-source": {
          const handle = msg.data.value;
          const listenCanceller = new TaskCanceller({ cancelOn: initCanceller.signal });
          mediaSourceStatus.onUpdate((currStatus) => {
            if (currStatus === 1 /* Ready */) {
              listenCanceller.cancel();
              mediaElement.srcObject = handle;
              mediaSourceStatus.setValue(2 /* Attached */);
            }
          }, { emitCurrentValue: true, clearSignal: listenCanceller.signal });
          break;
        }
        case "warning":
          initSubject.next(events_generators_default.warning(formatError2(msg.data.value)));
          break;
        case "error":
          initSubject.error(formatError2(msg.data.value));
          break;
        case "encryption-data-encountered":
          lastContentProtection.setValue(msg.data.value);
          break;
        case "ready-to-start": {
          manifest = msg.data.value.manifest;
          const listenCanceller = new TaskCanceller({ cancelOn: initCanceller.signal });
          drmInitialization.onUpdate((initializationStatus) => {
            if (initializationStatus.isInitialized) {
              listenCanceller.cancel();
              startPlayback(initializationStatus.drmSystemId);
            }
          }, { emitCurrentValue: true, clearSignal: listenCanceller.signal });
          break;
        }
      }
    };
    sendMessage(
      worker,
      {
        type: "prepare",
        value: {
          contentId: lastContentId++,
          url,
          minimumManifestUpdateInterval,
          lowLatencyMode,
          initialVideoBitrate,
          initialAudioBitrate,
          manifestRetryOptions: {},
          segmentRetryOptions: {}
        }
      }
    );
    return merge(
      mediaError$,
      initSubject,
      new Observable(() => () => initCanceller.cancel())
    );
    function startPlayback(drmSystemId) {
      assert(manifest !== null);
      log_default.debug("Init: Calculating initial time");
      const initialTime = getInitialTime(manifest, lowLatencyMode, startAt);
      log_default.debug("Init: Initial time calculated:", initialTime);
      const {
        seekAndPlay$,
        initialPlayPerformed,
        initialSeekPerformed
      } = initialSeekAndPlay({
        mediaElement,
        mustAutoPlay: autoPlay2,
        playbackObserver,
        startTime: initialTime
      });
      playbackObserver.listen(sendNewPlaybackObservation);
      const loadedEvent$ = emitLoadedEvent(
        playbackObserver.getReference().asObservable(),
        mediaElement,
        false
      );
      loadedEvent$.pipe(takeUntil(finish$)).subscribe(initSubject);
      function sendNewPlaybackObservation() {
        assert(manifest !== null);
        const observation = playbackObserver.getReference().getValue();
        const speedVal = 1;
        let pendingPosition;
        if (!initialSeekPerformed.getValue()) {
          pendingPosition = initialTime;
        } else if (!manifest.isDynamic || manifest.isLastPeriodKnown) {
          const lastPeriod = manifest.periods[manifest.periods.length - 1];
          if (lastPeriod !== void 0 && lastPeriod.end !== void 0 && observation.position > lastPeriod.end) {
            pendingPosition = lastPeriod.end - 1;
          }
        }
        sendMessage(
          worker,
          {
            type: "observation",
            value: {
              position: {
                last: observation.position,
                pending: pendingPosition
              },
              duration: observation.duration,
              paused: {
                last: observation.paused,
                pending: initialPlayPerformed.getValue() ? void 0 : !autoPlay2 === observation.paused ? void 0 : !autoPlay2
              },
              speed: speedVal,
              readyState: observation.readyState
            }
          }
        );
      }
      seekAndPlay$.pipe(takeUntil(finish$)).subscribe();
      sendMessage(
        worker,
        {
          type: "start",
          value: {
            initialTime,
            drmSystemId,
            manualBitrateSwitchingMode,
            enableFastSwitching,
            audioTrackSwitchingMode,
            onCodecSwitch
          }
        }
      );
      initSubject.next(events_generators_default.manifestReady(manifest));
    }
  }
  function initializeContentDecryption(mediaElement, keySystems, lastContentProtection, mediaSourceStatus, callbacks, cancelSignal) {
    const listenCanceller = new TaskCanceller({ cancelOn: cancelSignal });
    if (keySystems.length === 0) {
      lastContentProtection.onUpdate((data) => {
        if (data === null) {
          return;
        }
        listenCanceller.cancel();
        log_default.error("Init: Encrypted event but EME feature not activated");
        const err = new EncryptedMediaError(
          "MEDIA_IS_ENCRYPTED_ERROR",
          "EME feature not activated."
        );
        callbacks.onError(err);
      }, { clearSignal: listenCanceller.signal });
      mediaSourceStatus.setValue(1 /* Ready */);
      return reference_default({
        isInitialized: true,
        drmSystemId: void 0
      });
    } else if (!hasEMEAPIs()) {
      lastContentProtection.onUpdate((data) => {
        if (data === null) {
          return;
        }
        listenCanceller.cancel();
        log_default.error("Init: Encrypted event but no EME API available");
        const err = new EncryptedMediaError(
          "MEDIA_IS_ENCRYPTED_ERROR",
          "Encryption APIs not found."
        );
        callbacks.onError(err);
      }, { clearSignal: listenCanceller.signal });
      mediaSourceStatus.setValue(1 /* Ready */);
      return reference_default({
        isInitialized: true,
        drmSystemId: void 0
      });
    }
    const drmStatusRef = reference_default({
      isInitialized: false,
      drmSystemId: void 0
    });
    log_default.debug("Init: Creating ContentDecryptor");
    const contentDecryptor = new decrypt_default(mediaElement, keySystems);
    contentDecryptor.addEventListener("stateChange", (state) => {
      if (state === 1 /* WaitingForAttachment */) {
        const mediaSourceStatusListenerCanceller = new TaskCanceller({
          cancelOn: listenCanceller.signal
        });
        mediaSourceStatus.onUpdate((currStatus) => {
          if (currStatus === 0 /* Nothing */) {
            mediaSourceStatus.setValue(1 /* Ready */);
          } else if (currStatus === 2 /* Attached */) {
            mediaSourceStatusListenerCanceller.cancel();
            if (state === 1 /* WaitingForAttachment */) {
              contentDecryptor.attach();
            }
          }
        }, {
          clearSignal: mediaSourceStatusListenerCanceller.signal,
          emitCurrentValue: true
        });
      } else if (state === 2 /* ReadyForContent */) {
        drmStatusRef.setValue({
          isInitialized: true,
          drmSystemId: contentDecryptor.systemId
        });
        contentDecryptor.removeEventListener("stateChange");
      }
    });
    contentDecryptor.addEventListener("error", (error) => {
      listenCanceller.cancel();
      callbacks.onError(error);
    });
    contentDecryptor.addEventListener("warning", (error) => {
      callbacks.onWarning(error);
    });
    lastContentProtection.onUpdate((data) => {
      if (data === null) {
        return;
      }
      contentDecryptor.onInitializationData(data);
    }, { clearSignal: listenCanceller.signal });
    listenCanceller.signal.register(() => {
      contentDecryptor.dispose();
    });
    return drmStatusRef;
  }
  function cancellationSignalToObservable(signal) {
    return new Observable((obs) => {
      if (signal.isCancelled) {
        obs.next();
      } else {
        const deregister = signal.register(() => {
          obs.next();
        });
        return () => {
          deregister();
        };
      }
    });
  }
  function bindReferenceUpdates(worker, ref, refName, cancellationSignal) {
    ref.onUpdate((newVal) => {
      sendMessage(worker, {
        type: "reference-update",
        value: {
          name: refName,
          newVal
        }
      });
    }, { clearSignal: cancellationSignal, emitCurrentValue: true });
  }
  function formatError2(sentError) {
    switch (sentError.type) {
      case "NETWORK_ERROR":
        return new NetworkError(
          sentError.code,
          new RequestError("XXX TODO", 500, "TIMEOUT", void 0)
        );
      case "MEDIA_ERROR":
        return new MediaError(sentError.code, "XXX TODO");
      case "ENCRYPTED_MEDIA_ERROR":
        return new EncryptedMediaError(sentError.code, "XXX TODO");
      case "OTHER_ERROR":
        return new OtherError(sentError.code, "XXX TODO");
    }
  }

  // src/main/core/api/emit_seek_events.ts
  init_define_ENVIRONMENT();
  function emitSeekEvents(mediaElement, observation$) {
    return defer(() => {
      if (mediaElement === null) {
        return EMPTY;
      }
      let isSeeking$ = observation$.pipe(
        filter((observation) => observation.event === "seeking"),
        map(() => "seeking")
      );
      if (mediaElement.seeking) {
        isSeeking$ = isSeeking$.pipe(startWith("seeking"));
      }
      const hasSeeked$ = isSeeking$.pipe(
        switchMap(() => observation$.pipe(
          filter((observation) => observation.event === "seeked"),
          map(() => "seeked"),
          take(1)
        ))
      );
      return merge(isSeeking$, hasSeeked$);
    });
  }

  // src/main/core/api/get_player_state.ts
  init_define_ENVIRONMENT();
  var PLAYER_STATES = {
    STOPPED: "STOPPED",
    LOADED: "LOADED",
    LOADING: "LOADING",
    PLAYING: "PLAYING",
    PAUSED: "PAUSED",
    ENDED: "ENDED",
    BUFFERING: "BUFFERING",
    SEEKING: "SEEKING",
    RELOADING: "RELOADING"
  };
  function getLoadedContentState(mediaElement, stalledStatus) {
    const { FORCED_ENDED_THRESHOLD } = config_default.getCurrent();
    if (mediaElement.ended) {
      return PLAYER_STATES.ENDED;
    }
    if (stalledStatus !== null) {
      const gapBetweenDurationAndCurrentTime = Math.abs(mediaElement.duration - mediaElement.currentTime);
      if (FORCED_ENDED_THRESHOLD != null && gapBetweenDurationAndCurrentTime < FORCED_ENDED_THRESHOLD) {
        return PLAYER_STATES.ENDED;
      }
      return stalledStatus === "seeking" ? PLAYER_STATES.SEEKING : PLAYER_STATES.BUFFERING;
    }
    return mediaElement.paused ? PLAYER_STATES.PAUSED : PLAYER_STATES.PLAYING;
  }

  // src/main/core/api/option_utils.ts
  init_define_ENVIRONMENT();

  // src/common/utils/languages/index.ts
  init_define_ENVIRONMENT();

  // src/common/utils/languages/normalize.ts
  init_define_ENVIRONMENT();

  // src/common/utils/languages/ISO_639-1_to_ISO_639-3.ts
  init_define_ENVIRONMENT();
  var ISO_MAP_1_TO_3 = {
    aa: "aar",
    ab: "abk",
    ae: "ave",
    af: "afr",
    ak: "aka",
    am: "amh",
    an: "arg",
    ar: "ara",
    as: "asm",
    av: "ava",
    ay: "aym",
    az: "aze",
    ba: "bak",
    be: "bel",
    bg: "bul",
    bi: "bis",
    bm: "bam",
    bn: "ben",
    bo: "bod",
    br: "bre",
    bs: "bos",
    ca: "cat",
    ce: "che",
    ch: "cha",
    co: "cos",
    cr: "cre",
    cs: "ces",
    cu: "chu",
    cv: "chv",
    cy: "cym",
    da: "dan",
    de: "deu",
    dv: "div",
    dz: "dzo",
    ee: "ewe",
    el: "ell",
    en: "eng",
    eo: "epo",
    es: "spa",
    et: "est",
    eu: "eus",
    fa: "fas",
    ff: "ful",
    fi: "fin",
    fj: "fij",
    fo: "fao",
    fr: "fra",
    fy: "fry",
    ga: "gle",
    gd: "gla",
    gl: "glg",
    gn: "grn",
    gu: "guj",
    gv: "glv",
    ha: "hau",
    he: "heb",
    hi: "hin",
    ho: "hmo",
    hr: "hrv",
    ht: "hat",
    hu: "hun",
    hy: "hye",
    hz: "her",
    ia: "ina",
    id: "ind",
    ie: "ile",
    ig: "ibo",
    ii: "iii",
    ik: "ipk",
    io: "ido",
    is: "isl",
    it: "ita",
    iu: "iku",
    ja: "jpn",
    jv: "jav",
    ka: "kat",
    kg: "kon",
    ki: "kik",
    kj: "kua",
    kk: "kaz",
    kl: "kal",
    km: "khm",
    kn: "kan",
    ko: "kor",
    kr: "kau",
    ks: "kas",
    ku: "kur",
    kv: "kom",
    kw: "cor",
    ky: "kir",
    la: "lat",
    lb: "ltz",
    lg: "lug",
    li: "lim",
    ln: "lin",
    lo: "lao",
    lt: "lit",
    lu: "lub",
    lv: "lav",
    mg: "mlg",
    mh: "mah",
    mi: "mri",
    mk: "mkd",
    ml: "mal",
    mn: "mon",
    mr: "mar",
    ms: "msa",
    mt: "mlt",
    my: "mya",
    na: "nau",
    nb: "nob",
    nd: "nde",
    ne: "nep",
    ng: "ndo",
    nl: "nld",
    nn: "nno",
    no: "nor",
    nr: "nbl",
    nv: "nav",
    ny: "nya",
    oc: "oci",
    oj: "oji",
    om: "orm",
    or: "ori",
    os: "oss",
    pa: "pan",
    pi: "pli",
    pl: "pol",
    ps: "pus",
    pt: "por",
    qu: "que",
    rm: "roh",
    rn: "run",
    ro: "ron",
    ru: "rus",
    rw: "kin",
    sa: "san",
    sc: "srd",
    sd: "snd",
    se: "sme",
    sg: "sag",
    si: "sin",
    sk: "slk",
    sl: "slv",
    sm: "smo",
    sn: "sna",
    so: "som",
    sq: "sqi",
    sr: "srp",
    ss: "ssw",
    st: "sot",
    su: "sun",
    sv: "swe",
    sw: "swa",
    ta: "tam",
    te: "tel",
    tg: "tgk",
    th: "tha",
    ti: "tir",
    tk: "tuk",
    tl: "tgl",
    tn: "tsn",
    to: "ton",
    tr: "tur",
    ts: "tso",
    tt: "tat",
    tw: "twi",
    ty: "tah",
    ug: "uig",
    uk: "ukr",
    ur: "urd",
    uz: "uzb",
    ve: "ven",
    vi: "vie",
    vo: "vol",
    wa: "wln",
    wo: "wol",
    xh: "xho",
    yi: "yid",
    yo: "yor",
    za: "zha",
    zh: "zho",
    zu: "zul"
  };
  var ISO_639_1_to_ISO_639_3_default = ISO_MAP_1_TO_3;

  // src/common/utils/languages/ISO_639-2_to_ISO_639-3.ts
  init_define_ENVIRONMENT();
  var ISO_MAP_2_TO_3 = {
    alb: "sqi",
    arm: "hye",
    baq: "eus",
    bur: "mya",
    chi: "zho",
    cze: "ces",
    dut: "nld",
    fre: "fra",
    geo: "kat",
    ger: "deu",
    gre: "ell",
    ice: "isl",
    mac: "mkd",
    mao: "mri",
    may: "msa",
    per: "fas",
    slo: "slk",
    rum: "ron",
    tib: "bod",
    wel: "cym"
  };
  var ISO_639_2_to_ISO_639_3_default = ISO_MAP_2_TO_3;

  // src/common/utils/languages/normalize.ts
  function normalizeLanguage(_language) {
    if (isNullOrUndefined(_language) || _language === "") {
      return "";
    }
    const fields = ("" + _language).toLowerCase().split("-");
    const base = fields[0];
    const normalizedBase = normalizeBase(base);
    if (isNonEmptyString(normalizedBase)) {
      return normalizedBase;
    }
    return _language;
  }
  function normalizeBase(base) {
    let result;
    switch (base.length) {
      case 2:
        result = ISO_639_1_to_ISO_639_3_default[base];
        break;
      case 3:
        result = ISO_639_2_to_ISO_639_3_default[base];
        break;
    }
    return result;
  }
  function normalizeTextTrack(_language) {
    if (!isNullOrUndefined(_language)) {
      let language;
      let closedCaption = false;
      if (typeof _language === "string") {
        language = _language;
      } else {
        language = _language.language;
        if (_language.closedCaption === true) {
          closedCaption = true;
        }
      }
      return {
        language,
        closedCaption,
        normalized: normalizeLanguage(language)
      };
    }
    return _language;
  }
  function normalizeAudioTrack(_language) {
    if (isNullOrUndefined(_language)) {
      return _language;
    }
    if (typeof _language === "string") {
      return {
        language: _language,
        audioDescription: false,
        normalized: normalizeLanguage(_language)
      };
    }
    const normalized = {
      language: _language.language,
      audioDescription: _language.audioDescription === true,
      normalized: normalizeLanguage(normalizeLanguage(_language.language))
    };
    if (_language.isDub === true) {
      normalized.isDub = true;
    }
    return normalized;
  }
  var normalize_default = normalizeLanguage;

  // src/common/utils/languages/index.ts
  var languages_default = normalize_default;

  // src/main/core/api/option_utils.ts
  function parseConstructorOptions(options) {
    let maxBufferAhead;
    let maxBufferBehind;
    let wantedBufferAhead;
    let maxVideoBufferSize;
    let throttleWhenHidden;
    let throttleVideoBitrateWhenHidden;
    let preferredAudioTracks;
    let preferredTextTracks;
    let preferredVideoTracks;
    let videoElement;
    let initialVideoBitrate;
    let initialAudioBitrate;
    let minAudioBitrate;
    let minVideoBitrate;
    let maxAudioBitrate;
    let maxVideoBitrate;
    const {
      DEFAULT_INITIAL_BITRATES,
      DEFAULT_LIMIT_VIDEO_WIDTH,
      DEFAULT_MIN_BITRATES,
      DEFAULT_MAX_BITRATES,
      DEFAULT_MAX_BUFFER_AHEAD,
      DEFAULT_MAX_BUFFER_BEHIND,
      DEFAULT_MAX_VIDEO_BUFFER_SIZE,
      DEFAULT_STOP_AT_END,
      DEFAULT_THROTTLE_WHEN_HIDDEN,
      DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN,
      DEFAULT_WANTED_BUFFER_AHEAD
    } = config_default.getCurrent();
    if (isNullOrUndefined(options.maxBufferAhead)) {
      maxBufferAhead = DEFAULT_MAX_BUFFER_AHEAD;
    } else {
      maxBufferAhead = Number(options.maxBufferAhead);
      if (isNaN(maxBufferAhead)) {
        throw new Error("Invalid maxBufferAhead parameter. Should be a number.");
      }
    }
    if (isNullOrUndefined(options.maxBufferBehind)) {
      maxBufferBehind = DEFAULT_MAX_BUFFER_BEHIND;
    } else {
      maxBufferBehind = Number(options.maxBufferBehind);
      if (isNaN(maxBufferBehind)) {
        throw new Error("Invalid maxBufferBehind parameter. Should be a number.");
      }
    }
    if (isNullOrUndefined(options.wantedBufferAhead)) {
      wantedBufferAhead = DEFAULT_WANTED_BUFFER_AHEAD;
    } else {
      wantedBufferAhead = Number(options.wantedBufferAhead);
      if (isNaN(wantedBufferAhead)) {
        throw new Error("Invalid wantedBufferAhead parameter. Should be a number.");
      }
    }
    if (isNullOrUndefined(options.maxVideoBufferSize)) {
      maxVideoBufferSize = DEFAULT_MAX_VIDEO_BUFFER_SIZE;
    } else {
      maxVideoBufferSize = Number(options.maxVideoBufferSize);
      if (isNaN(maxVideoBufferSize)) {
        throw new Error("Invalid maxVideoBufferSize parameter. Should be a number.");
      }
    }
    const limitVideoWidth = isNullOrUndefined(options.limitVideoWidth) ? DEFAULT_LIMIT_VIDEO_WIDTH : !!options.limitVideoWidth;
    if (!isNullOrUndefined(options.throttleWhenHidden)) {
      warnOnce("`throttleWhenHidden` API is deprecated. Consider using `throttleVideoBitrateWhenHidden` instead.");
      throttleWhenHidden = !!options.throttleWhenHidden;
    } else {
      throttleWhenHidden = DEFAULT_THROTTLE_WHEN_HIDDEN;
    }
    if (throttleWhenHidden) {
      throttleVideoBitrateWhenHidden = false;
    } else {
      throttleVideoBitrateWhenHidden = isNullOrUndefined(options.throttleVideoBitrateWhenHidden) ? DEFAULT_THROTTLE_VIDEO_BITRATE_WHEN_HIDDEN : !!options.throttleVideoBitrateWhenHidden;
    }
    if (options.preferredTextTracks !== void 0) {
      if (!Array.isArray(options.preferredTextTracks)) {
        warnOnce("Invalid `preferredTextTracks` option, it should be an Array");
        preferredTextTracks = [];
      } else {
        preferredTextTracks = options.preferredTextTracks;
      }
    } else {
      preferredTextTracks = [];
    }
    if (options.preferredAudioTracks !== void 0) {
      if (!Array.isArray(options.preferredAudioTracks)) {
        warnOnce("Invalid `preferredAudioTracks` option, it should be an Array");
        preferredAudioTracks = [];
      } else {
        preferredAudioTracks = options.preferredAudioTracks;
      }
    } else {
      preferredAudioTracks = [];
    }
    if (options.preferredVideoTracks !== void 0) {
      if (!Array.isArray(options.preferredVideoTracks)) {
        warnOnce("Invalid `preferredVideoTracks` option, it should be an Array");
        preferredVideoTracks = [];
      } else {
        preferredVideoTracks = options.preferredVideoTracks;
      }
    } else {
      preferredVideoTracks = [];
    }
    if (isNullOrUndefined(options.videoElement)) {
      videoElement = document.createElement("video");
    } else if (options.videoElement instanceof HTMLMediaElement) {
      videoElement = options.videoElement;
    } else {
      throw new Error("Invalid videoElement parameter. Should be a HTMLMediaElement.");
    }
    if (isNullOrUndefined(options.initialVideoBitrate)) {
      initialVideoBitrate = DEFAULT_INITIAL_BITRATES.video;
    } else {
      initialVideoBitrate = Number(options.initialVideoBitrate);
      if (isNaN(initialVideoBitrate)) {
        throw new Error("Invalid initialVideoBitrate parameter. Should be a number.");
      }
    }
    if (isNullOrUndefined(options.initialAudioBitrate)) {
      initialAudioBitrate = DEFAULT_INITIAL_BITRATES.audio;
    } else {
      initialAudioBitrate = Number(options.initialAudioBitrate);
      if (isNaN(initialAudioBitrate)) {
        throw new Error("Invalid initialAudioBitrate parameter. Should be a number.");
      }
    }
    if (isNullOrUndefined(options.minVideoBitrate)) {
      minVideoBitrate = DEFAULT_MIN_BITRATES.video;
    } else {
      minVideoBitrate = Number(options.minVideoBitrate);
      if (isNaN(minVideoBitrate)) {
        throw new Error("Invalid maxVideoBitrate parameter. Should be a number.");
      }
    }
    if (isNullOrUndefined(options.minAudioBitrate)) {
      minAudioBitrate = DEFAULT_MIN_BITRATES.audio;
    } else {
      minAudioBitrate = Number(options.minAudioBitrate);
      if (isNaN(minAudioBitrate)) {
        throw new Error("Invalid minAudioBitrate parameter. Should be a number.");
      }
    }
    if (isNullOrUndefined(options.maxVideoBitrate)) {
      maxVideoBitrate = DEFAULT_MAX_BITRATES.video;
    } else {
      maxVideoBitrate = Number(options.maxVideoBitrate);
      if (isNaN(maxVideoBitrate)) {
        throw new Error("Invalid maxVideoBitrate parameter. Should be a number.");
      } else if (minVideoBitrate > maxVideoBitrate) {
        throw new Error(`Invalid maxVideoBitrate parameter. Its value, "${maxVideoBitrate}", is inferior to the set minVideoBitrate, "${minVideoBitrate}"`);
      }
    }
    if (isNullOrUndefined(options.maxAudioBitrate)) {
      maxAudioBitrate = DEFAULT_MAX_BITRATES.audio;
    } else {
      maxAudioBitrate = Number(options.maxAudioBitrate);
      if (isNaN(maxAudioBitrate)) {
        throw new Error("Invalid maxAudioBitrate parameter. Should be a number.");
      } else if (minAudioBitrate > maxAudioBitrate) {
        throw new Error(`Invalid maxAudioBitrate parameter. Its value, "${maxAudioBitrate}", is inferior to the set minAudioBitrate, "${minAudioBitrate}"`);
      }
    }
    const stopAtEnd = isNullOrUndefined(options.stopAtEnd) ? DEFAULT_STOP_AT_END : !!options.stopAtEnd;
    return {
      maxBufferAhead,
      maxBufferBehind,
      limitVideoWidth,
      videoElement,
      wantedBufferAhead,
      maxVideoBufferSize,
      throttleWhenHidden,
      throttleVideoBitrateWhenHidden,
      preferredAudioTracks,
      preferredTextTracks,
      preferredVideoTracks,
      initialAudioBitrate,
      initialVideoBitrate,
      minAudioBitrate,
      minVideoBitrate,
      maxAudioBitrate,
      maxVideoBitrate,
      stopAtEnd
    };
  }
  function checkReloadOptions(options) {
    if (options === null || typeof options !== "object" && options !== void 0) {
      throw new Error("API: reload - Invalid options format.");
    }
    if (options?.reloadAt === null || typeof options?.reloadAt !== "object" && options?.reloadAt !== void 0) {
      throw new Error("API: reload - Invalid 'reloadAt' option format.");
    }
    if (typeof options?.reloadAt?.position !== "number" && options?.reloadAt?.position !== void 0) {
      throw new Error("API: reload - Invalid 'reloadAt.position' option format.");
    }
    if (typeof options?.reloadAt?.relative !== "number" && options?.reloadAt?.relative !== void 0) {
      throw new Error("API: reload - Invalid 'reloadAt.relative' option format.");
    }
  }
  function parseLoadVideoOptions(options) {
    let url;
    let transport;
    let keySystems;
    let textTrackMode;
    let textTrackElement;
    let startAt;
    const {
      DEFAULT_AUDIO_TRACK_SWITCHING_MODE,
      DEFAULT_AUTO_PLAY,
      DEFAULT_CODEC_SWITCHING_BEHAVIOR,
      DEFAULT_ENABLE_FAST_SWITCHING,
      DEFAULT_MANUAL_BITRATE_SWITCHING_MODE,
      DEFAULT_SHOW_NATIVE_SUBTITLE,
      DEFAULT_TEXT_TRACK_MODE
    } = config_default.getCurrent();
    if (isNullOrUndefined(options)) {
      throw new Error("No option set on loadVideo");
    }
    if (!isNullOrUndefined(options.url)) {
      url = String(options.url);
    } else if (isNullOrUndefined(options.transportOptions?.initialManifest) && isNullOrUndefined(options.transportOptions?.manifestLoader)) {
      throw new Error("Unable to load a content: no url set on loadVideo.\nPlease provide at least either an `url` argument, a `transportOptions.initialManifest` option or a `transportOptions.manifestLoader` option so the RxPlayer can load the content.");
    }
    if (isNullOrUndefined(options.transport)) {
      throw new Error("No transport set on loadVideo");
    } else {
      transport = String(options.transport);
    }
    const autoPlay2 = isNullOrUndefined(options.autoPlay) ? DEFAULT_AUTO_PLAY : !!options.autoPlay;
    if (isNullOrUndefined(options.keySystems)) {
      keySystems = [];
    } else {
      keySystems = Array.isArray(options.keySystems) ? options.keySystems : [options.keySystems];
      for (const keySystem of keySystems) {
        if (typeof keySystem.type !== "string" || typeof keySystem.getLicense !== "function") {
          throw new Error("Invalid key system given: Missing type string or getLicense callback");
        }
      }
    }
    const lowLatencyMode = options.lowLatencyMode === void 0 ? false : !!options.lowLatencyMode;
    const transportOptsArg = typeof options.transportOptions === "object" && options.transportOptions !== null ? options.transportOptions : {};
    const initialManifest = options.transportOptions?.initialManifest;
    const minimumManifestUpdateInterval = options.transportOptions?.minimumManifestUpdateInterval ?? 0;
    let audioTrackSwitchingMode = isNullOrUndefined(options.audioTrackSwitchingMode) ? DEFAULT_AUDIO_TRACK_SWITCHING_MODE : options.audioTrackSwitchingMode;
    if (!arrayIncludes(["seamless", "direct", "reload"], audioTrackSwitchingMode)) {
      log_default.warn("The `audioTrackSwitchingMode` loadVideo option must match one of the following strategy name:\n- `seamless`\n- `direct`\n- `reload`\nIf badly set, " + DEFAULT_AUDIO_TRACK_SWITCHING_MODE + " strategy will be used as default");
      audioTrackSwitchingMode = DEFAULT_AUDIO_TRACK_SWITCHING_MODE;
    }
    let onCodecSwitch = isNullOrUndefined(options.onCodecSwitch) ? DEFAULT_CODEC_SWITCHING_BEHAVIOR : options.onCodecSwitch;
    if (!arrayIncludes(["continue", "reload"], onCodecSwitch)) {
      log_default.warn("The `onCodecSwitch` loadVideo option must match one of the following string:\n- `continue`\n- `reload`\nIf badly set, " + DEFAULT_CODEC_SWITCHING_BEHAVIOR + " will be used as default");
      onCodecSwitch = DEFAULT_CODEC_SWITCHING_BEHAVIOR;
    }
    const transportOptions = object_assign_default({}, transportOptsArg, {
      lowLatencyMode
    });
    delete transportOptions.initialManifest;
    delete transportOptions.minimumManifestUpdateInterval;
    if (isNullOrUndefined(options.textTrackMode)) {
      textTrackMode = DEFAULT_TEXT_TRACK_MODE;
    } else {
      if (options.textTrackMode !== "native" && options.textTrackMode !== "html") {
        throw new Error("Invalid textTrackMode.");
      }
      textTrackMode = options.textTrackMode;
    }
    if (!isNullOrUndefined(options.defaultAudioTrack)) {
      warnOnce("The `defaultAudioTrack` loadVideo option is deprecated.\nPlease use the `preferredAudioTracks` constructor option or the`setPreferredAudioTracks` method instead");
    }
    const defaultAudioTrack = normalizeAudioTrack(options.defaultAudioTrack);
    if (!isNullOrUndefined(options.defaultTextTrack)) {
      warnOnce("The `defaultTextTrack` loadVideo option is deprecated.\nPlease use the `preferredTextTracks` constructor option or the`setPreferredTextTracks` method instead");
    }
    const defaultTextTrack = normalizeTextTrack(options.defaultTextTrack);
    let hideNativeSubtitle = !DEFAULT_SHOW_NATIVE_SUBTITLE;
    if (!isNullOrUndefined(options.hideNativeSubtitle)) {
      warnOnce("The `hideNativeSubtitle` loadVideo option is deprecated");
      hideNativeSubtitle = !!options.hideNativeSubtitle;
    }
    const manualBitrateSwitchingMode = options.manualBitrateSwitchingMode ?? DEFAULT_MANUAL_BITRATE_SWITCHING_MODE;
    const enableFastSwitching = isNullOrUndefined(options.enableFastSwitching) ? DEFAULT_ENABLE_FAST_SWITCHING : options.enableFastSwitching;
    if (textTrackMode === "html") {
      if (isNullOrUndefined(options.textTrackElement)) {
        throw new Error('You have to provide a textTrackElement in "html" textTrackMode.');
      } else if (!(options.textTrackElement instanceof HTMLElement)) {
        throw new Error("textTrackElement should be an HTMLElement.");
      } else {
        textTrackElement = options.textTrackElement;
      }
    } else if (!isNullOrUndefined(options.textTrackElement)) {
      log_default.warn('API: You have set a textTrackElement without being in an "html" textTrackMode. It will be ignored.');
    }
    if (!isNullOrUndefined(options.startAt)) {
      if (options.startAt.wallClockTime instanceof Date) {
        const wallClockTime = options.startAt.wallClockTime.getTime() / 1e3;
        startAt = object_assign_default(
          {},
          options.startAt,
          { wallClockTime }
        );
      } else {
        startAt = options.startAt;
      }
    }
    const networkConfig = isNullOrUndefined(options.networkConfig) ? {} : {
      manifestRetry: options.networkConfig.manifestRetry,
      offlineRetry: options.networkConfig.offlineRetry,
      segmentRetry: options.networkConfig.segmentRetry
    };
    return {
      autoPlay: autoPlay2,
      defaultAudioTrack,
      defaultTextTrack,
      enableFastSwitching,
      hideNativeSubtitle,
      keySystems,
      initialManifest,
      lowLatencyMode,
      manualBitrateSwitchingMode,
      audioTrackSwitchingMode,
      minimumManifestUpdateInterval,
      networkConfig,
      onCodecSwitch,
      startAt,
      textTrackElement,
      textTrackMode,
      transport,
      transportOptions,
      url
    };
  }

  // src/main/core/api/track_choice_manager.ts
  init_define_ENVIRONMENT();

  // src/common/utils/object_values.ts
  init_define_ENVIRONMENT();
  function objectValues(o) {
    return Object.keys(o).map((k) => o[k]);
  }

  // src/common/utils/sorted_list.ts
  init_define_ENVIRONMENT();
  var SortedList = class {
    _sortingFn;
    _array;
    constructor(sortingFunction) {
      this._array = [];
      this._sortingFn = sortingFunction;
    }
    add(...elements) {
      elements.sort(this._sortingFn);
      let j = 0;
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        let inserted = false;
        while (!inserted && j < this._array.length) {
          if (this._sortingFn(element, this._array[j]) < 0) {
            this._array.splice(j, 0, element);
            inserted = true;
          } else {
            j++;
          }
        }
        if (!inserted) {
          this._array.push(element);
        }
      }
    }
    length() {
      return this._array.length;
    }
    get(index) {
      if (index < 0 || index >= this._array.length) {
        throw new Error("Invalid index.");
      }
      return this._array[index];
    }
    findFirst(fn) {
      return arrayFind(this._array, fn);
    }
    has(element) {
      return arrayIncludes(this._array, element);
    }
    removeElement(element) {
      const indexOf = this._array.indexOf(element);
      if (indexOf >= 0) {
        this._array.splice(indexOf, 1);
        return indexOf;
      }
      return void 0;
    }
    head() {
      return this._array[0];
    }
    last() {
      return this._array[this._array.length - 1];
    }
    shift() {
      return this._array.shift();
    }
    pop() {
      return this._array.pop();
    }
  };

  // src/common/utils/take_first_set.ts
  init_define_ENVIRONMENT();
  function takeFirstSet(...args) {
    let i = 0;
    const len = args.length;
    while (i < len) {
      const arg = args[i];
      if (!isNullOrUndefined(arg)) {
        return arg;
      }
      i++;
    }
    return void 0;
  }

  // src/main/core/api/track_choice_manager.ts
  function normalizeAudioTracks(tracks) {
    return tracks.map((t) => t === null ? t : {
      normalized: t.language === void 0 ? void 0 : languages_default(t.language),
      audioDescription: t.audioDescription,
      codec: t.codec
    });
  }
  function normalizeTextTracks(tracks) {
    return tracks.map((t) => t === null ? t : {
      normalized: languages_default(t.language),
      closedCaption: t.closedCaption
    });
  }
  var TrackChoiceManager = class {
    _periods;
    _preferredAudioTracks;
    _preferredTextTracks;
    _preferredVideoTracks;
    _audioChoiceMemory;
    _textChoiceMemory;
    _videoChoiceMemory;
    trickModeTrackEnabled;
    constructor(args) {
      this._periods = new SortedList((a, b) => a.period.start - b.period.start);
      this._audioChoiceMemory = /* @__PURE__ */ new WeakMap();
      this._textChoiceMemory = /* @__PURE__ */ new WeakMap();
      this._videoChoiceMemory = /* @__PURE__ */ new WeakMap();
      this._preferredAudioTracks = [];
      this._preferredTextTracks = [];
      this._preferredVideoTracks = [];
      this.trickModeTrackEnabled = args.preferTrickModeTracks;
    }
    setPreferredAudioTracks(preferredAudioTracks, shouldApply) {
      this._preferredAudioTracks = preferredAudioTracks;
      if (shouldApply) {
        this._applyAudioPreferences();
      }
    }
    setPreferredTextTracks(preferredTextTracks, shouldApply) {
      this._preferredTextTracks = preferredTextTracks;
      if (shouldApply) {
        this._applyTextPreferences();
      }
    }
    setPreferredVideoTracks(preferredVideoTracks, shouldApply) {
      this._preferredVideoTracks = preferredVideoTracks;
      if (shouldApply) {
        this._applyVideoPreferences();
      }
    }
    addPeriod(bufferType, period, adaptation$) {
      const periodItem = getPeriodItem(this._periods, period);
      const adaptations = getSupportedAdaptations(period, bufferType);
      if (periodItem !== void 0) {
        if (periodItem[bufferType] !== void 0) {
          log_default.warn(
            `TrackChoiceManager: ${bufferType} already added for period`,
            period.start
          );
          return;
        } else {
          periodItem[bufferType] = { adaptations, adaptation$ };
        }
      } else {
        this._periods.add({
          period,
          [bufferType]: { adaptations, adaptation$ }
        });
      }
    }
    removePeriod(bufferType, period) {
      const periodIndex = findPeriodIndex(this._periods, period);
      if (periodIndex === void 0) {
        log_default.warn(
          `TrackChoiceManager: ${bufferType} not found for period`,
          period.start
        );
        return;
      }
      const periodItem = this._periods.get(periodIndex);
      if (periodItem[bufferType] === void 0) {
        log_default.warn(
          `TrackChoiceManager: ${bufferType} already removed for period`,
          period.start
        );
        return;
      }
      delete periodItem[bufferType];
      if (periodItem.audio === void 0 && periodItem.text === void 0 && periodItem.video === void 0) {
        this._periods.removeElement(periodItem);
      }
    }
    resetPeriods() {
      while (this._periods.length() > 0) {
        this._periods.pop();
      }
    }
    update() {
      this._resetChosenAudioTracks();
      this._resetChosenTextTracks();
      this._resetChosenVideoTracks();
    }
    setInitialAudioTrack(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const audioInfos = periodItem !== void 0 ? periodItem.audio : null;
      if (isNullOrUndefined(audioInfos) || periodItem === void 0) {
        throw new Error("TrackChoiceManager: Given Period not found.");
      }
      const audioAdaptations = getSupportedAdaptations(period, "audio");
      const chosenAudioAdaptation = this._audioChoiceMemory.get(period);
      if (chosenAudioAdaptation === null) {
        audioInfos.adaptation$.next(null);
      } else if (chosenAudioAdaptation === void 0 || !arrayIncludes(audioAdaptations, chosenAudioAdaptation)) {
        const preferredAudioTracks = this._preferredAudioTracks;
        const normalizedPref = normalizeAudioTracks(preferredAudioTracks);
        const optimalAdaptation = findFirstOptimalAudioAdaptation(
          audioAdaptations,
          normalizedPref
        );
        this._audioChoiceMemory.set(period, optimalAdaptation);
        audioInfos.adaptation$.next(optimalAdaptation);
      } else {
        audioInfos.adaptation$.next(chosenAudioAdaptation);
      }
    }
    setInitialTextTrack(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const textInfos = periodItem !== void 0 ? periodItem.text : null;
      if (isNullOrUndefined(textInfos) || periodItem === void 0) {
        throw new Error("TrackChoiceManager: Given Period not found.");
      }
      const textAdaptations = getSupportedAdaptations(period, "text");
      const chosenTextAdaptation = this._textChoiceMemory.get(period);
      if (chosenTextAdaptation === null) {
        textInfos.adaptation$.next(null);
      } else if (chosenTextAdaptation === void 0 || !arrayIncludes(textAdaptations, chosenTextAdaptation)) {
        const preferredTextTracks = this._preferredTextTracks;
        const normalizedPref = normalizeTextTracks(preferredTextTracks);
        const optimalAdaptation = findFirstOptimalTextAdaptation(
          textAdaptations,
          normalizedPref
        );
        this._textChoiceMemory.set(period, optimalAdaptation);
        textInfos.adaptation$.next(optimalAdaptation);
      } else {
        textInfos.adaptation$.next(chosenTextAdaptation);
      }
    }
    setInitialVideoTrack(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const videoInfos = periodItem !== void 0 ? periodItem.video : null;
      if (isNullOrUndefined(videoInfos) || periodItem === void 0) {
        throw new Error("TrackChoiceManager: Given Period not found.");
      }
      const videoAdaptations = getSupportedAdaptations(period, "video");
      const prevVideoAdaptation = this._videoChoiceMemory.get(period);
      let newBaseAdaptation;
      if (prevVideoAdaptation === null) {
        newBaseAdaptation = null;
      } else if (prevVideoAdaptation !== void 0 && arrayIncludes(videoAdaptations, prevVideoAdaptation.baseAdaptation)) {
        newBaseAdaptation = prevVideoAdaptation.baseAdaptation;
      } else {
        const preferredVideoTracks = this._preferredVideoTracks;
        newBaseAdaptation = findFirstOptimalVideoAdaptation(
          videoAdaptations,
          preferredVideoTracks
        );
      }
      if (newBaseAdaptation === null) {
        this._videoChoiceMemory.set(period, null);
        videoInfos.adaptation$.next(null);
        return;
      }
      const newVideoAdaptation = getRightVideoTrack(
        newBaseAdaptation,
        this.trickModeTrackEnabled
      );
      this._videoChoiceMemory.set(period, {
        baseAdaptation: newBaseAdaptation,
        adaptation: newVideoAdaptation
      });
      videoInfos.adaptation$.next(newVideoAdaptation);
    }
    setAudioTrackByID(period, wantedId) {
      const periodItem = getPeriodItem(this._periods, period);
      const audioInfos = periodItem !== void 0 ? periodItem.audio : null;
      if (isNullOrUndefined(audioInfos)) {
        throw new Error("TrackChoiceManager: Given Period not found.");
      }
      const wantedAdaptation = arrayFind(
        audioInfos.adaptations,
        ({ id }) => id === wantedId
      );
      if (wantedAdaptation === void 0) {
        throw new Error("Audio Track not found.");
      }
      const chosenAudioAdaptation = this._audioChoiceMemory.get(period);
      if (chosenAudioAdaptation === wantedAdaptation) {
        return;
      }
      this._audioChoiceMemory.set(period, wantedAdaptation);
      audioInfos.adaptation$.next(wantedAdaptation);
    }
    setTextTrackByID(period, wantedId) {
      const periodItem = getPeriodItem(this._periods, period);
      const textInfos = periodItem !== void 0 ? periodItem.text : null;
      if (isNullOrUndefined(textInfos)) {
        throw new Error("TrackChoiceManager: Given Period not found.");
      }
      const wantedAdaptation = arrayFind(
        textInfos.adaptations,
        ({ id }) => id === wantedId
      );
      if (wantedAdaptation === void 0) {
        throw new Error("Text Track not found.");
      }
      const chosenTextAdaptation = this._textChoiceMemory.get(period);
      if (chosenTextAdaptation === wantedAdaptation) {
        return;
      }
      this._textChoiceMemory.set(period, wantedAdaptation);
      textInfos.adaptation$.next(wantedAdaptation);
    }
    setVideoTrackByID(period, wantedId) {
      const periodItem = getPeriodItem(this._periods, period);
      const videoInfos = periodItem !== void 0 ? periodItem.video : null;
      if (isNullOrUndefined(videoInfos)) {
        throw new Error("LanguageManager: Given Period not found.");
      }
      const wantedBaseAdaptation = arrayFind(
        videoInfos.adaptations,
        ({ id }) => id === wantedId
      );
      if (wantedBaseAdaptation === void 0) {
        throw new Error("Video Track not found.");
      }
      const newVideoAdaptation = getRightVideoTrack(
        wantedBaseAdaptation,
        this.trickModeTrackEnabled
      );
      this._videoChoiceMemory.set(period, {
        baseAdaptation: wantedBaseAdaptation,
        adaptation: newVideoAdaptation
      });
      videoInfos.adaptation$.next(newVideoAdaptation);
    }
    disableTextTrack(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const textInfos = periodItem !== void 0 ? periodItem.text : null;
      if (isNullOrUndefined(textInfos)) {
        throw new Error("TrackChoiceManager: Given Period not found.");
      }
      const chosenTextAdaptation = this._textChoiceMemory.get(period);
      if (chosenTextAdaptation === null) {
        return;
      }
      this._textChoiceMemory.set(period, null);
      textInfos.adaptation$.next(null);
    }
    disableVideoTrack(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const videoInfos = periodItem?.video;
      if (videoInfos === void 0) {
        throw new Error("TrackManager: Given Period not found.");
      }
      const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
      if (chosenVideoAdaptation === null) {
        return;
      }
      this._videoChoiceMemory.set(period, null);
      videoInfos.adaptation$.next(null);
    }
    disableVideoTrickModeTracks() {
      this.trickModeTrackEnabled = false;
      this._resetChosenVideoTracks();
    }
    enableVideoTrickModeTracks() {
      this.trickModeTrackEnabled = true;
      this._resetChosenVideoTracks();
    }
    isTrickModeEnabled() {
      return this.trickModeTrackEnabled;
    }
    getChosenAudioTrack(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const audioInfos = periodItem !== void 0 ? periodItem.audio : null;
      if (isNullOrUndefined(audioInfos)) {
        return null;
      }
      const chosenTrack = this._audioChoiceMemory.get(period);
      if (isNullOrUndefined(chosenTrack)) {
        return null;
      }
      const audioTrack = {
        language: takeFirstSet(chosenTrack.language, ""),
        normalized: takeFirstSet(chosenTrack.normalizedLanguage, ""),
        audioDescription: chosenTrack.isAudioDescription === true,
        id: chosenTrack.id,
        representations: chosenTrack.representations.map(parseAudioRepresentation),
        label: chosenTrack.label
      };
      if (chosenTrack.isDub === true) {
        audioTrack.dub = true;
      }
      return audioTrack;
    }
    getChosenTextTrack(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const textInfos = periodItem !== void 0 ? periodItem.text : null;
      if (isNullOrUndefined(textInfos)) {
        return null;
      }
      const chosenTextAdaptation = this._textChoiceMemory.get(period);
      if (isNullOrUndefined(chosenTextAdaptation)) {
        return null;
      }
      return {
        language: takeFirstSet(chosenTextAdaptation.language, ""),
        normalized: takeFirstSet(chosenTextAdaptation.normalizedLanguage, ""),
        closedCaption: chosenTextAdaptation.isClosedCaption === true,
        id: chosenTextAdaptation.id,
        label: chosenTextAdaptation.label
      };
    }
    getChosenVideoTrack(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const videoInfos = periodItem !== void 0 ? periodItem.video : null;
      if (isNullOrUndefined(videoInfos)) {
        return null;
      }
      const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
      if (isNullOrUndefined(chosenVideoAdaptation)) {
        return null;
      }
      const currAdaptation = chosenVideoAdaptation.adaptation;
      const trickModeTracks = currAdaptation.trickModeTracks !== void 0 ? currAdaptation.trickModeTracks.map((trickModeAdaptation) => {
        const representations = trickModeAdaptation.representations.map(parseVideoRepresentation);
        const trickMode = {
          id: trickModeAdaptation.id,
          representations,
          isTrickModeTrack: true
        };
        if (trickModeAdaptation.isSignInterpreted === true) {
          trickMode.signInterpreted = true;
        }
        return trickMode;
      }) : void 0;
      const videoTrack = {
        id: currAdaptation.id,
        representations: currAdaptation.representations.map(parseVideoRepresentation),
        label: currAdaptation.label
      };
      if (currAdaptation.isSignInterpreted === true) {
        videoTrack.signInterpreted = true;
      }
      if (currAdaptation.isTrickModeTrack === true) {
        videoTrack.isTrickModeTrack = true;
      }
      if (trickModeTracks !== void 0) {
        videoTrack.trickModeTracks = trickModeTracks;
      }
      return videoTrack;
    }
    getAvailableAudioTracks(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const audioInfos = periodItem !== void 0 ? periodItem.audio : null;
      if (isNullOrUndefined(audioInfos)) {
        return [];
      }
      const chosenAudioAdaptation = this._audioChoiceMemory.get(period);
      const currentId = !isNullOrUndefined(chosenAudioAdaptation) ? chosenAudioAdaptation.id : null;
      return audioInfos.adaptations.map((adaptation) => {
        const formatted = {
          language: takeFirstSet(adaptation.language, ""),
          normalized: takeFirstSet(adaptation.normalizedLanguage, ""),
          audioDescription: adaptation.isAudioDescription === true,
          id: adaptation.id,
          active: currentId === null ? false : currentId === adaptation.id,
          representations: adaptation.representations.map(parseAudioRepresentation),
          label: adaptation.label
        };
        if (adaptation.isDub === true) {
          formatted.dub = true;
        }
        return formatted;
      });
    }
    getAvailableTextTracks(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const textInfos = periodItem !== void 0 ? periodItem.text : null;
      if (isNullOrUndefined(textInfos)) {
        return [];
      }
      const chosenTextAdaptation = this._textChoiceMemory.get(period);
      const currentId = !isNullOrUndefined(chosenTextAdaptation) ? chosenTextAdaptation.id : null;
      return textInfos.adaptations.map((adaptation) => ({
        language: takeFirstSet(adaptation.language, ""),
        normalized: takeFirstSet(adaptation.normalizedLanguage, ""),
        closedCaption: adaptation.isClosedCaption === true,
        id: adaptation.id,
        active: currentId === null ? false : currentId === adaptation.id,
        label: adaptation.label
      }));
    }
    getAvailableVideoTracks(period) {
      const periodItem = getPeriodItem(this._periods, period);
      const videoInfos = periodItem !== void 0 ? periodItem.video : null;
      if (isNullOrUndefined(videoInfos)) {
        return [];
      }
      const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
      const currentId = chosenVideoAdaptation === void 0 ? void 0 : chosenVideoAdaptation?.adaptation.id ?? void 0;
      return videoInfos.adaptations.map((adaptation) => {
        const trickModeTracks = adaptation.trickModeTracks !== void 0 ? adaptation.trickModeTracks.map((trickModeAdaptation) => {
          const isActive = currentId === null ? false : currentId === trickModeAdaptation.id;
          const representations = trickModeAdaptation.representations.map(parseVideoRepresentation);
          const trickMode = {
            id: trickModeAdaptation.id,
            representations,
            isTrickModeTrack: true,
            active: isActive
          };
          if (trickModeAdaptation.isSignInterpreted === true) {
            trickMode.signInterpreted = true;
          }
          return trickMode;
        }) : void 0;
        const formatted = {
          id: adaptation.id,
          active: currentId === null ? false : currentId === adaptation.id,
          representations: adaptation.representations.map(parseVideoRepresentation),
          label: adaptation.label
        };
        if (adaptation.isSignInterpreted === true) {
          formatted.signInterpreted = true;
        }
        if (trickModeTracks !== void 0) {
          formatted.trickModeTracks = trickModeTracks;
        }
        return formatted;
      });
    }
    _applyAudioPreferences() {
      this._audioChoiceMemory = /* @__PURE__ */ new WeakMap();
      this._resetChosenAudioTracks();
    }
    _applyTextPreferences() {
      this._textChoiceMemory = /* @__PURE__ */ new WeakMap();
      this._resetChosenTextTracks();
    }
    _applyVideoPreferences() {
      this._videoChoiceMemory = /* @__PURE__ */ new WeakMap();
      this._resetChosenVideoTracks();
    }
    _resetChosenAudioTracks() {
      const preferredAudioTracks = this._preferredAudioTracks;
      const normalizedPref = normalizeAudioTracks(preferredAudioTracks);
      const recursiveUpdateAudioTrack = (index) => {
        if (index >= this._periods.length()) {
          return;
        }
        const periodItem = this._periods.get(index);
        if (isNullOrUndefined(periodItem.audio)) {
          recursiveUpdateAudioTrack(index + 1);
          return;
        }
        const {
          period,
          audio: audioItem
        } = periodItem;
        const audioAdaptations = getSupportedAdaptations(period, "audio");
        const chosenAudioAdaptation = this._audioChoiceMemory.get(period);
        if (chosenAudioAdaptation === null || chosenAudioAdaptation !== void 0 && arrayIncludes(audioAdaptations, chosenAudioAdaptation)) {
          recursiveUpdateAudioTrack(index + 1);
          return;
        }
        const optimalAdaptation = findFirstOptimalAudioAdaptation(
          audioAdaptations,
          normalizedPref
        );
        this._audioChoiceMemory.set(period, optimalAdaptation);
        audioItem.adaptation$.next(optimalAdaptation);
        recursiveUpdateAudioTrack(0);
      };
      recursiveUpdateAudioTrack(0);
    }
    _resetChosenTextTracks() {
      const preferredTextTracks = this._preferredTextTracks;
      const normalizedPref = normalizeTextTracks(preferredTextTracks);
      const recursiveUpdateTextTrack = (index) => {
        if (index >= this._periods.length()) {
          return;
        }
        const periodItem = this._periods.get(index);
        if (isNullOrUndefined(periodItem.text)) {
          recursiveUpdateTextTrack(index + 1);
          return;
        }
        const {
          period,
          text: textItem
        } = periodItem;
        const textAdaptations = getSupportedAdaptations(period, "text");
        const chosenTextAdaptation = this._textChoiceMemory.get(period);
        if (chosenTextAdaptation === null || chosenTextAdaptation !== void 0 && arrayIncludes(textAdaptations, chosenTextAdaptation)) {
          recursiveUpdateTextTrack(index + 1);
          return;
        }
        const optimalAdaptation = findFirstOptimalTextAdaptation(
          textAdaptations,
          normalizedPref
        );
        this._textChoiceMemory.set(period, optimalAdaptation);
        textItem.adaptation$.next(optimalAdaptation);
        recursiveUpdateTextTrack(0);
      };
      recursiveUpdateTextTrack(0);
    }
    _resetChosenVideoTracks() {
      const preferredVideoTracks = this._preferredVideoTracks;
      const recursiveUpdateVideoTrack = (index) => {
        if (index >= this._periods.length()) {
          return;
        }
        const periodItem = this._periods.get(index);
        if (isNullOrUndefined(periodItem.video)) {
          recursiveUpdateVideoTrack(index + 1);
          return;
        }
        const { period, video: videoItem } = periodItem;
        const videoAdaptations = getSupportedAdaptations(period, "video");
        const chosenVideoAdaptation = this._videoChoiceMemory.get(period);
        if (chosenVideoAdaptation === null) {
          recursiveUpdateVideoTrack(index + 1);
          return;
        } else if (chosenVideoAdaptation !== void 0 && arrayIncludes(
          videoAdaptations,
          chosenVideoAdaptation.baseAdaptation
        )) {
          const wantedVideoAdaptation = getRightVideoTrack(
            chosenVideoAdaptation.baseAdaptation,
            this.trickModeTrackEnabled
          );
          if (wantedVideoAdaptation.id === chosenVideoAdaptation.adaptation.id) {
            recursiveUpdateVideoTrack(index + 1);
            return;
          } else {
            this._videoChoiceMemory.set(period, {
              baseAdaptation: chosenVideoAdaptation.baseAdaptation,
              adaptation: wantedVideoAdaptation
            });
            videoItem.adaptation$.next(wantedVideoAdaptation);
            return recursiveUpdateVideoTrack(0);
          }
        }
        const optimalAdaptation = findFirstOptimalVideoAdaptation(
          videoAdaptations,
          preferredVideoTracks
        );
        if (optimalAdaptation === null) {
          this._videoChoiceMemory.set(period, null);
          videoItem.adaptation$.next(null);
          return recursiveUpdateVideoTrack(0);
        }
        const newVideoAdaptation = getRightVideoTrack(
          optimalAdaptation,
          this.trickModeTrackEnabled
        );
        this._videoChoiceMemory.set(period, {
          baseAdaptation: optimalAdaptation,
          adaptation: newVideoAdaptation
        });
        videoItem.adaptation$.next(newVideoAdaptation);
        return recursiveUpdateVideoTrack(0);
      };
      recursiveUpdateVideoTrack(0);
    }
  };
  function createAudioPreferenceMatcher(preferredAudioTrack) {
    return function matchAudioPreference(audioAdaptation) {
      if (preferredAudioTrack.normalized !== void 0) {
        const language = audioAdaptation.normalizedLanguage ?? "";
        if (language !== preferredAudioTrack.normalized) {
          return false;
        }
      }
      if (preferredAudioTrack.audioDescription !== void 0) {
        if (preferredAudioTrack.audioDescription) {
          if (audioAdaptation.isAudioDescription !== true) {
            return false;
          }
        } else if (audioAdaptation.isAudioDescription === true) {
          return false;
        }
      }
      if (preferredAudioTrack.codec === void 0) {
        return true;
      }
      const regxp = preferredAudioTrack.codec.test;
      const codecTestingFn = (rep) => rep.codec !== void 0 && regxp.test(rep.codec);
      if (preferredAudioTrack.codec.all) {
        return audioAdaptation.representations.every(codecTestingFn);
      }
      return audioAdaptation.representations.some(codecTestingFn);
    };
  }
  function findFirstOptimalAudioAdaptation(audioAdaptations, preferredAudioTracks) {
    if (audioAdaptations.length === 0) {
      return null;
    }
    for (let i = 0; i < preferredAudioTracks.length; i++) {
      const preferredAudioTrack = preferredAudioTracks[i];
      if (preferredAudioTrack === null) {
        return null;
      }
      const matchPreferredAudio = createAudioPreferenceMatcher(preferredAudioTrack);
      const foundAdaptation = arrayFind(audioAdaptations, matchPreferredAudio);
      if (foundAdaptation !== void 0) {
        return foundAdaptation;
      }
    }
    return audioAdaptations[0];
  }
  function createTextPreferenceMatcher(preferredTextTrack) {
    return function matchTextPreference(textAdaptation) {
      return takeFirstSet(
        textAdaptation.normalizedLanguage,
        ""
      ) === preferredTextTrack.normalized && (preferredTextTrack.closedCaption ? textAdaptation.isClosedCaption === true : textAdaptation.isClosedCaption !== true);
    };
  }
  function findFirstOptimalTextAdaptation(textAdaptations, preferredTextTracks) {
    if (textAdaptations.length === 0) {
      return null;
    }
    for (let i = 0; i < preferredTextTracks.length; i++) {
      const preferredTextTrack = preferredTextTracks[i];
      if (preferredTextTrack === null) {
        return null;
      }
      const matchPreferredText = createTextPreferenceMatcher(preferredTextTrack);
      const foundAdaptation = arrayFind(textAdaptations, matchPreferredText);
      if (foundAdaptation !== void 0) {
        return foundAdaptation;
      }
    }
    return null;
  }
  function createVideoPreferenceMatcher(preferredVideoTrack) {
    return function matchVideoPreference(videoAdaptation) {
      if (preferredVideoTrack.signInterpreted !== void 0 && preferredVideoTrack.signInterpreted !== videoAdaptation.isSignInterpreted) {
        return false;
      }
      if (preferredVideoTrack.codec === void 0) {
        return true;
      }
      const regxp = preferredVideoTrack.codec.test;
      const codecTestingFn = (rep) => rep.codec !== void 0 && regxp.test(rep.codec);
      if (preferredVideoTrack.codec.all) {
        return videoAdaptation.representations.every(codecTestingFn);
      }
      return videoAdaptation.representations.some(codecTestingFn);
    };
  }
  function findFirstOptimalVideoAdaptation(videoAdaptations, preferredVideoTracks) {
    if (videoAdaptations.length === 0) {
      return null;
    }
    for (let i = 0; i < preferredVideoTracks.length; i++) {
      const preferredVideoTrack = preferredVideoTracks[i];
      if (preferredVideoTrack === null) {
        return null;
      }
      const matchPreferredVideo = createVideoPreferenceMatcher(preferredVideoTrack);
      const foundAdaptation = arrayFind(videoAdaptations, matchPreferredVideo);
      if (foundAdaptation !== void 0) {
        return foundAdaptation;
      }
    }
    return videoAdaptations[0];
  }
  function findPeriodIndex(periods, period) {
    for (let i = 0; i < periods.length(); i++) {
      const periodI = periods.get(i);
      if (periodI.period.id === period.id) {
        return i;
      }
    }
  }
  function getPeriodItem(periods, period) {
    for (let i = 0; i < periods.length(); i++) {
      const periodI = periods.get(i);
      if (periodI.period.id === period.id) {
        return periodI;
      }
    }
  }
  function parseVideoRepresentation({ id, bitrate, frameRate, width, height, codec, hdrInfo }) {
    return { id, bitrate, frameRate, width, height, codec, hdrInfo };
  }
  function parseAudioRepresentation({ id, bitrate, codec }) {
    return { id, bitrate, codec };
  }
  function getRightVideoTrack(adaptation, isTrickModeEnabled) {
    if (isTrickModeEnabled && adaptation.trickModeTracks?.[0] !== void 0) {
      return adaptation.trickModeTracks[0];
    }
    return adaptation;
  }
  function getSupportedAdaptations(period, type) {
    if (type === void 0) {
      return getAdaptations(period).filter((ada) => {
        return ada.isSupported;
      });
    }
    const adaptationsForType = period.adaptations[type];
    if (adaptationsForType === void 0) {
      return [];
    }
    return adaptationsForType.filter((ada) => {
      return ada.isSupported;
    });
  }
  function getAdaptations(period) {
    const adaptationsByType = period.adaptations;
    return objectValues(adaptationsByType).reduce(
      (acc, adaptations) => adaptations != null ? acc.concat(adaptations) : acc,
      []
    );
  }

  // src/main/core/api/public_api.ts
  var {
    getPageActivityRef: getPageActivityRef2,
    getPictureOnPictureStateRef: getPictureOnPictureStateRef2,
    getVideoVisibilityRef: getVideoVisibilityRef2,
    getVideoWidthRef: getVideoWidthRef2,
    onFullscreenChange$: onFullscreenChange$2,
    onTextTrackChanges$: onTextTrackChanges$2
  } = event_listeners_exports;
  var Player = class extends EventEmitter {
    version;
    videoElement;
    log;
    state;
    _priv_worker;
    _priv_destroy$;
    _priv_contentLock;
    _priv_speed;
    _priv_bufferOptions;
    _priv_bitrateInfos;
    _priv_currentError;
    _priv_contentInfos;
    _priv_preferredAudioTracks;
    _priv_preferredTextTracks;
    _priv_preferredVideoTracks;
    _priv_preferTrickModeTracks;
    _priv_trackChoiceManager;
    _priv_mediaElementTrackChoiceManager;
    _priv_pictureInPictureRef;
    _priv_limitVideoWidth;
    _priv_throttleWhenHidden;
    _priv_throttleVideoBitrateWhenHidden;
    _priv_mutedMemory;
    _priv_contentEventsMemory;
    _priv_stopAtEnd;
    _priv_lastContentPlaybackInfos;
    static get ErrorTypes() {
      return ErrorTypes;
    }
    static get ErrorCodes() {
      return ErrorCodes;
    }
    static get LogLevel() {
      return log_default.getLevel();
    }
    static set LogLevel(logLevel) {
      log_default.setLevel(logLevel);
    }
    constructor(options = {}, workerUrl) {
      super();
      const {
        initialAudioBitrate,
        initialVideoBitrate,
        limitVideoWidth,
        minAudioBitrate,
        minVideoBitrate,
        maxAudioBitrate,
        maxBufferAhead,
        maxBufferBehind,
        maxVideoBitrate,
        preferredAudioTracks,
        preferredTextTracks,
        preferredVideoTracks,
        throttleWhenHidden,
        throttleVideoBitrateWhenHidden,
        videoElement,
        wantedBufferAhead,
        maxVideoBufferSize,
        stopAtEnd
      } = parseConstructorOptions(options);
      const { DEFAULT_UNMUTED_VOLUME } = config_default.getCurrent();
      videoElement.preload = "auto";
      this.version = "3.28.0";
      this.log = log_default;
      this.state = "STOPPED";
      this.videoElement = videoElement;
      const destroyCanceller = new TaskCanceller();
      this._priv_destroy$ = new Subject();
      this._priv_destroy$.pipe(take(1)).subscribe(() => {
        destroyCanceller.cancel();
      });
      this._priv_pictureInPictureRef = getPictureOnPictureStateRef2(
        videoElement,
        destroyCanceller.signal
      );
      onFullscreenChange$2(videoElement).pipe(takeUntil(this._priv_destroy$)).subscribe(() => this.trigger("fullscreenChange", this.isFullscreen()));
      onTextTrackChanges$2(videoElement.textTracks).pipe(
        takeUntil(this._priv_destroy$),
        map((evt) => {
          const target = evt.target;
          const arr = [];
          for (let i = 0; i < target.length; i++) {
            const textTrack = target[i];
            arr.push(textTrack);
          }
          return arr;
        }),
        distinctUntilChanged((textTracksA, textTracksB) => {
          if (textTracksA.length !== textTracksB.length) {
            return false;
          }
          for (let i = 0; i < textTracksA.length; i++) {
            if (textTracksA[i] !== textTracksB[i]) {
              return false;
            }
          }
          return true;
        })
      ).subscribe((x) => this._priv_onNativeTextTracksNext(x));
      this._priv_speed = reference_default(videoElement.playbackRate);
      this._priv_preferTrickModeTracks = false;
      this._priv_contentLock = reference_default(false);
      this._priv_bufferOptions = {
        wantedBufferAhead: reference_default(wantedBufferAhead),
        maxBufferAhead: reference_default(maxBufferAhead),
        maxBufferBehind: reference_default(maxBufferBehind),
        maxVideoBufferSize: reference_default(maxVideoBufferSize)
      };
      this._priv_bitrateInfos = {
        lastBitrates: {
          audio: initialAudioBitrate,
          video: initialVideoBitrate
        },
        minAutoBitrates: {
          audio: reference_default(minAudioBitrate),
          video: reference_default(minVideoBitrate)
        },
        maxAutoBitrates: {
          audio: reference_default(maxAudioBitrate),
          video: reference_default(maxVideoBitrate)
        },
        manualBitrates: {
          audio: reference_default(-1),
          video: reference_default(-1)
        }
      };
      this._priv_throttleWhenHidden = throttleWhenHidden;
      this._priv_throttleVideoBitrateWhenHidden = throttleVideoBitrateWhenHidden;
      this._priv_limitVideoWidth = limitVideoWidth;
      this._priv_mutedMemory = DEFAULT_UNMUTED_VOLUME;
      this._priv_trackChoiceManager = null;
      this._priv_mediaElementTrackChoiceManager = null;
      this._priv_currentError = null;
      this._priv_contentInfos = null;
      this._priv_contentEventsMemory = {};
      this._priv_stopAtEnd = stopAtEnd;
      this._priv_setPlayerState(PLAYER_STATES.STOPPED);
      this._priv_preferredAudioTracks = preferredAudioTracks;
      this._priv_preferredTextTracks = preferredTextTracks;
      this._priv_preferredVideoTracks = preferredVideoTracks;
      this._priv_lastContentPlaybackInfos = {};
      this._priv_worker = new Worker(workerUrl);
      this._priv_worker.onerror = console.error.bind(console);
    }
    addEventListener(evt, fn) {
      return super.addEventListener(evt, fn);
    }
    stop() {
      if (this._priv_contentInfos !== null) {
        this._priv_contentInfos.currentContentCanceller.cancel();
      }
      this._priv_cleanUpCurrentContentState();
      if (this.state !== PLAYER_STATES.STOPPED) {
        this._priv_setPlayerState(PLAYER_STATES.STOPPED);
      }
    }
    dispose() {
      this.stop();
      if (this.videoElement !== null) {
        disposeDecryptionResources(this.videoElement).catch((err) => {
          const message = err instanceof Error ? err.message : "Unknown error";
          log_default.error("API: Could not dispose decryption resources: " + message);
        });
      }
      this._priv_destroy$.next();
      this._priv_destroy$.complete();
      this._priv_speed.finish();
      this._priv_contentLock.finish();
      this._priv_bufferOptions.wantedBufferAhead.finish();
      this._priv_bufferOptions.maxVideoBufferSize.finish();
      this._priv_bufferOptions.maxBufferAhead.finish();
      this._priv_bufferOptions.maxBufferBehind.finish();
      this._priv_bitrateInfos.manualBitrates.video.finish();
      this._priv_bitrateInfos.manualBitrates.audio.finish();
      this._priv_bitrateInfos.minAutoBitrates.video.finish();
      this._priv_bitrateInfos.minAutoBitrates.audio.finish();
      this._priv_bitrateInfos.maxAutoBitrates.video.finish();
      this._priv_bitrateInfos.maxAutoBitrates.audio.finish();
      this._priv_lastContentPlaybackInfos = {};
      this.videoElement = null;
    }
    loadVideo(opts) {
      const options = parseLoadVideoOptions(opts);
      log_default.info("API: Calling loadvideo", options.url, options.transport);
      this._priv_lastContentPlaybackInfos = { options };
      this._priv_initializeContentPlayback(options);
    }
    reload(reloadOpts) {
      const {
        options,
        manifest,
        lastPlaybackPosition
      } = this._priv_lastContentPlaybackInfos;
      if (options === void 0 || manifest === void 0 || lastPlaybackPosition === void 0) {
        throw new Error("API: Can't reload without having previously loaded a content.");
      }
      checkReloadOptions(reloadOpts);
      let startAtPositon;
      if (reloadOpts !== void 0 && reloadOpts.reloadAt !== void 0 && reloadOpts.reloadAt.position !== void 0) {
        startAtPositon = reloadOpts.reloadAt.position;
      } else {
        let playbackPosition;
        if (this.state === "STOPPED" || this.state === "ENDED") {
          playbackPosition = lastPlaybackPosition;
        } else {
          if (this.videoElement === null) {
            throw new Error("Can't reload when video element does not exist.");
          }
          playbackPosition = this.videoElement.currentTime;
        }
        if (reloadOpts !== void 0 && reloadOpts.reloadAt !== void 0 && reloadOpts.reloadAt.relative !== void 0) {
          startAtPositon = reloadOpts.reloadAt.relative + playbackPosition;
        } else {
          startAtPositon = playbackPosition;
        }
      }
      const newOptions = { ...options };
      newOptions.startAt = { position: startAtPositon };
      this._priv_initializeContentPlayback(newOptions);
    }
    _priv_initializeContentPlayback(options) {
      const {
        autoPlay: autoPlay2,
        audioTrackSwitchingMode,
        defaultAudioTrack,
        defaultTextTrack,
        enableFastSwitching,
        keySystems,
        lowLatencyMode,
        manualBitrateSwitchingMode,
        minimumManifestUpdateInterval,
        onCodecSwitch,
        startAt,
        transport,
        url
      } = options;
      if (this.videoElement === null) {
        throw new Error("the attached video element is disposed");
      }
      const isDirectFile = transport === "directfile";
      const currentContentCanceller = new TaskCanceller();
      const stoppedContent$ = new Observable((obs) => {
        currentContentCanceller.signal.register(() => {
          obs.next();
          obs.complete();
        });
      });
      const contentInfos = {
        url,
        currentContentCanceller,
        isDirectFile,
        thumbnails: null,
        manifest: null,
        currentPeriod: null,
        activeAdaptations: null,
        activeRepresentations: null,
        initialAudioTrack: defaultAudioTrack,
        initialTextTrack: defaultTextTrack
      };
      const videoElement = this.videoElement;
      const playbackObserver = new PlaybackObserver(videoElement, {
        withMediaSource: !isDirectFile,
        lowLatencyMode
      });
      currentContentCanceller.signal.register(() => {
        playbackObserver.stop();
      });
      let playback$;
      if (!isDirectFile) {
        this.stop();
        this._priv_currentError = null;
        this._priv_contentInfos = contentInfos;
        const relyOnVideoVisibilityAndSize = canRelyOnVideoVisibilityAndSize();
        const throttlers = {
          throttle: {},
          throttleBitrate: {},
          limitWidth: {}
        };
        if (this._priv_throttleWhenHidden) {
          if (!relyOnVideoVisibilityAndSize) {
            log_default.warn("API: Can't apply throttleWhenHidden because browser can't be trusted for visibility.");
          } else {
            throttlers.throttle = {
              video: createMappedReference(
                getPageActivityRef2(currentContentCanceller.signal),
                (isActive) => isActive ? Infinity : 0,
                currentContentCanceller.signal
              )
            };
          }
        }
        if (this._priv_throttleVideoBitrateWhenHidden) {
          if (!relyOnVideoVisibilityAndSize) {
            log_default.warn("API: Can't apply throttleVideoBitrateWhenHidden because browser can't be trusted for visibility.");
          } else {
            throttlers.throttleBitrate = {
              video: createMappedReference(
                getVideoVisibilityRef2(
                  this._priv_pictureInPictureRef,
                  currentContentCanceller.signal
                ),
                (isActive) => isActive ? Infinity : 0,
                currentContentCanceller.signal
              )
            };
          }
        }
        if (this._priv_limitVideoWidth) {
          if (!relyOnVideoVisibilityAndSize) {
            log_default.warn("API: Can't apply limitVideoWidth because browser can't be trusted for video size.");
          } else {
            throttlers.limitWidth = {
              video: getVideoWidthRef2(
                videoElement,
                this._priv_pictureInPictureRef,
                currentContentCanceller.signal
              )
            };
          }
        }
        const adaptiveOptions = {
          initialBitrates: this._priv_bitrateInfos.lastBitrates,
          lowLatencyMode,
          manualBitrates: this._priv_bitrateInfos.manualBitrates,
          minAutoBitrates: this._priv_bitrateInfos.minAutoBitrates,
          maxAutoBitrates: this._priv_bitrateInfos.maxAutoBitrates,
          throttlers
        };
        const bufferOptions = object_assign_default(
          {
            audioTrackSwitchingMode,
            enableFastSwitching,
            manualBitrateSwitchingMode,
            onCodecSwitch
          },
          this._priv_bufferOptions
        );
        const init$ = InitializeOnMediaSource(
          this._priv_worker,
          {
            adaptiveOptions,
            autoPlay: autoPlay2,
            bufferOptions,
            playbackObserver,
            keySystems,
            lowLatencyMode,
            url,
            mediaElement: videoElement,
            minimumManifestUpdateInterval,
            speed: this._priv_speed,
            startAt
          }
        ).pipe(takeUntil(stoppedContent$));
        playback$ = connectable(init$, {
          connector: () => new Subject(),
          resetOnDisconnect: false
        });
      } else {
        this.stop();
        this._priv_currentError = null;
        if (features_default.directfile === null) {
          throw new Error("DirectFile feature not activated in your build.");
        }
        this._priv_contentInfos = contentInfos;
        this._priv_mediaElementTrackChoiceManager = new features_default.directfile.mediaElementTrackChoiceManager(this.videoElement);
        const preferredAudioTracks = defaultAudioTrack === void 0 ? this._priv_preferredAudioTracks : [defaultAudioTrack];
        this._priv_mediaElementTrackChoiceManager.setPreferredAudioTracks(preferredAudioTracks, true);
        const preferredTextTracks = defaultTextTrack === void 0 ? this._priv_preferredTextTracks : [defaultTextTrack];
        this._priv_mediaElementTrackChoiceManager.setPreferredTextTracks(preferredTextTracks, true);
        this._priv_mediaElementTrackChoiceManager.setPreferredVideoTracks(this._priv_preferredVideoTracks, true);
        this.trigger(
          "availableAudioTracksChange",
          this._priv_mediaElementTrackChoiceManager.getAvailableAudioTracks()
        );
        this.trigger(
          "availableVideoTracksChange",
          this._priv_mediaElementTrackChoiceManager.getAvailableVideoTracks()
        );
        this.trigger(
          "availableTextTracksChange",
          this._priv_mediaElementTrackChoiceManager.getAvailableTextTracks()
        );
        this.trigger(
          "audioTrackChange",
          this._priv_mediaElementTrackChoiceManager.getChosenAudioTrack() ?? null
        );
        this.trigger(
          "textTrackChange",
          this._priv_mediaElementTrackChoiceManager.getChosenTextTrack() ?? null
        );
        this.trigger(
          "videoTrackChange",
          this._priv_mediaElementTrackChoiceManager.getChosenVideoTrack() ?? null
        );
        this._priv_mediaElementTrackChoiceManager.addEventListener("availableVideoTracksChange", (val) => this.trigger("availableVideoTracksChange", val));
        this._priv_mediaElementTrackChoiceManager.addEventListener("availableAudioTracksChange", (val) => this.trigger("availableAudioTracksChange", val));
        this._priv_mediaElementTrackChoiceManager.addEventListener("availableTextTracksChange", (val) => this.trigger("availableTextTracksChange", val));
        this._priv_mediaElementTrackChoiceManager.addEventListener("audioTrackChange", (val) => this.trigger("audioTrackChange", val));
        this._priv_mediaElementTrackChoiceManager.addEventListener("videoTrackChange", (val) => this.trigger("videoTrackChange", val));
        this._priv_mediaElementTrackChoiceManager.addEventListener("textTrackChange", (val) => this.trigger("textTrackChange", val));
        const directfileInit$ = features_default.directfile.initDirectFile({
          autoPlay: autoPlay2,
          keySystems,
          mediaElement: videoElement,
          speed: this._priv_speed,
          playbackObserver,
          startAt,
          url
        }).pipe(takeUntil(stoppedContent$));
        playback$ = connectable(directfileInit$, {
          connector: () => new Subject(),
          resetOnDisconnect: false
        });
      }
      const stalled$ = playback$.pipe(
        filter((evt) => evt.type === "stalled" || evt.type === "unstalled"),
        map((x) => x.value),
        distinctUntilChanged((prevStallReason, currStallReason) => {
          return prevStallReason === null && currStallReason === null || prevStallReason !== null && currStallReason !== null && prevStallReason === currStallReason;
        })
      );
      const loaded$ = playback$.pipe(
        filter((evt) => evt.type === "loaded"),
        share()
      );
      const reloading$ = playback$.pipe(
        filter(
          (evt) => evt.type === "reloading-media-source"
        ),
        share()
      );
      const observation$ = playbackObserver.getReference().asObservable();
      const stateChangingEvent$ = observation$.pipe(filter((o) => {
        return o.event === "seeking" || o.event === "ended" || o.event === "play" || o.event === "pause";
      }));
      const loadedStateUpdates$ = combineLatest([
        stalled$.pipe(startWith(null)),
        stateChangingEvent$.pipe(startWith(null))
      ]).pipe(
        takeUntil(stoppedContent$),
        map(
          ([stalledStatus]) => getLoadedContentState(videoElement, stalledStatus)
        )
      );
      const playerState$ = concat(
        of(PLAYER_STATES.LOADING),
        loaded$.pipe(switchMap((_, i) => {
          const isFirstLoad = i === 0;
          return merge(
            reloading$.pipe(map(() => PLAYER_STATES.RELOADING)),
            isFirstLoad ? of(PLAYER_STATES.LOADED) : EMPTY,
            loadedStateUpdates$.pipe(
              takeUntil(reloading$),
              skipWhile((state) => isFirstLoad && state === PLAYER_STATES.PAUSED)
            )
          );
        }))
      ).pipe(distinctUntilChanged());
      let playbackSubscription;
      stoppedContent$.subscribe(() => {
        if (playbackSubscription !== void 0) {
          playbackSubscription.unsubscribe();
        }
      });
      observation$.pipe(takeUntil(stoppedContent$)).subscribe((o) => this._priv_triggerPositionUpdate(o));
      loaded$.pipe(
        switchMap(() => emitSeekEvents(this.videoElement, observation$)),
        takeUntil(stoppedContent$)
      ).subscribe((evt) => {
        log_default.info(`API: Triggering "${evt}" event`);
        this.trigger(evt, null);
      });
      playerState$.pipe(takeUntil(stoppedContent$)).subscribe((x) => this._priv_setPlayerState(x));
      const endedEvent$ = observation$.pipe(filter((o) => {
        return o.event === "ended";
      }));
      (this._priv_stopAtEnd ? endedEvent$ : EMPTY).pipe(takeUntil(stoppedContent$)).subscribe(() => {
        currentContentCanceller.cancel();
      });
      playback$.subscribe({
        next: (x) => this._priv_onPlaybackEvent(x),
        error: (err) => this._priv_onPlaybackError(err),
        complete: () => {
          if (!contentInfos.currentContentCanceller.isUsed) {
            log_default.info("API: Previous playback finished. Stopping and cleaning-up...");
            contentInfos.currentContentCanceller.cancel();
            this._priv_cleanUpCurrentContentState();
            this._priv_setPlayerState(PLAYER_STATES.STOPPED);
          }
        }
      });
      this._priv_contentLock.asObservable().pipe(
        filter((isLocked) => !isLocked),
        take(1),
        takeUntil(stoppedContent$)
      ).subscribe(() => {
        playbackSubscription = playback$.connect();
      });
    }
    getError() {
      return this._priv_currentError;
    }
    getManifest() {
      warnOnce("getManifest is deprecated. Please open an issue if you used this API.");
      if (this._priv_contentInfos === null) {
        return null;
      }
      return this._priv_contentInfos.manifest;
    }
    getCurrentAdaptations() {
      warnOnce("getCurrentAdaptations is deprecated. Please open an issue if you used this API.");
      if (this._priv_contentInfos === null) {
        return null;
      }
      const { currentPeriod, activeAdaptations } = this._priv_contentInfos;
      if (currentPeriod === null || activeAdaptations === null || isNullOrUndefined(activeAdaptations[currentPeriod.id])) {
        return null;
      }
      return activeAdaptations[currentPeriod.id];
    }
    getCurrentRepresentations() {
      warnOnce("getCurrentRepresentations is deprecated. Please open an issue if you used this API.");
      return this._priv_getCurrentRepresentations();
    }
    getVideoElement() {
      return this.videoElement;
    }
    getNativeTextTrack() {
      warnOnce("getNativeTextTrack is deprecated. Please open an issue if you used this API.");
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      const videoElement = this.videoElement;
      const textTracks = videoElement.textTracks;
      if (textTracks.length > 0) {
        return videoElement.textTracks[0];
      } else {
        return null;
      }
    }
    getPlayerState() {
      return this.state;
    }
    isLive() {
      if (this._priv_contentInfos === null) {
        return false;
      }
      const { isDirectFile, manifest } = this._priv_contentInfos;
      if (isDirectFile || manifest === null) {
        return false;
      }
      return manifest.isLive;
    }
    areTrickModeTracksEnabled() {
      return this._priv_preferTrickModeTracks;
    }
    getUrl() {
      if (this._priv_contentInfos === null) {
        return void 0;
      }
      const { isDirectFile, manifest, url } = this._priv_contentInfos;
      if (isDirectFile) {
        return url;
      }
      if (manifest !== null) {
        return manifest.uris[0];
      }
      return void 0;
    }
    getVideoDuration() {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      return this.videoElement.duration;
    }
    getVideoBufferGap() {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      const videoElement = this.videoElement;
      return getLeftSizeOfRange(videoElement.buffered, videoElement.currentTime);
    }
    getVideoLoadedTime() {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      const videoElement = this.videoElement;
      return getSizeOfRange(videoElement.buffered, videoElement.currentTime);
    }
    getVideoPlayedTime() {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      const videoElement = this.videoElement;
      return getPlayedSizeOfRange(videoElement.buffered, videoElement.currentTime);
    }
    getWallClockTime() {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      if (this._priv_contentInfos === null) {
        return this.videoElement.currentTime;
      }
      const { isDirectFile, manifest } = this._priv_contentInfos;
      if (isDirectFile) {
        const startDate = getStartDate(this.videoElement);
        return (startDate ?? 0) + this.videoElement.currentTime;
      }
      if (manifest !== null) {
        const currentTime = this.videoElement.currentTime;
        const ast = manifest.availabilityStartTime !== void 0 ? manifest.availabilityStartTime : 0;
        return currentTime + ast;
      }
      return 0;
    }
    getPosition() {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      return this.videoElement.currentTime;
    }
    getPlaybackRate() {
      return this._priv_speed.getValue();
    }
    setPlaybackRate(rate, opts) {
      if (rate !== this._priv_speed.getValue()) {
        this._priv_speed.setValue(rate);
      }
      const preferTrickModeTracks = opts?.preferTrickModeTracks;
      if (typeof preferTrickModeTracks !== "boolean") {
        return;
      }
      this._priv_preferTrickModeTracks = preferTrickModeTracks;
      if (this._priv_trackChoiceManager !== null) {
        if (preferTrickModeTracks && !this._priv_trackChoiceManager.isTrickModeEnabled()) {
          this._priv_trackChoiceManager.enableVideoTrickModeTracks();
        } else if (!preferTrickModeTracks && this._priv_trackChoiceManager.isTrickModeEnabled()) {
          this._priv_trackChoiceManager.disableVideoTrickModeTracks();
        }
      }
    }
    getAvailableVideoBitrates() {
      if (this._priv_contentInfos === null) {
        return [];
      }
      const { currentPeriod, activeAdaptations } = this._priv_contentInfos;
      if (currentPeriod === null || activeAdaptations === null) {
        return [];
      }
      const adaptations = activeAdaptations[currentPeriod.id];
      if (adaptations === void 0 || isNullOrUndefined(adaptations.video)) {
        return [];
      }
      return getAvailableBitrates(adaptations.video);
    }
    getAvailableAudioBitrates() {
      if (this._priv_contentInfos === null) {
        return [];
      }
      const { currentPeriod, activeAdaptations } = this._priv_contentInfos;
      if (currentPeriod === null || activeAdaptations === null) {
        return [];
      }
      const adaptations = activeAdaptations[currentPeriod.id];
      if (adaptations === void 0 || isNullOrUndefined(adaptations.audio)) {
        return [];
      }
      return getAvailableBitrates(adaptations.audio);
    }
    getManualAudioBitrate() {
      return this._priv_bitrateInfos.manualBitrates.audio.getValue();
    }
    getManualVideoBitrate() {
      return this._priv_bitrateInfos.manualBitrates.video.getValue();
    }
    getVideoBitrate() {
      const representations = this._priv_getCurrentRepresentations();
      if (representations === null || isNullOrUndefined(representations.video)) {
        return void 0;
      }
      return representations.video.bitrate;
    }
    getAudioBitrate() {
      const representations = this._priv_getCurrentRepresentations();
      if (representations === null || isNullOrUndefined(representations.audio)) {
        return void 0;
      }
      return representations.audio.bitrate;
    }
    getMinVideoBitrate() {
      return this._priv_bitrateInfos.minAutoBitrates.video.getValue();
    }
    getMinAudioBitrate() {
      return this._priv_bitrateInfos.minAutoBitrates.audio.getValue();
    }
    getMaxVideoBitrate() {
      return this._priv_bitrateInfos.maxAutoBitrates.video.getValue();
    }
    getMaxAudioBitrate() {
      return this._priv_bitrateInfos.maxAutoBitrates.audio.getValue();
    }
    play() {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      const playPromise = this.videoElement.play();
      if (isNullOrUndefined(playPromise) || typeof playPromise.catch !== "function") {
        return Promise.resolve();
      }
      return playPromise.catch((error) => {
        if (error.name === "NotAllowedError") {
          const warning2 = new MediaError(
            "MEDIA_ERR_PLAY_NOT_ALLOWED",
            error.toString()
          );
          this.trigger("warning", warning2);
        }
        throw error;
      });
    }
    pause() {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      this.videoElement.pause();
    }
    seekTo(time) {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      if (this._priv_contentInfos === null) {
        throw new Error("player: no content loaded");
      }
      const { isDirectFile, manifest } = this._priv_contentInfos;
      if (!isDirectFile && manifest === null) {
        throw new Error("player: the content did not load yet");
      }
      let positionWanted;
      if (typeof time === "number") {
        positionWanted = time;
      } else if (typeof time === "object") {
        const timeObj = time;
        const currentTs = this.videoElement.currentTime;
        if (!isNullOrUndefined(timeObj.relative)) {
          positionWanted = currentTs + timeObj.relative;
        } else if (!isNullOrUndefined(timeObj.position)) {
          positionWanted = timeObj.position;
        } else if (!isNullOrUndefined(timeObj.wallClockTime)) {
          if (manifest !== null) {
            positionWanted = timeObj.wallClockTime - (manifest.availabilityStartTime ?? 0);
          } else if (isDirectFile && this.videoElement !== null) {
            const startDate = getStartDate(this.videoElement);
            if (startDate !== void 0) {
              positionWanted = timeObj.wallClockTime - startDate;
            }
          }
          if (positionWanted === void 0) {
            positionWanted = timeObj.wallClockTime;
          }
        } else {
          throw new Error('invalid time object. You must set one of the following properties: "relative", "position" or "wallClockTime"');
        }
      }
      if (positionWanted === void 0) {
        throw new Error("invalid time given");
      }
      this.videoElement.currentTime = positionWanted;
      return positionWanted;
    }
    isFullscreen() {
      warnOnce("isFullscreen is deprecated. Fullscreen management should now be managed by the application");
      return isFullscreen();
    }
    setFullscreen(goFull = true) {
      warnOnce("setFullscreen is deprecated. Fullscreen management should now be managed by the application");
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      if (goFull) {
        requestFullscreen(this.videoElement);
      } else {
        exitFullscreen();
      }
    }
    exitFullscreen() {
      warnOnce("exitFullscreen is deprecated. Fullscreen management should now be managed by the application");
      exitFullscreen();
    }
    getVolume() {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      return this.videoElement.volume;
    }
    setVolume(volume) {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      const videoElement = this.videoElement;
      if (volume !== videoElement.volume) {
        videoElement.volume = volume;
        this.trigger("volumeChange", volume);
      }
    }
    isMute() {
      return this.getVolume() === 0;
    }
    mute() {
      this._priv_mutedMemory = this.getVolume();
      this.setVolume(0);
    }
    unMute() {
      const { DEFAULT_UNMUTED_VOLUME } = config_default.getCurrent();
      const vol = this.getVolume();
      if (vol === 0) {
        this.setVolume(this._priv_mutedMemory === 0 ? DEFAULT_UNMUTED_VOLUME : this._priv_mutedMemory);
      }
    }
    setVideoBitrate(btr) {
      this._priv_bitrateInfos.manualBitrates.video.setValue(btr);
    }
    setAudioBitrate(btr) {
      this._priv_bitrateInfos.manualBitrates.audio.setValue(btr);
    }
    setMinVideoBitrate(btr) {
      const maxVideoBitrate = this._priv_bitrateInfos.maxAutoBitrates.video.getValue();
      if (btr > maxVideoBitrate) {
        throw new Error(`Invalid minimum video bitrate given. Its value, "${btr}" is superior the current maximum video birate, "${maxVideoBitrate}".`);
      }
      this._priv_bitrateInfos.minAutoBitrates.video.setValue(btr);
    }
    setMinAudioBitrate(btr) {
      const maxAudioBitrate = this._priv_bitrateInfos.maxAutoBitrates.audio.getValue();
      if (btr > maxAudioBitrate) {
        throw new Error(`Invalid minimum audio bitrate given. Its value, "${btr}" is superior the current maximum audio birate, "${maxAudioBitrate}".`);
      }
      this._priv_bitrateInfos.minAutoBitrates.audio.setValue(btr);
    }
    setMaxVideoBitrate(btr) {
      const minVideoBitrate = this._priv_bitrateInfos.minAutoBitrates.video.getValue();
      if (btr < minVideoBitrate) {
        throw new Error(`Invalid maximum video bitrate given. Its value, "${btr}" is inferior the current minimum video birate, "${minVideoBitrate}".`);
      }
      this._priv_bitrateInfos.maxAutoBitrates.video.setValue(btr);
    }
    setMaxAudioBitrate(btr) {
      const minAudioBitrate = this._priv_bitrateInfos.minAutoBitrates.audio.getValue();
      if (btr < minAudioBitrate) {
        throw new Error(`Invalid maximum audio bitrate given. Its value, "${btr}" is inferior the current minimum audio birate, "${minAudioBitrate}".`);
      }
      this._priv_bitrateInfos.maxAutoBitrates.audio.setValue(btr);
    }
    setMaxBufferBehind(depthInSeconds) {
      this._priv_bufferOptions.maxBufferBehind.setValue(depthInSeconds);
    }
    setMaxBufferAhead(depthInSeconds) {
      this._priv_bufferOptions.maxBufferAhead.setValue(depthInSeconds);
    }
    setWantedBufferAhead(sizeInSeconds) {
      this._priv_bufferOptions.wantedBufferAhead.setValue(sizeInSeconds);
    }
    setMaxVideoBufferSize(sizeInKBytes) {
      this._priv_bufferOptions.maxVideoBufferSize.setValue(sizeInKBytes);
    }
    getMaxBufferBehind() {
      return this._priv_bufferOptions.maxBufferBehind.getValue();
    }
    getMaxBufferAhead() {
      return this._priv_bufferOptions.maxBufferAhead.getValue();
    }
    getWantedBufferAhead() {
      return this._priv_bufferOptions.wantedBufferAhead.getValue();
    }
    getMaxVideoBufferSize() {
      return this._priv_bufferOptions.maxVideoBufferSize.getValue();
    }
    getCurrentKeySystem() {
      if (this.videoElement === null) {
        throw new Error("Disposed player");
      }
      return getCurrentKeySystem(this.videoElement);
    }
    getAvailableAudioTracks() {
      if (this._priv_contentInfos === null) {
        return [];
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile) {
        return this._priv_mediaElementTrackChoiceManager?.getAvailableAudioTracks() ?? [];
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        return [];
      }
      return this._priv_trackChoiceManager.getAvailableAudioTracks(currentPeriod);
    }
    getAvailableTextTracks() {
      if (this._priv_contentInfos === null) {
        return [];
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile) {
        return this._priv_mediaElementTrackChoiceManager?.getAvailableTextTracks() ?? [];
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        return [];
      }
      return this._priv_trackChoiceManager.getAvailableTextTracks(currentPeriod);
    }
    getAvailableVideoTracks() {
      if (this._priv_contentInfos === null) {
        return [];
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile) {
        return this._priv_mediaElementTrackChoiceManager?.getAvailableVideoTracks() ?? [];
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        return [];
      }
      return this._priv_trackChoiceManager.getAvailableVideoTracks(currentPeriod);
    }
    getAudioTrack() {
      if (this._priv_contentInfos === null) {
        return void 0;
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile) {
        if (this._priv_mediaElementTrackChoiceManager === null) {
          return void 0;
        }
        return this._priv_mediaElementTrackChoiceManager.getChosenAudioTrack();
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        return void 0;
      }
      return this._priv_trackChoiceManager.getChosenAudioTrack(currentPeriod);
    }
    getTextTrack() {
      if (this._priv_contentInfos === null) {
        return void 0;
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile) {
        if (this._priv_mediaElementTrackChoiceManager === null) {
          return void 0;
        }
        return this._priv_mediaElementTrackChoiceManager.getChosenTextTrack();
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        return void 0;
      }
      return this._priv_trackChoiceManager.getChosenTextTrack(currentPeriod);
    }
    getVideoTrack() {
      if (this._priv_contentInfos === null) {
        return void 0;
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile) {
        if (this._priv_mediaElementTrackChoiceManager === null) {
          return void 0;
        }
        return this._priv_mediaElementTrackChoiceManager.getChosenVideoTrack();
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        return void 0;
      }
      return this._priv_trackChoiceManager.getChosenVideoTrack(currentPeriod);
    }
    setAudioTrack(audioId) {
      if (this._priv_contentInfos === null) {
        throw new Error("No content loaded");
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile) {
        try {
          this._priv_mediaElementTrackChoiceManager?.setAudioTrackById(audioId);
          return;
        } catch (e) {
          throw new Error("player: unknown audio track");
        }
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        throw new Error("No compatible content launched.");
      }
      try {
        this._priv_trackChoiceManager.setAudioTrackByID(currentPeriod, audioId);
      } catch (e) {
        throw new Error("player: unknown audio track");
      }
    }
    setTextTrack(textId) {
      if (this._priv_contentInfos === null) {
        throw new Error("No content loaded");
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile) {
        try {
          this._priv_mediaElementTrackChoiceManager?.setTextTrackById(textId);
          return;
        } catch (e) {
          throw new Error("player: unknown text track");
        }
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        throw new Error("No compatible content launched.");
      }
      try {
        this._priv_trackChoiceManager.setTextTrackByID(currentPeriod, textId);
      } catch (e) {
        throw new Error("player: unknown text track");
      }
    }
    disableTextTrack() {
      if (this._priv_contentInfos === null) {
        return;
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile) {
        this._priv_mediaElementTrackChoiceManager?.disableTextTrack();
        return;
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        return;
      }
      return this._priv_trackChoiceManager.disableTextTrack(currentPeriod);
    }
    setVideoTrack(videoId) {
      if (this._priv_contentInfos === null) {
        throw new Error("No content loaded");
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile) {
        try {
          this._priv_mediaElementTrackChoiceManager?.setVideoTrackById(videoId);
          return;
        } catch (e) {
          throw new Error("player: unknown video track");
        }
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        throw new Error("No compatible content launched.");
      }
      try {
        this._priv_trackChoiceManager.setVideoTrackByID(currentPeriod, videoId);
      } catch (e) {
        throw new Error("player: unknown video track");
      }
    }
    disableVideoTrack() {
      if (this._priv_contentInfos === null) {
        return;
      }
      const { currentPeriod, isDirectFile } = this._priv_contentInfos;
      if (isDirectFile && this._priv_mediaElementTrackChoiceManager !== null) {
        return this._priv_mediaElementTrackChoiceManager.disableVideoTrack();
      }
      if (this._priv_trackChoiceManager === null || currentPeriod === null) {
        return;
      }
      return this._priv_trackChoiceManager.disableVideoTrack(currentPeriod);
    }
    getPreferredAudioTracks() {
      return this._priv_preferredAudioTracks;
    }
    getPreferredTextTracks() {
      return this._priv_preferredTextTracks;
    }
    getPreferredVideoTracks() {
      return this._priv_preferredVideoTracks;
    }
    setPreferredAudioTracks(tracks, shouldApply = false) {
      if (!Array.isArray(tracks)) {
        throw new Error("Invalid `setPreferredAudioTracks` argument. Should have been an Array.");
      }
      this._priv_preferredAudioTracks = tracks;
      if (this._priv_trackChoiceManager !== null) {
        this._priv_trackChoiceManager.setPreferredAudioTracks(tracks, shouldApply);
      } else if (this._priv_mediaElementTrackChoiceManager !== null) {
        this._priv_mediaElementTrackChoiceManager.setPreferredAudioTracks(
          tracks,
          shouldApply
        );
      }
    }
    setPreferredTextTracks(tracks, shouldApply = false) {
      if (!Array.isArray(tracks)) {
        throw new Error("Invalid `setPreferredTextTracks` argument. Should have been an Array.");
      }
      this._priv_preferredTextTracks = tracks;
      if (this._priv_trackChoiceManager !== null) {
        this._priv_trackChoiceManager.setPreferredTextTracks(tracks, shouldApply);
      } else if (this._priv_mediaElementTrackChoiceManager !== null) {
        this._priv_mediaElementTrackChoiceManager.setPreferredTextTracks(
          tracks,
          shouldApply
        );
      }
    }
    setPreferredVideoTracks(tracks, shouldApply = false) {
      if (!Array.isArray(tracks)) {
        throw new Error("Invalid `setPreferredVideoTracks` argument. Should have been an Array.");
      }
      this._priv_preferredVideoTracks = tracks;
      if (this._priv_trackChoiceManager !== null) {
        this._priv_trackChoiceManager.setPreferredVideoTracks(tracks, shouldApply);
      } else if (this._priv_mediaElementTrackChoiceManager !== null) {
        this._priv_mediaElementTrackChoiceManager.setPreferredVideoTracks(
          tracks,
          shouldApply
        );
      }
    }
    getImageTrackData() {
      warnOnce("`getImageTrackData` is deprecated.Please use the `parseBifThumbnails` tool instead.");
      if (this._priv_contentInfos === null) {
        return null;
      }
      return this._priv_contentInfos.thumbnails;
    }
    getMinimumPosition() {
      if (this._priv_contentInfos === null) {
        return null;
      }
      if (this._priv_contentInfos.isDirectFile) {
        return 0;
      }
      const { manifest } = this._priv_contentInfos;
      if (manifest !== null) {
        return getMinimumSafePosition2(manifest);
      }
      return null;
    }
    getMaximumPosition() {
      if (this._priv_contentInfos === null) {
        return null;
      }
      const { isDirectFile, manifest } = this._priv_contentInfos;
      if (isDirectFile) {
        if (this.videoElement === null) {
          throw new Error("Disposed player");
        }
        return this.videoElement.duration;
      }
      if (manifest !== null) {
        if (!manifest.isDynamic && this.videoElement !== null) {
          return this.videoElement.duration;
        }
        return getMaximumSafePosition2(manifest);
      }
      return null;
    }
    __priv_getSegmentBufferContent() {
      return null;
    }
    _priv_cleanUpCurrentContentState() {
      log_default.debug("Locking `contentLock` to clean-up the current content.");
      this._priv_contentLock.setValue(true);
      this._priv_contentInfos = null;
      this._priv_trackChoiceManager = null;
      this._priv_mediaElementTrackChoiceManager?.dispose();
      this._priv_mediaElementTrackChoiceManager = null;
      this._priv_contentEventsMemory = {};
      const freeUpContentLock = () => {
        if (this.videoElement !== null) {
          log_default.debug("Unlocking `contentLock`. Next content can begin.");
          this._priv_contentLock.setValue(false);
        }
      };
      if (!isNullOrUndefined(this.videoElement)) {
        clearOnStop(this.videoElement).then(
          () => {
            log_default.debug("API: DRM session cleaned-up with success!");
            freeUpContentLock();
          },
          (err) => {
            log_default.error("API: An error arised when trying to clean-up the DRM session:" + (err instanceof Error ? err.toString() : "Unknown Error"));
            freeUpContentLock();
          }
        );
      } else {
        freeUpContentLock();
      }
    }
    _priv_onPlaybackEvent(event) {
      switch (event.type) {
        case "stream-event":
          this.trigger("streamEvent", event.value);
          break;
        case "stream-event-skip":
          this.trigger("streamEventSkip", event.value);
          break;
        case "activePeriodChanged":
          this._priv_onActivePeriodChanged(event.value);
          break;
        case "periodStreamReady":
          this._priv_onPeriodStreamReady(event.value);
          break;
        case "periodStreamCleared":
          this._priv_onPeriodStreamCleared(event.value);
          break;
        case "reloading-media-source":
          this._priv_onReloadingMediaSource();
          break;
        case "representationChange":
          this._priv_onRepresentationChange(event.value);
          break;
        case "adaptationChange":
          this._priv_onAdaptationChange(event.value);
          break;
        case "bitrateEstimationChange":
          this._priv_onBitrateEstimationChange(event.value);
          break;
        case "manifestReady":
          this._priv_onManifestReady(event.value);
          break;
        case "warning":
          this._priv_onPlaybackWarning(event.value);
          break;
        case "loaded":
          break;
        case "decipherabilityUpdate":
          this.trigger("decipherabilityUpdate", event.value);
          break;
        case "added-segment":
          if (this._priv_contentInfos === null) {
            log_default.error("API: Added segment while no content is loaded");
            return;
          }
          const { content, segmentData } = event.value;
          if (content.adaptation.type === "image") {
            if (!isNullOrUndefined(segmentData) && segmentData.type === "bif") {
              const imageData = segmentData.data;
              this._priv_contentInfos.thumbnails = imageData;
              this.trigger(
                "imageTrackUpdate",
                { data: this._priv_contentInfos.thumbnails }
              );
            }
          }
      }
    }
    _priv_onPlaybackError(error) {
      const formattedError = formatError(error, {
        defaultCode: "NONE",
        defaultReason: "An unknown error stopped content playback."
      });
      formattedError.fatal = true;
      if (this._priv_contentInfos !== null) {
        this._priv_contentInfos.currentContentCanceller.cancel();
      }
      this._priv_cleanUpCurrentContentState();
      this._priv_currentError = formattedError;
      log_default.error(
        "API: The player stopped because of an error",
        error instanceof Error ? error : ""
      );
      this._priv_setPlayerState(PLAYER_STATES.STOPPED);
      if (this._priv_currentError === formattedError) {
        this.trigger("error", formattedError);
      }
    }
    _priv_onPlaybackWarning(error) {
      const formattedError = formatError(error, {
        defaultCode: "NONE",
        defaultReason: "An unknown error happened."
      });
      log_default.warn("API: Sending warning:", formattedError);
      this.trigger("warning", formattedError);
    }
    _priv_onManifestReady({ manifest }) {
      const contentInfos = this._priv_contentInfos;
      if (contentInfos === null) {
        log_default.error("API: The manifest is loaded but no content is.");
        return;
      }
      contentInfos.manifest = manifest;
      this._priv_lastContentPlaybackInfos.manifest = manifest;
      const { initialAudioTrack, initialTextTrack } = contentInfos;
      this._priv_trackChoiceManager = new TrackChoiceManager({
        preferTrickModeTracks: this._priv_preferTrickModeTracks
      });
      const preferredAudioTracks = initialAudioTrack === void 0 ? this._priv_preferredAudioTracks : [initialAudioTrack];
      this._priv_trackChoiceManager.setPreferredAudioTracks(preferredAudioTracks, true);
      const preferredTextTracks = initialTextTrack === void 0 ? this._priv_preferredTextTracks : [initialTextTrack];
      this._priv_trackChoiceManager.setPreferredTextTracks(preferredTextTracks, true);
      this._priv_trackChoiceManager.setPreferredVideoTracks(
        this._priv_preferredVideoTracks,
        true
      );
    }
    _priv_onActivePeriodChanged({ period }) {
      if (this._priv_contentInfos === null) {
        log_default.error("API: The active period changed but no content is loaded");
        return;
      }
      this._priv_contentInfos.currentPeriod = period;
      if (this._priv_contentEventsMemory.periodChange !== period) {
        this._priv_contentEventsMemory.periodChange = period;
        this.trigger("periodChange", period);
      }
      this.trigger("availableAudioTracksChange", this.getAvailableAudioTracks());
      this.trigger("availableTextTracksChange", this.getAvailableTextTracks());
      this.trigger("availableVideoTracksChange", this.getAvailableVideoTracks());
      if (this._priv_trackChoiceManager !== null) {
        const audioTrack = this._priv_trackChoiceManager.getChosenAudioTrack(period);
        const textTrack = this._priv_trackChoiceManager.getChosenTextTrack(period);
        const videoTrack = this._priv_trackChoiceManager.getChosenVideoTrack(period);
        this.trigger("audioTrackChange", audioTrack);
        this.trigger("textTrackChange", textTrack);
        this.trigger("videoTrackChange", videoTrack);
      } else {
        this.trigger("audioTrackChange", null);
        this.trigger("textTrackChange", null);
        this.trigger("videoTrackChange", null);
      }
      this._priv_triggerAvailableBitratesChangeEvent(
        "availableAudioBitratesChange",
        this.getAvailableAudioBitrates()
      );
      this._priv_triggerAvailableBitratesChangeEvent(
        "availableVideoBitratesChange",
        this.getAvailableVideoBitrates()
      );
      const audioBitrate = this._priv_getCurrentRepresentations()?.audio?.bitrate ?? -1;
      this._priv_triggerCurrentBitrateChangeEvent("audioBitrateChange", audioBitrate);
      const videoBitrate = this._priv_getCurrentRepresentations()?.video?.bitrate ?? -1;
      this._priv_triggerCurrentBitrateChangeEvent("videoBitrateChange", videoBitrate);
    }
    _priv_onPeriodStreamReady(value) {
      const { type, period, adaptation$ } = value;
      switch (type) {
        case "video":
          if (this._priv_trackChoiceManager === null) {
            log_default.error("API: TrackChoiceManager not instanciated for a new video period");
            adaptation$.next(null);
          } else {
            this._priv_trackChoiceManager.addPeriod(type, period, adaptation$);
            this._priv_trackChoiceManager.setInitialVideoTrack(period);
          }
          break;
        case "audio":
          if (this._priv_trackChoiceManager === null) {
            log_default.error(`API: TrackChoiceManager not instanciated for a new ${type} period`);
            adaptation$.next(null);
          } else {
            this._priv_trackChoiceManager.addPeriod(type, period, adaptation$);
            this._priv_trackChoiceManager.setInitialAudioTrack(period);
          }
          break;
        case "text":
          if (this._priv_trackChoiceManager === null) {
            log_default.error(`API: TrackChoiceManager not instanciated for a new ${type} period`);
            adaptation$.next(null);
          } else {
            this._priv_trackChoiceManager.addPeriod(type, period, adaptation$);
            this._priv_trackChoiceManager.setInitialTextTrack(period);
          }
          break;
        default:
          const adaptations = period.adaptations[type];
          if (!isNullOrUndefined(adaptations) && adaptations.length > 0) {
            adaptation$.next(adaptations[0]);
          } else {
            adaptation$.next(null);
          }
          break;
      }
    }
    _priv_onPeriodStreamCleared(value) {
      const { type, period } = value;
      switch (type) {
        case "audio":
        case "text":
        case "video":
          if (this._priv_trackChoiceManager !== null) {
            this._priv_trackChoiceManager.removePeriod(type, period);
          }
          break;
      }
      if (this._priv_contentInfos === null) {
        return;
      }
      const { activeAdaptations, activeRepresentations } = this._priv_contentInfos;
      if (!isNullOrUndefined(activeAdaptations) && !isNullOrUndefined(activeAdaptations[period.id])) {
        const activePeriodAdaptations = activeAdaptations[period.id];
        delete activePeriodAdaptations[type];
        if (Object.keys(activePeriodAdaptations).length === 0) {
          delete activeAdaptations[period.id];
        }
      }
      if (!isNullOrUndefined(activeRepresentations) && !isNullOrUndefined(activeRepresentations[period.id])) {
        const activePeriodRepresentations = activeRepresentations[period.id];
        delete activePeriodRepresentations[type];
        if (Object.keys(activePeriodRepresentations).length === 0) {
          delete activeRepresentations[period.id];
        }
      }
    }
    _priv_onReloadingMediaSource() {
      if (this._priv_trackChoiceManager !== null) {
        this._priv_trackChoiceManager.resetPeriods();
      }
    }
    _priv_onAdaptationChange({
      type,
      adaptation,
      period
    }) {
      if (this._priv_contentInfos === null) {
        log_default.error("API: The adaptations changed but no content is loaded");
        return;
      }
      if (this._priv_contentInfos.activeAdaptations === null) {
        this._priv_contentInfos.activeAdaptations = {};
      }
      const { activeAdaptations, currentPeriod } = this._priv_contentInfos;
      const activePeriodAdaptations = activeAdaptations[period.id];
      if (isNullOrUndefined(activePeriodAdaptations)) {
        activeAdaptations[period.id] = { [type]: adaptation };
      } else {
        activePeriodAdaptations[type] = adaptation;
      }
      if (this._priv_trackChoiceManager !== null && currentPeriod !== null && !isNullOrUndefined(period) && period.id === currentPeriod.id) {
        switch (type) {
          case "audio":
            const audioTrack = this._priv_trackChoiceManager.getChosenAudioTrack(currentPeriod);
            this.trigger("audioTrackChange", audioTrack);
            const availableAudioBitrates = this.getAvailableAudioBitrates();
            this._priv_triggerAvailableBitratesChangeEvent(
              "availableAudioBitratesChange",
              availableAudioBitrates
            );
            break;
          case "text":
            const textTrack = this._priv_trackChoiceManager.getChosenTextTrack(currentPeriod);
            this.trigger("textTrackChange", textTrack);
            break;
          case "video":
            const videoTrack = this._priv_trackChoiceManager.getChosenVideoTrack(currentPeriod);
            this.trigger("videoTrackChange", videoTrack);
            const availableVideoBitrates = this.getAvailableVideoBitrates();
            this._priv_triggerAvailableBitratesChangeEvent(
              "availableVideoBitratesChange",
              availableVideoBitrates
            );
            break;
        }
      }
    }
    _priv_onRepresentationChange({
      type,
      period,
      representation
    }) {
      if (this._priv_contentInfos === null) {
        log_default.error("API: The representations changed but no content is loaded");
        return;
      }
      if (this._priv_contentInfos.activeRepresentations === null) {
        this._priv_contentInfos.activeRepresentations = {};
      }
      const { activeRepresentations, currentPeriod } = this._priv_contentInfos;
      const activePeriodRepresentations = activeRepresentations[period.id];
      if (isNullOrUndefined(activePeriodRepresentations)) {
        activeRepresentations[period.id] = { [type]: representation };
      } else {
        activePeriodRepresentations[type] = representation;
      }
      const bitrate = representation?.bitrate ?? -1;
      if (!isNullOrUndefined(period) && currentPeriod !== null && currentPeriod.id === period.id) {
        if (type === "video") {
          this._priv_triggerCurrentBitrateChangeEvent("videoBitrateChange", bitrate);
        } else if (type === "audio") {
          this._priv_triggerCurrentBitrateChangeEvent("audioBitrateChange", bitrate);
        }
      }
    }
    _priv_onBitrateEstimationChange({
      type,
      bitrate
    }) {
      if (bitrate !== void 0) {
        this._priv_bitrateInfos.lastBitrates[type] = bitrate;
      }
      this.trigger("bitrateEstimationChange", { type, bitrate });
    }
    _priv_onNativeTextTracksNext(tracks) {
      this.trigger("nativeTextTracksChange", tracks);
    }
    _priv_setPlayerState(newState) {
      if (this.state !== newState) {
        this.state = newState;
        log_default.info("API: playerStateChange event", newState);
        this.trigger("playerStateChange", newState);
      }
    }
    _priv_triggerPositionUpdate(observation) {
      if (this._priv_contentInfos === null) {
        log_default.warn("API: Cannot perform time update: no content loaded.");
        return;
      }
      if (this.state === PLAYER_STATES.RELOADING) {
        return;
      }
      const { isDirectFile, manifest } = this._priv_contentInfos;
      if (!isDirectFile && manifest === null || isNullOrUndefined(observation)) {
        return;
      }
      this._priv_lastContentPlaybackInfos.lastPlaybackPosition = observation.position;
      const maximumPosition = manifest !== null ? getMaximumSafePosition2(manifest) : void 0;
      const positionData = {
        position: observation.position,
        duration: observation.duration,
        playbackRate: observation.playbackRate,
        maximumBufferTime: maximumPosition,
        bufferGap: isFinite(observation.bufferGap) ? observation.bufferGap : 0
      };
      if (manifest !== null && manifest.isLive && observation.position > 0) {
        const ast = manifest.availabilityStartTime ?? 0;
        positionData.wallClockTime = observation.position + ast;
        const livePosition = getLivePosition2(manifest);
        if (livePosition !== void 0) {
          positionData.liveGap = livePosition - observation.position;
        }
      } else if (isDirectFile && this.videoElement !== null) {
        const startDate = getStartDate(this.videoElement);
        if (startDate !== void 0) {
          positionData.wallClockTime = startDate + observation.position;
        }
      }
      this.trigger("positionUpdate", positionData);
    }
    _priv_triggerAvailableBitratesChangeEvent(event, newVal) {
      const prevVal = this._priv_contentEventsMemory[event];
      if (prevVal === void 0 || !areArraysOfNumbersEqual(newVal, prevVal)) {
        this._priv_contentEventsMemory[event] = newVal;
        this.trigger(event, newVal);
      }
    }
    _priv_triggerCurrentBitrateChangeEvent(event, newVal) {
      if (newVal !== this._priv_contentEventsMemory[event]) {
        this._priv_contentEventsMemory[event] = newVal;
        this.trigger(event, newVal);
      }
    }
    _priv_getCurrentRepresentations() {
      if (this._priv_contentInfos === null) {
        return null;
      }
      const { currentPeriod, activeRepresentations } = this._priv_contentInfos;
      if (currentPeriod === null || activeRepresentations === null || isNullOrUndefined(activeRepresentations[currentPeriod.id])) {
        return null;
      }
      return activeRepresentations[currentPeriod.id];
    }
  };
  __publicField(Player, "version");
  Player.version = "3.28.0";
  var public_api_default = Player;
  function getMinimumSafePosition2(manifest) {
    const windowData = manifest.timeBounds;
    if (windowData.timeshiftDepth === null) {
      return windowData.minimumSafePosition ?? 0;
    }
    const { maximumTimeData } = windowData;
    let maximumTime;
    if (!windowData.maximumTimeData.isLinear) {
      maximumTime = maximumTimeData.maximumSafePosition;
    } else {
      const timeDiff = performance.now() - maximumTimeData.time;
      maximumTime = maximumTimeData.maximumSafePosition + timeDiff / 1e3;
    }
    const theoricalMinimum = maximumTime - windowData.timeshiftDepth;
    return Math.max(windowData.minimumSafePosition ?? 0, theoricalMinimum);
  }
  function getLivePosition2(manifest) {
    const { maximumTimeData } = manifest.timeBounds;
    if (!manifest.isLive || maximumTimeData.livePosition === void 0) {
      return void 0;
    }
    if (!maximumTimeData.isLinear) {
      return maximumTimeData.livePosition;
    }
    const timeDiff = performance.now() - maximumTimeData.time;
    return maximumTimeData.livePosition + timeDiff / 1e3;
  }
  function getMaximumSafePosition2(manifest) {
    const { maximumTimeData } = manifest.timeBounds;
    if (!maximumTimeData.isLinear) {
      return maximumTimeData.maximumSafePosition;
    }
    const timeDiff = performance.now() - maximumTimeData.time;
    return maximumTimeData.maximumSafePosition + timeDiff / 1e3;
  }
  function getAvailableBitrates(adaptation) {
    const bitrates = [];
    for (let i = 0; i < adaptation.representations.length; i++) {
      const representation = adaptation.representations[i];
      if (representation.decipherable !== false) {
        bitrates.push(representation.bitrate);
      }
    }
    return uniq_default(bitrates);
  }

  // src/main/core/api/index.ts
  var api_default = public_api_default;

  // src/main/index.ts
  window.RxPlayer = api_default;
})();
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
