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

import { Subject } from "rxjs";
import { isCodecSupported } from "../compat";
import { ICustomError, MediaError } from "../errors";
import log from "../log";
import { CustomRepresentationFilter } from "../net/types";
import {
  IParsedAdaptation,
  IParsedManifest,
  IParsedRepresentation,
} from "../parsers/manifest/types";
import arrayIncludes from "../utils/array-includes";
import { SUPPORTED_ADAPTATIONS_TYPE } from "./adaptation";
import Manifest, {
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "./index";
import { IRepresentationArguments } from "./representation";

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
 * @param {Subject} warning$
 * @returns {Object}
 */
export default function createManifest(
  manifestObject : IParsedManifest,
  externalTextTracks : ISupplementaryTextTrack|ISupplementaryTextTrack[],
  externalImageTracks : ISupplementaryImageTrack|ISupplementaryImageTrack[],
  warning$ : Subject<Error|ICustomError>,
  customRepresentationFilter? : CustomRepresentationFilter
) : Manifest {
  manifestObject.periods = (manifestObject.periods).map((period) => {
    Object.keys(period.adaptations).forEach((type) => {
      const adaptationsForType = period.adaptations[type];
      if (!adaptationsForType) {
        delete period.adaptations[type];
      } else {
        const checkedAdaptations = checkAdaptations(adaptationsForType, warning$);
        if (!checkedAdaptations.length) {
          delete period.adaptations[type];
        } else {
          period.adaptations[type] = checkedAdaptations;
        }
      }
    });

    if (
      !period.adaptations.video &&
      !period.adaptations.audio
    ) {
      throw new MediaError("MANIFEST_PARSE_ERROR", null, true);
    }

    return period;
  });

  const manifest = new Manifest(manifestObject, customRepresentationFilter);
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
 * @param {Subject} warning$
 * @returns {Array.<Object>}
 */
function checkAdaptations(
  initialAdaptations : IParsedAdaptation[],
  warning$ : Subject<Error|ICustomError>
) : IParsedAdaptation[] {
  const adaptations = initialAdaptations

    // 1. filter out adaptations from unsupported types
    .filter((adaptation) => {
      if (!arrayIncludes(SUPPORTED_ADAPTATIONS_TYPE, adaptation.type)) {
        log.info("not supported adaptation type", adaptation.type);
        warning$.next(
          new MediaError("MANIFEST_UNSUPPORTED_ADAPTATION_TYPE", null, false)
        );
        return false;
      } else {
        return true;
      }
    })

    .map((adaptation) => {
      if (adaptation.representations.length) {
        // 2. Filter from codecs and throw if none supported
        adaptation.representations = filterSupportedRepresentations(
          adaptation.type,
          adaptation.representations
        );

        if (adaptation.representations.length === 0) {
          log.warn("Incompatible codecs for adaptation", adaptation);
          const error =
            new MediaError("MANIFEST_INCOMPATIBLE_CODECS_ERROR", null, false);
          warning$.next(error);
        }
      }
      return adaptation;
    })

    // 3. filter those without representations
    .filter(({ representations }) => representations.length);

  return adaptations;
}

/**
 * @param {string} adaptationType
 * @param {Array.<Object>} representations
 * @returns {Array.<Object>}
 */
function filterSupportedRepresentations(
  adaptationType : string,
  representations : IParsedRepresentation[]
) : IParsedRepresentation[] {
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
