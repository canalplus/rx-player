import { expect } from "chai";
import RxPlayer from "../../../dist/es2017";
import {
  WithDirect,
  WithDirectAndHTTP,
  WithHTTP,
  WithoutTimings,
} from "../../contents/DASH_dynamic_UTCTimings";
import sleep from "../../utils/sleep.js";

describe("DASH live - UTCTimings", () => {
  describe("DASH live content (SegmentTemplate + Direct UTCTiming)", function () {
    const { manifestInfos } = WithDirect;
    let player;

    beforeEach(() => {
      player = new RxPlayer();
    });

    afterEach(() => {
      player.dispose();
    });

    it("should calculate the right bounds", async () => {
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
      });
      await sleep(200);
      expect(player.getMinimumPosition()).to.be.closeTo(1553521448, 3);
      expect(player.getMaximumPosition()).to.be.closeTo(1553521748, 3);
    });

    it("should consider `serverSyncInfos` if provided", async () => {
      const serverTimestamp = +new Date("2019-03-25T13:54:08.000Z");
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        serverSyncInfos: {
          serverTimestamp,
          clientTime: performance.now(),
        },
      });
      await sleep(200);
      expect(player.getMinimumPosition()).to.be.closeTo(1553521748, 1);
      expect(player.getMaximumPosition()).to.be.closeTo(1553522048, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + HTTP UTCTiming)", function () {
    const { manifestInfos } = WithHTTP;
    let player;

    beforeEach(() => {
      player = new RxPlayer();
    });

    afterEach(() => {
      player.dispose();
    });

    it("should fetch the clock and then calculate the right bounds", async () => {
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        manifestLoader(arg, cbs) {
          cbs.fallback();
        },
        segmentLoader() {
          // noop
        },
      });
      await sleep(200);
      expect(player.getMinimumPosition()).to.be.closeTo(1558791848, 3);
    });

    it("should consider `serverSyncInfos` if provided", async () => {
      const serverTimestamp = +new Date("2019-03-25T13:54:08.000Z");
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        serverSyncInfos: {
          serverTimestamp,
          clientTime: performance.now(),
        },
      });

      await sleep(200);
      expect(player.getMinimumPosition()).to.be.closeTo(1553521748, 1);
      expect(player.getMaximumPosition()).to.be.closeTo(1553522048, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + Without Timing)", function () {
    const { manifestInfos } = WithoutTimings;
    let player;

    beforeEach(() => {
      player = new RxPlayer();
    });

    afterEach(() => {
      player.dispose();
    });

    it("should calculate the right bounds", async () => {
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
      });
      await sleep(200);

      const timeShiftBufferDepth = 5 * 60;
      const maximumPosition = Date.now() / 1000 - manifestInfos.availabilityStartTime;
      const minimumPosition = maximumPosition - timeShiftBufferDepth;

      expect(player.getMinimumPosition()).to.be.closeTo(minimumPosition, 3);
      expect(player.getMaximumPosition()).to.be.closeTo(maximumPosition, 3);
    });

    it("should consider `serverSyncInfos` if provided", async () => {
      const serverTimestamp = +new Date("2019-03-25T13:54:08.000Z");
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        serverSyncInfos: {
          serverTimestamp,
          clientTime: performance.now(),
        },
      });

      await sleep(200);
      expect(player.getMinimumPosition()).to.be.closeTo(1553521748, 1);
      expect(player.getMaximumPosition()).to.be.closeTo(1553522048, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + Direct & HTTP UTCTiming)", function () {
    const { manifestInfos } = WithDirectAndHTTP;
    let player;

    beforeEach(() => {
      player = new RxPlayer();
    });

    afterEach(() => {
      player.dispose();
    });

    it("should not fetch the clock but still calculate the right bounds", async () => {
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
      });

      await sleep(200);
      expect(player.getMinimumPosition()).to.be.closeTo(1553521448, 3);
    });

    it("should consider `serverSyncInfos` if provided", async () => {
      const serverTimestamp = +new Date("2019-03-25T13:54:08.000Z");
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        serverSyncInfos: {
          serverTimestamp,
          clientTime: performance.now(),
        },
      });

      await sleep(200);
      expect(player.getMinimumPosition()).to.be.closeTo(1553521748, 1);
      expect(player.getMaximumPosition()).to.be.closeTo(1553522048, 1);
    });
  });
});
