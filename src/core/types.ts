// NOTE: Only types and const enums should be exported by this file

import type {
  ISerializedMediaError,
  ISerializedNetworkError,
  ISerializedEncryptedMediaError,
  ISerializedOtherError,
} from "../errors";
import type { IContentProtection, ITextDisplayerData } from "../main_thread/types";
import type { IManifestMetadata, IPeriodsUpdateResult } from "../manifest";
import type {
  ISourceBufferInterfaceAppendBufferParameters,
  SourceBufferType,
} from "../mse";
import type { ITrackType } from "../public_types";
import type { IThumbnailResponse } from "../transports";
import type { ILoggerLevel, ILogNamespace } from "../utils/logger";
import type {
  IAdaptiveRepresentationSelectorArguments,
  IABRThrottlers,
  IResolutionInfo,
} from "./adaptive";
import type { IMessageReceiverCallback } from "./entry";
import type {
  IManifestFetcherSettings,
  ISegmentQueueCreatorBackoffOptions,
} from "./fetchers";
import type {
  IBufferedChunk,
  IBufferType,
  ITextDisplayerInterface,
} from "./segment_sinks";
import type SegmentSinksStore from "./segment_sinks";
import type { ISegmentSinkMetrics } from "./segment_sinks/segment_sinks_store";
import type {
  IAdaptationChoice,
  IPausedPlaybackObservation,
  IInbandEvent,
  IRepresentationsChoice,
  IStreamOrchestratorPlaybackObservation,
  ITrackSwitchingMode,
} from "./stream";

/** Type of an `SegmentSinksStore` class. */
export type ISegmentSinksStore = SegmentSinksStore;

export type {
  // Adaptive Metadata
  IAdaptiveRepresentationSelectorArguments,
  IABRThrottlers,
  IResolutionInfo,

  // Fetchers Metadata
  IManifestFetcherSettings,
  ISegmentQueueCreatorBackoffOptions,

  // Media Sinks Metadata
  IBufferType,
  IBufferedChunk,
  ITextDisplayerInterface,

  // Stream Metadata
  IAdaptationChoice,
  IInbandEvent,
  IPausedPlaybackObservation,
  IStreamOrchestratorPlaybackObservation,
  IRepresentationsChoice,
  ITrackSwitchingMode,

  // CoreEntry
  IMessageReceiverCallback,
};

/**
 * Format of an RxPlayer error that has been serialized to be able to be
 * easily cloned and be communicated through the `postMessage` API if
 * needed.
 */
export type ISentError =
  | ISerializedNetworkError
  | ISerializedMediaError
  | ISerializedEncryptedMediaError
  | ISerializedOtherError;

/**
 * Message sent by the Core when its initialization finished succesfully.
 *
 * Once that message has been received, you can ensure that no
 * `IInitErrorCoreMessage` will ever be received for that same core instance.
 *
 * Note that receiving this message is not a requirement before preparing and
 * loading a content, both initialization and content loading can be started in
 * parallel.
 */
export interface IInitSuccessCoreMessage {
  type: CoreMessageType.InitSuccess;
  value: null;
}

/**
 * Message sent by the Core when its initialization finished with an error.
 *
 * Once that message has been received, you can ensure that no
 * `IInitErrorCoreMessage` will ever be received for the same core instance.
 *
 * Note that you may received this message while preparing and/or loading a
 * content, both initialization and content loading can be started in
 * parallel.
 * As such, this message may be coupled with a content error.
 */
export interface IInitErrorCoreMessage {
  type: CoreMessageType.InitError;
  value: {
    /** A string describing the error encountered. */
    errorMessage: string;

    kind: "dashWasmInitialization";
  };
}

/**
 * Message sent by the Core when it want the low-level buffers to be "flushed".
 *
 * A "flush" is an operation which tries to "refresh" the content of low-level
 * media buffers, either to ensure an update to it has been taken into account
 * or to fix a problematic situation.
 *
 * NOTE: This message should not be sent if you want to flush the buffer due to
 * a new decipherability context (e.g. pushed data just became un-decipherable).
 * For that special situation, a specific message,
 * `INeedsDecipherabilityFlushCoreMessage` should be relied on instead.
 *
 * This is most often done via a very small seek.
 */
export interface INeedsBufferFlushCoreMessage {
  /** Identify an `INeedsBufferFlushCoreMessage`. */
  type: CoreMessageType.NeedsBufferFlush;
  /** The `contentId` linked to the content that has asked for this flush. */
  contentId: string;
  value:
    | {
        /**
         * The position, relative to the current one in seconds, we should
         * restart playback from after the flush.
         * If set to `0`, we should keep the exact same position. If set to `1`,
         * we should restart playback one second later etc.
         */
        relativeResumingPosition: number;
        /**
         * If `true`, `relativeResumingPosition` is just a default value
         * proposed as an hint by default by the RxPlayer and can be ignored if
         * not practical in the current context.
         *
         * If `false`, the `relativeResumingPosition` has been explicitly set
         * and should thus be respected.
         */
        relativePosHasBeenDefaulted: boolean;
      }
    | undefined;
}

/**
 * Message sent by the Core when an Error that did not interrupt playback just
 * arised.
 *
 * This can for example be minor request errors.
 */
export interface IWarningCoreMessage {
  /** Identify an `IWarningCoreMessage`. */
  type: CoreMessageType.Warning;
  /** Identifier of the content linked to that warning. */
  contentId: string | undefined;
  /** Serialized format for that error. */
  value: ISentError;
}

/**
 * Message sent by the Core when an Error that interrupted playback of the
 * current content just happened.
 *
 * It should be assumed that the content is not playing anymore once this
 * message has been sent.
 */
export interface IErrorCoreMessage {
  /** Identify an `IErrorCoreMessage`. */
  type: CoreMessageType.Error;
  /** Identifier of the content linked to that error. */
  contentId: string | undefined;
  /** Serialized format for that error. */
  value: ISentError;
}

/**
 * Message sent by the Core when it created the `MediaSource` itself and ask it
 * to be attached by the main thread to the media element.
 *
 * This is one of the two ways a `MediaSource` can be created by the RxPlayer,
 * the other one being through an `ICreateMediaSourceCoreMessage` (in which case
 * the `MediaSource` would be created by `Main Thread`, not `Core`). Choosing
 * one or the other depends on browser capabilities and settings.
 *
 * When an `IAttachMediaSourceCoreMessage` is sent, it is understood by the main
 * thread that the role of managing the `MediaSource` itself is handled by the
 * `Core` for the current content, and as such `Core` won't send any
 * `IAddSourceBufferCoreMessage`, `IAppendBufferCoreMessage`,
 * `IRemoveBufferCoreMessage`, `IAbortBufferCoreMessage`,
 * `IUpdateMediaSourceDurationCoreMessage` and other such events that imply a
 * side effect on `MediaSource`-linked API. All those actions should instead be
 * taken by `Core` directly in this scenario.
 */
export interface IAttachMediaSourceCoreMessage {
  /** Identify an `IAttachMediaSourceCoreMessage`. */
  type: CoreMessageType.AttachMediaSource;
  /** The `contentId` linked to the current content. */
  contentId: string | undefined;
  /**
   * A unique identifier linked to that `MediaSource`.
   * Will be used to be able to ensure the right `MediaSource` is referred to
   * in future messages.
   */
  mediaSourceId: string;
  /** Information on the `MediaSource` to attach to the media element. */
  value: IAttachMediaSourceCoreMessagePayload;
}

/** Payload sent alongside an `IAttachMediaSourceCoreMessage` */
export type IAttachMediaSourceCoreMessagePayload =
  | {
      /**
       * Identifies a `MediaSource` of the type "handle", in which case the
       * `MediaSource` can be linked to the media element as an object directly.
       */
      type: "handle";
      /** The corresponding object that should be linked to the media element. */
      value: MediaProvider;
    }
  | {
      /**
       * Identifies a `MediaSource` of the type "url", in which case the `value`
       * will communicate an "object url" that has to be linked to the media
       * element.
       */
      type: "url";
      /** The object URL that refers to the created `MediaSource`. */
      value: string;
    };

export interface ICreateMediaSourceCoreMessage {
  type: CoreMessageType.CreateMediaSource;
  mediaSourceId: string;
  contentId: string;
}

export interface IAddSourceBufferCoreMessage {
  type: CoreMessageType.AddSourceBuffer;
  mediaSourceId: string;
  value: {
    sourceBufferType: SourceBufferType;
    codec: string;
  };
}

export interface IAppendBufferCoreMessage {
  type: CoreMessageType.SourceBufferAppend;
  mediaSourceId: string;
  sourceBufferType: SourceBufferType;
  operationId: string;
  value: {
    data: BufferSource;
    params: ISourceBufferInterfaceAppendBufferParameters;
  };
}

export interface IRemoveBufferCoreMessage {
  type: CoreMessageType.SourceBufferRemove;
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

export interface IAbortBufferCoreMessage {
  type: CoreMessageType.AbortSourceBuffer;
  mediaSourceId: string;
  sourceBufferType: SourceBufferType;
  value: null;
}

export interface IUpdateMediaSourceDurationCoreMessage {
  type: CoreMessageType.UpdateMediaSourceDuration;
  mediaSourceId: string;
  value: {
    duration: number;
    isRealEndKnown: boolean;
  };
}

export interface IInterruptMediaSourceDurationCoreMessage {
  type: CoreMessageType.InterruptMediaSourceDurationUpdate;
  mediaSourceId: string;
  value: null;
}

export interface IEndOfStreamCoreMessage {
  type: CoreMessageType.EndOfStream;
  mediaSourceId: string;
  value: null;
}

export interface IStopEndOfStreamCoreMessage {
  type: CoreMessageType.InterruptEndOfStream;
  mediaSourceId: string;
  value: null;
}

export interface IDisposeMediaSourceCoreMessage {
  type: CoreMessageType.DisposeMediaSource;
  mediaSourceId: string;
  value: null;
}

export interface IActivePeriodChangedCoreMessage {
  type: CoreMessageType.ActivePeriodChanged;
  contentId: string;
  value: {
    periodId: string;
  };
}

export interface IAdaptationChangeCoreMessage {
  type: CoreMessageType.AdaptationChanged;
  contentId: string;
  value: {
    adaptationId: string | null;
    periodId: string;
    type: ITrackType;
  };
}

export interface IRepresentationChangeCoreMessage {
  type: CoreMessageType.RepresentationChanged;
  contentId: string;
  value: {
    adaptationId: string;
    representationId: string | null;
    periodId: string;
    type: ITrackType;
  };
}

/** Message sent by the Core when the Manifest is first loaded. */
export interface IManifestReadyCoreMessage {
  /** Identify this particular message. */
  type: CoreMessageType.ManifestReady;
  /** The `contentId` linked to this Manifest. */
  contentId: string;
  value: {
    /**
     * The actual `Manifest` loaded.
     *
     * When possible, this should be a `Manifest` instance.
     *
     * Only if this is not possible (e.g. because the `Manifest` cannot be
     * communicated as is between both core and main_thread) might you convert
     * it to another object also respecting the `IManifestMetadata` interface.
     *
     * However doing this might lead to some loss of performance and minor
     * features.
     */
    manifest: IManifestMetadata;
  };
}

/** Message sent by the Core everytime the Manifest is updated. */
export interface IManifestUpdateCoreMessage {
  /** Identify this particular message. */
  type: CoreMessageType.ManifestUpdate;
  /** The `contentId` linked to this Manifest. */
  contentId: string | undefined;
  value: {
    /**
     * The new manifest once updated.
     *
     * When possible, this should be a `Manifest` instance to improve
     * performance and allow some advanced features.
     *
     * Only if this is not possible (e.g. because the `Manifest` cannot be
     * communicated as is between both core and main_thread) might you convert
     * it to another object also respecting the `IManifestMetadata` interface.
     * In that last case, you're also authorized to reset the `periods` property
     * of that `IManifestMetadata` to an empty array to save up message-passing
     * performance.
     */
    manifest: IManifestMetadata;
    /**
     * Object describing what has changed in this update.
     */
    updates: IPeriodsUpdateResult;
  };
}

export interface IEncryptionDataEncounteredCoreMessage {
  type: CoreMessageType.EncryptionDataEncountered;
  contentId: string | undefined;
  value: IContentProtection;
}

export interface IUpdatePlaybackRateCoreMessage {
  type: CoreMessageType.UpdatePlaybackRate;
  contentId: string | undefined;
  value: number;
}

export interface IReloadingMediaSourceCoreMessage {
  type: CoreMessageType.ReloadingMediaSource;
  /** Identify the MediaSource concerned by this message. */
  mediaSourceId: string;
  value: {
    timeOffset: number;
    minimumPosition?: number | undefined;
    maximumPosition?: number | undefined;
  };
}

/**
 * Message sent by the Core when it want the low-level buffers to be "flushed"
 * with the important caveat that this is linked to a change in decipherability
 * matters (e.g. content just became un-decipherable).
 *
 * A "flush" is an operation which tries to "refresh" the content of low-level
 * media buffers, either to ensure an update to it has been taken into account
 * or to fix a problematic situation.
 *
 * Flush asked in this scenario may lead to aggressive strategies such as
 * switching the `MediaSource` - as the less disruptive scenarios (seeking,
 * play/pause etc.) are often not enough when decipherability is involved.
 *
 * In any case, the `Core` shouldn't care what strategy is chosen to flush. The
 * usual main thread's messages will be enough to handle any scenario without any
 * special effort from Core.
 */
export interface INeedsDecipherabilityFlushCoreMessage {
  /** Identify an `INeedsDecipherabilityFlushCoreMessage`. */
  type: CoreMessageType.NeedsDecipherabilityFlush;
  /** The `contentId` linked to the content that has asked for this flush. */
  contentId: string;
  value: null;
}

export interface ILockedStreamCoreMessage {
  type: CoreMessageType.LockedStream;
  contentId: string;
  value: {
    /** Period concerned. */
    periodId: string;
    /** Buffer type concerned. */
    bufferType: ITrackType;
  };
}

export interface IBitrateEstimateChangeCoreMessage {
  type: CoreMessageType.BitrateEstimateChange;
  contentId: string;
  value: {
    bitrate: number | undefined;
    bufferType: ITrackType;
  };
}

export interface IInbandEventCoreMessage {
  type: CoreMessageType.InbandEvent;
  contentId: string;
  value: IInbandEvent[];
}

export interface IPeriodStreamReadyCoreMessage {
  type: CoreMessageType.PeriodStreamReady;
  contentId: string;
  value: {
    /** Period concerned. */
    periodId: string;
    /** Buffer type concerned. */
    bufferType: ITrackType;
  };
}

export interface IPeriodStreamClearedCoreMessage {
  type: CoreMessageType.PeriodStreamCleared;
  contentId: string;
  value: {
    /** `id` of the Period concerned. */
    periodId: string;
    /** Buffer type concerned. */
    bufferType: ITrackType;
  };
}

export interface IPushTextDataCoreMessage {
  type: CoreMessageType.PushTextData;
  contentId: string;
  value: ITextDisplayerData;
}

export interface IRemoveTextDataCoreMessage {
  type: CoreMessageType.RemoveTextData;
  contentId: string;
  value: {
    start: number;
    end: number;
  };
}

export interface IStopTextDisplayerCoreMessage {
  type: CoreMessageType.StopTextDisplayer;
  contentId: string;
  value: null;
}

export interface IResetTextDisplayerCoreMessage {
  type: CoreMessageType.ResetTextDisplayer;
  contentId: string;
  value: null;
}

type ISentLogValueBase = boolean | string | number | null | undefined;

export type ISentLogValue =
  | ISentLogValueBase
  | ISentError
  | Partial<Record<string, ISentLogValueBase>>;

export interface ILogMessageCoreMessage {
  type: CoreMessageType.LogMessage;
  value: {
    namespace: ILogNamespace;
    logLevel: ILoggerLevel;
    logs: ISentLogValue[];
  };
}

export interface IDiscontinuityUpdateCoreMessage {
  type: CoreMessageType.DiscontinuityUpdate;
  contentId: string;
  value: IDiscontinuityUpdateCoreMessagePayload;
}

export interface IDiscontinuityUpdateCoreMessagePayload {
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
  type: CoreMessageType.SegmentSinkStoreUpdate;
  contentId: string;
  value: {
    segmentSinkMetrics: ISegmentSinkMetrics;
    requestId: number;
  };
}

export interface IThumbnailDataResponseCoreMessage {
  type: CoreMessageType.ThumbnailDataResponse;
  contentId: string;
  value:
    | {
        status: "error";
        requestId: number;
        error: ISentError;
      }
    | {
        status: "success";
        requestId: number;
        data: IThumbnailResponse;
      };
}

/** Message sent by the application's Worker to the application in main thread. */
export interface IAppDefinedCoreMessage {
  type: CoreMessageType.AppDefined;
  value: {
    /** "name" for this event, application-defined. */
    name: string;
    /** application-defined payload for this event. */
    payload: unknown;
  };
}

export const enum CoreMessageType {
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
  ThumbnailDataResponse = "thumbnail-response",
  AppDefined = "app-defined",
}

export type ICoreMessage =
  | IAbortBufferCoreMessage
  | IActivePeriodChangedCoreMessage
  | IAdaptationChangeCoreMessage
  | IAddSourceBufferCoreMessage
  | IPushTextDataCoreMessage
  | IAppendBufferCoreMessage
  | IAttachMediaSourceCoreMessage
  | IBitrateEstimateChangeCoreMessage
  | ICreateMediaSourceCoreMessage
  | IDiscontinuityUpdateCoreMessage
  | IDisposeMediaSourceCoreMessage
  | IEncryptionDataEncounteredCoreMessage
  | IEndOfStreamCoreMessage
  | IErrorCoreMessage
  | IInbandEventCoreMessage
  | IInitSuccessCoreMessage
  | IInitErrorCoreMessage
  | IInterruptMediaSourceDurationCoreMessage
  | ILockedStreamCoreMessage
  | ILogMessageCoreMessage
  | IManifestReadyCoreMessage
  | IManifestUpdateCoreMessage
  | INeedsBufferFlushCoreMessage
  | INeedsDecipherabilityFlushCoreMessage
  | IPeriodStreamClearedCoreMessage
  | IPeriodStreamReadyCoreMessage
  | IReloadingMediaSourceCoreMessage
  | IRemoveBufferCoreMessage
  | IRemoveTextDataCoreMessage
  | IRepresentationChangeCoreMessage
  | IResetTextDisplayerCoreMessage
  | IStopEndOfStreamCoreMessage
  | IStopTextDisplayerCoreMessage
  | IUpdateMediaSourceDurationCoreMessage
  | IUpdatePlaybackRateCoreMessage
  | IWarningCoreMessage
  | ISegmentSinkStoreUpdateMessage
  | IThumbnailDataResponseCoreMessage
  | IAppDefinedCoreMessage;
