import type { ICompatAudioTrack } from "./browser_compatibility_types";
/**
 * Enable the audio track at the given index while disabling all others in the
 * `audioTracks` array.
 *
 * Returns false if the given index is not found in the `audioTracks` array.
 * @param {array.<audioTrack>} audioTracks
 * @param {number} indexToEnable
 * @returns {boolean}
 */
export default function enableAudioTrack(audioTracks: ICompatAudioTrack[], indexToEnable: number): boolean;
//# sourceMappingURL=enable_audio_track.d.ts.map