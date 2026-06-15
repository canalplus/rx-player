import EnvDetector from "./env_detector";

/**
 * Returns `true` on devices where a media element may keep advancing despite
 * its `playbackRate` being set to `0`.
 * @returns {boolean}
 */
export default function mayHaveIneffectiveZeroPlaybackRate(): boolean {
  return EnvDetector.device === EnvDetector.DEVICES.Tizen;
}
