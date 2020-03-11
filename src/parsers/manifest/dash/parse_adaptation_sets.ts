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

import log from "../../../log";
import arrayFind from "../../../utils/array_find";
import arrayIncludes from "../../../utils/array_includes";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import {
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedRepresentation,
} from "../types";
import extractMinimumAvailabilityTimeOffset from "./extract_minimum_availability_time_offset";
import inferAdaptationType from "./infer_adaptation_type";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import {
  IAdaptationSetIntermediateRepresentation,
} from "./node_parsers/AdaptationSet";
import parseRepresentations from "./parse_representations";
import resolveBaseURLs from "./resolve_base_urls";

// Supplementary context about the current Period
export interface IPeriodInfos {
  aggressiveMode : boolean; // Whether we should request new segments even if
                            // they are not yet finished
  availabilityTimeOffset: number; // availability time offset of the concerned period
  baseURLs : string[]; // Eventual URLs from which every relative URL will be based
                       // on
  manifestBoundsCalculator : ManifestBoundsCalculator; // Allows to obtain the first
                                                       // available position of a content
  end? : number; // End time of the current period, in seconds
  isDynamic : boolean; // Whether the Manifest can evolve with time
  receivedTime? : number; // time (in terms of `performance.now`) at which the
                          // XML file containing this AdaptationSet was received
  start : number; // Start time of the current period, in seconds
  timeShiftBufferDepth? : number; // Depth of the buffer for the whole content,
                                  // in seconds
}

// Supplementary information for "switchable" AdaptationSets of the same Period
interface IAdaptationSwitchingInfos  {
  [originalID : string] : { // ID as announced in the MPD
    newID : string; // ID in the currently parsed Manifest
    adaptationSetSwitchingIDs : string[]; // IDs (as announced in the MPD),
                                          // this AdaptationSet can be
                                          // seamlessly switched to
  };
}

/**
 * Detect if the accessibility given defines an adaptation for the visually
 * impaired.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isVisuallyImpaired(
  accessibility? : { schemeIdUri? : string; value? : string }
) : boolean {
  if (accessibility == null) {
    return false;
  }

  return (accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
          accessibility.value === "1");
}

/**
 * Detect if the accessibility given defines an adaptation for the hard of
 * hearing.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isHardOfHearing(
  accessibility? : { schemeIdUri? : string; value? : string }
) : boolean {
  if (accessibility == null) {
    return false;
  }

  return (accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
          accessibility.value === "2");
}

/**
 * Contruct Adaptation ID from the information we have.
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
  if (isNonEmptyString(adaptation.attributes.id)) {
    return adaptation.attributes.id;
  }

  let idString = infos.type;
  if (isNonEmptyString(adaptation.attributes.language)) {
    idString += `-${adaptation.attributes.language}`;
  }
  if (infos.isClosedCaption === true) {
    idString += "-cc";
  }
  if (infos.isAudioDescription === true) {
    idString += "-ad";
  }
  if (isNonEmptyString(adaptation.attributes.contentType)) {
    idString += `-${adaptation.attributes.contentType}`;
  }
  if (isNonEmptyString(adaptation.attributes.codecs)) {
    idString += `-${adaptation.attributes.codecs}`;
  }
  if (isNonEmptyString(adaptation.attributes.mimeType)) {
    idString += `-${adaptation.attributes.mimeType}`;
  }
  if (isNonEmptyString(adaptation.attributes.frameRate)) {
    idString += `-${adaptation.attributes.frameRate}`;
  }
  if (idString.length === infos.type.length) {
    idString += representations.length > 0 ?
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
    .reduce<{ adaptations : IParsedAdaptations;
              adaptationSwitchingInfos : IAdaptationSwitchingInfos;
              videoMainAdaptation : IParsedAdaptation|null; }>
    ((acc, adaptation) => {
      const adaptationChildren = adaptation.children;
      const parsedAdaptations = acc.adaptations;

      const { essentialProperties,
              roles } = adaptationChildren;

      const isExclusivelyTrickModeTrack = (Array.isArray(essentialProperties) &&
        essentialProperties.some((ep) =>
          ep.schemeIdUri === "http://dashif.org/guidelines/trickmode"));

      if (isExclusivelyTrickModeTrack) {
        // We do not for the moment parse trickmode tracks
        return acc;
      }

      const isMainAdaptation = Array.isArray(roles) &&
        roles.some((role) => role.value === "main") &&
        roles.some((role) => role.schemeIdUri === "urn:mpeg:dash:role:2011");

      const representationsIR = adaptation.children.representations;
      const availabilityTimeOffset =
        extractMinimumAvailabilityTimeOffset(adaptation.children.baseURLs) +
        periodInfos.availabilityTimeOffset;

      const adaptationInfos = {
        aggressiveMode: periodInfos.aggressiveMode,
        availabilityTimeOffset,
        baseURLs: resolveBaseURLs(periodInfos.baseURLs, adaptationChildren.baseURLs),
        manifestBoundsCalculator: periodInfos.manifestBoundsCalculator,
        end: periodInfos.end,
        isDynamic: periodInfos.isDynamic,
        receivedTime: periodInfos.receivedTime,
        start: periodInfos.start,
        timeShiftBufferDepth: periodInfos.timeShiftBufferDepth,
      };
      const adaptationMimeType = adaptation.attributes.mimeType;
      const adaptationCodecs = adaptation.attributes.codecs;
      const type = inferAdaptationType(representationsIR,
                                       isNonEmptyString(adaptationMimeType) ?
                                         adaptationMimeType :
                                         null,
                                       isNonEmptyString(adaptationCodecs) ?
                                         adaptationCodecs :
                                         null,
                                       adaptationChildren.roles != null ?
                                         adaptationChildren.roles :
                                         null);
      if (type === undefined) {
        return acc; // let's not parse unrecognized tracks
      }
      const representations = parseRepresentations(representationsIR,
                                                   adaptation,
                                                   adaptationInfos);

      const originalID = adaptation.attributes.id;
      let newID : string;
      const adaptationSetSwitchingIDs = getAdaptationSetSwitchingIDs(adaptation);
      const videoMainAdaptation = acc.videoMainAdaptation;
      if (type === "video" && videoMainAdaptation !== null && isMainAdaptation) {
        videoMainAdaptation.representations.push(...representations);
        newID = videoMainAdaptation.id;
      } else {
        const { accessibility } = adaptationChildren;

        let isDub : boolean|undefined;
        if (roles !== undefined &&
            roles.some((role) => role.value === "dub"))
        {
          isDub = true;
        }

        const isClosedCaption = type === "text" &&
                                accessibility != null &&
                                isHardOfHearing(accessibility) ? true :
                                                                 undefined;
        const isAudioDescription = type === "audio" &&
                                   accessibility != null &&
                                   isVisuallyImpaired(accessibility) ? true :
                                                                       undefined;
        const adaptationID = newID = getAdaptationID(adaptation,
                                                     representations,
                                                     { isClosedCaption,
                                                       isAudioDescription,
                                                       type });
        const parsedAdaptationSet : IParsedAdaptation = { id: adaptationID,
                                                          representations,
                                                          type };
        if (adaptation.attributes.language != null) {
          parsedAdaptationSet.language = adaptation.attributes.language;
        }
        if (isClosedCaption != null) {
          parsedAdaptationSet.closedCaption = isClosedCaption;
        }
        if (isAudioDescription != null) {
          parsedAdaptationSet.audioDescription = isAudioDescription;
        }
        if (isDub === true) {
          parsedAdaptationSet.isDub = true;
        }

        const adaptationsOfTheSameType = parsedAdaptations[type];
        if (adaptationsOfTheSameType === undefined) {
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
            if (switchingInfos != null &&
                switchingInfos.newID !== newID &&
                arrayIncludes(switchingInfos.adaptationSetSwitchingIDs, originalID))
            {
              const adaptationToMergeInto = arrayFind(adaptationsOfTheSameType,
                                                      (a) => a.id === id);
              if (adaptationToMergeInto != null &&
                  adaptationToMergeInto.audioDescription ===
                    parsedAdaptationSet.audioDescription &&
                  adaptationToMergeInto.closedCaption ===
                    parsedAdaptationSet.closedCaption &&
                  adaptationToMergeInto.language === parsedAdaptationSet.language)
              {
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
        acc.adaptationSwitchingInfos[originalID] = { newID,
                                                     adaptationSetSwitchingIDs };
      }

      return { adaptations: parsedAdaptations,
               adaptationSwitchingInfos: acc.adaptationSwitchingInfos,
               videoMainAdaptation: acc.videoMainAdaptation };
    }, { adaptations: {},
         videoMainAdaptation: null,
         adaptationSwitchingInfos: {} }
    ).adaptations;
}
