import BROWSER_GLOBALS from "../../compat/browser_compatibility_types.ts";
import features from "../../features/index.ts";
import log from "../../log.ts";
import type { IContentInitializationData } from "../../main_thread/types.ts";
import type { IManifest } from "../../manifest/index.ts";
import type { IMediaSourceInterface } from "../../mse/index.ts";
import MainMediaSourceInterface from "../../mse/main_media_source_interface.ts";
import WorkerMediaSourceInterface from "../../mse/worker_media_source_interface.ts";
import type { IPlayerError } from "../../public_types.ts";
import idGenerator from "../../utils/id_generator.ts";
import type {
  CancellationError,
  CancellationSignal,
} from "../../utils/task_canceller.ts";
import TaskCanceller from "../../utils/task_canceller.ts";
import type { IRepresentationEstimatorThrottlers } from "../adaptive/adaptive_representation_selector.ts";
import type { IRepresentationEstimator } from "../adaptive/index.ts";
import createAdaptiveRepresentationSelector from "../adaptive/index.ts";
import CmcdDataBuilder from "../cmcd/index.ts";
import CdnPrioritizer from "../fetchers/cdn_prioritizer.ts";
import type { IManifestRefreshSettings } from "../fetchers/index.ts";
import { ManifestFetcher, SegmentQueueCreator } from "../fetchers/index.ts";
import createThumbnailFetcher from "../fetchers/thumbnails/thumbnail_fetcher.ts";
import type { IThumbnailFetcher } from "../fetchers/thumbnails/thumbnail_fetcher.ts";
import SegmentSinksStore from "../segment_sinks/index.ts";
import type { IAttachMediaSourceCoreMessagePayload, ICoreMessage } from "../types.ts";
import { CoreMessageType } from "../types.ts";
import CoreTextDisplayerInterface from "./core_text_displayer_interface.ts";
import FreezeResolver from "./FreezeResolver.ts";
import TrackChoiceSetter from "./track_choice_setter.ts";
import type { ICorePlugins } from "./utils.ts";
import {
  extractExternalPlugins,
  formatErrorForSender,
  updateCodecSupportInWorkerMode,
} from "./utils.ts";

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

  constructor() {
    this._currentContent = null;
    this._currentMediaSourceCanceller = new TaskCanceller("ContentPreparer MediaSource");
    const contentCanceller = new TaskCanceller("ContentPreparer");
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
   * @param {Object} corePlugins - Callbacks that may have been registered by
   * the application if it loaded the core independently as a worker.
   * @returns {Promise.<Object>}
   */
  public initializeNewContent(
    sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
    context: IContentInitializationData,
    /** Allows to filter which Representations can be choosen. */
    throttlers: IRepresentationEstimatorThrottlers,
    corePlugins: ICorePlugins,
  ): Promise<IManifest> {
    return new Promise((res, rej) => {
      this.disposeCurrentContent("new init");
      const contentCanceller = this._contentCanceller;
      const currentMediaSourceCanceller = new TaskCanceller(
        "ContentPreparer MediaSource",
      );
      this._currentMediaSourceCanceller = currentMediaSourceCanceller;

      currentMediaSourceCanceller.linkToSignal(contentCanceller.signal);

      const {
        contentId,
        url,
        playbackSupport,
        transportOptions,
        enableRepresentationAvoidance,
        transport,
      } = context;
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

      const transportPipelines = transportFn({
        ...transportOptions,
        ...extractExternalPlugins(transportOptions, corePlugins),
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

      const cdnPrioritizer = new CdnPrioritizer(contentCanceller.signal);
      const segmentQueueCreator = new SegmentQueueCreator(
        transportPipelines,
        cdnPrioritizer,
        cmcdDataBuilder,
        context.segmentRetryOptions,
      );
      const fetchThumbnailData = createThumbnailFetcher(
        transportPipelines.thumbnails,
        cdnPrioritizer,
      );

      const trackChoiceSetter = new TrackChoiceSetter();

      const [segmentSinksStore, coreTextSender] = createSegmentSinksStore(
        sendMessage,
        contentId,
        {
          videoTrack: playbackSupport.videoTrack,
          textTrack: playbackSupport.textTrack,
        },
        currentMediaSourceCanceller.signal,
      );
      const freezeResolver = new FreezeResolver(segmentSinksStore);
      const currentContent: IPreparedContentData = {
        cmcdDataBuilder,
        contentId,
        enableRepresentationAvoidance,
        freezeResolver,
        mediaSource: null,
        manifest: null,
        manifestFetcher,
        representationEstimator,
        segmentSinksStore,
        segmentQueueCreator,
        fetchThumbnailData,
        coreTextSender,
        trackChoiceSetter,
        mseInWorker: playbackSupport.mseInWorker,
        videoTrack: playbackSupport.videoTrack,
        textTrack: playbackSupport.textTrack,
      };
      this._currentContent = currentContent;

      contentCanceller.signal.register((err) => {
        manifestFetcher.dispose(err.reason);
      });
      manifestFetcher.addEventListener(
        "warning",
        (err: IPlayerError) => {
          sendMessage({
            type: CoreMessageType.Warning,
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
        updateCodecSupportInWorkerMode(manifest);
        manifest.addEventListener(
          "manifestUpdate",
          (updates) => {
            if (manifest === null) {
              // TODO log warn?
              return;
            }
            sendMessage({
              type: CoreMessageType.ManifestUpdate,
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
    sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
  ): Promise<unknown> {
    const currentContent = this._currentContent;
    if (currentContent === null) {
      log.error("Core", "Attaching MediaSource despite having no content. Aborting...");
      return Promise.reject(new Error("Cannot Attach MediaSource: No content pending"));
    }
    if (currentContent.mediaSource !== null) {
      log.error("Core", "Attaching MediaSource despite already having one. Aborting...");
      return Promise.reject(new Error("Cannot Attach MediaSource: Already have one"));
    }
    const currentMediaSourceCanceller = this._currentMediaSourceCanceller;
    const mediaSourceInterface = createMediaSourceInterface(
      sendMessage,
      currentContent.contentId,
      currentContent.mseInWorker,
      this._currentMediaSourceCanceller.signal,
    );
    currentContent.mediaSource = mediaSourceInterface;

    return new Promise((res, rej) => {
      currentMediaSourceCanceller.signal.register(onCancellation);
      const onMediaSourceOpen = () => {
        mediaSourceInterface.removeEventListener("mediaSourceOpen", onMediaSourceOpen);
        currentMediaSourceCanceller.signal.deregister(onCancellation);
        if (currentMediaSourceCanceller.signal.isCancelled()) {
          return;
        }
        currentContent.segmentSinksStore
          .attachOpenedMediaSource(mediaSourceInterface)
          .then(res, rej);
      };

      if (mediaSourceInterface.readyState === "open") {
        onMediaSourceOpen();
      } else {
        mediaSourceInterface.addEventListener(
          "mediaSourceOpen",
          onMediaSourceOpen,
          currentMediaSourceCanceller.signal,
        );
      }
      function onCancellation(err: CancellationError) {
        mediaSourceInterface.removeEventListener("mediaSourceOpen", onMediaSourceOpen);
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
   * Change the MediaSource attached for the current content.
   * It is assumed that main thread is already notified that such a reload is
   * happening.
   *
   * The returned Promise resolves when it restarts being ready.
   * @param {Function} sendMessage
   * @returns {Promise}
   */
  public reloadMediaSource(
    sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
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
      this._currentMediaSourceCanceller.cancel("Reloading MediaSource");
      currentContent.trackChoiceSetter.reset();
      currentContent.coreTextSender?.stop("ContentPreparer MediaSource reload");
      this._currentMediaSourceCanceller = new TaskCanceller(
        "ContentPreparer MediaSource",
      );
      this._currentMediaSourceCanceller.linkToSignal(this._contentCanceller.signal);

      const [segmentSinksStore, coreTextSender] = createSegmentSinksStore(
        sendMessage,
        currentContent.contentId,
        {
          videoTrack: currentContent.videoTrack,
          textTrack: currentContent.textTrack,
        },
        this._currentMediaSourceCanceller.signal,
      );

      const mediaSourceInterface = createMediaSourceInterface(
        sendMessage,
        currentContent.contentId,
        currentContent.mseInWorker,
        this._currentMediaSourceCanceller.signal,
      );
      currentContent.mediaSource = mediaSourceInterface;
      currentContent.segmentSinksStore = segmentSinksStore;
      currentContent.freezeResolver = new FreezeResolver(segmentSinksStore);
      currentContent.coreTextSender = coreTextSender;
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
   * @param {string | undefined} reason - Human-inspectable reason behind the
   * dispose. Used for debugging matters, especially for debug log
   * inspection.
   */
  public disposeCurrentContent(reason: string | undefined) {
    this._contentCanceller.cancel(reason);
    this._contentCanceller = new TaskCanceller("ContentPreparer");
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
   * If `true`, the RxPlayer can enable its "Representation avoidance"
   * mechanism, where it avoid loading Representation that it suspect
   * have issues being decoded on the current device.
   */
  enableRepresentationAvoidance: boolean;
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
   * Specific module detecting freezing issues and trying to work-around
   * them.
   */
  freezeResolver: FreezeResolver;
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
  coreTextSender: CoreTextDisplayerInterface | null;
  /**
   * Allows to create `SegmentQueue` which simplifies complex media segment
   * fetching.
   */
  segmentQueueCreator: SegmentQueueCreator;
  /** Allows to load image thumbnails. */
  fetchThumbnailData: IThumbnailFetcher;
  /**
   * Allows to store and update the wanted tracks and Representation inside that
   * track.
   */
  trackChoiceSetter: TrackChoiceSetter;
  /**
   * If `true`, MSE API should be used in the core part of the RxPlayer (in the
   * WebWorker).
   * If `false`, they should be relied on on main thread.
   */
  mseInWorker: boolean;
  /**
   * If `true`, the current content should create and use a video buffer.
   * If `false`, only audio should be buffered natively.
   */
  videoTrack: boolean;
  /**
   * If `true`, the current content should create and use text-track handling.
   */
  textTrack: boolean;
}

/**
 * @param {Function} sendMessage
 * @param {string} contentId
 * @param {boolean} mseInWorker
 * @param {Object} cancelSignal
 * @returns {Object}
 */
function createMediaSourceInterface(
  sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
  contentId: string,
  mseInWorker: boolean,
  cancelSignal: CancellationSignal,
): IMediaSourceInterface {
  let mediaSourceInterface: IMediaSourceInterface;
  if (mseInWorker) {
    if (BROWSER_GLOBALS.MediaSource_ === undefined) {
      throw new Error("ContentPreparer: Cannot use MSE-in-Worker: no MSE");
    }
    const mainMediaSource = new MainMediaSourceInterface(
      generateMediaSourceId(),
      BROWSER_GLOBALS.MediaSource_,
    );
    mediaSourceInterface = mainMediaSource;

    let sentMediaSourceLink: IAttachMediaSourceCoreMessagePayload;
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
        type: CoreMessageType.AttachMediaSource,
        contentId,
        value: sentMediaSourceLink,
        mediaSourceId: mediaSourceInterface.id,
      },
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      [handle.value as unknown as Transferable],
    );
  } else {
    mediaSourceInterface = new WorkerMediaSourceInterface(
      generateMediaSourceId(),
      contentId,
      sendMessage,
    );
  }
  cancelSignal.register((err) => {
    mediaSourceInterface.dispose(err.reason);
  });
  return mediaSourceInterface;
}

/**
 * @param {string} contentId
 * @param {Object} playbackSupport
 * @param {boolean} playbackSupport.videoTrack
 * @param {boolean} playbackSupport.textTrack
 * @param {Object} cancelSignal
 * @returns {Array.<Object>}
 */
function createSegmentSinksStore(
  sendMessage: (msg: ICoreMessage, transferables?: Transferable[]) => void,
  contentId: string,
  playbackSupport: {
    videoTrack: boolean;
    textTrack: boolean;
  },
  cancelSignal: CancellationSignal,
): [SegmentSinksStore, CoreTextDisplayerInterface | null] {
  const textSender = playbackSupport.textTrack
    ? new CoreTextDisplayerInterface(contentId, sendMessage)
    : null;
  const { videoTrack } = playbackSupport;
  const segmentSinksStore = new SegmentSinksStore(null, videoTrack, textSender);
  cancelSignal.register((err) => {
    segmentSinksStore.disposeAll(err.reason);
    textSender?.stop(err.reason);
  });

  return [segmentSinksStore, textSender];
}
