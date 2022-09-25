/* eslint-disable no-console */
import {
  merge as observableMerge,
  Observable,
  Subject,
  takeUntil,
  throwError,
} from "rxjs";
import {
  EncryptedMediaError,
  MediaError,
  NetworkError,
  OtherError,
  RequestError,
} from "../../../common/errors";
import { INetworkErrorCode } from "../../../common/errors/error_codes";
import log from "../../../common/log";
import {
  IAudioTrackSwitchingMode,
  IKeySystemOption,
  IPlayerError,
} from "../../../common/public_types";
import assert from "../../../common/utils/assert";
import idGenerator from "../../../common/utils/id_generator";
import createSharedReference, {
  IReadOnlySharedReference, ISharedReference,
} from "../../../common/utils/reference";
import TaskCanceller, {
  CancellationSignal,
} from "../../../common/utils/task_canceller";
import {
  IBufferType,
  ISentError,
  ISentManifest,
  IWorkerMessage,
} from "../../../worker";
import { hasEMEAPIs } from "../../compat";
import sendMessage from "../../send_message";
import PlaybackObserver from "../api/playback_observer";
import ContentDecryptor, {
  ContentDecryptorState,
  IContentProtection,
} from "../decrypt";
import emitLoadedEvent from "./emit_loaded_event";
import EVENTS from "./events_generators";
import getInitialTime, { IInitialTimeOptions } from "./get_initial_time";
import initialSeekAndPlay from "./initial_seek_and_play";
import throwOnMediaError from "./throw_on_media_error";
import { IInitEvent } from "./types";

const generateContentId = idGenerator();

/** Arguments received by `createAdaptiveRepresentationSelector`. */
export interface IAdaptiveOptions {
  /** Initial bitrate chosen, per type (minimum if not set) */
  initialBitrates: Partial<Record<IBufferType, number | undefined>>;

  /** Minimum bitrate chosen when in adaptive mode, per type (0 by default) */
  minAutoBitrates: Partial<Record<IBufferType, IReadOnlySharedReference<number>>>;

  /** Maximum bitrate chosen when in adaptive mode, per type (0 by default) */
  maxAutoBitrates: Partial<Record<IBufferType, IReadOnlySharedReference<number>>>;

  /** Manually forced bitrate set for a given type (`-1` for adaptive mode) */
  manualBitrates: Partial<Record<IBufferType, IReadOnlySharedReference<number>>>;

  /** Allows to filter which Representations can be choosen. */
  throttlers: IRepresentationEstimatorThrottlers;
}

/**
 * Throttlers are interfaces allowing to limit the pool of Representations
 * to choose from.
 */
export interface IRepresentationEstimatorThrottlers {
  limitWidth : Partial<Record<IBufferType,
                              IReadOnlySharedReference<number>>>;
  throttle : Partial<Record<IBufferType,
                            IReadOnlySharedReference<number>>>;
  throttleBitrate : Partial<Record<IBufferType,
                                   IReadOnlySharedReference<number>>>;
}

/** Arguments to give to the `InitializeOnMediaSource` function. */
export interface IInitializeArguments {
  /** Options concerning the ABR logic. */
  adaptiveOptions: IAdaptiveOptions;
  /** `true` if we should play when loaded. */
  autoPlay : boolean;
  /** Options concerning the media buffers. */
  bufferOptions : {
    /** Buffer "goal" at which we stop downloading new segments. */
    wantedBufferAhead : IReadOnlySharedReference<number>;
    /** Buffer maximum size in kiloBytes at which we stop downloading */
    maxVideoBufferSize :  IReadOnlySharedReference<number>;
    /** Max buffer size after the current position, in seconds (we GC further up). */
    maxBufferAhead : IReadOnlySharedReference<number>;
    /** Max buffer size before the current position, in seconds (we GC further down). */
    maxBufferBehind : IReadOnlySharedReference<number>;
    /** Strategy when switching the current bitrate manually (smooth vs reload). */
    manualBitrateSwitchingMode : "seamless" | "direct";
    /**
     * Enable/Disable fastSwitching: allow to replace lower-quality segments by
     * higher-quality ones to have a faster transition.
     */
    enableFastSwitching : boolean;
    /** Strategy when switching of audio track. */
    audioTrackSwitchingMode : IAudioTrackSwitchingMode;
    /** Behavior when a new video and/or audio codec is encountered. */
    onCodecSwitch : "continue" | "reload";
  };
  /** Regularly emit current playback conditions. */
  playbackObserver : PlaybackObserver;
  /** Every encryption configuration set. */
  keySystems : IKeySystemOption[];
  /** `true` to play low-latency contents optimally. */
  lowLatencyMode : boolean;
  /** The wanted Manifest's URL. */
  url : string | undefined;
/** The HTMLMediaElement on which we will play. */
  mediaElement : HTMLMediaElement;
  /** Limit the frequency of Manifest updates. */
  minimumManifestUpdateInterval : number;
  /** Emit the playback rate (speed) set by the user. */
  speed : IReadOnlySharedReference<number>;
  /** The configured starting position. */
  startAt? : IInitialTimeOptions | undefined;
  /** Configuration specific to the text track. */
  // textTrackOptions : ITextTrackSegmentBufferOptions;
}

const enum MediaSourceInitializationStatus {
  Nothing,
  Ready,
  Attached,
}

interface IDrmInitializationStatus {
  isInitialized : boolean;
  drmSystemId : string | undefined;
}

export function InitializeOnMediaSource(
  worker : Worker,
  { playbackObserver,
    adaptiveOptions,
    mediaElement,
    autoPlay,
    keySystems,
    url,
    minimumManifestUpdateInterval,
    lowLatencyMode,
    startAt,
    bufferOptions } : IInitializeArguments
) : Observable<IInitEvent> {
  let manifest : ISentManifest | null;
  const { enableFastSwitching,
          audioTrackSwitchingMode,
          wantedBufferAhead,
          maxVideoBufferSize,
          maxBufferAhead,
          maxBufferBehind,
          onCodecSwitch,
          manualBitrateSwitchingMode } = bufferOptions;
  const initialVideoBitrate = adaptiveOptions.initialBitrates.video;
  const initialAudioBitrate = adaptiveOptions.initialBitrates.audio;
  const limitVideoWidth = adaptiveOptions.throttlers.limitWidth.video ??
                          createSharedReference(Infinity);
  const throttleVideo = adaptiveOptions.throttlers.throttle.video ??
                        createSharedReference(Infinity);
  const throttleVideoBitrate = adaptiveOptions.throttlers.throttleBitrate.video ??
                               createSharedReference(Infinity);
  const minAudioBitrate = adaptiveOptions.minAutoBitrates.audio ??
                          createSharedReference(0);
  const minVideoBitrate = adaptiveOptions.minAutoBitrates.video ??
                          createSharedReference(0);
  const maxAudioBitrate = adaptiveOptions.maxAutoBitrates.audio ??
                          createSharedReference(Infinity);
  const maxVideoBitrate = adaptiveOptions.maxAutoBitrates.video ??
                          createSharedReference(Infinity);
  const manualAudioBitrate = adaptiveOptions.manualBitrates.audio ??
                             createSharedReference(-1);
  const manualVideoBitrate = adaptiveOptions.manualBitrates.video ??
                             createSharedReference(-1);

  const initCanceller = new TaskCanceller();
  const cancelSignal = initCanceller.signal;
  const finish$ = cancellationSignalToObservable(cancelSignal);

  const initSubject = new Subject<IInitEvent>();

  bindNumberReferencesToWorker(worker,
                               cancelSignal,
                               [wantedBufferAhead, "wantedBufferAhead"],
                               [maxVideoBufferSize, "maxVideoBufferSize"],
                               [maxBufferAhead, "maxBufferAhead"],
                               [maxBufferBehind, "maxBufferBehind"],
                               [minAudioBitrate, "minAudioBitrate"],
                               [minVideoBitrate, "minVideoBitrate"],
                               [maxAudioBitrate, "maxAudioBitrate"],
                               [maxVideoBitrate, "maxVideoBitrate"],
                               [manualAudioBitrate, "manualAudioBitrate"],
                               [manualVideoBitrate, "manualVideoBitrate"],
                               [limitVideoWidth, "limitVideoWidth"],
                               [throttleVideo, "throttleVideo"],
                               [throttleVideoBitrate, "throttleVideoBitrate"]);

  /** Send content protection initialization data. */
  const lastContentProtection = createSharedReference<IContentProtection | null>(null);

  const mediaSourceStatus = createSharedReference<MediaSourceInitializationStatus>(
    MediaSourceInitializationStatus.Nothing
  );

  const drmCallbacks = {
    onWarning(err : IPlayerError) {
      initSubject.next({ type: "warning", value: err });
    },
    onError(err : Error) {
      initSubject.error(err);
      initCanceller.cancel();
    },
  };
  const drmInitialization = initializeContentDecryption(mediaElement,
                                                        keySystems,
                                                        lastContentProtection,
                                                        mediaSourceStatus,
                                                        drmCallbacks,
                                                        initCanceller.signal);
  /**
   * Translate errors coming from the media element into RxPlayer errors
   * through a throwing Observable.
   */
  const mediaError$ = throwOnMediaError(mediaElement);

  if (url === undefined) {
    return throwError(() => new Error("URL should not be null"));
  }

  worker.onmessage = function onWorkerMessage(msg: MessageEvent<IWorkerMessage>) {
    switch (msg.data.type) {
      case "media-source": {
        const handle = msg.data.value;
        const listenCanceller = new TaskCanceller({ cancelOn: initCanceller.signal });
        mediaSourceStatus.onUpdate((currStatus) => {
          if (currStatus === MediaSourceInitializationStatus.Ready) {
            listenCanceller.cancel();
            mediaElement.srcObject = handle;
            mediaSourceStatus.setValue(MediaSourceInitializationStatus.Attached);
          }
        }, { emitCurrentValue: true, clearSignal: listenCanceller.signal });
        break;
      }

      case "warning":
        initSubject.next(EVENTS.warning(formatError(msg.data.value)));
        break;

      case "error":
        initSubject.error(formatError(msg.data.value));
        break;

      case "encryption-data-encountered":
        lastContentProtection.setValue(msg.data.value);
        break;

      case "ready-to-start": {
        manifest = msg.data.value.manifest;
        const listenCanceller = new TaskCanceller({ cancelOn: initCanceller.signal });
        drmInitialization.onUpdate(initializationStatus => {
          if (initializationStatus.isInitialized) {
            listenCanceller.cancel();
            startPlayback(initializationStatus.drmSystemId);
          }
        }, { emitCurrentValue: true, clearSignal: listenCanceller.signal });
        break;
      }

    }
  };

  sendMessage(worker,
              { type: "prepare",
                value: { contentId: generateContentId(),
                         url,
                         minimumManifestUpdateInterval,
                         lowLatencyMode,
                         initialVideoBitrate,
                         initialAudioBitrate,
                         manifestRetryOptions: {},
                         segmentRetryOptions: {} } });

  return observableMerge(mediaError$,
                         initSubject,
                         // Cancel `initCanceller` on Unsubscription
                         new Observable<never>(() => () => initCanceller.cancel()));

  function startPlayback(drmSystemId : string | undefined) {
    assert(manifest !== null);
    log.debug("Init: Calculating initial time");
    const initialTime = getInitialTime(manifest, lowLatencyMode, startAt);
    log.debug("Init: Initial time calculated:", initialTime);

    const { seekAndPlay$,
            initialPlayPerformed,
            initialSeekPerformed } = initialSeekAndPlay({ mediaElement,
                                                          mustAutoPlay: autoPlay,
                                                          playbackObserver,
                                                          startTime: initialTime });

    playbackObserver.listen(sendNewPlaybackObservation);

    const loadedEvent$ =
      emitLoadedEvent(playbackObserver.getReference().asObservable(),
                      mediaElement,
                      false);
    loadedEvent$
      .pipe(takeUntil(finish$))
      .subscribe(initSubject);

    function sendNewPlaybackObservation() : void {
      assert(manifest !== null);
      const observation = playbackObserver.getReference().getValue();
      const speedVal = 1;
      let pendingPosition : number | undefined;
      if (!initialSeekPerformed.getValue()) {
        pendingPosition = initialTime;
      } else if (!manifest.isDynamic || manifest.isLastPeriodKnown) {
        // HACK: When the position is actually further than the maximum
        // position for a finished content, we actually want to be loading
        // the last segment before ending.
        // For now, this behavior is implicitely forced by making as if we
        // want to seek one second before the period's end (despite never
        // doing it).
        const lastPeriod = manifest.periods[manifest.periods.length - 1];
        if (lastPeriod !== undefined &&
            lastPeriod.end !== undefined &&
            observation.position > lastPeriod.end)
        {
          pendingPosition = lastPeriod.end - 1;
        }
      }

      sendMessage(worker,
                  { type: "observation",
                    value: { position: { last: observation.position,
                                         pending: pendingPosition },
                             duration: observation.duration,
                             paused: {
                               last: observation.paused,
                               pending: initialPlayPerformed.getValue()  ? undefined :
                                        !autoPlay === observation.paused ? undefined :
                                                                           !autoPlay,
                             },
                             speed: speedVal,
                             readyState: observation.readyState } });
    }
    seekAndPlay$
      .pipe(takeUntil(finish$))
      .subscribe();
    sendMessage(worker,
                { type: "start",
                  value: { initialTime,
                           drmSystemId,
                           manualBitrateSwitchingMode,
                           enableFastSwitching,
                           audioTrackSwitchingMode,
                           onCodecSwitch } });
    initSubject.next(EVENTS.manifestReady(manifest));
  }
}

function initializeContentDecryption(
  mediaElement : HTMLMediaElement,
  keySystems : IKeySystemOption[],
  lastContentProtection : IReadOnlySharedReference<null | IContentProtection>,
  mediaSourceStatus : ISharedReference<MediaSourceInitializationStatus>,
  callbacks : { onWarning : (err : IPlayerError) => void;
                onError : (err : Error) => void; },
  cancelSignal : CancellationSignal
) : IReadOnlySharedReference<IDrmInitializationStatus> {
  const listenCanceller = new TaskCanceller({ cancelOn: cancelSignal });
  if (keySystems.length === 0) {
    lastContentProtection.onUpdate((data) => {
      if (data === null) { // initial value
        return;
      }
      listenCanceller.cancel();
      log.error("Init: Encrypted event but EME feature not activated");
      const err = new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR",
                                          "EME feature not activated.");
      callbacks.onError(err);
    }, { clearSignal: listenCanceller.signal });
    mediaSourceStatus.setValue(MediaSourceInitializationStatus.Ready);
    return createSharedReference({ isInitialized: true,
                                   drmSystemId: undefined });
  } else if (!hasEMEAPIs()) {
    lastContentProtection.onUpdate((data) => {
      if (data === null) { // initial value
        return;
      }
      listenCanceller.cancel();
      log.error("Init: Encrypted event but no EME API available");
      const err = new EncryptedMediaError("MEDIA_IS_ENCRYPTED_ERROR",
                                          "Encryption APIs not found.");
      callbacks.onError(err);
    }, { clearSignal: listenCanceller.signal });
    mediaSourceStatus.setValue(MediaSourceInitializationStatus.Ready);
    return createSharedReference({ isInitialized: true,
                                   drmSystemId: undefined });
  }

  const drmStatusRef = createSharedReference<IDrmInitializationStatus>({
    isInitialized: false,
    drmSystemId: undefined,
  });

  log.debug("Init: Creating ContentDecryptor");
  const contentDecryptor = new ContentDecryptor(mediaElement, keySystems);

  contentDecryptor.addEventListener("stateChange", (state) => {
    if (state === ContentDecryptorState.WaitingForAttachment) {
      const mediaSourceStatusListenerCanceller = new TaskCanceller({
        cancelOn: listenCanceller.signal,
      });
      mediaSourceStatus.onUpdate((currStatus) => {
        if (currStatus === MediaSourceInitializationStatus.Nothing) {
          mediaSourceStatus.setValue(MediaSourceInitializationStatus.Ready);
        } else if (currStatus === MediaSourceInitializationStatus.Attached) {
          mediaSourceStatusListenerCanceller.cancel();
          if (state === ContentDecryptorState.WaitingForAttachment) {
            contentDecryptor.attach();
          }
        }
      }, { clearSignal: mediaSourceStatusListenerCanceller.signal,
           emitCurrentValue: true });
    } else if (state === ContentDecryptorState.ReadyForContent) {
      drmStatusRef.setValue({ isInitialized: true,
                              drmSystemId: contentDecryptor.systemId });
      contentDecryptor.removeEventListener("stateChange");
    }
  });

  contentDecryptor.addEventListener("error", (error) => {
    listenCanceller.cancel();
    callbacks.onError(error);
  });

  contentDecryptor.addEventListener("warning", (error) => {
    callbacks.onWarning(error);
  });

  lastContentProtection.onUpdate((data) => {
    if (data === null) {
      return;
    }
    contentDecryptor.onInitializationData(data);
  }, { clearSignal: listenCanceller.signal });

  listenCanceller.signal.register(() => {
    contentDecryptor.dispose();
  });

  return drmStatusRef;
}

function cancellationSignalToObservable(
  signal : CancellationSignal
) : Observable<void> {
  return new Observable<void>((obs) => {
    if (signal.isCancelled) {
      obs.next();
    } else {
      const deregister = signal.register(() => {
        obs.next();
      });
      return () => {
        deregister();
      };
    }
  });
}

function bindNumberReferencesToWorker(
  worker : Worker,
  cancellationSignal : CancellationSignal,
  ...refs : Array<[
    IReadOnlySharedReference<number>,
    "wantedBufferAhead" |
    "maxVideoBufferSize" |
    "maxBufferBehind" |
    "maxBufferAhead" |
    "minAudioBitrate" |
    "maxAudioBitrate" |
    "minVideoBitrate" |
    "maxVideoBitrate" |
    "manualAudioBitrate" |
    "manualVideoBitrate" |
    "speed" |
    "limitVideoWidth" |
    "throttleVideo" |
    "throttleVideoBitrate"
  ]>
) : void {
  for (const ref of refs) {
    ref[0].onUpdate(newVal => {
      // NOTE: The TypeScript checks have already been made by this function's
      // overload, but the body here is not aware of that.
      /* eslint-disable @typescript-eslint/no-unsafe-assignment */
      /* eslint-disable @typescript-eslint/no-explicit-any */
      /* eslint-disable @typescript-eslint/no-unsafe-call */
      /* eslint-disable @typescript-eslint/no-unsafe-member-access */
      sendMessage(worker, { type: "reference-update",
                            value: { name: ref[1] as any,
                                     newVal: newVal as any } });
      /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      /* eslint-enable @typescript-eslint/no-explicit-any */
      /* eslint-enable @typescript-eslint/no-unsafe-call */
      /* eslint-enable @typescript-eslint/no-unsafe-member-access */
    }, { clearSignal: cancellationSignal, emitCurrentValue: true });
  }
}

function formatError(sentError : ISentError) : IPlayerError {
  switch (sentError.type) {
    case "NETWORK_ERROR":
      return new NetworkError(sentError.code as INetworkErrorCode,
                              new RequestError("XXX TODO", 500, "TIMEOUT", undefined));
    case "MEDIA_ERROR":
      return new MediaError(sentError.code, "XXX TODO");
    case "ENCRYPTED_MEDIA_ERROR":
      return new EncryptedMediaError(sentError.code, "XXX TODO");
    case "OTHER_ERROR":
      return new OtherError(sentError.code, "XXX TODO");
  }
}
