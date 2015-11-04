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

var _ = require("canal-js-utils/misc");
var log = require("canal-js-utils/log");
var assert = require("canal-js-utils/assert");
var { parseBaseURL } = require("canal-js-utils/url");

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

var SUPPORTED_ADAPTATIONS_TYPE = ["audio", "video", "text"];
var DEFAULT_PRESENTATION_DELAY = 15;

function parseType(mimeType) {
  return mimeType.split("/")[0];
}

class Manifest {
  constructor(manifest, compat) {
    this.manifest = manifest;
    this.compat = compat;
  }

  normalize(location, subtitles) {
    var manifest = this.manifest;

    assert(manifest.transportType);
    manifest.id = manifest.id || _.uniqueId();
    manifest.type = manifest.type || "static";

    var locations = manifest.locations;
    if (!locations || !locations.length) {
      manifest.locations = [location];
    }

    manifest.isLive = manifest.type == "dynamic";

    // TODO(pierre): support multi-locations/cdns
    this.urlBase = {
      rootURL: parseBaseURL(manifest.locations[0]),
      baseURL: manifest.baseURL,
      isLive: manifest.isLive,
    };

    if (subtitles) {
      this.subtitles = this._normalizeSubtitles(subtitles);
    } else {
      this.subtitles = null;
    }

    var periods = _.map(manifest.periods, period => this._normalizePeriod(period));

    // TODO(pierre): support multiple periods
    _.extend(manifest, periods[0]);
    manifest.periods = null;

    if (!manifest.duration)
      manifest.duration = Infinity;

    if (manifest.isLive) {
      manifest.suggestedPresentationDelay = manifest.suggestedPresentationDelay || DEFAULT_PRESENTATION_DELAY;
      manifest.availabilityStartTime = manifest.availabilityStartTime || 0;
    }

    return this.manifest;
  }

  _normalizePeriod(period) {
    period.id = period.id || _.uniqueId();

    var adaptations = period.adaptations;
    adaptations = adaptations.concat(this.subtitles || []);
    adaptations = _.map(adaptations, ada => this._normalizeAdaptation(ada));
    adaptations = _.filter(adaptations, (adaptation) => {
      if (SUPPORTED_ADAPTATIONS_TYPE.indexOf(adaptation.type) < 0) {
        log.warn("not supported adaptation type", adaptation.type);
        return false;
      } else {
        return true;
      }
    });

    assert(adaptations.length > 0);

    period.adaptations = _.groupBy(adaptations, "type");
    return period;
  }

  _normalizeAdaptation(adaptation) {
    assert(typeof adaptation.id != "undefined");
    _.defaults(adaptation, this.urlBase);

    var inheritedFromAdaptation = _.pick(adaptation, representationBaseType);
    var representations = _.map(adaptation.representations,
      rep => this._normalizeRepresentation(rep, inheritedFromAdaptation))
      .sort((a, b) => a.bitrate - b.bitrate);

    var { type, mimeType } = adaptation;
    if (!mimeType)
      mimeType = representations[0].mimeType;

    assert(mimeType);

    adaptation.mimeType = mimeType;

    if (!type)
      type = adaptation.type = parseType(mimeType);

    if (type == "video" || type == "audio") {
      representations = _.filter(representations, rep => this._isCodecSupported(getCodec(rep)));
    }

    if (type == "video") {
      representations = [representations[representations.length - 1]];
    }

    assert(representations.length > 0, "manifest: no compatible representation for this adaptation");
    adaptation.representations = representations;
    adaptation.bitrates = _.pluck(representations, "bitrate");
    return adaptation;
  }

  _normalizeRepresentation(representation, inherit) {
    assert(typeof representation.id != "undefined");
    _.defaults(representation, inherit);

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

  _normalizeSubtitles(subtitles) {
    if (!_.isArray(subtitles))
      subtitles = [subtitles];

    return _.flatten(subtitles, ({ mimeType, url, language, languages }) => {
      if (language) {
        languages = [language];
      }

      return _.map(languages, lang => ({
        id: _.uniqueId(),
        type: "text",
        lang,
        mimeType,
        rootURL: url,
        baseURL: "",
        representations: [{
          id: _.uniqueId(),
          mimeType,
          index: {
            indexType: "template",
            duration: Number.MAX_VALUE,
            timescale: 1,
            startNumber: 0,
          }
        }]
      }));
    });
  }

  mergeManifestsIndex(newManifest) {
    var oldManifest = this.manifest;
    var oldAdaptations = oldManifest.adaptations;
    var newAdaptations = newManifest.adaptations;
    for (var type in oldAdaptations) {
      var oldAdas = oldAdaptations[type];
      var newAdas = newAdaptations[type];
      _.each(oldAdas, (a, i) => {
        _.simpleMerge(a.index, newAdas[i].index);
      });
    }
    return oldManifest;
  }

  _isCodecSupported(codec) {
    return this.compat.isCodecSupported(codec);
  }
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

  var adaptationsList = [];
  _.each(_.keys(adaptationsByType), (type) => {
    var adaptations = adaptationsByType[type];
    adaptationsList.push({
      type: type,
      adaptations: adaptations,
      codec: getCodec(adaptations[0].representations[0])
    });
  });

  return adaptationsList;
}

function getAvailableLanguages(manifest) {
  return _.pluck(manifest.adaptations.audio, "lang");
}

function getAvailableSubtitles(manifest) {
  return _.pluck(manifest.adaptations.text, "lang");
}

module.exports = {
  Manifest,
  mutateManifestLiveGap,
  getCodec,
  getAdaptations,
  getAvailableSubtitles,
  getAvailableLanguages,
};
