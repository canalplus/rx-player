import { expect } from "chai";
import sinon from "sinon";
import RxPlayer from "../../../src";
import {
  WithDirect,
  WithDirectAndHTTP,
  WithHTTP,
  WithoutTimings,
} from "../../contents/DASH_dynamic_UTCTimings";
import mockRequests from "../../utils/mock_requests.js";
import sleep from "../../utils/sleep.js";

describe("DASH live - UTCTimings", () => {
  describe("DASH live content (SegmentTemplate + Direct UTCTiming)", function () {
    const { manifestInfos, URLs } = WithDirect;
    let player;
    let fakeServer;

    beforeEach(() => {
      player = new RxPlayer();
      fakeServer = sinon.createFakeServer();
    });

    afterEach(() => {
      player.dispose();
      fakeServer.restore();
    });

    it("should calculate the right bounds", async () => {
      mockRequests(fakeServer, URLs);

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      fakeServer.respond();
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553517853, 1);
      expect(player.getMaximumPosition()).to.be
        .closeTo(1553518148, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + HTTP UTCTiming)", function () {
    const { manifestInfos, URLs } = WithHTTP;
    let player;
    let fakeServer;

    beforeEach(() => {
      player = new RxPlayer();
      fakeServer = sinon.createFakeServer();
    });

    afterEach(() => {
      player.dispose();
      fakeServer.restore();
    });

    it("should fetch the clock and then calculate the right bounds", async () => {
      mockRequests(fakeServer, URLs);

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      fakeServer.respond(); // Once for UTCTiming
      await sleep(10);
      fakeServer.respond(); // Once for the init segment
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553517853, 1);

      const requestsDone = fakeServer.requests.map(r => r.url);
      expect(requestsDone)
        .to.include("https://time.akamai.com/?iso");
    });
  });

  describe("DASH live content (SegmentTemplate + Without Timing)", function() {
    const { manifestInfos, URLs } = WithoutTimings;
    let player;
    let fakeServer;

    beforeEach(() => {
      player = new RxPlayer();
      fakeServer = sinon.createFakeServer();
    });

    afterEach(() => {
      player.dispose();
      fakeServer.restore();
    });

    it("should calculate the right bounds", async () => {
      mockRequests(fakeServer, URLs);

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      fakeServer.respond();
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
    const { manifestInfos, URLs } = WithDirectAndHTTP;
    let player;
    let fakeServer;

    beforeEach(() => {
      player = new RxPlayer();
      fakeServer = sinon.createFakeServer();
    });

    afterEach(() => {
      player.dispose();
      fakeServer.restore();
    });

    it("should not fetch the clock but still calculate the right bounds", async () => {
      mockRequests(fakeServer, URLs);

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      fakeServer.respond();
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553517853, 1);

      const requestsDone = fakeServer.requests.map(r => r.url);
      expect(requestsDone)
        .not.to.include("https://time.akamai.com/?iso");
    });
  });
});
