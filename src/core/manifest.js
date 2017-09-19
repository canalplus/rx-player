/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * TODO That file here should be progressively removed:
 *   - the net directory contains transport utils which include manifest
 *     parsers.
 *
 *   - the manifest directory defines a common class for manifest and sub-parts
 *     of a manifest.
 *
 * The best may be to have what is returned by net directly fed to the
 * instanciation of the manifest class.
 *
 * Due to that, some parts should be moved to net/, other to manifest/.
 *
 * Kept for now, as it just werks, but this might become a problem for
 * maintability and future evolutions.
 */

import arrayFind from "array-find";
import arrayIncludes from "../utils/array-includes.js";

import log from "../utils/log";
import {
  normalizeBaseURL,
  resolveURL,
} from "../utils/url";
import { isCodecSupported } from "../compat";
import { MediaError } from "../errors";
import { normalize as normalizeLang } from "../utils/languages";
import Manifest from "../manifest";

/**
 * Representation keys directly inherited from the adaptation.
 * If any of those keys are in an adaptation but not in one of its
 * representation, it will be inherited.
 */
const representationBaseType = [
  "audioSamplingRate",
  "codecs",
  "codingDependency",
  "frameRate",
  "height",
  "index",
  "maxPlayoutRate",
  "maximumSAPPeriod",
  "mimeType",
  "profiles",
  "segmentProfiles",
  "width",
];

let uniqueId = 0;
const SUPPORTED_ADAPTATIONS_TYPE = ["audio", "video", "text", "image"];

function parseBaseURL(manifest) {
  const baseURL = normalizeBaseURL(manifest.locations[0]);
  const period = manifest.periods[0];
  if (period && period.baseURL) {
    return resolveURL(baseURL, period.baseURL);
  }
  return baseURL;
}

/**
 * @param {string} url - the manifest's url
 * @param {Object} manifest - the parsed manifest
 * @param {Array.<Object>|Object} externalTextTracks - Will be added to the
 * manifest as an adaptation.
 * @param {Array.<Object>|Object} externalImageTracks - Will be added to the
 * manifest as an adaptation.
 *
 * @throws MediaError - throw if the manifest has no transportType set
 * @throws MediaError - Throws if one of the periods has no id property defined
 *
 * @throws MediaError - Throws if one of the periods has no adaptation in the
 * types understood by the RxPlayer
 *
 * @throws MediaError - Throws if one of the periods has no representation in a
 * codec supported by the browser
 *
 * @throws MediaError - Throws if one of the adaptations has no id property
 * defined
 *
 * @throws MediaError - Throws if one of the adaptations does not have any type
 *
 * @throws MediaError - Throws if one of the representations has no id property
 * defined
 *
 * @returns {Object}
 */
function normalizeManifest(
  url,
  manifest,
  externalTextTracks,
  externalImageTracks
) {
  // transportType == "smooth"|"dash"
  if (!manifest.transportType) {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  // TODO cleaner ID
  manifest.id = manifest.id || "gen-manifest-" + uniqueId++;

  // "static"|"dynamic"
  manifest.type = manifest.type || "static";
  manifest.isLive = manifest.type == "dynamic";

  const locations = manifest.locations;
  if (!locations || !locations.length) {
    manifest.locations = [url];
  }

  const rootURL = parseBaseURL(manifest);

  // TODO(pierre): support multi-locations/cdns
  const inherit = {
    rootURL, // TODO needed for inheritance?
    baseURL: manifest.baseURL, // TODO so manifest.baseURL is more important
                               // than manifest.periods[0].baseURL?
                               // TODO needed for inheritance?
    isLive: manifest.isLive, // TODO needed for inheritance?
  };

  const periods = manifest.periods.map((period) =>
    normalizePeriod(period, inherit, externalTextTracks, externalImageTracks));

  // TODO(pierre): support multiple periods
  manifest = assignAndClone(manifest, periods[0]);
  manifest.periods = null;

  if (!manifest.duration) {
    manifest.duration = Infinity;
  }

  if (manifest.isLive) {
    manifest.suggestedPresentationDelay =
      manifest.suggestedPresentationDelay || 0;

    manifest.availabilityStartTime = manifest.availabilityStartTime || 0;
  }

  return new Manifest(manifest);
}

// /**
//  * Put every IDs from the manifest in an array.
//  * It collects the ID from:
//  *   - the manifest
//  *   - the periods
//  *   - the adaptations
//  *   - the representations
//  *
//  * Can be used to ensure a newly created ID is not yet already defined.
//  *
//  * @param {Object} manifest
//  * @param {Array.<string|Number>}
//  */
// function collectEveryIDs(manifest) {
//   const currentIDs = [];

//   if (manifest.id != null) {
//     currentIDs.push(manifest.id);
//   }

//   manifest.periods.forEach(period => {
//     if (period.id != null) {
//       currentIDs.push(period.id);
//     }
//     period.adaptations.forEach(adaptation => {
//       if (adaptation.id != null) {
//         currentIDs.push(adaptation.id);
//       }
//       adaptation.representation.forEach(representation => {
//         if (representation.id != null) {
//           currentIDs.push(representation.id);
//         }
//       });
//     });
//   });

//   return currentIDs;
// }

// /**
//  * Set IDs if they are not found for:
//  */
// function setMissingIDs(manifest) {
//   const currentIDs = [];

//   if (manifest.id != null) {
//     currentIDs.push(manifest.id);
//   }

//   manifest.periods.forEach(period => {
//     if (period.id != null) {
//       currentIDs.push(period.id);
//     }
//     period.adaptations.forEach(adaptation => {
//       if (adaptation.id != null) {
//         currentIDs.push(adaptation.id);
//       }
//       adaptation.representation.forEach(representation => {
//         if (representation.id != null) {
//           currentIDs.push(representation.id);
//         }
//       });
//     });
//   });

//   if (manifest.id == null) {
//     let IDBase = 0;
//     const basename = "manifest-";
//     while (currentIDs.include(basename + ++IDBase)) {
//       if (IDBase === Number.MAX_VALUE) {
//         throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
//       }
//     }
//     manifest.id = basename + IDBase;
//     currentIDs.push(manifest.id);
//   }

//   manifest.periods.forEach(period => {
//     if (period.id == null) {
//       let IDBase = 0;
//       const basename = "period-";
//       while (currentIDs.include(basename + ++IDBase)) {
//         if (IDBase === Number.MAX_VALUE) {
//           throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
//         }
//       }
//       period.id = basename + IDBase;
//       currentIDs.push(period.id);
//     }
//     period.adaptations.forEach(adaptation => {
//       if (adaptation.id == null) {
//         let IDBase = 0;
//         const basename = "adaptation-";
//         while (currentIDs.include(basename + ++IDBase)) {
//           if (IDBase === Number.MAX_VALUE) {
//             throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
//           }
//         }
//         adaptation.id = basename + IDBase;
//         currentIDs.push(adaptation.id);
//       }
//       adaptation.representation.forEach(representation => {
//         if (representation.id == null) {
//           let IDBase = 0;
//           const basename = "representation-";
//           while (currentIDs.include(basename + ++IDBase)) {
//             if (IDBase === Number.MAX_VALUE) {
//               throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
//             }
//           }
//           representation.id = basename + IDBase;
//           currentIDs.push(representation.id);
//         }
//       });
//     });
//   });
// }

/**
 * @param {Object} period
 * @param {Object} inherit
 * @param {Array.<Object>|Object} [addedTextTracks]
 * @param {Array.<Object>|Object} [addedImageTracks]
 *
 * @throws MediaError - Throws if the period has no id property defined
 *
 * @throws MediaError - Throws if the period has no adaptation in the types
 * understood by the RxPlayer
 *
 * @throws MediaError - Throws if the period has no representation in a codec
 * supported by the browser
 *
 * @throws MediaError - Throws if one of the adaptations has no id property
 * defined
 *
 * @throws MediaError - Throws if one of the adaptations does not have any type
 *
 * @throws MediaError - Throws if one of the representations has no id property
 * defined
 *
 * @returns {Object} period
 */
function normalizePeriod(
  period,
  inherit,
  externalTextTracks,
  externalImageTracks
) {
  if (typeof period.id == "undefined") {
    // TODO cleaner ID
    period.id = "gen-period-" + uniqueId++;

    // TODO Generate ID higher and throw here?
    // throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  const adaptations = period.adaptations
    .map((adaptation) => normalizeAdaptation(adaptation, inherit));

  if (externalTextTracks) {
    adaptations.push(
      ...normalizeSupplementaryTextTracks(externalTextTracks)
        .map(adaptation => normalizeAdaptation(adaptation, inherit))
    );
  }

  if (externalImageTracks) {
    adaptations.push(
      ...normalizeSupplementaryImageTracks(externalImageTracks)
        .map(adaptation => normalizeAdaptation(adaptation, inherit))
    );
  }

  // filter out adaptations from unsupported types
  const filteredAdaptations = adaptations.filter((adaptation) => {
    if (SUPPORTED_ADAPTATIONS_TYPE.indexOf(adaptation.type) < 0) {
      log.info("not supported adaptation type", adaptation.type);
      return false;
    } else {
      return true;
    }
  });

  if (filteredAdaptations.length === 0) {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  const adaptationsByType = {};

  // construct adaptationsByType object
  for (let i = 0; i < filteredAdaptations.length; i++) {
    const adaptation = filteredAdaptations[i];
    const adaptationReps = adaptation.representations;
    const adaptationType = adaptation.type;

    if (!adaptationsByType[adaptationType]) {
      adaptationsByType[adaptationType] = [];
    }

    // only keep adaptations that have at least one representation
    if (adaptationReps.length > 0) {
      adaptationsByType[adaptationType].push(adaptation);
    }
  }

  // TODO Throwing this way is ugly and could not work with future improvements
  // Find better way to really detect if the codecs are incompatible
  for (const adaptationType in adaptationsByType) {
    if (adaptationsByType[adaptationType].length === 0) {
      throw new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", null, true);
    }
  }

  period.adaptations = adaptationsByType;
  return period;
}

/**
 * TODO perform some cleanup like adaptations.index (indexes are
 * in the representations)
 *
 * @param {Object} initialAdaptation
 * @param {Object} inherit
 *
 * @throws MediaError - Throws if the adaptation has no id property defined
 * @throws MediaError - Throws if the adaptation does not have any type
 * @throws MediaError - Throws if one of the representations has no id property
 * defined
 *
 * @returns {Object} adaptation
 */
function normalizeAdaptation(initialAdaptation, inherit) {
  if (typeof initialAdaptation.id == "undefined") {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  const adaptation = assignAndClone(inherit, initialAdaptation);

  // representations in this adaptation will inherit the props of this object
  const toInheritFromAdaptation = {};
  representationBaseType.forEach((baseType) => {
    if (baseType in adaptation) {
      toInheritFromAdaptation[baseType] = adaptation[baseType];
    }
  });

  let representations = adaptation.representations
    .map((representation) =>
      normalizeRepresentation(
        representation,
        toInheritFromAdaptation,
        adaptation.rootURL,
        adaptation.baseURL,
      )
    ).sort((a, b) => a.bitrate - b.bitrate); // bitrate ascending

  const { type, accessibility = [] } = adaptation;
  if (!type) {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  if (type == "video" || type == "audio") {
    representations = representations
      .filter((representation) => isCodecSupported(getCodec(representation)));

    if (type === "audio") {
      const isAudioDescription =
        arrayIncludes(accessibility, "visuallyImpaired");
      adaptation.audioDescription = isAudioDescription;
    }
  }
  else if (type === "text") {
    const isHardOfHearing = arrayIncludes(accessibility, "hardOfHearing");
    adaptation.closedCaption = isHardOfHearing;
  }

  adaptation.representations = representations;
  adaptation.bitrates = representations.map((rep) => rep.bitrate);
  return adaptation;
}

  /**
   * @param {Object} initialRepresentation
   * @param {Object} inherit
   * @param {string} [rootURL]
   * @param {string} [baseURL]
   *
 * @throws MediaError - Throws if the representation has no id property defined
 *
   * @returns {Object}
   */
function normalizeRepresentation(
  initialRepresentation,
  inherit,
  rootURL,
  baseURL
) {
  if (typeof initialRepresentation.id == "undefined") {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  const representation = assignAndClone(inherit, initialRepresentation);

  representation.index = representation.index || {};
  if (!representation.index.timescale) {
    representation.index.timescale = 1;
  }

  if (!representation.bitrate) {
    representation.bitrate = 1;
  }

  // Fix issue in some packagers, like GPAC, generating a non
  // compliant mimetype with RFC 6381. Other closed-source packagers
  // may be impacted.
  if (representation.codecs == "mp4a.40.02") {
    representation.codecs = "mp4a.40.2";
  }

  representation.baseURL = resolveURL(rootURL, baseURL, representation.baseURL);
  representation.codec = representation.codecs;
  return representation;
}

/**
 * Normalize text tracks Object/Array to a normalized manifest adaptation.
 * @param {Array.<Object>|Object} subtitles
 * @returns {Array.<Object>}
 */
function normalizeSupplementaryTextTracks(textTracks) {
  const _textTracks = Array.isArray(textTracks) ? textTracks : [textTracks];
  return _textTracks.reduce((allSubs, {
    mimeType,
    codecs,
    url,
    language,
    languages,
    closedCaption,
  }) => {
    if (language) {
      languages = [language];
    }

    return allSubs.concat(languages.map((language) => ({
      // TODO cleaner ID
      id: "gen-text-ada-" + uniqueId++,
      type: "text",
      language,
      normalizedLanguage: normalizeLang(language),
      accessibility: closedCaption ? ["hardOfHearing"] : [],
      baseURL: url,
      representations: [{
        // TODO cleaner ID
        id: "gen-text-rep-" + uniqueId++,
        mimeType,
        codecs,
        index: {
          indexType: "template",
          duration: Number.MAX_VALUE,
          timescale: 1,
          startNumber: 0,
        },
      }],
    })));
  }, []);
}

/**
 * Normalize image tracks Object/Array to a normalized manifest adaptation.
 * @param {Array.<Object>|Object} images
 * @returns {Array.<Object>}
 */
function normalizeSupplementaryImageTracks(imageTracks) {
  const _imageTracks = Array.isArray(imageTracks) ? imageTracks : [imageTracks];
  return _imageTracks.map(({ mimeType, url /*, size */ }) => {
    return {
      // TODO cleaner ID
      id: "gen-image-ada-" + uniqueId++,
      type: "image",
      baseURL: url,
      representations: [{
        // TODO cleaner ID
        id: "gen-image-rep-" + uniqueId++,
        mimeType,
        index: {
          indexType: "template",
          duration: Number.MAX_VALUE,
          timescale: 1,
          startNumber: 0,
        },
      }],
    };
  });
}

/**
 * Returns an object which is a merge of all arguments given
 * (Object.assign-like) but with all the corresponding merged attributes
 * cloned (they do not share the same references than the original attributes).
 *
 * This is useful to keep representations, for example, sharing inherited
 * Objects to also share their references. In that case, an update of a single
 * representation would update every other one.
 *
 * @param {...Object} args
 * @returns {Object}
 */
function assignAndClone(...args) {
  const res = {};

  for (let i = args.length - 1; i >= 0; i--) {
    const arg = args[i];
    for (const attr in arg) {
      if (res.hasOwnProperty(attr)) {
        continue;
      }

      const val = arg[attr];
      if (val && typeof val === "object") {
        if (val instanceof Date) {
          res[attr] = new Date(val.getTime());
        }
        else if (Array.isArray(val)) {
          res[attr] = val.slice(0);
        }
        else {
          res[attr] = assignAndClone(val);
        }
      } else {
        res[attr] = val;
      }
    }
  }

  return res;
}

// XXX TODO Check and re-check the id thing
function updateManifest(oldManifest, newManifest) {
  const findElementFromId = (id, elements) =>
    arrayFind(elements, obj => obj.id === id);

  const oldAdaptations = oldManifest.getAdaptations();
  const newAdaptations = newManifest.getAdaptations();

  for (let i = 0; i < oldAdaptations.length; i++) {
    const newAdaptation =
      findElementFromId(oldAdaptations[i].id, newAdaptations);

    if (!newAdaptation) {
      log.warn(
        `manifest: adaptation "${oldAdaptations[i].id}" not found when merging.`
      );
    } else {
      const oldRepresentations = oldAdaptations[i].representations;
      const newRepresentations = newAdaptation.representations;
      for (let j = 0; j < oldRepresentations.length; j++) {
        const newRepresentation =
          findElementFromId(oldRepresentations[j].id, newRepresentations);

        if (!newRepresentation) {
          log.warn(
            `manifest: representation "${oldRepresentations[j].id}" not found when merging.`
          );
        } else {
          oldRepresentations[j].index.update(newRepresentation.index);
        }
      }
    }
  }
  return oldManifest;
}

/**
 * Construct the codec string from given codecs and mimetype.
 * @param {Object} representation
 * @returns {string}
 */
function getCodec(representation) {
  const { codec, mimeType } = representation;
  return `${mimeType};codecs="${codec}"`;
}

export {
  normalizeManifest,
  getCodec,
  updateManifest,
};
