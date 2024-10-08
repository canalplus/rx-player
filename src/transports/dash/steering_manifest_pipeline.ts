import type { ISteeringManifest } from "../../parsers/SteeringManifest";
/* eslint-disable-next-line max-len */
import parseDashContentSteeringManifest from "../../parsers/SteeringManifest/DCSM/parse_dcsm";
import request from "../../utils/request";
import type { CancellationSignal } from "../../utils/task_canceller";
import type { IRequestedData } from "../types";

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
