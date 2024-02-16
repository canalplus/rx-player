/**
 * Returns `true` if a `MediaKeys` instance (the  `Encrypted Media Extension`
 * concept) can be reused between contents.
 *
 * This should usually be the case but we found rare devices where this would
 * cause problem:
 *   - (2022-11-21): WebOS (LG TVs), for some encrypted contents, just
 *     rebuffered indefinitely when loading a content already-loaded on the
 *     HTMLMediaElement.
 *
 * @returns {boolean}
 */
export default function canReuseMediaKeys(): boolean;
