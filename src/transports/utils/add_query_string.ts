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
export default function addQueryString(
  baseUrl: string,
  supplementaryQueryStringData: Array<[string, string | null]>,
): string {
  if (supplementaryQueryStringData.length === 0) {
    return baseUrl;
  }
  let urlPrefix: string;
  let urlSuffix: string | null;
  let queryStringStartingChar: "?" | "&" | "";
  const indexOfQueryString = baseUrl.indexOf("?");
  if (indexOfQueryString === -1) {
    queryStringStartingChar = "?";
    const indexOfFragment = baseUrl.indexOf("#");
    if (indexOfFragment >= 0) {
      urlPrefix = baseUrl.substring(0, indexOfFragment);
      urlSuffix = baseUrl.substring(indexOfFragment);
    } else {
      urlPrefix = baseUrl;
      urlSuffix = null;
    }
  } else {
    let indexOfFragment = baseUrl.substring(indexOfQueryString).indexOf("#");
    if (indexOfFragment >= 0) {
      indexOfFragment += indexOfQueryString;
      if (indexOfQueryString + 1 === indexOfFragment) {
        queryStringStartingChar = "";
      } else {
        queryStringStartingChar = "&";
      }
      urlPrefix = baseUrl.substring(0, indexOfFragment);
      urlSuffix = baseUrl.substring(indexOfFragment);
    } else {
      if (indexOfQueryString === baseUrl.length - 1) {
        queryStringStartingChar = "";
      } else {
        queryStringStartingChar = "&";
      }
      urlPrefix = baseUrl;
      urlSuffix = null;
    }
  }

  let url = urlPrefix + queryStringStartingChar;
  for (let i = 0; i < supplementaryQueryStringData.length; i++) {
    const queryStringElt = supplementaryQueryStringData[i];
    if (queryStringElt[1] === null) {
      url += queryStringElt[0];
    } else {
      url += `${queryStringElt[0]}=${queryStringElt[1]}`;
    }
    if (i < supplementaryQueryStringData.length - 1) {
      url += "&";
    }
  }
  if (urlSuffix !== null) {
    url += urlSuffix;
  }
  return url;
}
