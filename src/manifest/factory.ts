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
import { ICustomError } from "../errors";
import { CustomRepresentationFilter } from "../net/types";
import {
  IParsedManifest,
} from "../parsers/manifest/types";
import Manifest, {
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "./index";

/**
 * Run multiple checks during creating the Manifest:
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
  const manifest = new Manifest(
    manifestObject,
    warning$,
    customRepresentationFilter
  );
  manifest.addSupplementaryTextAdaptations(externalTextTracks);
  manifest.addSupplementaryImageAdaptations(externalImageTracks);
  return manifest;
}
