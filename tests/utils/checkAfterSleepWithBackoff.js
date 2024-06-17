import sleep from "./sleep";

/**
 * Performs a check after a given delay (starting at either `minTimeMs`
 * milliseconds or just after a `setTimeout` of `0` if not set).
 * If that check fails, re-wait two times the previous delay (or less if/when
 * we reached `maxTimeMs`).
 *
 * Once `maxTimeMs` milliseconds have passed (or 4 seconds if not set) since
 * this function was called and if the check still fails, throw the
 * corresponding failure.
 *
 * This util is useful for asynchronous tests which pass after some delay but
 * how much is not certain. Instead of setting a very high delay which will
 * lead to your test taking too much time, you may use this util instead to give
 * a range from a short to a longer delay.
 *
 * @param {Object|null|undefined} [configuration]
 * @param {number|null|undefined} [configuration.minTimeMs]
 * @param {number|null|undefined} [configuration.maxTimeMs]
 * @param {number|null|undefined} [configuration.stepMs]
 * @param {function|Object} checks
 * @returns {Promise}
 */
export async function checkAfterSleepWithBackoff(configuration, checks) {
  const minTimeMs = configuration?.minTimeMs;
  const maxTimeMs = configuration?.maxTimeMs;
  const stepMs = configuration?.stepMs;
  const checkFn = typeof checks === "function" ? checks : checks.resolveWhen;
  const onFailure =
    typeof checks === "function"
      ? () => {
          /* noop */
        }
      : checks.untilSuccess;
  let sleepTime = minTimeMs ?? 0;
  try {
    await sleep(sleepTime);
    const result = checkFn();
    if (result instanceof Promise) {
      await result;
    }
  } catch (err) {
    onFailure();
    const usedMax = maxTimeMs ?? 4000;
    const remainingMax = usedMax - sleepTime;
    if (remainingMax <= 0) {
      throw err;
    }

    if (sleepTime === 0) {
      return checkAfterSleepWithBackoff(
        {
          minTimeMs: Math.min(5, maxTimeMs),
          maxTimeMs,
        },
        checks,
      );
    } else {
      const step = stepMs ?? sleepTime;
      sleepTime += step;
      if (sleepTime > remainingMax) {
        sleepTime = remainingMax;
      }
      return checkAfterSleepWithBackoff(
        { minTimeMs: sleepTime, maxTimeMs: remainingMax },
        checks,
      );
    }
  }
}
