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
import log from "../../../../log";
import IRepresentationIndex from "../../../../manifest/representation_index";
import generateNewId from "../../../../utils/id";
import { normalize as normalizeLang } from "../../../../utils/languages";
import { resolveURL } from "../../../../utils/url";
import {
  IContentProtection,
  IParsedAdaptation,
  IParsedAdaptations,
  IParsedPeriod,
  IParsedRepresentation,
} from "../.././../manifest/types";
import inferAdaptationType from "../../utils/infer_adaptation_type";
import {
  isHardOfHearing,
  isVisuallyImpaired,
  parseBoolean,
  parseDuration,
} from "../helpers";
import {
  createAdaptationSetIntermediateRepresentation,
  IAdaptationSetIntermediateRepresentation,
} from "./AdaptationSet";

import {
  IRepresentationIntermediateRepresentation
} from "../node_parsers/Representation";

import BaseRepresentationIndex from "../indexes/base";
import ListRepresentationIndex from "../indexes/list";
import TemplateRepresentationIndex from "../indexes/template";
import TimelineRepresentationIndex from "../indexes/timeline";

export interface IPeriodIntermediateRepresentation {
  children : IPeriodChildren;
  attributes : IPeriodAttributes;
}

// intermediate representation for a Period's children
export interface IPeriodChildren {
  // required
  baseURL : string; // BaseURL for the contents. Empty string if not defined
  adaptations : IAdaptationSetIntermediateRepresentation[];
}

// intermediate representation for a Period's attributes
export interface IPeriodAttributes {
  // optional
  id? : string;
  start? : number;
  duration? : number;
  bitstreamSwitching? : boolean;
  linkURL? : string;
  resolveAtLoad? : boolean;
}

/**
 * Create an intermediate period object from Element.
 * @param {Element} root
 * @returns {Object}
 */
function createIntermediatePeriod(root: Element) {
  function parseRootChildren(rootChildren : NodeList) {
    const periods : IPeriodIntermediateRepresentation[] = [];
    for (let i = 0; i < rootChildren.length; i++) {
      if (rootChildren[i].nodeType === Node.ELEMENT_NODE) {
        const currentNode = rootChildren[i] as Element;
        switch (currentNode.nodeName) {
          case "Period":
            const period =
            createPeriodIntermediateRepresentation(currentNode);
            periods.push(period);
            break;
        }
      }
    }
    return periods;
  }
  return parseRootChildren(root.childNodes);
}

/**
 * Process intermediate periods to create final parsed periods.
 * @param {Object} rootPeriods
 * @param {string} mpdRootURL
 * @param {Object|null} rootAttributes
 * @param {Object} prevPeriodInfos
 * @param {Object} nextPeriodInfos
 * @returns {Array.<Object>}
 */
export function getPeriodsFromIntermediate(
  rootPeriods: IPeriodIntermediateRepresentation[],
  manifestInfos: {
    manifestAttributes?: {
      type?: string;
      availabilityStartTime?: number;
      duration?: number;
    };
    prevPeriodInfos?: { start?: number; duration?: number};
    nextPeriodInfos?: { start?: number };
  },
  mpdRootURL?: string
): IParsedPeriod[] {
  const {
    manifestAttributes,
    prevPeriodInfos,
    nextPeriodInfos,
  } = manifestInfos;
  const parsedPeriods : IParsedPeriod[] = [];
  for (let i = 0; i < rootPeriods.length; i++) {
    const period = rootPeriods[i];
    // 1. Construct partial URL for contents
    const periodRootURL = resolveURL(mpdRootURL, period.children.baseURL);
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
    if (manifestAttributes != null && i === 0) {
      periodStart = (
        manifestAttributes.type === "static" ||
        manifestAttributes.availabilityStartTime == null
      ) ?  0 : manifestAttributes.availabilityStartTime;
    } else {
      const prevPeriod = parsedPeriods[i - 1] || prevPeriodInfos;
      if (prevPeriod && prevPeriod.duration != null && prevPeriod.start != null) {
        periodStart = prevPeriod.start + prevPeriod.duration;
      } else {
        throw new Error("Missing start time when parsing periods.");
      }
    }
  }

    let periodDuration : number|undefined;
    if (period.attributes.duration != null) {
      periodDuration = period.attributes.duration;
    } else {
      if (
        nextPeriodInfos &&
        nextPeriodInfos.start != null &&
        periodStart != null &&
        rootPeriods.length === 1
      ) {
        periodDuration = nextPeriodInfos.start - periodStart;
      } else if (
        i === 0 &&
        manifestAttributes != null &&
        manifestAttributes.duration &&
        !nextPeriodInfos
      ) {
        periodDuration = manifestAttributes.duration;
      }
    }
    // 4. Construct underlying adaptations
    const { adaptations } = period.children.adaptations
      .reduce<{
        videoMainAdaptation : IParsedAdaptation|null;
        adaptations : IParsedAdaptations;
      }>((acc, adaptation) => {
        const parsedAdaptations = acc.adaptations;
        const adaptationRootURL = resolveURL(periodRootURL, adaptation.children.baseURL);
        const adaptationChildren = adaptation.children;
        // 4-1. Find Index
        function findAdaptationIndex(
          representation : IRepresentationIntermediateRepresentation
        ): IRepresentationIndex {
          const repId = representation.attributes.id || "";
          const repBitrate = representation.attributes.bitrate;
          const baseURL = representation.children.baseURL;
          const representationURL = resolveURL(
            adaptationRootURL, baseURL);
          let adaptationIndex : IRepresentationIndex;
          if (adaptationChildren.segmentBase != null) {
            const { segmentBase } = adaptationChildren;
            adaptationIndex = new BaseRepresentationIndex(segmentBase, {
              periodStart,
              representationURL,
              representationId: repId,
              representationBitrate: repBitrate,
            });
          } else if (adaptationChildren.segmentList != null) {
            const { segmentList } = adaptationChildren;
            adaptationIndex = new ListRepresentationIndex(segmentList, {
              periodStart,
              representationURL,
              representationId: repId,
              representationBitrate: repBitrate,
            });
          } else if (adaptationChildren.segmentTemplate != null) {
            const { segmentTemplate } = adaptationChildren;
            adaptationIndex = segmentTemplate.indexType === "timeline" ?
              new TimelineRepresentationIndex(segmentTemplate, {
                periodStart,
                representationURL,
                representationId: repId,
                representationBitrate: repBitrate,
              }) :
              new TemplateRepresentationIndex(segmentTemplate, {
                periodStart,
                representationURL,
                representationId: repId,
                representationBitrate: repBitrate,
              });
          } else {
            adaptationIndex = new TemplateRepresentationIndex({
              duration: Number.MAX_VALUE,
              timescale: 1,
              startNumber: 0,
              initialization: { media: "" },
              media: "",
            }, {
              periodStart,
              representationURL,
              representationId: repId,
              representationBitrate: repBitrate,
            });
          }
          return adaptationIndex;
        }
        // 4-2. Construct Representations
        const representations = adaptation.children
          .representations.map((representation) => {
            const repId = representation.attributes.id || "";
            const repBitrate = representation.attributes.bitrate;
            const baseURL = representation.children.baseURL;
            const representationURL = resolveURL(adaptationRootURL, baseURL);
            // 4-2-1. Find bitrate
            let representationBitrate : number;
            if (representation.attributes.bitrate == null) {
              log.warn("DASH: No usable bitrate found in the Representation.");
              representationBitrate = 0;
            } else {
              representationBitrate = representation.attributes.bitrate;
            }
            // 4-2-2. Find Index
            let representationIndex : IRepresentationIndex;
            if (representation.children.segmentBase != null) {
              const { segmentBase } = representation.children;
              representationIndex = new BaseRepresentationIndex(segmentBase, {
                periodStart,
                representationURL,
                representationId: repId,
                representationBitrate: repBitrate,
              });
            } else if (representation.children.segmentList != null) {
              const { segmentList } = representation.children;
              representationIndex = new ListRepresentationIndex(segmentList, {
                periodStart,
                representationURL,
                representationId: repId,
                representationBitrate: repBitrate,
              });
            } else if (representation.children.segmentTemplate != null) {
              const { segmentTemplate } = representation.children;
              representationIndex = segmentTemplate.indexType === "timeline" ?
                new TimelineRepresentationIndex(segmentTemplate, {
                  periodStart,
                  representationURL,
                  representationId: repId,
                  representationBitrate: repBitrate,
                }) :
                new TemplateRepresentationIndex(segmentTemplate, {
                  periodStart,
                  representationURL,
                  representationId: repId,
                  representationBitrate: repBitrate,
                });
            } else {
              representationIndex = findAdaptationIndex(representation);
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
        linkURL: period.attributes.linkURL,
        resolveAtLoad: period.attributes.resolveAtLoad,
      };
      if (period.attributes.bitstreamSwitching != null) {
        parsedPeriod.bitstreamSwitching = period.attributes.bitstreamSwitching;
      }
      parsedPeriods.push(parsedPeriod);
    }
  return parsedPeriods;
}

/**
 * Parse a document, and create a period object from it.
 * @param {Document} documents
 * @param {Object} prevPeriodInfos
 * @param {Object} nextPeriodInfos
 * @returns {Object}
 */
export function parsePeriods(
  documents: Document,
  prevPeriodInfos: { start?: number; duration?: number}|undefined,
  nextPeriodInfos: { start?: number }|undefined
): IParsedPeriod[] {
  const root = documents.children[0];
  if (root == null || root.nodeType !== 1) {
    throw new Error("Period text format is not valid.");
  }
  const intermediatePeriods = createIntermediatePeriod(root);

  const manifestInfos = {
    prevPeriodInfos,
    nextPeriodInfos,
  };

  return getPeriodsFromIntermediate(
    intermediatePeriods,
    manifestInfos
  );
}

/**
 * @param {NodeList} periodChildren
 * @returns {Object}
 */
function parsePeriodChildren(periodChildren : NodeList) : IPeriodChildren {
  let baseURL = "";
  const adaptations : IAdaptationSetIntermediateRepresentation[] = [];

  for (let i = 0; i < periodChildren.length; i++) {
    if (periodChildren[i].nodeType === Node.ELEMENT_NODE) {
      const currentElement = periodChildren[i] as Element;

      switch (currentElement.nodeName) {

        case "BaseURL":
          baseURL = currentElement.textContent || "";
          break;

        case "AdaptationSet":
          const adaptation =
            createAdaptationSetIntermediateRepresentation(currentElement);
          adaptations.push(adaptation);
          break;
      }
    }
  }

  return { baseURL, adaptations };
}

/**
 * @param {Element} periodElement
 * @returns {Object}
 */
function parsePeriodAttributes(periodElement : Element) : IPeriodAttributes {
  const res : IPeriodAttributes = {};
  for (let i = 0; i < periodElement.attributes.length; i++) {
    const attribute = periodElement.attributes[i];

    switch (attribute.name) {
      case "id":
        res.id = attribute.value;
        break;
      case "start": {
        const tempStart = parseDuration(attribute.value);
        if (!isNaN(tempStart)) {
          res.start = tempStart;
        } else {
          log.warn("DASH: Unrecognized start in the mpd:", attribute.value);
        }
      }
        break;
      case "duration": {
        const tempDuration = parseDuration(attribute.value);
        if (!isNaN(tempDuration)) {
          res.duration = tempDuration;
        } else {
          log.warn("DASH: Unrecognized duration in the mpd:", attribute.value);
        }
      }
        break;
      case "bitstreamSwitching":
        res.bitstreamSwitching = parseBoolean(attribute.value);
        break;
      case "xlink:href":
        res.linkURL = attribute.value;
        break;
      case "xlink:actuate":
        res.resolveAtLoad = attribute.value === "onLoad";
        break;
    }
  }
  return res;
}

export function createPeriodIntermediateRepresentation(
  periodElement : Element
) : IPeriodIntermediateRepresentation {
  return {
    children: parsePeriodChildren(periodElement.childNodes),
    attributes: parsePeriodAttributes(periodElement),
  };
}
