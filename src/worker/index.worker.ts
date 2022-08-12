/* eslint-disable no-console */
/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Subject } from "rxjs";
import ABRManager from "./core/abr";
import { IPlaybackObservation, PlaybackObserver } from "./core/api";
import { ManifestFetcher, SegmentFetcherCreator } from "./core/fetchers";
import createStreamPlaybackObserver from "./core/init/create_stream_playback_observer";
import SegmentBuffersStore from "./core/segment_buffers";
import ManualTimeRanges from "./core/segment_buffers/implementations/utils/manual_time_ranges";
import StreamOrchestrator from "./core/stream";
import DashWasmParser from "./parsers/manifest/dash/wasm-parser";
import createDashPipeline from "./transports/dash";
import createSharedReference from "./utils/reference";

(globalThis as any).window = globalThis;
const createAndLinkMediaSource = () => {
  const mediaSource = new MediaSource();
  const handle = mediaSource.handle;
  postMessage({ topic: "objectHandle", arg: handle }, [handle]);
  return mediaSource;
};
const playbackObserver = new PlaybackObserver({
  lowLatencyMode: false,
  withMediaSource: true,
});
const playbackSubject = new Subject<IPlaybackObservation>();
playbackObserver._observation$ = playbackSubject;

const deserializeTimeRanges = (tr: number[][]) => {
  const buffered = new ManualTimeRanges();
  tr.forEach(([start, end]) => {
    buffered.insert(start, end);
  });
  return buffered;
};

const initManagers = (mediaSource: any, mpdUrl: string) => {
  const abrManager = new ABRManager({
    lowLatencyMode: false,
    initialBitrates: {},
    manualBitrates: {},
    maxAutoBitrates: {},
    minAutoBitrates: {},
    throttlers: {
      limitWidth: {},
      throttle: {},
      throttleBitrate: {},
    },
  });

  const segmentBufferStore = new SegmentBuffersStore(mediaSource);

  const dashPipeline = createDashPipeline({ lowLatencyMode: false });
  const segmentFetcherCreator = new SegmentFetcherCreator(
    dashPipeline,
    { lowLatencyMode: false,
      maxRetryOffline: undefined,
      maxRetryRegular: undefined });
  const manifestFetcher = new ManifestFetcher(mpdUrl, dashPipeline, { lowLatencyMode: false,
                                                                      maxRetryOffline: undefined,
                                                                      maxRetryRegular: undefined });
  manifestFetcher.fetch().subscribe((ev) => {
    if (ev.type === "response") {
      ev.parse({
        previousManifest: null,
        unsafeMode: false,
      }).subscribe((parseEvent) => {
        if (parseEvent.type === "parsed") {
          const manifest = parseEvent.manifest;
          const streamPlaybackObserver = createStreamPlaybackObserver(manifest, playbackObserver,
                                                                      {
                                                                        autoPlay: false,
                                                                        initialPlayPerformed: createSharedReference(false),
                                                                        initialSeekPerformed: createSharedReference(false),
                                                                        speed: createSharedReference(1),
                                                                        startTime: 0,
                                                                      });

          streamPlaybackObserver.observe(true).subscribe((streamEvent) => console.warn("[StreamPlaybackObserver] :", streamEvent.position));


          const stream = StreamOrchestrator({ initialPeriod: manifest.periods[0], manifest },
                                            streamPlaybackObserver,
                                            abrManager,
                                            segmentBufferStore,
                                            segmentFetcherCreator,
                                            {  wantedBufferAhead : createSharedReference(30),
                                               maxVideoBufferSize : createSharedReference(Infinity),
                                               maxBufferAhead : createSharedReference(Infinity),
                                               maxBufferBehind : createSharedReference(Infinity),
                                               audioTrackSwitchingMode: "direct",
                                               drmSystemId: undefined,
                                               enableFastSwitching: true,
                                               manualBitrateSwitchingMode: "direct",
                                               onCodecSwitch: "continue" });

          stream.subscribe((event) => {
            if (event.type === "periodStreamReady") {
              event.value.adaptation$.next(event.value.period.adaptations[event.value.type][0]);
            }
          });
        }
      });
    }
  });


};


onmessage = async (
  e: MessageEvent<{mpd: string; topic: "mpd"}
                | {observation: IPlaybackObservation; topic: "playback"}>
) => {
  console.log(e);
  if (e.data.topic === "mpd") {
    const parser = new DashWasmParser();
    await parser.initialize({ wasmUrl: "http://localhost:8080/src/test/mpd-parser.wasm" });
    (globalThis as any).parser = parser;
    const mediaSource = createAndLinkMediaSource();
    const mpd = e.data.mpd;
    const init = () => {
      initManagers(mediaSource, mpd);
    };
    mediaSource.addEventListener("sourceopen", init);
  }
  else if (e.data.topic === "playback") {
    console.log("From worker test playback");
    const observation = e.data.observation;
    observation.buffered = deserializeTimeRanges(observation.buffered);
    playbackObserver.setCurrentTime(observation.position);
    playbackObserver.setReadyState(observation.readyState);
    playbackSubject.next(observation);
    // playbackObserver._lastObservation = observation;

    // playbackObserver.observe(true).subscribe((ev) => console.warn("[DEBUG WORKER] :", ev));
  }


};

export {};
