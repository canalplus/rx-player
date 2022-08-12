(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));

  // node_modules/tslib/tslib.js
  var require_tslib = __commonJS({
    "node_modules/tslib/tslib.js"(exports, module) {
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
        __spreadArray2 = function(to, from) {
          for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
            to[j] = from[i];
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

  // src/main/default_config.ts
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

  // src/main/utils/object_assign.ts
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

  // src/main/utils/deep_merge.ts
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

  // src/main/config.ts
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

  // src/main/utils/noop.ts
  function noop_default() {
  }

  // src/main/utils/logger.ts
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

  // src/main/log.ts
  var logger = new Logger();
  var log_default = logger;

  // src/main/utils/ranges.ts
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

  // node_modules/tslib/modules/index.js
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
  function isFunction(value) {
    return typeof value === "function";
  }

  // node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js
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
  function arrRemove(arr, item) {
    if (arr) {
      var index = arr.indexOf(item);
      0 <= index && arr.splice(index, 1);
    }
  }

  // node_modules/rxjs/dist/esm5/internal/Subscription.js
  var Subscription = function() {
    function Subscription2(initialTeardown) {
      this.initialTeardown = initialTeardown;
      this.closed = false;
      this._parentage = null;
      this._teardowns = null;
    }
    Subscription2.prototype.unsubscribe = function() {
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
    Subscription2.prototype.add = function(teardown) {
      var _a;
      if (teardown && teardown !== this) {
        if (this.closed) {
          execTeardown(teardown);
        } else {
          if (teardown instanceof Subscription2) {
            if (teardown.closed || teardown._hasParent(this)) {
              return;
            }
            teardown._addParent(this);
          }
          (this._teardowns = (_a = this._teardowns) !== null && _a !== void 0 ? _a : []).push(teardown);
        }
      }
    };
    Subscription2.prototype._hasParent = function(parent) {
      var _parentage = this._parentage;
      return _parentage === parent || Array.isArray(_parentage) && _parentage.includes(parent);
    };
    Subscription2.prototype._addParent = function(parent) {
      var _parentage = this._parentage;
      this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
    };
    Subscription2.prototype._removeParent = function(parent) {
      var _parentage = this._parentage;
      if (_parentage === parent) {
        this._parentage = null;
      } else if (Array.isArray(_parentage)) {
        arrRemove(_parentage, parent);
      }
    };
    Subscription2.prototype.remove = function(teardown) {
      var _teardowns = this._teardowns;
      _teardowns && arrRemove(_teardowns, teardown);
      if (teardown instanceof Subscription2) {
        teardown._removeParent(this);
      }
    };
    Subscription2.EMPTY = function() {
      var empty = new Subscription2();
      empty.closed = true;
      return empty;
    }();
    return Subscription2;
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
  var config = {
    onUnhandledError: null,
    onStoppedNotification: null,
    Promise: void 0,
    useDeprecatedSynchronousErrorHandling: false,
    useDeprecatedNextContext: false
  };

  // node_modules/rxjs/dist/esm5/internal/scheduler/timeoutProvider.js
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
  function noop() {
  }

  // node_modules/rxjs/dist/esm5/internal/NotificationFactories.js
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
  var observable = function() {
    return typeof Symbol === "function" && Symbol.observable || "@@observable";
  }();

  // node_modules/rxjs/dist/esm5/internal/util/identity.js
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
    function Observable2(subscribe) {
      if (subscribe) {
        this._subscribe = subscribe;
      }
    }
    Observable2.prototype.lift = function(operator) {
      var observable2 = new Observable2();
      observable2.source = this;
      observable2.operator = operator;
      return observable2;
    };
    Observable2.prototype.subscribe = function(observerOrNext, error, complete) {
      var _this = this;
      var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
      errorContext(function() {
        var _a = _this, operator = _a.operator, source = _a.source;
        subscriber.add(operator ? operator.call(subscriber, source) : source ? _this._subscribe(subscriber) : _this._trySubscribe(subscriber));
      });
      return subscriber;
    };
    Observable2.prototype._trySubscribe = function(sink) {
      try {
        return this._subscribe(sink);
      } catch (err) {
        sink.error(err);
      }
    };
    Observable2.prototype.forEach = function(next, promiseCtor) {
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
    Observable2.prototype._subscribe = function(subscriber) {
      var _a;
      return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
    };
    Observable2.prototype[observable] = function() {
      return this;
    };
    Observable2.prototype.pipe = function() {
      var operations = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        operations[_i] = arguments[_i];
      }
      return pipeFromArray(operations)(this);
    };
    Observable2.prototype.toPromise = function(promiseCtor) {
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
    Observable2.create = function(subscribe) {
      return new Observable2(subscribe);
    };
    return Observable2;
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

  // src/main/utils/reference.ts
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
          if (__ENVIRONMENT__.CURRENT_ENV === __ENVIRONMENT__.DEV) {
            throw new Error("Finished shared references cannot be updated");
          } else {
            return;
          }
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
          } catch (_) {
          }
        }
      }
    };
  }
  var reference_default = createSharedReference;

  // src/main/errors/assertion_error.ts
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

  // src/main/utils/assert.ts
  function assert(assertion, message) {
    if (__ENVIRONMENT__.DEV === __ENVIRONMENT__.CURRENT_ENV && !assertion) {
      throw new AssertionError(message === void 0 ? "invalid assertion" : message);
    }
  }

  // src/main/utils/task_canceller.ts
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
        const rebufferingStatus = getRebufferingStatus(_lastObservation, mediaTimings, {
          lowLatencyMode: this._lowLatencyMode,
          withMediaSource: this._withMediaSource
        });
        const freezingStatus = getFreezingStatus(_lastObservation, mediaTimings);
        const timings = object_assign_default({}, {
          rebuffering: rebufferingStatus,
          freezing: freezingStatus,
          internalSeeking
        }, mediaTimings);
        if (log_default.hasLevel("DEBUG")) {
          log_default.debug("API: current media element state tick", "event", timings.event, "position", timings.position, "seeking", timings.seeking, "internalSeeking", timings.internalSeeking, "rebuffering", timings.rebuffering !== null, "freezing", timings.freezing !== null, "ended", timings.ended, "paused", timings.paused, "playbackRate", timings.playbackRate, "readyState", timings.readyState);
        }
        return timings;
      };
      const returnedSharedReference = reference_default(getCurrentObservation("init"));
      const generateObservationForEvent = (event) => {
        const newObservation = getCurrentObservation(event);
        if (log_default.hasLevel("DEBUG")) {
          log_default.debug("API: current playback timeline:\n" + prettyPrintBuffered(newObservation.buffered, newObservation.position), `
${event}`);
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
      return object_assign_default(getMediaInfos(this._mediaElement, "init"), {
        rebuffering: null,
        freezing: null,
        internalSeeking: false
      });
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

  // src/main/main.js
  var videoUrl = "https://www.bok.net/dash/tears_of_steel/cleartext/stream.mpd";
  var workerUrl = "http://localhost:8080/src/test/worker.js";
  var videoElementRef = document.getElementsByTagName("video")[0];
  function serializeTimeRanges(timeranges) {
    const length = timeranges.length;
    const tr = [];
    for (let i = 0; i < length; i++) {
      tr.push([timeranges.start(i), timeranges.end(i)]);
    }
    return tr;
  }
  function loadVideo(mpd, videoElement) {
    console.log(mpd);
    const worker = new Worker(workerUrl);
    worker.onerror = console.error;
    worker.onmessage = (msg) => {
      if (msg.data.topic === "objectHandle" && msg.data.arg !== "") {
        console.log(msg.data.arg);
        videoElement.srcObject = msg.data.arg;
        const playbackObserver = new PlaybackObserver(videoElement, {
          lowLatencyMode: false,
          withMediaSource: true
        });
        playbackObserver.listen((ob) => {
          ob.buffered = serializeTimeRanges(ob.buffered);
          worker.postMessage({ topic: "playback", observation: ob });
        });
      } else {
        console.error(msg);
      }
    };
    worker.postMessage({
      mpd,
      topic: "mpd"
    });
  }
  loadVideo(videoUrl, videoElementRef);
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
