import type {
  IResolutionInfo,
  IManifestFetcherSettings,
  ISegmentQueueCreatorBackoffOptions,
  IPausedMediaObservation,
  IRepresentationsChoice,
  ITrackSwitchingMode,
} from "../core/types.ts";
import type { IDefaultConfig } from "../default_config.ts";
import type { ISerializedSourceBufferError } from "../errors/source_buffer_error.ts";
import type {
  IFreezingStatus,
  IRebufferingStatus,
} from "../media_element_monitor/index.ts";
import type { SourceBufferType } from "../mse/index.ts";
import type {
  ICmcdOptions,
  IManifestLoader,
  IRepresentationFilter,
  ISegmentLoader,
  ITrackType,
} from "../public_types.ts";
import type { ITransportOptions } from "../transports/index.ts";
import type { ILogFormat, ILoggerLevel } from "../utils/logger.ts";
import type { IRange } from "../utils/ranges.ts";
import type RxPlayer from "./api/index.ts";
import type { IContentProtection, IProcessedProtectionData } from "./decrypt/index.ts";
import type { ITextDisplayer, ITextDisplayerData } from "./text_displayer/index.ts";

export type IRxPlayer = RxPlayer;

export type {
  // Decrypt Metadata
  IContentProtection,
  IProcessedProtectionData,
  // Text Displayer Metadata
  ITextDisplayer,
  ITextDisplayerData,
};

/**
 * First message sent by the main thread to the Core.
 * The Core should only receive one `IInitMessage` at most and it should be
 * always the first message received.
 *
 * Allows for Core initialization.
 */
export interface IInitMessage {
  type: MainThreadMessageType.Init;
  value: {
    /** Link to the DASH_WASM's feature WebAssembly file to parse DASH MPDs. */
    dashWasmUrl: string | undefined;
    /** Initial logging level that should be set. */
    logLevel: ILoggerLevel;
    /** Intitial logger's log format that should be set. */
    logFormat: ILogFormat;
    /**
     * If `true`, logs should be sent back to the main thread, through a
     * `ILogMessageCoreMessage` message.
     */
    sendBackLogs: boolean;
    /**
     * Value of `Date.now()` at the time the `timestamp` property was generated.
     *
     * This is mostly useful for timestamp synchronization: by calling both
     * `performance.now` (the same call on the main thread made to calculate
     * `timestamp` - but which is not synchronized initially to the Core's)
     * and `Date.now()` both on the main thread and on the Core,
     * calculating the difference between the two and comparing both the main
     * thread's difference and the Core's difference, you're able to
     * produce a relatively-synchronized timestamp between the two if they run
     * in different environment, e.g. a WebWorker.
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
   * If `true`, the RxPlayer can enable its "Representation avoidance"
   * mechanism, where it avoid loading Representation that it suspect
   * have issues being decoded on the current device.
   */
  enableRepresentationAvoidance: boolean;
  /**
   * URL at which the content's Manifest is accessible.
   * `undefined` if unknown.
   */
  url?: string | undefined;
  /** The resolved playback support for this content. */
  playbackSupport: {
    /**
     * If `true`, MSE API should be used in the core part of the RxPlayer when
     * relying on a WebWorker.
     * If `false`, they should be relied on on main thread.
     *
     * This might depend on both browser capabilities and preferences. It is
     * assumed that the caller perform all those checks, the core won't check
     * again the validity of this value.
     */
    mseInWorker: boolean;
    /**
     * If `true`, the right environment **and** features are present to be able
     * to support text tracks.
     */
    textTrack: boolean;
    /**
     * If `true`, the right environment **and** features are present to be able
     * to support video tracks.
     * This includes a video element tag.
     */
    videoTrack: boolean;
  };
  /**
   * The type of "transport" wanted, e.g. "dash" or "smooth".
   */
  transport: string;
  /** Options relative to the streaming protocol. */
  transportOptions: Omit<
    ITransportOptions,
    "representationFilter" | "manifestLoader" | "segmentLoader"
  > & {
    manifestLoader:
      | {
          fn?: IManifestLoader | undefined;
          workerId?: string | undefined;
        }
      | undefined;
    segmentLoader:
      | {
          fn?: ISegmentLoader | undefined;
          workerId?: string | undefined;
        }
      | undefined;
    representationFilter:
      | undefined
      | {
          fn?: IRepresentationFilter | undefined;
          eval?: string | undefined;
          workerId?: string | undefined;
        };
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
  segmentRetryOptions: ISegmentQueueCreatorBackoffOptions;
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
     * `ILogMessageCoreMessage` message.
     */
    sendBackLogs: boolean;
  };
}

/** Message sent by the main thread to update the Worker's global config. */
export interface IConfigUpdateMessage {
  type: MainThreadMessageType.ConfigUpdate;
  value: Partial<IDefaultConfig>;
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
  /** The current media observation. */
  initialObservation: ISerializedMediaObservation;
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
 * codecs and has reasons to think that the Core is not aware of it
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
 * Message sent by the main thread to the Core regularly after an
 * `IPrepareContentMessage` to provide various media-related metadata
 * only obtainable on the main thread.
 *
 * Those messages are sent until the `IStopContentMessage` for that same
 * `contentId`.
 */
export interface IMediaObservationMessage {
  type: MainThreadMessageType.MediaObservation;
  /**
   * Same `contentId` than for the corresponding `IPrepareContentMessage` message.
   * Allows to prevent race conditions.
   */
  contentId: string;
  /** The media-related metadata that has just been observed now. */
  value: ISerializedMediaObservation;
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
export interface ISerializedMediaObservation {
  /**
   * Information on whether the media element was paused at the time of the
   * Observation.
   */
  paused: IPausedMediaObservation;
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
  /**
   * Indicates whether the user agent believes it has enough buffered data to ensure
   * uninterrupted playback for a meaningful period or needs more data.
   * It also reflects whether the user agent can retrieve and buffer data in an
   * energy-efficient manner while maintaining the desired memory usage.
   * `true` indicates that the buffer is low, and more data should be buffered.
   * `false` indicates that there is enough buffered data, and no additional data needs
   *  to be buffered at this time.
   */
  canStream: boolean;
  /** If `true` the content is loaded until its maximum position. */
  fullyLoaded: boolean;
}

/**
 * Sent when the main thread had to "reload" the media source.
 * The worker should understand that this MediaSource won't be used anymore.
 */
export interface ITriggerMediaSourceReloadMainMessage {
  type: MainThreadMessageType.MediaSourceReload;
  /** Identify the MediaSource concerned by this message. */
  mediaSourceId: string;
  /** No message is necessary. */
  value: null;
}

/**
 * Sent when the SourceBuffer linked to the given `mediaSourceId` and
 * `SourceBufferType`, running on the main thread, succeeded to perform the last
 * operation given to it (either through an `AppendBufferCoreMessage` or a
 * `RemoveBufferCoreMessage`).
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
   * `CreateSourceBufferCoreMessage`.
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

/** Message sent from main thread when it wants to fetch thumbnail data. */
export interface IThumbnailDataRequestMainMessage {
  type: MainThreadMessageType.ThumbnailDataRequest;
  contentId: string;
  value: {
    requestId: number;
    periodId: string;
    thumbnailTrackId: string;
    time: number;
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
  value: { requestId: number };
}

/** Message sent by the application to the worker. */
export interface IAppDefinedMessage {
  type: MainThreadMessageType.AppDefined;
  value: {
    /** "name" for this event, application-defined. */
    name: string;
    /** application-defined payload for this event. */
    payload: unknown;
  };
}

export const enum MainThreadMessageType {
  Init = "init",
  PushTextDataSuccess = "add-text-success",
  RemoveTextDataSuccess = "remove-text-success",
  PushTextDataError = "push-text-error",
  RemoveTextDataError = "remove-text-error",
  CodecSupportUpdate = "codec-support-update",
  ContentUrlsUpdate = "urls-update",
  ConfigUpdate = "config-update",
  DecipherabilityStatusUpdate = "decipherability-update",
  LogLevelUpdate = "log-level-update",
  MediaSourceReadyStateChange = "media-source-ready-state-change",
  MediaObservation = "observation",
  PrepareContent = "prepare",
  ReferenceUpdate = "ref-update",
  RepresentationUpdate = "rep-update",
  MediaSourceReload = "ms-reload",
  SourceBufferError = "sb-error",
  SourceBufferSuccess = "sb-success",
  StartPreparedContent = "start",
  StopContent = "stop",
  TrackUpdate = "track-update",
  PullSegmentSinkStoreInfos = "pull-segment-sink-store-infos",
  ThumbnailDataRequest = "thumbnail-request",
  AppDefined = "app-defined",
}

export type IMainThreadMessage =
  | IInitMessage
  | ILogLevelUpdateMessage
  | IConfigUpdateMessage
  | IPrepareContentMessage
  | IStopContentMessage
  | IStartPreparedContentMessage
  | IReferenceUpdateMessage
  | ICodecSupportUpdateMessage
  | IMediaObservationMessage
  | IDecipherabilityStatusChangedMessage
  | IUpdateContentUrlsMessage
  | ITriggerMediaSourceReloadMainMessage
  | ISourceBufferErrorMainMessage
  | ISourceBufferOperationSuccessMainMessage
  | ITrackUpdateMessage
  | IRepresentationUpdateMessage
  | IPushTextDataSuccessMessage
  | IRemoveTextDataSuccessMessage
  | IPushTextDataErrorMessage
  | IRemoveTextDataErrorMessage
  | IMediaSourceReadyStateChangeMainMessage
  | IPullSegmentSinkStoreInfos
  | IThumbnailDataRequestMainMessage
  | IAppDefinedMessage;
