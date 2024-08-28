import sleep from "../../utils/sleep.js";

import RxPlayer from "../../../dist/es2017";

import { manifestInfos } from "../../contents/DASH_dynamic_SegmentTimeline";
import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";

/**
 *  Workaround to provide a "real" sleep function, which does not depend on
 *  vitest fakeTimers.
 *  Here, the environment's setTimeout function is stored before being stubed
 *  by vitest, allowing to sleep the wanted time without waiting vitest's clock
 *  to tick.
 *  @param {Number} [ms=0]
 *  @returns {Promise}
 */
const sleepWithoutFakeTimer = (function () {
  const timeoutFn = window.setTimeout;
  return function _nextTick(ms = 0) {
    return new Promise((res) => {
      timeoutFn(res, ms);
    });
  };
})();

/**
 * Test various cases of errors due to Manifest loading or parsing.
 */
describe("manifest error management", function () {
  let player;

  beforeEach(() => {
    player = new RxPlayer();
  });

  afterEach(() => {
    player.dispose();
  });

  it("should retry to download the manifest 5 times", async () => {
    vi.useFakeTimers();
    const awaitingRequestCallbacks = [];
    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
      manifestLoader: async ({ url }, callbacks) => {
        if (url !== manifestInfos.url) {
          callbacks.fallback();
          return;
        }
        awaitingRequestCallbacks.push(() => {
          const err = new Error("Retry please");
          err.canRetry = true;
          callbacks.reject(err);
        });
      },
    });

    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()();
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()();
    await sleepWithoutFakeTimer(0);
    vi.advanceTimersByTime(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()();
    await sleepWithoutFakeTimer(0);
    vi.advanceTimersByTime(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()();
    await sleepWithoutFakeTimer(0);
    vi.advanceTimersByTime(5000);

    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()();
    await sleepWithoutFakeTimer(0);

    vi.useRealTimers();

    await sleep(5);
    expect(awaitingRequestCallbacks).toHaveLength(0);
    const error = player.getError();
    expect(error).not.to.equal(null);
    expect(error.type).to.equal(RxPlayer.ErrorTypes.OTHER_ERROR);
    expect(error.code).to.equal(RxPlayer.ErrorCodes.PIPELINE_LOAD_ERROR);
  });

  it("should parse the manifest if it works the second time", async () => {
    vi.useFakeTimers();

    const awaitingRequestCallbacks = [];

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
      manifestLoader: async ({ url }, callbacks) => {
        if (url !== manifestInfos.url) {
          callbacks.fallback();
          return;
        }
        awaitingRequestCallbacks.push((shouldManifestRequestWork) => {
          if (shouldManifestRequestWork) {
            callbacks.fallback();
            return;
          }

          const err = new Error("Retry please");
          err.canRetry = true;
          callbacks.reject(err);
        });
      },
    });

    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(false);
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(true);
    await sleepWithoutFakeTimer(0);

    expect(player.getError()).to.equal(null);

    vi.advanceTimersByTime(100000);
    vi.useRealTimers();

    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);
  });

  it("should parse the manifest if it works the third time", async () => {
    vi.useFakeTimers();

    const awaitingRequestCallbacks = [];

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
      manifestLoader: async ({ url }, callbacks) => {
        if (url !== manifestInfos.url) {
          callbacks.fallback();
          return;
        }
        awaitingRequestCallbacks.push((shouldManifestRequestWork) => {
          if (shouldManifestRequestWork) {
            callbacks.fallback();
            return;
          }

          const err = new Error("Retry please");
          err.canRetry = true;
          callbacks.reject(err);
        });
      },
    });

    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(false);
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(false);
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(true);
    await sleepWithoutFakeTimer(0);

    expect(player.getError()).to.equal(null);

    vi.advanceTimersByTime(100000);
    vi.useRealTimers();

    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);
  });

  it("should parse the manifest if it works the fourth time", async () => {
    vi.useFakeTimers();

    const awaitingRequestCallbacks = [];

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
      manifestLoader: async ({ url }, callbacks) => {
        if (url !== manifestInfos.url) {
          callbacks.fallback();
          return;
        }
        awaitingRequestCallbacks.push((shouldManifestRequestWork) => {
          if (shouldManifestRequestWork) {
            callbacks.fallback();
            return;
          }

          const err = new Error("Retry please");
          err.canRetry = true;
          callbacks.reject(err);
        });
      },
    });

    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(false);
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(false);
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(false);
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(true);
    await sleepWithoutFakeTimer(0);

    expect(player.getError()).to.equal(null);

    vi.advanceTimersByTime(100000);
    vi.useRealTimers();

    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);
  });

  it("should parse the manifest if it works the fifth time", async () => {
    vi.useFakeTimers();

    const awaitingRequestCallbacks = [];

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
      manifestLoader: async ({ url }, callbacks) => {
        if (url !== manifestInfos.url) {
          callbacks.fallback();
          return;
        }
        awaitingRequestCallbacks.push((shouldManifestRequestWork) => {
          if (shouldManifestRequestWork) {
            callbacks.fallback();
            return;
          }

          const err = new Error("Retry please");
          err.canRetry = true;
          callbacks.reject(err);
        });
      },
    });

    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(false);
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(false);
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(false);
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(false);
    await sleepWithoutFakeTimer(0);

    vi.advanceTimersByTime(5000);
    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);

    await sleepWithoutFakeTimer(0);
    expect(awaitingRequestCallbacks).toHaveLength(1);
    awaitingRequestCallbacks.pop()(true);
    await sleepWithoutFakeTimer(0);

    expect(player.getError()).to.equal(null);

    vi.advanceTimersByTime(10000);
    vi.useRealTimers();

    await sleepWithoutFakeTimer(0);
    expect(player.getError()).to.equal(null);
  });
});
