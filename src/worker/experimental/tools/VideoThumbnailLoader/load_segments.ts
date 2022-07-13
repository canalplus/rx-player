import { combineLatest, Observable } from "rxjs";
import { ISegmentFetcher } from "../../../core/fetchers/segment/segment_fetcher";
import { ISegment } from "../../../manifest";
import {
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
} from "../../../transports";
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
  segmentFetcher : ISegmentFetcher<ArrayBuffer | Uint8Array>,
  contentInfos: IContentInfos
): Observable<Array<{
  segment: ISegment;
  data: ISegmentParserParsedMediaChunk<ArrayBuffer | Uint8Array> |
        ISegmentParserParsedInitChunk<ArrayBuffer | Uint8Array>;
}>> {
  return combineLatest(
    segments.map((segment) => {
      return new Observable<{
        segment: ISegment;
        data: ISegmentParserParsedMediaChunk<ArrayBuffer | Uint8Array> |
              ISegmentParserParsedInitChunk<ArrayBuffer | Uint8Array>; }
      >((obs) => {
        const completeSegmentId = getCompleteSegmentId(contentInfos, segment);
        const request = createRequest(segmentFetcher, contentInfos, segment);

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
        }

        if (request.isComplete) {
          obs.complete();
          return;
        }

        request.onData = (data) => {
          obs.next({ data, segment });
        };

        request.onComplete = () => {
          obs.complete();
        };
      });
    })
  );
}
