/**
 * Parse possible information given through the "hash" part of the URL (what
 * comes after the "#" character).
 *
 * This format was done to be:
 *   - easy to parse in JavaScript
 *   - readable by a human, one should get roughly an idea of the information
 *     given just by looking at that string.
 *   - compact enough to be shareable through e-mails without cluttering it
 *   - possible to copy sub-parts of that string (example an URL contained in
 *     it) and use it without human effort (i.e. no string escaping)
 *
 * Here is how it works:
 * The format is based on a key-value scheme. The type of the key is always a
 * string and two types of value (for the moment?) can be communicated: strings
 * and booleans.
 *
 * The key is designated by a name. This is a string of any length which should
 * not contain any exclamation mark ("!") or underscore ("_") character as those
 * are reserved, but could technically contain any other characters (we are
 * though usually limited here by URL-encoding).
 * Each of those keys are prepended by an exclamation mark ("!") character.
 *
 * To communicate a boolean value, that key is immediately either followed by
 * the next key (which is again, prepended by an exclamation mark character) or
 * by the end of the whole string, which indicates the end of the data.
 * A boolean value encountered is always inferred to be `true`. To set is to
 * `false`, just remove the key from the string. There is no difference between
 * `false` and a not-defined key.
 * Example:
 * http://www.example.com/#!lowLatency!noAutoplay
 * => will get you the following JS Object:
 * ```js
 * {
 *   lowLatency: true,
 *   noAutoplay: true
 * }
 * ```
 *
 * When the key has a string as a value, things are a little different.
 * The key is followed by an underscore ("_") character and then by the length
 * of the data (the communicated string) in terms of UTF-16 code units (note:
 * a surrogate pairs is 2 code units).
 * That length itself is then converted in a base-36 number (think 0-9 then
 * a-z) to take less space in a URL.
 * Because this length can, depending on the length of the data, need one or
 * more Base-36 numbers, an equal ("=") sign is added to mark the end of this
 * length.
 * The data then starts just after that equal sign and ends at the end of the
 * announced length (followed either by the following field - prepended by an
 * exclamation mark - or the end of the string).
 * Example with both booleans and strings and a `FIELD_LENGTH` of 4:
 * http://www.example.com/#!lowLatency!manifest_1n=http://www.example.com/streaming/dash_contents/Manifest.mpd!foobar
 * => will get you
 * ```js
 * {
 *   lowLatency: true,
 *   manifest: "http://www.example.com/streaming/dash_contents/Manifest.mpd",
 *   foobar: true
 * }
 * ```

 * If any invalid data is encountered, this function returns null.
 * @param {string} hashStr
 * @return {Object|null}
 */
export function parseHashInURL(hashStr) {
  if (hashStr.length <= 1) {
    return null;
  }

  const parsed = {};

  // Note a previous version made use of the non-percent-encodable "\" separator
  // instead of the "!" we use today.
  // To still support links done in previous version, we want to detect which
  // of those two separators is used.
  // Fortunately, the first key also starts with a separator. This means that
  // the separator should always be the second character of the hash (after
  // "#").
  const separatorChar = hashStr[1];

  let hashOffset = 2; // initial "#!"

  const hashLen = hashStr.length;
  while (hashOffset + 1 <= hashLen) {
    const unparsedStr = hashStr.substring(hashOffset);
    const nextSeparator = unparsedStr.indexOf(separatorChar);
    const nextUnderscore = unparsedStr.indexOf("_");
    if (nextUnderscore <= 0 ||
        (nextSeparator >= 0 && nextUnderscore > nextSeparator))
    {
      // this is a boolean
      const fieldLength = nextSeparator >= 0 ?
        nextSeparator :
        unparsedStr.length;
      const fieldName = unparsedStr.substring(0, fieldLength);
      hashOffset += fieldLength; // skip field name
      parsed[fieldName] = true;
    } else {
      // data in a string form
      const fieldName = unparsedStr.substring(0, nextUnderscore);
      hashOffset += nextUnderscore + 1; // skip field name and its following
                                        // underscore

      const splitted = unparsedStr.substring(nextUnderscore + 1).split("=");
      if (!splitted.length) {
        return null;
      }
      const dataLength = splitted[0];
      const dataLengthLen = splitted[0].length + 1; // length + "="
      hashOffset += dataLengthLen;
      const lenNb = parseInt(dataLength, 36);
      if (isNaN(lenNb)) {
        return null;
      }
      const dataStart = hashOffset;
      hashOffset += lenNb;
      const data = hashStr.substring(dataStart, hashOffset);
      parsed[fieldName] = data;
    }
    hashOffset += 1; // skip next separator
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
  chosenDRMType, // DRM Choice
  customKeySystem, // key system of a custom DRM if one
  fallbackKeyError, // `true` if the corresponding switch is enabled
  fallbackLicenseRequest, // `true` if the corresponding switch is enabled
  licenseServerUrl,
  lowLatency, // True if the low-latency switch is enabled
  manifestURL,
  serverCertificateUrl,
  transport, // Choice for the transport protocol
}) {
  let urlString = "";
  let transportString = "";
  let licenseServerUrlString = "";
  let serverCertificateUrlString = "";
  let drmTypeString = "";
  let customKeySystemString = "";
  if (manifestURL) {
    urlString = "!manifest_" +
                manifestURL.length.toString(36) +
                "=" + manifestURL;
  }
  if (transport) {
    transportString = "!tech_" +
                      transport.length.toString(36) +
                      "=" + transport;
  }
  if (chosenDRMType) {
    drmTypeString = "!drm_" +
                    chosenDRMType.length.toString(36) +
                    "=" + chosenDRMType;
  }
  if (customKeySystem) {
    customKeySystemString = "!customKeySystem_" +
                            customKeySystem.length.toString(36) +
                            "=" + customKeySystem;
  }
  if (licenseServerUrl) {
    licenseServerUrlString = "!licenseServ_" +
                             licenseServerUrl.length.toString(36) +
                             "=" + licenseServerUrl;
  }
  if (serverCertificateUrl) {
    serverCertificateUrlString = "!certServ_" +
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
         (!autoPlay ? "!noAutoplay" : "") +
         (lowLatency ? "!lowLatency" : "") +
         (fallbackKeyError ? "!fallbackKeyError" : "") +
         (fallbackLicenseRequest ? "!fallbackLicenseRequest" : "") +
         transportString +
         urlString +
         drmTypeString +
         customKeySystemString +
         licenseServerUrlString +
         serverCertificateUrlString;
}
