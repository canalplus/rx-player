import { expect } from "chai";
import { describe, beforeEach, afterEach, it } from "vitest";
import { manifestInfosEndNumber as numberBasedManifestInfos } from "../../contents/DASH_static_number_based_SegmentTimeline";
import { endNumberManifestInfos as templateManifestinfos } from "../../contents/DASH_static_SegmentTemplate_Multi_Periods";
import { segmentTimelineEndNumber as timeBasedManifestInfos } from "../../contents/DASH_static_SegmentTimeline";
import RxPlayer from "../../../dist/es2017";
import waitForState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";
import { lockLowestBitrates } from "../../utils/bitrates";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";

let player;

describe("end number", function () {
  beforeEach(() => {
    player = new RxPlayer({ stopAtEnd: false });
  });

  afterEach(() => {
    player.dispose();
  });

  it("should calculate the right duration according to endNumber on a number-based SegmentTemplate", async function () {
    this.timeout(3000);
    lockLowestBitrates(player);
    player.setWantedBufferAhead(15);
    const { url, transport } = templateManifestinfos;

    player.loadVideo({
      url,
      transport,
      autoPlay: false,
    });
    await checkAfterSleepWithBackoff({ maxTimeMs: 500 }, () => {
      expect(player.getMinimumPosition()).to.eql(0);
      expect(player.getMaximumPosition()).to.eql(120 + 30);
    });
  });

  it("should not load segment later than the end number on a time-based SegmentTimeline", async function () {
    this.timeout(15000);
    lockLowestBitrates(player);
    const { url, transport } = timeBasedManifestInfos;

    const requestedSegments = [];
    const segmentLoader = (info, callbacks) => {
      requestedSegments.push(info.url);
      callbacks.fallback();
    };
    player.setWantedBufferAhead(1);
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      segmentLoader,
    });
    await checkAfterSleepWithBackoff({ maxTimeMs: 50 }, () => {
      expect(player.getMaximumPosition()).to.be.closeTo(20, 1);
      expect(requestedSegments.length).to.equal(4); // Init+media of audio+video
    });
    if (player.getPlayerState() !== "LOADED") {
      await waitForLoadedStateAfterLoadVideo(player);
    }
    player.seekTo(19);
    player.play();
    await checkAfterSleepWithBackoff({ maxTimeMs: 10 }, () => {
      player.setWantedBufferAhead(Infinity);
      expect(requestedSegments.length).to.equal(6); // + last audio + video
    });
    await checkAfterSleepWithBackoff({ maxTimeMs: 50 }, () => {
      expect(requestedSegments.length).to.equal(6); // + last audio + video
    });
    await waitForState(player, "ENDED", ["BUFFERING", "RELOADING", "PLAYING"]);
    expect(player.getPosition()).to.be.closeTo(20, 1);
  });

  it("should calculate the right duration on a number-based SegmentTimeline", async function () {
    this.timeout(10000);
    lockLowestBitrates(player);
    player.setWantedBufferAhead(15);
    const { url, transport } = numberBasedManifestInfos;

    player.loadVideo({
      url,
      transport,
      autoPlay: true,
    });
    await checkAfterSleepWithBackoff({ maxTimeMs: 100 }, () => {
      expect(player.getMaximumPosition()).to.be.closeTo(20, 1);
    });
  });
});
