import type { ITransportOptions, ITransportPipelines } from "../types";
import generateManifestLoader from "../utils/generate_manifest_loader";
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
export default function (options: ITransportOptions): ITransportPipelines {
  const manifestLoader = generateManifestLoader(
    { customManifestLoader: options.manifestLoader },
    "text",
    null,
  );

  const manifestParser = generateManifestParser(options);
  const segmentLoader = generateSegmentLoader(options);
  const audioVideoSegmentParser = generateAudioVideoSegmentParser(options);

  return {
    transportName: "hls",
    manifest: { loadManifest: manifestLoader, parseManifest: manifestParser },
    audio: {
      loadSegment: segmentLoader,
      parseSegment: audioVideoSegmentParser,
    },
    video: {
      loadSegment: segmentLoader,
      parseSegment: audioVideoSegmentParser,
    },
    text: {
      loadSegment: generateTextTrackLoader({
        checkMediaSegmentIntegrity: options.checkMediaSegmentIntegrity,
      }),
      parseSegment: generateTextTrackParser({}),
    },
  };
}
