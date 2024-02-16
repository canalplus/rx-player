"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRetryDelay = void 0;
var get_fuzzed_delay_1 = require("./get_fuzzed_delay");
var is_null_or_undefined_1 = require("./is_null_or_undefined");
var sleep_1 = require("./sleep");
/**
 * Retry the given Promise (if it rejects) with an exponential
 * backoff.
 * The backoff behavior can be tweaked through the options given.
 *
 * @param {Function} runProm
 * @param {Object} options - Configuration object.
 * This object contains the following properties:
 *
 *   - retryDelay {Number} - The initial delay, in ms.
 *     This delay will be fuzzed to fall under the range +-30% each time a new
 *     retry is done.
 *     Then, this delay will be multiplied by 2^(n-1), n being the counter of
 *     retry we performed (beginning at 1 for the first retry).
 *
 *   - totalRetry {Number} - The amount of time we should retry. 0
 *     means no retry, 1 means a single retry, Infinity means infinite retry
 *     etc.
 *     If the Promise still rejects after this number of retry, the error will
 *     be throwed through the returned Promise.
 *
 *   - shouldRetry {Function|undefined} -  Function which will receive the
 *     error each time it fails, and should return a boolean. If this boolean
 *     is false, the error will be directly thrown (without anymore retry).
 *
 *   - onRetry {Function|undefined} - Function which will be triggered at
 *     each retry. Will receive two arguments:
 *       1. The error
 *       2. The current retry count, beginning at 1 for the first retry
 *
 * @param {Object} cancelSignal
 * @returns {Promise}
 * TODO Take errorSelector out. Should probably be entirely managed in the
 * calling code via a catch (much simpler to use and to understand).
 */
function retryPromiseWithBackoff(runProm, options, cancelSignal) {
    var baseDelay = options.baseDelay, maxDelay = options.maxDelay, totalRetry = options.totalRetry, shouldRetry = options.shouldRetry, onRetry = options.onRetry;
    var retryCount = 0;
    return iterate();
    function iterate() {
        return __awaiter(this, void 0, void 0, function () {
            var res, error_1, delay, res;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (cancelSignal.cancellationError !== null) {
                            throw cancelSignal.cancellationError;
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 5]);
                        return [4 /*yield*/, runProm()];
                    case 2:
                        res = _a.sent();
                        return [2 /*return*/, res];
                    case 3:
                        error_1 = _a.sent();
                        if (cancelSignal.cancellationError !== null) {
                            throw cancelSignal.cancellationError;
                        }
                        if ((!(0, is_null_or_undefined_1.default)(shouldRetry) && !shouldRetry(error_1)) ||
                            retryCount++ >= totalRetry) {
                            throw error_1;
                        }
                        if (typeof onRetry === "function") {
                            onRetry(error_1, retryCount);
                        }
                        delay = getRetryDelay(baseDelay, retryCount, maxDelay);
                        return [4 /*yield*/, (0, sleep_1.default)(delay)];
                    case 4:
                        _a.sent();
                        res = iterate();
                        return [2 /*return*/, res];
                    case 5: return [2 /*return*/];
                }
            });
        });
    }
}
exports.default = retryPromiseWithBackoff;
/**
 * Get the delay that should be applied to the following retry, it depends on the base delay
 * and is increaser for with the retry count. The result is ceiled by the maxDelay.
 * @param baseDelay delay after wich the first request is retried after a failure
 * @param retryCount count of retries
 * @param maxDelay maximum delay
 * @returns the delay that should be applied to the following retry
 */
function getRetryDelay(baseDelay, retryCount, maxDelay) {
    var delay = baseDelay * Math.pow(2, retryCount - 1);
    var fuzzedDelay = (0, get_fuzzed_delay_1.default)(delay);
    return Math.min(fuzzedDelay, maxDelay);
}
exports.getRetryDelay = getRetryDelay;
