/**
 * Returns true if the argument given is either null or undefined.
 * This function was added to have a clearer alternative to `== null` which is
 * not always understood by newcomers to the code, and which can be overused when
 * only one of the possibility can arise.
 * @param {*} x
 * @returns {boolean}
 */
export default function isNullOrUndefined(x) {
  return x === null || x === undefined;
}
