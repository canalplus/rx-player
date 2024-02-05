import { getRetryDelay } from "../retry_promise_with_backoff";

describe("utils - RetryPromiseWithBackoff", () => {
  it("retry delay should increase at each retry", () => {
    /*
     * The delay after each retry is multiplied by a factor 2.
     * This delay is slightly modified to randomize the distribution.
     * Following table display the expected delay for each retry, in the
     * most pessimists and most optimistics scenarios.
     * The last two columns show the minimum and maximum accumulated time
     * waited since the first try.
     *
     * |Retry| base  |  max  |  min  |totalMax|totalMin |
     * |-----|-------|-------|-------|--------|---------|
     * | 1   |200    | 260   | 140   | 260    |  140    |
     * | 2   |400    | 520   | 280   | 780    |  420    |
     * | 3   |800    | 1040  | 560   | 1820   |  980    |
     * | 4   |1600   | 2080  | 1120  | 3900   |  21OO   |
     * | 5   |3000   | 3000  | 2100  | 7800   |  4200   |
     * | 6   |3000   | 3000  | 2100  | 11700  |  6300   |
     * | 7   |3000   | 3000  | 2100  | 15600  |  8400   |
     */
    const baseDelay = 200;
    const maxDelay = 3000;
    expect(getRetryDelay(baseDelay, 1, maxDelay)).toBeGreaterThanOrEqual(140);
    expect(getRetryDelay(baseDelay, 1, maxDelay)).toBeLessThanOrEqual(260);

    expect(getRetryDelay(baseDelay, 3, maxDelay)).toBeGreaterThanOrEqual(560);
    expect(getRetryDelay(baseDelay, 3, maxDelay)).toBeLessThanOrEqual(1040);

    expect(getRetryDelay(baseDelay, 6, maxDelay)).toBeGreaterThanOrEqual(2100);
    expect(getRetryDelay(baseDelay, 6, maxDelay)).toBeLessThanOrEqual(3000);
  });

  it("retry delay should be capped by maximumDelay", () => {
    const maxDelay = 1000;
    expect(getRetryDelay(500, 6, maxDelay)).toBeLessThanOrEqual(maxDelay);
  });
});
