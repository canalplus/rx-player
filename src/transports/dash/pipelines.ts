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

import {
  ITransportOptions,
  ITransportPipelines,
} from "../types";
import generateManifestLoader from "../utils/text_manifest_loader";
import {
  imageLoader,
  imageParser,
} from "./image_pipelines";
import generateManifestParser from "./manifest_parser";
import generateSegmentLoader from "./segment_loader";
import generateAudioVideoSegmentParser from "./segment_parser";
import generateTextTrackLoader from "./text_loader";
import generateTextTrackParser from "./text_parser";

/**
 * Returns pipelines used for DASH streaming.
 * @param {Object} options
 * implementation. Used for each generated http request.
 * @returns {Object}
 */
export default function(options : ITransportOptions) : ITransportPipelines {
  const manifestLoader = generateManifestLoader({
    customManifestLoader: options.manifestLoader,
  });
  const manifestParser = generateManifestParser(options);
  const segmentLoader = generateSegmentLoader(options);
  const audioVideoSegmentParser = generateAudioVideoSegmentParser(options);
  const textTrackLoader = generateTextTrackLoader(options);
  const textTrackParser = generateTextTrackParser(options);

  return { manifest: { loadManifest: manifestLoader,
                       parseManifest: manifestParser },
           audio: { loadSegment: segmentLoader,
                    parseSegment: audioVideoSegmentParser },
           video: { loadSegment: segmentLoader,
                    parseSegment: audioVideoSegmentParser },
           text: { loadSegment: textTrackLoader,
                   parseSegment: textTrackParser },
           image: { loadSegment: imageLoader,
                    parseSegment: imageParser } };
}
