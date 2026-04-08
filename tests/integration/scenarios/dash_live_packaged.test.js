import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import RxPlayer from "../../../dist/es2017";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";
import sleep from "../../utils/sleep.js";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";

const START_PACKAGER_URL =
  "http://" +
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  "/start_packager";

const STOP_PACKAGER_URL =
  "http://" +
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  "/stop_packager";

const PACKAGER_STATUS_URL =
  "http://" +
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  "/packager_status";

const TEXT_TRACK_CYCLE_DURATION = 4;
const TEXT_TRACK_VISIBLE_OFFSET = 1;
const TEXT_TRACK_GAP_OFFSET = 3;

function createTextTrackElement() {
  const element = document.createElement("div");
  element.style.width = "640px";
  element.style.height = "360px";
  element.style.position = "absolute";
  element.style.left = "0";
  element.style.top = "0";
  document.body.appendChild(element);
  return element;
}

function getFirstPositionInCycle(start, cycleOffset) {
  const cycleIndex = Math.floor(start / TEXT_TRACK_CYCLE_DURATION);
  let candidate = cycleIndex * TEXT_TRACK_CYCLE_DURATION + cycleOffset;
  if (candidate < start) {
    candidate += TEXT_TRACK_CYCLE_DURATION;
  }
  return candidate;
}

function getSubtitleWindowPositions(minimumPosition, maximumPosition) {
  const visiblePosition = getFirstPositionInCycle(
    minimumPosition + 0.25,
    TEXT_TRACK_VISIBLE_OFFSET,
  );
  const gapPosition = getFirstPositionInCycle(visiblePosition + 1, TEXT_TRACK_GAP_OFFSET);
  if (gapPosition >= maximumPosition - 1) {
    throw new Error(
      `Could not find subtitle validation window in live range [${minimumPosition}, ${maximumPosition}]`,
    );
  }
  return { visiblePosition, gapPosition };
}

async function waitForPlayerToReachPosition(player, wantedPosition) {
  player.seekTo(wantedPosition);
  await checkAfterSleepWithBackoff({ maxTimeMs: 5000, stepMs: 100 }, () => {
    expect(Math.abs(player.getPosition() - wantedPosition)).toBeLessThanOrEqual(0.75);
  });
}

async function waitForRenderedTextTrack(textTrackElement) {
  await checkAfterSleepWithBackoff({ maxTimeMs: 4000, stepMs: 100 }, () => {
    expect(textTrackElement.childElementCount).toBeGreaterThan(0);
    expect(textTrackElement.getElementsByTagName("div").length).toBeGreaterThan(0);
    expect(textTrackElement.textContent.trim()).toContain("live cue");
  });
}

async function waitForNoRenderedTextTrack(textTrackElement) {
  await checkAfterSleepWithBackoff({ maxTimeMs: 4000, stepMs: 100 }, () => {
    expect(textTrackElement.childElementCount).toEqual(0);
    expect(textTrackElement.textContent.trim()).toEqual("");
  });
}

async function waitForPackagerReady() {
  let localMpdUrl;
  let localSegmentDuration;
  let localTimeShiftBufferDepth;
  let localHasTextTrack;
  while (true) {
    await sleep(1500);
    const statusRes = await fetch(PACKAGER_STATUS_URL);
    const status = await statusRes.json();
    if (!status.active) {
      throw new Error(
        "Live Packager failed to generate content.\n" +
          "Activate live packager logs for more info.",
      );
    }
    const mpdPath = status.info.mpdPath;
    localMpdUrl = `http://${__TEST_CONTENT_SERVER__.URL}:${__TEST_CONTENT_SERVER__.PORT}${mpdPath}`;
    localSegmentDuration = status.info.segmentDuration;
    localTimeShiftBufferDepth = status.info.timeShiftBufferDepth;
    localHasTextTrack = status.info.hasTextTrack;
    const res = await fetch(localMpdUrl);
    if (res.status >= 400) {
      if (res.status !== 404) {
        throw new Error(
          "Error while requesting generated MPD\n" +
            "Activate live packager logs for more info.",
        );
      }
    } else {
      break;
    }
  }
  await sleep((localTimeShiftBufferDepth ?? 1) * 1000);
  return {
    mpdUrl: localMpdUrl,
    segmentDuration: localSegmentDuration,
    hasTextTrack: localHasTextTrack,
  };
}

describe("DASH live packaged content", function () {
  let player;
  let mpdUrl;
  let alternateMpdUrl;
  let segmentDuration;
  let textTrackElement;

  beforeAll(
    async () => {
      await fetch(`${START_PACKAGER_URL}?enableTextTrack=1`, {
        method: "POST",
      });
      const readyInfos = await waitForPackagerReady();
      mpdUrl = readyInfos.mpdUrl;
      alternateMpdUrl = readyInfos.mpdUrl.replace("/live/", "/live-alt/");
      segmentDuration = readyInfos.segmentDuration;
    },

    (3600 / 2) * 1000,
  );

  afterAll(async () => {
    await fetch(STOP_PACKAGER_URL, { method: "POST" });

    // It can take a lot of time to stop
    await sleep(10000);
  });

  beforeEach(() => {
    player = new RxPlayer();
    textTrackElement = null;
  });

  afterEach(() => {
    player.dispose();
    if (textTrackElement !== null) {
      textTrackElement.remove();
      textTrackElement = null;
    }
  });

  it(
    "should use updated content URLs for the immediate and later manifest refreshes",
    {
      timeout: 30000,
    },
    async function () {
      const manifestRequestUrls = [];
      let playerError = null;
      const manifestLoader = (manifestInfo, callbacks) => {
        manifestRequestUrls.push(manifestInfo.url);
        callbacks.fallback();
      };

      player.addEventListener("error", (err) => {
        playerError = err;
      });

      player.loadVideo({
        url: mpdUrl,
        autoPlay: true,
        transport: "dash",
        minimumManifestUpdateInterval: 0,
        manifestLoader,
      });

      await waitForLoadedStateAfterLoadVideo(player);
      expect(manifestRequestUrls.length).toBeGreaterThan(0);
      expect(manifestRequestUrls[0]).toBe(mpdUrl);

      player.updateContentUrls([alternateMpdUrl], { refresh: true });

      await checkAfterSleepWithBackoff({ maxTimeMs: 7000, stepMs: 100 }, () => {
        expect(playerError).toBe(null);
        expect(manifestRequestUrls).toContain(alternateMpdUrl);
      });

      const firstAlternateIndex = manifestRequestUrls.indexOf(alternateMpdUrl);

      await checkAfterSleepWithBackoff({ maxTimeMs: 8000, stepMs: 200 }, () => {
        expect(playerError).toBe(null);
        expect(manifestRequestUrls.length).toBeGreaterThan(firstAlternateIndex + 1);
        expect(manifestRequestUrls[manifestRequestUrls.length - 1]).toBe(alternateMpdUrl);
      });

      expect(playerError).toBe(null);
      expect(player.isLive()).toBe(true);
      expect(player.getMaximumPosition() - player.getPosition()).toBeGreaterThan(0);
    },
  );

  // it(
  //   "should fetch, update and play the Manifest",
  //   {
  //     timeout: 150000,
  //   },
  //   async function () {
  //     let manifestLoaderCalledTimes = 0;
  //     let segmentLoaderLoaderCalledTimes = 0;
  //     const manifestLoader = (_manifestInfo, callbacks) => {
  //       manifestLoaderCalledTimes++;
  //       callbacks.fallback();
  //     };
  //     const segmentLoader = (_segmentInfo, callbacks) => {
  //       segmentLoaderLoaderCalledTimes++;
  //       callbacks.fallback();
  //     };
  //
  //     player.addEventListener("error", (err) => {
  //       // eslint-disable-next-line no-console
  //       console.error("RxPlayer encountered an error", err);
  //     });
  //
  //     player.loadVideo({
  //       url: mpdUrl,
  //       autoPlay: true,
  //       transport: "dash",
  //       manifestLoader,
  //       segmentLoader,
  //     });
  //     await waitForLoadedStateAfterLoadVideo(player);
  //     expect(player.isLive()).toEqual(true);
  //     const basePos = player.getPosition();
  //     const baseMin = player.getMinimumPosition();
  //     const baseMax = player.getMaximumPosition();
  //     expect(baseMax - basePos).toBeGreaterThan(5);
  //     expect(baseMax - basePos).toBeLessThan(20);
  //
  //     const secondsWaiting = 100;
  //     await sleep(secondsWaiting * 1000);
  //     const newPos = player.getPosition();
  //     const newMin = player.getMinimumPosition();
  //     const newMax = player.getMaximumPosition();
  //     expect(player.getLivePosition() - newMax).toBeLessThan(2.5);
  //     expect(manifestLoaderCalledTimes).toBeGreaterThanOrEqual(
  //       (secondsWaiting / segmentDuration) * 0.8,
  //     );
  //     expect(segmentLoaderLoaderCalledTimes).toBeGreaterThanOrEqual(
  //       (secondsWaiting / segmentDuration) * 2 * 0.8,
  //     );
  //     expect(newPos - basePos).toBeGreaterThanOrEqual(secondsWaiting * 0.8);
  //     expect(newMax - baseMax).toBeGreaterThanOrEqual(secondsWaiting * 0.8);
  //     expect(newMin - baseMin).toBeGreaterThanOrEqual(secondsWaiting * 0.8);
  //     expect(baseMax - basePos).toBeGreaterThan(5);
  //     expect(baseMax - basePos).toBeLessThan(20);
  //   },
  // );
  //
  // it(
  //   "should sync the number of manifest updates with minimumManifestUpdateInterval",
  //   {
  //     timeout: 30000,
  //   },
  //   async function () {
  //     let manifestLoaderCalledTimes = 0;
  //     const manifestLoader = (_manifestInfo, callbacks) => {
  //       manifestLoaderCalledTimes++;
  //       callbacks.fallback();
  //     };
  //     player.addEventListener("error", (err) => {
  //       // eslint-disable-next-line no-console
  //       console.error("RxPlayer encountered an error", err);
  //     });
  //
  //     player.loadVideo({
  //       url: mpdUrl,
  //       minimumManifestUpdateInterval: 6000,
  //       transport: "dash",
  //       manifestLoader,
  //     });
  //     await waitForLoadedStateAfterLoadVideo(player);
  //     await sleep(15 * 1000);
  //     expect(manifestLoaderCalledTimes).toEqual(3);
  //   },
  // );
  //
  // it("should not load segment before anouncing the available tracks", async function () {
  //   let manifestLoaderCalledTimes = 0;
  //   let segmentLoaderLoaderCalledTimes = 0;
  //   const manifestLoader = (_manifestInfo, callbacks) => {
  //     manifestLoaderCalledTimes++;
  //     callbacks.fallback();
  //   };
  //   const segmentLoader = (_segmentInfo, callbacks) => {
  //     segmentLoaderLoaderCalledTimes++;
  //     callbacks.fallback();
  //   };
  //
  //   player.loadVideo({
  //     url: mpdUrl,
  //     autoPlay: true,
  //     transport: "dash",
  //     manifestLoader,
  //     segmentLoader,
  //   });
  //   return new Promise((res, rej) => {
  //     player.addEventListener("newAvailablePeriods", (p) => {
  //       try {
  //         expect(p.length === 1);
  //         expect(manifestLoaderCalledTimes).toEqual(1);
  //         expect(segmentLoaderLoaderCalledTimes).toEqual(0);
  //         const periodId = p[0].id;
  //         expect(player.getTextTrack(periodId)).toEqual(null);
  //         expect(player.getAvailableTextTracks(periodId)).toEqual([
  //           {
  //             active: false,
  //             closedCaption: false,
  //             id: "0",
  //             language: "en",
  //             normalized: "eng",
  //           },
  //         ]);
  //         expect(player.getVideoTrack(periodId)).not.toEqual(null);
  //         expect(player.getAvailableVideoTracks(periodId).length).toBeGreaterThan(0);
  //         expect(player.getAudioTrack(periodId)).not.toEqual(null);
  //         expect(player.getAvailableAudioTracks(periodId).length).toBeGreaterThan(0);
  //       } catch (err) {
  //         rej(err);
  //         return;
  //       }
  //       res();
  //     });
  //     player.addEventListener("error", rej);
  //   });
  // });

  it(
    "should render subtitles only when enabled and clear them when disabled",
    {
      timeout: 60000,
    },
    async function () {
      const readyInfos = await waitForPackagerReady();
      expect(readyInfos.hasTextTrack).toEqual(true);
      textTrackElement = createTextTrackElement();

      player.loadVideo({
        url: readyInfos.mpdUrl,
        autoPlay: true,
        transport: "dash",
        textTrackMode: "html",
        textTrackElement,
      });
      await waitForLoadedStateAfterLoadVideo(player);

      let periodId;
      let textTrack;
      await checkAfterSleepWithBackoff({ maxTimeMs: 5000, stepMs: 100 }, () => {
        const periods = player.getAvailablePeriods();
        expect(periods.length).toBeGreaterThan(0);
        periodId = periods[0].id;
        const textTracks = player.getAvailableTextTracks(periodId);
        expect(textTracks.length).toBeGreaterThan(0);
        textTrack = textTracks[0];
      });

      expect(player.getTextTrack(periodId)).toEqual(null);
      await waitForNoRenderedTextTrack(textTrackElement);

      player.setTextTrack({
        trackId: textTrack.id,
        periodId,
      });
      await checkAfterSleepWithBackoff({ maxTimeMs: 5000, stepMs: 100 }, () => {
        expect(player.getTextTrack(periodId)?.id).toEqual(textTrack.id);
      });

      const { visiblePosition, gapPosition } = getSubtitleWindowPositions(
        player.getMinimumPosition(),
        player.getMaximumPosition(),
      );
      await waitForPlayerToReachPosition(player, visiblePosition);
      await waitForRenderedTextTrack(textTrackElement);

      await waitForPlayerToReachPosition(player, gapPosition);
      await waitForNoRenderedTextTrack(textTrackElement);

      await waitForPlayerToReachPosition(player, visiblePosition);
      await waitForRenderedTextTrack(textTrackElement);

      player.disableTextTrack(periodId);
      await checkAfterSleepWithBackoff({ maxTimeMs: 5000, stepMs: 100 }, () => {
        expect(player.getTextTrack(periodId)).toEqual(null);
      });
      await waitForNoRenderedTextTrack(textTrackElement);
    },
  );
});
