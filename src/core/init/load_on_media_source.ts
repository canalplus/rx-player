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
  merge as observableMerge,
  Observable,
  of as observableOf,
  Subject,
  throwError,
} from "rxjs";
import {
  filter,
  finalize,
  ignoreElements,
  mergeMap,
  takeUntil,
} from "rxjs/operators";
import { MediaError } from "../../errors";
import log from "../../log";
import Manifest from "../../manifest";
import ABRManager from "../abr";
import { SegmentFetcherCreator } from "../fetchers";
import SegmentBuffersStore from "../segment_buffers";
import StreamOrchestrator, {
  IStreamOrchestratorOptions,
} from "../stream";
import { setDurationToMediaSource } from "./create_media_source";
import { maintainEndOfStream } from "./end_of_stream";
import EVENTS from "./events_generators";
import initialSeekAndPlay from "./initial_seek_and_play";
import StallAvoider, {
  IDiscontinuityEvent,
} from "./stall_avoider";
import streamEventsEmitter from "./stream_events_emitter";
import {
  IInitClockTick,
  IMediaSourceLoaderEvent,
} from "./types";
import updatePlaybackRate from "./update_playback_rate";

/** Arguments needed by `createMediaSourceLoader`. */
export interface IMediaSourceLoaderArguments {
  /** Module helping to choose the right Representation. */
  abrManager : ABRManager;
  /** Various stream-related options. */
  bufferOptions : IStreamOrchestratorOptions;
  /** Observable emitting playback conditions regularly. */
  clock$ : Observable<IInitClockTick>;
  /* Manifest of the content we want to play. */
  manifest : Manifest;
  /** Media Element on which the content will be played. */
  mediaElement : HTMLMediaElement;
  /** Module to facilitate segment fetching. */
  segmentFetcherCreator : SegmentFetcherCreator<any>;
  /**
   * Observable emitting the wanted playback rate as it changes.
   * Replay the last value on subscription.
   */
  speed$ : Observable<number>;
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
    clock$,
    speed$,
    bufferOptions,
    abrManager,
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
  ) {
    // TODO Update the duration if it evolves?
    const duration = manifest.isLive ? Infinity :
                                       manifest.getMaximumPosition();
    setDurationToMediaSource(mediaSource, duration);

    const initialPeriod = manifest.getPeriodForTime(initialTime) ??
                          manifest.getNextPeriod(initialTime);
    if (initialPeriod === undefined) {
      const error = new MediaError("MEDIA_STARTING_TIME_NOT_FOUND",
                                   "Wanted starting time not found in the Manifest.");
      return throwError(error);
    }

    /** Interface to create media buffers for loaded segments. */
    const segmentBuffersStore = new SegmentBuffersStore(mediaElement, mediaSource);


    const { loaded$,
            clock$: updatedClock$ } = initialSeekAndPlay(mediaElement,
                                                         clock$,
                                                         { autoPlay,
                                                           manifest,
                                                           speed$,
                                                           startTime: initialTime });

    const isLoaded$ = loaded$.pipe(filter((evt) => evt !== "not-loaded-metadata"));

    const streamEvents$ = isLoaded$.pipe(
      mergeMap(() => streamEventsEmitter(manifest, mediaElement, clock$))
    );

    /** Cancel endOfStream calls when streams become active again. */
    const cancelEndOfStream$ = new Subject<null>();

    /** Emits discontinuities detected by the StreamOrchestrator. */
    const discontinuityUpdate$ = new Subject<IDiscontinuityEvent>();

    // Creates Observable which will manage every Stream for the given Content.
    const streams$ = StreamOrchestrator({ manifest, initialPeriod },
                                        updatedClock$,
                                        abrManager,
                                        segmentBuffersStore,
                                        segmentFetcherCreator,
                                        bufferOptions
    ).pipe(
      mergeMap((evt) : Observable<IMediaSourceLoaderEvent> => {
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
          default:
            return observableOf(evt);
        }
      })
    );

    /**
     * On subscription, keep the playback speed synchronized to the speed set by
     * the user on the media element and force a speed of `0` when the buffer is
     * empty, so it can build back buffer.
     */
    const playbackRate$ =
      updatePlaybackRate(mediaElement, speed$, clock$, { pauseWhenStalled: true })
        .pipe(ignoreElements());

    /**
     * Observable trying to avoid various stalling situations, emitting "stalled"
     * events when it cannot, as well as "unstalled" events when it get out of one.
     */
    const stallAvoider$ = StallAvoider(clock$,
                                       mediaElement,
                                       manifest,
                                       discontinuityUpdate$);

    const loadedEvent$ = loaded$
      .pipe(mergeMap((evt) => {
        if (evt === "autoplay-blocked") {
          const error = new MediaError("MEDIA_ERR_BLOCKED_AUTOPLAY",
                                       "Cannot trigger auto-play automatically: " +
                                       "your browser does not allow it.");
          return observableOf(EVENTS.warning(error),
                              EVENTS.loaded(segmentBuffersStore));
        } else if (evt === "not-loaded-metadata") {
          const error = new MediaError("MEDIA_ERR_NOT_LOADED_METADATA",
                                       "Cannot load automatically: your browser " +
                                       "falsely announced having loaded the content.");
          return observableOf(EVENTS.warning(error));
        }
        log.debug("Init: The current content is loaded.");
        return observableOf(EVENTS.loaded(segmentBuffersStore));
      }));

    return observableMerge(loadedEvent$,
                           playbackRate$,
                           stallAvoider$,
                           streams$,
                           streamEvents$
    ).pipe(finalize(() => {
      // clean-up every created SegmentBuffers
      segmentBuffersStore.disposeAll();
    }));
  };
}
