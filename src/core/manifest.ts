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

import arrayFind = require("array-find");

import arrayIncludes from "../utils/array-includes";

import log from "../utils/log";
import {
  normalizeBaseURL,
  resolveURL,
} from "../utils/url";
import { isCodecSupported } from "../compat";
import { MediaError } from "../errors";
import { normalize as normalizeLang } from "../utils/languages";
import Manifest from "../manifest";
import { IContentProtectionDash } from "../net/dash/types";
import { IContentProtectionSmooth } from "../net/smooth/types";

export interface ISupplementaryTextTrack {
  mimeType : string;
  codecs? : string;
  url : string;
  language? : string;
  languages? : string[];
  closedCaption : boolean;
}

interface INormalizedSupplementaryTextTrack {
  id : string;
  type : "text";
  language : string;
  normalizedLanguage : string;
  accessibility : string[];
  baseURL : string;
  manuallyAdded: true;
  representations: Array<{
    id : string;
    mimeType : string;
    codecs? : string;
    index : {
      indexType : "template",
      duration : number;
      timescale : 1;
      startNumber : 0;
    }
  }>;
}

export interface ISupplementaryImageTrack {
  mimeType : string;
  url : string;
}

interface INormalizedSupplementaryImageTrack {
  id : string;
  type : "image";
  baseURL : string;
  manuallyAdded: true;
  representations: Array<{
    id : string;
    mimeType : string;
    index : {
      indexType : "template",
      duration : number;
      timescale : 1;
      startNumber : 0;
    }
  }>;
}

interface INormalizedRepresentation {
  bitrate : number;
  codec : string;
  codecs : string;
  mimeType : string;
  index : {
    indexType : string;
    duration : number;
    timescale : number;
    startNumber? : number;
  };
  baseURL : string;
  bitsPerSample? : number;
  channels? : number;
  codecPrivateData? : string;
  height? : number;
  id : string;
  packetSize? : number;
  samplingRate? : number;
  width? : number;
}

interface INormalizedAdaptation {
  id : string;
  representations : INormalizedRepresentation[];
  type : string;
  audioDescription? : boolean;
  closedCaption? : boolean;
  contentProtection? : IContentProtectionDash;
  language? : string;
  manuallyAdded? : boolean;
  normalizedLanguage? : string;
  smoothProtection? : IContentProtectionSmooth;
}

interface INormalizedPeriod {
  adaptations : INormalizedAdaptation[];
}

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

/**
 * @param {Object}
 * @returns {string}
 */
function parseBaseURL(manifest : {
  locations : string[],
  periods : Array<{
    baseURL? : string,
  }>,
}) : string {
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
  url : string,
  manifest : any,
  externalTextTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[],
  externalImageTracks : ISupplementaryImageTrack|ISupplementaryImageTrack[]
) : Manifest {
  // transportType == "smooth"|"dash"
  if (!manifest.transportType) {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  // TODO cleaner ID
  manifest.id = manifest.id || "gen-manifest-" + uniqueId++;

  // "static"|"dynamic"
  manifest.type = manifest.type || "static";
  manifest.isLive = manifest.type === "dynamic";

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
  const periods = manifest.periods.map((period : any) =>
    normalizePeriod(period, inherit, externalTextTracks, externalImageTracks)
  ) as INormalizedPeriod[];

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
  period : any,
  inherit : any,
  externalTextTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[],
  externalImageTracks : ISupplementaryImageTrack|ISupplementaryImageTrack[]
) : INormalizedPeriod {
  if (typeof period.id === "undefined") {
    // TODO cleaner ID
    period.id = "gen-period-" + uniqueId++;

    // TODO Generate ID higher and throw here?
    // throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  const adaptations = period.adaptations
    .map((adaptation : any) =>
      normalizeAdaptation(adaptation, inherit)
    ) as INormalizedAdaptation[];

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

  const adaptationsByType : IDictionary<INormalizedAdaptation[]> = {};

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
function normalizeAdaptation(
  initialAdaptation : { id : string, representations : Array<{ id : string }> },
  inherit : any
) : INormalizedAdaptation {
  if (typeof initialAdaptation.id === "undefined") {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  const adaptation : any = assignAndClone(inherit, initialAdaptation);

  // representations in this adaptation will inherit the props of this object
  const toInheritFromAdaptation : any = {};
  representationBaseType.forEach((baseType) => {
    if (baseType in adaptation) {
      toInheritFromAdaptation[baseType] = adaptation[baseType];
    }
  });

  let representations = adaptation.representations
    .map((representation : { id : string } ) =>
      normalizeRepresentation(
        representation,
        toInheritFromAdaptation,
        adaptation.rootURL,
        adaptation.baseURL
      )
    ).sort(
      (a : INormalizedRepresentation, b : INormalizedRepresentation) =>
        a.bitrate - b.bitrate // bitrate ascending
    ) as INormalizedRepresentation[];

  const { type, accessibility = [] } = adaptation;
  if (!type) {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }
  if (type === "video" || type === "audio") {
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
  initialRepresentation : { id: string },
  inherit : any,
  rootURL? : string,
  baseURL? : string
) : INormalizedRepresentation {
  if (typeof initialRepresentation.id === "undefined") {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  const representation : any = assignAndClone(inherit, initialRepresentation);

  if (!representation.index) {
    // if we have no index, it must mean the whole file is directly accessible
    // as is. Simulate a "template" for now as it is the most straightforward.
    // TODO own indexType
    representation.index = {
      indexType: "template",
      duration: Number.MAX_VALUE,
      timescale: 1,
      startNumber: 0,
    };
  } else if (!representation.index.timescale) {
    representation.index.timescale = 1;
  }

  if (representation.bitrate == null) {
    representation.bitrate = 1;
  } else if (representation.bitrate === 0) {
    log.warn("One of your representation has an invalid bitrate of 0.");
  }

  // Fix issue in some packagers, like GPAC, generating a non
  // compliant mimetype with RFC 6381. Other closed-source packagers
  // may be impacted.
  if (representation.codecs === "mp4a.40.02") {
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
function normalizeSupplementaryTextTracks(
  textTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[]
) : INormalizedSupplementaryTextTrack[] {
  const _textTracks = Array.isArray(textTracks) ? textTracks : [textTracks];
  return _textTracks.reduce((allSubs : INormalizedSupplementaryTextTrack[], {
    mimeType,
    codecs,
    url,
    language,
    languages,
    closedCaption,
  }) => {
    const langsToMapOn : string[] = language ? [language] : languages || [];

    return allSubs.concat(langsToMapOn.map((_language) => ({
      // TODO cleaner ID
      id: "gen-text-ada-" + uniqueId++,

      // TODO open a TypeScript issue?
      type: "text" as "text",
      language: _language,
      normalizedLanguage: normalizeLang(_language),
      accessibility: closedCaption ? ["hardOfHearing"] : [],
      baseURL: url,
      manuallyAdded: true as true,
      representations: [{
        // TODO cleaner ID
        id: "gen-text-rep-" + uniqueId++,
        mimeType,
        codecs,
        index: {
          indexType: "template" as "template",
          duration: Number.MAX_VALUE,
          timescale: 1 as 1,
          startNumber: 0 as 0,
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
function normalizeSupplementaryImageTracks(
  imageTracks : ISupplementaryImageTrack|ISupplementaryImageTrack[]
) : INormalizedSupplementaryImageTrack[] {
  const _imageTracks = Array.isArray(imageTracks) ? imageTracks : [imageTracks];
  return _imageTracks.map(({ mimeType, url /*, size */ }) => {
    return {
      id: "gen-image-ada-" + uniqueId++,
      type: "image" as "image",
      baseURL: url,
      manuallyAdded: true as true,
      representations: [{
        id: "gen-image-rep-" + uniqueId++,
        mimeType,
        index: {
          indexType: "template" as "template",
          duration: Number.MAX_VALUE,
          timescale: 1 as 1,
          startNumber: 0 as 0,
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
function assignAndClone<T>(target : T) : T;
function assignAndClone<T, U>(target : T, source : U) : T & U;
function assignAndClone(...args : any[]) : any {
  const res : IDictionary<any> = {};

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

// TODO Check and re-check the id thing
function updateManifest(
  oldManifest : Manifest,
  newManifest : Manifest
) : Manifest {
  const oldAdaptations = oldManifest.getAdaptations();
  const newAdaptations = newManifest.getAdaptations();

  for (let i = 0; i < oldAdaptations.length; i++) {
    const newAdaptation =
      arrayFind(newAdaptations, a => a.id === oldAdaptations[i].id);

    if (!newAdaptation) {
      log.warn(
        `manifest: adaptation "${oldAdaptations[i].id}" not found when merging.`
      );
    } else {
      const oldRepresentations = oldAdaptations[i].representations;
      const newRepresentations = newAdaptation.representations;
      for (let j = 0; j < oldRepresentations.length; j++) {
        const newRepresentation =
          arrayFind(newRepresentations, r => r.id === oldRepresentations[j].id);

        if (!newRepresentation) {
          /* tslint:disable:max-line-length */
          log.warn(
            `manifest: representation "${oldRepresentations[j].id}" not found when merging.`
          );
          /* tslint:enable:max-line-length */
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
function getCodec(
  representation : { codec? : string, mimeType? : string }
) : string {
  const { codec = "", mimeType = "" } = representation;
  return `${mimeType};codecs="${codec}"`;
}

export {
  normalizeManifest,
  getCodec,
  updateManifest,
};
