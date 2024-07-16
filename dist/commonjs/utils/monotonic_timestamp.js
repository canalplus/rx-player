"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scaleTimestamp = void 0;
var reference_1 = require("./reference");
/**
 * Time difference of the monotonic clock indicated by `performance.now` with
 * the main thread environment (i.e. amount of time to add to the worker's clock
 * to obtain the main clock - from the worker-side).
 */
var mainThreadTimestampDiff = new reference_1.default(0);
function scaleTimestamp(_a) {
    var date = _a.date, timestamp = _a.timestamp;
    var delta = date - timestamp;
    var diffCurrentEnv = typeof performance !== "undefined"
        ? /* eslint-disable-next-line no-restricted-properties */
            Date.now() - performance.now()
        : 0;
    mainThreadTimestampDiff.setValueIfChanged(diffCurrentEnv - delta);
}
exports.scaleTimestamp = scaleTimestamp;
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
var getMonotonicTimeStamp = typeof performance !== "undefined"
    ? /* eslint-disable-next-line no-restricted-properties */
        function () { return performance.now() + mainThreadTimestampDiff.getValue(); }
    : function () { return Date.now() + mainThreadTimestampDiff.getValue(); };
exports.default = getMonotonicTimeStamp;
