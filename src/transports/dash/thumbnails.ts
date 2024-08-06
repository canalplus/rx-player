import type { ISegment } from "../../manifest";
import type { ICdnMetadata } from "../../parsers/manifest";
import request from "../../utils/request/xhr";
import type { CancellationSignal } from "../../utils/task_canceller";
import type {
  IRequestedData,
  IThumbnailContext,
  IThumbnailLoaderOptions,
  IThumbnailResponse,
} from "../types";
import addQueryString from "../utils/add_query_string";
import byteRange from "../utils/byte_range";
import constructSegmentUrl from "./construct_segment_url";

/**
 * Load thumbnails for DASH content.
 * @param {Object|null} wantedCdn
 * @param {Object} thumbnail
 * @param {Object} options
 * @param {Object} cancelSignal
 * @returns {Promise}
 */
export async function loadThumbnail(
  wantedCdn: ICdnMetadata | null,
  thumbnail: ISegment,
  options: IThumbnailLoaderOptions,
  cancelSignal: CancellationSignal,
): Promise<IRequestedData<ArrayBuffer>> {
  const initialUrl = constructSegmentUrl(wantedCdn, thumbnail);
  if (initialUrl === null) {
    return Promise.reject(new Error("Cannot load thumbnail: no URL"));
  }
  const url =
    options.cmcdPayload?.type === "query"
      ? addQueryString(initialUrl, options.cmcdPayload.value)
      : initialUrl;

  const cmcdHeaders =
    options.cmcdPayload?.type === "headers" ? options.cmcdPayload.value : undefined;

  let headers;
  if (thumbnail.range !== undefined) {
    headers = {
      ...cmcdHeaders,
      Range: byteRange(thumbnail.range),
    };
  } else if (cmcdHeaders !== undefined) {
    headers = cmcdHeaders;
  }
  return request({
    url,
    responseType: "arraybuffer",
    headers,
    timeout: options.timeout,
    connectionTimeout: options.connectionTimeout,
    cancelSignal,
  });
}

/**
 * Parse loaded thumbnail data into exploitable thumbnail data and metadata.
 * @param {ArrayBuffer} data - The loaded thumbnail data
 * @param {Object} context
 * @returns {Object}
 */
export function parseThumbnail(
  data: ArrayBuffer,
  context: IThumbnailContext,
): IThumbnailResponse {
  const { thumbnailTrack, thumbnail: wantedThumbnail } = context;
  const height = thumbnailTrack.height / thumbnailTrack.verticalTiles;
  const width = thumbnailTrack.width / thumbnailTrack.horizontalTiles;
  const thumbnails = [];
  const tileDuration =
    (wantedThumbnail.end - wantedThumbnail.time) /
    (thumbnailTrack.horizontalTiles * thumbnailTrack.verticalTiles);
  let start = wantedThumbnail.time;
  for (let row = 0; row < thumbnailTrack.verticalTiles; row++) {
    for (let column = 0; column < thumbnailTrack.horizontalTiles; column++) {
      thumbnails.push({
        start,
        end: start + tileDuration,
        offsetX: Math.round(column * width),
        offsetY: Math.round(row * height),
        height: Math.floor(height),
        width: Math.floor(width),
      });
      start += tileDuration;
    }
  }
  return {
    mimeType: thumbnailTrack.mimeType,
    data,
    thumbnails,
  };
}
