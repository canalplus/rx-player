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

import { SUPPORTED_ADAPTATIONS_TYPE } from "../../../../manifest";
import arrayFind from "../../../../utils/array_find";
import arrayIncludes from "../../../../utils/array_includes";
import { IRepresentationIntermediateRepresentation } from "../node_parser_types";

/** Different "type" a parsed Adaptation can be. */
type IAdaptationType = "audio" |
                       "video" |
                       "text";

/** Different `role`s a text Adaptation can be. */
const SUPPORTED_TEXT_TYPES = ["subtitle", "caption"];

/** Structure of a parsed "scheme-like" element in the MPD. */
interface IScheme {
  schemeIdUri? : string;
  value? : string;
}

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
 * @param {Array.<Object>} representations
 * @param {string|null} adaptationMimeType
 * @param {string|null} adaptationCodecs
 * @param {Array.<Object>|null} adaptationRoles
 * @returns {string} - "audio"|"video"|"text"|"metadata"|"unknown"
 */
export default function inferAdaptationType(
  representations: IRepresentationIntermediateRepresentation[],
  adaptationMimeType : string | null,
  adaptationCodecs : string | null,
  adaptationRoles : IScheme[] | null
) : IAdaptationType | undefined {
  function fromMimeType(
    mimeType : string,
    roles : IScheme[]|null
  ) : IAdaptationType | undefined {
    const topLevel = mimeType.split("/")[0];
    if (arrayIncludes<IAdaptationType>(SUPPORTED_ADAPTATIONS_TYPE,
                                       topLevel as IAdaptationType)) {
      return topLevel as IAdaptationType;
    }
    if (mimeType === "application/ttml+xml") {
      return "text";
    }
    // manage DASH-IF mp4-embedded subtitles and metadata
    if (mimeType === "application/mp4") {
      if (roles != null) {
        if (
          arrayFind(roles, (role) =>
            role.schemeIdUri === "urn:mpeg:dash:role:2011" &&
            arrayIncludes(SUPPORTED_TEXT_TYPES, role.value)
          ) != null
        ) {
          return "text";
        }
      }
      return undefined;
    }
  }
  function fromCodecs(codecs : string) : IAdaptationType | undefined {
    switch (codecs.substring(0, 3)) {
      case "avc":
      case "hev":
      case "hvc":
      case "vp8":
      case "vp9":
      case "av1":
        return "video";
      case "vtt":
        return "text";
    }
    switch (codecs.substring(0, 4)) {
      case "mp4a":
        return "audio";
      case "wvtt":
      case "stpp":
        return "text";
    }
  }
  if (adaptationMimeType !== null) {
    const typeFromMimeType = fromMimeType(adaptationMimeType, adaptationRoles);
    if (typeFromMimeType !== undefined) {
      return typeFromMimeType;
    }
  }
  if (adaptationCodecs !== null) {
    const typeFromCodecs = fromCodecs(adaptationCodecs);
    if (typeFromCodecs !== undefined) {
      return typeFromCodecs;
    }
  }

  for (let i = 0; i < representations.length; i++) {
    const representation = representations[i];
    const { mimeType, codecs } = representation.attributes;
    if (mimeType !== undefined) {
      const typeFromMimeType = fromMimeType(mimeType, adaptationRoles);
      if (typeFromMimeType !== undefined) {
        return typeFromMimeType;
      }
    }
    if (codecs !== undefined) {
      const typeFromCodecs = fromCodecs(codecs);
      if (typeFromCodecs !== undefined) {
        return typeFromCodecs;
      }
    }
  }
  return undefined;
}
