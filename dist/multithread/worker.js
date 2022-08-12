(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
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
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target, mod));

  // <define:__ENVIRONMENT__>
  var PRODUCTION, DEV, CURRENT_ENV, define_ENVIRONMENT_default;
  var init_define_ENVIRONMENT = __esm({
    "<define:__ENVIRONMENT__>"() {
      PRODUCTION = 0;
      DEV = 1;
      CURRENT_ENV = 1;
      define_ENVIRONMENT_default = { PRODUCTION, DEV, CURRENT_ENV };
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
      var byObserver = function(Observer3) {
        var node = document.createTextNode(""), queue, currentQueue, i = 0;
        new Observer3(function() {
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

  // src/worker/index.ts
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
    function Subscription4(initialTeardown) {
      this.initialTeardown = initialTeardown;
      this.closed = false;
      this._parentage = null;
      this._teardowns = null;
    }
    Subscription4.prototype.unsubscribe = function() {
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
    Subscription4.prototype.add = function(teardown) {
      var _a;
      if (teardown && teardown !== this) {
        if (this.closed) {
          execTeardown(teardown);
        } else {
          if (teardown instanceof Subscription4) {
            if (teardown.closed || teardown._hasParent(this)) {
              return;
            }
            teardown._addParent(this);
          }
          (this._teardowns = (_a = this._teardowns) !== null && _a !== void 0 ? _a : []).push(teardown);
        }
      }
    };
    Subscription4.prototype._hasParent = function(parent) {
      var _parentage = this._parentage;
      return _parentage === parent || Array.isArray(_parentage) && _parentage.includes(parent);
    };
    Subscription4.prototype._addParent = function(parent) {
      var _parentage = this._parentage;
      this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
    };
    Subscription4.prototype._removeParent = function(parent) {
      var _parentage = this._parentage;
      if (_parentage === parent) {
        this._parentage = null;
      } else if (Array.isArray(_parentage)) {
        arrRemove(_parentage, parent);
      }
    };
    Subscription4.prototype.remove = function(teardown) {
      var _teardowns = this._teardowns;
      _teardowns && arrRemove(_teardowns, teardown);
      if (teardown instanceof Subscription4) {
        teardown._removeParent(this);
      }
    };
    Subscription4.EMPTY = function() {
      var empty = new Subscription4();
      empty.closed = true;
      return empty;
    }();
    return Subscription4;
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
    __extends(Subscriber4, _super);
    function Subscriber4(destination) {
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
    Subscriber4.create = function(next, error, complete) {
      return new SafeSubscriber(next, error, complete);
    };
    Subscriber4.prototype.next = function(value) {
      if (this.isStopped) {
        handleStoppedNotification(nextNotification(value), this);
      } else {
        this._next(value);
      }
    };
    Subscriber4.prototype.error = function(err) {
      if (this.isStopped) {
        handleStoppedNotification(errorNotification(err), this);
      } else {
        this.isStopped = true;
        this._error(err);
      }
    };
    Subscriber4.prototype.complete = function() {
      if (this.isStopped) {
        handleStoppedNotification(COMPLETE_NOTIFICATION, this);
      } else {
        this.isStopped = true;
        this._complete();
      }
    };
    Subscriber4.prototype.unsubscribe = function() {
      if (!this.closed) {
        this.isStopped = true;
        _super.prototype.unsubscribe.call(this);
        this.destination = null;
      }
    };
    Subscriber4.prototype._next = function(value) {
      this.destination.next(value);
    };
    Subscriber4.prototype._error = function(err) {
      try {
        this.destination.error(err);
      } finally {
        this.unsubscribe();
      }
    };
    Subscriber4.prototype._complete = function() {
      try {
        this.destination.complete();
      } finally {
        this.unsubscribe();
      }
    };
    return Subscriber4;
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
    function Observable22(subscribe) {
      if (subscribe) {
        this._subscribe = subscribe;
      }
    }
    Observable22.prototype.lift = function(operator) {
      var observable2 = new Observable22();
      observable2.source = this;
      observable2.operator = operator;
      return observable2;
    };
    Observable22.prototype.subscribe = function(observerOrNext, error, complete) {
      var _this = this;
      var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new SafeSubscriber(observerOrNext, error, complete);
      errorContext(function() {
        var _a = _this, operator = _a.operator, source = _a.source;
        subscriber.add(operator ? operator.call(subscriber, source) : source ? _this._subscribe(subscriber) : _this._trySubscribe(subscriber));
      });
      return subscriber;
    };
    Observable22.prototype._trySubscribe = function(sink) {
      try {
        return this._subscribe(sink);
      } catch (err) {
        sink.error(err);
      }
    };
    Observable22.prototype.forEach = function(next, promiseCtor) {
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
    Observable22.prototype._subscribe = function(subscriber) {
      var _a;
      return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
    };
    Observable22.prototype[observable] = function() {
      return this;
    };
    Observable22.prototype.pipe = function() {
      var operations = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        operations[_i] = arguments[_i];
      }
      return pipeFromArray(operations)(this);
    };
    Observable22.prototype.toPromise = function(promiseCtor) {
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
    Observable22.create = function(subscribe) {
      return new Observable22(subscribe);
    };
    return Observable22;
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

  // node_modules/rxjs/dist/esm5/internal/scheduler/asap.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/scheduler/AsapAction.js
  init_define_ENVIRONMENT();

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

  // node_modules/rxjs/dist/esm5/internal/scheduler/immediateProvider.js
  init_define_ENVIRONMENT();

  // node_modules/rxjs/dist/esm5/internal/util/Immediate.js
  init_define_ENVIRONMENT();
  var nextHandle = 1;
  var resolved;
  var activeHandles = {};
  function findAndClearHandle(handle) {
    if (handle in activeHandles) {
      delete activeHandles[handle];
      return true;
    }
    return false;
  }
  var Immediate = {
    setImmediate: function(cb) {
      var handle = nextHandle++;
      activeHandles[handle] = true;
      if (!resolved) {
        resolved = Promise.resolve();
      }
      resolved.then(function() {
        return findAndClearHandle(handle) && cb();
      });
      return handle;
    },
    clearImmediate: function(handle) {
      findAndClearHandle(handle);
    }
  };

  // node_modules/rxjs/dist/esm5/internal/scheduler/immediateProvider.js
  var setImmediate2 = Immediate.setImmediate;
  var clearImmediate = Immediate.clearImmediate;
  var immediateProvider = {
    setImmediate: function() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      var delegate = immediateProvider.delegate;
      return ((delegate === null || delegate === void 0 ? void 0 : delegate.setImmediate) || setImmediate2).apply(void 0, __spreadArray([], __read(args)));
    },
    clearImmediate: function(handle) {
      var delegate = immediateProvider.delegate;
      return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearImmediate) || clearImmediate)(handle);
    },
    delegate: void 0
  };

  // node_modules/rxjs/dist/esm5/internal/scheduler/AsapAction.js
  var AsapAction = function(_super) {
    __extends(AsapAction2, _super);
    function AsapAction2(scheduler, work) {
      var _this = _super.call(this, scheduler, work) || this;
      _this.scheduler = scheduler;
      _this.work = work;
      return _this;
    }
    AsapAction2.prototype.requestAsyncId = function(scheduler, id, delay) {
      if (delay === void 0) {
        delay = 0;
      }
      if (delay !== null && delay > 0) {
        return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
      }
      scheduler.actions.push(this);
      return scheduler._scheduled || (scheduler._scheduled = immediateProvider.setImmediate(scheduler.flush.bind(scheduler, void 0)));
    };
    AsapAction2.prototype.recycleAsyncId = function(scheduler, id, delay) {
      if (delay === void 0) {
        delay = 0;
      }
      if (delay != null && delay > 0 || delay == null && this.delay > 0) {
        return _super.prototype.recycleAsyncId.call(this, scheduler, id, delay);
      }
      if (scheduler.actions.length === 0) {
        immediateProvider.clearImmediate(id);
        scheduler._scheduled = void 0;
      }
      return void 0;
    };
    return AsapAction2;
  }(AsyncAction);

  // node_modules/rxjs/dist/esm5/internal/scheduler/AsapScheduler.js
  init_define_ENVIRONMENT();

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

  // node_modules/rxjs/dist/esm5/internal/scheduler/AsapScheduler.js
  var AsapScheduler = function(_super) {
    __extends(AsapScheduler2, _super);
    function AsapScheduler2() {
      return _super !== null && _super.apply(this, arguments) || this;
    }
    AsapScheduler2.prototype.flush = function(action) {
      this._active = true;
      this._scheduled = void 0;
      var actions = this.actions;
      var error;
      var index = -1;
      action = action || actions.shift();
      var count = actions.length;
      do {
        if (error = action.execute(action.state, action.delay)) {
          break;
        }
      } while (++index < count && (action = actions.shift()));
      this._active = false;
      if (error) {
        while (++index < count && (action = actions.shift())) {
          action.unsubscribe();
        }
        throw error;
      }
    };
    return AsapScheduler2;
  }(AsyncScheduler);

  // node_modules/rxjs/dist/esm5/internal/scheduler/asap.js
  var asapScheduler = new AsapScheduler(AsapAction);

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

  // node_modules/rxjs/dist/esm5/internal/util/isDate.js
  init_define_ENVIRONMENT();
  function isValidDate(value) {
    return value instanceof Date && !isNaN(value);
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

  // node_modules/rxjs/dist/esm5/internal/observable/defer.js
  init_define_ENVIRONMENT();
  function defer(observableFactory) {
    return new Observable(function(subscriber) {
      innerFrom(observableFactory()).subscribe(subscriber);
    });
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

  // node_modules/rxjs/dist/esm5/internal/observable/interval.js
  init_define_ENVIRONMENT();

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

  // node_modules/rxjs/dist/esm5/internal/observable/interval.js
  function interval(period, scheduler) {
    if (period === void 0) {
      period = 0;
    }
    if (scheduler === void 0) {
      scheduler = asyncScheduler;
    }
    if (period < 0) {
      period = 0;
    }
    return timer(period, period, scheduler);
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

  // node_modules/rxjs/dist/esm5/internal/util/argsOrArgArray.js
  init_define_ENVIRONMENT();
  var isArray3 = Array.isArray;
  function argsOrArgArray(args) {
    return args.length === 1 && isArray3(args[0]) ? args[0] : args;
  }

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

  // node_modules/rxjs/dist/esm5/internal/observable/race.js
  init_define_ENVIRONMENT();
  function race() {
    var sources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      sources[_i] = arguments[_i];
    }
    sources = argsOrArgArray(sources);
    return sources.length === 1 ? innerFrom(sources[0]) : new Observable(raceInit(sources));
  }
  function raceInit(sources) {
    return function(subscriber) {
      var subscriptions = [];
      var _loop_1 = function(i2) {
        subscriptions.push(innerFrom(sources[i2]).subscribe(new OperatorSubscriber(subscriber, function(value) {
          if (subscriptions) {
            for (var s = 0; s < subscriptions.length; s++) {
              s !== i2 && subscriptions[s].unsubscribe();
            }
            subscriptions = null;
          }
          subscriber.next(value);
        })));
      };
      for (var i = 0; subscriptions && !subscriber.closed && i < sources.length; i++) {
        _loop_1(i);
      }
    };
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

  // node_modules/rxjs/dist/esm5/internal/operators/scanInternals.js
  init_define_ENVIRONMENT();
  function scanInternals(accumulator, seed, hasSeed, emitOnNext, emitBeforeComplete) {
    return function(source, subscriber) {
      var hasState = hasSeed;
      var state = seed;
      var index = 0;
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        var i = index++;
        state = hasState ? accumulator(state, value, i) : (hasState = true, value);
        emitOnNext && subscriber.next(state);
      }, emitBeforeComplete && function() {
        hasState && subscriber.next(state);
        subscriber.complete();
      }));
    };
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

  // node_modules/rxjs/dist/esm5/internal/operators/exhaustMap.js
  init_define_ENVIRONMENT();
  function exhaustMap(project, resultSelector) {
    if (resultSelector) {
      return function(source) {
        return source.pipe(exhaustMap(function(a, i) {
          return innerFrom(project(a, i)).pipe(map(function(b, ii) {
            return resultSelector(a, b, i, ii);
          }));
        }));
      };
    }
    return operate(function(source, subscriber) {
      var index = 0;
      var innerSub = null;
      var isComplete = false;
      source.subscribe(new OperatorSubscriber(subscriber, function(outerValue) {
        if (!innerSub) {
          innerSub = new OperatorSubscriber(subscriber, void 0, function() {
            innerSub = null;
            isComplete && subscriber.complete();
          });
          innerFrom(project(outerValue, index++)).subscribe(innerSub);
        }
      }, function() {
        isComplete = true;
        !innerSub && subscriber.complete();
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/finalize.js
  init_define_ENVIRONMENT();
  function finalize(callback) {
    return operate(function(source, subscriber) {
      try {
        source.subscribe(subscriber);
      } finally {
        subscriber.add(callback);
      }
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/takeLast.js
  init_define_ENVIRONMENT();
  function takeLast(count) {
    return count <= 0 ? function() {
      return EMPTY;
    } : operate(function(source, subscriber) {
      var buffer = [];
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        buffer.push(value);
        count < buffer.length && buffer.shift();
      }, function() {
        var e_1, _a;
        try {
          for (var buffer_1 = __values(buffer), buffer_1_1 = buffer_1.next(); !buffer_1_1.done; buffer_1_1 = buffer_1.next()) {
            var value = buffer_1_1.value;
            subscriber.next(value);
          }
        } catch (e_1_1) {
          e_1 = { error: e_1_1 };
        } finally {
          try {
            if (buffer_1_1 && !buffer_1_1.done && (_a = buffer_1.return))
              _a.call(buffer_1);
          } finally {
            if (e_1)
              throw e_1.error;
          }
        }
        subscriber.complete();
      }, void 0, function() {
        buffer = null;
      }));
    });
  }

  // node_modules/rxjs/dist/esm5/internal/operators/scan.js
  init_define_ENVIRONMENT();
  function scan(accumulator, seed) {
    return operate(scanInternals(accumulator, seed, arguments.length >= 2, true));
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

  // node_modules/rxjs/dist/esm5/internal/operators/takeWhile.js
  init_define_ENVIRONMENT();
  function takeWhile(predicate, inclusive) {
    if (inclusive === void 0) {
      inclusive = false;
    }
    return operate(function(source, subscriber) {
      var index = 0;
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        var result = predicate(value, index++);
        (result || inclusive) && subscriber.next(value);
        !result && subscriber.complete();
      }));
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

  // node_modules/rxjs/dist/esm5/internal/operators/withLatestFrom.js
  init_define_ENVIRONMENT();
  function withLatestFrom() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      inputs[_i] = arguments[_i];
    }
    var project = popResultSelector(inputs);
    return operate(function(source, subscriber) {
      var len = inputs.length;
      var otherValues = new Array(len);
      var hasValue = inputs.map(function() {
        return false;
      });
      var ready = false;
      var _loop_1 = function(i2) {
        innerFrom(inputs[i2]).subscribe(new OperatorSubscriber(subscriber, function(value) {
          otherValues[i2] = value;
          if (!ready && !hasValue[i2]) {
            hasValue[i2] = true;
            (ready = hasValue.every(identity)) && (hasValue = null);
          }
        }, noop));
      };
      for (var i = 0; i < len; i++) {
        _loop_1(i);
      }
      source.subscribe(new OperatorSubscriber(subscriber, function(value) {
        if (ready) {
          var values = __spreadArray([value], __read(otherValues));
          subscriber.next(project ? project.apply(void 0, __spreadArray([], __read(values))) : values);
        }
      }));
    });
  }

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

  // src/common/errors/custom_loader_error.ts
  init_define_ENVIRONMENT();
  var CustomLoaderError = class extends Error {
    name;
    message;
    canRetry;
    isOfflineError;
    xhr;
    constructor(message, canRetry, isOfflineError, xhr) {
      super();
      Object.setPrototypeOf(this, CustomLoaderError.prototype);
      this.name = "CustomLoaderError";
      this.message = message;
      this.canRetry = canRetry;
      this.isOfflineError = isOfflineError;
      this.xhr = xhr;
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

  // src/common/utils/reference.ts
  init_define_ENVIRONMENT();
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
  var reference_default = createSharedReference;

  // src/common/utils/task_canceller.ts
  init_define_ENVIRONMENT();

  // src/common/utils/assert.ts
  init_define_ENVIRONMENT();

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

  // src/worker/content_time_boundaries_observer.ts
  init_define_ENVIRONMENT();

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
  function fromEvent2(target, eventName) {
    return new Observable((obs) => {
      function handler(event) {
        obs.next(event);
      }
      target.addEventListener(eventName, handler);
      return () => {
        target.removeEventListener(eventName, handler);
      };
    });
  }

  // src/common/utils/filter_map.ts
  init_define_ENVIRONMENT();
  function filterMap(callback, filteringToken) {
    return (source) => defer(() => {
      return source.pipe(map(callback), filter((x) => x !== filteringToken));
    });
  }

  // src/worker/content_time_boundaries_observer.ts
  function ContentTimeBoundariesObserver(manifest, streams, playbackObserver2) {
    const maximumPositionCalculator = new MaximumPositionCalculator(manifest);
    const outOfManifest$ = playbackObserver2.getReference().asObservable().pipe(filterMap(({ position }) => {
      const wantedPosition = position.pending ?? position.last;
      if (wantedPosition < manifest.getMinimumSafePosition()) {
        const warning = new MediaError("MEDIA_TIME_BEFORE_MANIFEST", "The current position is behind the earliest time announced in the Manifest.");
        return { type: "warning", value: warning };
      } else if (wantedPosition > maximumPositionCalculator.getCurrentMaximumPosition()) {
        const warning = new MediaError("MEDIA_TIME_AFTER_MANIFEST", "The current position is after the latest time announced in the Manifest.");
        return { type: "warning", value: warning };
      }
      return null;
    }, null));
    const contentDuration = reference_default(void 0);
    const updateDurationOnManifestUpdate$ = fromEvent2(manifest, "manifestUpdate").pipe(startWith(null), tap(() => {
      if (!manifest.isDynamic) {
        const maxPos = maximumPositionCalculator.getCurrentMaximumPosition();
        contentDuration.setValue(maxPos);
      } else {
        contentDuration.setValue(void 0);
      }
    }), ignoreElements());
    const updateDurationAndTimeBoundsOnTrackChange$ = streams.pipe(tap((message) => {
      if (message.type === "adaptationChange") {
        const lastPeriod = manifest.periods[manifest.periods.length - 1];
        if (message.value.period.id === lastPeriod?.id) {
          if (message.value.type === "audio") {
            maximumPositionCalculator.updateLastAudioAdaptation(message.value.adaptation);
            if (!manifest.isDynamic) {
              contentDuration.setValue(maximumPositionCalculator.getCurrentMaximumPosition());
            }
          } else if (message.value.type === "video") {
            maximumPositionCalculator.updateLastVideoAdaptation(message.value.adaptation);
            if (!manifest.isDynamic) {
              contentDuration.setValue(maximumPositionCalculator.getCurrentMaximumPosition());
            }
          }
        }
      }
    }), ignoreElements());
    return merge(updateDurationOnManifestUpdate$, updateDurationAndTimeBoundsOnTrackChange$, outOfManifest$, contentDuration.asObservable().pipe(skipWhile((val) => val === void 0), distinctUntilChanged(), map((value) => ({ type: "contentDurationUpdate", value }))));
  }
  var MaximumPositionCalculator = class {
    _manifest;
    _lastAudioAdaptation;
    _lastVideoAdaptation;
    constructor(manifest) {
      this._manifest = manifest;
      this._lastAudioAdaptation = void 0;
      this._lastVideoAdaptation = void 0;
    }
    updateLastAudioAdaptation(adaptation) {
      this._lastAudioAdaptation = adaptation;
    }
    updateLastVideoAdaptation(adaptation) {
      this._lastVideoAdaptation = adaptation;
    }
    getCurrentMaximumPosition() {
      if (this._manifest.isDynamic) {
        return this._manifest.getLivePosition() ?? this._manifest.getMaximumSafePosition();
      }
      if (this._lastVideoAdaptation === void 0 || this._lastAudioAdaptation === void 0) {
        return this._manifest.getMaximumSafePosition();
      } else if (this._lastAudioAdaptation === null) {
        if (this._lastVideoAdaptation === null) {
          return this._manifest.getMaximumSafePosition();
        } else {
          const lastVideoPosition = getLastPositionFromAdaptation(this._lastVideoAdaptation);
          if (typeof lastVideoPosition !== "number") {
            return this._manifest.getMaximumSafePosition();
          }
          return lastVideoPosition;
        }
      } else if (this._lastVideoAdaptation === null) {
        const lastAudioPosition = getLastPositionFromAdaptation(this._lastAudioAdaptation);
        if (typeof lastAudioPosition !== "number") {
          return this._manifest.getMaximumSafePosition();
        }
        return lastAudioPosition;
      } else {
        const lastAudioPosition = getLastPositionFromAdaptation(this._lastAudioAdaptation);
        const lastVideoPosition = getLastPositionFromAdaptation(this._lastVideoAdaptation);
        if (typeof lastAudioPosition !== "number" || typeof lastVideoPosition !== "number") {
          return this._manifest.getMaximumSafePosition();
        } else {
          return Math.min(lastAudioPosition, lastVideoPosition);
        }
      }
    }
  };
  function getLastPositionFromAdaptation(adaptation) {
    const { representations } = adaptation;
    let min = null;
    let lastIndex;
    for (let i = 0; i < representations.length; i++) {
      if (representations[i].index !== lastIndex) {
        lastIndex = representations[i].index;
        const lastPosition = representations[i].index.getLastPosition();
        if (lastPosition === void 0) {
          return void 0;
        }
        if (lastPosition !== null) {
          min = min == null ? lastPosition : Math.min(min, lastPosition);
        }
      }
    }
    if (min === null) {
      return null;
    }
    return min;
  }

  // src/worker/core/fetchers/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/fetchers/manifest/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/fetchers/manifest/manifest_fetcher.ts
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

  // src/worker/core/fetchers/utils/error_selector.ts
  init_define_ENVIRONMENT();
  function errorSelector(error) {
    if (error instanceof RequestError) {
      return new NetworkError("PIPELINE_LOAD_ERROR", error);
    }
    return formatError(error, {
      defaultCode: "PIPELINE_LOAD_ERROR",
      defaultReason: "Unknown error when fetching the Manifest"
    });
  }

  // src/worker/core/fetchers/utils/try_urls_with_backoff.ts
  init_define_ENVIRONMENT();

  // src/common/utils/cancellable_sleep.ts
  init_define_ENVIRONMENT();
  function cancellableSleep(delay, cancellationSignal) {
    return new Promise((res, rej) => {
      const timeout = setTimeout(() => {
        unregisterCancelSignal();
        res();
      }, delay);
      const unregisterCancelSignal = cancellationSignal.register(function onCancel(cancellationError) {
        clearTimeout(timeout);
        rej(cancellationError);
      });
    });
  }

  // src/common/utils/get_fuzzed_delay.ts
  init_define_ENVIRONMENT();
  var FUZZ_FACTOR = 0.3;
  function getFuzzedDelay(retryDelay) {
    const fuzzingFactor = (Math.random() * 2 - 1) * FUZZ_FACTOR;
    return retryDelay * (fuzzingFactor + 1);
  }

  // src/worker/compat/index.ts
  init_define_ENVIRONMENT();

  // src/worker/compat/is_node.ts
  init_define_ENVIRONMENT();
  var isNode = typeof window === "undefined";
  var is_node_default = isNode;

  // src/worker/compat/change_source_buffer_type.ts
  init_define_ENVIRONMENT();
  function tryToChangeSourceBufferType(sourceBuffer, codec) {
    if (typeof sourceBuffer.changeType === "function") {
      try {
        sourceBuffer.changeType(codec);
      } catch (e) {
        log_default.warn("Could not call 'changeType' on the given SourceBuffer:", e instanceof Error ? e : "");
        return false;
      }
      return true;
    }
    return false;
  }

  // src/worker/compat/event_listeners.ts
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

  // src/worker/compat/should_favour_custom_safari_EME.ts
  init_define_ENVIRONMENT();
  function shouldFavourCustomSafariEME() {
    return false;
  }

  // src/worker/compat/event_listeners.ts
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
      if (typeof HTMLElement === "object" && element instanceof HTMLElement) {
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
    isDocVisibleRef.onUpdate(checkCurrentVisibility, { clearSignal: stopListening });
    pipStatus.onUpdate(checkCurrentVisibility, { clearSignal: stopListening });
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
    const interval2 = window.setInterval(checkVideoWidth, 2e4);
    checkVideoWidth();
    stopListening.register(function stopUpdatingVideoWidthRef() {
      clearPreviousEventListener();
      clearInterval(interval2);
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
          ref.setValueIfChanged(getVideoWidthFromPIPWindow(mediaElement, pipWindow) * pixelRatio);
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
  var onFullscreenChange$ = compatibleListener(["fullscreenchange", "FullscreenChange"], BROWSER_PREFIXES.concat("MS"));
  var onTextTrackChanges$ = (textTrackList) => merge(compatibleListener(["addtrack"])(textTrackList), compatibleListener(["removetrack"])(textTrackList));
  var onSourceOpen$ = compatibleListener(["sourceopen", "webkitsourceopen"]);
  var onSourceClose$ = compatibleListener(["sourceclose", "webkitsourceclose"]);
  var onSourceEnded$ = compatibleListener(["sourceended", "webkitsourceended"]);
  var onUpdate$ = compatibleListener(["update"]);
  var onRemoveSourceBuffers$ = compatibleListener(["onremovesourcebuffer"]);
  var onEncrypted$ = compatibleListener(shouldFavourCustomSafariEME() ? ["needkey"] : ["encrypted", "needkey"]);
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

  // src/worker/compat/is_codec_supported.ts
  init_define_ENVIRONMENT();
  function isCodecSupported(mimeType) {
    return MediaSource.isTypeSupported(mimeType);
  }

  // src/worker/compat/is_offline.ts
  init_define_ENVIRONMENT();
  function isOffline() {
    return navigator.onLine === false;
  }

  // src/worker/compat/patch_webkit_source_buffer.ts
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

  // src/worker/compat/index.ts
  patchWebkitSourceBuffer();

  // src/worker/core/fetchers/utils/try_urls_with_backoff.ts
  function shouldRetry(error) {
    if (error instanceof RequestError) {
      if (error.type === NetworkErrorTypes.ERROR_HTTP_CODE) {
        return error.status >= 500 || error.status === 404 || error.status === 415 || error.status === 412;
      }
      return error.type === NetworkErrorTypes.TIMEOUT || error.type === NetworkErrorTypes.ERROR_EVENT;
    } else if (error instanceof CustomLoaderError) {
      if (typeof error.canRetry === "boolean") {
        return error.canRetry;
      }
      if (error.xhr !== void 0) {
        return error.xhr.status >= 500 || error.xhr.status === 404 || error.xhr.status === 415 || error.xhr.status === 412;
      }
      return false;
    }
    return isKnownError(error) && error.code === "INTEGRITY_ERROR";
  }
  function isOfflineRequestError(error) {
    if (error instanceof RequestError) {
      return error.type === NetworkErrorTypes.ERROR_EVENT && isOffline();
    } else if (error instanceof CustomLoaderError) {
      return error.isOfflineError;
    }
    return false;
  }
  function getRequestErrorType(error) {
    return isOfflineRequestError(error) ? 2 /* Offline */ : 1 /* Regular */;
  }
  function tryURLsWithBackoff(urls, performRequest, options, cancellationSignal) {
    if (cancellationSignal.isCancelled) {
      return Promise.reject(cancellationSignal.cancellationError);
    }
    const {
      baseDelay,
      maxDelay,
      maxRetryRegular,
      maxRetryOffline,
      onRetry
    } = options;
    let retryCount = 0;
    let lastError = 0 /* None */;
    const urlsToTry = urls.slice();
    if (urlsToTry.length === 0) {
      log_default.warn("Fetchers: no URL given to `tryURLsWithBackoff`.");
      return Promise.reject(new Error("No URL to request"));
    }
    return tryURLsRecursively(urlsToTry[0], 0);
    async function tryURLsRecursively(url, index) {
      try {
        const res = await performRequest(url, cancellationSignal);
        return res;
      } catch (error) {
        if (TaskCanceller.isCancellationError(error)) {
          throw error;
        }
        if (!shouldRetry(error)) {
          if (urlsToTry.length <= 1) {
            throw error;
          }
          urlsToTry.splice(index, 1);
          const newIndex = index >= urlsToTry.length - 1 ? 0 : index;
          onRetry(error);
          if (cancellationSignal.isCancelled) {
            throw cancellationSignal.cancellationError;
          }
          return tryURLsRecursively(urlsToTry[newIndex], newIndex);
        }
        const currentError = getRequestErrorType(error);
        const maxRetry = currentError === 2 /* Offline */ ? maxRetryOffline : maxRetryRegular;
        if (currentError !== lastError) {
          retryCount = 0;
          lastError = currentError;
        }
        if (index < urlsToTry.length - 1) {
          const newIndex = index + 1;
          onRetry(error);
          if (cancellationSignal.isCancelled) {
            throw cancellationSignal.cancellationError;
          }
          return tryURLsRecursively(urlsToTry[newIndex], newIndex);
        }
        retryCount++;
        if (retryCount > maxRetry) {
          throw error;
        }
        const delay = Math.min(baseDelay * Math.pow(2, retryCount - 1), maxDelay);
        const fuzzedDelay = getFuzzedDelay(delay);
        const nextURL = urlsToTry[0];
        onRetry(error);
        if (cancellationSignal.isCancelled) {
          throw cancellationSignal.cancellationError;
        }
        await cancellableSleep(fuzzedDelay, cancellationSignal);
        return tryURLsRecursively(nextURL, 0);
      }
    }
  }
  function tryRequestPromiseWithBackoff(performRequest, options, cancellationSignal) {
    return tryURLsWithBackoff([null], performRequest, options, cancellationSignal);
  }

  // src/worker/core/fetchers/manifest/manifest_fetcher.ts
  var ManifestFetcher = class {
    _settings;
    _manifestUrl;
    _pipelines;
    constructor(url, pipelines, settings) {
      this._manifestUrl = url;
      this._pipelines = pipelines.manifest;
      this._settings = settings;
    }
    fetch(url) {
      return new Observable((obs) => {
        const pipelines = this._pipelines;
        const requestUrl = url ?? this._manifestUrl;
        let hasFinishedLoading = false;
        const canceller2 = new TaskCanceller();
        const backoffSettings = this._getBackoffSetting((err) => {
          obs.next({ type: "warning", value: errorSelector(err) });
        });
        const loadingPromise = pipelines.resolveManifestUrl === void 0 ? callLoaderWithRetries(requestUrl) : callResolverWithRetries(requestUrl).then(callLoaderWithRetries);
        loadingPromise.then((response) => {
          hasFinishedLoading = true;
          obs.next({
            type: "response",
            parse: (parserOptions) => {
              return this._parseLoadedManifest(response, parserOptions);
            }
          });
          obs.complete();
        }).catch((err) => {
          if (canceller2.isUsed) {
            return;
          }
          hasFinishedLoading = true;
          obs.error(errorSelector(err));
        });
        return () => {
          if (!hasFinishedLoading) {
            canceller2.cancel();
          }
        };
        function callResolverWithRetries(resolverUrl) {
          const { resolveManifestUrl } = pipelines;
          assert(resolveManifestUrl !== void 0);
          const callResolver = () => resolveManifestUrl(resolverUrl, canceller2.signal);
          return tryRequestPromiseWithBackoff(callResolver, backoffSettings, canceller2.signal);
        }
        function callLoaderWithRetries(manifestUrl) {
          const { loadManifest } = pipelines;
          const callLoader = () => loadManifest(manifestUrl, canceller2.signal);
          return tryRequestPromiseWithBackoff(callLoader, backoffSettings, canceller2.signal);
        }
      });
    }
    parse(manifest, parserOptions) {
      return this._parseLoadedManifest({
        responseData: manifest,
        size: void 0,
        requestDuration: void 0
      }, parserOptions);
    }
    _parseLoadedManifest(loaded, parserOptions) {
      return new Observable((obs) => {
        const parsingTimeStart = performance.now();
        const canceller2 = new TaskCanceller();
        const { sendingTime, receivedTime } = loaded;
        const backoffSettings = this._getBackoffSetting((err) => {
          obs.next({ type: "warning", value: errorSelector(err) });
        });
        const opts = {
          externalClockOffset: parserOptions.externalClockOffset,
          unsafeMode: parserOptions.unsafeMode,
          previousManifest: parserOptions.previousManifest,
          originalUrl: this._manifestUrl
        };
        try {
          const res = this._pipelines.parseManifest(loaded, opts, onWarnings, canceller2.signal, scheduleRequest);
          if (!isPromise2(res)) {
            emitManifestAndComplete(res.manifest);
          } else {
            res.then(({ manifest }) => emitManifestAndComplete(manifest)).catch((err) => {
              if (canceller2.isUsed) {
                return;
              }
              emitError(err, true);
            });
          }
        } catch (err) {
          if (canceller2.isUsed) {
            return void 0;
          }
          emitError(err, true);
        }
        return () => {
          canceller2.cancel();
        };
        async function scheduleRequest(performRequest) {
          try {
            const data = await tryRequestPromiseWithBackoff(performRequest, backoffSettings, canceller2.signal);
            return data;
          } catch (err) {
            throw errorSelector(err);
          }
        }
        function onWarnings(warnings) {
          for (const warning of warnings) {
            if (canceller2.isUsed) {
              return;
            }
            emitError(warning, false);
          }
        }
        function emitManifestAndComplete(manifest) {
          onWarnings(manifest.contentWarnings);
          const parsingTime = performance.now() - parsingTimeStart;
          log_default.info(`MF: Manifest parsed in ${parsingTime}ms`);
          obs.next({
            type: "parsed",
            manifest,
            sendingTime,
            receivedTime,
            parsingTime
          });
          obs.complete();
        }
        function emitError(err, isFatal) {
          const formattedError = formatError(err, {
            defaultCode: "PIPELINE_PARSE_ERROR",
            defaultReason: "Unknown error when parsing the Manifest"
          });
          if (isFatal) {
            obs.error(formattedError);
          } else {
            obs.next({
              type: "warning",
              value: formattedError
            });
          }
        }
      });
    }
    _getBackoffSetting(onRetry) {
      const {
        DEFAULT_MAX_MANIFEST_REQUEST_RETRY,
        DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE,
        INITIAL_BACKOFF_DELAY_BASE,
        MAX_BACKOFF_DELAY_BASE
      } = config_default.getCurrent();
      const {
        lowLatencyMode,
        maxRetryRegular: ogRegular,
        maxRetryOffline: ogOffline
      } = this._settings;
      const baseDelay = lowLatencyMode ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY : INITIAL_BACKOFF_DELAY_BASE.REGULAR;
      const maxDelay = lowLatencyMode ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY : MAX_BACKOFF_DELAY_BASE.REGULAR;
      const maxRetryRegular = ogRegular ?? DEFAULT_MAX_MANIFEST_REQUEST_RETRY;
      const maxRetryOffline = ogOffline ?? DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE;
      return {
        onRetry,
        baseDelay,
        maxDelay,
        maxRetryRegular,
        maxRetryOffline
      };
    }
  };
  function isPromise2(val) {
    return val instanceof Promise;
  }

  // src/worker/core/fetchers/manifest/index.ts
  var manifest_default = ManifestFetcher;

  // src/worker/core/fetchers/segment/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/fetchers/segment/prioritized_segment_fetcher.ts
  init_define_ENVIRONMENT();
  function applyPrioritizerToSegmentFetcher(prioritizer, fetcher) {
    const taskHandlers = /* @__PURE__ */ new WeakMap();
    return {
      createRequest(content, priority = 0) {
        const task = prioritizer.create(fetcher(content), priority);
        const flattenTask = task.pipe(map((evt) => {
          return evt.type === "data" ? evt.value : evt;
        }));
        taskHandlers.set(flattenTask, task);
        return flattenTask;
      },
      updatePriority(observable2, priority) {
        const correspondingTask = taskHandlers.get(observable2);
        if (correspondingTask === void 0) {
          log_default.warn("Fetchers: Cannot update the priority of a request: task not found.");
          return;
        }
        prioritizer.updatePriority(correspondingTask, priority);
      }
    };
  }

  // src/worker/core/fetchers/segment/segment_fetcher.ts
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

  // src/common/utils/id_generator.ts
  init_define_ENVIRONMENT();
  function idGenerator() {
    let prefix = "";
    let currId = -1;
    return function generateNewId() {
      currId++;
      if (currId >= Number.MAX_SAFE_INTEGER) {
        prefix += "0";
        currId = 0;
      }
      return prefix + String(currId);
    };
  }

  // src/common/utils/initialization_segment_cache.ts
  init_define_ENVIRONMENT();
  var InitializationSegmentCache = class {
    _cache;
    constructor() {
      this._cache = /* @__PURE__ */ new WeakMap();
    }
    add({
      representation,
      segment
    }, response) {
      if (segment.isInit) {
        this._cache.set(representation, response);
      }
    }
    get({
      representation,
      segment
    }) {
      if (segment.isInit) {
        const value = this._cache.get(representation);
        if (value !== void 0) {
          return value;
        }
      }
      return null;
    }
  };
  var initialization_segment_cache_default = InitializationSegmentCache;

  // src/worker/manifest/index.ts
  init_define_ENVIRONMENT();

  // src/worker/manifest/adaptation.ts
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
  var normalize_default = normalizeLanguage;

  // src/common/utils/languages/index.ts
  var languages_default = normalize_default;

  // src/common/utils/uniq.ts
  init_define_ENVIRONMENT();
  function uniqFromFilter(arr) {
    return arr.filter((val, i, self2) => self2.indexOf(val) === i);
  }
  function uniqFromSet(arr) {
    return Array.from(new Set(arr));
  }
  var uniq_default = typeof window !== "undefined" && typeof window.Set === "function" && typeof Array.from === "function" ? uniqFromSet : uniqFromFilter;

  // src/worker/manifest/representation.ts
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

  // src/worker/manifest/representation.ts
  var Representation = class {
    id;
    index;
    bitrate;
    frameRate;
    codec;
    mimeType;
    width;
    height;
    contentProtections;
    hdrInfo;
    decipherable;
    isSupported;
    constructor(args, opts) {
      this.id = args.id;
      this.bitrate = args.bitrate;
      this.codec = args.codecs;
      if (args.height !== void 0) {
        this.height = args.height;
      }
      if (args.width !== void 0) {
        this.width = args.width;
      }
      if (args.mimeType !== void 0) {
        this.mimeType = args.mimeType;
      }
      if (args.contentProtections !== void 0) {
        this.contentProtections = args.contentProtections;
      }
      if (args.frameRate !== void 0) {
        this.frameRate = args.frameRate;
      }
      if (args.hdrInfo !== void 0) {
        this.hdrInfo = args.hdrInfo;
      }
      this.index = args.index;
      this.isSupported = opts.type === "audio" || opts.type === "video" ? isCodecSupported(this.getMimeTypeString()) : true;
    }
    getMimeTypeString() {
      return `${this.mimeType ?? ""};codecs="${this.codec ?? ""}"`;
    }
    getEncryptionData(drmSystemId) {
      const allInitData = this.getAllEncryptionData();
      const filtered = [];
      for (let i = 0; i < allInitData.length; i++) {
        let createdObjForType = false;
        const initData = allInitData[i];
        for (let j = 0; j < initData.values.length; j++) {
          if (initData.values[j].systemId.toLowerCase() === drmSystemId.toLowerCase()) {
            if (!createdObjForType) {
              const keyIds = this.contentProtections?.keyIds?.map((val) => val.keyId);
              filtered.push({
                type: initData.type,
                keyIds,
                values: [initData.values[j]]
              });
              createdObjForType = true;
            } else {
              filtered[filtered.length - 1].values.push(initData.values[j]);
            }
          }
        }
      }
      return filtered;
    }
    getAllEncryptionData() {
      if (this.contentProtections === void 0 || this.contentProtections.initData.length === 0) {
        return [];
      }
      const keyIds = this.contentProtections?.keyIds?.map((val) => val.keyId);
      return this.contentProtections.initData.map((x) => {
        return {
          type: x.type,
          keyIds,
          values: x.values
        };
      });
    }
    _addProtectionData(initDataType, keyId, data) {
      let hasUpdatedProtectionData = false;
      if (this.contentProtections === void 0) {
        this.contentProtections = {
          keyIds: keyId !== void 0 ? [{ keyId }] : [],
          initData: [{
            type: initDataType,
            values: data
          }]
        };
        return true;
      }
      if (keyId !== void 0) {
        const keyIds = this.contentProtections.keyIds;
        if (keyIds === void 0) {
          this.contentProtections.keyIds = [{ keyId }];
        } else {
          let foundKeyId = false;
          for (const knownKeyId of keyIds) {
            if (areArraysOfNumbersEqual(knownKeyId.keyId, keyId)) {
              foundKeyId = true;
            }
          }
          if (!foundKeyId) {
            log_default.warn("Manifest: found unanounced key id.");
            keyIds.push({ keyId });
          }
        }
      }
      const cInitData = this.contentProtections.initData;
      for (let i = 0; i < cInitData.length; i++) {
        if (cInitData[i].type === initDataType) {
          const cValues = cInitData[i].values;
          for (let dataI = 0; dataI < data.length; dataI++) {
            const dataToAdd = data[dataI];
            let cValuesIdx;
            for (cValuesIdx = 0; cValuesIdx < cValues.length; cValuesIdx++) {
              if (dataToAdd.systemId === cValues[cValuesIdx].systemId) {
                if (areArraysOfNumbersEqual(dataToAdd.data, cValues[cValuesIdx].data)) {
                  break;
                } else {
                  log_default.warn("Manifest: different init data for the same system ID");
                }
              }
            }
            if (cValuesIdx === cValues.length) {
              cValues.push(dataToAdd);
              hasUpdatedProtectionData = true;
            }
          }
          return hasUpdatedProtectionData;
        }
      }
      this.contentProtections.initData.push({
        type: initDataType,
        values: data
      });
      return true;
    }
  };
  var representation_default = Representation;

  // src/worker/manifest/adaptation.ts
  var SUPPORTED_ADAPTATIONS_TYPE = [
    "audio",
    "video",
    "text",
    "image"
  ];
  var Adaptation = class {
    id;
    representations;
    type;
    isAudioDescription;
    isClosedCaption;
    isSignInterpreted;
    isDub;
    language;
    normalizedLanguage;
    manuallyAdded;
    isSupported;
    isTrickModeTrack;
    label;
    trickModeTracks;
    constructor(parsedAdaptation, options = {}) {
      const { trickModeTracks } = parsedAdaptation;
      const { representationFilter, isManuallyAdded } = options;
      this.id = parsedAdaptation.id;
      this.type = parsedAdaptation.type;
      if (parsedAdaptation.isTrickModeTrack !== void 0) {
        this.isTrickModeTrack = parsedAdaptation.isTrickModeTrack;
      }
      if (parsedAdaptation.language !== void 0) {
        this.language = parsedAdaptation.language;
        this.normalizedLanguage = languages_default(parsedAdaptation.language);
      }
      if (parsedAdaptation.closedCaption !== void 0) {
        this.isClosedCaption = parsedAdaptation.closedCaption;
      }
      if (parsedAdaptation.audioDescription !== void 0) {
        this.isAudioDescription = parsedAdaptation.audioDescription;
      }
      if (parsedAdaptation.isDub !== void 0) {
        this.isDub = parsedAdaptation.isDub;
      }
      if (parsedAdaptation.isSignInterpreted !== void 0) {
        this.isSignInterpreted = parsedAdaptation.isSignInterpreted;
      }
      if (parsedAdaptation.label !== void 0) {
        this.label = parsedAdaptation.label;
      }
      if (trickModeTracks !== void 0 && trickModeTracks.length > 0) {
        this.trickModeTracks = trickModeTracks.map((track) => new Adaptation(track));
      }
      const argsRepresentations = parsedAdaptation.representations;
      const representations = [];
      let isSupported = false;
      for (let i = 0; i < argsRepresentations.length; i++) {
        const representation = new representation_default(argsRepresentations[i], { type: this.type });
        const shouldAdd = isNullOrUndefined(representationFilter) || representationFilter(representation, {
          bufferType: this.type,
          language: this.language,
          normalizedLanguage: this.normalizedLanguage,
          isClosedCaption: this.isClosedCaption,
          isDub: this.isDub,
          isAudioDescription: this.isAudioDescription,
          isSignInterpreted: this.isSignInterpreted
        });
        if (shouldAdd) {
          representations.push(representation);
          if (!isSupported && representation.isSupported) {
            isSupported = true;
          }
        }
      }
      representations.sort((a, b) => a.bitrate - b.bitrate);
      this.representations = representations;
      this.isSupported = isSupported;
      this.manuallyAdded = isManuallyAdded === true;
    }
    getAvailableBitrates() {
      const bitrates = [];
      for (let i = 0; i < this.representations.length; i++) {
        const representation = this.representations[i];
        if (representation.decipherable !== false) {
          bitrates.push(representation.bitrate);
        }
      }
      return uniq_default(bitrates);
    }
    getPlayableRepresentations() {
      return this.representations.filter((rep) => {
        return rep.isSupported && rep.decipherable !== false;
      });
    }
    getRepresentation(wantedId) {
      return arrayFind(this.representations, ({ id }) => wantedId === id);
    }
  };

  // src/worker/manifest/manifest.ts
  init_define_ENVIRONMENT();

  // src/common/utils/warn_once.ts
  init_define_ENVIRONMENT();
  var WARNED_MESSAGES = [];
  function warnOnce(message) {
    if (!arrayIncludes(WARNED_MESSAGES, message)) {
      console.warn(message);
      WARNED_MESSAGES.push(message);
    }
  }

  // src/worker/manifest/period.ts
  init_define_ENVIRONMENT();

  // src/common/utils/object_values.ts
  init_define_ENVIRONMENT();
  function objectValues(o) {
    return Object.keys(o).map((k) => o[k]);
  }
  var object_values_default = typeof Object.values === "function" ? Object.values : objectValues;

  // src/worker/manifest/period.ts
  var Period = class {
    id;
    adaptations;
    start;
    duration;
    end;
    contentWarnings;
    streamEvents;
    constructor(args, representationFilter) {
      this.contentWarnings = [];
      this.id = args.id;
      this.adaptations = Object.keys(args.adaptations).reduce((acc, type) => {
        const adaptationsForType = args.adaptations[type];
        if (adaptationsForType == null) {
          return acc;
        }
        const filteredAdaptations = adaptationsForType.map((adaptation) => {
          const newAdaptation = new Adaptation(adaptation, { representationFilter });
          if (newAdaptation.representations.length > 0 && !newAdaptation.isSupported) {
            const error = new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "An Adaptation contains only incompatible codecs.");
            this.contentWarnings.push(error);
          }
          return newAdaptation;
        }).filter((adaptation) => adaptation.representations.length > 0);
        if (filteredAdaptations.every((adaptation) => !adaptation.isSupported) && adaptationsForType.length > 0 && (type === "video" || type === "audio")) {
          throw new MediaError("MANIFEST_PARSE_ERROR", "No supported " + type + " adaptations");
        }
        if (filteredAdaptations.length > 0) {
          acc[type] = filteredAdaptations;
        }
        return acc;
      }, {});
      if (!Array.isArray(this.adaptations.video) && !Array.isArray(this.adaptations.audio)) {
        throw new MediaError("MANIFEST_PARSE_ERROR", "No supported audio and video tracks.");
      }
      this.duration = args.duration;
      this.start = args.start;
      if (this.duration != null && this.start != null) {
        this.end = this.start + this.duration;
      }
      this.streamEvents = args.streamEvents === void 0 ? [] : args.streamEvents;
    }
    getAdaptations() {
      const adaptationsByType = this.adaptations;
      return object_values_default(adaptationsByType).reduce((acc, adaptations) => adaptations != null ? acc.concat(adaptations) : acc, []);
    }
    getAdaptationsForType(adaptationType) {
      const adaptationsForType = this.adaptations[adaptationType];
      return adaptationsForType == null ? [] : adaptationsForType;
    }
    getAdaptation(wantedId) {
      return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
    }
    getSupportedAdaptations(type) {
      if (type === void 0) {
        return this.getAdaptations().filter((ada) => {
          return ada.isSupported;
        });
      }
      const adaptationsForType = this.adaptations[type];
      if (adaptationsForType === void 0) {
        return [];
      }
      return adaptationsForType.filter((ada) => {
        return ada.isSupported;
      });
    }
    containsTime(time) {
      return time >= this.start && (this.end === void 0 || time < this.end);
    }
  };

  // src/worker/manifest/representation_index/index.ts
  init_define_ENVIRONMENT();

  // src/worker/manifest/representation_index/static.ts
  init_define_ENVIRONMENT();
  var StaticRepresentationIndex = class {
    _mediaURLs;
    constructor(infos) {
      this._mediaURLs = infos.media;
    }
    getInitSegment() {
      return null;
    }
    getSegments() {
      return [{
        id: "0",
        isInit: false,
        number: 0,
        mediaURLs: [this._mediaURLs],
        time: 0,
        end: Number.MAX_VALUE,
        duration: Number.MAX_VALUE,
        complete: true,
        privateInfos: {},
        timescale: 1
      }];
    }
    getFirstPosition() {
      return;
    }
    getLastPosition() {
      return;
    }
    shouldRefresh() {
      return false;
    }
    checkDiscontinuity() {
      return null;
    }
    areSegmentsChronologicallyGenerated() {
      return true;
    }
    isSegmentStillAvailable() {
      return true;
    }
    canBeOutOfSyncError() {
      return false;
    }
    isFinished() {
      return true;
    }
    isInitialized() {
      return true;
    }
    _replace() {
      log_default.warn("Tried to replace a static RepresentationIndex");
    }
    _update() {
      log_default.warn("Tried to update a static RepresentationIndex");
    }
  };

  // src/worker/manifest/update_periods.ts
  init_define_ENVIRONMENT();

  // src/common/utils/array_find_index.ts
  init_define_ENVIRONMENT();
  function arrayFindIndex(arr, predicate, thisArg) {
    if (typeof Array.prototype.findIndex === "function") {
      return arr.findIndex(predicate, thisArg);
    }
    const len = arr.length >>> 0;
    for (let i = 0; i < len; i++) {
      if (predicate.call(thisArg, arr[i], i, arr)) {
        return i;
      }
    }
    return -1;
  }

  // src/worker/manifest/update_period_in_place.ts
  init_define_ENVIRONMENT();
  function updatePeriodInPlace(oldPeriod, newPeriod, updateType) {
    oldPeriod.start = newPeriod.start;
    oldPeriod.end = newPeriod.end;
    oldPeriod.duration = newPeriod.duration;
    oldPeriod.streamEvents = newPeriod.streamEvents;
    const oldAdaptations = oldPeriod.getAdaptations();
    const newAdaptations = newPeriod.getAdaptations();
    for (let j = 0; j < oldAdaptations.length; j++) {
      const oldAdaptation = oldAdaptations[j];
      const newAdaptation = arrayFind(newAdaptations, (a) => a.id === oldAdaptation.id);
      if (newAdaptation === void 0) {
        log_default.warn('Manifest: Adaptation "' + oldAdaptations[j].id + '" not found when merging.');
      } else {
        const oldRepresentations = oldAdaptations[j].representations;
        const newRepresentations = newAdaptation.representations;
        for (let k = 0; k < oldRepresentations.length; k++) {
          const oldRepresentation = oldRepresentations[k];
          const newRepresentation = arrayFind(newRepresentations, (representation) => representation.id === oldRepresentation.id);
          if (newRepresentation === void 0) {
            log_default.warn(`Manifest: Representation "${oldRepresentations[k].id}" not found when merging.`);
          } else {
            if (updateType === 0 /* Full */) {
              oldRepresentation.index._replace(newRepresentation.index);
            } else {
              oldRepresentation.index._update(newRepresentation.index);
            }
          }
        }
      }
    }
  }

  // src/worker/manifest/update_periods.ts
  function replacePeriods(oldPeriods, newPeriods) {
    let firstUnhandledPeriodIdx = 0;
    for (let i = 0; i < newPeriods.length; i++) {
      const newPeriod = newPeriods[i];
      let j = firstUnhandledPeriodIdx;
      let oldPeriod = oldPeriods[j];
      while (oldPeriod != null && oldPeriod.id !== newPeriod.id) {
        j++;
        oldPeriod = oldPeriods[j];
      }
      if (oldPeriod != null) {
        updatePeriodInPlace(oldPeriod, newPeriod, 0 /* Full */);
        const periodsToInclude = newPeriods.slice(firstUnhandledPeriodIdx, i);
        const nbrOfPeriodsToRemove = j - firstUnhandledPeriodIdx;
        oldPeriods.splice(firstUnhandledPeriodIdx, nbrOfPeriodsToRemove, ...periodsToInclude);
        firstUnhandledPeriodIdx = i + 1;
      }
    }
    if (firstUnhandledPeriodIdx > oldPeriods.length) {
      log_default.error("Manifest: error when updating Periods");
      return;
    }
    if (firstUnhandledPeriodIdx < oldPeriods.length) {
      oldPeriods.splice(firstUnhandledPeriodIdx, oldPeriods.length - firstUnhandledPeriodIdx);
    }
    const remainingNewPeriods = newPeriods.slice(firstUnhandledPeriodIdx, newPeriods.length);
    if (remainingNewPeriods.length > 0) {
      oldPeriods.push(...remainingNewPeriods);
    }
  }
  function updatePeriods(oldPeriods, newPeriods) {
    if (oldPeriods.length === 0) {
      oldPeriods.splice(0, 0, ...newPeriods);
      return;
    }
    if (newPeriods.length === 0) {
      return;
    }
    const oldLastPeriod = oldPeriods[oldPeriods.length - 1];
    if (oldLastPeriod.start < newPeriods[0].start) {
      if (oldLastPeriod.end !== newPeriods[0].start) {
        throw new MediaError("MANIFEST_UPDATE_ERROR", "Cannot perform partial update: not enough data");
      }
      oldPeriods.push(...newPeriods);
      return;
    }
    const indexOfNewFirstPeriod = arrayFindIndex(oldPeriods, ({ id }) => id === newPeriods[0].id);
    if (indexOfNewFirstPeriod < 0) {
      throw new MediaError("MANIFEST_UPDATE_ERROR", "Cannot perform partial update: incoherent data");
    }
    updatePeriodInPlace(oldPeriods[indexOfNewFirstPeriod], newPeriods[0], 1 /* Partial */);
    let prevIndexOfNewPeriod = indexOfNewFirstPeriod + 1;
    for (let i = 1; i < newPeriods.length; i++) {
      const newPeriod = newPeriods[i];
      let indexOfNewPeriod = -1;
      for (let j = prevIndexOfNewPeriod; j < oldPeriods.length; j++) {
        if (newPeriod.id === oldPeriods[j].id) {
          indexOfNewPeriod = j;
          break;
        }
      }
      if (indexOfNewPeriod < 0) {
        oldPeriods.splice(prevIndexOfNewPeriod, oldPeriods.length - prevIndexOfNewPeriod, ...newPeriods.slice(i, newPeriods.length));
        return;
      }
      if (indexOfNewPeriod > prevIndexOfNewPeriod) {
        oldPeriods.splice(prevIndexOfNewPeriod, indexOfNewPeriod - prevIndexOfNewPeriod);
        indexOfNewPeriod = prevIndexOfNewPeriod;
      }
      updatePeriodInPlace(oldPeriods[indexOfNewPeriod], newPeriod, 0 /* Full */);
      prevIndexOfNewPeriod++;
    }
    if (prevIndexOfNewPeriod < oldPeriods.length) {
      oldPeriods.splice(prevIndexOfNewPeriod, oldPeriods.length - prevIndexOfNewPeriod);
    }
  }

  // src/worker/manifest/manifest.ts
  var generateSupplementaryTrackID = idGenerator();
  var generateNewManifestId = idGenerator();
  var Manifest = class extends EventEmitter {
    id;
    transport;
    periods;
    expired;
    adaptations;
    isDynamic;
    isLive;
    isLastPeriodKnown;
    uris;
    updateUrl;
    suggestedPresentationDelay;
    lifetime;
    availabilityStartTime;
    publishTime;
    contentWarnings;
    clockOffset;
    timeBounds;
    constructor(parsedManifest, options) {
      super();
      const {
        supplementaryTextTracks = [],
        supplementaryImageTracks = [],
        representationFilter,
        manifestUpdateUrl
      } = options;
      this.contentWarnings = [];
      this.id = generateNewManifestId();
      this.expired = parsedManifest.expired ?? null;
      this.transport = parsedManifest.transportType;
      this.clockOffset = parsedManifest.clockOffset;
      this.periods = parsedManifest.periods.map((parsedPeriod) => {
        const period = new Period(parsedPeriod, representationFilter);
        this.contentWarnings.push(...period.contentWarnings);
        return period;
      }).sort((a, b) => a.start - b.start);
      this.adaptations = this.periods[0] === void 0 ? {} : this.periods[0].adaptations;
      this.timeBounds = parsedManifest.timeBounds;
      this.isDynamic = parsedManifest.isDynamic;
      this.isLive = parsedManifest.isLive;
      this.isLastPeriodKnown = parsedManifest.isLastPeriodKnown;
      this.uris = parsedManifest.uris === void 0 ? [] : parsedManifest.uris;
      this.updateUrl = manifestUpdateUrl;
      this.lifetime = parsedManifest.lifetime;
      this.suggestedPresentationDelay = parsedManifest.suggestedPresentationDelay;
      this.availabilityStartTime = parsedManifest.availabilityStartTime;
      this.publishTime = parsedManifest.publishTime;
      if (supplementaryImageTracks.length > 0) {
        this._addSupplementaryImageAdaptations(supplementaryImageTracks);
      }
      if (supplementaryTextTracks.length > 0) {
        this._addSupplementaryTextAdaptations(supplementaryTextTracks);
      }
    }
    getPeriod(id) {
      return arrayFind(this.periods, (period) => {
        return id === period.id;
      });
    }
    getPeriodForTime(time) {
      return arrayFind(this.periods, (period) => {
        return time >= period.start && (period.end === void 0 || period.end > time);
      });
    }
    getNextPeriod(time) {
      return arrayFind(this.periods, (period) => {
        return period.start > time;
      });
    }
    getPeriodAfter(period) {
      const endOfPeriod = period.end;
      if (endOfPeriod === void 0) {
        return null;
      }
      const nextPeriod = arrayFind(this.periods, (_period) => {
        return _period.end === void 0 || endOfPeriod < _period.end;
      });
      return nextPeriod === void 0 ? null : nextPeriod;
    }
    getUrl() {
      return this.uris[0];
    }
    replace(newManifest) {
      this._performUpdate(newManifest, 0 /* Full */);
    }
    update(newManifest) {
      this._performUpdate(newManifest, 1 /* Partial */);
    }
    getMinimumSafePosition() {
      const windowData = this.timeBounds;
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
    getLivePosition() {
      const { maximumTimeData } = this.timeBounds;
      if (!this.isLive || maximumTimeData.livePosition === void 0) {
        return void 0;
      }
      if (!maximumTimeData.isLinear) {
        return maximumTimeData.livePosition;
      }
      const timeDiff = performance.now() - maximumTimeData.time;
      return maximumTimeData.livePosition + timeDiff / 1e3;
    }
    getMaximumSafePosition() {
      const { maximumTimeData } = this.timeBounds;
      if (!maximumTimeData.isLinear) {
        return maximumTimeData.maximumSafePosition;
      }
      const timeDiff = performance.now() - maximumTimeData.time;
      return maximumTimeData.maximumSafePosition + timeDiff / 1e3;
    }
    updateRepresentationsDeciperability(isDecipherableCb) {
      const updates = updateDeciperability(this, isDecipherableCb);
      if (updates.length > 0) {
        this.trigger("decipherabilityUpdate", updates);
      }
    }
    getAdaptations() {
      warnOnce("manifest.getAdaptations() is deprecated. Please use manifest.period[].getAdaptations() instead");
      const firstPeriod = this.periods[0];
      if (firstPeriod === void 0) {
        return [];
      }
      const adaptationsByType = firstPeriod.adaptations;
      const adaptationsList = [];
      for (const adaptationType in adaptationsByType) {
        if (adaptationsByType.hasOwnProperty(adaptationType)) {
          const adaptations = adaptationsByType[adaptationType];
          adaptationsList.push(...adaptations);
        }
      }
      return adaptationsList;
    }
    getAdaptationsForType(adaptationType) {
      warnOnce("manifest.getAdaptationsForType(type) is deprecated. Please use manifest.period[].getAdaptationsForType(type) instead");
      const firstPeriod = this.periods[0];
      if (firstPeriod === void 0) {
        return [];
      }
      const adaptationsForType = firstPeriod.adaptations[adaptationType];
      return adaptationsForType === void 0 ? [] : adaptationsForType;
    }
    getAdaptation(wantedId) {
      warnOnce("manifest.getAdaptation(id) is deprecated. Please use manifest.period[].getAdaptation(id) instead");
      return arrayFind(this.getAdaptations(), ({ id }) => wantedId === id);
    }
    _addSupplementaryImageAdaptations(imageTracks) {
      const _imageTracks = Array.isArray(imageTracks) ? imageTracks : [imageTracks];
      const newImageTracks = _imageTracks.map(({ mimeType, url }) => {
        const adaptationID = "gen-image-ada-" + generateSupplementaryTrackID();
        const representationID = "gen-image-rep-" + generateSupplementaryTrackID();
        const newAdaptation = new Adaptation({
          id: adaptationID,
          type: "image",
          representations: [{
            bitrate: 0,
            id: representationID,
            mimeType,
            index: new StaticRepresentationIndex({
              media: url
            })
          }]
        }, { isManuallyAdded: true });
        if (newAdaptation.representations.length > 0 && !newAdaptation.isSupported) {
          const error = new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "An Adaptation contains only incompatible codecs.");
          this.contentWarnings.push(error);
        }
        return newAdaptation;
      });
      if (newImageTracks.length > 0 && this.periods.length > 0) {
        const { adaptations } = this.periods[0];
        adaptations.image = adaptations.image != null ? adaptations.image.concat(newImageTracks) : newImageTracks;
      }
    }
    _addSupplementaryTextAdaptations(textTracks) {
      const _textTracks = Array.isArray(textTracks) ? textTracks : [textTracks];
      const newTextAdaptations = _textTracks.reduce((allSubs, {
        mimeType,
        codecs,
        url,
        language,
        languages,
        closedCaption
      }) => {
        const langsToMapOn = language != null ? [language] : languages != null ? languages : [];
        return allSubs.concat(langsToMapOn.map((_language) => {
          const adaptationID = "gen-text-ada-" + generateSupplementaryTrackID();
          const representationID = "gen-text-rep-" + generateSupplementaryTrackID();
          const newAdaptation = new Adaptation({
            id: adaptationID,
            type: "text",
            language: _language,
            closedCaption,
            representations: [{
              bitrate: 0,
              id: representationID,
              mimeType,
              codecs,
              index: new StaticRepresentationIndex({
                media: url
              })
            }]
          }, { isManuallyAdded: true });
          if (newAdaptation.representations.length > 0 && !newAdaptation.isSupported) {
            const error = new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", "An Adaptation contains only incompatible codecs.");
            this.contentWarnings.push(error);
          }
          return newAdaptation;
        }));
      }, []);
      if (newTextAdaptations.length > 0 && this.periods.length > 0) {
        const { adaptations } = this.periods[0];
        adaptations.text = adaptations.text != null ? adaptations.text.concat(newTextAdaptations) : newTextAdaptations;
      }
    }
    _performUpdate(newManifest, updateType) {
      this.availabilityStartTime = newManifest.availabilityStartTime;
      this.expired = newManifest.expired;
      this.isDynamic = newManifest.isDynamic;
      this.isLive = newManifest.isLive;
      this.isLastPeriodKnown = newManifest.isLastPeriodKnown;
      this.lifetime = newManifest.lifetime;
      this.contentWarnings = newManifest.contentWarnings;
      this.suggestedPresentationDelay = newManifest.suggestedPresentationDelay;
      this.transport = newManifest.transport;
      this.publishTime = newManifest.publishTime;
      if (updateType === 0 /* Full */) {
        this.timeBounds = newManifest.timeBounds;
        this.uris = newManifest.uris;
        replacePeriods(this.periods, newManifest.periods);
      } else {
        this.timeBounds.maximumTimeData = newManifest.timeBounds.maximumTimeData;
        this.updateUrl = newManifest.uris[0];
        updatePeriods(this.periods, newManifest.periods);
        const min = this.getMinimumSafePosition();
        while (this.periods.length > 0) {
          const period = this.periods[0];
          if (period.end === void 0 || period.end > min) {
            break;
          }
          this.periods.shift();
        }
      }
      this.adaptations = this.periods[0] === void 0 ? {} : this.periods[0].adaptations;
      this.trigger("manifestUpdate", null);
    }
  };
  function updateDeciperability(manifest, isDecipherable) {
    const updates = [];
    for (const period of manifest.periods) {
      for (const adaptation of period.getAdaptations()) {
        for (const representation of adaptation.representations) {
          const result = isDecipherable(representation);
          if (result !== representation.decipherable) {
            updates.push({ manifest, period, adaptation, representation });
            representation.decipherable = result;
          }
        }
      }
    }
    return updates;
  }

  // src/worker/manifest/utils.ts
  init_define_ENVIRONMENT();
  function areSameContent(content1, content2) {
    return content1.segment.id === content2.segment.id && content1.representation.id === content2.representation.id && content1.adaptation.id === content2.adaptation.id && content1.period.id === content2.period.id;
  }
  function getLoggableSegmentId(content) {
    if (isNullOrUndefined(content)) {
      return "";
    }
    const { period, adaptation, representation, segment } = content;
    return `${adaptation.type} P: ${period.id} A: ${adaptation.id} R: ${representation.id} S: ` + (segment.isInit ? "init" : segment.complete ? `${segment.time}-${segment.duration}` : `${segment.time}`);
  }

  // src/worker/manifest/index.ts
  var manifest_default2 = Manifest;

  // src/worker/core/fetchers/segment/segment_fetcher.ts
  var generateRequestID = idGenerator();
  function createSegmentFetcher(bufferType, pipeline, callbacks, options) {
    const cache = arrayIncludes(["audio", "video"], bufferType) ? new initialization_segment_cache_default() : void 0;
    const { loadSegment, parseSegment } = pipeline;
    return function fetchSegment(content) {
      const { segment } = content;
      const segmentIdString = getLoggableSegmentId(content);
      return new Observable((obs) => {
        const requestId = generateRequestID();
        const canceller2 = new TaskCanceller();
        let requestInfo;
        const parsedChunks = [];
        let segmentDurationAcc = 0;
        let metricsSent = false;
        const loaderCallbacks = {
          onProgress(info) {
            if (requestInfo !== void 0) {
              return;
            }
            if (info.totalSize !== void 0 && info.size < info.totalSize) {
              callbacks.onProgress?.({
                duration: info.duration,
                size: info.size,
                totalSize: info.totalSize,
                timestamp: performance.now(),
                id: requestId
              });
            }
          },
          onNewChunk(chunkData) {
            obs.next({
              type: "chunk",
              parse: generateParserFunction(chunkData, true)
            });
          }
        };
        const cached = cache !== void 0 ? cache.get(content) : null;
        if (cached !== null) {
          log_default.debug("SF: Found wanted segment in cache", segmentIdString);
          obs.next({
            type: "chunk",
            parse: generateParserFunction(cached, false)
          });
          obs.next({ type: "chunk-complete" });
          obs.complete();
          return void 0;
        }
        log_default.debug("SF: Beginning request", segmentIdString);
        callbacks.onRequestBegin?.({
          requestTimestamp: performance.now(),
          id: requestId,
          content
        });
        tryURLsWithBackoff(segment.mediaURLs ?? [null], callLoaderWithUrl, object_assign_default({ onRetry }, options), canceller2.signal).then((res) => {
          log_default.debug("SF: Segment request ended with success", segmentIdString);
          if (res.resultType === "segment-loaded") {
            const loadedData = res.resultData.responseData;
            if (cache !== void 0) {
              cache.add(content, res.resultData.responseData);
            }
            obs.next({
              type: "chunk",
              parse: generateParserFunction(loadedData, false)
            });
          } else if (res.resultType === "segment-created") {
            obs.next({
              type: "chunk",
              parse: generateParserFunction(res.resultData, false)
            });
          }
          log_default.debug("SF: Segment request ended with success", segmentIdString);
          obs.next({ type: "chunk-complete" });
          if (res.resultType !== "segment-created") {
            requestInfo = res.resultData;
            sendNetworkMetricsIfAvailable();
          } else {
            requestInfo = null;
          }
          if (!canceller2.isUsed) {
            callbacks.onRequestEnd?.({ id: requestId });
          }
          obs.complete();
        }).catch((err) => {
          log_default.debug("SF: Segment request failed", segmentIdString);
          requestInfo = null;
          obs.error(errorSelector(err));
        });
        return () => {
          if (requestInfo !== void 0) {
            return;
          }
          log_default.debug("SF: Segment request cancelled", segmentIdString);
          requestInfo = null;
          canceller2.cancel();
          callbacks.onRequestEnd?.({ id: requestId });
        };
        function callLoaderWithUrl(url, cancellationSignal) {
          return loadSegment(url, content, cancellationSignal, loaderCallbacks);
        }
        function generateParserFunction(data, isChunked) {
          parsedChunks.push(false);
          const parsedChunkId = parsedChunks.length - 1;
          return function parse(initTimescale) {
            const loaded = { data, isChunked };
            try {
              const parsed = parseSegment(loaded, content, initTimescale);
              if (!parsedChunks[parsedChunkId]) {
                segmentDurationAcc = segmentDurationAcc !== void 0 && parsed.segmentType === "media" && parsed.chunkInfos !== null && parsed.chunkInfos.duration !== void 0 ? segmentDurationAcc + parsed.chunkInfos.duration : void 0;
                parsedChunks[parsedChunkId] = true;
                sendNetworkMetricsIfAvailable();
              }
              return parsed;
            } catch (error) {
              throw formatError(error, {
                defaultCode: "PIPELINE_PARSE_ERROR",
                defaultReason: "Unknown parsing error"
              });
            }
          };
        }
        function onRetry(err) {
          obs.next({
            type: "retry",
            value: errorSelector(err)
          });
        }
        function sendNetworkMetricsIfAvailable() {
          if (metricsSent) {
            return;
          }
          if (!isNullOrUndefined(requestInfo) && requestInfo.size !== void 0 && requestInfo.requestDuration !== void 0 && parsedChunks.length > 0 && parsedChunks.every((isParsed) => isParsed)) {
            metricsSent = true;
            callbacks.onMetrics?.({
              size: requestInfo.size,
              requestDuration: requestInfo.requestDuration,
              content,
              segmentDuration: segmentDurationAcc
            });
          }
        }
      });
    };
  }
  function getSegmentFetcherOptions(bufferType, {
    maxRetryRegular,
    maxRetryOffline,
    lowLatencyMode
  }) {
    const {
      DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
      DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE,
      INITIAL_BACKOFF_DELAY_BASE,
      MAX_BACKOFF_DELAY_BASE
    } = config_default.getCurrent();
    return {
      maxRetryRegular: bufferType === "image" ? 0 : maxRetryRegular ?? DEFAULT_MAX_REQUESTS_RETRY_ON_ERROR,
      maxRetryOffline: maxRetryOffline ?? DEFAULT_MAX_REQUESTS_RETRY_ON_OFFLINE,
      baseDelay: lowLatencyMode ? INITIAL_BACKOFF_DELAY_BASE.LOW_LATENCY : INITIAL_BACKOFF_DELAY_BASE.REGULAR,
      maxDelay: lowLatencyMode ? MAX_BACKOFF_DELAY_BASE.LOW_LATENCY : MAX_BACKOFF_DELAY_BASE.REGULAR
    };
  }

  // src/worker/core/fetchers/segment/segment_fetcher_creator.ts
  init_define_ENVIRONMENT();

  // src/worker/core/fetchers/segment/prioritizer.ts
  init_define_ENVIRONMENT();
  var ObservablePrioritizer = class {
    _minPendingPriority;
    _waitingQueue;
    _pendingTasks;
    _prioritySteps;
    constructor({ prioritySteps }) {
      this._minPendingPriority = null;
      this._waitingQueue = [];
      this._pendingTasks = [];
      this._prioritySteps = prioritySteps;
      if (this._prioritySteps.high >= this._prioritySteps.low) {
        throw new Error("FP Error: the max high level priority should be given a lowerpriority number than the min low priority.");
      }
    }
    create(obs, priority) {
      const pObs$ = new Observable((subscriber) => {
        let isStillSubscribed = true;
        let newTask;
        const trigger = (shouldRun) => {
          if (newTask.subscription !== null) {
            newTask.subscription.unsubscribe();
            newTask.subscription = null;
            if (isStillSubscribed) {
              subscriber.next({ type: "interrupted" });
            }
          }
          if (!shouldRun) {
            return;
          }
          this._minPendingPriority = this._minPendingPriority === null ? newTask.priority : Math.min(this._minPendingPriority, newTask.priority);
          this._pendingTasks.push(newTask);
          newTask.subscription = obs.subscribe({
            next: (evt) => subscriber.next({ type: "data", value: evt }),
            error: (error) => {
              subscriber.error(error);
              newTask.subscription = null;
              newTask.finished = true;
              this._onTaskEnd(newTask);
            },
            complete: () => {
              subscriber.next({ type: "ended" });
              if (isStillSubscribed) {
                subscriber.complete();
              }
              newTask.subscription = null;
              newTask.finished = true;
              this._onTaskEnd(newTask);
            }
          });
        };
        newTask = {
          observable: pObs$,
          priority,
          trigger,
          subscription: null,
          finished: false
        };
        if (!this._canBeStartedNow(newTask)) {
          this._waitingQueue.push(newTask);
        } else {
          newTask.trigger(true);
          if (this._isRunningHighPriorityTasks()) {
            this._interruptCancellableTasks();
          }
        }
        return () => {
          isStillSubscribed = false;
          if (newTask.subscription !== null) {
            newTask.subscription.unsubscribe();
            newTask.subscription = null;
          }
          if (newTask.finished) {
            return;
          }
          const waitingQueueIndex = arrayFindIndex(this._waitingQueue, (elt) => elt.observable === pObs$);
          if (waitingQueueIndex >= 0) {
            this._waitingQueue.splice(waitingQueueIndex, 1);
          } else {
            const pendingTasksIndex = arrayFindIndex(this._pendingTasks, (elt) => elt.observable === pObs$);
            if (pendingTasksIndex < 0) {
              log_default.warn("FP: unsubscribing non-existent task");
              return;
            }
            const pendingTask = this._pendingTasks.splice(pendingTasksIndex, 1)[0];
            if (this._pendingTasks.length === 0) {
              this._minPendingPriority = null;
              this._loopThroughWaitingQueue();
            } else if (this._minPendingPriority === pendingTask.priority) {
              this._minPendingPriority = Math.min(...this._pendingTasks.map((t) => t.priority));
              this._loopThroughWaitingQueue();
            }
          }
        };
      });
      return pObs$;
    }
    updatePriority(obs, priority) {
      const waitingQueueIndex = arrayFindIndex(this._waitingQueue, (elt) => elt.observable === obs);
      if (waitingQueueIndex >= 0) {
        const waitingQueueElt = this._waitingQueue[waitingQueueIndex];
        if (waitingQueueElt.priority === priority) {
          return;
        }
        waitingQueueElt.priority = priority;
        if (!this._canBeStartedNow(waitingQueueElt)) {
          return;
        }
        this._startWaitingQueueTask(waitingQueueIndex);
        if (this._isRunningHighPriorityTasks()) {
          this._interruptCancellableTasks();
        }
        return;
      }
      const pendingTasksIndex = arrayFindIndex(this._pendingTasks, (elt) => elt.observable === obs);
      if (pendingTasksIndex < 0) {
        log_default.warn("FP: request to update the priority of a non-existent task");
        return;
      }
      const task = this._pendingTasks[pendingTasksIndex];
      if (task.priority === priority) {
        return;
      }
      const prevPriority = task.priority;
      task.priority = priority;
      if (this._minPendingPriority === null || priority < this._minPendingPriority) {
        this._minPendingPriority = priority;
      } else if (this._minPendingPriority === prevPriority) {
        if (this._pendingTasks.length === 1) {
          this._minPendingPriority = priority;
        } else {
          this._minPendingPriority = Math.min(...this._pendingTasks.map((t) => t.priority));
        }
        this._loopThroughWaitingQueue();
      } else {
        return;
      }
      if (this._isRunningHighPriorityTasks()) {
        this._interruptCancellableTasks();
      }
    }
    _loopThroughWaitingQueue() {
      const minWaitingPriority = this._waitingQueue.reduce((acc, elt) => {
        return acc === null || acc > elt.priority ? elt.priority : acc;
      }, null);
      if (minWaitingPriority === null || this._minPendingPriority !== null && this._minPendingPriority < minWaitingPriority) {
        return;
      }
      for (let i = 0; i < this._waitingQueue.length; i++) {
        const priorityToCheck = this._minPendingPriority === null ? minWaitingPriority : Math.min(this._minPendingPriority, minWaitingPriority);
        const elt = this._waitingQueue[i];
        if (elt.priority <= priorityToCheck) {
          this._startWaitingQueueTask(i);
          i--;
        }
      }
    }
    _interruptCancellableTasks() {
      for (let i = 0; i < this._pendingTasks.length; i++) {
        const pendingObj = this._pendingTasks[i];
        if (pendingObj.priority >= this._prioritySteps.low) {
          this._interruptPendingTask(pendingObj);
          return this._interruptCancellableTasks();
        }
      }
    }
    _startWaitingQueueTask(index) {
      const task = this._waitingQueue.splice(index, 1)[0];
      task.trigger(true);
    }
    _interruptPendingTask(task) {
      const pendingTasksIndex = arrayFindIndex(this._pendingTasks, (elt) => elt.observable === task.observable);
      if (pendingTasksIndex < 0) {
        log_default.warn("FP: Interrupting a non-existent pending task. Aborting...");
        return;
      }
      this._pendingTasks.splice(pendingTasksIndex, 1);
      this._waitingQueue.push(task);
      if (this._pendingTasks.length === 0) {
        this._minPendingPriority = null;
      } else if (this._minPendingPriority === task.priority) {
        this._minPendingPriority = Math.min(...this._pendingTasks.map((t) => t.priority));
      }
      task.trigger(false);
    }
    _onTaskEnd(task) {
      const pendingTasksIndex = arrayFindIndex(this._pendingTasks, (elt) => elt.observable === task.observable);
      if (pendingTasksIndex < 0) {
        return;
      }
      this._pendingTasks.splice(pendingTasksIndex, 1);
      if (this._pendingTasks.length > 0) {
        if (this._minPendingPriority === task.priority) {
          this._minPendingPriority = Math.min(...this._pendingTasks.map((t) => t.priority));
        }
        return;
      }
      this._minPendingPriority = null;
      this._loopThroughWaitingQueue();
    }
    _canBeStartedNow(task) {
      return this._minPendingPriority === null || task.priority <= this._minPendingPriority;
    }
    _isRunningHighPriorityTasks() {
      return this._minPendingPriority !== null && this._minPendingPriority <= this._prioritySteps.high;
    }
  };

  // src/worker/core/fetchers/segment/segment_fetcher_creator.ts
  var SegmentFetcherCreator = class {
    _transport;
    _prioritizer;
    _backoffOptions;
    constructor(transport, options) {
      const {
        MIN_CANCELABLE_PRIORITY,
        MAX_HIGH_PRIORITY_LEVEL
      } = config_default.getCurrent();
      this._transport = transport;
      this._prioritizer = new ObservablePrioritizer({
        prioritySteps: {
          high: MAX_HIGH_PRIORITY_LEVEL,
          low: MIN_CANCELABLE_PRIORITY
        }
      });
      this._backoffOptions = options;
    }
    createSegmentFetcher(bufferType, callbacks) {
      const backoffOptions = getSegmentFetcherOptions(bufferType, this._backoffOptions);
      const pipelines = this._transport[bufferType];
      const segmentFetcher = createSegmentFetcher(bufferType, pipelines, callbacks, backoffOptions);
      return applyPrioritizerToSegmentFetcher(this._prioritizer, segmentFetcher);
    }
  };

  // src/worker/core/fetchers/segment/index.ts
  var segment_default = SegmentFetcherCreator;

  // src/worker/core/stream/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/stream/orchestrator/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/stream/orchestrator/stream_orchestrator.ts
  init_define_ENVIRONMENT();

  // src/common/utils/defer_subscriptions.ts
  init_define_ENVIRONMENT();
  function deferSubscriptions() {
    return (source) => {
      return source.pipe(subscribeOn(asapScheduler));
    };
  }

  // src/common/utils/rx-next-tick.ts
  init_define_ENVIRONMENT();
  var import_next_tick2 = __toESM(require_next_tick());
  function nextTickObs() {
    return new Observable((obs) => {
      let isFinished = false;
      (0, import_next_tick2.default)(() => {
        if (!isFinished) {
          obs.next();
          obs.complete();
        }
      });
      return () => {
        isFinished = true;
      };
    });
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

  // src/common/utils/weak_map_memory.ts
  init_define_ENVIRONMENT();
  var WeakMapMemory = class {
    _fn;
    _weakMap;
    constructor(fn) {
      this._weakMap = /* @__PURE__ */ new WeakMap();
      this._fn = fn;
    }
    get(obj) {
      const fromMemory = this._weakMap.get(obj);
      if (fromMemory === void 0) {
        const newElement = this._fn(obj);
        this._weakMap.set(obj, newElement);
        return newElement;
      } else {
        return fromMemory;
      }
    }
    destroy(obj) {
      this._weakMap.delete(obj);
    }
  };

  // src/worker/core/segment_buffers/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/segment_buffers/garbage_collector.ts
  init_define_ENVIRONMENT();

  // src/common/utils/ranges.ts
  init_define_ENVIRONMENT();
  var EPSILON = 1 / 60;
  function isTimeInRanges(ranges, time) {
    for (let i = 0; i < ranges.length; i++) {
      if (isTimeInRange(ranges[i], time)) {
        return true;
      }
    }
    return false;
  }
  function isTimeInRange({ start, end }, time) {
    return start <= time && time < end;
  }
  function areRangesOverlapping(range1, range2) {
    return isTimeInRange(range1, range2.start) || range1.start < range2.end && range2.end < range1.end || isTimeInRange(range2, range1.start);
  }
  function convertToRanges(timeRanges) {
    const ranges = [];
    for (let i = 0; i < timeRanges.length; i++) {
      ranges.push({
        start: timeRanges.start(i),
        end: timeRanges.end(i)
      });
    }
    return ranges;
  }
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
  function getInnerAndOuterTimeRanges(timeRanges, time) {
    let innerRange = null;
    const outerRanges = [];
    for (let i = 0; i < timeRanges.length; i++) {
      const start = timeRanges.start(i);
      const end = timeRanges.end(i);
      if (time < start || time >= end) {
        outerRanges.push({ start, end });
      } else {
        innerRange = { start, end };
      }
    }
    return { outerRanges, innerRange };
  }
  function getLeftSizeOfRange(timeRanges, currentTime) {
    const range = getRange(timeRanges, currentTime);
    return range !== null ? range.end - currentTime : Infinity;
  }
  function findOverlappingRanges(range, ranges) {
    const resultingRanges = [];
    for (let i = 0; i < ranges.length; i++) {
      if (areRangesOverlapping(range, ranges[i])) {
        resultingRanges.push(ranges[i]);
      }
    }
    return resultingRanges;
  }
  function keepRangeIntersection(ranges1, ranges2) {
    const result = [];
    for (let i = 0; i < ranges1.length; i++) {
      const range = ranges1[i];
      const overlappingRanges = findOverlappingRanges(range, ranges2);
      if (overlappingRanges.length > 0) {
        for (let j = 0; j < overlappingRanges.length; j++) {
          const overlappingRange = overlappingRanges[j];
          result.push({
            start: Math.max(range.start, overlappingRange.start),
            end: Math.min(range.end, overlappingRange.end)
          });
        }
      }
    }
    return result;
  }
  function excludeFromRanges(baseRanges, rangesToExclude) {
    const result = [];
    for (let i = 0; i < baseRanges.length; i++) {
      const range = baseRanges[i];
      const intersections = [];
      const overlappingRanges = findOverlappingRanges(range, rangesToExclude);
      if (overlappingRanges.length > 0) {
        for (let j = 0; j < overlappingRanges.length; j++) {
          const overlappingRange = overlappingRanges[j];
          intersections.push({
            start: Math.max(range.start, overlappingRange.start),
            end: Math.min(range.end, overlappingRange.end)
          });
        }
      }
      if (intersections.length === 0) {
        result.push(range);
      } else {
        let lastStart = range.start;
        for (let j = 0; j < intersections.length; j++) {
          if (intersections[j].start > lastStart) {
            result.push({
              start: lastStart,
              end: intersections[j].start
            });
          }
          lastStart = intersections[j].end;
        }
        if (lastStart < range.end) {
          result.push({
            start: lastStart,
            end: range.end
          });
        }
      }
    }
    return result;
  }

  // src/worker/core/segment_buffers/garbage_collector.ts
  function BufferGarbageCollector({
    segmentBuffer,
    currentTime$,
    maxBufferBehind$,
    maxBufferAhead$
  }) {
    return combineLatest([currentTime$, maxBufferBehind$, maxBufferAhead$]).pipe(mergeMap(([currentTime, maxBufferBehind2, maxBufferAhead2]) => {
      return clearBuffer(segmentBuffer, currentTime, maxBufferBehind2, maxBufferAhead2);
    }));
  }
  function clearBuffer(segmentBuffer, position, maxBufferBehind2, maxBufferAhead2) {
    if (!isFinite(maxBufferBehind2) && !isFinite(maxBufferAhead2)) {
      return EMPTY;
    }
    const cleanedupRanges = [];
    const { innerRange, outerRanges } = getInnerAndOuterTimeRanges(segmentBuffer.getBufferedRanges(), position);
    const collectBufferBehind = () => {
      if (!isFinite(maxBufferBehind2)) {
        return;
      }
      for (let i = 0; i < outerRanges.length; i++) {
        const outerRange = outerRanges[i];
        if (position - maxBufferBehind2 >= outerRange.end) {
          cleanedupRanges.push(outerRange);
        } else if (position >= outerRange.end && position - maxBufferBehind2 > outerRange.start && position - maxBufferBehind2 < outerRange.end) {
          cleanedupRanges.push({
            start: outerRange.start,
            end: position - maxBufferBehind2
          });
        }
      }
      if (innerRange != null) {
        if (position - maxBufferBehind2 > innerRange.start) {
          cleanedupRanges.push({
            start: innerRange.start,
            end: position - maxBufferBehind2
          });
        }
      }
    };
    const collectBufferAhead = () => {
      if (!isFinite(maxBufferAhead2)) {
        return;
      }
      for (let i = 0; i < outerRanges.length; i++) {
        const outerRange = outerRanges[i];
        if (position + maxBufferAhead2 <= outerRange.start) {
          cleanedupRanges.push(outerRange);
        } else if (position <= outerRange.start && position + maxBufferAhead2 < outerRange.end && position + maxBufferAhead2 > outerRange.start) {
          cleanedupRanges.push({
            start: position + maxBufferAhead2,
            end: outerRange.end
          });
        }
      }
      if (innerRange != null) {
        if (position + maxBufferAhead2 < innerRange.end) {
          cleanedupRanges.push({
            start: position + maxBufferAhead2,
            end: innerRange.end
          });
        }
      }
    };
    collectBufferBehind();
    collectBufferAhead();
    const clean$ = from(cleanedupRanges.map((range) => {
      log_default.debug("GC: cleaning range from SegmentBuffer", range.start, range.end);
      if (range.start >= range.end) {
        return of(null);
      }
      return segmentBuffer.removeBuffer(range.start, range.end);
    })).pipe(concatAll(), ignoreElements());
    return clean$;
  }

  // src/worker/core/segment_buffers/implementations/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/segment_buffers/implementations/audio_video/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/segment_buffers/implementations/audio_video/audio_video_segment_buffer.ts
  init_define_ENVIRONMENT();

  // src/common/utils/assert_unreachable.ts
  init_define_ENVIRONMENT();
  function assertUnreachable(_) {
    throw new AssertionError("Unreachable path taken");
  }

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
  function be2toi(bytes, offset) {
    return (bytes[offset + 0] << 8) + (bytes[offset + 1] << 0);
  }
  function be3toi(bytes, offset) {
    return bytes[offset + 0] * 65536 + bytes[offset + 1] * 256 + bytes[offset + 2];
  }
  function be4toi(bytes, offset) {
    return bytes[offset + 0] * 16777216 + bytes[offset + 1] * 65536 + bytes[offset + 2] * 256 + bytes[offset + 3];
  }
  function be8toi(bytes, offset) {
    return (bytes[offset + 0] * 16777216 + bytes[offset + 1] * 65536 + bytes[offset + 2] * 256 + bytes[offset + 3]) * 4294967296 + bytes[offset + 4] * 16777216 + bytes[offset + 5] * 65536 + bytes[offset + 6] * 256 + bytes[offset + 7];
  }
  function toUint8Array(input) {
    return input instanceof Uint8Array ? input : input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer);
  }

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

  // src/worker/core/segment_buffers/implementations/types.ts
  init_define_ENVIRONMENT();

  // src/worker/core/segment_buffers/inventory/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/segment_buffers/inventory/segment_inventory.ts
  init_define_ENVIRONMENT();

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

  // src/worker/core/segment_buffers/inventory/buffered_history.ts
  init_define_ENVIRONMENT();
  var BufferedHistory = class {
    _history;
    _lifetime;
    _maxHistoryLength;
    constructor(lifetime, maxHistoryLength) {
      this._history = [];
      this._lifetime = lifetime;
      this._maxHistoryLength = maxHistoryLength;
    }
    addBufferedSegment(context2, buffered) {
      const now = performance.now();
      this._history.push({
        date: now,
        buffered,
        context: context2
      });
      this._cleanHistory(now);
    }
    getHistoryFor(context2) {
      return this._history.filter((el) => areSameContent(el.context, context2));
    }
    _cleanHistory(now) {
      const historyEarliestLimit = now - this._lifetime;
      let firstKeptIndex = 0;
      for (const event of this._history) {
        if (event.date < historyEarliestLimit) {
          firstKeptIndex++;
        } else {
          break;
        }
      }
      if (firstKeptIndex > 0) {
        this._history = this._history.splice(firstKeptIndex);
      }
      if (this._history.length > this._maxHistoryLength) {
        const toRemove = this._history.length - this._maxHistoryLength;
        this._history = this._history.splice(toRemove);
      }
    }
  };

  // src/worker/core/segment_buffers/inventory/segment_inventory.ts
  var SegmentInventory = class {
    _inventory;
    _bufferedHistory;
    constructor() {
      const {
        BUFFERED_HISTORY_RETENTION_TIME,
        BUFFERED_HISTORY_MAXIMUM_ENTRIES
      } = config_default.getCurrent();
      this._inventory = [];
      this._bufferedHistory = new BufferedHistory(BUFFERED_HISTORY_RETENTION_TIME, BUFFERED_HISTORY_MAXIMUM_ENTRIES);
    }
    reset() {
      this._inventory.length = 0;
    }
    synchronizeBuffered(buffered) {
      const inventory = this._inventory;
      let inventoryIndex = 0;
      let thisSegment = inventory[0];
      const { MINIMUM_SEGMENT_SIZE } = config_default.getCurrent();
      const bufferType = thisSegment?.infos.adaptation.type;
      const rangesLength = buffered.length;
      for (let i = 0; i < rangesLength; i++) {
        if (thisSegment === void 0) {
          return;
        }
        const rangeStart = buffered.start(i);
        const rangeEnd = buffered.end(i);
        if (rangeEnd - rangeStart < MINIMUM_SEGMENT_SIZE) {
          log_default.warn("SI: skipped TimeRange when synchronizing because it was too small", bufferType, rangeStart, rangeEnd);
          continue;
        }
        const indexBefore = inventoryIndex;
        while (thisSegment !== void 0 && takeFirstSet(thisSegment.bufferedEnd, thisSegment.end) - rangeStart < MINIMUM_SEGMENT_SIZE) {
          thisSegment = inventory[++inventoryIndex];
        }
        let lastDeletedSegmentInfos = null;
        const numberOfSegmentToDelete = inventoryIndex - indexBefore;
        if (numberOfSegmentToDelete > 0) {
          const lastDeletedSegment = inventory[indexBefore + numberOfSegmentToDelete - 1];
          lastDeletedSegmentInfos = {
            end: takeFirstSet(lastDeletedSegment.bufferedEnd, lastDeletedSegment.end),
            precizeEnd: lastDeletedSegment.precizeEnd
          };
          log_default.debug(`SI: ${numberOfSegmentToDelete} segments GCed.`, bufferType);
          const removed = inventory.splice(indexBefore, numberOfSegmentToDelete);
          for (const seg of removed) {
            if (seg.bufferedStart === void 0 && seg.bufferedEnd === void 0) {
              this._bufferedHistory.addBufferedSegment(seg.infos, null);
            }
          }
          inventoryIndex = indexBefore;
        }
        if (thisSegment === void 0) {
          return;
        }
        if (rangeEnd - takeFirstSet(thisSegment.bufferedStart, thisSegment.start) >= MINIMUM_SEGMENT_SIZE) {
          guessBufferedStartFromRangeStart(thisSegment, rangeStart, lastDeletedSegmentInfos, bufferType);
          if (inventoryIndex === inventory.length - 1) {
            guessBufferedEndFromRangeEnd(thisSegment, rangeEnd, bufferType);
            return;
          }
          thisSegment = inventory[++inventoryIndex];
          let thisSegmentStart = takeFirstSet(thisSegment.bufferedStart, thisSegment.start);
          let thisSegmentEnd = takeFirstSet(thisSegment.bufferedEnd, thisSegment.end);
          const nextRangeStart = i < rangesLength - 1 ? buffered.start(i + 1) : void 0;
          while (thisSegment !== void 0 && rangeEnd - thisSegmentStart >= MINIMUM_SEGMENT_SIZE && (nextRangeStart === void 0 || rangeEnd - thisSegmentStart >= thisSegmentEnd - nextRangeStart)) {
            const prevSegment = inventory[inventoryIndex - 1];
            if (prevSegment.bufferedEnd === void 0) {
              prevSegment.bufferedEnd = thisSegment.precizeStart ? thisSegment.start : prevSegment.end;
              log_default.debug("SI: calculating buffered end of contiguous segment", bufferType, prevSegment.bufferedEnd, prevSegment.end);
            }
            thisSegment.bufferedStart = prevSegment.bufferedEnd;
            thisSegment = inventory[++inventoryIndex];
            if (thisSegment !== void 0) {
              thisSegmentStart = takeFirstSet(thisSegment.bufferedStart, thisSegment.start);
              thisSegmentEnd = takeFirstSet(thisSegment.bufferedEnd, thisSegment.end);
            }
          }
        }
        const lastSegmentInRange = inventory[inventoryIndex - 1];
        if (lastSegmentInRange !== void 0) {
          guessBufferedEndFromRangeEnd(lastSegmentInRange, rangeEnd, bufferType);
        }
      }
      if (thisSegment != null) {
        log_default.debug("SI: last segments have been GCed", bufferType, inventoryIndex, inventory.length);
        const removed = inventory.splice(inventoryIndex, inventory.length - inventoryIndex);
        for (const seg of removed) {
          if (seg.bufferedStart === void 0 && seg.bufferedEnd === void 0) {
            this._bufferedHistory.addBufferedSegment(seg.infos, null);
          }
        }
      }
      if (bufferType !== void 0 && log_default.hasLevel("DEBUG")) {
        log_default.debug(`SI: current ${bufferType} inventory timeline:
` + prettyPrintInventory(this._inventory));
      }
    }
    insertChunk({
      period,
      adaptation,
      representation,
      segment,
      chunkSize,
      start,
      end
    }) {
      if (segment.isInit) {
        return;
      }
      const bufferType = adaptation.type;
      if (start >= end) {
        log_default.warn("SI: Invalid chunked inserted: starts before it ends", bufferType, start, end);
        return;
      }
      const inventory = this._inventory;
      const newSegment = {
        partiallyPushed: true,
        chunkSize,
        splitted: false,
        start,
        end,
        precizeStart: false,
        precizeEnd: false,
        bufferedStart: void 0,
        bufferedEnd: void 0,
        infos: { segment, period, adaptation, representation }
      };
      for (let i = inventory.length - 1; i >= 0; i--) {
        const segmentI = inventory[i];
        if (segmentI.start <= start) {
          if (segmentI.end <= start) {
            log_default.debug("SI: Pushing segment strictly after previous one.", bufferType, start, segmentI.end);
            this._inventory.splice(i + 1, 0, newSegment);
            i += 2;
            while (i < inventory.length && inventory[i].start < newSegment.end) {
              if (inventory[i].end > newSegment.end) {
                log_default.debug("SI: Segment pushed updates the start of the next one", bufferType, newSegment.end, inventory[i].start);
                inventory[i].start = newSegment.end;
                inventory[i].bufferedStart = void 0;
                inventory[i].precizeStart = inventory[i].precizeStart && newSegment.precizeEnd;
                return;
              }
              log_default.debug("SI: Segment pushed removes the next one", bufferType, start, end, inventory[i].start, inventory[i].end);
              inventory.splice(i, 1);
            }
            return;
          } else {
            if (segmentI.start === start) {
              if (segmentI.end <= end) {
                log_default.debug("SI: Segment pushed replace another one", bufferType, start, end, segmentI.end);
                this._inventory.splice(i, 1, newSegment);
                i += 1;
                while (i < inventory.length && inventory[i].start < newSegment.end) {
                  if (inventory[i].end > newSegment.end) {
                    log_default.debug("SI: Segment pushed updates the start of the next one", bufferType, newSegment.end, inventory[i].start);
                    inventory[i].start = newSegment.end;
                    inventory[i].bufferedStart = void 0;
                    inventory[i].precizeStart = inventory[i].precizeStart && newSegment.precizeEnd;
                    return;
                  }
                  log_default.debug("SI: Segment pushed removes the next one", bufferType, start, end, inventory[i].start, inventory[i].end);
                  inventory.splice(i, 1);
                }
                return;
              } else {
                log_default.debug("SI: Segment pushed ends before another with the same start", bufferType, start, end, segmentI.end);
                inventory.splice(i, 0, newSegment);
                segmentI.start = newSegment.end;
                segmentI.bufferedStart = void 0;
                segmentI.precizeStart = segmentI.precizeStart && newSegment.precizeEnd;
                return;
              }
            } else {
              if (segmentI.end <= newSegment.end) {
                log_default.debug("SI: Segment pushed updates end of previous one", bufferType, start, end, segmentI.start, segmentI.end);
                this._inventory.splice(i + 1, 0, newSegment);
                segmentI.end = newSegment.start;
                segmentI.bufferedEnd = void 0;
                segmentI.precizeEnd = segmentI.precizeEnd && newSegment.precizeStart;
                i += 2;
                while (i < inventory.length && inventory[i].start < newSegment.end) {
                  if (inventory[i].end > newSegment.end) {
                    log_default.debug("SI: Segment pushed updates the start of the next one", bufferType, newSegment.end, inventory[i].start);
                    inventory[i].start = newSegment.end;
                    inventory[i].bufferedStart = void 0;
                    inventory[i].precizeStart = inventory[i].precizeStart && newSegment.precizeEnd;
                    return;
                  }
                  log_default.debug("SI: Segment pushed removes the next one", bufferType, start, end, inventory[i].start, inventory[i].end);
                  inventory.splice(i, 1);
                }
                return;
              } else {
                log_default.warn("SI: Segment pushed is contained in a previous one", bufferType, start, end, segmentI.start, segmentI.end);
                const nextSegment = {
                  partiallyPushed: segmentI.partiallyPushed,
                  chunkSize: segmentI.chunkSize,
                  splitted: true,
                  start: newSegment.end,
                  end: segmentI.end,
                  precizeStart: segmentI.precizeStart && segmentI.precizeEnd && newSegment.precizeEnd,
                  precizeEnd: segmentI.precizeEnd,
                  bufferedStart: void 0,
                  bufferedEnd: segmentI.end,
                  infos: segmentI.infos
                };
                segmentI.end = newSegment.start;
                segmentI.splitted = true;
                segmentI.bufferedEnd = void 0;
                segmentI.precizeEnd = segmentI.precizeEnd && newSegment.precizeStart;
                inventory.splice(i + 1, 0, newSegment);
                inventory.splice(i + 2, 0, nextSegment);
                return;
              }
            }
          }
        }
      }
      const firstSegment = this._inventory[0];
      if (firstSegment === void 0) {
        log_default.debug("SI: first segment pushed", bufferType, start, end);
        this._inventory.push(newSegment);
        return;
      }
      if (firstSegment.start >= end) {
        log_default.debug("SI: Segment pushed comes before all previous ones", bufferType, start, end, firstSegment.start);
        this._inventory.splice(0, 0, newSegment);
      } else if (firstSegment.end <= end) {
        log_default.debug("SI: Segment pushed starts before and completely recovers the previous first one", bufferType, start, end, firstSegment.start, firstSegment.end);
        this._inventory.splice(0, 1, newSegment);
        while (inventory.length > 1 && inventory[1].start < newSegment.end) {
          if (inventory[1].end > newSegment.end) {
            log_default.debug("SI: Segment pushed updates the start of the next one", bufferType, newSegment.end, inventory[1].start);
            inventory[1].start = newSegment.end;
            inventory[1].bufferedStart = void 0;
            inventory[1].precizeStart = newSegment.precizeEnd;
            return;
          }
          log_default.debug("SI: Segment pushed removes the next one", bufferType, start, end, inventory[1].start, inventory[1].end);
          inventory.splice(1, 1);
        }
        return;
      } else {
        log_default.debug("SI: Segment pushed start of the next one", bufferType, start, end, firstSegment.start, firstSegment.end);
        firstSegment.start = end;
        firstSegment.bufferedStart = void 0;
        firstSegment.precizeStart = newSegment.precizeEnd;
        this._inventory.splice(0, 0, newSegment);
        return;
      }
    }
    completeSegment(content, newBuffered) {
      if (content.segment.isInit) {
        return;
      }
      const inventory = this._inventory;
      const resSegments = [];
      for (let i = 0; i < inventory.length; i++) {
        if (areSameContent(inventory[i].infos, content)) {
          let splitted = false;
          if (resSegments.length > 0) {
            splitted = true;
            if (resSegments.length === 1) {
              log_default.warn("SI: Completed Segment is splitted.", content.segment.id, content.segment.time, content.segment.end);
              resSegments[0].splitted = true;
            }
          }
          const firstI = i;
          let segmentSize = inventory[i].chunkSize;
          i += 1;
          while (i < inventory.length && areSameContent(inventory[i].infos, content)) {
            const chunkSize = inventory[i].chunkSize;
            if (segmentSize !== void 0 && chunkSize !== void 0) {
              segmentSize += chunkSize;
            }
            i++;
          }
          const lastI = i - 1;
          const length = lastI - firstI;
          const lastEnd = inventory[lastI].end;
          const lastBufferedEnd = inventory[lastI].bufferedEnd;
          if (length > 0) {
            this._inventory.splice(firstI + 1, length);
            i -= length;
          }
          this._inventory[firstI].partiallyPushed = false;
          this._inventory[firstI].chunkSize = segmentSize;
          this._inventory[firstI].end = lastEnd;
          this._inventory[firstI].bufferedEnd = lastBufferedEnd;
          this._inventory[firstI].splitted = splitted;
          resSegments.push(this._inventory[firstI]);
        }
      }
      if (resSegments.length === 0) {
        log_default.warn("SI: Completed Segment not found", content.segment.id, content.segment.time);
      } else {
        this.synchronizeBuffered(newBuffered);
        for (const seg of resSegments) {
          if (seg.bufferedStart !== void 0 && seg.bufferedEnd !== void 0) {
            this._bufferedHistory.addBufferedSegment(seg.infos, {
              start: seg.bufferedStart,
              end: seg.bufferedEnd
            });
          } else {
            log_default.debug("SI: buffered range not known after sync. Skipping history.", seg.start, seg.end);
          }
        }
      }
    }
    getInventory() {
      return this._inventory;
    }
    getHistoryFor(context2) {
      return this._bufferedHistory.getHistoryFor(context2);
    }
  };
  function bufferedStartLooksCoherent(thisSegment) {
    if (thisSegment.bufferedStart === void 0 || thisSegment.partiallyPushed) {
      return false;
    }
    const { start, end } = thisSegment;
    const duration = end - start;
    const {
      MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE,
      MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE
    } = config_default.getCurrent();
    return Math.abs(start - thisSegment.bufferedStart) <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE && (thisSegment.bufferedEnd === void 0 || thisSegment.bufferedEnd > thisSegment.bufferedStart && Math.abs(thisSegment.bufferedEnd - thisSegment.bufferedStart - duration) <= Math.min(MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE, duration / 3));
  }
  function bufferedEndLooksCoherent(thisSegment) {
    if (thisSegment.bufferedEnd === void 0 || thisSegment.partiallyPushed) {
      return false;
    }
    const { start, end } = thisSegment;
    const duration = end - start;
    const {
      MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE,
      MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE
    } = config_default.getCurrent();
    return Math.abs(end - thisSegment.bufferedEnd) <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE && thisSegment.bufferedStart != null && thisSegment.bufferedEnd > thisSegment.bufferedStart && Math.abs(thisSegment.bufferedEnd - thisSegment.bufferedStart - duration) <= Math.min(MAX_MANIFEST_BUFFERED_DURATION_DIFFERENCE, duration / 3);
  }
  function guessBufferedStartFromRangeStart(firstSegmentInRange, rangeStart, lastDeletedSegmentInfos, bufferType) {
    const { MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE } = config_default.getCurrent();
    if (firstSegmentInRange.bufferedStart !== void 0) {
      if (firstSegmentInRange.bufferedStart < rangeStart) {
        log_default.debug("SI: Segment partially GCed at the start", bufferType, firstSegmentInRange.bufferedStart, rangeStart);
        firstSegmentInRange.bufferedStart = rangeStart;
      }
      if (!firstSegmentInRange.precizeStart && bufferedStartLooksCoherent(firstSegmentInRange)) {
        firstSegmentInRange.start = firstSegmentInRange.bufferedStart;
        firstSegmentInRange.precizeStart = true;
      }
    } else if (firstSegmentInRange.precizeStart) {
      log_default.debug("SI: buffered start is precize start", bufferType, firstSegmentInRange.start);
      firstSegmentInRange.bufferedStart = firstSegmentInRange.start;
    } else if (lastDeletedSegmentInfos !== null && lastDeletedSegmentInfos.end > rangeStart && (lastDeletedSegmentInfos.precizeEnd || firstSegmentInRange.start - lastDeletedSegmentInfos.end <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE)) {
      log_default.debug("SI: buffered start is end of previous segment", bufferType, rangeStart, firstSegmentInRange.start, lastDeletedSegmentInfos.end);
      firstSegmentInRange.bufferedStart = lastDeletedSegmentInfos.end;
      if (bufferedStartLooksCoherent(firstSegmentInRange)) {
        firstSegmentInRange.start = lastDeletedSegmentInfos.end;
        firstSegmentInRange.precizeStart = true;
      }
    } else if (firstSegmentInRange.start - rangeStart <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE) {
      log_default.debug("SI: found true buffered start", bufferType, rangeStart, firstSegmentInRange.start);
      firstSegmentInRange.bufferedStart = rangeStart;
      if (bufferedStartLooksCoherent(firstSegmentInRange)) {
        firstSegmentInRange.start = rangeStart;
        firstSegmentInRange.precizeStart = true;
      }
    } else if (rangeStart < firstSegmentInRange.start) {
      log_default.debug("SI: range start too far from expected start", bufferType, rangeStart, firstSegmentInRange.start);
    } else {
      log_default.debug("SI: Segment appears immediately garbage collected at the start", bufferType, firstSegmentInRange.bufferedStart, rangeStart);
      firstSegmentInRange.bufferedStart = rangeStart;
    }
  }
  function guessBufferedEndFromRangeEnd(lastSegmentInRange, rangeEnd, bufferType) {
    const { MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE } = config_default.getCurrent();
    if (lastSegmentInRange.bufferedEnd !== void 0) {
      if (lastSegmentInRange.bufferedEnd > rangeEnd) {
        log_default.debug("SI: Segment partially GCed at the end", bufferType, lastSegmentInRange.bufferedEnd, rangeEnd);
        lastSegmentInRange.bufferedEnd = rangeEnd;
      }
      if (!lastSegmentInRange.precizeEnd && rangeEnd - lastSegmentInRange.end <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE && bufferedEndLooksCoherent(lastSegmentInRange)) {
        lastSegmentInRange.precizeEnd = true;
        lastSegmentInRange.end = rangeEnd;
      }
    } else if (lastSegmentInRange.precizeEnd) {
      log_default.debug("SI: buffered end is precize end", bufferType, lastSegmentInRange.end);
      lastSegmentInRange.bufferedEnd = lastSegmentInRange.end;
    } else if (rangeEnd - lastSegmentInRange.end <= MAX_MANIFEST_BUFFERED_START_END_DIFFERENCE) {
      log_default.debug("SI: found true buffered end", bufferType, rangeEnd, lastSegmentInRange.end);
      lastSegmentInRange.bufferedEnd = rangeEnd;
      if (bufferedEndLooksCoherent(lastSegmentInRange)) {
        lastSegmentInRange.end = rangeEnd;
        lastSegmentInRange.precizeEnd = true;
      }
    } else if (rangeEnd > lastSegmentInRange.end) {
      log_default.debug("SI: range end too far from expected end", bufferType, rangeEnd, lastSegmentInRange.end);
      lastSegmentInRange.bufferedEnd = lastSegmentInRange.end;
    } else {
      log_default.debug("SI: Segment appears immediately garbage collected at the end", bufferType, lastSegmentInRange.bufferedEnd, rangeEnd);
      lastSegmentInRange.bufferedEnd = rangeEnd;
    }
  }
  function prettyPrintInventory(inventory) {
    const roundingError = 1 / 60;
    const encounteredReps = {};
    const letters = [];
    let lastChunk = null;
    let lastLetter = null;
    function generateNewLetter(infos) {
      const currentLetter = String.fromCharCode(letters.length + 65);
      letters.push({
        letter: currentLetter,
        periodId: infos.period.id,
        representationId: infos.representation.id,
        bitrate: infos.representation.bitrate
      });
      return currentLetter;
    }
    let str = "";
    for (let i = 0; i < inventory.length; i++) {
      const chunk = inventory[i];
      if (chunk.bufferedStart !== void 0 && chunk.bufferedEnd !== void 0) {
        const periodId = chunk.infos.period.id;
        const representationId = chunk.infos.representation.id;
        const encounteredPeriod = encounteredReps[periodId];
        let currentLetter;
        if (encounteredPeriod === void 0) {
          currentLetter = generateNewLetter(chunk.infos);
          encounteredReps[periodId] = { [representationId]: currentLetter };
        } else if (encounteredPeriod[representationId] === void 0) {
          currentLetter = generateNewLetter(chunk.infos);
          encounteredPeriod[representationId] = currentLetter;
        } else {
          currentLetter = encounteredPeriod[representationId];
        }
        if (lastChunk === null) {
          str += `${chunk.bufferedStart.toFixed(2)}|${currentLetter}|`;
        } else if (lastLetter === currentLetter) {
          if (lastChunk.bufferedEnd + roundingError < chunk.bufferedStart) {
            str += `${lastChunk.bufferedEnd.toFixed(2)} ~ ${chunk.bufferedStart.toFixed(2)}|${currentLetter}|`;
          }
        } else {
          str += `${lastChunk.bufferedEnd.toFixed(2)} ~ ${chunk.bufferedStart.toFixed(2)}|${currentLetter}|`;
        }
        lastChunk = chunk;
        lastLetter = currentLetter;
      }
    }
    if (lastChunk !== null) {
      str += String(lastChunk.end.toFixed(2));
    }
    letters.forEach((letterInfo) => {
      str += `
[${letterInfo.letter}] P: ${letterInfo.periodId} || R: ${letterInfo.representationId}(${letterInfo.bitrate ?? "unknown bitrate"})`;
    });
    return str;
  }

  // src/worker/core/segment_buffers/inventory/index.ts
  var inventory_default = SegmentInventory;

  // src/worker/core/segment_buffers/implementations/types.ts
  var SegmentBuffer = class {
    _segmentInventory;
    codec;
    constructor() {
      this._segmentInventory = new inventory_default();
    }
    synchronizeInventory() {
      this._segmentInventory.synchronizeBuffered(this.getBufferedRanges());
    }
    getInventory() {
      return this._segmentInventory.getInventory();
    }
    getPendingOperations() {
      return [];
    }
    getSegmentHistory(context2) {
      return this._segmentInventory.getHistoryFor(context2);
    }
  };

  // src/worker/core/segment_buffers/implementations/audio_video/audio_video_segment_buffer.ts
  var AudioVideoSegmentBuffer = class extends SegmentBuffer {
    bufferType;
    _sourceBuffer;
    _destroy$;
    _queue;
    _mediaSource;
    _pendingTask;
    _lastInitSegment;
    constructor(bufferType, codec, mediaSource) {
      super();
      const sourceBuffer = mediaSource.addSourceBuffer(codec);
      this._destroy$ = new Subject();
      this.bufferType = bufferType;
      this._mediaSource = mediaSource;
      this._sourceBuffer = sourceBuffer;
      this._queue = [];
      this._pendingTask = null;
      this._lastInitSegment = null;
      this.codec = codec;
      const { SOURCE_BUFFER_FLUSHING_INTERVAL } = config_default.getCurrent();
      interval(SOURCE_BUFFER_FLUSHING_INTERVAL).pipe(tap(() => this._flush()), takeUntil(this._destroy$)).subscribe();
      fromEvent(this._sourceBuffer, "error").pipe(tap((err) => this._onPendingTaskError(err)), takeUntil(this._destroy$)).subscribe();
      fromEvent(this._sourceBuffer, "updateend").pipe(tap(() => this._flush()), takeUntil(this._destroy$)).subscribe();
    }
    pushChunk(infos) {
      assertPushedDataIsBufferSource(infos);
      log_default.debug("AVSB: receiving order to push data to the SourceBuffer", this.bufferType, getLoggableSegmentId(infos.inventoryInfos));
      return this._addToQueue({
        type: 0 /* Push */,
        value: infos
      });
    }
    removeBuffer(start, end) {
      log_default.debug("AVSB: receiving order to remove data from the SourceBuffer", this.bufferType, start, end);
      return this._addToQueue({
        type: 1 /* Remove */,
        value: { start, end }
      });
    }
    endOfSegment(infos) {
      log_default.debug("AVSB: receiving order for validating end of segment", this.bufferType, getLoggableSegmentId(infos));
      return this._addToQueue({
        type: 2 /* EndOfSegment */,
        value: infos
      });
    }
    getBufferedRanges() {
      return this._sourceBuffer.buffered;
    }
    getPendingOperations() {
      const parseQueuedOperation = (op) => {
        switch (op.type) {
          case 0 /* Push */:
            return { type: op.type, value: op.value };
          case 1 /* Remove */:
            return { type: op.type, value: op.value };
          case 2 /* EndOfSegment */:
            return { type: op.type, value: op.value };
        }
      };
      const queued = this._queue.map(parseQueuedOperation);
      return this._pendingTask === null ? queued : [parseQueuedOperation(this._pendingTask)].concat(queued);
    }
    dispose() {
      this._destroy$.next();
      this._destroy$.complete();
      if (this._pendingTask !== null) {
        this._pendingTask.subject.complete();
        this._pendingTask = null;
      }
      while (this._queue.length > 0) {
        const nextElement = this._queue.shift();
        if (nextElement !== void 0) {
          nextElement.subject.complete();
        }
      }
      if (this._mediaSource.readyState === "open") {
        try {
          this._sourceBuffer.abort();
        } catch (e) {
          log_default.warn(`AVSB: Failed to abort a ${this.bufferType} SourceBuffer:`, e instanceof Error ? e : "");
        }
      }
    }
    _onPendingTaskError(err) {
      this._lastInitSegment = null;
      if (this._pendingTask !== null) {
        const error = err instanceof Error ? err : new Error("An unknown error occured when doing operations on the SourceBuffer");
        this._pendingTask.subject.error(error);
      }
    }
    _addToQueue(operation) {
      return new Observable((obs) => {
        const shouldRestartQueue = this._queue.length === 0 && this._pendingTask === null;
        const subject = new Subject();
        const queueItem = object_assign_default({ subject }, operation);
        this._queue.push(queueItem);
        const subscription = subject.subscribe(obs);
        if (shouldRestartQueue) {
          this._flush();
        }
        return () => {
          subscription.unsubscribe();
          const index = this._queue.indexOf(queueItem);
          if (index >= 0) {
            this._queue.splice(index, 1);
          }
        };
      });
    }
    _flush() {
      if (this._sourceBuffer.updating) {
        return;
      }
      if (this._pendingTask !== null) {
        const task = this._pendingTask;
        if (task.type !== 0 /* Push */ || task.data.length === 0) {
          switch (task.type) {
            case 0 /* Push */:
              if (task.inventoryData !== null) {
                this._segmentInventory.insertChunk(task.inventoryData);
              }
              break;
            case 2 /* EndOfSegment */:
              this._segmentInventory.completeSegment(task.value, this.getBufferedRanges());
              break;
            case 1 /* Remove */:
              this.synchronizeInventory();
              break;
            default:
              assertUnreachable(task);
          }
          const { subject } = task;
          this._pendingTask = null;
          subject.next();
          subject.complete();
          this._flush();
          return;
        }
      } else {
        const nextItem = this._queue.shift();
        if (nextItem === void 0) {
          return;
        } else if (nextItem.type !== 0 /* Push */) {
          this._pendingTask = nextItem;
        } else {
          const itemValue = nextItem.value;
          let dataToPush;
          try {
            dataToPush = this._preparePushOperation(itemValue.data);
          } catch (e) {
            this._pendingTask = object_assign_default({
              data: [],
              inventoryData: itemValue.inventoryInfos
            }, nextItem);
            const error = e instanceof Error ? e : new Error("An unknown error occured when preparing a push operation");
            this._lastInitSegment = null;
            nextItem.subject.error(error);
            return;
          }
          this._pendingTask = object_assign_default({
            data: dataToPush,
            inventoryData: itemValue.inventoryInfos
          }, nextItem);
        }
      }
      try {
        switch (this._pendingTask.type) {
          case 2 /* EndOfSegment */:
            log_default.debug("AVSB: Acknowledging complete segment", getLoggableSegmentId(this._pendingTask.value));
            this._flush();
            return;
          case 0 /* Push */:
            const segmentData = this._pendingTask.data.shift();
            if (segmentData === void 0) {
              this._flush();
              return;
            }
            log_default.debug("AVSB: pushing segment", this.bufferType, getLoggableSegmentId(this._pendingTask.inventoryData));
            this._sourceBuffer.appendBuffer(segmentData);
            break;
          case 1 /* Remove */:
            const { start, end } = this._pendingTask.value;
            log_default.debug("AVSB: removing data from SourceBuffer", this.bufferType, start, end);
            this._sourceBuffer.remove(start, end);
            break;
          default:
            assertUnreachable(this._pendingTask);
        }
      } catch (e) {
        this._onPendingTaskError(e);
      }
    }
    _preparePushOperation(data) {
      const dataToPush = [];
      const {
        codec,
        timestampOffset,
        appendWindow
      } = data;
      let hasUpdatedSourceBufferType = false;
      if (codec !== this.codec) {
        log_default.debug("AVSB: updating codec", codec);
        hasUpdatedSourceBufferType = tryToChangeSourceBufferType(this._sourceBuffer, codec);
        if (hasUpdatedSourceBufferType) {
          this.codec = codec;
        } else {
          log_default.debug("AVSB: could not update codec", codec, this.codec);
        }
      }
      if (this._sourceBuffer.timestampOffset !== timestampOffset) {
        const newTimestampOffset = timestampOffset;
        log_default.debug("AVSB: updating timestampOffset", this.bufferType, this._sourceBuffer.timestampOffset, newTimestampOffset);
        this._sourceBuffer.timestampOffset = newTimestampOffset;
      }
      if (appendWindow[0] === void 0) {
        if (this._sourceBuffer.appendWindowStart > 0) {
          this._sourceBuffer.appendWindowStart = 0;
        }
      } else if (appendWindow[0] !== this._sourceBuffer.appendWindowStart) {
        if (appendWindow[0] >= this._sourceBuffer.appendWindowEnd) {
          this._sourceBuffer.appendWindowEnd = appendWindow[0] + 1;
        }
        this._sourceBuffer.appendWindowStart = appendWindow[0];
      }
      if (appendWindow[1] === void 0) {
        if (this._sourceBuffer.appendWindowEnd !== Infinity) {
          this._sourceBuffer.appendWindowEnd = Infinity;
        }
      } else if (appendWindow[1] !== this._sourceBuffer.appendWindowEnd) {
        this._sourceBuffer.appendWindowEnd = appendWindow[1];
      }
      if (data.initSegment !== null && (hasUpdatedSourceBufferType || !this._isLastInitSegment(data.initSegment))) {
        const segmentData = data.initSegment;
        dataToPush.push(segmentData);
        const initU8 = toUint8Array(segmentData);
        this._lastInitSegment = {
          data: initU8,
          hash: hashBuffer(initU8)
        };
      }
      if (data.chunk !== null) {
        dataToPush.push(data.chunk);
      }
      return dataToPush;
    }
    _isLastInitSegment(segmentData) {
      if (this._lastInitSegment === null) {
        return false;
      }
      if (this._lastInitSegment.data === segmentData) {
        return true;
      }
      const oldInit = this._lastInitSegment.data;
      if (oldInit.byteLength === segmentData.byteLength) {
        const newInitU8 = toUint8Array(segmentData);
        if (hashBuffer(newInitU8) === this._lastInitSegment.hash && areArraysOfNumbersEqual(oldInit, newInitU8)) {
          return true;
        }
      }
      return false;
    }
  };
  function assertPushedDataIsBufferSource(pushedData) {
    if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.PRODUCTION) {
      return;
    }
    const { chunk, initSegment } = pushedData.data;
    if (typeof chunk !== "object" || typeof initSegment !== "object" || chunk !== null && !(chunk instanceof ArrayBuffer) && !(chunk.buffer instanceof ArrayBuffer) || initSegment !== null && !(initSegment instanceof ArrayBuffer) && !(initSegment.buffer instanceof ArrayBuffer)) {
      throw new Error("Invalid data given to the AudioVideoSegmentBuffer");
    }
  }

  // src/worker/core/segment_buffers/implementations/audio_video/index.ts
  var audio_video_default = AudioVideoSegmentBuffer;

  // src/worker/core/segment_buffers/segment_buffers_store.ts
  init_define_ENVIRONMENT();

  // src/worker/features/index.ts
  init_define_ENVIRONMENT();

  // src/worker/features/features_object.ts
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

  // src/worker/features/index.ts
  var features_default = features_object_default;

  // src/worker/core/segment_buffers/segment_buffers_store.ts
  var POSSIBLE_BUFFER_TYPES = [
    "audio",
    "video",
    "text",
    "image"
  ];
  var SegmentBuffersStore = class {
    static isNative(bufferType) {
      return shouldHaveNativeBuffer(bufferType);
    }
    _mediaSource;
    _initializedSegmentBuffers;
    _onNativeBufferAddedOrDisabled;
    constructor(mediaSource) {
      this._mediaSource = mediaSource;
      this._initializedSegmentBuffers = {};
      this._onNativeBufferAddedOrDisabled = [];
    }
    getBufferTypes() {
      const bufferTypes = this.getNativeBufferTypes();
      if (features_default.nativeTextTracksBuffer != null || features_default.htmlTextTracksBuffer != null) {
        bufferTypes.push("text");
      }
      if (features_default.imageBuffer != null) {
        bufferTypes.push("image");
      }
      return bufferTypes;
    }
    getNativeBufferTypes() {
      return ["video", "audio"];
    }
    getStatus(bufferType) {
      const initializedBuffer = this._initializedSegmentBuffers[bufferType];
      return initializedBuffer === void 0 ? { type: "uninitialized" } : initializedBuffer === null ? { type: "disabled" } : {
        type: "initialized",
        value: initializedBuffer
      };
    }
    waitForUsableBuffers() {
      if (this._areNativeBuffersUsable()) {
        return of(void 0);
      }
      return new Observable((obs) => {
        this._onNativeBufferAddedOrDisabled.push(() => {
          if (this._areNativeBuffersUsable()) {
            obs.next(void 0);
            obs.complete();
          }
        });
      });
    }
    disableSegmentBuffer(bufferType) {
      const currentValue = this._initializedSegmentBuffers[bufferType];
      if (currentValue === null) {
        log_default.warn(`SBS: The ${bufferType} SegmentBuffer was already disabled.`);
        return;
      }
      if (currentValue !== void 0) {
        throw new Error("Cannot disable an active SegmentBuffer.");
      }
      this._initializedSegmentBuffers[bufferType] = null;
      if (SegmentBuffersStore.isNative(bufferType)) {
        this._onNativeBufferAddedOrDisabled.forEach((cb) => cb());
      }
    }
    createSegmentBuffer(bufferType, codec, _options = {}) {
      const memorizedSegmentBuffer = this._initializedSegmentBuffers[bufferType];
      if (shouldHaveNativeBuffer(bufferType)) {
        if (memorizedSegmentBuffer != null) {
          if (memorizedSegmentBuffer instanceof audio_video_default && memorizedSegmentBuffer.codec !== codec) {
            log_default.warn("SB: Reusing native SegmentBuffer with codec", memorizedSegmentBuffer.codec, "for codec", codec);
          } else {
            log_default.info("SB: Reusing native SegmentBuffer with codec", codec);
          }
          return memorizedSegmentBuffer;
        }
        log_default.info("SB: Adding native SegmentBuffer with codec", codec);
        const nativeSegmentBuffer = new audio_video_default(bufferType, codec, this._mediaSource);
        this._initializedSegmentBuffers[bufferType] = nativeSegmentBuffer;
        this._onNativeBufferAddedOrDisabled.forEach((cb) => cb());
        return nativeSegmentBuffer;
      }
      if (memorizedSegmentBuffer != null) {
        log_default.info("SB: Reusing a previous custom SegmentBuffer for the type", bufferType);
        return memorizedSegmentBuffer;
      }
      let segmentBuffer;
      if (bufferType === "image") {
        if (features_default.imageBuffer == null) {
          throw new Error("Image buffer feature not activated");
        }
        log_default.info("SB: Creating a new image SegmentBuffer");
        segmentBuffer = new features_default.imageBuffer();
        this._initializedSegmentBuffers.image = segmentBuffer;
        return segmentBuffer;
      }
      log_default.error("SB: Unknown buffer type:", bufferType);
      throw new MediaError("BUFFER_TYPE_UNKNOWN", "The player wants to create a SegmentBuffer of an unknown type.");
    }
    disposeSegmentBuffer(bufferType) {
      const memorizedSegmentBuffer = this._initializedSegmentBuffers[bufferType];
      if (memorizedSegmentBuffer == null) {
        log_default.warn("SB: Trying to dispose a SegmentBuffer that does not exist");
        return;
      }
      log_default.info("SB: Aborting SegmentBuffer", bufferType);
      memorizedSegmentBuffer.dispose();
      delete this._initializedSegmentBuffers[bufferType];
    }
    disposeAll() {
      POSSIBLE_BUFFER_TYPES.forEach((bufferType) => {
        if (this.getStatus(bufferType).type === "initialized") {
          this.disposeSegmentBuffer(bufferType);
        }
      });
    }
    _areNativeBuffersUsable() {
      const nativeBufferTypes = this.getNativeBufferTypes();
      const hasUnitializedBuffers = nativeBufferTypes.some((sbType) => this._initializedSegmentBuffers[sbType] === void 0);
      if (hasUnitializedBuffers) {
        return false;
      }
      const areAllDisabled = nativeBufferTypes.every((sbType) => this._initializedSegmentBuffers[sbType] === null);
      if (areAllDisabled) {
        return false;
      }
      return true;
    }
  };
  function shouldHaveNativeBuffer(bufferType) {
    return bufferType === "audio" || bufferType === "video";
  }

  // src/worker/core/segment_buffers/index.ts
  var segment_buffers_default = SegmentBuffersStore;

  // src/worker/core/stream/events_generators.ts
  init_define_ENVIRONMENT();
  var EVENTS = {
    activePeriodChanged(period) {
      return {
        type: "activePeriodChanged",
        value: { period }
      };
    },
    adaptationChange(bufferType, adaptation, period) {
      return {
        type: "adaptationChange",
        value: {
          type: bufferType,
          adaptation,
          period
        }
      };
    },
    addedSegment(content, segment, buffered, segmentData) {
      return {
        type: "added-segment",
        value: {
          content,
          segment,
          segmentData,
          buffered
        }
      };
    },
    bitrateEstimationChange(type, bitrate) {
      return {
        type: "bitrateEstimationChange",
        value: { type, bitrate }
      };
    },
    streamComplete(bufferType) {
      return {
        type: "complete-stream",
        value: { type: bufferType }
      };
    },
    endOfStream() {
      return {
        type: "end-of-stream",
        value: void 0
      };
    },
    needsManifestRefresh() {
      return {
        type: "needs-manifest-refresh",
        value: void 0
      };
    },
    manifestMightBeOufOfSync() {
      return {
        type: "manifest-might-be-out-of-sync",
        value: void 0
      };
    },
    needsMediaSourceReload(reloadAt, reloadOnPause) {
      return {
        type: "needs-media-source-reload",
        value: {
          position: reloadAt,
          autoPlay: reloadOnPause
        }
      };
    },
    lockedStream(bufferType, period) {
      return {
        type: "locked-stream",
        value: { bufferType, period }
      };
    },
    needsBufferFlush() {
      return { type: "needs-buffer-flush", value: void 0 };
    },
    needsDecipherabilityFlush(position, autoPlay, duration) {
      return {
        type: "needs-decipherability-flush",
        value: { position, autoPlay, duration }
      };
    },
    periodStreamReady(type, period, adaptation$) {
      return {
        type: "periodStreamReady",
        value: { type, period, adaptation$ }
      };
    },
    periodStreamCleared(type, period) {
      return {
        type: "periodStreamCleared",
        value: { type, period }
      };
    },
    encryptionDataEncountered(reprProtData, content) {
      return {
        type: "encryption-data-encountered",
        value: object_assign_default({ content }, reprProtData)
      };
    },
    representationChange(type, period, representation) {
      return {
        type: "representationChange",
        value: { type, period, representation }
      };
    },
    streamTerminating() {
      return {
        type: "stream-terminating",
        value: void 0
      };
    },
    resumeStream() {
      return {
        type: "resume-stream",
        value: void 0
      };
    },
    warning(value) {
      return { type: "warning", value };
    },
    waitingMediaSourceReload(bufferType, period, position, autoPlay) {
      return {
        type: "waiting-media-source-reload",
        value: { bufferType, period, position, autoPlay }
      };
    }
  };
  var events_generators_default = EVENTS;

  // src/worker/core/stream/period/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/stream/period/period_stream.ts
  init_define_ENVIRONMENT();

  // src/worker/core/stream/adaptation/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/stream/adaptation/adaptation_stream.ts
  init_define_ENVIRONMENT();

  // src/worker/core/stream/reload_after_switch.ts
  init_define_ENVIRONMENT();
  function reloadAfterSwitch(period, bufferType, playbackObserver2, deltaPos) {
    return nextTickObs().pipe(mergeMap(() => playbackObserver2.getReference().asObservable()), map((observation) => {
      const currentTime = playbackObserver2.getCurrentTime();
      const pos = currentTime + deltaPos;
      const reloadAt = Math.min(Math.max(period.start, pos), period.end ?? Infinity);
      const autoPlay = !(observation.paused.pending ?? playbackObserver2.getIsPaused());
      return events_generators_default.waitingMediaSourceReload(bufferType, period, reloadAt, autoPlay);
    }));
  }

  // src/worker/core/stream/representation/index.ts
  init_define_ENVIRONMENT();

  // src/worker/core/stream/representation/representation_stream.ts
  init_define_ENVIRONMENT();
  var import_next_tick3 = __toESM(require_next_tick());

  // src/worker/core/stream/representation/downloading_queue.ts
  init_define_ENVIRONMENT();
  var DownloadingQueue = class {
    _content;
    _currentObs$;
    _downloadQueue;
    _initSegmentRequest;
    _mediaSegmentRequest;
    _segmentFetcher;
    _initSegmentMetadata$;
    _mediaSegmentsAwaitingInitMetadata;
    constructor(content, downloadQueue, segmentFetcher, hasInitSegment) {
      this._content = content;
      this._currentObs$ = null;
      this._downloadQueue = downloadQueue;
      this._initSegmentRequest = null;
      this._mediaSegmentRequest = null;
      this._segmentFetcher = segmentFetcher;
      this._initSegmentMetadata$ = new ReplaySubject(1);
      this._mediaSegmentsAwaitingInitMetadata = /* @__PURE__ */ new Set();
      if (!hasInitSegment) {
        this._initSegmentMetadata$.next(void 0);
      }
    }
    getRequestedInitSegment() {
      return this._initSegmentRequest === null ? null : this._initSegmentRequest.segment;
    }
    getRequestedMediaSegment() {
      return this._mediaSegmentRequest === null ? null : this._mediaSegmentRequest.segment;
    }
    start() {
      if (this._currentObs$ !== null) {
        return this._currentObs$;
      }
      const obs = defer(() => {
        const mediaQueue$ = this._downloadQueue.asObservable().pipe(filter(({ segmentQueue }) => {
          let nextSegmentToLoadIdx = 0;
          for (; nextSegmentToLoadIdx < segmentQueue.length; nextSegmentToLoadIdx++) {
            const nextSegment = segmentQueue[nextSegmentToLoadIdx].segment;
            if (!this._mediaSegmentsAwaitingInitMetadata.has(nextSegment.id)) {
              break;
            }
          }
          const currentSegmentRequest = this._mediaSegmentRequest;
          if (nextSegmentToLoadIdx >= segmentQueue.length) {
            return currentSegmentRequest !== null;
          } else if (currentSegmentRequest === null) {
            return true;
          }
          const nextItem = segmentQueue[nextSegmentToLoadIdx];
          if (currentSegmentRequest.segment.id !== nextItem.segment.id) {
            return true;
          }
          if (currentSegmentRequest.priority !== nextItem.priority) {
            this._segmentFetcher.updatePriority(currentSegmentRequest.request$, nextItem.priority);
          }
          return false;
        }), switchMap(({ segmentQueue }) => segmentQueue.length > 0 ? this._requestMediaSegments() : EMPTY));
        const initSegmentPush$ = this._downloadQueue.asObservable().pipe(filter((next) => {
          const initSegmentRequest = this._initSegmentRequest;
          if (next.initSegment !== null && initSegmentRequest !== null) {
            if (next.initSegment.priority !== initSegmentRequest.priority) {
              this._segmentFetcher.updatePriority(initSegmentRequest.request$, next.initSegment.priority);
            }
            return false;
          } else {
            return next.initSegment === null || initSegmentRequest === null;
          }
        }), switchMap((nextQueue) => {
          if (nextQueue.initSegment === null) {
            return EMPTY;
          }
          return this._requestInitSegment(nextQueue.initSegment);
        }));
        return merge(initSegmentPush$, mediaQueue$);
      }).pipe(share());
      this._currentObs$ = obs;
      return obs;
    }
    _requestMediaSegments() {
      const { segmentQueue } = this._downloadQueue.getValue();
      const currentNeededSegment = segmentQueue[0];
      const recursivelyRequestSegments = (startingSegment) => {
        if (startingSegment === void 0) {
          return of({
            type: "end-of-queue",
            value: null
          });
        }
        const { segment, priority } = startingSegment;
        const context2 = object_assign_default({ segment }, this._content);
        const request$ = this._segmentFetcher.createRequest(context2, priority);
        this._mediaSegmentRequest = { segment, priority, request$ };
        return request$.pipe(mergeMap((evt) => {
          switch (evt.type) {
            case "retry":
              return of({
                type: "retry",
                value: { segment, error: evt.value }
              });
            case "interrupted":
              log_default.info("Stream: segment request interrupted temporarly.", segment.id, segment.time);
              return EMPTY;
            case "ended":
              this._mediaSegmentRequest = null;
              const lastQueue = this._downloadQueue.getValue().segmentQueue;
              if (lastQueue.length === 0) {
                return of({
                  type: "end-of-queue",
                  value: null
                });
              } else if (lastQueue[0].segment.id === segment.id) {
                lastQueue.shift();
              }
              return recursivelyRequestSegments(lastQueue[0]);
            case "chunk":
            case "chunk-complete":
              this._mediaSegmentsAwaitingInitMetadata.add(segment.id);
              return this._initSegmentMetadata$.pipe(take(1), map((initTimescale) => {
                if (evt.type === "chunk-complete") {
                  return {
                    type: "end-of-segment",
                    value: { segment }
                  };
                }
                const parsed = evt.parse(initTimescale);
                assert(parsed.segmentType === "media", "Should have loaded a media segment.");
                return object_assign_default({}, parsed, {
                  type: "parsed-media",
                  segment
                });
              }), finalize(() => {
                this._mediaSegmentsAwaitingInitMetadata.delete(segment.id);
              }));
            default:
              assertUnreachable(evt);
          }
        }));
      };
      return defer(() => recursivelyRequestSegments(currentNeededSegment)).pipe(finalize(() => {
        this._mediaSegmentRequest = null;
      }));
    }
    _requestInitSegment(queuedInitSegment) {
      if (queuedInitSegment === null) {
        this._initSegmentRequest = null;
        return EMPTY;
      }
      const { segment, priority } = queuedInitSegment;
      const context2 = object_assign_default({ segment }, this._content);
      const request$ = this._segmentFetcher.createRequest(context2, priority);
      this._initSegmentRequest = { segment, priority, request$ };
      return request$.pipe(mergeMap((evt) => {
        switch (evt.type) {
          case "retry":
            return of({
              type: "retry",
              value: { segment, error: evt.value }
            });
          case "interrupted":
            log_default.info("Stream: init segment request interrupted temporarly.", segment.id);
            return EMPTY;
          case "chunk":
            const parsed = evt.parse(void 0);
            assert(parsed.segmentType === "init", "Should have loaded an init segment.");
            return concat(of(object_assign_default({}, parsed, {
              type: "parsed-init",
              segment
            })), defer(() => {
              if (parsed.segmentType === "init") {
                this._initSegmentMetadata$.next(parsed.initTimescale);
              }
              return EMPTY;
            }));
          case "chunk-complete":
            return of({
              type: "end-of-segment",
              value: { segment }
            });
          case "ended":
            return EMPTY;
          default:
            assertUnreachable(evt);
        }
      })).pipe(finalize(() => {
        this._initSegmentRequest = null;
      }));
    }
  };

  // src/worker/core/stream/representation/get_buffer_status.ts
  init_define_ENVIRONMENT();

  // src/worker/core/stream/representation/check_for_discontinuity.ts
  init_define_ENVIRONMENT();
  function checkForDiscontinuity(content, checkedRange, nextSegmentStart, hasFinishedLoading, bufferedSegments) {
    const { period, adaptation, representation } = content;
    const nextBufferedInRangeIdx = getIndexOfFirstChunkInRange(bufferedSegments, checkedRange);
    if (nextBufferedInRangeIdx === null) {
      if (nextSegmentStart === null) {
        if (hasFinishedLoading && period.end !== void 0 && checkedRange.end >= period.end) {
          return { start: void 0, end: null };
        }
        const discontinuityEnd = representation.index.checkDiscontinuity(checkedRange.start);
        if (discontinuityEnd !== null) {
          return {
            start: void 0,
            end: discontinuityEnd
          };
        }
      }
      return null;
    }
    const nextBufferedSegment = bufferedSegments[nextBufferedInRangeIdx];
    if (nextBufferedSegment.bufferedStart !== void 0 && nextBufferedSegment.bufferedStart > checkedRange.start && (nextSegmentStart === null || nextBufferedSegment.infos.segment.end <= nextSegmentStart)) {
      log_default.debug("RS: current discontinuity encountered", adaptation.type, nextBufferedSegment.bufferedStart);
      return {
        start: void 0,
        end: nextBufferedSegment.bufferedStart
      };
    }
    const nextHoleIdx = getIndexOfFirstDiscontinuityBetweenChunks(bufferedSegments, checkedRange, nextBufferedInRangeIdx + 1);
    if (nextHoleIdx !== null && (nextSegmentStart === null || bufferedSegments[nextHoleIdx].infos.segment.end <= nextSegmentStart)) {
      const start = bufferedSegments[nextHoleIdx - 1].bufferedEnd;
      const end = bufferedSegments[nextHoleIdx].bufferedStart;
      log_default.debug("RS: future discontinuity encountered", adaptation.type, start, end);
      return { start, end };
    } else if (nextSegmentStart === null) {
      if (hasFinishedLoading && period.end !== void 0) {
        if (checkedRange.end < period.end) {
          return null;
        }
        const lastBufferedInPeriodIdx = getIndexOfLastChunkInPeriod(bufferedSegments, period.end);
        if (lastBufferedInPeriodIdx !== null) {
          const lastSegment = bufferedSegments[lastBufferedInPeriodIdx];
          if (lastSegment.bufferedEnd !== void 0 && lastSegment.bufferedEnd < period.end) {
            log_default.debug("RS: discontinuity encountered at the end of the current period", adaptation.type, lastSegment.bufferedEnd, period.end);
            return {
              start: lastSegment.bufferedEnd,
              end: null
            };
          }
        }
      }
      if (period.end !== void 0 && checkedRange.end >= period.end) {
        return null;
      }
      for (let bufIdx = bufferedSegments.length - 1; bufIdx >= 0; bufIdx--) {
        const bufSeg = bufferedSegments[bufIdx];
        if (bufSeg.bufferedStart === void 0) {
          break;
        }
        if (bufSeg.bufferedStart < checkedRange.end) {
          if (bufSeg.bufferedEnd !== void 0 && bufSeg.bufferedEnd < checkedRange.end) {
            const discontinuityEnd = representation.index.checkDiscontinuity(checkedRange.end);
            if (discontinuityEnd !== null) {
              return {
                start: bufSeg.bufferedEnd,
                end: discontinuityEnd
              };
            }
          }
          return null;
        }
      }
    }
    return null;
  }
  function getIndexOfFirstChunkInRange(bufferedChunks, range) {
    for (let bufIdx = 0; bufIdx < bufferedChunks.length; bufIdx++) {
      const bufSeg = bufferedChunks[bufIdx];
      if (bufSeg.bufferedStart === void 0 || bufSeg.bufferedEnd === void 0 || bufSeg.bufferedStart >= range.end) {
        return null;
      }
      if (bufSeg.bufferedEnd > range.start) {
        return bufIdx;
      }
    }
    return null;
  }
  function getIndexOfFirstDiscontinuityBetweenChunks(bufferedChunks, range, startFromIndex) {
    if (startFromIndex <= 0) {
      log_default.error("RS: Asked to check a discontinuity before the first chunk.");
      return null;
    }
    for (let bufIdx = startFromIndex; bufIdx < bufferedChunks.length; bufIdx++) {
      const currSegment = bufferedChunks[bufIdx];
      const prevSegment = bufferedChunks[bufIdx - 1];
      if (currSegment.bufferedStart === void 0 || prevSegment.bufferedEnd === void 0 || currSegment.bufferedStart >= range.end) {
        return null;
      }
      if (currSegment.bufferedStart - prevSegment.bufferedEnd > 0) {
        return bufIdx;
      }
    }
    return null;
  }
  function getIndexOfLastChunkInPeriod(bufferedChunks, periodEnd) {
    for (let bufIdx = bufferedChunks.length - 1; bufIdx >= 0; bufIdx--) {
      const bufSeg = bufferedChunks[bufIdx];
      if (bufSeg.bufferedStart === void 0) {
        return null;
      }
      if (bufSeg.bufferedStart < periodEnd) {
        return bufIdx;
      }
    }
    return null;
  }

  // src/worker/core/stream/representation/get_needed_segments.ts
  init_define_ENVIRONMENT();
  function getNeededSegments({
    bufferedSegments,
    content,
    currentPlaybackTime,
    fastSwitchThreshold,
    getBufferedHistory,
    neededRange,
    segmentsBeingPushed,
    maxBufferSize
  }) {
    const { adaptation, representation } = content;
    let availableBufferSize = getAvailableBufferSize(bufferedSegments, segmentsBeingPushed, maxBufferSize);
    const availableSegmentsForRange = representation.index.getSegments(neededRange.start, neededRange.end - neededRange.start);
    const segmentsToKeep = bufferedSegments.filter((bufferedSegment) => !shouldContentBeReplaced(bufferedSegment.infos, content, currentPlaybackTime, fastSwitchThreshold)).filter((currentSeg, i, consideredSegments) => {
      const prevSeg = i === 0 ? null : consideredSegments[i - 1];
      const nextSeg = i >= consideredSegments.length - 1 ? null : consideredSegments[i + 1];
      let lazySegmentHistory = null;
      if (doesStartSeemGarbageCollected(currentSeg, prevSeg, neededRange.start)) {
        lazySegmentHistory = getBufferedHistory(currentSeg.infos);
        if (shouldReloadSegmentGCedAtTheStart(lazySegmentHistory, currentSeg.bufferedStart)) {
          return false;
        }
        log_default.debug("Stream: skipping segment gc-ed at the start", currentSeg.start, currentSeg.bufferedStart);
      }
      if (doesEndSeemGarbageCollected(currentSeg, nextSeg, neededRange.end)) {
        lazySegmentHistory = lazySegmentHistory ?? getBufferedHistory(currentSeg.infos);
        if (shouldReloadSegmentGCedAtTheEnd(lazySegmentHistory, currentSeg.bufferedEnd)) {
          return false;
        }
        log_default.debug("Stream: skipping segment gc-ed at the end", currentSeg.end, currentSeg.bufferedEnd);
      }
      return true;
    });
    const {
      MINIMUM_SEGMENT_SIZE,
      MIN_BUFFER_AHEAD
    } = config_default.getCurrent();
    let shouldStopLoadingSegments = false;
    const ROUNDING_ERROR = Math.min(1 / 60, MINIMUM_SEGMENT_SIZE);
    let isBufferFull = false;
    const segmentsOnHold = [];
    const segmentsToLoad = availableSegmentsForRange.filter((segment) => {
      const contentObject = object_assign_default({ segment }, content);
      if (segmentsBeingPushed.length > 0) {
        const isAlreadyBeingPushed = segmentsBeingPushed.some((pendingSegment) => areSameContent(contentObject, pendingSegment));
        if (isAlreadyBeingPushed) {
          return false;
        }
      }
      const { duration, time, end } = segment;
      if (segment.isInit) {
        return true;
      }
      if (shouldStopLoadingSegments) {
        segmentsOnHold.push(segment);
        return false;
      }
      if (segment.complete && duration < MINIMUM_SEGMENT_SIZE) {
        return false;
      }
      if (segmentsBeingPushed.length > 0) {
        const waitForPushedSegment = segmentsBeingPushed.some((pendingSegment) => {
          if (pendingSegment.period.id !== content.period.id || pendingSegment.adaptation.id !== content.adaptation.id) {
            return false;
          }
          const { segment: oldSegment } = pendingSegment;
          if (oldSegment.time - ROUNDING_ERROR > time) {
            return false;
          }
          if (oldSegment.end + ROUNDING_ERROR < end) {
            return false;
          }
          return !shouldContentBeReplaced(pendingSegment, contentObject, currentPlaybackTime, fastSwitchThreshold);
        });
        if (waitForPushedSegment) {
          return false;
        }
      }
      for (let i = 0; i < segmentsToKeep.length; i++) {
        const completeSeg = segmentsToKeep[i];
        const areFromSamePeriod = completeSeg.infos.period.id === content.period.id;
        if (areFromSamePeriod) {
          const completeSegInfos = completeSeg.infos.segment;
          if (time - completeSegInfos.time > -ROUNDING_ERROR && completeSegInfos.end - end > -ROUNDING_ERROR) {
            return false;
          }
        }
      }
      const estimatedSegmentSize = duration * content.representation.bitrate;
      if (availableBufferSize - estimatedSegmentSize < 0) {
        isBufferFull = true;
        if (time > neededRange.start + MIN_BUFFER_AHEAD) {
          shouldStopLoadingSegments = true;
          segmentsOnHold.push(segment);
          return false;
        }
      }
      const segmentHistory = getBufferedHistory(contentObject);
      if (segmentHistory.length > 1) {
        const lastTimeItWasPushed = segmentHistory[segmentHistory.length - 1];
        const beforeLastTimeItWasPushed = segmentHistory[segmentHistory.length - 2];
        if (lastTimeItWasPushed.buffered === null && beforeLastTimeItWasPushed.buffered === null) {
          log_default.warn("Stream: Segment GCed multiple times in a row, ignoring it.", "If this happens a lot and lead to unpleasant experience, please  check your device's available memory. If it's low when this message is emitted, you might want to update the RxPlayer's settings (`maxBufferAhead`, `maxVideoBufferSize` etc.) so less memory is used by regular media data buffering." + adaptation.type, representation.id, segment.time);
          return false;
        }
      }
      for (let i = 0; i < segmentsToKeep.length; i++) {
        const completeSeg = segmentsToKeep[i];
        if (completeSeg.end + ROUNDING_ERROR > time) {
          const shouldLoad = completeSeg.start > time + ROUNDING_ERROR || getLastContiguousSegment(segmentsToKeep, i).end < end - ROUNDING_ERROR;
          if (shouldLoad) {
            availableBufferSize -= estimatedSegmentSize;
          }
          return shouldLoad;
        }
      }
      availableBufferSize -= estimatedSegmentSize;
      return true;
    });
    return { segmentsToLoad, segmentsOnHold, isBufferFull };
  }
  function getAvailableBufferSize(bufferedSegments, segmentsBeingPushed, maxVideoBufferSize2) {
    let availableBufferSize = maxVideoBufferSize2 * 8e3;
    availableBufferSize -= segmentsBeingPushed.reduce((size, segment) => {
      const { bitrate } = segment.representation;
      const { duration } = segment.segment;
      return size + bitrate * duration;
    }, 0);
    return bufferedSegments.reduce((size, chunk) => {
      if (chunk.chunkSize !== void 0) {
        return size - chunk.chunkSize * 8;
      } else {
        return size;
      }
    }, availableBufferSize);
  }
  function getLastContiguousSegment(bufferedSegments, startIndex) {
    let j = startIndex + 1;
    const { MINIMUM_SEGMENT_SIZE } = config_default.getCurrent();
    const ROUNDING_ERROR = Math.min(1 / 60, MINIMUM_SEGMENT_SIZE);
    while (j < bufferedSegments.length - 1 && bufferedSegments[j - 1].end + ROUNDING_ERROR > bufferedSegments[j].start) {
      j++;
    }
    j--;
    return bufferedSegments[j];
  }
  function shouldContentBeReplaced(oldContent, currentContent, currentPlaybackTime, fastSwitchThreshold) {
    const { CONTENT_REPLACEMENT_PADDING } = config_default.getCurrent();
    if (oldContent.period.id !== currentContent.period.id) {
      return false;
    }
    const { segment } = oldContent;
    if (segment.time < currentPlaybackTime + CONTENT_REPLACEMENT_PADDING) {
      return false;
    }
    if (oldContent.adaptation.id !== currentContent.adaptation.id) {
      return true;
    }
    return canFastSwitch(oldContent.representation, currentContent.representation, fastSwitchThreshold);
  }
  function canFastSwitch(oldSegmentRepresentation, newSegmentRepresentation, fastSwitchThreshold) {
    const oldContentBitrate = oldSegmentRepresentation.bitrate;
    const { BITRATE_REBUFFERING_RATIO } = config_default.getCurrent();
    if (fastSwitchThreshold === void 0) {
      const bitrateCeil = oldContentBitrate * BITRATE_REBUFFERING_RATIO;
      return newSegmentRepresentation.bitrate > bitrateCeil;
    }
    return oldContentBitrate < fastSwitchThreshold && newSegmentRepresentation.bitrate > oldContentBitrate;
  }
  function doesStartSeemGarbageCollected(currentSeg, prevSeg, maximumStartTime) {
    const { MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT } = config_default.getCurrent();
    if (currentSeg.bufferedStart === void 0) {
      log_default.warn("Stream: Start of a segment unknown. Assuming it is garbage collected by default.", currentSeg.start);
      return true;
    }
    if (prevSeg !== null && prevSeg.bufferedEnd !== void 0 && currentSeg.bufferedStart - prevSeg.bufferedEnd < 0.1) {
      return false;
    }
    if (maximumStartTime < currentSeg.bufferedStart && currentSeg.bufferedStart - currentSeg.start > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
      log_default.info("Stream: The start of the wanted segment has been garbage collected", currentSeg.start, currentSeg.bufferedStart);
      return true;
    }
    return false;
  }
  function doesEndSeemGarbageCollected(currentSeg, nextSeg, minimumEndTime) {
    const { MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT } = config_default.getCurrent();
    if (currentSeg.bufferedEnd === void 0) {
      log_default.warn("Stream: End of a segment unknown. Assuming it is garbage collected by default.", currentSeg.end);
      return true;
    }
    if (nextSeg !== null && nextSeg.bufferedStart !== void 0 && nextSeg.bufferedStart - currentSeg.bufferedEnd < 0.1) {
      return false;
    }
    if (minimumEndTime > currentSeg.bufferedEnd && currentSeg.end - currentSeg.bufferedEnd > MAX_TIME_MISSING_FROM_COMPLETE_SEGMENT) {
      log_default.info("Stream: The end of the wanted segment has been garbage collected", currentSeg.start, currentSeg.bufferedStart);
      return true;
    }
    return false;
  }
  function shouldReloadSegmentGCedAtTheStart(segmentEntries, currentBufferedStart) {
    if (segmentEntries.length < 2) {
      return true;
    }
    const lastEntry = segmentEntries[segmentEntries.length - 1];
    const lastBufferedStart = lastEntry.buffered?.start;
    if (currentBufferedStart !== void 0 && lastBufferedStart !== void 0 && currentBufferedStart - lastBufferedStart > 0.05) {
      return true;
    }
    const prevEntry = segmentEntries[segmentEntries.length - 2];
    const prevBufferedStart = prevEntry.buffered?.start;
    if (prevBufferedStart === void 0 || lastBufferedStart === void 0) {
      return true;
    }
    return Math.abs(prevBufferedStart - lastBufferedStart) > 0.01;
  }
  function shouldReloadSegmentGCedAtTheEnd(segmentEntries, currentBufferedEnd) {
    if (segmentEntries.length < 2) {
      return true;
    }
    const lastEntry = segmentEntries[segmentEntries.length - 1];
    const lastBufferedEnd = lastEntry.buffered?.end;
    if (currentBufferedEnd !== void 0 && lastBufferedEnd !== void 0 && lastBufferedEnd - currentBufferedEnd > 0.05) {
      return true;
    }
    const prevEntry = segmentEntries[segmentEntries.length - 2];
    const prevBufferedEnd = prevEntry.buffered?.end;
    if (prevBufferedEnd === void 0 || lastBufferedEnd === void 0) {
      return true;
    }
    return Math.abs(prevBufferedEnd - lastBufferedEnd) > 0.01;
  }

  // src/worker/core/stream/representation/get_segment_priority.ts
  init_define_ENVIRONMENT();
  function getSegmentPriority(segmentTime, wantedStartTimestamp) {
    const distance = segmentTime - wantedStartTimestamp;
    const { SEGMENT_PRIORITIES_STEPS } = config_default.getCurrent();
    for (let priority = 0; priority < SEGMENT_PRIORITIES_STEPS.length; priority++) {
      if (distance < SEGMENT_PRIORITIES_STEPS[priority]) {
        return priority;
      }
    }
    return SEGMENT_PRIORITIES_STEPS.length;
  }

  // src/worker/core/stream/representation/get_buffer_status.ts
  function getBufferStatus(content, initialWantedTime, playbackObserver2, fastSwitchThreshold, bufferGoal, maxBufferSize, segmentBuffer) {
    segmentBuffer.synchronizeInventory();
    const { representation } = content;
    const neededRange = getRangeOfNeededSegments(content, initialWantedTime, bufferGoal);
    const shouldRefreshManifest = representation.index.shouldRefresh(neededRange.start, neededRange.end);
    const segmentsBeingPushed = segmentBuffer.getPendingOperations().filter((operation) => operation.type === 2 /* EndOfSegment */).map((operation) => operation.value);
    const bufferedSegments = getPlayableBufferedSegments({
      start: Math.max(neededRange.start - 0.5, 0),
      end: neededRange.end + 0.5
    }, segmentBuffer.getInventory());
    const currentPlaybackTime = playbackObserver2.getCurrentTime();
    const getBufferedHistory = segmentBuffer.getSegmentHistory.bind(segmentBuffer);
    const {
      segmentsToLoad,
      segmentsOnHold,
      isBufferFull
    } = getNeededSegments({
      content,
      bufferedSegments,
      currentPlaybackTime,
      fastSwitchThreshold,
      getBufferedHistory,
      neededRange,
      segmentsBeingPushed,
      maxBufferSize
    });
    const prioritizedNeededSegments = segmentsToLoad.map((segment) => ({
      priority: getSegmentPriority(segment.time, initialWantedTime),
      segment
    }));
    const hasFinishedLoading = neededRange.hasReachedPeriodEnd && prioritizedNeededSegments.length === 0 && segmentsOnHold.length === 0;
    let imminentDiscontinuity;
    if (!representation.index.isInitialized() || !representation.index.areSegmentsChronologicallyGenerated() && !hasFinishedLoading) {
      imminentDiscontinuity = null;
    } else {
      let nextSegmentStart = null;
      if (segmentsBeingPushed.length > 0) {
        nextSegmentStart = Math.min(...segmentsBeingPushed.map((info) => info.segment.time));
      }
      if (segmentsOnHold.length > 0) {
        nextSegmentStart = nextSegmentStart !== null ? Math.min(nextSegmentStart, segmentsOnHold[0].time) : segmentsOnHold[0].time;
      }
      if (prioritizedNeededSegments.length > 0) {
        nextSegmentStart = nextSegmentStart !== null ? Math.min(nextSegmentStart, prioritizedNeededSegments[0].segment.time) : prioritizedNeededSegments[0].segment.time;
      }
      imminentDiscontinuity = checkForDiscontinuity(content, neededRange, nextSegmentStart, hasFinishedLoading, bufferedSegments);
    }
    return {
      imminentDiscontinuity,
      hasFinishedLoading,
      neededSegments: prioritizedNeededSegments,
      isBufferFull,
      shouldRefreshManifest
    };
  }
  function getRangeOfNeededSegments(content, initialWantedTime, bufferGoal) {
    let wantedStartPosition;
    const { manifest, period, representation } = content;
    const lastIndexPosition = representation.index.getLastPosition();
    const representationIndex = representation.index;
    if (!isNullOrUndefined(lastIndexPosition) && initialWantedTime >= lastIndexPosition && representationIndex.isInitialized() && representationIndex.isFinished() && isPeriodTheCurrentAndLastOne(manifest, period, initialWantedTime)) {
      wantedStartPosition = lastIndexPosition - 1;
    } else {
      wantedStartPosition = initialWantedTime;
    }
    const wantedEndPosition = wantedStartPosition + bufferGoal;
    let hasReachedPeriodEnd;
    if (!representation.index.isInitialized() || !representation.index.isFinished() || period.end === void 0) {
      hasReachedPeriodEnd = false;
    } else if (lastIndexPosition === void 0) {
      hasReachedPeriodEnd = wantedEndPosition >= period.end;
    } else if (lastIndexPosition === null) {
      hasReachedPeriodEnd = true;
    } else {
      hasReachedPeriodEnd = wantedEndPosition >= lastIndexPosition;
    }
    return {
      start: Math.max(wantedStartPosition, period.start),
      end: Math.min(wantedEndPosition, period.end ?? Infinity),
      hasReachedPeriodEnd
    };
  }
  function isPeriodTheCurrentAndLastOne(manifest, period, time) {
    return period.containsTime(time) && manifest.isLastPeriodKnown && period.id === manifest.periods[manifest.periods.length - 1]?.id;
  }
  function getPlayableBufferedSegments(neededRange, segmentInventory) {
    const { MINIMUM_SEGMENT_SIZE } = config_default.getCurrent();
    const segmentRoundingError = Math.max(1 / 60, MINIMUM_SEGMENT_SIZE);
    const minEnd = neededRange.start + segmentRoundingError;
    const maxStart = neededRange.end - segmentRoundingError;
    const overlappingChunks = [];
    for (let i = segmentInventory.length - 1; i >= 0; i--) {
      const eltInventory = segmentInventory[i];
      const { representation } = eltInventory.infos;
      if (!eltInventory.partiallyPushed && representation.decipherable !== false && representation.isSupported) {
        const inventorySegment = eltInventory.infos.segment;
        const eltInventoryStart = inventorySegment.time / inventorySegment.timescale;
        const eltInventoryEnd = !inventorySegment.complete ? eltInventory.end : eltInventoryStart + inventorySegment.duration / inventorySegment.timescale;
        if (eltInventoryEnd > minEnd && eltInventoryStart < maxStart || eltInventory.end > minEnd && eltInventory.start < maxStart) {
          overlappingChunks.unshift(eltInventory);
        }
      }
    }
    return overlappingChunks;
  }

  // src/worker/core/stream/representation/push_init_segment.ts
  init_define_ENVIRONMENT();

  // src/worker/core/stream/representation/append_segment_to_buffer.ts
  init_define_ENVIRONMENT();

  // src/worker/core/stream/representation/force_garbage_collection.ts
  init_define_ENVIRONMENT();
  function forceGarbageCollection(currentPosition, bufferingQueue) {
    return defer(() => {
      const GC_GAP_CALM = config_default.getCurrent().BUFFER_GC_GAPS.CALM;
      const GC_GAP_BEEFY = config_default.getCurrent().BUFFER_GC_GAPS.BEEFY;
      log_default.warn("Stream: Running garbage collector");
      const buffered = bufferingQueue.getBufferedRanges();
      let cleanedupRanges = selectGCedRanges(currentPosition, buffered, GC_GAP_CALM);
      if (cleanedupRanges.length === 0) {
        cleanedupRanges = selectGCedRanges(currentPosition, buffered, GC_GAP_BEEFY);
      }
      if (log_default.hasLevel("DEBUG")) {
        log_default.debug("Stream: GC cleaning", cleanedupRanges.map(({ start, end }) => `start: ${start} - end ${end}`).join(", "));
      }
      return from(cleanedupRanges.map(({ start, end }) => start >= end ? of(null) : bufferingQueue.removeBuffer(start, end))).pipe(concatAll());
    });
  }
  function selectGCedRanges(position, buffered, gcGap) {
    const { innerRange, outerRanges } = getInnerAndOuterTimeRanges(buffered, position);
    const cleanedupRanges = [];
    for (let i = 0; i < outerRanges.length; i++) {
      const outerRange = outerRanges[i];
      if (position - gcGap > outerRange.end) {
        cleanedupRanges.push(outerRange);
      } else if (position + gcGap < outerRange.start) {
        cleanedupRanges.push(outerRange);
      }
    }
    if (innerRange !== null) {
      if (log_default.hasLevel("DEBUG")) {
        log_default.debug("Stream: GC removing part of inner range", cleanedupRanges.map(({ start, end }) => `start: ${start} - end ${end}`).join(", "));
      }
      if (position - gcGap > innerRange.start) {
        cleanedupRanges.push({
          start: innerRange.start,
          end: position - gcGap
        });
      }
      if (position + gcGap < innerRange.end) {
        cleanedupRanges.push({
          start: position + gcGap,
          end: innerRange.end
        });
      }
    }
    return cleanedupRanges;
  }

  // src/worker/core/stream/representation/append_segment_to_buffer.ts
  function appendSegmentToBuffer(playbackObserver2, segmentBuffer, dataInfos) {
    const append$ = segmentBuffer.pushChunk(dataInfos);
    return append$.pipe(catchError((appendError) => {
      if (!(appendError instanceof Error) || appendError.name !== "QuotaExceededError") {
        const reason = appendError instanceof Error ? appendError.toString() : "An unknown error happened when pushing content";
        throw new MediaError("BUFFER_APPEND_ERROR", reason);
      }
      return playbackObserver2.getReference().asObservable().pipe(take(1), mergeMap((observation) => {
        const currentPos = observation.position.pending ?? observation.position.last;
        return concat(forceGarbageCollection(currentPos, segmentBuffer).pipe(ignoreElements()), append$).pipe(catchError((forcedGCError) => {
          const reason = forcedGCError instanceof Error ? forcedGCError.toString() : "Could not clean the buffer";
          throw new MediaError("BUFFER_FULL_ERROR", reason);
        }));
      }));
    }));
  }

  // src/worker/core/stream/representation/push_init_segment.ts
  function pushInitSegment({
    playbackObserver: playbackObserver2,
    content,
    segment,
    segmentData,
    segmentBuffer
  }) {
    return defer(() => {
      if (segmentData === null) {
        return EMPTY;
      }
      const codec = content.representation.getMimeTypeString();
      const data = {
        initSegment: segmentData,
        chunk: null,
        timestampOffset: 0,
        appendWindow: [void 0, void 0],
        codec
      };
      return appendSegmentToBuffer(playbackObserver2, segmentBuffer, { data, inventoryInfos: null }).pipe(map(() => {
        const buffered = segmentBuffer.getBufferedRanges();
        return events_generators_default.addedSegment(content, segment, buffered, segmentData);
      }));
    });
  }

  // src/worker/core/stream/representation/push_media_segment.ts
  init_define_ENVIRONMENT();
  function pushMediaSegment({
    playbackObserver: playbackObserver2,
    content,
    initSegmentData,
    parsedSegment,
    segment,
    segmentBuffer
  }) {
    return defer(() => {
      if (parsedSegment.chunkData === null) {
        return EMPTY;
      }
      const {
        chunkData,
        chunkInfos,
        chunkOffset,
        chunkSize,
        appendWindow
      } = parsedSegment;
      const codec = content.representation.getMimeTypeString();
      const { APPEND_WINDOW_SECURITIES } = config_default.getCurrent();
      const safeAppendWindow = [
        appendWindow[0] !== void 0 ? Math.max(0, appendWindow[0] - APPEND_WINDOW_SECURITIES.START) : void 0,
        appendWindow[1] !== void 0 ? appendWindow[1] + APPEND_WINDOW_SECURITIES.END : void 0
      ];
      const data = {
        initSegment: initSegmentData,
        chunk: chunkData,
        timestampOffset: chunkOffset,
        appendWindow: safeAppendWindow,
        codec
      };
      let estimatedStart = chunkInfos?.time ?? segment.time;
      const estimatedDuration = chunkInfos?.duration ?? segment.duration;
      let estimatedEnd = estimatedStart + estimatedDuration;
      if (safeAppendWindow[0] !== void 0) {
        estimatedStart = Math.max(estimatedStart, safeAppendWindow[0]);
      }
      if (safeAppendWindow[1] !== void 0) {
        estimatedEnd = Math.min(estimatedEnd, safeAppendWindow[1]);
      }
      const inventoryInfos = object_assign_default({
        segment,
        chunkSize,
        start: estimatedStart,
        end: estimatedEnd
      }, content);
      return appendSegmentToBuffer(playbackObserver2, segmentBuffer, { data, inventoryInfos }).pipe(map(() => {
        const buffered = segmentBuffer.getBufferedRanges();
        return events_generators_default.addedSegment(content, segment, buffered, chunkData);
      }));
    });
  }

  // src/worker/core/stream/representation/representation_stream.ts
  function RepresentationStream({
    content,
    options,
    playbackObserver: playbackObserver2,
    segmentBuffer,
    segmentFetcher,
    terminate$
  }) {
    const {
      period,
      adaptation,
      representation
    } = content;
    const {
      bufferGoal$,
      maxBufferSize$,
      drmSystemId,
      fastSwitchThreshold$
    } = options;
    const bufferType = adaptation.type;
    const initSegmentState = {
      segment: representation.index.getInitSegment(),
      segmentData: null,
      isLoaded: false
    };
    const reCheckNeededSegments$ = new Subject();
    const lastSegmentQueue = createSharedReference({
      initSegment: null,
      segmentQueue: []
    });
    const hasInitSegment = initSegmentState.segment !== null;
    const downloadingQueue = new DownloadingQueue(content, lastSegmentQueue, segmentFetcher, hasInitSegment);
    if (!hasInitSegment) {
      initSegmentState.segmentData = null;
      initSegmentState.isLoaded = true;
    }
    let hasSentEncryptionData = false;
    let encryptionEvent$ = EMPTY;
    if (drmSystemId !== void 0) {
      const encryptionData = representation.getEncryptionData(drmSystemId);
      if (encryptionData.length > 0 && encryptionData.every((e) => e.keyIds !== void 0)) {
        encryptionEvent$ = of(...encryptionData.map((d) => events_generators_default.encryptionDataEncountered(d, content)));
        hasSentEncryptionData = true;
      }
    }
    const queue$ = downloadingQueue.start().pipe(mergeMap(onQueueEvent));
    const status$ = combineLatest([
      playbackObserver2.getReference().asObservable(),
      bufferGoal$,
      maxBufferSize$,
      terminate$.pipe(take(1), startWith(null)),
      reCheckNeededSegments$.pipe(startWith(void 0))
    ]).pipe(withLatestFrom(fastSwitchThreshold$), mergeMap(function([
      [observation, bufferGoal, maxBufferSize, terminate],
      fastSwitchThreshold
    ]) {
      const initialWantedTime = observation.position.pending ?? observation.position.last;
      const status = getBufferStatus(content, initialWantedTime, playbackObserver2, fastSwitchThreshold, bufferGoal, maxBufferSize, segmentBuffer);
      const { neededSegments } = status;
      let neededInitSegment = null;
      if (!representation.index.isInitialized()) {
        if (initSegmentState.segment === null) {
          log_default.warn("Stream: Uninitialized index without an initialization segment");
        } else if (initSegmentState.isLoaded) {
          log_default.warn("Stream: Uninitialized index with an already loaded initialization segment");
        } else {
          const wantedStart = observation.position.pending ?? observation.position.last;
          neededInitSegment = {
            segment: initSegmentState.segment,
            priority: getSegmentPriority(period.start, wantedStart)
          };
        }
      } else if (neededSegments.length > 0 && !initSegmentState.isLoaded && initSegmentState.segment !== null) {
        const initSegmentPriority = neededSegments[0].priority;
        neededInitSegment = {
          segment: initSegmentState.segment,
          priority: initSegmentPriority
        };
      }
      if (terminate === null) {
        lastSegmentQueue.setValue({
          initSegment: neededInitSegment,
          segmentQueue: neededSegments
        });
      } else if (terminate.urgent) {
        log_default.debug("Stream: Urgent switch, terminate now.", bufferType);
        lastSegmentQueue.setValue({ initSegment: null, segmentQueue: [] });
        lastSegmentQueue.finish();
        return of(events_generators_default.streamTerminating());
      } else {
        const mostNeededSegment = neededSegments[0];
        const initSegmentRequest = downloadingQueue.getRequestedInitSegment();
        const currentSegmentRequest = downloadingQueue.getRequestedMediaSegment();
        const nextQueue = currentSegmentRequest === null || mostNeededSegment === void 0 || currentSegmentRequest.id !== mostNeededSegment.segment.id ? [] : [mostNeededSegment];
        const nextInit = initSegmentRequest === null ? null : neededInitSegment;
        lastSegmentQueue.setValue({
          initSegment: nextInit,
          segmentQueue: nextQueue
        });
        if (nextQueue.length === 0 && nextInit === null) {
          log_default.debug("Stream: No request left, terminate", bufferType);
          lastSegmentQueue.finish();
          return of(events_generators_default.streamTerminating());
        }
      }
      const bufferStatusEvt = of({
        type: "stream-status",
        value: {
          period,
          position: observation.position.last,
          bufferType,
          imminentDiscontinuity: status.imminentDiscontinuity,
          hasFinishedLoading: status.hasFinishedLoading,
          neededSegments: status.neededSegments
        }
      });
      let bufferRemoval = EMPTY;
      const { UPTO_CURRENT_POSITION_CLEANUP } = config_default.getCurrent();
      if (status.isBufferFull) {
        const gcedPosition = Math.max(0, initialWantedTime - UPTO_CURRENT_POSITION_CLEANUP);
        if (gcedPosition > 0) {
          bufferRemoval = segmentBuffer.removeBuffer(0, gcedPosition).pipe(ignoreElements());
        }
      }
      return status.shouldRefreshManifest ? concat(of(events_generators_default.needsManifestRefresh()), bufferStatusEvt, bufferRemoval) : concat(bufferStatusEvt, bufferRemoval);
    }), takeWhile((e) => e.type !== "stream-terminating", true));
    return merge(status$, queue$, encryptionEvent$).pipe(share());
    function onQueueEvent(evt) {
      switch (evt.type) {
        case "retry":
          return concat(of({ type: "warning", value: evt.value.error }), defer(() => {
            const retriedSegment = evt.value.segment;
            const { index } = representation;
            if (index.isSegmentStillAvailable(retriedSegment) === false) {
              reCheckNeededSegments$.next();
            } else if (index.canBeOutOfSyncError(evt.value.error, retriedSegment)) {
              return of(events_generators_default.manifestMightBeOufOfSync());
            }
            return EMPTY;
          }));
        case "parsed-init":
        case "parsed-media":
          return onParsedChunk(evt);
        case "end-of-segment": {
          const { segment } = evt.value;
          return segmentBuffer.endOfSegment(object_assign_default({ segment }, content)).pipe(ignoreElements());
        }
        case "end-of-queue":
          reCheckNeededSegments$.next();
          return EMPTY;
        default:
          assertUnreachable(evt);
      }
    }
    function onParsedChunk(evt) {
      if (evt.segmentType === "init") {
        (0, import_next_tick3.default)(() => {
          reCheckNeededSegments$.next();
        });
        initSegmentState.segmentData = evt.initializationData;
        initSegmentState.isLoaded = true;
        const allEncryptionData = representation.getAllEncryptionData();
        const initEncEvt$ = !hasSentEncryptionData && allEncryptionData.length > 0 ? of(...allEncryptionData.map((p) => events_generators_default.encryptionDataEncountered(p, content))) : EMPTY;
        const pushEvent$ = pushInitSegment({
          playbackObserver: playbackObserver2,
          content,
          segment: evt.segment,
          segmentData: evt.initializationData,
          segmentBuffer
        });
        return merge(initEncEvt$, pushEvent$);
      } else {
        const {
          inbandEvents,
          needsManifestRefresh,
          protectionDataUpdate
        } = evt;
        const segmentEncryptionEvent$ = protectionDataUpdate && !hasSentEncryptionData ? of(...representation.getAllEncryptionData().map((p) => events_generators_default.encryptionDataEncountered(p, content))) : EMPTY;
        const manifestRefresh$ = needsManifestRefresh === true ? of(events_generators_default.needsManifestRefresh()) : EMPTY;
        const inbandEvents$ = inbandEvents !== void 0 && inbandEvents.length > 0 ? of({
          type: "inband-events",
          value: inbandEvents
        }) : EMPTY;
        const initSegmentData = initSegmentState.segmentData;
        const pushMediaSegment$ = pushMediaSegment({
          playbackObserver: playbackObserver2,
          content,
          initSegmentData,
          parsedSegment: evt,
          segment: evt.segment,
          segmentBuffer
        });
        return concat(segmentEncryptionEvent$, manifestRefresh$, inbandEvents$, pushMediaSegment$);
      }
    }
  }

  // src/worker/core/stream/representation/index.ts
  var representation_default2 = RepresentationStream;

  // src/worker/core/stream/adaptation/create_representation_estimator.ts
  init_define_ENVIRONMENT();
  function getRepresentationEstimate(content, representationEstimator, currentRepresentation, playbackObserver2, onFatalError, cancellationSignal) {
    const { manifest, adaptation } = content;
    const representations = reference_default([]);
    updateRepresentationsReference();
    manifest.addEventListener("decipherabilityUpdate", updateRepresentationsReference);
    const unregisterCleanUp = cancellationSignal.register(cleanUp);
    const {
      estimates: estimateRef,
      callbacks: abrCallbacks
    } = representationEstimator(content, currentRepresentation, representations, playbackObserver2, cancellationSignal);
    return { abrCallbacks, estimateRef };
    function updateRepresentationsReference() {
      const newRepr = adaptation.getPlayableRepresentations();
      if (newRepr.length === 0) {
        const noRepErr = new MediaError("NO_PLAYABLE_REPRESENTATION", "No Representation in the chosen " + adaptation.type + " Adaptation can be played");
        cleanUp();
        onFatalError(noRepErr);
        return;
      }
      const prevRepr = representations.getValue();
      if (prevRepr.length === newRepr.length) {
        if (prevRepr.every((r, idx) => r.id === newRepr[idx].id)) {
          return;
        }
      }
      representations.setValue(newRepr);
    }
    function cleanUp() {
      manifest.removeEventListener("decipherabilityUpdate", updateRepresentationsReference);
      representations.finish();
      if (typeof unregisterCleanUp !== "undefined") {
        unregisterCleanUp();
      }
    }
  }

  // src/worker/core/stream/adaptation/adaptation_stream.ts
  function AdaptationStream({
    playbackObserver: playbackObserver2,
    content,
    options,
    representationEstimator,
    segmentBuffer,
    segmentFetcherCreator,
    wantedBufferAhead: wantedBufferAhead2,
    maxVideoBufferSize: maxVideoBufferSize2
  }) {
    const directManualBitrateSwitching = options.manualBitrateSwitchingMode === "direct";
    const { manifest, period, adaptation } = content;
    const bufferGoalRatioMap = {};
    const currentRepresentation = createSharedReference(null);
    const abrErrorSubject = new Subject();
    const adaptiveCanceller = new TaskCanceller();
    const { estimateRef, abrCallbacks } = getRepresentationEstimate(content, representationEstimator, currentRepresentation, playbackObserver2, (err) => {
      abrErrorSubject.error(err);
    }, adaptiveCanceller.signal);
    const segmentFetcher = segmentFetcherCreator.createSegmentFetcher(adaptation.type, {
      onRequestBegin: abrCallbacks.requestBegin,
      onRequestEnd: abrCallbacks.requestEnd,
      onProgress: abrCallbacks.requestProgress,
      onMetrics: abrCallbacks.metrics
    });
    const lastEstimate = createSharedReference(null);
    const abrEstimate$ = estimateRef.asObservable().pipe(tap((estimate) => {
      lastEstimate.setValue(estimate);
    }), deferSubscriptions(), share());
    const bitrateEstimate$ = abrEstimate$.pipe(filter(({ bitrate }) => bitrate != null), distinctUntilChanged((old, current) => old.bitrate === current.bitrate), map(({ bitrate }) => {
      log_default.debug(`Stream: new ${adaptation.type} bitrate estimate`, bitrate);
      return events_generators_default.bitrateEstimationChange(adaptation.type, bitrate);
    }));
    const representationStreams$ = abrEstimate$.pipe(exhaustMap((estimate, i) => {
      return recursivelyCreateRepresentationStreams(estimate, i === 0);
    }));
    return merge(abrErrorSubject, representationStreams$, bitrateEstimate$, new Observable(() => () => adaptiveCanceller.cancel()));
    function recursivelyCreateRepresentationStreams(fromEstimate, isFirstEstimate) {
      const { representation } = fromEstimate;
      if (directManualBitrateSwitching && fromEstimate.manual && !isFirstEstimate) {
        const { DELTA_POSITION_AFTER_RELOAD } = config_default.getCurrent();
        return reloadAfterSwitch(period, adaptation.type, playbackObserver2, DELTA_POSITION_AFTER_RELOAD.bitrateSwitch);
      }
      const terminateCurrentStream$ = lastEstimate.asObservable().pipe(filter((newEstimate) => newEstimate === null || newEstimate.representation.id !== representation.id || newEstimate.manual && !fromEstimate.manual), take(1), map((newEstimate) => {
        if (newEstimate === null) {
          log_default.info("Stream: urgent Representation termination", adaptation.type);
          return { urgent: true };
        }
        if (newEstimate.urgent) {
          log_default.info("Stream: urgent Representation switch", adaptation.type);
          return { urgent: true };
        } else {
          log_default.info("Stream: slow Representation switch", adaptation.type);
          return { urgent: false };
        }
      }));
      const fastSwitchThreshold$ = !options.enableFastSwitching ? of(0) : lastEstimate.asObservable().pipe(map((estimate) => estimate === null ? void 0 : estimate.knownStableBitrate), distinctUntilChanged());
      const representationChange$ = of(events_generators_default.representationChange(adaptation.type, period, representation));
      return concat(representationChange$, createRepresentationStream(representation, terminateCurrentStream$, fastSwitchThreshold$)).pipe(tap((evt) => {
        if (evt.type === "added-segment") {
          abrCallbacks.addedSegment(evt.value);
        }
        if (evt.type === "representationChange") {
          currentRepresentation.setValue(evt.value.representation);
        }
      }), mergeMap((evt) => {
        if (evt.type === "stream-terminating") {
          const estimate = lastEstimate.getValue();
          if (estimate === null) {
            return EMPTY;
          }
          return recursivelyCreateRepresentationStreams(estimate, false);
        }
        return of(evt);
      }));
    }
    function createRepresentationStream(representation, terminateCurrentStream$, fastSwitchThreshold$) {
      return defer(() => {
        const oldBufferGoalRatio = bufferGoalRatioMap[representation.id];
        const bufferGoalRatio = oldBufferGoalRatio != null ? oldBufferGoalRatio : 1;
        bufferGoalRatioMap[representation.id] = bufferGoalRatio;
        const bufferGoal$ = wantedBufferAhead2.asObservable().pipe(map((wba) => wba * bufferGoalRatio));
        const maxBufferSize$ = adaptation.type === "video" ? maxVideoBufferSize2.asObservable() : of(Infinity);
        log_default.info("Stream: changing representation", adaptation.type, representation.id, representation.bitrate);
        return representation_default2({
          playbackObserver: playbackObserver2,
          content: {
            representation,
            adaptation,
            period,
            manifest
          },
          segmentBuffer,
          segmentFetcher,
          terminate$: terminateCurrentStream$,
          options: {
            bufferGoal$,
            maxBufferSize$,
            drmSystemId: options.drmSystemId,
            fastSwitchThreshold$
          }
        }).pipe(catchError((err) => {
          const formattedError = formatError(err, {
            defaultCode: "NONE",
            defaultReason: "Unknown `RepresentationStream` error"
          });
          if (formattedError.code === "BUFFER_FULL_ERROR") {
            const wba = wantedBufferAhead2.getValue();
            const lastBufferGoalRatio = bufferGoalRatio;
            if (lastBufferGoalRatio <= 0.25 || wba * lastBufferGoalRatio <= 2) {
              throw formattedError;
            }
            bufferGoalRatioMap[representation.id] = lastBufferGoalRatio - 0.25;
            return createRepresentationStream(representation, terminateCurrentStream$, fastSwitchThreshold$);
          }
          throw formattedError;
        }));
      });
    }
  }

  // src/worker/core/stream/adaptation/index.ts
  var adaptation_default = AdaptationStream;

  // src/worker/core/stream/period/create_empty_adaptation_stream.ts
  init_define_ENVIRONMENT();
  function createEmptyAdaptationStream(playbackObserver2, wantedBufferAhead2, bufferType, content) {
    const { period } = content;
    let hasFinishedLoading = false;
    const wantedBufferAhead$ = wantedBufferAhead2.asObservable();
    const observation$ = playbackObserver2.getReference().asObservable();
    return combineLatest([
      observation$,
      wantedBufferAhead$
    ]).pipe(mergeMap(([observation, wba]) => {
      const position = observation.position.last;
      if (period.end !== void 0 && position + wba >= period.end) {
        log_default.debug('Stream: full "empty" AdaptationStream', bufferType);
        hasFinishedLoading = true;
      }
      return of({
        type: "stream-status",
        value: {
          period,
          bufferType,
          position,
          imminentDiscontinuity: null,
          hasFinishedLoading,
          neededSegments: [],
          shouldRefreshManifest: false
        }
      });
    }));
  }

  // src/worker/core/stream/period/get_adaptation_switch_strategy.ts
  init_define_ENVIRONMENT();

  // src/common/utils/are_codecs_compatible.ts
  init_define_ENVIRONMENT();

  // src/common/utils/starts_with.ts
  init_define_ENVIRONMENT();
  function startsWith(completeString, searchString, position) {
    if (typeof String.prototype.startsWith === "function") {
      return completeString.startsWith(searchString, position);
    }
    const initialPosition = typeof position === "number" ? Math.max(position, 0) : 0;
    return completeString.substring(initialPosition, initialPosition + searchString.length) === searchString;
  }

  // src/common/utils/are_codecs_compatible.ts
  function areCodecsCompatible(a, b) {
    const [mimeTypeA, ...propsA] = a.split(";");
    const [mimeTypeB, ...propsB] = b.split(";");
    if (mimeTypeA !== mimeTypeB) {
      return false;
    }
    const codecsA = arrayFind(propsA, (prop) => startsWith(prop, "codecs="));
    const codecsB = arrayFind(propsB, (prop) => startsWith(prop, "codecs="));
    if (codecsA === void 0 || codecsB === void 0) {
      return false;
    }
    const codecA = codecsA.substring(7);
    const codecB = codecsB.substring(7);
    if (codecA.split(".")[0] !== codecB.split(".")[0]) {
      return false;
    }
    return true;
  }
  var are_codecs_compatible_default = areCodecsCompatible;

  // src/worker/core/stream/period/get_adaptation_switch_strategy.ts
  function getAdaptationSwitchStrategy(segmentBuffer, period, adaptation, playbackInfo, options) {
    if (segmentBuffer.codec !== void 0 && options.onCodecSwitch === "reload" && !hasCompatibleCodec(adaptation, segmentBuffer.codec)) {
      return { type: "needs-reload", value: void 0 };
    }
    const buffered = segmentBuffer.getBufferedRanges();
    if (buffered.length === 0) {
      return { type: "continue", value: void 0 };
    }
    const bufferedRanges = convertToRanges(buffered);
    const start = period.start;
    const end = period.end == null ? Infinity : period.end;
    const intersection = keepRangeIntersection(bufferedRanges, [{ start, end }]);
    if (intersection.length === 0) {
      return { type: "continue", value: void 0 };
    }
    segmentBuffer.synchronizeInventory();
    const inventory = segmentBuffer.getInventory();
    if (!inventory.some((buf) => buf.infos.period.id === period.id && buf.infos.adaptation.id !== adaptation.id)) {
      return { type: "continue", value: void 0 };
    }
    const adaptationInBuffer = getBufferedRangesFromAdaptation(inventory, period, adaptation);
    const unwantedRange = excludeFromRanges(intersection, adaptationInBuffer);
    if (unwantedRange.length === 0) {
      return { type: "continue", value: void 0 };
    }
    const { currentTime } = playbackInfo;
    const { audioTrackSwitchingMode } = options;
    const hasReloadSwitchingMode = adaptation.type === "video" || adaptation.type === "audio" && audioTrackSwitchingMode === "reload";
    if (hasReloadSwitchingMode && isTimeInRange({ start, end }, currentTime) && (playbackInfo.readyState > 1 || !adaptation.getPlayableRepresentations().some((rep) => are_codecs_compatible_default(rep.getMimeTypeString(), segmentBuffer.codec ?? ""))) && !isTimeInRanges(adaptationInBuffer, currentTime)) {
      return { type: "needs-reload", value: void 0 };
    }
    const shouldFlush = adaptation.type === "audio" && audioTrackSwitchingMode === "direct";
    const rangesToExclude = [];
    const lastSegmentBefore = getLastSegmentBeforePeriod(inventory, period);
    if (lastSegmentBefore !== null && (lastSegmentBefore.bufferedEnd === void 0 || period.start - lastSegmentBefore.bufferedEnd < 1)) {
      rangesToExclude.push({
        start: 0,
        end: period.start + 1
      });
    }
    const bufferType = adaptation.type;
    const { ADAPTATION_SWITCH_BUFFER_PADDINGS } = config_default.getCurrent();
    let paddingBefore = ADAPTATION_SWITCH_BUFFER_PADDINGS[bufferType].before;
    if (paddingBefore == null) {
      paddingBefore = 0;
    }
    let paddingAfter = ADAPTATION_SWITCH_BUFFER_PADDINGS[bufferType].after;
    if (paddingAfter == null) {
      paddingAfter = 0;
    }
    if (!shouldFlush) {
      rangesToExclude.push({
        start: currentTime - paddingBefore,
        end: currentTime + paddingAfter
      });
    }
    if (period.end !== void 0) {
      const firstSegmentAfter = getFirstSegmentAfterPeriod(inventory, period);
      if (firstSegmentAfter !== null && (firstSegmentAfter.bufferedStart === void 0 || firstSegmentAfter.bufferedStart - period.end < 1)) {
        rangesToExclude.push({
          start: period.end - 1,
          end: Number.MAX_VALUE
        });
      }
    }
    const toRemove = excludeFromRanges(unwantedRange, rangesToExclude);
    if (toRemove.length === 0) {
      return { type: "continue", value: void 0 };
    }
    return shouldFlush ? { type: "flush-buffer", value: toRemove } : { type: "clean-buffer", value: toRemove };
  }
  function hasCompatibleCodec(adaptation, segmentBufferCodec) {
    return adaptation.getPlayableRepresentations().some((rep) => are_codecs_compatible_default(rep.getMimeTypeString(), segmentBufferCodec));
  }
  function getBufferedRangesFromAdaptation(inventory, period, adaptation) {
    return inventory.reduce((acc, chunk) => {
      if (chunk.infos.period.id !== period.id || chunk.infos.adaptation.id !== adaptation.id) {
        return acc;
      }
      const { bufferedStart, bufferedEnd } = chunk;
      if (bufferedStart === void 0 || bufferedEnd === void 0) {
        return acc;
      }
      acc.push({ start: bufferedStart, end: bufferedEnd });
      return acc;
    }, []);
  }
  function getLastSegmentBeforePeriod(inventory, period) {
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i].infos.period.start >= period.start) {
        if (i > 0) {
          return inventory[i - 1];
        }
        return null;
      }
    }
    return inventory.length > 0 ? inventory[inventory.length - 1] : null;
  }
  function getFirstSegmentAfterPeriod(inventory, period) {
    for (let i = 0; i < inventory.length; i++) {
      if (inventory[i].infos.period.start > period.start) {
        return inventory[i];
      }
    }
    return null;
  }

  // src/worker/core/stream/period/period_stream.ts
  function PeriodStream({
    bufferType,
    content,
    garbageCollectors,
    playbackObserver: playbackObserver2,
    representationEstimator,
    segmentFetcherCreator,
    segmentBuffersStore,
    options,
    wantedBufferAhead: wantedBufferAhead2,
    maxVideoBufferSize: maxVideoBufferSize2
  }) {
    const { period } = content;
    const adaptation$ = new ReplaySubject(1);
    return adaptation$.pipe(switchMap((adaptation, switchNb) => {
      const { DELTA_POSITION_AFTER_RELOAD } = config_default.getCurrent();
      const relativePosAfterSwitch = switchNb === 0 ? 0 : bufferType === "audio" ? DELTA_POSITION_AFTER_RELOAD.trackSwitch.audio : bufferType === "video" ? DELTA_POSITION_AFTER_RELOAD.trackSwitch.video : DELTA_POSITION_AFTER_RELOAD.trackSwitch.other;
      if (adaptation === null) {
        log_default.info(`Stream: Set no ${bufferType} Adaptation. P:`, period.start);
        const segmentBufferStatus = segmentBuffersStore.getStatus(bufferType);
        let cleanBuffer$;
        if (segmentBufferStatus.type === "initialized") {
          log_default.info(`Stream: Clearing previous ${bufferType} SegmentBuffer`);
          if (segment_buffers_default.isNative(bufferType)) {
            return reloadAfterSwitch(period, bufferType, playbackObserver2, 0);
          }
          if (period.end === void 0) {
            cleanBuffer$ = segmentBufferStatus.value.removeBuffer(period.start, Infinity);
          } else if (period.end <= period.start) {
            cleanBuffer$ = of(null);
          } else {
            cleanBuffer$ = segmentBufferStatus.value.removeBuffer(period.start, period.end);
          }
        } else {
          if (segmentBufferStatus.type === "uninitialized") {
            segmentBuffersStore.disableSegmentBuffer(bufferType);
          }
          cleanBuffer$ = of(null);
        }
        return concat(cleanBuffer$.pipe(map(() => events_generators_default.adaptationChange(bufferType, null, period))), createEmptyAdaptationStream(playbackObserver2, wantedBufferAhead2, bufferType, { period }));
      }
      if (segment_buffers_default.isNative(bufferType) && segmentBuffersStore.getStatus(bufferType).type === "disabled") {
        return reloadAfterSwitch(period, bufferType, playbackObserver2, relativePosAfterSwitch);
      }
      log_default.info(`Stream: Updating ${bufferType} adaptation`, `A: ${adaptation.id}`, `P: ${period.start}`);
      const newStream$ = defer(() => {
        const readyState = playbackObserver2.getReadyState();
        const segmentBuffer = createOrReuseSegmentBuffer(segmentBuffersStore, bufferType, adaptation, options);
        const playbackInfos = {
          currentTime: playbackObserver2.getCurrentTime(),
          readyState
        };
        const strategy = getAdaptationSwitchStrategy(segmentBuffer, period, adaptation, playbackInfos, options);
        if (strategy.type === "needs-reload") {
          return reloadAfterSwitch(period, bufferType, playbackObserver2, relativePosAfterSwitch);
        }
        const needsBufferFlush$ = strategy.type === "flush-buffer" ? of(events_generators_default.needsBufferFlush()) : EMPTY;
        const cleanBuffer$ = strategy.type === "clean-buffer" || strategy.type === "flush-buffer" ? concat(...strategy.value.map(({ start, end }) => segmentBuffer.removeBuffer(start, end))).pipe(ignoreElements()) : EMPTY;
        const bufferGarbageCollector$ = garbageCollectors.get(segmentBuffer);
        const adaptationStream$ = createAdaptationStream(adaptation, segmentBuffer);
        return segmentBuffersStore.waitForUsableBuffers().pipe(mergeMap(() => {
          return concat(cleanBuffer$, needsBufferFlush$, merge(adaptationStream$, bufferGarbageCollector$));
        }));
      });
      return concat(of(events_generators_default.adaptationChange(bufferType, adaptation, period)), newStream$);
    }), startWith(events_generators_default.periodStreamReady(bufferType, period, adaptation$)));
    function createAdaptationStream(adaptation, segmentBuffer) {
      const { manifest } = content;
      const adaptationPlaybackObserver = createAdaptationStreamPlaybackObserver(playbackObserver2, segmentBuffer);
      return adaptation_default({
        content: { manifest, period, adaptation },
        options,
        playbackObserver: adaptationPlaybackObserver,
        representationEstimator,
        segmentBuffer,
        segmentFetcherCreator,
        wantedBufferAhead: wantedBufferAhead2,
        maxVideoBufferSize: maxVideoBufferSize2
      }).pipe(catchError((error) => {
        if (!segment_buffers_default.isNative(bufferType)) {
          log_default.error(`Stream: ${bufferType} Stream crashed. Aborting it.`, error instanceof Error ? error : "");
          segmentBuffersStore.disposeSegmentBuffer(bufferType);
          const formattedError = formatError(error, {
            defaultCode: "NONE",
            defaultReason: "Unknown `AdaptationStream` error"
          });
          return concat(of(events_generators_default.warning(formattedError)), createEmptyAdaptationStream(playbackObserver2, wantedBufferAhead2, bufferType, { period }));
        }
        log_default.error(`Stream: ${bufferType} Stream crashed. Stopping playback.`, error instanceof Error ? error : "");
        throw error;
      }));
    }
  }
  function createOrReuseSegmentBuffer(segmentBuffersStore, bufferType, adaptation, options) {
    const segmentBufferStatus = segmentBuffersStore.getStatus(bufferType);
    if (segmentBufferStatus.type === "initialized") {
      log_default.info("Stream: Reusing a previous SegmentBuffer for the type", bufferType);
      return segmentBufferStatus.value;
    }
    const codec = getFirstDeclaredMimeType(adaptation);
    const sbOptions = bufferType === "text" ? options.textTrackOptions : void 0;
    return segmentBuffersStore.createSegmentBuffer(bufferType, codec, sbOptions);
  }
  function getFirstDeclaredMimeType(adaptation) {
    const representations = adaptation.getPlayableRepresentations();
    if (representations.length === 0) {
      const noRepErr = new MediaError("NO_PLAYABLE_REPRESENTATION", "No Representation in the chosen " + adaptation.type + " Adaptation can be played");
      throw noRepErr;
    }
    return representations[0].getMimeTypeString();
  }
  function createAdaptationStreamPlaybackObserver(initialPlaybackObserver, segmentBuffer) {
    return initialPlaybackObserver.deriveReadOnlyObserver(function transform(observationRef, cancellationSignal) {
      const newRef = reference_default(constructAdaptationStreamPlaybackObservation());
      observationRef.onUpdate(emitAdaptationStreamPlaybackObservation, {
        clearSignal: cancellationSignal,
        emitCurrentValue: false
      });
      cancellationSignal.register(() => {
        newRef.finish();
      });
      return newRef;
      function constructAdaptationStreamPlaybackObservation() {
        const baseObservation = observationRef.getValue();
        const buffered = segmentBuffer.getBufferedRanges();
        const bufferGap = getLeftSizeOfRange(buffered, baseObservation.position.last);
        return object_assign_default({}, baseObservation, { bufferGap });
      }
      function emitAdaptationStreamPlaybackObservation() {
        newRef.setValue(constructAdaptationStreamPlaybackObservation());
      }
    });
  }

  // src/worker/core/stream/period/index.ts
  var period_default = PeriodStream;

  // src/worker/core/stream/orchestrator/active_period_emitter.ts
  init_define_ENVIRONMENT();
  function ActivePeriodEmitter(buffers$) {
    const numberOfStreams = buffers$.length;
    return merge(...buffers$).pipe(filter(({ type }) => type === "periodStreamCleared" || type === "adaptationChange" || type === "representationChange"), scan((acc, evt) => {
      switch (evt.type) {
        case "periodStreamCleared":
          {
            const { period, type } = evt.value;
            const currentInfos = acc[period.id];
            if (currentInfos !== void 0 && currentInfos.buffers.has(type)) {
              currentInfos.buffers.delete(type);
              if (currentInfos.buffers.size === 0) {
                delete acc[period.id];
              }
            }
          }
          break;
        case "adaptationChange": {
          if (evt.value.adaptation !== null) {
            return acc;
          }
        }
        case "representationChange":
          {
            const { period, type } = evt.value;
            const currentInfos = acc[period.id];
            if (currentInfos === void 0) {
              const bufferSet = /* @__PURE__ */ new Set();
              bufferSet.add(type);
              acc[period.id] = { period, buffers: bufferSet };
            } else if (!currentInfos.buffers.has(type)) {
              currentInfos.buffers.add(type);
            }
          }
          break;
      }
      return acc;
    }, {}), map((list) => {
      const activePeriodIDs = Object.keys(list);
      const completePeriods = [];
      for (let i = 0; i < activePeriodIDs.length; i++) {
        const periodInfos = list[activePeriodIDs[i]];
        if (periodInfos !== void 0 && periodInfos.buffers.size === numberOfStreams) {
          completePeriods.push(periodInfos.period);
        }
      }
      return completePeriods.reduce((acc, period) => {
        if (acc === null) {
          return period;
        }
        return period.start < acc.start ? period : acc;
      }, null);
    }), distinctUntilChanged((a, b) => {
      return a === null && b === null || a !== null && b !== null && a.id === b.id;
    }));
  }

  // src/worker/core/stream/orchestrator/are_streams_complete.ts
  init_define_ENVIRONMENT();
  function areStreamsComplete(...streams) {
    const isCompleteArray = streams.map((stream) => {
      return stream.pipe(filter((evt) => {
        return evt.type === "complete-stream" || evt.type === "stream-status" && !evt.value.hasFinishedLoading;
      }), map((evt) => evt.type === "complete-stream"), startWith(false), distinctUntilChanged());
    });
    return combineLatest(isCompleteArray).pipe(map((areComplete) => areComplete.every((isComplete) => isComplete)), distinctUntilChanged());
  }

  // src/worker/core/stream/orchestrator/get_blacklisted_ranges.ts
  init_define_ENVIRONMENT();
  function getBlacklistedRanges(segmentBuffer, contents) {
    if (contents.length === 0) {
      return [];
    }
    segmentBuffer.synchronizeInventory();
    const accumulator = [];
    const inventory = segmentBuffer.getInventory();
    for (let i = 0; i < inventory.length; i++) {
      const chunk = inventory[i];
      const hasContent = contents.some((content) => {
        return chunk.infos.period.id === content.period.id && chunk.infos.adaptation.id === content.adaptation.id && chunk.infos.representation.id === content.representation.id;
      });
      if (hasContent) {
        const { bufferedStart, bufferedEnd } = chunk;
        if (bufferedStart === void 0 || bufferedEnd === void 0) {
          log_default.warn("SO: No buffered start or end found from a segment.");
          const buffered = segmentBuffer.getBufferedRanges();
          const len = buffered.length;
          if (len === 0) {
            return [];
          }
          return [{ start: buffered.start(0), end: buffered.end(len - 1) }];
        }
        const previousLastElement = accumulator[accumulator.length - 1];
        if (previousLastElement !== void 0 && previousLastElement.end === bufferedStart) {
          previousLastElement.end = bufferedEnd;
        } else {
          accumulator.push({ start: bufferedStart, end: bufferedEnd });
        }
      }
    }
    return accumulator;
  }

  // src/worker/core/stream/orchestrator/stream_orchestrator.ts
  function StreamOrchestrator(content, playbackObserver2, representationEstimator, segmentBuffersStore, segmentFetcherCreator, options) {
    const { manifest, initialPeriod } = content;
    const {
      maxBufferAhead: maxBufferAhead2,
      maxBufferBehind: maxBufferBehind2,
      wantedBufferAhead: wantedBufferAhead2,
      maxVideoBufferSize: maxVideoBufferSize2
    } = options;
    const {
      MAXIMUM_MAX_BUFFER_AHEAD,
      MAXIMUM_MAX_BUFFER_BEHIND
    } = config_default.getCurrent();
    const garbageCollectors = new WeakMapMemory((segmentBuffer) => {
      const { bufferType } = segmentBuffer;
      const defaultMaxBehind = MAXIMUM_MAX_BUFFER_BEHIND[bufferType] != null ? MAXIMUM_MAX_BUFFER_BEHIND[bufferType] : Infinity;
      const defaultMaxAhead = MAXIMUM_MAX_BUFFER_AHEAD[bufferType] != null ? MAXIMUM_MAX_BUFFER_AHEAD[bufferType] : Infinity;
      return BufferGarbageCollector({
        segmentBuffer,
        currentTime$: playbackObserver2.getReference().asObservable().pipe(map((o) => o.position.pending ?? o.position.last)),
        maxBufferBehind$: maxBufferBehind2.asObservable().pipe(map((val) => Math.min(val, defaultMaxBehind))),
        maxBufferAhead$: maxBufferAhead2.asObservable().pipe(map((val) => Math.min(val, defaultMaxAhead)))
      });
    });
    const streamsArray = segmentBuffersStore.getBufferTypes().map((bufferType) => {
      return manageEveryStreams(bufferType, initialPeriod).pipe(deferSubscriptions(), share());
    });
    const activePeriodChanged$ = ActivePeriodEmitter(streamsArray).pipe(filter((period) => period !== null), map((period) => {
      log_default.info("Stream: New active period", period.start);
      return events_generators_default.activePeriodChanged(period);
    }));
    const isLastPeriodKnown$ = fromEvent2(manifest, "manifestUpdate").pipe(map(() => manifest.isLastPeriodKnown), startWith(manifest.isLastPeriodKnown), distinctUntilChanged());
    const endOfStream$ = combineLatest([
      areStreamsComplete(...streamsArray),
      isLastPeriodKnown$
    ]).pipe(map(([areComplete, isLastPeriodKnown]) => areComplete && isLastPeriodKnown), distinctUntilChanged(), map((emitEndOfStream) => emitEndOfStream ? events_generators_default.endOfStream() : events_generators_default.resumeStream()));
    return merge(...streamsArray, activePeriodChanged$, endOfStream$);
    function manageEveryStreams(bufferType, basePeriod) {
      const periodList = new SortedList((a, b) => a.start - b.start);
      const destroyStreams$ = new Subject();
      let enableOutOfBoundsCheck = false;
      function launchConsecutiveStreamsForPeriod(period) {
        return manageConsecutivePeriodStreams(bufferType, period, destroyStreams$).pipe(map((message) => {
          switch (message.type) {
            case "waiting-media-source-reload":
              const firstPeriod = periodList.head();
              if (firstPeriod === void 0 || firstPeriod.id !== message.value.period.id) {
                return events_generators_default.lockedStream(message.value.bufferType, message.value.period);
              } else {
                const { position, autoPlay } = message.value;
                return events_generators_default.needsMediaSourceReload(position, autoPlay);
              }
            case "periodStreamReady":
              enableOutOfBoundsCheck = true;
              periodList.add(message.value.period);
              break;
            case "periodStreamCleared":
              periodList.removeElement(message.value.period);
              break;
          }
          return message;
        }), share());
      }
      function isOutOfPeriodList(time) {
        const head = periodList.head();
        const last2 = periodList.last();
        if (head == null || last2 == null) {
          return true;
        }
        return head.start > time || (last2.end == null ? Infinity : last2.end) < time;
      }
      const observation$ = playbackObserver2.getReference().asObservable();
      const restartStreamsWhenOutOfBounds$ = observation$.pipe(filterMap(({ position }) => {
        const time = position.pending ?? position.last;
        if (!enableOutOfBoundsCheck || !isOutOfPeriodList(time)) {
          return null;
        }
        const nextPeriod = manifest.getPeriodForTime(time) ?? manifest.getNextPeriod(time);
        if (nextPeriod === void 0) {
          return null;
        }
        log_default.info("SO: Current position out of the bounds of the active periods,re-creating Streams.", bufferType, time);
        enableOutOfBoundsCheck = false;
        destroyStreams$.next();
        return nextPeriod;
      }, null), mergeMap((newInitialPeriod) => {
        if (newInitialPeriod == null) {
          throw new MediaError("MEDIA_TIME_NOT_FOUND", "The wanted position is not found in the Manifest.");
        }
        return launchConsecutiveStreamsForPeriod(newInitialPeriod);
      }));
      const handleDecipherabilityUpdate$ = fromEvent2(manifest, "decipherabilityUpdate").pipe(mergeMap((updates) => {
        const segmentBufferStatus = segmentBuffersStore.getStatus(bufferType);
        const ofCurrentType = updates.filter((update) => update.adaptation.type === bufferType);
        if (ofCurrentType.length === 0 || segmentBufferStatus.type !== "initialized") {
          return EMPTY;
        }
        const undecipherableUpdates = ofCurrentType.filter((update) => update.representation.decipherable === false);
        const segmentBuffer = segmentBufferStatus.value;
        const rangesToClean = getBlacklistedRanges(segmentBuffer, undecipherableUpdates);
        if (rangesToClean.length === 0) {
          return EMPTY;
        }
        enableOutOfBoundsCheck = false;
        destroyStreams$.next();
        return concat(...rangesToClean.map(({ start, end }) => start >= end ? EMPTY : segmentBuffer.removeBuffer(start, end).pipe(ignoreElements())), nextTickObs().pipe(ignoreElements()), playbackObserver2.getReference().asObservable().pipe(take(1), mergeMap((observation) => {
          const shouldAutoPlay = !(observation.paused.pending ?? playbackObserver2.getIsPaused());
          return concat(of(events_generators_default.needsDecipherabilityFlush(observation.position.last, shouldAutoPlay, observation.duration)), defer(() => {
            const lastPosition = observation.position.pending ?? observation.position.last;
            const newInitialPeriod = manifest.getPeriodForTime(lastPosition);
            if (newInitialPeriod == null) {
              throw new MediaError("MEDIA_TIME_NOT_FOUND", "The wanted position is not found in the Manifest.");
            }
            return launchConsecutiveStreamsForPeriod(newInitialPeriod);
          }));
        })));
      }));
      return merge(restartStreamsWhenOutOfBounds$, handleDecipherabilityUpdate$, launchConsecutiveStreamsForPeriod(basePeriod));
    }
    function manageConsecutivePeriodStreams(bufferType, basePeriod, destroy$) {
      log_default.info("SO: Creating new Stream for", bufferType, basePeriod.start);
      const createNextPeriodStream$ = new Subject();
      const destroyNextStreams$ = new Subject();
      const endOfCurrentStream$ = playbackObserver2.getReference().asObservable().pipe(filter(({ position }) => basePeriod.end != null && (position.pending ?? position.last) >= basePeriod.end));
      const nextPeriodStream$ = createNextPeriodStream$.pipe(exhaustMap((nextPeriod) => manageConsecutivePeriodStreams(bufferType, nextPeriod, destroyNextStreams$)));
      const destroyAll$ = destroy$.pipe(take(1), tap(() => {
        createNextPeriodStream$.complete();
        destroyNextStreams$.next();
        destroyNextStreams$.complete();
      }), share());
      const killCurrentStream$ = merge(endOfCurrentStream$, destroyAll$);
      const periodStream$ = period_default({
        bufferType,
        content: { manifest, period: basePeriod },
        garbageCollectors,
        maxVideoBufferSize: maxVideoBufferSize2,
        segmentFetcherCreator,
        segmentBuffersStore,
        options,
        playbackObserver: playbackObserver2,
        representationEstimator,
        wantedBufferAhead: wantedBufferAhead2
      }).pipe(mergeMap((evt) => {
        if (evt.type === "stream-status") {
          if (evt.value.hasFinishedLoading) {
            const nextPeriod = manifest.getPeriodAfter(basePeriod);
            if (nextPeriod === null) {
              return concat(of(evt), of(events_generators_default.streamComplete(bufferType)));
            }
            createNextPeriodStream$.next(nextPeriod);
          } else {
            destroyNextStreams$.next();
          }
        }
        return of(evt);
      }), share());
      const currentStream$ = concat(periodStream$.pipe(takeUntil(killCurrentStream$)), of(events_generators_default.periodStreamCleared(bufferType, basePeriod)).pipe(tap(() => {
        log_default.info("SO: Destroying Stream for", bufferType, basePeriod.start);
      })));
      return merge(currentStream$, nextPeriodStream$, destroyAll$.pipe(ignoreElements()));
    }
  }

  // src/worker/core/stream/orchestrator/index.ts
  var orchestrator_default = StreamOrchestrator;

  // src/worker/core/stream/index.ts
  var stream_default = orchestrator_default;

  // src/worker/create_stream_playback_observer.ts
  init_define_ENVIRONMENT();
  function createStreamPlaybackObserver(manifest, playbackObserver2, { speed: speed2 }) {
    return playbackObserver2.deriveReadOnlyObserver(function transform(observationRef, cancellationSignal) {
      const newRef = reference_default(constructStreamPlaybackObservation());
      speed2.onUpdate(emitStreamPlaybackObservation, {
        clearSignal: cancellationSignal,
        emitCurrentValue: false
      });
      observationRef.onUpdate(emitStreamPlaybackObservation, {
        clearSignal: cancellationSignal,
        emitCurrentValue: false
      });
      cancellationSignal.register(() => {
        newRef.finish();
      });
      return newRef;
      function constructStreamPlaybackObservation() {
        const observation = observationRef.getValue();
        const lastSpeed = speed2.getValue();
        return {
          maximumPosition: manifest.getMaximumSafePosition(),
          position: {
            last: observation.position.last,
            pending: observation.position.pending
          },
          duration: observation.duration,
          readyState: observation.readyState,
          paused: {
            last: observation.paused.last,
            pending: observation.paused.pending
          },
          speed: lastSpeed
        };
      }
      function emitStreamPlaybackObservation() {
        newRef.setValue(constructStreamPlaybackObservation());
      }
    });
  }

  // src/worker/end_of_stream.ts
  init_define_ENVIRONMENT();
  var {
    onRemoveSourceBuffers$: onRemoveSourceBuffers$2,
    onSourceOpen$: onSourceOpen$2,
    onUpdate$: onUpdate$2
  } = event_listeners_exports;
  function getUpdatingSourceBuffers(sourceBuffers) {
    const updatingSourceBuffers = [];
    for (let i = 0; i < sourceBuffers.length; i++) {
      const SourceBuffer = sourceBuffers[i];
      if (SourceBuffer.updating) {
        updatingSourceBuffers.push(SourceBuffer);
      }
    }
    return updatingSourceBuffers;
  }
  function triggerEndOfStream(mediaSource) {
    return defer(() => {
      log_default.debug("Init: Trying to call endOfStream");
      if (mediaSource.readyState !== "open") {
        log_default.debug("Init: MediaSource not open, cancel endOfStream");
        return of(null);
      }
      const { sourceBuffers } = mediaSource;
      const updatingSourceBuffers = getUpdatingSourceBuffers(sourceBuffers);
      if (updatingSourceBuffers.length === 0) {
        log_default.info("Init: Triggering end of stream");
        mediaSource.endOfStream();
        return of(null);
      }
      log_default.debug("Init: Waiting SourceBuffers to be updated before calling endOfStream.");
      const updatedSourceBuffers$ = updatingSourceBuffers.map((sourceBuffer) => onUpdate$2(sourceBuffer).pipe(take(1)));
      return race(merge(...updatedSourceBuffers$).pipe(takeLast(1)), onRemoveSourceBuffers$2(sourceBuffers).pipe(take(1))).pipe(mergeMap(() => {
        return triggerEndOfStream(mediaSource);
      }));
    });
  }
  function maintainEndOfStream(mediaSource) {
    return onSourceOpen$2(mediaSource).pipe(startWith(null), switchMap(() => triggerEndOfStream(mediaSource)));
  }

  // src/worker/globals.ts
  init_define_ENVIRONMENT();
  var wantedBufferAhead = reference_default(30);
  var maxVideoBufferSize = reference_default(Infinity);
  var maxBufferAhead = reference_default(Infinity);
  var maxBufferBehind = reference_default(Infinity);
  var minAudioBitrate = reference_default(0);
  var minVideoBitrate = reference_default(0);
  var maxAudioBitrate = reference_default(Infinity);
  var maxVideoBitrate = reference_default(Infinity);
  var manualAudioBitrate = reference_default(-1);
  var manualVideoBitrate = reference_default(-1);
  var limitVideoWidth = reference_default(Infinity);
  var throttleVideo = reference_default(Infinity);
  var throttleVideoBitrate = reference_default(Infinity);
  var speed = reference_default(1);

  // src/worker/parsers/manifest/dash/wasm-parser/index.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/wasm-parser/ts/dash-wasm-parser.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/index.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/indexes/index.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/indexes/base.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/utils/index_helpers.ts
  init_define_ENVIRONMENT();
  function calculateRepeat(element, nextElement, maxPosition) {
    const { repeatCount } = element;
    if (repeatCount >= 0) {
      return repeatCount;
    }
    let segmentEnd;
    if (!isNullOrUndefined(nextElement)) {
      segmentEnd = nextElement.start;
    } else if (maxPosition !== void 0) {
      segmentEnd = maxPosition;
    } else {
      segmentEnd = Number.MAX_VALUE;
    }
    return Math.ceil((segmentEnd - element.start) / element.duration) - 1;
  }
  function getIndexSegmentEnd(segment, nextSegment, maxPosition) {
    const { start, duration } = segment;
    if (duration <= 0) {
      return start;
    }
    const repeat = calculateRepeat(segment, nextSegment, maxPosition);
    return start + (repeat + 1) * duration;
  }
  function toIndexTime(time, indexOptions) {
    return time * indexOptions.timescale + (indexOptions.indexTimeOffset ?? 0);
  }
  function fromIndexTime(time, indexOptions) {
    return (time - (indexOptions.indexTimeOffset ?? 0)) / indexOptions.timescale;
  }
  function getTimescaledRange(start, duration, timescale) {
    return [
      start * timescale,
      (start + duration) * timescale
    ];
  }
  function getIndexOfLastObjectBefore(timeline, timeTScaled) {
    let low = 0;
    let high = timeline.length;
    while (low < high) {
      const mid = low + high >>> 1;
      if (timeline[mid].start <= timeTScaled) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return low - 1;
  }
  function checkDiscontinuity(index, timeSec, maxPosition) {
    const { timeline } = index;
    const scaledTime = toIndexTime(timeSec, index);
    if (scaledTime < 0) {
      return null;
    }
    const segmentIndex = getIndexOfLastObjectBefore(timeline, scaledTime);
    if (segmentIndex < 0 || segmentIndex >= timeline.length - 1) {
      return null;
    }
    const timelineItem = timeline[segmentIndex];
    if (timelineItem.duration <= 0) {
      return null;
    }
    const nextTimelineItem = timeline[segmentIndex + 1];
    if (nextTimelineItem === void 0) {
      return null;
    }
    const nextStart = nextTimelineItem.start;
    const segmentEnd = getIndexSegmentEnd(timelineItem, nextTimelineItem, maxPosition);
    return scaledTime >= segmentEnd && scaledTime < nextStart ? fromIndexTime(nextStart, index) : null;
  }

  // src/worker/parsers/manifest/dash/common/indexes/get_init_segment.ts
  init_define_ENVIRONMENT();
  function getInitSegment(index, isEMSGWhitelisted) {
    const { initialization } = index;
    let privateInfos;
    if (isEMSGWhitelisted !== void 0) {
      privateInfos = { isEMSGWhitelisted };
    }
    return {
      id: "init",
      isInit: true,
      time: 0,
      end: 0,
      duration: 0,
      timescale: 1,
      range: initialization != null ? initialization.range : void 0,
      indexRange: index.indexRange,
      mediaURLs: initialization?.mediaURLs ?? null,
      complete: true,
      privateInfos,
      timestampOffset: -(index.indexTimeOffset / index.timescale)
    };
  }

  // src/worker/parsers/manifest/dash/common/indexes/get_segments_from_timeline.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/indexes/tokens.ts
  init_define_ENVIRONMENT();

  // src/common/utils/resolve_url.ts
  init_define_ENVIRONMENT();
  var schemeRe = /^(?:[a-z]+:)?\/\//i;
  var selfDirRe = /\/\.{1,2}\//;
  function _normalizeUrl(url) {
    if (!selfDirRe.test(url)) {
      return url;
    }
    const newUrl = [];
    const oldUrl = url.split("/");
    for (let i = 0, l = oldUrl.length; i < l; i++) {
      if (oldUrl[i] === "..") {
        newUrl.pop();
      } else if (oldUrl[i] === ".") {
        continue;
      } else {
        newUrl.push(oldUrl[i]);
      }
    }
    return newUrl.join("/");
  }
  function resolveURL(...args) {
    const len = args.length;
    if (len === 0) {
      return "";
    }
    let base = "";
    for (let i = 0; i < len; i++) {
      let part = args[i];
      if (typeof part !== "string" || part === "") {
        continue;
      }
      if (schemeRe.test(part)) {
        base = part;
      } else {
        if (part[0] === "/") {
          part = part.substring(1);
        }
        if (base[base.length - 1] === "/") {
          base = base.substring(0, base.length - 1);
        }
        base = base + "/" + part;
      }
    }
    return _normalizeUrl(base);
  }
  function normalizeBaseURL(url) {
    const indexOfLastSlash = url.lastIndexOf("/");
    if (indexOfLastSlash < 0) {
      return url;
    }
    if (schemeRe.test(url)) {
      const firstSlashIndex = url.indexOf("/");
      if (firstSlashIndex >= 0 && indexOfLastSlash === firstSlashIndex + 1) {
        return url;
      }
    }
    const indexOfQuestionMark = url.indexOf("?");
    if (indexOfQuestionMark >= 0 && indexOfQuestionMark < indexOfLastSlash) {
      return normalizeBaseURL(url.substring(0, indexOfQuestionMark));
    }
    return url.substring(0, indexOfLastSlash + 1);
  }

  // src/worker/parsers/manifest/dash/common/indexes/tokens.ts
  function padLeftWithZeros(n, l) {
    const nToString = n.toString();
    if (nToString.length >= l) {
      return nToString;
    }
    const arr = new Array(l + 1).join("0") + nToString;
    return arr.slice(-l);
  }
  function processFormatedToken(replacer) {
    return (_match, _format, widthStr) => {
      const width = isNonEmptyString(widthStr) ? parseInt(widthStr, 10) : 1;
      return padLeftWithZeros(String(replacer), width);
    };
  }
  function createIndexURLs(baseURLs, media, id, bitrate) {
    if (baseURLs.length === 0) {
      return media !== void 0 ? [replaceRepresentationDASHTokens(media, id, bitrate)] : null;
    }
    return baseURLs.map((baseURL) => {
      return replaceRepresentationDASHTokens(resolveURL(baseURL, media), id, bitrate);
    });
  }
  function replaceRepresentationDASHTokens(path, id, bitrate) {
    if (path.indexOf("$") === -1) {
      return path;
    } else {
      return path.replace(/\$\$/g, "$").replace(/\$RepresentationID\$/g, String(id)).replace(/\$Bandwidth(\%0(\d+)d)?\$/g, processFormatedToken(bitrate === void 0 ? 0 : bitrate));
    }
  }
  function createDashUrlDetokenizer(time, nb) {
    return function replaceTokensInUrl(url) {
      if (url.indexOf("$") === -1) {
        return url;
      } else {
        return url.replace(/\$\$/g, "$").replace(/\$Number(\%0(\d+)d)?\$/g, (_x, _y, widthStr) => {
          if (nb === void 0) {
            throw new Error("Segment number not defined in a $Number$ scheme");
          }
          return processFormatedToken(nb)(_x, _y, widthStr);
        }).replace(/\$Time(\%0(\d+)d)?\$/g, (_x, _y, widthStr) => {
          if (time === void 0) {
            throw new Error("Segment time not defined in a $Time$ scheme");
          }
          return processFormatedToken(time)(_x, _y, widthStr);
        });
      }
    };
  }

  // src/worker/parsers/manifest/dash/common/indexes/get_segments_from_timeline.ts
  function getWantedRepeatIndex(segmentStartTime, segmentDuration, wantedTime) {
    const diff = wantedTime - segmentStartTime;
    return diff > 0 ? Math.floor(diff / segmentDuration) : 0;
  }
  function getSegmentsFromTimeline(index, from2, durationWanted, isEMSGWhitelisted, maximumTime) {
    const scaledUp = toIndexTime(from2, index);
    const scaledTo = toIndexTime(from2 + durationWanted, index);
    const { timeline, timescale, mediaURLs, startNumber } = index;
    let currentNumber = startNumber ?? 1;
    const segments = [];
    const timelineLength = timeline.length;
    for (let i = 0; i < timelineLength; i++) {
      const timelineItem = timeline[i];
      const { duration, start, range } = timelineItem;
      const repeat = calculateRepeat(timelineItem, timeline[i + 1], maximumTime);
      const complete = index.availabilityTimeComplete !== false || i !== timelineLength - 1 && repeat !== 0;
      let segmentNumberInCurrentRange = getWantedRepeatIndex(start, duration, scaledUp);
      let segmentTime = start + segmentNumberInCurrentRange * duration;
      while (segmentTime < scaledTo && segmentNumberInCurrentRange <= repeat) {
        const segmentNumber = currentNumber + segmentNumberInCurrentRange;
        const detokenizedURLs = mediaURLs === null ? null : mediaURLs.map(createDashUrlDetokenizer(segmentTime, segmentNumber));
        let time = segmentTime - index.indexTimeOffset;
        let realDuration = duration;
        if (time < 0) {
          realDuration = duration + time;
          time = 0;
        }
        const segment = {
          id: String(segmentTime),
          time: time / timescale,
          end: (time + realDuration) / timescale,
          duration: realDuration / timescale,
          isInit: false,
          range,
          timescale: 1,
          mediaURLs: detokenizedURLs,
          number: segmentNumber,
          timestampOffset: -(index.indexTimeOffset / timescale),
          complete,
          privateInfos: { isEMSGWhitelisted }
        };
        segments.push(segment);
        segmentNumberInCurrentRange++;
        segmentTime = start + segmentNumberInCurrentRange * duration;
      }
      if (segmentTime >= scaledTo) {
        return segments;
      }
      currentNumber += repeat + 1;
    }
    return segments;
  }

  // src/worker/parsers/manifest/dash/common/indexes/base.ts
  function _addSegmentInfos(index, segmentInfos) {
    if (segmentInfos.timescale !== index.timescale) {
      const { timescale } = index;
      index.timeline.push({
        start: segmentInfos.time / segmentInfos.timescale * timescale,
        duration: segmentInfos.duration / segmentInfos.timescale * timescale,
        repeatCount: segmentInfos.count === void 0 ? 0 : segmentInfos.count,
        range: segmentInfos.range
      });
    } else {
      index.timeline.push({
        start: segmentInfos.time,
        duration: segmentInfos.duration,
        repeatCount: segmentInfos.count === void 0 ? 0 : segmentInfos.count,
        range: segmentInfos.range
      });
    }
    return true;
  }
  var BaseRepresentationIndex = class {
    _isInitialized;
    _index;
    _scaledPeriodStart;
    _scaledPeriodEnd;
    _isEMSGWhitelisted;
    constructor(index, context2) {
      const {
        periodStart,
        periodEnd,
        representationBaseURLs,
        representationId,
        representationBitrate,
        isEMSGWhitelisted
      } = context2;
      const timescale = index.timescale ?? 1;
      const presentationTimeOffset = index.presentationTimeOffset != null ? index.presentationTimeOffset : 0;
      const indexTimeOffset = presentationTimeOffset - periodStart * timescale;
      const urlSources = representationBaseURLs.map((b) => b.url);
      const mediaURLs = createIndexURLs(urlSources, index.initialization !== void 0 ? index.initialization.media : void 0, representationId, representationBitrate);
      const range = index.initialization !== void 0 ? index.initialization.range : index.indexRange !== void 0 ? [0, index.indexRange[0] - 1] : void 0;
      this._index = {
        indexRange: index.indexRange,
        indexTimeOffset,
        initialization: { mediaURLs, range },
        mediaURLs: createIndexURLs(urlSources, index.media, representationId, representationBitrate),
        startNumber: index.startNumber,
        timeline: index.timeline ?? [],
        timescale
      };
      this._scaledPeriodStart = toIndexTime(periodStart, this._index);
      this._scaledPeriodEnd = periodEnd == null ? void 0 : toIndexTime(periodEnd, this._index);
      this._isInitialized = this._index.timeline.length > 0;
      this._isEMSGWhitelisted = isEMSGWhitelisted;
    }
    getInitSegment() {
      return getInitSegment(this._index, this._isEMSGWhitelisted);
    }
    getSegments(from2, dur) {
      return getSegmentsFromTimeline(this._index, from2, dur, this._isEMSGWhitelisted, this._scaledPeriodEnd);
    }
    shouldRefresh() {
      return false;
    }
    getFirstPosition() {
      const index = this._index;
      if (index.timeline.length === 0) {
        return null;
      }
      return fromIndexTime(Math.max(this._scaledPeriodStart, index.timeline[0].start), index);
    }
    getLastPosition() {
      const { timeline } = this._index;
      if (timeline.length === 0) {
        return null;
      }
      const lastTimelineElement = timeline[timeline.length - 1];
      const lastTime = Math.min(getIndexSegmentEnd(lastTimelineElement, null, this._scaledPeriodEnd), this._scaledPeriodEnd ?? Infinity);
      return fromIndexTime(lastTime, this._index);
    }
    isSegmentStillAvailable() {
      return true;
    }
    checkDiscontinuity() {
      return null;
    }
    areSegmentsChronologicallyGenerated() {
      return true;
    }
    initializeIndex(indexSegments) {
      for (let i = 0; i < indexSegments.length; i++) {
        _addSegmentInfos(this._index, indexSegments[i]);
      }
      this._isInitialized = true;
    }
    canBeOutOfSyncError() {
      return false;
    }
    isFinished() {
      return true;
    }
    isInitialized() {
      return this._isInitialized;
    }
    _replace(newIndex) {
      this._index = newIndex._index;
      this._isInitialized = newIndex._isInitialized;
      this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
      this._isEMSGWhitelisted = newIndex._isEMSGWhitelisted;
    }
    _update() {
      log_default.error("Base RepresentationIndex: Cannot update a SegmentList");
    }
  };

  // src/worker/parsers/manifest/dash/common/indexes/list.ts
  init_define_ENVIRONMENT();
  var ListRepresentationIndex = class {
    _index;
    _periodStart;
    _periodEnd;
    _isEMSGWhitelisted;
    constructor(index, context2) {
      if (index.duration === void 0) {
        throw new Error("Invalid SegmentList: no duration");
      }
      const {
        periodStart,
        periodEnd,
        representationBaseURLs,
        representationId,
        representationBitrate,
        isEMSGWhitelisted
      } = context2;
      this._isEMSGWhitelisted = isEMSGWhitelisted;
      this._periodStart = periodStart;
      this._periodEnd = periodEnd;
      const presentationTimeOffset = index.presentationTimeOffset != null ? index.presentationTimeOffset : 0;
      const timescale = index.timescale ?? 1;
      const indexTimeOffset = presentationTimeOffset - periodStart * timescale;
      const urlSources = representationBaseURLs.map((b) => b.url);
      const list = index.list.map((lItem) => ({
        mediaURLs: createIndexURLs(urlSources, lItem.media, representationId, representationBitrate),
        mediaRange: lItem.mediaRange
      }));
      this._index = {
        list,
        timescale,
        duration: index.duration,
        indexTimeOffset,
        indexRange: index.indexRange,
        initialization: index.initialization == null ? void 0 : {
          mediaURLs: createIndexURLs(urlSources, index.initialization.media, representationId, representationBitrate),
          range: index.initialization.range
        }
      };
    }
    getInitSegment() {
      const initSegment = getInitSegment(this._index);
      if (initSegment.privateInfos === void 0) {
        initSegment.privateInfos = {};
      }
      initSegment.privateInfos.isEMSGWhitelisted = this._isEMSGWhitelisted;
      return initSegment;
    }
    getSegments(fromTime, dur) {
      const index = this._index;
      const { duration, list, timescale } = index;
      const durationInSeconds = duration / timescale;
      const fromTimeInPeriod = fromTime - this._periodStart;
      const [up, to] = getTimescaledRange(fromTimeInPeriod, dur, timescale);
      const length = Math.min(list.length - 1, Math.floor(to / duration));
      const segments = [];
      let i = Math.floor(up / duration);
      while (i <= length) {
        const range = list[i].mediaRange;
        const mediaURLs = list[i].mediaURLs;
        const time = i * durationInSeconds + this._periodStart;
        const segment = {
          id: String(i),
          time,
          isInit: false,
          range,
          duration: durationInSeconds,
          timescale: 1,
          end: time + durationInSeconds,
          mediaURLs,
          timestampOffset: -(index.indexTimeOffset / timescale),
          complete: true,
          privateInfos: { isEMSGWhitelisted: this._isEMSGWhitelisted }
        };
        segments.push(segment);
        i++;
      }
      return segments;
    }
    shouldRefresh(_fromTime, _toTime) {
      return false;
    }
    getFirstPosition() {
      return this._periodStart;
    }
    getLastPosition() {
      const index = this._index;
      const { duration, list } = index;
      return Math.min(list.length * duration / index.timescale + this._periodStart, this._periodEnd ?? Infinity);
    }
    isSegmentStillAvailable() {
      return true;
    }
    checkDiscontinuity() {
      return null;
    }
    areSegmentsChronologicallyGenerated() {
      return true;
    }
    canBeOutOfSyncError() {
      return false;
    }
    isFinished() {
      return true;
    }
    isInitialized() {
      return true;
    }
    _replace(newIndex) {
      this._index = newIndex._index;
    }
    _update() {
      log_default.error("List RepresentationIndex: Cannot update a SegmentList");
    }
  };

  // src/worker/parsers/manifest/dash/common/indexes/template.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/indexes/is_period_fulfilled.ts
  init_define_ENVIRONMENT();
  function isPeriodFulfilled(timescale, lastSegmentEnd, periodEnd) {
    const scaledRoundingError = config_default.getCurrent().DEFAULT_MAXIMUM_TIME_ROUNDING_ERROR * timescale;
    return lastSegmentEnd + scaledRoundingError >= periodEnd;
  }

  // src/worker/parsers/manifest/dash/common/indexes/template.ts
  var TemplateRepresentationIndex = class {
    _index;
    _aggressiveMode;
    _manifestBoundsCalculator;
    _periodStart;
    _scaledPeriodEnd;
    _availabilityTimeOffset;
    _isDynamic;
    _isEMSGWhitelisted;
    constructor(index, context2) {
      const {
        aggressiveMode,
        availabilityTimeOffset,
        manifestBoundsCalculator,
        isDynamic,
        periodEnd,
        periodStart,
        representationBaseURLs,
        representationId,
        representationBitrate,
        isEMSGWhitelisted
      } = context2;
      const timescale = index.timescale ?? 1;
      const minBaseUrlAto = representationBaseURLs.length === 0 ? 0 : representationBaseURLs.reduce((acc, rbu) => {
        return Math.min(acc, rbu.availabilityTimeOffset);
      }, Infinity);
      this._availabilityTimeOffset = availabilityTimeOffset + minBaseUrlAto;
      this._manifestBoundsCalculator = manifestBoundsCalculator;
      this._aggressiveMode = aggressiveMode;
      const presentationTimeOffset = index.presentationTimeOffset != null ? index.presentationTimeOffset : 0;
      const scaledStart = periodStart * timescale;
      const indexTimeOffset = presentationTimeOffset - scaledStart;
      if (index.duration === void 0) {
        throw new Error("Invalid SegmentTemplate: no duration");
      }
      const urlSources = representationBaseURLs.map((b) => b.url);
      this._index = {
        duration: index.duration,
        timescale,
        indexRange: index.indexRange,
        indexTimeOffset,
        initialization: index.initialization == null ? void 0 : {
          mediaURLs: createIndexURLs(urlSources, index.initialization.media, representationId, representationBitrate),
          range: index.initialization.range
        },
        mediaURLs: createIndexURLs(urlSources, index.media, representationId, representationBitrate),
        presentationTimeOffset,
        startNumber: index.startNumber
      };
      this._isDynamic = isDynamic;
      this._periodStart = periodStart;
      this._scaledPeriodEnd = periodEnd === void 0 ? void 0 : (periodEnd - periodStart) * timescale;
      this._isEMSGWhitelisted = isEMSGWhitelisted;
    }
    getInitSegment() {
      return getInitSegment(this._index, this._isEMSGWhitelisted);
    }
    getSegments(fromTime, dur) {
      const index = this._index;
      const {
        duration,
        startNumber,
        timescale,
        mediaURLs
      } = index;
      const scaledStart = this._periodStart * timescale;
      const scaledEnd = this._scaledPeriodEnd;
      const upFromPeriodStart = fromTime * timescale - scaledStart;
      const toFromPeriodStart = (fromTime + dur) * timescale - scaledStart;
      const firstSegmentStart = this._getFirstSegmentStart();
      const lastSegmentStart = this._getLastSegmentStart();
      if (firstSegmentStart == null || lastSegmentStart == null) {
        return [];
      }
      const startPosition = Math.max(firstSegmentStart, upFromPeriodStart);
      const lastWantedStartPosition = Math.min(lastSegmentStart, toFromPeriodStart);
      if (lastWantedStartPosition + duration <= startPosition) {
        return [];
      }
      const segments = [];
      const numberOffset = startNumber ?? 1;
      let numberIndexedToZero = Math.floor(startPosition / duration);
      for (let timeFromPeriodStart = numberIndexedToZero * duration; timeFromPeriodStart <= lastWantedStartPosition; timeFromPeriodStart += duration) {
        const realNumber = numberIndexedToZero + numberOffset;
        const realDuration = scaledEnd != null && timeFromPeriodStart + duration > scaledEnd ? scaledEnd - timeFromPeriodStart : duration;
        const realTime = timeFromPeriodStart + scaledStart;
        const manifestTime = timeFromPeriodStart + this._index.presentationTimeOffset;
        const detokenizedURLs = mediaURLs === null ? null : mediaURLs.map(createDashUrlDetokenizer(manifestTime, realNumber));
        const args = {
          id: String(realNumber),
          number: realNumber,
          time: realTime / timescale,
          end: (realTime + realDuration) / timescale,
          duration: realDuration / timescale,
          timescale: 1,
          isInit: false,
          scaledDuration: realDuration / timescale,
          mediaURLs: detokenizedURLs,
          timestampOffset: -(index.indexTimeOffset / timescale),
          complete: true,
          privateInfos: {
            isEMSGWhitelisted: this._isEMSGWhitelisted
          }
        };
        segments.push(args);
        numberIndexedToZero++;
      }
      return segments;
    }
    getFirstPosition() {
      const firstSegmentStart = this._getFirstSegmentStart();
      if (firstSegmentStart == null) {
        return firstSegmentStart;
      }
      return firstSegmentStart / this._index.timescale + this._periodStart;
    }
    getLastPosition() {
      const lastSegmentStart = this._getLastSegmentStart();
      if (lastSegmentStart == null) {
        return lastSegmentStart;
      }
      const lastSegmentEnd = Math.min(lastSegmentStart + this._index.duration, this._scaledPeriodEnd ?? Infinity);
      return lastSegmentEnd / this._index.timescale + this._periodStart;
    }
    shouldRefresh() {
      return false;
    }
    checkDiscontinuity() {
      return null;
    }
    areSegmentsChronologicallyGenerated() {
      return true;
    }
    isSegmentStillAvailable(segment) {
      if (segment.isInit) {
        return true;
      }
      const segmentsForTime = this.getSegments(segment.time, 0.1);
      if (segmentsForTime.length === 0) {
        return false;
      }
      return segmentsForTime[0].time === segment.time && segmentsForTime[0].end === segment.end && segmentsForTime[0].number === segment.number;
    }
    canBeOutOfSyncError() {
      return false;
    }
    isFinished() {
      if (!this._isDynamic) {
        return true;
      }
      if (this._scaledPeriodEnd === void 0) {
        return false;
      }
      const { timescale } = this._index;
      const lastSegmentStart = this._getLastSegmentStart();
      if (lastSegmentStart == null) {
        return false;
      }
      const lastSegmentEnd = lastSegmentStart + this._index.duration;
      return isPeriodFulfilled(timescale, lastSegmentEnd, this._scaledPeriodEnd);
    }
    isInitialized() {
      return true;
    }
    _replace(newIndex) {
      this._index = newIndex._index;
      this._aggressiveMode = newIndex._aggressiveMode;
      this._isDynamic = newIndex._isDynamic;
      this._periodStart = newIndex._periodStart;
      this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
      this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
    }
    _update(newIndex) {
      this._replace(newIndex);
    }
    _getFirstSegmentStart() {
      if (!this._isDynamic) {
        return 0;
      }
      if (this._scaledPeriodEnd === 0 || this._scaledPeriodEnd === void 0) {
        const maximumBound = this._manifestBoundsCalculator.estimateMaximumBound();
        if (maximumBound !== void 0 && maximumBound < this._periodStart) {
          return null;
        }
      }
      const { duration, timescale } = this._index;
      const firstPosition = this._manifestBoundsCalculator.estimateMinimumBound();
      if (firstPosition === void 0) {
        return void 0;
      }
      const segmentTime = firstPosition > this._periodStart ? (firstPosition - this._periodStart) * timescale : 0;
      const numberIndexedToZero = Math.floor(segmentTime / duration);
      return numberIndexedToZero * duration;
    }
    _getLastSegmentStart() {
      const { duration, timescale } = this._index;
      if (this._isDynamic) {
        const lastPos = this._manifestBoundsCalculator.estimateMaximumBound();
        if (lastPos === void 0) {
          return void 0;
        }
        const agressiveModeOffset = this._aggressiveMode ? duration / timescale : 0;
        if (this._scaledPeriodEnd != null && this._scaledPeriodEnd < (lastPos + agressiveModeOffset - this._periodStart) * this._index.timescale) {
          if (this._scaledPeriodEnd < duration) {
            return null;
          }
          return (Math.floor(this._scaledPeriodEnd / duration) - 1) * duration;
        }
        const scaledLastPosition = (lastPos - this._periodStart) * timescale;
        if (scaledLastPosition < 0) {
          return null;
        }
        const availabilityTimeOffset = ((this._availabilityTimeOffset !== void 0 ? this._availabilityTimeOffset : 0) + agressiveModeOffset) * timescale;
        const numberOfSegmentsAvailable = Math.floor((scaledLastPosition + availabilityTimeOffset) / duration);
        return numberOfSegmentsAvailable <= 0 ? null : (numberOfSegmentsAvailable - 1) * duration;
      } else {
        const maximumTime = this._scaledPeriodEnd ?? 0;
        const numberIndexedToZero = Math.ceil(maximumTime / duration) - 1;
        const regularLastSegmentStart = numberIndexedToZero * duration;
        const minimumDuration = config_default.getCurrent().MINIMUM_SEGMENT_SIZE * timescale;
        if (maximumTime - regularLastSegmentStart > minimumDuration || numberIndexedToZero === 0) {
          return regularLastSegmentStart;
        }
        return (numberIndexedToZero - 1) * duration;
      }
    }
  };

  // src/worker/parsers/manifest/dash/common/indexes/timeline/index.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/indexes/timeline/timeline_representation_index.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/utils/clear_timeline_from_position.ts
  init_define_ENVIRONMENT();
  function clearTimelineFromPosition(timeline, firstAvailablePosition) {
    let nbEltsRemoved = 0;
    while (timeline.length > 0) {
      const firstElt = timeline[0];
      if (firstElt.start >= firstAvailablePosition) {
        return nbEltsRemoved;
      }
      if (firstElt.repeatCount === -1) {
        return nbEltsRemoved;
      } else if (firstElt.repeatCount === 0) {
        timeline.shift();
        nbEltsRemoved += 1;
      } else {
        const nextElt = timeline[1];
        if (nextElt !== void 0 && nextElt.start <= firstAvailablePosition) {
          timeline.shift();
          nbEltsRemoved += 1;
        } else {
          if (firstElt.duration <= 0) {
            return nbEltsRemoved;
          }
          let nextStart = firstElt.start + firstElt.duration;
          let nextRepeat = 1;
          while (nextStart < firstAvailablePosition && nextRepeat <= firstElt.repeatCount) {
            nextStart += firstElt.duration;
            nextRepeat++;
          }
          if (nextRepeat > firstElt.repeatCount) {
            timeline.shift();
            nbEltsRemoved = firstElt.repeatCount + 1;
          } else {
            const newRepeat = firstElt.repeatCount - nextRepeat;
            firstElt.start = nextStart;
            firstElt.repeatCount = newRepeat;
            nbEltsRemoved += nextRepeat;
            return nbEltsRemoved;
          }
        }
      }
    }
    return nbEltsRemoved;
  }

  // src/worker/parsers/manifest/utils/is_segment_still_available.ts
  init_define_ENVIRONMENT();
  function isSegmentStillAvailable(segment, timeline, timescale, indexTimeOffset) {
    for (let i = 0; i < timeline.length; i++) {
      const tSegment = timeline[i];
      const tSegmentTime = (tSegment.start - indexTimeOffset) / timescale;
      if (tSegmentTime > segment.time) {
        return false;
      } else if (tSegmentTime === segment.time) {
        if (tSegment.range === void 0) {
          return segment.range === void 0;
        }
        return segment.range != null && tSegment.range[0] === segment.range[0] && tSegment.range[1] === segment.range[1];
      } else {
        if (tSegment.repeatCount >= 0 && tSegment.duration !== void 0) {
          const timeDiff = tSegmentTime - tSegment.start;
          const repeat = timeDiff / tSegment.duration - 1;
          return repeat % 1 === 0 && repeat <= tSegment.repeatCount;
        }
      }
    }
    return false;
  }

  // src/worker/parsers/manifest/utils/update_segment_timeline.ts
  init_define_ENVIRONMENT();
  function updateSegmentTimeline(oldTimeline, newTimeline) {
    if (oldTimeline.length === 0) {
      oldTimeline.push(...newTimeline);
      return true;
    } else if (newTimeline.length === 0) {
      return false;
    }
    const prevTimelineLength = oldTimeline.length;
    const newIndexStart = newTimeline[0].start;
    const oldLastElt = oldTimeline[prevTimelineLength - 1];
    const oldIndexEnd = getIndexSegmentEnd(oldLastElt, newTimeline[0]);
    if (oldIndexEnd < newIndexStart) {
      throw new MediaError("MANIFEST_UPDATE_ERROR", "Cannot perform partial update: not enough data");
    }
    for (let i = prevTimelineLength - 1; i >= 0; i--) {
      const currStart = oldTimeline[i].start;
      if (currStart === newIndexStart) {
        const nbEltsToRemove = prevTimelineLength - i;
        oldTimeline.splice(i, nbEltsToRemove, ...newTimeline);
        return false;
      } else if (currStart < newIndexStart) {
        const currElt = oldTimeline[i];
        if (currElt.start + currElt.duration > newIndexStart) {
          log_default.warn("RepresentationIndex: Manifest update removed all previous segments");
          oldTimeline.splice(0, prevTimelineLength, ...newTimeline);
          return true;
        } else if (currElt.repeatCount === void 0 || currElt.repeatCount <= 0) {
          if (currElt.repeatCount < 0) {
            currElt.repeatCount = Math.floor((newIndexStart - currElt.start) / currElt.duration) - 1;
          }
          oldTimeline.splice(i + 1, prevTimelineLength - (i + 1), ...newTimeline);
          return false;
        }
        const eltLastTime = currElt.start + currElt.duration * (currElt.repeatCount + 1);
        if (eltLastTime <= newIndexStart) {
          oldTimeline.splice(i + 1, prevTimelineLength - (i + 1), ...newTimeline);
          return false;
        }
        const newCurrRepeat = (newIndexStart - currElt.start) / currElt.duration - 1;
        if (newCurrRepeat % 1 === 0 && currElt.duration === newTimeline[0].duration) {
          const newRepeatCount = newTimeline[0].repeatCount < 0 ? -1 : newTimeline[0].repeatCount + newCurrRepeat + 1;
          oldTimeline.splice(i, prevTimelineLength - i, ...newTimeline);
          oldTimeline[i].start = currElt.start;
          oldTimeline[i].repeatCount = newRepeatCount;
          return false;
        }
        log_default.warn("RepresentationIndex: Manifest update removed previous segments");
        oldTimeline[i].repeatCount = Math.floor(newCurrRepeat);
        oldTimeline.splice(i + 1, prevTimelineLength - (i + 1), ...newTimeline);
        return false;
      }
    }
    const prevLastElt = oldTimeline[oldTimeline.length - 1];
    const newLastElt = newTimeline[newTimeline.length - 1];
    if (prevLastElt.repeatCount !== void 0 && prevLastElt.repeatCount < 0) {
      if (prevLastElt.start > newLastElt.start) {
        log_default.warn("RepresentationIndex: The new index is older than the previous one");
        return false;
      } else {
        log_default.warn('RepresentationIndex: The new index is "bigger" than the previous one');
        oldTimeline.splice(0, prevTimelineLength, ...newTimeline);
        return true;
      }
    }
    const prevLastTime = prevLastElt.start + prevLastElt.duration * (prevLastElt.repeatCount + 1);
    const newLastTime = newLastElt.start + newLastElt.duration * (newLastElt.repeatCount + 1);
    if (prevLastTime >= newLastTime) {
      log_default.warn("RepresentationIndex: The new index is older than the previous one");
      return false;
    }
    log_default.warn('RepresentationIndex: The new index is "bigger" than the previous one');
    oldTimeline.splice(0, prevTimelineLength, ...newTimeline);
    return true;
  }

  // src/worker/parsers/manifest/dash/common/indexes/timeline/construct_timeline_from_elements.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/indexes/timeline/convert_element_to_index_segment.ts
  init_define_ENVIRONMENT();
  function convertElementsToIndexSegment(item, previousItem, nextItem) {
    let start = item.start;
    let duration = item.duration;
    const repeatCount = item.repeatCount;
    if (start === void 0) {
      if (previousItem === null) {
        start = 0;
      } else if (!isNullOrUndefined(previousItem.duration)) {
        start = previousItem.start + previousItem.duration * (previousItem.repeatCount + 1);
      }
    }
    if ((duration === void 0 || isNaN(duration)) && nextItem !== null && nextItem.start !== void 0 && !isNaN(nextItem.start) && start !== void 0 && !isNaN(start)) {
      duration = nextItem.start - start;
    }
    if (start !== void 0 && !isNaN(start) && (duration !== void 0 && !isNaN(duration)) && (repeatCount === void 0 || !isNaN(repeatCount))) {
      return {
        start,
        duration,
        repeatCount: repeatCount === void 0 ? 0 : repeatCount
      };
    }
    log_default.warn('DASH: A "S" Element could not have been parsed.');
    return null;
  }

  // src/worker/parsers/manifest/dash/common/indexes/timeline/parse_s_element.ts
  init_define_ENVIRONMENT();
  function parseSElement(root) {
    const parsedS = {};
    for (let j = 0; j < root.attributes.length; j++) {
      const attribute = root.attributes[j];
      switch (attribute.name) {
        case "t":
          const start = parseInt(attribute.value, 10);
          if (isNaN(start)) {
            log_default.warn(`DASH: invalid t ("${attribute.value}")`);
          } else {
            parsedS.start = start;
          }
          break;
        case "d":
          const duration = parseInt(attribute.value, 10);
          if (isNaN(duration)) {
            log_default.warn(`DASH: invalid d ("${attribute.value}")`);
          } else {
            parsedS.duration = duration;
          }
          break;
        case "r":
          const repeatCount = parseInt(attribute.value, 10);
          if (isNaN(repeatCount)) {
            log_default.warn(`DASH: invalid r ("${attribute.value}")`);
          } else {
            parsedS.repeatCount = repeatCount;
          }
          break;
      }
    }
    return parsedS;
  }

  // src/worker/parsers/manifest/dash/common/indexes/timeline/construct_timeline_from_elements.ts
  function constructTimelineFromElements(elements) {
    const initialTimeline = [];
    for (let i = 0; i < elements.length; i++) {
      initialTimeline.push(parseSElement(elements[i]));
    }
    const timeline = [];
    for (let i = 0; i < initialTimeline.length; i++) {
      const item = initialTimeline[i];
      const previousItem = timeline[timeline.length - 1] === void 0 ? null : timeline[timeline.length - 1];
      const nextItem = initialTimeline[i + 1] === void 0 ? null : initialTimeline[i + 1];
      const timelineElement = convertElementsToIndexSegment(item, previousItem, nextItem);
      if (timelineElement !== null) {
        timeline.push(timelineElement);
      }
    }
    return timeline;
  }

  // src/worker/parsers/manifest/dash/common/indexes/timeline/construct_timeline_from_previous_timeline.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/indexes/timeline/find_first_common_start_time.ts
  init_define_ENVIRONMENT();
  function findFirstCommonStartTime(prevTimeline, newElements) {
    if (prevTimeline.length === 0 || newElements.length === 0) {
      return null;
    }
    const prevInitialStart = prevTimeline[0].start;
    const newFirstTAttr = newElements[0].getAttribute("t");
    const newInitialStart = newFirstTAttr === null ? null : parseInt(newFirstTAttr, 10);
    if (newInitialStart === null || Number.isNaN(newInitialStart)) {
      return null;
    }
    if (prevInitialStart === newInitialStart) {
      return {
        prevSegmentsIdx: 0,
        newElementsIdx: 0,
        repeatNumberInPrevSegments: 0,
        repeatNumberInNewElements: 0
      };
    } else if (prevInitialStart < newInitialStart) {
      let prevElt = prevTimeline[0];
      let prevElementIndex = 0;
      while (true) {
        if (prevElt.repeatCount > 0) {
          const diff = newInitialStart - prevElt.start;
          if (diff % prevElt.duration === 0 && diff / prevElt.duration <= prevElt.repeatCount) {
            const repeatNumberInPrevSegments = diff / prevElt.duration;
            return {
              repeatNumberInPrevSegments,
              prevSegmentsIdx: prevElementIndex,
              newElementsIdx: 0,
              repeatNumberInNewElements: 0
            };
          }
        }
        prevElementIndex++;
        if (prevElementIndex >= prevTimeline.length) {
          return null;
        }
        prevElt = prevTimeline[prevElementIndex];
        if (prevElt.start === newInitialStart) {
          return {
            prevSegmentsIdx: prevElementIndex,
            newElementsIdx: 0,
            repeatNumberInPrevSegments: 0,
            repeatNumberInNewElements: 0
          };
        } else if (prevElt.start > newInitialStart) {
          return null;
        }
      }
    } else {
      let newElementsIdx = 0;
      let newElt = newElements[0];
      let currentTimeOffset = newInitialStart;
      while (true) {
        const dAttr = newElt.getAttribute("d");
        const duration = dAttr === null ? null : parseInt(dAttr, 10);
        if (duration === null || Number.isNaN(duration)) {
          return null;
        }
        const rAttr = newElt.getAttribute("r");
        const repeatCount = rAttr === null ? null : parseInt(rAttr, 10);
        if (repeatCount !== null) {
          if (Number.isNaN(repeatCount) || repeatCount < 0) {
            return null;
          }
          if (repeatCount > 0) {
            const diff = prevInitialStart - currentTimeOffset;
            if (diff % duration === 0 && diff / duration <= repeatCount) {
              const repeatNumberInNewElements = diff / duration;
              return {
                repeatNumberInPrevSegments: 0,
                repeatNumberInNewElements,
                prevSegmentsIdx: 0,
                newElementsIdx
              };
            }
          }
          currentTimeOffset += duration * (repeatCount + 1);
        } else {
          currentTimeOffset += duration;
        }
        newElementsIdx++;
        if (newElementsIdx >= newElements.length) {
          return null;
        }
        newElt = newElements[newElementsIdx];
        const tAttr = newElt.getAttribute("t");
        const time = tAttr === null ? null : parseInt(tAttr, 10);
        if (time !== null) {
          if (Number.isNaN(time)) {
            return null;
          }
          currentTimeOffset = time;
        }
        if (currentTimeOffset === prevInitialStart) {
          return {
            newElementsIdx,
            prevSegmentsIdx: 0,
            repeatNumberInPrevSegments: 0,
            repeatNumberInNewElements: 0
          };
        } else if (currentTimeOffset > newInitialStart) {
          return null;
        }
      }
    }
  }

  // src/worker/parsers/manifest/dash/common/indexes/timeline/construct_timeline_from_previous_timeline.ts
  function constructTimelineFromPreviousTimeline(newElements, prevTimeline) {
    const commonStartInfo = findFirstCommonStartTime(prevTimeline, newElements);
    if (commonStartInfo === null) {
      log_default.warn('DASH: Cannot perform "based" update. Common segment not found.');
      return constructTimelineFromElements(newElements);
    }
    const {
      prevSegmentsIdx,
      newElementsIdx,
      repeatNumberInPrevSegments,
      repeatNumberInNewElements
    } = commonStartInfo;
    const numberCommonEltGuess = prevTimeline.length - prevSegmentsIdx;
    const lastCommonEltNewEltsIdx = numberCommonEltGuess + newElementsIdx - 1;
    if (lastCommonEltNewEltsIdx >= newElements.length) {
      log_default.info('DASH: Cannot perform "based" update. New timeline too short');
      return constructTimelineFromElements(newElements);
    }
    const newTimeline = prevTimeline.slice(prevSegmentsIdx);
    if (repeatNumberInPrevSegments > 0) {
      const commonEltInOldTimeline = newTimeline[0];
      commonEltInOldTimeline.start += commonEltInOldTimeline.duration * repeatNumberInPrevSegments;
      newTimeline[0].repeatCount -= repeatNumberInPrevSegments;
    }
    if (repeatNumberInNewElements > 0 && newElementsIdx !== 0) {
      log_default.info('DASH: Cannot perform "based" update. The new timeline has a different form.');
      return constructTimelineFromElements(newElements);
    }
    const prevLastElement = newTimeline[newTimeline.length - 1];
    const newCommonElt = parseSElement(newElements[lastCommonEltNewEltsIdx]);
    const newRepeatCountOffseted = (newCommonElt.repeatCount ?? 0) - repeatNumberInNewElements;
    if (newCommonElt.duration !== prevLastElement.duration || prevLastElement.repeatCount > newRepeatCountOffseted) {
      log_default.info('DASH: Cannot perform "based" update. The new timeline has a different form at the beginning.');
      return constructTimelineFromElements(newElements);
    }
    if (newCommonElt.repeatCount !== void 0 && newCommonElt.repeatCount > prevLastElement.repeatCount) {
      prevLastElement.repeatCount = newCommonElt.repeatCount;
    }
    const newEltsToPush = [];
    const items = [];
    for (let i = lastCommonEltNewEltsIdx + 1; i < newElements.length; i++) {
      items.push(parseSElement(newElements[i]));
    }
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const previousItem = newEltsToPush[newEltsToPush.length - 1] === void 0 ? prevLastElement : newEltsToPush[newEltsToPush.length - 1];
      const nextItem = items[i + 1] === void 0 ? null : items[i + 1];
      const timelineElement = convertElementsToIndexSegment(item, previousItem, nextItem);
      if (timelineElement !== null) {
        newEltsToPush.push(timelineElement);
      }
    }
    return newTimeline.concat(newEltsToPush);
  }

  // src/worker/parsers/manifest/dash/common/indexes/timeline/timeline_representation_index.ts
  var TimelineRepresentationIndex = class {
    _index;
    _lastUpdate;
    _scaledPeriodStart;
    _scaledPeriodEnd;
    _isDynamic;
    _manifestBoundsCalculator;
    _parseTimeline;
    _unsafelyBaseOnPreviousIndex;
    _isEMSGWhitelisted;
    _isLastPeriod;
    constructor(index, context2) {
      if (!TimelineRepresentationIndex.isTimelineIndexArgument(index)) {
        throw new Error("The given index is not compatible with a TimelineRepresentationIndex.");
      }
      const {
        availabilityTimeComplete,
        manifestBoundsCalculator,
        isDynamic,
        isLastPeriod,
        representationBaseURLs,
        representationId,
        representationBitrate,
        periodStart,
        periodEnd,
        isEMSGWhitelisted
      } = context2;
      const timescale = index.timescale ?? 1;
      const presentationTimeOffset = index.presentationTimeOffset != null ? index.presentationTimeOffset : 0;
      const scaledStart = periodStart * timescale;
      const indexTimeOffset = presentationTimeOffset - scaledStart;
      this._manifestBoundsCalculator = manifestBoundsCalculator;
      this._isEMSGWhitelisted = isEMSGWhitelisted;
      this._isLastPeriod = isLastPeriod;
      this._lastUpdate = context2.receivedTime == null ? performance.now() : context2.receivedTime;
      this._unsafelyBaseOnPreviousIndex = null;
      if (context2.unsafelyBaseOnPreviousRepresentation !== null && context2.unsafelyBaseOnPreviousRepresentation.index instanceof TimelineRepresentationIndex) {
        context2.unsafelyBaseOnPreviousRepresentation.index._unsafelyBaseOnPreviousIndex = null;
        this._unsafelyBaseOnPreviousIndex = context2.unsafelyBaseOnPreviousRepresentation.index;
      }
      this._isDynamic = isDynamic;
      this._parseTimeline = index.timelineParser ?? null;
      const urlSources = representationBaseURLs.map((b) => b.url);
      this._index = {
        availabilityTimeComplete,
        indexRange: index.indexRange,
        indexTimeOffset,
        initialization: index.initialization == null ? void 0 : {
          mediaURLs: createIndexURLs(urlSources, index.initialization.media, representationId, representationBitrate),
          range: index.initialization.range
        },
        mediaURLs: createIndexURLs(urlSources, index.media, representationId, representationBitrate),
        startNumber: index.startNumber,
        timeline: index.timeline ?? null,
        timescale
      };
      this._scaledPeriodStart = toIndexTime(periodStart, this._index);
      this._scaledPeriodEnd = periodEnd === void 0 ? void 0 : toIndexTime(periodEnd, this._index);
    }
    getInitSegment() {
      return getInitSegment(this._index, this._isEMSGWhitelisted);
    }
    getSegments(from2, duration) {
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      const {
        mediaURLs,
        startNumber,
        timeline,
        timescale,
        indexTimeOffset
      } = this._index;
      return getSegmentsFromTimeline({
        mediaURLs,
        startNumber,
        timeline,
        timescale,
        indexTimeOffset
      }, from2, duration, this._isEMSGWhitelisted, this._scaledPeriodEnd);
    }
    shouldRefresh() {
      return false;
    }
    getFirstPosition() {
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      const timeline = this._index.timeline;
      return timeline.length === 0 ? null : fromIndexTime(Math.max(this._scaledPeriodStart, timeline[0].start), this._index);
    }
    getLastPosition() {
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      const lastTime = TimelineRepresentationIndex.getIndexEnd(this._index.timeline, this._scaledPeriodEnd);
      return lastTime === null ? null : fromIndexTime(lastTime, this._index);
    }
    isSegmentStillAvailable(segment) {
      if (segment.isInit) {
        return true;
      }
      this._refreshTimeline();
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      const { timeline, timescale, indexTimeOffset } = this._index;
      return isSegmentStillAvailable(segment, timeline, timescale, indexTimeOffset);
    }
    checkDiscontinuity(time) {
      this._refreshTimeline();
      let timeline = this._index.timeline;
      if (timeline === null) {
        timeline = this._getTimeline();
        this._index.timeline = timeline;
      }
      return checkDiscontinuity({
        timeline,
        timescale: this._index.timescale,
        indexTimeOffset: this._index.indexTimeOffset
      }, time, this._scaledPeriodEnd);
    }
    canBeOutOfSyncError(error) {
      if (!this._isDynamic) {
        return false;
      }
      return error instanceof NetworkError && error.isHttpError(404);
    }
    areSegmentsChronologicallyGenerated() {
      return true;
    }
    _replace(newIndex) {
      this._parseTimeline = newIndex._parseTimeline;
      this._index = newIndex._index;
      this._isDynamic = newIndex._isDynamic;
      this._scaledPeriodStart = newIndex._scaledPeriodStart;
      this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
      this._lastUpdate = newIndex._lastUpdate;
      this._manifestBoundsCalculator = newIndex._manifestBoundsCalculator;
      this._isLastPeriod = newIndex._isLastPeriod;
    }
    _update(newIndex) {
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      if (newIndex._index.timeline === null) {
        newIndex._index.timeline = newIndex._getTimeline();
      }
      const hasReplaced = updateSegmentTimeline(this._index.timeline, newIndex._index.timeline);
      if (hasReplaced) {
        this._index.startNumber = newIndex._index.startNumber;
      }
      this._isDynamic = newIndex._isDynamic;
      this._scaledPeriodStart = newIndex._scaledPeriodStart;
      this._scaledPeriodEnd = newIndex._scaledPeriodEnd;
      this._lastUpdate = newIndex._lastUpdate;
      this._isLastPeriod = newIndex._isLastPeriod;
    }
    isFinished() {
      if (!this._isDynamic || !this._isLastPeriod) {
        return true;
      }
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      const { timeline } = this._index;
      if (this._scaledPeriodEnd === void 0 || timeline.length === 0) {
        return false;
      }
      const lastTimelineElement = timeline[timeline.length - 1];
      const lastTime = getIndexSegmentEnd(lastTimelineElement, null, this._scaledPeriodEnd);
      return isPeriodFulfilled(this._index.timescale, lastTime, this._scaledPeriodEnd);
    }
    isInitialized() {
      return true;
    }
    static isTimelineIndexArgument(index) {
      return typeof index.timelineParser === "function" || Array.isArray(index.timeline);
    }
    _refreshTimeline() {
      if (this._index.timeline === null) {
        this._index.timeline = this._getTimeline();
      }
      if (!this._isDynamic) {
        return;
      }
      const firstPosition = this._manifestBoundsCalculator.estimateMinimumBound();
      if (firstPosition == null) {
        return;
      }
      const scaledFirstPosition = toIndexTime(firstPosition, this._index);
      const nbEltsRemoved = clearTimelineFromPosition(this._index.timeline, scaledFirstPosition);
      if (this._index.startNumber !== void 0) {
        this._index.startNumber += nbEltsRemoved;
      }
    }
    static getIndexEnd(timeline, scaledPeriodEnd) {
      if (timeline.length <= 0) {
        return null;
      }
      return Math.min(getIndexSegmentEnd(timeline[timeline.length - 1], null, scaledPeriodEnd), scaledPeriodEnd ?? Infinity);
    }
    _getTimeline() {
      if (this._parseTimeline === null) {
        if (this._index.timeline !== null) {
          return this._index.timeline;
        }
        log_default.error("DASH: Timeline already lazily parsed.");
        return [];
      }
      const newElements = this._parseTimeline();
      this._parseTimeline = null;
      const { MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY } = config_default.getCurrent();
      if (this._unsafelyBaseOnPreviousIndex === null || newElements.length < MIN_DASH_S_ELEMENTS_TO_PARSE_UNSAFELY) {
        return constructTimelineFromElements(newElements);
      }
      let prevTimeline;
      if (this._unsafelyBaseOnPreviousIndex._index.timeline === null) {
        prevTimeline = this._unsafelyBaseOnPreviousIndex._getTimeline();
        this._unsafelyBaseOnPreviousIndex._index.timeline = prevTimeline;
      } else {
        prevTimeline = this._unsafelyBaseOnPreviousIndex._index.timeline;
      }
      this._unsafelyBaseOnPreviousIndex = null;
      return constructTimelineFromPreviousTimeline(newElements, prevTimeline);
    }
  };

  // src/worker/parsers/manifest/dash/common/indexes/timeline/index.ts
  var timeline_default = TimelineRepresentationIndex;

  // src/worker/parsers/manifest/dash/common/parse_mpd.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/get_clock_offset.ts
  init_define_ENVIRONMENT();
  function getClockOffset(serverClock) {
    const httpOffset = Date.parse(serverClock) - performance.now();
    if (isNaN(httpOffset)) {
      log_default.warn("DASH Parser: Invalid clock received: ", serverClock);
      return void 0;
    }
    return httpOffset;
  }

  // src/worker/parsers/manifest/dash/common/get_http_utc-timing_url.ts
  init_define_ENVIRONMENT();
  function getHTTPUTCTimingURL(mpdIR) {
    const UTCTimingHTTP = mpdIR.children.utcTimings.filter((utcTiming) => (utcTiming.schemeIdUri === "urn:mpeg:dash:utc:http-iso:2014" || utcTiming.schemeIdUri === "urn:mpeg:dash:utc:http-xsdate:2014") && utcTiming.value !== void 0);
    return UTCTimingHTTP.length > 0 ? UTCTimingHTTP[0].value : void 0;
  }

  // src/worker/parsers/manifest/dash/common/get_minimum_and_maximum_positions.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/utils/get_maximum_positions.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/utils/get_last_time_from_adaptation.ts
  init_define_ENVIRONMENT();
  function getLastPositionFromAdaptation2(adaptation) {
    const { representations } = adaptation;
    let min = null;
    for (let i = 0; i < representations.length; i++) {
      const lastPosition = representations[i].index.getLastPosition();
      if (lastPosition === void 0) {
        return void 0;
      }
      if (lastPosition !== null) {
        min = min == null ? lastPosition : Math.min(min, lastPosition);
      }
    }
    if (min === null) {
      return null;
    }
    return min;
  }

  // src/worker/parsers/manifest/utils/get_maximum_positions.ts
  function getMaximumPosition(periods) {
    for (let i = periods.length - 1; i >= 0; i--) {
      const periodAdaptations = periods[i].adaptations;
      const firstAudioAdaptationFromPeriod = periodAdaptations.audio === void 0 ? void 0 : periodAdaptations.audio[0];
      const firstVideoAdaptationFromPeriod = periodAdaptations.video === void 0 ? void 0 : periodAdaptations.video[0];
      if (firstAudioAdaptationFromPeriod !== void 0 || firstVideoAdaptationFromPeriod !== void 0) {
        let maximumAudioPosition = null;
        let maximumVideoPosition = null;
        if (firstAudioAdaptationFromPeriod !== void 0) {
          const lastPosition = getLastPositionFromAdaptation2(firstAudioAdaptationFromPeriod);
          if (lastPosition === void 0) {
            return { safe: void 0, unsafe: void 0 };
          }
          maximumAudioPosition = lastPosition;
        }
        if (firstVideoAdaptationFromPeriod !== void 0) {
          const lastPosition = getLastPositionFromAdaptation2(firstVideoAdaptationFromPeriod);
          if (lastPosition === void 0) {
            return { safe: void 0, unsafe: void 0 };
          }
          maximumVideoPosition = lastPosition;
        }
        if (firstAudioAdaptationFromPeriod !== void 0 && maximumAudioPosition === null || firstVideoAdaptationFromPeriod !== void 0 && maximumVideoPosition === null) {
          log_default.info("Parser utils: found Period with no segment. ", "Going to previous one to calculate last position");
          return { safe: void 0, unsafe: void 0 };
        }
        if (maximumVideoPosition !== null) {
          if (maximumAudioPosition !== null) {
            return {
              safe: Math.min(maximumAudioPosition, maximumVideoPosition),
              unsafe: Math.max(maximumAudioPosition, maximumVideoPosition)
            };
          }
          return {
            safe: maximumVideoPosition,
            unsafe: maximumVideoPosition
          };
        }
        if (maximumAudioPosition !== null) {
          return {
            safe: maximumAudioPosition,
            unsafe: maximumAudioPosition
          };
        }
      }
    }
    return { safe: void 0, unsafe: void 0 };
  }

  // src/worker/parsers/manifest/utils/get_minimum_position.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/utils/get_first_time_from_adaptation.ts
  init_define_ENVIRONMENT();
  function getFirstPositionFromAdaptation(adaptation) {
    const { representations } = adaptation;
    let max = null;
    for (let i = 0; i < representations.length; i++) {
      const firstPosition = representations[i].index.getFirstPosition();
      if (firstPosition === void 0) {
        return void 0;
      }
      if (firstPosition !== null) {
        max = max == null ? firstPosition : Math.max(max, firstPosition);
      }
    }
    if (max === null) {
      return null;
    }
    return max;
  }

  // src/worker/parsers/manifest/utils/get_minimum_position.ts
  function getMinimumPosition(periods) {
    for (let i = 0; i <= periods.length - 1; i++) {
      const periodAdaptations = periods[i].adaptations;
      const firstAudioAdaptationFromPeriod = periodAdaptations.audio === void 0 ? void 0 : periodAdaptations.audio[0];
      const firstVideoAdaptationFromPeriod = periodAdaptations.video === void 0 ? void 0 : periodAdaptations.video[0];
      if (firstAudioAdaptationFromPeriod !== void 0 || firstVideoAdaptationFromPeriod !== void 0) {
        let minimumAudioPosition = null;
        let minimumVideoPosition = null;
        if (firstAudioAdaptationFromPeriod !== void 0) {
          const firstPosition = getFirstPositionFromAdaptation(firstAudioAdaptationFromPeriod);
          if (firstPosition === void 0) {
            return void 0;
          }
          minimumAudioPosition = firstPosition;
        }
        if (firstVideoAdaptationFromPeriod !== void 0) {
          const firstPosition = getFirstPositionFromAdaptation(firstVideoAdaptationFromPeriod);
          if (firstPosition === void 0) {
            return void 0;
          }
          minimumVideoPosition = firstPosition;
        }
        if (firstAudioAdaptationFromPeriod !== void 0 && minimumAudioPosition === null || firstVideoAdaptationFromPeriod !== void 0 && minimumVideoPosition === null) {
          log_default.info("Parser utils: found Period with no segment. ", "Going to next one to calculate first position");
          return void 0;
        }
        if (minimumVideoPosition !== null) {
          if (minimumAudioPosition !== null) {
            return Math.max(minimumAudioPosition, minimumVideoPosition);
          }
          return minimumVideoPosition;
        }
        if (minimumAudioPosition !== null) {
          return minimumAudioPosition;
        }
      }
    }
  }

  // src/worker/parsers/manifest/dash/common/get_minimum_and_maximum_positions.ts
  function getMinimumAndMaximumPositions(periods) {
    if (periods.length === 0) {
      throw new Error("DASH Parser: no period available for a dynamic content");
    }
    const minimumSafePosition = getMinimumPosition(periods);
    const maxPositions = getMaximumPosition(periods);
    return {
      minimumSafePosition,
      maximumSafePosition: maxPositions.safe,
      maximumUnsafePosition: maxPositions.unsafe
    };
  }

  // src/worker/parsers/manifest/dash/common/parse_availability_start_time.ts
  init_define_ENVIRONMENT();
  function parseAvailabilityStartTime(rootAttributes, referenceDateTime) {
    if (rootAttributes.type !== "dynamic") {
      return 0;
    }
    if (rootAttributes.availabilityStartTime == null) {
      return referenceDateTime == null ? 0 : referenceDateTime;
    }
    return rootAttributes.availabilityStartTime;
  }

  // src/worker/parsers/manifest/dash/common/parse_periods.ts
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

  // src/common/utils/string_parsing.ts
  init_define_ENVIRONMENT();
  var hasTextDecoder = typeof window === "object" && typeof window.TextDecoder === "function";
  var hasTextEncoder = typeof window === "object" && typeof window.TextEncoder === "function";
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
  function hexToBytes(str) {
    const len = str.length;
    const arr = new Uint8Array(len / 2);
    for (let i = 0, j = 0; i < len; i += 2, j++) {
      arr[j] = parseInt(str.substring(i, i + 2), 16) & 255;
    }
    return arr;
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
  function readNullTerminatedString(buffer, offset) {
    let position = offset;
    while (position < buffer.length) {
      const value = buffer[position];
      if (value === 0) {
        break;
      }
      position += 1;
    }
    const bytes = buffer.subarray(offset, position);
    return {
      end: position + 1,
      string: utf8ToStr(bytes)
    };
  }

  // src/worker/parsers/manifest/dash/common/flatten_overlapping_periods.ts
  init_define_ENVIRONMENT();
  function flattenOverlappingPeriods(parsedPeriods) {
    if (parsedPeriods.length === 0) {
      return [];
    }
    const flattenedPeriods = [parsedPeriods[0]];
    for (let i = 1; i < parsedPeriods.length; i++) {
      const parsedPeriod = parsedPeriods[i];
      let lastFlattenedPeriod = flattenedPeriods[flattenedPeriods.length - 1];
      while (lastFlattenedPeriod.duration === void 0 || lastFlattenedPeriod.start + lastFlattenedPeriod.duration > parsedPeriod.start) {
        log_default.warn("DASH: Updating overlapping Periods.", lastFlattenedPeriod?.start, parsedPeriod.start);
        lastFlattenedPeriod.duration = parsedPeriod.start - lastFlattenedPeriod.start;
        lastFlattenedPeriod.end = parsedPeriod.start;
        if (lastFlattenedPeriod.duration > 0) {
          break;
        } else {
          flattenedPeriods.pop();
          lastFlattenedPeriod = flattenedPeriods[flattenedPeriods.length - 1];
        }
      }
      flattenedPeriods.push(parsedPeriod);
    }
    return flattenedPeriods;
  }

  // src/worker/parsers/manifest/dash/common/get_periods_time_infos.ts
  init_define_ENVIRONMENT();
  function getPeriodsTimeInformation(periodsIR, manifestInfos) {
    const periodsTimeInformation = [];
    periodsIR.forEach((currentPeriod, i) => {
      let periodStart;
      if (currentPeriod.attributes.start != null) {
        periodStart = currentPeriod.attributes.start;
      } else {
        if (i === 0) {
          periodStart = !manifestInfos.isDynamic || manifestInfos.availabilityStartTime == null ? 0 : manifestInfos.availabilityStartTime;
        } else {
          const prevPeriodInfos = periodsTimeInformation[periodsTimeInformation.length - 1];
          if (prevPeriodInfos != null && prevPeriodInfos.periodEnd != null) {
            periodStart = prevPeriodInfos.periodEnd;
          } else {
            throw new Error("Missing start time when parsing periods.");
          }
        }
      }
      let periodDuration;
      const nextPeriod = periodsIR[i + 1];
      if (currentPeriod.attributes.duration != null) {
        periodDuration = currentPeriod.attributes.duration;
      } else if (i === periodsIR.length - 1) {
        periodDuration = manifestInfos.duration;
      } else if (nextPeriod.attributes.start != null) {
        periodDuration = nextPeriod.attributes.start - periodStart;
      }
      const periodEnd = periodDuration != null ? periodStart + periodDuration : void 0;
      periodsTimeInformation.push({
        periodStart,
        periodDuration,
        periodEnd
      });
    });
    return periodsTimeInformation;
  }

  // src/worker/parsers/manifest/dash/common/manifest_bounds_calculator.ts
  init_define_ENVIRONMENT();
  var ManifestBoundsCalculator = class {
    _timeShiftBufferDepth;
    _positionTime;
    _lastPosition;
    _isDynamic;
    constructor(args) {
      this._isDynamic = args.isDynamic;
      this._timeShiftBufferDepth = !args.isDynamic || args.timeShiftBufferDepth === void 0 ? null : args.timeShiftBufferDepth;
    }
    setLastPosition(lastPosition, positionTime) {
      this._lastPosition = lastPosition;
      this._positionTime = positionTime;
    }
    lastPositionIsKnown() {
      if (this._isDynamic) {
        return this._positionTime != null && this._lastPosition != null;
      }
      return this._lastPosition != null;
    }
    estimateMinimumBound() {
      if (!this._isDynamic || this._timeShiftBufferDepth === null) {
        return 0;
      }
      const maximumBound = this.estimateMaximumBound();
      if (maximumBound === void 0) {
        return void 0;
      }
      const minimumBound = maximumBound - this._timeShiftBufferDepth;
      return minimumBound;
    }
    estimateMaximumBound() {
      if (this._isDynamic && this._positionTime != null && this._lastPosition != null) {
        return Math.max(this._lastPosition - this._positionTime + performance.now() / 1e3, 0);
      }
      return this._lastPosition;
    }
  };

  // src/worker/parsers/manifest/dash/common/parse_adaptation_sets.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/attach_trickmode_track.ts
  init_define_ENVIRONMENT();
  function attachTrickModeTrack(adaptations, trickModeTracks) {
    for (const track of trickModeTracks) {
      const { adaptation, trickModeAttachedAdaptationIds } = track;
      for (const trickModeAttachedAdaptationId of trickModeAttachedAdaptationIds) {
        for (const adaptationType of SUPPORTED_ADAPTATIONS_TYPE) {
          const adaptationsByType = adaptations[adaptationType];
          if (adaptationsByType !== void 0) {
            for (const adaptationByType of adaptationsByType) {
              if (adaptationByType.id === trickModeAttachedAdaptationId) {
                if (adaptationByType.trickModeTracks === void 0) {
                  adaptationByType.trickModeTracks = [];
                }
                adaptationByType.trickModeTracks.push(adaptation);
              }
            }
          }
        }
      }
    }
  }
  var attach_trickmode_track_default = attachTrickModeTrack;

  // src/worker/parsers/manifest/dash/common/infer_adaptation_type.ts
  init_define_ENVIRONMENT();
  var SUPPORTED_TEXT_TYPES = ["subtitle", "caption"];
  function inferAdaptationType(representations, adaptationMimeType, adaptationCodecs, adaptationRoles) {
    function fromMimeType(mimeType, roles) {
      const topLevel = mimeType.split("/")[0];
      if (arrayIncludes(SUPPORTED_ADAPTATIONS_TYPE, topLevel)) {
        return topLevel;
      }
      if (mimeType === "application/bif") {
        return "image";
      }
      if (mimeType === "application/ttml+xml") {
        return "text";
      }
      if (mimeType === "application/mp4") {
        if (roles != null) {
          if (arrayFind(roles, (role) => role.schemeIdUri === "urn:mpeg:dash:role:2011" && arrayIncludes(SUPPORTED_TEXT_TYPES, role.value)) != null) {
            return "text";
          }
        }
        return void 0;
      }
    }
    function fromCodecs(codecs) {
      switch (codecs.substring(0, 3)) {
        case "avc":
        case "hev":
        case "hvc":
        case "vp8":
        case "vp9":
        case "av1":
          return "video";
        case "vtt":
          return "text";
        case "bif":
          return "image";
      }
      switch (codecs.substring(0, 4)) {
        case "mp4a":
          return "audio";
        case "wvtt":
        case "stpp":
          return "text";
      }
    }
    if (adaptationMimeType !== null) {
      const typeFromMimeType = fromMimeType(adaptationMimeType, adaptationRoles);
      if (typeFromMimeType !== void 0) {
        return typeFromMimeType;
      }
    }
    if (adaptationCodecs !== null) {
      const typeFromCodecs = fromCodecs(adaptationCodecs);
      if (typeFromCodecs !== void 0) {
        return typeFromCodecs;
      }
    }
    for (let i = 0; i < representations.length; i++) {
      const representation = representations[i];
      const { mimeType, codecs } = representation.attributes;
      if (mimeType !== void 0) {
        const typeFromMimeType = fromMimeType(mimeType, adaptationRoles);
        if (typeFromMimeType !== void 0) {
          return typeFromMimeType;
        }
      }
      if (codecs !== void 0) {
        const typeFromCodecs = fromCodecs(codecs);
        if (typeFromCodecs !== void 0) {
          return typeFromCodecs;
        }
      }
    }
    return void 0;
  }

  // src/worker/parsers/manifest/dash/common/parse_representations.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/get_hdr_information.ts
  init_define_ENVIRONMENT();
  function getWEBMHDRInformation(codecString) {
    const [cccc, _PP, _LL, DD, _CC, cp, tc, mc] = codecString.split(".");
    if (cccc !== "vp08" && cccc !== "vp09" && cccc !== "vp10") {
      return void 0;
    }
    let colorDepth;
    let eotf;
    let colorSpace;
    if (DD !== void 0 && DD === "10" || DD === "12") {
      colorDepth = parseInt(DD, 10);
    }
    if (tc !== void 0) {
      if (tc === "16") {
        eotf = "pq";
      } else if (tc === "18") {
        eotf = "hlg";
      }
    }
    if (cp !== void 0 && mc !== void 0 && cp === "09" && mc === "09") {
      colorSpace = "rec2020";
    }
    if (colorDepth === void 0 || eotf === void 0) {
      return void 0;
    }
    return { colorDepth, eotf, colorSpace };
  }

  // src/worker/parsers/manifest/dash/common/parse_representation_index.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/common/resolve_base_urls.ts
  init_define_ENVIRONMENT();
  function resolveBaseURLs(currentBaseURLs, newBaseUrlsIR) {
    if (newBaseUrlsIR.length === 0) {
      return currentBaseURLs;
    }
    const newBaseUrls = newBaseUrlsIR.map((ir) => {
      return {
        url: ir.value,
        availabilityTimeOffset: ir.attributes.availabilityTimeOffset ?? 0,
        availabilityTimeComplete: ir.attributes.availabilityTimeComplete ?? true
      };
    });
    if (currentBaseURLs.length === 0) {
      return newBaseUrls;
    }
    const result = [];
    for (let i = 0; i < currentBaseURLs.length; i++) {
      const curBaseUrl = currentBaseURLs[i];
      for (let j = 0; j < newBaseUrls.length; j++) {
        const newBaseUrl = newBaseUrls[j];
        const newUrl = resolveURL(curBaseUrl.url, newBaseUrl.url);
        const newAvailabilityTimeOffset = curBaseUrl.availabilityTimeOffset + newBaseUrl.availabilityTimeOffset;
        result.push({
          url: newUrl,
          availabilityTimeOffset: newAvailabilityTimeOffset,
          availabilityTimeComplete: newBaseUrl.availabilityTimeComplete
        });
      }
    }
    return result;
  }

  // src/worker/parsers/manifest/dash/common/parse_representation_index.ts
  function parseRepresentationIndex(representation, context2) {
    const representationBaseURLs = resolveBaseURLs(context2.baseURLs, representation.children.baseURLs);
    const {
      aggressiveMode,
      availabilityTimeOffset,
      manifestBoundsCalculator,
      isDynamic,
      end: periodEnd,
      start: periodStart,
      receivedTime,
      timeShiftBufferDepth,
      unsafelyBaseOnPreviousRepresentation,
      inbandEventStreams,
      isLastPeriod
    } = context2;
    const isEMSGWhitelisted = (inbandEvent) => {
      if (inbandEventStreams === void 0) {
        return false;
      }
      return inbandEventStreams.some(({ schemeIdUri }) => schemeIdUri === inbandEvent.schemeIdUri);
    };
    const reprIndexCtxt = {
      aggressiveMode,
      availabilityTimeComplete: true,
      availabilityTimeOffset,
      unsafelyBaseOnPreviousRepresentation,
      isEMSGWhitelisted,
      isLastPeriod,
      manifestBoundsCalculator,
      isDynamic,
      periodEnd,
      periodStart,
      receivedTime,
      representationBaseURLs,
      representationBitrate: representation.attributes.bitrate,
      representationId: representation.attributes.id,
      timeShiftBufferDepth
    };
    let representationIndex;
    if (representation.children.segmentBase !== void 0) {
      const { segmentBase } = representation.children;
      representationIndex = new BaseRepresentationIndex(segmentBase, reprIndexCtxt);
    } else if (representation.children.segmentList !== void 0) {
      const { segmentList } = representation.children;
      representationIndex = new ListRepresentationIndex(segmentList, reprIndexCtxt);
    } else if (representation.children.segmentTemplate !== void 0 || context2.parentSegmentTemplates.length > 0) {
      const segmentTemplates = context2.parentSegmentTemplates.slice();
      const childSegmentTemplate = representation.children.segmentTemplate;
      if (childSegmentTemplate !== void 0) {
        segmentTemplates.push(childSegmentTemplate);
      }
      const segmentTemplate = object_assign_default({}, ...segmentTemplates);
      reprIndexCtxt.availabilityTimeComplete = segmentTemplate.availabilityTimeComplete ?? context2.availabilityTimeComplete;
      reprIndexCtxt.availabilityTimeOffset = (segmentTemplate.availabilityTimeOffset ?? 0) + context2.availabilityTimeOffset;
      representationIndex = timeline_default.isTimelineIndexArgument(segmentTemplate) ? new timeline_default(segmentTemplate, reprIndexCtxt) : new TemplateRepresentationIndex(segmentTemplate, reprIndexCtxt);
    } else {
      const adaptationChildren = context2.adaptation.children;
      if (adaptationChildren.segmentBase !== void 0) {
        const { segmentBase } = adaptationChildren;
        representationIndex = new BaseRepresentationIndex(segmentBase, reprIndexCtxt);
      } else if (adaptationChildren.segmentList !== void 0) {
        const { segmentList } = adaptationChildren;
        representationIndex = new ListRepresentationIndex(segmentList, reprIndexCtxt);
      } else {
        representationIndex = new TemplateRepresentationIndex({
          duration: Number.MAX_VALUE,
          timescale: 1,
          startNumber: 0,
          media: ""
        }, reprIndexCtxt);
      }
    }
    return representationIndex;
  }

  // src/worker/parsers/manifest/dash/common/parse_representations.ts
  function combineInbandEventStreams(representation, adaptation) {
    const newSchemeId = [];
    if (representation.children.inbandEventStreams !== void 0) {
      newSchemeId.push(...representation.children.inbandEventStreams);
    }
    if (adaptation.children.inbandEventStreams !== void 0) {
      newSchemeId.push(...adaptation.children.inbandEventStreams);
    }
    if (newSchemeId.length === 0) {
      return void 0;
    }
    return newSchemeId;
  }
  function getHDRInformation({
    adaptationProfiles,
    manifestProfiles,
    codecs
  }) {
    const profiles = (adaptationProfiles ?? "") + (manifestProfiles ?? "");
    if (codecs === void 0) {
      return void 0;
    }
    if (profiles.indexOf("http://dashif.org/guidelines/dash-if-uhd#hevc-hdr-pq10") !== -1) {
      if (codecs === "hvc1.2.4.L153.B0" || codecs === "hev1.2.4.L153.B0") {
        return {
          colorDepth: 10,
          eotf: "pq",
          colorSpace: "rec2020"
        };
      }
    }
    if (/^vp(08|09|10)/.exec(codecs)) {
      return getWEBMHDRInformation(codecs);
    }
  }
  function parseRepresentations(representationsIR, adaptation, context2) {
    const parsedRepresentations = [];
    for (const representation of representationsIR) {
      let representationID = representation.attributes.id != null ? representation.attributes.id : String(representation.attributes.bitrate) + (representation.attributes.height != null ? `-${representation.attributes.height}` : "") + (representation.attributes.width != null ? `-${representation.attributes.width}` : "") + (representation.attributes.mimeType != null ? `-${representation.attributes.mimeType}` : "") + (representation.attributes.codecs != null ? `-${representation.attributes.codecs}` : "");
      while (parsedRepresentations.some((r) => r.id === representationID)) {
        representationID += "-dup";
      }
      const unsafelyBaseOnPreviousRepresentation = context2.unsafelyBaseOnPreviousAdaptation?.getRepresentation(representationID) ?? null;
      const inbandEventStreams = combineInbandEventStreams(representation, adaptation);
      const availabilityTimeComplete = representation.attributes.availabilityTimeComplete ?? context2.availabilityTimeComplete;
      const availabilityTimeOffset = (representation.attributes.availabilityTimeOffset ?? 0) + context2.availabilityTimeOffset;
      const reprIndexCtxt = object_assign_default({}, context2, {
        availabilityTimeOffset,
        availabilityTimeComplete,
        unsafelyBaseOnPreviousRepresentation,
        adaptation,
        inbandEventStreams
      });
      const representationIndex = parseRepresentationIndex(representation, reprIndexCtxt);
      let representationBitrate;
      if (representation.attributes.bitrate == null) {
        log_default.warn("DASH: No usable bitrate found in the Representation.");
        representationBitrate = 0;
      } else {
        representationBitrate = representation.attributes.bitrate;
      }
      const parsedRepresentation = {
        bitrate: representationBitrate,
        index: representationIndex,
        id: representationID
      };
      let codecs;
      if (representation.attributes.codecs != null) {
        codecs = representation.attributes.codecs;
      } else if (adaptation.attributes.codecs != null) {
        codecs = adaptation.attributes.codecs;
      }
      if (codecs != null) {
        codecs = codecs === "mp4a.40.02" ? "mp4a.40.2" : codecs;
        parsedRepresentation.codecs = codecs;
      }
      if (representation.attributes.frameRate != null) {
        parsedRepresentation.frameRate = representation.attributes.frameRate;
      } else if (adaptation.attributes.frameRate != null) {
        parsedRepresentation.frameRate = adaptation.attributes.frameRate;
      }
      if (representation.attributes.height != null) {
        parsedRepresentation.height = representation.attributes.height;
      } else if (adaptation.attributes.height != null) {
        parsedRepresentation.height = adaptation.attributes.height;
      }
      if (representation.attributes.mimeType != null) {
        parsedRepresentation.mimeType = representation.attributes.mimeType;
      } else if (adaptation.attributes.mimeType != null) {
        parsedRepresentation.mimeType = adaptation.attributes.mimeType;
      }
      if (representation.attributes.width != null) {
        parsedRepresentation.width = representation.attributes.width;
      } else if (adaptation.attributes.width != null) {
        parsedRepresentation.width = adaptation.attributes.width;
      }
      const contentProtectionsIr = adaptation.children.contentProtections !== void 0 ? adaptation.children.contentProtections : [];
      if (representation.children.contentProtections !== void 0) {
        contentProtectionsIr.push(...representation.children.contentProtections);
      }
      if (contentProtectionsIr.length > 0) {
        const contentProtections = contentProtectionsIr.reduce((acc, cp) => {
          let systemId;
          if (cp.attributes.schemeIdUri !== void 0 && cp.attributes.schemeIdUri.substring(0, 9) === "urn:uuid:") {
            systemId = cp.attributes.schemeIdUri.substring(9).replace(/-/g, "").toLowerCase();
          }
          if (cp.attributes.keyId !== void 0 && cp.attributes.keyId.length > 0) {
            const kidObj = { keyId: cp.attributes.keyId, systemId };
            if (acc.keyIds === void 0) {
              acc.keyIds = [kidObj];
            } else {
              acc.keyIds.push(kidObj);
            }
          }
          if (systemId !== void 0) {
            const { cencPssh } = cp.children;
            const values = [];
            for (const data of cencPssh) {
              values.push({ systemId, data });
            }
            if (values.length > 0) {
              const cencInitData = arrayFind(acc.initData, (i) => i.type === "cenc");
              if (cencInitData === void 0) {
                acc.initData.push({ type: "cenc", values });
              } else {
                cencInitData.values.push(...values);
              }
            }
          }
          return acc;
        }, { keyIds: void 0, initData: [] });
        if (Object.keys(contentProtections.initData).length > 0 || contentProtections.keyIds !== void 0 && contentProtections.keyIds.length > 0) {
          parsedRepresentation.contentProtections = contentProtections;
        }
      }
      parsedRepresentation.hdrInfo = getHDRInformation({
        adaptationProfiles: adaptation.attributes.profiles,
        manifestProfiles: context2.manifestProfiles,
        codecs
      });
      parsedRepresentations.push(parsedRepresentation);
    }
    return parsedRepresentations;
  }

  // src/worker/parsers/manifest/dash/common/parse_adaptation_sets.ts
  function isVisuallyImpaired(accessibility) {
    if (accessibility === void 0) {
      return false;
    }
    const isVisuallyImpairedAudioDvbDash = accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" && accessibility.value === "1";
    const isVisuallyImpairedDashIf = accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" && accessibility.value === "description";
    return isVisuallyImpairedAudioDvbDash || isVisuallyImpairedDashIf;
  }
  function isHardOfHearing(accessibility) {
    if (accessibility === void 0) {
      return false;
    }
    return accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" && accessibility.value === "2";
  }
  function hasSignLanguageInterpretation(accessibility) {
    if (accessibility === void 0) {
      return false;
    }
    return accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" && accessibility.value === "sign";
  }
  function getAdaptationID(adaptation, infos) {
    if (isNonEmptyString(adaptation.attributes.id)) {
      return adaptation.attributes.id;
    }
    const {
      isClosedCaption,
      isAudioDescription,
      isSignInterpreted,
      isTrickModeTrack,
      type
    } = infos;
    let idString = type;
    if (isNonEmptyString(adaptation.attributes.language)) {
      idString += `-${adaptation.attributes.language}`;
    }
    if (isClosedCaption === true) {
      idString += "-cc";
    }
    if (isAudioDescription === true) {
      idString += "-ad";
    }
    if (isSignInterpreted === true) {
      idString += "-si";
    }
    if (isTrickModeTrack) {
      idString += "-trickMode";
    }
    if (isNonEmptyString(adaptation.attributes.contentType)) {
      idString += `-${adaptation.attributes.contentType}`;
    }
    if (isNonEmptyString(adaptation.attributes.codecs)) {
      idString += `-${adaptation.attributes.codecs}`;
    }
    if (isNonEmptyString(adaptation.attributes.mimeType)) {
      idString += `-${adaptation.attributes.mimeType}`;
    }
    if (isNonEmptyString(adaptation.attributes.frameRate)) {
      idString += `-${adaptation.attributes.frameRate}`;
    }
    return idString;
  }
  function getAdaptationSetSwitchingIDs(adaptation) {
    if (adaptation.children.supplementalProperties != null) {
      const { supplementalProperties } = adaptation.children;
      for (const supplementalProperty of supplementalProperties) {
        if (supplementalProperty.schemeIdUri === "urn:mpeg:dash:adaptation-set-switching:2016" && supplementalProperty.value != null) {
          return supplementalProperty.value.split(",").map((id) => id.trim()).filter((id) => id);
        }
      }
    }
    return [];
  }
  function parseAdaptationSets(adaptationsIR, context2) {
    const parsedAdaptations = {
      video: [],
      audio: [],
      text: [],
      image: []
    };
    const trickModeAdaptations = [];
    const adaptationSwitchingInfos = {};
    const parsedAdaptationsIDs = [];
    let lastMainVideoAdapIdx = -1;
    for (let adaptationIdx = 0; adaptationIdx < adaptationsIR.length; adaptationIdx++) {
      const adaptation = adaptationsIR[adaptationIdx];
      const adaptationChildren = adaptation.children;
      const {
        essentialProperties,
        roles,
        label
      } = adaptationChildren;
      const isMainAdaptation = Array.isArray(roles) && roles.some((role) => role.value === "main") && roles.some((role) => role.schemeIdUri === "urn:mpeg:dash:role:2011");
      const representationsIR = adaptation.children.representations;
      const availabilityTimeComplete = adaptation.attributes.availabilityTimeComplete ?? context2.availabilityTimeComplete;
      const availabilityTimeOffset = (adaptation.attributes.availabilityTimeOffset ?? 0) + context2.availabilityTimeOffset;
      const adaptationMimeType = adaptation.attributes.mimeType;
      const adaptationCodecs = adaptation.attributes.codecs;
      const type = inferAdaptationType(representationsIR, isNonEmptyString(adaptationMimeType) ? adaptationMimeType : null, isNonEmptyString(adaptationCodecs) ? adaptationCodecs : null, adaptationChildren.roles != null ? adaptationChildren.roles : null);
      if (type === void 0) {
        continue;
      }
      const priority = adaptation.attributes.selectionPriority ?? 1;
      const originalID = adaptation.attributes.id;
      let newID;
      const adaptationSetSwitchingIDs = getAdaptationSetSwitchingIDs(adaptation);
      const parentSegmentTemplates = [];
      if (context2.segmentTemplate !== void 0) {
        parentSegmentTemplates.push(context2.segmentTemplate);
      }
      if (adaptation.children.segmentTemplate !== void 0) {
        parentSegmentTemplates.push(adaptation.children.segmentTemplate);
      }
      const reprCtxt = {
        aggressiveMode: context2.aggressiveMode,
        availabilityTimeComplete,
        availabilityTimeOffset,
        baseURLs: resolveBaseURLs(context2.baseURLs, adaptationChildren.baseURLs),
        manifestBoundsCalculator: context2.manifestBoundsCalculator,
        end: context2.end,
        isDynamic: context2.isDynamic,
        isLastPeriod: context2.isLastPeriod,
        manifestProfiles: context2.manifestProfiles,
        parentSegmentTemplates,
        receivedTime: context2.receivedTime,
        start: context2.start,
        timeShiftBufferDepth: context2.timeShiftBufferDepth,
        unsafelyBaseOnPreviousAdaptation: null
      };
      const trickModeProperty = Array.isArray(essentialProperties) ? arrayFind(essentialProperties, (scheme) => {
        return scheme.schemeIdUri === "http://dashif.org/guidelines/trickmode";
      }) : void 0;
      const trickModeAttachedAdaptationIds = trickModeProperty?.value?.split(" ");
      const isTrickModeTrack = trickModeAttachedAdaptationIds !== void 0;
      if (type === "video" && isMainAdaptation && lastMainVideoAdapIdx >= 0 && parsedAdaptations.video.length > lastMainVideoAdapIdx && !isTrickModeTrack) {
        const videoMainAdaptation = parsedAdaptations.video[lastMainVideoAdapIdx][0];
        reprCtxt.unsafelyBaseOnPreviousAdaptation = context2.unsafelyBaseOnPreviousPeriod?.getAdaptation(videoMainAdaptation.id) ?? null;
        const representations = parseRepresentations(representationsIR, adaptation, reprCtxt);
        videoMainAdaptation.representations.push(...representations);
        newID = videoMainAdaptation.id;
      } else {
        const { accessibilities } = adaptationChildren;
        let isDub;
        if (roles !== void 0 && roles.some((role) => role.value === "dub")) {
          isDub = true;
        }
        let isClosedCaption;
        if (type !== "text") {
          isClosedCaption = false;
        } else if (accessibilities !== void 0) {
          isClosedCaption = accessibilities.some(isHardOfHearing);
        }
        let isAudioDescription;
        if (type !== "audio") {
          isAudioDescription = false;
        } else if (accessibilities !== void 0) {
          isAudioDescription = accessibilities.some(isVisuallyImpaired);
        }
        let isSignInterpreted;
        if (type !== "video") {
          isSignInterpreted = false;
        } else if (accessibilities !== void 0) {
          isSignInterpreted = accessibilities.some(hasSignLanguageInterpretation);
        }
        let adaptationID = getAdaptationID(adaptation, {
          isAudioDescription,
          isClosedCaption,
          isSignInterpreted,
          isTrickModeTrack,
          type
        });
        while (arrayIncludes(parsedAdaptationsIDs, adaptationID)) {
          adaptationID += "-dup";
        }
        newID = adaptationID;
        parsedAdaptationsIDs.push(adaptationID);
        reprCtxt.unsafelyBaseOnPreviousAdaptation = context2.unsafelyBaseOnPreviousPeriod?.getAdaptation(adaptationID) ?? null;
        const representations = parseRepresentations(representationsIR, adaptation, reprCtxt);
        const parsedAdaptationSet = {
          id: adaptationID,
          representations,
          type,
          isTrickModeTrack
        };
        if (adaptation.attributes.language != null) {
          parsedAdaptationSet.language = adaptation.attributes.language;
        }
        if (isClosedCaption != null) {
          parsedAdaptationSet.closedCaption = isClosedCaption;
        }
        if (isAudioDescription != null) {
          parsedAdaptationSet.audioDescription = isAudioDescription;
        }
        if (isDub === true) {
          parsedAdaptationSet.isDub = true;
        }
        if (isSignInterpreted === true) {
          parsedAdaptationSet.isSignInterpreted = true;
        }
        if (label !== void 0) {
          parsedAdaptationSet.label = label;
        }
        if (trickModeAttachedAdaptationIds !== void 0) {
          trickModeAdaptations.push({
            adaptation: parsedAdaptationSet,
            trickModeAttachedAdaptationIds
          });
        } else {
          let mergedIntoIdx = -1;
          for (const id of adaptationSetSwitchingIDs) {
            const switchingInfos = adaptationSwitchingInfos[id];
            if (switchingInfos !== void 0 && switchingInfos.newID !== newID && arrayIncludes(switchingInfos.adaptationSetSwitchingIDs, originalID)) {
              mergedIntoIdx = arrayFindIndex(parsedAdaptations[type], (a) => a[0].id === id);
              const mergedInto = parsedAdaptations[type][mergedIntoIdx];
              if (mergedInto !== void 0 && mergedInto[0].audioDescription === parsedAdaptationSet.audioDescription && mergedInto[0].closedCaption === parsedAdaptationSet.closedCaption && mergedInto[0].language === parsedAdaptationSet.language) {
                log_default.info('DASH Parser: merging "switchable" AdaptationSets', originalID, id);
                mergedInto[0].representations.push(...parsedAdaptationSet.representations);
                if (type === "video" && isMainAdaptation && !mergedInto[1].isMainAdaptation) {
                  lastMainVideoAdapIdx = Math.max(lastMainVideoAdapIdx, mergedIntoIdx);
                }
                mergedInto[1] = {
                  priority: Math.max(priority, mergedInto[1].priority),
                  isMainAdaptation: isMainAdaptation || mergedInto[1].isMainAdaptation,
                  indexInMpd: Math.min(adaptationIdx, mergedInto[1].indexInMpd)
                };
              }
            }
          }
          if (mergedIntoIdx < 0) {
            parsedAdaptations[type].push([
              parsedAdaptationSet,
              {
                priority,
                isMainAdaptation,
                indexInMpd: adaptationIdx
              }
            ]);
            if (type === "video" && isMainAdaptation) {
              lastMainVideoAdapIdx = parsedAdaptations.video.length - 1;
            }
          }
        }
      }
      if (originalID != null && adaptationSwitchingInfos[originalID] == null) {
        adaptationSwitchingInfos[originalID] = {
          newID,
          adaptationSetSwitchingIDs
        };
      }
    }
    const adaptationsPerType = SUPPORTED_ADAPTATIONS_TYPE.reduce((acc, adaptationType) => {
      const adaptationsParsedForType = parsedAdaptations[adaptationType];
      if (adaptationsParsedForType.length > 0) {
        adaptationsParsedForType.sort(compareAdaptations);
        acc[adaptationType] = adaptationsParsedForType.map(([parsedAdaptation]) => parsedAdaptation);
      }
      return acc;
    }, {});
    parsedAdaptations.video.sort(compareAdaptations);
    attach_trickmode_track_default(adaptationsPerType, trickModeAdaptations);
    return adaptationsPerType;
  }
  function compareAdaptations(a, b) {
    const priorityDiff = b[1].priority - a[1].priority;
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    if (a[1].isMainAdaptation !== b[1].isMainAdaptation) {
      return a[1].isMainAdaptation ? -1 : 1;
    }
    return a[1].indexInMpd - b[1].indexInMpd;
  }

  // src/worker/parsers/manifest/dash/common/parse_periods.ts
  var generatePeriodID = idGenerator();
  function parsePeriods(periodsIR, context2) {
    const parsedPeriods = [];
    const periodsTimeInformation = getPeriodsTimeInformation(periodsIR, context2);
    if (periodsTimeInformation.length !== periodsIR.length) {
      throw new Error("MPD parsing error: the time information are incoherent.");
    }
    const {
      isDynamic,
      timeShiftBufferDepth
    } = context2;
    const manifestBoundsCalculator = new ManifestBoundsCalculator({
      isDynamic,
      timeShiftBufferDepth
    });
    if (!isDynamic && context2.duration != null) {
      manifestBoundsCalculator.setLastPosition(context2.duration);
    }
    for (let i = periodsIR.length - 1; i >= 0; i--) {
      const isLastPeriod = i === periodsIR.length - 1;
      const periodIR = periodsIR[i];
      const xlinkInfos = context2.xlinkInfos.get(periodIR);
      const periodBaseURLs = resolveBaseURLs(context2.baseURLs, periodIR.children.baseURLs);
      const {
        periodStart,
        periodDuration,
        periodEnd
      } = periodsTimeInformation[i];
      let periodID;
      if (periodIR.attributes.id == null) {
        log_default.warn("DASH: No usable id found in the Period. Generating one.");
        periodID = "gen-dash-period-" + generatePeriodID();
      } else {
        periodID = periodIR.attributes.id;
      }
      while (parsedPeriods.some((p) => p.id === periodID)) {
        periodID += "-dup";
      }
      const receivedTime = xlinkInfos !== void 0 ? xlinkInfos.receivedTime : context2.receivedTime;
      const unsafelyBaseOnPreviousPeriod = context2.unsafelyBaseOnPreviousManifest?.getPeriod(periodID) ?? null;
      const availabilityTimeComplete = periodIR.attributes.availabilityTimeComplete ?? true;
      const availabilityTimeOffset = periodIR.attributes.availabilityTimeOffset ?? 0;
      const { aggressiveMode, manifestProfiles } = context2;
      const { segmentTemplate } = periodIR.children;
      const adapCtxt = {
        aggressiveMode,
        availabilityTimeComplete,
        availabilityTimeOffset,
        baseURLs: periodBaseURLs,
        manifestBoundsCalculator,
        end: periodEnd,
        isDynamic,
        isLastPeriod,
        manifestProfiles,
        receivedTime,
        segmentTemplate,
        start: periodStart,
        timeShiftBufferDepth,
        unsafelyBaseOnPreviousPeriod
      };
      const adaptations = parseAdaptationSets(periodIR.children.adaptations, adapCtxt);
      const namespaces = (context2.xmlNamespaces ?? []).concat(periodIR.attributes.namespaces ?? []);
      const streamEvents = generateStreamEvents(periodIR.children.eventStreams, periodStart, namespaces);
      const parsedPeriod = {
        id: periodID,
        start: periodStart,
        end: periodEnd,
        duration: periodDuration,
        adaptations,
        streamEvents
      };
      parsedPeriods.unshift(parsedPeriod);
      if (!manifestBoundsCalculator.lastPositionIsKnown()) {
        const lastPosition = getMaximumLastPosition(adaptations);
        if (!isDynamic) {
          if (typeof lastPosition === "number") {
            manifestBoundsCalculator.setLastPosition(lastPosition);
          }
        } else {
          if (typeof lastPosition === "number") {
            const positionTime = performance.now() / 1e3;
            manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
          } else {
            const guessedLastPositionFromClock = guessLastPositionFromClock(context2, periodStart);
            if (guessedLastPositionFromClock !== void 0) {
              const [guessedLastPosition, guessedPositionTime] = guessedLastPositionFromClock;
              manifestBoundsCalculator.setLastPosition(guessedLastPosition, guessedPositionTime);
            }
          }
        }
      }
    }
    if (context2.isDynamic && !manifestBoundsCalculator.lastPositionIsKnown()) {
      const guessedLastPositionFromClock = guessLastPositionFromClock(context2, 0);
      if (guessedLastPositionFromClock !== void 0) {
        const [lastPosition, positionTime] = guessedLastPositionFromClock;
        manifestBoundsCalculator.setLastPosition(lastPosition, positionTime);
      }
    }
    return flattenOverlappingPeriods(parsedPeriods);
  }
  function guessLastPositionFromClock(context2, minimumTime) {
    if (context2.clockOffset != null) {
      const lastPosition = context2.clockOffset / 1e3 - context2.availabilityStartTime;
      const positionTime = performance.now() / 1e3;
      const timeInSec = positionTime + lastPosition;
      if (timeInSec >= minimumTime) {
        return [timeInSec, positionTime];
      }
    } else {
      const now = Date.now() / 1e3;
      if (now >= minimumTime) {
        log_default.warn("DASH Parser: no clock synchronization mechanism found. Using the system clock instead.");
        const lastPosition = now - context2.availabilityStartTime;
        const positionTime = performance.now() / 1e3;
        return [lastPosition, positionTime];
      }
    }
    return void 0;
  }
  function getMaximumLastPosition(adaptationsPerType) {
    let maxEncounteredPosition = null;
    let allIndexAreEmpty = true;
    const adaptationsVal = object_values_default(adaptationsPerType).filter((ada) => ada != null);
    const allAdaptations = flatMap(adaptationsVal, (adaptationsForType) => adaptationsForType);
    for (const adaptation of allAdaptations) {
      const representations = adaptation.representations;
      for (const representation of representations) {
        const position = representation.index.getLastPosition();
        if (position !== null) {
          allIndexAreEmpty = false;
          if (typeof position === "number") {
            maxEncounteredPosition = maxEncounteredPosition == null ? position : Math.max(maxEncounteredPosition, position);
          }
        }
      }
    }
    if (maxEncounteredPosition != null) {
      return maxEncounteredPosition;
    } else if (allIndexAreEmpty) {
      return null;
    }
    return void 0;
  }
  function generateStreamEvents(baseIr, periodStart, xmlNamespaces) {
    const res = [];
    for (const eventStreamIr of baseIr) {
      const {
        schemeIdUri = "",
        timescale = 1
      } = eventStreamIr.attributes;
      const allNamespaces = xmlNamespaces.concat(eventStreamIr.attributes.namespaces ?? []);
      for (const eventIr of eventStreamIr.children.events) {
        if (eventIr.eventStreamData !== void 0) {
          const start = (eventIr.presentationTime ?? 0) / timescale + periodStart;
          const end = eventIr.duration === void 0 ? void 0 : start + eventIr.duration / timescale;
          let element;
          if (eventIr.eventStreamData instanceof Element) {
            element = eventIr.eventStreamData;
          } else {
            let parentNode = allNamespaces.reduce((acc, ns) => {
              return acc + "xmlns:" + ns.key + '="' + ns.value + '" ';
            }, "<toremove ");
            parentNode += ">";
            const elementToString = utf8ToStr(new Uint8Array(eventIr.eventStreamData));
            element = new DOMParser().parseFromString(parentNode + elementToString + "</toremove>", "application/xml").documentElement.childNodes[0];
          }
          res.push({
            start,
            end,
            id: eventIr.id,
            data: {
              type: "dash-event-stream",
              value: {
                schemeIdUri,
                timescale,
                element
              }
            }
          });
        }
      }
    }
    return res;
  }

  // src/worker/parsers/manifest/dash/common/parse_mpd.ts
  function parseMpdIr(mpdIR, args, warnings, hasLoadedClock, xlinkInfos = /* @__PURE__ */ new WeakMap()) {
    const {
      children: rootChildren,
      attributes: rootAttributes
    } = mpdIR;
    if (args.externalClockOffset == null) {
      const isDynamic = rootAttributes.type === "dynamic";
      const directTiming = arrayFind(rootChildren.utcTimings, (utcTiming) => {
        return utcTiming.schemeIdUri === "urn:mpeg:dash:utc:direct:2014" && utcTiming.value != null;
      });
      const clockOffsetFromDirectUTCTiming = directTiming != null && directTiming.value != null ? getClockOffset(directTiming.value) : void 0;
      const clockOffset = clockOffsetFromDirectUTCTiming != null && !isNaN(clockOffsetFromDirectUTCTiming) ? clockOffsetFromDirectUTCTiming : void 0;
      if (clockOffset != null && hasLoadedClock !== true) {
        args.externalClockOffset = clockOffset;
      } else if (isDynamic && hasLoadedClock !== true) {
        const UTCTimingHTTPURL = getHTTPUTCTimingURL(mpdIR);
        if (UTCTimingHTTPURL != null && UTCTimingHTTPURL.length > 0) {
          return {
            type: "needs-clock",
            value: {
              url: UTCTimingHTTPURL,
              continue: function continueParsingMPD(responseDataClock) {
                if (!responseDataClock.success) {
                  warnings.push(responseDataClock.error);
                  log_default.warn("DASH Parser: Error on fetching the clock ressource", responseDataClock.error);
                  return parseMpdIr(mpdIR, args, warnings, true);
                }
                args.externalClockOffset = getClockOffset(responseDataClock.data);
                return parseMpdIr(mpdIR, args, warnings, true);
              }
            }
          };
        }
      }
    }
    const xlinksToLoad = [];
    for (let i = 0; i < rootChildren.periods.length; i++) {
      const { xlinkHref, xlinkActuate } = rootChildren.periods[i].attributes;
      if (xlinkHref != null && xlinkActuate === "onLoad") {
        xlinksToLoad.push({ index: i, ressource: xlinkHref });
      }
    }
    if (xlinksToLoad.length === 0) {
      return parseCompleteIntermediateRepresentation(mpdIR, args, warnings, xlinkInfos);
    }
    return {
      type: "needs-xlinks",
      value: {
        xlinksUrls: xlinksToLoad.map(({ ressource }) => ressource),
        continue: function continueParsingMPD(loadedRessources) {
          if (loadedRessources.length !== xlinksToLoad.length) {
            throw new Error("DASH parser: wrong number of loaded ressources.");
          }
          for (let i = loadedRessources.length - 1; i >= 0; i--) {
            const index = xlinksToLoad[i].index;
            const {
              parsed: periodsIR,
              warnings: parsingWarnings,
              receivedTime,
              sendingTime,
              url
            } = loadedRessources[i];
            if (parsingWarnings.length > 0) {
              warnings.push(...parsingWarnings);
            }
            for (const periodIR of periodsIR) {
              xlinkInfos.set(periodIR, { receivedTime, sendingTime, url });
            }
            rootChildren.periods.splice(index, 1, ...periodsIR);
          }
          return parseMpdIr(mpdIR, args, warnings, hasLoadedClock, xlinkInfos);
        }
      }
    };
  }
  function parseCompleteIntermediateRepresentation(mpdIR, args, warnings, xlinkInfos) {
    const {
      children: rootChildren,
      attributes: rootAttributes
    } = mpdIR;
    const isDynamic = rootAttributes.type === "dynamic";
    const initialBaseUrl = args.url !== void 0 ? [{
      url: normalizeBaseURL(args.url),
      availabilityTimeOffset: 0,
      availabilityTimeComplete: true
    }] : [];
    const mpdBaseUrls = resolveBaseURLs(initialBaseUrl, rootChildren.baseURLs);
    const availabilityStartTime = parseAvailabilityStartTime(rootAttributes, args.referenceDateTime);
    const timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
    const {
      externalClockOffset: clockOffset,
      unsafelyBaseOnPreviousManifest
    } = args;
    const manifestInfos = {
      aggressiveMode: args.aggressiveMode,
      availabilityStartTime,
      baseURLs: mpdBaseUrls,
      clockOffset,
      duration: rootAttributes.duration,
      isDynamic,
      manifestProfiles: mpdIR.attributes.profiles,
      receivedTime: args.manifestReceivedTime,
      timeShiftBufferDepth,
      unsafelyBaseOnPreviousManifest,
      xlinkInfos,
      xmlNamespaces: mpdIR.attributes.namespaces
    };
    const parsedPeriods = parsePeriods(rootChildren.periods, manifestInfos);
    const mediaPresentationDuration = rootAttributes.duration;
    let lifetime;
    let minimumTime;
    let timeshiftDepth = null;
    let maximumTimeData;
    if (rootAttributes.minimumUpdatePeriod !== void 0 && rootAttributes.minimumUpdatePeriod >= 0) {
      lifetime = rootAttributes.minimumUpdatePeriod === 0 ? config_default.getCurrent().DASH_FALLBACK_LIFETIME_WHEN_MINIMUM_UPDATE_PERIOD_EQUAL_0 : rootAttributes.minimumUpdatePeriod;
    }
    const {
      minimumSafePosition,
      maximumSafePosition,
      maximumUnsafePosition
    } = getMinimumAndMaximumPositions(parsedPeriods);
    const now = performance.now();
    if (!isDynamic) {
      minimumTime = minimumSafePosition !== void 0 ? minimumSafePosition : parsedPeriods[0]?.start !== void 0 ? parsedPeriods[0].start : 0;
      let finalMaximumSafePosition = mediaPresentationDuration ?? Infinity;
      if (parsedPeriods[parsedPeriods.length - 1] !== void 0) {
        const lastPeriod = parsedPeriods[parsedPeriods.length - 1];
        const lastPeriodEnd = lastPeriod.end ?? (lastPeriod.duration !== void 0 ? lastPeriod.start + lastPeriod.duration : void 0);
        if (lastPeriodEnd !== void 0 && lastPeriodEnd < finalMaximumSafePosition) {
          finalMaximumSafePosition = lastPeriodEnd;
        }
      }
      if (maximumSafePosition !== void 0 && maximumSafePosition < finalMaximumSafePosition) {
        finalMaximumSafePosition = maximumSafePosition;
      }
      maximumTimeData = {
        isLinear: false,
        maximumSafePosition: finalMaximumSafePosition,
        livePosition: void 0,
        time: now
      };
    } else {
      minimumTime = minimumSafePosition;
      timeshiftDepth = timeShiftBufferDepth ?? null;
      let finalMaximumSafePosition;
      let livePosition;
      if (maximumUnsafePosition !== void 0) {
        livePosition = maximumUnsafePosition;
      }
      if (maximumSafePosition !== void 0) {
        finalMaximumSafePosition = maximumSafePosition;
      } else {
        const ast = availabilityStartTime ?? 0;
        const { externalClockOffset } = args;
        if (externalClockOffset === void 0) {
          log_default.warn("DASH Parser: use system clock to define maximum position");
          finalMaximumSafePosition = Date.now() / 1e3 - ast;
        } else {
          const serverTime = performance.now() + externalClockOffset;
          finalMaximumSafePosition = serverTime / 1e3 - ast;
        }
      }
      if (livePosition === void 0) {
        livePosition = finalMaximumSafePosition;
      }
      maximumTimeData = {
        isLinear: true,
        maximumSafePosition: finalMaximumSafePosition,
        livePosition,
        time: now
      };
      if (timeshiftDepth !== null && minimumTime !== void 0 && finalMaximumSafePosition - minimumTime > timeshiftDepth) {
        timeshiftDepth = finalMaximumSafePosition - minimumTime;
      }
    }
    const isLastPeriodKnown = !isDynamic || mpdIR.attributes.minimumUpdatePeriod === void 0 && (parsedPeriods[parsedPeriods.length - 1]?.end !== void 0 || mpdIR.attributes.duration !== void 0);
    const parsedMPD = {
      availabilityStartTime,
      clockOffset: args.externalClockOffset,
      isDynamic,
      isLive: isDynamic,
      isLastPeriodKnown,
      periods: parsedPeriods,
      publishTime: rootAttributes.publishTime,
      suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay,
      transportType: "dash",
      timeBounds: {
        minimumSafePosition: minimumTime,
        timeshiftDepth,
        maximumTimeData
      },
      lifetime,
      uris: args.url == null ? rootChildren.locations : [args.url, ...rootChildren.locations]
    };
    return { type: "done", value: { parsed: parsedMPD, warnings } };
  }

  // src/worker/parsers/manifest/dash/common/index.ts
  var common_default = parseMpdIr;

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/index.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/root.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/MPD.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/wasm-parser/ts/utils.ts
  init_define_ENVIRONMENT();
  function parseString(textDecoder, buffer, ptr, len) {
    const arr = new Uint8Array(buffer, ptr, len);
    return textDecoder.decode(arr);
  }
  function parseFloatOrBool(val) {
    return val === Infinity ? true : val === -Infinity ? false : val;
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/BaseURL.ts
  init_define_ENVIRONMENT();
  function generateBaseUrlAttrParser(baseUrlAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    let dataView;
    return function onMPDAttribute(attr, ptr, len) {
      switch (attr) {
        case 64 /* Text */:
          baseUrlAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 43 /* AvailabilityTimeOffset */: {
          dataView = new DataView(linearMemory.buffer);
          baseUrlAttrs.attributes.availabilityTimeOffset = dataView.getFloat64(ptr, true);
          break;
        }
        case 22 /* AvailabilityTimeComplete */: {
          baseUrlAttrs.attributes.availabilityTimeComplete = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/Period.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/AdaptationSet.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/ContentComponent.ts
  init_define_ENVIRONMENT();
  function generateContentComponentAttrParser(ccAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
      switch (attr) {
        case 0 /* Id */:
          ccAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 60 /* Language */:
          ccAttrs.language = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 61 /* ContentType */:
          ccAttrs.contentType = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 62 /* Par */:
          ccAttrs.par = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/ContentProtection.ts
  init_define_ENVIRONMENT();

  // src/common/utils/base64.ts
  init_define_ENVIRONMENT();
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

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/ContentProtection.ts
  function generateContentProtectionAttrParser(cp, linearMemory) {
    const cpAttrs = cp.attributes;
    const cpChildren = cp.children;
    const textDecoder = new TextDecoder();
    return function onContentProtectionAttribute(attr, ptr, len) {
      switch (attr) {
        case 16 /* SchemeIdUri */:
          cpAttrs.schemeIdUri = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 13 /* ContentProtectionValue */:
          cpAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 14 /* ContentProtectionKeyId */:
          const kid = parseString(textDecoder, linearMemory.buffer, ptr, len);
          cpAttrs.keyId = hexToBytes(kid.replace(/-/g, ""));
          break;
        case 15 /* ContentProtectionCencPSSH */:
          try {
            const b64 = parseString(textDecoder, linearMemory.buffer, ptr, len);
            cpChildren.cencPssh.push(base64ToBytes(b64));
          } catch (_) {
          }
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/Representation.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/Scheme.ts
  init_define_ENVIRONMENT();
  function generateSchemeAttrParser(schemeAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
      switch (attr) {
        case 16 /* SchemeIdUri */:
          schemeAttrs.schemeIdUri = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 17 /* SchemeValue */:
          schemeAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/SegmentBase.ts
  init_define_ENVIRONMENT();
  function generateSegmentBaseAttrParser(segmentBaseAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onSegmentBaseAttribute(attr, ptr, len) {
      switch (attr) {
        case 29 /* InitializationRange */: {
          const dataView = new DataView(linearMemory.buffer);
          if (segmentBaseAttrs.initialization === void 0) {
            segmentBaseAttrs.initialization = {};
          }
          segmentBaseAttrs.initialization.range = [
            dataView.getFloat64(ptr, true),
            dataView.getFloat64(ptr + 8, true)
          ];
          break;
        }
        case 67 /* InitializationMedia */:
          if (segmentBaseAttrs.initialization === void 0) {
            segmentBaseAttrs.initialization = {};
          }
          segmentBaseAttrs.initialization.media = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 43 /* AvailabilityTimeOffset */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
          break;
        }
        case 22 /* AvailabilityTimeComplete */: {
          segmentBaseAttrs.availabilityTimeComplete = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
        case 24 /* PresentationTimeOffset */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.presentationTimeOffset = dataView.getFloat64(ptr, true);
          break;
        }
        case 27 /* TimeScale */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.timescale = dataView.getFloat64(ptr, true);
          break;
        }
        case 31 /* IndexRange */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.indexRange = [
            dataView.getFloat64(ptr, true),
            dataView.getFloat64(ptr + 8, true)
          ];
          break;
        }
        case 23 /* IndexRangeExact */: {
          segmentBaseAttrs.indexRangeExact = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
        case 1 /* Duration */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.duration = dataView.getFloat64(ptr, true);
          break;
        }
        case 20 /* StartNumber */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentBaseAttrs.startNumber = dataView.getFloat64(ptr, true);
          break;
        }
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/SegmentList.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/SegmentUrl.ts
  init_define_ENVIRONMENT();
  function generateSegmentUrlAttrParser(segmentUrlAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onSegmentUrlAttribute(attr, ptr, len) {
      switch (attr) {
        case 28 /* Index */:
          segmentUrlAttrs.index = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 31 /* IndexRange */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentUrlAttrs.indexRange = [
            dataView.getFloat64(ptr, true),
            dataView.getFloat64(ptr + 8, true)
          ];
          break;
        }
        case 30 /* Media */:
          segmentUrlAttrs.media = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 18 /* MediaRange */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentUrlAttrs.mediaRange = [
            dataView.getFloat64(ptr, true),
            dataView.getFloat64(ptr + 8, true)
          ];
          break;
        }
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/SegmentList.ts
  function generateSegmentListChildrenParser(segListChildren, linearMemory, parsersStack) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 20 /* SegmentUrl */: {
          const segmentObj = {};
          if (segListChildren.list === void 0) {
            segListChildren.list = [];
          }
          segListChildren.list.push(segmentObj);
          const attrParser = generateSegmentUrlAttrParser(segmentObj, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, attrParser);
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/SegmentTemplate.ts
  init_define_ENVIRONMENT();
  function generateSegmentTemplateAttrParser(segmentTemplateAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onSegmentTemplateAttribute(attr, ptr, len) {
      switch (attr) {
        case 19 /* SegmentTimeline */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.timeline = [];
          let base = ptr;
          for (let i = 0; i < len / 24; i++) {
            segmentTemplateAttrs.timeline.push({
              start: dataView.getFloat64(base, true),
              duration: dataView.getFloat64(base + 8, true),
              repeatCount: dataView.getFloat64(base + 16, true)
            });
            base += 24;
          }
          break;
        }
        case 67 /* InitializationMedia */:
          segmentTemplateAttrs.initialization = { media: parseString(textDecoder, linearMemory.buffer, ptr, len) };
          break;
        case 28 /* Index */:
          segmentTemplateAttrs.index = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 43 /* AvailabilityTimeOffset */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
          break;
        }
        case 22 /* AvailabilityTimeComplete */: {
          segmentTemplateAttrs.availabilityTimeComplete = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
        case 24 /* PresentationTimeOffset */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.presentationTimeOffset = dataView.getFloat64(ptr, true);
          break;
        }
        case 27 /* TimeScale */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.timescale = dataView.getFloat64(ptr, true);
          break;
        }
        case 31 /* IndexRange */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.indexRange = [
            dataView.getFloat64(ptr, true),
            dataView.getFloat64(ptr + 8, true)
          ];
          break;
        }
        case 23 /* IndexRangeExact */: {
          segmentTemplateAttrs.indexRangeExact = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
        case 30 /* Media */:
          segmentTemplateAttrs.media = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 32 /* BitstreamSwitching */: {
          segmentTemplateAttrs.bitstreamSwitching = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        }
        case 1 /* Duration */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.duration = dataView.getFloat64(ptr, true);
          break;
        }
        case 20 /* StartNumber */: {
          const dataView = new DataView(linearMemory.buffer);
          segmentTemplateAttrs.startNumber = dataView.getFloat64(ptr, true);
          break;
        }
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/Representation.ts
  function generateRepresentationChildrenParser(childrenObj, linearMemory, parsersStack) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 15 /* BaseURL */: {
          const baseUrl = { value: "", attributes: {} };
          childrenObj.baseURLs.push(baseUrl);
          parsersStack.pushParsers(nodeId, noop_default, generateBaseUrlAttrParser(baseUrl, linearMemory));
          break;
        }
        case 10 /* ContentProtection */: {
          const contentProtection = {
            children: { cencPssh: [] },
            attributes: {}
          };
          if (childrenObj.contentProtections === void 0) {
            childrenObj.contentProtections = [];
          }
          childrenObj.contentProtections.push(contentProtection);
          const contentProtAttrParser = generateContentProtectionAttrParser(contentProtection, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, contentProtAttrParser);
          break;
        }
        case 19 /* InbandEventStream */: {
          const inbandEvent = {};
          if (childrenObj.inbandEventStreams === void 0) {
            childrenObj.inbandEventStreams = [];
          }
          childrenObj.inbandEventStreams.push(inbandEvent);
          parsersStack.pushParsers(nodeId, noop_default, generateSchemeAttrParser(inbandEvent, linearMemory));
          break;
        }
        case 17 /* SegmentBase */: {
          const segmentBaseObj = {};
          childrenObj.segmentBase = segmentBaseObj;
          const attributeParser = generateSegmentBaseAttrParser(segmentBaseObj, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 18 /* SegmentList */: {
          const segmentListObj = { list: [] };
          childrenObj.segmentList = segmentListObj;
          const childrenParser = generateSegmentListChildrenParser(segmentListObj, linearMemory, parsersStack);
          const attributeParser = generateSegmentBaseAttrParser(segmentListObj, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 16 /* SegmentTemplate */: {
          const stObj = {};
          childrenObj.segmentTemplate = stObj;
          parsersStack.pushParsers(nodeId, noop_default, generateSegmentTemplateAttrParser(stObj, linearMemory));
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }
  function generateRepresentationAttrParser(representationAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onRepresentationAttribute(attr, ptr, len) {
      const dataView = new DataView(linearMemory.buffer);
      switch (attr) {
        case 0 /* Id */:
          representationAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 3 /* AudioSamplingRate */:
          representationAttrs.audioSamplingRate = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 63 /* Bitrate */:
          representationAttrs.bitrate = dataView.getFloat64(ptr, true);
          break;
        case 4 /* Codecs */:
          representationAttrs.codecs = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 5 /* CodingDependency */:
          representationAttrs.codingDependency = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        case 6 /* FrameRate */:
          representationAttrs.frameRate = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 7 /* Height */:
          representationAttrs.height = dataView.getFloat64(ptr, true);
          break;
        case 8 /* Width */:
          representationAttrs.width = dataView.getFloat64(ptr, true);
          break;
        case 9 /* MaxPlayoutRate */:
          representationAttrs.maxPlayoutRate = dataView.getFloat64(ptr, true);
          break;
        case 10 /* MaxSAPPeriod */:
          representationAttrs.maximumSAPPeriod = dataView.getFloat64(ptr, true);
          break;
        case 11 /* MimeType */:
          representationAttrs.mimeType = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 2 /* Profiles */:
          representationAttrs.profiles = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 65 /* QualityRanking */:
          representationAttrs.qualityRanking = dataView.getFloat64(ptr, true);
          break;
        case 12 /* SegmentProfiles */:
          representationAttrs.segmentProfiles = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 43 /* AvailabilityTimeOffset */:
          representationAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
          break;
        case 22 /* AvailabilityTimeComplete */:
          representationAttrs.availabilityTimeComplete = dataView.getUint8(0) === 0;
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/AdaptationSet.ts
  function generateAdaptationSetChildrenParser(adaptationSetChildren, linearMemory, parsersStack) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 8 /* Accessibility */: {
          const accessibility = {};
          if (adaptationSetChildren.accessibilities === void 0) {
            adaptationSetChildren.accessibilities = [];
          }
          adaptationSetChildren.accessibilities.push(accessibility);
          const schemeAttrParser = generateSchemeAttrParser(accessibility, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, schemeAttrParser);
          break;
        }
        case 15 /* BaseURL */: {
          const baseUrl = { value: "", attributes: {} };
          adaptationSetChildren.baseURLs.push(baseUrl);
          const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 9 /* ContentComponent */: {
          const contentComponent = {};
          adaptationSetChildren.contentComponent = contentComponent;
          parsersStack.pushParsers(nodeId, noop_default, generateContentComponentAttrParser(contentComponent, linearMemory));
          break;
        }
        case 10 /* ContentProtection */: {
          const contentProtection = {
            children: { cencPssh: [] },
            attributes: {}
          };
          if (adaptationSetChildren.contentProtections === void 0) {
            adaptationSetChildren.contentProtections = [];
          }
          adaptationSetChildren.contentProtections.push(contentProtection);
          const contentProtAttrParser = generateContentProtectionAttrParser(contentProtection, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, contentProtAttrParser);
          break;
        }
        case 11 /* EssentialProperty */: {
          const essentialProperty = {};
          if (adaptationSetChildren.essentialProperties === void 0) {
            adaptationSetChildren.essentialProperties = [];
          }
          adaptationSetChildren.essentialProperties.push(essentialProperty);
          const childrenParser = noop_default;
          const attributeParser = generateSchemeAttrParser(essentialProperty, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 19 /* InbandEventStream */: {
          const inbandEvent = {};
          if (adaptationSetChildren.inbandEventStreams === void 0) {
            adaptationSetChildren.inbandEventStreams = [];
          }
          adaptationSetChildren.inbandEventStreams.push(inbandEvent);
          const childrenParser = noop_default;
          const attributeParser = generateSchemeAttrParser(inbandEvent, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 7 /* Representation */: {
          const representationObj = {
            children: { baseURLs: [] },
            attributes: {}
          };
          adaptationSetChildren.representations.push(representationObj);
          const childrenParser = generateRepresentationChildrenParser(representationObj.children, linearMemory, parsersStack);
          const attributeParser = generateRepresentationAttrParser(representationObj.attributes, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 12 /* Role */: {
          const role = {};
          if (adaptationSetChildren.roles === void 0) {
            adaptationSetChildren.roles = [];
          }
          adaptationSetChildren.roles.push(role);
          const attributeParser = generateSchemeAttrParser(role, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 13 /* SupplementalProperty */: {
          const supplementalProperty = {};
          if (adaptationSetChildren.supplementalProperties === void 0) {
            adaptationSetChildren.supplementalProperties = [];
          }
          adaptationSetChildren.supplementalProperties.push(supplementalProperty);
          const attributeParser = generateSchemeAttrParser(supplementalProperty, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 17 /* SegmentBase */: {
          const segmentBaseObj = {};
          adaptationSetChildren.segmentBase = segmentBaseObj;
          const attributeParser = generateSegmentBaseAttrParser(segmentBaseObj, linearMemory);
          parsersStack.pushParsers(nodeId, noop_default, attributeParser);
          break;
        }
        case 18 /* SegmentList */: {
          const segmentListObj = { list: [] };
          adaptationSetChildren.segmentList = segmentListObj;
          const childrenParser = generateSegmentListChildrenParser(segmentListObj, linearMemory, parsersStack);
          const attributeParser = generateSegmentBaseAttrParser(segmentListObj, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 16 /* SegmentTemplate */: {
          const stObj = {};
          adaptationSetChildren.segmentTemplate = stObj;
          parsersStack.pushParsers(nodeId, noop_default, generateSegmentTemplateAttrParser(stObj, linearMemory));
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }
  function generateAdaptationSetAttrParser(adaptationAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onAdaptationSetAttribute(attr, ptr, len) {
      const dataView = new DataView(linearMemory.buffer);
      switch (attr) {
        case 0 /* Id */:
          adaptationAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 48 /* Group */:
          adaptationAttrs.group = dataView.getFloat64(ptr, true);
          break;
        case 60 /* Language */:
          adaptationAttrs.language = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 61 /* ContentType */:
          adaptationAttrs.contentType = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 62 /* Par */:
          adaptationAttrs.par = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 53 /* MinBandwidth */:
          adaptationAttrs.minBitrate = dataView.getFloat64(ptr, true);
          break;
        case 49 /* MaxBandwidth */:
          adaptationAttrs.maxBitrate = dataView.getFloat64(ptr, true);
          break;
        case 56 /* MinWidth */:
          adaptationAttrs.minWidth = dataView.getFloat64(ptr, true);
          break;
        case 52 /* MaxWidth */:
          adaptationAttrs.maxWidth = dataView.getFloat64(ptr, true);
          break;
        case 55 /* MinHeight */:
          adaptationAttrs.minHeight = dataView.getFloat64(ptr, true);
          break;
        case 51 /* MaxHeight */:
          adaptationAttrs.maxHeight = dataView.getFloat64(ptr, true);
          break;
        case 54 /* MinFrameRate */:
          adaptationAttrs.minFrameRate = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 50 /* MaxFrameRate */:
          adaptationAttrs.maxFrameRate = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 57 /* SelectionPriority */:
          adaptationAttrs.selectionPriority = dataView.getFloat64(ptr, true);
          break;
        case 58 /* SegmentAlignment */:
          adaptationAttrs.segmentAlignment = parseFloatOrBool(dataView.getFloat64(ptr, true));
          break;
        case 59 /* SubsegmentAlignment */:
          adaptationAttrs.subsegmentAlignment = parseFloatOrBool(dataView.getFloat64(ptr, true));
          break;
        case 32 /* BitstreamSwitching */:
          adaptationAttrs.bitstreamSwitching = dataView.getFloat64(ptr, true) !== 0;
          break;
        case 3 /* AudioSamplingRate */:
          adaptationAttrs.audioSamplingRate = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 4 /* Codecs */:
          adaptationAttrs.codecs = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 2 /* Profiles */:
          adaptationAttrs.profiles = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 12 /* SegmentProfiles */:
          adaptationAttrs.segmentProfiles = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 11 /* MimeType */:
          adaptationAttrs.mimeType = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 5 /* CodingDependency */:
          adaptationAttrs.codingDependency = dataView.getFloat64(ptr, true) !== 0;
          break;
        case 6 /* FrameRate */:
          adaptationAttrs.frameRate = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 7 /* Height */:
          adaptationAttrs.height = dataView.getFloat64(ptr, true);
          break;
        case 8 /* Width */:
          adaptationAttrs.width = dataView.getFloat64(ptr, true);
          break;
        case 9 /* MaxPlayoutRate */:
          adaptationAttrs.maxPlayoutRate = dataView.getFloat64(ptr, true);
          break;
        case 10 /* MaxSAPPeriod */:
          adaptationAttrs.maximumSAPPeriod = dataView.getFloat64(ptr, true);
          break;
        case 43 /* AvailabilityTimeOffset */:
          adaptationAttrs.availabilityTimeOffset = dataView.getFloat64(ptr, true);
          break;
        case 22 /* AvailabilityTimeComplete */:
          adaptationAttrs.availabilityTimeComplete = dataView.getUint8(0) === 0;
          break;
        case 71 /* Label */:
          const label = parseString(textDecoder, linearMemory.buffer, ptr, len);
          adaptationAttrs.label = label;
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/EventStream.ts
  init_define_ENVIRONMENT();
  function generateEventStreamChildrenParser(childrenObj, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 6 /* EventStreamElt */: {
          const event = {};
          childrenObj.events.push(event);
          const attrParser = generateEventAttrParser(event, linearMemory, fullMpd);
          parsersStack.pushParsers(nodeId, noop_default, attrParser);
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }
  function generateEventStreamAttrParser(esAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onEventStreamAttribute(attr, ptr, len) {
      const dataView = new DataView(linearMemory.buffer);
      switch (attr) {
        case 16 /* SchemeIdUri */:
          esAttrs.schemeIdUri = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 17 /* SchemeValue */:
          esAttrs.value = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 27 /* TimeScale */:
          esAttrs.timescale = dataView.getFloat64(ptr, true);
          break;
        case 70 /* Namespace */:
          const xmlNs = { key: "", value: "" };
          let offset = ptr;
          const keySize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.key = parseString(textDecoder, linearMemory.buffer, offset, keySize);
          offset += keySize;
          const valSize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.value = parseString(textDecoder, linearMemory.buffer, offset, valSize);
          if (esAttrs.namespaces === void 0) {
            esAttrs.namespaces = [xmlNs];
          } else {
            esAttrs.namespaces.push(xmlNs);
          }
          break;
      }
    };
  }
  function generateEventAttrParser(eventAttr, linearMemory, fullMpd) {
    const textDecoder = new TextDecoder();
    return function onEventStreamAttribute(attr, ptr, len) {
      const dataView = new DataView(linearMemory.buffer);
      switch (attr) {
        case 25 /* EventPresentationTime */:
          eventAttr.presentationTime = dataView.getFloat64(ptr, true);
          break;
        case 1 /* Duration */:
          eventAttr.duration = dataView.getFloat64(ptr, true);
          break;
        case 0 /* Id */:
          eventAttr.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 69 /* EventStreamEltRange */:
          const rangeStart = dataView.getFloat64(ptr, true);
          const rangeEnd = dataView.getFloat64(ptr + 8, true);
          eventAttr.eventStreamData = fullMpd.slice(rangeStart, rangeEnd);
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/Period.ts
  function generatePeriodChildrenParser(periodChildren, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 4 /* AdaptationSet */: {
          const adaptationObj = {
            children: {
              baseURLs: [],
              representations: []
            },
            attributes: {}
          };
          periodChildren.adaptations.push(adaptationObj);
          const childrenParser = generateAdaptationSetChildrenParser(adaptationObj.children, linearMemory, parsersStack);
          const attributeParser = generateAdaptationSetAttrParser(adaptationObj.attributes, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 15 /* BaseURL */: {
          const baseUrl = { value: "", attributes: {} };
          periodChildren.baseURLs.push(baseUrl);
          const childrenParser = noop_default;
          const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 5 /* EventStream */: {
          const eventStream = { children: { events: [] }, attributes: {} };
          periodChildren.eventStreams.push(eventStream);
          const childrenParser = generateEventStreamChildrenParser(eventStream.children, linearMemory, parsersStack, fullMpd);
          const attrParser = generateEventStreamAttrParser(eventStream.attributes, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attrParser);
          break;
        }
        case 16 /* SegmentTemplate */: {
          const stObj = {};
          periodChildren.segmentTemplate = stObj;
          parsersStack.pushParsers(nodeId, noop_default, generateSegmentTemplateAttrParser(stObj, linearMemory));
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }
  function generatePeriodAttrParser(periodAttrs, linearMemory) {
    const textDecoder = new TextDecoder();
    return function onPeriodAttribute(attr, ptr, len) {
      switch (attr) {
        case 0 /* Id */:
          periodAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 45 /* Start */:
          periodAttrs.start = new DataView(linearMemory.buffer).getFloat64(ptr, true);
          break;
        case 1 /* Duration */:
          periodAttrs.duration = new DataView(linearMemory.buffer).getFloat64(ptr, true);
          break;
        case 32 /* BitstreamSwitching */:
          periodAttrs.bitstreamSwitching = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        case 46 /* XLinkHref */:
          periodAttrs.xlinkHref = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 47 /* XLinkActuate */:
          periodAttrs.xlinkActuate = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 43 /* AvailabilityTimeOffset */:
          periodAttrs.availabilityTimeOffset = new DataView(linearMemory.buffer).getFloat64(ptr, true);
          break;
        case 22 /* AvailabilityTimeComplete */:
          periodAttrs.availabilityTimeComplete = new DataView(linearMemory.buffer).getUint8(0) === 0;
          break;
        case 70 /* Namespace */:
          const xmlNs = { key: "", value: "" };
          const dataView = new DataView(linearMemory.buffer);
          let offset = ptr;
          const keySize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.key = parseString(textDecoder, linearMemory.buffer, offset, keySize);
          offset += keySize;
          const valSize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.value = parseString(textDecoder, linearMemory.buffer, offset, valSize);
          if (periodAttrs.namespaces === void 0) {
            periodAttrs.namespaces = [xmlNs];
          } else {
            periodAttrs.namespaces.push(xmlNs);
          }
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/MPD.ts
  function generateMPDChildrenParser(mpdChildren, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 15 /* BaseURL */: {
          const baseUrl = { value: "", attributes: {} };
          mpdChildren.baseURLs.push(baseUrl);
          const childrenParser = noop_default;
          const attributeParser = generateBaseUrlAttrParser(baseUrl, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 2 /* Period */: {
          const period = {
            children: {
              adaptations: [],
              baseURLs: [],
              eventStreams: []
            },
            attributes: {}
          };
          mpdChildren.periods.push(period);
          const childrenParser = generatePeriodChildrenParser(period.children, linearMemory, parsersStack, fullMpd);
          const attributeParser = generatePeriodAttrParser(period.attributes, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        case 3 /* UtcTiming */: {
          const utcTiming = {};
          mpdChildren.utcTimings.push(utcTiming);
          const childrenParser = noop_default;
          const attributeParser = generateSchemeAttrParser(utcTiming, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }
  function generateMPDAttrParser(mpdChildren, mpdAttrs, linearMemory) {
    let dataView;
    const textDecoder = new TextDecoder();
    return function onMPDAttribute(attr, ptr, len) {
      switch (attr) {
        case 0 /* Id */:
          mpdAttrs.id = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 2 /* Profiles */:
          mpdAttrs.profiles = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 33 /* Type */:
          mpdAttrs.type = parseString(textDecoder, linearMemory.buffer, ptr, len);
          break;
        case 34 /* AvailabilityStartTime */:
          const startTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
          mpdAttrs.availabilityStartTime = new Date(startTime).getTime() / 1e3;
          break;
        case 35 /* AvailabilityEndTime */:
          const endTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
          mpdAttrs.availabilityEndTime = new Date(endTime).getTime() / 1e3;
          break;
        case 36 /* PublishTime */:
          const publishTime = parseString(textDecoder, linearMemory.buffer, ptr, len);
          mpdAttrs.publishTime = new Date(publishTime).getTime() / 1e3;
          break;
        case 68 /* MediaPresentationDuration */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.duration = dataView.getFloat64(ptr, true);
          break;
        case 37 /* MinimumUpdatePeriod */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.minimumUpdatePeriod = dataView.getFloat64(ptr, true);
          break;
        case 38 /* MinBufferTime */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.minBufferTime = dataView.getFloat64(ptr, true);
          break;
        case 39 /* TimeShiftBufferDepth */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.timeShiftBufferDepth = dataView.getFloat64(ptr, true);
          break;
        case 40 /* SuggestedPresentationDelay */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.suggestedPresentationDelay = dataView.getFloat64(ptr, true);
          break;
        case 41 /* MaxSegmentDuration */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.maxSegmentDuration = dataView.getFloat64(ptr, true);
          break;
        case 42 /* MaxSubsegmentDuration */:
          dataView = new DataView(linearMemory.buffer);
          mpdAttrs.maxSubsegmentDuration = dataView.getFloat64(ptr, true);
          break;
        case 66 /* Location */:
          const location = parseString(textDecoder, linearMemory.buffer, ptr, len);
          mpdChildren.locations.push(location);
          break;
        case 70 /* Namespace */:
          const xmlNs = { key: "", value: "" };
          dataView = new DataView(linearMemory.buffer);
          let offset = ptr;
          const keySize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.key = parseString(textDecoder, linearMemory.buffer, offset, keySize);
          offset += keySize;
          const valSize = dataView.getUint32(offset);
          offset += 4;
          xmlNs.value = parseString(textDecoder, linearMemory.buffer, offset, valSize);
          if (mpdAttrs.namespaces === void 0) {
            mpdAttrs.namespaces = [xmlNs];
          } else {
            mpdAttrs.namespaces.push(xmlNs);
          }
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/root.ts
  function generateRootChildrenParser(rootObj, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 1 /* MPD */:
          rootObj.mpd = {
            children: {
              baseURLs: [],
              locations: [],
              periods: [],
              utcTimings: []
            },
            attributes: {}
          };
          const childrenParser = generateMPDChildrenParser(rootObj.mpd.children, linearMemory, parsersStack, fullMpd);
          const attributeParser = generateMPDAttrParser(rootObj.mpd.children, rootObj.mpd.attributes, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/generators/XLink.ts
  init_define_ENVIRONMENT();
  function generateXLinkChildrenParser(xlinkObj, linearMemory, parsersStack, fullMpd) {
    return function onRootChildren(nodeId) {
      switch (nodeId) {
        case 2 /* Period */: {
          const period = {
            children: {
              adaptations: [],
              baseURLs: [],
              eventStreams: []
            },
            attributes: {}
          };
          xlinkObj.periods.push(period);
          const childrenParser = generatePeriodChildrenParser(period.children, linearMemory, parsersStack, fullMpd);
          const attributeParser = generatePeriodAttrParser(period.attributes, linearMemory);
          parsersStack.pushParsers(nodeId, childrenParser, attributeParser);
          break;
        }
        default:
          parsersStack.pushParsers(nodeId, noop_default, noop_default);
          break;
      }
    };
  }

  // src/worker/parsers/manifest/dash/wasm-parser/ts/parsers_stack.ts
  init_define_ENVIRONMENT();
  var ParsersStack = class {
    _currentNodeId;
    childrenParser;
    attributeParser;
    _stack;
    constructor() {
      this._currentNodeId = null;
      this.childrenParser = noop_default;
      this.attributeParser = noop_default;
      this._stack = [{ nodeId: null, children: noop_default, attribute: noop_default }];
    }
    pushParsers(nodeId, childrenParser, attrParser) {
      this._currentNodeId = nodeId;
      this.childrenParser = childrenParser;
      this.attributeParser = attrParser;
      this._stack.push({
        nodeId,
        attribute: attrParser,
        children: childrenParser
      });
    }
    popIfCurrent(idToPop) {
      if (this._currentNodeId !== idToPop) {
        return;
      }
      this._stack.pop();
      const { nodeId, children, attribute } = this._stack[this._stack.length - 1];
      this._currentNodeId = nodeId;
      this.attributeParser = attribute;
      this.childrenParser = children;
    }
    reset() {
      this.childrenParser = noop_default;
      this.attributeParser = noop_default;
      this._stack = [{ nodeId: null, children: noop_default, attribute: noop_default }];
    }
  };

  // src/worker/parsers/manifest/dash/wasm-parser/ts/dash-wasm-parser.ts
  var MAX_READ_SIZE = 15e3;
  var DashWasmParser = class {
    status;
    _initProm;
    _parsersStack;
    _instance;
    _mpdData;
    _warnings;
    _linearMemory;
    _isParsing;
    constructor() {
      this._parsersStack = new ParsersStack();
      this._instance = null;
      this._mpdData = null;
      this._linearMemory = null;
      this.status = "uninitialized";
      this._initProm = null;
      this._warnings = [];
      this._isParsing = false;
    }
    waitForInitialization() {
      return this._initProm ?? Promise.reject("No initialization performed yet.");
    }
    async initialize(opts) {
      if (this.status !== "uninitialized") {
        return Promise.reject(new Error("DashWasmParser already initialized."));
      } else if (!this.isCompatible()) {
        this.status = "failure";
        return Promise.reject(new Error("Target not compatible with WebAssembly."));
      }
      this.status = "initializing";
      const parsersStack = this._parsersStack;
      const textDecoder = new TextDecoder();
      const self2 = this;
      const imports = {
        env: {
          memoryBase: 0,
          tableBase: 0,
          memory: new WebAssembly.Memory({ initial: 10 }),
          table: new WebAssembly.Table({ initial: 1, element: "anyfunc" }),
          onTagOpen,
          onCustomEvent,
          onAttribute,
          readNext,
          onTagClose
        }
      };
      const fetchedWasm = fetch(opts.wasmUrl);
      const streamingProm = typeof WebAssembly.instantiateStreaming === "function" ? WebAssembly.instantiateStreaming(fetchedWasm, imports) : Promise.reject("`WebAssembly.instantiateStreaming` API not available");
      this._initProm = streamingProm.catch(async (e) => {
        log_default.warn("Unable to call `instantiateStreaming` on WASM", e instanceof Error ? e : "");
        const res = await fetchedWasm;
        if (res.status < 200 || res.status >= 300) {
          throw new Error("WebAssembly request failed. status: " + String(res.status));
        }
        const resAb = await res.arrayBuffer();
        return WebAssembly.instantiate(resAb, imports);
      }).then((instanceWasm) => {
        this._instance = instanceWasm;
        this._linearMemory = this._instance.instance.exports.memory;
        this.status = "initialized";
      }).catch((err) => {
        const message = err instanceof Error ? err.toString() : "Unknown error";
        log_default.warn("DW: Could not create DASH-WASM parser:", message);
        this.status = "failure";
      });
      return this._initProm;
      function onTagOpen(tag) {
        return parsersStack.childrenParser(tag);
      }
      function onTagClose(tag) {
        return parsersStack.popIfCurrent(tag);
      }
      function onAttribute(attr, ptr, len) {
        return parsersStack.attributeParser(attr, ptr, len);
      }
      function onCustomEvent(evt, ptr, len) {
        const linearMemory = self2._linearMemory;
        const arr = new Uint8Array(linearMemory.buffer, ptr, len);
        if (evt === 1 /* Error */) {
          const decoded = textDecoder.decode(arr);
          log_default.warn("WASM Error Event:", decoded);
          self2._warnings.push(new Error(decoded));
        } else if (evt === 0 /* Log */) {
          const decoded = textDecoder.decode(arr);
          log_default.warn("WASM Log Event:", decoded);
        }
      }
      function readNext(ptr, wantedSize) {
        if (self2._mpdData === null) {
          throw new Error("DashWasmParser Error: No MPD to read.");
        }
        const linearMemory = self2._linearMemory;
        const { mpd, cursor } = self2._mpdData;
        const sizeToRead = Math.min(wantedSize, MAX_READ_SIZE, mpd.byteLength - cursor);
        const arr = new Uint8Array(linearMemory.buffer, ptr, sizeToRead);
        arr.set(new Uint8Array(mpd, cursor, sizeToRead));
        self2._mpdData.cursor += sizeToRead;
        return sizeToRead;
      }
    }
    runWasmParser(mpd, args) {
      const [mpdIR, warnings] = this._parseMpd(mpd);
      if (mpdIR === null) {
        throw new Error("DASH Parser: Unknown error while parsing the MPD");
      }
      const ret = common_default(mpdIR, args, warnings);
      return this._processParserReturnValue(ret);
    }
    isCompatible() {
      return typeof WebAssembly === "object" && typeof WebAssembly.instantiate === "function" && typeof window.TextDecoder === "function";
    }
    _parseMpd(mpd) {
      if (this._instance === null) {
        throw new Error("DashWasmParser not initialized");
      }
      if (this._isParsing) {
        throw new Error("Parsing operation already pending.");
      }
      this._isParsing = true;
      this._mpdData = { mpd, cursor: 0 };
      const rootObj = {};
      const linearMemory = this._linearMemory;
      const rootChildrenParser = generateRootChildrenParser(rootObj, linearMemory, this._parsersStack, mpd);
      this._parsersStack.pushParsers(null, rootChildrenParser, noop_default);
      this._warnings = [];
      try {
        this._instance.instance.exports.parse();
      } catch (err) {
        this._parsersStack.reset();
        this._warnings = [];
        this._isParsing = false;
        throw err;
      }
      const parsed = rootObj.mpd ?? null;
      const warnings = this._warnings;
      this._parsersStack.reset();
      this._warnings = [];
      this._isParsing = false;
      return [parsed, warnings];
    }
    _parseXlink(xlinkData) {
      if (this._instance === null) {
        throw new Error("DashWasmParser not initialized");
      }
      if (this._isParsing) {
        throw new Error("Parsing operation already pending.");
      }
      this._isParsing = true;
      this._mpdData = { mpd: xlinkData, cursor: 0 };
      const rootObj = { periods: [] };
      const linearMemory = this._linearMemory;
      const xlinkParser = generateXLinkChildrenParser(rootObj, linearMemory, this._parsersStack, xlinkData);
      this._parsersStack.pushParsers(null, xlinkParser, noop_default);
      this._warnings = [];
      try {
        this._instance.instance.exports.parse();
      } catch (err) {
        this._parsersStack.reset();
        this._warnings = [];
        this._isParsing = false;
        throw err;
      }
      const { periods } = rootObj;
      const warnings = this._warnings;
      this._parsersStack.reset();
      this._warnings = [];
      this._isParsing = false;
      return [periods, warnings];
    }
    _processParserReturnValue(initialRes) {
      if (initialRes.type === "done") {
        return initialRes;
      } else if (initialRes.type === "needs-clock") {
        const continueParsingMPD = (loadedClock) => {
          if (loadedClock.length !== 1) {
            throw new Error("DASH parser: wrong number of loaded ressources.");
          }
          const newRet = initialRes.value.continue(loadedClock[0].responseData);
          return this._processParserReturnValue(newRet);
        };
        return {
          type: "needs-resources",
          value: {
            urls: [initialRes.value.url],
            format: "string",
            continue: continueParsingMPD
          }
        };
      } else if (initialRes.type === "needs-xlinks") {
        const continueParsingMPD = (loadedXlinks) => {
          const resourceInfos = [];
          for (let i = 0; i < loadedXlinks.length; i++) {
            const {
              responseData: xlinkResp,
              receivedTime,
              sendingTime,
              url
            } = loadedXlinks[i];
            if (!xlinkResp.success) {
              throw xlinkResp.error;
            }
            const [
              periodsIr,
              periodsIRWarnings
            ] = this._parseXlink(xlinkResp.data);
            resourceInfos.push({
              url,
              receivedTime,
              sendingTime,
              parsed: periodsIr,
              warnings: periodsIRWarnings
            });
          }
          const newRet = initialRes.value.continue(resourceInfos);
          return this._processParserReturnValue(newRet);
        };
        return {
          type: "needs-resources",
          value: {
            urls: initialRes.value.xlinksUrls,
            format: "arraybuffer",
            continue: continueParsingMPD
          }
        };
      } else {
        assertUnreachable(initialRes);
      }
    }
  };

  // src/worker/parsers/manifest/dash/wasm-parser/index.ts
  var wasm_parser_default = DashWasmParser;

  // src/worker/send_message.ts
  init_define_ENVIRONMENT();
  function sendMessage(msg, transferables) {
    if (transferables === void 0) {
      postMessage(msg);
    } else {
      postMessage(msg, transferables);
    }
  }

  // src/worker/transports/dash/index.ts
  init_define_ENVIRONMENT();

  // src/worker/transports/dash/pipelines.ts
  init_define_ENVIRONMENT();

  // src/worker/transports/utils/generate_manifest_loader.ts
  init_define_ENVIRONMENT();

  // src/common/utils/request/index.ts
  init_define_ENVIRONMENT();

  // src/common/utils/request/fetch.ts
  init_define_ENVIRONMENT();
  var _Headers = typeof Headers === "function" ? Headers : null;
  var _AbortController = typeof AbortController === "function" ? AbortController : null;
  function fetchRequest(options) {
    let headers;
    if (!isNullOrUndefined(options.headers)) {
      if (isNullOrUndefined(_Headers)) {
        headers = options.headers;
      } else {
        headers = new _Headers();
        const headerNames = Object.keys(options.headers);
        for (let i = 0; i < headerNames.length; i++) {
          const headerName = headerNames[i];
          headers.append(headerName, options.headers[headerName]);
        }
      }
    }
    log_default.debug("Fetch: Called with URL", options.url);
    let cancellation = null;
    let timeouted = false;
    const sendingTime = performance.now();
    const abortController = !isNullOrUndefined(_AbortController) ? new _AbortController() : null;
    function abortFetch() {
      if (isNullOrUndefined(abortController)) {
        log_default.warn("Fetch: AbortController API not available.");
        return;
      }
      abortController.abort();
    }
    const requestTimeout = isNullOrUndefined(options.timeout) ? config_default.getCurrent().DEFAULT_REQUEST_TIMEOUT : options.timeout;
    const timeout = window.setTimeout(() => {
      timeouted = true;
      abortFetch();
    }, requestTimeout);
    const deregisterCancelLstnr = options.cancelSignal.register(function abortRequest(err) {
      cancellation = err;
      abortFetch();
    });
    const fetchOpts = { method: "GET" };
    if (headers !== void 0) {
      fetchOpts.headers = headers;
    }
    fetchOpts.signal = !isNullOrUndefined(abortController) ? abortController.signal : null;
    return fetch(options.url, fetchOpts).then((response) => {
      if (!isNullOrUndefined(timeout)) {
        clearTimeout(timeout);
      }
      if (response.status >= 300) {
        log_default.warn("Fetch: Request HTTP Error", response.status, response.url);
        throw new RequestError(response.url, response.status, NetworkErrorTypes.ERROR_HTTP_CODE);
      }
      if (isNullOrUndefined(response.body)) {
        throw new RequestError(response.url, response.status, NetworkErrorTypes.PARSE_ERROR);
      }
      const contentLengthHeader = response.headers.get("Content-Length");
      const contentLength = !isNullOrUndefined(contentLengthHeader) && !isNaN(+contentLengthHeader) ? +contentLengthHeader : void 0;
      const reader = response.body.getReader();
      let size = 0;
      return readBufferAndSendEvents();
      async function readBufferAndSendEvents() {
        const data = await reader.read();
        if (!data.done && !isNullOrUndefined(data.value)) {
          size += data.value.byteLength;
          const currentTime = performance.now();
          const dataInfo = {
            url: response.url,
            currentTime,
            duration: currentTime - sendingTime,
            sendingTime,
            chunkSize: data.value.byteLength,
            chunk: data.value.buffer,
            size,
            totalSize: contentLength
          };
          options.onData(dataInfo);
          return readBufferAndSendEvents();
        } else if (data.done) {
          deregisterCancelLstnr();
          const receivedTime = performance.now();
          const requestDuration = receivedTime - sendingTime;
          return {
            requestDuration,
            receivedTime,
            sendingTime,
            size,
            status: response.status,
            url: response.url
          };
        }
        return readBufferAndSendEvents();
      }
    }).catch((err) => {
      if (cancellation !== null) {
        throw cancellation;
      }
      deregisterCancelLstnr();
      if (timeouted) {
        log_default.warn("Fetch: Request timeouted.");
        throw new RequestError(options.url, 0, NetworkErrorTypes.TIMEOUT);
      } else if (err instanceof RequestError) {
        throw err;
      }
      log_default.warn("Fetch: Request Error", err instanceof Error ? err.toString() : "");
      throw new RequestError(options.url, 0, NetworkErrorTypes.ERROR_EVENT);
    });
  }
  function fetchIsSupported() {
    return typeof window.fetch === "function" && !isNullOrUndefined(_AbortController) && !isNullOrUndefined(_Headers);
  }

  // src/common/utils/request/xhr.ts
  init_define_ENVIRONMENT();
  var DEFAULT_RESPONSE_TYPE = "json";
  function request(options) {
    const { DEFAULT_REQUEST_TIMEOUT } = config_default.getCurrent();
    const requestOptions = {
      url: options.url,
      headers: options.headers,
      responseType: isNullOrUndefined(options.responseType) ? DEFAULT_RESPONSE_TYPE : options.responseType,
      timeout: isNullOrUndefined(options.timeout) ? DEFAULT_REQUEST_TIMEOUT : options.timeout
    };
    return new Promise((resolve, reject) => {
      const { onProgress, cancelSignal } = options;
      const {
        url,
        headers,
        responseType,
        timeout
      } = requestOptions;
      const xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      if (timeout >= 0) {
        xhr.timeout = timeout;
      }
      xhr.responseType = responseType;
      if (xhr.responseType === "document") {
        xhr.overrideMimeType("text/xml");
      }
      if (!isNullOrUndefined(headers)) {
        const _headers = headers;
        for (const key in _headers) {
          if (_headers.hasOwnProperty(key)) {
            xhr.setRequestHeader(key, _headers[key]);
          }
        }
      }
      const sendingTime = performance.now();
      let deregisterCancellationListener = null;
      if (cancelSignal !== void 0) {
        deregisterCancellationListener = cancelSignal.register(function abortRequest(err) {
          if (!isNullOrUndefined(xhr) && xhr.readyState !== 4) {
            xhr.abort();
          }
          reject(err);
        });
        if (cancelSignal.isCancelled) {
          return;
        }
      }
      xhr.onerror = function onXHRError() {
        if (deregisterCancellationListener !== null) {
          deregisterCancellationListener();
        }
        reject(new RequestError(url, xhr.status, "ERROR_EVENT", xhr));
      };
      xhr.ontimeout = function onXHRTimeout() {
        if (deregisterCancellationListener !== null) {
          deregisterCancellationListener();
        }
        reject(new RequestError(url, xhr.status, "TIMEOUT", xhr));
      };
      if (onProgress !== void 0) {
        xhr.onprogress = function onXHRProgress(event) {
          const currentTime = performance.now();
          onProgress({
            url,
            duration: currentTime - sendingTime,
            sendingTime,
            currentTime,
            size: event.loaded,
            totalSize: event.total
          });
        };
      }
      xhr.onload = function onXHRLoad(event) {
        if (xhr.readyState === 4) {
          if (deregisterCancellationListener !== null) {
            deregisterCancellationListener();
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            const receivedTime = performance.now();
            const totalSize = xhr.response instanceof ArrayBuffer ? xhr.response.byteLength : event.total;
            const status = xhr.status;
            const loadedResponseType = xhr.responseType;
            const _url = isNonEmptyString(xhr.responseURL) ? xhr.responseURL : url;
            let responseData;
            if (loadedResponseType === "json") {
              responseData = typeof xhr.response === "object" ? xhr.response : toJSONForIE(xhr.responseText);
            } else {
              responseData = xhr.response;
            }
            if (isNullOrUndefined(responseData)) {
              reject(new RequestError(url, xhr.status, "PARSE_ERROR", xhr));
              return;
            }
            resolve({
              status,
              url: _url,
              responseType: loadedResponseType,
              sendingTime,
              receivedTime,
              requestDuration: receivedTime - sendingTime,
              size: totalSize,
              responseData
            });
          } else {
            reject(new RequestError(url, xhr.status, "ERROR_HTTP_CODE", xhr));
          }
        }
      };
      xhr.send();
    });
  }
  function toJSONForIE(data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  // src/common/utils/request/index.ts
  var request_default = request;

  // src/worker/transports/utils/call_custom_manifest_loader.ts
  init_define_ENVIRONMENT();
  function callCustomManifestLoader(customManifestLoader, fallbackManifestLoader) {
    return (url, cancelSignal) => {
      return new Promise((res, rej) => {
        const timeAPIsDelta = Date.now() - performance.now();
        let hasFinished = false;
        const resolve = (_args) => {
          if (hasFinished || cancelSignal.isCancelled) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          const receivedTime = _args.receivingTime !== void 0 ? _args.receivingTime - timeAPIsDelta : void 0;
          const sendingTime = _args.sendingTime !== void 0 ? _args.sendingTime - timeAPIsDelta : void 0;
          res({
            responseData: _args.data,
            size: _args.size,
            requestDuration: _args.duration,
            url: _args.url,
            receivedTime,
            sendingTime
          });
        };
        const reject = (err) => {
          if (hasFinished || cancelSignal.isCancelled) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          const castedErr = err;
          const message = castedErr?.message ?? "Unknown error when fetching the Manifest through a custom manifestLoader.";
          const emittedErr = new CustomLoaderError(message, castedErr?.canRetry ?? false, castedErr?.isOfflineError ?? false, castedErr?.xhr);
          rej(emittedErr);
        };
        const fallback = () => {
          if (hasFinished || cancelSignal.isCancelled) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          fallbackManifestLoader(url, cancelSignal).then(res, rej);
        };
        const callbacks = { reject, resolve, fallback };
        const abort = customManifestLoader(url, callbacks);
        cancelSignal.register(abortCustomLoader);
        function abortCustomLoader(err) {
          if (hasFinished) {
            return;
          }
          hasFinished = true;
          if (typeof abort === "function") {
            abort();
          }
          rej(err);
        }
      });
    };
  }

  // src/worker/transports/utils/generate_manifest_loader.ts
  function generateRegularManifestLoader(preferredType) {
    return function regularManifestLoader(url, cancelSignal) {
      if (url === void 0) {
        throw new Error("Cannot perform HTTP(s) request. URL not known");
      }
      switch (preferredType) {
        case "arraybuffer":
          return request_default({ url, responseType: "arraybuffer", cancelSignal });
        case "text":
          return request_default({ url, responseType: "text", cancelSignal });
        case "document":
          return request_default({ url, responseType: "document", cancelSignal });
        default:
          assertUnreachable(preferredType);
      }
    };
  }
  function generateManifestLoader({ customManifestLoader }, preferredType) {
    const regularManifestLoader = generateRegularManifestLoader(preferredType);
    if (typeof customManifestLoader !== "function") {
      return regularManifestLoader;
    }
    return callCustomManifestLoader(customManifestLoader, regularManifestLoader);
  }

  // src/worker/transports/dash/image_pipelines.ts
  init_define_ENVIRONMENT();
  async function imageLoader(url, content, cancelSignal, callbacks) {
    const { segment } = content;
    if (segment.isInit || url === null) {
      return {
        resultType: "segment-created",
        resultData: null
      };
    }
    const data = await request_default({
      url,
      responseType: "arraybuffer",
      onProgress: callbacks.onProgress,
      cancelSignal
    });
    return {
      resultType: "segment-loaded",
      resultData: data
    };
  }
  function imageParser(loadedSegment, content) {
    const { segment, period } = content;
    const { data, isChunked } = loadedSegment;
    if (content.segment.isInit) {
      return {
        segmentType: "init",
        initializationData: null,
        initializationDataSize: 0,
        protectionDataUpdate: false,
        initTimescale: void 0
      };
    }
    if (isChunked) {
      throw new Error("Image data should not be downloaded in chunks");
    }
    const chunkOffset = takeFirstSet(segment.timestampOffset, 0);
    if (data === null || features_default.imageParser === null) {
      return {
        segmentType: "media",
        chunkData: null,
        chunkSize: 0,
        chunkInfos: {
          duration: segment.duration,
          time: segment.time
        },
        chunkOffset,
        protectionDataUpdate: false,
        appendWindow: [period.start, period.end]
      };
    }
    const bifObject = features_default.imageParser(new Uint8Array(data));
    const thumbsData = bifObject.thumbs;
    return {
      segmentType: "media",
      chunkData: {
        data: thumbsData,
        start: 0,
        end: Number.MAX_VALUE,
        timescale: 1,
        type: "bif"
      },
      chunkSize: void 0,
      chunkInfos: {
        time: 0,
        duration: Number.MAX_VALUE
      },
      chunkOffset,
      protectionDataUpdate: false,
      appendWindow: [period.start, period.end]
    };
  }

  // src/worker/transports/dash/manifest_parser.ts
  init_define_ENVIRONMENT();
  function generateManifestParser(options) {
    const {
      aggressiveMode,
      referenceDateTime
    } = options;
    const serverTimeOffset = options.serverSyncInfos !== void 0 ? options.serverSyncInfos.serverTimestamp - options.serverSyncInfos.clientTime : void 0;
    return function manifestParser(manifestData, parserOptions, onWarnings, cancelSignal, scheduleRequest) {
      const { responseData } = manifestData;
      const argClockOffset = parserOptions.externalClockOffset;
      const url = manifestData.url ?? parserOptions.originalUrl;
      const optAggressiveMode = aggressiveMode === true;
      const externalClockOffset = serverTimeOffset ?? argClockOffset;
      const unsafelyBaseOnPreviousManifest = parserOptions.unsafeMode ? parserOptions.previousManifest : null;
      const dashParserOpts = {
        aggressiveMode: optAggressiveMode,
        unsafelyBaseOnPreviousManifest,
        url,
        referenceDateTime,
        externalClockOffset
      };
      const parsers = {
        wasm: globalThis.parser,
        js: null
      };
      if (parsers.wasm === null || parsers.wasm.status === "uninitialized" || parsers.wasm.status === "failure") {
        log_default.debug("DASH: WASM MPD Parser not initialized. Running JS one.");
        throw new Error("Not implemented");
      } else {
        const manifestAB = getManifestAsArrayBuffer(responseData);
        if (!doesXmlSeemsUtf8Encoded(manifestAB)) {
          log_default.info("DASH: MPD doesn't seem to be UTF-8-encoded. Running JS parser instead of the WASM one.");
          throw new Error("Not implemented");
        }
        if (parsers.wasm.status === "initialized") {
          log_default.debug("DASH: Running WASM MPD Parser.");
          const parsed = parsers.wasm.runWasmParser(manifestAB, dashParserOpts);
          return processMpdParserResponse(parsed);
        } else {
          log_default.debug("DASH: Awaiting WASM initialization before parsing the MPD.");
          const initProm = parsers.wasm.waitForInitialization().catch(() => {
          });
          return initProm.then(() => {
            if (parsers.wasm === null || parsers.wasm.status !== "initialized") {
              log_default.warn("DASH: WASM MPD parser initialization failed. Running JS parser instead");
              throw new Error("Not implemented");
            }
            log_default.debug("DASH: Running WASM MPD Parser.");
            const parsed = parsers.wasm.runWasmParser(manifestAB, dashParserOpts);
            return processMpdParserResponse(parsed);
          });
        }
      }
      function processMpdParserResponse(parserResponse) {
        if (parserResponse.type === "done") {
          if (parserResponse.value.warnings.length > 0) {
            onWarnings(parserResponse.value.warnings);
          }
          if (cancelSignal.isCancelled) {
            return Promise.reject(cancelSignal.cancellationError);
          }
          const manifest = new manifest_default2(parserResponse.value.parsed, options);
          return { manifest, url };
        }
        const { value } = parserResponse;
        const externalResources = value.urls.map((resourceUrl) => {
          return scheduleRequest(() => {
            return value.format === "string" ? request_default({
              url: resourceUrl,
              responseType: "text",
              cancelSignal
            }) : request_default({
              url: resourceUrl,
              responseType: "arraybuffer",
              cancelSignal
            });
          }).then((res) => {
            if (value.format === "string") {
              if (typeof res.responseData !== "string") {
                throw new Error("External DASH resources should have been a string");
              }
              return object_assign_default(res, {
                responseData: {
                  success: true,
                  data: res.responseData
                }
              });
            } else {
              if (!(res.responseData instanceof ArrayBuffer)) {
                throw new Error("External DASH resources should have been ArrayBuffers");
              }
              return object_assign_default(res, {
                responseData: {
                  success: true,
                  data: res.responseData
                }
              });
            }
          }, (err) => {
            const error = formatError(err, {
              defaultCode: "PIPELINE_PARSE_ERROR",
              defaultReason: "An unknown error occured when parsing ressources."
            });
            return object_assign_default({}, {
              size: void 0,
              requestDuration: void 0,
              responseData: {
                success: false,
                error
              }
            });
          });
        });
        return Promise.all(externalResources).then((loadedResources) => {
          if (value.format === "string") {
            assertLoadedResourcesFormatString(loadedResources);
            return processMpdParserResponse(value.continue(loadedResources));
          } else {
            assertLoadedResourcesFormatArrayBuffer(loadedResources);
            return processMpdParserResponse(value.continue(loadedResources));
          }
        });
      }
    };
  }
  function assertLoadedResourcesFormatString(loadedResources) {
    if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.PRODUCTION) {
      return;
    }
    loadedResources.forEach((loadedResource) => {
      const { responseData } = loadedResource;
      if (responseData.success && typeof responseData.data === "string") {
        return;
      } else if (!responseData.success) {
        return;
      }
      throw new Error("Invalid data given to the LoadedRessource");
    });
  }
  function assertLoadedResourcesFormatArrayBuffer(loadedResources) {
    if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.PRODUCTION) {
      return;
    }
    loadedResources.forEach((loadedResource) => {
      const { responseData } = loadedResource;
      if (responseData.success && responseData.data instanceof ArrayBuffer) {
        return;
      } else if (!responseData.success) {
        return;
      }
      throw new Error("Invalid data given to the LoadedRessource");
    });
  }
  function getManifestAsArrayBuffer(manifestSrc) {
    if (manifestSrc instanceof ArrayBuffer) {
      return manifestSrc;
    } else if (typeof manifestSrc === "string") {
      return strToUtf8(manifestSrc).buffer;
    } else {
      throw new Error("DASH Manifest Parser: Unrecognized Manifest format");
    }
  }
  function doesXmlSeemsUtf8Encoded(xmlData) {
    const dv = new DataView(xmlData);
    if (dv.getUint16(0) === 61371 && dv.getUint8(2) === 191) {
      return true;
    } else if (dv.getUint16(0) === 65279 || dv.getUint16(0) === 65534) {
      return false;
    }
    return true;
  }

  // src/worker/transports/dash/segment_loader.ts
  init_define_ENVIRONMENT();

  // src/worker/transports/utils/byte_range.ts
  init_define_ENVIRONMENT();
  function byteRange([start, end]) {
    return end === Infinity ? `bytes=${start}-` : `bytes=${start}-${end}`;
  }

  // src/worker/transports/utils/infer_segment_container.ts
  init_define_ENVIRONMENT();
  function inferSegmentContainer(adaptationType, representation) {
    if (adaptationType === "audio" || adaptationType === "video") {
      if (representation.mimeType === "video/mp4" || representation.mimeType === "audio/mp4") {
        return "mp4";
      }
      if (representation.mimeType === "video/webm" || representation.mimeType === "audio/webm") {
        return "webm";
      }
      return void 0;
    } else if (adaptationType === "text") {
      return representation.mimeType === "application/mp4" ? "mp4" : void 0;
    }
    return void 0;
  }

  // src/worker/transports/dash/add_segment_integrity_checks_to_loader.ts
  init_define_ENVIRONMENT();

  // src/worker/transports/utils/check_isobmff_integrity.ts
  init_define_ENVIRONMENT();

  // src/worker/transports/utils/find_complete_box.ts
  init_define_ENVIRONMENT();
  function findCompleteBox(buf, wantedName) {
    const len = buf.length;
    let i = 0;
    while (i + 8 <= len) {
      let size = be4toi(buf, i);
      if (size === 0) {
        size = len - i;
      } else if (size === 1) {
        if (i + 16 > len) {
          return -1;
        }
        size = be8toi(buf, i + 8);
      }
      if (isNaN(size) || size <= 0) {
        return -1;
      }
      const name = be4toi(buf, i + 4);
      if (name === wantedName) {
        if (i + size <= len) {
          return i;
        }
        return -1;
      }
      i += size;
    }
    return -1;
  }

  // src/worker/transports/utils/check_isobmff_integrity.ts
  function checkISOBMFFIntegrity(buffer, isInitSegment) {
    if (isInitSegment) {
      const ftypIndex = findCompleteBox(buffer, 1718909296);
      if (ftypIndex < 0) {
        throw new OtherError("INTEGRITY_ERROR", "Incomplete `ftyp` box");
      }
      const moovIndex = findCompleteBox(buffer, 1836019574);
      if (moovIndex < 0) {
        throw new OtherError("INTEGRITY_ERROR", "Incomplete `moov` box");
      }
    } else {
      const moofIndex = findCompleteBox(buffer, 1836019558);
      if (moofIndex < 0) {
        throw new OtherError("INTEGRITY_ERROR", "Incomplete `moof` box");
      }
      const mdatIndex = findCompleteBox(buffer, 1835295092);
      if (mdatIndex < 0) {
        throw new OtherError("INTEGRITY_ERROR", "Incomplete `mdat` box");
      }
    }
  }

  // src/worker/transports/dash/add_segment_integrity_checks_to_loader.ts
  function addSegmentIntegrityChecks(segmentLoader) {
    return (url, content, initialCancelSignal, callbacks) => {
      return new Promise((resolve, reject) => {
        const requestCanceller = new TaskCanceller({ cancelOn: initialCancelSignal });
        const stopRejectingOnCancel = requestCanceller.signal.register(reject);
        segmentLoader(url, content, requestCanceller.signal, {
          ...callbacks,
          onNewChunk(data) {
            try {
              trowOnIntegrityError(data);
              callbacks.onNewChunk(data);
            } catch (err) {
              stopRejectingOnCancel();
              requestCanceller.cancel();
              reject(err);
            }
          }
        }).then((info) => {
          if (requestCanceller.isUsed) {
            return;
          }
          stopRejectingOnCancel();
          if (info.resultType === "segment-loaded") {
            try {
              trowOnIntegrityError(info.resultData.responseData);
            } catch (err) {
              reject(err);
              return;
            }
          }
          resolve(info);
        }, (error) => {
          stopRejectingOnCancel();
          reject(error);
        });
      });
      function trowOnIntegrityError(data) {
        if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array) || inferSegmentContainer(content.adaptation.type, content.representation) !== "mp4") {
          return;
        }
        checkISOBMFFIntegrity(new Uint8Array(data), content.segment.isInit);
      }
    };
  }

  // src/worker/transports/dash/init_segment_loader.ts
  init_define_ENVIRONMENT();
  function initSegmentLoader(url, segment, cancelSignal, callbacks) {
    if (segment.range === void 0) {
      return request_default({
        url,
        responseType: "arraybuffer",
        cancelSignal,
        onProgress: callbacks.onProgress
      }).then((data) => ({
        resultType: "segment-loaded",
        resultData: data
      }));
    }
    if (segment.indexRange === void 0) {
      return request_default({
        url,
        headers: { Range: byteRange(segment.range) },
        responseType: "arraybuffer",
        cancelSignal,
        onProgress: callbacks.onProgress
      }).then((data) => ({
        resultType: "segment-loaded",
        resultData: data
      }));
    }
    if (segment.range[1] + 1 === segment.indexRange[0]) {
      return request_default({
        url,
        headers: { Range: byteRange([
          segment.range[0],
          segment.indexRange[1]
        ]) },
        responseType: "arraybuffer",
        cancelSignal,
        onProgress: callbacks.onProgress
      }).then((data) => ({
        resultType: "segment-loaded",
        resultData: data
      }));
    }
    const rangeRequest$ = request_default({
      url,
      headers: { Range: byteRange(segment.range) },
      responseType: "arraybuffer",
      cancelSignal,
      onProgress: callbacks.onProgress
    });
    const indexRequest$ = request_default({
      url,
      headers: { Range: byteRange(segment.indexRange) },
      responseType: "arraybuffer",
      cancelSignal,
      onProgress: callbacks.onProgress
    });
    return Promise.all([rangeRequest$, indexRequest$]).then(([initData, indexData]) => {
      const data = concat2(new Uint8Array(initData.responseData), new Uint8Array(indexData.responseData));
      const sendingTime = Math.min(initData.sendingTime, indexData.sendingTime);
      const receivedTime = Math.max(initData.receivedTime, indexData.receivedTime);
      return {
        resultType: "segment-loaded",
        resultData: {
          url,
          responseData: data,
          size: initData.size + indexData.size,
          requestDuration: receivedTime - sendingTime,
          sendingTime,
          receivedTime
        }
      };
    });
  }

  // src/worker/transports/dash/low_latency_segment_loader.ts
  init_define_ENVIRONMENT();

  // src/worker/transports/dash/extract_complete_chunks.ts
  init_define_ENVIRONMENT();
  function extractCompleteChunks(buffer) {
    let _position = 0;
    const chunks = [];
    while (_position < buffer.length) {
      const currentBuffer = buffer.subarray(_position, Infinity);
      const moofIndex = findCompleteBox(currentBuffer, 1836019558);
      if (moofIndex < 0) {
        return [chunks, currentBuffer];
      }
      const moofLen = be4toi(buffer, moofIndex + _position);
      const moofEnd = _position + moofIndex + moofLen;
      if (moofEnd > buffer.length) {
        return [chunks, currentBuffer];
      }
      const mdatIndex = findCompleteBox(currentBuffer, 1835295092);
      if (mdatIndex < 0) {
        return [chunks, currentBuffer];
      }
      const mdatLen = be4toi(buffer, mdatIndex + _position);
      const mdatEnd = _position + mdatIndex + mdatLen;
      if (mdatEnd > buffer.length) {
        return [chunks, currentBuffer];
      }
      const maxEnd = Math.max(moofEnd, mdatEnd);
      const chunk = buffer.subarray(_position, maxEnd);
      chunks.push(chunk);
      _position = maxEnd;
    }
    return [chunks, null];
  }

  // src/worker/transports/dash/low_latency_segment_loader.ts
  function lowLatencySegmentLoader(url, content, callbacks, cancelSignal) {
    const { segment } = content;
    const headers = segment.range !== void 0 ? { Range: byteRange(segment.range) } : void 0;
    let partialChunk = null;
    function onData(info) {
      const chunk = new Uint8Array(info.chunk);
      const concatenated = partialChunk !== null ? concat2(partialChunk, chunk) : chunk;
      const res = extractCompleteChunks(concatenated);
      const completeChunks = res[0];
      partialChunk = res[1];
      for (let i = 0; i < completeChunks.length; i++) {
        callbacks.onNewChunk(completeChunks[i]);
        if (cancelSignal.isCancelled) {
          return;
        }
      }
      callbacks.onProgress({
        duration: info.duration,
        size: info.size,
        totalSize: info.totalSize
      });
      if (cancelSignal.isCancelled) {
        return;
      }
    }
    return fetchRequest({
      url,
      headers,
      onData,
      cancelSignal
    }).then((res) => ({
      resultType: "chunk-complete",
      resultData: res
    }));
  }

  // src/worker/transports/dash/segment_loader.ts
  function regularSegmentLoader(url, content, lowLatencyMode, callbacks, cancelSignal) {
    if (content.segment.isInit) {
      return initSegmentLoader(url, content.segment, cancelSignal, callbacks);
    }
    const containerType = inferSegmentContainer(content.adaptation.type, content.representation);
    if (lowLatencyMode && (containerType === "mp4" || containerType === void 0)) {
      if (fetchIsSupported()) {
        return lowLatencySegmentLoader(url, content, callbacks, cancelSignal);
      } else {
        warnOnce("DASH: Your browser does not have the fetch API. You will have a higher chance of rebuffering when playing close to the live edge");
      }
    }
    const { segment } = content;
    return request_default({
      url,
      responseType: "arraybuffer",
      headers: segment.range !== void 0 ? { Range: byteRange(segment.range) } : void 0,
      cancelSignal,
      onProgress: callbacks.onProgress
    }).then((data) => ({
      resultType: "segment-loaded",
      resultData: data
    }));
  }
  function generateSegmentLoader({
    lowLatencyMode,
    segmentLoader: customSegmentLoader,
    checkMediaSegmentIntegrity
  }) {
    return checkMediaSegmentIntegrity !== true ? segmentLoader : addSegmentIntegrityChecks(segmentLoader);
    function segmentLoader(url, content, cancelSignal, callbacks) {
      if (url == null) {
        return Promise.resolve({
          resultType: "segment-created",
          resultData: null
        });
      }
      if (lowLatencyMode || customSegmentLoader === void 0) {
        return regularSegmentLoader(url, content, lowLatencyMode, callbacks, cancelSignal);
      }
      const args = {
        adaptation: content.adaptation,
        manifest: content.manifest,
        period: content.period,
        representation: content.representation,
        segment: content.segment,
        transport: "dash",
        url
      };
      return new Promise((res, rej) => {
        let hasFinished = false;
        const resolve = (_args) => {
          if (hasFinished || cancelSignal.isCancelled) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          res({
            resultType: "segment-loaded",
            resultData: {
              responseData: _args.data,
              size: _args.size,
              requestDuration: _args.duration
            }
          });
        };
        const reject = (err) => {
          if (hasFinished || cancelSignal.isCancelled) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          const castedErr = err;
          const message = castedErr?.message ?? "Unknown error when fetching a DASH segment through a custom segmentLoader.";
          const emittedErr = new CustomLoaderError(message, castedErr?.canRetry ?? false, castedErr?.isOfflineError ?? false, castedErr?.xhr);
          rej(emittedErr);
        };
        const progress = (_args) => {
          if (hasFinished || cancelSignal.isCancelled) {
            return;
          }
          callbacks.onProgress({
            duration: _args.duration,
            size: _args.size,
            totalSize: _args.totalSize
          });
        };
        const fallback = () => {
          if (hasFinished || cancelSignal.isCancelled) {
            return;
          }
          hasFinished = true;
          cancelSignal.deregister(abortCustomLoader);
          regularSegmentLoader(url, content, lowLatencyMode, callbacks, cancelSignal).then(res, rej);
        };
        const customCallbacks = { reject, resolve, progress, fallback };
        const abort = customSegmentLoader(args, customCallbacks);
        cancelSignal.register(abortCustomLoader);
        function abortCustomLoader(err) {
          if (hasFinished) {
            return;
          }
          hasFinished = true;
          if (typeof abort === "function") {
            abort();
          }
          rej(err);
        }
      });
    }
  }

  // src/worker/transports/dash/segment_parser.ts
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
  function getChildBox(buf, childNames) {
    let currBox = buf;
    for (const childName of childNames) {
      const box = getBoxContent(currBox, childName);
      if (box === null) {
        return null;
      }
      currBox = box;
    }
    return currBox;
  }
  function getBoxContent(buf, boxName) {
    const offsets = getBoxOffsets(buf, boxName);
    return offsets !== null ? buf.subarray(offsets[1], offsets[2]) : null;
  }
  function getBoxesContent(buf, boxName) {
    const ret = [];
    let currentBuf = buf;
    while (true) {
      const offsets = getBoxOffsets(currentBuf, boxName);
      if (offsets === null) {
        return ret;
      }
      assert(offsets[2] !== 0 && currentBuf.length !== 0);
      ret.push(currentBuf.subarray(offsets[1], offsets[2]));
      currentBuf = currentBuf.subarray(offsets[2]);
    }
  }
  function getBoxOffsets(buf, boxName) {
    const len = buf.length;
    let boxBaseOffset = 0;
    let name;
    let lastBoxSize = 0;
    let lastOffset;
    while (boxBaseOffset + 8 <= len) {
      lastOffset = boxBaseOffset;
      lastBoxSize = be4toi(buf, lastOffset);
      lastOffset += 4;
      name = be4toi(buf, lastOffset);
      lastOffset += 4;
      if (lastBoxSize === 0) {
        lastBoxSize = len - boxBaseOffset;
      } else if (lastBoxSize === 1) {
        if (lastOffset + 8 > len) {
          return null;
        }
        lastBoxSize = be8toi(buf, lastOffset);
        lastOffset += 8;
      }
      if (lastBoxSize < 0) {
        throw new Error("ISOBMFF: Size out of range");
      }
      if (name === boxName) {
        if (boxName === 1970628964) {
          lastOffset += 16;
        }
        return [boxBaseOffset, lastOffset, boxBaseOffset + lastBoxSize];
      } else {
        boxBaseOffset += lastBoxSize;
      }
    }
    return null;
  }

  // src/worker/parsers/containers/isobmff/take_pssh_out.ts
  function takePSSHOut(data) {
    let i = 0;
    const moov = getBoxContent(data, 1836019574);
    if (moov === null) {
      return [];
    }
    const psshBoxes = [];
    while (i < moov.length) {
      let psshOffsets;
      try {
        psshOffsets = getBoxOffsets(moov, 1886614376);
      } catch (e) {
        const err = e instanceof Error ? e : "";
        log_default.warn("Error while removing PSSH from ISOBMFF", err);
        return psshBoxes;
      }
      if (psshOffsets == null) {
        return psshBoxes;
      }
      const pssh = slice_uint8array_default(moov, psshOffsets[0], psshOffsets[2]);
      const systemId = getPsshSystemID(pssh, psshOffsets[1] - psshOffsets[0]);
      if (systemId !== void 0) {
        psshBoxes.push({ systemId, data: pssh });
      }
      moov[psshOffsets[0] + 4] = 102;
      moov[psshOffsets[0] + 5] = 114;
      moov[psshOffsets[0] + 6] = 101;
      moov[psshOffsets[0] + 7] = 101;
      i = psshOffsets[2];
    }
    return psshBoxes;
  }
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

  // src/worker/parsers/containers/isobmff/read.ts
  init_define_ENVIRONMENT();
  function getTRAF(buffer) {
    const moof = getBoxContent(buffer, 1836019558);
    if (moof === null) {
      return null;
    }
    return getBoxContent(moof, 1953653094);
  }
  function getTRAFs(buffer) {
    const moofs = getBoxesContent(buffer, 1836019558);
    return moofs.reduce((acc, moof) => {
      const traf = getBoxContent(moof, 1953653094);
      if (traf !== null) {
        acc.push(traf);
      }
      return acc;
    }, []);
  }
  function getMDAT(buf) {
    return getBoxContent(buf, 1835295092);
  }
  function getMDIA(buf) {
    const moov = getBoxContent(buf, 1836019574);
    if (moov === null) {
      return null;
    }
    const trak = getBoxContent(moov, 1953653099);
    if (trak === null) {
      return null;
    }
    return getBoxContent(trak, 1835297121);
  }
  function getEMSG(buffer, offset = 0) {
    return getBoxContent(buffer.subarray(offset), 1701671783);
  }

  // src/worker/parsers/containers/isobmff/utils.ts
  init_define_ENVIRONMENT();
  function getSegmentsFromSidx(buf, sidxOffsetInWholeSegment) {
    const sidxOffsets = getBoxOffsets(buf, 1936286840);
    if (sidxOffsets === null) {
      return null;
    }
    let offset = sidxOffsetInWholeSegment;
    const boxSize = sidxOffsets[2] - sidxOffsets[0];
    let cursor = sidxOffsets[1];
    const version = buf[cursor];
    cursor += 4 + 4;
    const timescale = be4toi(buf, cursor);
    cursor += 4;
    let time;
    if (version === 0) {
      time = be4toi(buf, cursor);
      cursor += 4;
      offset += be4toi(buf, cursor) + boxSize;
      cursor += 4;
    } else if (version === 1) {
      time = be8toi(buf, cursor);
      cursor += 8;
      offset += be8toi(buf, cursor) + boxSize;
      cursor += 8;
    } else {
      return null;
    }
    const segments = [];
    cursor += 2;
    let count = be2toi(buf, cursor);
    cursor += 2;
    while (--count >= 0) {
      const refChunk = be4toi(buf, cursor);
      cursor += 4;
      const refType = (refChunk & 2147483648) >>> 31;
      const refSize = refChunk & 2147483647;
      if (refType === 1) {
        throw new Error("sidx with reference_type `1` not yet implemented");
      }
      const duration = be4toi(buf, cursor);
      cursor += 4;
      cursor += 4;
      segments.push({
        time,
        duration,
        timescale,
        range: [offset, offset + refSize - 1]
      });
      time += duration;
      offset += refSize;
    }
    return segments;
  }
  function getTrackFragmentDecodeTime(buffer) {
    const traf = getTRAF(buffer);
    if (traf === null) {
      return void 0;
    }
    const tfdt = getBoxContent(traf, 1952867444);
    if (tfdt === null) {
      return void 0;
    }
    const version = tfdt[0];
    return version === 1 ? be8toi(tfdt, 4) : version === 0 ? be4toi(tfdt, 4) : void 0;
  }
  function getDefaultDurationFromTFHDInTRAF(traf) {
    const tfhd = getBoxContent(traf, 1952868452);
    if (tfhd === null) {
      return void 0;
    }
    let cursor = 1;
    const flags = be3toi(tfhd, cursor);
    cursor += 3;
    const hasBaseDataOffset = (flags & 1) > 0;
    const hasSampleDescriptionIndex = (flags & 2) > 0;
    const hasDefaultSampleDuration = (flags & 8) > 0;
    if (!hasDefaultSampleDuration) {
      return void 0;
    }
    cursor += 4;
    if (hasBaseDataOffset) {
      cursor += 8;
    }
    if (hasSampleDescriptionIndex) {
      cursor += 4;
    }
    const defaultDuration = be4toi(tfhd, cursor);
    return defaultDuration;
  }
  function getDurationFromTrun(buffer) {
    const trafs = getTRAFs(buffer);
    if (trafs.length === 0) {
      return void 0;
    }
    let completeDuration = 0;
    for (const traf of trafs) {
      const trun = getBoxContent(traf, 1953658222);
      if (trun === null) {
        return void 0;
      }
      let cursor = 0;
      const version = trun[cursor];
      cursor += 1;
      if (version > 1) {
        return void 0;
      }
      const flags = be3toi(trun, cursor);
      cursor += 3;
      const hasSampleDuration = (flags & 256) > 0;
      let defaultDuration = 0;
      if (!hasSampleDuration) {
        defaultDuration = getDefaultDurationFromTFHDInTRAF(traf);
        if (defaultDuration === void 0) {
          return void 0;
        }
      }
      const hasDataOffset = (flags & 1) > 0;
      const hasFirstSampleFlags = (flags & 4) > 0;
      const hasSampleSize = (flags & 512) > 0;
      const hasSampleFlags = (flags & 1024) > 0;
      const hasSampleCompositionOffset = (flags & 2048) > 0;
      const sampleCounts = be4toi(trun, cursor);
      cursor += 4;
      if (hasDataOffset) {
        cursor += 4;
      }
      if (hasFirstSampleFlags) {
        cursor += 4;
      }
      let i = sampleCounts;
      let duration = 0;
      while (i-- > 0) {
        if (hasSampleDuration) {
          duration += be4toi(trun, cursor);
          cursor += 4;
        } else {
          duration += defaultDuration;
        }
        if (hasSampleSize) {
          cursor += 4;
        }
        if (hasSampleFlags) {
          cursor += 4;
        }
        if (hasSampleCompositionOffset) {
          cursor += 4;
        }
      }
      completeDuration += duration;
    }
    return completeDuration;
  }
  function getMDHDTimescale(buffer) {
    const mdia = getMDIA(buffer);
    if (mdia === null) {
      return void 0;
    }
    const mdhd = getBoxContent(mdia, 1835296868);
    if (mdhd === null) {
      return void 0;
    }
    let cursor = 0;
    const version = mdhd[cursor];
    cursor += 4;
    return version === 1 ? be4toi(mdhd, cursor + 16) : version === 0 ? be4toi(mdhd, cursor + 8) : void 0;
  }
  function parseEmsgBoxes(buffer) {
    const emsgs = [];
    let offset = 0;
    while (offset < buffer.length) {
      const emsg = getEMSG(buffer, offset);
      if (emsg === null) {
        break;
      }
      const length = emsg.length;
      offset += length;
      const version = emsg[0];
      if (version !== 0) {
        log_default.warn("ISOBMFF: EMSG version " + version.toString() + " not supported.");
      } else {
        let position = 4;
        const { end: schemeIdEnd, string: schemeIdUri } = readNullTerminatedString(emsg, position);
        position = schemeIdEnd;
        const { end: valueEnd, string: value } = readNullTerminatedString(emsg, position);
        position = valueEnd;
        const timescale = be4toi(emsg, position);
        position += 4;
        const presentationTimeDelta = be4toi(emsg, position);
        position += 4;
        const eventDuration = be4toi(emsg, position);
        position += 4;
        const id = be4toi(emsg, position);
        position += 4;
        const messageData = emsg.subarray(position, length);
        const emsgData = {
          schemeIdUri,
          value,
          timescale,
          presentationTimeDelta,
          eventDuration,
          id,
          messageData
        };
        emsgs.push(emsgData);
      }
    }
    if (emsgs.length === 0) {
      return void 0;
    }
    return emsgs;
  }
  function getKeyIdFromInitSegment(segment) {
    const stsd = getChildBox(segment, [
      1836019574,
      1953653099,
      1835297121,
      1835626086,
      1937007212,
      1937011556
    ]);
    if (stsd === null) {
      return null;
    }
    const stsdSubBoxes = stsd.subarray(8);
    let encBox = getBoxContent(stsdSubBoxes, 1701733238);
    let encContentOffset = 0;
    if (encBox === null) {
      encContentOffset = 8 + 8 + 2 + 2 + 2 + 2 + 4;
      encBox = getBoxContent(stsdSubBoxes, 1701733217);
    } else {
      encContentOffset = 8 + 2 + 2 + 12 + 2 + 2 + 4 + 4 + 4 + 2 + 32 + 2 + 2;
    }
    if (encBox === null) {
      return null;
    }
    const tenc = getChildBox(encBox.subarray(encContentOffset), [
      1936289382,
      1935894633,
      1952804451
    ]);
    if (tenc === null || tenc.byteLength < 24) {
      return null;
    }
    return tenc.subarray(8, 24);
  }

  // src/worker/parsers/containers/matroska/index.ts
  init_define_ENVIRONMENT();

  // src/worker/parsers/containers/matroska/utils.ts
  init_define_ENVIRONMENT();
  var SEGMENT_ID = 408125543;
  var INFO_ID = 357149030;
  var TIMECODESCALE_ID = 2807729;
  var DURATION_ID = 17545;
  var CUES_ID = 475249515;
  var CUE_POINT_ID = 187;
  var CUE_TIME_ID = 179;
  var CUE_TRACK_POSITIONS_ID = 183;
  var CUE_CLUSTER_POSITIONS_ID = 241;
  function findNextElement(elementID, parents, buffer, [initialOffset, maxOffset]) {
    let currentOffset = initialOffset;
    while (currentOffset < maxOffset) {
      const parsedID = getEBMLID(buffer, currentOffset);
      if (parsedID == null) {
        return null;
      }
      const { value: ebmlTagID, length: ebmlTagLength } = parsedID;
      const sizeOffset = currentOffset + ebmlTagLength;
      const parsedValue = getEBMLValue(buffer, sizeOffset);
      if (parsedValue == null) {
        return null;
      }
      const { length: valueLengthLength, value: valueLength } = parsedValue;
      const valueOffset = sizeOffset + valueLengthLength;
      const valueEndOffset = valueOffset + valueLength;
      if (ebmlTagID === elementID) {
        return [valueOffset, valueEndOffset];
      } else if (parents.length > 0) {
        for (let i = 0; i < parents.length; i++) {
          if (ebmlTagID === parents[i]) {
            const newParents = parents.slice(i + 1, parents.length);
            return findNextElement(elementID, newParents, buffer, [valueOffset, valueEndOffset]);
          }
        }
      }
      currentOffset = valueEndOffset;
    }
    return null;
  }
  function getTimeCodeScale(buffer, initialOffset) {
    const timeCodeScaleOffsets = findNextElement(TIMECODESCALE_ID, [SEGMENT_ID, INFO_ID], buffer, [initialOffset, buffer.length]);
    if (timeCodeScaleOffsets == null) {
      return null;
    }
    const length = timeCodeScaleOffsets[1] - timeCodeScaleOffsets[0];
    return 1e9 / bytesToNumber(buffer, timeCodeScaleOffsets[0], length);
  }
  function getDuration(buffer, initialOffset) {
    const timeCodeScaleOffsets = findNextElement(DURATION_ID, [SEGMENT_ID, INFO_ID], buffer, [initialOffset, buffer.length]);
    if (timeCodeScaleOffsets == null) {
      return null;
    }
    const length = timeCodeScaleOffsets[1] - timeCodeScaleOffsets[0];
    if (length === 4) {
      return get_IEEE754_32Bits(buffer, timeCodeScaleOffsets[0]);
    } else if (length === 8) {
      return get_IEEE754_64Bits(buffer, timeCodeScaleOffsets[0]);
    }
    return null;
  }
  function getSegmentsFromCues(buffer, initialOffset) {
    const segmentRange = findNextElement(SEGMENT_ID, [], buffer, [initialOffset, buffer.length]);
    if (segmentRange == null) {
      return null;
    }
    const [segmentRangeStart, segmentRangeEnd] = segmentRange;
    const timescale = getTimeCodeScale(buffer, segmentRangeStart);
    if (timescale == null) {
      return null;
    }
    const duration = getDuration(buffer, segmentRangeStart);
    if (duration == null) {
      return null;
    }
    const cuesRange = findNextElement(CUES_ID, [], buffer, [segmentRangeStart, segmentRangeEnd]);
    if (cuesRange == null) {
      return null;
    }
    const rawInfos = [];
    let currentOffset = cuesRange[0];
    while (currentOffset < cuesRange[1]) {
      const cuePointRange = findNextElement(CUE_POINT_ID, [], buffer, [currentOffset, cuesRange[1]]);
      if (cuePointRange == null) {
        break;
      }
      const cueTimeRange = findNextElement(CUE_TIME_ID, [], buffer, [cuePointRange[0], cuePointRange[1]]);
      if (cueTimeRange == null) {
        return null;
      }
      const time = bytesToNumber(buffer, cueTimeRange[0], cueTimeRange[1] - cueTimeRange[0]);
      const cueOffsetRange = findNextElement(CUE_CLUSTER_POSITIONS_ID, [CUE_TRACK_POSITIONS_ID], buffer, [cuePointRange[0], cuePointRange[1]]);
      if (cueOffsetRange == null) {
        return null;
      }
      const rangeStart = bytesToNumber(buffer, cueOffsetRange[0], cueOffsetRange[1] - cueOffsetRange[0]) + segmentRangeStart;
      rawInfos.push({ time, rangeStart });
      currentOffset = cuePointRange[1];
    }
    const segments = [];
    for (let i = 0; i < rawInfos.length; i++) {
      const currentSegment = rawInfos[i];
      if (i === rawInfos.length - 1) {
        segments.push({
          time: currentSegment.time,
          timescale,
          duration: i === 0 ? duration : duration - currentSegment.time,
          range: [currentSegment.rangeStart, Infinity]
        });
      } else {
        segments.push({
          time: currentSegment.time,
          timescale,
          duration: rawInfos[i + 1].time - currentSegment.time,
          range: [currentSegment.rangeStart, rawInfos[i + 1].rangeStart - 1]
        });
      }
    }
    return segments;
  }
  function getLength(buffer, offset) {
    for (let length = 1; length <= 8; length++) {
      if (buffer[offset] >= Math.pow(2, 8 - length)) {
        return length;
      }
    }
    return void 0;
  }
  function getEBMLID(buffer, offset) {
    const length = getLength(buffer, offset);
    if (length == null) {
      log_default.warn("webm: unrepresentable length");
      return null;
    }
    if (offset + length > buffer.length) {
      log_default.warn("webm: impossible length");
      return null;
    }
    let value = 0;
    for (let i = 0; i < length; i++) {
      value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return { length, value };
  }
  function getEBMLValue(buffer, offset) {
    const length = getLength(buffer, offset);
    if (length == null) {
      log_default.warn("webm: unrepresentable length");
      return null;
    }
    if (offset + length > buffer.length) {
      log_default.warn("webm: impossible length");
      return null;
    }
    let value = (buffer[offset] & (1 << 8 - length) - 1) * Math.pow(2, (length - 1) * 8);
    for (let i = 1; i < length; i++) {
      value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return { length, value };
  }
  function get_IEEE754_32Bits(buffer, offset) {
    return new DataView(buffer.buffer).getFloat32(offset);
  }
  function get_IEEE754_64Bits(buffer, offset) {
    return new DataView(buffer.buffer).getFloat64(offset);
  }
  function bytesToNumber(buffer, offset, length) {
    let value = 0;
    for (let i = 0; i < length; i++) {
      value = buffer[offset + i] * Math.pow(2, (length - i - 1) * 8) + value;
    }
    return value;
  }

  // src/worker/parsers/manifest/dash/index.ts
  init_define_ENVIRONMENT();

  // src/worker/transports/utils/get_isobmff_timing_infos.ts
  init_define_ENVIRONMENT();
  function getISOBMFFTimingInfos(buffer, isChunked, segment, initTimescale) {
    const baseDecodeTime = getTrackFragmentDecodeTime(buffer);
    if (baseDecodeTime === void 0 || initTimescale === void 0) {
      return null;
    }
    let startTime = segment.timestampOffset !== void 0 ? baseDecodeTime + segment.timestampOffset * initTimescale : baseDecodeTime;
    let trunDuration = getDurationFromTrun(buffer);
    if (startTime < 0) {
      if (trunDuration !== void 0) {
        trunDuration += startTime;
      }
      startTime = 0;
    }
    if (isChunked || !segment.complete) {
      if (trunDuration === void 0) {
        log_default.warn("DASH: Chunked segments should indicate a duration through their trun boxes");
      }
      return {
        time: startTime / initTimescale,
        duration: trunDuration !== void 0 ? trunDuration / initTimescale : void 0
      };
    }
    let duration;
    const segmentDuration = segment.duration * initTimescale;
    const maxDecodeTimeDelta = Math.min(initTimescale * 0.9, segmentDuration / 4);
    if (trunDuration !== void 0 && Math.abs(trunDuration - segmentDuration) <= maxDecodeTimeDelta) {
      duration = trunDuration;
    }
    return {
      time: startTime / initTimescale,
      duration: duration !== void 0 ? duration / initTimescale : duration
    };
  }

  // src/worker/transports/dash/get_events_out_of_emsgs.ts
  init_define_ENVIRONMENT();
  function manifestNeedsToBeRefreshed(emsgs, manifestPublishTime) {
    if (emsgs.length <= 0) {
      return false;
    }
    const len = emsgs.length;
    for (let i = 0; i < len; i++) {
      const manifestRefreshEventFromEMSGs = emsgs[i];
      const currentManifestPublishTime = manifestPublishTime;
      const { messageData } = manifestRefreshEventFromEMSGs;
      const strPublishTime = utf8ToStr(messageData);
      const eventManifestPublishTime = Date.parse(strPublishTime);
      if (currentManifestPublishTime === void 0 || eventManifestPublishTime === void 0 || isNaN(eventManifestPublishTime) || eventManifestPublishTime >= currentManifestPublishTime) {
        return true;
      }
    }
    return false;
  }
  function getEventsOutOfEMSGs(parsedEMSGs, manifestPublishTime) {
    if (parsedEMSGs.length === 0) {
      return void 0;
    }
    const {
      manifestRefreshEventsFromEMSGs,
      EMSGs
    } = parsedEMSGs.reduce((acc, val) => {
      if (val.schemeIdUri === "urn:mpeg:dash:event:2012" && val.value === "1") {
        if (acc.manifestRefreshEventsFromEMSGs === void 0) {
          acc.manifestRefreshEventsFromEMSGs = [];
        }
        acc.manifestRefreshEventsFromEMSGs.push(val);
      } else {
        if (acc.EMSGs === void 0) {
          acc.EMSGs = [];
        }
        acc.EMSGs.push(val);
      }
      return acc;
    }, {
      manifestRefreshEventsFromEMSGs: void 0,
      EMSGs: void 0
    });
    const inbandEvents = EMSGs?.map((evt) => ({
      type: "emsg",
      value: evt
    }));
    const needsManifestRefresh = manifestPublishTime === void 0 || manifestRefreshEventsFromEMSGs === void 0 ? false : manifestNeedsToBeRefreshed(manifestRefreshEventsFromEMSGs, manifestPublishTime);
    return { inbandEvents, needsManifestRefresh };
  }

  // src/worker/transports/dash/segment_parser.ts
  function generateAudioVideoSegmentParser({ __priv_patchLastSegmentInSidx }) {
    return function audioVideoSegmentParser(loadedSegment, content, initTimescale) {
      const { period, adaptation, representation, segment, manifest } = content;
      const { data, isChunked } = loadedSegment;
      const appendWindow = [period.start, period.end];
      if (data === null) {
        if (segment.isInit) {
          return {
            segmentType: "init",
            initializationData: null,
            initializationDataSize: 0,
            protectionDataUpdate: false,
            initTimescale: void 0
          };
        }
        return {
          segmentType: "media",
          chunkData: null,
          chunkSize: 0,
          chunkInfos: null,
          chunkOffset: 0,
          protectionDataUpdate: false,
          appendWindow
        };
      }
      const chunkData = data instanceof Uint8Array ? data : new Uint8Array(data);
      const containerType = inferSegmentContainer(adaptation.type, representation);
      const seemsToBeMP4 = containerType === "mp4" || containerType === void 0;
      let protectionDataUpdate = false;
      if (seemsToBeMP4) {
        const psshInfo = takePSSHOut(chunkData);
        let keyId;
        if (segment.isInit) {
          keyId = getKeyIdFromInitSegment(chunkData) ?? void 0;
        }
        if (psshInfo.length > 0 || keyId !== void 0) {
          protectionDataUpdate = representation._addProtectionData("cenc", keyId, psshInfo);
        }
      }
      if (!segment.isInit) {
        const chunkInfos = seemsToBeMP4 ? getISOBMFFTimingInfos(chunkData, isChunked, segment, initTimescale) : null;
        const chunkOffset = takeFirstSet(segment.timestampOffset, 0);
        if (seemsToBeMP4) {
          const parsedEMSGs = parseEmsgBoxes(chunkData);
          if (parsedEMSGs !== void 0) {
            const whitelistedEMSGs = parsedEMSGs.filter((evt) => {
              if (segment.privateInfos === void 0 || segment.privateInfos.isEMSGWhitelisted === void 0) {
                return false;
              }
              return segment.privateInfos.isEMSGWhitelisted(evt);
            });
            const events = getEventsOutOfEMSGs(whitelistedEMSGs, manifest.publishTime);
            if (events !== void 0) {
              const { needsManifestRefresh, inbandEvents } = events;
              return {
                segmentType: "media",
                chunkData,
                chunkSize: chunkData.length,
                chunkInfos,
                chunkOffset,
                appendWindow,
                inbandEvents,
                protectionDataUpdate,
                needsManifestRefresh
              };
            }
          }
        }
        return {
          segmentType: "media",
          chunkData,
          chunkSize: chunkData.length,
          chunkInfos,
          chunkOffset,
          protectionDataUpdate,
          appendWindow
        };
      }
      const { indexRange } = segment;
      let nextSegments = null;
      if (containerType === "webm") {
        nextSegments = getSegmentsFromCues(chunkData, 0);
      } else if (seemsToBeMP4) {
        nextSegments = getSegmentsFromSidx(chunkData, Array.isArray(indexRange) ? indexRange[0] : 0);
        if (__priv_patchLastSegmentInSidx === true && nextSegments !== null && nextSegments.length > 0) {
          const lastSegment = nextSegments[nextSegments.length - 1];
          if (Array.isArray(lastSegment.range)) {
            lastSegment.range[1] = Infinity;
          }
        }
      }
      if (representation.index instanceof BaseRepresentationIndex && nextSegments !== null && nextSegments.length > 0) {
        representation.index.initializeIndex(nextSegments);
      }
      const timescale = seemsToBeMP4 ? getMDHDTimescale(chunkData) : containerType === "webm" ? getTimeCodeScale(chunkData, 0) : void 0;
      const parsedTimescale = isNullOrUndefined(timescale) ? void 0 : timescale;
      return {
        segmentType: "init",
        initializationData: chunkData,
        initializationDataSize: chunkData.length,
        protectionDataUpdate,
        initTimescale: parsedTimescale
      };
    };
  }

  // src/worker/transports/dash/text_loader.ts
  init_define_ENVIRONMENT();
  function generateTextTrackLoader({
    lowLatencyMode,
    checkMediaSegmentIntegrity
  }) {
    return checkMediaSegmentIntegrity !== true ? textTrackLoader : addSegmentIntegrityChecks(textTrackLoader);
    function textTrackLoader(url, content, cancelSignal, callbacks) {
      const { adaptation, representation, segment } = content;
      const { range } = segment;
      if (url === null) {
        return Promise.resolve({
          resultType: "segment-created",
          resultData: null
        });
      }
      if (segment.isInit) {
        return initSegmentLoader(url, segment, cancelSignal, callbacks);
      }
      const containerType = inferSegmentContainer(adaptation.type, representation);
      const seemsToBeMP4 = containerType === "mp4" || containerType === void 0;
      if (lowLatencyMode && seemsToBeMP4) {
        if (fetchIsSupported()) {
          return lowLatencySegmentLoader(url, content, callbacks, cancelSignal);
        } else {
          warnOnce("DASH: Your browser does not have the fetch API. You will have a higher chance of rebuffering when playing close to the live edge");
        }
      }
      if (seemsToBeMP4) {
        return request_default({
          url,
          responseType: "arraybuffer",
          headers: Array.isArray(range) ? { Range: byteRange(range) } : null,
          onProgress: callbacks.onProgress,
          cancelSignal
        }).then((data) => ({
          resultType: "segment-loaded",
          resultData: data
        }));
      }
      return request_default({
        url,
        responseType: "text",
        headers: Array.isArray(range) ? { Range: byteRange(range) } : null,
        onProgress: callbacks.onProgress,
        cancelSignal
      }).then((data) => ({
        resultType: "segment-loaded",
        resultData: data
      }));
    }
  }

  // src/worker/transports/dash/text_parser.ts
  init_define_ENVIRONMENT();

  // src/worker/transports/utils/parse_text_track.ts
  init_define_ENVIRONMENT();
  function extractTextTrackFromISOBMFF(chunkBytes) {
    const mdat = getMDAT(chunkBytes);
    return mdat === null ? "" : utf8ToStr(mdat);
  }
  function getISOBMFFTextTrackFormat(representation) {
    const codec = representation.codec;
    if (codec === void 0) {
      throw new Error("Cannot parse subtitles: unknown format");
    }
    switch (codec.toLowerCase()) {
      case "stpp":
      case "stpp.ttml.im1t":
        return "ttml";
      case "wvtt":
        return "vtt";
    }
    throw new Error(`The codec used for the subtitles "${codec}" is not managed yet.`);
  }
  function getPlainTextTrackFormat(representation) {
    const { mimeType = "" } = representation;
    switch (representation.mimeType) {
      case "application/ttml+xml":
        return "ttml";
      case "application/x-sami":
      case "application/smil":
        return "sami";
      case "text/vtt":
        return "vtt";
    }
    const { codec = "" } = representation;
    const codeLC = codec.toLowerCase();
    if (codeLC === "srt") {
      return "srt";
    }
    throw new Error(`could not find a text-track parser for the type ${mimeType}`);
  }
  function getISOBMFFEmbeddedTextTrackData({
    segment,
    adaptation,
    representation
  }, chunkBytes, chunkInfos, isChunked) {
    if (segment.isInit) {
      return null;
    }
    let startTime;
    let endTime;
    if (chunkInfos === null) {
      if (!isChunked) {
        log_default.warn("Transport: Unavailable time data for current text track.");
      } else {
        startTime = segment.time;
        endTime = segment.end;
      }
    } else {
      startTime = chunkInfos.time;
      if (chunkInfos.duration !== void 0) {
        endTime = startTime + chunkInfos.duration;
      } else if (!isChunked && segment.complete) {
        endTime = startTime + segment.duration;
      }
    }
    const type = getISOBMFFTextTrackFormat(representation);
    const textData = extractTextTrackFromISOBMFF(chunkBytes);
    return {
      data: textData,
      type,
      language: adaptation.language,
      start: startTime,
      end: endTime
    };
  }
  function getPlainTextTrackData({
    segment,
    adaptation,
    representation
  }, textTrackData, isChunked) {
    if (segment.isInit) {
      return null;
    }
    let start;
    let end;
    if (isChunked) {
      log_default.warn("Transport: Unavailable time data for current text track.");
    } else {
      start = segment.time;
      if (segment.complete) {
        end = segment.time + segment.duration;
      }
    }
    const type = getPlainTextTrackFormat(representation);
    return {
      data: textTrackData,
      type,
      language: adaptation.language,
      start,
      end
    };
  }

  // src/worker/transports/dash/text_parser.ts
  function parseISOBMFFEmbeddedTextTrack(data, isChunked, content, initTimescale, __priv_patchLastSegmentInSidx) {
    const { period, representation, segment } = content;
    const { isInit, indexRange } = segment;
    const chunkBytes = typeof data === "string" ? strToUtf8(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
    if (isInit) {
      const sidxSegments = getSegmentsFromSidx(chunkBytes, Array.isArray(indexRange) ? indexRange[0] : 0);
      if (__priv_patchLastSegmentInSidx === true && sidxSegments !== null && sidxSegments.length > 0) {
        const lastSegment = sidxSegments[sidxSegments.length - 1];
        if (Array.isArray(lastSegment.range)) {
          lastSegment.range[1] = Infinity;
        }
      }
      const mdhdTimescale = getMDHDTimescale(chunkBytes);
      if (representation.index instanceof BaseRepresentationIndex && sidxSegments !== null && sidxSegments.length > 0) {
        representation.index.initializeIndex(sidxSegments);
      }
      return {
        segmentType: "init",
        initializationData: null,
        initializationDataSize: 0,
        protectionDataUpdate: false,
        initTimescale: mdhdTimescale
      };
    }
    const chunkInfos = getISOBMFFTimingInfos(chunkBytes, isChunked, segment, initTimescale);
    const chunkData = getISOBMFFEmbeddedTextTrackData(content, chunkBytes, chunkInfos, isChunked);
    const chunkOffset = takeFirstSet(segment.timestampOffset, 0);
    return {
      segmentType: "media",
      chunkData,
      chunkSize: chunkBytes.length,
      chunkInfos,
      chunkOffset,
      protectionDataUpdate: false,
      appendWindow: [period.start, period.end]
    };
  }
  function parsePlainTextTrack(data, isChunked, content) {
    const { period, segment } = content;
    const { timestampOffset = 0 } = segment;
    if (segment.isInit) {
      return {
        segmentType: "init",
        initializationData: null,
        initializationDataSize: 0,
        protectionDataUpdate: false,
        initTimescale: void 0
      };
    }
    let textTrackData;
    let chunkSize;
    if (typeof data !== "string") {
      const bytesData = data instanceof Uint8Array ? data : new Uint8Array(data);
      textTrackData = utf8ToStr(bytesData);
      chunkSize = bytesData.length;
    } else {
      textTrackData = data;
    }
    const chunkData = getPlainTextTrackData(content, textTrackData, isChunked);
    return {
      segmentType: "media",
      chunkData,
      chunkSize,
      chunkInfos: null,
      chunkOffset: timestampOffset,
      protectionDataUpdate: false,
      appendWindow: [period.start, period.end]
    };
  }
  function generateTextTrackParser({ __priv_patchLastSegmentInSidx }) {
    return function textTrackParser(loadedSegment, content, initTimescale) {
      const { period, adaptation, representation, segment } = content;
      const { data, isChunked } = loadedSegment;
      if (data === null) {
        return segment.isInit ? {
          segmentType: "init",
          initializationData: null,
          initializationDataSize: 0,
          protectionDataUpdate: false,
          initTimescale: void 0
        } : {
          segmentType: "media",
          chunkData: null,
          chunkSize: 0,
          chunkInfos: null,
          chunkOffset: segment.timestampOffset ?? 0,
          protectionDataUpdate: false,
          appendWindow: [period.start, period.end]
        };
      }
      const containerType = inferSegmentContainer(adaptation.type, representation);
      if (containerType === "webm") {
        throw new Error("Text tracks with a WEBM container are not yet handled.");
      } else if (containerType === "mp4") {
        return parseISOBMFFEmbeddedTextTrack(data, isChunked, content, initTimescale, __priv_patchLastSegmentInSidx);
      } else {
        return parsePlainTextTrack(data, isChunked, content);
      }
    };
  }

  // src/worker/transports/dash/pipelines.ts
  function pipelines_default(options) {
    const manifestLoader = generateManifestLoader({ customManifestLoader: options.manifestLoader }, mightUseDashWasmFeature() ? "text" : "arraybuffer");
    const manifestParser = generateManifestParser(options);
    const segmentLoader = generateSegmentLoader(options);
    const audioVideoSegmentParser = generateAudioVideoSegmentParser(options);
    const textTrackLoader = generateTextTrackLoader(options);
    const textTrackParser = generateTextTrackParser(options);
    return {
      manifest: {
        loadManifest: manifestLoader,
        parseManifest: manifestParser
      },
      audio: {
        loadSegment: segmentLoader,
        parseSegment: audioVideoSegmentParser
      },
      video: {
        loadSegment: segmentLoader,
        parseSegment: audioVideoSegmentParser
      },
      text: {
        loadSegment: textTrackLoader,
        parseSegment: textTrackParser
      },
      image: {
        loadSegment: imageLoader,
        parseSegment: imageParser
      }
    };
  }
  function mightUseDashWasmFeature() {
    return features_default.dashParsers.wasm !== null && (features_default.dashParsers.wasm.status === "initialized" || features_default.dashParsers.wasm.status === "initializing");
  }

  // src/worker/transports/dash/index.ts
  var dash_default = pipelines_default;

  // src/worker/worker_content_store.ts
  init_define_ENVIRONMENT();

  // src/worker/core/adaptive/adaptive_representation_selector.ts
  init_define_ENVIRONMENT();

  // src/worker/core/adaptive/buffer_based_chooser.ts
  init_define_ENVIRONMENT();

  // src/worker/core/adaptive/utils/get_buffer_levels.ts
  init_define_ENVIRONMENT();
  function getBufferLevels(bitrates) {
    const logs = bitrates.map((b) => Math.log(b / bitrates[0]));
    const utilities = logs.map((l) => l - logs[0] + 1);
    const gp = (utilities[utilities.length - 1] - 1) / (bitrates.length * 2 + 10);
    const Vp = 1 / gp;
    return bitrates.map((_, i) => minBufferLevelForBitrate(i));
    function minBufferLevelForBitrate(index) {
      if (index === 0) {
        return 0;
      }
      const boundedIndex = Math.min(Math.max(1, index), bitrates.length - 1);
      if (bitrates[boundedIndex] === bitrates[boundedIndex - 1]) {
        return minBufferLevelForBitrate(index - 1);
      }
      return Vp * (gp + (bitrates[boundedIndex] * utilities[boundedIndex - 1] - bitrates[boundedIndex - 1] * utilities[boundedIndex]) / (bitrates[boundedIndex] - bitrates[boundedIndex - 1])) + 4;
    }
  }

  // src/worker/core/adaptive/buffer_based_chooser.ts
  var BufferBasedChooser = class {
    _levelsMap;
    _bitrates;
    constructor(bitrates) {
      this._levelsMap = getBufferLevels(bitrates);
      this._bitrates = bitrates;
      log_default.debug("ABR: Steps for buffer based chooser.", this._levelsMap.map((l, i) => `bufferLevel: ${l}, bitrate: ${bitrates[i]}`).join(" ,"));
    }
    getEstimate(playbackObservation) {
      const bufferLevels = this._levelsMap;
      const bitrates = this._bitrates;
      const { bufferGap, currentBitrate, currentScore, speed: speed2 } = playbackObservation;
      if (currentBitrate == null) {
        return bitrates[0];
      }
      const currentBitrateIndex = arrayFindIndex(bitrates, (b) => b === currentBitrate);
      if (currentBitrateIndex < 0 || bitrates.length !== bufferLevels.length) {
        log_default.error("ABR: Current Bitrate not found in the calculated levels");
        return bitrates[0];
      }
      let scaledScore;
      if (currentScore != null) {
        scaledScore = speed2 === 0 ? currentScore : currentScore / speed2;
      }
      if (scaledScore != null && scaledScore > 1) {
        const currentBufferLevel = bufferLevels[currentBitrateIndex];
        const nextIndex = (() => {
          for (let i = currentBitrateIndex + 1; i < bufferLevels.length; i++) {
            if (bufferLevels[i] > currentBufferLevel) {
              return i;
            }
          }
        })();
        if (nextIndex != null) {
          const nextBufferLevel = bufferLevels[nextIndex];
          if (bufferGap >= nextBufferLevel) {
            return bitrates[nextIndex];
          }
        }
      }
      if (scaledScore == null || scaledScore < 1.15) {
        const currentBufferLevel = bufferLevels[currentBitrateIndex];
        if (bufferGap < currentBufferLevel) {
          for (let i = currentBitrateIndex - 1; i >= 0; i--) {
            if (bitrates[i] < currentBitrate) {
              return bitrates[i];
            }
          }
          return currentBitrate;
        }
      }
      return currentBitrate;
    }
  };

  // src/worker/core/adaptive/guess_based_chooser.ts
  init_define_ENVIRONMENT();

  // src/worker/core/adaptive/network_analyzer.ts
  init_define_ENVIRONMENT();

  // src/worker/core/adaptive/utils/ewma.ts
  init_define_ENVIRONMENT();
  var EWMA = class {
    _alpha;
    _lastEstimate;
    _totalWeight;
    constructor(halfLife) {
      this._alpha = Math.exp(Math.log(0.5) / halfLife);
      this._lastEstimate = 0;
      this._totalWeight = 0;
    }
    addSample(weight, value) {
      const adjAlpha = Math.pow(this._alpha, weight);
      const newEstimate = value * (1 - adjAlpha) + adjAlpha * this._lastEstimate;
      if (!isNaN(newEstimate)) {
        this._lastEstimate = newEstimate;
        this._totalWeight += weight;
      }
    }
    getEstimate() {
      const zeroFactor = 1 - Math.pow(this._alpha, this._totalWeight);
      return this._lastEstimate / zeroFactor;
    }
  };

  // src/worker/core/adaptive/network_analyzer.ts
  function getConcernedRequests(requests, neededPosition) {
    let nextSegmentIndex = -1;
    for (let i = 0; i < requests.length; i++) {
      const { segment } = requests[i].content;
      if (segment.duration <= 0) {
        continue;
      }
      const segmentEnd = segment.time + segment.duration;
      if (!segment.complete) {
        if (i === requests.length - 1 && neededPosition - segment.time > -1.2) {
          nextSegmentIndex = i;
          break;
        }
      }
      if (segmentEnd > neededPosition && neededPosition - segment.time > -1.2) {
        nextSegmentIndex = i;
        break;
      }
    }
    if (nextSegmentIndex < 0) {
      return [];
    }
    const nextRequest = requests[nextSegmentIndex];
    const segmentTime = nextRequest.content.segment.time;
    const filteredRequests = [nextRequest];
    for (let i = nextSegmentIndex + 1; i < requests.length; i++) {
      if (requests[i].content.segment.time === segmentTime) {
        filteredRequests.push(requests[i]);
      } else {
        break;
      }
    }
    return filteredRequests;
  }
  function estimateRequestBandwidth(request2) {
    if (request2.progress.length < 5) {
      return void 0;
    }
    const ewma1 = new EWMA(2);
    const { progress } = request2;
    for (let i = 1; i < progress.length; i++) {
      const bytesDownloaded = progress[i].size - progress[i - 1].size;
      const timeElapsed = progress[i].timestamp - progress[i - 1].timestamp;
      const reqBitrate = bytesDownloaded * 8 / (timeElapsed / 1e3);
      ewma1.addSample(timeElapsed / 1e3, reqBitrate);
    }
    return ewma1.getEstimate();
  }
  function estimateRemainingTime(lastProgressEvent, bandwidthEstimate) {
    const remainingData = (lastProgressEvent.totalSize - lastProgressEvent.size) * 8;
    return Math.max(remainingData / bandwidthEstimate, 0);
  }
  function estimateStarvationModeBitrate(pendingRequests, playbackInfo, currentRepresentation, lowLatencyMode, lastEstimatedBitrate) {
    if (lowLatencyMode) {
      return void 0;
    }
    const { bufferGap, speed: speed2, position } = playbackInfo;
    const realBufferGap = isFinite(bufferGap) ? bufferGap : 0;
    const nextNeededPosition = position.last + realBufferGap;
    const concernedRequests = getConcernedRequests(pendingRequests, nextNeededPosition);
    if (concernedRequests.length !== 1) {
      return void 0;
    }
    const concernedRequest = concernedRequests[0];
    const now = performance.now();
    const lastProgressEvent = concernedRequest.progress.length > 0 ? concernedRequest.progress[concernedRequest.progress.length - 1] : void 0;
    const bandwidthEstimate = estimateRequestBandwidth(concernedRequest);
    if (lastProgressEvent !== void 0 && bandwidthEstimate !== void 0) {
      const remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate);
      if ((now - lastProgressEvent.timestamp) / 1e3 <= remainingTime) {
        const expectedRebufferingTime = remainingTime - realBufferGap / speed2;
        if (expectedRebufferingTime > 2e3) {
          return bandwidthEstimate;
        }
      }
    }
    if (!concernedRequest.content.segment.complete) {
      return void 0;
    }
    const chunkDuration = concernedRequest.content.segment.duration;
    const requestElapsedTime = (now - concernedRequest.requestTimestamp) / 1e3;
    const reasonableElapsedTime = requestElapsedTime <= (chunkDuration * 1.5 + 2) / speed2;
    if (currentRepresentation == null || reasonableElapsedTime) {
      return void 0;
    }
    const factor = chunkDuration / requestElapsedTime;
    const reducedBitrate = currentRepresentation.bitrate * Math.min(0.7, factor);
    if (lastEstimatedBitrate === void 0 || reducedBitrate < lastEstimatedBitrate) {
      return reducedBitrate;
    }
  }
  function shouldDirectlySwitchToLowBitrate(playbackInfo, requests, lowLatencyMode) {
    if (lowLatencyMode) {
      return true;
    }
    const realBufferGap = isFinite(playbackInfo.bufferGap) ? playbackInfo.bufferGap : 0;
    const nextNeededPosition = playbackInfo.position.last + realBufferGap;
    const nextRequest = arrayFind(requests, ({ content }) => content.segment.duration > 0 && content.segment.time + content.segment.duration > nextNeededPosition);
    if (nextRequest === void 0) {
      return true;
    }
    const now = performance.now();
    const lastProgressEvent = nextRequest.progress.length > 0 ? nextRequest.progress[nextRequest.progress.length - 1] : void 0;
    const bandwidthEstimate = estimateRequestBandwidth(nextRequest);
    if (lastProgressEvent === void 0 || bandwidthEstimate === void 0) {
      return true;
    }
    const remainingTime = estimateRemainingTime(lastProgressEvent, bandwidthEstimate);
    if ((now - lastProgressEvent.timestamp) / 1e3 > remainingTime * 1.2) {
      return true;
    }
    const expectedRebufferingTime = remainingTime - realBufferGap / playbackInfo.speed;
    return expectedRebufferingTime > -1.5;
  }
  var NetworkAnalyzer = class {
    _lowLatencyMode;
    _inStarvationMode;
    _initialBitrate;
    _config;
    constructor(initialBitrate, lowLatencyMode) {
      const {
        ABR_STARVATION_GAP,
        OUT_OF_STARVATION_GAP,
        ABR_STARVATION_FACTOR,
        ABR_REGULAR_FACTOR
      } = config_default.getCurrent();
      this._initialBitrate = initialBitrate;
      this._inStarvationMode = false;
      this._lowLatencyMode = lowLatencyMode;
      if (lowLatencyMode) {
        this._config = {
          starvationGap: ABR_STARVATION_GAP.LOW_LATENCY,
          outOfStarvationGap: OUT_OF_STARVATION_GAP.LOW_LATENCY,
          starvationBitrateFactor: ABR_STARVATION_FACTOR.LOW_LATENCY,
          regularBitrateFactor: ABR_REGULAR_FACTOR.LOW_LATENCY
        };
      } else {
        this._config = {
          starvationGap: ABR_STARVATION_GAP.DEFAULT,
          outOfStarvationGap: OUT_OF_STARVATION_GAP.DEFAULT,
          starvationBitrateFactor: ABR_STARVATION_FACTOR.DEFAULT,
          regularBitrateFactor: ABR_REGULAR_FACTOR.DEFAULT
        };
      }
    }
    getBandwidthEstimate(playbackInfo, bandwidthEstimator, currentRepresentation, currentRequests, lastEstimatedBitrate) {
      let newBitrateCeil;
      let bandwidthEstimate;
      const localConf = this._config;
      const { bufferGap, position, duration } = playbackInfo;
      const realBufferGap = isFinite(bufferGap) ? bufferGap : 0;
      const { ABR_STARVATION_DURATION_DELTA } = config_default.getCurrent();
      if (isNaN(duration) || realBufferGap + position.last < duration - ABR_STARVATION_DURATION_DELTA) {
        if (!this._inStarvationMode && realBufferGap <= localConf.starvationGap) {
          log_default.info("ABR: enter starvation mode.");
          this._inStarvationMode = true;
        } else if (this._inStarvationMode && realBufferGap >= localConf.outOfStarvationGap) {
          log_default.info("ABR: exit starvation mode.");
          this._inStarvationMode = false;
        }
      } else if (this._inStarvationMode) {
        log_default.info("ABR: exit starvation mode.");
        this._inStarvationMode = false;
      }
      if (this._inStarvationMode) {
        bandwidthEstimate = estimateStarvationModeBitrate(currentRequests, playbackInfo, currentRepresentation, this._lowLatencyMode, lastEstimatedBitrate);
        if (bandwidthEstimate != null) {
          log_default.info("ABR: starvation mode emergency estimate:", bandwidthEstimate);
          bandwidthEstimator.reset();
          newBitrateCeil = currentRepresentation == null ? bandwidthEstimate : Math.min(bandwidthEstimate, currentRepresentation.bitrate);
        }
      }
      if (newBitrateCeil == null) {
        bandwidthEstimate = bandwidthEstimator.getEstimate();
        if (bandwidthEstimate != null) {
          newBitrateCeil = bandwidthEstimate * (this._inStarvationMode ? localConf.starvationBitrateFactor : localConf.regularBitrateFactor);
        } else if (lastEstimatedBitrate != null) {
          newBitrateCeil = lastEstimatedBitrate * (this._inStarvationMode ? localConf.starvationBitrateFactor : localConf.regularBitrateFactor);
        } else {
          newBitrateCeil = this._initialBitrate;
        }
      }
      if (playbackInfo.speed > 1) {
        newBitrateCeil /= playbackInfo.speed;
      }
      return { bandwidthEstimate, bitrateChosen: newBitrateCeil };
    }
    isUrgent(bitrate, currentRepresentation, currentRequests, playbackInfo) {
      if (currentRepresentation === null) {
        return true;
      } else if (bitrate === currentRepresentation.bitrate) {
        return false;
      } else if (bitrate > currentRepresentation.bitrate) {
        return !this._inStarvationMode;
      }
      return shouldDirectlySwitchToLowBitrate(playbackInfo, currentRequests, this._lowLatencyMode);
    }
  };

  // src/worker/core/adaptive/utils/last_estimate_storage.ts
  init_define_ENVIRONMENT();
  var LastEstimateStorage = class {
    bandwidth;
    representation;
    algorithmType;
    constructor() {
      this.bandwidth = void 0;
      this.representation = null;
      this.algorithmType = ABRAlgorithmType.None;
    }
    update(representation, bandwidth, algorithmType) {
      this.representation = representation;
      this.bandwidth = bandwidth;
      this.algorithmType = algorithmType;
    }
  };
  var ABRAlgorithmType = /* @__PURE__ */ ((ABRAlgorithmType2) => {
    ABRAlgorithmType2[ABRAlgorithmType2["BufferBased"] = 0] = "BufferBased";
    ABRAlgorithmType2[ABRAlgorithmType2["BandwidthBased"] = 1] = "BandwidthBased";
    ABRAlgorithmType2[ABRAlgorithmType2["GuessBased"] = 2] = "GuessBased";
    ABRAlgorithmType2[ABRAlgorithmType2["None"] = 3] = "None";
    return ABRAlgorithmType2;
  })(ABRAlgorithmType || {});

  // src/worker/core/adaptive/utils/representation_score_calculator.ts
  init_define_ENVIRONMENT();
  var RepresentationScoreCalculator = class {
    _currentRepresentationData;
    _lastRepresentationWithGoodScore;
    constructor() {
      this._currentRepresentationData = null;
      this._lastRepresentationWithGoodScore = null;
    }
    addSample(representation, requestDuration, segmentDuration) {
      const ratio = segmentDuration / requestDuration;
      const currentRep = this._currentRepresentationData;
      let currentEWMA;
      if (currentRep !== null && currentRep.representation.id === representation.id) {
        currentEWMA = currentRep.ewma;
        currentRep.ewma.addSample(requestDuration, ratio);
        currentRep.loadedDuration += segmentDuration;
        currentRep.loadedSegments++;
      } else {
        currentEWMA = new EWMA(5);
        currentEWMA.addSample(requestDuration, ratio);
        this._currentRepresentationData = {
          representation,
          ewma: currentEWMA,
          loadedDuration: segmentDuration,
          loadedSegments: 0
        };
      }
      if (currentEWMA.getEstimate() > 1 && this._lastRepresentationWithGoodScore !== representation) {
        log_default.debug("ABR: New last stable representation", representation.bitrate);
        this._lastRepresentationWithGoodScore = representation;
      }
    }
    getEstimate(representation) {
      if (this._currentRepresentationData === null || this._currentRepresentationData.representation.id !== representation.id) {
        return void 0;
      }
      const { ewma, loadedSegments, loadedDuration } = this._currentRepresentationData;
      const estimate = ewma.getEstimate();
      const confidenceLevel = loadedSegments >= 5 && loadedDuration >= 10 ? ScoreConfidenceLevel.HIGH : ScoreConfidenceLevel.LOW;
      return [estimate, confidenceLevel];
    }
    getLastStableRepresentation() {
      return this._lastRepresentationWithGoodScore;
    }
  };
  var ScoreConfidenceLevel = /* @__PURE__ */ ((ScoreConfidenceLevel2) => {
    ScoreConfidenceLevel2[ScoreConfidenceLevel2["HIGH"] = 1] = "HIGH";
    ScoreConfidenceLevel2[ScoreConfidenceLevel2["LOW"] = 0] = "LOW";
    return ScoreConfidenceLevel2;
  })(ScoreConfidenceLevel || {});

  // src/worker/core/adaptive/guess_based_chooser.ts
  var GuessBasedChooser = class {
    _lastAbrEstimate;
    _scoreCalculator;
    _consecutiveWrongGuesses;
    _blockGuessesUntil;
    _lastMaintanableBitrate;
    constructor(scoreCalculator, prevEstimate) {
      this._scoreCalculator = scoreCalculator;
      this._lastAbrEstimate = prevEstimate;
      this._consecutiveWrongGuesses = 0;
      this._blockGuessesUntil = 0;
      this._lastMaintanableBitrate = null;
    }
    getGuess(representations, observation, currentRepresentation, incomingBestBitrate, requests) {
      const { bufferGap, speed: speed2 } = observation;
      const lastChosenRep = this._lastAbrEstimate.representation;
      if (lastChosenRep === null) {
        return null;
      }
      if (incomingBestBitrate > lastChosenRep.bitrate) {
        if (this._lastAbrEstimate.algorithmType === 2 /* GuessBased */) {
          if (this._lastAbrEstimate.representation !== null) {
            this._lastMaintanableBitrate = this._lastAbrEstimate.representation.bitrate;
          }
          this._consecutiveWrongGuesses = 0;
        }
        return null;
      }
      const scoreData = this._scoreCalculator.getEstimate(currentRepresentation);
      if (this._lastAbrEstimate.algorithmType !== 2 /* GuessBased */) {
        if (scoreData === void 0) {
          return null;
        }
        if (this._canGuessHigher(bufferGap, speed2, scoreData)) {
          const nextRepresentation = getNextRepresentation(representations, currentRepresentation);
          if (nextRepresentation !== null) {
            return nextRepresentation;
          }
        }
        return null;
      }
      if (this._isLastGuessValidated(lastChosenRep, incomingBestBitrate, scoreData)) {
        log_default.debug("ABR: Guessed Representation validated", lastChosenRep.bitrate);
        this._lastMaintanableBitrate = lastChosenRep.bitrate;
        this._consecutiveWrongGuesses = 0;
      }
      if (currentRepresentation.id !== lastChosenRep.id) {
        return lastChosenRep;
      }
      const shouldStopGuess = this._shouldStopGuess(currentRepresentation, scoreData, bufferGap, requests);
      if (shouldStopGuess) {
        this._consecutiveWrongGuesses++;
        this._blockGuessesUntil = performance.now() + Math.min(this._consecutiveWrongGuesses * 15e3, 12e4);
        return getPreviousRepresentation(representations, currentRepresentation);
      } else if (scoreData === void 0) {
        return currentRepresentation;
      }
      if (this._canGuessHigher(bufferGap, speed2, scoreData)) {
        const nextRepresentation = getNextRepresentation(representations, currentRepresentation);
        if (nextRepresentation !== null) {
          return nextRepresentation;
        }
      }
      return currentRepresentation;
    }
    _canGuessHigher(bufferGap, speed2, [score, scoreConfidenceLevel]) {
      return isFinite(bufferGap) && bufferGap >= 2.5 && performance.now() > this._blockGuessesUntil && scoreConfidenceLevel === 1 /* HIGH */ && score / speed2 > 1.01;
    }
    _shouldStopGuess(lastGuess, scoreData, bufferGap, requests) {
      if (scoreData !== void 0 && scoreData[0] < 1.01) {
        return true;
      } else if ((scoreData === void 0 || scoreData[0] < 1.2) && bufferGap < 0.6) {
        return true;
      }
      const guessedRepresentationRequests = requests.filter((req) => {
        return req.content.representation.id === lastGuess.id;
      });
      const now = performance.now();
      for (const req of guessedRepresentationRequests) {
        const requestElapsedTime = now - req.requestTimestamp;
        if (req.content.segment.isInit) {
          if (requestElapsedTime > 1e3) {
            return true;
          }
        } else if (requestElapsedTime > req.content.segment.duration * 1e3 + 200) {
          return true;
        } else {
          const fastBw = estimateRequestBandwidth(req);
          if (fastBw !== void 0 && fastBw < lastGuess.bitrate * 0.8) {
            return true;
          }
        }
      }
      return false;
    }
    _isLastGuessValidated(lastGuess, incomingBestBitrate, scoreData) {
      if (scoreData !== void 0 && scoreData[1] === 1 /* HIGH */ && scoreData[0] > 1.5) {
        return true;
      }
      return incomingBestBitrate >= lastGuess.bitrate && (this._lastMaintanableBitrate === null || this._lastMaintanableBitrate < lastGuess.bitrate);
    }
  };
  function getNextRepresentation(representations, currentRepresentation) {
    const len = representations.length;
    let index = arrayFindIndex(representations, ({ id }) => id === currentRepresentation.id);
    if (index < 0) {
      log_default.error("ABR: Current Representation not found.");
      return null;
    }
    while (++index < len) {
      if (representations[index].bitrate > currentRepresentation.bitrate) {
        return representations[index];
      }
    }
    return null;
  }
  function getPreviousRepresentation(representations, currentRepresentation) {
    let index = arrayFindIndex(representations, ({ id }) => id === currentRepresentation.id);
    if (index < 0) {
      log_default.error("ABR: Current Representation not found.");
      return null;
    }
    while (--index >= 0) {
      if (representations[index].bitrate < currentRepresentation.bitrate) {
        return representations[index];
      }
    }
    return null;
  }

  // src/worker/core/adaptive/utils/bandwidth_estimator.ts
  init_define_ENVIRONMENT();
  var BandwidthEstimator = class {
    _fastEWMA;
    _slowEWMA;
    _bytesSampled;
    constructor() {
      const { ABR_FAST_EMA, ABR_SLOW_EMA } = config_default.getCurrent();
      this._fastEWMA = new EWMA(ABR_FAST_EMA);
      this._slowEWMA = new EWMA(ABR_SLOW_EMA);
      this._bytesSampled = 0;
    }
    addSample(durationInMs, numberOfBytes) {
      const { ABR_MINIMUM_CHUNK_SIZE } = config_default.getCurrent();
      if (numberOfBytes < ABR_MINIMUM_CHUNK_SIZE) {
        return;
      }
      const bandwidth = numberOfBytes * 8e3 / durationInMs;
      const weight = durationInMs / 1e3;
      this._bytesSampled += numberOfBytes;
      this._fastEWMA.addSample(weight, bandwidth);
      this._slowEWMA.addSample(weight, bandwidth);
    }
    getEstimate() {
      const { ABR_MINIMUM_TOTAL_BYTES } = config_default.getCurrent();
      if (this._bytesSampled < ABR_MINIMUM_TOTAL_BYTES) {
        return void 0;
      }
      return Math.min(this._fastEWMA.getEstimate(), this._slowEWMA.getEstimate());
    }
    reset() {
      const { ABR_FAST_EMA, ABR_SLOW_EMA } = config_default.getCurrent();
      this._fastEWMA = new EWMA(ABR_FAST_EMA);
      this._slowEWMA = new EWMA(ABR_SLOW_EMA);
      this._bytesSampled = 0;
    }
  };

  // src/worker/core/adaptive/utils/filter_by_bitrate.ts
  init_define_ENVIRONMENT();
  function filterByBitrate(representations, bitrate) {
    if (representations.length === 0) {
      return [];
    }
    representations.sort((ra, rb) => ra.bitrate - rb.bitrate);
    const minimumBitrate = representations[0].bitrate;
    const bitrateCeil = Math.max(bitrate, minimumBitrate);
    const firstSuperiorBitrateIndex = arrayFindIndex(representations, (representation) => representation.bitrate > bitrateCeil);
    if (firstSuperiorBitrateIndex === -1) {
      return representations;
    }
    return representations.slice(0, firstSuperiorBitrateIndex);
  }

  // src/worker/core/adaptive/utils/filter_by_width.ts
  init_define_ENVIRONMENT();
  function filterByWidth(representations, width) {
    const sortedRepsByWidth = representations.slice().sort((a, b) => takeFirstSet(a.width, 0) - takeFirstSet(b.width, 0));
    const repWithMaxWidth = arrayFind(sortedRepsByWidth, (representation) => typeof representation.width === "number" && representation.width >= width);
    if (repWithMaxWidth === void 0) {
      return representations;
    }
    const maxWidth = typeof repWithMaxWidth.width === "number" ? repWithMaxWidth.width : 0;
    return representations.filter((representation) => typeof representation.width === "number" ? representation.width <= maxWidth : true);
  }

  // src/worker/core/adaptive/utils/pending_requests_store.ts
  init_define_ENVIRONMENT();
  var PendingRequestsStore = class {
    _currentRequests;
    constructor() {
      this._currentRequests = {};
    }
    add(payload) {
      const { id, requestTimestamp, content } = payload;
      this._currentRequests[id] = {
        requestTimestamp,
        progress: [],
        content
      };
    }
    addProgress(progress) {
      const request2 = this._currentRequests[progress.id];
      if (request2 == null) {
        if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.DEV) {
          throw new Error("ABR: progress for a request not added");
        }
        log_default.warn("ABR: progress for a request not added");
        return;
      }
      request2.progress.push(progress);
    }
    remove(id) {
      if (this._currentRequests[id] == null) {
        if (define_ENVIRONMENT_default.CURRENT_ENV === define_ENVIRONMENT_default.DEV) {
          throw new Error("ABR: can't remove unknown request");
        }
        log_default.warn("ABR: can't remove unknown request");
      }
      delete this._currentRequests[id];
    }
    getRequests() {
      return object_values_default(this._currentRequests).filter((x) => x != null).sort((reqA, reqB) => reqA.content.segment.time - reqB.content.segment.time);
    }
  };

  // src/worker/core/adaptive/utils/select_optimal_representation.ts
  init_define_ENVIRONMENT();
  function selectOptimalRepresentation(representations, optimalBitrate, minBitrate, maxBitrate) {
    const wantedBitrate = optimalBitrate <= minBitrate ? minBitrate : optimalBitrate >= maxBitrate ? maxBitrate : optimalBitrate;
    const firstIndexTooHigh = arrayFindIndex(representations, (representation) => representation.bitrate > wantedBitrate);
    if (firstIndexTooHigh === -1) {
      return representations[representations.length - 1];
    } else if (firstIndexTooHigh === 0) {
      return representations[0];
    }
    return representations[firstIndexTooHigh - 1];
  }

  // src/worker/core/adaptive/adaptive_representation_selector.ts
  function createAdaptiveRepresentationSelector(options) {
    const bandwidthEstimators = {};
    const {
      manualBitrates,
      minAutoBitrates,
      maxAutoBitrates,
      initialBitrates,
      throttlers,
      lowLatencyMode
    } = options;
    return function getEstimates(context2, currentRepresentation, representations, playbackObserver2, stopAllEstimates) {
      const { type } = context2.adaptation;
      const bandwidthEstimator = _getBandwidthEstimator(type);
      const manualBitrate = takeFirstSet(manualBitrates[type], reference_default(-1));
      const minAutoBitrate = takeFirstSet(minAutoBitrates[type], reference_default(0));
      const maxAutoBitrate = takeFirstSet(maxAutoBitrates[type], reference_default(Infinity));
      const initialBitrate = takeFirstSet(initialBitrates[type], 0);
      const filters = {
        limitWidth: takeFirstSet(throttlers.limitWidth[type], reference_default(void 0)),
        throttleBitrate: takeFirstSet(throttlers.throttleBitrate[type], throttlers.throttle[type], reference_default(Infinity))
      };
      return getEstimateReference({
        bandwidthEstimator,
        context: context2,
        currentRepresentation,
        filters,
        initialBitrate,
        manualBitrate,
        minAutoBitrate,
        maxAutoBitrate,
        playbackObserver: playbackObserver2,
        representations,
        lowLatencyMode
      }, stopAllEstimates);
    };
    function _getBandwidthEstimator(bufferType) {
      const originalBandwidthEstimator = bandwidthEstimators[bufferType];
      if (originalBandwidthEstimator == null) {
        log_default.debug("ABR: Creating new BandwidthEstimator for ", bufferType);
        const bandwidthEstimator = new BandwidthEstimator();
        bandwidthEstimators[bufferType] = bandwidthEstimator;
        return bandwidthEstimator;
      }
      return originalBandwidthEstimator;
    }
  }
  function getEstimateReference({
    bandwidthEstimator,
    context: context2,
    currentRepresentation,
    filters,
    initialBitrate,
    lowLatencyMode,
    manualBitrate,
    maxAutoBitrate,
    minAutoBitrate,
    playbackObserver: playbackObserver2,
    representations: representationsRef
  }, stopAllEstimates) {
    const scoreCalculator = new RepresentationScoreCalculator();
    const networkAnalyzer = new NetworkAnalyzer(initialBitrate ?? 0, lowLatencyMode);
    const requestsStore = new PendingRequestsStore();
    let onAddedSegment = noop_default;
    const callbacks = {
      metrics: onMetric,
      requestBegin: onRequestBegin,
      requestProgress: onRequestProgress,
      requestEnd: onRequestEnd,
      addedSegment(val) {
        onAddedSegment(val);
      }
    };
    let currentEstimatesCanceller = new TaskCanceller({ cancelOn: stopAllEstimates });
    const estimateRef = createEstimateReference(manualBitrate.getValue(), representationsRef.getValue(), currentEstimatesCanceller.signal);
    manualBitrate.onUpdate(restartEstimatesProductionFromCurrentConditions, { clearSignal: stopAllEstimates });
    representationsRef.onUpdate(restartEstimatesProductionFromCurrentConditions, { clearSignal: stopAllEstimates });
    return { estimates: estimateRef, callbacks };
    function createEstimateReference(manualBitrateVal, representations, innerCancellationSignal) {
      if (manualBitrateVal >= 0) {
        const manualRepresentation = selectOptimalRepresentation(representations, manualBitrateVal, 0, Infinity);
        return reference_default({
          representation: manualRepresentation,
          bitrate: void 0,
          knownStableBitrate: void 0,
          manual: true,
          urgent: true
        });
      }
      if (representations.length === 1) {
        return reference_default({
          bitrate: void 0,
          representation: representations[0],
          manual: false,
          urgent: true,
          knownStableBitrate: void 0
        });
      }
      let allowBufferBasedEstimates = false;
      let currentBufferBasedEstimate;
      const bitrates = representations.map((r) => r.bitrate);
      const bufferBasedChooser = new BufferBasedChooser(bitrates);
      const prevEstimate = new LastEstimateStorage();
      const guessBasedChooser = new GuessBasedChooser(scoreCalculator, prevEstimate);
      let lastPlaybackObservation = playbackObserver2.getReference().getValue();
      const innerEstimateRef = reference_default(getCurrentEstimate());
      playbackObserver2.listen((obs) => {
        lastPlaybackObservation = obs;
        updateEstimate();
      }, { includeLastObservation: false, clearSignal: innerCancellationSignal });
      onAddedSegment = function(val) {
        if (lastPlaybackObservation === null) {
          return;
        }
        const { position, speed: speed2 } = lastPlaybackObservation;
        const timeRanges = val.buffered;
        const bufferGap = getLeftSizeOfRange(timeRanges, position.last);
        const { representation } = val.content;
        const scoreData = scoreCalculator.getEstimate(representation);
        const currentScore = scoreData?.[0];
        const currentBitrate = representation.bitrate;
        const observation = { bufferGap, currentBitrate, currentScore, speed: speed2 };
        currentBufferBasedEstimate = bufferBasedChooser.getEstimate(observation);
        updateEstimate();
      };
      minAutoBitrate.onUpdate(updateEstimate, { clearSignal: innerCancellationSignal });
      maxAutoBitrate.onUpdate(updateEstimate, { clearSignal: innerCancellationSignal });
      filters.limitWidth.onUpdate(updateEstimate, { clearSignal: innerCancellationSignal });
      filters.limitWidth.onUpdate(updateEstimate, { clearSignal: innerCancellationSignal });
      return innerEstimateRef;
      function updateEstimate() {
        innerEstimateRef.setValue(getCurrentEstimate());
      }
      function getCurrentEstimate() {
        const { bufferGap, position, maximumPosition } = lastPlaybackObservation;
        const widthLimit = filters.limitWidth.getValue();
        const bitrateThrottle = filters.throttleBitrate.getValue();
        const currentRepresentationVal = currentRepresentation.getValue();
        const minAutoBitrateVal = minAutoBitrate.getValue();
        const maxAutoBitrateVal = maxAutoBitrate.getValue();
        const filteredReps = getFilteredRepresentations(representations, widthLimit, bitrateThrottle);
        const requests = requestsStore.getRequests();
        const { bandwidthEstimate, bitrateChosen } = networkAnalyzer.getBandwidthEstimate(lastPlaybackObservation, bandwidthEstimator, currentRepresentationVal, requests, prevEstimate.bandwidth);
        const stableRepresentation = scoreCalculator.getLastStableRepresentation();
        const knownStableBitrate = stableRepresentation === null ? void 0 : stableRepresentation.bitrate / (lastPlaybackObservation.speed > 0 ? lastPlaybackObservation.speed : 1);
        if (allowBufferBasedEstimates && bufferGap <= 5) {
          allowBufferBasedEstimates = false;
        } else if (!allowBufferBasedEstimates && isFinite(bufferGap) && bufferGap > 10) {
          allowBufferBasedEstimates = true;
        }
        const chosenRepFromBandwidth = selectOptimalRepresentation(filteredReps, bitrateChosen, minAutoBitrateVal, maxAutoBitrateVal);
        let currentBestBitrate = chosenRepFromBandwidth.bitrate;
        let chosenRepFromBufferSize = null;
        if (allowBufferBasedEstimates && currentBufferBasedEstimate !== void 0 && currentBufferBasedEstimate > currentBestBitrate) {
          chosenRepFromBufferSize = selectOptimalRepresentation(filteredReps, currentBufferBasedEstimate, minAutoBitrateVal, maxAutoBitrateVal);
          currentBestBitrate = chosenRepFromBufferSize.bitrate;
        }
        let chosenRepFromGuessMode = null;
        if (lowLatencyMode && currentRepresentationVal !== null && context2.manifest.isDynamic && maximumPosition - position.last < 40) {
          chosenRepFromGuessMode = guessBasedChooser.getGuess(representations, lastPlaybackObservation, currentRepresentationVal, currentBestBitrate, requests);
        }
        if (chosenRepFromGuessMode !== null && chosenRepFromGuessMode.bitrate > currentBestBitrate) {
          log_default.debug("ABR: Choosing representation with guess-based estimation.", chosenRepFromGuessMode.bitrate, chosenRepFromGuessMode.id);
          prevEstimate.update(chosenRepFromGuessMode, bandwidthEstimate, 2 /* GuessBased */);
          return {
            bitrate: bandwidthEstimate,
            representation: chosenRepFromGuessMode,
            urgent: currentRepresentationVal === null || chosenRepFromGuessMode.bitrate < currentRepresentationVal.bitrate,
            manual: false,
            knownStableBitrate
          };
        } else if (chosenRepFromBufferSize !== null) {
          log_default.debug("ABR: Choosing representation with buffer-based estimation.", chosenRepFromBufferSize.bitrate, chosenRepFromBufferSize.id);
          prevEstimate.update(chosenRepFromBufferSize, bandwidthEstimate, 0 /* BufferBased */);
          return {
            bitrate: bandwidthEstimate,
            representation: chosenRepFromBufferSize,
            urgent: networkAnalyzer.isUrgent(chosenRepFromBufferSize.bitrate, currentRepresentationVal, requests, lastPlaybackObservation),
            manual: false,
            knownStableBitrate
          };
        } else {
          log_default.debug("ABR: Choosing representation with bandwidth estimation.", chosenRepFromBandwidth.bitrate, chosenRepFromBandwidth.id);
          prevEstimate.update(chosenRepFromBandwidth, bandwidthEstimate, 1 /* BandwidthBased */);
          return {
            bitrate: bandwidthEstimate,
            representation: chosenRepFromBandwidth,
            urgent: networkAnalyzer.isUrgent(chosenRepFromBandwidth.bitrate, currentRepresentationVal, requests, lastPlaybackObservation),
            manual: false,
            knownStableBitrate
          };
        }
      }
    }
    function restartEstimatesProductionFromCurrentConditions() {
      const manualBitrateVal = manualBitrate.getValue();
      const representations = representationsRef.getValue();
      currentEstimatesCanceller.cancel();
      currentEstimatesCanceller = new TaskCanceller({ cancelOn: stopAllEstimates });
      const newRef = createEstimateReference(manualBitrateVal, representations, currentEstimatesCanceller.signal);
      newRef.onUpdate(function onNewEstimate(newEstimate) {
        estimateRef.setValue(newEstimate);
      }, {
        clearSignal: currentEstimatesCanceller.signal,
        emitCurrentValue: true
      });
    }
    function onMetric(value) {
      const { requestDuration, segmentDuration, size, content } = value;
      bandwidthEstimator.addSample(requestDuration, size);
      if (!content.segment.isInit) {
        const { segment, representation } = content;
        if (segmentDuration === void 0 && !segment.complete) {
          return;
        }
        const segDur = segmentDuration ?? segment.duration;
        scoreCalculator.addSample(representation, requestDuration / 1e3, segDur);
      }
    }
    function onRequestBegin(val) {
      requestsStore.add(val);
    }
    function onRequestProgress(val) {
      requestsStore.addProgress(val);
    }
    function onRequestEnd(val) {
      requestsStore.remove(val.id);
    }
  }
  function getFilteredRepresentations(representations, widthLimit, bitrateThrottle) {
    let filteredReps = representations;
    if (bitrateThrottle < Infinity) {
      filteredReps = filterByBitrate(filteredReps, bitrateThrottle);
    }
    if (widthLimit !== void 0) {
      filteredReps = filterByWidth(filteredReps, widthLimit);
    }
    return filteredReps;
  }

  // src/worker/media_duration_updater.ts
  init_define_ENVIRONMENT();
  var YEAR_IN_SECONDS = 365 * 24 * 3600;
  var MediaDurationUpdater = class {
    _subscription;
    _lastKnownDuration;
    constructor(manifest, mediaSource) {
      this._lastKnownDuration = reference_default(void 0);
      this._subscription = isMediaSourceOpened$(mediaSource).pipe(switchMap((canUpdate) => canUpdate ? combineLatest([
        this._lastKnownDuration.asObservable(),
        fromEvent2(manifest, "manifestUpdate").pipe(startWith(null))
      ]) : EMPTY), switchMap(([lastKnownDuration]) => areSourceBuffersUpdating$(mediaSource.sourceBuffers).pipe(switchMap((areSBUpdating) => {
        return areSBUpdating ? EMPTY : recursivelyTryUpdatingDuration();
        function recursivelyTryUpdatingDuration() {
          const res = setMediaSourceDuration(mediaSource, manifest, lastKnownDuration);
          if (res === MediaSourceDurationUpdateStatus.Success) {
            return EMPTY;
          }
          return timer(2e3).pipe(mergeMap(() => recursivelyTryUpdatingDuration()));
        }
      })))).subscribe();
    }
    updateKnownDuration(newDuration) {
      this._lastKnownDuration.setValue(newDuration);
    }
    stop() {
      this._subscription.unsubscribe();
    }
  };
  function setMediaSourceDuration(mediaSource, manifest, knownDuration) {
    let newDuration = knownDuration;
    if (newDuration === void 0) {
      if (manifest.isDynamic) {
        const maxPotentialPos = manifest.getLivePosition() ?? manifest.getMaximumSafePosition();
        newDuration = Math.max(Math.pow(2, 32), maxPotentialPos + YEAR_IN_SECONDS);
      } else {
        newDuration = manifest.getMaximumSafePosition();
      }
    }
    let maxBufferedEnd = 0;
    for (let i = 0; i < mediaSource.sourceBuffers.length; i++) {
      const sourceBuffer = mediaSource.sourceBuffers[i];
      const sbBufferedLen = sourceBuffer.buffered.length;
      if (sbBufferedLen > 0) {
        maxBufferedEnd = Math.max(sourceBuffer.buffered.end(sbBufferedLen - 1));
      }
    }
    if (newDuration === mediaSource.duration) {
      return MediaSourceDurationUpdateStatus.Success;
    } else if (maxBufferedEnd > newDuration) {
      if (maxBufferedEnd < mediaSource.duration) {
        try {
          log_default.info("Init: Updating duration to what is currently buffered", maxBufferedEnd);
          mediaSource.duration = newDuration;
        } catch (err) {
          log_default.warn("Duration Updater: Can't update duration on the MediaSource.", err instanceof Error ? err : "");
          return MediaSourceDurationUpdateStatus.Failed;
        }
      }
      return MediaSourceDurationUpdateStatus.Partial;
    } else {
      const oldDuration = mediaSource.duration;
      try {
        log_default.info("Init: Updating duration", newDuration);
        mediaSource.duration = newDuration;
      } catch (err) {
        log_default.warn("Duration Updater: Can't update duration on the MediaSource.", err instanceof Error ? err : "");
        return MediaSourceDurationUpdateStatus.Failed;
      }
      const deltaToExpected = Math.abs(mediaSource.duration - newDuration);
      if (deltaToExpected >= 0.1) {
        const deltaToBefore = Math.abs(mediaSource.duration - oldDuration);
        return deltaToExpected < deltaToBefore ? MediaSourceDurationUpdateStatus.Partial : MediaSourceDurationUpdateStatus.Failed;
      }
      return MediaSourceDurationUpdateStatus.Success;
    }
  }
  var MediaSourceDurationUpdateStatus = /* @__PURE__ */ ((MediaSourceDurationUpdateStatus2) => {
    MediaSourceDurationUpdateStatus2["Success"] = "success";
    MediaSourceDurationUpdateStatus2["Partial"] = "partial";
    MediaSourceDurationUpdateStatus2["Failed"] = "failed";
    return MediaSourceDurationUpdateStatus2;
  })(MediaSourceDurationUpdateStatus || {});
  function areSourceBuffersUpdating$(sourceBuffers) {
    if (sourceBuffers.length === 0) {
      return of(false);
    }
    const sourceBufferUpdatingStatuses = [];
    for (let i = 0; i < sourceBuffers.length; i++) {
      const sourceBuffer = sourceBuffers[i];
      sourceBufferUpdatingStatuses.push(merge(fromEvent(sourceBuffer, "updatestart").pipe(map(() => true)), fromEvent(sourceBuffer, "update").pipe(map(() => false)), interval(500).pipe(map(() => sourceBuffer.updating))).pipe(startWith(sourceBuffer.updating), distinctUntilChanged()));
    }
    return combineLatest(sourceBufferUpdatingStatuses).pipe(map((areUpdating) => {
      return areUpdating.some((isUpdating) => isUpdating);
    }), distinctUntilChanged());
  }
  function isMediaSourceOpened$(mediaSource) {
    return merge(onSourceOpen$(mediaSource).pipe(map(() => true)), onSourceEnded$(mediaSource).pipe(map(() => false)), onSourceClose$(mediaSource).pipe(map(() => false))).pipe(startWith(mediaSource.readyState === "open"), distinctUntilChanged());
  }

  // src/worker/worker_content_store.ts
  var WorkerContentStore = class {
    _currentContent;
    constructor() {
      this._currentContent = null;
    }
    setNewContent(context2, pipelines, manifest, mediaSource) {
      this.disposePreviousContent();
      const {
        contentId,
        lowLatencyMode,
        segmentRetryOptions
      } = context2;
      const representationEstimator = createAdaptiveRepresentationSelector({
        initialBitrates: {
          audio: context2.initialAudioBitrate,
          video: context2.initialVideoBitrate
        },
        lowLatencyMode,
        minAutoBitrates: {
          audio: minAudioBitrate,
          video: minVideoBitrate
        },
        maxAutoBitrates: {
          audio: maxAudioBitrate,
          video: maxVideoBitrate
        },
        manualBitrates: {
          audio: manualAudioBitrate,
          video: manualVideoBitrate
        },
        throttlers: {
          limitWidth: { video: limitVideoWidth },
          throttle: { video: throttleVideo },
          throttleBitrate: { video: throttleVideoBitrate }
        }
      });
      const segmentFetcherCreator = new segment_default(pipelines, {
        lowLatencyMode,
        maxRetryOffline: segmentRetryOptions.offline,
        maxRetryRegular: segmentRetryOptions.regular
      });
      const segmentBuffersStore = new segment_buffers_default(mediaSource);
      const mediaDurationUpdater = new MediaDurationUpdater(manifest, mediaSource);
      this._currentContent = {
        contentId,
        mediaSource,
        manifest,
        mediaDurationUpdater,
        representationEstimator,
        segmentBuffersStore,
        segmentFetcherCreator
      };
    }
    getCurrentContent() {
      return this._currentContent;
    }
    disposePreviousContent() {
      if (this._currentContent === null) {
        return;
      }
      this._currentContent.mediaDurationUpdater.stop();
      this._currentContent.segmentBuffersStore.disposeAll();
    }
  };

  // src/worker/worker_playback_observer.ts
  init_define_ENVIRONMENT();

  // src/main/core/api/playback_observer.ts
  init_define_ENVIRONMENT();
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

  // src/worker/worker_playback_observer.ts
  var WorkerPlaybackObserver = class {
    _src;
    _cancelSignal;
    constructor(src, cancellationSignal) {
      this._src = src;
      this._cancelSignal = cancellationSignal;
    }
    getCurrentTime() {
      return this._src.getValue().position.last;
    }
    getReadyState() {
      return this._src.getValue().readyState;
    }
    getIsPaused() {
      return this._src.getValue().paused.last;
    }
    getReference() {
      return this._src;
    }
    listen(cb, options) {
      if (this._cancelSignal.isCancelled || options?.clearSignal?.isCancelled === true) {
        return;
      }
      this._src.onUpdate(cb, {
        clearSignal: options?.clearSignal,
        emitCurrentValue: options?.includeLastObservation
      });
    }
    deriveReadOnlyObserver(transform) {
      return generateReadOnlyObserver(this, transform, this._cancelSignal);
    }
  };

  // src/worker/worker_utils.ts
  init_define_ENVIRONMENT();
  var WASM_URL = "./mpd-parser.wasm";
  var INITIAL_OBSERVATION = {
    duration: NaN,
    paused: { last: false },
    position: { last: 0 },
    readyState: 0,
    speed: 1
  };

  // src/worker/index.ts
  globalThis.window = globalThis;
  var currentContentStore = new WorkerContentStore();
  var parser = new wasm_parser_default();
  globalThis.parser = parser;
  parser.initialize({ wasmUrl: WASM_URL }).catch((err) => {
    console.error(err);
  });
  var playbackObservationRef = reference_default(INITIAL_OBSERVATION);
  var canceller = new TaskCanceller();
  var playbackObserver = new WorkerPlaybackObserver(playbackObservationRef, canceller.signal);
  onmessage = function(e) {
    log_default.debug("Worker: received message", e.type);
    const msg = e.data;
    switch (msg.type) {
      case "prepare":
        prepareNewContent(msg.value);
        break;
      case "start":
        startCurrentContent(msg.value);
        break;
      case "observation":
        playbackObservationRef.setValue(msg.value);
        break;
      case "reference-update":
        updateGlobalReference(msg);
        break;
      default:
        console.warn("Unrecognized Event Message : ", e);
    }
  };
  function prepareNewContent(context2) {
    const {
      contentId,
      url,
      lowLatencyMode,
      manifestRetryOptions
    } = context2;
    let manifest = null;
    let hasMediaSourceOpen = false;
    const mediaSource = new MediaSource();
    const handle = mediaSource.handle;
    sendMessage({ type: "media-source", contentId, value: handle }, [handle]);
    mediaSource.addEventListener("sourceopen", function() {
      hasMediaSourceOpen = true;
      checkIfReadyAndValidate();
    });
    const dashPipeline = dash_default({ lowLatencyMode });
    const manifestFetcher = new manifest_default(url, dashPipeline, {
      lowLatencyMode,
      maxRetryOffline: manifestRetryOptions.offline,
      maxRetryRegular: manifestRetryOptions.regular
    });
    manifestFetcher.fetch().pipe(mergeMap((evt) => {
      if (evt.type === "warning") {
        sendMessage({
          type: "warning",
          contentId,
          value: formatErrorForSender(evt.value)
        });
        return EMPTY;
      }
      return evt.parse({
        previousManifest: null,
        unsafeMode: false
      });
    })).subscribe((evt) => {
      if (evt.type === "warning") {
        sendMessage({
          type: "warning",
          contentId,
          value: formatErrorForSender(evt.value)
        });
      } else {
        manifest = evt.manifest;
        checkIfReadyAndValidate();
      }
    });
    function checkIfReadyAndValidate() {
      if (manifest === null || !hasMediaSourceOpen) {
        return;
      }
      const sentManifest = formatManifestBeforeSend(manifest);
      sendMessage({
        type: "ready-to-start",
        contentId,
        value: { manifest: sentManifest }
      });
      currentContentStore.setNewContent(context2, dashPipeline, manifest, mediaSource);
    }
  }
  function startCurrentContent(val) {
    const preparedContent = currentContentStore.getCurrentContent();
    if (preparedContent === null) {
      const error = new OtherError("NONE", "Starting content when none is prepared");
      sendMessage({
        type: "error",
        contentId: void 0,
        value: formatErrorForSender(error)
      });
      return;
    }
    const {
      contentId,
      manifest,
      mediaDurationUpdater,
      mediaSource,
      representationEstimator,
      segmentBuffersStore,
      segmentFetcherCreator
    } = preparedContent;
    const {
      audioTrackSwitchingMode,
      drmSystemId,
      enableFastSwitching,
      initialTime,
      manualBitrateSwitchingMode,
      onCodecSwitch
    } = val;
    const streamPlaybackObserver = createStreamPlaybackObserver(manifest, playbackObserver, { speed });
    const initialPeriod = manifest.getPeriodForTime(initialTime) ?? manifest.getNextPeriod(initialTime);
    if (initialPeriod === void 0) {
      const error = new MediaError("MEDIA_STARTING_TIME_NOT_FOUND", "Wanted starting time not found in the Manifest.");
      sendMessage({
        type: "error",
        contentId,
        value: formatErrorForSender(error)
      });
      return;
    }
    const cancelEndOfStream$ = new Subject();
    const stream = stream_default({
      initialPeriod: manifest.periods[0],
      manifest
    }, streamPlaybackObserver, representationEstimator, segmentBuffersStore, segmentFetcherCreator, {
      wantedBufferAhead,
      maxVideoBufferSize,
      maxBufferAhead,
      maxBufferBehind,
      audioTrackSwitchingMode,
      drmSystemId,
      enableFastSwitching,
      manualBitrateSwitchingMode,
      onCodecSwitch
    });
    const contentTimeObserver = ContentTimeBoundariesObserver(manifest, stream, streamPlaybackObserver).pipe(mergeMap((evt) => {
      switch (evt.type) {
        case "contentDurationUpdate":
          log_default.debug("Init: Duration has to be updated.", evt.value);
          mediaDurationUpdater.updateKnownDuration(evt.value);
          return EMPTY;
        default:
          return EMPTY;
      }
    }));
    stream.subscribe((event) => {
      switch (event.type) {
        case "periodStreamReady":
          let adaptation;
          if (event.value.type === "audio") {
            const allSupportedAdaptations = (event.value.period.adaptations[event.value.type] ?? []).filter((a) => a.isSupported);
            if (allSupportedAdaptations.length === 0) {
              adaptation = null;
            } else {
              adaptation = allSupportedAdaptations[0];
            }
          } else {
            adaptation = event.value.period.adaptations[event.value.type]?.[0] ?? null;
          }
          event.value.adaptation$.next(adaptation);
          break;
        case "periodStreamCleared":
          break;
        case "end-of-stream":
          return maintainEndOfStream(mediaSource).pipe(ignoreElements(), takeUntil(cancelEndOfStream$));
        case "resume-stream":
          log_default.debug("Init: resume-stream order received.");
          cancelEndOfStream$.next(null);
          return EMPTY;
        case "encryption-data-encountered":
          sendMessage(event);
          break;
        case "activePeriodChanged":
          const sentPeriod = formatPeriodBeforeSend(event.value.period);
          sendMessage({
            type: "activePeriodChanged",
            value: { period: sentPeriod }
          });
          break;
        case "adaptationChange":
          break;
        case "representationChange":
          break;
        case "complete-stream":
          break;
        case "bitrateEstimationChange":
          break;
        case "needs-media-source-reload":
          break;
        case "needs-buffer-flush":
          break;
        case "needs-decipherability-flush":
          break;
        case "added-segment":
          break;
        case "manifest-might-be-out-of-sync":
          break;
        case "inband-events":
          break;
        case "warning":
          sendMessage({
            type: "warning",
            contentId,
            value: formatErrorForSender(event.value)
          });
          break;
        case "needs-manifest-refresh":
          break;
        case "stream-status":
          return EMPTY;
        case "locked-stream":
          return EMPTY;
        default:
          return EMPTY;
      }
    });
    contentTimeObserver.subscribe();
  }
  function updateGlobalReference(msg) {
    switch (msg.value.name) {
      case "wantedBufferAhead":
        wantedBufferAhead.setValueIfChanged(msg.value.newVal);
        break;
      case "maxBufferBehind":
        maxBufferBehind.setValueIfChanged(msg.value.newVal);
        break;
      case "maxBufferAhead":
        maxBufferBehind.setValueIfChanged(msg.value.newVal);
        break;
      case "minAudioBitrate":
        minAudioBitrate.setValueIfChanged(msg.value.newVal);
        break;
      case "maxAudioBitrate":
        maxAudioBitrate.setValueIfChanged(msg.value.newVal);
        break;
      case "minVideoBitrate":
        minVideoBitrate.setValueIfChanged(msg.value.newVal);
        break;
      case "maxVideoBitrate":
        maxVideoBitrate.setValueIfChanged(msg.value.newVal);
        break;
      case "manualAudioBitrate":
        manualAudioBitrate.setValueIfChanged(msg.value.newVal);
        break;
      case "manualVideoBitrate":
        manualVideoBitrate.setValueIfChanged(msg.value.newVal);
        break;
      case "speed":
        speed.setValueIfChanged(msg.value.newVal);
        break;
      case "limitVideoWidth":
        limitVideoWidth.setValueIfChanged(msg.value.newVal);
        break;
      case "throttleVideo":
        throttleVideo.setValueIfChanged(msg.value.newVal);
        break;
      case "throttleVideoBitrate":
        throttleVideoBitrate.setValueIfChanged(msg.value.newVal);
        break;
    }
  }
  function formatErrorForSender(error) {
    return { type: error.type, code: error.code };
  }
  function formatManifestBeforeSend(manifest) {
    const periods = [];
    for (const period of manifest.periods) {
      periods.push(formatPeriodBeforeSend(period));
    }
    return {
      id: manifest.id,
      periods,
      isDynamic: manifest.isDynamic,
      isLive: manifest.isLive,
      isLastPeriodKnown: manifest.isLastPeriodKnown,
      suggestedPresentationDelay: manifest.suggestedPresentationDelay,
      clockOffset: manifest.clockOffset,
      uris: manifest.uris,
      availabilityStartTime: manifest.availabilityStartTime,
      timeBounds: manifest.timeBounds
    };
  }
  function formatPeriodBeforeSend(period) {
    const adaptations = {};
    const baseAdaptations = period.getAdaptations();
    for (const adaptation of baseAdaptations) {
      let currentAdaps = adaptations[adaptation.type];
      if (currentAdaps === void 0) {
        currentAdaps = [];
        adaptations[adaptation.type] = currentAdaps;
      }
      currentAdaps.push(formatAdaptationBeforeSend(adaptation));
    }
    return {
      start: period.start,
      end: period.end,
      id: period.id,
      adaptations
    };
  }
  function formatAdaptationBeforeSend(adaptation) {
    const representations = [];
    const baseRepresentations = adaptation.representations;
    for (const representation of baseRepresentations) {
      representations.push(formatRepresentationBeforeSend(representation));
    }
    return {
      id: adaptation.id,
      type: adaptation.type,
      isSupported: adaptation.isSupported,
      language: adaptation.language,
      isClosedCaption: adaptation.isClosedCaption,
      isAudioDescription: adaptation.isAudioDescription,
      isSignInterpreted: adaptation.isSignInterpreted,
      normalizedLanguage: adaptation.normalizedLanguage,
      representations,
      label: adaptation.label,
      isDub: adaptation.isDub
    };
  }
  function formatRepresentationBeforeSend(representation) {
    return {
      id: representation.id,
      bitrate: representation.bitrate,
      codec: representation.codec,
      width: representation.width,
      height: representation.height,
      frameRate: representation.frameRate,
      hdrInfo: representation.hdrInfo,
      decipherable: representation.decipherable
    };
  }
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
