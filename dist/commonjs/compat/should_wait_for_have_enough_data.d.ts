/**
 * An `HTMLMediaElement`'s readyState allows the browser to communicate whether
 * it can play a content reliably.
 * Usually, we may consider that a `HAVE_FUTURE_DATA` (readyState `3`) or even
 * a `HAVE_CURRENT_DATA` (readyState `2`) is enough to begin playing the content
 * and consider it as loaded.
 *
 * However some devices wrongly anounce those readyStates before being actually
 * able to decode the content. For those devices we wait for the
 * `HAVE_ENOUGH_DATA` readyState before considering the content as loaded.
 * @returns {boolean}
 */
export default function shouldWaitForHaveEnoughData(): boolean;
