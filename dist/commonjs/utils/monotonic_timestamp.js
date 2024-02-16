"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mainThreadTimestampDiff = void 0;
var reference_1 = require("./reference");
/**
 * Time difference of the monotonic clock indicated by `performance.now` with
 * the main thread environment (i.e. amount of time to add to the worker's clock
 * to obtain the main clock - from the worker-side).
 */
var mainThreadTimestampDiff = new reference_1.default(0);
exports.mainThreadTimestampDiff = mainThreadTimestampDiff;
/**
 * Provide a "monotonically-raising timestamp". That is, a timestamp that is
 * guaranteed to keep raising at the same speed of 1000 milliseconds per second
 * (unlike for example `Date.now()` which may not have the same behavior if the
 * system's clock is updated, whether it is due to NTP, the user updating the
 * clock, daylight saving time, leap seconds, or someone deciding that
 * datekeeping rules have to be changed).
 *
 * This function is useful when what you want to do is just time comparaison, in
 * which case going through `Date` objects would both be unnecessary and
 * affected by the aforementioned issues.
 *
 * Also, by updating `mainThreadTimestampDiff`, you can ensure that WebWorkers
 * provide a monotonic timestamp synchronized with the main thread.
 * @returns {number}
 */
function getMonotonicTimeStamp() {
    /* eslint-disable-next-line no-restricted-properties */
    return performance.now() + mainThreadTimestampDiff.getValue();
}
exports.default = getMonotonicTimeStamp;
