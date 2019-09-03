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
import resolveURL from "../../../utils/resolve_url";
import {
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedRepresentation,
} from "../types";
import inferAdaptationType from "./infer_adaptation_type";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import {
  IAdaptationSetIntermediateRepresentation,
} from "./node_parsers/AdaptationSet";
import parseRepresentations from "./parse_representations";

// Supplementary context about the current Period
export interface IPeriodInfos {
  aggressiveMode : boolean; // Whether we should request new segments even if
                            // they are not yet finished (e.g. for low-latency)
  availabilityStartTime : number; // Time from which the content starts
  baseURL? : string; // Eventual URL from which every relative URL will be based
                     // on
  manifestBoundsCalculator : ManifestBoundsCalculator; // Allows to obtain the first
                                                       // available position of a content
  clockOffset? : number; // If set, offset to add to `performance.now()`
                         // to obtain the current server's time
  end? : number; // End time of the current period, in seconds
  isDynamic : boolean; // Whether the Manifest can evolve with time
  start : number; // Start time of the current period, in seconds
  timeShiftBufferDepth? : number; // Depth of the buffer for the whole content,
                                  // in seconds
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
 * Detect if the accessibility given defines an adaptation for the visually
 * impaired.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isVisuallyImpaired(
  accessibility: { schemeIdUri? : string; value? : string }
) : boolean {
  if (!accessibility) {
    return false;
  }

  return (
    accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
    accessibility.value === "1"
  );
}

/**
 * Detect if the accessibility given defines an adaptation for the hard of
 * hearing.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isHardOfHearing(
  accessibility: { schemeIdUri? : string; value? : string }
) : boolean {
  if (!accessibility) {
    return false;
  }

  return (
    accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
    accessibility.value === "2"
  );
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
    .reduce<{ adaptations : IParsedAdaptations;
              adaptationSwitchingInfos : IAdaptationSwitchingInfos;
              videoMainAdaptation : IParsedAdaptation|null; }>
    ((acc, adaptation) => {
      const adaptationChildren = adaptation.children;
      const parsedAdaptations = acc.adaptations;
      const representationsIR = adaptation.children.representations;
      const adaptationInfos = {
        aggressiveMode: periodInfos.aggressiveMode,
        availabilityStartTime: periodInfos.availabilityStartTime,
        baseURL: resolveURL(periodInfos.baseURL, adaptationChildren.baseURL),
        manifestBoundsCalculator: periodInfos.manifestBoundsCalculator,
        clockOffset: periodInfos.clockOffset,
        end: periodInfos.end,
        isDynamic: periodInfos.isDynamic,
        start: periodInfos.start,
        timeShiftBufferDepth: periodInfos.timeShiftBufferDepth,
      };
      const adaptationMimeType = adaptation.attributes.mimeType;
      const adaptationCodecs = adaptation.attributes.codecs;
      const type = inferAdaptationType(representationsIR,
                                       adaptationMimeType || null,
                                       adaptationCodecs || null,
                                       adaptationChildren.roles || null);
      const representations = parseRepresentations(representationsIR,
                                                   adaptation,
                                                   adaptationInfos);

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
        const { accessibility } = adaptationChildren;
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
