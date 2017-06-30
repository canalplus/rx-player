// inspired from MDN polyfill, but ponyfilled instead
export default (arr, searchElement, fromIndex) => {
  if (typeof Array.prototype.includes === "function") {
    return arr.includes(searchElement, fromIndex);
  }

  const len = arr.length >>> 0;

  if (len === 0) {
    return false;
  }

  const n = fromIndex | 0;
  let k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

  const areTheSame = (x, y) =>
    x === y ||
      // Viva las JavaScriptas!
      (typeof x === "number" && typeof y === "number"
        && isNaN(x) && isNaN(y));

  while (k < len) {
    if (areTheSame(arr[k], searchElement)) {
      return true;
    }
    k++;
  }

  return false;
};
