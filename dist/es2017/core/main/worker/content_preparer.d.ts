import type { IManifest, IManifestMetadata } from "../../../manifest";
import type { IMediaSourceInterface } from "../../../mse";
import type { IContentInitializationData } from "../../../multithread_types";
import type { IRepresentationEstimator } from "../../adaptive";
import type { IManifestRefreshSettings } from "../../fetchers";
import { ManifestFetcher, SegmentFetcherCreator } from "../../fetchers";
import SegmentSinksStore from "../../segment_sinks";
import type { INeedsMediaSourceReloadPayload } from "../../stream";
import DecipherabilityFreezeDetector from "../common/DecipherabilityFreezeDetector";
import TrackChoiceSetter from "./track_choice_setter";
import WorkerTextDisplayerInterface from "./worker_text_displayer_interface";
export default class ContentPreparer {
    private _currentContent;
    private _currentMediaSourceCanceller;
    private _contentCanceller;
    /** @see constructor */
    private _hasMseInWorker;
    /** @see constructor */
    private _hasVideo;
    /**
     * @param {Object} capabilities
     * @param {boolean} capabilities.hasMseInWorker - If `true`, the current
     * environment has access to MediaSource API in a WebWorker context (so,
     * here).
     * If `false`, we have to go through the main thread to rely on all MSE API.
     * @param {boolean} capabilities.hasVideo - If `true`, we're playing on an
     * element which has video capabilities.
     * If `false`, we're only able to play audio, optionally with subtitles.
     *
     * Typically this boolean is `true` for `<video>` HTMLElement and `false` for
     * `<audio>` HTMLElement.
     */
    constructor({ hasMseInWorker, hasVideo, }: {
        hasMseInWorker: boolean;
        hasVideo: boolean;
    });
    initializeNewContent(context: IContentInitializationData): Promise<IManifestMetadata>;
    getCurrentContent(): IPreparedContentData | null;
    scheduleManifestRefresh(settings: IManifestRefreshSettings): void;
    reloadMediaSource(reloadInfo: INeedsMediaSourceReloadPayload): Promise<void>;
    disposeCurrentContent(): void;
}
/**
 * Modules and Metadata associated to the current "prepared" content.
 */
export interface IPreparedContentData {
    /**
     * Identifier uniquely identifying a specific content.
     *
     * Protects against all kind of race conditions or asynchronous issues.
     */
    contentId: string;
    /**
     * Interface to the MediaSource implementation, allowing to buffer audio
     * and video media segments.
     */
    mediaSource: IMediaSourceInterface;
    /** Class abstracting Manifest fetching and refreshing. */
    manifestFetcher: ManifestFetcher;
    /**
     * Manifest instance.
     *
     * `null` when not fetched yet.
     */
    manifest: IManifest | null;
    /**
     * Specific module detecting freezing issues due to lower-level
     * decipherability-related bugs.
     */
    decipherabilityFreezeDetector: DecipherabilityFreezeDetector;
    /**
     * Perform the adaptive logic, allowing to choose the best Representation for
     * the different types of media to load.
     */
    representationEstimator: IRepresentationEstimator;
    /**
     * Allows to create a "SegmentSink" (powerful abstraction over media
     * buffering API) for each type of media.
     */
    segmentSinksStore: SegmentSinksStore;
    /** Allows to send timed text media data so it can be rendered. */
    workerTextSender: WorkerTextDisplayerInterface | null;
    /**
     * Allows to create `SegmentFetcher` which simplifies complex media segment
     * fetching.
     */
    segmentFetcherCreator: SegmentFetcherCreator;
    /**
     * Allows to store and update the wanted tracks and Representation inside that
     * track.
     */
    trackChoiceSetter: TrackChoiceSetter;
}
//# sourceMappingURL=content_preparer.d.ts.map