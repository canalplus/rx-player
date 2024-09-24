/**
 * Try the test behind the `runTest` callback which should return a
 * resolving Promise when it succeed and should throw when it fails.
 *
 * This callback will also be given a callback in argument, `cancelTest`,
 * that you can call when you want the test to be retried in cases of
 * failure (you can call it right away if you want to retry the test if it
 * fails in any case of failure.
 *
 * @param {Function} runTest - The test itself, returning a Promise which
 * resolves when the test passes and reject if the test thrown.
 * This function is also given a callback in argument which SHOULD be called
 * before failure if you may want to retry it.
 * @param {number} maxAttempts - The maximum number of attempts to run the
 * test behind the `runTest` function. Once this number of attemps is
 * reached, tests will be stopped in any case.
 * @param {Function|undefined} cleanUp - If set, this callback will be
 * called immediately after the Promise returned by `runTest` resolves or
 * rejects.
 * @returns {Promise} - Returns the same Promise than the last test
 * performed by this function.
 */
export default async function tryTestMultipleTimes<T>(
  runTest: (cancelTest: () => void) => Promise<T>,
  maxAttempts: number,
  cleanUp?: (() => unknown) | undefined,
): Promise<T> {
  let attemptNb = 0;
  return await reCheck();

  async function reCheck(): Promise<T> {
    let stopCondition = false;
    try {
      const res = await runTest(() => {
        stopCondition = true;
      });
      if (cleanUp !== undefined) {
        cleanUp();
      }
      return res;
    } catch (err) {
      if (cleanUp !== undefined) {
        cleanUp();
      }
      if (stopCondition && ++attemptNb <= maxAttempts) {
        return await reCheck();
      }
      throw err;
    }
  }
}
