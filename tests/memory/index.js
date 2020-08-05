import { expect } from "chai";
import RxPlayer from "../../src";
import { manifestInfos } from "../contents/DASH_static_SegmentTimeline";
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
    }
  });

  it("should not have a sensible memory leak after playing a content", async function() {
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
                            initialAudioBitrate: Infinity,
                            preferredTextTracks: [{ language: "fra",
                                                    closedCaption: true }] });
    window.gc();
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
    await sleep(1000);
    window.gc();
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
    expect(heapDifference).to.be.below(1e7);
  });

  it("should not have a sensible memory leak after 1000 LOADED states and adaptive streaming", async function() {
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
                            initialaudiobitrate: Infinity,
                            preferredtexttracks: [{ language: "fra",
                                                    closedcaption: true }] });
    window.gc();
    const initialMemory = window.performance.memory;

    for (let i = 0; i < 1000; i++) {
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

    await sleep(1000);
    window.gc();
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
    expect(heapDifference).to.be.below(1e7);
  });
});
