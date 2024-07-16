/**
 * Force function output to be wrapped in a Promise instance, which also rejects
 * if the function call threw.
 * @param {Function} val
 * @returns {Promise}
 */
export default function wrapInPromise<T>(val: () => T | Promise<T>): Promise<T>;
//# sourceMappingURL=wrapInPromise.d.ts.map