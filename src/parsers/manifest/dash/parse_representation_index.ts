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

import {
  IRepresentationIndex,
  Representation,
} from "../../../manifest";
import objectAssign from "../../../utils/object_assign";
import { IInbandEvent } from "../../containers/isobmff";
// eslint-disable-next-line max-len
import extractMinimumAvailabilityTimeOffset from "./extract_minimum_availability_time_offset";
import {
  BaseRepresentationIndex,
  ListRepresentationIndex,
  TemplateRepresentationIndex,
  TimelineRepresentationIndex,
} from "./indexes";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import {
  IAdaptationSetIntermediateRepresentation,
} from "./node_parsers/AdaptationSet";
import {
  IRepresentationIntermediateRepresentation,
} from "./node_parsers/Representation";
import { IParsedSegmentTemplate } from "./node_parsers/SegmentTemplate";
import { IScheme } from "./node_parsers/utils";
import resolveBaseURLs from "./resolve_base_urls";

/** Supplementary context needed to parse a RepresentationIndex. */
export interface IRepresentationInfos {
  /** Parsed AdaptationSet which contains the Representation. */
  adaptation : IAdaptationSetIntermediateRepresentation;
  /** Whether we should request new segments even if they are not yet finished. */
  aggressiveMode : boolean;
  /** availability time offset of the concerned Adaptation. */
  availabilityTimeOffset: number;
  /** Eventual URLs from which every relative URL will be based on. */
  baseURLs : string[];
  /** Allows to obtain the first/last available position of a dynamic content. */
  manifestBoundsCalculator : ManifestBoundsCalculator;
  /** End time of the current period, in seconds. */
  end? : number;
  /** Whether the Manifest can evolve with time. */
  isDynamic : boolean;
  /**
   * Parent parsed SegmentTemplate elements.
   * Sorted by provenance from higher level (e.g. Period) to lower-lever (e.g.
   * AdaptationSet).
   */
  parentSegmentTemplates : IParsedSegmentTemplate[];
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
   * The parser should take this Representation - which is the same as this one
   * parsed at an earlier time - as a base to speed-up the parsing process.
   * /!\ If unexpected differences exist between both, there is a risk of
   * de-synchronization with what is actually on the server.
   */
  unsafelyBaseOnPreviousRepresentation : Representation | null;
  /** List of inband event streams that are present on the representation */
  inbandEventStreams: IScheme[] | undefined;
}

/**
 * Parse the specific segment indexing information found in a representation
 * into a IRepresentationIndex implementation.
 * @param {Array.<Object>} representation
 * @param {Object} representationInfos
 * @returns {Array.<Object>}
 */
export default function parseRepresentationIndex(
  representation : IRepresentationIntermediateRepresentation,
  representationInfos : IRepresentationInfos
) : IRepresentationIndex {
  const representationBaseURLs = resolveBaseURLs(representationInfos.baseURLs,
                                                 representation.children.baseURLs);
  const { aggressiveMode,
          availabilityTimeOffset,
          manifestBoundsCalculator,
          isDynamic,
          end: periodEnd,
          start: periodStart,
          receivedTime,
          timeShiftBufferDepth,
          unsafelyBaseOnPreviousRepresentation,
          inbandEventStreams } = representationInfos;

  const isInbandEventWhitelisted = (inbandEvent: IInbandEvent): boolean => {
    if (inbandEventStreams === undefined) {
      return false;
    }
    return inbandEventStreams
      .some(({ schemeIdUri }) => schemeIdUri === inbandEvent.schemeId);
  };
  const context = { aggressiveMode,
                    availabilityTimeOffset,
                    unsafelyBaseOnPreviousRepresentation,
                    isInbandEventWhitelisted,
                    manifestBoundsCalculator,
                    isDynamic,
                    periodEnd,
                    periodStart,
                    receivedTime,
                    representationBaseURLs,
                    representationBitrate: representation.attributes.bitrate,
                    representationId: representation.attributes.id,
                    timeShiftBufferDepth };
  let representationIndex : IRepresentationIndex;
  if (representation.children.segmentBase !== undefined) {
    const { segmentBase } = representation.children;
    context.availabilityTimeOffset =
      representationInfos.availabilityTimeOffset +
      extractMinimumAvailabilityTimeOffset(representation.children.baseURLs) +
      (segmentBase.availabilityTimeOffset ?? 0);
    representationIndex = new BaseRepresentationIndex(segmentBase, context);
  } else if (representation.children.segmentList !== undefined) {
    const { segmentList } = representation.children;
    representationIndex = new ListRepresentationIndex(segmentList, context);
  } else if (representation.children.segmentTemplate !== undefined ||
             representationInfos.parentSegmentTemplates.length > 0)
  {
    const segmentTemplates = representationInfos.parentSegmentTemplates.slice();
    const childSegmentTemplate = representation.children.segmentTemplate;
    if (childSegmentTemplate !== undefined) {
      segmentTemplates.push(childSegmentTemplate);
    }
    const segmentTemplate =
      objectAssign({},
                   ...segmentTemplates as [IParsedSegmentTemplate] /* Ugly TS Hack */);
    context.availabilityTimeOffset =
      representationInfos.availabilityTimeOffset +
      extractMinimumAvailabilityTimeOffset(representation.children.baseURLs) +
      (segmentTemplate.availabilityTimeOffset ?? 0);
    const { timelineParser } = segmentTemplate;
    representationIndex = timelineParser !== undefined ?
      new TimelineRepresentationIndex(segmentTemplate, timelineParser, context) :
      new TemplateRepresentationIndex(segmentTemplate, context);
  } else {
    const adaptationChildren = representationInfos.adaptation.children;
    if (adaptationChildren.segmentBase !== undefined) {
      const { segmentBase } = adaptationChildren;
      representationIndex = new BaseRepresentationIndex(segmentBase, context);
    } else if (adaptationChildren.segmentList !== undefined) {
      const { segmentList } = adaptationChildren;
      representationIndex = new ListRepresentationIndex(segmentList, context);
    } else {
      representationIndex = new TemplateRepresentationIndex({
        duration: Number.MAX_VALUE,
        timescale: 1,
        startNumber: 0,
        initialization: { media: "" },
        media: "",
      }, context);
    }
  }
  return representationIndex;
}
