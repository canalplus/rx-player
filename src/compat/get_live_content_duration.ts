import { isPlayStation5 } from "./browser_detection";

/** Number of seconds in a regular year. */
const YEAR_IN_SECONDS = 365 * 24 * 3600;

/**
 * Get the duration to set on the MediaSource for a live content whose maximum
 * position in seconds is the value given in argument.
 *
 * This needs to be its own compat utilitary function because different
 * platforms have issues with different values.
 *
 * @param {number} currentContentMaximumPosition - The current maximum position
 * reachable in the content, in seconds.
 * @returns {number} - The actual `duration` to set on the `MediaSource`
 * instance on which the content plays.
 */
export default function getLiveContentDuration(
  currentContentMaximumPosition : number
) : number {
  // The PlayStation 5 has troubles with high numbers but not with the
  // `Infinity` value, which is the advised value by the HTML5 living standard
  // as of now (2023-03-02)
  if (isPlayStation5) {
    return Infinity;
  }

  // Some targets poorly support setting a very high number for durations.
  // Yet, in dynamic contents, we would prefer setting a value as high as possible
  // to still be able to seek anywhere we want to (even ahead of the Manifest if
  // we want to). As such, we put it at a safe default value of 2^32 excepted
  // when the maximum position is already relatively close to that value, where
  // we authorize exceptionally going over it.
  return Math.max(Math.pow(2, 32), currentContentMaximumPosition + YEAR_IN_SECONDS);
}
