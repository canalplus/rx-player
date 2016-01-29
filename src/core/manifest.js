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

var log = require("canal-js-utils/log");
var assert = require("canal-js-utils/assert");
var defaults = require("lodash/object/defaults");
var flatten = require("lodash/array/flatten");
var { parseBaseURL } = require("canal-js-utils/url");
var { isCodecSupported } = require("./compat");

var representationBaseType = [
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

var uniqueId = 0;
var SUPPORTED_ADAPTATIONS_TYPE = ["audio", "video", "text"];
var DEFAULT_PRESENTATION_DELAY = 15;

function parseType(mimeType) {
  return mimeType.split("/")[0];
}

function normalizeManifest(location, manifest, subtitles) {
  assert(manifest.transportType);

  manifest.id = manifest.id || uniqueId++;
  manifest.type = manifest.type || "static";

  var locations = manifest.locations;
  if (!locations || !locations.length) {
    manifest.locations = [location];
  }

  manifest.isLive = manifest.type == "dynamic";

  // TODO(pierre): support multi-locations/cdns
  var urlBase = {
    rootURL: parseBaseURL(manifest.locations[0]),
    baseURL: manifest.baseURL,
    isLive: manifest.isLive,
  };

  if (subtitles) {
    subtitles = normalizeSubtitles(subtitles);
  }

  var periods = manifest.periods.map((period) => normalizePeriod(period, urlBase, subtitles));

  // TODO(pierre): support multiple periods
  manifest = { ...manifest, ...periods[0] };
  manifest.periods = null;

  if (!manifest.duration)
    manifest.duration = Infinity;

  if (manifest.isLive) {
    manifest.suggestedPresentationDelay = manifest.suggestedPresentationDelay || DEFAULT_PRESENTATION_DELAY;
    manifest.availabilityStartTime = manifest.availabilityStartTime || 0;
  }

  return manifest;
}

function normalizePeriod(period, inherit, subtitles) {
  period.id = period.id || uniqueId++;

  var adaptations = period.adaptations;
  adaptations = adaptations.concat(subtitles || []);
  adaptations = adaptations.map((ada) => normalizeAdaptation(ada, inherit));
  adaptations = adaptations.filter((adaptation) => {
    if (SUPPORTED_ADAPTATIONS_TYPE.indexOf(adaptation.type) < 0) {
      log.info("not supported adaptation type", adaptation.type);
      return false;
    } else {
      return true;
    }
  });

  assert(adaptations.length > 0);

  var adaptationsByType = {};
  for (var i = 0; i < adaptations.length; i++) {
    var adaptation = adaptations[i];
    var adaptationType = adaptation.type;
    adaptationsByType[adaptationType] = adaptationsByType[adaptationType] || [];
    adaptationsByType[adaptationType].push(adaptation);
  }

  period.adaptations = adaptationsByType;
  return period;
}

function normalizeAdaptation(adaptation, inherit) {
  assert(typeof adaptation.id != "undefined");
  defaults(adaptation, inherit);

  var inheritedFromAdaptation = {};
  representationBaseType.forEach((baseType) => {
    if (baseType in adaptation) {
      inheritedFromAdaptation[baseType] = adaptation[baseType];
    }
  });

  var representations = adaptation.representations.map(
    (rep) => normalizeRepresentation(rep, inheritedFromAdaptation)
  )
    .sort((a, b) => a.bitrate - b.bitrate);

  var { type, mimeType } = adaptation;
  if (!mimeType)
    mimeType = representations[0].mimeType;

  assert(mimeType);

  adaptation.mimeType = mimeType;

  if (!type)
    type = adaptation.type = parseType(mimeType);

  if (type == "video" || type == "audio") {
    representations = representations.filter((rep) => isCodecSupported(getCodec(rep)));
  }

  assert(representations.length > 0, "manifest: no compatible representation for this adaptation");
  adaptation.representations = representations;
  adaptation.bitrates = representations.map((rep) => rep.bitrate);
  return adaptation;
}

function normalizeRepresentation(representation, inherit) {
  assert(typeof representation.id != "undefined");
  defaults(representation, inherit);

  var index = representation.index;
  assert(index);

  if (!index.timescale) {
    index.timescale = 1;
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

function normalizeSubtitles(subtitles) {
  if (!Array.isArray(subtitles))
    subtitles = [subtitles];

  return flatten(subtitles.map(({ mimeType, url, language, languages }) => {
    if (language) {
      languages = [language];
    }

    return languages.map((lang) => ({
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
          duration: Number.MAX_VALUE,
          timescale: 1,
          startNumber: 0,
        },
      }],
    }));
  }));
}

function simpleMerge(source, dist) {
  for (var attr in source) {
    if (!dist.hasOwnProperty(attr)) {
      continue;
    }

    var src = source[attr];
    var dst = dist[attr];

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

function mergeManifestsIndex(oldManifest, newManifest) {
  var oldAdaptations = oldManifest.adaptations;
  var newAdaptations = newManifest.adaptations;
  for (var type in oldAdaptations) {
    var oldAdas = oldAdaptations[type];
    var newAdas = newAdaptations[type];
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

function getCodec(representation) {
  var { codecs, mimeType } = representation;
  return `${mimeType};codecs="${codecs}"`;
}

function getAdaptations(manifest) {
  var adaptationsByType = manifest.adaptations;
  if (!adaptationsByType) {
    return [];
  }

  var adaptationsList = [];
  for (var type in adaptationsByType) {
    var adaptations = adaptationsByType[type];
    adaptationsList.push({
      type: type,
      adaptations: adaptations,
      codec: getCodec(adaptations[0].representations[0]),
    });
  }

  return adaptationsList;
}

function getAdaptationsByType(manifest, type) {
  var { adaptations } = manifest;
  var adaptationsForType = adaptations && adaptations[type];
  if (adaptationsForType) {
    return adaptationsForType;
  } else {
    return [];
  }
}

function getAvailableLanguages(manifest) {
  return getAdaptationsByType(manifest, "audio").map((ada) => ada.lang);
}

function getAvailableSubtitles(manifest) {
  return getAdaptationsByType(manifest, "text").map((ada) => ada.lang);
}

function createDirectFileManifest() {
  return {
    isLive: false,
    duration: Infinity,
    adaptations: null,
  };
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
  createDirectFileManifest,
};
