import { isSafariDesktop, isSafariMobile } from "./browser_detection";

/**
 * On Safari (both mobile and desktop), when using direct file playback,
 * the `readyState` may remain at `1` (HAVE_METADATA) until `play()` is called,
 * even though the media is effectively ready to play.
 *
 * In these cases, we treat the stalled statuses "not-ready" and "internal-seek"
 * as non-stalled: the player is not truly blocked — it just needs to call `play()`.
 * @param {boolean} isDirectfile - Whether playback is through directfile.
 * @returns {boolean} - Whether to treat not-ready as loaded.
 */
export default function treatNotReadyAsLoaded(isDirectfile: boolean): boolean {
  return isDirectfile && (isSafariMobile || isSafariDesktop);
}
