/**
 * Convert a setTimeout to a Promise.
 *
 * You can use it to have a much more readable blocking code with async/await
 * in some asynchronous tests.
 */
export default function sleep(timeInMs) {
  return new Promise((res) => {
    setTimeout(res, timeInMs);
  });
}
