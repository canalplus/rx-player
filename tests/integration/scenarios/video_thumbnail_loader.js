import RxPlayer from "../../../dist/es2017";
import VideoThumbnailLoader, {
  DASH_LOADER,
} from "../../../dist/es2017/experimental/tools/VideoThumbnailLoader";
import {
  manifestInfos,
  trickModeInfos,
} from "../../contents/DASH_static_SegmentTimeline";
import sleep from "../../utils/sleep";
import { describe, beforeEach, afterEach, it, expect } from "vitest";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff";

describe("Video Thumbnail Loader", () => {
  let rxPlayer;
  let videoThumbnailLoader;
  const videoElement = document.createElement("video");

  beforeEach(() => {
    rxPlayer = new RxPlayer();
    videoThumbnailLoader = new VideoThumbnailLoader(videoElement, rxPlayer);
  });
  afterEach(() => {
    rxPlayer.dispose();
    videoThumbnailLoader.dispose();
  });

  it("should not work when no fetcher was imported", async function () {
    const wantedThumbnail = { time: 1, range: [0, 4] };
    rxPlayer.loadVideo({ url: trickModeInfos.url, transport: "dash" });
    await waitForLoadedStateAfterLoadVideo(rxPlayer);

    let error;
    try {
      await videoThumbnailLoader.setTime(wantedThumbnail.time);
    } catch (err) {
      error = err;
    }
    expect(error).not.to.equal(undefined);
    expect(error.message).to.equal(
      "VideoThumbnailLoaderError: No imported " + "loader for this transport type: dash",
    );
  });

  it("should not work when no thumbnail track", async () => {
    VideoThumbnailLoader.addLoader(DASH_LOADER);
    rxPlayer.loadVideo({ url: manifestInfos.url, transport: "dash" });
    await waitForLoadedStateAfterLoadVideo(rxPlayer);

    let time;
    let error;
    try {
      time = await videoThumbnailLoader.setTime(1);
    } catch (err) {
      error = err;
    }
    expect(error).not.to.equal(undefined);
    expect(time).to.equal(undefined);
    expect(error.message).to.equal("Couldn't find a trickmode track for this time.");
  });

  it("should not work when no period at given time", async () => {
    VideoThumbnailLoader.addLoader(DASH_LOADER);
    rxPlayer.loadVideo({ url: trickModeInfos.url, transport: "dash" });
    await waitForLoadedStateAfterLoadVideo(rxPlayer);

    const manifest = rxPlayer.__priv_getManifest();

    let time;
    let error;
    try {
      time = await videoThumbnailLoader.setTime(manifest.getMaximumSafePosition() + 10);
    } catch (err) {
      error = err;
    }
    expect(error).not.to.equal(undefined);
    expect(time).to.equal(undefined);
    expect(error.message).to.equal("Couldn't find a trickmode track for this time.");
  });

  it("should load one thumbnail", async () => {
    VideoThumbnailLoader.addLoader(DASH_LOADER);
    const wantedThumbnail = { time: 1, range: [0, 4] };
    rxPlayer.loadVideo({ url: trickModeInfos.url, transport: "dash" });
    await waitForLoadedStateAfterLoadVideo(rxPlayer);

    let time;
    let error;
    try {
      time = await videoThumbnailLoader.setTime(wantedThumbnail.time);
    } catch (err) {
      error = err;
    }
    expect(error).to.equal(undefined);
    expect(time).to.equal(wantedThumbnail.time);
    expect(videoElement.buffered.length).to.equal(1);
    expect(videoElement.buffered.start(0)).to.be.closeTo(wantedThumbnail.range[0], 0.01);
    expect(videoElement.buffered.end(0)).to.be.closeTo(wantedThumbnail.range[1], 0.01);
  });

  it("should load several thumbnails", async () => {
    VideoThumbnailLoader.addLoader(DASH_LOADER);
    const wantedThumbnail1 = { time: 1, range: [0, 4] };
    const wantedThumbnail2 = { time: 30, range: [28.028, 32.028] };
    rxPlayer.loadVideo({ url: trickModeInfos.url, transport: "dash" });
    await waitForLoadedStateAfterLoadVideo(rxPlayer);

    let time;
    let error;
    try {
      time = await videoThumbnailLoader.setTime(wantedThumbnail1.time);
    } catch (err) {
      error = err;
    }
    expect(error).to.equal(undefined);
    expect(time).to.equal(wantedThumbnail1.time);
    expect(videoElement.buffered.length).to.equal(1);
    expect(videoElement.buffered.start(0)).to.be.closeTo(wantedThumbnail1.range[0], 0.01);
    expect(videoElement.buffered.end(0)).to.be.closeTo(wantedThumbnail1.range[1], 0.01);

    time = undefined;
    error = undefined;

    try {
      time = await videoThumbnailLoader.setTime(wantedThumbnail2.time);
    } catch (err) {
      error = err;
    }
    expect(error).to.equal(undefined);
    expect(time).to.equal(wantedThumbnail2.time);
    expect(videoElement.buffered.length).to.equal(2);
    expect(videoElement.buffered.start(0)).to.be.closeTo(wantedThumbnail1.range[0], 0.01);
    expect(videoElement.buffered.end(0)).to.be.closeTo(wantedThumbnail1.range[1], 0.01);
    expect(videoElement.buffered.start(1)).to.be.closeTo(wantedThumbnail2.range[0], 0.01);
    expect(videoElement.buffered.end(1)).to.be.closeTo(wantedThumbnail2.range[1], 0.01);
  });

  it("should set twice the same thumbnail (consecutively)", async () => {
    VideoThumbnailLoader.addLoader(DASH_LOADER);
    const wantedThumbnail1 = { time: 1, range: [0, 4] };
    const manifestLoader = (man, callbacks) => {
      expect(trickModeInfos.url).to.equal(man.url);
      callbacks.fallback();
    };
    const requestedSegments = [];
    const segmentLoader = (info, callbacks) => {
      requestedSegments.push(info.url);
      callbacks.fallback();
    };
    rxPlayer.setWantedBufferAhead(1);
    rxPlayer.loadVideo({
      url: trickModeInfos.url,
      transport: "dash",
      manifestLoader,
      segmentLoader,
    });
    await waitForLoadedStateAfterLoadVideo(rxPlayer);

    let time;
    let error;

    expect(requestedSegments).not.to.be.empty;
    try {
      requestedSegments.length = 0;
      time = await videoThumbnailLoader.setTime(wantedThumbnail1.time);
      expect(requestedSegments).to.be.empty;
    } catch (err) {
      error = err;
    }
    expect(error).to.equal(undefined);
    expect(time).to.equal(wantedThumbnail1.time);
    expect(videoElement.buffered.length).to.equal(1);
    expect(videoElement.buffered.start(0)).to.be.closeTo(wantedThumbnail1.range[0], 0.01);
    expect(videoElement.buffered.end(0)).to.be.closeTo(wantedThumbnail1.range[1], 0.01);

    time = undefined;
    error = undefined;

    try {
      time = await videoThumbnailLoader.setTime(wantedThumbnail1.time);
    } catch (err) {
      error = err;
    }
    expect(error).to.equal(undefined);
    expect(time).to.equal(wantedThumbnail1.time);
    expect(videoElement.buffered.length).to.equal(1);
    expect(videoElement.buffered.start(0)).to.be.closeTo(wantedThumbnail1.range[0], 0.01);
    expect(videoElement.buffered.end(0)).to.be.closeTo(wantedThumbnail1.range[1], 0.01);
  });

  it("should set several times the same thumbnail (at the same time)", async () => {
    VideoThumbnailLoader.addLoader(DASH_LOADER);
    const wantedThumbnail1 = { time: 1, range: [0, 4] };
    const manifestLoader = (man, callbacks) => {
      expect(trickModeInfos.url).to.equal(man.url);
      callbacks.fallback();
    };
    const requestedSegments = [];
    const segmentLoader = (info, callbacks) => {
      requestedSegments.push(info.url);
      callbacks.fallback();
    };
    rxPlayer.setWantedBufferAhead(1);
    rxPlayer.loadVideo({
      url: trickModeInfos.url,
      transport: "dash",
      segmentLoader,
      manifestLoader,
    });
    await waitForLoadedStateAfterLoadVideo(rxPlayer);
    videoThumbnailLoader.setTime(wantedThumbnail1.time);
    videoThumbnailLoader.setTime(wantedThumbnail1.time);
    videoThumbnailLoader.setTime(wantedThumbnail1.time);
    videoThumbnailLoader.setTime(wantedThumbnail1.time);
    videoThumbnailLoader.setTime(wantedThumbnail1.time);

    await checkAfterSleepWithBackoff({ maxTimeMs: 75 }, () => {
      expect(requestedSegments).to.have.length(4);
      expect(requestedSegments).to.include(
        "http://127.0.0.1:3000/DASH_static_SegmentTimeline/media/dash/ateam-video=400000.dash",
      );
      expect(requestedSegments).to.include(
        "http://127.0.0.1:3000/DASH_static_SegmentTimeline/media/dash/ateam-video=400000-0.dash",
      );
      expect(videoElement.buffered.length).to.equal(1);
      expect(videoElement.buffered.start(0)).to.be.closeTo(
        wantedThumbnail1.range[0],
        0.01,
      );
      expect(videoElement.buffered.end(0)).to.be.closeTo(wantedThumbnail1.range[1], 0.01);
    });
  });

  it("should not re-trigger common segments requests when loading contiguous thumbnails", async () => {
    VideoThumbnailLoader.addLoader(DASH_LOADER);
    const wantedThumbnail1 = { time: 1, range: [0, 8] };
    const requestedVideoSegments = [];
    const segmentLoader = (info, callbacks) => {
      if (info.trackType === "video") {
        requestedVideoSegments.push(info.url);
      }
      callbacks.fallback();
    };
    rxPlayer.loadVideo({
      url: trickModeInfos.url,
      transport: "dash",
      segmentLoader,
    });
    await waitForLoadedStateAfterLoadVideo(rxPlayer);

    rxPlayer.setWantedBufferAhead(0);
    videoThumbnailLoader.setTime(wantedThumbnail1.time);
    let before;
    await checkAfterSleepWithBackoff({ maxTimeMs: 200 }, () => {
      before = requestedVideoSegments.length;
      expect(requestedVideoSegments).to.include(
        "http://127.0.0.1:3000/DASH_static_SegmentTimeline/media/dash/ateam-video=400000-0.dash",
      );
      expect(requestedVideoSegments).to.include(
        "http://127.0.0.1:3000/DASH_static_SegmentTimeline/media/dash/ateam-video=400000-4004.dash",
      );
      videoThumbnailLoader.setTime(wantedThumbnail1.time + 2);
    });
    await sleep(75);
    expect(requestedVideoSegments.length).to.equal(before);

    expect(videoElement.buffered.length).to.equal(1);
    expect(videoElement.buffered.start(0)).to.be.closeTo(wantedThumbnail1.range[0], 0.01);
    expect(videoElement.buffered.end(0)).to.be.closeTo(wantedThumbnail1.range[1], 0.01);
  });

  it("should abort a job when starting another", async () => {
    VideoThumbnailLoader.addLoader(DASH_LOADER);
    const wantedThumbnail1 = { time: 1, range: [0, 4] };
    const wantedThumbnail2 = { time: 11, range: [8.008, 16.008] }; // load two segments
    rxPlayer.loadVideo({ url: trickModeInfos.url, transport: "dash" });
    await waitForLoadedStateAfterLoadVideo(rxPlayer);

    let error1;
    let error2;
    let time;

    videoThumbnailLoader.setTime(wantedThumbnail1.time).catch((err) => {
      error1 = err;
    });

    try {
      time = await videoThumbnailLoader.setTime(wantedThumbnail2.time);
    } catch (err) {
      error2 = err;
    }

    expect(error1).not.to.equal(undefined);
    expect(error1.message).to.equal("VideoThumbnailLoaderError: Aborted job.");
    expect(error2).to.equal(undefined);
    expect(time).to.equal(wantedThumbnail2.time);
    expect(videoElement.buffered.length).to.equal(1);
    expect(videoElement.buffered.start(0)).to.be.closeTo(wantedThumbnail2.range[0], 0.01);
    expect(videoElement.buffered.end(0)).to.be.closeTo(wantedThumbnail2.range[1], 0.01);
  });

  it("should empty buffer after dispose", async () => {
    VideoThumbnailLoader.addLoader(DASH_LOADER);
    const wantedThumbnail = { time: 1, range: [0, 4] };
    rxPlayer.loadVideo({ url: trickModeInfos.url, transport: "dash" });
    await waitForLoadedStateAfterLoadVideo(rxPlayer);

    let time;
    let error;
    try {
      time = await videoThumbnailLoader.setTime(wantedThumbnail.time);
    } catch (err) {
      error = err;
    }
    expect(error).to.equal(undefined);
    expect(time).to.equal(wantedThumbnail.time);
    expect(videoElement.buffered.length).to.equal(1);
    expect(videoElement.buffered.start(0)).to.be.closeTo(wantedThumbnail.range[0], 0.01);
    expect(videoElement.buffered.end(0)).to.be.closeTo(wantedThumbnail.range[1], 0.01);

    videoThumbnailLoader.dispose();

    expect(videoElement.buffered.length).to.equal(0);
  });
});
