import { expect } from "chai";
import RxPlayer from "../../../src";
import XHRMock from "../../utils/request_mock";
import sleep from "../../utils/sleep.js";
import {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";
import {
  discontinuitiesBetweenPeriodsInfos,
  differentTypesDiscontinuitiesInfos,
} from "../../contents/DASH_static_SegmentTemplate_Multi_Periods";
import {
  discontinuityInfos,
  notStartingAt0ManifestInfos,
} from "../../contents/DASH_static_SegmentTimeline";

let player;
let xhrMock;

describe("discontinuities handling", () => {
  beforeEach(() => {
    player = new RxPlayer();
    xhrMock = new XHRMock();
  });

  afterEach(() => {
    player.dispose();
    xhrMock.restore();
  });

  describe("discontinuities between periods", () => {
    const { url, transport } = discontinuitiesBetweenPeriodsInfos;
    it("should seek over discontinuities between periods", async function () {
      this.timeout(7000);
      let discontinuitiesWarningReceived = 0;
      player.addEventListener("warning", (err) => {
        if (err.type === "MEDIA_ERROR" &&
            err.code === "DISCONTINUITY_ENCOUNTERED")
        {
          discontinuitiesWarningReceived++;
        }
      });
      player.setPlaybackRate(2);
      player.loadVideo({ url,
                         transport,
                         autoPlay: true,
                         startAt: { position: 118 } });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(discontinuitiesWarningReceived).to.equal(0);
      await sleep(3000);
      expect(player.getPosition()).to.be.above(131);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(discontinuitiesWarningReceived).to.equal(1);
    });

    it("should seek to next Period when loading in discontinuity", async function() {
      this.timeout(4000);
      let discontinuitiesWarningReceived = 0;
      player.addEventListener("warning", (err) => {
        if (err.type === "MEDIA_ERROR" &&
            err.code === "DISCONTINUITY_ENCOUNTERED")
        {
          discontinuitiesWarningReceived++;
        }
      });
      player.loadVideo({ url,
                         transport,
                         autoPlay: true,
                         startAt: { position: 121 } });
      expect(discontinuitiesWarningReceived).to.equal(0);
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPosition()).to.be.at.least(131);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(discontinuitiesWarningReceived).to.equal(1);
    });

    it("should seek to next Period when seeking in discontinuity", async function() {
      this.timeout(4000);
      let discontinuitiesWarningReceived = 0;
      player.addEventListener("warning", (err) => {
        if (err.type === "MEDIA_ERROR" &&
            err.code === "DISCONTINUITY_ENCOUNTERED")
        {
          discontinuitiesWarningReceived++;
        }
      });
      player.loadVideo({ url,
                         transport,
                         autoPlay: true });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(discontinuitiesWarningReceived).to.equal(0);
      player.seekTo(122);
      await sleep(1000);
      expect(player.getPosition()).to.be.at.least(131);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(discontinuitiesWarningReceived).to.equal(1);
    });
  });

  describe("discontinuities between periods with different types", () => {
    const { url, transport } = differentTypesDiscontinuitiesInfos;
    it("should seek over discontinuities between periods", async function () {
      this.timeout(7000);
      let discontinuitiesWarningReceived = 0;
      player.addEventListener("warning", (err) => {
        if (err.type === "MEDIA_ERROR" &&
            err.code === "DISCONTINUITY_ENCOUNTERED")
        {
          discontinuitiesWarningReceived++;
        }
      });
      player.setPlaybackRate(2);
      player.loadVideo({ url,
                         transport,
                         autoPlay: true,
                         startAt: { position: 118 } });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(discontinuitiesWarningReceived).to.equal(0);
      await sleep(3000);
      expect(player.getPosition()).to.be.above(131);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(discontinuitiesWarningReceived).to.equal(1);
    });

    it("should seek to next Period when loading in discontinuity", async function() {
      this.timeout(4000);
      let discontinuitiesWarningReceived = 0;
      player.addEventListener("warning", (err) => {
        if (err.type === "MEDIA_ERROR" &&
            err.code === "DISCONTINUITY_ENCOUNTERED")
        {
          discontinuitiesWarningReceived++;
        }
      });
      player.loadVideo({ url,
                         transport,
                         autoPlay: true,
                         startAt: { position: 121 } });
      expect(discontinuitiesWarningReceived).to.equal(0);
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPosition()).to.be.at.least(131);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(discontinuitiesWarningReceived).to.equal(1);
    });

    it("should seek to next Period when seeking in discontinuity", async function() {
      this.timeout(4000);
      let discontinuitiesWarningReceived = 0;
      player.addEventListener("warning", (err) => {
        if (err.type === "MEDIA_ERROR" &&
            err.code === "DISCONTINUITY_ENCOUNTERED")
        {
          discontinuitiesWarningReceived++;
        }
      });
      player.loadVideo({ url,
                         transport,
                         autoPlay: true });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(discontinuitiesWarningReceived).to.equal(0);
      player.seekTo(122);
      await sleep(1000);
      expect(player.getPosition()).to.be.at.least(131);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(discontinuitiesWarningReceived).to.be.at.least(1);

      // TODO this is a known very minor issue, investigate and fix in the
      // RxPlayer's code?
      expect(discontinuitiesWarningReceived).to.be.at.most(2);
    });
  });

  describe("discontinuities in Period announced in Manifest", () => {
    const { url, transport } = discontinuityInfos;
    it("should seek over discontinuities in a Period", async function () {
      this.timeout(7000);
      let discontinuitiesWarningReceived = 0;
      player.addEventListener("warning", (err) => {
        if (err.type === "MEDIA_ERROR" &&
            err.code === "DISCONTINUITY_ENCOUNTERED")
        {
          discontinuitiesWarningReceived++;
        }
      });
      player.setPlaybackRate(2);
      player.loadVideo({ url,
                         transport,
                         autoPlay: true,
                         startAt: { position: 22 } });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(discontinuitiesWarningReceived).to.equal(0);
      await sleep(2000);
      expect(player.getPosition()).to.be.above(28);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(discontinuitiesWarningReceived).to.equal(1);
    });

    it("should seek over discontinuity when loading on one", async function() {
      this.timeout(4000);
      let discontinuitiesWarningReceived = 0;
      player.addEventListener("warning", (err) => {
        if (err.type === "MEDIA_ERROR" &&
            err.code === "DISCONTINUITY_ENCOUNTERED")
        {
          discontinuitiesWarningReceived++;
        }
      });
      player.loadVideo({ url,
                         transport,
                         autoPlay: true,
                         startAt: { position: 25 } });
      expect(discontinuitiesWarningReceived).to.equal(0);
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPosition()).to.be.at.least(28);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(discontinuitiesWarningReceived).to.equal(1);
    });

    it("should seek over discontinuity when seeking in one", async function() {
      this.timeout(5000);
      let discontinuitiesWarningReceived = 0;
      player.addEventListener("warning", (err) => {
        if (err.type === "MEDIA_ERROR" &&
            err.code === "DISCONTINUITY_ENCOUNTERED")
        {
          discontinuitiesWarningReceived++;
        }
      });
      player.loadVideo({ url,
                         transport,
                         autoPlay: true });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(discontinuitiesWarningReceived).to.equal(0);
      player.seekTo(25);
      await sleep(3000);
      expect(player.getPosition()).to.be.at.least(28);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(discontinuitiesWarningReceived).to.be.at.least(1);

      // Due to an issue seen in Firefox, the discontinuity might actually
      // be seeked in two parts in it
      expect(discontinuitiesWarningReceived).to.be.at.most(2);
    });
  });

  describe("Content not starting at 0", () => {
    const { url, transport } = notStartingAt0ManifestInfos;
    it("should seek over discontinuity when loading in it", async function () {
      this.timeout(7000);
      player.loadVideo({ url,
                         transport,
                         autoPlay: true,
                         startAt: { position: 0 } });
      await waitForLoadedStateAfterLoadVideo(player);
      await sleep(2000);
      expect(player.getPosition()).to.be.above(12);
      expect(player.getPlayerState()).to.equal("PLAYING");
    });
  });
});
