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
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  filter,
  map,
  mergeMap,
  observeOn,
  share,
  startWith,
  switchMap,
  take,
  takeUntil,
} from "rxjs/operators";
import config from "../../config";
import { ICustomError } from "../../errors";
import log from "../../log";
import { ITransportPipelines } from "../../transports";
import throttle from "../../utils/rx-throttle";
import ABRManager, {
  IABRManagerArguments,
} from "../abr";
import { INeedsMediaSourceReload } from "../buffers";
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
import throwOnMediaError from "./throw_on_media_error";
import {
  IInitClockTick,
  IManifestReadyEvent,
  IReloadingMediaSourceEvent,
  IWarningEvent,
} from "./types";

const { DEFAULT_MAX_MANIFEST_REQUEST_RETRY,
        DEFAULT_MAX_PIPELINES_RETRY_ON_ERROR } = config;

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
  ]).pipe(mergeMap(([ initialMediaSource, { manifest } ]) => {

    log.debug("Init: Calculating initial time");
    const initialTime = getInitialTime(manifest, startAt);
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

    return recursiveLoad$;

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
      const mediaSourceLoader$ = mediaSourceLoader(mediaSource, position, shouldPlay)
        .pipe(observeOn(asapScheduler),
              share());

      const reloadMediaSource$ = mediaSourceLoader$
        .pipe(filter((evt) : evt is INeedsMediaSourceReload =>
                evt.type === "needs-media-source-reload"
              ),
              map(evt => evt.value));

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
