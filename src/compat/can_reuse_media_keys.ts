import { isPanasonic, isPhilipsNetTv, isWebOs } from "./browser_detection";

/**
 * Returns `true` if a `MediaKeys` instance (the  `Encrypted Media Extension`
 * concept) can be reused between contents.
 *
 * This should usually be the case but we found rare devices where this would
 * cause problem:
 *   - (2022-11-21): WebOS (LG TVs), for some encrypted contents, just
 *     rebuffered indefinitely when loading a content already-loaded on the
 *     HTMLMediaElement.
 *   - (2024-08-23): Seen on Philips 2024 and 2023 in:
 *     https://github.com/canalplus/rx-player/issues/1464
 *
 * @returns {boolean}
 */
export default function canReuseMediaKeys(): boolean {
  return !isWebOs && !isPhilipsNetTv && !isPanasonic;
}
