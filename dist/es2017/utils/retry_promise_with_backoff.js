import getFuzzedDelay from "./get_fuzzed_delay";
import isNullOrUndefined from "./is_null_or_undefined";
import sleep from "./sleep";
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
export default function retryPromiseWithBackoff(runProm, options, cancelSignal) {
    const { baseDelay, maxDelay, totalRetry, shouldRetry, onRetry } = options;
    let retryCount = 0;
    return iterate();
    async function iterate() {
        if (cancelSignal.cancellationError !== null) {
            throw cancelSignal.cancellationError;
        }
        try {
            const res = await runProm();
            return res;
        }
        catch (error) {
            if (cancelSignal.cancellationError !== null) {
                throw cancelSignal.cancellationError;
            }
            if ((!isNullOrUndefined(shouldRetry) && !shouldRetry(error)) ||
                retryCount++ >= totalRetry) {
                throw error;
            }
            if (typeof onRetry === "function") {
                onRetry(error, retryCount);
            }
            const delay = getRetryDelay(baseDelay, retryCount, maxDelay);
            await sleep(delay);
            const res = iterate();
            return res;
        }
    }
}
/**
 * Get the delay that should be applied to the following retry, it depends on the base delay
 * and is increaser for with the retry count. The result is ceiled by the maxDelay.
 * @param baseDelay delay after wich the first request is retried after a failure
 * @param retryCount count of retries
 * @param maxDelay maximum delay
 * @returns the delay that should be applied to the following retry
 */
export function getRetryDelay(baseDelay, retryCount, maxDelay) {
    const delay = baseDelay * Math.pow(2, retryCount - 1);
    const fuzzedDelay = getFuzzedDelay(delay);
    return Math.min(fuzzedDelay, maxDelay);
}
