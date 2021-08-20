/**
 * Evaluating simply whether or not two objects are same with no nesting
 * and only toward primitive values.
 *
 * @param {Object} obj1
 * @param {Object} obj2
 * @returns boolean
 */

function isEqual(obj1, obj2) {
  if (obj1 === obj2) {
    return true;
  }

  for (const prop in obj1) {
    if (!Object.prototype.hasOwnProperty.call(obj2, prop)) {
      return false;
    }
    if (obj1[prop] !== obj2[prop]) {
      return false;
    }
  }
  return true;
}

export default isEqual;
