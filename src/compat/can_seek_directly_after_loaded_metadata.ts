import config from "../config";
import { isSafariMobile } from "./browser_detection";

/**
 * On safari mobile (version 17.1.2) seeking too early cause the video to never buffer
 * media data. Using delaying mechanisms such as `setTimeout(fn, 0)` defers the seek
 * to a moment at which safari should be more able to handle a seek.
 * @returns {boolean}
 */
export default function canSeekDirectlyAfterLoadedMetadata(): boolean {
  const { FORCE_CANNOT_SEEK_DIRECTLY_AFTER_LOADED_METADATA } = config.getCurrent();
  return !(FORCE_CANNOT_SEEK_DIRECTLY_AFTER_LOADED_METADATA || isSafariMobile);
}
