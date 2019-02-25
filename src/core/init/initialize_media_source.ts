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
  IABRMetric,
  IABRRequest,
} from "../abr";
import {
  IEMEManagerEvent,
  IKeySystemOption,
} from "../eme";
import {
  createManifestPipeline,
  IPipelineOptions,
  SegmentPipelinesManager,
} from "../pipelines";
import {
  IBufferType,
  ITextTrackSourceBufferOptions,
} from "../source_buffers";
import createEMEManager, {
  IEMEDisabledEvent,
} from "./create_eme_manager";
import openMediaSource from "./create_media_source";
import EVENTS from "./events_generators";
import getInitialTime, {
  IInitialTimeOptions,
} from "./get_initial_time";
import createMediaSourceLoader, {
  IMediaSourceLoaderEvent,
} from "./load_on_media_source";
import throwOnMediaError from "./throw_on_media_error";
import {
  IInitClockTick,
  IManifestReadyEvent,
  IReloadingMediaSourceEvent,
  IWarningEvent,
} from "./types";

/**
 * Returns pipeline options based on the global config and the user config.
 * @param {Object} networkConfig
 * @returns {Object}
 */
function getManifestPipelineOptions(
  networkConfig: {
    manifestRetry? : number;
    offlineRetry? : number;
  }
) : IPipelineOptions<any, any> {
  return {
    maxRetry: networkConfig.manifestRetry != null ?
      networkConfig.manifestRetry : config.DEFAULT_MAX_MANIFEST_REQUEST_RETRY,
    maxRetryOffline: networkConfig.offlineRetry != null ?
      networkConfig.offlineRetry : config.DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR,
  };
}

// Arguments to give to the `initialize` function
export interface IInitializeOptions {
  adaptiveOptions: {
    initialBitrates : Partial<Record<IBufferType, number>>;
    manualBitrates : Partial<Record<IBufferType, number>>;
    maxAutoBitrates : Partial<Record<IBufferType, number>>;
    throttle : Partial<Record<IBufferType, Observable<number>>>;
    limitWidth : Partial<Record<IBufferType, Observable<number>>>;
  };
  autoPlay : boolean;
  bufferOptions : {
    wantedBufferAhead$ : Observable<number>;
    maxBufferAhead$ : Observable<number>;
    maxBufferBehind$ : Observable<number>;
    manualBitrateSwitchingMode : "seamless"|"direct";
  };
  clock$ : Observable<IInitClockTick>;
  keySystems : IKeySystemOption[];
  mediaElement : HTMLMediaElement;
  networkConfig: {
    manifestRetry? : number;
    offlineRetry? : number;
    segmentRetry? : number;
  };
  speed$ : Observable<number>;
  startAt? : IInitialTimeOptions;
  textTrackOptions : ITextTrackSourceBufferOptions;
  pipelines : ITransportPipelines;
  url : string;
}

// Every events emitted by Init.
export type IInitEvent =
  IManifestReadyEvent |
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
 *  - Creates the MediaSource and attached sourceBuffers instances.
 *  - download the content's manifest
 *  - Perform EME management if needed
 *  - get Buffers for each active adaptations.
 *  - give choice of the adaptation to the caller (e.g. to choose a language)
 *  - returns Observable emitting notifications about the content lifecycle.
 * @param {Object} args
 * @returns {Observable}
 */
export default function InitializeOnMediaSource({
  adaptiveOptions,
  autoPlay,
  bufferOptions,
  clock$,
  keySystems,
  mediaElement,
  networkConfig,
  speed$,
  startAt,
  textTrackOptions,
  pipelines,
  url,
} : IInitializeOptions) : Observable<IInitEvent> {
  const warning$ = new Subject<Error|ICustomError>();

  // Fetch and parse the manifest from the URL given.
  // Throttled to avoid doing multiple simultaneous requests.
  const fetchManifest = throttle(createManifestPipeline(
    pipelines,
    getManifestPipelineOptions(networkConfig),
    warning$
  ));

  // Subject through which network metrics will be sent by the segment
  // pipelines to the ABR manager.
  const network$ = new Subject<IABRMetric>();

  // Subject through which each request progression will be sent by the
  // segment pipelines to the ABR manager.
  const requestsInfos$ = new Subject<Subject<IABRRequest>>();

  // Creates pipelines for downloading segments.
  const segmentPipelinesManager = new SegmentPipelinesManager<any>(
    pipelines, requestsInfos$, network$, warning$);

  // Create ABR Manager, which will choose the right "Representation" for a
  // given "Adaptation".
  const abrManager = new ABRManager(requestsInfos$, network$, adaptiveOptions);

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

  // Emit each time the manifest is refreshed.
  const manifestRefreshed$ = new ReplaySubject<{
    manifest : Manifest;
    sendingTime? : number;
  }>(1);

  const emeInitialized$ = emeManager$.pipe(
    filter(({ type }) => type === "eme-init" || type === "eme-disabled"),
    take(1)
  );

  const loadContent$ = observableCombineLatest(
    openMediaSource$,
    fetchManifest(url),
    emeInitialized$
  ).pipe(mergeMap(([ mediaSource, { manifest, sendingTime } ]) => {

    /**
     * Refresh the manifest on subscription.
     * @returns {Observable}
     */
    function refreshManifest() : Observable<never> {
      const refreshURL = manifest.getUrl();
      if (!refreshURL) {
        log.warn("Init: Cannot refresh the manifest: no url");
        return EMPTY;
      }

      return fetchManifest(refreshURL).pipe(
        tap(({ manifest: newManifest, sendingTime: newSendingTime }) => {
          manifest.update(newManifest);
          manifestRefreshed$.next({ manifest, sendingTime: newSendingTime });
        }),
        ignoreElements(),
        share() // share the previous side-effect
      );
    }

    const loadOnMediaSource = createMediaSourceLoader({ // Behold!
      mediaElement,
      manifest,
      clock$,
      speed$,
      abrManager,
      segmentPipelinesManager,
      bufferOptions: objectAssign({
        textTrackOptions,
        offlineRetry: networkConfig.offlineRetry,
        segmentRetry: networkConfig.segmentRetry,
      }, bufferOptions),
    });

    log.debug("Init: Calculating initial time");
    const initialTime = getInitialTime(manifest, startAt);
    log.debug("Init: Initial time calculated:", initialTime);

    const reloadMediaSource$ = new Subject<void>();
    const onEvent =
      createEventListener(reloadMediaSource$, refreshManifest);
    const handleReloads$ : Observable<IInitEvent> = reloadMediaSource$.pipe(
      switchMap(() => {
        const currentPosition = mediaElement.currentTime;
        const isPaused = mediaElement.paused;
        return openMediaSource(mediaElement).pipe(
          mergeMap(newMS => loadOnMediaSource(newMS, currentPosition, !isPaused)),
          mergeMap(onEvent),
          startWith(EVENTS.reloadingMediaSource())
        );
      })
    );

    const loadOnMediaSource$ = observableConcat(
      observableOf(EVENTS.manifestReady(abrManager, manifest)),
      loadOnMediaSource(mediaSource, initialTime, autoPlay).pipe(
        takeUntil(reloadMediaSource$),
        mergeMap(onEvent)
      )
    );

    // Emit when the manifest should be refreshed due to its lifetime being expired
    const manifestAutoRefresh$ = manifestRefreshed$.pipe(
      startWith({ manifest, sendingTime }),
      switchMap(({ manifest: newManifest, sendingTime: newSendingTime }) => {
        if (newManifest.lifetime) {
          const timeSinceRequest = newSendingTime == null ?
            0 : performance.now() - newSendingTime;
          const updateTimeout = newManifest.lifetime * 1000 - timeSinceRequest;
          return observableTimer(updateTimeout);
        }
        return EMPTY;
      })
    ).pipe(mergeMap(refreshManifest));

    return observableMerge(loadOnMediaSource$, handleReloads$, manifestAutoRefresh$);
  }));

  return observableMerge(
    loadContent$,
    mediaError$,
    emeManager$,
    warning$.pipe(map(EVENTS.warning))
  );
}

/**
 * Generate function reacting to playback events.
 * @param {Subject} reloadMediaSource$
 * @param {Function} refreshManifest
 * @returns {Function}
 */
function createEventListener(
  reloadMediaSource$ : Subject<void>,
  refreshManifest : () => Observable<never>
) : (evt : IMediaSourceLoaderEvent) => Observable<IInitEvent> {
  /**
   * React to playback events.
   * @param {Object} evt
   * @returns {Observable}
   */
  return function onEvent(evt : IMediaSourceLoaderEvent) {
    switch (evt.type) {
      case "needs-media-source-reload":
        reloadMediaSource$.next();
        break;

      case "needs-manifest-refresh":
        return refreshManifest();
    }
    return observableOf(evt);
  };
}
