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

import config from "../../../../config";
import { IRepresentationIndex } from "../../../../manifest";
import {
  IParsedAdaptation,
  IParsedManifest,
  IParsedPeriod,
  IParsedRepresentation,
} from "../../../../parsers/manifest/types";
import arrayIncludes from "../../../../utils/array-includes";
import generateNewId from "../../../../utils/id";
import {
  normalize as normalizeLang,
} from "../../../../utils/languages";
import log from "../../../../utils/log";
import {
  normalizeBaseURL,
  resolveURL,
} from "../../../../utils/url";
import {
  IRole,
  isHardOfHearing,
  isVisuallyImpaired,
} from "../helpers";
import BaseRepresentationIndex from "../indexes/base";
import ListRepresentationIndex from "../indexes/list";
import TemplateRepresentationIndex from "../indexes/template";
import TimelineRepresentationIndex from "../indexes/timeline";
import {
  createMPDIntermediateRepresentation,
} from "./MPD";

const KNOWN_ADAPTATION_TYPES = ["audio", "video", "text", "image"];
const SUPPORTED_TEXT_TYPES = ["subtitle", "caption"];

/**
 * Infers the type of adaptation from codec and mimetypes found in it.
 *
 * This follows the guidelines defined by the DASH-IF IOP:
 *   - one adaptation set contains a single media type
 *   - The order of verifications are:
 *       1. mimeType
 *       2. Role
 *       3. codec
 *
 * Note: This is based on DASH-IF-IOP-v4.0 with some more freedom.
 * @param {Object} adaptation
 * @returns {string} - "audio"|"video"|"text"|"image"|"metadata"|"unknown"
 */
function inferAdaptationType(
  adaptationMimeType : string|null,
  representationMimeTypes : string[],
  adaptationCodecs : string|null,
  representationCodecs : string[],
  adaptationRole : IRole|null
) : string {

  function fromMimeType(mimeType : string, role : IRole|null) : string|undefined {
    const topLevel = mimeType.split("/")[0];
    if (arrayIncludes(KNOWN_ADAPTATION_TYPES, topLevel)) {
      return topLevel;
    }

    if (mimeType === "application/bif") {
      return "image";
    }

    if (mimeType === "application/ttml+xml") {
      return "text";
    }

    // manage DASH-IF mp4-embedded subtitles and metadata
    if (mimeType === "application/mp4") {
      if (role) {
        if (
          role.schemeIdUri === "urn:mpeg:dash:role:2011" &&
          arrayIncludes(SUPPORTED_TEXT_TYPES, role.value)
        ) {
          return "text";
        }
      }
      return "metadata";
    }
  }

  function fromCodecs(codecs : string) {
    switch (codecs.substr(0, 3)) {
      case "avc":
      case "hev":
      case "hvc":
      case "vp8":
      case "vp9":
      case "av1":
        return "video";
      case "vtt":
        return "text";
      case "bif":
        return "image";
    }

    switch (codecs.substr(0, 4)) {
      case "mp4a":
        return "audio";
      case "wvtt":
      case "stpp":
        return "text";
    }
  }

  if (adaptationMimeType != null) {
    const typeFromMimeType = fromMimeType(adaptationMimeType, adaptationRole);
    if (typeFromMimeType != null) {
      return typeFromMimeType;
    }
  }

  if (adaptationCodecs != null) {
    const typeFromCodecs = fromCodecs(adaptationCodecs);
    if (typeFromCodecs != null) {
      return typeFromCodecs;
    }
  }

  for (let i = 0; i < representationMimeTypes.length; i++) {
    const representationMimeType = representationMimeTypes[i];
    if (representationMimeType != null) {
      const typeFromMimeType = fromMimeType(representationMimeType, adaptationRole);
      if (typeFromMimeType != null) {
        return typeFromMimeType;
      }
    }
  }

  for (let i = 0; i < representationCodecs.length; i++) {
    const codecs = representationCodecs[i];
    if (codecs != null) {
      const typeFromMimeType = fromCodecs(codecs);
      if (typeFromMimeType != null) {
        return typeFromMimeType;
      }
    }
  }

  return "unknown";
}

/**
 * Returns "last time of reference" from the adaptation given, considering a
 * live content.
 * Undefined if a time could not be found.
 *
 * We consider the earliest last time from every representations in the given
 * adaptation.
 *
 * This is done to calculate a liveGap which is valid for the whole manifest,
 * even in weird ones.
 * @param {Object} adaptation
 * @returns {Number|undefined}
 */
const getLastLiveTimeReference = (
  adaptation: IParsedAdaptation
) : number|undefined => {
  // Here's how we do, for each possibility:
  //  1. only the adaptation has an index (no representation has):
  //    - returns the index last time reference
  //
  //  2. every representations have an index:
  //    - returns minimum for every representations
  //
  //  3. not all representations have an index but the adaptation has
  //    - returns minimum between all representations and the adaptation
  //
  //  4. no index for 1+ representation(s) and no adaptation index:
  //    - returns undefined
  //
  //  5. Invalid index found somewhere:
  //    - returns undefined

  if (!adaptation) {
    return undefined;
  }

  const representations = adaptation.representations || [];

  const lastLiveTimeReferences : Array<number|undefined> = representations
    .map(representation => {
      const lastPosition = representation.index.getLastPosition();
      return lastPosition != null ? lastPosition - 10 : undefined; // TODO
    });

  if (lastLiveTimeReferences.some((x) => x == null)) {
    return undefined;
  }

  const representationsMin = Math.min(...lastLiveTimeReferences as number[]);

  if (isNaN(representationsMin)) {
    return undefined;
  }
  return representationsMin;
};

export default function parseManifest(
  root: Node,
  uri : string
  // contentProtectionParser?: IContentProtectionParser
) : IParsedManifest {
  // Transform whole MPD into a parsed JS object representation
  const {
    children: rootChildren,
    attributes: rootAttributes,
  } = createMPDIntermediateRepresentation(root);

  const mpdRootURL = resolveURL(normalizeBaseURL(uri), rootChildren.baseURL);

  const parsedPeriods : IParsedPeriod[] = [];
  for (let i = 0; i < rootChildren.periods.length; i++) {
    const period = rootChildren.periods[i];

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
      if (i === 0) {
        periodStart = (
          rootAttributes.type === "static" ||
          rootAttributes.availabilityStartTime == null
        ) ?  0 : rootAttributes.availabilityStartTime;
      } else {
        const prevPeriod = parsedPeriods[i - 1];
        if (prevPeriod.duration != null) {
          periodStart = prevPeriod.start + prevPeriod.duration;
        } else {
          throw new Error("Not enough informations on the periods: cannot find start.");
        }
      }
    }

    let periodDuration : number|undefined;

    if (period.attributes.duration != null) {
      periodDuration = period.attributes.duration;
    } else {
      const nextPeriod = parsedPeriods[i + 1];
      if (nextPeriod && nextPeriod.start != null) {
        periodDuration = nextPeriod.start - periodStart;
      } else if (
        i === 0 &&
        rootAttributes.duration &&
        !nextPeriod
      ) {
        periodDuration = rootAttributes.duration;
      }
    }

    // 4. Construct underlying adaptations
    const adaptations = period.children.adaptations.map((adaptation) => {
      const adaptationRootURL = resolveURL(periodRootURL, adaptation.children.baseURL);
      const adaptationChildren = adaptation.children;

      // 4-1. Find Index
      let adaptationIndex : IRepresentationIndex;
      if (adaptationChildren.segmentBase != null) {
        adaptationIndex = new BaseRepresentationIndex(
          adaptationChildren.segmentBase,
          periodStart
        );
      } else if (adaptationChildren.segmentList != null) {
        adaptationIndex = new ListRepresentationIndex(
          adaptationChildren.segmentList,
          periodStart
        );
      } else if (adaptationChildren.segmentTemplate != null) {
        const template = adaptationChildren.segmentTemplate;
        template.presentationTimeOffset = periodStart * template.timescale;
        adaptationIndex = template.indexType === "timeline" ?
          // TODO Find a way with the optional 'd'
          new TimelineRepresentationIndex(template as any, periodStart) :
          new TemplateRepresentationIndex(template, periodStart);
      } else {
        adaptationIndex = new TemplateRepresentationIndex({
          duration: Number.MAX_VALUE,
          timescale: 1,
          startNumber: 0,
        }, periodStart);
      }

      // 4-2. Construct Representations
      const representations = adaptation.children
        .representations.map((representation) => {
          const representationURL = resolveURL(
            adaptationRootURL, representation.children.baseURL);

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
            representationIndex = new BaseRepresentationIndex(
              representation.children.segmentBase,
              periodStart
            );
          } else if (representation.children.segmentList != null) {
            representationIndex = new ListRepresentationIndex(
              representation.children.segmentList,
              periodStart
            );
          } else if (representation.children.segmentTemplate != null) {
            const template = representation.children.segmentTemplate;
            representationIndex = template.indexType === "timeline" ?
              // TODO Find a way with the optional 'd'
              new TimelineRepresentationIndex(template as any, periodStart) :
              new TemplateRepresentationIndex(template, periodStart);
          } else {
            representationIndex = adaptationIndex;
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
            baseURL: representationURL,
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

          return parsedRepresentation;
        });

      const adaptationMimeType = adaptation.attributes.mimeType;
      const adaptationCodecs = adaptation.attributes.codecs;

      const representationMimeTypes = representations
        .map(r => r.mimeType)
        .filter((mimeType : string|undefined) : mimeType is string => mimeType != null);

      const representationCodecs = representations
        .map(r => r.codecs)
        .filter((codecs : string|undefined) : codecs is string => codecs != null);

      const type = inferAdaptationType(
        adaptationMimeType || null,
        representationMimeTypes,
        adaptationCodecs || null,
        representationCodecs,
        adaptationChildren.role || null
      );

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

      return parsedAdaptationSet;
    });

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

  const parsedMPD : IParsedManifest = {
    availabilityStartTime: (
        rootAttributes.type === "static" ||
        rootAttributes.availabilityStartTime == null
      ) ?  0 : rootAttributes.availabilityStartTime,
    duration: rootAttributes.duration == null ? Infinity : rootAttributes.duration,
    id: rootAttributes.id != null ?
      rootAttributes.id : "gen-dash-manifest-" + generateNewId(),
    periods: parsedPeriods,
    transportType: "dash",
    type: rootAttributes.type || "static",
    uris: [uri, ...rootChildren.locations],
    suggestedPresentationDelay: rootAttributes.suggestedPresentationDelay != null ?
      rootAttributes.suggestedPresentationDelay :
      config.DEFAULT_SUGGESTED_PRESENTATION_DELAY.DASH,
  };

  // -- add optional fields --

  if (rootAttributes.profiles != null) {
    parsedMPD.profiles = rootAttributes.profiles;
  }
  if (rootAttributes.type !== "static" && rootAttributes.availabilityEndTime != null) {
    parsedMPD.availabilityEndTime = rootAttributes.availabilityEndTime;
  }
  if (rootAttributes.publishTime != null) {
    parsedMPD.publishTime = rootAttributes.publishTime;
  }
  if (rootAttributes.duration != null) {
    parsedMPD.duration = rootAttributes.duration;
  }
  if (rootAttributes.minimumUpdatePeriod != null) {
    parsedMPD.minimumUpdatePeriod = rootAttributes.minimumUpdatePeriod;
  }
  if (rootAttributes.minBufferTime != null) {
    parsedMPD.minBufferTime = rootAttributes.minBufferTime;
  }
  if (rootAttributes.timeShiftBufferDepth != null) {
    parsedMPD.timeShiftBufferDepth = rootAttributes.timeShiftBufferDepth;
  }
  if (rootAttributes.maxSegmentDuration != null) {
    parsedMPD.maxSegmentDuration = rootAttributes.maxSegmentDuration;
  }
  if (rootAttributes.maxSubsegmentDuration != null) {
    parsedMPD.maxSubsegmentDuration = rootAttributes.maxSubsegmentDuration;
  }

  if (parsedMPD.type === "dynamic") {
    const lastPeriodAdaptations = parsedMPD.periods[
      parsedMPD.periods.length - 1
    ].adaptations;

    const firstVideoAdaptationFromLastPeriod = lastPeriodAdaptations
      .filter(a => a.type === "video")[0];

    const lastRef = getLastLiveTimeReference(firstVideoAdaptationFromLastPeriod);
    parsedMPD.presentationLiveGap = lastRef != null ?
      Date.now() / 1000 - (lastRef + parsedMPD.availabilityStartTime) : 10;
  }

  return parsedMPD;
}
