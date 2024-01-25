import features from "../../../features";
import log from "../../../log";
import type {
  IManifest,
  IManifestMetadata } from "../../../manifest";
import {
  createRepresentationFilterFromFnString,
} from "../../../manifest";
import type { IMediaSourceInterface } from "../../../mse";
import MainMediaSourceInterface from "../../../mse/main_media_source_interface";
import WorkerMediaSourceInterface from "../../../mse/worker_media_source_interface";
import type {
  IAttachMediaSourceWorkerMessagePayload,
  IContentInitializationData } from "../../../multithread_types";
import {
  WorkerMessageType,
} from "../../../multithread_types";
import type { IPlayerError } from "../../../public_types";
import assert from "../../../utils/assert";
import idGenerator from "../../../utils/id_generator";
import objectAssign from "../../../utils/object_assign";
import type {
  CancellationError,
  CancellationSignal,
} from "../../../utils/task_canceller";
import TaskCanceller from "../../../utils/task_canceller";
import type {
  IRepresentationEstimator,
} from "../../adaptive";
import createAdaptiveRepresentationSelector from "../../adaptive";
import type {
  IManifestRefreshSettings } from "../../fetchers";
import {
  ManifestFetcher,
  SegmentFetcherCreator,
} from "../../fetchers";
import SegmentSinksStore from "../../segment_sinks";
import type { INeedsMediaSourceReloadPayload } from "../../stream";
import DecipherabilityFreezeDetector from "../utils/DecipherabilityFreezeDetector";
import {
  limitVideoResolution,
  throttleVideoBitrate,
} from "./globals";
import sendMessage, {
  formatErrorForSender,
} from "./send_message";
import TrackChoiceSetter from "./track_choice_setter";
import WorkerTextDisplayerInterface from "./worker_text_displayer_interface";

const generateMediaSourceId = idGenerator();

export default class ContentPreparer {
  private _currentContent : IPreparedContentData | null;
  private _currentMediaSourceCanceller : TaskCanceller;
  private _contentCanceller : TaskCanceller;

  /** @see constructor */
  private _hasMseInWorker : boolean;

  /** @see constructor */
  private _hasVideo : boolean;

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
  constructor({ hasMseInWorker, hasVideo }: {
    hasMseInWorker: boolean;
    hasVideo: boolean;
  }) {
    this._currentContent = null;
    this._currentMediaSourceCanceller = new TaskCanceller();
    this._hasVideo = hasVideo;
    this._hasMseInWorker = hasMseInWorker;
    const contentCanceller = new TaskCanceller();
    this._contentCanceller = contentCanceller;
  }

  public initializeNewContent(
    context : IContentInitializationData
  ) : Promise<IManifestMetadata> {
    return new Promise((res, rej) => {
      this.disposeCurrentContent();
      const contentCanceller = this._contentCanceller;
      const currentMediaSourceCanceller = new TaskCanceller();
      this._currentMediaSourceCanceller = currentMediaSourceCanceller;

      currentMediaSourceCanceller.linkToSignal(contentCanceller.signal);

      const { contentId,
              url,
              hasText,
              transportOptions } = context;
      let manifest : IManifest | null = null;

      // TODO better way
      assert(
        features.transports.dash !== undefined,
        "Multithread RxPlayer should have access to the DASH feature"
      );
      const representationFilter =
        typeof transportOptions.representationFilter === "string" ?
          createRepresentationFilterFromFnString(transportOptions.representationFilter) :
        undefined;
      const dashPipelines = features.transports.dash({
        ...transportOptions,
        representationFilter,
      });
      const manifestFetcher = new ManifestFetcher(
        url === undefined ? undefined : [url],
        dashPipelines,
        context.manifestRetryOptions);
      const representationEstimator = createAdaptiveRepresentationSelector({
        initialBitrates: {
          audio: context.initialAudioBitrate ?? 0,
          video: context.initialVideoBitrate ?? 0,
        },
        lowLatencyMode: transportOptions.lowLatencyMode,
        throttlers: {
          limitResolution: { video: limitVideoResolution },
          throttleBitrate: { video: throttleVideoBitrate },
        },
      });

      const unbindRejectOnCancellation = currentMediaSourceCanceller.signal
        .register((error: CancellationError) => {
          rej(error);
        });

      const segmentFetcherCreator = new SegmentFetcherCreator(
        dashPipelines,
        context.segmentRetryOptions,
        contentCanceller.signal);

      const trackChoiceSetter = new TrackChoiceSetter();

      const [
        mediaSource,
        segmentSinksStore,
        workerTextSender,
      ] = createMediaSourceAndBuffersStore(contentId, {
        hasMseInWorker: this._hasMseInWorker,
        hasVideo: this._hasVideo,
        hasText,
      }, currentMediaSourceCanceller.signal);
      const decipherabilityFreezeDetector = new DecipherabilityFreezeDetector(
        segmentSinksStore
      );
      this._currentContent = { contentId,
                               decipherabilityFreezeDetector,
                               mediaSource,
                               manifest: null,
                               manifestFetcher,
                               representationEstimator,
                               segmentSinksStore,
                               segmentFetcherCreator,
                               workerTextSender,
                               trackChoiceSetter };
      mediaSource.addEventListener("mediaSourceOpen", function () {
        checkIfReadyAndValidate();
      }, currentMediaSourceCanceller.signal);

      contentCanceller.signal.register(() => {
        manifestFetcher.dispose();
      });
      manifestFetcher.addEventListener("warning", (err : IPlayerError) => {
        sendMessage({ type: WorkerMessageType.Warning,
                      contentId,
                      value: formatErrorForSender(err) });
      }, contentCanceller.signal);
      manifestFetcher.addEventListener("manifestReady", (man : IManifest) => {
        if (manifest !== null) {
          log.warn("WP: Multiple `manifestReady` events, ignoring");
          return;
        }
        manifest = man;
        if (this._currentContent !== null) {
          this._currentContent.manifest = manifest;
        }
        checkIfReadyAndValidate();
      }, currentMediaSourceCanceller.signal);
      manifestFetcher.addEventListener("error", (err : unknown) => {
        rej(err);
      }, contentCanceller.signal);
      manifestFetcher.start();

      function checkIfReadyAndValidate() {
        if (
          manifest === null ||
          mediaSource.readyState === "closed"  ||
          currentMediaSourceCanceller.isUsed()
        ) {
          return;
        }

        const sentManifest = manifest.getMetadataSnapshot();
        manifest.addEventListener("manifestUpdate", (updates) => {
          if (manifest === null) {
            // TODO log warn?
            return;
          }

          // Remove `periods` key to reduce cost of an unnecessary manifest
          // clone.
          const snapshot = objectAssign(manifest.getMetadataSnapshot(),
                                        { periods: [] });
          sendMessage({
            type: WorkerMessageType.ManifestUpdate,
            contentId,
            value: { manifest: snapshot, updates },
          });
        }, contentCanceller.signal);
        unbindRejectOnCancellation();
        res(sentManifest);
      }
    });
  }

  public getCurrentContent() : IPreparedContentData | null {
    return this._currentContent;
  }

  public scheduleManifestRefresh(settings : IManifestRefreshSettings): void {
    this._currentContent?.manifestFetcher.scheduleManualRefresh(settings);
  }

  public reloadMediaSource(
    reloadInfo: INeedsMediaSourceReloadPayload
  ): Promise<void> {
    this._currentMediaSourceCanceller.cancel();
    if (this._currentContent === null) {
      return Promise.reject(new Error("CP: No content anymore"));
    }
    this._currentContent.trackChoiceSetter.reset();
    this._currentMediaSourceCanceller = new TaskCanceller();

    sendMessage({
      type: WorkerMessageType.ReloadingMediaSource,
      contentId: this._currentContent.contentId,
      value: reloadInfo,
    }, []);

    const [
      mediaSource,
      segmentSinksStore,
      workerTextSender,
    ] = createMediaSourceAndBuffersStore(this._currentContent.contentId, {
      hasMseInWorker: this._hasMseInWorker,
      hasVideo: this._hasVideo,
      hasText: this._currentContent.workerTextSender !== null,
    }, this._currentMediaSourceCanceller.signal);
    this._currentContent.mediaSource = mediaSource;
    this._currentContent.segmentSinksStore = segmentSinksStore;
    this._currentContent.workerTextSender = workerTextSender;
    return new Promise((res, rej) => {
      mediaSource.addEventListener("mediaSourceOpen", function () {
        res();
      }, this._currentMediaSourceCanceller.signal);
      mediaSource.addEventListener("mediaSourceClose", function () {
        rej(new Error("MediaSource ReadyState changed to close during init."));
      }, this._currentMediaSourceCanceller.signal);
      this._currentMediaSourceCanceller.signal.register((error) => {
        rej(error);
      });
    });
  }

  public disposeCurrentContent() {
    this._contentCanceller.cancel();
    this._contentCanceller = new TaskCanceller();
  }
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
  contentId : string;
  /**
   * Interface to the MediaSource implementation, allowing to buffer audio
   * and video media segments.
   */
  mediaSource : IMediaSourceInterface;
  /** Class abstracting Manifest fetching and refreshing. */
  manifestFetcher : ManifestFetcher;
  /**
   * Manifest instance.
   *
   * `null` when not fetched yet.
   */
  manifest : IManifest | null;
  /**
   * Specific module detecting freezing issues due to lower-level
   * decipherability-related bugs.
   */
  decipherabilityFreezeDetector : DecipherabilityFreezeDetector;
  /**
   * Perform the adaptive logic, allowing to choose the best Representation for
   * the different types of media to load.
   */
  representationEstimator : IRepresentationEstimator;
  /**
   * Allows to create a "SegmentSink" (powerful abstraction over media
   * buffering API) for each type of media.
   */
  segmentSinksStore : SegmentSinksStore;
  /** Allows to send timed text media data so it can be rendered. */
  workerTextSender : WorkerTextDisplayerInterface | null;
  /**
   * Allows to create `SegmentFetcher` which simplifies complex media segment
   * fetching.
   */
  segmentFetcherCreator : SegmentFetcherCreator;
  /**
   * Allows to store and update the wanted tracks and Representation inside that
   * track.
   */
  trackChoiceSetter : TrackChoiceSetter;
}

/**
 * @param {string} contentId
 * @param {Object} capabilities
 * @param {boolean} capabilities.hasMseInWorker
 * @param {boolean} capabilities.hasVideo
 * @param {boolean} capabilities.hasText
 * @param {Object} cancelSignal
 * @returns {Array.<Object>}
 */
function createMediaSourceAndBuffersStore(
  contentId: string,
  capabilities: {
    hasMseInWorker: boolean;
    hasVideo: boolean;
    hasText: boolean;
  },
  cancelSignal: CancellationSignal
): [IMediaSourceInterface, SegmentSinksStore, WorkerTextDisplayerInterface | null] {
  let mediaSource: IMediaSourceInterface;
  if (capabilities.hasMseInWorker) {
    const mainMediaSource = new MainMediaSourceInterface(
      generateMediaSourceId()
    );
    mediaSource = mainMediaSource;

    let sentMediaSourceLink : IAttachMediaSourceWorkerMessagePayload;
    const handle = mainMediaSource.handle;
    if (handle.type === "handle") {
      sentMediaSourceLink = { type: "handle" as const,
                              value: handle.value };
    } else {
      const url = URL.createObjectURL(handle.value);
      sentMediaSourceLink = { type: "url" as const,
                              value: url };
      cancelSignal.register(() => {
        URL.revokeObjectURL(url);
      });
    }

    sendMessage({
      type: WorkerMessageType.AttachMediaSource,
      contentId,
      value: sentMediaSourceLink,
      mediaSourceId: mediaSource.id,
    }, [handle.value as unknown as Transferable]);
  } else {
    mediaSource = new WorkerMediaSourceInterface(generateMediaSourceId(),
                                                 contentId,
                                                 sendMessage);
  }

  const textSender = capabilities.hasText ?
    new WorkerTextDisplayerInterface(contentId, sendMessage) :
    null;
  const { hasVideo } = capabilities;
  const segmentSinksStore = new SegmentSinksStore(mediaSource, hasVideo, textSender);
  cancelSignal.register(() => {
    segmentSinksStore.disposeAll();
    textSender?.stop();
    mediaSource.dispose();
  });

  return [mediaSource, segmentSinksStore, textSender];
}
