/**
 * Add to an URL a query string corresponding to `supplementaryQueryStringData`,
 * being tuples where the first element is a query string's property name and the
 * second element is its value (or null if there's no associated value.
 *
 * If the given URL already has a query string, the new query string elements
 * will just be appended.
 * @param {string} baseUrl
 * @param {Array.<Array.<string|null>>} supplementaryQueryStringData
 * @returns {string}
 */
export default function addQueryString(baseUrl: string, supplementaryQueryStringData: Array<[string, string | null]>): string;
//# sourceMappingURL=add_query_string.d.ts.map