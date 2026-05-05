import config from "../config.ts";
import EnvDetector from "./env_detector.ts";

/**
 * Determines whether the player should perform an explicit initial seek to 0.
 *
 * In most cases, a media element starts at position 0 and no initial seek is
 * needed. The exception is Safari when playing HLS streams: the native player
 * may start at the live position instead of 0, so performing an explicit seek
 * ensures the player starts from the intended initial position.
 *
 * @returns {boolean} `true` if an explicit initial seek to 0 should be performed.
 */
export default function shouldPerformInitialSeekToZero(): boolean {
  const { FORCE_INITIAL_SEEK_TO_ZERO } = config.getCurrent();
  if (FORCE_INITIAL_SEEK_TO_ZERO) {
    return FORCE_INITIAL_SEEK_TO_ZERO;
  }
  return (
    EnvDetector.browser === EnvDetector.BROWSERS.SafariDesktop ||
    EnvDetector.browser === EnvDetector.BROWSERS.SafariMobile
  );
}
