/**
 * @param {string} str
 * @returns {string}
 */
export default function capitalizeFirstLetter(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
