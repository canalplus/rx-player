// @ts-check

import * as semver from "semver";

/**
 * From the list of given RxPlayer versions, sort them in reverse chronological
 * order.
 *
 * Warn through console if given a non-semver version.
 * @param {Array.<string>} versions - semver versions.
 * @returns {Array.<string>} - Those same versions, sorted in reverse
 * chronological order.
 */
export function sortVersions(versions) {
  return versions
    .filter((v) => {
      if (semver.valid(v) == null) {
        console.warn("WARNING: Invalid semver version:", v);
        return false;
      }
      return true;
    })
    .sort((a, b) => (semver.gt(a, b) ? -1 : 1));
}

export default sortVersions;
