/**
 * Convert a setTimeout to a Promise.
 *
 * You can use it to have a much more readable blocking code with async/await
 * in some asynchronous tests.
 *
 * @param {number} timeInMs
 * @returns {Promise}
 */
export default function sleep(timeInMs: number): Promise<void> {
  return new Promise((res) => {
    setTimeout(res, timeInMs);
  });
}
