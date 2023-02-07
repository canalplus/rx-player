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

import config from "../../../../config";
import Manifest from "../../../../manifest";
import createSharedReference from "../../../../utils/reference";
import TaskCanceller, { CancellationSignal } from "../../../../utils/task_canceller";
import { IPlaybackObservation, IReadOnlyPlaybackObserver } from "../../../api";
import refreshScheduledEventsList from "./refresh_scheduled_events_list";
import {
  INonFiniteStreamEventPayload,
  IPublicNonFiniteStreamEvent,
  IPublicStreamEvent,
  IStreamEventPayload,
} from "./types";

/**
 * Get events from manifest and emit each time an event has to be emitted
 * @param {Object} manifest
 * @param {HTMLMediaElement} mediaElement
 * @param {Object} playbackObserver
 * @param {Function} onEvent
 * @param {Function} onEventSkip
 * @param {Object} cancelSignal
 * @returns {Object}
 */
export default function streamEventsEmitter(
  manifest : Manifest,
  mediaElement : HTMLMediaElement,
  playbackObserver : IReadOnlyPlaybackObserver<IPlaybackObservation>,
  onEvent : (evt : IPublicStreamEvent | IPublicNonFiniteStreamEvent) => void,
  onEventSkip : (evt : IPublicStreamEvent | IPublicNonFiniteStreamEvent) => void,
  cancelSignal : CancellationSignal
) : void {
  const eventsBeingPlayed =
    new WeakMap<IStreamEventPayload|INonFiniteStreamEventPayload, true>();
  const scheduledEventsRef = createSharedReference(refreshScheduledEventsList([],
                                                                              manifest),
                                                   cancelSignal);
  manifest.addEventListener("manifestUpdate", () => {
    const prev = scheduledEventsRef.getValue();
    scheduledEventsRef.setValue(refreshScheduledEventsList(prev, manifest));
  }, cancelSignal);

  let isPollingEvents = false;
  let cancelCurrentPolling = new TaskCanceller();
  cancelCurrentPolling.linkToSignal(cancelSignal);

  scheduledEventsRef.onUpdate(({ length: scheduledEventsLength }) => {
    if (scheduledEventsLength === 0) {
      if (isPollingEvents) {
        cancelCurrentPolling.cancel();
        cancelCurrentPolling = new TaskCanceller();
        cancelCurrentPolling.linkToSignal(cancelSignal);
        isPollingEvents = false;
      }
      return;
    } else if (isPollingEvents) {
      return;
    }
    isPollingEvents = true;
    let oldObservation = constructObservation();

    const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config.getCurrent();
    const intervalId = setInterval(checkStreamEvents,
                                   STREAM_EVENT_EMITTER_POLL_INTERVAL);
    playbackObserver.listen(checkStreamEvents,
                            { includeLastObservation: false,
                              clearSignal: cancelCurrentPolling.signal });

    cancelCurrentPolling.signal.register(() => {
      clearInterval(intervalId);
    });

    function checkStreamEvents() {
      const newObservation = constructObservation();
      emitStreamEvents(scheduledEventsRef.getValue(),
                       oldObservation,
                       newObservation,
                       cancelCurrentPolling.signal);
      oldObservation = newObservation;
    }

    function constructObservation() {
      const isSeeking = playbackObserver.getReference().getValue().seeking;
      return { currentTime: mediaElement.currentTime,
               isSeeking };
    }
  }, { emitCurrentValue: true, clearSignal: cancelSignal });

  /**
   * Examine playback situation from playback observations to emit stream events and
   * prepare set onExit callbacks if needed.
   * @param {Array.<Object>} scheduledEvents
   * @param {Object} oldObservation
   * @param {Object} newObservation
   * @param {Object} stopSignal
   */
  function emitStreamEvents(
    scheduledEvents : Array<IStreamEventPayload|INonFiniteStreamEventPayload>,
    oldObservation : { currentTime: number; isSeeking: boolean },
    newObservation : { currentTime: number; isSeeking: boolean },
    stopSignal : CancellationSignal
  ) : void {
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

    if (eventsToSend.length > 0) {
      for (const event of eventsToSend) {
        if (event.type === "stream-event") {
          onEvent(event.value);
        } else {
          onEventSkip(event.value);
        }
        if (stopSignal.isCancelled()) {
          return;
        }
      }
    }

    if (eventsToExit.length > 0) {
      for (const event of eventsToExit) {
        if (typeof event.onExit === "function") {
          event.onExit();
        }
        if (stopSignal.isCancelled()) {
          return;
        }
      }
    }
  }
}

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

/** Event emitted when a stream event is encountered. */
interface IStreamEventEvent {
  type: "stream-event";
  value: IPublicStreamEvent |
         IPublicNonFiniteStreamEvent;
}

/** Event emitted when a stream event has just been skipped. */
interface IStreamEventSkipEvent {
  type: "stream-event-skip";
  value: IPublicStreamEvent |
         IPublicNonFiniteStreamEvent;
}

/** Events sent by the `streamEventsEmitter`. */
type IStreamEvent = IStreamEventEvent |
                    IStreamEventSkipEvent;
