import { expect } from "chai";
import sinon from "sinon";
import RxPlayer from "../../src";
import {
  manifestInfos,
  URLs,
} from "../contents/DASH_static_SegmentTimeline";
import mockRequests from "../utils/mock_requests.js";
import sleep from "../utils/sleep.js";
import waitForPlayerState, {
  waitForLoadedStateAfterLoadVideo,
} from "../utils/waitForPlayerState";

let player;
let fakeServer;

const TEXT_URL = "https://gist.githubusercontent.com/anotherhale/676a72edc84ca3a37c0c/raw/710ab345757a84c11194b9c6608bc4737bab6b2d/subtitle_example.xml";
const IMAGE_URL = "http://dash-vod-aka-test.canal-bis.com/test/bif/index.bif";

describe("Memory tests", () => {
  beforeEach(() => {
    fakeServer = sinon.fakeServer.create();
  });

  afterEach(() => {
    player.dispose();
    fakeServer.restore();
  });

  it("should not have a sensible memory leak after playing a content", async function() {
    if (
      window.performance == null ||
      window.performance.memory == null ||
      window.gc == null
    ) {
      // eslint-disable-next-line no-console
      console.warn("API not available. Skipping test.");
      return;
    }
    this.timeout(5 * 60 * 1000);
    mockRequests(fakeServer, URLs);
    fakeServer.respondWith("GET", IMAGE_URL, (xhr) => {
      const res = require("raw-loader!../contents/imagetracks/example.bif");
      xhr.respond(200, { "Content-Type": "application/bif" }, res);
    });
    fakeServer.respondWith("GET", TEXT_URL, (xhr) => {
      const res = require("raw-loader!../contents/texttracks/subtitle_example.xml");
      xhr.respond(200, { "Content-Type": "application/ttml+xml" }, res);
    });
    fakeServer.autoRespond = true;

    player = new RxPlayer({
      initialVideoBitrate: Infinity,
      initialAudioBitrate: Infinity,
    });
    window.gc();
    const initialMemory = window.performance.memory;

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
      prefferedTextTracks: {
        language: "fra",
        closedCaption: true,
      },
      supplementaryTextTracks: [{
        url: "",
        language: "fra",
        mimeType: "application/ttml+xml",
        closedCaption: true,
      }],
      supplementaryImageTracks: [{
        mimeType: "application/bif",
        url: "",
      }],
      autoPlay: true,
    });
    player.setPlaybackRate(4);
    await waitForPlayerState(player, "ENDED");

    fakeServer.restore();
    fakeServer.reset();
    await sleep(1000);
    window.gc();
    await sleep(1000);

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

  it("should not have a sensible memory leak after 1000 LOADED states and adaptive streaming", async function() {
    if (
      window.performance == null ||
      window.performance.memory == null ||
      window.gc == null
    ) {
      // eslint-disable-next-line no-console
      console.warn("API not available. Skipping test.");
      return;
    }
    this.timeout(5 * 60 * 1000);
    mockRequests(fakeServer, URLs);
    fakeServer.respondWith("GET", IMAGE_URL, (xhr) => {
      const res = require("raw-loader!../contents/imagetracks/example.bif");
      xhr.respond(200, { "Content-Type": "application/bif" }, res);
    });
    fakeServer.respondWith("GET", TEXT_URL, (xhr) => {
      const res = require("raw-loader!../contents/texttracks/subtitle_example.xml");
      xhr.respond(200, { "Content-Type": "application/ttml+xml" }, res);
    });
    fakeServer.autoRespond = true;

    player = new RxPlayer({
      initialVideoBitrate: Infinity,
      initialAudioBitrate: Infinity,
    });
    window.gc();
    const initialMemory = window.performance.memory;

    for (let i = 0; i < 1000; i++) {
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        prefferedTextTracks: [{
          language: "fra",
          closedCaption: true,
        }],
        supplementaryTextTracks: [{
          url: "",
          language: "fra",
          mimeType: "application/ttml+xml",
          closedCaption: true,
        }],
        supplementaryImageTracks: [{
          mimeType: "application/bif",
          url: "",
        }],
        autoPlay: true,
      });
      await waitForLoadedStateAfterLoadVideo(player);
    }
    player.stop();

    fakeServer.restore();
    fakeServer.reset();
    await sleep(1000);
    window.gc();
    await sleep(1000);

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
    expect(heapDifference).to.be.below(4e6);
  });
});
