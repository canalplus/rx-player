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
  concat as observableConcat,
  distinctUntilChanged,
  EMPTY,
  ignoreElements,
  interval,
  map,
  mergeMap,
  Observable,
  pairwise,
  scan,
  startWith,
  switchMap,
  tap,
  of as observableOf,
} from "rxjs";
import config from "../../../config";
import Manifest from "../../../manifest";
import { fromEvent } from "../../../utils/event_emitter";
import { IPlaybackObservation } from "../../api";
import refreshScheduledEventsList from "./refresh_scheduled_events_list";
import {
  INonFiniteStreamEventPayload,
  IPublicStreamEvent,
  IStreamEvent,
  IStreamEventPayload,
} from "./types";


/**
 * Tells if a stream event has a duration
 * @param {Object} evt
 * @returns {Boolean}
 */
function isFiniteStreamEvent(
  evt: IStreamEventPayload|INonFiniteStreamEventPayload
): evt is IStreamEventPayload {
  return (evt as IStreamEventPayload).end !== undefined;
}

/**
 * Get events from manifest and emit each time an event has to be emitted
 * @param {Object} manifest
 * @param {HTMLMediaElement} mediaElement
 * @returns {Observable}
 */
function streamEventsEmitter(manifest: Manifest,
                             mediaElement: HTMLMediaElement,
                             observation$: Observable<IPlaybackObservation>
): Observable<IStreamEvent> {
  const eventsBeingPlayed =
    new WeakMap<IStreamEventPayload|INonFiniteStreamEventPayload, true>();
  let lastScheduledEvents : Array<IStreamEventPayload|INonFiniteStreamEventPayload> = [];
  const scheduledEvents$ = fromEvent(manifest, "manifestUpdate").pipe(
    startWith(null),
    scan((oldScheduledEvents) => {
      return refreshScheduledEventsList(oldScheduledEvents, manifest);
    }, [] as Array<IStreamEventPayload|INonFiniteStreamEventPayload>)
  );

  /**
   * Examine playback situation from playback observations to emit stream events and
   * prepare set onExit callbacks if needed.
   * @param {Array.<Object>} scheduledEvents
   * @param {Object} oldObservation
   * @param {Object} newObservation
   * @returns {Observable}
   */
  function emitStreamEvents$(
    scheduledEvents: Array<IStreamEventPayload|INonFiniteStreamEventPayload>,
    oldObservation: { currentTime: number; isSeeking: boolean },
    newObservation: { currentTime: number; isSeeking: boolean }
  ): Observable<IStreamEvent> {
    const { currentTime: previousTime } = oldObservation;
    const { isSeeking, currentTime } = newObservation;
    const eventsToSend: IStreamEvent[] = [];
    const eventsToExit: IPublicStreamEvent[] = [];

    for (let i = 0; i < scheduledEvents.length; i++) {
      const event = scheduledEvents[i];
      const start = event.start;
      const end = isFiniteStreamEvent(event) ? event.end :
                                               undefined;
      const isBeingPlayed = eventsBeingPlayed.has(event);
      if (isBeingPlayed) {
        if (start > currentTime ||
            (end !== undefined && currentTime >= end)
        ) {
          if (isFiniteStreamEvent(event)) {
            eventsToExit.push(event.publicEvent);
          }
          eventsBeingPlayed.delete(event);
        }
      } else if (start <= currentTime &&
                 end !== undefined &&
                 currentTime < end) {
        eventsToSend.push({ type: "stream-event",
                            value: event.publicEvent });
        eventsBeingPlayed.set(event, true);
      } else if (previousTime < start &&
                 currentTime >= (end ?? start)) {
        if (isSeeking) {
          eventsToSend.push({ type: "stream-event-skip",
                              value: event.publicEvent });
        } else {
          eventsToSend.push({ type: "stream-event",
                              value: event.publicEvent });
          if (isFiniteStreamEvent(event)) {
            eventsToExit.push(event.publicEvent);
          }
        }
      }
    }

    return observableConcat(
      eventsToSend.length > 0 ? observableOf(...eventsToSend) :
                                EMPTY,
      eventsToExit.length > 0 ? observableOf(...eventsToExit).pipe(
        tap((evt) => {
          if (typeof evt.onExit === "function") {
            evt.onExit();
          }
        }),
        // NOTE As of now (RxJS 7.4.0), RxJS defines `ignoreElements` default
        // first type parameter as `any` instead of the perfectly fine `unknown`,
        // leading to linter issues, as it forbids the usage of `any`.
        // This is why we're disabling the eslint rule.
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-argument */
        ignoreElements()
      ) : EMPTY
    );
  }

  /**
   * This pipe allows to control wether the polling should occur, if there
   * are scheduledEvents, or not.
   */
  return scheduledEvents$.pipe(
    tap((scheduledEvents) => lastScheduledEvents = scheduledEvents),
    map((evt): boolean => evt.length > 0),
    distinctUntilChanged(),
    switchMap((hasEvents: boolean) => {
      if (!hasEvents) {
        return EMPTY;
      }

      const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config.getCurrent();
      return observableCombineLatest([
        interval(STREAM_EVENT_EMITTER_POLL_INTERVAL).pipe(startWith(null)),
        observation$,
      ]).pipe(
        map(([_, observation]) => {
          const { seeking } = observation;
          return { isSeeking: seeking,
                   currentTime: mediaElement.currentTime };
        }),
        pairwise(),
        mergeMap(([oldObservation, newObservation]) =>
          emitStreamEvents$(lastScheduledEvents, oldObservation, newObservation))
      );
    })
  );
}

export default streamEventsEmitter;
