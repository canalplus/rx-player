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
import { Adaptation } from "../../../manifest";
import arrayFind from "../../../utils/array_find";
import objectAssign from "../../../utils/object_assign";
import {
  IContentProtections,
  IParsedRepresentation,
} from "../types";
import ManifestBoundsCalculator from "./manifest_bounds_calculator";
import {
  IAdaptationSetIntermediateRepresentation,
} from "./node_parsers/AdaptationSet";
import {
  IRepresentationIntermediateRepresentation,
} from "./node_parsers/Representation";
import { IParsedSegmentTemplate } from "./node_parsers/SegmentTemplate";
import parseRepresentationIndex from "./parse_representation_index";

/** Supplementary context needed to parse a Representation. */
export interface IAdaptationInfos {
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
   * The parser should take this Adaptation - which is from a previously parsed
   * Manifest for the same dynamic content - as a base to speed-up the parsing
   * process.
   * /!\ If unexpected differences exist between both, there is a risk of
   * de-synchronization with what is actually on the server,
   * Use with moderation.
   */
  unsafelyBaseOnPreviousAdaptation : Adaptation | null;
}

/**
 * Process intermediate representations to create final parsed representations.
 * @param {Array.<Object>} representationsIR
 * @param {Object} adaptationInfos
 * @returns {Array.<Object>}
 */
export default function parseRepresentations(
  representationsIR : IRepresentationIntermediateRepresentation[],
  adaptation : IAdaptationSetIntermediateRepresentation,
  adaptationInfos : IAdaptationInfos
): IParsedRepresentation[] {
  const parsedRepresentations : IParsedRepresentation[] = [];
  for (let reprIdx = 0; reprIdx < representationsIR.length; reprIdx++) {
    const representation = representationsIR[reprIdx];

    // Compute Representation ID
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

    // Retrieve previous version of the Representation, if one.
    const unsafelyBaseOnPreviousRepresentation = adaptationInfos
      .unsafelyBaseOnPreviousAdaptation?.getRepresentation(representationID) ??
      null;

    const representationInfos = objectAssign({}, adaptationInfos,
                                             { unsafelyBaseOnPreviousRepresentation,
                                               adaptation });
    const representationIndex = parseRepresentationIndex(representation,
                                                         representationInfos);

    // Find bitrate
    let representationBitrate : number;
    if (representation.attributes.bitrate == null) {
      log.warn("DASH: No usable bitrate found in the Representation.");
      representationBitrate = 0;
    } else {
      representationBitrate = representation.attributes.bitrate;
    }

    // Construct Representation Base
    const parsedRepresentation : IParsedRepresentation =
      { bitrate: representationBitrate,
        index: representationIndex,
        id: representationID };

    // Add optional attributes
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
            const values : Array<{ systemId: string;
                                   data: Uint8Array; }> = [];
            for (let i = 0; i < cencPssh.length; i++) {
              const data = cencPssh[i];
              values.push({ systemId, data });
            }
            if (values.length > 0) {
              const cencInitData = arrayFind(acc.initData, (i) => i.type === "cenc");
              if (cencInitData === undefined) {
                acc.initData.push({ type: "cenc", values });
              } else {
                cencInitData.values.push(...values);
              }
            }
          }
          return acc;
        }, { keyIds: [], initData: [] });
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
