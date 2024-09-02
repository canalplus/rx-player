/**
 * This file regroups TypeScript types and enums only needed when running the
 * RxPlayer in a
 * multithread situation.
 */

import type { ISegmentSinkMetrics } from "./core/segment_sinks/segment_buffers_store";
import type {
  IResolutionInfo,
  IManifestFetcherSettings,
  ISegmentFetcherCreatorBackoffOptions,
  IInbandEvent,
  IPausedPlaybackObservation,
  IRepresentationsChoice,
  ITrackSwitchingMode,
} from "./core/types";
import type {
  ISerializedMediaError,
  ISerializedNetworkError,
  ISerializedEncryptedMediaError,
  ISerializedOtherError,
} from "./errors";
import type { ISerializedSourceBufferError } from "./errors/source_buffer_error";
import type { IContentProtection, ITextDisplayerData } from "./main_thread/types";
import type { IManifestMetadata, IPeriodsUpdateResult } from "./manifest";
import type {
  ISourceBufferInterfaceAppendBufferParameters,
  SourceBufferType,
} from "./mse";
import type { IFreezingStatus, IRebufferingStatus } from "./playback_observer";
import type { ICmcdOptions, ITrackType } from "./public_types";
import type { ITransportOptions } from "./transports";
import type { ILogFormat, ILoggerLevel } from "./utils/logger";
import type { IRange } from "./utils/ranges";

/**
 * First message sent by the main thread to the WebWorker.
 * A WebWorker should only receive one `IInitMessage` at most and it should be
 * always the first message received.
 *
 * Allows for WebWorker initialization.
 */
export interface IInitMessage {
  type: MainThreadMessageType.Init;
  value: {
    /** Link to the DASH_WASM's feature WebAssembly file to parse DASH MPDs. */
    dashWasmUrl: string | undefined;
    /**
     * If `true` the final element on the current page displaying the content
     * can display video content.
     *
     * If `false`, it cannot, but it can be assumed to be able to play audio
     * content.
     * An example where it would be set to `false` is for `HTMLAudioElement`
     * elements (`<audio>` tags).
     */
    hasVideo: boolean;
    /**
     * If `true` the current platform exposes Media Source extensions (MSE) API
     * in a WebWorker environment.
     *
     * If `false`, every MSE API has to be called on the main thread, usually
     * by messages posted by the WebWorker.
     */
    hasMseInWorker: boolean;
    /** Initial logging level that should be set. */
    logLevel: ILoggerLevel;
    /** Intitial logger's log format that should be set. */
    logFormat: ILogFormat;
    /**
     * If `true`, logs should be sent back to the main thread, through a
     * `ILogMessageWorkerMessage` message.
     */
    sendBackLogs: boolean;
    /**
     * Value of `Date.now()` at the time the `timestamp` property was generated.
     *
     * This is mostly useful for timestamp synchronization: by calling both
     * `performance.now` (the same call on the main thread made to calculate
     * `timestamp` - but which is not synchronized initially to the WebWorker's)
     * and `Date.now()` both on the main thread and on the WebWorker,
     * calculating the difference between the two and comparing both the main
     * thread's difference and the WebWorker's difference, you're able to
     * produce a relatively-synchronized timestamp between the two.
     */
    date: number;
    /**
     * Value returned by `performance.now()` at the same time `date` was
     * calculated.
     *
     * Allows for timestamp synchronization.
     * @see date property.
     */
    timestamp: number;
  };
}

/** Options needed when initializing a new content. */
export interface IContentInitializationData {
  /**
   * Identifier uniquely identifying a specific content.
   *
   * Protects against all kind of race conditions or asynchronous issues.
   */
  contentId: string;
  /**
   * When set to an object, enable "Common Media Client Data", or "CMCD".
   */
  cmcd?: ICmcdOptions | undefined;
  /**
   * If `true`, the RxPlayer can enable its "Representation deprecation"
   * mechanism, where it avoid loading Representation that it suspect
   * have issues being decoded on the current device.
   */
  enableRepresentationDeprecation: boolean;
  /**
   * URL at which the content's Manifest is accessible.
   * `undefined` if unknown.
   */
  url?: string | undefined;
  /** If `true`, text buffer (e.g. for subtitles) is enabled. */
  hasText: boolean;
  /**
   * Options relative to the streaming protocol.
   *
   * Options not yet supported in a WebWorker environment are omitted.
   */
  transportOptions: Omit<
    ITransportOptions,
    "manifestLoader" | "segmentLoader" | "representationFilter"
  > & {
    // Unsupported features have to be disabled explicitely
    // TODO support them
    manifestLoader: undefined;
    segmentLoader: undefined;

    // Option which has to be set as a Funtion string to work.
    representationFilter: string | undefined;
  };
  /** Initial video bitrate on which the adaptive logic will base itself. */
  initialVideoBitrate?: number | undefined;
  /** Initial audio bitrate on which the adaptive logic will base itself. */
  initialAudioBitrate?: number | undefined;
  /**
   * Options relative to the fetching and refreshing of the Manifest.
   */
  manifestRetryOptions: Omit<IManifestFetcherSettings, "cmcdDataBuilder">;
  /** Options relative to the fetching of media segments. */
  segmentRetryOptions: ISegmentFetcherCreatorBackoffOptions;
}

export interface ILogLevelUpdateMessage {
  type: MainThreadMessageType.LogLevelUpdate;
  value: {
    /** The new logger level that should be set. */
    logLevel: ILoggerLevel;
    /** Intitial logger's log format that should be set. */
    logFormat: ILogFormat;
    /**
     * If `true`, logs should be sent back to the main thread, through a
     * `ILogMessageWorkerMessage` message.
     */
    sendBackLogs: boolean;
  };
}

/**
 * Message sent by the main thread when a new content should be "prepared".
 *
 * You can begin performing operarions which do not interrupt the previous
 * content, like fetching its Manifest.
 *
 * Note that on the receivings-side, you only need to prepare one content at
 * most. Meaning that if multiple `IPrepareContentMessage` arrive in a row, you
 * can stop the preparation of previous contents.
 */
export interface IPrepareContentMessage {
  type: MainThreadMessageType.PrepareContent;
  value: IContentInitializationData;
}

/**
 * Message sent by the main thread to stop playback of the last prepared content
 * (through a `IPrepareContentMessage`) - if it was playing - and dispose all
 * associated resources.
 */
export interface IStopContentMessage {
  type: MainThreadMessageType.StopContent;
  /**
   * Same `contentId` than for the corresponding `IPrepareContentMessage` message.
   *
   * Allows to ensure no race condition lead to actually stopping another content
   * than the one meant by the main thread.
   */
  contentId: string;
  value: null;
}

/**
 * Message sent by the main thread to start playback of the last prepared content
 * (through a `IPrepareContentMessage`).
 */
export interface IStartPreparedContentMessage {
  type: MainThreadMessageType.StartPreparedContent;
  /**
   * Same `contentId` than for the corresponding `IPrepareContentMessage` message.
   *
   * Allows to ensure no race condition lead to starting another content than
   * the one meant by the main thread.
   */
  contentId: string;
  value: IStartPreparedContentMessageValue;
}

/** Options needed when starting a new content. */
export interface IStartPreparedContentMessageValue {
  /** The start time at which we should play, in seconds. */
  initialTime: number;
  /** The current playback observation. */
  initialObservation: ISerializedPlaybackObservation;
  /**
   * Hex-encoded string identifying the key system used.
   * May be cross-referenced with the content's metadata when performing
   * optimizations.
   */
  drmSystemId: string | undefined;
  /**
   * Enable/Disable fastSwitching: allow to replace lower-quality segments by
   * higher-quality ones to have a faster transition.
   */
  enableFastSwitching: boolean;
  /** Behavior when a new video and/or audio codec is encountered. */
  onCodecSwitch: "continue" | "reload";

  // TODO prepare chosen Adaptations here?
  // In which case the Period's `id` should probably be given instead of the
  // `initialTime`
}

/**
 * Message sent by the main thread when it has updated its list of supported
 * codecs and has reasons to think that the WebWorker is not aware of it
 * (e.g. their support was not set in a Manifest).
 */
export interface ICodecSupportUpdateMessage {
  type: MainThreadMessageType.CodecSupportUpdate;
  value: ICodecSupportInfo[];
}

export interface ICodecSupportInfo {
  mimeType: string;
  codec: string;
  supported?: boolean | undefined;
  supportedIfEncrypted?: boolean | undefined;
}

/**
 * Message sent by the main thread to the WebWorker regularly after an
 * `IPrepareContentMessage` to provide various media-related metadata
 * only obtainable on the main thread.
 *
 * Those messages are sent until the `IStopContentMessage` for that same
 * `contentId`.
 */
export interface IPlaybackObservationMessage {
  type: MainThreadMessageType.PlaybackObservation;
  /**
   * Same `contentId` than for the corresponding `IPrepareContentMessage` message.
   * Allows to prevent race conditions.
   */
  contentId: string;
  /** The media-related metadata that has just been observed now. */
  value: ISerializedPlaybackObservation;
}

/**
 * Message sent by the main thread when at least one of the `Representation` of
 * the current content just had a change of decipherability status.
 *
 * That is if one of the Representation either:
 *   - became undecipherable
 *   - became decipherable
 *   - had its decipherability status transition from being known to unknown
 */
export interface IDecipherabilityStatusChangedMessage {
  type: MainThreadMessageType.DecipherabilityStatusUpdate;
  /**
   * Same `contentId` than for the corresponding `IPrepareContentMessage` message.
   * Allows to prevent race conditions.
   */
  contentId: string;
  /** List of the `Representation` which had their decipherability status updated. */
  value: IDecipherabilityStatusChangedPayload[];
}

/** Object describing the new decipherability status of a `Representation`. */
export interface IDecipherabilityStatusChangedPayload {
  /** `uniqueId` for the concerned `Representation`. */
  representationUniqueId: string;
  /**
   * If set to `true`, the `Representation` became decipherable.
   *
   * If set to `false`, the `Representation` became undecipherable.
   *
   * If set to `undefined`, the `Representation`'s decipherability status became
   * unknown.
   */
  decipherable: boolean | undefined;
}

/** Message allowing to update the URL of the content being played. */
export interface IUpdateContentUrlsMessage {
  type: MainThreadMessageType.ContentUrlsUpdate;
  /**
   * Same `contentId` than for the corresponding `IPrepareContentMessage` message.
   * Allows to prevent race conditions.
   */
  contentId: string;
  /** Information on the new URL to set. */
  value: IUpdateContentUrlsMessageValue;
}

/** Payload of an `IUpdateContentUrlsMessage`. */
export interface IUpdateContentUrlsMessageValue {
  /**
   * URLs to reach that Manifest from the most prioritized URL to the least
   * prioritized URL.
   */
  urls: string[] | undefined;
  /**
   * If `true` the resource in question (e.g. DASH's MPD) will be refreshed
   * immediately.
   */
  refreshNow: boolean;
}

export interface ITrackUpdateMessage {
  type: MainThreadMessageType.TrackUpdate;
  contentId: string;
  value: {
    periodId: string;
    bufferType: ITrackType;
    choice: ITrackUpdateChoiceObject | null | undefined;
  };
}

export interface ITrackUpdateChoiceObject {
  /** The Adaptation choosen. */
  adaptationId: string;

  /** "Switching mode" in which the track switch should happen. */
  switchingMode: ITrackSwitchingMode;

  /**
   * Shared reference allowing to indicate which Representations from
   * that Adaptation are allowed.
   */
  initialRepresentations: IRepresentationsChoice;

  /** Relative resuming position after a track change */
  relativeResumingPosition: number | undefined;
}

export interface IRepresentationUpdateMessage {
  type: MainThreadMessageType.RepresentationUpdate;
  contentId: string;
  value: {
    periodId: string;
    bufferType: ITrackType;
    adaptationId: string;
    choice: IRepresentationsChoice;
  };
}

/** Media-related metadata. */
export interface ISerializedPlaybackObservation {
  /**
   * Information on whether the media element was paused at the time of the
   * Observation.
   */
  paused: IPausedPlaybackObservation;
  position: [number, number | null];
  /** `readyState` property of the HTMLMediaElement. */
  readyState: number;
  /** Target playback rate at which we want to play the content. */
  speed: number;
  /** Theoretical maximum position on the content that can currently be played. */
  maximumPosition: number;
  /**
   * Ranges of buffered data per type of media.
   *
   * `null` as a record's value if no buffer exists for that type of media.
   *
   * `null` as a `buffered` value if this could not have been obtained on the
   * current environment (e.g. in the main thread).
   */
  buffered: Record<ITrackType, IRange[] | null>;
  duration: number;
  /**
   * Set if the player is short on audio and/or video media data and is a such,
   * rebuffering.
   * `null` if not.
   */
  rebuffering: IRebufferingStatus | null;
  /**
   * Set if the player is frozen, that is, stuck in place for unknown reason.
   * Note that this reason can be a valid one, such as a necessary license not
   * being obtained yet.
   *
   * `null` if the player is not frozen.
   */
  freezing: IFreezingStatus | null;
  /**
   * Gap between `currentTime` and the next position with un-buffered data.
   * `Infinity` if we don't have buffered data right now.
   * `undefined` if we cannot determine the buffer gap.
   */
  bufferGap: number | undefined;
  /** If `true` the content is loaded until its maximum position. */
  fullyLoaded: boolean;
}

/**
 * Sent when the SourceBuffer linked to the given `mediaSourceId` and
 * `SourceBufferType`, running on the main thread, succeeded to perform the last
 * operation given to it (either through an `AppendBufferWorkerMessage` or a
 * `RemoveBufferWorkerMessage`).
 */
export interface ISourceBufferOperationSuccessMainMessage {
  type: MainThreadMessageType.SourceBufferSuccess;
  /**
   * Identify the MediaSource which contains the SourceBuffer concerned by
   * this update.
   */
  mediaSourceId: string;
  /**
   * Id uniquely identifying this SourceBuffer.
   * It should be the same `SourceBufferType` than the one on the
   * `CreateSourceBufferWorkerMessage`.
   */
  sourceBufferType: SourceBufferType;
  /** Identify the corresponding SourceBuffer operation. */
  operationId: string;
  value: {
    /**
     * New contiguous buffered time ranges, in chronological order in seconds.
     */
    buffered: IRange[];
  };
}

export interface ISourceBufferErrorMainMessage {
  type: MainThreadMessageType.SourceBufferError;
  /**
   * Identify the MediaSource which contains the SourceBuffer concerned by
   * this update.
   */
  mediaSourceId: string;
  /** Identify the SourceBuffer in question. */
  sourceBufferType: SourceBufferType;
  /** Identify the corresponding SourceBuffer operation. */
  operationId: string;
  value:
    | ISerializedSourceBufferError
    | {
        /**
         * Identify a cancellation-specific error (the corresponding operation
         * was cancelled.
         */
        errorName: "CancellationError";
      };
}

/**
 * Sent by the main thread to a Worker when the MediaSource linked to the
 * `mediaSourceId` changed its readyState.
 *
 * This message is only sent if the MediaSource is created on the main thread.
 */
export interface IMediaSourceReadyStateChangeMainMessage {
  type: MainThreadMessageType.MediaSourceReadyStateChange;
  /** Identify the MediaSource through this unique identifier. */
  mediaSourceId: string;
  value: ReadyState;
}

export interface IPushTextDataSuccessMessage {
  type: MainThreadMessageType.PushTextDataSuccess;
  contentId: string;
  value: {
    ranges: IRange[];
  };
}

export interface IRemoveTextDataSuccessMessage {
  type: MainThreadMessageType.RemoveTextDataSuccess;
  contentId: string;
  value: {
    ranges: IRange[];
  };
}

export interface IPushTextDataErrorMessage {
  type: MainThreadMessageType.PushTextDataError;
  contentId: string;
  value: {
    message: string;
  };
}

export interface IRemoveTextDataErrorMessage {
  type: MainThreadMessageType.RemoveTextDataError;
  contentId: string;
  value: {
    message: string;
  };
}

/**
 * Template for a message originating from main thread to update
 * `SharedReference` objects (a common abstraction of the RxPlayer allowing for
 * passing values whose updates can be listened to through a callback).
 *
 * Here, `TRefName` is the "name" of the `SharedReference` (the identifier
 * choosen for it) and `TRefType` is the type of its value.
 */
export interface IReferenceUpdate<TRefName extends string, TRefType> {
  type: MainThreadMessageType.ReferenceUpdate;
  value: { name: TRefName; newVal: TRefType };
}

export type IReferenceUpdateMessage =
  | IReferenceUpdate<"wantedBufferAhead", number>
  | IReferenceUpdate<"maxVideoBufferSize", number>
  | IReferenceUpdate<"maxBufferBehind", number>
  | IReferenceUpdate<"maxBufferAhead", number>
  | IReferenceUpdate<"limitVideoResolution", IResolutionInfo>
  | IReferenceUpdate<"throttleVideoBitrate", number>;

export interface IPullSegmentSinkStoreInfos {
  type: MainThreadMessageType.PullSegmentSinkStoreInfos;
  value: { messageId: number };
}

export const enum MainThreadMessageType {
  Init = "init",
  PushTextDataSuccess = "add-text-success",
  RemoveTextDataSuccess = "remove-text-success",
  PushTextDataError = "push-text-error",
  RemoveTextDataError = "remove-text-error",
  CodecSupportUpdate = "codec-support-update",
  ContentUrlsUpdate = "urls-update",
  DecipherabilityStatusUpdate = "decipherability-update",
  LogLevelUpdate = "log-level-update",
  MediaSourceReadyStateChange = "media-source-ready-state-change",
  PlaybackObservation = "observation",
  PrepareContent = "prepare",
  ReferenceUpdate = "ref-update",
  RepresentationUpdate = "rep-update",
  SourceBufferError = "sb-error",
  SourceBufferSuccess = "sb-success",
  StartPreparedContent = "start",
  StopContent = "stop",
  TrackUpdate = "track-update",
  PullSegmentSinkStoreInfos = "pull-segment-sink-store-infos",
}

export type IMainThreadMessage =
  | IInitMessage
  | ILogLevelUpdateMessage
  | IPrepareContentMessage
  | IStopContentMessage
  | IStartPreparedContentMessage
  | IReferenceUpdateMessage
  | ICodecSupportUpdateMessage
  | IPlaybackObservationMessage
  | IDecipherabilityStatusChangedMessage
  | IUpdateContentUrlsMessage
  | ISourceBufferErrorMainMessage
  | ISourceBufferOperationSuccessMainMessage
  | ITrackUpdateMessage
  | IRepresentationUpdateMessage
  | IPushTextDataSuccessMessage
  | IRemoveTextDataSuccessMessage
  | IPushTextDataErrorMessage
  | IRemoveTextDataErrorMessage
  | IMediaSourceReadyStateChangeMainMessage
  | IPullSegmentSinkStoreInfos;

export type ISentError =
  | ISerializedNetworkError
  | ISerializedMediaError
  | ISerializedEncryptedMediaError
  | ISerializedOtherError;

/**
 * Message sent by the WebWorker when its initialization, started implicitely
 * as soon as the `new Worker` call was made for it, has finished and succeeded.
 *
 * Once that message has been received, you can ensure that no
 * `IInitErrorWorkerMessage` will ever be received for the same worker.
 *
 * Note that receiving this message is not a requirement before preparing and
 * loading a content, both initialization and content loading can be started in
 * parallel.
 */
export interface IInitSuccessWorkerMessage {
  type: WorkerMessageType.InitSuccess;
  value: null;
}

/**
 * Message sent by the WebWorker when its initialization, started implicitely
 * as soon as the `new Worker` call was made for it, has finished and failed.
 *
 * Once that message has been received, you can ensure that no
 * `IInitErrorWorkerMessage` will ever be received for the same worker.
 *
 * Note that you may received this message while preparing and/or loading a
 * content, both initialization and content loading can be started in
 * parallel.
 * As such, this message may be coupled with a content error.
 */
export interface IInitErrorWorkerMessage {
  type: WorkerMessageType.InitError;
  value: {
    /** A string describing the error encountered. */
    errorMessage: string;

    kind: "dashWasmInitialization";
  };
}

export interface INeedsBufferFlushWorkerMessage {
  type: WorkerMessageType.NeedsBufferFlush;
  contentId: string;
  value:
    | { relativeResumingPosition: number; relativePosHasBeenDefaulted: boolean }
    | undefined;
}

export interface IActivePeriodChangedWorkerMessage {
  type: WorkerMessageType.ActivePeriodChanged;
  contentId: string;
  value: {
    periodId: string;
  };
}

export interface IWarningWorkerMessage {
  type: WorkerMessageType.Warning;
  contentId: string | undefined;
  value: ISentError;
}

export interface IAttachMediaSourceWorkerMessage {
  type: WorkerMessageType.AttachMediaSource;
  contentId: string | undefined;
  mediaSourceId: string | undefined;
  value: IAttachMediaSourceWorkerMessagePayload;
}

export type IAttachMediaSourceWorkerMessagePayload =
  | {
      type: "handle";
      value: MediaProvider;
    }
  | {
      type: "url";
      value: string;
    };

export interface ICreateMediaSourceWorkerMessage {
  type: WorkerMessageType.CreateMediaSource;
  mediaSourceId: string;
  contentId: string;
}

export interface IAddSourceBufferWorkerMessage {
  type: WorkerMessageType.AddSourceBuffer;
  mediaSourceId: string;
  value: {
    sourceBufferType: SourceBufferType;
    codec: string;
  };
}

export interface IAppendBufferWorkerMessage {
  type: WorkerMessageType.SourceBufferAppend;
  mediaSourceId: string;
  sourceBufferType: SourceBufferType;
  operationId: string;
  value: {
    data: BufferSource;
    params: ISourceBufferInterfaceAppendBufferParameters;
  };
}

export interface IRemoveBufferWorkerMessage {
  type: WorkerMessageType.SourceBufferRemove;
  mediaSourceId: string;
  sourceBufferType: SourceBufferType;
  operationId: string;
  value: {
    /** Start time we should remove data from, in seconds. */
    start: number;
    /** End time we should remove data at, in seconds. */
    end: number;
  };
}

export interface IAbortBufferWorkerMessage {
  type: WorkerMessageType.AbortSourceBuffer;
  mediaSourceId: string;
  sourceBufferType: SourceBufferType;
  value: null;
}

export interface IUpdateMediaSourceDurationWorkerMessage {
  type: WorkerMessageType.UpdateMediaSourceDuration;
  mediaSourceId: string;
  value: {
    duration: number;
    isRealEndKnown: boolean;
  };
}

export interface IInterruptMediaSourceDurationWorkerMessage {
  type: WorkerMessageType.InterruptMediaSourceDurationUpdate;
  mediaSourceId: string;
  value: null;
}

export interface IEndOfStreamWorkerMessage {
  type: WorkerMessageType.EndOfStream;
  mediaSourceId: string;
  value: null;
}

export interface IStopEndOfStreamWorkerMessage {
  type: WorkerMessageType.InterruptEndOfStream;
  mediaSourceId: string;
  value: null;
}

export interface IDisposeMediaSourceWorkerMessage {
  type: WorkerMessageType.DisposeMediaSource;
  mediaSourceId: string;
  value: null;
}

export interface IAdaptationChangeWorkerMessage {
  type: WorkerMessageType.AdaptationChanged;
  contentId: string;
  value: {
    adaptationId: string | null;
    periodId: string;
    type: ITrackType;
  };
}

export interface IRepresentationChangeWorkerMessage {
  type: WorkerMessageType.RepresentationChanged;
  contentId: string;
  value: {
    adaptationId: string;
    representationId: string | null;
    periodId: string;
    type: ITrackType;
  };
}

export interface IManifestReadyWorkerMessage {
  type: WorkerMessageType.ManifestReady;
  contentId: string;
  value: { manifest: IManifestMetadata };
}

export interface IManifestUpdateWorkerMessage {
  type: WorkerMessageType.ManifestUpdate;
  contentId: string | undefined;
  value: {
    manifest: IManifestMetadata; // TODO only subpart that changed?
    updates: IPeriodsUpdateResult;
  };
}

export interface IEncryptionDataEncounteredWorkerMessage {
  type: WorkerMessageType.EncryptionDataEncountered;
  contentId: string | undefined;
  value: IContentProtection;
}

export interface IErrorWorkerMessage {
  type: WorkerMessageType.Error;
  contentId: string | undefined;
  value: ISentError;
}

export interface IUpdatePlaybackRateWorkerMessage {
  type: WorkerMessageType.UpdatePlaybackRate;
  contentId: string | undefined;
  value: number;
}

export interface IReloadingMediaSourceWorkerMessage {
  type: WorkerMessageType.ReloadingMediaSource;
  contentId: string;
  value: {
    timeOffset: number;
    minimumPosition?: number | undefined;
    maximumPosition?: number | undefined;
  };
}

export interface INeedsDecipherabilityFlushWorkerMessage {
  type: WorkerMessageType.NeedsDecipherabilityFlush;
  contentId: string;
  value: null;
}

export interface ILockedStreamWorkerMessage {
  type: WorkerMessageType.LockedStream;
  contentId: string;
  value: {
    /** Period concerned. */
    periodId: string;
    /** Buffer type concerned. */
    bufferType: ITrackType;
  };
}

export interface IBitrateEstimateChangeWorkerMessage {
  type: WorkerMessageType.BitrateEstimateChange;
  contentId: string;
  value: {
    bitrate: number | undefined;
    bufferType: ITrackType;
  };
}

export interface IInbandEventWorkerMessage {
  type: WorkerMessageType.InbandEvent;
  contentId: string;
  value: IInbandEvent[];
}

export interface IPeriodStreamReadyWorkerMessage {
  type: WorkerMessageType.PeriodStreamReady;
  contentId: string;
  value: {
    /** Period concerned. */
    periodId: string;
    /** Buffer type concerned. */
    bufferType: ITrackType;
  };
}

export interface IPeriodStreamClearedWorkerMessage {
  type: WorkerMessageType.PeriodStreamCleared;
  contentId: string;
  value: {
    /** `id` of the Period concerned. */
    periodId: string;
    /** Buffer type concerned. */
    bufferType: ITrackType;
  };
}

export interface IPushTextDataWorkerMessage {
  type: WorkerMessageType.PushTextData;
  contentId: string;
  value: ITextDisplayerData;
}

export interface IRemoveTextDataWorkerMessage {
  type: WorkerMessageType.RemoveTextData;
  contentId: string;
  value: {
    start: number;
    end: number;
  };
}

export interface IStopTextDisplayerWorkerMessage {
  type: WorkerMessageType.StopTextDisplayer;
  contentId: string;
  value: null;
}

export interface IResetTextDisplayerWorkerMessage {
  type: WorkerMessageType.ResetTextDisplayer;
  contentId: string;
  value: null;
}

export interface ILogMessageWorkerMessage {
  type: WorkerMessageType.LogMessage;
  value: {
    logLevel: ILoggerLevel;
    logs: Array<boolean | string | number | ISentError | null | undefined>;
  };
}

export interface IDiscontinuityUpdateWorkerMessage {
  type: WorkerMessageType.DiscontinuityUpdate;
  contentId: string;
  value: IDiscontinuityUpdateWorkerMessagePayload;
}

export interface IDiscontinuityUpdateWorkerMessagePayload {
  periodId: string;
  bufferType: ITrackType;
  discontinuity: IDiscontinuityTimeInfo | null;
  position: number;
}

/** Information on a found discontinuity. */
export interface IDiscontinuityTimeInfo {
  /**
   * Start time of the discontinuity.
   * `undefined` for when the start is unknown but the discontinuity was
   * currently encountered at the position we were in when this event was
   * created.
   */
  start: number | undefined;
  /**
   * End time of the discontinuity, in seconds.
   * If `null`, no further segment can be loaded for the corresponding Period.
   */
  end: number | null;
}

export interface ISegmentSinkStoreUpdateMessage {
  type: WorkerMessageType.SegmentSinkStoreUpdate;
  contentId: string;
  value: {
    segmentSinkMetrics: ISegmentSinkMetrics;
    messageId: number;
  };
}

export const enum WorkerMessageType {
  AbortSourceBuffer = "abort-source-buffer",
  ActivePeriodChanged = "active-period-changed",
  AdaptationChanged = "adaptation-changed",
  AddSourceBuffer = "add-source-buffer",
  AttachMediaSource = "attach-media-source",
  BitrateEstimateChange = "bitrate-estimate-change",
  CreateMediaSource = "create-media-source",
  DiscontinuityUpdate = "discontinuity-update",
  DisposeMediaSource = "dispose-media-source",
  EncryptionDataEncountered = "encryption-data-encountered",
  EndOfStream = "end-of-stream",
  Error = "error",
  InbandEvent = "inband-event",
  InitError = "init-error",
  InitSuccess = "init-success",
  InterruptEndOfStream = "stop-end-of-stream",
  InterruptMediaSourceDurationUpdate = "stop-media-source-duration",
  LockedStream = "locked-stream",
  LogMessage = "log",
  ManifestReady = "manifest-ready",
  ManifestUpdate = "manifest-update",
  NeedsBufferFlush = "needs-buffer-flush",
  NeedsDecipherabilityFlush = "needs-decipherability-flush",
  PeriodStreamCleared = "period-stream-cleared",
  PeriodStreamReady = "period-stream-ready",
  PushTextData = "push-text-data",
  ReloadingMediaSource = "reloading-media-source",
  RemoveTextData = "remove-text-data",
  RepresentationChanged = "representation-changed",
  ResetTextDisplayer = "reset-text-displayer",
  SourceBufferAppend = "source-buffer-append",
  SourceBufferRemove = "source-buffer-remove",
  StopTextDisplayer = "stop-text-displayer",
  UpdateMediaSourceDuration = "update-media-source-duration",
  UpdatePlaybackRate = "update-playback-rate",
  Warning = "warning",
  SegmentSinkStoreUpdate = "segment-sink-store-update",
}

export type IWorkerMessage =
  | IAbortBufferWorkerMessage
  | IActivePeriodChangedWorkerMessage
  | IAdaptationChangeWorkerMessage
  | IAddSourceBufferWorkerMessage
  | IPushTextDataWorkerMessage
  | IAppendBufferWorkerMessage
  | IAttachMediaSourceWorkerMessage
  | IBitrateEstimateChangeWorkerMessage
  | ICreateMediaSourceWorkerMessage
  | IDiscontinuityUpdateWorkerMessage
  | IDisposeMediaSourceWorkerMessage
  | IEncryptionDataEncounteredWorkerMessage
  | IEndOfStreamWorkerMessage
  | IErrorWorkerMessage
  | IInbandEventWorkerMessage
  | IInitSuccessWorkerMessage
  | IInitErrorWorkerMessage
  | IInterruptMediaSourceDurationWorkerMessage
  | ILockedStreamWorkerMessage
  | ILogMessageWorkerMessage
  | IManifestReadyWorkerMessage
  | IManifestUpdateWorkerMessage
  | INeedsBufferFlushWorkerMessage
  | INeedsDecipherabilityFlushWorkerMessage
  | IPeriodStreamClearedWorkerMessage
  | IPeriodStreamReadyWorkerMessage
  | IReloadingMediaSourceWorkerMessage
  | IRemoveBufferWorkerMessage
  | IRemoveTextDataWorkerMessage
  | IRepresentationChangeWorkerMessage
  | IResetTextDisplayerWorkerMessage
  | IStopEndOfStreamWorkerMessage
  | IStopTextDisplayerWorkerMessage
  | IUpdateMediaSourceDurationWorkerMessage
  | IUpdatePlaybackRateWorkerMessage
  | IWarningWorkerMessage
  | ISegmentSinkStoreUpdateMessage;
