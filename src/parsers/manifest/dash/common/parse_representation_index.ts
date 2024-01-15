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
} from "../../../../manifest";
import objectAssign from "../../../../utils/object_assign";
import { IEMSG } from "../../../containers/isobmff";
import {
  IAdaptationSetIntermediateRepresentation,
  IRepresentationIntermediateRepresentation,
  ISegmentTemplateIntermediateRepresentation,
  IScheme,
} from "../node_parser_types";
import {
  BaseRepresentationIndex,
  ListRepresentationIndex,
  TemplateRepresentationIndex,
  TimelineRepresentationIndex,
  IBaseIndexContextArgument,
  IListIndexContextArgument,
  ITemplateIndexContextArgument,
  ITimelineIndexContextArgument,
} from "./indexes";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import { IResolvedBaseUrl } from "./resolve_base_urls";

/**
 * Parse the specific segment indexing information found in a representation
 * into a IRepresentationIndex implementation.
 * @param {Array.<Object>} representation
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parseRepresentationIndex(
  representation : IRepresentationIntermediateRepresentation,
  context : IRepresentationIndexContext
) : IRepresentationIndex {
  const { availabilityTimeOffset,
          manifestBoundsCalculator,
          isDynamic,
          end: periodEnd,
          start: periodStart,
          receivedTime,
          unsafelyBaseOnPreviousRepresentation,
          inbandEventStreams,
          isLastPeriod } = context;

  const isEMSGWhitelisted = (inbandEvent: IEMSG): boolean => {
    if (inbandEventStreams === undefined) {
      return false;
    }
    return inbandEventStreams
      .some(({ schemeIdUri }) => schemeIdUri === inbandEvent.schemeIdUri);
  };
  const reprIndexCtxt: ITimelineIndexContextArgument |
                       ITemplateIndexContextArgument |
                       IListIndexContextArgument |
                       IBaseIndexContextArgument =
    {
      availabilityTimeComplete: undefined,
      availabilityTimeOffset,
      unsafelyBaseOnPreviousRepresentation,
      isEMSGWhitelisted,
      isLastPeriod,
      manifestBoundsCalculator,
      isDynamic,
      periodEnd,
      periodStart,
      receivedTime,
      representationBitrate: representation.attributes.bitrate,
      representationId: representation.attributes.id,
    };
  let representationIndex : IRepresentationIndex;
  if (representation.children.segmentBase !== undefined) {
    const { segmentBase } = representation.children;
    representationIndex = new BaseRepresentationIndex(segmentBase, reprIndexCtxt);
  } else if (representation.children.segmentList !== undefined) {
    const { segmentList } = representation.children;
    representationIndex = new ListRepresentationIndex(segmentList, reprIndexCtxt);
  } else if (representation.children.segmentTemplate !== undefined ||
             context.parentSegmentTemplates.length > 0)
  {
    const segmentTemplates = context.parentSegmentTemplates.slice();
    const childSegmentTemplate = representation.children.segmentTemplate;
    if (childSegmentTemplate !== undefined) {
      segmentTemplates.push(childSegmentTemplate);
    }
    const segmentTemplate =
      objectAssign({},
                   ...segmentTemplates as [
                     ISegmentTemplateIntermediateRepresentation
                   ] /* Ugly TS Hack */);
    if (
      segmentTemplate.availabilityTimeOffset !== undefined ||
      context.availabilityTimeOffset !== undefined
    ) {
      reprIndexCtxt.availabilityTimeOffset =
        (segmentTemplate.availabilityTimeOffset ?? 0) +
        (context.availabilityTimeOffset ?? 0);
    }

    representationIndex = TimelineRepresentationIndex
      .isTimelineIndexArgument(segmentTemplate) ?
        new TimelineRepresentationIndex(segmentTemplate, reprIndexCtxt) :
        new TemplateRepresentationIndex(segmentTemplate, reprIndexCtxt);
  } else {
    const adaptationChildren = context.adaptation.children;
    if (adaptationChildren.segmentBase !== undefined) {
      const { segmentBase } = adaptationChildren;
      representationIndex = new BaseRepresentationIndex(segmentBase, reprIndexCtxt);
    } else if (adaptationChildren.segmentList !== undefined) {
      const { segmentList } = adaptationChildren;
      representationIndex = new ListRepresentationIndex(segmentList, reprIndexCtxt);
    } else {
      representationIndex = new TemplateRepresentationIndex({
        duration: Number.MAX_VALUE,
        timescale: 1,
        startNumber: 0,
        media: "",
      }, reprIndexCtxt);
    }
  }
  return representationIndex;
}

/** Supplementary context needed to parse a RepresentationIndex. */
export interface IRepresentationIndexContext {
  /** Parsed AdaptationSet which contains the Representation. */
  adaptation : IAdaptationSetIntermediateRepresentation;
  /**
   * If `false`, declared segments in the MPD might still be not completely generated.
   * If `true`, they are completely generated.
   *
   * If `undefined`, the corresponding property was not set in the MPD and it is
   * thus assumed that they are all generated.
   * It might however be semantically different than `true` in the RxPlayer as it
   * means that the packager didn't include that information in the MPD.
   */
  availabilityTimeComplete : boolean | undefined;
  /**
   * availability time offset of the concerned Adaptation.
   *
   * If `undefined`, the corresponding property was not set in the MPD and it is
   * thus assumed to be equal to `0`.
   * It might however be semantically different than `0` in the RxPlayer as it
   * means that the packager didn't include that information in the MPD.
   */
  availabilityTimeOffset : number | undefined;
  /** Eventual URLs from which every relative URL will be based on. */
  baseURLs : IResolvedBaseUrl[];
  /** End time of the current Period, in seconds. */
  end? : number | undefined;
  /** List of inband event streams that are present on the representation */
  inbandEventStreams: IScheme[] | undefined;
  /**
   * Set to `true` if the linked Period is the chronologically last one in the
   * Manifest.
   */
  isLastPeriod : boolean;
  /** Allows to obtain the first/last available position of a dynamic content. */
  manifestBoundsCalculator : ManifestBoundsCalculator;
  /** Whether the Manifest can evolve with time. */
  isDynamic : boolean;
  /**
   * Parent parsed SegmentTemplate elements.
   * Sorted by provenance from higher level (e.g. Period) to lower-lever (e.g.
   * AdaptationSet).
   */
  parentSegmentTemplates : ISegmentTemplateIntermediateRepresentation[];
  /**
   * Time (in terms of `performance.now`) at which the XML file containing this
   * Representation was received.
   */
  receivedTime? : number | undefined;
  /** Start time of the current period, in seconds. */
  start : number;
  /**
   * The parser should take this Representation - which is the same as this one
   * parsed at an earlier time - as a base to speed-up the parsing process.
   * /!\ If unexpected differences exist between both, there is a risk of
   * de-synchronization with what is actually on the server.
   */
  unsafelyBaseOnPreviousRepresentation : Representation | null;
}
