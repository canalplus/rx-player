import { expect } from "chai";
import XHRMock from "../../utils/request_mock";
import RxPlayer from "../../../src";
import { manifestInfos } from "../../contents/DASH_dynamic_SegmentTemplate_Multi_Periods";
import sleep from "../../utils/sleep.js";

describe("DASH live content multi-periods (SegmentTemplate)", function() {
  let player;
  let xhrMock;

  beforeEach(() => {
    player = new RxPlayer();
    xhrMock = new XHRMock();
  });

  afterEach(() => {
    player.dispose();
    xhrMock.restore();
  });

  it("should return correct maximum position", async () => {
    xhrMock.lock();

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    expect(xhrMock.getLockedXHR().length).to.equal(1);
    await sleep(1);
    await xhrMock.flush();
    await sleep(1);

    const manifest = player.getManifest();
    expect(manifest).not.to.equal(null);
    const { periods } = manifest;

    expect(periods.length).to.equal(3);
    const now = Date.now() / 1000 - 10;
    const maxPos = player.getMaximumPosition();
    expect(maxPos).to.be.closeTo(now, 2);
  });

  xit("should return correct minimum position", async () => {
    xhrMock.lock();

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    expect(xhrMock.getLockedXHR().length).to.equal(1);
    await sleep(1);
    await xhrMock.flush();
    await sleep(1);

    const manifest = player.getManifest();
    expect(manifest).not.to.equal(null);
    const { periods } = manifest;

    expect(periods.length).to.equal(3);
    const now = Date.now() / 1000 - 10;
    const minPos = player.getMinimumPosition();
    expect(minPos).to.be.closeTo(now - manifestInfos.tsbd, 2);
  });

  it("should correclty parse manifest and periods boundaries", async () => {
    xhrMock.lock();

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    expect(xhrMock.getLockedXHR().length).to.equal(1);
    await sleep(1);
    await xhrMock.flush();
    await sleep(1);

    const manifest = player.getManifest();
    expect(manifest).not.to.equal(null);
    const { periods } = manifest;

    expect(periods[0].start).to.equal(1567780920);
    expect(periods[0].end).to.equal(1567781100);
    expect(periods[1].start).to.equal(1567781100);
    expect(periods[1].end).to.equal(1567781280);
    expect(periods[2].start).to.equal(1567781280);
    expect(periods[2].end).to.equal(undefined);
  });
});
