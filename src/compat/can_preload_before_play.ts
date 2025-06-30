import EnvDetector from "./env_detector";

/**
 * On Safari (both mobile and desktop), when using direct file playback,
 * the `readyState` may remain at `1` (HAVE_METADATA) until `play()` is called,
 * even though the media is effectively ready to play.
 *
 * In such cases, the media cannot be preloaded before `play()`.
 * @param {boolean} isDirectfile - Whether playback is through directfile.
 * @returns {boolean} - True if the media can be preloaded; false otherwise.
 */
export default function canPreloadBeforePlay(isDirectfile: boolean): boolean {
  if (
    isDirectfile &&
    (EnvDetector.browser === EnvDetector.BROWSERS.SafariMobile ||
      EnvDetector.browser === EnvDetector.BROWSERS.SafariDesktop)
  ) {
    return false;
  } else {
    return true;
  }
}
