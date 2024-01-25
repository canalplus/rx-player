import type {
  IAdaptiveRepresentationSelectorArguments,
  IABRThrottlers,
  IResolutionInfo,
} from "./adaptive";
import type { ICorePlaybackObservation } from "./core_portal";
import type {
  IManifestFetcherSettings,
  ISegmentFetcherCreatorBackoffOptions,
} from "./fetchers";
import SegmentBuffersStore, {
  IBufferedChunk,
  IBufferType,
} from "./segment_sinks";
import type {
  IAdaptationChoice,
  IPausedPlaybackObservation,
  IInbandEvent,
  IRepresentationsChoice,
  IStreamOrchestratorPlaybackObservation,
  ITrackSwitchingMode,
} from "./stream";

// NOTE: Only types should be exported by this file: Importing it should
// not increase a JavaScript bundle's size

/** Type of an `SegmentBuffersStore` class. */
export type ISegmentBuffersStore = SegmentBuffersStore;

export type {
  // Adaptive Metadata
  IAdaptiveRepresentationSelectorArguments,
  IABRThrottlers,
  IResolutionInfo,

  // Core-portal
  ICorePlaybackObservation,

  // Fetchers Metadata
  IManifestFetcherSettings,
  ISegmentFetcherCreatorBackoffOptions,

  // Buffer Sinks Metadata
  IBufferType,
  IBufferedChunk,

  // Stream Metadata
  IAdaptationChoice,
  IInbandEvent,
  IPausedPlaybackObservation,
  IStreamOrchestratorPlaybackObservation,
  IRepresentationsChoice,
  ITrackSwitchingMode,
};
