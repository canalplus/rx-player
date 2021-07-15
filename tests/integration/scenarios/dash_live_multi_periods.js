import { expect } from "chai";
import XHRMock from "../../utils/request_mock";
import RxPlayer from "../../../src";
import { manifestInfos } from "../../contents/DASH_dynamic_SegmentTemplate_Multi_Periods";
import sinon from "sinon";

/**
 *  Workaround to provide a "real" sleep function, which does not depend on
 *  sinon fakeTimers.
 *  Here, the environment's setTimeout function is stored before being stubed
 *  by sinon, allowing to sleep the wanted time without waiting sinon's clock
 *  to tick.
 *  @param {Number} [ms=0]
 *  @returns {Promise}
 */
const sleepWithoutSinonStub = (function() {
  const timeoutFn = window.setTimeout;
  return function _nextTick(ms = 0) {
    return new Promise((res) => {
      timeoutFn(res, ms);
    });
  };
})();

describe("DASH live content multi-periods (SegmentTemplate)", function() {
  let player;
  let xhrMock;
  let clock;

  beforeEach(() => {
    player = new RxPlayer();
    xhrMock = new XHRMock();
    clock = sinon.useFakeTimers((1567781280 + 500) * 1000);
  });

  afterEach(() => {
    player.dispose();
    xhrMock.restore();
    clock.restore();
  });

  it("should return correct maximum position", async () => {
    xhrMock.lock();

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    await sleepWithoutSinonStub(1);
    expect(xhrMock.getLockedXHR().length).to.equal(1);
    await xhrMock.flush();
    await sleepWithoutSinonStub(1);

    const now = 1567781280 + 500;
    const maxPos = player.getMaximumPosition();
    expect(maxPos).to.be.closeTo(now, 2);
  });

  it("should return correct minimum position", async () => {
    xhrMock.lock();

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    await sleepWithoutSinonStub(1);
    expect(xhrMock.getLockedXHR().length).to.equal(1);
    await xhrMock.flush();
    await sleepWithoutSinonStub(1);

    const now = 1567781280 + 500;
    const minPos = player.getMinimumPosition();
    expect(minPos).to.be.closeTo(now - manifestInfos.tsbd, 2);
  });
});
