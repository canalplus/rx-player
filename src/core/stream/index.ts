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
  map,
  mergeMap,
  share,
  startWith,
  switchMap,
  takeUntil,
  tap,
} from "rxjs/operators";
import config from "../../config";
import { ICustomError } from "../../errors";
import log from "../../log";
import Manifest from "../../manifest";
import throttle from "../../utils/rx-throttle";
import ABRManager, {
  IABRMetric,
  IABRRequest,
} from "../abr";
import { IKeySystemOption } from "../eme/types";
import {
  createManifestPipeline,
  IManifestTransportInfos,
  IPipelineOptions,
  SegmentPipelinesManager,
} from "../pipelines";
import {
  IBufferType,
  IOverlaySourceBufferOptions,
  ITextTrackSourceBufferOptions,
} from "../source_buffers";
import createEMEManager, {
  IEMEManagerEvent,
} from "./create_eme_manager";
import openMediaSource from "./create_media_source";
import EVENTS from "./events_generators";
import getInitialTime, {
  IInitialTimeOptions,
} from "./get_initial_time";
import createMediaErrorManager from "./media_error_manager";
import StreamLoader, {
  IStreamLoaderEvent,
} from "./stream_loader";
import {
  IManifestReadyEvent,
  IManifestUpdateEvent,
  IReloadingStreamEvent,
  IStreamClockTick,
  IStreamWarningEvent,
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

// Arguments to give to the Stream
export interface IStreamOptions {
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
  clock$ : Observable<IStreamClockTick>;
  keySystems : IKeySystemOption[];
  mediaElement : HTMLMediaElement;
  networkConfig: {
    manifestRetry? : number;
    offlineRetry? : number;
    segmentRetry? : number;
  };
  speed$ : Observable<number>;
  startAt? : IInitialTimeOptions;
  transport : IManifestTransportInfos;
  sourceBufferOptions?: {
    text?: ITextTrackSourceBufferOptions;
    overlay?: IOverlaySourceBufferOptions;
  };
  url : string;
}

// Every events emitted by the stream.
export type IStreamEvent =
  IManifestReadyEvent |
  IStreamLoaderEvent |
  IEMEManagerEvent |
  IReloadingStreamEvent |
  IStreamWarningEvent;

/**
 * Central part of the player. Play a given stream described by the given
 * manifest with given options.
 *
 * On subscription:
 *  - Creates the MediaSource and attached sourceBuffers instances.
 *  - download the content's manifest
 *  - Perform EME management if needed
 *  - get Buffers for each active adaptations.
 *  - give choice of the adaptation to the caller (e.g. to choose a language)
 *  - returns Observable emitting notifications about the stream lifecycle.
 * @param {Object} args
 * @returns {Observable}
 */
export default function Stream({
  adaptiveOptions,
  autoPlay,
  bufferOptions,
  clock$,
  keySystems,
  mediaElement,
  networkConfig,
  speed$,
  startAt,
  sourceBufferOptions,
  transport,
  url,
} : IStreamOptions) : Observable<IStreamEvent> {
  // Subject through which warnings will be sent
  const warning$ = new Subject<Error|ICustomError>();

  // Fetch and parse the manifest from the URL given.
  // Throttled to avoid doing multiple simultaneous requests.
  const fetchManifest = throttle(createManifestPipeline(
    transport,
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
    transport.pipelines, requestsInfos$, network$, warning$);

  // Create ABR Manager, which will choose the right "Representation" for a
  // given "Adaptation".
  const abrManager = new ABRManager(requestsInfos$, network$, adaptiveOptions);

  // Create EME Manager, an observable which will manage every EME-related
  // issue.
  const emeManager$ = createEMEManager(mediaElement, keySystems);

  // Translate errors coming from the media element into RxPlayer errors
  // through a throwing Observable.
  const mediaErrorManager$ = createMediaErrorManager(mediaElement);

  // Emit each time the manifest is updated.
  const updatedManifest$ = new ReplaySubject<{
    manifest : Manifest;
    sendingTime? : number;
  }>(1);

  // Start the whole Stream.
  const stream$ = observableCombineLatest(
    openMediaSource(mediaElement),
    fetchManifest(url)
  ).pipe(mergeMap(([ mediaSource, { manifest, sendingTime } ]) => {
    /**
     * @returns {Observable}
     */
    function refreshManifest() : Observable<IManifestUpdateEvent> {
      const refreshURL = manifest.getUrl();
      if (!refreshURL) {
        log.warn("Stream: Cannot refresh the manifest: no url");
        return EMPTY;
      }

      return fetchManifest(refreshURL).pipe(
        map(({ manifest: newManifest, sendingTime: newSendingTime }) => {
          manifest.update(newManifest);
          return EVENTS.manifestUpdate(manifest, newSendingTime);
        }),
        tap((evt) => updatedManifest$.next(evt.value)),
        share() // share the previous sideeceffect
      );
    }

    const loadStream = StreamLoader({ // Behold!
      mediaElement,
      manifest,
      clock$,
      speed$,
      abrManager,
      segmentPipelinesManager,
      bufferOptions: objectAssign({
        offlineRetry: networkConfig.offlineRetry,
        segmentRetry: networkConfig.segmentRetry,
        textTrackOptions: sourceBufferOptions && sourceBufferOptions.text,
        overlayOptions: sourceBufferOptions && sourceBufferOptions.overlay,
      }, bufferOptions),
    });

    log.debug("Stream: Calculating initial time");
    const initialTime = getInitialTime(manifest, startAt);
    log.debug("Stream: Initial time calculated:", initialTime);

    const reloadStreamSubject$ = new Subject<void>();
    const onStreamLoaderEvent =
      streamLoaderEventProcessor(reloadStreamSubject$, refreshManifest);
    const reloadStream$ : Observable<IStreamEvent> = reloadStreamSubject$.pipe(
      switchMap(() => {
        const currentPosition = mediaElement.currentTime;
        const isPaused = mediaElement.paused;
        return openMediaSource(mediaElement).pipe(
          mergeMap(newMS => loadStream(newMS, currentPosition, !isPaused)),
          mergeMap(onStreamLoaderEvent),
          startWith(EVENTS.reloadingStream())
        );
      })
    );

    const initialLoad$ = observableConcat(
      observableOf(EVENTS.manifestReady(abrManager, manifest)),
      loadStream(mediaSource, initialTime, autoPlay).pipe(
        takeUntil(reloadStreamSubject$),
        mergeMap(onStreamLoaderEvent)
      )
    );

    // Emit when the manifest should be updated due to its lifetime being expired
    const manifestUpdateTimeout$ : Observable<unknown> = updatedManifest$.pipe(
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
    );

    return observableMerge(
      initialLoad$,
      reloadStream$,
      manifestUpdateTimeout$.pipe(mergeMap(refreshManifest))
    );
  }));

  return observableMerge(
    stream$,
    mediaErrorManager$,
    emeManager$,
    warning$.pipe(map(EVENTS.warning))
  );
}

/**
 * Generate function reacting to StreamLoader events.
 * @param {Subject} reloadStreamSubject$
 * @param {Function} refreshManifest
 * @returns {Function}
 */
function streamLoaderEventProcessor(
  reloadStreamSubject$ : Subject<void>,
  refreshManifest : () => Observable<IManifestUpdateEvent>
) : (evt : IStreamLoaderEvent) => Observable<IStreamEvent> {
  /**
   * React to StreamLoader events.
   * @param {Object} evt
   * @returns {Observable}
   */
  return function onStreamLoaderEvent(evt : IStreamLoaderEvent) {
    switch (evt.type) {
      case "needs-stream-reload":
        reloadStreamSubject$.next();
        break;

      case "needs-manifest-refresh":
        return refreshManifest();
    }
    return observableOf(evt);
  };
}
