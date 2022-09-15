/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  EMPTY,
  ignoreElements,
  mergeMap,
  Subject,
  takeUntil,
} from "rxjs";
import {
  MediaError,
  OtherError,
} from "../common/errors";
import {
  IEncryptedMediaErrorCode,
  IMediaErrorCode,
  INetworkErrorCode,
  IOtherErrorCode,
} from "../common/errors/error_codes";
import log from "../common/log";
import { IPlayerError } from "../common/public_types";
import createSharedReference from "../common/utils/reference";
import TaskCanceller from "../common/utils/task_canceller";
import {
  IContentInitializationData,
  IMainThreadMessage,
  IReferenceUpdateMessage,
  IStartContentMessageValue,
  IWorkerPlaybackObservation,
} from "../main";
import ContentTimeBoundariesObserver from "./content_time_boundaries_observer";
import { ManifestFetcher } from "./core/fetchers";
import StreamOrchestrator, {
  IStreamOrchestratorEvent,
} from "./core/stream";
import createStreamPlaybackObserver from "./create_stream_playback_observer";
import { maintainEndOfStream } from "./end_of_stream";
import {
  limitVideoWidth,
  manualAudioBitrate,
  manualVideoBitrate,
  maxAudioBitrate,
  maxBufferAhead,
  maxBufferBehind,
  maxVideoBitrate,
  maxVideoBufferSize,
  minAudioBitrate,
  minVideoBitrate,
  speed,
  throttleVideo,
  throttleVideoBitrate,
  wantedBufferAhead,
} from "./globals";
import Manifest, {
  Adaptation,
  IAdaptationType,
  Period,
  Representation,
} from "./manifest";
import DashWasmParser from "./parsers/manifest/dash/wasm-parser";
import sendMessage, {
  ISentAdaptation,
  ISentManifest,
  ISentPeriod,
  ISentRepresentation,
} from "./send_message";
import createDashPipeline from "./transports/dash";
import WorkerContentStore from "./worker_content_store";
import WorkerPlaybackObserver from "./worker_playback_observer";
import {
  INITIAL_OBSERVATION,
  WASM_URL,
} from "./worker_utils";

(globalThis as any).window = globalThis;

const currentContentStore = new WorkerContentStore();

const parser = new DashWasmParser();
// XXX TODO proper way to expose WASM Parser
(globalThis as any).parser = parser;
parser.initialize({ wasmUrl: WASM_URL }).catch((err) => {
  console.error(err);
});

// XXX TODO proper way of creating PlaybackObserver
const playbackObservationRef = createSharedReference<IWorkerPlaybackObservation>(
  INITIAL_OBSERVATION
);

const canceller = new TaskCanceller();
const playbackObserver = new WorkerPlaybackObserver(playbackObservationRef,
                                                    canceller.signal);

onmessage = function (e: MessageEvent<IMainThreadMessage>) {
  log.debug("Worker: received message", e.type);

  const msg = e.data;
  switch (msg.type) {
    case "prepare":
      prepareNewContent(msg.value);
      break;

    case "start":
      startCurrentContent(msg.value);
      break;

    case "observation":
      playbackObservationRef.setValue(msg.value);
      break;

    case "reference-update":
      updateGlobalReference(msg);
      break;

    default:
      console.warn("Unrecognized Event Message : ", e);
  }
};

function prepareNewContent(
  context : IContentInitializationData
) {
  const { contentId,
          url,
          lowLatencyMode,
          manifestRetryOptions } = context;
  let manifest : Manifest | null = null;
  let hasMediaSourceOpen : boolean = false;

  const mediaSource = new MediaSource();
  const handle = (mediaSource as any).handle;
  sendMessage({ type: "media-source", contentId, value: handle }, [handle]);
  mediaSource.addEventListener("sourceopen", function () {
    hasMediaSourceOpen = true;
    checkIfReadyAndValidate();
  });

  const dashPipeline = createDashPipeline({ lowLatencyMode });
  const manifestFetcher = new ManifestFetcher(
    url,
    dashPipeline,
    { lowLatencyMode,
      maxRetryOffline: manifestRetryOptions.offline,
      maxRetryRegular: manifestRetryOptions.regular });

  manifestFetcher.fetch()
    .pipe(mergeMap((evt) => {
      if (evt.type === "warning") {
        sendMessage({ type: "warning",
                      contentId,
                      value: formatErrorForSender(evt.value) });
        return EMPTY;
      }
      return evt.parse({
        previousManifest: null,
        unsafeMode: false,
      });
    }))
    .subscribe(evt => {
      if (evt.type === "warning") {
        sendMessage({ type: "warning",
                      contentId,
                      value: formatErrorForSender(evt.value) });
      } else {
        manifest = evt.manifest;
        checkIfReadyAndValidate();
      }
    });

  function checkIfReadyAndValidate() {
    if (manifest === null || !hasMediaSourceOpen) {
      return;
    }

    const sentManifest = formatManifestBeforeSend(manifest);
    sendMessage({ type: "ready-to-start",
                  contentId,
                  value: { manifest: sentManifest } });
    currentContentStore.setNewContent(context, dashPipeline, manifest, mediaSource);
  }
}

function startCurrentContent(val : IStartContentMessageValue) {
  const preparedContent = currentContentStore.getCurrentContent();
  if (preparedContent === null) {
    const error = new OtherError("NONE",
                                 "Starting content when none is prepared");
    sendMessage({ type: "error",
                  contentId: undefined,
                  value: formatErrorForSender(error) });
    return;
  }
  const { contentId,
          manifest,
          mediaDurationUpdater,
          mediaSource,
          representationEstimator,
          segmentBuffersStore,
          segmentFetcherCreator } = preparedContent;
  const { audioTrackSwitchingMode,
          drmSystemId,
          enableFastSwitching,
          initialTime,
          manualBitrateSwitchingMode,
          onCodecSwitch } = val;

  const streamPlaybackObserver =
    createStreamPlaybackObserver(manifest, playbackObserver, { speed });

  const initialPeriod = manifest.getPeriodForTime(initialTime) ??
                        manifest.getNextPeriod(initialTime);
  if (initialPeriod === undefined) {
    const error = new MediaError("MEDIA_STARTING_TIME_NOT_FOUND",
                                 "Wanted starting time not found in the Manifest.");
    sendMessage({ type: "error",
                  contentId,
                  value: formatErrorForSender(error) });
    return;
  }

  /** Cancel endOfStream calls when streams become active again. */
  const cancelEndOfStream$ = new Subject<null>();

  const stream = StreamOrchestrator({ initialPeriod: manifest.periods[0],
                                      manifest },
                                    streamPlaybackObserver,
                                    representationEstimator,
                                    segmentBuffersStore,
                                    segmentFetcherCreator,
                                    {  wantedBufferAhead,
                                       maxVideoBufferSize,
                                       maxBufferAhead,
                                       maxBufferBehind,
                                       audioTrackSwitchingMode,
                                       drmSystemId,
                                       enableFastSwitching,
                                       manualBitrateSwitchingMode,
                                       onCodecSwitch });


  const contentTimeObserver = ContentTimeBoundariesObserver(manifest,
                                                            stream,
                                                            streamPlaybackObserver)
    .pipe(
      mergeMap((evt) => {
        switch (evt.type) {
          case "contentDurationUpdate":
            log.debug("Init: Duration has to be updated.", evt.value);
            mediaDurationUpdater.updateKnownDuration(evt.value);
            return EMPTY;
          default:
            // XXX TODO send event
            return EMPTY;
        }
      }));

  stream.subscribe((event : IStreamOrchestratorEvent) => {
    switch (event.type) {
      case "periodStreamReady":
        // XXX TODO Real track choice
        let adaptation;
        if (event.value.type === "audio") {
          const allSupportedAdaptations =
            (event.value.period.adaptations[event.value.type] ?? [])
              .filter(a => a.isSupported);
          if (allSupportedAdaptations.length === 0) {
            adaptation = null;
          } else {
            adaptation = allSupportedAdaptations[0];
          }
        } else {
          adaptation = event.value.period.adaptations[event.value.type]?.[0] ?? null;
        }
        event.value.adaptation$.next(adaptation);
        break;
      case "periodStreamCleared":
        // XXX TODO
        break;
      case "end-of-stream":
        return maintainEndOfStream(mediaSource).pipe(
          ignoreElements(),
          takeUntil(cancelEndOfStream$));
      case "resume-stream":
        log.debug("Init: resume-stream order received.");
        cancelEndOfStream$.next(null);
        return EMPTY;
      case "encryption-data-encountered":
        sendMessage({ type: event.type,
                      value: { keyIds: event.value.keyIds,
                               values: event.value.values,
                               type: event.value.type } });
        break;
      case "activePeriodChanged":
        const sentPeriod = formatPeriodBeforeSend(event.value.period);
        sendMessage({ type: "activePeriodChanged",
                      value: { period: sentPeriod } });
        break;
      case "adaptationChange":
        // XXX TODO
        break;
      case "representationChange":
        // XXX TODO
        break;
      case "complete-stream":
        // XXX TODO
        break;
      case "bitrateEstimationChange":
        // XXX TODO
        break;
      case "needs-media-source-reload":
        // XXX TODO
        break;
      case "needs-buffer-flush":
        // XXX TODO
        break;
      case "needs-decipherability-flush":
        // XXX TODO
        break;
      case "added-segment":
        // XXX TODO
        break;
      case "manifest-might-be-out-of-sync":
        // XXX TODO
        break;
      case "inband-events":
        // XXX TODO
        break;
      case "warning":
        sendMessage({ type: "warning",
                      contentId,
                      value: formatErrorForSender(event.value) });
        // XXX TODO
        break;
      case "needs-manifest-refresh":
        // XXX TODO
        break;
      case "stream-status":
        // XXX TODO send discontinuity
        // const { period, bufferType, imminentDiscontinuity, position } = evt.value;
        // discontinuityUpdate$.next({ period,
        //                             bufferType,
        //                             discontinuity: imminentDiscontinuity,
        //                             position });
        return EMPTY;
      case "locked-stream":
        // XXX TODO send locked-stream event
        // Isn't it risky here? Find solution
        return EMPTY;
      default:
        // XXX TODO Actually send other events
        return EMPTY;
    }
  });
  contentTimeObserver.subscribe();
}

function updateGlobalReference(msg: IReferenceUpdateMessage) : void {
  switch (msg.value.name) {
    case "wantedBufferAhead":
      wantedBufferAhead.setValueIfChanged(msg.value.newVal);
      break;
    case "maxBufferBehind":
      maxBufferBehind.setValueIfChanged(msg.value.newVal);
      break;
    case "maxBufferAhead":
      maxBufferBehind.setValueIfChanged(msg.value.newVal);
      break;
    case "minAudioBitrate":
      minAudioBitrate.setValueIfChanged(msg.value.newVal);
      break;
    case "maxAudioBitrate":
      maxAudioBitrate.setValueIfChanged(msg.value.newVal);
      break;
    case "minVideoBitrate":
      minVideoBitrate.setValueIfChanged(msg.value.newVal);
      break;
    case "maxVideoBitrate":
      maxVideoBitrate.setValueIfChanged(msg.value.newVal);
      break;
    case "manualAudioBitrate":
      manualAudioBitrate.setValueIfChanged(msg.value.newVal);
      break;
    case "manualVideoBitrate":
      manualVideoBitrate.setValueIfChanged(msg.value.newVal);
      break;
    case "speed":
      speed.setValueIfChanged(msg.value.newVal);
      break;
    case "limitVideoWidth":
      limitVideoWidth.setValueIfChanged(msg.value.newVal);
      break;
    case "throttleVideo":
      throttleVideo.setValueIfChanged(msg.value.newVal);
      break;
    case "throttleVideoBitrate":
      throttleVideoBitrate.setValueIfChanged(msg.value.newVal);
      break;
  }
}

export interface ISentNetworkError {
  type : "NETWORK_ERROR";
  code : INetworkErrorCode;
}

export interface ISentMediaError {
  type : "MEDIA_ERROR";
  code : IMediaErrorCode;
}

export interface ISentEncryptedMediaError {
  type : "ENCRYPTED_MEDIA_ERROR";
  code : IEncryptedMediaErrorCode;
}

export interface ISentOtherError {
  type : "OTHER_ERROR";
  code : IOtherErrorCode;
}

export type ISentError = ISentNetworkError |
                         ISentMediaError |
                         ISentEncryptedMediaError |
                         ISentOtherError;

function formatErrorForSender(
  error : IPlayerError
) : ISentError {
  /* eslint-disable-next-line  @typescript-eslint/no-unsafe-return */
  return { type: error.type, code: error.code } as any;
}

export {
  ISentManifest,
  ISentPeriod,
  ISentAdaptation,
  ISentRepresentation,
  IWorkerMessage,
} from "./send_message";

export {
  IABRThrottlers,
} from "./core/adaptive";
export {
  IBufferType,
} from "./core/segment_buffers";
export { IAdaptationType } from "./manifest";

function formatManifestBeforeSend(
  manifest : Manifest
) : ISentManifest {
  const periods : ISentPeriod[] = [];
  for (const period of manifest.periods) {
    periods.push(formatPeriodBeforeSend(period));
  }

  return {
    id: manifest.id,
    periods,
    isDynamic: manifest.isDynamic,
    isLive: manifest.isLive,
    isLastPeriodKnown: manifest.isLastPeriodKnown,
    suggestedPresentationDelay: manifest.suggestedPresentationDelay,
    clockOffset: manifest.clockOffset,
    uris: manifest.uris,
    availabilityStartTime: manifest.availabilityStartTime,
    timeBounds: manifest.timeBounds,
  };
}

function formatPeriodBeforeSend(
  period : Period
) : ISentPeriod {
  const adaptations : Partial<Record<IAdaptationType, ISentAdaptation[]>> = {};
  const baseAdaptations = period.getAdaptations();
  for (const adaptation of baseAdaptations) {
    let currentAdaps : ISentAdaptation[] | undefined = adaptations[adaptation.type];
    if (currentAdaps === undefined) {
      currentAdaps = [];
      adaptations[adaptation.type] = currentAdaps;
    }
    currentAdaps.push(formatAdaptationBeforeSend(adaptation));
  }
  return { start: period.start,
           end: period.end,
           id: period.id,
           adaptations };
}

function formatAdaptationBeforeSend(
  adaptation : Adaptation
) : ISentAdaptation {
  const representations : ISentRepresentation[] = [];
  const baseRepresentations = adaptation.representations;
  for (const representation of baseRepresentations) {
    representations.push(formatRepresentationBeforeSend(representation));
  }
  return {
    id: adaptation.id,
    type: adaptation.type,
    isSupported: adaptation.isSupported,
    language: adaptation.language,
    isClosedCaption: adaptation.isClosedCaption,
    isAudioDescription: adaptation.isAudioDescription,
    isSignInterpreted: adaptation.isSignInterpreted,
    normalizedLanguage: adaptation.normalizedLanguage,
    representations,
    label: adaptation.label,
    isDub: adaptation.isDub,
  };
}

function formatRepresentationBeforeSend(
  representation : Representation
) : ISentRepresentation {
  return { id: representation.id,
           bitrate: representation.bitrate,
           codec: representation.codec,
           width: representation.width,
           height: representation.height,
           frameRate: representation.frameRate,
           hdrInfo: representation.hdrInfo,
           decipherable: representation.decipherable };
}
