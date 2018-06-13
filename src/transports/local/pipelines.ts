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

import { of as observableOf } from "rxjs";
import Manifest from "../../manifest";
import parseLocalManifest, {
  ILocalManifest,
} from "../../parsers/manifest/local";
import { imageParser } from "../dash/image_pipelines";
import segmentParser from "../dash/segment_parser";
import textTrackParser from "../dash/text_parser";
import {
  IManifestLoaderArguments,
  IManifestLoaderObservable,
  IManifestParserArguments,
  IManifestParserObservable,
  ISegmentLoaderArguments,
  ISegmentLoaderObservable,
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import callCustomManifestLoader from "../utils/call_custom_manifest_loader";
import loadSegment, {
  loadInitSegment,
} from "./load_segment";

/**
 * Generic segment loader for the local Manifest.
 * @param {Object} arg
 * @returns {Observable}
 */
function segmentLoader(
  { segment } : ISegmentLoaderArguments
) : ISegmentLoaderObservable< ArrayBuffer | Uint8Array | null > {
  const privateInfos = segment.privateInfos;
  if (segment.isInit) {
    if (!privateInfos || privateInfos.localManifestInitSegment == null) {
      throw new Error("Segment is not a local Manifest segment");
    }
    return loadInitSegment(privateInfos.localManifestInitSegment.load);
  }
  if (!privateInfos || privateInfos.localManifestSegment == null) {
    throw new Error("Segment is not an local Manifest segment");
  }
  return loadSegment(privateInfos.localManifestSegment.segment,
                     privateInfos.localManifestSegment.load);
}

/**
 * Returns pipelines used for local Manifest streaming.
 * @param {Object} options
 * @returns {Object}
 */
export default function getLocalManifestPipelines(
  options : ITransportOptions
) : ITransportPipelines {

  const customManifestLoader = options.manifestLoader;
  const manifestPipeline = {
    loader(args : IManifestLoaderArguments) : IManifestLoaderObservable {
      if (customManifestLoader == null) {
        throw new Error("A local Manifest is not loadable through regular HTTP calls." +
                        " You have to set a `manifestLoader` when calling " +
                        "`loadVideo`");
      }
      return callCustomManifestLoader(
        customManifestLoader,
        () : never => {
          throw new Error("Cannot fallback from the `manifestLoader` of a " +
                          "`local` transport");
        })(args);
    },

    parser(
      { response } : IManifestParserArguments
    ) : IManifestParserObservable {
      const manifestData = response.responseData;
      if (typeof manifestData !== "object") {
        throw new Error("Wrong format for the manifest data");
      }
      const parsed = parseLocalManifest(response.responseData as ILocalManifest);
      const manifest = new Manifest(parsed, options);
      return observableOf({ manifest, url: undefined });
    },
  };

  const segmentPipeline = {
    loader: segmentLoader,
    parser: segmentParser,
  };

  const textTrackPipeline = {
    loader: segmentLoader,
    parser: textTrackParser,
  };

  const imageTrackPipeline = {
    loader: segmentLoader,
    parser: imageParser,
  };

  return {
    manifest: manifestPipeline,
    audio: segmentPipeline,
    video: segmentPipeline,
    text: textTrackPipeline,
    image: imageTrackPipeline,
  };
}
