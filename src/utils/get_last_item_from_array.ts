/**
 * From the given array, return the last element, or `undefined` if the array is
 * empty.
 * @param {Array} arr
 * @returns {*}
 */
export default function getLastItemFromArray<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}
