import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import RxPlayer from "../../../dist/es2017";
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

describe("DASH live packaged content", function () {
  let player;
  let mpdUrl;
  let segmentDuration;

  beforeAll(
    async () => {
      await fetch(START_PACKAGER_URL, {
        method: "POST",
      });

      let timeShiftBufferDepth;
      while (true) {
        // Poll MPD and start `timeShiftBufferDepth` timer when it has been generated
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
        mpdUrl = `http://${__TEST_CONTENT_SERVER__.URL}:${__TEST_CONTENT_SERVER__.PORT}${mpdPath}`;
        segmentDuration = status.info.segmentDuration;
        timeShiftBufferDepth = status.info.timeShiftBufferDepth;
        const res = await fetch(mpdUrl);
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
      await sleep((timeShiftBufferDepth ?? 1) * 1000);
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
  });

  afterEach(() => {
    player.dispose();
  });

  it(
    "should fetch, update and play the Manifest",
    {
      timeout: 150000,
    },
    async function () {
      let manifestLoaderCalledTimes = 0;
      let segmentLoaderLoaderCalledTimes = 0;
      const manifestLoader = (_manifestInfo, callbacks) => {
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = (_segmentInfo, callbacks) => {
        segmentLoaderLoaderCalledTimes++;
        callbacks.fallback();
      };

      player.addEventListener("error", (err) => {
        // eslint-disable-next-line no-console
        console.error("RxPlayer encountered an error", err);
      });

      player.loadVideo({
        url: mpdUrl,
        autoPlay: true,
        transport: "dash",
        manifestLoader,
        segmentLoader,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.isLive()).toEqual(true);
      const basePos = player.getPosition();
      const baseMin = player.getMinimumPosition();
      const baseMax = player.getMaximumPosition();
      expect(baseMax - basePos).toBeGreaterThan(5);
      expect(baseMax - basePos).toBeLessThan(20);

      const secondsWaiting = 100;
      await sleep(secondsWaiting * 1000);
      const newPos = player.getPosition();
      const newMin = player.getMinimumPosition();
      const newMax = player.getMaximumPosition();
      expect(player.getLivePosition() - newMax).toBeLessThan(2.5);
      expect(manifestLoaderCalledTimes).toBeGreaterThanOrEqual(
        (secondsWaiting / segmentDuration) * 0.8,
      );
      expect(segmentLoaderLoaderCalledTimes).toBeGreaterThanOrEqual(
        (secondsWaiting / segmentDuration) * 2 * 0.8,
      );
      expect(newPos - basePos).toBeGreaterThanOrEqual(secondsWaiting * 0.8);
      expect(newMax - baseMax).toBeGreaterThanOrEqual(secondsWaiting * 0.8);
      expect(newMin - baseMin).toBeGreaterThanOrEqual(secondsWaiting * 0.8);
      expect(baseMax - basePos).toBeGreaterThan(5);
      expect(baseMax - basePos).toBeLessThan(20);
    },
  );

  it(
    "should sync the number of manifest updates with minimumManifestUpdateInterval",
    {
      timeout: 30000,
    },
    async function () {
      let manifestLoaderCalledTimes = 0;
      const manifestLoader = (_manifestInfo, callbacks) => {
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      player.addEventListener("error", (err) => {
        // eslint-disable-next-line no-console
        console.error("RxPlayer encountered an error", err);
      });

      player.loadVideo({
        url: mpdUrl,
        minimumManifestUpdateInterval: 6000,
        transport: "dash",
        manifestLoader,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await sleep(15 * 1000);
      expect(manifestLoaderCalledTimes).toEqual(3);
    },
  );

  it("should not load segment before anouncing the available tracks", async function () {
    let manifestLoaderCalledTimes = 0;
    let segmentLoaderLoaderCalledTimes = 0;
    const manifestLoader = (_manifestInfo, callbacks) => {
      manifestLoaderCalledTimes++;
      callbacks.fallback();
    };
    const segmentLoader = (_segmentInfo, callbacks) => {
      segmentLoaderLoaderCalledTimes++;
      callbacks.fallback();
    };

    player.loadVideo({
      url: mpdUrl,
      autoPlay: true,
      transport: "dash",
      manifestLoader,
      segmentLoader,
    });
    return new Promise((res, rej) => {
      player.addEventListener("newAvailablePeriods", (p) => {
        try {
          expect(p.length === 1);
          expect(manifestLoaderCalledTimes).toEqual(1);
          expect(segmentLoaderLoaderCalledTimes).toEqual(0);
          const periodId = p[0].id;
          expect(player.getTextTrack(periodId)).toEqual(null);
          expect(player.getAvailableTextTracks(periodId)).toEqual([]);
          expect(player.getVideoTrack(periodId)).not.toEqual(null);
          expect(player.getAvailableVideoTracks(periodId).length).toBeGreaterThan(0);
          expect(player.getAudioTrack(periodId)).not.toEqual(null);
          expect(player.getAvailableAudioTracks(periodId).length).toBeGreaterThan(0);
        } catch (err) {
          rej(err);
          return;
        }
        res();
      });
      player.addEventListener("error", rej);
    });
  });
});
