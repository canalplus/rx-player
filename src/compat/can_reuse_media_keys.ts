import {
  isWebOs2021,
  isWebOs2022,
} from "./browser_detection";

/**
 * Returns `true` if a `MediaKeys` instance (the  `Encrypted Media Extension`
 * concept) can be reused between contents.
 *
 * This should usually be the case but we found rare devices where this would
 * cause problem:
 *   - (2022-10-26): WebOS (LG TVs) 2021 and 2022 just rebuffered indefinitely
 *     when loading a content already-loaded on the HTMLMediaElement.
 *
 * @returns {boolean}
 */
export default function canReuseMediaKeys() : boolean {
  return !(isWebOs2021 || isWebOs2022);
}
