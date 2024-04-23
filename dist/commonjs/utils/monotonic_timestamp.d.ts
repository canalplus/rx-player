export declare function scaleTimestamp({ date, timestamp }: {
    date: number;
    timestamp: number;
}): void;
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
declare const getMonotonicTimeStamp: () => number;
export default getMonotonicTimeStamp;
