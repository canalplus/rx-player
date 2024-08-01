/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type { IManifest, IAdaptation, ISegment, IPeriod, IRepresentation } from "../../../manifest";
import type { IPlayerError } from "../../../public_types";
import type { ISegmentParserParsedInitChunk, ISegmentParserParsedMediaChunk, ISegmentPipeline } from "../../../transports";
import type { CancellationSignal } from "../../../utils/task_canceller";
import type { IMetricsCallbackPayload, IRequestBeginCallbackPayload, IRequestEndCallbackPayload, IRequestProgressCallbackPayload } from "../../adaptive";
import type CmcdDataBuilder from "../../cmcd";
import type { IBufferType } from "../../segment_sinks";
import type CdnPrioritizer from "../cdn_prioritizer";
/**
 * Create an `ISegmentFetcher` object which will allow to easily fetch and parse
 * segments.
 * An `ISegmentFetcher` also implements a retry mechanism, based on the given
 * `requestOptions` argument, which may retry a segment request when it fails.
 *
 * @param {Object} args
 * @returns {Function}
 */
export default function createSegmentFetcher<TLoadedFormat, TSegmentDataType>({ bufferType, pipeline, cdnPrioritizer, cmcdDataBuilder, eventListeners, requestOptions, }: ISegmentFetcherArguments<TLoadedFormat, TSegmentDataType>): ISegmentFetcher<TSegmentDataType>;
/**
 * Defines the `ISegmentFetcher` function which allows to load a single segment.
 *
 * Loaded data is entirely communicated through callbacks present in the
 * `callbacks` arguments.
 *
 * The returned Promise only gives an indication of if the request ended with
 * success or on error.
 */
export type ISegmentFetcher<TSegmentDataType> = (
/** Information on the segment wanted. */
content: ISegmentLoaderContent, 
/** Callbacks the `ISegmentFetcher` will call as it loads the data. */
callbacks: ISegmentFetcherCallbacks<TSegmentDataType>, 
/** CancellationSignal allowing to cancel the request. */
cancellationSignal: CancellationSignal) => Promise<void>;
/**
 * Callbacks given to an `ISegmentFetcher` allowing to be notified on its
 * inner request's various events.
 */
export interface ISegmentFetcherCallbacks<TSegmentDataType> {
    /** Called when a decodable chunk of the whole segment is available. */
    onChunk(parse: (initTimescale: number | undefined) => ISegmentParserParsedInitChunk<TSegmentDataType> | ISegmentParserParsedMediaChunk<TSegmentDataType>): void;
    /**
     * Callback called when all decodable chunks of the loaded segment have been
     * communicated through the `onChunk` callback.
     *
     * This callback is called before the corresponding `ISegmentFetcher`'s
     * returned Promise is resolved.
     */
    onAllChunksReceived(): void;
    /**
     * Callback called when the segment request has to restart from scratch, e.g.
     * due to a request error.
     */
    onRetry(error: IPlayerError): void;
}
/** Content used by the segment loader as a context to load a new segment. */
export interface ISegmentLoaderContent {
    manifest: IManifest;
    period: IPeriod;
    adaptation: IAdaptation;
    representation: IRepresentation;
    segment: ISegment;
}
/**
 * Callbacks given when creating an `ISegmentFetcher`, allowing to be notified
 * on high-level metadata about performed requests.
 */
export interface ISegmentFetcherLifecycleCallbacks {
    /** Called when a segment request begins. */
    onRequestBegin?: (arg: IRequestBeginCallbackPayload) => void;
    /** Called when progress information is available on a pending segment request. */
    onProgress?: (arg: IRequestProgressCallbackPayload) => void;
    /**
     * Called when a segment request ends (either because it completed, it failed
     * or was canceled).
     */
    onRequestEnd?: (arg: IRequestEndCallbackPayload) => void;
    /**
     * Called when network metrics linked to a segment request are available,
     * once the request has terminated.
     * This callback may be called before or after the corresponding
     * `onRequestEnd` callback, you should not rely on the order between the two.
     */
    onMetrics?: (arg: IMetricsCallbackPayload) => void;
}
/** requestOptions allowing to configure an `ISegmentFetcher`'s behavior. */
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
export declare function getSegmentFetcherRequestOptions({ maxRetry, lowLatencyMode, requestTimeout, connectionTimeout, }: {
    maxRetry?: number | undefined;
    requestTimeout?: number | undefined;
    connectionTimeout?: number | undefined;
    lowLatencyMode: boolean;
}): ISegmentFetcherOptions;
export interface ISegmentFetcherArguments<TLoadedFormat, TSegmentDataType> {
    /** Type of  buffer concerned (e.g. `"audio"`, `"video"`, `"text" etc.) */
    bufferType: IBufferType;
    /**
     * The transport-specific logic allowing to load segments of the given buffer
     * type and transport protocol (e.g. DASH).
     */
    pipeline: ISegmentPipeline<TLoadedFormat, TSegmentDataType>;
    /**
     * Abstraction allowing to synchronize, update and keep track of the
     * priorization of the CDN to use to load any given segment, in cases where
     * multiple ones are available.
     *
     * Can be set to `null` in which case a minimal priorization logic will be used
     * instead.
     */
    cdnPrioritizer: CdnPrioritizer | null;
    /**
     * Optional module allowing to collect "Common Media Client Data" (a.k.a. CMCD)
     * for the CDN.
     */
    cmcdDataBuilder: CmcdDataBuilder | null;
    /**
     * Callbacks that can be registered to be informed when new requests are made,
     * ended, new metrics are available etc.
     * This should be mainly useful to implement an adaptive logic relying on those
     * metrics and events.
     */
    eventListeners: ISegmentFetcherLifecycleCallbacks;
    /**
     * Various tweaking requestOptions allowing to configure the behavior of the returned
     * `ISegmentFetcher` regarding segment requests.
     */
    requestOptions: ISegmentFetcherOptions;
}
//# sourceMappingURL=segment_fetcher.d.ts.map