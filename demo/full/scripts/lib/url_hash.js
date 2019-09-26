const FIELD_LENGTH = 4;

/**
 * Get possible information given through the "hash" part of the URL (what comes
 * after the "#" character).
 *
 * Here is how it works:
 * Two type of data can be communicated: string or booleans:
 * Each of those is linked to a "field" which is the property name coded on only
 * two characters.
 * In the URL fields are prepended by a "/". For boolean value the field is
 * followed by the next field or the end of the hash.
 * Example:
 * http://www.example.com/#/lo/au
 * => will get you `{ lo: true, au: true }`.
 *
 * When the field has a string as a value, it is a little more complicated.
 * The field name is followed by the length of the data (as a JS UTF-16 string)
 * encoded in base-36 (think 0-9 then a-z).
 * The end of the length in the string correspond to the first "=" character
 * encountered. The data starts just after.
 * Example with both booleans and strings:
 * http://www.example.com/#/lo/au/ma=
 * => will get you `{ lo: true, au: true }`.
 *
 *
 *   - booleans
 *
 * Returns null if the data was malformed.
 * @param {string} hashInUrl
 * @return {Object|null}
 */
export function parseHashInURL(hashInUrl) {
  if (hashInUrl.length <= 1) {
    return null;
  }

  const parsed = {};
  let currentOffset = 2; // initial "#/"

  function getNextData() {
    const data = hashInUrl.substring(currentOffset).split("=");
    if (!data.length) {
      return null;
    }
    currentOffset += data[0].length + 1; // skip length + "="
    const lenNb = parseInt(data[0], 36);
    if (isNaN(lenNb)) {
      return null;
    }

    const dataStart = currentOffset;
    currentOffset += lenNb;
    return hashInUrl.substring(dataStart, currentOffset);
  }
  while (currentOffset + FIELD_LENGTH <= hashInUrl.length) {
    if (currentOffset + FIELD_LENGTH === hashInUrl.length ||
        hashInUrl[currentOffset + FIELD_LENGTH] === "/")
    {
      // this is a boolean
      const fieldName = hashInUrl.substring(currentOffset,
                                            currentOffset + FIELD_LENGTH);
      if (!fieldName) {
        return parsed;
      }
      currentOffset += FIELD_LENGTH; // skip field name
      parsed[fieldName] = true;
    } else {
      // data in a string form
      const fieldName = hashInUrl.substring(currentOffset,
                                            currentOffset + FIELD_LENGTH);
      if (!fieldName) {
        return parsed;
      }
      currentOffset += FIELD_LENGTH; // skip field name
      const data = getNextData();
      if (data === null) {
        return parsed;
      }
      parsed[fieldName] = data;
    }
    currentOffset += 1; // skip next "/"
  }
  return parsed;
}

/**
 * Generate URL with hash-string which can be used to reload the page with the
 * current non-stored custom content. This can be used for example to share some
 * content with other people.
 * Returns null if it could not generate an URL for the current content.
 * @param {Object} state - The current ContentList state.
 * @returns {string|null}
 */
export function generateLinkForCustomContent({
  autoPlay, // true if autoPlay should be on
  drmType, // enabled DRM
  manifestURL,
  licenseServerUrl,
  lowLatency,
  serverCertificateUrl,
  transport,
}) {
  let urlString = "";
  let transportString = "";
  let licenseServerUrlString = "";
  let serverCertificateUrlString = "";
  let drmTypeString = "";
  if (manifestURL) {
    urlString = "/mani" +
                manifestURL.length.toString(36) +
                "=" + manifestURL;
  }
  if (transport) {
    transportString = "/tran" +
                      transport.length.toString(36) +
                      "=" + transport;
  }
  if (drmType) {
    drmTypeString = "/drmt" +
                    drmType.length.toString(36) +
                    "=" + drmType;
  }
  if (licenseServerUrl) {
    licenseServerUrlString = "/lice" +
                             licenseServerUrl.length.toString(36) +
                             "=" + licenseServerUrl;
  }
  if (serverCertificateUrl) {
    serverCertificateUrlString = "/cert" +
                                 serverCertificateUrl.length.toString(36) +
                                 "=" + serverCertificateUrl;
  }

  if (!transportString) {
    return null;
  }

  return location.protocol + "//" +
         location.hostname +
         (location.port ? ":" + location.port : "") +
         location.pathname +
         (location.search ? location.search : "") +
         "#" +
         (autoPlay ? "/aupl" : "") +
         (lowLatency ? "/lowl" : "") +
         transportString +
         urlString +
         drmTypeString +
         licenseServerUrlString +
         serverCertificateUrlString;
}
