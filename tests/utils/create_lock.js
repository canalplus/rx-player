/**
 * Create Object allowing to create a "lock" which can be `await`ed, alongside
 * `unlock`/`lock` functions allowing respectively to resolve the awaited
 * promise or to create a new one.
 *
 * Optionally, a value can be given to `unlock` which will be communicated
 * through the `Promise` returned by `awaitCurrentLock` as it resolves.
 *
 * @example
 * ```js
 * const lock = createLock();
 * lock.awaitCurrentLock().then(() => console.log("DONE 1"));
 *
 * // Lead to a logged `"DONE 1"` (asynchronous after this call, Promise
 * // resolution is always in a microtask)
 * lock.unlock();
 *
 * // `"DONE 2"` will be logged (still asynchronously) as the lock is already
 * // "unlocked"
 * lock.awaitCurrentLock().then(() => console.log("DONE 2"));
 *
 * // Reset the lock, already-resolved Promise are not affected.
 * lock.lock();
 *
 * // This one won't log until `unlock` is called again
 * lock.awaitCurrentLock().then(() => console.log("DONE 3"));
 * ```
 * @returns {Object}
 */
export default function createLock() {
  let unlockFn;
  let waitForUnlock = new Promise((res) => {
    unlockFn = res;
  });
  return {
    awaitCurrentLock() {
      return waitForUnlock;
    },
    unlock(val) {
      unlockFn(val);
    },
    lock() {
      waitForUnlock = new Promise((res) => {
        unlockFn = res;
      });
    },
  };
}
