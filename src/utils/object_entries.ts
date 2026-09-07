/**
 * @param {Object} o
 * @returns {Array.<Array.<*>>}
 */
function objectEntries<T>(o: { [s: string]: T }): Array<[string, T]> {
  return Object.keys(o).map((k: string) => [k, o[k]]);
}

// eslint-disable-next-line no-restricted-properties
export default typeof Object.entries === "function" ? Object.entries : objectEntries;

export { objectEntries };
