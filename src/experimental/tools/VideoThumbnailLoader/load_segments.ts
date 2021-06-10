import { combineLatest, Observable } from "rxjs";
import {
  ISegmentLoaderContent,
  ISegmentLoaderEvent,
} from "../../../core/fetchers/segment/create_segment_loader";
import { ISegment } from "../../../manifest";
import { createRequest, freeRequest } from "./create_request";
import getCompleteSegmentId from "./get_complete_segment_id";
import { IContentInfos } from "./types";

/**
 * Load needed segments, from already running requests or by running new ones.
 * @param {Array.<Object>} segments
 * @param {Map} currentRequests
 * @param {Function} segmentLoader
 * @param {Object} contentInfos
 * @returns {Object}
 */
export default function loadSegments(
  segments: ISegment[],
  segmentLoader: (
    x : ISegmentLoaderContent
  ) => Observable<ISegmentLoaderEvent<Uint8Array |
                                      ArrayBuffer |
                                      null>>,
  contentInfos: IContentInfos
): Observable<Array<{ segment: ISegment;
                      data: Uint8Array; }>> {
  return combineLatest(
    segments.map((segment) => {
      return new Observable<{
        segment: ISegment;
        data: Uint8Array; }
      >((obs) => {
        const completeSegmentId = getCompleteSegmentId(contentInfos, segment);
        const request = createRequest(segmentLoader, contentInfos, segment);

        if (request.error !== undefined) {
          freeRequest(completeSegmentId);
          obs.error(request.error);
          return;
        }

        request.onError = (err) => {
          freeRequest(completeSegmentId);
          obs.error(err);
        };

        if (request.data !== undefined) {
          obs.next({ data: request.data, segment });
          obs.complete();
          return;
        }

        request.onData = (data) => {
          obs.next({ data, segment });
          obs.complete();
        };
      });
    })
  );
}
