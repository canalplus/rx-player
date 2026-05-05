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

import config from "../../../../config.ts";
import type { IManifestMetadata } from "../../../../manifest/index.ts";
import type {
  IPlaybackObservation,
  IReadOnlyPlaybackObserver,
} from "../../../../playback_observer/index.ts";
import { SeekingState } from "../../../../playback_observer/index.ts";
import EventEmitter from "../../../../utils/event_emitter.ts";
import SharedReference from "../../../../utils/reference.ts";
import type { CancellationSignal } from "../../../../utils/task_canceller.ts";
import TaskCanceller from "../../../../utils/task_canceller.ts";
import refreshScheduledEventsList from "./refresh_scheduled_events_list.ts";
import type {
  INonFiniteStreamEventPayload,
  IPublicNonFiniteStreamEvent,
  IPublicStreamEvent,
  IStreamEventPayload,
} from "./types.ts";

interface IStreamEventsEmitterEvent {
  event: IPublicStreamEvent | IPublicNonFiniteStreamEvent;
  eventSkip: IPublicStreamEvent | IPublicNonFiniteStreamEvent;
}

/**
 * Get events from manifest and emit each time an event has to be emitted
 */
export default class StreamEventsEmitter extends EventEmitter<IStreamEventsEmitterEvent> {
  /** Regularly emit playback metrics such as the position. */
  private _playbackObserver: IReadOnlyPlaybackObserver<IPlaybackObservation>;
  /** Current stream events tracked for the whole content. */
  private _scheduledEventsRef: SharedReference<
    Array<IStreamEventPayload | INonFiniteStreamEventPayload>
  >;
  /** Events currently considered active, to only emit their enter/exit once. */
  private _eventsBeingPlayed: WeakMap<
    IStreamEventPayload | INonFiniteStreamEventPayload,
    true
  >;
  /** Whether event evaluation is temporarily suspended, e.g. during a reload. */
  private _isPaused: boolean;
  /** Last observation used as comparison point for the next event check. */
  private _previousObservation: {
    /** Media position that is being played. */
    currentTime: number;
    /** If `true`, we're currently seeking in the media. */
    isSeeking: boolean;
  } | null;
  /** Cancels the current emitter lifecycle. */
  private _canceller: TaskCanceller | null;

  /**
   * @param {Object} playbackObserver
   */
  constructor(playbackObserver: IReadOnlyPlaybackObserver<IPlaybackObservation>) {
    super();
    this._playbackObserver = playbackObserver;
    this._canceller = null;
    this._scheduledEventsRef = new SharedReference<
      Array<IStreamEventPayload | INonFiniteStreamEventPayload>
    >([]);
    this._eventsBeingPlayed = new WeakMap<
      IStreamEventPayload | INonFiniteStreamEventPayload,
      true
    >();
    this._isPaused = true;
    this._previousObservation = null;
  }

  /**
   * Initialize the emitter for the given content manifest.
   *
   * The emitter starts in a paused state so the caller can resume it only once
   * the corresponding media instance is actually ready.
   * @param {Object} manifest
   */
  public start(manifest: IManifestMetadata): void {
    if (this._canceller !== null) {
      return;
    }
    this._canceller = new TaskCanceller("StreamEventsEmitter");

    const cancelSignal = this._canceller.signal;
    this._isPaused = true;
    this._previousObservation = null;
    this._eventsBeingPlayed = new WeakMap<
      IStreamEventPayload | INonFiniteStreamEventPayload,
      true
    >();

    let isPollingEvents = false;
    let cancelCurrentPolling = new TaskCanceller("StreamEventsEmitter Polling");
    cancelCurrentPolling.linkToSignal(cancelSignal);

    this._scheduledEventsRef.setValue(refreshScheduledEventsList([], manifest));

    this._scheduledEventsRef.onUpdate(
      ({ length: scheduledEventsLength }) => {
        if (scheduledEventsLength === 0) {
          if (isPollingEvents) {
            cancelCurrentPolling.cancel("no stream event");
            cancelCurrentPolling = new TaskCanceller("StreamEventsEmitter Polling");
            cancelCurrentPolling.linkToSignal(cancelSignal);
            isPollingEvents = false;
          }
          return;
        } else if (isPollingEvents) {
          return;
        }
        isPollingEvents = true;
        const checkStreamEvents = () => {
          if (this._isPaused) {
            return;
          }
          const newObservation = this._constructObservation();
          if (this._previousObservation === null) {
            this._previousObservation = newObservation;
            return;
          }
          this._emitStreamEvents(
            this._scheduledEventsRef.getValue(),
            this._previousObservation,
            newObservation,
            cancelCurrentPolling.signal,
          );
          this._previousObservation = newObservation;
        };

        const { STREAM_EVENT_EMITTER_POLL_INTERVAL } = config.getCurrent();
        const intervalId = setInterval(
          checkStreamEvents,
          STREAM_EVENT_EMITTER_POLL_INTERVAL,
        );
        this._playbackObserver.listen(checkStreamEvents, {
          includeLastObservation: false,
          clearSignal: cancelCurrentPolling.signal,
        });

        cancelCurrentPolling.signal.register(() => {
          clearInterval(intervalId);
        });
      },
      { emitCurrentValue: true, clearSignal: cancelSignal },
    );
  }

  /**
   * Suspend event evaluation until `resume` has been called.
   *
   * To use when playback metrics should be temporarily ignored, for example
   * while reloading a content.
   */
  public pause(): void {
    this._isPaused = true;
    this._previousObservation = null;
  }

  /**
   * Resume event evaluation from the current playback state.
   */
  public resume(): void {
    this._isPaused = false;

    // Take a snapshot right now to avoid comparing a post-reload position
    // with a stale pre-reload observation.
    this._previousObservation = this._constructObservation();
  }

  /** Refresh the tracked stream-event list after a manifest update. */
  public onManifestUpdate(man: IManifestMetadata) {
    const prev = this._scheduledEventsRef.getValue();
    this._scheduledEventsRef.setValue(refreshScheduledEventsList(prev, man));
  }

  /**
   * @param {string | undefined} reason - Human-inspectable reason behind the
   * stop. Used for debugging matters, especially for debug log
   * inspection.
   */
  public stop(reason: string | undefined): void {
    if (this._canceller !== null) {
      this._canceller.cancel(reason ?? "StreamEventsEmitter stop");
      this._canceller = null;
      this._previousObservation = null;
      this._eventsBeingPlayed = new WeakMap<
        IStreamEventPayload | INonFiniteStreamEventPayload,
        true
      >();
    }
  }

  /**
   * Construct observation object relied on by the `StreamEventsEmitted` by
   * generating it from this instance's `PlaybackObserver`.
   */
  private _constructObservation(): {
    /** Current media position that is being played. */
    currentTime: number;
    /** If `true`, we're currently seeking in the media. */
    isSeeking: boolean;
  } {
    const lastObservation = this._playbackObserver.getReference().getValue();
    const currentTime =
      this._playbackObserver.getCurrentTime() ??
      this._playbackObserver.getReference().getValue().position.getPolled();
    const isSeeking = lastObservation.seeking !== SeekingState.None;
    return { currentTime, isSeeking };
  }

  /**
   * Examine playback situation from playback observations to emit stream events and
   * prepare `onExit` callbacks if needed.
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
          eventsToSend.push({
            type: "stream-event-skip",
            value: event.publicEvent,
          });
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
