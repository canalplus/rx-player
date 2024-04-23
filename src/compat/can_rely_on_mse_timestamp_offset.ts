import { isPlayStation4 } from "./browser_detection";

/**
 * Some devices do not support the `timestampOffset` SourceBuffer attribute
 * properly:
 *
 *   - On the PlayStation 4, at least at date 2024-04-10, mutating the
 *     `timestampOffset` seems to properly append the media data at the right
 *     timestamp when interrogating both the `SourceBuffer`s and the
 *     `HTMLMediaElement`'s `buffered` property, but playback is not able to
 *     start.
 *
 * When this value is false, we may want to use another trick to offset media
 * segments such as updating it their metadata at the container level.
 */
const canRelyOnMseTimestampOffset = !isPlayStation4;
export default canRelyOnMseTimestampOffset;
