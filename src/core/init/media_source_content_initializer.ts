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

import { shouldReloadMediaSourceOnDecipherabilityUpdate } from "../../compat";
import config from "../../config";
import { MediaError } from "../../errors";
import log from "../../log";
import Manifest from "../../manifest";
import {
  IKeySystemOption,
  IPlayerError,
} from "../../public_types";
import { ITransportPipelines } from "../../transports";
import assert from "../../utils/assert";
import createCancellablePromise from "../../utils/create_cancellable_promise";
import objectAssign from "../../utils/object_assign";
import createSharedReference, {
  IReadOnlySharedReference,
  ISharedReference,
} from "../../utils/reference";
import TaskCanceller, {
  CancellationSignal,
} from "../../utils/task_canceller";
import AdaptiveRepresentationSelector, {
  IAdaptiveRepresentationSelectorArguments,
  IRepresentationEstimator,
} from "../adaptive";
import { IReadOnlyPlaybackObserver, PlaybackObserver } from "../api";
import {
  getKeySystemConfiguration,
  IContentProtection,
} from "../decrypt";
import {
  ManifestFetcher,
  SegmentFetcherCreator,
} from "../fetchers";
import { IManifestFetcherSettings } from "../fetchers/manifest/manifest_fetcher";
import SegmentBuffersStore, {
  ITextTrackSegmentBufferOptions,
} from "../segment_buffers";
import StreamOrchestrator, {
  IAudioTrackSwitchingMode,
  IStreamOrchestratorOptions,
  IStreamOrchestratorCallbacks,
  IStreamOrchestratorPlaybackObservation,
} from "../stream";
import { ContentInitializer } from "./types";
import ContentTimeBoundariesObserver from "./utils/content_time_boundaries_observer";
import openMediaSource from "./utils/create_media_source";
import createStreamPlaybackObserver from "./utils/create_stream_playback_observer";
import { maintainEndOfStream } from "./utils/end_of_stream";
import getInitialTime, {
  IInitialTimeOptions,
} from "./utils/get_initial_time";
import getLoadedReference from "./utils/get_loaded_reference";
import performInitialSeekAndPlay from "./utils/initial_seek_and_play";
import initializeContentDecryption from "./utils/initialize_content_decryption";
import MediaSourceDurationUpdater from "./utils/media_source_duration_updater";
import RebufferingController from "./utils/rebuffering_controller";
import streamEventsEmitter from "./utils/stream_events_emitter";
import listenToMediaError from "./utils/throw_on_media_error";

/**
 * Allows to load a new content thanks to the MediaSource Extensions (a.k.a. MSE)
 * Web APIs.
 *
 * Through this `ContentInitializer`, a Manifest will be fetched (and depending
 * on the situation, refreshed), a `MediaSource` instance will be linked to the
 * wanted `HTMLMediaElement` and chunks of media data, called segments, will be
 * pushed on buffers associated to this `MediaSource` instance.
 *
 * @class MediaSourceContentInitializer
 */
export default class MediaSourceContentInitializer extends ContentInitializer {
  /** Constructor settings associated to this `MediaSourceContentInitializer`. */
  private _settings : IInitializeArguments;
  /**
   * `TaskCanceller` allowing to abort everything that the
   * `MediaSourceContentInitializer` is doing.
   */
  private _initCanceller : TaskCanceller;
  /** Interface allowing to fetch and refresh the Manifest. */
  private _manifestFetcher : ManifestFetcher;
  /**
   * Promise resolving with the Manifest once it has been initially loaded.
   * `null` if the load task has not started yet.
   */
  private _initialManifestProm : Promise<Manifest> | null;

  /**
   * Create a new `MediaSourceContentInitializer`, associated to the given
   * settings.
   * @param {Object} settings
   */
  constructor(settings : IInitializeArguments) {
    super();
    this._settings = settings;
    this._initCanceller = new TaskCanceller();
    this._initialManifestProm = null;
    const urls = settings.url === undefined ? undefined :
                                              [settings.url];
    this._manifestFetcher = new ManifestFetcher(urls,
                                                settings.transport,
                                                settings.manifestRequestSettings);
  }

  /**
   * Perform non-destructive preparation steps, to prepare a future content.
   * For now, this mainly mean loading the Manifest document.
   */
  public prepare(): void {
    if (this._initialManifestProm !== null) {
      return;
    }
    this._initialManifestProm = createCancellablePromise(
      this._initCanceller.signal,
      (res, rej) => {
        this._manifestFetcher.addEventListener("warning", (err : IPlayerError) =>
          this.trigger("warning", err));
        this._manifestFetcher.addEventListener("error", (err : unknown) => {
          this.trigger("error", err);
          rej(err);
        });
        this._manifestFetcher.addEventListener("manifestReady", (manifest) => {
          res(manifest);
        });
      });
    this._manifestFetcher.start();
    this._initCanceller.signal.register(() => {
      this._manifestFetcher.dispose();
    });
  }

  /**
   * @param {HTMLMediaElement} mediaElement
   * @param {Object} playbackObserver
   */
  public start(
    mediaElement : HTMLMediaElement,
    playbackObserver : PlaybackObserver
  ): void {
    this.prepare(); // Load Manifest if not already done

    /** Translate errors coming from the media element into RxPlayer errors. */
    listenToMediaError(mediaElement,
                       (error : MediaError) => this._onFatalError(error),
                       this._initCanceller.signal);

    /** Send content protection initialization data to the decryption logic. */
    const protectionRef = createSharedReference<IContentProtection | null>(
      null,
      this._initCanceller.signal
    );

    this._initializeMediaSourceAndDecryption(mediaElement, protectionRef)
      .then(initResult => this._onInitialMediaSourceReady(mediaElement,
                                                          initResult.mediaSource,
                                                          playbackObserver,
                                                          initResult.drmSystemId,
                                                          protectionRef,
                                                          initResult.unlinkMediaSource))
      .catch((err) => {
        this._onFatalError(err);
      });
  }

  /**
   * Update URL of the Manifest.
   * @param {Array.<string>|undefined} urls - URLs to reach that Manifest from
   * the most prioritized URL to the least prioritized URL.
   * @param {boolean} refreshNow - If `true` the resource in question (e.g.
   * DASH's MPD) will be refreshed immediately.
   */
  public updateContentUrls(urls : string[] | undefined, refreshNow : boolean) : void {
    this._manifestFetcher.updateContentUrls(urls, refreshNow);
  }

  public dispose(): void {
    this._initCanceller.cancel();
  }

  private _onFatalError(err : unknown) {
    if (this._initCanceller.isUsed()) {
      return;
    }
    this._initCanceller.cancel();
    this.trigger("error", err);
  }

  private _initializeMediaSourceAndDecryption(
    mediaElement : HTMLMediaElement,
    protectionRef : IReadOnlySharedReference<IContentProtection | null>
  ) : Promise<{ mediaSource : MediaSource;
                drmSystemId : string | undefined;
                unlinkMediaSource : TaskCanceller; }>
  {
    const initCanceller = this._initCanceller;
    return createCancellablePromise(initCanceller.signal, (resolve) => {
      const { keySystems } = this._settings;

      /** Initialize decryption capabilities. */
      const drmInitRef =
        initializeContentDecryption(mediaElement, keySystems, protectionRef, {
          onWarning: (err : IPlayerError) => this.trigger("warning", err),
          onError: (err : Error) => this._onFatalError(err),
        }, initCanceller.signal);

      drmInitRef.onUpdate((drmStatus, stopListeningToDrmUpdates) => {
        if (drmStatus.initializationState.type === "uninitialized") {
          return;
        }
        stopListeningToDrmUpdates();

        const mediaSourceCanceller = new TaskCanceller();
        mediaSourceCanceller.linkToSignal(initCanceller.signal);
        openMediaSource(mediaElement, mediaSourceCanceller.signal)
          .then((mediaSource) => {
            const lastDrmStatus = drmInitRef.getValue();
            if (lastDrmStatus.initializationState.type === "awaiting-media-link") {
              lastDrmStatus.initializationState.value.isMediaLinked.setValue(true);
              drmInitRef.onUpdate((newDrmStatus, stopListeningToDrmUpdatesAgain) => {
                if (newDrmStatus.initializationState.type === "initialized") {
                  stopListeningToDrmUpdatesAgain();
                  resolve({ mediaSource,
                            drmSystemId: newDrmStatus.drmSystemId,
                            unlinkMediaSource: mediaSourceCanceller });
                  return;
                }
              }, { emitCurrentValue: true, clearSignal: initCanceller.signal });
            } else if (drmStatus.initializationState.type === "initialized") {
              resolve({ mediaSource,
                        drmSystemId: drmStatus.drmSystemId,
                        unlinkMediaSource: mediaSourceCanceller });
              return;
            }
          })
          .catch((err) => {
            if (mediaSourceCanceller.isUsed()) {
              return;
            }
            this._onFatalError(err);
          });
      }, { emitCurrentValue: true, clearSignal: initCanceller.signal });
    });
  }

  private async _onInitialMediaSourceReady(
    mediaElement : HTMLMediaElement,
    initialMediaSource : MediaSource,
    playbackObserver : PlaybackObserver,
    drmSystemId : string | undefined,
    protectionRef : ISharedReference<IContentProtection | null>,
    initialMediaSourceCanceller : TaskCanceller
  ) : Promise<void> {
    const { adaptiveOptions,
            autoPlay,
            bufferOptions,
            lowLatencyMode,
            segmentRequestOptions,
            speed,
            startAt,
            textTrackOptions,
            transport } = this._settings;
    const initCanceller = this._initCanceller;
    assert(this._initialManifestProm !== null);
    const manifestProm = this._initialManifestProm;
    let manifest : Manifest;
    try {
      manifest = await manifestProm;
    } catch (_e) {
      return ; // The error should already have been processed through an event listener
    }

    manifest.addEventListener("manifestUpdate", () => {
      this.trigger("manifestUpdate", null);
    }, initCanceller.signal);
    manifest.addEventListener("decipherabilityUpdate", (args) => {
      this.trigger("decipherabilityUpdate", args);
    }, initCanceller.signal);

    log.debug("Init: Calculating initial time");
    const initialTime = getInitialTime(manifest, lowLatencyMode, startAt);
    log.debug("Init: Initial time calculated:", initialTime);

    /** Choose the right "Representation" for a given "Adaptation". */
    const representationEstimator = AdaptiveRepresentationSelector(adaptiveOptions);
    const subBufferOptions = objectAssign({ textTrackOptions, drmSystemId },
                                          bufferOptions);

    const segmentFetcherCreator = new SegmentFetcherCreator(transport,
                                                            segmentRequestOptions,
                                                            initCanceller.signal);

    this.trigger("manifestReady", manifest);
    if (initCanceller.isUsed()) {
      return ;
    }

    const bufferOnMediaSource = this._startBufferingOnMediaSource.bind(this);
    const triggerEvent = this.trigger.bind(this);
    const onFatalError = this._onFatalError.bind(this);

    // handle initial load and reloads
    recursivelyLoadOnMediaSource(initialMediaSource,
                                 initialTime,
                                 autoPlay,
                                 initialMediaSourceCanceller);

    /**
     * Load the content defined by the Manifest in the mediaSource given at the
     * given position and playing status.
     * This function recursively re-call itself when a MediaSource reload is
     * wanted.
     * @param {MediaSource} mediaSource
     * @param {number} startingPos
     * @param {Object} currentCanceller
     * @param {boolean} shouldPlay
     */
    function recursivelyLoadOnMediaSource(
      mediaSource : MediaSource,
      startingPos : number,
      shouldPlay : boolean,
      currentCanceller : TaskCanceller
    ) : void {
      const opts = { mediaElement,
                     playbackObserver,
                     mediaSource,
                     initialTime: startingPos,
                     autoPlay: shouldPlay,
                     manifest,
                     representationEstimator,
                     segmentFetcherCreator,
                     speed,
                     protectionRef,
                     bufferOptions: subBufferOptions };
      bufferOnMediaSource(opts, onReloadMediaSource, currentCanceller.signal);

      function onReloadMediaSource(
        reloadOrder : { position : number;
                        autoPlay : boolean; }
      ) : void {
        currentCanceller.cancel();
        if (initCanceller.isUsed()) {
          return;
        }
        triggerEvent("reloadingMediaSource", null);
        if (initCanceller.isUsed()) {
          return;
        }

        const newCanceller = new TaskCanceller();
        newCanceller.linkToSignal(initCanceller.signal);
        openMediaSource(mediaElement, newCanceller.signal)
          .then(newMediaSource => {
            recursivelyLoadOnMediaSource(newMediaSource,
                                         reloadOrder.position,
                                         reloadOrder.autoPlay,
                                         newCanceller);
          })
          .catch((err) => {
            if (newCanceller.isUsed()) {
              return;
            }
            onFatalError(err);
          });
      }
    }
  }

  /**
   * Buffer the content on the given MediaSource.
   * @param {Object} args
   * @param {function} onReloadOrder
   * @param {Object} cancelSignal
   */
  private _startBufferingOnMediaSource(
    args : IBufferingMediaSettings,
    onReloadOrder: (reloadOrder : { position: number;
                                    autoPlay : boolean; }) => void,
    cancelSignal : CancellationSignal
  ) : void {
    const { autoPlay,
            bufferOptions,
            initialTime,
            manifest,
            mediaElement,
            mediaSource,
            playbackObserver,
            protectionRef,
            representationEstimator,
            segmentFetcherCreator,
            speed } = args;

    const initialPeriod = manifest.getPeriodForTime(initialTime) ??
                          manifest.getNextPeriod(initialTime);
    if (initialPeriod === undefined) {
      const error = new MediaError("MEDIA_STARTING_TIME_NOT_FOUND",
                                   "Wanted starting time not found in the Manifest.");
      return this._onFatalError(error);
    }

    /** Interface to create media buffers. */
    const segmentBuffersStore = new SegmentBuffersStore(mediaElement, mediaSource);
    cancelSignal.register(() => {
      segmentBuffersStore.disposeAll();
    });

    const { autoPlayResult, initialPlayPerformed, initialSeekPerformed } =
      performInitialSeekAndPlay(mediaElement,
                                playbackObserver,
                                initialTime,
                                autoPlay,
                                (err) => this.trigger("warning", err),
                                cancelSignal);

    if (cancelSignal.isCancelled()) {
      return;
    }

    initialPlayPerformed.onUpdate((isPerformed, stopListening) => {
      if (isPerformed) {
        stopListening();
        streamEventsEmitter(manifest,
                            mediaElement,
                            playbackObserver,
                            (evt) => this.trigger("streamEvent", evt),
                            (evt) => this.trigger("streamEventSkip", evt),
                            cancelSignal);
      }
    }, { clearSignal: cancelSignal, emitCurrentValue: true });

    const streamObserver = createStreamPlaybackObserver(manifest,
                                                        playbackObserver,
                                                        { autoPlay,
                                                          initialPlayPerformed,
                                                          initialSeekPerformed,
                                                          speed,
                                                          startTime: initialTime });

    const rebufferingController = this._createRebufferingController(playbackObserver,
                                                                    manifest,
                                                                    speed,
                                                                    cancelSignal);

    const contentTimeBoundariesObserver = this
      ._createContentTimeBoundariesObserver(manifest,
                                            mediaSource,
                                            streamObserver,
                                            segmentBuffersStore,
                                            cancelSignal);

    /**
     * Emit a "loaded" events once the initial play has been performed and the
     * media can begin playback.
     * Also emits warning events if issues arise when doing so.
     */
    autoPlayResult
      .then(() => {
        getLoadedReference(playbackObserver, mediaElement, false, cancelSignal)
          .onUpdate((isLoaded, stopListening) => {
            if (isLoaded) {
              stopListening();
              this.trigger("loaded", { segmentBuffersStore });
            }
          }, { emitCurrentValue: true, clearSignal: cancelSignal });
      })
      .catch((err) => {
        if (cancelSignal.isCancelled()) {
          return; // Current loading cancelled, no need to trigger the error
        }
        this._onFatalError(err);
      });

    /* eslint-disable-next-line @typescript-eslint/no-this-alias */
    const self = this;
    StreamOrchestrator({ manifest, initialPeriod },
                       streamObserver,
                       representationEstimator,
                       segmentBuffersStore,
                       segmentFetcherCreator,
                       bufferOptions,
                       handleStreamOrchestratorCallbacks(),
                       cancelSignal);

    /**
     * Returns Object handling the callbacks from a `StreamOrchestrator`, which
     * are basically how it communicates about events.
     * @returns {Object}
     */
    function handleStreamOrchestratorCallbacks() : IStreamOrchestratorCallbacks {
      return {
        needsBufferFlush: () =>
          playbackObserver.setCurrentTime(mediaElement.currentTime + 0.001),

        streamStatusUpdate(value) {
          // Announce discontinuities if found
          const { period, bufferType, imminentDiscontinuity, position } = value;
          rebufferingController.updateDiscontinuityInfo({
            period,
            bufferType,
            discontinuity: imminentDiscontinuity,
            position,
          });
          if (cancelSignal.isCancelled()) {
            return; // Previous call has stopped streams due to a side-effect
          }

          // If the status for the last Period indicates that segments are all loaded
          // or on the contrary that the loading resumed, announce it to the
          // ContentTimeBoundariesObserver.
          if (manifest.isLastPeriodKnown &&
              value.period.id === manifest.periods[manifest.periods.length - 1].id)
          {
            const hasFinishedLoadingLastPeriod = value.hasFinishedLoading ||
                                                 value.isEmptyStream;
            if (hasFinishedLoadingLastPeriod) {
              contentTimeBoundariesObserver
                .onLastSegmentFinishedLoading(value.bufferType);
            } else {
              contentTimeBoundariesObserver
                .onLastSegmentLoadingResume(value.bufferType);
            }
          }
        },

        needsManifestRefresh: () => self._manifestFetcher.scheduleManualRefresh({
          enablePartialRefresh: true,
          canUseUnsafeMode: true,
        }),

        manifestMightBeOufOfSync: () => {
          const { OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config.getCurrent();
          self._manifestFetcher.scheduleManualRefresh({
            enablePartialRefresh: false,
            canUseUnsafeMode: false,
            delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY,
          });
        },

        lockedStream: (value) =>
          rebufferingController.onLockedStream(value.bufferType, value.period),

        adaptationChange: (value) => {
          self.trigger("adaptationChange", value);
          if (cancelSignal.isCancelled()) {
            return; // Previous call has stopped streams due to a side-effect
          }
          contentTimeBoundariesObserver.onAdaptationChange(value.type,
                                                           value.period,
                                                           value.adaptation);
        },

        representationChange: (value) => {
          self.trigger("representationChange", value);
          if (cancelSignal.isCancelled()) {
            return; // Previous call has stopped streams due to a side-effect
          }
          contentTimeBoundariesObserver.onRepresentationChange(value.type, value.period);
        },

        inbandEvent: (value) => self.trigger("inbandEvents", value),

        warning: (value) => self.trigger("warning", value),

        periodStreamReady: (value) => self.trigger("periodStreamReady", value),

        periodStreamCleared: (value) => {
          contentTimeBoundariesObserver.onPeriodCleared(value.type, value.period);
          if (cancelSignal.isCancelled()) {
            return; // Previous call has stopped streams due to a side-effect
          }
          self.trigger("periodStreamCleared", value);
        },

        bitrateEstimationChange: (value) =>
          self.trigger("bitrateEstimationChange", value),

        addedSegment: (value) => self.trigger("addedSegment", value),

        needsMediaSourceReload: (value) => onReloadOrder(value),

        needsDecipherabilityFlush(value) {
          const keySystem = getKeySystemConfiguration(mediaElement);
          if (shouldReloadMediaSourceOnDecipherabilityUpdate(keySystem?.[0])) {
            onReloadOrder(value);
          } else {
            // simple seek close to the current position
            // to flush the buffers
            if (value.position + 0.001 < value.duration) {
              playbackObserver.setCurrentTime(mediaElement.currentTime + 0.001);
            } else {
              playbackObserver.setCurrentTime(value.position);
            }
          }
        },

        encryptionDataEncountered: (value) => {
          for (const protectionData of value) {
            protectionRef.setValue(protectionData);
            if (cancelSignal.isCancelled()) {
              return; // Previous call has stopped streams due to a side-effect
            }
          }
        },

        error: (err) => self._onFatalError(err),
      };
    }
  }

  /**
   * Creates a `ContentTimeBoundariesObserver`, a class indicating various
   * events related to media time (such as duration updates, period changes,
   * warnings about being out of the Manifest time boundaries or "endOfStream"
   * management), handle those events and returns the class.
   *
   * Various methods from that class need then to be called at various events
   * (see `ContentTimeBoundariesObserver`).
   * @param {Object} manifest
   * @param {MediaSource} mediaSource
   * @param {Object} streamObserver
   * @param {Object} segmentBuffersStore
   * @param {Object} cancelSignal
   * @returns {Object}
   */
  private _createContentTimeBoundariesObserver(
    manifest : Manifest,
    mediaSource : MediaSource,
    streamObserver : IReadOnlyPlaybackObserver<IStreamOrchestratorPlaybackObservation>,
    segmentBuffersStore : SegmentBuffersStore,
    cancelSignal : CancellationSignal
  ) : ContentTimeBoundariesObserver {
    /** Maintains the MediaSource's duration up-to-date with the Manifest */
    const mediaSourceDurationUpdater = new MediaSourceDurationUpdater(mediaSource);
    cancelSignal.register(() => {
      mediaSourceDurationUpdater.stopUpdating();
    });
    /** Allows to cancel a pending `end-of-stream` operation. */
    let endOfStreamCanceller : TaskCanceller | null = null;
    const contentTimeBoundariesObserver = new ContentTimeBoundariesObserver(
      manifest,
      streamObserver,
      segmentBuffersStore.getBufferTypes()
    );
    cancelSignal.register(() => {
      contentTimeBoundariesObserver.dispose();
    });
    contentTimeBoundariesObserver.addEventListener("warning", (err) =>
      this.trigger("warning", err));
    contentTimeBoundariesObserver.addEventListener("periodChange", (period) => {
      this.trigger("activePeriodChanged", { period });
    });
    contentTimeBoundariesObserver.addEventListener("durationUpdate", (newDuration) => {
      mediaSourceDurationUpdater.updateDuration(newDuration.duration, !newDuration.isEnd);
    });
    contentTimeBoundariesObserver.addEventListener("endOfStream", () => {
      if (endOfStreamCanceller === null) {
        endOfStreamCanceller = new TaskCanceller();
        endOfStreamCanceller.linkToSignal(cancelSignal);
        log.debug("Init: end-of-stream order received.");
        maintainEndOfStream(mediaSource, endOfStreamCanceller.signal);
      }
    });
    contentTimeBoundariesObserver.addEventListener("resumeStream", () => {
      if (endOfStreamCanceller !== null) {
        log.debug("Init: resume-stream order received.");
        endOfStreamCanceller.cancel();
        endOfStreamCanceller = null;
      }
    });
    const currentDuration = contentTimeBoundariesObserver.getCurrentDuration();
    mediaSourceDurationUpdater.updateDuration(currentDuration.duration,
                                              !currentDuration.isEnd);
    return contentTimeBoundariesObserver;
  }

  /**
   * Creates a `RebufferingController`, a class trying to avoid various stalling
   * situations (such as rebuffering periods), and returns it.
   *
   * Various methods from that class need then to be called at various events
   * (see `RebufferingController` definition).
   *
   * This function also handles the `RebufferingController`'s events:
   *   - emit "stalled" events when stalling situations cannot be prevented,
   *   - emit "unstalled" events when we could get out of one,
   *   - emit "warning" on various rebuffering-related minor issues
   *     like discontinuity skipping.
   * @param {Object} playbackObserver
   * @param {Object} manifest
   * @param {Object} speed
   * @param {Object} cancelSignal
   * @returns {Object}
   */
  private _createRebufferingController(
    playbackObserver : PlaybackObserver,
    manifest : Manifest,
    speed : IReadOnlySharedReference<number>,
    cancelSignal : CancellationSignal
  ) : RebufferingController {
    const rebufferingController = new RebufferingController(playbackObserver,
                                                            manifest,
                                                            speed);
    // Bubble-up events
    rebufferingController.addEventListener("stalled",
                                           (evt) => this.trigger("stalled", evt));
    rebufferingController.addEventListener("unstalled",
                                           () => this.trigger("unstalled", null));
    rebufferingController.addEventListener("warning",
                                           (err) => this.trigger("warning", err));
    cancelSignal.register(() => rebufferingController.destroy());
    rebufferingController.start();
    return rebufferingController;
  }
}

/** Arguments to give to the `InitializeOnMediaSource` function. */
export interface IInitializeArguments {
  /** Options concerning the ABR logic. */
  adaptiveOptions: IAdaptiveRepresentationSelectorArguments;
  /** `true` if we should play when loaded. */
  autoPlay : boolean;
  /** Options concerning the media buffers. */
  bufferOptions : {
    /** Buffer "goal" at which we stop downloading new segments. */
    wantedBufferAhead : IReadOnlySharedReference<number>;
    /** Buffer maximum size in kiloBytes at which we stop downloading */
    maxVideoBufferSize :  IReadOnlySharedReference<number>;
    /** Max buffer size after the current position, in seconds (we GC further up). */
    maxBufferAhead : IReadOnlySharedReference<number>;
    /** Max buffer size before the current position, in seconds (we GC further down). */
    maxBufferBehind : IReadOnlySharedReference<number>;
    /** Strategy when switching the current bitrate manually (smooth vs reload). */
    manualBitrateSwitchingMode : "seamless" | "direct";
    /**
     * Enable/Disable fastSwitching: allow to replace lower-quality segments by
     * higher-quality ones to have a faster transition.
     */
    enableFastSwitching : boolean;
    /** Strategy when switching of audio track. */
    audioTrackSwitchingMode : IAudioTrackSwitchingMode;
    /** Behavior when a new video and/or audio codec is encountered. */
    onCodecSwitch : "continue" | "reload";
  };
  /** Every encryption configuration set. */
  keySystems : IKeySystemOption[];
  /** `true` to play low-latency contents optimally. */
  lowLatencyMode : boolean;
  /** Settings linked to Manifest requests. */
  manifestRequestSettings : IManifestFetcherSettings;
  /** Logic linked Manifest and segment loading and parsing. */
  transport : ITransportPipelines;
  /** Configuration for the segment requesting logic. */
  segmentRequestOptions : {
    lowLatencyMode : boolean;
    /**
     * Amount of time after which a request should be aborted.
     * `undefined` indicates that a default value is wanted.
     * `-1` indicates no timeout.
     */
    requestTimeout : number | undefined;
    /** Maximum number of time a request on error will be retried. */
    maxRetryRegular : number | undefined;
    /** Maximum number of time a request be retried when the user is offline. */
    maxRetryOffline : number | undefined;
  };
  /** Emit the playback rate (speed) set by the user. */
  speed : IReadOnlySharedReference<number>;
  /** The configured starting position. */
  startAt? : IInitialTimeOptions | undefined;
  /** Configuration specific to the text track. */
  textTrackOptions : ITextTrackSegmentBufferOptions;
  /** URL of the Manifest. `undefined` if unknown or not pertinent. */
  url : string | undefined;
}

/** Arguments needed when starting to buffer media on a specific MediaSource. */
interface IBufferingMediaSettings {
  /** Various stream-related options. */
  bufferOptions : IStreamOrchestratorOptions;
  /* Manifest of the content we want to play. */
  manifest : Manifest;
  /** Media Element on which the content will be played. */
  mediaElement : HTMLMediaElement;
  /** Emit playback conditions regularly. */
  playbackObserver : PlaybackObserver;
  /** Estimate the right Representation. */
  representationEstimator : IRepresentationEstimator;
  /** Module to facilitate segment fetching. */
  segmentFetcherCreator : SegmentFetcherCreator;
  /** Last wanted playback rate. */
  speed : IReadOnlySharedReference<number>;
  /**
   * Reference through which decryption initialization information can be
   * communicated.
   */
  protectionRef : ISharedReference<IContentProtection | null>;
  /** `MediaSource` element on which the media will be buffered. */
  mediaSource : MediaSource;
  /** The initial position to seek to in media time, in seconds. */
  initialTime : number;
  /** If `true` it should automatically play once enough data is loaded. */
  autoPlay : boolean;
}
