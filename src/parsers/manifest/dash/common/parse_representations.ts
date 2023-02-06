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
import { Adaptation } from "../../../../manifest";
import { IHDRInformation } from "../../../../public_types";
import arrayFind from "../../../../utils/array_find";
import objectAssign from "../../../../utils/object_assign";
import {
  IContentProtections,
  IParsedRepresentation,
} from "../../types";
import {
  IAdaptationSetIntermediateRepresentation,
  IRepresentationIntermediateRepresentation,
  IScheme,
  IContentProtectionIntermediateRepresentation,
} from "../node_parser_types";
import { getWEBMHDRInformation } from "./get_hdr_information";
import parseRepresentationIndex, {
  IRepresentationIndexContext,
} from "./parse_representation_index";
import resolveBaseURLs from "./resolve_base_urls";

/**
 * Combine inband event streams from representation and
 * adaptation data.
 * @param {Object} representation
 * @param {Object} adaptation
 * @returns {undefined | Array.<Object>}
 */
function combineInbandEventStreams(
  representation: IRepresentationIntermediateRepresentation,
  adaptation: IAdaptationSetIntermediateRepresentation
): IScheme[] | undefined {
  const newSchemeId = [];
  if (representation.children.inbandEventStreams !== undefined) {
    newSchemeId.push(...representation.children.inbandEventStreams);
  }
  if (adaptation.children.inbandEventStreams !== undefined) {
    newSchemeId.push(...adaptation.children.inbandEventStreams);
  }
  if (newSchemeId.length === 0) {
    return undefined;
  }
  return newSchemeId;
}

/**
 * Extract HDR information from manifest and codecs.
 * @param {Object}
 * @returns {Object | undefined}
 */
function getHDRInformation(
  { adaptationProfiles,
    essentialProperties,
    supplementalProperties,
    manifestProfiles,
    codecs,
  }: { adaptationProfiles?: string | undefined;
       essentialProperties? : IScheme[] | undefined;
       supplementalProperties? : IScheme[] | undefined;
       manifestProfiles?: string | undefined;
       codecs?: string | undefined; }
): undefined | IHDRInformation {
  const profiles = (adaptationProfiles ?? "") + (manifestProfiles ?? "");
  if (
    profiles.indexOf(
      "http://dashif.org/guidelines/dash-if-uhd#hevc-hdr-pq10") !== -1
  ) {
    if (codecs === "hvc1.2.4.L153.B0" ||
        codecs === "hev1.2.4.L153.B0") {
      return { colorDepth: 10,
               eotf: "pq",
               colorSpace: "rec2020" };
    }
  }
  const transferCharacteristicScheme = arrayFind(
    [...(essentialProperties ?? []), ...(supplementalProperties ?? [])],
    (p) => p.schemeIdUri === "urn:mpeg:mpegB:cicp:TransferCharacteristics");
  if (transferCharacteristicScheme !== undefined) {
    switch (transferCharacteristicScheme.value) {
      case "15":
        return undefined; // SDR
      case "16":
        return { eotf: "pq" };
      case "18":
        return { eotf: "hlg" };
    }
  }
  if (codecs !== undefined && /^vp(08|09|10)/.exec(codecs)) {
    return getWEBMHDRInformation(codecs);
  }
}

/**
 * Process intermediate representations to create final parsed representations.
 * @param {Array.<Object>} representationsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parseRepresentations(
  representationsIR : IRepresentationIntermediateRepresentation[],
  adaptation : IAdaptationSetIntermediateRepresentation,
  context : IRepresentationContext
): IParsedRepresentation[] {
  const parsedRepresentations : IParsedRepresentation[] = [];
  for (const representation of representationsIR) {
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
    const unsafelyBaseOnPreviousRepresentation = context
      .unsafelyBaseOnPreviousAdaptation?.getRepresentation(representationID) ??
      null;

    const inbandEventStreams =
      combineInbandEventStreams(representation, adaptation);

    const availabilityTimeComplete =
      representation.attributes.availabilityTimeComplete ??
      context.availabilityTimeComplete;
    const availabilityTimeOffset =
      (representation.attributes.availabilityTimeOffset ?? 0) +
      context.availabilityTimeOffset;
    const reprIndexCtxt = objectAssign({},
                                       context,
                                       { availabilityTimeOffset,
                                         availabilityTimeComplete,
                                         unsafelyBaseOnPreviousRepresentation,
                                         adaptation,
                                         inbandEventStreams });
    const representationIndex = parseRepresentationIndex(representation,
                                                         reprIndexCtxt);

    // Find bitrate
    let representationBitrate : number;
    if (representation.attributes.bitrate == null) {
      log.warn("DASH: No usable bitrate found in the Representation.");
      representationBitrate = 0;
    } else {
      representationBitrate = representation.attributes.bitrate;
    }

    const representationBaseURLs = resolveBaseURLs(context.baseURLs,
                                                   representation.children.baseURLs);

    const cdnMetadata = representationBaseURLs.length === 0 ?
      // No BaseURL seems to be associated to this Representation, nor to the MPD,
      // but underlying segments might have one. To indicate that segments should
      // still be available through a CDN without giving any root CDN URL here,
      // we just communicate about an empty `baseUrl`, as documented.
      [ { baseUrl: "", id: undefined } ] :
      representationBaseURLs.map(x => ({ baseUrl: x.url, id: x.serviceLocation }));

    // Construct Representation Base
    const parsedRepresentation : IParsedRepresentation =
      { bitrate: representationBitrate,
        cdnMetadata,
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

    const contentProtectionsIr : IContentProtectionIntermediateRepresentation[] =
      adaptation.children.contentProtections !== undefined ?
        adaptation.children.contentProtections :
        [];
    if (representation.children.contentProtections !== undefined) {
      contentProtectionsIr.push(...representation.children.contentProtections);
    }

    if (contentProtectionsIr.length > 0) {
      const contentProtections = contentProtectionsIr
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
            const kidObj = { keyId: cp.attributes.keyId, systemId };
            if (acc.keyIds === undefined) {
              acc.keyIds = [kidObj];
            } else {
              acc.keyIds.push(kidObj);
            }
          }
          if (systemId !== undefined) {
            const { cencPssh } = cp.children;
            const values : Array<{ systemId: string;
                                   data: Uint8Array; }> = [];
            for (const data of cencPssh) {
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
        }, { keyIds: undefined, initData: [] });
      if (Object.keys(contentProtections.initData).length > 0 ||
          (contentProtections.keyIds !== undefined &&
            contentProtections.keyIds.length > 0))
      {
        parsedRepresentation.contentProtections = contentProtections;
      }
    }

    parsedRepresentation.hdrInfo =
      getHDRInformation({ adaptationProfiles: adaptation.attributes.profiles,
                          supplementalProperties: adaptation.children
                            .supplementalProperties,
                          essentialProperties: adaptation.children.essentialProperties,
                          manifestProfiles: context.manifestProfiles,
                          codecs });

    parsedRepresentations.push(parsedRepresentation);
  }
  return parsedRepresentations;
}

/** Supplementary context needed to parse a Representation. */
export interface IRepresentationContext extends IInheritedRepresentationIndexContext {
  /** Manifest DASH profiles used for signalling some features */
  manifestProfiles?: string | undefined;
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
 * Supplementary context needed to parse a Representation common with
 * `IRepresentationIndexContext`.
 */
type IInheritedRepresentationIndexContext = Omit<IRepresentationIndexContext,
                                                 "adaptation" |
                                                 "unsafelyBaseOnPreviousRepresentation" |
                                                 "inbandEventStreams">;
