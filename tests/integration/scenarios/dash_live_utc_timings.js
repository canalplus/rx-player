import { expect } from "chai";
import { describe, beforeEach, afterEach, it } from "vitest";
import RxPlayer from "../../../dist/es2017";
import {
  WithDirect,
  WithDirectAndHTTP,
  WithHTTP,
  WithoutTimings,
} from "../../contents/DASH_dynamic_UTCTimings";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";

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

      await checkAfterSleepWithBackoff(
        { maxTimeMs: 1000 },
        {
          resolveWhen() {
            expect(player.getMinimumPosition()).to.be.closeTo(1553521448, 3);
            expect(player.getMaximumPosition()).to.be.closeTo(1553521748, 3);
          },
          untilSuccess() {
            expect(player.getMinimumPosition()).to.equal(null);
            expect(player.getMaximumPosition()).to.equal(null);
          },
        },
      );
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
      await checkAfterSleepWithBackoff(
        { maxTimeMs: 1000 },
        {
          resolveWhen() {
            expect(player.getMinimumPosition()).to.be.closeTo(1553521748, 1);
            expect(player.getMaximumPosition()).to.be.closeTo(1553522048, 1);
          },
          untilSuccess() {
            expect(player.getMinimumPosition()).to.equal(null);
            expect(player.getMaximumPosition()).to.equal(null);
          },
        },
      );
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
        manifestLoader(_arg, cbs) {
          cbs.fallback();
        },
        segmentLoader() {
          // noop
        },
      });
      await checkAfterSleepWithBackoff(
        { maxTimeMs: 1000 },
        {
          resolveWhen() {
            expect(player.getMinimumPosition()).to.be.closeTo(1558791848, 3);
          },
          untilSuccess() {
            expect(player.getMinimumPosition()).to.equal(null);
          },
        },
      );
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

      await checkAfterSleepWithBackoff(
        { maxTimeMs: 1000 },
        {
          resolveWhen() {
            expect(player.getMinimumPosition()).to.be.closeTo(1553521748, 1);
            expect(player.getMaximumPosition()).to.be.closeTo(1553522048, 1);
          },
          untilSuccess() {
            expect(player.getMinimumPosition()).to.equal(null);
            expect(player.getMaximumPosition()).to.equal(null);
          },
        },
      );
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

      await checkAfterSleepWithBackoff(
        { maxTimeMs: 1000 },
        {
          resolveWhen() {
            const timeShiftBufferDepth = 5 * 60;
            const maximumPosition =
              Date.now() / 1000 - manifestInfos.availabilityStartTime;
            const minimumPosition = maximumPosition - timeShiftBufferDepth;

            expect(player.getMinimumPosition()).to.be.closeTo(minimumPosition, 3);
            expect(player.getMaximumPosition()).to.be.closeTo(maximumPosition, 3);
          },
          untilSuccess() {
            expect(player.getMinimumPosition()).to.equal(null);
            expect(player.getMaximumPosition()).to.equal(null);
          },
        },
      );
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

      await checkAfterSleepWithBackoff(
        { maxTimeMs: 1000 },
        {
          resolveWhen() {
            expect(player.getMinimumPosition()).to.be.closeTo(1553521748, 1);
            expect(player.getMaximumPosition()).to.be.closeTo(1553522048, 1);
          },
          untilSuccess() {
            expect(player.getMinimumPosition()).to.equal(null);
            expect(player.getMaximumPosition()).to.equal(null);
          },
        },
      );
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

      await checkAfterSleepWithBackoff(
        { maxTimeMs: 1000 },
        {
          resolveWhen() {
            expect(player.getMinimumPosition()).to.be.closeTo(1553521448, 3);
          },
          untilSuccess() {
            expect(player.getMinimumPosition()).to.equal(null);
          },
        },
      );
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

      await checkAfterSleepWithBackoff(
        { maxTimeMs: 1000 },
        {
          resolveWhen() {
            expect(player.getMinimumPosition()).to.be.closeTo(1553521748, 1);
            expect(player.getMaximumPosition()).to.be.closeTo(1553522048, 1);
          },
          untilSuccess() {
            expect(player.getMinimumPosition()).to.equal(null);
            expect(player.getMaximumPosition()).to.equal(null);
          },
        },
      );
    });
  });
});
