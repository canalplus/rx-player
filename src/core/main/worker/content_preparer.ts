import { MediaSource_ } from "../../../compat/browser_compatibility_types";
import features from "../../../features";
import log from "../../../log";
import type { IManifest, IManifestMetadata } from "../../../manifest";
import { createRepresentationFilterFromFnString } from "../../../manifest";
import type Manifest from "../../../manifest/classes";
import type { IMediaSourceInterface } from "../../../mse";
import MainMediaSourceInterface from "../../../mse/main_media_source_interface";
import WorkerMediaSourceInterface from "../../../mse/worker_media_source_interface";
import type {
  IAttachMediaSourceWorkerMessagePayload,
  IContentInitializationData,
} from "../../../multithread_types";
import { WorkerMessageType } from "../../../multithread_types";
import type { IPlayerError } from "../../../public_types";
import assert from "../../../utils/assert";
import idGenerator from "../../../utils/id_generator";
import isNullOrUndefined from "../../../utils/is_null_or_undefined";
import objectAssign from "../../../utils/object_assign";
import type {
  CancellationError,
  CancellationSignal,
} from "../../../utils/task_canceller";
import TaskCanceller from "../../../utils/task_canceller";
import type { IRepresentationEstimator } from "../../adaptive";
import createAdaptiveRepresentationSelector from "../../adaptive";
import CmcdDataBuilder from "../../cmcd";
import type { IManifestRefreshSettings } from "../../fetchers";
import { ManifestFetcher, SegmentQueueCreator } from "../../fetchers";
import CdnPrioritizer from "../../fetchers/cdn_prioritizer";
import createThumbnailFetcher from "../../fetchers/thumbnails/thumbnail_fetcher";
import type { IThumbnailFetcher } from "../../fetchers/thumbnails/thumbnail_fetcher";
import SegmentSinksStore from "../../segment_sinks";
import type { INeedsMediaSourceReloadPayload } from "../../stream";
import FreezeResolver from "../common/FreezeResolver";
import { limitVideoResolution, throttleVideoBitrate } from "./globals";
import sendMessage, { formatErrorForSender } from "./send_message";
import TrackChoiceSetter from "./track_choice_setter";
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
   * @param {Object} context - Information on the content that should be
   * initialized.
   * @returns {Promise.<Object>}
   */
  public initializeNewContent(
    context: IContentInitializationData,
  ): Promise<IManifestMetadata> {
    return new Promise((res, rej) => {
      this.disposeCurrentContent();
      const contentCanceller = this._contentCanceller;
      const currentMediaSourceCanceller = new TaskCanceller();
      this._currentMediaSourceCanceller = currentMediaSourceCanceller;

      currentMediaSourceCanceller.linkToSignal(contentCanceller.signal);

      const { contentId, url, hasText, transportOptions, enableRepresentationAvoidance } =
        context;
      let manifest: IManifest | null = null;

      // TODO better way
      assert(
        features.transports.dash !== undefined,
        "Multithread RxPlayer should have access to the DASH feature",
      );
      const representationFilter =
        typeof transportOptions.representationFilter === "string"
          ? createRepresentationFilterFromFnString(transportOptions.representationFilter)
          : undefined;
      const dashPipelines = features.transports.dash({
        ...transportOptions,
        representationFilter,
      });

      const cmcdDataBuilder =
        context.cmcd === undefined ? null : new CmcdDataBuilder(context.cmcd);
      const manifestFetcher = new ManifestFetcher(
        url === undefined ? undefined : [url],
        dashPipelines,
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
        throttlers: {
          limitResolution: { video: limitVideoResolution },
          throttleBitrate: { video: throttleVideoBitrate },
        },
      });

      const unbindRejectOnCancellation = currentMediaSourceCanceller.signal.register(
        (error: CancellationError) => {
          rej(error);
        },
      );

      const cdnPrioritizer = new CdnPrioritizer(contentCanceller.signal);
      const segmentQueueCreator = new SegmentQueueCreator(
        dashPipelines,
        cdnPrioritizer,
        cmcdDataBuilder,
        context.segmentRetryOptions,
      );
      const fetchThumbnailData = createThumbnailFetcher(
        dashPipelines.thumbnails,
        cdnPrioritizer,
      );

      const trackChoiceSetter = new TrackChoiceSetter();

      const [mediaSource, segmentSinksStore, workerTextSender] =
        createMediaSourceInterfaceAndSegmentSinksStore(
          contentId,
          {
            hasMseInWorker: this._hasMseInWorker,
            hasVideo: this._hasVideo,
            hasText,
          },
          currentMediaSourceCanceller.signal,
        );
      const freezeResolver = new FreezeResolver(segmentSinksStore);
      this._currentContent = {
        cmcdDataBuilder,
        contentId,
        enableRepresentationAvoidance,
        freezeResolver,
        mediaSource,
        manifest: null,
        manifestFetcher,
        representationEstimator,
        segmentSinksStore,
        segmentQueueCreator,
        fetchThumbnailData,
        workerTextSender,
        trackChoiceSetter,
      };
      mediaSource.addEventListener(
        "mediaSourceOpen",
        function () {
          checkIfReadyAndValidate();
        },
        currentMediaSourceCanceller.signal,
      );

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
        (man: IManifest) => {
          if (manifest !== null) {
            log.warn("WP: Multiple `manifestReady` events, ignoring");
            return;
          }
          manifest = man;
          if (this._currentContent !== null) {
            this._currentContent.manifest = manifest;
          }
          checkIfReadyAndValidate();
        },
        currentMediaSourceCanceller.signal,
      );
      manifestFetcher.addEventListener(
        "error",
        (err: unknown) => {
          sendMessage({
            type: WorkerMessageType.Error,
            contentId,
            value: formatErrorForSender(err),
          });
          rej(err);
        },
        contentCanceller.signal,
      );
      manifestFetcher.start();

      function checkIfReadyAndValidate() {
        if (
          manifest === null ||
          mediaSource.readyState === "closed" ||
          currentMediaSourceCanceller.isUsed()
        ) {
          return;
        }
        updateCodecSupportInWorkerMode(manifest);
        const sentManifest = manifest.getMetadataSnapshot();
        manifest.addEventListener(
          "manifestUpdate",
          (updates) => {
            if (manifest === null) {
              // TODO log warn?
              return;
            }

            // Remove `periods` key to reduce cost of an unnecessary manifest
            // clone.
            const snapshot = objectAssign(manifest.getMetadataSnapshot(), {
              periods: [],
            });
            sendMessage({
              type: WorkerMessageType.ManifestUpdate,
              contentId,
              value: { manifest: snapshot, updates },
            });
          },
          contentCanceller.signal,
        );
        unbindRejectOnCancellation();
        res(sentManifest);
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
   * "reloading" strategy: dispose of its `MediaSource` (and of its
   * `SourceBuffer`) and recreate one.
   *
   * The returned Promise resolves when it restarts being ready.
   * @param {Object} reloadInfo
   * @returns {Promise}
   */
  public reloadMediaSource(reloadInfo: INeedsMediaSourceReloadPayload): Promise<void> {
    this._currentMediaSourceCanceller.cancel();
    if (this._currentContent === null) {
      return Promise.reject(new Error("CP: No content anymore"));
    }
    this._currentContent.trackChoiceSetter.reset();
    this._currentMediaSourceCanceller = new TaskCanceller();

    sendMessage(
      {
        type: WorkerMessageType.ReloadingMediaSource,
        contentId: this._currentContent.contentId,
        value: reloadInfo,
      },
      [],
    );

    const [mediaSourceInterface, segmentSinksStore, workerTextSender] =
      createMediaSourceInterfaceAndSegmentSinksStore(
        this._currentContent.contentId,
        {
          hasMseInWorker: this._hasMseInWorker,
          hasVideo: this._hasVideo,
          hasText: this._currentContent.workerTextSender !== null,
        },
        this._currentMediaSourceCanceller.signal,
      );
    this._currentContent.mediaSource = mediaSourceInterface;
    this._currentContent.segmentSinksStore = segmentSinksStore;
    this._currentContent.freezeResolver = new FreezeResolver(segmentSinksStore);
    this._currentContent.workerTextSender = workerTextSender;
    return new Promise((res, rej) => {
      mediaSourceInterface.addEventListener(
        "mediaSourceOpen",
        function () {
          res();
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
   * If `true`, the RxPlayer can enable its "Representation avoidance"
   * mechanism, where it avoid loading Representation that it suspect
   * have issues being decoded on the current device.
   */
  enableRepresentationAvoidance: boolean;
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
  workerTextSender: WorkerTextDisplayerInterface | null;
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
function createMediaSourceInterfaceAndSegmentSinksStore(
  contentId: string,
  capabilities: {
    hasMseInWorker: boolean;
    hasVideo: boolean;
    hasText: boolean;
  },
  cancelSignal: CancellationSignal,
): [IMediaSourceInterface, SegmentSinksStore, WorkerTextDisplayerInterface | null] {
  let mediaSourceInterface: IMediaSourceInterface;
  if (capabilities.hasMseInWorker) {
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

  const textSender = capabilities.hasText
    ? new WorkerTextDisplayerInterface(contentId, sendMessage)
    : null;
  const { hasVideo } = capabilities;
  const segmentSinksStore = new SegmentSinksStore(
    mediaSourceInterface,
    hasVideo,
    textSender,
  );
  cancelSignal.register(() => {
    segmentSinksStore.disposeAll();
    textSender?.stop();
    mediaSourceInterface.dispose();
  });

  return [mediaSourceInterface, segmentSinksStore, textSender];
}

/**
 * Set Representation.isCodecSupportedInWebWorker to true or false
 * If the codec is supported in the current context.
 * If MSE in worker is not available, the attribute is not set.
 */
function updateCodecSupportInWorkerMode(manifestToUpdate: Manifest) {
  if (isNullOrUndefined(MediaSource_)) {
    return;
  }

  const codecsMap = new Map<string, boolean>();
  for (const period of manifestToUpdate.periods) {
    const checkedAdaptations = [
      ...(period.adaptations.video ?? []),
      ...(period.adaptations.audio ?? []),
    ];
    for (const adaptation of checkedAdaptations) {
      for (const representation of adaptation.representations) {
        const codec = `${representation.mimeType};codecs="${representation.codecs[0]}"`;
        if (codecsMap.has(codec)) {
          representation.isCodecSupportedInWebWorker = codecsMap.get(codec);
        } else {
          const supported = MediaSource_.isTypeSupported(codec);
          representation.isCodecSupportedInWebWorker = supported;
          codecsMap.set(codec, supported);
        }
      }
    }
  }
}
