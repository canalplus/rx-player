import type MediaElementMonitor from "./media_element_monitor.ts";
import ObservationPosition from "./utils/observation_position.ts";

export { SeekingState } from "./types.ts";
export type {
  IFreezingStatus,
  IRebufferingStatus,
  IMediaObservation,
  IReadOnlyMediaElementMonitor,
} from "./types.ts";
export type IMediaElementMonitor = MediaElementMonitor;
export { ObservationPosition };
