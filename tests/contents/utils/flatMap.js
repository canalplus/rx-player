/* eslint-env node */

/**
 * Very basic flatMap ponyfill.
 * @param {Array} arr
 * @param {Function} mapperFunction
 * @returns {Array}
 */
module.exports = function flatMap(arr, mapperFunction) {
  return arr.reduce((acc, x) => acc.concat(mapperFunction(x)), []);
};
