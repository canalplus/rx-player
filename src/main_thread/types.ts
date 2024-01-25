import RxPlayer, {
  IFreezingStatus,
  IRebufferingStatus,
  IObservationPosition,
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

export {
  // Playback Observation Metadata
  IObservationPosition,
  IReadOnlyPlaybackObserver,
  IFreezingStatus,
  IRebufferingStatus,

  // Decrypt Metadata
  IContentProtection,
  IProcessedProtectionData,

  // Text Displayer Metadata
  ITextDisplayer,
  ITextDisplayerData,
};
