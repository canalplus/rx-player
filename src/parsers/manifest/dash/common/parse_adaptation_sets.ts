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

import log from "../../../../log";
import {
  Period,
  SUPPORTED_ADAPTATIONS_TYPE,
} from "../../../../manifest";
import { IAdaptationType } from "../../../../public_types";
import arrayFind from "../../../../utils/array_find";
import arrayFindIndex from "../../../../utils/array_find_index";
import arrayIncludes from "../../../../utils/array_includes";
import isNonEmptyString from "../../../../utils/is_non_empty_string";
import {
  IParsedAdaptation,
  IParsedAdaptations,
} from "../../types";
import {
  IAdaptationSetIntermediateRepresentation,
  ISegmentTemplateIntermediateRepresentation,
} from "../node_parser_types";
import attachTrickModeTrack from "./attach_trickmode_track";
// eslint-disable-next-line max-len
import inferAdaptationType from "./infer_adaptation_type";
import parseRepresentations, {
  IRepresentationContext,
} from "./parse_representations";
import resolveBaseURLs from "./resolve_base_urls";

/**
 * Supplementary information for "switchable" AdaptationSets of the same Period.
 *
 * This Object keeps record of which AdaptationSet (identified by its `id`
 * attribute in the MPD) is "switchable" (meaning we're allowed to switch from
 * one another at any time) to which other AdaptationSet(s) (by their IDs as
 * anounced in the MPD).
 *
 * AdaptationSets switchable between one another are considered as a single
 * Adaptation by the RxPlayer.
 *
 * This type of configuration is mostly encountered when different qualities for
 * the same track depend on different encryption information.
 * As the DASH-IF defines that some of this information should be put at the
 * AdaptationSet-level, packager are often forced to generate multiple ones even
 * when only one "real" track exists.
 *
 * The RxPlayer moves that information down to the `Representation` level. As
 * such, it can merge AdaptationSets that look like they should be.
 */
interface IAdaptationSwitchingInfos  {
  /** `id` attribute of the AdaptationSet as announced in the MPD. */
  [originalID : string] : {
    /** `id` property of the resulting parsed `Adaptation` object. */
    newID : string;
    /**
     * `id` attribute (as announced in the MPD) of all the `AdaptationSet`s
     * this current one can seamlessly switch to.
     */
    adaptationSetSwitchingIDs : string[]; // IDs (as announced in the MPD),
                                          // this AdaptationSet can be
                                          // seamlessly switched to
  };
}

/**
 * Detect if the accessibility given defines an adaptation for the visually
 * impaired.
 * Based on DVB Document A168 (DVB-DASH) and DASH-IF 4.3.
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isVisuallyImpaired(
  accessibility : { schemeIdUri? : string | undefined;
                    value? : string | undefined; } |
                  undefined
) : boolean {
  if (accessibility === undefined) {
    return false;
  }

  const isVisuallyImpairedAudioDvbDash = (
    accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
    accessibility.value === "1"
  );

  const isVisuallyImpairedDashIf = (
    accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" &&
    accessibility.value === "description"
  );

  return isVisuallyImpairedAudioDvbDash || isVisuallyImpairedDashIf;
}

/**
 * Detect if the accessibility given defines an adaptation for the hard of
 * hearing.
 * Based on DVB Document A168 (DVB-DASH).
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function isHardOfHearing(
  accessibility : { schemeIdUri? : string | undefined;
                    value? : string | undefined; } |
                  undefined
) : boolean {
  if (accessibility === undefined) {
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
  accessibility : { schemeIdUri? : string | undefined;
                    value? : string | undefined; } |
                  undefined
) : boolean {
  if (accessibility === undefined) {
    return false;
  }

  return (accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" &&
    accessibility.value === "sign");
}

/**
 * Contruct Adaptation ID from the information we have.
 * @param {Object} adaptation
 * @param {Array.<Object>} representations
 * @param {Array.<Object>} representations
 * @param {Object} infos
 * @returns {string}
 */
function getAdaptationID(
  adaptation : IAdaptationSetIntermediateRepresentation,
  infos : { isClosedCaption : boolean | undefined;
            isAudioDescription : boolean | undefined;
            isSignInterpreted : boolean | undefined;
            isTrickModeTrack: boolean;
            type : string; }
) : string {
  if (isNonEmptyString(adaptation.attributes.id)) {
    return adaptation.attributes.id;
  }

  const { isClosedCaption,
          isAudioDescription,
          isSignInterpreted,
          isTrickModeTrack,
          type } = infos;

  let idString = type;
  if (isNonEmptyString(adaptation.attributes.language)) {
    idString += `-${adaptation.attributes.language}`;
  }
  if (isClosedCaption === true) {
    idString += "-cc";
  }
  if (isAudioDescription === true) {
    idString += "-ad";
  }
  if (isSignInterpreted === true) {
    idString += "-si";
  }
  if (isTrickModeTrack) {
    idString += "-trickMode";
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
  if (adaptation.attributes.frameRate !== undefined) {
    idString += `-${String(adaptation.attributes.frameRate)}`;
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
    for (const supplementalProperty of supplementalProperties) {
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
 * @param {Array.<Object>} adaptationsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parseAdaptationSets(
  adaptationsIR : IAdaptationSetIntermediateRepresentation[],
  context : IAdaptationSetContext
): IParsedAdaptations {
  const parsedAdaptations : Record<
    IAdaptationType,
    Array<[ IParsedAdaptation,
            IAdaptationSetOrderingData ]>
  > = { video: [],
        audio: [],
        text: [] };
  const trickModeAdaptations: Array<{ adaptation: IParsedAdaptation;
                                      trickModeAttachedAdaptationIds: string[]; }> = [];
  const adaptationSwitchingInfos : IAdaptationSwitchingInfos = {};

  const parsedAdaptationsIDs : string[] = [];

  /**
   * Index of the last parsed Video AdaptationSet with a Role set as "main" in
   * `parsedAdaptations.video`.
   * `-1` if not yet encountered.
   * Used as we merge all main video AdaptationSet due to a comprehension of the
   * DASH-IF IOP.
   */
  let lastMainVideoAdapIdx = -1;

  for (let adaptationIdx = 0; adaptationIdx < adaptationsIR.length; adaptationIdx++) {
    const adaptation = adaptationsIR[adaptationIdx];
    const adaptationChildren = adaptation.children;
    const { essentialProperties,
            roles, label } = adaptationChildren;

    const isMainAdaptation = Array.isArray(roles) &&
      roles.some((role) => role.value === "main") &&
      roles.some((role) => role.schemeIdUri === "urn:mpeg:dash:role:2011");

    const representationsIR = adaptation.children.representations;
    const availabilityTimeComplete =
      adaptation.attributes.availabilityTimeComplete ??
      context.availabilityTimeComplete;
    const availabilityTimeOffset =
      (adaptation.attributes.availabilityTimeOffset ?? 0) +
      context.availabilityTimeOffset;

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

    const priority = adaptation.attributes.selectionPriority ?? 1;
    const originalID = adaptation.attributes.id;
    let newID : string;
    const adaptationSetSwitchingIDs = getAdaptationSetSwitchingIDs(adaptation);
    const parentSegmentTemplates = [];
    if (context.segmentTemplate !== undefined) {
      parentSegmentTemplates.push(context.segmentTemplate);
    }
    if (adaptation.children.segmentTemplate !== undefined) {
      parentSegmentTemplates.push(adaptation.children.segmentTemplate);
    }

    const reprCtxt : IRepresentationContext = {
      availabilityTimeComplete,
      availabilityTimeOffset,
      baseURLs: resolveBaseURLs(context.baseURLs, adaptationChildren.baseURLs),
      manifestBoundsCalculator: context.manifestBoundsCalculator,
      end: context.end,
      isDynamic: context.isDynamic,
      isLastPeriod: context.isLastPeriod,
      manifestProfiles: context.manifestProfiles,
      parentSegmentTemplates,
      receivedTime: context.receivedTime,
      start: context.start,
      timeShiftBufferDepth: context.timeShiftBufferDepth,
      unsafelyBaseOnPreviousAdaptation: null,
    };

    const trickModeProperty = Array.isArray(essentialProperties) ?
    arrayFind(
      essentialProperties,
      (scheme) => {
        return scheme.schemeIdUri === "http://dashif.org/guidelines/trickmode";
      }
    ) : undefined;

    const trickModeAttachedAdaptationIds: string[]|undefined =
      trickModeProperty?.value?.split(" ");

    const isTrickModeTrack = trickModeAttachedAdaptationIds !== undefined;

    if (type === "video" &&
        isMainAdaptation &&
        lastMainVideoAdapIdx >= 0 &&
        parsedAdaptations.video.length > lastMainVideoAdapIdx &&
        !isTrickModeTrack)
    {
      const videoMainAdaptation = parsedAdaptations.video[lastMainVideoAdapIdx][0];
      reprCtxt.unsafelyBaseOnPreviousAdaptation = context
        .unsafelyBaseOnPreviousPeriod?.getAdaptation(videoMainAdaptation.id) ?? null;
      const representations = parseRepresentations(representationsIR,
                                                   adaptation,
                                                   reprCtxt);
      videoMainAdaptation.representations.push(...representations);
      newID = videoMainAdaptation.id;
    } else {
      const { accessibilities } = adaptationChildren;

      let isDub : boolean|undefined;
      if (roles !== undefined &&
          roles.some((role) => role.value === "dub"))
      {
        isDub = true;
      }

      let isClosedCaption;
      if (type !== "text") {
        isClosedCaption = false;
      } else if (accessibilities !== undefined) {
        isClosedCaption = accessibilities.some(isHardOfHearing);
      }

      let isAudioDescription;
      if (type !== "audio") {
        isAudioDescription = false;
      } else if (accessibilities !== undefined) {
        isAudioDescription = accessibilities.some(isVisuallyImpaired);
      }

      let isSignInterpreted;
      if (type !== "video") {
        isSignInterpreted = false;
      } else if (accessibilities !== undefined) {
        isSignInterpreted = accessibilities.some(hasSignLanguageInterpretation);
      }

      let adaptationID = getAdaptationID(adaptation,
                                         { isAudioDescription,
                                           isClosedCaption,
                                           isSignInterpreted,
                                           isTrickModeTrack,
                                           type });

      // Avoid duplicate IDs
      while (arrayIncludes(parsedAdaptationsIDs, adaptationID)) {
        adaptationID += "-dup";
      }

      newID = adaptationID;
      parsedAdaptationsIDs.push(adaptationID);

      reprCtxt.unsafelyBaseOnPreviousAdaptation = context
        .unsafelyBaseOnPreviousPeriod?.getAdaptation(adaptationID) ?? null;

      const representations = parseRepresentations(representationsIR,
                                                   adaptation,
                                                   reprCtxt);
      const parsedAdaptationSet : IParsedAdaptation =
        { id: adaptationID,
          representations,
          type,
          isTrickModeTrack };
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

      if (label !== undefined) {
        parsedAdaptationSet.label = label;
      }

      if (trickModeAttachedAdaptationIds !== undefined) {
        trickModeAdaptations.push({ adaptation: parsedAdaptationSet,
                                    trickModeAttachedAdaptationIds });
      } else {

        // look if we have to merge this into another Adaptation
        let mergedIntoIdx = -1;
        for (const id of adaptationSetSwitchingIDs) {
          const switchingInfos = adaptationSwitchingInfos[id];
          if (switchingInfos !== undefined &&
              switchingInfos.newID !== newID &&
              arrayIncludes(switchingInfos.adaptationSetSwitchingIDs, originalID))
          {
            mergedIntoIdx = arrayFindIndex(parsedAdaptations[type],
                                           (a) => a[0].id === id);
            const mergedInto = parsedAdaptations[type][mergedIntoIdx];
            if (mergedInto !== undefined &&
                mergedInto[0].audioDescription ===
                  parsedAdaptationSet.audioDescription &&
                mergedInto[0].closedCaption ===
                  parsedAdaptationSet.closedCaption &&
                mergedInto[0].language === parsedAdaptationSet.language)
            {
              log.info("DASH Parser: merging \"switchable\" AdaptationSets",
                       originalID, id);
              mergedInto[0].representations.push(...parsedAdaptationSet.representations);
              if (type === "video" &&
                  isMainAdaptation &&
                  !mergedInto[1].isMainAdaptation)
              {
                lastMainVideoAdapIdx = Math.max(lastMainVideoAdapIdx, mergedIntoIdx);
              }
              mergedInto[1] = {
                priority: Math.max(priority, mergedInto[1].priority),
                isMainAdaptation: isMainAdaptation ||
                                  mergedInto[1].isMainAdaptation,
                indexInMpd: Math.min(adaptationIdx, mergedInto[1].indexInMpd),
              };
            }
          }
        }

        if (mergedIntoIdx < 0) {
          parsedAdaptations[type].push([ parsedAdaptationSet,
                                         { priority,
                                           isMainAdaptation,
                                           indexInMpd: adaptationIdx }]);
          if (type === "video" && isMainAdaptation) {
            lastMainVideoAdapIdx = parsedAdaptations.video.length - 1;
          }
        }
      }
    }

    if (originalID != null && adaptationSwitchingInfos[originalID] == null) {
      adaptationSwitchingInfos[originalID] = { newID,
                                               adaptationSetSwitchingIDs };
    }
  }

  const adaptationsPerType = SUPPORTED_ADAPTATIONS_TYPE
    .reduce((acc : IParsedAdaptations, adaptationType : IAdaptationType) => {
      const adaptationsParsedForType = parsedAdaptations[adaptationType];
      if (adaptationsParsedForType.length > 0) {
        adaptationsParsedForType.sort(compareAdaptations);
        acc[adaptationType] = adaptationsParsedForType
          .map(([parsedAdaptation]) => parsedAdaptation);
      }
      return acc;
    }, {});
  parsedAdaptations.video.sort(compareAdaptations);
  attachTrickModeTrack(adaptationsPerType, trickModeAdaptations);
  return adaptationsPerType;
}

/** Metadata allowing to order AdaptationSets between one another. */
interface IAdaptationSetOrderingData {
  /**
   * If `true`, this AdaptationSet is considered as a "main" one (e.g. it had a
   * Role set to "main").
   */
  isMainAdaptation : boolean;
  /**
   * Set to the `selectionPriority` attribute of the corresponding AdaptationSet
   * or to `1` by default.
   */
  priority : number;
  /** Index of this AdaptationSet in the original MPD, starting from `0`. */
  indexInMpd : number;
}

/**
 * Compare groups of parsed AdaptationSet, alongside some ordering metadata,
 * allowing to easily sort them through JavaScript's `Array.prototype.sort`
 * method.
 * @param {Array.<Object>} a
 * @param {Array.<Object>} b
 * @returns {number}
 */
function compareAdaptations(
  a : [IParsedAdaptation, IAdaptationSetOrderingData],
  b : [IParsedAdaptation, IAdaptationSetOrderingData]
) : number {
  const priorityDiff = b[1].priority - a[1].priority;
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  if (a[1].isMainAdaptation !== b[1].isMainAdaptation) {
    return a[1].isMainAdaptation ? -1 :
      1;
  }
  return a[1].indexInMpd - b[1].indexInMpd;
}

/** Context needed when calling `parseAdaptationSets`. */
export interface IAdaptationSetContext extends IInheritedRepresentationContext {
  /** SegmentTemplate parsed in the Period, if found. */
  segmentTemplate? : ISegmentTemplateIntermediateRepresentation | undefined;
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

/**
 * Supplementary context needed to parse a Representation common with
 * `IRepresentationContext`.
 */
type IInheritedRepresentationContext = Omit<IRepresentationContext,
                                            "unsafelyBaseOnPreviousAdaptation" |
                                            "parentSegmentTemplates">;
