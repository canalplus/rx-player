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
import { Period } from "../../../manifest";
import arrayFind from "../../../utils/array_find";
import arrayIncludes from "../../../utils/array_includes";
import isNonEmptyString from "../../../utils/is_non_empty_string";
import {
  IParsedAdaptation,
  IParsedAdaptations,
} from "../types";
import extractMinimumAvailabilityTimeOffset from "./extract_minimum_availability_time_offset";
import inferAdaptationType from "./infer_adaptation_type";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import {
  IAdaptationSetIntermediateRepresentation,
} from "./node_parsers/AdaptationSet";
import parseRepresentations, {
  IAdaptationInfos,
} from "./parse_representations";
import resolveBaseURLs from "./resolve_base_urls";

/** Context needed when calling `parseAdaptationSets`. */
export interface IAdaptationSetsContextInfos {
  /** Whether we should request new segments even if they are not yet finished. */
  aggressiveMode : boolean;
  /** availabilityTimeOffset of the concerned period. */
  availabilityTimeOffset: number;
  /** Eventual URLs from which every relative URL will be based on. */
  baseURLs : string[];
  /** Allows to obtain the first available position of a content. */
  manifestBoundsCalculator : ManifestBoundsCalculator;
  /* End time of the current period, in seconds. */
  end? : number;
  /** Whether the Manifest can evolve with time. */
  isDynamic : boolean;
  /**
   * Time (in terms of `performance.now`) at which the XML file containing
   * this AdaptationSet was received.
   */
  receivedTime? : number;
  /** Start time of the current period, in seconds. */
  start : number;
  /** Depth of the buffer for the whole content, in seconds. */
  timeShiftBufferDepth? : number;
  /**
   * The parser should take this Period - which is from a previously parsed
   * Manifest for the same dynamic content - as a base to speed-up the parsing
   * process.
   * /!\ If unexpected differences exist between both, there is a risk of
   * de-synchronization with what is actually on the server,
   * Use with moderation.
   */
  unsafelyBaseOnPreviousPeriod : Period | null;
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
 * Detect if the accessibility given defines an AdaptationSet containing a sign
 * language interpretation.
 * Based on DASH-IF 4.3.
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function hasSignLanguageInterpretation(
  accessibility? : { schemeIdUri? : string; value? : string }
) : boolean {
  if (accessibility == null) {
    return false;
  }

  return (accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" &&
    accessibility.value === "sign");
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
  infos : { isClosedCaption : boolean | undefined;
            isAudioDescription : boolean | undefined;
            isSignInterpreted : boolean | undefined;
            type : string; }
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
  if (infos.isSignInterpreted === true) {
    idString += "-si";
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
  return idString;
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
 * Process AdaptationSets intermediate representations to return under its final
 * form.
 * Note that the AdaptationSets returned are sorted by priority (from the most
 * priority to the least one).
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @returns {Array.<Object>}
 */
export default function parseAdaptationSets(
  adaptationsIR : IAdaptationSetIntermediateRepresentation[],
  periodInfos : IAdaptationSetsContextInfos
): IParsedAdaptations {
  const parsedAdaptations : IParsedAdaptations = {};
  const adaptationSwitchingInfos : IAdaptationSwitchingInfos = {};
  const parsedAdaptationsIDs : string[] = [];
  let videoMainAdaptation : IParsedAdaptation | null = null;

  // first sort AdaptationSets by absolute priority.
  adaptationsIR.sort((a, b) => {
    /* As of DASH-IF 4.3, `1` is the default value. */
    const priority1 = a.attributes.selectionPriority ?? 1;
    const priority2 = b.attributes.selectionPriority ?? 1;
    return priority2 - priority1;
  });

  for (let i = 0; i < adaptationsIR.length; i++) {
    const adaptation = adaptationsIR[i];
    const adaptationChildren = adaptation.children;
    const { essentialProperties,
            roles } = adaptationChildren;

    const isExclusivelyTrickModeTrack = (Array.isArray(essentialProperties) &&
      essentialProperties.some((ep) =>
        ep.schemeIdUri === "http://dashif.org/guidelines/trickmode"));

    if (isExclusivelyTrickModeTrack) {
      // We do not for the moment parse trickmode tracks
      continue;
    }

    const isMainAdaptation = Array.isArray(roles) &&
      roles.some((role) => role.value === "main") &&
      roles.some((role) => role.schemeIdUri === "urn:mpeg:dash:role:2011");

    const representationsIR = adaptation.children.representations;
    const availabilityTimeOffset =
      extractMinimumAvailabilityTimeOffset(adaptation.children.baseURLs) +
      periodInfos.availabilityTimeOffset;

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
      continue;
    }

    const originalID = adaptation.attributes.id;
    let newID : string;
    const adaptationSetSwitchingIDs = getAdaptationSetSwitchingIDs(adaptation);
    const adaptationInfos : IAdaptationInfos = {
      aggressiveMode: periodInfos.aggressiveMode,
      availabilityTimeOffset,
      baseURLs: resolveBaseURLs(periodInfos.baseURLs, adaptationChildren.baseURLs),
      manifestBoundsCalculator: periodInfos.manifestBoundsCalculator,
      end: periodInfos.end,
      isDynamic: periodInfos.isDynamic,
      receivedTime: periodInfos.receivedTime,
      start: periodInfos.start,
      timeShiftBufferDepth: periodInfos.timeShiftBufferDepth,
      unsafelyBaseOnPreviousAdaptation: null,
    };
    if (type === "video" && videoMainAdaptation !== null && isMainAdaptation) {
      adaptationInfos.unsafelyBaseOnPreviousAdaptation = periodInfos
        .unsafelyBaseOnPreviousPeriod?.getAdaptation(videoMainAdaptation.id) ?? null;
      const representations = parseRepresentations(representationsIR,
                                                   adaptation,
                                                   adaptationInfos);
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

      const isSignInterpreted = type === "video" &&
                                accessibility != null &&
                                hasSignLanguageInterpretation(accessibility) ? true :
                                                                               undefined;

      let adaptationID = getAdaptationID(adaptation,
                                         { isAudioDescription,
                                           isClosedCaption,
                                           isSignInterpreted,
                                           type });

      // Avoid duplicate IDs
      while (arrayIncludes(parsedAdaptationsIDs, adaptationID)) {
        adaptationID += "-dup";
      }

      newID = adaptationID;
      parsedAdaptationsIDs.push(adaptationID);

      adaptationInfos.unsafelyBaseOnPreviousAdaptation = periodInfos
        .unsafelyBaseOnPreviousPeriod?.getAdaptation(adaptationID) ?? null;
      const representations = parseRepresentations(representationsIR,
                                                   adaptation,
                                                   adaptationInfos);
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
      if (isSignInterpreted === true) {
        parsedAdaptationSet.isSignInterpreted = true;
      }

      const adaptationsOfTheSameType = parsedAdaptations[type];
      if (adaptationsOfTheSameType === undefined) {
        parsedAdaptations[type] = [parsedAdaptationSet];
        if (isMainAdaptation && type === "video") {
          videoMainAdaptation = parsedAdaptationSet;
        }
      } else {
        let mergedInto : IParsedAdaptation|null = null;

        // look if we have to merge this into another Adaptation
        for (let k = 0; k < adaptationSetSwitchingIDs.length; k++) {
          const id : string = adaptationSetSwitchingIDs[k];
          const switchingInfos = adaptationSwitchingInfos[id];
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
            videoMainAdaptation = parsedAdaptationSet;
          } else {
            // put the resulting adaptation first instead
            const indexOf = adaptationsOfTheSameType.indexOf(mergedInto);
            if (indexOf < 0) {
              adaptationsOfTheSameType.unshift(parsedAdaptationSet);
            } else if (indexOf !== 0) {
              adaptationsOfTheSameType.splice(indexOf, 1);
              adaptationsOfTheSameType.unshift(mergedInto);
            }
            videoMainAdaptation = mergedInto;
          }
        } else if (mergedInto === null) {
          adaptationsOfTheSameType.push(parsedAdaptationSet);
        }
      }
    }

    if (originalID != null && adaptationSwitchingInfos[originalID] == null) {
      adaptationSwitchingInfos[originalID] = { newID,
                                               adaptationSetSwitchingIDs };
    }
  }
  return parsedAdaptations;
}
