import { expect } from "chai";
import RxPlayer from "../../src";
import VideoThumbnailLoader, {
  DASH_LOADER,
} from "../../src/experimental/tools/VideoThumbnailLoader";
import {
  manifestInfos,
  trickModeInfos,
} from "../contents/DASH_static_SegmentTimeline";
import textTrackInfos from "../contents/texttracks";
import imageInfos from "../contents/imagetracks";
import sleep from "../utils/sleep.js";
import waitForPlayerState, {
  waitForLoadedStateAfterLoadVideo,
} from "../utils/waitForPlayerState";

let player;

describe("Memory tests", () => {
  afterEach(() => {
    if (player != null) {
      player.dispose();
      window.gc();
    }
  });

  it("should not have a sensible memory leak after playing a content", async function () {
    if (
      window.performance == null ||
      window.performance.memory == null ||
      window.gc == null
    ) {
      // eslint-disable-next-line no-console
      console.warn("API not available. Skipping test.");
      return;
    }
    this.timeout(15 * 60 * 1000);
    player = new RxPlayer({ initialVideoBitrate: Infinity,
                            initialAudioBitrate: Infinity,
                            preferredTextTracks: [{ language: "fra",
                                                    closedCaption: true }] });
    window.gc();
    await sleep(5000);
    const initialMemory = window.performance.memory;

    player.loadVideo({ url: manifestInfos.url,
                       transport: manifestInfos.transport,
                       supplementaryTextTracks: [{ url: textTrackInfos.url,
                                                   language: "fra",
                                                   mimeType: "application/ttml+xml",
                                                   closedCaption: true }],
                       supplementaryImageTracks: [{ mimeType: "application/bif",
                                                    url: imageInfos.url }],
                       autoPlay: true });
    player.setPlaybackRate(4);
    await waitForPlayerState(player, "ENDED");

    player.stop();
    await sleep(5000);
    window.gc();
    await sleep(10000);
    const newMemory = window.performance.memory;
    const heapDifference = newMemory.usedJSHeapSize -
                           initialMemory.usedJSHeapSize;

    // eslint-disable-next-line no-console
    console.log(`
      ===========================================================
      | Current heap usage (B) | ${newMemory.usedJSHeapSize}
      | Initial heap usage (B) | ${initialMemory.usedJSHeapSize}
      | Difference (B)         | ${heapDifference}
    `);
    expect(heapDifference).to.be.below(2e6);
  });

  it("should not have a sensible memory leak after 5000 LOADED states and adaptive streaming", async function () {
    if (
      window.performance == null ||
      window.performance.memory == null ||
      window.gc == null
    ) {
      // eslint-disable-next-line no-console
      console.warn("API not available. Skipping test.");
      return;
    }
    this.timeout(30 * 60 * 1000);
    player = new RxPlayer({ initialVideoBitrate: Infinity,
                            initialAudiobitrate: Infinity,
                            preferredtexttracks: [{ language: "fra",
                                                    closedcaption: true }] });
    await sleep(1000);
    window.gc();
    await sleep(5000);
    const initialMemory = window.performance.memory;

    for (let i = 0; i < 5000; i++) {
      player.loadVideo({ url: manifestInfos.url,
                         transport: manifestInfos.transport,
                         supplementaryTextTracks: [{ url: textTrackInfos.url,
                                                     language: "fra",
                                                     mimeType: "application/ttml+xml",
                                                     closedCaption: true }],
                         supplementaryImageTracks: [{ mimeType: "application/bif",
                                                      url: imageInfos.url }],
                         autoPlay: true });
      await waitForLoadedStateAfterLoadVideo(player);
    }
    player.stop();

    await sleep(10000);
    window.gc();
    await sleep(80000);
    const newMemory = window.performance.memory;
    const heapDifference = newMemory.usedJSHeapSize -
                           initialMemory.usedJSHeapSize;

    // eslint-disable-next-line no-console
    console.log(`
      ===========================================================
      | Current heap usage (B) | ${newMemory.usedJSHeapSize}
      | Initial heap usage (B) | ${initialMemory.usedJSHeapSize}
      | Difference (B)         | ${heapDifference}
    `);
    expect(heapDifference).to.be.below(12e6);
  });

  it("should not have a sensible memory leak after 100000 instances of the RxPlayer", async function () {
    if (
      window.performance == null ||
      window.performance.memory == null ||
      window.gc == null
    ) {
      // eslint-disable-next-line no-console
      console.warn("API not available. Skipping test.");
      return;
    }
    this.timeout(45 * 60 * 1000);
    window.gc();
    await sleep(5000);
    const initialMemory = window.performance.memory;
    for (let i = 0; i < 100000; i++) {
      player = new RxPlayer({
        initialVideoBitrate: Infinity,
        initialAudiobitrate: Infinity,
        preferredtexttracks: [{ language: "fra", closedcaption: true }],
      });
      player.dispose();
    }
    await sleep(10000);
    window.gc();
    await sleep(120000);
    const newMemory = window.performance.memory;
    const heapDifference = newMemory.usedJSHeapSize -
                           initialMemory.usedJSHeapSize;

    // eslint-disable-next-line no-console
    console.log(`
      ===========================================================
      | Current heap usage (B) | ${newMemory.usedJSHeapSize}
      | Initial heap usage (B) | ${initialMemory.usedJSHeapSize}
      | Difference (B)         | ${heapDifference}
    `);
    expect(heapDifference).to.be.below(3e6);
  });

  it("should not have a sensible memory leak after many video quality switches", async function () {
    if (
      window.performance == null ||
      window.performance.memory == null ||
      window.gc == null
    ) {
      // eslint-disable-next-line no-console
      console.warn("API not available. Skipping test.");
      return;
    }
    this.timeout(15 * 60 * 1000);
    player = new RxPlayer({ initialVideoBitrate: Infinity,
                            initialAudiobitrate: Infinity,
                            preferredtexttracks: [{ language: "fra",
                                                    closedcaption: true }] });
    await sleep(1000);
    player.setWantedBufferAhead(5);
    player.setMaxBufferBehind(5);
    player.setMaxBufferAhead(15);
    player.loadVideo({ url: manifestInfos.url,
                       transport: manifestInfos.transport,
                       supplementaryTextTracks: [{ url: textTrackInfos.url,
                                                   language: "fra",
                                                   mimeType: "application/ttml+xml",
                                                   closedCaption: true }],
                       supplementaryImageTracks: [{ mimeType: "application/bif",
                                                    url: imageInfos.url }],
                       autoPlay: false });
    await waitForLoadedStateAfterLoadVideo(player);
    const videoBitrates = player.getAvailableVideoBitrates();
    if (videoBitrates.length <= 1) {
      throw new Error(
        "Not enough video bitrates to perform sufficiently pertinent tests"
      );
    }
    await sleep(5000);

    window.gc();
    await sleep(5000);
    const initialMemory = window.performance.memory;

    // Allows to alternate between two positions
    let seekToBeginning = false;
    for (let iterationIdx = 0; iterationIdx < 500; iterationIdx++) {
      if (seekToBeginning) {
        player.seekTo(0);
      } else {
        player.seekTo(20);
        seekToBeginning = true;
      }
      const bitrateIdx = iterationIdx % videoBitrates.length;
      player.setVideoBitrate(videoBitrates[bitrateIdx]);
      await sleep(1000);
    }
    await sleep(5000);
    window.gc();
    await sleep(10000);
    const newMemory = window.performance.memory;
    const heapDifference = newMemory.usedJSHeapSize -
                           initialMemory.usedJSHeapSize;

    // eslint-disable-next-line no-console
    console.log(`
      ===========================================================
      | Current heap usage (B) | ${newMemory.usedJSHeapSize}
      | Initial heap usage (B) | ${initialMemory.usedJSHeapSize}
      | Difference (B)         | ${heapDifference}
    `);
    expect(heapDifference).to.be.below(9e6);
  });

  // TODO FIXME This one failed after a chrome update, no idea why for now
  xit("should not have a sensible memory leak after 1000 setTime calls of VideoThumbnailLoader", async function() {
    if (window.performance == null ||
        window.performance.memory == null ||
        window.gc == null)
    {
      // eslint-disable-next-line no-console
      console.warn("API not available. Skipping test.");
      return;
    }
    this.timeout(5 * 60 * 1000);
    player = new RxPlayer({ initialVideoBitrate: Infinity,
                            initialAudiobitrate: Infinity,
                            preferredtexttracks: [{ language: "fra",
                                                    closedcaption: true }] });
    const vtlVideoElement = document.createElement("video");
    VideoThumbnailLoader.addLoader(DASH_LOADER);
    const videoThumbnailLoader =
      new VideoThumbnailLoader(vtlVideoElement, player);

    window.gc();
    const initialMemory = window.performance.memory;

    player.loadVideo({ url: trickModeInfos.url,
                       transport: trickModeInfos.transport,
                       autoPlay: true });
    await waitForLoadedStateAfterLoadVideo(player);

    for (let c = 0; c < 1000; c++) {
      await videoThumbnailLoader.setTime(c % 101);
    }

    player.stop();
    videoThumbnailLoader.dispose();
    await sleep(1000);
    window.gc();
    await sleep(500);
    const newMemory = window.performance.memory;
    const heapDifference = newMemory.usedJSHeapSize -
                           initialMemory.usedJSHeapSize;

    // eslint-disable-next-line no-console
    console.log(`
      ===========================================================
      | Current heap usage (B) | ${newMemory.usedJSHeapSize}
      | Initial heap usage (B) | ${initialMemory.usedJSHeapSize}
      | Difference (B)         | ${heapDifference}
    `);
    expect(heapDifference).to.be.below(1e6);
  });
});
