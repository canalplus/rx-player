import CdnPrioritizer from "../../../core/fetchers/cdn_prioritizer";
import { scheduleRequestWithCdns } from "../../../core/fetchers/utils/schedule_request";
import { formatError, NetworkError, RequestError } from "../../../errors";
import log from "../../../log";
import { ICdnMetadata } from "../../../parsers/manifest";
import { IPlayerError } from "../../../public_types";
import {
  ISegmentContext,
  ISegmentLoader,
  ISegmentParserParsedInitChunk,
  ISegmentParserParsedMediaChunk,
  ISegmentPipeline,
  ITransportPipelines,
} from "../../../transports";
import noop from "../../../utils/noop";
import objectAssign from "../../../utils/object_assign";
import { CancellationError, CancellationSignal } from "../../../utils/task_canceller";

/**
 * Create a much more simpler fetcher utility for media and initialization
 * segments than what is provided for the usual streaming use-cases - to be used
 * when the content is loaded locally for later consumption (and thus does not
 * need adaptive logic nor the same prioritization complexities to run than the
 * usual logic).
 *
 * @param {Object} pipelines - The transport-specific logic allowing to load
 * resources of the given transport protocol (e.g. DASH).
 * @param {Object|null} cdnPrioritizer - Abstraction allowing to synchronize,
 * update and keep track of the priorization of the CDN to use to load any given
 * segment, in cases where multiple ones are available.
 *
 * Can be set to `null` in which case a minimal priorization logic will be used
 * instead.
 * @param {Object} options - Various tweaking options allowing to configure the
 * behavior of the returned `createLocalSegmentFetcher`.
 * @returns {Function} - Function allowing to load initialization and media
 * segments.
 */
export default function createLocalSegmentFetcher<TLoadedFormat, TSegmentDataType>(
  pipelines: ITransportPipelines,
  cdnPrioritizer: CdnPrioritizer | null,
  options: ISegmentFetcherOptions,
): ILocalSegmentFetcher<TSegmentDataType> {
  const requestOptions = {
    timeout: options.requestTimeout < 0 ? undefined : options.requestTimeout,
  };
  /**
   * Fetch a specific segment.
   * @param {Object} context
   * @param {Object} cancellationSignal
   * @returns {Promise}
   */
  return async function fetchSegment(
    context: ISegmentContext & {
      cdnMetadata: ICdnMetadata[] | null;
      initTimescale: number | undefined;
    },
    onRetry: (err: IPlayerError) => void,
    cancellationSignal: CancellationSignal,
  ): Promise<
    Array<
      | ISegmentParserParsedInitChunk<TSegmentDataType>
      | ISegmentParserParsedMediaChunk<TSegmentDataType>
    >
  > {
    const { loadSegment, parseSegment } = pipelines[
      context.type
    ] as unknown as ISegmentPipeline<TLoadedFormat, TSegmentDataType>;
    const parsedChunks = [];
    cancellationSignal.register(onCancellation);
    try {
      const res = await scheduleRequestWithCdns(
        context.cdnMetadata,
        cdnPrioritizer,
        callLoaderWithUrl,
        objectAssign({ onRetry: onRequestRetry }, options),
        cancellationSignal,
      );

      if (res.resultType === "segment-loaded") {
        const loadedData = res.resultData.responseData;
        const parsed = parseLoadedChunk(loadedData, false);
        parsedChunks.push(parsed);
      } else if (res.resultType === "segment-created") {
        const parsed = parseLoadedChunk(res.resultData, false);
        parsedChunks.push(parsed);
      }
      cancellationSignal.deregister(onCancellation);
    } catch (err) {
      cancellationSignal.deregister(onCancellation);
      if (err instanceof CancellationError) {
        log.debug("LSF: Segment request aborted");
        throw err;
      }
      log.debug("LSF: Segment request failed");
      throw errorSelector(err);
    }

    return parsedChunks;

    function onCancellation() {
      log.debug("LSF: Segment request cancelled");
    }

    /**
     * Call a segment loader for the given URL with the right arguments.
     * @param {Object} wantedCdnMetadata
     * @returns {Promise}
     */
    function callLoaderWithUrl(
      wantedCdnMetadata: ICdnMetadata | null,
    ): ReturnType<ISegmentLoader<TLoadedFormat>> {
      return loadSegment(wantedCdnMetadata, context, requestOptions, cancellationSignal, {
        onNewChunk(chunkData: TLoadedFormat): void {
          const parsed = parseLoadedChunk(chunkData, true);
          parsedChunks.push(parsed);
        },
        onProgress: noop,
      });
    }

    /**
     * @param {*} data
     * @param {Boolean} isChunked
     * @returns {Object}
     */
    function parseLoadedChunk(
      data: TLoadedFormat,
      isChunked: boolean,
    ):
      | ISegmentParserParsedInitChunk<TSegmentDataType>
      | ISegmentParserParsedMediaChunk<TSegmentDataType> {
      const loaded = { data, isChunked };
      try {
        const parsed = parseSegment(loaded, context, context.initTimescale);
        return parsed;
      } catch (error) {
        throw formatError(error, {
          defaultCode: "PIPELINE_PARSE_ERROR",
          defaultReason: "Unknown parsing error",
        });
      }
    }

    /**
     * Function called when the function request is retried.
     * @param {*} err
     */
    function onRequestRetry(err: unknown): void {
      onRetry(errorSelector(err));
    }
  };
}

/**
 * Generate a new error from the infos given.
 * @param {Error} error
 * @returns {Error}
 */
function errorSelector(error: unknown): IPlayerError {
  if (error instanceof RequestError) {
    return new NetworkError("PIPELINE_LOAD_ERROR", error);
  }
  return formatError(error, {
    defaultCode: "PIPELINE_LOAD_ERROR",
    defaultReason: "Unknown error when fetching a segment",
  });
}

/** Options allowing to configure an `createLocalSegmentFetcher`'s behavior. */
export interface ISegmentFetcherOptions {
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
   * Timeout after which request are aborted and, depending on other options,
   * retried.
   * To set to `-1` for no timeout.
   */
  requestTimeout: number;
}

/**
 * Defines the `ILocalSegmentFetcher` function which allows to load a single
 * segment locally.
 *
 * Loaded data is entirely communicated through callbacks present in the
 * `callbacks` arguments.
 *
 * The returned Promise only gives an indication of if the request ended with
 * success or on error.
 */
export type ILocalSegmentFetcher<TSegmentDataType> = (
  /** Information on the segment wanted. */
  context: ISegmentContext & {
    initTimescale: number | undefined;
    cdnMetadata: ICdnMetadata[] | null;
  },
  onRetry: (err: IPlayerError) => void,
  /** CancellationSignal allowing to cancel the request. */
  cancellationSignal: CancellationSignal,
) => Promise<
  Array<
    | ISegmentParserParsedInitChunk<TSegmentDataType>
    | ISegmentParserParsedMediaChunk<TSegmentDataType>
  >
>;
