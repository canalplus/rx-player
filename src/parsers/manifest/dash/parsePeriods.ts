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
import IRepresentationIndex from "../../../manifest/representation_index";
import generateNewId from "../../../utils/id";
import { normalize as normalizeLang } from "../../../utils/languages";
import { resolveURL } from "../../../utils/url";
import {
  IContentProtection,
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedPeriod,
  IParsedRepresentation,
} from "../types";
import inferAdaptationType from "../utils/infer_adaptation_type";
import {
  isHardOfHearing,
  isVisuallyImpaired,
} from "./helpers";
import BaseRepresentationIndex from "./indexes/base";
import ListRepresentationIndex from "./indexes/list";
import TemplateRepresentationIndex from "./indexes/template";
import TimelineRepresentationIndex from "./indexes/timeline";
import {
  IAdaptationSetIntermediateRepresentation
} from "./node_parsers/AdaptationSet";
import { IPeriodIntermediateRepresentation } from "./node_parsers/Period";

export interface IManifestInfos {
  isDynamic : boolean;
  availabilityStartTime? : number;
  duration? : number;
  baseURL? : string;
}

// base context given to the various indexes
interface IIndexContext {
  periodStart : number; // Start of the period concerned by this
                        // RepresentationIndex, in seconds
  representationBaseURL : string; // Base URL for the Representation concerned
  representationId? : string; // ID of the Representation concerned
  representationBitrate? : number; // Bitrate of the Representation concerned
  isDynamic : boolean;
}

/**
 * Find and parse RepresentationIndex located in an AdaptationSet node.
 * Returns a generic parsed SegmentTemplate with a single element if not found.
 * @param {Object} adaptation
 * @param {Object} context
 */
function findAdaptationIndex(
  adaptation : IAdaptationSetIntermediateRepresentation,
  context: IIndexContext
): IRepresentationIndex {
  const adaptationChildren = adaptation.children;
  let adaptationIndex : IRepresentationIndex;
  if (adaptationChildren.segmentBase != null) {
    const { segmentBase } = adaptationChildren;
    adaptationIndex = new BaseRepresentationIndex(segmentBase, context);
  } else if (adaptationChildren.segmentList != null) {
    const { segmentList } = adaptationChildren;
    adaptationIndex = new ListRepresentationIndex(segmentList, context);
  } else if (adaptationChildren.segmentTemplate != null) {
    const { segmentTemplate } = adaptationChildren;
    adaptationIndex = segmentTemplate.indexType === "timeline" ?
      new TimelineRepresentationIndex(segmentTemplate, context) :
      new TemplateRepresentationIndex(segmentTemplate, context);
  } else {
    adaptationIndex = new TemplateRepresentationIndex({
      duration: Number.MAX_VALUE,
      timescale: 1,
      startNumber: 0,
      initialization: { media: "" },
      media: "",
    }, context);
  }
  return adaptationIndex;
}

/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} manifestInfos
 * @returns {Array.<Object>}
 */
export default function parsePeriods(
  periodsIR : IPeriodIntermediateRepresentation[],
  manifestInfos : IManifestInfos
): IParsedPeriod[] {
  const parsedPeriods : IParsedPeriod[] = [];
  for (let i = 0; i < periodsIR.length; i++) {
    const period = periodsIR[i];
    const periodBaseURL = resolveURL(manifestInfos.baseURL, period.children.baseURL);

    // 2. Generate ID
    let periodID : string;
    if (period.attributes.id == null) {
      log.warn("DASH: No usable id found in the Period. Generating one.");
      periodID = "gen-dash-period-" + generateNewId();
    } else {
      periodID = period.attributes.id;
    }

    // 3. Find the start of the Period (required)
    let periodStart : number;
    if (period.attributes.start != null) {
      periodStart = period.attributes.start;
    } else {
      if (i === 0) {
        periodStart = (
          !manifestInfos.isDynamic || manifestInfos.availabilityStartTime == null
        ) ?  0 : manifestInfos.availabilityStartTime;
      } else {
        const prevPeriod = parsedPeriods[i - 1];
        if (prevPeriod && prevPeriod.duration != null && prevPeriod.start != null) {
          periodStart = prevPeriod.start + prevPeriod.duration;
        } else {
          throw new Error("Missing start time when parsing periods.");
        }
      }
    }

    if (i > 0 && parsedPeriods[i - 1].duration === undefined) {
      parsedPeriods[i - 1].duration = periodStart - parsedPeriods[i - 1].start;
    }

    let periodDuration : number|undefined;
    if (period.attributes.duration != null) {
      periodDuration = period.attributes.duration;
    } else if (i === 0 && manifestInfos.duration) {
      periodDuration = manifestInfos.duration;
    }
    // 4. Construct underlying adaptations
    const { adaptations } = period.children.adaptations
      .reduce<{
        videoMainAdaptation : IParsedAdaptation|null;
        adaptations : IParsedAdaptations;
      }>((acc, adaptation) => {
        const adaptationChildren = adaptation.children;
        const parsedAdaptations = acc.adaptations;
        const adaptationBaseURL = resolveURL(periodBaseURL, adaptationChildren.baseURL);

        // 4-1. Construct Representations
        const representations = adaptation.children
          .representations.map((representation) => {
            const baseURL = representation.children.baseURL;
            const representationBaseURL = resolveURL(adaptationBaseURL, baseURL);

            // 4-2-1. Find Index
            const context = {
              periodStart,
              isDynamic: manifestInfos.isDynamic,
              representationBaseURL,
              representationId: representation.attributes.id,
              representationBitrate: representation.attributes.bitrate,
            };
            let representationIndex : IRepresentationIndex;
            if (representation.children.segmentBase != null) {
              const { segmentBase } = representation.children;
              representationIndex = new BaseRepresentationIndex(segmentBase, context);
            } else if (representation.children.segmentList != null) {
              const { segmentList } = representation.children;
              representationIndex = new ListRepresentationIndex(segmentList, context);
            } else if (representation.children.segmentTemplate != null) {
              const { segmentTemplate } = representation.children;
              representationIndex = segmentTemplate.indexType === "timeline" ?
                new TimelineRepresentationIndex(segmentTemplate, context) :
                new TemplateRepresentationIndex(segmentTemplate, context);
            } else {
              representationIndex = findAdaptationIndex(adaptation, context);
            }

            // 4-2-2. Find bitrate
            let representationBitrate : number;
            if (representation.attributes.bitrate == null) {
              log.warn("DASH: No usable bitrate found in the Representation.");
              representationBitrate = 0;
            } else {
              representationBitrate = representation.attributes.bitrate;
            }

            // 4-2-3. Set ID
            const representationID = representation.attributes.id != null ?
              representation.attributes.id :
              (
                representation.attributes.bitrate +
                (
                  representation.attributes.height != null ?
                  ("-" + representation.attributes.height) : ""
                ) +
                (
                  representation.attributes.width != null ?
                  ("-" + representation.attributes.width) : ""
                ) +
                (
                  representation.attributes.mimeType != null ?
                  ("-" + representation.attributes.mimeType) : ""
                ) +
                (
                  representation.attributes.codecs != null ?
                  ("-" + representation.attributes.codecs) : ""
                )
              );
            // 4-2-4. Construct Representation Base
            const parsedRepresentation : IParsedRepresentation = {
              bitrate: representationBitrate,
              index: representationIndex,
              id: representationID,
            };
            // 4-2-5. Add optional attributes
            let codecs : string|undefined;
            if (representation.attributes.codecs != null) {
              codecs = representation.attributes.codecs;
            } else if (adaptation.attributes.codecs != null) {
              codecs = adaptation.attributes.codecs;
            }
            if (codecs != null) {
              codecs = codecs === "mp4a.40.02" ? "mp4a.40.2" : codecs;
              parsedRepresentation.codecs = codecs;
            }
            if (representation.attributes.audioSamplingRate != null) {
              parsedRepresentation.audioSamplingRate =
                representation.attributes.audioSamplingRate;
            } else if (adaptation.attributes.audioSamplingRate != null) {
              parsedRepresentation.audioSamplingRate =
                adaptation.attributes.audioSamplingRate;
            }
            if (representation.attributes.codingDependency != null) {
              parsedRepresentation.codingDependency =
                representation.attributes.codingDependency;
            } else if (adaptation.attributes.codingDependency != null) {
              parsedRepresentation.codingDependency =
                adaptation.attributes.codingDependency;
            }
            if (representation.attributes.frameRate != null) {
              parsedRepresentation.frameRate =
                representation.attributes.frameRate;
            } else if (adaptation.attributes.frameRate != null) {
              parsedRepresentation.frameRate =
                adaptation.attributes.frameRate;
            }
            if (representation.attributes.height != null) {
              parsedRepresentation.height =
                representation.attributes.height;
            } else if (adaptation.attributes.height != null) {
              parsedRepresentation.height =
                adaptation.attributes.height;
            }
            if (representation.attributes.maxPlayoutRate != null) {
              parsedRepresentation.maxPlayoutRate =
                representation.attributes.maxPlayoutRate;
            } else if (adaptation.attributes.maxPlayoutRate != null) {
              parsedRepresentation.maxPlayoutRate =
                adaptation.attributes.maxPlayoutRate;
            }
            if (representation.attributes.maximumSAPPeriod != null) {
              parsedRepresentation.maximumSAPPeriod =
                representation.attributes.maximumSAPPeriod;
            } else if (adaptation.attributes.maximumSAPPeriod != null) {
              parsedRepresentation.maximumSAPPeriod =
                adaptation.attributes.maximumSAPPeriod;
            }
            if (representation.attributes.mimeType != null) {
              parsedRepresentation.mimeType =
                representation.attributes.mimeType;
            } else if (adaptation.attributes.mimeType != null) {
              parsedRepresentation.mimeType =
                adaptation.attributes.mimeType;
            }
            if (representation.attributes.profiles != null) {
              parsedRepresentation.profiles =
                representation.attributes.profiles;
            } else if (adaptation.attributes.profiles != null) {
              parsedRepresentation.profiles =
                adaptation.attributes.profiles;
            }
            if (representation.attributes.qualityRanking != null) {
              parsedRepresentation.qualityRanking =
                representation.attributes.qualityRanking;
            }
            if (representation.attributes.segmentProfiles != null) {
              parsedRepresentation.segmentProfiles =
                representation.attributes.segmentProfiles;
            } else if (adaptation.attributes.segmentProfiles != null) {
              parsedRepresentation.segmentProfiles =
                adaptation.attributes.segmentProfiles;
            }
            if (representation.attributes.width != null) {
              parsedRepresentation.width =
                representation.attributes.width;
            } else if (adaptation.attributes.width != null) {
              parsedRepresentation.width =
                adaptation.attributes.width;
            }
            if (adaptation.children.contentProtections) {
              const contentProtections : IContentProtection[] = [];
              for (let k = 0; k < adaptation.children.contentProtections.length; k++) {
                const protection = adaptation.children.contentProtections[k];
                if (protection.keyId != null) {
                  contentProtections.push({ keyId: protection.keyId });
                }
              }
              if (contentProtections.length) {
                parsedRepresentation.contentProtections = contentProtections;
              }
            }
            return parsedRepresentation;
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
      }, { videoMainAdaptation: null, adaptations: {} });

    const parsedPeriod : IParsedPeriod = {
      id: periodID,
      start: periodStart,
      duration: periodDuration,
      adaptations,
    };
    if (period.attributes.bitstreamSwitching != null) {
      parsedPeriod.bitstreamSwitching = period.attributes.bitstreamSwitching;
    }
    parsedPeriods.push(parsedPeriod);
  }
  return parsedPeriods;
}
