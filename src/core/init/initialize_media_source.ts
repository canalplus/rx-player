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

import {
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  exhaustMap,
  finalize,
  map,
  mapTo,
  mergeMap,
  share,
  shareReplay,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";
import { shouldReloadMediaSourceOnDecipherabilityUpdate } from "../../compat";
import config from "../../config";
import log from "../../log";
import {
  ILoadedManifest,
  ITransportPipelines,
} from "../../transports";
import deferSubscriptions from "../../utils/defer_subscriptions";
import { fromEvent } from "../../utils/event_emitter";
import filterMap from "../../utils/filter_map";
import objectAssign from "../../utils/object_assign";
import throttle from "../../utils/rx-throttle";
import ABRManager, {
  IABRManagerArguments,
} from "../abr";
import {
  getCurrentKeySystem,
  IContentProtection,
  IKeySystemOption,
} from "../eme";
import {
  IManifestFetcherParsedResult,
  IManifestFetcherParserOptions,
  ManifestFetcher,
  SegmentFetcherCreator,
} from "../fetchers";
import { ITextTrackSegmentBufferOptions } from "../segment_buffers";
import createEMEManager from "./create_eme_manager";
import openMediaSource from "./create_media_source";
import EVENTS from "./events_generators";
import getInitialTime, {
  IInitialTimeOptions,
} from "./get_initial_time";
import createMediaSourceLoader from "./load_on_media_source";
import manifestUpdateScheduler, {
  IManifestRefreshSchedulerEvent,
} from "./manifest_update_scheduler";
import throwOnMediaError from "./throw_on_media_error";
import {
  IInitClockTick,
  IInitEvent,
  IMediaSourceLoaderEvent,
  IWarningEvent,
} from "./types";

const { OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config;

/** Arguments to give to the `InitializeOnMediaSource` function. */
export interface IInitializeArguments {
  /** Options concerning the ABR logic. */
  adaptiveOptions: IABRManagerArguments;
  /** `true` if we should play when loaded. */
  autoPlay : boolean;
  /** Options concerning the media buffers. */
  bufferOptions : {
    /** Buffer "goal" at which we stop downloading new segments. */
    wantedBufferAhead$ : BehaviorSubject<number>;
    /** Max buffer size after the current position, in seconds (we GC further up). */
    maxBufferAhead$ : Observable<number>;
    /** Max buffer size before the current position, in seconds (we GC further down). */
    maxBufferBehind$ : Observable<number>;
    /** Strategy when switching the current bitrate manually (smooth vs reload). */
    manualBitrateSwitchingMode : "seamless" | "direct";
    /**
     * Enable/Disable fastSwitching: allow to replace lower-quality segments by
     * higher-quality ones to have a faster transition.
     */
    enableFastSwitching : boolean;
    /** Strategy when switching of audio track. */
    audioTrackSwitchingMode : "seamless" | "direct";
  };
  /** Regularly emit current playback conditions. */
  clock$ : Observable<IInitClockTick>;
  /** Information on the content we want to play */
  content : {
    /** Initial value of the Manifest, if already parsed. */
    initialManifest? : ILoadedManifest;
    /** Optional shorter version of the Manifest used for updates only. */
    manifestUpdateUrl? : string;
    /** URL of the Manifest. */
    url? : string;
  };
  /** Every encryption configuration set. */
  keySystems : IKeySystemOption[];
  /** `true` to play low-latency contents optimally. */
  lowLatencyMode : boolean;
  /** The HTMLMediaElement on which we will play. */
  mediaElement : HTMLMediaElement;
  /** Limit the frequency of Manifest updates. */
  minimumManifestUpdateInterval : number;
  /** Requests configuration. */
  networkConfig: {
    /** Maximum number of Manifest retry. */
    manifestRetry? : number;
    /** Maximum number of offline segment retry. */
    offlineRetry? : number;
    /** Maximum number of non-offline segment retry. */
    segmentRetry? : number;
  };
  /** Emit the playback rate (speed) set by the user. */
  speed$ : Observable<number>;
  /** The configured starting position. */
  startAt? : IInitialTimeOptions;
  /** Configuration specific to the text track. */
  textTrackOptions : ITextTrackSegmentBufferOptions;
  /**
   * "Transport pipelines": logic specific to the current transport
   * (e.g. DASH, Smooth...)
   */
  transportPipelines : ITransportPipelines;
}

/**
 * Begin content playback.
 *
 * Returns an Observable emitting notifications about the content lifecycle.
 * On subscription, it will perform every necessary tasks so the content can
 * play. Among them:
 *
 *   - Creates a MediaSource on the given `mediaElement` and attach to it the
 *     necessary SourceBuffer instances.
 *
 *   - download the content's Manifest and handle its refresh logic
 *
 *   - Perform EME management if needed
 *
 *   - ask for the choice of the wanted Adaptation through events (e.g. to
 *     choose a language)
 *
 *   - requests and push the right segments (according to the Adaptation choice,
 *     the current position, the network conditions etc.)
 *
 * This Observable will throw in the case where a fatal error (i.e. which has
 * stopped content playback) is encountered, with the corresponding error as a
 * payload.
 *
 * This Observable will never complete, it will always run until it is
 * unsubscribed from.
 * Unsubscription will stop playback and reset the corresponding state.
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function InitializeOnMediaSource(
  { adaptiveOptions,
    autoPlay,
    bufferOptions,
    clock$,
    content,
    keySystems,
    lowLatencyMode,
    mediaElement,
    minimumManifestUpdateInterval,
    networkConfig,
    speed$,
    startAt,
    textTrackOptions,
    transportPipelines } : IInitializeArguments
) : Observable<IInitEvent> {
  const { url, initialManifest, manifestUpdateUrl } = content;
  const { offlineRetry, segmentRetry, manifestRetry } = networkConfig;

  const manifestFetcher = new ManifestFetcher(url,
                                              transportPipelines,
                                              { lowLatencyMode,
                                                maxRetryRegular: manifestRetry,
                                                maxRetryOffline: offlineRetry });

  /**
   * Fetch and parse the manifest from the URL given.
   * Throttled to avoid doing multiple simultaneous requests.
   */
  const fetchManifest = throttle((manifestURL : string | undefined,
                                  options : IManifestFetcherParserOptions)
    : Observable<IWarningEvent | IManifestFetcherParsedResult> =>
      manifestFetcher.fetch(manifestURL).pipe(
        mergeMap((response) => response.type === "warning" ?
          observableOf(response) : // bubble-up warnings
          response.parse(options)),
        share()));

  /** Interface used to download segments. */
  const segmentFetcherCreator =
    new SegmentFetcherCreator<any>(transportPipelines, { lowLatencyMode,
                                                         maxRetryOffline: offlineRetry,
                                                         maxRetryRegular: segmentRetry });

  /** Choose the right "Representation" for a given "Adaptation". */
  const abrManager = new ABRManager(adaptiveOptions);

  /**
   * Create and open a new MediaSource object on the given media element on
   * subscription.
   * Multiple concurrent subscriptions on this Observable will obtain the same
   * created MediaSource.
   * The MediaSource will be closed when subscriptions are down to 0.
   */
  const openMediaSource$ = openMediaSource(mediaElement).pipe(
    shareReplay({ refCount: true })
  );

  /** Send content protection data to the `EMEManager`. */
  const protectedSegments$ = new Subject<IContentProtection>();

  /** Create `EMEManager`, an observable which will handle content DRM. */
  const emeManager$ = createEMEManager(mediaElement,
                                       keySystems,
                                       protectedSegments$).pipe(
    // Because multiple Observables here depend on this Observable as a source,
    // we prefer deferring Subscription until those Observables are themselves
    // all subscribed to.
    // This is needed because `emeManager$` might send events synchronously
    // on subscription. In that case, it might communicate those events directly
    // after the first Subscription is done, making the next subscription miss
    // out on those events, even if that second subscription is done
    // synchronously after the first one.
    // By calling `deferSubscriptions`, we ensure that subscription to
    // `emeManager$` effectively starts after a very short delay, thus
    // ensuring that no such race condition can occur.
    deferSubscriptions(),
    share()
  );

  /**
   * Translate errors coming from the media element into RxPlayer errors
   * through a throwing Observable.
   */
  const mediaError$ = throwOnMediaError(mediaElement);

  const initialManifestRequest$ = (initialManifest === undefined ?
    fetchManifest(url, { previousManifest: null, unsafeMode: false }) :
    manifestFetcher.parse(initialManifest, { previousManifest: null,
                                             unsafeMode: false })
  );

  /**
   * Wait for the MediaKeys to have been created before
   * opening MediaSource, and ask EME to attach MediaKeys.
   */
  const prepareMediaSource$ = emeManager$.pipe(
    mergeMap((evt) => {
      switch (evt.type) {
        case "eme-disabled":
        case "attached-media-keys":
          return observableOf(undefined);
        case "created-media-keys":
          return openMediaSource$.pipe(mergeMap(() => {
            evt.value.attachMediaKeys$.next();

            if (evt.value.mediaKeysInfos.keySystemOptions
                  .disableMediaKeysAttachmentLock === true)
            {
              return observableOf(undefined);
            }
            // wait for "attached-media-keys"
            return EMPTY;
          }));
        default:
          return EMPTY;
      }
    }),
    take(1),
    exhaustMap(() => openMediaSource$)
  );

  /** Load and play the content asked. */
  const loadContent$ = observableCombineLatest([initialManifestRequest$,
                                                prepareMediaSource$]).pipe(
    mergeMap(([manifestEvt, initialMediaSource]) => {
      if (manifestEvt.type === "warning") {
        return observableOf(manifestEvt);
      }

      const { manifest } = manifestEvt;

      log.debug("Init: Calculating initial time");
      const initialTime = getInitialTime(manifest, lowLatencyMode, startAt);
      log.debug("Init: Initial time calculated:", initialTime);

      const mediaSourceLoader = createMediaSourceLoader({
        abrManager,
        bufferOptions: objectAssign({ textTrackOptions }, bufferOptions),
        clock$,
        manifest,
        mediaElement,
        segmentFetcherCreator,
        speed$,
      });

      // handle initial load and reloads
      const recursiveLoad$ = recursivelyLoadOnMediaSource(initialMediaSource,
                                                          initialTime,
                                                          autoPlay);

      // Emit when we want to manually update the manifest.
      const scheduleRefresh$ = new Subject<IManifestRefreshSchedulerEvent>();

      const manifestUpdate$ = manifestUpdateScheduler({ fetchManifest,
                                                        initialManifest: manifestEvt,
                                                        manifestUpdateUrl,
                                                        minimumManifestUpdateInterval,
                                                        scheduleRefresh$ });

      const manifestEvents$ = observableMerge(
        fromEvent(manifest, "manifestUpdate")
          .pipe(mapTo(EVENTS.manifestUpdate())),
        fromEvent(manifest, "decipherabilityUpdate")
          .pipe(map(EVENTS.decipherabilityUpdate)));

      const setUndecipherableRepresentations$ = emeManager$.pipe(tap((evt) => {
        if (evt.type === "blacklist-keys") {
          log.info("Init: blacklisting Representations based on keyIDs");
          manifest.addUndecipherableKIDs(evt.value);
        } else if (evt.type === "blacklist-protection-data") {
          log.info("Init: blacklisting Representations based on protection data.");
          manifest.addUndecipherableProtectionData(evt.value.type,
                                                   evt.value.data);
        }
      }));

      return observableMerge(manifestEvents$,
                             manifestUpdate$,
                             setUndecipherableRepresentations$,
                             recursiveLoad$)
        .pipe(startWith(EVENTS.manifestReady(manifest)),
              finalize(() => { scheduleRefresh$.complete(); }));

      /**
       * Load the content defined by the Manifest in the mediaSource given at the
       * given position and playing status.
       * This function recursively re-call itself when a MediaSource reload is
       * wanted.
       * @param {MediaSource} mediaSource
       * @param {number} startingPos
       * @param {boolean} shouldPlay
       * @returns {Observable}
       */
      function recursivelyLoadOnMediaSource(
        mediaSource : MediaSource,
        startingPos : number,
        shouldPlay : boolean
      ) : Observable<IInitEvent> {
        const reloadMediaSource$ = new Subject<{ position : number;
                                                 isPaused : boolean; }>();
        const mediaSourceLoader$ = mediaSourceLoader(mediaSource, startingPos, shouldPlay)
          .pipe(filterMap<IMediaSourceLoaderEvent, IInitEvent, null>((evt) => {
            switch (evt.type) {
              case "needs-manifest-refresh":
                scheduleRefresh$.next({ completeRefresh: false,
                                        canUseUnsafeMode: true });
                return null;
              case "manifest-might-be-out-of-sync":
                scheduleRefresh$.next({
                  completeRefresh: true,
                  canUseUnsafeMode: false,
                  delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY,
                });
                return null;
              case "needs-media-source-reload":
                reloadMediaSource$.next(evt.value);
                return null;
              case "needs-decipherability-flush":
                const keySystem = getCurrentKeySystem(mediaElement);
                if (shouldReloadMediaSourceOnDecipherabilityUpdate(
                      keySystem
                    )
                ) {
                  reloadMediaSource$.next(evt.value);
                  return null;
                }

                // simple seek close to the current position
                // to flush the buffers
                const { position } = evt.value;
                if (position + 0.001 < evt.value.duration) {
                  mediaElement.currentTime += 0.001;
                } else {
                  mediaElement.currentTime = position;
                }
                return null;
              case "protected-segment":
                protectedSegments$.next(evt.value);
                return null;
            }
            return evt;
          }, null));

        const currentLoad$ =
          mediaSourceLoader$.pipe(takeUntil(reloadMediaSource$));

        const handleReloads$ = reloadMediaSource$.pipe(
          switchMap(({ position, isPaused }) => {
            return openMediaSource(mediaElement).pipe(
              mergeMap(newMS => recursivelyLoadOnMediaSource(newMS,
                                                             position,
                                                             !isPaused)),
              startWith(EVENTS.reloadingMediaSource())
            );
          }));

        return observableMerge(handleReloads$, currentLoad$);
      }
    })
  );

  return observableMerge(loadContent$, mediaError$, emeManager$);
}
