import config from "../config";
import EnvDetector from "./env_detector";

/**
 * On safari mobile (version 17.1.2) and desktop (version 18.4) seeking too early cause
 * the video to never buffer media data. Particularly if the user agent has blocked autoplay.
 * Using delaying mechanisms such as seeking after the "canplay" event defers the seek
 * to a moment at which safari should be more able to handle a seek.
 * @returns {boolean}
 */
export default function shouldWaitCanPlayEventForSeeking(): boolean {
  const { FORCE_WAIT_CAN_PLAY_FOR_SEEKING } = config.getCurrent();
  return (
    FORCE_WAIT_CAN_PLAY_FOR_SEEKING ||
    EnvDetector.browser === EnvDetector.BROWSERS.SafariMobile ||
    EnvDetector.browser === EnvDetector.BROWSERS.SafariDesktop
  );
}
