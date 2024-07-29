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
import type { IPeriod } from "../../../../manifest";
import { SUPPORTED_TRACK_TYPE } from "../../../../manifest";
import type { ITrackType } from "../../../../public_types";
import arrayFind from "../../../../utils/array_find";
import arrayFindIndex from "../../../../utils/array_find_index";
import arrayIncludes from "../../../../utils/array_includes";
import isNonEmptyString from "../../../../utils/is_non_empty_string";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined";
import type { IParsedTrack } from "../../types";
import type {
  IAdaptationSetIntermediateRepresentation,
  ISegmentTemplateIntermediateRepresentation,
} from "../node_parser_types";
import attachTrickModeTrack from "./attach_trickmode_track";
import type ContentProtectionParser from "./content_protection_parser";
import inferAdaptationType from "./infer_adaptation_type";
import type { IRepresentationContext } from "./parse_representations";
import parseRepresentations from "./parse_representations";
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
interface IAdaptationSwitchingInfos {
  /** `id` attribute of the AdaptationSet as announced in the MPD. */
  [originalID: string]: {
    /** `id` property of the resulting parsed `Adaptation` object. */
    newID: string;
    /**
     * `id` attribute (as announced in the MPD) of all the `AdaptationSet`s
     * this current one can seamlessly switch to.
     */
    adaptationSetSwitchingIDs: string[]; // IDs (as announced in the MPD),
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
  accessibility:
    | { schemeIdUri?: string | undefined; value?: string | undefined }
    | undefined,
): boolean {
  if (accessibility === undefined) {
    return false;
  }

  const isVisuallyImpairedAudioDvbDash =
    accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
    accessibility.value === "1";

  const isVisuallyImpairedDashIf =
    accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" &&
    accessibility.value === "description";

  return isVisuallyImpairedAudioDvbDash || isVisuallyImpairedDashIf;
}

/**
 * Detect if the accessibility given defines an adaptation for the hard of
 * hearing.
 * Based on DVB Document A168 (DVB-DASH) and DASH specification.
 * @param {Array.<Object>} accessibilities
 * @param {Array.<Object>} roles
 * @returns {Boolean}
 */
function isCaptionning(
  accessibilities:
    | Array<{ schemeIdUri?: string | undefined; value?: string | undefined }>
    | undefined,
  roles:
    | Array<{ schemeIdUri?: string | undefined; value?: string | undefined }>
    | undefined,
): boolean {
  if (accessibilities !== undefined) {
    const hasDvbClosedCaptionSignaling = accessibilities.some(
      (accessibility) =>
        accessibility.schemeIdUri === "urn:tva:metadata:cs:AudioPurposeCS:2007" &&
        accessibility.value === "2",
    );
    if (hasDvbClosedCaptionSignaling) {
      return true;
    }
  }
  if (roles !== undefined) {
    const hasDashCaptionSinaling = roles.some(
      (role) =>
        role.schemeIdUri === "urn:mpeg:dash:role:2011" && role.value === "caption",
    );
    if (hasDashCaptionSinaling) {
      return true;
    }
  }
  return false;
}

/**
 * Detect if the accessibility given defines an AdaptationSet containing a sign
 * language interpretation.
 * Based on DASH-IF 4.3.
 * @param {Object} accessibility
 * @returns {Boolean}
 */
function hasSignLanguageInterpretation(
  accessibility:
    | { schemeIdUri?: string | undefined; value?: string | undefined }
    | undefined,
): boolean {
  if (accessibility === undefined) {
    return false;
  }

  return (
    accessibility.schemeIdUri === "urn:mpeg:dash:role:2011" &&
    accessibility.value === "sign"
  );
}

/**
 * Contruct Adaptation ID from the information we have.
 * @param {Object} adaptation
 * @param {Object} infos
 * @returns {string}
 */
function getAdaptationID(
  adaptation: IAdaptationSetIntermediateRepresentation,
  infos: {
    isClosedCaption: boolean | undefined;
    isForcedSubtitle: boolean | undefined;
    isAudioDescription: boolean | undefined;
    isSignInterpreted: boolean | undefined;
    isTrickModeTrack: boolean;
    type: string;
  },
): string {
  if (isNonEmptyString(adaptation.attributes.id)) {
    return adaptation.attributes.id;
  }

  const {
    isClosedCaption,
    isForcedSubtitle,
    isAudioDescription,
    isSignInterpreted,
    isTrickModeTrack,
    type,
  } = infos;

  let idString = type;
  if (isNonEmptyString(adaptation.attributes.language)) {
    idString += `-${adaptation.attributes.language}`;
  }
  if (isClosedCaption === true) {
    idString += "-cc";
  }
  if (isForcedSubtitle === true) {
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
  adaptation: IAdaptationSetIntermediateRepresentation,
): string[] {
  if (!isNullOrUndefined(adaptation.children.supplementalProperties)) {
    const { supplementalProperties } = adaptation.children;
    for (const supplementalProperty of supplementalProperties) {
      if (
        supplementalProperty.schemeIdUri ===
          "urn:mpeg:dash:adaptation-set-switching:2016" &&
        !isNullOrUndefined(supplementalProperty.value)
      ) {
        return supplementalProperty.value
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id);
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
  adaptationsIR: IAdaptationSetIntermediateRepresentation[],
  context: IAdaptationSetContext,
): Record<"audio" | "video" | "text", IParsedTrack[]> {
  const parsedAdaptations: Record<
    ITrackType,
    Array<[IParsedTrack, IAdaptationSetOrderingData]>
  > = { video: [], audio: [], text: [] };
  const trickModeTracks: Array<{
    track: IParsedTrack;
    trickModeAttachedTrackIds: string[];
  }> = [];
  const adaptationSwitchingInfos: IAdaptationSwitchingInfos = {};

  const parsedAdaptationsIDs: string[] = [];

  for (let adaptationIdx = 0; adaptationIdx < adaptationsIR.length; adaptationIdx++) {
    const adaptation = adaptationsIR[adaptationIdx];
    const adaptationChildren = adaptation.children;
    const { essentialProperties, roles, label } = adaptationChildren;

    const isMainAdaptation =
      Array.isArray(roles) &&
      roles.some((role) => role.value === "main") &&
      roles.some((role) => role.schemeIdUri === "urn:mpeg:dash:role:2011");

    const representationsIR = adaptation.children.representations;

    const availabilityTimeComplete =
      adaptation.attributes.availabilityTimeComplete ?? context.availabilityTimeComplete;

    let availabilityTimeOffset;
    if (
      adaptation.attributes.availabilityTimeOffset !== undefined ||
      context.availabilityTimeOffset !== undefined
    ) {
      availabilityTimeOffset =
        (adaptation.attributes.availabilityTimeOffset ?? 0) +
        (context.availabilityTimeOffset ?? 0);
    }

    const adaptationMimeType = adaptation.attributes.mimeType;
    const adaptationCodecs = adaptation.attributes.codecs;
    const type = inferAdaptationType(
      representationsIR,
      isNonEmptyString(adaptationMimeType) ? adaptationMimeType : null,
      isNonEmptyString(adaptationCodecs) ? adaptationCodecs : null,
      !isNullOrUndefined(adaptationChildren.roles) ? adaptationChildren.roles : null,
    );
    if (type === undefined) {
      continue;
    }

    const priority = adaptation.attributes.selectionPriority ?? 1;
    const originalID = adaptation.attributes.id;
    const adaptationSetSwitchingIDs = getAdaptationSetSwitchingIDs(adaptation);
    const parentSegmentTemplates = [];
    if (context.segmentTemplate !== undefined) {
      parentSegmentTemplates.push(context.segmentTemplate);
    }
    if (adaptation.children.segmentTemplate !== undefined) {
      parentSegmentTemplates.push(adaptation.children.segmentTemplate);
    }

    const reprCtxt: IRepresentationContext = {
      availabilityTimeComplete,
      availabilityTimeOffset,
      baseURLs: resolveBaseURLs(context.baseURLs, adaptationChildren.baseURLs),
      contentProtectionParser: context.contentProtectionParser,
      manifestBoundsCalculator: context.manifestBoundsCalculator,
      end: context.end,
      isDynamic: context.isDynamic,
      isLastPeriod: context.isLastPeriod,
      manifestProfiles: context.manifestProfiles,
      parentSegmentTemplates,
      receivedTime: context.receivedTime,
      start: context.start,
      unsafelyBaseOnPreviousAdaptation: null,
    };

    const trickModeProperty = Array.isArray(essentialProperties)
      ? arrayFind(essentialProperties, (scheme) => {
          return scheme.schemeIdUri === "http://dashif.org/guidelines/trickmode";
        })
      : undefined;

    const trickModeAttachedTrackIds: string[] | undefined =
      trickModeProperty?.value?.split(" ");

    const isTrickModeTrack = trickModeAttachedTrackIds !== undefined;

    const { accessibilities } = adaptationChildren;

    let isDub: boolean | undefined;
    if (roles !== undefined && roles.some((role) => role.value === "dub")) {
      isDub = true;
    }

    let isClosedCaption;
    if (type !== "text") {
      isClosedCaption = false;
    } else {
      isClosedCaption = isCaptionning(accessibilities, roles);
    }

    let isForcedSubtitle;
    if (
      type === "text" &&
      roles !== undefined &&
      roles.some(
        (role) => role.value === "forced-subtitle" || role.value === "forced_subtitle",
      )
    ) {
      isForcedSubtitle = true;
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

    let adaptationID = getAdaptationID(adaptation, {
      isAudioDescription,
      isForcedSubtitle,
      isClosedCaption,
      isSignInterpreted,
      isTrickModeTrack,
      type,
    });

    // Avoid duplicate IDs
    while (arrayIncludes(parsedAdaptationsIDs, adaptationID)) {
      adaptationID += "-dup";
    }

    const newID = adaptationID;
    parsedAdaptationsIDs.push(adaptationID);

    reprCtxt.unsafelyBaseOnPreviousAdaptation =
      context.unsafelyBaseOnPreviousPeriod?.getTrack(adaptationID) ?? null;

    const representations = parseRepresentations(representationsIR, adaptation, reprCtxt);
    const parsedAdaptationSet: IParsedTrack = {
      id: adaptationID,
      representations,
      trackType: type,
      isTrickModeTrack,
    };
    if (!isNullOrUndefined(adaptation.attributes.language)) {
      parsedAdaptationSet.language = adaptation.attributes.language;
    }
    if (!isNullOrUndefined(isClosedCaption)) {
      parsedAdaptationSet.isClosedCaption = isClosedCaption;
    }
    if (!isNullOrUndefined(isAudioDescription)) {
      parsedAdaptationSet.isAudioDescription = isAudioDescription;
    }
    if (isDub === true) {
      parsedAdaptationSet.isDub = true;
    }
    if (isForcedSubtitle !== undefined) {
      parsedAdaptationSet.isForcedSubtitles = isForcedSubtitle;
    }
    if (isSignInterpreted === true) {
      parsedAdaptationSet.isSignInterpreted = true;
    }

    if (label !== undefined) {
      parsedAdaptationSet.label = label;
    }

    if (trickModeAttachedTrackIds !== undefined) {
      trickModeTracks.push({
        track: parsedAdaptationSet,
        trickModeAttachedTrackIds,
      });
    } else {
      // look if we have to merge this into another Adaptation
      let mergedIntoIdx = -1;
      for (const id of adaptationSetSwitchingIDs) {
        const switchingInfos = adaptationSwitchingInfos[id];
        if (
          switchingInfos !== undefined &&
          switchingInfos.newID !== newID &&
          arrayIncludes(switchingInfos.adaptationSetSwitchingIDs, originalID)
        ) {
          mergedIntoIdx = arrayFindIndex(parsedAdaptations[type], (a) => a[0].id === id);
          const mergedInto = parsedAdaptations[type][mergedIntoIdx];
          if (
            mergedInto !== undefined &&
            mergedInto[0].isAudioDescription === parsedAdaptationSet.isAudioDescription &&
            mergedInto[0].isClosedCaption === parsedAdaptationSet.isClosedCaption &&
            mergedInto[0].language === parsedAdaptationSet.language
          ) {
            log.info('DASH Parser: merging "switchable" AdaptationSets', originalID, id);
            mergedInto[0].representations.push(...parsedAdaptationSet.representations);
            mergedInto[1] = {
              priority: Math.max(priority, mergedInto[1].priority),
              isMainAdaptation: isMainAdaptation || mergedInto[1].isMainAdaptation,
              indexInMpd: Math.min(adaptationIdx, mergedInto[1].indexInMpd),
            };
            break;
          }
        }
      }

      if (mergedIntoIdx < 0) {
        parsedAdaptations[type].push([
          parsedAdaptationSet,
          { priority, isMainAdaptation, indexInMpd: adaptationIdx },
        ]);
      }
    }

    if (
      !isNullOrUndefined(originalID) &&
      isNullOrUndefined(adaptationSwitchingInfos[originalID])
    ) {
      adaptationSwitchingInfos[originalID] = {
        newID,
        adaptationSetSwitchingIDs,
      };
    }
  }

  const adaptationsPerType = SUPPORTED_TRACK_TYPE.reduce(
    (
      acc: Record<"audio" | "video" | "text", IParsedTrack[]>,
      adaptationType: ITrackType,
    ) => {
      const adaptationsParsedForType = parsedAdaptations[adaptationType];
      if (adaptationsParsedForType.length > 0) {
        adaptationsParsedForType.sort(compareAdaptations);
        for (const [adap] of adaptationsParsedForType) {
          acc[adaptationType].push(adap);
        }
      }
      return acc;
    },
    { audio: [], video: [], text: [] },
  );
  parsedAdaptations.video.sort(compareAdaptations);
  attachTrickModeTrack(adaptationsPerType, trickModeTracks);
  return adaptationsPerType;
}

/** Metadata allowing to order AdaptationSets between one another. */
interface IAdaptationSetOrderingData {
  /**
   * If `true`, this AdaptationSet is considered as a "main" one (e.g. it had a
   * Role set to "main").
   */
  isMainAdaptation: boolean;
  /**
   * Set to the `selectionPriority` attribute of the corresponding AdaptationSet
   * or to `1` by default.
   */
  priority: number;
  /** Index of this AdaptationSet in the original MPD, starting from `0`. */
  indexInMpd: number;
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
  a: [IParsedTrack, IAdaptationSetOrderingData],
  b: [IParsedTrack, IAdaptationSetOrderingData],
): number {
  const priorityDiff = b[1].priority - a[1].priority;
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  if (a[1].isMainAdaptation !== b[1].isMainAdaptation) {
    return a[1].isMainAdaptation ? -1 : 1;
  }
  return a[1].indexInMpd - b[1].indexInMpd;
}

/** Context needed when calling `parseAdaptationSets`. */
export interface IAdaptationSetContext extends IInheritedRepresentationContext {
  /** SegmentTemplate parsed in the Period, if found. */
  segmentTemplate?: ISegmentTemplateIntermediateRepresentation | undefined;
  /**
   * The parser should take this Period - which is from a previously parsed
   * Manifest for the same dynamic content - as a base to speed-up the parsing
   * process.
   * /!\ If unexpected differences exist between both, there is a risk of
   * de-synchronization with what is actually on the server,
   * Use with moderation.
   */
  unsafelyBaseOnPreviousPeriod: IPeriod | null;
  /** Parses contentProtection elements. */
  contentProtectionParser: ContentProtectionParser;
}

/**
 * Supplementary context needed to parse a Representation common with
 * `IRepresentationContext`.
 */
type IInheritedRepresentationContext = Omit<
  IRepresentationContext,
  "unsafelyBaseOnPreviousAdaptation" | "parentSegmentTemplates"
>;
