import { isWebOs } from "./browser_detection";

/**
 * Some devices will give an error if you did not ensure that a `setMediaKeys`
 * call was performed until the end before making another one.
 *
 * This is actually spec-compliant, but we were bitten previously by the other
 * side of that story, when a `setMediaKeys` took a very long time to resolve
 * (thus leading us to not await it).
 *
 * So this function returns `true` when, in actually reproduced scenarios, we
 * encountered situations where both:
 *   1. Time to perform a `setMediaKeys` is not excessive
 *   2. An issue was encountered due to too-close `setMediaKeys` calls.
 *
 * @returns {boolean}
 */
export default function shouldAwaitSetMediaKeys(): boolean {
  return isWebOs;
}
