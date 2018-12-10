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

/**
 * Contruct Adaptation ID from the informations we have.
 * @param {Object} adaptation
 * @param {Array.<Object>} representations
 * @param {Object} infos
 * @retunrs {string}
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
      const { roles } = adaptationChildren;
      const isMainAdaptation = !!roles &&
        !!arrayFind(roles, (role) => role.value === "main") &&
        !!arrayFind(roles, (role) => role.schemeIdUri === "urn:mpeg:dash:role:2011");
      const videoMainAdaptation = acc.videoMainAdaptation;
      if (type === "video" && videoMainAdaptation !== null && isMainAdaptation) {
        videoMainAdaptation.representations.push(...representations);
      } else {
        const isClosedCaption = type === "text" && adaptationChildren.accessibility &&
          isHardOfHearing(adaptationChildren.accessibility) ? true : undefined;
        const isAudioDescription = type === "audio" &&
          adaptationChildren.accessibility &&
          isVisuallyImpaired(adaptationChildren.accessibility) ? true : undefined;
        const adaptationID = getAdaptationID(adaptation, representations,
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

        const parsedAdaptation = parsedAdaptations[type];
        if (!parsedAdaptation) {
          parsedAdaptations[type] = [parsedAdaptationSet];
          if (isMainAdaptation && type === "video") {
            acc.videoMainAdaptation = parsedAdaptationSet;
          }
        } else if (isMainAdaptation && type === "video") {
          // put "main" adaptation as the first
          parsedAdaptation.unshift(parsedAdaptationSet);
          acc.videoMainAdaptation = parsedAdaptationSet;
        } else {
          parsedAdaptation.push(parsedAdaptationSet);
        }
      }
      return {
        adaptations: parsedAdaptations,
        videoMainAdaptation: acc.videoMainAdaptation,
      };
    }, { adaptations: {}, videoMainAdaptation: null }).adaptations;
}
