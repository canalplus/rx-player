import parseDashContentSteeringManifest, {
  type ISteeringManifest,
} from "../../parsers/SteeringManifest/index.ts";
import request from "../../utils/request/index.ts";
import type { CancellationSignal } from "../../utils/task_canceller.ts";
import type { IRequestedData } from "../types.ts";

/**
 * Loads DASH's Content Steering Manifest.
 * @param {string|null} url
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export async function loadSteeringManifest(
  url: string,
  cancelSignal: CancellationSignal,
): Promise<IRequestedData<string>> {
  return request({ url, responseType: "text", cancelSignal });
}

/**
 * Parses DASH's Content Steering Manifest.
 * @param {Object} loadedSegment
 * @param {Function} onWarnings
 * @returns {Object}
 */
export function parseSteeringManifest(
  { responseData }: IRequestedData<unknown>,
  onWarnings: (warnings: Error[]) => void,
): ISteeringManifest {
  if (
    typeof responseData !== "string" &&
    (typeof responseData !== "object" || responseData === null)
  ) {
    throw new Error("Invalid loaded format for DASH's Content Steering Manifest.");
  }

  const parsed = parseDashContentSteeringManifest(responseData);
  if (parsed[1].length > 0) {
    onWarnings(parsed[1]);
  }
  return parsed[0];
}
