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
import {
  ICustomError,
  MediaError,
} from "../errors";
import { IParsedPeriod } from "../parsers/manifest";
import arrayFind from "../utils/array_find";
import objectValues from "../utils/object_values";
import PPromise from "../utils/promise";
import {
  createAdaptationObject,
  IRepresentationFilter,
} from "./adaptation";
import {
  IAdaptation,
  IAdaptationType,
  IManifestAdaptations,
  IPeriod,
} from "./types";

/**
 * Create an `IPeriod`-compatible object, which will declare the characteristics
 * of a content during a particular time period.
 * @param {Object} parsedPeriod
 * @param {function|undefined} representationFilter
 * @returns {Array.<Object>} Tuple of two values:
 *   1. The parsed Period as an object
 *   2. Array containing every minor errors that happened when the Manifest has
 *      been created, in the order they have happened..
 */
export async function createPeriodObject(
  args : IParsedPeriod,
  representationFilter? : IRepresentationFilter | undefined
) : Promise<[IPeriod, ICustomError[]]> {
  const warnings : ICustomError[] = [];
  const adaptations : IManifestAdaptations = {};
  for (const type of Object.keys(args.adaptations)) {
    const adapType = type as IAdaptationType;
    const adaptationsForType = args.adaptations[adapType];
    if (adaptationsForType == null) {
      continue;
    }
    const adaptationProms : Array<Promise<IAdaptation>> = [];
    for (const adaptation of adaptationsForType) {
      adaptationProms.push(createAdaptationObject(adaptation,
                                                  { representationFilter }));
    }
    const adaptationArr = await PPromise.all(adaptationProms);
    const filteredAdaptations : IAdaptation[] = [];
    for (const newAdaptation of adaptationArr) {
      if (newAdaptation.representations.length > 0 &&
          !newAdaptation.hasSupport)
      {
        const error =
          new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR",
                         "An Adaptation contains only incompatible codecs.");
        warnings.push(error);
      }
      if (newAdaptation.representations.length > 0) {
        filteredAdaptations.push(newAdaptation);
      }
    }

    if (
      filteredAdaptations.every(adaptation => !adaptation.hasSupport) &&
      adaptationsForType.length > 0 &&
      (adapType === "video" || adapType === "audio"))
    {
      throw new MediaError("MANIFEST_PARSE_ERROR",
                           "No supported " + adapType + " adaptations");
    }

    if (filteredAdaptations.length > 0) {
      adaptations[adapType] = filteredAdaptations;
    }
  }

  if (!Array.isArray(adaptations.video) &&
      !Array.isArray(adaptations.audio))
  {
    throw new MediaError("MANIFEST_PARSE_ERROR",
                         "No supported audio and video tracks.");
  }

  const end = args.duration !== undefined && args.start !== undefined ?
    args.duration + args.start :
    undefined;

  const periodObject : IPeriod = {
    id: args.id,
    adaptations,
    start: args.start,
    duration: args.duration,
    end,
    streamEvents: args.streamEvents ?? [],
    getAdaptations,
    getAdaptationsForType,
    getAdaptation,
    getSupportedAdaptations,
  };
  return [periodObject, warnings];

  /** @link IPeriod */
  function getAdaptations() : IAdaptation[] {
    return objectValues(adaptations).reduce<IAdaptation[]>(
      (acc, adaps) => acc.concat(adaps), []);
  }

  /** @link IPeriod */
  function getAdaptationsForType(adaptationType : IAdaptationType) : IAdaptation[] {
    const adaptationsForType = adaptations[adaptationType];
    return adaptationsForType == null ? [] :
                                        adaptationsForType;
  }

  /** @link IPeriod */
  function getAdaptation(wantedId : string) : IAdaptation|undefined {
    return arrayFind(getAdaptations(), ({ id: adapId }) => wantedId === adapId);
  }

  /** @link IPeriod */
  function getSupportedAdaptations(aType? : IAdaptationType) : IAdaptation[] {
    if (aType === undefined) {
      return getAdaptations().filter(ada => {
        return ada.hasSupport;
      });
    }
    const adaptationsForType = adaptations[aType];
    if (adaptationsForType === undefined) {
      return [];
    }
    return adaptationsForType.filter(ada => {
      return ada.hasSupport;
    });
  }
}
