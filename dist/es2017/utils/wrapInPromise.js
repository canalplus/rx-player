/**
 * Force function output to be wrapped in a Promise instance, which also rejects
 * if the function call threw.
 * @param {Function} val
 * @returns {Promise}
 */
export default function wrapInPromise(val) {
    try {
        const ret = val();
        if (typeof ret === "object" &&
            ret !== null &&
            typeof ret.then === "function") {
            return ret;
        }
        else {
            return Promise.resolve(ret);
        }
    }
    catch (err) {
        return Promise.reject(err);
    }
}
