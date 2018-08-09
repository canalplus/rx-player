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
import { MediaError } from "../../errors";
import Manifest from "../../manifest";
import WeakMapMemory from "../../utils/weak_map_memory";
import ABRManager from "../abr";
import BufferManager from "../buffer";
import { IKeySystemOption } from "../eme/types";
import { SegmentPipelinesManager } from "../pipelines";
import SourceBufferManager, {
  ITextTrackSourceBufferOptions,
  QueuedSourceBuffer,
} from "../source_buffers";
import BuffersHandler, {
  IBufferHandlerEvent,
} from "./buffers_handler";
import createBufferClock, {
  IStreamClockTick,
} from "./clock";
import createEMEManager from "./create_eme_manager";
import { setDurationToMediaSource } from "./create_media_source";
import { maintainEndOfStream } from "./end_of_stream";
import BufferGarbageCollector from "./garbage_collector";
import liveEventsHandler from "./live_events_handler";
import createMediaErrorHandler from "./media_error_handler";
import SegmentBookkeeper from "./segment_bookkeeper";
import SpeedManager from "./speed_manager";
import StallingManager from "./stalling_manager";
import EVENTS, {
  IActivePeriodChangedEvent,
  IAdaptationBufferEvent,
  IAdaptationChangeEvent,
  ICompletedBufferEvent,
  IEndOfStreamEvent,
  IManifestUpdateEvent,
  IPeriodBufferClearedEvent,
  IPeriodBufferReadyEvent,
  IResumeStreamEvent,
  ISpeedChangedEvent,
  IStalledEvent,
  IStreamLoadedEvent,
  IStreamWarningEvent,
} from "./stream_events";
import seekAndLoadOnMediaEvents from "./video_events";

export interface IStartStreamArguments {
  mediaElement : HTMLMediaElement; // Media Element on which the content will be
                                   // streamed
  mediaSource : MediaSource; // MediaSource where SourceBuffer will be added
  manifest : Manifest; // Manifest of the content we want to stream
  initialSettings : { // Settings for the initial streaming situation
    time : number; // the initial time to seek to
    shouldPlay : boolean; // whether we should auto-play
  };
  clock$ : Observable<IStreamClockTick>; // Emit position informations
  speed$ : Observable<number>; // Emit the speed.
                               // /!\ Should replay the last value on subscription.
  keySystems : IKeySystemOption[]; // DRM Informations
  pipelineOptions: { // Options used by segment-downloading pipelines
    offlineRetry? : number;
    segmentRetry? : number;
  };
  bufferOptions : { // Buffer-related options
    wantedBufferAhead$ : Observable<number>;
    maxBufferAhead$ : Observable<number>;
    maxBufferBehind$ : Observable<number>;
  };
  textTrackOptions : ITextTrackSourceBufferOptions; // text SourceBuffer-related options
  abrManager : ABRManager;
  segmentPipelinesManager : SegmentPipelinesManager<any>;
  refreshManifest : (url : string) => Observable<Manifest>;
}

export type IStartStreamEvent =
  IStreamLoadedEvent | // Generally sent first (if there's no warning)
  IPeriodBufferReadyEvent |
  IActivePeriodChangedEvent |
  IAdaptationChangeEvent |
  IAdaptationBufferEvent<any> |
  ICompletedBufferEvent |
  IEndOfStreamEvent |
  IResumeStreamEvent |
  IManifestUpdateEvent |
  IPeriodBufferClearedEvent |
  ISpeedChangedEvent |
  IStalledEvent |
  IStreamWarningEvent;

/**
 * Start streaming the content defined by the manifest on the given MediaSource.
 * @param {Object} startStreamArguments
 * @returns {Observable}
 */
export default function startStreamOnMediaSource({
  mediaElement,
  mediaSource,
  manifest,
  initialSettings,
  clock$,
  speed$,
  keySystems,
  pipelineOptions,
  bufferOptions,
  textTrackOptions,
  abrManager,
  segmentPipelinesManager,
  refreshManifest,
} : IStartStreamArguments) : Observable<IStartStreamEvent> {
  setDurationToMediaSource(mediaSource, manifest.getDuration());

  const {
    time: initialTime,
    shouldPlay,
  } = initialSettings;

  const {
    wantedBufferAhead$,
    maxBufferAhead$,
    maxBufferBehind$,
  } = bufferOptions;

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
  const firstPeriodToPlay = manifest.getPeriodForTime(initialTime);
  if (firstPeriodToPlay == null) {
    throw new MediaError("MEDIA_STARTING_TIME_NOT_FOUND", null, true);
  }

  const {
    seek$,
    load$,
  } = seekAndLoadOnMediaEvents(mediaElement, initialTime, shouldPlay);

  const bufferClock$ = createBufferClock(manifest, clock$, seek$, initialTime);

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
  const sourceBufferManager = new SourceBufferManager(mediaElement, mediaSource);

  // Will be used to cancel any endOfStream tries when the contents resume
  const cancelEndOfStream$ = new Subject<null>();

  // Will be used to process the events of the buffer
  const bufferEventHandler =
    manifest.isLive ?
      liveEventsHandler(mediaElement, manifest, refreshManifest) :

      /* tslint:disable no-unnecessary-callback-wrapper */ // needed for TS :/
      (evt : IBufferHandlerEvent) => observableOf(evt);
      /* tslint:enable no-unnecessary-callback-wrapper */

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
      maxRetry: pipelineOptions.segmentRetry,
      maxRetryOffline: pipelineOptions.offlineRetry,
      textTrackOptions,
    }
  ).pipe(mergeMap((evt) : Observable<IStartStreamEvent> => {
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
  const emeManager$ = createEMEManager(mediaElement, keySystems);

  /**
   * Translate errors coming from the video element into RxPlayer errors
   * through a throwing Observable.
   * @type {Observable}
   */
  const mediaErrorHandler$ = createMediaErrorHandler(mediaElement);

  /**
   * Create Speed Manager, an observable which will set the speed set by the
   * user on the video element while pausing a little longer while the buffer
   * is stalled.
   * @type {Observable}
   */
  const speedManager$ = SpeedManager(mediaElement, speed$, clock$, {
    pauseWhenStalled: true,
  }).pipe(map(EVENTS.speedChanged));

  /**
   * Create Stalling Manager, an observable which will try to get out of
   * various infinite stalling issues
   * @type {Observable}
   */
  const stallingManager$ = StallingManager(mediaElement, clock$)
    .pipe(map(EVENTS.stalled));

  const loadedEvent$ = load$
    .pipe(mergeMap((evt) => {
      if (evt === "autoplay-blocked") {
        const error = new MediaError("MEDIA_ERR_BLOCKED_AUTOPLAY", null, false);
        return observableOf(EVENTS.warning(error), EVENTS.loaded());
      }
      return observableOf(EVENTS.loaded());
    }));

  return observableMerge(
    loadedEvent$,
    buffers$,
    emeManager$,
    mediaErrorHandler$ as Observable<any>, // TODO RxJS Bug?
    speedManager$,
    stallingManager$
  ).pipe(finalize(() => {
    // clean-up every created SourceBuffers
    sourceBufferManager.disposeAll();
  }));
}
