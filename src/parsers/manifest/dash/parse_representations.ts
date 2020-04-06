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
import {
  Adaptation,
  Representation,
} from "../../../manifest";
import IRepresentationIndex from "../../../manifest/representation_index";
import {
  IContentProtections,
  IParsedRepresentation,
} from "../types";
import extractMinimumAvailabilityTimeOffset from "./extract_minimum_availability_time_offset";
import {
  BaseRepresentationIndex,
  ListRepresentationIndex,
  TemplateRepresentationIndex,
  TimelineRepresentationIndex
} from "./indexes";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import {
  IAdaptationSetIntermediateRepresentation
} from "./node_parsers/AdaptationSet";
import {
  IRepresentationIntermediateRepresentation
} from "./node_parsers/Representation";
import resolveBaseURLs from "./resolve_base_urls";

/** Supplementary context needed to parse a Representation. */
export interface IAdaptationInfos {
  /** Whether we should request new segments even if they are not yet finished. */
  aggressiveMode : boolean;
  /** availability time offset of the concerned Adaptation. */
  availabilityTimeOffset: number;
  /** Eventual URLs from which every relative URL will be based on. */
  baseURLs : string[];
  /** Allows to obtain the first available position of a dynamic content. */
  manifestBoundsCalculator : ManifestBoundsCalculator;
  /** End time of the current period, in seconds. */
  end? : number;
  /** Whether the Manifest can evolve with time. */
  isDynamic : boolean;
  /**
   * Time (in terms of `performance.now`) at which the XML file containing this
   * Representation was received.
   */
  receivedTime? : number;
  /** Start time of the current period, in seconds. */
  start : number;
  /** Depth of the buffer for the whole content, in seconds. */
  timeShiftBufferDepth? : number;
  /**
   * The parser should take this Adaptation - which is from a previously parsed
   * Manifest for the same dynamic content - as a base to speed-up the parsing
   * process.
   * /!\ If unexpected differences exist between both, there is a risk of
   * de-synchronization with what is actually on the server,
   * Use with moderation.
   */
  unsafelyBaseOnPreviousAdaptation : Adaptation | null;
}

/** Base context given to the various indexes. */
interface IIndexContext {
  /** Whether we should request new segments even if they are not yet finished. */
  aggressiveMode : boolean;
  availabilityTimeOffset: number;
  /** Allows to obtain the first available position of a dynamic content. */
  manifestBoundsCalculator : ManifestBoundsCalculator;
  /** Whether the Manifest can evolve with time. */
  isDynamic : boolean;
  /** Start of the period concerned by this RepresentationIndex, in seconds. */
  periodStart : number;
  /** End of the period concerned by this RepresentationIndex, in seconds. */
  periodEnd : number|undefined;
  /** Base URLs for the Representation concerned. */
  representationBaseURLs : string[];
  /** ID of the Representation concerned. */
  representationId? : string;
  /** Bitrate of the Representation concerned. */
  representationBitrate? : number;
  /** Depth of the buffer for the whole content, in seconds. */
  timeShiftBufferDepth? : number;
  /**
   * The parser should take this Representation - which is the same as this one
   * parsed at an earlier time - as a base to speed-up the parsing process.
   * /!\ If unexpected differences exist between both, there is a risk of
   * de-synchronization with what is actually on the server.
   */
  unsafelyBaseOnPreviousRepresentation: Representation | null;
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
export default function parseRepresentations(
  representationsIR : IRepresentationIntermediateRepresentation[],
  adaptation : IAdaptationSetIntermediateRepresentation,
  adaptationInfos : IAdaptationInfos
): IParsedRepresentation[] {
  const parsedRepresentations : IParsedRepresentation[] = [];
  for (let representationIdx = 0;
       representationIdx < representationsIR.length;
       representationIdx++)
  {
    const representation = representationsIR[representationIdx];
    const representationBaseURLs = resolveBaseURLs(adaptationInfos.baseURLs,
                                                   representation.children.baseURLs);

  // 1. Get ID
  let representationID = representation.attributes.id != null ?
    representation.attributes.id :
    (String(representation.attributes.bitrate) +
       (representation.attributes.height != null ?
          (`-${representation.attributes.height}`) :
          "") +
       (representation.attributes.width != null ?
          (`-${representation.attributes.width}`) :
          "") +
       (representation.attributes.mimeType != null ?
          (`-${representation.attributes.mimeType}`) :
          "") +
       (representation.attributes.codecs != null ?
          (`-${representation.attributes.codecs}`) :
          ""));

    // Avoid duplicate IDs
    while (parsedRepresentations.some(r => r.id === representationID)) {
      representationID += "-dup";
    }

    // 2. Retrieve previous version of the Representation, if one.
    const unsafelyBaseOnPreviousRepresentation = adaptationInfos
      .unsafelyBaseOnPreviousAdaptation?.getRepresentation(representationID) ??
      null;

    // 3. Find Index
    const context = { aggressiveMode: adaptationInfos.aggressiveMode,
                      availabilityTimeOffset: adaptationInfos.availabilityTimeOffset,
                      unsafelyBaseOnPreviousRepresentation,
                      manifestBoundsCalculator: adaptationInfos.manifestBoundsCalculator,
                      isDynamic: adaptationInfos.isDynamic,
                      periodEnd: adaptationInfos.end,
                      periodStart: adaptationInfos.start,
                      receivedTime: adaptationInfos.receivedTime,
                      representationBaseURLs,
                      representationBitrate: representation.attributes.bitrate,
                      representationId: representation.attributes.id,
                      timeShiftBufferDepth: adaptationInfos.timeShiftBufferDepth };
    let representationIndex : IRepresentationIndex;
    if (representation.children.segmentBase != null) {
      const { segmentBase } = representation.children;
      context.availabilityTimeOffset =
        adaptationInfos.availabilityTimeOffset +
        extractMinimumAvailabilityTimeOffset(representation.children.baseURLs) +
        (segmentBase.availabilityTimeOffset ?? 0);
      representationIndex = new BaseRepresentationIndex(segmentBase, context);
    } else if (representation.children.segmentList != null) {
      const { segmentList } = representation.children;
      representationIndex = new ListRepresentationIndex(segmentList, context);
    } else if (representation.children.segmentTemplate != null) {
      const { segmentTemplate } = representation.children;
      if (segmentTemplate.indexType === "timeline") {
        representationIndex = new TimelineRepresentationIndex(segmentTemplate, context);
      } else {
      context.availabilityTimeOffset =
        adaptationInfos.availabilityTimeOffset +
        extractMinimumAvailabilityTimeOffset(representation.children.baseURLs) +
        (segmentTemplate.availabilityTimeOffset ?? 0);
        representationIndex = new TemplateRepresentationIndex(segmentTemplate, context);
      }
    } else {
      representationIndex = findAdaptationIndex(adaptation, context);
    }

    // 3. Find bitrate
    let representationBitrate : number;
    if (representation.attributes.bitrate == null) {
      log.warn("DASH: No usable bitrate found in the Representation.");
      representationBitrate = 0;
    } else {
      representationBitrate = representation.attributes.bitrate;
    }

    // 4. Construct Representation Base
    const parsedRepresentation : IParsedRepresentation =
      { bitrate: representationBitrate,
        index: representationIndex,
        id: representationID };

    // 5. Add optional attributes
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
    if (representation.attributes.mimeType != null) {
      parsedRepresentation.mimeType =
        representation.attributes.mimeType;
    } else if (adaptation.attributes.mimeType != null) {
      parsedRepresentation.mimeType =
        adaptation.attributes.mimeType;
    }
    if (representation.attributes.width != null) {
      parsedRepresentation.width =
        representation.attributes.width;
    } else if (adaptation.attributes.width != null) {
      parsedRepresentation.width =
        adaptation.attributes.width;
    }

    if (adaptation.children.contentProtections != null) {
      const contentProtections = adaptation.children.contentProtections
        .reduce<IContentProtections>((acc, cp) => {
          let systemId : string|undefined;
          if (cp.attributes.schemeIdUri !== undefined &&
              cp.attributes.schemeIdUri.substring(0, 9) === "urn:uuid:")
          {
            systemId = cp.attributes.schemeIdUri.substring(9)
                         .replace(/-/g, "")
                         .toLowerCase();
          }
          if (cp.attributes.keyId !== undefined && cp.attributes.keyId.length > 0) {
            acc.keyIds.push({ keyId: cp.attributes.keyId, systemId });
          }
          if (systemId !== undefined) {
            const { cencPssh } = cp.children;
            for (let i = 0; i < cencPssh.length; i++) {
              const data = cencPssh[i];
              if (acc.initData.cenc === undefined) {
                acc.initData.cenc = [];
              }
              acc.initData.cenc.push({ systemId, data });
            }
          }
          return acc;
        }, { keyIds: [], initData: {} });
      if (Object.keys(contentProtections.initData).length > 0 ||
          contentProtections.keyIds.length > 0)
      {
        parsedRepresentation.contentProtections = contentProtections;
      }
    }

    parsedRepresentations.push(parsedRepresentation);
  }
  return parsedRepresentations;
}
