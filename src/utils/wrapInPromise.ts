/**
 * Force function output to be wrapped in a Promise instance, which also rejects
 * if the function call threw.
 * @param {Function} val
 * @returns {Promise}
 */
export default function wrapInPromise<T>(val: () => T | Promise<T>): Promise<T> {
  try {
    const ret = val();
    if (
      typeof ret === "object" &&
      ret !== null &&
      typeof (ret as Promise<T>).then === "function"
    ) {
      return ret as Promise<T>;
    } else {
      return Promise.resolve(ret);
    }
  } catch (err) {
    return Promise.reject(err);
  }
}
