/**
 * @param {string} str
 * @returns {string}
 */
export default function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
