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
  combineLatest as observableCombineLatest,
  EMPTY,
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
} from "rxjs";
import {
  finalize,
  ignoreElements,
  map,
  mergeMap,
  takeUntil,
} from "rxjs/operators";
import config from "../../config";
import {
  ICustomError,
  MediaError,
} from "../../errors";
import log from "../../log";
import Manifest, {
  ISupplementaryImageTrack,
  ISupplementaryTextTrack,
} from "../../manifest";
import { ITransportPipelines } from "../../net";
import throttle from "../../utils/rx-throttle";
import WeakMapMemory from "../../utils/weak_map_memory";
import ABRManager, {
  IABRMetric,
  IABRRequest,
} from "../abr";
import BufferManager from "../buffer";
import { IKeySystemOption } from "../eme/types";
import {
  createManifestPipeline,
  IPipelineOptions,
  SegmentPipelinesManager,
} from "../pipelines";
import SourceBufferManager, {
  IBufferType ,
  ITextTrackSourceBufferOptions,
  QueuedSourceBuffer,
} from "../source_buffers";
import BuffersHandler from "./buffers_handler";
import createBufferClock, {
  IStreamClockTick,
} from "./clock";
import createEMEManager from "./create_eme_manager";
import openMediaSource, {
  setDurationToMediaSource,
} from "./create_media_source";
import { maintainEndOfStream } from "./end_of_stream";
import BufferGarbageCollector from "./garbage_collector";
import getInitialTime, {
  IInitialTimeOptions,
} from "./get_initial_time";
import liveEventsHandler from "./live_events_handler";
import createMediaErrorHandler from "./media_error_handler";
import SegmentBookkeeper from "./segment_bookkeeper";
import SpeedManager from "./speed_manager";
import StallingManager from "./stalling_manager";
import EVENTS, {
  IStreamEvent,
} from "./stream_events";
import seekAndLoadOnMediaEvent from "./video_events";

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
  };
  clock$ : Observable<IStreamClockTick>;
  keySystems : IKeySystemOption[];
  networkConfig: {
    manifestRetry? : number;
    offlineRetry? : number;
    segmentRetry? : number;
  };
  speed$ : Observable<number>;
  startAt? : IInitialTimeOptions;
  supplementaryImageTracks : ISupplementaryImageTrack[];
  supplementaryTextTracks : ISupplementaryTextTrack[];
  textTrackOptions : ITextTrackSourceBufferOptions;
  transport : ITransportPipelines;
  url : string;
  videoElement : HTMLMediaElement;
}

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
 *
 * @param {Object} args
 * @returns {Observable}
 */
export default function Stream({
  adaptiveOptions,
  autoPlay,
  bufferOptions,
  clock$,
  keySystems,
  networkConfig,
  speed$,
  startAt,
  supplementaryImageTracks, // eventual manually added images
  supplementaryTextTracks, // eventual manually added subtitles
  textTrackOptions,
  transport,
  url,
  videoElement,
} : IStreamOptions) : Observable<IStreamEvent> {

  const {
    wantedBufferAhead$,
    maxBufferAhead$,
    maxBufferBehind$,
  } = bufferOptions;

  /**
   * Observable through which all warning events will be sent.
   * @type {Subject}
   */
  const warning$ = new Subject<Error|ICustomError>();

  /**
   * Fetch and parse the manifest from the URL given.
   * Throttled to avoid doing multiple simultaneous requests.
   * @param {string} url - the manifest url
   * @returns {Observable} - the parsed manifest
   */
  const fetchManifest = throttle(createManifestPipeline(
    transport,
    getManifestPipelineOptions(networkConfig),
    warning$,
    supplementaryTextTracks,
    supplementaryImageTracks
  ));

  /**
   * Keep track of a unique BufferGarbageCollector created per
   * QueuedSourceBuffer.
   * @type {WeakMapMemory}
   */
  const garbageCollectors =
    new WeakMapMemory((qSourceBuffer : QueuedSourceBuffer<any>) =>
      BufferGarbageCollector({
        queuedSourceBuffer: qSourceBuffer,
        clock$: clock$.pipe(map(tick => tick.currentTime)),
        maxBufferBehind$,
        maxBufferAhead$,
      })
    );

  /**
   * Keep track of a unique segmentBookkeeper created per
   * QueuedSourceBuffer.
   * @type {WeakMapMemory}
   */
  const segmentBookkeepers =
    new WeakMapMemory<QueuedSourceBuffer<any>, SegmentBookkeeper>(() =>
      new SegmentBookkeeper()
    );

  /**
   * Start the whole Stream.
   * @type {Observable}
   */
  const stream$ = observableCombineLatest(
    openMediaSource(videoElement),
    fetchManifest(url)
  ).pipe(mergeMap(([ mediaSource, manifest ]) =>
    initializeStream(mediaSource, manifest))
  );

  const warningEvents$ = warning$.pipe(map(EVENTS.warning));

  return observableMerge(stream$, warningEvents$);

  /**
   * Initialize stream playback by merging all observable that are required to
   * make the system cooperate.
   * @param {MediaSource} mediaSource
   * @param {Object} manifest
   * @returns {Observable}
   */
  function initializeStream(
    mediaSource : MediaSource,
    manifest : Manifest
  ) : Observable<IStreamEvent> {
    setDurationToMediaSource(mediaSource, manifest.getDuration());

    log.debug("calculating initial time");
    const initialTime = getInitialTime(manifest, startAt);
    log.debug("initial time calculated:", initialTime);

    const firstPeriodToPlay = manifest.getPeriodForTime(initialTime);
    if (firstPeriodToPlay == null) {
      throw new MediaError("MEDIA_STARTING_TIME_NOT_FOUND", null, true);
    }

    const {
      seek$,
      load$,
    } = seekAndLoadOnMediaEvent(videoElement, initialTime, autoPlay);

    const bufferClock$ = createBufferClock(manifest, clock$, seek$, initialTime);

    /**
     * Subject through which network metrics will be sent by the segment
     * pipelines to the ABR manager.
     * @type {Subject}
     */
    const network$ = new Subject<IABRMetric>();

    /**
     * Subject through which each request progression will be sent by the
     * segment pipelines to the ABR manager.
     * @type {Subject}
     */
    const requestsInfos$ = new Subject<Subject<IABRRequest>>();

    /**
     * Creates pipelines for downloading segments.
     * @type {SegmentPipelinesManager}
     */
    const segmentPipelinesManager = new SegmentPipelinesManager<any>(
      transport, requestsInfos$, network$, warning$);

    /**
     * Create ABR Manager, which will choose the right "Representation" for a
     * given "Adaptation".
     * @type {ABRManager}
     */
    const abrManager = new ABRManager(requestsInfos$, network$, adaptiveOptions);

    /**
     * Clock needed by the BufferManager
     * @type {Observable}
     */
    const abrClock$ = observableCombineLatest(clock$, speed$).pipe(
      map(([tick, speed]) => {
        return {
          bufferGap: tick.bufferGap,
          duration: tick.duration,
          isLive: manifest.isLive,
          position: tick.currentTime,
          speed,
        };
      }));

    /**
     * Creates BufferManager allowing to easily create a Buffer linked to any
     * Adaptation from the current content.
     * @type {BufferManager}
     */
    const bufferManager = new BufferManager(abrManager, abrClock$);

    /**
     * Creates SourceBufferManager allowing to create and keep track of a single
     * SourceBuffer per type.
     * @type {SourceBufferManager}
     */
    const sourceBufferManager = new SourceBufferManager(videoElement, mediaSource);

    // Will be used to cancel any endOfStream tries when the contents resume
    const cancelEndOfStream$ = new Subject<null>();

    // Will be used to process the events of the buffer
    const bufferEventHandler : (arg : IStreamEvent) => Observable<IStreamEvent> =
      manifest.isLive ?
        liveEventsHandler(videoElement, manifest, fetchManifest) :
        observableOf;

    /**
     * Creates Observable which will manage every Buffer for the given Content.
     * @type {Observable}
     */
    const buffers$ = BuffersHandler(
      { manifest, period: firstPeriodToPlay }, // content
      bufferClock$,
      wantedBufferAhead$,
      bufferManager,
      sourceBufferManager,
      segmentPipelinesManager,
      segmentBookkeepers,
      garbageCollectors,
      {
        maxRetry: networkConfig.segmentRetry,
        maxRetryOffline: networkConfig.offlineRetry,
        textTrackOptions,
      },
      warning$
    ).pipe(mergeMap((evt) : Observable<IStreamEvent> => {
        switch (evt.type) {
          case "end-of-stream":
            return maintainEndOfStream(mediaSource)
              .pipe(
                ignoreElements(),
                takeUntil(cancelEndOfStream$)
              );
          case "resume-stream":
            cancelEndOfStream$.next(null);
            return EMPTY;
          default:
            return bufferEventHandler(evt);
        }
      }));

    /**
     * Create EME Manager, an observable which will manage every EME-related
     * issue.
     * @type {Observable}
     */
    const emeManager$ = createEMEManager(videoElement, keySystems, warning$);

    /**
     * Translate errors coming from the video element into RxPlayer errors
     * through a throwing Observable.
     * @type {Observable}
     */
    const mediaErrorHandler$ = createMediaErrorHandler(videoElement);

    /**
     * Create Speed Manager, an observable which will set the speed set by the
     * user on the video element while pausing a little longer while the buffer
     * is stalled.
     * @type {Observable}
     */
    const speedManager$ = SpeedManager(videoElement, speed$, clock$, {
      pauseWhenStalled: true,
    }).pipe(map(EVENTS.speedChanged));

    /**
     * Create Stalling Manager, an observable which will try to get out of
     * various infinite stalling issues
     * @type {Observable}
     */
    const stallingManager$ = StallingManager(videoElement, clock$)
      .pipe(map(EVENTS.stalled));

    // Single lifecycle events
    const manifestReadyEvent$ = observableOf(EVENTS.manifestReady(abrManager, manifest));

    const loadedEvent$ = load$
      .pipe(mergeMap((evt) => {
        if (evt === "autoplay-blocked") {
          const error = new MediaError("MEDIA_ERR_BLOCKED_AUTOPLAY", null, false);
          return observableOf(EVENTS.warning(error), EVENTS.loaded());
        }
        return observableOf(EVENTS.loaded());
      }));

    return observableMerge(
      manifestReadyEvent$,
      loadedEvent$,
      buffers$,
      emeManager$ as Observable<any>, // TODO RxJS Bug?
      mediaErrorHandler$ as Observable<any>, // TODO RxJS Bug?
      speedManager$,
      stallingManager$
    ).pipe(finalize(() => {
      // clean-up every created SourceBuffers
      sourceBufferManager.disposeAll();
    }));
  }
}

export {
  IStreamEvent,
  SegmentBookkeeper,
};
