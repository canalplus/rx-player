import { afterEach, describe, expect, it, vi } from "vitest";
import StreamEventsEmitter from "../../../../../../../src/main_thread/init/utils/stream_events_emitter/stream_events_emitter.ts";
import type { IManifestMetadata } from "../../../../../../../src/manifest/index.ts";
import type {
  IMediaObservation,
  IReadOnlyMediaElementMonitor,
} from "../../../../../../../src/media_element_monitor/index.ts";
import { SeekingState } from "../../../../../../../src/media_element_monitor/index.ts";
import SharedReference from "../../../../../../../src/utils/reference.ts";
import type { CancellationSignal } from "../../../../../../../src/utils/task_canceller.ts";
import TaskCanceller from "../../../../../../../src/utils/task_canceller.ts";

describe("init - StreamEventsEmitter", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("should not send skipped events for positions crossed while the media is not ready", () => {
    vi.useFakeTimers();

    const observationRef = new SharedReference(generateObservation(4));
    const mediaElementMonitor = createMediaElementMonitor(observationRef);
    const streamEventsEmitter = new StreamEventsEmitter(mediaElementMonitor);
    const skippedEvents: unknown[] = [];
    const regularEvents: unknown[] = [];
    const stopCanceller = new TaskCanceller("test");

    streamEventsEmitter.addEventListener(
      "event",
      (evt) => {
        regularEvents.push(evt);
      },
      stopCanceller.signal,
    );
    streamEventsEmitter.addEventListener(
      "eventSkip",
      (evt) => {
        skippedEvents.push(evt);
      },
      stopCanceller.signal,
    );

    streamEventsEmitter.start(generateManifest());
    streamEventsEmitter.pause();

    observationRef.setValue(generateObservation(9));
    vi.advanceTimersByTime(200);

    streamEventsEmitter.resume();
    observationRef.setValue(generateObservation(9.1));
    vi.advanceTimersByTime(200);

    expect(regularEvents).toHaveLength(0);
    expect(skippedEvents).toHaveLength(0);

    streamEventsEmitter.stop("test end");
    stopCanceller.cancel("test end");
  });

  it("should compare from the current position immediately after resuming", () => {
    vi.useFakeTimers();

    const observationRef = new SharedReference(generateObservation(4));
    const mediaElementMonitor = createMediaElementMonitor(observationRef);
    const streamEventsEmitter = new StreamEventsEmitter(mediaElementMonitor);
    const regularEvents: unknown[] = [];
    const stopCanceller = new TaskCanceller("test");

    streamEventsEmitter.addEventListener(
      "event",
      (evt) => {
        regularEvents.push(evt);
      },
      stopCanceller.signal,
    );

    streamEventsEmitter.start(generateManifest());
    streamEventsEmitter.pause();

    observationRef.setValue(generateObservation(4.5));
    streamEventsEmitter.resume();
    observationRef.setValue(generateObservation(8.5));
    vi.advanceTimersByTime(200);

    expect(regularEvents).toHaveLength(1);

    streamEventsEmitter.stop("test end");
    stopCanceller.cancel("test end");
  });
});

function createMediaElementMonitor(
  observationRef: SharedReference<IMediaObservation>,
): IReadOnlyMediaElementMonitor<IMediaObservation> {
  return {
    getCurrentTime() {
      return observationRef.getValue().position.getPolled();
    },
    getPlaybackRate() {
      return 1;
    },
    getReadyState() {
      return 4;
    },
    getIsPaused() {
      return false;
    },
    getReference() {
      return observationRef;
    },
    listen(
      cb: (observation: IMediaObservation, stopListening: () => void) => void,
      options: {
        includeLastObservation?: boolean | undefined;
        clearSignal: CancellationSignal;
      },
    ) {
      observationRef.onUpdate(cb, {
        clearSignal: options.clearSignal,
        emitCurrentValue: options.includeLastObservation,
      });
    },
    deriveReadOnlyMonitor() {
      throw new Error("unused in this test");
    },
  };
}

function generateManifest(): IManifestMetadata {
  return {
    periods: [
      {
        start: 0,
        streamEvents: [
          {
            start: 5,
            end: 8,
            id: "evt",
            data: {
              type: "dash-event-stream",
              value: {
                schemeIdUri: "urn:test",
                timescale: 1,
                xmlData: { data: "<Event />", namespaces: [] },
              },
            },
          },
        ],
      },
    ],
  } as unknown as IManifestMetadata;
}

function generateObservation(currentTime: number): IMediaObservation {
  return {
    event: "timeupdate",
    seeking: SeekingState.None,
    rebuffering: null,
    freezing: null,
    duration: 100,
    ended: false,
    paused: false,
    playbackRate: 1,
    readyState: 4,
    bufferGap: 10,
    fullyLoaded: false,
    currentRange: { start: 0, end: 20 },
    buffered: {} as TimeRanges,
    position: {
      getPolled() {
        return currentTime;
      },
    } as IMediaObservation["position"],
  };
}
