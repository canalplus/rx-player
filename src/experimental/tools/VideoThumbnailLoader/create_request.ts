import {
  EMPTY,
  Observable,
} from "rxjs";
import {
  catchError,
  filter,
  take,
} from "rxjs/operators";
import {
  ISegmentLoaderContent,
  ISegmentLoaderEvent,
} from "../../../core/fetchers/segment/create_segment_loader";
import { ISegment } from "../../../manifest";
import getCompleteSegmentId from "./get_complete_segment_id";
import { IContentInfos } from "./types";

const requests = new Map<string, ICancellableRequest>();

export interface ICancellableRequest {
  data?: Uint8Array;
  error?: Error;
  onData?: (data: Uint8Array) => void;
  onError?: (err: Error) => void;
  cancel: () => void;
}

/**
 * Create a request that is cancallable and which does not depends
 * on a specific task.
 * @param {Function} segmentLoader
 * @param {Object} contentInfos
 * @param {Object} segment
 * @returns {Object}
 */
export function createRequest(
  segmentLoader: (
    x : ISegmentLoaderContent
  ) => Observable<ISegmentLoaderEvent<Uint8Array |
                                      ArrayBuffer |
                                      null>>,
  contentInfos: IContentInfos,
  segment: ISegment
): ICancellableRequest {
  const completeSegmentId = getCompleteSegmentId(contentInfos, segment);
  const lastRequest = requests.get(completeSegmentId);
  if (lastRequest !== undefined) {
    return lastRequest;
  }
  const subscription = segmentLoader({ manifest: contentInfos.manifest,
                                       period: contentInfos.period,
                                       adaptation: contentInfos.adaptation,
                                       representation: contentInfos.representation,
                                       segment }).pipe(
    filter((evt): evt is { type: "data";
                           value: { responseData: Uint8Array }; } =>
      evt.type === "data"
    ),
    take(1),
    catchError((err: Error) => {
      _request.error = err;
      if (_request.onError !== undefined) {
        _request.onError(err);
      }
      return EMPTY;
    })
  ).subscribe((evt) => {
    _request.data = evt.value.responseData;
    if (_request.onData !== undefined) {
      _request.onData(evt.value.responseData);
    }
  });

  const _request: ICancellableRequest = {
    cancel: () => subscription.unsubscribe(),
  };

  requests.set(completeSegmentId, _request);

  return _request;
}

/**
 * Free requests :
 * - Cancel the subscription to the observable
 * - Delete the request from the requests Map.
 * @param {string} segmentId
 */
export function freeRequest(segmentId: string): void {
  const request = requests.get(segmentId);
  if (request !== undefined) {
    request.cancel();
    requests.delete(segmentId);
  }
}

