import { expect } from "chai";
import RxPlayer from "../../../src";
import {
  WithDirect,
  WithDirectAndHTTP,
  WithHTTP,
  WithoutTimings,
} from "../../contents/DASH_dynamic_UTCTimings";
import sleep from "../../utils/sleep.js";
import XHRMock from "../../utils/request_mock";

describe("DASH live - UTCTimings", () => {
  describe("DASH live content (SegmentTemplate + Direct UTCTiming)", function () {
    const { manifestInfos } = WithDirect;
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

    it("should calculate the right bounds", async () => {
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      await xhrMock.flush();
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553521448, 3);
      expect(player.getMaximumPosition()).to.be
        .closeTo(1553521748, 3);
    });

    it("should consider `serverSyncInfos` if provided", async () => {
      xhrMock.lock();

      const serverTimestamp = +new Date("2019-03-25T13:54:08.000Z");
      player.loadVideo({ url: manifestInfos.url,
                         transport:manifestInfos.transport,
                         transportOptions: {
                           serverSyncInfos: {
                             serverTimestamp,
                             clientTime: performance.now(),
                           },
                         } });

      await sleep(10);
      await xhrMock.flush();
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553521748, 1);
      expect(player.getMaximumPosition()).to.be
        .closeTo(1553522048, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + HTTP UTCTiming)", function () {
    const { manifestInfos } = WithHTTP;
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

    it("should fetch the clock and then calculate the right bounds", async () => {
      xhrMock.respondTo("GET",
                        "https://time.akamai.com/?iso",
                        [ 200,
                          { "Content-Type": "text/plain"},
                          "2019-03-25T13:49:08.014Z"]);
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      await xhrMock.flush(); // Manifest request
      await sleep(10);
      await xhrMock.flush(); // time request
      await sleep(10);
      await xhrMock.flush(); // Once for the init segment
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553521448, 3);
    });

    it("should consider `serverSyncInfos` if provided", async () => {
      xhrMock.lock();

      const serverTimestamp = +new Date("2019-03-25T13:54:08.000Z");
      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
        transportOptions: {
          serverSyncInfos: {
            serverTimestamp,
            clientTime: performance.now(),
          },
        },
      });

      await sleep(10);
      await xhrMock.flush();
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553521748, 1);
      expect(player.getMaximumPosition()).to.be
        .closeTo(1553522048, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + Without Timing)", function() {
    const { manifestInfos } = WithoutTimings;
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

    it("should calculate the right bounds", async () => {
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      await xhrMock.flush();
      await sleep(10);

      const timeShiftBufferDepth = 5 * 60;
      const maximumPosition = Date.now() / 1000 -
        manifestInfos.availabilityStartTime;
      const minimumPosition = maximumPosition - timeShiftBufferDepth;

      expect(player.getMinimumPosition()).to.be
        .closeTo(minimumPosition, 3);
      expect(player.getMaximumPosition()).to.be
        .closeTo(maximumPosition, 3);
    });

    it("should consider `serverSyncInfos` if provided", async () => {
      xhrMock.lock();

      const serverTimestamp = +new Date("2019-03-25T13:54:08.000Z");
      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
        transportOptions: {
          serverSyncInfos: {
            serverTimestamp,
            clientTime: performance.now(),
          },
        },
      });

      await sleep(10);
      await xhrMock.flush();
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553521748, 1);
      expect(player.getMaximumPosition()).to.be
        .closeTo(1553522048, 1);
    });
  });

  describe("DASH live content (SegmentTemplate + Direct & HTTP UTCTiming)", function () {
    const { manifestInfos } = WithDirectAndHTTP;
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

    it("should not fetch the clock but still calculate the right bounds", async () => {
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      await xhrMock.flush();
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553521448, 3);

      const requestsDone = xhrMock.getLockedXHR().map(r => r.url);
      expect(requestsDone)
        .not.to.include("https://time.akamai.com/?iso");
    });

    it("should consider `serverSyncInfos` if provided", async () => {
      xhrMock.lock();

      const serverTimestamp = +new Date("2019-03-25T13:54:08.000Z");
      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
        transportOptions: {
          serverSyncInfos: {
            serverTimestamp,
            clientTime: performance.now(),
          },
        },
      });

      await sleep(10);
      await xhrMock.flush();
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1553521748, 1);
      expect(player.getMaximumPosition()).to.be
        .closeTo(1553522048, 1);
    });
  });
});
