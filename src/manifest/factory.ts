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

import { isCodecSupported } from "../compat";
import { MediaError } from "../errors";
import { IParsedManifest } from "../net/types";
import log from "../utils/log";
import { IAdaptationArguments } from "./adaptation";
import Manifest, {
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "./index";
import { IRepresentationArguments } from "./representation";

const SUPPORTED_ADAPTATIONS_TYPE = ["audio", "video", "text", "image"];

/**
 * Run multiple checks before creating the Manifest:
 *   - filter out unsupported adaptation types
 *   - filter out adaptations without representations
 *   - filter out representations with an unsupported codec
 *   - check that every periods have at least one adaptation left
 *   - check that every adaptations have at least one representation left
 *
 * Then create a manifest and:
 *   - add supplementary text tracks
 *   - add supplementary image tracks
 *
 * @param {Object} manifest - the parsed manifest
 * @param {Array.<Object>|Object} externalTextTracks - Will be added to the
 * manifest as an adaptation.
 * @param {Array.<Object>|Object} externalImageTracks - Will be added to the
 * manifest as an adaptation.
 * @returns {Object}
 */
export default function createManifest(
  manifestObject : IParsedManifest,
  externalTextTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[],
  externalImageTracks : ISupplementaryImageTrack|ISupplementaryImageTrack[]
) : Manifest {
  manifestObject.periods = (manifestObject.periods as any[]).map((period) => {
    period.adaptations = checkAdaptations(period.adaptations);
    return period;
  });

  const manifest = new Manifest(manifestObject as any);
  manifest.addSupplementaryTextAdaptations(externalTextTracks);
  manifest.addSupplementaryImageAdaptations(externalImageTracks);
  return manifest;
}

/**
 * Performs multiple checks on adaptations from a single period (things not
 * check-able by TypeScript itself like length of arrays).
 * Also filter unsupported codecs and unsupported adaptations types.
 * Throws if something is wrong.
 *
 * @param {Array.<Object>} initialAdaptations
 * @returns {Array.<Object>}
 */
function checkAdaptations(
  initialAdaptations : IAdaptationArguments[]
) : IAdaptationArguments[] {
  const adaptations = initialAdaptations

    // 1. filter out adaptations from unsupported types
    .filter((adaptation) => {
      if (SUPPORTED_ADAPTATIONS_TYPE.indexOf(adaptation.type) < 0) {
        log.info("not supported adaptation type", adaptation.type);
        return false;
      } else {
        return true;
      }
    })

    .map((adaptation) => {
      // 2. Filter from codecs and throw if none supported
      // TODO be more resilient
      adaptation.representations = filterSupportedRepresentations(
        adaptation.type,
        adaptation.representations
      );

      // XXX TODO
      // if (adaptation.representations.length === 0) {
      //   throw new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", null, true);
      // }
      return adaptation;
    })

    // 3. filter those without representations
    .filter(({ representations }) => representations.length)  as IAdaptationArguments[];

  // 4. throw if no adaptation
  if (adaptations.length === 0) {
    throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
  }

  return adaptations;
}

/**
 * @param {string} adaptationType
 * @param {Array.<Object>} representations
 * @returns {Array.<Object>}
 */
function filterSupportedRepresentations(
  adaptationType : string,
  representations : IRepresentationArguments[]
) : IRepresentationArguments[] {
  if (adaptationType === "audio" || adaptationType === "video") {
    return representations
      .filter((representation) => {
        return isCodecSupported(getCodec(representation));
      });
  }

  // TODO for the other types
  return representations;

  /**
   * Construct the codec string from given codecs and mimetype.
   * @param {Object} representation
   * @returns {string}
   */
  function getCodec(
    representation : IRepresentationArguments
  ) : string {
    const { codecs = "", mimeType = "" } = representation;
    return `${mimeType};codecs="${codecs}"`;
  }
}
