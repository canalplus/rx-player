import features from "../../../features";
import log from "../../../log";
import type { IManifest } from "../../../manifest";
import { createRepresentationFilterFromFnString } from "../../../manifest";
import type { IMediaSourceInterface } from "../../../mse";
import MainMediaSourceInterface from "../../../mse/main_media_source_interface";
import WorkerMediaSourceInterface from "../../../mse/worker_media_source_interface";
import type {
  IAttachMediaSourceWorkerMessagePayload,
  IContentInitializationData,
  IWorkerMessage,
} from "../../../multithread_types";
import { WorkerMessageType } from "../../../multithread_types";
import type { IPlayerError } from "../../../public_types";
import idGenerator from "../../../utils/id_generator";
import type {
  CancellationError,
  CancellationSignal,
} from "../../../utils/task_canceller";
import TaskCanceller from "../../../utils/task_canceller";
import type { IRepresentationEstimator } from "../../adaptive";
import createAdaptiveRepresentationSelector from "../../adaptive";
import type { IRepresentationEstimatorThrottlers } from "../../adaptive/adaptive_representation_selector";
import CmcdDataBuilder from "../../cmcd";
import type { IManifestRefreshSettings } from "../../fetchers";
import { ManifestFetcher, SegmentQueueCreator } from "../../fetchers";
import SegmentSinksStore from "../../segment_sinks";
import type { INeedsMediaSourceReloadPayload } from "../../stream";
import DecipherabilityFreezeDetector from "../common/DecipherabilityFreezeDetector";
import TrackChoiceSetter from "./track_choice_setter";
import { formatErrorForSender } from "./utils";
import WorkerTextDisplayerInterface from "./worker_text_displayer_interface";

/** Function allowing to associate a unique identifier to all created `MediaSource` */
const generateMediaSourceId = idGenerator();

/**
 * Class facilitating the workflows behind loading a new content for the
 * RxPlayer Core:
 *
 *   - Handle Manifest fetching and Manifest updates.
 *
 *   - Handle the `MediaSource`'s creation and indirectly of its `SourceBuffer`s
 *     as well as handling "MediaSource reloading".
 *
 *   - initialize various modules (`segmentQueueCreator`, CmcdDataBuilder`,
 *     `RepresentationEstimator`) linked to the initialized content.
 *
 * You can start loading a content through the `initializeNewContent` method.
 *
 * When a content is linked to the `ContentPreparer` you can inspect the
 * different initialized modules by calling its `getCurrentContent` method.
 *
 * @class ContentPreparer
 */
export default class ContentPreparer {
  /**
   * Information on the content linked to that `ContentPreparer` through its
   * `initializeNewContent` method.
   * `null` if no content is initialized.
   */
  private _currentContent: IPreparedContentData | null;
  /**
   * TaskCanceller which is triggered when the currently-initialized content is
   * not needed anymore, because we stopped it since or switched to a new content.
   */
  private _contentCanceller: TaskCanceller;
  /**
   * TaskCanceller which is triggered when the currently-created MediaSource is
   * not needed anymore, either because the content has changed or because we
   * had to reload.
   */
  private _currentMediaSourceCanceller: TaskCanceller;

  /** @see constructor */
  private _hasMseInWorker: boolean;

  /** @see constructor */
  private _hasVideo: boolean;

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
  constructor({
    hasMseInWorker,
    hasVideo,
  }: {
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

  /**
   * Start fetching the wanted content's Manifest and initializing the various
   * modules stored by the `ContentPreparer` linked to that content.
   *
   * The returned Promise resolves with the parsed Manifest when those modules
   * are all ready and you can thus begin to load the content.
   *
   * Reject if it failed to do so.
   * NOTE: The `MediaSource` which will allow to actually play the content on
   * screen is not yet created here, media stored by the linked
   * `SegmentSinksStore` will first begin to be stored in-memory until the
   * `attachMediaSource` method is called.
   *
   * @param {Function} sendMessage
   * @param {Object} context - Information on the content that should be
   * initialized.
   * @param {Object} throttlers
   * @returns {Promise.<Object>}
   */
  public initializeNewContent(
    sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
    context: IContentInitializationData,
    /** Allows to filter which Representations can be choosen. */
    throttlers: IRepresentationEstimatorThrottlers,
  ): Promise<IManifest> {
    return new Promise((res, rej) => {
      this.disposeCurrentContent();
      const contentCanceller = this._contentCanceller;
      const currentMediaSourceCanceller = new TaskCanceller();
      this._currentMediaSourceCanceller = currentMediaSourceCanceller;

      currentMediaSourceCanceller.linkToSignal(contentCanceller.signal);

      const { contentId, url, hasText, transport, transportOptions } = context;
      const transportFn = features.transports[transport];
      if (typeof transportFn !== "function") {
        rej(
          new Error(
            `transport "${transport}" not supported. ` +
              "Did you add the corresponding feature?",
          ),
        );
        return;
      }
      const representationFilter =
        typeof transportOptions.representationFilter === "string"
          ? createRepresentationFilterFromFnString(transportOptions.representationFilter)
          : transportOptions.representationFilter;
      const transportPipelines = transportFn({
        ...transportOptions,
        representationFilter,
      });

      const cmcdDataBuilder =
        context.cmcd === undefined ? null : new CmcdDataBuilder(context.cmcd);
      const manifestFetcher = new ManifestFetcher(
        url === undefined ? undefined : [url],
        transportPipelines,
        {
          cmcdDataBuilder,
          ...context.manifestRetryOptions,
        },
      );
      const representationEstimator = createAdaptiveRepresentationSelector({
        initialBitrates: {
          audio: context.initialAudioBitrate ?? 0,
          video: context.initialVideoBitrate ?? 0,
        },
        lowLatencyMode: transportOptions.lowLatencyMode,
        throttlers,
      });

      const unbindRejectOnCancellation = currentMediaSourceCanceller.signal.register(
        (error: CancellationError) => {
          rej(error);
        },
      );

      const segmentQueueCreator = new SegmentQueueCreator(
        transportPipelines,
        cmcdDataBuilder,
        context.segmentRetryOptions,
        contentCanceller.signal,
      );

      const trackChoiceSetter = new TrackChoiceSetter();

      const [segmentSinksStore, workerTextSender] = createSegmentSinksStore(
        sendMessage,
        contentId,
        {
          hasVideo: this._hasVideo,
          hasText,
        },
        currentMediaSourceCanceller.signal,
      );
      const decipherabilityFreezeDetector = new DecipherabilityFreezeDetector(
        segmentSinksStore,
      );
      const currentContent: IPreparedContentData = {
        cmcdDataBuilder,
        contentId,
        decipherabilityFreezeDetector,
        mediaSource: null,
        manifest: null,
        manifestFetcher,
        representationEstimator,
        segmentSinksStore,
        segmentQueueCreator,
        workerTextSender,
        trackChoiceSetter,
      };
      this._currentContent = currentContent;

      contentCanceller.signal.register(() => {
        manifestFetcher.dispose();
      });
      manifestFetcher.addEventListener(
        "warning",
        (err: IPlayerError) => {
          sendMessage({
            type: WorkerMessageType.Warning,
            contentId,
            value: formatErrorForSender(err),
          });
        },
        contentCanceller.signal,
      );
      manifestFetcher.addEventListener(
        "manifestReady",
        resolveWithManifest,
        contentCanceller.signal,
      );
      manifestFetcher.addEventListener(
        "error",
        (err: unknown) => {
          rej(err);
        },
        contentCanceller.signal,
      );
      manifestFetcher.start();

      function resolveWithManifest(manifest: IManifest) {
        if (contentCanceller.isUsed()) {
          return;
        }
        currentContent.manifest = manifest;
        manifest.addEventListener(
          "manifestUpdate",
          (updates) => {
            if (manifest === null) {
              // TODO log warn?
              return;
            }
            sendMessage({
              type: WorkerMessageType.ManifestUpdate,
              contentId,
              value: { manifest, updates },
            });
          },
          contentCanceller.signal,
        );
        unbindRejectOnCancellation();
        res(manifest);
      }
    });
  }

  /**
   * Get information on the current content prepared through the
   * `initializeNewContent` method, or `null` if no content is currently
   * prepared.
   * @returns {Object|null}
   */
  public getCurrentContent(): IPreparedContentData | null {
    return this._currentContent;
  }

  /**
   * Actually `attach` a `MediaSource` for the content currently prepared through
   * the `initializeNewContent` method (it didn't have to resolve yet).
   *
   * This allows to actually push media data to the media element on the page
   * instead of in-memory.
   *
   * Note that calling `attachMediaSource` despite already having a `MediaSource`
   * attached will lead to Promise rejection, as well as calling
   * `attachMediaSource` despite having no current content prepared.
   * @param {Function} sendMessage
   * @returns {Promise}
   */
  public attachMediaSource(
    sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
  ): Promise<unknown> {
    const currentContent = this._currentContent;
    if (currentContent === null) {
      log.error("WP: Attaching MediaSource despite having no content. Aborting...");
      return Promise.reject(new Error("Cannot Attach MediaSource: No content pending"));
    }
    if (currentContent.mediaSource !== null) {
      log.error("WP: Attaching MediaSource despite already having one. Aborting...");
      return Promise.reject(new Error("Cannot Attach MediaSource: Already have one"));
    }
    const currentMediaSourceCanceller = this._currentMediaSourceCanceller;
    const mediaSourceInterface = createMediaSourceInterface(
      sendMessage,
      currentContent.contentId,
      this._hasMseInWorker,
      this._currentMediaSourceCanceller.signal,
    );
    currentContent.mediaSource = mediaSourceInterface;
    return new Promise((res, rej) => {
      currentMediaSourceCanceller.signal.register(onCancellation);
      mediaSourceInterface.addEventListener(
        "mediaSourceOpen",
        () => {
          currentMediaSourceCanceller.signal.deregister(onCancellation);
          if (currentMediaSourceCanceller.signal.isCancelled()) {
            return;
          }
          currentContent.segmentSinksStore
            .attachOpenedMediaSource(mediaSourceInterface)
            .then(res, rej);
        },
        currentMediaSourceCanceller.signal,
      );
      function onCancellation(err: CancellationError) {
        rej(err);
      }
    });
  }

  /**
   * Schedule an update for the Manifest file,
   *
   * Do nothing if no content is currently prepared.
   * @param {Object} settings - Various settings to configure the ways and
   * moment at which the Manifest will be refreshed.
   */
  public scheduleManifestRefresh(settings: IManifestRefreshSettings): void {
    this._currentContent?.manifestFetcher.scheduleManualRefresh(settings);
  }

  /**
   * If there is a prepared content right now, performs the destructive
   * "reloading" strategy:
   *
   *   - If there's a `MediaSource` right now, dispose of it (and of its
   *   `SourceBuffer`) and recreate one.
   *
   *   - If there's no `MediaSource` yet, just empty all `SegmentSink` linked
   *     to that content.
   *
   * The returned Promise resolves when it restarts being ready.
   * @param {Function} sendMessage
   * @param {Object} reloadInfo
   * @returns {Promise}
   */
  public reloadMediaSource(
    sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
    reloadInfo: INeedsMediaSourceReloadPayload,
  ): Promise<unknown> {
    const currentContent = this._currentContent;
    if (currentContent === null) {
      return Promise.reject(new Error("CP: No content anymore"));
    }
    if (currentContent.mediaSource === null) {
      // No media source: Just empty initialized SegmentSinks
      const proms: Array<Promise<unknown>> = [];
      currentContent.segmentSinksStore.getBufferTypes().forEach((bufferType) => {
        const sinkStatus = currentContent.segmentSinksStore.getStatus(bufferType);
        if (sinkStatus.type === "initialized") {
          proms.push(sinkStatus.value.removeBuffer(0, Infinity));
        }
      });
      return Promise.all(proms);
    } else {
      // With a `MediaSource`: Re-create the `MediaSource` and associated
      // `SegmentSinksStore`
      this._currentMediaSourceCanceller.cancel();
      currentContent.trackChoiceSetter.reset();
      this._currentMediaSourceCanceller = new TaskCanceller();

      sendMessage(
        {
          type: WorkerMessageType.ReloadingMediaSource,
          contentId: currentContent.contentId,
          value: reloadInfo,
        },
        [],
      );

      const [segmentSinksStore, workerTextSender] = createSegmentSinksStore(
        sendMessage,
        currentContent.contentId,
        {
          hasVideo: this._hasVideo,
          hasText: currentContent.workerTextSender !== null,
        },
        this._currentMediaSourceCanceller.signal,
      );

      const mediaSourceInterface = createMediaSourceInterface(
        sendMessage,
        currentContent.contentId,
        this._hasMseInWorker,
        this._currentMediaSourceCanceller.signal,
      );
      currentContent.mediaSource = mediaSourceInterface;
      currentContent.segmentSinksStore = segmentSinksStore;
      currentContent.workerTextSender = workerTextSender;
      return new Promise((res, rej) => {
        mediaSourceInterface.addEventListener(
          "mediaSourceOpen",
          function () {
            res(undefined);
          },
          this._currentMediaSourceCanceller.signal,
        );
        mediaSourceInterface.addEventListener(
          "mediaSourceClose",
          function () {
            rej(new Error("MediaSource ReadyState changed to close during init."));
          },
          this._currentMediaSourceCanceller.signal,
        );
        this._currentMediaSourceCanceller.signal.register((error) => {
          rej(error);
        });
      });
    }
  }

  /**
   * Dispose all resources linked to the currently preopared content if one and
   * stop linking it to this `ContentPreparer`.
   */
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
  contentId: string;
  /**
   * Perform data collection and retrieval for the "Common Media Client Data"
   * scheme, which is a specification allowing to communicate about playback
   * conditions with a CDN.
   */
  cmcdDataBuilder: CmcdDataBuilder | null;
  /**
   * Interface to the MediaSource implementation, allowing to buffer audio
   * and video media segments.
   */
  mediaSource: IMediaSourceInterface | null;
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
   * Allows to create `SegmentQueue` which simplifies complex media segment
   * fetching.
   */
  segmentQueueCreator: SegmentQueueCreator;
  /**
   * Allows to store and update the wanted tracks and Representation inside that
   * track.
   */
  trackChoiceSetter: TrackChoiceSetter;
}

/**
 * @param {Function} sendMessage
 * @param {string} contentId
 * @param {boolean} hasMseInWorker
 * @param {Object} cancelSignal
 * @returns {Object}
 */
function createMediaSourceInterface(
  sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
  contentId: string,
  hasMseInWorker: boolean,
  cancelSignal: CancellationSignal,
): IMediaSourceInterface {
  let mediaSourceInterface: IMediaSourceInterface;
  if (hasMseInWorker) {
    const mainMediaSource = new MainMediaSourceInterface(generateMediaSourceId());
    mediaSourceInterface = mainMediaSource;

    let sentMediaSourceLink: IAttachMediaSourceWorkerMessagePayload;
    const handle = mainMediaSource.handle;
    if (handle.type === "handle") {
      sentMediaSourceLink = { type: "handle" as const, value: handle.value };
    } else {
      const url = URL.createObjectURL(handle.value);
      sentMediaSourceLink = { type: "url" as const, value: url };
      cancelSignal.register(() => {
        URL.revokeObjectURL(url);
      });
    }

    sendMessage(
      {
        type: WorkerMessageType.AttachMediaSource,
        contentId,
        value: sentMediaSourceLink,
        mediaSourceId: mediaSourceInterface.id,
      },
      [handle.value as unknown as Transferable],
    );
  } else {
    mediaSourceInterface = new WorkerMediaSourceInterface(
      generateMediaSourceId(),
      contentId,
      sendMessage,
    );
  }
  cancelSignal.register(() => {
    mediaSourceInterface.dispose();
  });
  return mediaSourceInterface;
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
function createSegmentSinksStore(
  sendMessage: (msg: IWorkerMessage, transferables?: Transferable[]) => void,
  contentId: string,
  capabilities: {
    hasVideo: boolean;
    hasText: boolean;
  },
  cancelSignal: CancellationSignal,
): [SegmentSinksStore, WorkerTextDisplayerInterface | null] {
  const textSender = capabilities.hasText
    ? new WorkerTextDisplayerInterface(contentId, sendMessage)
    : null;
  const { hasVideo } = capabilities;
  const segmentSinksStore = new SegmentSinksStore(null, hasVideo, textSender);
  cancelSignal.register(() => {
    segmentSinksStore.disposeAll();
    textSender?.stop();
  });

  return [segmentSinksStore, textSender];
}
