import type RxPlayer from "./api";
import type {
  IFreezingStatus,
  IRebufferingStatus,
  ObservationPosition,
  IReadOnlyPlaybackObserver,
} from "./api";
import type {
  IContentProtection,
  IProcessedProtectionData,
} from "./decrypt";
import type {
  ITextDisplayer,
  ITextDisplayerData,
} from "./text_displayer";

export type IRxPlayer = RxPlayer;

export type {
  // Playback Observation Metadata
  IReadOnlyPlaybackObserver,
  ObservationPosition,
  IFreezingStatus,
  IRebufferingStatus,

  // Decrypt Metadata
  IContentProtection,
  IProcessedProtectionData,

  // Text Displayer Metadata
  ITextDisplayer,
  ITextDisplayerData,
};
