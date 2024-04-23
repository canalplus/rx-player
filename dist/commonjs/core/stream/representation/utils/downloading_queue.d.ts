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
import type { IManifest, IAdaptation, ISegment, IPeriod, IRepresentation } from "../../../../manifest";
import type { IPlayerError } from "../../../../public_types";
import type { ISegmentParserParsedInitChunk, ISegmentParserParsedMediaChunk } from "../../../../transports";
import EventEmitter from "../../../../utils/event_emitter";
import type { IReadOnlySharedReference } from "../../../../utils/reference";
import type { IPrioritizedSegmentFetcher } from "../../../fetchers";
import type { IQueuedSegment } from "../types";
/**
 * Class scheduling segment downloads for a single Representation.
 *
 * TODO The request scheduling abstractions might be simplified by integrating
 * the `DownloadingQueue` in the segment fetchers code, instead of having it as
 * an utilis of the `RepresentationStream` like here.
 * @class DownloadingQueue
 */
export default class DownloadingQueue<T> extends EventEmitter<IDownloadingQueueEvent<T>> {
    /** Context of the Representation that will be loaded through this DownloadingQueue. */
    private _content;
    /**
     * Current queue of segments scheduled for download.
     *
     * Segments whose request are still pending are still in that queue. Segments
     * are only removed from it once their request has succeeded.
     */
    private _downloadQueue;
    /**
     * Allows to stop listening to queue updates and stop performing requests.
     * Set to `null` if the DownloadingQueue is not started right now.
     */
    private _currentCanceller;
    /**
     * Pending request for the initialization segment.
     * `null` if no request is pending for it.
     */
    private _initSegmentRequest;
    /**
     * Pending request for a media (i.e. non-initialization) segment.
     * `null` if no request is pending for it.
     */
    private _mediaSegmentRequest;
    /** Interface used to load segments. */
    private _segmentFetcher;
    /**
     * Emit the timescale anounced in the initialization segment once parsed.
     * `undefined` when this is not yet known.
     * `null` when no initialization segment or timescale exists.
     */
    private _initSegmentInfoRef;
    /**
     * Some media segment might have been loaded and are only awaiting for the
     * initialization segment to be parsed before being parsed themselves.
     * This string will contain the `id` property of that segment if one exist or
     * `null` if no segment is awaiting an init segment.
     */
    private _mediaSegmentAwaitingInitMetadata;
    /**
     * Create a new `DownloadingQueue`.
     *
     * @param {Object} content - The context of the Representation you want to
     * load segments for.
     * @param {Object} downloadQueue - Queue of segments you want to load.
     * @param {Object} segmentFetcher - Interface to facilitate the download of
     * segments.
     * @param {boolean} hasInitSegment - Declare that an initialization segment
     * will need to be downloaded.
     *
     * A `DownloadingQueue` ALWAYS wait for the initialization segment to be
     * loaded and parsed before parsing a media segment.
     *
     * In cases where no initialization segment exist, this would lead to the
     * `DownloadingQueue` waiting indefinitely for it.
     *
     * By setting that value to `false`, you anounce to the `DownloadingQueue`
     * that it should not wait for an initialization segment before parsing a
     * media segment.
     */
    constructor(content: IDownloadingQueueContext, downloadQueue: IReadOnlySharedReference<IDownloadQueueItem>, segmentFetcher: IPrioritizedSegmentFetcher<T>, hasInitSegment: boolean);
    /**
     * Returns the initialization segment currently being requested.
     * Returns `null` if no initialization segment request is pending.
     * @returns {Object | null}
     */
    getRequestedInitSegment(): ISegment | null;
    /**
     * Returns the media segment currently being requested.
     * Returns `null` if no media segment request is pending.
     * @returns {Object | null}
     */
    getRequestedMediaSegment(): ISegment | null;
    /**
     * Start the current downloading queue, emitting events as it loads and parses
     * initialization and media segments.
     */
    start(): void;
    stop(): void;
    /**
     * Internal logic performing media segment requests.
     */
    private _restartMediaSegmentDownloadingQueue;
    /**
     * Internal logic performing initialization segment requests.
     * @param {Object} queuedInitSegment
     */
    private _restartInitSegmentDownloadingQueue;
}
/**
 * Events sent by the `DownloadingQueue`.
 *
 * The key is the event's name and the value the format of the corresponding
 * event's payload.
 */
export interface IDownloadingQueueEvent<T> {
    /**
     * Notify that the initialization segment has been fully loaded and parsed.
     *
     * You can now push that segment to its corresponding buffer and use its parsed
     * metadata.
     *
     * Only sent if an initialization segment exists (when the `DownloadingQueue`'s
     * `hasInitSegment` constructor option has been set to `true`).
     * In that case, an `IParsedInitSegmentEvent` will always be sent before any
     * `IParsedSegmentEvent` event is sent.
     */
    parsedInitSegment: IParsedInitSegmentPayload<T>;
    /**
     * Notify that a media chunk (decodable sub-part of a media segment) has been
     * loaded and parsed.
     *
     * If an initialization segment exists (when the `DownloadingQueue`'s
     * `hasInitSegment` constructor option has been set to `true`), an
     * `IParsedSegmentEvent` will always be sent AFTER the `IParsedInitSegmentEvent`
     * event.
     *
     * It can now be pushed to its corresponding buffer. Note that there might be
     * multiple `IParsedSegmentEvent` for a single segment, if that segment is
     * divided into multiple decodable chunks.
     * You will know that all `IParsedSegmentEvent` have been loaded for a given
     * segment once you received the corresponding event.
     */
    parsedMediaSegment: IParsedSegmentPayload<T>;
    /** Notify that a media or initialization segment has been fully-loaded. */
    fullyLoadedSegment: ISegment;
    /**
     * Notify that a media or initialization segment request is retried.
     * This happened most likely because of an HTTP error.
     */
    requestRetry: IRequestRetryPayload;
    /**
     * Notify that the media segment queue is now empty.
     * This can be used to re-check if any segment are now needed.
     */
    emptyQueue: null;
    /**
     * Notify that a fatal error happened (such as request failures), which has
     * completely stopped the downloading queue.
     *
     * You may still restart the queue after receiving this event.
     */
    error: unknown;
}
/** Payload for a `parsedInitSegment` event. */
export type IParsedInitSegmentPayload<T> = ISegmentParserParsedInitChunk<T> & {
    segment: ISegment;
};
/** Payload for a `parsedMediaSegment` event. */
export type IParsedSegmentPayload<T> = ISegmentParserParsedMediaChunk<T> & {
    segment: ISegment;
};
/** Payload for a `requestRetry` event. */
export interface IRequestRetryPayload {
    segment: ISegment;
    error: IPlayerError;
}
/**
 * Structure of the object that has to be emitted through the `downloadQueue`
 * shared reference, to signal which segments are currently needed.
 */
export interface IDownloadQueueItem {
    /**
     * A potential initialization segment that needs to be loaded and parsed.
     * It will generally be requested in parralel of the first media segments.
     *
     * Can be set to `null` if you don't need to load the initialization segment
     * for now.
     *
     * If the `DownloadingQueue`'s `hasInitSegment` constructor option has been
     * set to `true`, no media segment will be parsed before the initialization
     * segment has been loaded and parsed.
     */
    initSegment: IQueuedSegment | null;
    /**
     * The queue of media segments currently needed for download.
     *
     * Those will be loaded from the first element in that queue to the last
     * element in it.
     *
     * Note that any media segments in the segment queue will only be parsed once
     * either of these is true:
     *   - An initialization segment has been loaded and parsed by this
     *     `DownloadingQueue` instance.
     *   - The `DownloadingQueue`'s `hasInitSegment` constructor option has been
     *     set to `false`.
     */
    segmentQueue: IQueuedSegment[];
}
/** Context for segments downloaded through the DownloadingQueue. */
export interface IDownloadingQueueContext {
    /** Adaptation linked to the segments you want to load. */
    adaptation: IAdaptation;
    /** Manifest linked to the segments you want to load. */
    manifest: IManifest;
    /** Period linked to the segments you want to load. */
    period: IPeriod;
    /** Representation linked to the segments you want to load. */
    representation: IRepresentation;
}
