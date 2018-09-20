import { IManifestLoader } from "../../public_types";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import request from "../../utils/request";
import generateSegmentLoader from "../dash/segment_loader";
import segmentParser from "../dash/segment_parser";
import generateTextTrackLoader from "../dash/text_loader";
import textTrackParser from "../dash/text_parser";
import { IManifestLoaderOptions, ITransportOptions, ITransportPipelines } from "../types";
import callCustomManifestLoader from "../utils/call_custom_manifest_loader";
import generateManifestParser from "./manifest_parser";

/**
 * Manifest loader triggered if there was no custom-defined one in the API.
 * @param {string} url
 * @returns {Observable}
 */
function regularManifestLoader({
  url,
}: IManifestLoaderOptions): IManifestLoaderObservable {
  if (url === undefined) {
    throw new Error("Cannot perform HTTP(s) request. URL not known");
  }
  return request({ url, responseType: "text" });
}

function generateManifestLoader({
  customManifestLoader,
}: {
  customManifestLoader?: IManifestLoader;
}): (x: IManifestLoaderOptions) => (() => void) | void {
  if (isNullOrUndefined(customManifestLoader)) {
    return regularManifestLoader;
  }
  return callCustomManifestLoader(customManifestLoader, regularManifestLoader);
}

/**
 * Returns pipelines used for HLS streaming.
 * @param {Object} options
 * implementation. Used for each generated http request.
 * @returns {Object}
 */
export default function (options: ITransportOptions): ITransportPipelines {
  const manifestParser = generateManifestParser(options);
  const segmentLoader = generateSegmentLoader(options);
  const textTrackLoader = generateTextTrackLoader(options);

  const customManifestLoader = options.manifestLoader;
  const manifestPipeline = {
    loadManifest: generateManifestLoader({ customManifestLoader }),
    parseManifest: manifestParser,
  };

  const imageTrackPipeline = {
    loader: (): never => {
      throw new Error("Images track not supported in HLS transport.");
    },
    parser: (): never => {
      throw new Error("Images track not supported in HLS transport.");
    },
  };

  return {
    manifest: manifestPipeline,
    audio: { loadSegment: segmentLoader, parseSegment: segmentParser },
    video: { loadSegment: segmentLoader, parseSegment: segmentParser },
    text: { loadSegment: textTrackLoader, parseSegment: textTrackParser },
    image: imageTrackPipeline,
  };
}
