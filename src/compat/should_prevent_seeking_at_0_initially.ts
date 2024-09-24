import { isIEOrEdge, isXbox } from "./browser_detection";

/**
 * We noticed that on Xbox game consoles and Universal windows platforms
 * (presumably an Edge version is in cause here), the browser didn't send
 * a "seeking" event if we were seeking at a 0 position initially.
 *
 * We could theoretically never seek at 0 initially as the initial position of
 * an HTMLMediaElement should be at 0 anyway, but we still do it as a safe
 * solution, as many devices have a buggy integration of HTML5 media API.
 *
 * This function returns `true` when we should avoid doing so, for now only for
 * the non-standard behavior of those Edge platforms.
 * @returns {number}
 */
export default function shouldPreventSeekingAt0Initially(): boolean {
  return isXbox || isIEOrEdge;
}
