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

// NOTE: Only types (or at worse: const enums) should be exported by this file:
// Importing it should not increase a JavaScript bundle's size

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

  // CoreMain
  IMessageReceiverCallback,
};

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

export interface INeedsBufferFlushCoreMessage {
  type: CoreMessageType.NeedsBufferFlush;
  contentId: string;
  value:
    | { relativeResumingPosition: number; relativePosHasBeenDefaulted: boolean }
    | undefined;
}

export interface IActivePeriodChangedCoreMessage {
  type: CoreMessageType.ActivePeriodChanged;
  contentId: string;
  value: {
    periodId: string;
  };
}

export interface IWarningCoreMessage {
  type: CoreMessageType.Warning;
  contentId: string | undefined;
  value: ISentError;
}

export interface IAttachMediaSourceCoreMessage {
  type: CoreMessageType.AttachMediaSource;
  contentId: string | undefined;
  mediaSourceId: string;
  value: IAttachMediaSourceCoreMessagePayload;
}

export type IAttachMediaSourceCoreMessagePayload =
  | {
      type: "handle";
      value: MediaProvider;
    }
  | {
      type: "url";
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

export interface IErrorCoreMessage {
  type: CoreMessageType.Error;
  contentId: string | undefined;
  value: ISentError;
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

export interface INeedsDecipherabilityFlushCoreMessage {
  type: CoreMessageType.NeedsDecipherabilityFlush;
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
  | IThumbnailDataResponseCoreMessage;
