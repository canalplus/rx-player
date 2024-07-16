import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import RxPlayer from "../../../dist/es2017";
import { manifestInfos } from "../../contents/DASH_dynamic_SegmentTemplate_Multi_Periods";

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

describe("DASH live content multi-periods (SegmentTemplate)", function () {
  let player;

  beforeEach(() => {
    player = new RxPlayer();
    vi.useFakeTimers();
    vi.setSystemTime((1567781280 + 500) * 1000);
  });

  afterEach(() => {
    player.dispose();
    vi.useRealTimers();
  });

  it("should return correct maximum and minimum positions", async () => {
    let manifestLoaderCalledTimes = 0;
    const manifestLoader = (man, callbacks) => {
      expect(manifestInfos.url).to.equal(man.url);
      manifestLoaderCalledTimes++;
      callbacks.fallback();
    };
    const segmentLoader = () => {
      // Do nothing here
    };
    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
      manifestLoader,
      segmentLoader,
    });

    await sleepWithoutFakeTimer(50);

    const now = 1567781280 + 500;
    const maxPos = player.getMaximumPosition();
    expect(maxPos).to.be.closeTo(now, 2);
    const minPos = player.getMinimumPosition();
    expect(minPos).to.be.closeTo(now - manifestInfos.tsbd - 2, 2);
    expect(manifestLoaderCalledTimes).to.equal(1);
  });
});
