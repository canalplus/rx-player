import config from "../../../config";
import { formatError } from "../../../errors";
import log from "../../../log";
import type { ISegment, IThumbnailTrack } from "../../../manifest";
import type { ICdnMetadata } from "../../../parsers/manifest";
import type {
  IThumbnailLoader,
  IThumbnailLoaderOptions,
  IThumbnailPipeline,
  IThumbnailResponse,
} from "../../../transports";
import objectAssign from "../../../utils/object_assign";
import type { CancellationSignal } from "../../../utils/task_canceller";
import { CancellationError } from "../../../utils/task_canceller";
import type CdnPrioritizer from "../cdn_prioritizer";
import errorSelector from "../utils/error_selector";
import { scheduleRequestWithCdns } from "../utils/schedule_request";

/**
 * Create an `IThumbnailFetcher` object which will allow to easily fetch and parse
 * segments.
 * An `IThumbnailFetcher` also implements a retry mechanism, based on the given
 * `requestOptions` argument, which may retry a segment request when it fails.
 *
 * @param {Object} pipeline
 * @param {Object|null} cdnPrioritizer
 * @returns {Function}
 */
export default function createThumbnailFetcher(
  /** The transport-specific logic allowing to load thumbnails. */
  pipeline: IThumbnailPipeline,
  /**
   * Abstraction allowing to synchronize, update and keep track of the
   * priorization of the CDN to use to load any given segment, in cases where
   * multiple ones are available.
   *
   * Can be set to `null` in which case a minimal priorization logic will be used
   * instead.
   */
  cdnPrioritizer: CdnPrioritizer | null,
  // TODO CMCD?
): IThumbnailFetcher {
  const { loadThumbnail } = pipeline;

  // TODO short-lived cache?

  /**
   * Fetch a specific segment.
   * @param {Object} thumbnail
   * @param {Object} thumbnailTrack
   * @param {Object} requestOptions
   * @param {Object} cancellationSignal
   * @returns {Promise}
   */
  return async function fetchThumbnail(
    thumbnail: ISegment,
    thumbnailTrack: IThumbnailTrack,
    requestOptions: IThumbnailFetcherOptions,
    cancellationSignal: CancellationSignal,
  ): Promise<IThumbnailResponse> {
    let connectionTimeout;
    if (
      requestOptions.connectionTimeout === undefined ||
      requestOptions.connectionTimeout < 0
    ) {
      connectionTimeout = undefined;
    } else {
      connectionTimeout = requestOptions.connectionTimeout;
    }
    const pipelineRequestOptions: IThumbnailLoaderOptions = {
      timeout:
        requestOptions.requestTimeout < 0 ? undefined : requestOptions.requestTimeout,
      connectionTimeout,
      cmcdPayload: undefined,
    };

    log.debug("TF: Beginning thumbnail request", thumbnail.time);
    cancellationSignal.register(onCancellation);
    let res;
    try {
      res = await scheduleRequestWithCdns(
        thumbnailTrack.cdnMetadata,
        cdnPrioritizer,
        callLoaderWithUrl,
        objectAssign({ onRetry }, requestOptions),
        cancellationSignal,
      );

      if (cancellationSignal.isCancelled()) {
        return Promise.reject(cancellationSignal.cancellationError);
      }

      log.debug("TF: Thumbnail request ended with success", thumbnail.time);
      cancellationSignal.deregister(onCancellation);
    } catch (err) {
      cancellationSignal.deregister(onCancellation);
      if (err instanceof CancellationError) {
        log.debug("TF: Thumbnail request aborted", thumbnail.time);
        throw err;
      }
      log.debug("TF: Thumbnail request failed", thumbnail.time);
      throw errorSelector(err);
    }

    try {
      const parsed = pipeline.parseThumbnail(res.responseData, {
        thumbnail,
        thumbnailTrack,
      });
      return parsed;
    } catch (error) {
      throw formatError(error, {
        defaultCode: "PIPELINE_PARSE_ERROR",
        defaultReason: "Unknown parsing error",
      });
    }
    function onCancellation() {
      log.debug("TF: Thumbnail request cancelled", thumbnail.time);
    }

    /**
     * Call a segment loader for the given URL with the right arguments.
     * @param {Object|null} cdnMetadata
     * @returns {Promise}
     */
    function callLoaderWithUrl(
      cdnMetadata: ICdnMetadata | null,
    ): ReturnType<IThumbnailLoader> {
      return loadThumbnail(
        cdnMetadata,
        thumbnail,
        pipelineRequestOptions,
        cancellationSignal,
      );
    }

    /**
     * Function called when the function request is retried.
     * @param {*} err
     */
    function onRetry(err: unknown): void {
      const formattedErr = errorSelector(err);
      log.warn("TF: Thumbnail request retry ", thumbnail.time, formattedErr);
    }
  };
}

/**
 * Defines the `IThumbnailFetcher` function which allows to load a single segment.
 *
 * Loaded data is entirely communicated through callbacks present in the
 * `callbacks` arguments.
 *
 * The returned Promise only gives an indication of if the request ended with
 * success or on error.
 */
export type IThumbnailFetcher = (
  /** Actual thumbnail you want to load */
  thumbnail: ISegment,
  /** Metadata on the linked thumbnails track. */
  thumbnailTrack: IThumbnailTrack,
  /**
   * Various tweaking requestOptions allowing to configure the behavior of the returned
   * `IThumbnailFetcher` regarding segment requests.
   */
  requestOptions: IThumbnailFetcherOptions,
  /** CancellationSignal allowing to cancel the request. */
  cancellationSignal: CancellationSignal,
) => Promise<IThumbnailResponse>;

/** requestOptions allowing to configure an `IThumbnailFetcher`'s behavior. */
export interface IThumbnailFetcherOptions {
  /**
   * Initial delay to wait if a request fails before making a new request, in
   * milliseconds.
   */
  baseDelay: number;
  /**
   * Maximum delay to wait if a request fails before making a new request, in
   * milliseconds.
   */
  maxDelay: number;
  /**
   * Maximum number of retries to perform on "regular" errors (e.g. due to HTTP
   * status, integrity errors, timeouts...).
   */
  maxRetry: number;
  /**
   * Timeout after which request are aborted and, depending on other requestOptions,
   * retried.
   * To set to `-1` for no timeout.
   */
  requestTimeout: number;
  /**
   * Connection timeout, in milliseconds, after which the request is canceled
   * if the responses headers has not being received.
   * Do not set or set to "undefined" to disable it.
   */
  connectionTimeout: number | undefined;
}

/**
 * @param {Object} baseOptions
 * @returns {Object}
 */
export function getThumbnailFetcherRequestOptions({
  maxRetry,
  requestTimeout,
  connectionTimeout,
}: {
  maxRetry?: number | undefined;
  requestTimeout?: number | undefined;
  connectionTimeout?: number | undefined;
}): IThumbnailFetcherOptions {
  const {
    DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR,
    DEFAULT_THUMBNAIL_REQUEST_TIMEOUT,
    DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT,
    INITIAL_BACKOFF_DELAY_BASE,
    MAX_BACKOFF_DELAY_BASE,
  } = config.getCurrent();
  return {
    maxRetry: maxRetry ?? DEFAULT_MAX_THUMBNAIL_REQUESTS_RETRY_ON_ERROR,
    baseDelay: INITIAL_BACKOFF_DELAY_BASE.REGULAR,
    maxDelay: MAX_BACKOFF_DELAY_BASE.REGULAR,
    requestTimeout:
      requestTimeout === undefined ? DEFAULT_THUMBNAIL_REQUEST_TIMEOUT : requestTimeout,
    connectionTimeout:
      connectionTimeout === undefined
        ? DEFAULT_THUMBNAIL_CONNECTION_TIMEOUT
        : connectionTimeout,
  };
}
