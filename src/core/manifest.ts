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

import { isCodecSupported } from "../compat";
import { MediaError } from "../errors";
import Manifest, {
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "../manifest";
import { IAdaptationArguments } from "../manifest/adaptation";
import { IRepresentationArguments } from "../manifest/representation";
import log from "../utils/log";
import {
  normalizeBaseURL,
  resolveURL,
} from "../utils/url";

interface INormalizedPeriod {
  adaptations : IAdaptationArguments[];
}

const SUPPORTED_ADAPTATIONS_TYPE = ["audio", "video", "text", "image"];

/**
 * Returns the real period's baseURL.
 *
 * Here is how it works:
 *   1. If periods.baseURL is an absolute URL, return it.
 *   2. If periods.baseURL is a relative URL, contatenate it with the
 *      Manifest's URL
 *   3. If periods.baseURL is undefined, just return the URL of the Manifest.
 * @param {Object}
 * @returns {string}
 */
function parseBaseURL(manifest : {
  locations : string[];
  periods : Array<{
    baseURL? : string;
  }>;
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
  manifestObject : any,
  externalTextTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[],
  externalImageTracks : ISupplementaryImageTrack|ISupplementaryImageTrack[]
) : Manifest {
  const locations = manifestObject.locations;
  if (!locations || !locations.length) {
    manifestObject.locations = [url];
  }
  const rootURL = parseBaseURL(manifestObject);

  // TODO(pierre): support multi-locations/cdns
  const inherit = {
    rootURL, // TODO needed for inheritance?
    baseURL: manifestObject.baseURL, // TODO so manifestObject.baseURL is more important
                               // than manifestObject.periods[0].baseURL?
                               // TODO needed for inheritance?
    isLive: manifestObject.isLive, // TODO needed for inheritance?
  };
  const periods = manifestObject.periods.map((period : any) =>
    normalizePeriod(period, inherit)
  ) as INormalizedPeriod[];

  // TODO(pierre): support multiple periods
  const finalManifest = assignAndClone(manifestObject, periods[0]);
  finalManifest.periods = null;

  if (!finalManifest.duration) {
    finalManifest.duration = Infinity;
  }

  const manifest = new Manifest(finalManifest);
  manifest.addSupplementaryTextAdaptations(externalTextTracks);
  manifest.addSupplementaryImageAdaptations(externalImageTracks);
  return manifest;
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
function normalizePeriod(period : any, inherit : any) : INormalizedPeriod {
  const adaptations = period.adaptations
    .map((adaptation : any) =>
      normalizeAdaptation(adaptation, inherit)
    ) as IAdaptationArguments[];

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

  const adaptationsByType : IDictionary<IAdaptationArguments[]> = {};

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
  initialAdaptation : {
    id : string;
    representations : IRepresentationArguments[];
  },
  inherit : any
) : IAdaptationArguments {
  const adaptation : any = assignAndClone(inherit, initialAdaptation);

  let representations = adaptation.representations
    .map((representation : IRepresentationArguments) =>
      normalizeRepresentation(
        representation,
        adaptation.rootURL,
        adaptation.baseURL
      )
    ).sort(
      (a : IRepresentationArguments, b : IRepresentationArguments) =>
        a.bitrate - b.bitrate // bitrate ascending
    ) as IRepresentationArguments[];

  if (adaptation.type === "video" || adaptation.type === "audio") {
    representations = representations
      .filter((representation) => isCodecSupported(getCodec(representation)));
  }

  adaptation.representations = representations;
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
  representation : IRepresentationArguments,
  rootURL? : string,
  baseURL? : string
) : IRepresentationArguments {
  representation.baseURL = resolveURL(rootURL, baseURL, representation.baseURL);
  return representation;
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
  representation : {
    codecs? : string;
    mimeType? : string;
  }
) : string {
  const { codecs = "", mimeType = "" } = representation;
  return `${mimeType};codecs="${codecs}"`;
}

export {
  normalizeManifest,
  updateManifest,
};
