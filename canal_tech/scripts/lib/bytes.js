/**
 * construct string from the code units given
 * @param {Uint16Array|Uint8Array} bytes
 * @returns {string}
 */
export function bytesToStr(bytes) {
  return String.fromCharCode.apply(null, bytes);
}

/**
 * Convert a simple string to an Uint8Array containing the corresponding
 * UTF-8 code units.
 * /!\ its implementation favors simplicity and performance over accuracy.
 * Each character having a code unit higher than 255 in UTF-16 will be
 * truncated (real value % 256).
 * Please take that into consideration when calling this function.
 * @param {string} str
 * @returns {Uint8Array}
 */
export function strToBytes(str) {
  const len = str.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    arr[i] = str.charCodeAt(i) & 0xFF;
  }
  return arr;
}

/**
 * construct string from the code units given.
 * Only use every other byte for each UTF-16 character.
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function bytesToUTF16Str(bytes) {
  let str = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 2) {
    str += String.fromCharCode(bytes[i]);
  }
  return str;
}
