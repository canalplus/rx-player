import type MediaElementPlaybackObserver from "./media_element_playback_observer";
import ObservationPosition from "./utils/observation_position";

export { SeekingState } from "./types";
export type {
  IFreezingStatus,
  IRebufferingStatus,
  IPlaybackObservation,
  IReadOnlyPlaybackObserver,
} from "./types";
export type IMediaElementPlaybackObserver = MediaElementPlaybackObserver;
export { ObservationPosition };

// NOTE: Reserved for tests
export * as __PLAYBACK_OBSERVER_MOCKS from "./__tests__/mocks";
