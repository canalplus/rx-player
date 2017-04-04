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

const log = require("../utils/log");
const { normalizeBaseURL } = require("../utils/url");
const { isCodecSupported } = require("./compat");
const { MediaError } = require("../errors");
const { normalize: normalizeLang } = require("../utils/languages");

const representationBaseType = [
  "profiles",
  "width",
  "height",
  "frameRate",
  "audioSamplingRate",
  "mimeType",
  "segmentProfiles",
  "codecs",
  "maximumSAPPeriod",
  "maxPlayoutRate",
  "codingDependency",
  "index",
];

let uniqueId = 0;
const SUPPORTED_ADAPTATIONS_TYPE = ["audio", "video", "text", "image"];
const DEFAULT_PRESENTATION_DELAY = 15;

function parseType(mimeType) {
  return mimeType.split("/")[0];
}

function parseBaseURL(manifest) {
  let baseURL = normalizeBaseURL(manifest.locations[0]);
  const period = manifest.periods[0];
  if (period && period.baseURL) {
    baseURL += "" + period.baseURL;
  }
  return baseURL;
}

/**
 * @param {string} location - the manifest's url
 * @param {Object} manifest - the parsed manifest
 * @param {Array.<Object>|Object} subtitles - Will be added to the manifest,
 * as an adaptation.
 * @param {Array.<Object>|Object} images - Will be added to the manifest,
 * as an adaptation.
 * @returns {Object}
 */
function normalizeManifest(location, manifest, subtitles, images) {
  if (!manifest.transportType) {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  manifest.id = manifest.id || uniqueId++;
  manifest.type = manifest.type || "static";

  const locations = manifest.locations;
  if (!locations || !locations.length) {
    manifest.locations = [location];
  }

  manifest.isLive = manifest.type == "dynamic";

  const rootURL = parseBaseURL(manifest);

  // TODO(pierre): support multi-locations/cdns
  const urlBase = {
    rootURL,
    baseURL: manifest.baseURL,
    isLive: manifest.isLive,
  };

  if (subtitles) {
    subtitles = normalizeSubtitles(subtitles);
  }

  if (images) {
    images = normalizeImages(images);
  }

  const periods = manifest.periods.map((period) => normalizePeriod(period, urlBase, subtitles, images));

  // TODO(pierre): support multiple periods
  manifest = Object.assign({}, manifest, periods[0]);
  manifest.periods = null;

  if (!manifest.duration) {
    manifest.duration = Infinity;
  }

  if (manifest.isLive) {
    manifest.suggestedPresentationDelay = manifest.suggestedPresentationDelay || DEFAULT_PRESENTATION_DELAY;
    manifest.availabilityStartTime = manifest.availabilityStartTime || 0;
  }

  return manifest;
}

function normalizePeriod(period, inherit, subtitles, images) {
  period.id = period.id || uniqueId++;

  let adaptations = period.adaptations;
  adaptations = adaptations.concat(subtitles || []);
  adaptations = adaptations.concat(images || []);
  adaptations = adaptations.map((ada) => normalizeAdaptation(ada, inherit));
  adaptations = adaptations.filter((adaptation) => {
    if (SUPPORTED_ADAPTATIONS_TYPE.indexOf(adaptation.type) < 0) {
      log.info("not supported adaptation type", adaptation.type);
      return false;
    } else {
      return true;
    }
  });

  if (adaptations.length === 0) {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  const adaptationsByType = {};
  for (let i = 0; i < adaptations.length; i++) {
    const adaptation = adaptations[i];
    const adaptationType = adaptation.type;
    const adaptationReps = adaptation.representations;
    adaptationsByType[adaptationType] = adaptationsByType[adaptationType] || [];

    // only keep adaptations that have at least one representation
    if (adaptationReps.length > 0) {
      adaptationsByType[adaptationType].push(adaptation);
    }
  }

  for (const adaptationType in adaptationsByType) {
    if (adaptationsByType[adaptationType].length === 0) {
      throw new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", null, true);
    }
  }

  period.adaptations = adaptationsByType;
  return period;
}

function normalizeAdaptation(adaptation, inherit) {
  if (typeof adaptation.id == "undefined") {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  adaptation = Object.assign({}, inherit, adaptation);

  const inheritedFromAdaptation = {};
  representationBaseType.forEach((baseType) => {
    if (baseType in adaptation) {
      inheritedFromAdaptation[baseType] = adaptation[baseType];
    }
  });

  let representations = adaptation.representations.map(
    (rep) => normalizeRepresentation(rep, inheritedFromAdaptation)
  )
    .sort((a, b) => a.bitrate - b.bitrate);

  let { type, mimeType } = adaptation;
  if (!mimeType) {
    mimeType = representations[0].mimeType;
  }

  if (!mimeType) {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  adaptation.mimeType = mimeType;

  if (!type) {
    type = adaptation.type = parseType(mimeType);
  }

  if (type == "video" || type == "audio") {
    representations = representations.filter((rep) => isCodecSupported(getCodec(rep)));
  }

  adaptation.representations = representations;
  adaptation.bitrates = representations.map((rep) => rep.bitrate);
  return adaptation;
}

function normalizeRepresentation(representation, inherit) {
  if (typeof representation.id == "undefined") {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  representation = Object.assign({}, inherit, representation);

  representation.index = representation.index || {};
  if (!representation.index.timescale) {
    representation.index.timescale = 1;
  }

  if (!representation.bitrate) {
    representation.bitrate = 1;
  }

  // Fix issue in some packagers, like GPAC, generating a non
  // compliant mimetype with RFC 6381. Other closed-source packagers
  // maybe impacted.
  if (representation.codecs == "mp4a.40.02") {
    representation.codecs = "mp4a.40.2";
  }

  return representation;
}

/**
 * Normalize subtitles Object/Array to include it in a normalized manifest.
 * @param {Array.<Object>|Object} subtitles
 * @returns {Array.<Object>}
 */
function normalizeSubtitles(subtitles) {
  if (!Array.isArray(subtitles)) {
    subtitles = [subtitles];
  }

  return subtitles.reduce((allSubs, { mimeType, url, language, languages }) => {
    if (language) {
      languages = [language];
    }

    return allSubs.concat(languages.map((lang) => ({
      id: uniqueId++,
      type: "text",
      lang,
      mimeType,
      rootURL: url,
      baseURL: "",
      representations: [{
        id: uniqueId++,
        mimeType,
        index: {
          indexType: "template",
          duration: Number.MAX_VALUE, // XXX why not Infinity?
          timescale: 1,
          startNumber: 0,
        },
      }],
    })));
  }, []);
}

/**
 * Normalize images Object/Array to include it in a normalized manifest.
 * @param {Array.<Object>|Object} images
 * @returns {Array.<Object>}
 */
function normalizeImages(images) {
  if (!Array.isArray(images)) {
    images = [images];
  }

  return images.map(({ mimeType, url /*, size */ }) => {
    return {
      id: uniqueId++,
      type: "image",
      mimeType,
      rootURL: url,
      baseURL: "",
      representations: [{
        id: uniqueId++,
        mimeType,
        index: {
          indexType: "template",
          duration: Number.MAX_VALUE, // XXX why not Infinity?
          timescale: 1,
          startNumber: 0,
        },
      }],
    };
  });
}

/**
 * Merge dist Object in source Object.
 * _Deep merge_ Object attributes (excepted when they are Arrays or Date
 * instances in which cases it is a simple merge).
 * Think of it as a deeper Object.assign (with only two arguments).
 *
 * /!\ the source is mutated during this process
 * @param {Object} source
 * @param {Object} dist
 * @returns {Object}
 */
function simpleMerge(source, dist) {
  for (const attr in source) {
    if (!dist.hasOwnProperty(attr)) {
      continue;
    }

    const src = source[attr];
    const dst = dist[attr];

    if (typeof src == "string" ||
        typeof src == "number" ||
       (typeof src == "object" && src instanceof Date)) {
      source[attr] = dst;
    }
    else if (Array.isArray(src)) {
      src.length = 0;
      Array.prototype.push.apply(src, dst);
    }
    else {
      source[attr] = simpleMerge(src, dst);
    }
  }

  return source;
}

/**
 * Merge index objects from every newManifest adaptations into the oldManifest
 * adaptations.
 *
 * /!\ mutate oldManifest
 * @param {Object} oldManifest
 * @param {Object} newManifest
 * @returns {Object}
 */
function mergeManifestsIndex(oldManifest, newManifest) {
  const oldAdaptations = oldManifest.adaptations;
  const newAdaptations = newManifest.adaptations;
  for (const type in oldAdaptations) {
    const oldAdas = oldAdaptations[type];
    const newAdas = newAdaptations[type];
    oldAdas.forEach((a, i) => {
      simpleMerge(a.index, newAdas[i].index);
    });
  }
  return oldManifest;
}

function mutateManifestLiveGap(manifest, addedTime=1) {
  if (manifest.isLive) {
    manifest.presentationLiveGap += addedTime;
  }
}

/**
 * Construct the codec string from given codecs and mimetype.
 * @param {Object} representation
 * @returns {string}
 */
function getCodec(representation) {
  const { codecs, mimeType } = representation;
  return `${mimeType};codecs="${codecs}"`;
}

/**
 * Get every adaptations parsed in an array of objects with 3 properties:
 *   - type {string}: e.g. audio/video
 *   - adaptation {Object}: the adaptation itself
 *   - codec {string}: the codec string for this adaptation
 * @param {Object} manifest
 * @returns {Array.<Object>}
 */
function getAdaptations(manifest) {
  const adaptationsByType = manifest.adaptations;
  if (!adaptationsByType) {
    return [];
  }

  const adaptationsList = [];
  for (const type in adaptationsByType) {
    const adaptations = adaptationsByType[type];
    adaptationsList.push({
      type: type,
      adaptations: adaptations,
      codec: getCodec(adaptations[0].representations[0]),
    });
  }

  return adaptationsList;
}

/**
 * Returns only adaptations for a given type (audio/video/image...).
 * @param {Object} manifest
 * @param {string} type
 * @returns {Array.<Object>}
 */
function getAdaptationsByType(manifest, type) {
  const { adaptations } = manifest;
  const adaptationsForType = adaptations && adaptations[type];
  if (adaptationsForType) {
    return adaptationsForType;
  } else {
    return [];
  }
}

function getAvailableLanguages(manifest) {
  return getAdaptationsByType(manifest, "audio")
    .map((ada) => normalizeLang(ada.lang));
}

function getAvailableSubtitles(manifest) {
  return getAdaptationsByType(manifest, "text")
    .map((ada) => normalizeLang(ada.lang));
}

module.exports = {
  normalizeManifest,
  mergeManifestsIndex,
  mutateManifestLiveGap,
  getCodec,
  getAdaptations,
  getAdaptationsByType,
  getAvailableSubtitles,
  getAvailableLanguages,
};
