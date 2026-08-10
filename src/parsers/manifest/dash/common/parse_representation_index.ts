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

import type {
  IRepresentationIndex,
  IRepresentation,
} from "../../../../manifest/index.ts";
import getLastItemFromArray from "../../../../utils/get_last_item_from_array.ts";
import objectAssign from "../../../../utils/object_assign.ts";
import type { IEMSG } from "../../../containers/isobmff/index.ts";
import type {
  IAdaptationSetIntermediateRepresentation,
  IInitializationIntermediateRepresentation,
  IRepresentationIntermediateRepresentation,
  ISegmentTemplateIntermediateRepresentation,
  ISchemeIntermediateRepresentation,
  ISegmentTemplateAttributes,
  ISegmentTemplateChildren,
} from "../node_parser_types.ts";
import type {
  IBaseIndexContextArgument,
  IListIndexContextArgument,
  ITemplateIndexContextArgument,
  ITimelineIndexContextArgument,
} from "./indexes/index.ts";
import {
  BaseRepresentationIndex,
  ListRepresentationIndex,
  TemplateRepresentationIndex,
  TimelineRepresentationIndex,
} from "./indexes/index.ts";
import type { ITimelineIndexIndexArgument } from "./indexes/timeline/timeline_representation_index.ts";
import type ManifestBoundsCalculator from "./manifest_bounds_calculator.ts";
import type { IResolvedBaseUrl } from "./resolve_base_urls.ts";

/**
 * Parse the specific segment indexing information found in a representation
 * into a IRepresentationIndex implementation.
 * @param {Array.<Object>} representation
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parseRepresentationIndex(
  representation: IRepresentationIntermediateRepresentation,
  context: IRepresentationIndexContext,
): IRepresentationIndex {
  const {
    availabilityTimeOffset,
    manifestBoundsCalculator,
    isDynamic,
    end: periodEnd,
    start: periodStart,
    receivedTime,
    unsafelyBaseOnPreviousRepresentation,
    inbandEventStreams,
    isLastPeriod,
  } = context;

  const isEMSGWhitelisted = (inbandEvent: IEMSG): boolean => {
    if (inbandEventStreams === undefined) {
      return false;
    }
    return inbandEventStreams.some(
      ({ attributes }) => attributes.schemeIdUri === inbandEvent.schemeIdUri,
    );
  };
  const reprIndexCtxt:
    | ITimelineIndexContextArgument
    | ITemplateIndexContextArgument
    | IListIndexContextArgument
    | IBaseIndexContextArgument = {
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
    representationBitrate: representation.attributes.bandwidth,
    representationId: representation.attributes.id,
  };
  let representationIndex: IRepresentationIndex;
  const segmentBase = getLastItemFromArray(representation.children.SegmentBase);
  const segmentList = getLastItemFromArray(representation.children.SegmentList);
  const segmentTemplate = getLastItemFromArray(representation.children.SegmentTemplate);
  if (segmentBase !== undefined) {
    representationIndex = new BaseRepresentationIndex(
      {
        ...segmentBase.attributes,
        initialization: parseInitializationElement(segmentBase.children.Initialization),
      },
      reprIndexCtxt,
    );
  } else if (segmentList !== undefined) {
    representationIndex = new ListRepresentationIndex(
      {
        ...segmentList.attributes,
        list: segmentList.children.SegmentURL.map((u) => u.attributes),
        initialization: parseInitializationElement(segmentList.children.Initialization),
      },
      reprIndexCtxt,
    );
  } else if (segmentTemplate !== undefined || context.parentSegmentTemplates.length > 0) {
    const segmentTemplates: ISegmentTemplateIntermediateRepresentation[] =
      context.parentSegmentTemplates.slice();
    if (segmentTemplate !== undefined) {
      segmentTemplates.push(segmentTemplate);
    }
    const combinedTimelines: Pick<
      ISegmentTemplateChildren,
      "timeline" | "timelineParser"
    > = segmentTemplates.reduce(
      (
        acc: Pick<ISegmentTemplateChildren, "timeline" | "timelineParser">,
        s: ISegmentTemplateIntermediateRepresentation,
      ) => {
        if (s.children.timeline !== undefined) {
          acc.timeline = s.children.timeline;
        } else if (s.children.timelineParser !== undefined) {
          acc.timelineParser = s.children.timelineParser;
        }
        return acc;
      },
      {},
    );
    const combinedAttributes: ISegmentTemplateAttributes = objectAssign(
      {},
      ...segmentTemplates.map((s) => s.attributes),
    );
    if (
      combinedAttributes.availabilityTimeOffset !== undefined ||
      context.availabilityTimeOffset !== undefined
    ) {
      reprIndexCtxt.availabilityTimeOffset =
        (combinedAttributes.availabilityTimeOffset ?? 0) +
        (context.availabilityTimeOffset ?? 0);
    }
    if (
      combinedAttributes.availabilityTimeComplete !== undefined ||
      context.availabilityTimeComplete !== undefined
    ) {
      reprIndexCtxt.availabilityTimeComplete =
        combinedAttributes.availabilityTimeComplete ?? context.availabilityTimeComplete;
    }

    let initialization: { media?: string; range?: [number, number] } | undefined;
    for (const currentSegmentTemplate of segmentTemplates) {
      const initializationElement = parseInitializationElement(
        currentSegmentTemplate.children.Initialization,
      );
      if (initializationElement !== undefined) {
        initialization = initializationElement;
      } else if (currentSegmentTemplate.attributes.initialization !== undefined) {
        initialization = {
          media: currentSegmentTemplate.attributes.initialization,
        };
      }
    }
    const resultTemplateIdx: ITimelineIndexIndexArgument = {
      ...combinedAttributes,
      timeline: combinedTimelines.timeline,
      timelineParser: combinedTimelines.timelineParser,
      initialization,
    };

    representationIndex = TimelineRepresentationIndex.isTimelineIndexArgument(
      resultTemplateIdx,
    )
      ? new TimelineRepresentationIndex(resultTemplateIdx, reprIndexCtxt)
      : new TemplateRepresentationIndex(resultTemplateIdx, reprIndexCtxt);
  } else {
    const adaptationChildren = context.adaptation.children;
    const adapSegmentBase = getLastItemFromArray(adaptationChildren.SegmentBase);
    const adapSegmentList = getLastItemFromArray(adaptationChildren.SegmentList);
    if (adapSegmentBase !== undefined) {
      representationIndex = new BaseRepresentationIndex(
        {
          ...adapSegmentBase.attributes,
          initialization: parseInitializationElement(
            adapSegmentBase.children.Initialization,
          ),
        },
        reprIndexCtxt,
      );
    } else if (adapSegmentList !== undefined) {
      representationIndex = new ListRepresentationIndex(
        {
          ...adapSegmentList.attributes,
          list: adapSegmentList.children.SegmentURL.map((u) => u.attributes),
          initialization: parseInitializationElement(
            adapSegmentList.children.Initialization,
          ),
        },
        reprIndexCtxt,
      );
    } else {
      representationIndex = new TemplateRepresentationIndex(
        {
          duration: Number.MAX_VALUE,
          timescale: 1,
          startNumber: 0,
          media: "",
        },
        reprIndexCtxt,
      );
    }
  }
  return representationIndex;
}

function parseInitializationElement(
  initializations: IInitializationIntermediateRepresentation[],
): { media?: string; range?: [number, number] } | undefined {
  const initialization = getLastItemFromArray(initializations);
  if (initialization === undefined) {
    return undefined;
  }

  const result: { media?: string; range?: [number, number] } = {};
  if (initialization.attributes.sourceURL !== undefined) {
    result.media = initialization.attributes.sourceURL;
  }
  if (initialization.attributes.range !== undefined) {
    result.range = initialization.attributes.range;
  }
  return result;
}

/** Supplementary context needed to parse a RepresentationIndex. */
export interface IRepresentationIndexContext {
  /** Parsed AdaptationSet which contains the Representation. */
  adaptation: IAdaptationSetIntermediateRepresentation;
  /**
   * If `false`, declared segments in the MPD might still be not completely generated.
   * If `true`, they are completely generated.
   *
   * If `undefined`, the corresponding property was not set in the MPD and it is
   * thus assumed that they are all generated.
   * It might however be semantically different than `true` in the RxPlayer as it
   * means that the packager didn't include that information in the MPD.
   */
  availabilityTimeComplete: boolean | undefined;
  /**
   * availability time offset of the concerned Adaptation.
   *
   * If `undefined`, the corresponding property was not set in the MPD and it is
   * thus assumed to be equal to `0`.
   * It might however be semantically different than `0` in the RxPlayer as it
   * means that the packager didn't include that information in the MPD.
   */
  availabilityTimeOffset: number | undefined;
  /** Eventual URLs from which every relative URL will be based on. */
  baseURLs: IResolvedBaseUrl[];
  /** End time of the current Period, in seconds. */
  end?: number | undefined;
  /** List of inband event streams that are present on the representation */
  inbandEventStreams: ISchemeIntermediateRepresentation[] | undefined;
  /**
   * Set to `true` if the linked Period is the chronologically last one in the
   * Manifest.
   */
  isLastPeriod: boolean;
  /** Allows to obtain the first/last available position of a dynamic content. */
  manifestBoundsCalculator: ManifestBoundsCalculator;
  /** Whether the Manifest can evolve with time. */
  isDynamic: boolean;
  /**
   * Parent parsed SegmentTemplate elements.
   * Sorted by provenance from higher level (e.g. Period) to lower-lever (e.g.
   * AdaptationSet).
   */
  parentSegmentTemplates: ISegmentTemplateIntermediateRepresentation[];
  /**
   * Time (as the monotonically-raising timestamp used by the RxPlayer) at which
   * the XML file containing this Representation was received.
   */
  receivedTime?: number | undefined;
  /** Start time of the current period, in seconds. */
  start: number;
  /**
   * The parser should take this Representation - which is the same as this one
   * parsed at an earlier time - as a base to speed-up the parsing process.
   * /!\ If unexpected differences exist between both, there is a risk of
   * de-synchronization with what is actually on the server.
   */
  unsafelyBaseOnPreviousRepresentation: IRepresentation | null;
}
