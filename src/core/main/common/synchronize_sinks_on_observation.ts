import type { ICorePlaybackObservation } from "../../../main_thread/init/utils/create_core_playback_observer";
import type SegmentSinksStore from "../../segment_sinks";

/**
 * Synchronize SegmentSinks with what has been buffered.
 * @param {Object} observation - The just-received playback observation,
 * including what has been buffered on lower-level buffers
 * @param {Object} segmentSinksStore - Interface allowing to interact
 * with `SegmentSink`s, so their inventory can be updated accordingly.
 */
export default function synchronizeSegmentSinksOnObservation(
  observation: ICorePlaybackObservation,
  segmentSinksStore: SegmentSinksStore,
): void {
  // Synchronize SegmentSinks with what has been buffered.
  ["video" as const, "audio" as const, "text" as const].forEach((tType) => {
    const segmentSinkStatus = segmentSinksStore.getStatus(tType);
    if (segmentSinkStatus.type === "initialized") {
      segmentSinkStatus.value.synchronizeInventory(observation.buffered[tType] ?? []);
    }
  });
}
