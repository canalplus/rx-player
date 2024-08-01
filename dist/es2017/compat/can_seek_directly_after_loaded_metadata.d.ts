/**
 * On safari mobile (version 17.1.2) seeking too early cause the video to never buffer
 * media data. Using delaying mechanisms such as `setTimeout(fn, 0)` defers the seek
 * to a moment at which safari should be more able to handle a seek.
 */
declare const canSeekDirectlyAfterLoadedMetadata: boolean;
export default canSeekDirectlyAfterLoadedMetadata;
//# sourceMappingURL=can_seek_directly_after_loaded_metadata.d.ts.map