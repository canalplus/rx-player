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
import type Manifest from "../../../../manifest";
import EventEmitter from "../../../../utils/event_emitter";
import SharedReference from "../../../../utils/reference";
import type { CancellationSignal } from "../../../../utils/task_canceller";
import TaskCanceller from "../../../../utils/task_canceller";
import type { IPlaybackObservation, IReadOnlyPlaybackObserver } from "../../../api";
import refreshScheduledEventsList from "./refresh_scheduled_events_list";
import type {
  INonFiniteStreamEventPayload,
  IPublicNonFiniteStreamEvent,
  IPublicStreamEvent,
  IStreamEventPayload,
} from "./types";

interface IStreamEventsEmitterEvent {
  event: IPublicStreamEvent | IPublicNonFiniteStreamEvent;
  eventSkip: IPublicStreamEvent | IPublicNonFiniteStreamEvent;
}

/**
 * Get events from manifest and emit each time an event has to be emitted
 */
export default class StreamEventsEmitter extends EventEmitter<IStreamEventsEmitterEvent> {
  private _manifest: Manifest;
  private _mediaElement: HTMLMediaElement;
  private _playbackObserver: IReadOnlyPlaybackObserver<IPlaybackObservation>;
  private _scheduledEventsRef: SharedReference<
    Array<IStreamEventPayload | INonFiniteStreamEventPayload>
  >;
  private _eventsBeingPlayed: WeakMap<
    IStreamEventPayload | INonFiniteStreamEventPayload,
    true
  >;
  private _canceller: TaskCanceller | null;

  /**
   * @param {Object} manifest
   * @param {HTMLMediaElement} mediaElement
   * @param {Object} playbackObserver
   */
  constructor(
    manifest: Manifest,
    mediaElement: HTMLMediaElement,
    playbackObserver: IReadOnlyPlaybackObserver<IPlaybackObservation>,
  ) {
    super();
    this._manifest = manifest;
    this._mediaElement = mediaElement;
    this._playbackObserver = playbackObserver;
    this._canceller = null;
    this._scheduledEventsRef = new SharedReference<
      Array<IStreamEventPayload | INonFiniteStreamEventPayload>
    >([]);
    this._eventsBeingPlayed = new WeakMap<
      IStreamEventPayload | INonFiniteStreamEventPayload,
      true
    >();
  }

  public start(): void {
    if (this._canceller !== null) {
      return;
    }
    this._canceller = new TaskCanceller();

    const cancelSignal = this._canceller.signal;
    const playbackObserver = this._playbackObserver;
    const mediaElement = this._mediaElement;

    let isPollingEvents = false;
    let cancelCurrentPolling = new TaskCanceller();
    cancelCurrentPolling.linkToSignal(cancelSignal);

    this._manifest.addEventListener(
      "manifestUpdate",
      () => {
        const prev = this._scheduledEventsRef.getValue();
        this._scheduledEventsRef.setValue(
          refreshScheduledEventsList(prev, this._manifest),
        );
      },
      this._canceller.signal,
    );
    this._scheduledEventsRef.setValue(refreshScheduledEventsList([], this._manifest));

    this._scheduledEventsRef.onUpdate(
      ({ length: scheduledEventsLength }) => {
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
        const checkStreamEvents = () => {
          const newObservation = constructObservation();
          this._emitStreamEvents(
            this._scheduledEventsRef.getValue(),
            oldObservation,
            newObservation,
            cancelCurrentPolling.signal,
          );
          oldObservation = newObservation;
        };

        const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config.getCurrent();
        const intervalId = setInterval(
          checkStreamEvents,
          STREAM_EVENT_EMITTER_POLL_INTERVAL,
        );
        playbackObserver.listen(checkStreamEvents, {
          includeLastObservation: false,
          clearSignal: cancelCurrentPolling.signal,
        });

        cancelCurrentPolling.signal.register(() => {
          clearInterval(intervalId);
        });

        function constructObservation() {
          const isSeeking = playbackObserver.getReference().getValue().seeking;
          return { currentTime: mediaElement.currentTime, isSeeking };
        }
      },
      { emitCurrentValue: true, clearSignal: cancelSignal },
    );
  }

  public stop(): void {
    if (this._canceller !== null) {
      this._canceller.cancel();
      this._canceller = null;
    }
  }

  /**
   * Examine playback situation from playback observations to emit stream events and
   * prepare set onExit callbacks if needed.
   * @param {Array.<Object>} scheduledEvents
   * @param {Object} oldObservation
   * @param {Object} newObservation
   * @param {Object} stopSignal
   */
  private _emitStreamEvents(
    scheduledEvents: Array<IStreamEventPayload | INonFiniteStreamEventPayload>,
    oldObservation: { currentTime: number; isSeeking: boolean },
    newObservation: { currentTime: number; isSeeking: boolean },
    stopSignal: CancellationSignal,
  ): void {
    const { currentTime: previousTime } = oldObservation;
    const { isSeeking, currentTime } = newObservation;
    const eventsToSend: IStreamEvent[] = [];
    const eventsToExit: IPublicStreamEvent[] = [];

    for (let i = 0; i < scheduledEvents.length; i++) {
      const event = scheduledEvents[i];
      const start = event.start;
      const end = isFiniteStreamEvent(event) ? event.end : undefined;
      const isBeingPlayed = this._eventsBeingPlayed.has(event);
      if (isBeingPlayed) {
        if (start > currentTime || (end !== undefined && currentTime >= end)) {
          if (isFiniteStreamEvent(event)) {
            eventsToExit.push(event.publicEvent);
          }
          this._eventsBeingPlayed.delete(event);
        }
      } else if (start <= currentTime && end !== undefined && currentTime < end) {
        eventsToSend.push({ type: "stream-event", value: event.publicEvent });
        this._eventsBeingPlayed.set(event, true);
      } else if (previousTime < start && currentTime >= (end ?? start)) {
        if (isSeeking) {
          eventsToSend.push({ type: "stream-event-skip", value: event.publicEvent });
        } else {
          eventsToSend.push({ type: "stream-event", value: event.publicEvent });
          if (isFiniteStreamEvent(event)) {
            eventsToExit.push(event.publicEvent);
          }
        }
      }
    }

    if (eventsToSend.length > 0) {
      for (const event of eventsToSend) {
        if (event.type === "stream-event") {
          this.trigger("event", event.value);
        } else {
          this.trigger("eventSkip", event.value);
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
  evt: IStreamEventPayload | INonFiniteStreamEventPayload,
): evt is IStreamEventPayload {
  return (evt as IStreamEventPayload).end !== undefined;
}

/** Event emitted when a stream event is encountered. */
interface IStreamEventEvent {
  type: "stream-event";
  value: IPublicStreamEvent | IPublicNonFiniteStreamEvent;
}

/** Event emitted when a stream event has just been skipped. */
interface IStreamEventSkipEvent {
  type: "stream-event-skip";
  value: IPublicStreamEvent | IPublicNonFiniteStreamEvent;
}

/** Events sent by the `streamEventsEmitter`. */
type IStreamEvent = IStreamEventEvent | IStreamEventSkipEvent;
