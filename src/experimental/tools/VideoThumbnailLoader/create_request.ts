import {
  catchError,
  EMPTY,
  filter,
  take,
} from "rxjs";
import {
  ISegmentFetcher,
  ISegmentFetcherChunkCompleteEvent,
  ISegmentFetcherChunkEvent,
} from "../../../core/fetchers/segment/segment_fetcher";
import { ISegment } from "../../../manifest";
import {
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
} from "../../../transports";
import getCompleteSegmentId from "./get_complete_segment_id";
import { IContentInfos } from "./types";

const requests = new Map<string, ICancellableRequest>();

export interface ICancellableRequest {
  data?: ISegmentParserParsedInitChunk<Uint8Array | ArrayBuffer> |
         ISegmentParserParsedMediaChunk<Uint8Array | ArrayBuffer>;
  isComplete: boolean;
  error?: Error;
  onData?: (data: ISegmentParserParsedInitChunk<Uint8Array | ArrayBuffer> |
                  ISegmentParserParsedMediaChunk<Uint8Array | ArrayBuffer>) => void;
  onComplete?: () => void;
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
  segmentFetcher: ISegmentFetcher<ArrayBuffer | Uint8Array>,
  contentInfos: IContentInfos,
  segment: ISegment
): ICancellableRequest {
  const completeSegmentId = getCompleteSegmentId(contentInfos, segment);
  const lastRequest = requests.get(completeSegmentId);
  if (lastRequest !== undefined) {
    return lastRequest;
  }

  const _request: ICancellableRequest = {
    cancel() {
      subscription.unsubscribe();
      this.isComplete = true;
    },
    isComplete: false,
  };

  const subscription = segmentFetcher({ manifest: contentInfos.manifest,
                                        period: contentInfos.period,
                                        adaptation: contentInfos.adaptation,
                                        representation: contentInfos.representation,
                                        segment }).pipe(
    filter((evt): evt is ISegmentFetcherChunkEvent<ArrayBuffer | Uint8Array> |
                         ISegmentFetcherChunkCompleteEvent =>
      evt.type === "chunk" ||
      evt.type === "chunk-complete"
    ),
    take(1),
    catchError((err: Error) => {
      _request.error = err;
      if (_request.onError !== undefined) {
        _request.onError(err);
      }
      _request.isComplete = true;
      return EMPTY;
    })
  ).subscribe((evt) => {
    if (evt.type === "chunk-complete") {
      if (_request.onComplete !== undefined) {
        _request.onComplete();
        _request.isComplete = true;
      }
    } else {
      const parsed = evt.parse();
      _request.data = parsed;
      if (_request.onData !== undefined) {
        _request.onData(parsed);
      }
    }
  });

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

