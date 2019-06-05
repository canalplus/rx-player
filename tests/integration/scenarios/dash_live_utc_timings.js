import { expect } from "chai";
import RxPlayer from "../../../src";
import {
  WithDirect,
  WithDirectAndHTTP,
  WithHTTP,
  WithoutTimings,
} from "../../contents/DASH_dynamic_UTCTimings";
import sleep from "../../utils/sleep.js";
import XHRLocker from "../../utils/xhr_locker.js";

describe("DASH live - UTCTimings", () => {
  describe("DASH live content (SegmentTemplate + Direct UTCTiming)", function () {
    const { manifestInfos } = WithDirect;
    let player;
    let xhrLocker;

    beforeEach(() => {
      player = new RxPlayer();
      xhrLocker = XHRLocker();
    });

    afterEach(() => {
      player.dispose();
      xhrLocker.restore();
    });

    it("should calculate the right bounds", async () => {
      xhrLocker.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(1);
      await xhrLocker.flush();
      await sleep(1);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553517853, 1);
      expect(player.getMaximumPosition()).to.be
        .closeTo(1553518148, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + HTTP UTCTiming)", function () {
    const { manifestInfos } = WithHTTP;
    let player;
    let xhrLocker;
    const requests = [];

    beforeEach(() => {
      player = new RxPlayer();
      xhrLocker = XHRLocker();
    });

    afterEach(() => {
      requests.length = 0;
      player.dispose();
      xhrLocker.restore();
    });

    it("should fetch the clock and then calculate the right bounds", async () => {
      const url = URL.createObjectURL(new Blob(["2019-03-25T12:49:08.014Z"]));
      xhrLocker.redirect("https://time.akamai.com/?iso", url);
      xhrLocker.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(1);
      await xhrLocker.flush(); // Manifest request
      await sleep(1);
      await xhrLocker.flush(); // time request
      await sleep(1);
      await xhrLocker.flush(); // Once for the init segment
      await sleep(1);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553517853, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + Without Timing)", function() {
    const { manifestInfos } = WithoutTimings;
    let player;
    let xhrLocker;

    beforeEach(() => {
      player = new RxPlayer();
      xhrLocker = XHRLocker();
    });

    afterEach(() => {
      player.dispose();
      xhrLocker.restore();
    });

    it("should calculate the right bounds", async () => {
      xhrLocker.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      await xhrLocker.flush();
      await sleep(10);

      const { availabilityStartTime } = player.getManifest();
      const timeShiftBufferDepth = (5 * 60) - 5;
      const maximumPosition = (Date.now() - 10000) / 1000 -
        availabilityStartTime;
      const minimumPosition = maximumPosition - timeShiftBufferDepth;

      expect(player.getMinimumPosition()).to.be
        .closeTo(minimumPosition, 1);
      expect(player.getMaximumPosition()).to.be
        .closeTo(maximumPosition, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + Direct & HTTP UTCTiming)", function () {
    const { manifestInfos } = WithDirectAndHTTP;
    let player;
    let xhrLocker;

    beforeEach(() => {
      player = new RxPlayer();
      xhrLocker = XHRLocker();
    });

    afterEach(() => {
      player.dispose();
      xhrLocker.restore();
    });

    it("should not fetch the clock but still calculate the right bounds", async () => {
      xhrLocker.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(1);
      await xhrLocker.flush();
      await sleep(1);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553517853, 1);

      const requestsDone = xhrLocker.getLockedXHR().map(r => r.url);
      expect(requestsDone)
        .not.to.include("https://time.akamai.com/?iso");
    });
  });
});
