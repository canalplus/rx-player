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

import { IParsedAdaptation } from "../parsers/manifest";
import arrayFind from "../utils/array_find";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import normalizeLanguage from "../utils/languages";
import PPromise from "../utils/promise";
import uniq from "../utils/uniq";
import { createRepresentationObject } from "./representation";
import type {
  IAdaptation,
  IAdaptationType,
  IExposedRepresentation,
  IRepresentation,
} from "./types";

/** List in an array every possible value for the Adaptation's `type` property. */
export const SUPPORTED_ADAPTATIONS_TYPE: IAdaptationType[] = [ "audio",
                                                               "video",
                                                               "text",
                                                               "image" ];

/**
 * Create an `IAdaptation`-compatible object, which will declare a single
 * "Adaptation" (i.e. track) of a content.
 * @param {Object} parsedAdaptation
 * @param {Object|undefined} [options]
 * @returns {Object}
 */
export async function createAdaptationObject(
  parsedAdaptation : IParsedAdaptation,
  options : { representationFilter? : IRepresentationFilter | undefined;
              isManuallyAdded? : boolean | undefined; } = {}
) : Promise<IAdaptation> {
  const { trickModeTracks } = parsedAdaptation;
  const { representationFilter, isManuallyAdded } = options;

  const adaptationObj : IAdaptation = {
    id: parsedAdaptation.id,
    type: parsedAdaptation.type,
    representations: [],
    hasSupport: false,
    getAvailableBitrates,
    getPlayableRepresentations,
    getRepresentation,
  };

  if  (parsedAdaptation.isTrickModeTrack !== undefined) {
    adaptationObj.isTrickModeTrack = parsedAdaptation.isTrickModeTrack;
  }

  if (parsedAdaptation.language !== undefined) {
    adaptationObj.language = parsedAdaptation.language;
    adaptationObj.normalizedLanguage = normalizeLanguage(parsedAdaptation.language);
  }

  if (parsedAdaptation.closedCaption !== undefined) {
    adaptationObj.isClosedCaption = parsedAdaptation.closedCaption;
  }
  if (parsedAdaptation.audioDescription !== undefined) {
    adaptationObj.isAudioDescription = parsedAdaptation.audioDescription;
  }
  if (parsedAdaptation.isDub !== undefined) {
    adaptationObj.isDub = parsedAdaptation.isDub;
  }
  if (parsedAdaptation.isSignInterpreted !== undefined) {
    adaptationObj.isSignInterpreted = parsedAdaptation.isSignInterpreted;
  }

  if (trickModeTracks !== undefined &&
      trickModeTracks.length > 0) {
    adaptationObj.trickModeTracks = [];
    for (const track of trickModeTracks) {
      adaptationObj.trickModeTracks.push(await createAdaptationObject(track));
    }
  }

  const argsRepresentations = parsedAdaptation.representations;
  const representationProms : Array<Promise<IRepresentation>> = [];
  let hasSupport : boolean = false;
  for (let i = 0; i < argsRepresentations.length; i++) {
    representationProms.push(createRepresentationObject(argsRepresentations[i],
                                                        { type: adaptationObj.type }));
  }
  const representations = await PPromise.all(representationProms);
  const filteredRepresentations : IRepresentation[] = [];
  for (const representation of representations) {
    const shouldAdd =
      isNullOrUndefined(representationFilter) ||
      representationFilter(representation,
                           { bufferType: adaptationObj.type,
                             language: adaptationObj.language,
                             normalizedLanguage: adaptationObj.normalizedLanguage,
                             isClosedCaption: adaptationObj.isClosedCaption,
                             isDub: adaptationObj.isDub,
                             isAudioDescription: adaptationObj.isAudioDescription,
                             isSignInterpreted: adaptationObj.isSignInterpreted });
    if (shouldAdd) {
      filteredRepresentations.push(representation);
      if (!hasSupport &&
          representation.isCodecSupported &&
          representation.isSupported !== false)
      {
        hasSupport = true;
      }
    }
  }
  filteredRepresentations.sort((a, b) => a.bitrate - b.bitrate);
  adaptationObj.representations = filteredRepresentations;
  adaptationObj.hasSupport = hasSupport;

  // for manuallyAdded adaptations (not in the manifest)
  adaptationObj.manuallyAdded = isManuallyAdded === true;

  return adaptationObj;

  /** @link IAdaptation */
  function getAvailableBitrates() : number[] {
    const bitrates : number[] = [];
    for (let i = 0; i < adaptationObj.representations.length; i ++) {
      const representation = adaptationObj.representations[i];
      if (representation.decipherable !== false) {
        bitrates.push(representation.bitrate);
      }
    }
    return uniq(bitrates);
  }

  /** @link IAdaptation */
  function getPlayableRepresentations() : IRepresentation[] {
    return adaptationObj.representations.filter(rep => {
      return rep.isCodecSupported &&
             rep.decipherable !== false &&
             rep.isSupported !== false;
    });
  }

  /** @link IAdaptation */
  function getRepresentation(wantedId : number|string) : IRepresentation|undefined {
    return arrayFind(adaptationObj.representations, ({ id }) => wantedId === id);
  }
}

/**
 * Information describing a single Representation from an Adaptation, to be used
 * in the `representationFilter` API.
 */
export interface IRepresentationInfos {
  bufferType: IAdaptationType;
  language?: string | undefined;
  isAudioDescription? : boolean | undefined;
  isClosedCaption? : boolean | undefined;
  isDub? : boolean | undefined;
  isSignInterpreted?: boolean | undefined;
  normalizedLanguage? : string | undefined;
}

/** Type for the `representationFilter` API. */
export type IRepresentationFilter = (representation: IExposedRepresentation,
                                     adaptationInfos: IRepresentationInfos) => boolean;
