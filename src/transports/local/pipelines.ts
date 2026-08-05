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

/**
 * /!\ This file is feature-switchable.
 * It always should be imported through the `features` object.
 */

import Manifest from "../../manifest/classes/index.ts";
import type { ILocalManifest } from "../../parsers/manifest/local/index.ts";
import parseLocalManifest from "../../parsers/manifest/local/index.ts";
import type { ILoadedManifestFormat } from "../../public_types.ts";
import isNullOrUndefined from "../../utils/is_null_or_undefined.ts";
import type { CancellationSignal } from "../../utils/task_canceller.ts";
import type {
  IManifestLoaderOptions,
  IManifestParserResult,
  IRequestedData,
  ITransportOptions,
  ITransportPipelines,
} from "../types.ts";
import callCustomManifestLoader from "../utils/call_custom_manifest_loader.ts";
import segmentLoader from "./segment_loader.ts";
import segmentParser from "./segment_parser.ts";
import textTrackParser from "./text_parser.ts";

/**
 * Returns pipelines used for local Manifest streaming.
 * @param {Object} transportOptions
 * @returns {Object}
 */
export default function getLocalManifestPipelines(
  transportOptions: ITransportOptions,
): ITransportPipelines {
  const customManifestLoader = transportOptions.manifestLoader;
  const manifestPipeline = {
    loadManifest(
      url: string | undefined,
      loaderOptions: IManifestLoaderOptions,
      cancelSignal: CancellationSignal,
    ): Promise<IRequestedData<ILoadedManifestFormat>> {
      if (isNullOrUndefined(customManifestLoader)) {
        throw new Error(
          "A local Manifest is not loadable through regular HTTP(S) " +
            " calls. You have to set a `manifestLoader` when calling " +
            "`loadVideo`",
        );
      }
      return callCustomManifestLoader(customManifestLoader, (): never => {
        throw new Error(
          "Cannot fallback from the `manifestLoader` of a " + "`local` transport",
        );
      })(url, loaderOptions, cancelSignal);
    },

    parseManifest(manifestData: IRequestedData<unknown>): IManifestParserResult {
      const loadedManifest = manifestData.responseData;
      if (typeof manifestData !== "object") {
        throw new Error("Wrong format for the manifest data");
      }
      const parsed = parseLocalManifest(loadedManifest as ILocalManifest);
      const manifest = new Manifest(parsed, transportOptions);
      return { manifest, url: undefined };
    },
  };

  const segmentPipeline = {
    loadSegment: segmentLoader,
    parseSegment: segmentParser,
  };
  const textTrackPipeline = {
    loadSegment: segmentLoader,
    parseSegment: textTrackParser,
  };

  return {
    transportName: "local",
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
    thumbnails: {
      loadThumbnail: () =>
        Promise.reject(
          new Error("Thumbnail tracks aren't implemented with the local transport"),
        ),
      parseThumbnail: () => {
        throw new Error("Thumbnail tracks aren't implemented with the local transport");
      },
    },
  };
}
