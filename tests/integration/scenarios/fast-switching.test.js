import { describe, beforeEach, afterEach, it, expect } from "vitest";
import { manifestInfos } from "../../contents/DASH_static_SegmentTimeline";
import RxPlayer from "../../../dist/es2017";
import sleep from "../../utils/sleep.js";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";
import { lockHighestBitrates, lockLowestBitrates } from "../../utils/bitrates";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";

describe("Fast-switching", function () {
  let player;

  beforeEach(() => {
    player = new RxPlayer();
  });

  afterEach(() => {
    player.dispose();
  });

  const { url, transport } = manifestInfos;

  it("should enable fast-switching by default", async function () {
    lockLowestBitrates(player);
    player.setWantedBufferAhead(10);
    player.loadVideo({ url, transport, autoPlay: false });
    await waitForLoadedStateAfterLoadVideo(player);
    await checkAfterSleepWithBackoff({}, () => {
      expect(player.getCurrentBufferGap()).to.be.above(9);
    });

    player.setWantedBufferAhead(30);
    lockHighestBitrates(player, "lazy");
    await checkAfterSleepWithBackoff({}, () => {
      const videoSegmentBuffered = player
        .__priv_getSegmentSinkContent("video")
        .map(({ infos }) => {
          return {
            bitrate: infos.representation.bitrate,
            time: infos.segment.time,
            end: infos.segment.end,
          };
        });
      expect(videoSegmentBuffered.length).to.be.at.least(3);
      expect(videoSegmentBuffered[1].bitrate).to.equal(1996000);
      expect(videoSegmentBuffered[2].bitrate).to.equal(1996000);
    });
  });

  it("should enable fast-switching if explicitely enabled", async function () {
    lockLowestBitrates(player);
    player.setWantedBufferAhead(10);
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      enableFastSwitching: true,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    await checkAfterSleepWithBackoff({}, () => {
      expect(player.getCurrentBufferGap()).to.be.above(9);
    });

    player.setWantedBufferAhead(30);
    lockHighestBitrates(player, "lazy");
    await checkAfterSleepWithBackoff({}, () => {
      const videoSegmentBuffered = player
        .__priv_getSegmentSinkContent("video")
        .map(({ infos }) => {
          return {
            bitrate: infos.representation.bitrate,
            time: infos.segment.time,
            end: infos.segment.end,
          };
        });
      expect(videoSegmentBuffered.length).to.be.at.least(3);
      expect(videoSegmentBuffered[1].bitrate).to.equal(1996000);
      expect(videoSegmentBuffered[2].bitrate).to.equal(1996000);
    });
  });

  it("should disable fast-switching if explicitely disabled", async function () {
    lockLowestBitrates(player);
    player.setWantedBufferAhead(10);
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      enableFastSwitching: false,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    await checkAfterSleepWithBackoff({}, () => {
      expect(player.getCurrentBufferGap()).to.be.above(9);
    });
    player.setWantedBufferAhead(30);
    lockHighestBitrates(player, "lazy");
    await sleep(1000);
    const videoSegmentBuffered = player
      .__priv_getSegmentSinkContent("video")
      .map(({ infos }) => {
        return {
          bitrate: infos.representation.bitrate,
          time: infos.segment.time,
          end: infos.segment.end,
        };
      });
    expect(videoSegmentBuffered.length).to.be.at.least(3);
    expect(videoSegmentBuffered[0].bitrate).to.equal(400000);
    expect(videoSegmentBuffered[1].bitrate).to.equal(400000);
    expect(videoSegmentBuffered[2].bitrate).to.equal(400000);
  }, 3000);
});
