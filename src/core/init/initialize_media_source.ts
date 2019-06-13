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

import objectAssign from "object-assign";
import {
  asapScheduler,
  BehaviorSubject,
  combineLatest as observableCombineLatest,
  concat as observableConcat,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  ReplaySubject,
  Subject,
  timer as observableTimer,
} from "rxjs";
import {
  filter,
  finalize,
  ignoreElements,
  map,
  mergeMap,
  observeOn,
  share,
  startWith,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";
import config from "../../config";
import { ICustomError } from "../../errors";
import log from "../../log";
import Manifest from "../../manifest";
import { ITransportPipelines } from "../../transports";
import throttle from "../../utils/rx-throttle";
import ABRManager, {
  IABRManagerArguments,
} from "../abr";
import {
  IEMEManagerEvent,
  IKeySystemOption,
} from "../eme";
import {
  createManifestPipeline,
  SegmentPipelinesManager,
} from "../pipelines";
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
import refreshManifest from "./refresh_manifest";
import throwOnMediaError from "./throw_on_media_error";
import {
  IInitClockTick,
  IManifestReadyEvent,
  IReloadingMediaSourceEvent,
  IWarningEvent,
} from "./types";

const { DEFAULT_MAX_MANIFEST_REQUEST_RETRY,
        DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
        OUT_OF_SYNC_MANIFEST_REFRESH_DELAY } = config;

/**
 * Returns pipeline options based on the global config and the user config.
 * @param {Object} networkConfig
 * @returns {Object}
 */
function getManifestPipelineOptions(
  { manifestRetry, offlineRetry }: { manifestRetry? : number;
                                     offlineRetry? : number; }
) : { maxRetry: number; maxRetryOffline: number } {
  return {
    maxRetry: manifestRetry != null ? manifestRetry :
                                      DEFAULT_MAX_MANIFEST_REQUEST_RETRY,
    maxRetryOffline: offlineRetry != null ? offlineRetry :
                                            DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
  };
}

// Arguments to give to the `initialize` function
export interface IInitializeOptions {
  adaptiveOptions: IABRManagerArguments;
  autoPlay : boolean;
  bufferOptions : { wantedBufferAhead$ : BehaviorSubject<number>;
                    maxBufferAhead$ : Observable<number>;
                    maxBufferBehind$ : Observable<number>;
                    manualBitrateSwitchingMode : "seamless" | "direct"; };
  clock$ : Observable<IInitClockTick>;
  keySystems : IKeySystemOption[];
  lowLatencyMode : boolean;
  mediaElement : HTMLMediaElement;
  networkConfig: { manifestRetry? : number;
                   offlineRetry? : number;
                   segmentRetry? : number; };
  speed$ : Observable<number>;
  startAt? : IInitialTimeOptions;
  textTrackOptions : ITextTrackSourceBufferOptions;
  pipelines : ITransportPipelines;
  url : string;
}

// Every events emitted by Init.
export type IInitEvent = IManifestReadyEvent |
                         IMediaSourceLoaderEvent |
                         IEMEManagerEvent |
                         IEMEDisabledEvent |
                         IReloadingMediaSourceEvent |
                         IWarningEvent;

/**
 * Central part of the player.
 *
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
    mediaElement,
    networkConfig,
    speed$,
    startAt,
    textTrackOptions,
    pipelines,
    url } : IInitializeOptions
) : Observable<IInitEvent> {
  const warning$ = new Subject<ICustomError>();

  // Fetch and parse the manifest from the URL given.
  // Throttled to avoid doing multiple simultaneous requests.
  const manifestPipelineOptions = getManifestPipelineOptions(networkConfig);
  const fetchManifest = throttle(createManifestPipeline(pipelines,
                                                        manifestPipelineOptions,
                                                        warning$));

  // Creates pipelines for downloading segments.
  const segmentPipelinesManager = new SegmentPipelinesManager<any>(pipelines);

  // Create ABR Manager, which will choose the right "Representation" for a
  // given "Adaptation".
  const abrManager = new ABRManager(adaptiveOptions);

  // Create and open a new MediaSource object on the given media element.
  const openMediaSource$ = openMediaSource(mediaElement).pipe(
    observeOn(asapScheduler), // to launch subscriptions only when all
    share());                 // Observables here are linked

  // Create EME Manager, an observable which will manage every EME-related
  // issue.
  const emeManager$ = openMediaSource$.pipe(
    mergeMap(() => createEMEManager(mediaElement, keySystems)),
    observeOn(asapScheduler), // to launch subscriptions only when all
    share());                 // Observables here are linked

  // Translate errors coming from the media element into RxPlayer errors
  // through a throwing Observable.
  const mediaError$ = throwOnMediaError(mediaElement);

  const loadContent$ = observableCombineLatest([
    openMediaSource$,
    fetchManifest({ url }),
    emeManager$.pipe(filter(isEMEReadyEvent), take(1)),
  ]).pipe(mergeMap(([ initialMediaSource, { manifest, sendingTime } ]) => {

    log.debug("Init: Calculating initial time");
    const initialTime = getInitialTime(manifest, lowLatencyMode, startAt);
    log.debug("Init: Initial time calculated:", initialTime);

    const mediaSourceLoader = createMediaSourceLoader({
      mediaElement,
      manifest,
      clock$,
      speed$,
      abrManager,
      segmentPipelinesManager,
      bufferOptions: objectAssign({ textTrackOptions,
                                    offlineRetry: networkConfig.offlineRetry,
                                    segmentRetry: networkConfig.segmentRetry },
                                  bufferOptions),
    });

    const recursiveLoad$ = recursivelyLoadOnMediaSource(initialMediaSource,
                                                        initialTime,
                                                        autoPlay);

    // Emit each time the manifest is refreshed.
    const manifestRefreshed$ = new ReplaySubject<{ manifest : Manifest;
                                                   sendingTime? : number; }>(1);

    // Emit when we want to manually update the manifest.
    // The value allow to set a delay relatively to the last Manifest refresh
    // (to avoid asking for it too often).
    const scheduleManifestRefresh$ = new Subject<number>();

    // Emit when the manifest should be refreshed. Either when:
    //   - A buffer asks for it to be refreshed
    //   - its lifetime expired.
    // TODO if we go a little more clever, manifestRefreshed$ could be removed
    const manifestRefresh$ = manifestRefreshed$.pipe(
      startWith({ manifest, sendingTime }),
      switchMap(({ manifest: newManifest, sendingTime: newSendingTime }) => {
        const manualRefresh$ = scheduleManifestRefresh$.pipe(
          mergeMap((delay) => {
            // schedule a Manifest refresh to avoid sending too much request.
            const timeSinceLastRefresh = newSendingTime == null ?
                                           0 :
                                           performance.now() - newSendingTime;
            return observableTimer(delay - timeSinceLastRefresh);
          }));

        const autoRefresh$ = (() => {
          if (newManifest.lifetime == null || newManifest.lifetime <= 0) {
            return EMPTY;
          }
          const timeSinceRequest = newSendingTime == null ?
                                     0 :
                                     performance.now() - newSendingTime;
          const updateTimeout = newManifest.lifetime * 1000 - timeSinceRequest;
          return observableTimer(updateTimeout);
        })();

        return observableMerge(autoRefresh$, manualRefresh$)
          .pipe(take(1),
                mergeMap(() => refreshManifest(manifest, fetchManifest)),
                tap(val => manifestRefreshed$.next(val)),
                ignoreElements());
      }));

    return observableMerge(manifestRefresh$, recursiveLoad$)
      .pipe(finalize(() => {
        manifestRefreshed$.complete();
        scheduleManifestRefresh$.complete();
      }));

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
                    scheduleManifestRefresh$.next(0);
                    break;
                  case "manifest-might-be-out-of-sync":
                    scheduleManifestRefresh$.next(OUT_OF_SYNC_MANIFEST_REFRESH_DELAY);
                    break;
                  case "needs-media-source-reload":
                    reloadMediaSource$.next(evt.value);
                    break;
                }
              }));

      const currentLoad$ = observableConcat(
        observableOf(EVENTS.manifestReady(manifest)),
        mediaSourceLoader$.pipe(takeUntil(reloadMediaSource$)));

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

  return observableMerge(loadContent$,
                         mediaError$,
                         emeManager$,
                         warning$.pipe(map(EVENTS.warning)));
}
