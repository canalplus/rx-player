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

import log from "../../../../log.ts";
import { SUPPORTED_ADAPTATIONS_TYPE } from "../../../../manifest/index.ts";
import arrayFind from "../../../../utils/array_find.ts";
import arrayIncludes from "../../../../utils/array_includes.ts";
import isNonEmptyString from "../../../../utils/is_non_empty_string.ts";
import isNullOrUndefined from "../../../../utils/is_null_or_undefined.ts";
import type {
  IAdaptationSetIntermediateRepresentation,
  IRepresentationIntermediateRepresentation,
  ISchemeIntermediateRepresentation,
} from "../node_parser_types.ts";

/** Different "type" a parsed Adaptation can be. */
type IAdaptationType = "audio" | "video" | "text";

/** Different `role`s a text Adaptation can be. */
const SUPPORTED_TEXT_TYPES = ["subtitle", "caption"];

/**
 * From a thumbnail AdaptationSet, returns core information such as the number
 * of tiles vertically and horizontally per image.
 *
 * Returns `null` if the information could not be parsed.
 * @param {Object} adaptation
 * @returns {Object|null}
 */
export function getThumbnailAdaptationSetInfo(
  adaptation: IAdaptationSetIntermediateRepresentation,
  representation?: IRepresentationIntermediateRepresentation | undefined,
): {
  horizontalTiles: number;
  verticalTiles: number;
} | null {
  const thumbnailProp =
    arrayFind(
      adaptation.children.EssentialProperty ?? [],
      (p) =>
        p.attributes.schemeIdUri === "http://dashif.org/guidelines/thumbnail_tile" ||
        p.attributes.schemeIdUri === "http://dashif.org/thumbnail_tile",
    ) ??
    arrayFind(
      (representation ?? adaptation.children.Representation[0])?.children
        .EssentialProperty ?? [],
      (p) =>
        p.attributes.schemeIdUri === "http://dashif.org/guidelines/thumbnail_tile" ||
        p.attributes.schemeIdUri === "http://dashif.org/thumbnail_tile",
    );
  if (thumbnailProp === undefined) {
    return null;
  }
  const tilesRegex = /(\d+)x(\d+)/;
  if (
    thumbnailProp === undefined ||
    thumbnailProp.attributes.value === undefined ||
    !tilesRegex.test(thumbnailProp.attributes.value)
  ) {
    log.warn("dash", "Invalid thumbnails Representation, no tile-related information");
    return null;
  }
  const match = thumbnailProp.attributes.value.match(tilesRegex) as RegExpMatchArray;
  const horizontalTiles = parseInt(match[1], 10);
  const verticalTiles = parseInt(match[2], 10);
  return {
    horizontalTiles,
    verticalTiles,
  };
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
 * @param {Object} adaptation
 * @param {Array.<Object>} representations
 * @returns {string} - "audio"|"video"|"text"|"metadata"|"unknown"
 */
export default function inferAdaptationType(
  adaptation: IAdaptationSetIntermediateRepresentation,
  representations: IRepresentationIntermediateRepresentation[],
): IAdaptationType | "thumbnails" | undefined {
  if (adaptation.attributes.contentType === "image") {
    if (getThumbnailAdaptationSetInfo(adaptation) !== null) {
      return "thumbnails";
    }
    return undefined;
  }
  const adaptationMimeType = isNonEmptyString(adaptation.attributes.mimeType)
    ? adaptation.attributes.mimeType
    : null;
  const adaptationCodecs = isNonEmptyString(adaptation.attributes.codecs)
    ? adaptation.attributes.codecs
    : null;
  const adaptationRoles = !isNullOrUndefined(adaptation.children.Role)
    ? adaptation.children.Role
    : null;
  function fromMimeType(
    mimeType: string,
    roles: ISchemeIntermediateRepresentation[],
  ): IAdaptationType | undefined {
    const topLevel = mimeType.split("/")[0];
    if (
      arrayIncludes<IAdaptationType>(
        SUPPORTED_ADAPTATIONS_TYPE,
        topLevel as IAdaptationType,
      )
    ) {
      return topLevel as IAdaptationType;
    }
    if (mimeType === "application/ttml+xml") {
      return "text";
    }
    // manage DASH-IF mp4-embedded subtitles and metadata
    if (mimeType === "application/mp4") {
      if (roles.length > 0) {
        if (
          arrayFind(
            roles,
            (role) =>
              role.attributes.schemeIdUri === "urn:mpeg:dash:role:2011" &&
              arrayIncludes(SUPPORTED_TEXT_TYPES, role.attributes.value),
          ) !== undefined
        ) {
          return "text";
        }
      }
      return undefined;
    }
  }
  function fromCodecs(codecs: string): IAdaptationType | undefined {
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
    const typeFromMimeType = fromMimeType(adaptationMimeType, adaptationRoles ?? []);
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
      const typeFromMimeType = fromMimeType(mimeType, adaptationRoles ?? []);
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
