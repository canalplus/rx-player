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

import arrayFind from "array-find";
import log from "../../../log";
import arrayIncludes from "../../../utils/array-includes";
import { normalize as normalizeLang } from "../../../utils/languages";
import { resolveURL } from "../../../utils/url";
import {
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedRepresentation,
} from "../types";
import inferAdaptationType from "../utils/infer_adaptation_type";
import {
  isHardOfHearing,
  isVisuallyImpaired,
} from "./helpers";
import {
  IAdaptationSetIntermediateRepresentation
} from "./node_parsers/AdaptationSet";
import parseRepresentations from "./parseRepresentations";

// Supplementary context about the current Period
export interface IPeriodInfos {
  isDynamic : boolean; // Whether the Manifest can evolve with time
  start : number; // Start time of the current period, in seconds
  baseURL? : string; // Eventual URL from which every relative URL will be based
                     // on
}

// Supplementary informations for "switchable" AdaptationSets of the same Period
interface IAdaptationSwitchingInfos  {
  [originalID : string] : { // ID as announced in the MPD
    newID : string; // ID in the currently parsed Manifest
    adaptationSetSwitchingIDs : string[]; // IDs (as announced in the MPD),
                                          // this AdaptationSet can be
                                          // seamlessly switched to
  };
}

/**
 * Contruct Adaptation ID from the informations we have.
 * @param {Object} adaptation
 * @param {Array.<Object>} representations
 * @param {Object} infos
 * @returns {string}
 */
function getAdaptationID(
  adaptation : IAdaptationSetIntermediateRepresentation,
  representations : IParsedRepresentation[],
  infos : { isClosedCaption? : boolean; isAudioDescription? : boolean; type : string }
) : string {
  if (adaptation.attributes.id) {
    return adaptation.attributes.id;
  }

  let idString = infos.type;
  if (adaptation.attributes.language) {
    idString += `-${adaptation.attributes.language}`;
  }
  if (infos.isClosedCaption) {
    idString += "-cc";
  }
  if (infos.isAudioDescription) {
    idString += "-ad";
  }
  if (adaptation.attributes.contentType) {
    idString += `-${adaptation.attributes.contentType}`;
  }
  if (adaptation.attributes.codecs) {
    idString += `-${adaptation.attributes.codecs}`;
  }
  if (adaptation.attributes.mimeType) {
    idString += `-${adaptation.attributes.mimeType}`;
  }
  if (adaptation.attributes.frameRate) {
    idString += `-${adaptation.attributes.frameRate}`;
  }
  if (idString.length === infos.type.length) {
    idString += representations.length ?
      ("-" + representations[0].id) : "-empty";
  }
  return "adaptation-" + idString;
}

/**
 * Returns a list of ID this adaptation can be seamlessly switched to
 * @param {Object} adaptation
 * @returns {Array.<string>}
 */
function getAdaptationSetSwitchingIDs(
  adaptation : IAdaptationSetIntermediateRepresentation
) : string[] {
  if (adaptation.children.supplementalProperties != null) {
    const { supplementalProperties } = adaptation.children;
    for (let j = 0; j < supplementalProperties.length; j++) {
      const supplementalProperty = supplementalProperties[j];
      if (
        supplementalProperty.schemeIdUri ===
        "urn:mpeg:dash:adaptation-set-switching:2016" &&
        supplementalProperty.value != null
      ) {
        return supplementalProperty.value.split(",")
          .map(id => id.trim())
          .filter(id => id);
      }
    }
  }
  return [];
}

/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @returns {Array.<Object>}
 */
export default function parseAdaptationSets(
  adaptationsIR : IAdaptationSetIntermediateRepresentation[],
  periodInfos : IPeriodInfos
): IParsedAdaptations {
  return adaptationsIR
    .reduce<{
      adaptations : IParsedAdaptations;
      adaptationSwitchingInfos : IAdaptationSwitchingInfos;
      videoMainAdaptation : IParsedAdaptation|null;
    }>((acc, adaptation) => {
      const adaptationChildren = adaptation.children;
      const parsedAdaptations = acc.adaptations;
      const representationsIR = adaptation.children.representations;
      const representations = parseRepresentations(representationsIR, adaptation, {
        isDynamic: periodInfos.isDynamic,
        start: periodInfos.start,
        baseURL: resolveURL(periodInfos.baseURL, adaptationChildren.baseURL),
      });
      const adaptationMimeType = adaptation.attributes.mimeType;
      const adaptationCodecs = adaptation.attributes.codecs;
      const representationMimeTypes = representations
        .map(representation => representation.mimeType)
        .filter((mimeType : string|undefined) : mimeType is string => mimeType != null);
      const representationCodecs = representations
        .map(representation => representation.codecs)
        .filter((codecs : string|undefined) : codecs is string => codecs != null);
      const type = inferAdaptationType(
        adaptationMimeType || null,
        representationMimeTypes,
        adaptationCodecs || null,
        representationCodecs,
        adaptationChildren.roles || null
      );

      const originalID = adaptation.attributes.id;
      let newID : string;
      const adaptationSetSwitchingIDs = getAdaptationSetSwitchingIDs(adaptation);

      // TODO remove "main" video track management
      const { roles } = adaptationChildren;
      const isMainAdaptation = !!roles &&
        !!arrayFind(roles, (role) => role.value === "main") &&
        !!arrayFind(roles, (role) => role.schemeIdUri === "urn:mpeg:dash:role:2011");
      const videoMainAdaptation = acc.videoMainAdaptation;
      if (type === "video" && videoMainAdaptation !== null && isMainAdaptation) {
        videoMainAdaptation.representations.push(...representations);
        newID = videoMainAdaptation.id;
      } else {
        const isClosedCaption = type === "text" && adaptationChildren.accessibility &&
          isHardOfHearing(adaptationChildren.accessibility) ? true : undefined;
        const isAudioDescription = type === "audio" &&
          adaptationChildren.accessibility &&
          isVisuallyImpaired(adaptationChildren.accessibility) ? true : undefined;
        const adaptationID = newID = getAdaptationID(adaptation, representations,
          { isClosedCaption, isAudioDescription, type });
        const parsedAdaptationSet : IParsedAdaptation = {
          id: adaptationID,
          representations,
          type,
        };
        if (adaptation.attributes.language != null) {
          parsedAdaptationSet.language = adaptation.attributes.language;
          parsedAdaptationSet.normalizedLanguage =
            normalizeLang(adaptation.attributes.language);
        }
        if (isClosedCaption != null) {
          parsedAdaptationSet.closedCaption = isClosedCaption;
        }
        if (isAudioDescription != null) {
          parsedAdaptationSet.audioDescription = isAudioDescription;
        }

        const adaptationsOfTheSameType = parsedAdaptations[type];
        if (!adaptationsOfTheSameType) {
          parsedAdaptations[type] = [parsedAdaptationSet];
          if (isMainAdaptation && type === "video") {
            acc.videoMainAdaptation = parsedAdaptationSet;
          }
        } else {
          let mergedInto : IParsedAdaptation|null = null;

          // look if we have to merge this into another Adaptation
          for (let k = 0; k < adaptationSetSwitchingIDs.length; k++) {
            const id : string = adaptationSetSwitchingIDs[k];
            const switchingInfos = acc.adaptationSwitchingInfos[id];
            if (
              switchingInfos != null && switchingInfos.newID !== newID &&
              arrayIncludes(switchingInfos.adaptationSetSwitchingIDs, originalID)
            ) {
              const adaptationToMergeInto =
                arrayFind(adaptationsOfTheSameType, (a) => a.id === id);
              if (
                adaptationToMergeInto != null &&
                adaptationToMergeInto.audioDescription ===
                  parsedAdaptationSet.audioDescription &&
                adaptationToMergeInto.closedCaption ===
                  parsedAdaptationSet.closedCaption &&
                adaptationToMergeInto.language === parsedAdaptationSet.language
              ) {
                log.info("DASH Parser: merging \"switchable\" AdaptationSets",
                  originalID, id);
                adaptationToMergeInto.representations
                  .push(...parsedAdaptationSet.representations);
                mergedInto = adaptationToMergeInto;
              }
            }
          }

          if (isMainAdaptation && type === "video") {
            if (mergedInto == null) {
              // put "main" adaptation as the first
              adaptationsOfTheSameType.unshift(parsedAdaptationSet);
              acc.videoMainAdaptation = parsedAdaptationSet;
            } else {
              // put the resulting adaptation first instead
              const indexOf = adaptationsOfTheSameType.indexOf(mergedInto);
              if (indexOf < 0) {
                adaptationsOfTheSameType.unshift(parsedAdaptationSet);
              } else if (indexOf !== 0) {
                adaptationsOfTheSameType.splice(indexOf, 1);
                adaptationsOfTheSameType.unshift(mergedInto);
              }
              acc.videoMainAdaptation = mergedInto;
            }
          } else if (mergedInto === null) {
            adaptationsOfTheSameType.push(parsedAdaptationSet);
          }
        }
      }

      if (originalID != null && acc.adaptationSwitchingInfos[originalID] == null) {
        acc.adaptationSwitchingInfos[originalID] = { newID, adaptationSetSwitchingIDs };
      }

      return {
        adaptations: parsedAdaptations,
        adaptationSwitchingInfos: acc.adaptationSwitchingInfos,
        videoMainAdaptation: acc.videoMainAdaptation,
      };
    }, {
      adaptations: {},
      videoMainAdaptation: null,
      adaptationSwitchingInfos: {},
    }).adaptations;
}
