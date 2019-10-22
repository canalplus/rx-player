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
  merge as observableMerge,
  Observable,
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
  subscribeOn,
  switchMap,
  take,
  takeUntil,
  tap,
} from "rxjs/operators";
import config from "../../config";
import { ICustomError } from "../../errors";
import log from "../../log";
import { ITransportPipelines } from "../../transports";
import { fromEvent } from "../../utils/event_emitter";
import throttle from "../../utils/rx-throttle";
import ABRManager, {
  IABRManagerArguments,
} from "../abr";
import {
  IContentProtection,
  IEMEManagerEvent,
  IKeySystemOption,
} from "../eme";
import {
  createManifestPipeline,
  IFetchManifestResult,
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
import manifestUpdateScheduler from "./manifest_update_scheduler";
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
  minimumManifestUpdateInterval : number;
  networkConfig: { manifestRetry? : number;
                   offlineRetry? : number;
                   segmentRetry? : number; };
  pipelines : ITransportPipelines;
  speed$ : Observable<number>;
  startAt? : IInitialTimeOptions;
  textTrackOptions : ITextTrackSourceBufferOptions;
  url? : string;
}

// Every events emitted by Init.
export type IInitEvent = IManifestReadyEvent |
                         IManifestUpdateEvent |
                         IMediaSourceLoaderEvent |
                         IEMEManagerEvent |
                         IEMEDisabledEvent |
                         IReloadingMediaSourceEvent |
                         IDecipherabilityUpdateEvent |
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
    minimumManifestUpdateInterval,
    networkConfig,
    pipelines,
    speed$,
    startAt,
    textTrackOptions,
    url } : IInitializeOptions
) : Observable<IInitEvent> {
  const { offlineRetry, segmentRetry, manifestRetry } = networkConfig;

  const warning$ = new Subject<ICustomError>();
  const manifestPipelines = createManifestPipeline(pipelines,
                                                   { lowLatencyMode,
                                                     manifestRetry,
                                                     offlineRetry },
                                                   warning$);

  // Fetch and parse the manifest from the URL given.
  // Throttled to avoid doing multiple simultaneous requests.
  const fetchManifest = throttle(
    (manifestURL : string | undefined,
     externalClockOffset : number | undefined)
    : Observable<IFetchManifestResult> => {
      return manifestPipelines.fetch(manifestURL).pipe(
        mergeMap((response) =>
          manifestPipelines.parse(response.value, manifestURL, externalClockOffset)
        ),
        share());
    }
  );

  // Creates pipelines for downloading segments.
  const segmentPipelinesManager =
    new SegmentPipelinesManager<any>(pipelines, { lowLatencyMode,
                                                  offlineRetry,
                                                  segmentRetry });

  // Create ABR Manager, which will choose the right "Representation" for a
  // given "Adaptation".
  const abrManager = new ABRManager(adaptiveOptions);

  // Create and open a new MediaSource object on the given media element.
  const openMediaSource$ = openMediaSource(mediaElement).pipe(
    subscribeOn(asapScheduler), // to launch subscriptions only when all
    share());                   // Observables here are linked

  // Send content protection data to EMEManager
  const protectedSegments$ = new Subject<IContentProtection>();

  // Create EME Manager, an observable which will manage every EME-related
  // issue.
  const emeManager$ = openMediaSource$.pipe(
    mergeMap(() => createEMEManager(mediaElement, keySystems, protectedSegments$)),
    subscribeOn(asapScheduler), // to launch subscriptions only when all
    share());                   // Observables here are linked

  // Translate errors coming from the media element into RxPlayer errors
  // through a throwing Observable.
  const mediaError$ = throwOnMediaError(mediaElement);

  const loadContent$ = observableCombineLatest([
    openMediaSource$,
    fetchManifest(url, undefined),
    emeManager$.pipe(filter(isEMEReadyEvent), take(1)),
  ]).pipe(mergeMap(([ initialMediaSource, { manifest, sendingTime } ]) => {

    const blacklistUpdates$ = emeManager$.pipe(tap((evt) => {
      if (evt.type === "blacklist-keys") {
        log.info("Init: blacklisting based on keyIDs");
        manifest.markUndecipherableKIDs(evt.value);
      } else if (evt.type === "blacklist-protection-data") {
        log.info("Init: blacklisting based on protection data.");
        manifest.markUndecipherableProtectionData(evt.value.data);
      }
    }));

    log.debug("Init: Calculating initial time");
    const initialTime = getInitialTime(manifest, lowLatencyMode, startAt);
    log.debug("Init: Initial time calculated:", initialTime);

    const mediaSourceLoader = createMediaSourceLoader({
      abrManager,
      bufferOptions: objectAssign({ textTrackOptions }, bufferOptions),
      clock$,
      manifest,
      mediaElement,
      segmentPipelinesManager,
      speed$,
    });

    const recursiveLoad$ = recursivelyLoadOnMediaSource(initialMediaSource,
                                                        initialTime,
                                                        autoPlay);

    // Emit when we want to manually update the manifest.
    // The value allow to set a delay relatively to the last Manifest refresh
    // (to avoid asking for it too often).
    const scheduleManifestRefresh$ = new Subject<number>();

    const manifestUpdate$ = manifestUpdateScheduler({ manifest, sendingTime },
                                                    scheduleManifestRefresh$,
                                                    fetchManifest,
                                                    minimumManifestUpdateInterval);

    const manifestEvents$ = observableMerge(
      fromEvent(manifest, "manifestUpdate").pipe(mapTo(EVENTS.manifestUpdate())),
      fromEvent(manifest, "decipherabilityUpdate")
        .pipe(map(EVENTS.decipherabilityUpdate)));

    return observableMerge(blacklistUpdates$,
                           manifestUpdate$,
                           manifestEvents$,
                           recursiveLoad$)
              .pipe(startWith(EVENTS.manifestReady(manifest)),
                    finalize(() => {
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

  return observableMerge(loadContent$,
                         mediaError$,
                         emeManager$,
                         warning$.pipe(map(EVENTS.warning)));
}
