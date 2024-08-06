import type { IManifest } from "../../../manifest";
import type { IThumbnailResponse } from "../../../transports";
import arrayFind from "../../../utils/array_find";
import TaskCanceller from "../../../utils/task_canceller";
import { getThumbnailFetcherRequestOptions } from "../../fetchers";
import type { IThumbnailFetcher } from "../../fetchers";

/**
 * @param {function} fetchThumbnails
 * @param {Object} manifest
 * @param {string} periodId
 * @param {string} thumbnailTrackId
 * @param {number} time
 * @returns {Promise.<Object>}
 */
export default async function getThumbnailData(
  fetchThumbnails: IThumbnailFetcher,
  manifest: IManifest,
  periodId: string,
  thumbnailTrackId: string,
  time: number,
): Promise<IThumbnailResponse> {
  const period = manifest.getPeriod(periodId);
  if (period === undefined) {
    throw new Error("Wanted Period not found.");
  }
  const thumbnailTrack = arrayFind(period.thumbnailTracks, (t) => {
    return t.id === thumbnailTrackId;
  });
  if (thumbnailTrack === undefined) {
    throw new Error("Wanted Period has no thumbnail track.");
  }
  const wantedThumbnail = thumbnailTrack.index.getSegments(time, 1)[0];
  if (wantedThumbnail === undefined) {
    throw new Error("No thumbnail for the given timestamp");
  }
  return fetchThumbnails(
    wantedThumbnail,
    thumbnailTrack,
    getThumbnailFetcherRequestOptions({}),
    new TaskCanceller().signal,
  );
}
