import { isSafariDesktop, isSafariMobile } from "./browser_detection";

/**
 * On safari mobile (version 17.1.2) and desktop (version 18.4) seeking too early cause
 * the video to never buffer media data. Particularly if the user agent has blocked autoplay.
 * Using delaying mechanisms such as seeking after the "canplay" event defers the seek
 * to a moment at which safari should be more able to handle a seek.
 */
const canSeekDirectlyAfterLoadedMetadata = !isSafariMobile && !isSafariDesktop;
export default canSeekDirectlyAfterLoadedMetadata;
