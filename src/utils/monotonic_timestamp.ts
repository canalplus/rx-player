/**
 * Returns a monotonically-increasing timestamp in milliseconds that is
 * guaranteed to raise of 1 millisecond every 1 millisecond.
 *
 * This is in contrast of relying on indirect time values such as `Date.now`
 * which may go back/forward in time due to leap hours or clock changes.
 * @returns {number}
 */
export default function getMonotonicTimeStamp(): number {
  /* eslint-disable-next-line no-restricted-properties */
  return performance.now();
}
