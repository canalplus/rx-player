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
  EMPTY,
  filter,
  finalize,
  ignoreElements,
  merge as observableMerge,
  mergeMap,
  Observable,
  of as observableOf,
  Subject,
  switchMap,
  takeUntil,
  throwError,
} from "rxjs";
import { MediaError } from "../../errors";
import log from "../../log";
import Manifest from "../../manifest";
import { IReadOnlySharedReference } from "../../utils/reference";
import ABRManager from "../abr";
import { PlaybackObserver } from "../api";
import { SegmentFetcherCreator } from "../fetchers";
import SegmentBuffersStore from "../segment_buffers";
import StreamOrchestrator, {
  IStreamOrchestratorOptions,
} from "../stream";
import ContentTimeBoundariesObserver from "./content_time_boundaries_observer";
import createStreamPlaybackObserver from "./create_stream_playback_observer";
import emitLoadedEvent from "./emit_loaded_event";
import { maintainEndOfStream } from "./end_of_stream";
import initialSeekAndPlay from "./initial_seek_and_play";
import MediaDurationUpdater from "./media_duration_updater";
import StallAvoider, {
  IDiscontinuityEvent,
  ILockedStreamEvent,
} from "./stall_avoider";
import streamEventsEmitter from "./stream_events_emitter";
import { IMediaSourceLoaderEvent } from "./types";
import updatePlaybackRate from "./update_playback_rate";

// NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
// first type parameter as `any` instead of the perfectly fine `unknown`,
// leading to linter issues, as it forbids the usage of `any`.
// This is why we're disabling the eslint rule.
/* eslint-disable @typescript-eslint/no-unsafe-argument */

/** Arguments needed by `createMediaSourceLoader`. */
export interface IMediaSourceLoaderArguments {
  /** Module helping to choose the right Representation. */
  abrManager : ABRManager;
  /** Various stream-related options. */
  bufferOptions : IStreamOrchestratorOptions;
  /* Manifest of the content we want to play. */
  manifest : Manifest;
  /** Media Element on which the content will be played. */
  mediaElement : HTMLMediaElement;
  /** Emit playback conditions regularly. */
  playbackObserver : PlaybackObserver;
  /** Module to facilitate segment fetching. */
  segmentFetcherCreator : SegmentFetcherCreator;
  /** Last wanted playback rate. */
  speed : IReadOnlySharedReference<number>;
}

/**
 * Returns a function allowing to load or reload the content in arguments into
 * a single or multiple MediaSources.
 * @param {Object} args
 * @returns {Function}
 */
export default function createMediaSourceLoader(
  { mediaElement,
    manifest,
    speed,
    bufferOptions,
    abrManager,
    playbackObserver,
    segmentFetcherCreator } : IMediaSourceLoaderArguments
) : (mediaSource : MediaSource, initialTime : number, autoPlay : boolean) =>
  Observable<IMediaSourceLoaderEvent> {
  /**
   * Load the content on the given MediaSource.
   * @param {MediaSource} mediaSource
   * @param {number} initialTime
   * @param {boolean} autoPlay
   */
  return function loadContentOnMediaSource(
    mediaSource : MediaSource,
    initialTime : number,
    autoPlay : boolean
  ) : Observable<IMediaSourceLoaderEvent> {
    /** Maintains the MediaSource's duration up-to-date with the Manifest */
    const mediaDurationUpdater = new MediaDurationUpdater(manifest, mediaSource);

    const initialPeriod = manifest.getPeriodForTime(initialTime) ??
                          manifest.getNextPeriod(initialTime);
    if (initialPeriod === undefined) {
      const error = new MediaError("MEDIA_STARTING_TIME_NOT_FOUND",
                                   "Wanted starting time not found in the Manifest.");
      return throwError(() => error);
    }

    /** Interface to create media buffers. */
    const segmentBuffersStore = new SegmentBuffersStore(mediaElement, mediaSource);

    const { seekAndPlay$,
            initialPlayPerformed,
            initialSeekPerformed } = initialSeekAndPlay({ mediaElement,
                                                          playbackObserver,
                                                          startTime: initialTime,
                                                          mustAutoPlay: autoPlay });

    const observation$ = playbackObserver.observe(true);
    const streamEvents$ = initialPlayPerformed.asObservable().pipe(
      filter((hasPlayed) => hasPlayed),
      mergeMap(() => streamEventsEmitter(manifest, mediaElement, observation$)));

    const streamObserver = createStreamPlaybackObserver(manifest,
                                                        playbackObserver,
                                                        { autoPlay,
                                                          initialPlayPerformed,
                                                          initialSeekPerformed,
                                                          speed,
                                                          startTime: initialTime });

    /** Cancel endOfStream calls when streams become active again. */
    const cancelEndOfStream$ = new Subject<null>();

    /** Emits discontinuities detected by the StreamOrchestrator. */
    const discontinuityUpdate$ = new Subject<IDiscontinuityEvent>();

    /** Emits event when streams are "locked", meaning they cannot load segments. */
    const lockedStream$ = new Subject<ILockedStreamEvent>();

    // Creates Observable which will manage every Stream for the given Content.
    const streams$ = StreamOrchestrator({ manifest, initialPeriod },
                                        streamObserver,
                                        abrManager,
                                        segmentBuffersStore,
                                        segmentFetcherCreator,
                                        bufferOptions
    ).pipe(
      mergeMap((evt) => {
        switch (evt.type) {
          case "end-of-stream":
            log.debug("Init: end-of-stream order received.");
            return maintainEndOfStream(mediaSource).pipe(
              ignoreElements(),
              takeUntil(cancelEndOfStream$));
          case "resume-stream":
            log.debug("Init: resume-stream order received.");
            cancelEndOfStream$.next(null);
            return EMPTY;
          case "stream-status":
            const { period, bufferType, imminentDiscontinuity, position } = evt.value;
            discontinuityUpdate$.next({ period,
                                        bufferType,
                                        discontinuity: imminentDiscontinuity,
                                        position });
            return EMPTY;
          case "locked-stream":
            lockedStream$.next(evt.value);
            return EMPTY;
          default:
            return observableOf(evt);
        }
      })
    );

    const contentTimeObserver = ContentTimeBoundariesObserver(manifest,
                                                              streams$,
                                                              streamObserver)
      .pipe(
        mergeMap((evt) => {
          switch (evt.type) {
            case "contentDurationUpdate":
              log.debug("Init: Duration has to be updated.", evt.value);
              mediaDurationUpdater.updateKnownDuration(evt.value);
              return EMPTY;
            default:
              return observableOf(evt);
          }
        }));

    /**
     * On subscription, keep the playback speed synchronized to the speed set by
     * the user on the media element and force a speed of `0` when the buffer is
     * empty, so it can build back buffer.
     */
    const playbackRate$ =
      updatePlaybackRate(mediaElement, speed, observation$)
        .pipe(ignoreElements());

    /**
     * Observable trying to avoid various stalling situations, emitting "stalled"
     * events when it cannot, as well as "unstalled" events when it get out of one.
     */
    const stallAvoider$ = StallAvoider(playbackObserver,
                                       manifest,
                                       lockedStream$,
                                       discontinuityUpdate$);

    /**
     * Emit a "loaded" events once the initial play has been performed and the
     * media can begin playback.
     * Also emits warning events if issues arise when doing so.
     */
    const loadingEvts$ = seekAndPlay$.pipe(switchMap((evt) =>
      evt.type === "warning" ?
        observableOf(evt) :
        emitLoadedEvent(observation$, mediaElement, segmentBuffersStore, false)));

    return observableMerge(loadingEvts$,
                           playbackRate$,
                           stallAvoider$,
                           streams$,
                           contentTimeObserver,
                           streamEvents$
    ).pipe(finalize(() => {
      mediaDurationUpdater.stop();
      // clean-up every created SegmentBuffers
      segmentBuffersStore.disposeAll();
    }));
  };
}
