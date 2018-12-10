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

export interface IPeriodInfos {
  isDynamic : boolean;
  start : number;
  baseURL? : string;
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
        let closedCaption : boolean|undefined;
        let audioDescription : boolean|undefined;
        if (
          type === "text" &&
          adaptationChildren.accessibility &&
          isHardOfHearing(adaptationChildren.accessibility)
        ) {
          closedCaption = true;
        }
        if (
          type === "audio" &&
          adaptationChildren.accessibility &&
          isVisuallyImpaired(adaptationChildren.accessibility)
        ) {
          audioDescription = true;
        }
        let adaptationID : string;
        if (adaptation.attributes.id != null) {
          adaptationID = adaptation.attributes.id;
        } else {
          let idString = type;
          if (adaptation.attributes.language) {
            idString += `-${adaptation.attributes.language}`;
          }
          if (closedCaption) {
            idString += "-cc";
          }
          if (audioDescription) {
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
          if (idString.length === type.length) {
            idString += representations.length ?
              ("-" + representations[0].id) : "-empty";
          }
          adaptationID = "adaptation-" + idString;
        }
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
        if (closedCaption != null) {
          parsedAdaptationSet.closedCaption = closedCaption;
        }
        if (audioDescription != null) {
          parsedAdaptationSet.audioDescription = audioDescription;
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
    }, { videoMainAdaptation: null, adaptations: {} }).adaptations;
}
