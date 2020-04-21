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
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  filter,
  finalize,
  map,
  mapTo,
  mergeMap,
  share,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";
import { shouldReloadMediaSourceOnDecipherabilityUpdate } from "../../compat";
import config from "../../config";
import log from "../../log";
import { ITransportPipelines } from "../../transports";
import deferSubscriptions from "../../utils/defer_subscriptions";
import { fromEvent } from "../../utils/event_emitter";
import objectAssign from "../../utils/object_assign";
import throttle from "../../utils/rx-throttle";
import ABRManager, {
  IABRManagerArguments,
} from "../abr";
import {
  getCurrentKeySystem,
  IContentProtection,
  IEMEManagerEvent,
  IKeySystemOption,
} from "../eme";
import {
  createManifestFetcher,
  IManifestFetcherParsedResult,
  IManifestFetcherParserOptions,
  SegmentFetcherCreator,
} from "../fetchers";
import { ITextTrackSourceBufferOptions } from "../source_buffers";
import createEMEManager, {
  IEMEDisabledEvent,
} from "./create_eme_manager";
import openMediaSource from "./create_media_source";
import EVENTS from "./events_generators";
import getInitialTime, {
  IInitialTimeOptions,
} from "./get_initial_time";
import isEMEReadyEvent from "./is_eme_ready";
import createMediaSourceLoader, {
  IMediaSourceLoaderEvent,
} from "./load_on_media_source";
import manifestUpdateScheduler, {
  IManifestRefreshSchedulerEvent,
} from "./manifest_update_scheduler";
import throwOnMediaError from "./throw_on_media_error";
import {
  IDecipherabilityUpdateEvent,
  IInitClockTick,
  IManifestReadyEvent,
  IManifestUpdateEvent,
  IReloadingMediaSourceEvent,
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
  };
  /** Regularly emit current playback conditions. */
  clock$ : Observable<IInitClockTick>;
  /** Every encryption configuration set. */
  keySystems : IKeySystemOption[];
  /** `true` to play low-latency contents optimally. */
  lowLatencyMode : boolean;
  /** Optional shorter version of the Manifest used for updates only. */
  manifestUpdateUrl? : string;
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
  textTrackOptions : ITextTrackSourceBufferOptions;
  /**
   * "Transport pipelines": logic specific to the current transport
   * (e.g. DASH, Smooth...)
   */
  transportPipelines : ITransportPipelines;
  /** URL of the Manifest. */
  url? : string;
}

/** Every events emitted by `InitializeOnMediaSource`. */
export type IInitEvent = IManifestReadyEvent |
                         IManifestUpdateEvent |
                         IMediaSourceLoaderEvent |
                         IEMEManagerEvent |
                         IEMEDisabledEvent |
                         IReloadingMediaSourceEvent |
                         IDecipherabilityUpdateEvent |
                         IWarningEvent;

/**
 * Play a content described by the given Manifest.
 *
 * On subscription:
 *   - Creates the MediaSource and attached sourceBuffers instances.
 *   - download the content's Manifest and handle its refresh logic
 *   - Perform EME management if needed
 *   - get Buffers for each active adaptations.
 *   - give choice of the adaptation to the caller (e.g. to choose a language)
 *   - returns Observable emitting notifications about the content lifecycle.
 * @param {Object} args
 * @returns {Observable}
 */
export default function InitializeOnMediaSource(
  { adaptiveOptions,
    autoPlay,
    bufferOptions,
    clock$,
    keySystems,
    lowLatencyMode,
    manifestUpdateUrl,
    mediaElement,
    minimumManifestUpdateInterval,
    networkConfig,
    speed$,
    startAt,
    textTrackOptions,
    transportPipelines,
    url } : IInitializeArguments
) : Observable<IInitEvent> {
  const { offlineRetry, segmentRetry, manifestRetry } = networkConfig;

  const manifestFetcher = createManifestFetcher(transportPipelines,
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
   * Create and open a new MediaSource object on the given media element.
   * The MediaSource will be closed on unsubscription.
   */
  const openMediaSource$ = openMediaSource(mediaElement).pipe(
    deferSubscriptions(),
    share());

  /** Send content protection data to the `EMEManager`. */
  const protectedSegments$ = new Subject<IContentProtection>();

  /** Create `EMEManager`, an observable which will handle content DRM. */
  const emeManager$ = openMediaSource$.pipe(
    mergeMap(() => createEMEManager(mediaElement, keySystems, protectedSegments$)),
    deferSubscriptions(),
    share());

  /**
   * Translate errors coming from the media element into RxPlayer errors
   * through a throwing Observable.
   */
  const mediaError$ = throwOnMediaError(mediaElement);

  /**
   * Emit when EME negociations that should happen before pushing any content
   * have finished.
   */
  const waitForEMEReady$ = emeManager$.pipe(filter(isEMEReadyEvent),
                                            take(1));

  /** Do the first Manifest request. */
  const initialManifestRequest$ = fetchManifest(url, { previousManifest: null,
                                                       unsafeMode: false }).pipe(
    deferSubscriptions(),
    share());

  const initialManifestRequestWarnings$ = initialManifestRequest$
    .pipe(filter((evt) : evt is IWarningEvent => evt.type === "warning"));
  const initialManifest$ = initialManifestRequest$
    .pipe(filter((evt) : evt is IManifestFetcherParsedResult => evt.type === "parsed"));

  /** Load and play the content asked. */
  const loadContent$ = observableCombineLatest([initialManifest$,
                                                openMediaSource$,
                                                waitForEMEReady$]).pipe(
    mergeMap(([parsedManifest, initialMediaSource]) => {
      const manifest = parsedManifest.manifest;

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
                                                        initialManifest: parsedManifest,
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
          manifest.addUndecipherableProtectionData(evt.value.type, evt.value.data);
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
       * @param {number} position
       * @param {boolean} shouldPlay
       * @returns {Observable}
       */
      function recursivelyLoadOnMediaSource(
        mediaSource : MediaSource,
        position : number,
        shouldPlay : boolean
      ) : Observable<IInitEvent> {
        const reloadMediaSource$ = new Subject<{ currentTime : number;
                                                 isPaused : boolean; }>();
        const mediaSourceLoader$ = mediaSourceLoader(mediaSource, position, shouldPlay)
          .pipe(tap(evt => {
                  switch (evt.type) {
                    case "needs-manifest-refresh":
                      scheduleRefresh$.next({ completeRefresh: false,
                                              canUseUnsafeMode: true });
                      break;
                    case "manifest-might-be-out-of-sync":
                      scheduleRefresh$.next({
                        completeRefresh: true,
                        canUseUnsafeMode: false,
                        delay: OUT_OF_SYNC_MANIFEST_REFRESH_DELAY,
                      });
                      break;
                    case "needs-media-source-reload":
                      reloadMediaSource$.next(evt.value);
                      break;
                    case "needs-decipherability-flush":
                      const keySystem = getCurrentKeySystem(mediaElement);
                      if (shouldReloadMediaSourceOnDecipherabilityUpdate(keySystem)) {
                        reloadMediaSource$.next(evt.value);
                        return;
                      }

                      // simple seek close to the current position to flush the buffers
                      const { currentTime } = evt.value;
                      if (currentTime + 0.001 < evt.value.duration) {
                        mediaElement.currentTime += 0.001;
                      } else {
                        mediaElement.currentTime = currentTime;
                      }
                      break;
                    case "protected-segment":
                      protectedSegments$.next(evt.value);
                  }
                }));

        const currentLoad$ = mediaSourceLoader$.pipe(takeUntil(reloadMediaSource$));

        const handleReloads$ = reloadMediaSource$.pipe(
          switchMap(({ currentTime, isPaused }) => {
            return openMediaSource(mediaElement).pipe(
              mergeMap(newMS => recursivelyLoadOnMediaSource(newMS,
                                                             currentTime,
                                                             !isPaused)),
              startWith(EVENTS.reloadingMediaSource())
            );
          }));

        return observableMerge(handleReloads$, currentLoad$);
      }
    }));

  return observableMerge(initialManifestRequestWarnings$,
                         loadContent$,
                         mediaError$,
                         emeManager$);
}
