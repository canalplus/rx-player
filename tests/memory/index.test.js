import { expect, describe, afterEach, test } from "../simple-test-lib";
// TODO: rely on `dist` instead
import RxPlayer from "../../src";
import VideoThumbnailLoader, {
  DASH_LOADER,
} from "../../src/experimental/tools/VideoThumbnailLoader";
import {
  manifestInfos,
  trickModeInfos,
} from "../contents/static/DASH_static_SegmentTimeline";
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

  test(
    "should not have a sensible memory leak after playing a content",
    {
      timeout: 15 * 60 * 1000,
      retry: 2,
    },
    async function () {
      assertMemoryApiAvailable();
      player = new RxPlayer({
        initialVideoBitrate: Infinity,
        initialAudioBitrate: Infinity,
      });
      window.gc();
      await sleep(5000);
      const initialMemory = window.performance.memory;

      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        autoPlay: true,
      });
      player.setPlaybackRate(4);
      await waitForPlayerState(player, "ENDED");

      player.stop();
      await sleep(5000);
      window.gc();
      await sleep(10000);
      const newMemory = window.performance.memory;
      displayResultAndCheckLimit({ maxMemoryUsage: 2e6, initialMemory, newMemory });
    },
  );

  test(
    "should not have a sensible memory leak after 5000 LOADED states and adaptive streaming",
    {
      timeout: 10 * 60 * 1000,
      retry: 2,
    },
    async function () {
      assertMemoryApiAvailable();
      player = new RxPlayer({
        initialVideoBitrate: Infinity,
        initialAudiobitrate: Infinity,
      });
      await sleep(1000);
      window.gc();
      await sleep(5000);
      const initialMemory = window.performance.memory;

      for (let i = 0; i < 5000; i++) {
        player.loadVideo({
          url: manifestInfos.url,
          transport: manifestInfos.transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
      }
      player.stop();

      await sleep(5000);
      window.gc();
      await sleep(15000);
      const newMemory = window.performance.memory;
      displayResultAndCheckLimit({ maxMemoryUsage: 3e6, initialMemory, newMemory });
    },
  );

  test(
    "should not have a sensible memory leak after 50000 instances of the RxPlayer",
    {
      timeout: 30 * 60 * 1000,
      retry: 2,
    },
    async function () {
      assertMemoryApiAvailable();
      window.gc();
      await sleep(5000);
      const initialMemory = window.performance.memory;
      for (let i = 0; i < 50000; i++) {
        player = new RxPlayer({
          initialVideoBitrate: Infinity,
          initialAudiobitrate: Infinity,
          preferredtexttracks: [{ language: "fra", closedcaption: true }],
        });
        player.dispose();
      }
      await sleep(5000);
      window.gc();
      await sleep(70000);
      const newMemory = window.performance.memory;
      displayResultAndCheckLimit({ maxMemoryUsage: 2e6, initialMemory, newMemory });
    },
  );

  test(
    "should not have a sensible memory leak after many video quality switches in lazy mode",
    {
      timeout: 30 * 60 * 1000,
      retry: 2,
    },
    async function () {
      assertMemoryApiAvailable();
      const { initialMemory, newMemory } = await runQualitySwitchTest("lazy");
      displayResultAndCheckLimit({ maxMemoryUsage: 2.5e6, initialMemory, newMemory });
    },
  );

  test(
    "should not have a sensible memory leak after many video quality switches in reload mode",
    {
      timeout: 30 * 60 * 1000,
      retry: 2,
    },
    async function () {
      assertMemoryApiAvailable();
      const { initialMemory, newMemory } = await runQualitySwitchTest("reload");
      displayResultAndCheckLimit({ maxMemoryUsage: 2e6, initialMemory, newMemory });
    },
  );

  // TODO FIXME This one failed after a chrome update, no idea why for now
  test.skip(
    "should not have a sensible memory leak after 1000 setTime calls of VideoThumbnailLoader",
    {
      timeout: 5 * 60 * 1000,
      retry: 2,
    },
    async function () {
      assertMemoryApiAvailable();
      player = new RxPlayer({
        initialVideoBitrate: Infinity,
        initialAudiobitrate: Infinity,
      });
      const vtlVideoElement = document.createElement("video");
      VideoThumbnailLoader.addLoader(DASH_LOADER);
      const videoThumbnailLoader = new VideoThumbnailLoader(vtlVideoElement, player);
      await sleep(1000);
      window.gc();
      await sleep(10000);
      const initialMemory = window.performance.memory;

      player.loadVideo({
        url: trickModeInfos.url,
        transport: trickModeInfos.transport,
        autoPlay: true,
      });
      await waitForLoadedStateAfterLoadVideo(player);

      for (let c = 0; c < 1000; c++) {
        await videoThumbnailLoader.setTime(c % 101);
      }

      player.stop();
      videoThumbnailLoader.dispose();
      await sleep(5000);
      window.gc();
      await sleep(10000);
      const newMemory = window.performance.memory;
      displayResultAndCheckLimit({ maxMemoryUsage: 1e6, initialMemory, newMemory });
    },
  );
});

/**
 * Check that the required memory API for memory tests are available.
 * Throw if that's not the case.
 */
function assertMemoryApiAvailable() {
  if (
    window.performance == null ||
    window.performance.memory == null ||
    window.gc == null
  ) {
    throw new Error("Required Memory API not available. Skipping test.");
  }
}

/**
 * Display memory usage information in stdout and check that the difference
 * between the new usage and the initial one is below the given `maxMemoryUsage`
 * in bytes.
 *
 * Throw if that's not the case.
 * @param {Object} param0
 * @param {number} param0.maxMemoryUsage - Memory difference from which this
 * function will throw.
 * @param {*} param0.initialMemory - Memory measure before the test.
 * @param {*} param0.newMemory - Memory measure at the end of the test.
 */
function displayResultAndCheckLimit({ maxMemoryUsage, initialMemory, newMemory }) {
  const heapDifference = newMemory.usedJSHeapSize - initialMemory.usedJSHeapSize;

  // eslint-disable-next-line no-console
  console.log(`
      ===========================================================
      | Current heap usage (B) | ${newMemory.usedJSHeapSize}
      | Initial heap usage (B) | ${initialMemory.usedJSHeapSize}
      | Difference (B)         | ${heapDifference}
    `);
  expect(heapDifference).to.be.below(maxMemoryUsage);
}

/**
 * Get JS heap usage before and after doing a lot of video quality switches with
 * the given switchingMode.
 * @param {string} [switchingMode="lazy"]
 * @returns {Object}
 */
async function runQualitySwitchTest(switchingMode = "lazy") {
  const maxIterations = 1000;
  player = new RxPlayer({
    preferredtexttracks: [{ language: "fra", closedcaption: true }],
  });
  await sleep(1000);
  player.setWantedBufferAhead(5);
  player.loadVideo({
    url: manifestInfos.url,
    transport: manifestInfos.transport,
    autoPlay: false,
  });
  await waitForLoadedStateAfterLoadVideo(player);
  const videoTrack = player.getVideoTrack();

  // Sadly, that quality seems to have some issues
  // TODO: Other content / fix that one / recheck that one
  const representations = videoTrack.representations.filter(
    (r) => r.id !== "video=1193000",
  );
  if (representations.length <= 1) {
    throw new Error(
      "Not enough video Representations to perform sufficiently pertinent tests",
    );
  }
  await sleep(1000);
  window.gc();
  await sleep(5000);
  const initialMemory = window.performance.memory;

  for (let iterationIdx = 0; iterationIdx < maxIterations; iterationIdx++) {
    // Do a flush, though unknown if it has an impact
    player.seekTo(0);

    const repIdx = iterationIdx % representations.length;
    const repId = representations[repIdx].id;
    player.lockVideoRepresentations({
      representations: [repId],
      switchingMode,
    });
    await sleep(500);
    await waitForQuality(player, repId);
  }
  await sleep(5000);
  window.gc();
  await sleep(10000);
  const newMemory = window.performance.memory;
  return { newMemory, initialMemory };
}

function waitForQuality(player, repId) {
  return new Promise((resolve, reject) => {
    const reCheck = () => {
      if (player.getVideoRepresentation()?.id === repId && player.isContentLoaded()) {
        player.removeEventListener("videoRepresentationChange", reCheck);
        player.removeEventListener("playerStateChange", reCheck);
        resolve();
      } else {
        const err = player.getError();
        if (err !== null) {
          reject(
            `RxPlayer failed on iteration ${iterationIdx} with an error: ${err.toString()}`,
          );
        }
      }
    };
    reCheck();
    player.addEventListener("videoRepresentationChange", reCheck);
    player.addEventListener("playerStateChange", reCheck);
  });
}
