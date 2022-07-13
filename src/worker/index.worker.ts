/* eslint-disable max-len */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import ABRManager from "./core/abr";
import { PlaybackObserver } from "./core/api";
import { ManifestFetcher, SegmentFetcherCreator } from "./core/fetchers";
import createStreamPlaybackObserver from "./core/init/create_stream_playback_observer";
import SegmentBuffersStore from "./core/segment_buffers";
import StreamOrchestrator from "./core/stream";
import DashWasmParser from "./parsers/manifest/dash/wasm-parser";
import createDashPipeline from "./transports/dash";
import createSharedReference from "./utils/reference";

(globalThis as any).window = globalThis;
const createAndLinkMediaSource = () => {
  const mediaSource = new MediaSource();
  const objectUrl = URL.createObjectURL(mediaSource);
  postMessage({ topic: "objectUrl", arg: objectUrl });
  return mediaSource;
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
          const playbackObserver = new PlaybackObserver({
            lowLatencyMode: false,
            withMediaSource: true,
          });
          const streamPlaybackObserver = createStreamPlaybackObserver(manifest, playbackObserver,
                                                                      {
                                                                        autoPlay: false,
                                                                        initialPlayPerformed: createSharedReference(false),
                                                                        initialSeekPerformed: createSharedReference(false),
                                                                        speed: createSharedReference(1),
                                                                        startTime: 0,
                                                                      });


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
        stream.subscribe((ev) => {
          console.log(ev);
          if(ev.type == "periodStreamReady"){
              ev.value.adaptation$.next(ev.value.period.adaptations[ev.value.type][0]);
          }	
        });
        }
      });
    }
  });


};


onmessage = async (e: MessageEvent<{mpd: string}>) => {
  const parser = new DashWasmParser();
  await parser.initialize({ wasmUrl: "TODO_CHANGE" });
  (globalThis as any).parser = parser;
  const mediaSource = createAndLinkMediaSource();

  mediaSource.addEventListener("sourceopen", () => {
    initManagers(mediaSource, e.data.mpd);
  });


};

export {};
