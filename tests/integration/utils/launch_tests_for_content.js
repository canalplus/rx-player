import { expect } from "chai";
import RxPlayer from "../../../dist/es2017";
import { MULTI_THREAD } from "../../../dist/es2017/experimental/features/index.js";
import {
  EMBEDDED_WORKER,
  EMBEDDED_DASH_WASM,
} from "../../../dist/es2017/__GENERATED_CODE/index.js";
import sleep from "../../utils/sleep.js";
import waitForState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";
import tryTestMultipleTimes from "../../utils/try_test_multiple_times";
import { lockLowestBitrates } from "../../utils/bitrates";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";

/**
 * Performs a serie of basic tests on a content.
 *
 * @param {Object} manifestInfos - information about what should be found in the
 * manifest.
 * Structure of manifestInfos:
 * ```
 * url {string}
 * transport {string}
 * duration {number}
 * isDynamic {boolean}
 * isLive {boolean}
 * maximumPosition? {number}
 * minimumPosition? {number}
 * availabilityStartTime? {number}
 * periods[]
 *          .adaptations.{
 *            audio,
 *            video,
 *            text,
 *          }[]
 *             .isClosedCaption? {boolean}
 *             .isAudioDescription? {boolean}
 *             .normalizedLanguage? {string}
 *             .language? {string}
 *             .representations[]
 *                               .bitrate {number}
 *                               .codec {string}
 *                               .mimeType {string}
 *                               .height? {number}
 *                               .width? {number}
 *                               .index
 *                                     .init
 *                                          .url {string}
 *                                     .segments[]
 *                                                .time {number}
 *                                                .timescale {number}
 *                                                .duration {number}
 *                                                .url {string}
 * ```
 * @param {Object} [options]
 * @param {Boolean} [options.multithread] - If `true`, those tests will be run
 * if the RxPlayer runs in multithread mode.
 * In any other cases, tests will run in monothread mode.
 */
export default function launchTestsForContent(manifestInfos, { multithread } = {}) {
  let player;

  if (multithread === true) {
    RxPlayer.addFeatures([MULTI_THREAD]);
  }

  const {
    isLive,
    maximumPosition,
    minimumPosition,
    periods: periodsInfos,
    transport,
  } = manifestInfos;

  const firstPeriodIndex = isLive ? periodsInfos.length - 1 : 0;

  describe("API tests", () => {
    beforeEach(() => {
      player = new RxPlayer();
      if (multithread === true) {
        player.attachWorker({
          workerUrl: EMBEDDED_WORKER,
          dashWasmUrl: EMBEDDED_DASH_WASM,
        });
      }
    });

    afterEach(() => {
      player.dispose();
    });

    describe("loadVideo", () => {
      it("should fetch the manifest then the init segments", async function () {
        let manifestLoaderCalledTimes = 0;
        const requestedSegments = [];
        const manifestLoader = (man, callbacks) => {
          expect(manifestInfos.url).to.equal(man.url);
          manifestLoaderCalledTimes++;
          callbacks.fallback();
        };
        const segmentLoader = (info, callbacks) => {
          requestedSegments.push(info.url);
          callbacks.fallback();
        };

        // Lock the lowest bitrate to facilitate the test
        lockLowestBitrates(player);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          manifestLoader,
          segmentLoader,
        });

        // should only have the manifest for now
        expect(manifestLoaderCalledTimes).to.equal(1);

        expect(player.getPlayerState()).to.equal("LOADING");
        const loadingTime = performance.now();
        await waitForLoadedStateAfterLoadVideo(player);
        expect(performance.now() - loadingTime).to.be.at.most(1000);

        const firstPeriodAdaptationsInfos = periodsInfos[firstPeriodIndex].adaptations;
        const audioRepresentationInfos =
          firstPeriodAdaptationsInfos.audio &&
          firstPeriodAdaptationsInfos.audio[0] &&
          firstPeriodAdaptationsInfos.audio[0].representations[0];
        const videoRepresentationInfos =
          firstPeriodAdaptationsInfos.video &&
          firstPeriodAdaptationsInfos.video[0] &&
          firstPeriodAdaptationsInfos.video[0].representations[0];

        if (
          (audioRepresentationInfos && audioRepresentationInfos.index.init) ||
          (videoRepresentationInfos && videoRepresentationInfos.index.init)
        ) {
          if (
            audioRepresentationInfos &&
            audioRepresentationInfos.index.init &&
            videoRepresentationInfos &&
            videoRepresentationInfos.index.init
          ) {
            expect(requestedSegments.length).to.be.at.least(2);
            const hasRequestedVideoInitSegment = requestedSegments.some((r) => {
              const relativeUrl =
                videoRepresentationInfos.index.init.url === null
                  ? ""
                  : videoRepresentationInfos.index.init.url;
              return r.endsWith(relativeUrl);
            });
            const hasRequestedAudioInitSegment = requestedSegments.some((r) => {
              const relativeUrl =
                audioRepresentationInfos.index.init.url === null
                  ? ""
                  : audioRepresentationInfos.index.init.url;
              return r.endsWith(relativeUrl);
            });
            expect(hasRequestedVideoInitSegment).to.equal(true);
            expect(hasRequestedAudioInitSegment).to.equal(true);
          } else if (!(audioRepresentationInfos && audioRepresentationInfos.index.init)) {
            expect(requestedSegments.length).to.be.at.least(1);
            expect(requestedSegments).to.include(videoRepresentationInfos.index.init.url);
          } else {
            expect(requestedSegments.length).to.be.at.least(1);
            expect(requestedSegments).to.include(audioRepresentationInfos.index.init.url);
          }
        }
      });

      if (transport === "dash" || transport === "smooth") {
        it("should not do the initial manifest request if an `initialManifest` option is set as a string", async function () {
          const initialManifest = await (await fetch(manifestInfos.url)).text();
          let manifestLoaderCalledTimes = 0;
          let segmentLoaderLoaderCalledTimes = 0;
          const manifestLoader = (_, callbacks) => {
            manifestLoaderCalledTimes++;
            callbacks.fallback();
          };
          const segmentLoader = (_, callbacks) => {
            segmentLoaderLoaderCalledTimes++;
            callbacks.fallback();
          };
          player.loadVideo({
            url: manifestInfos.url,
            transport,
            initialManifest,
            manifestLoader,
            segmentLoader,
          });

          await waitForLoadedStateAfterLoadVideo(player);
          expect(manifestLoaderCalledTimes).to.equal(0);
          expect(segmentLoaderLoaderCalledTimes).to.be.at.least(1);
        });
        it("should not do the initial manifest request if an `initialManifest` option is set as a document", async function () {
          const initialManifestStr = await (await fetch(manifestInfos.url)).text();
          const initialManifest = new DOMParser().parseFromString(
            initialManifestStr,
            "text/xml",
          );
          let manifestLoaderCalledTimes = 0;
          let segmentLoaderLoaderCalledTimes = 0;
          const manifestLoader = () => {
            manifestLoaderCalledTimes++;
          };
          const segmentLoader = () => {
            segmentLoaderLoaderCalledTimes++;
          };
          player.loadVideo({
            url: manifestInfos.url,
            transport,
            initialManifest,
            manifestLoader,
            segmentLoader,
          });

          await checkAfterSleepWithBackoff({ maxTimeMs: 500 }, () => {
            expect(manifestLoaderCalledTimes).to.equal(0);
            expect(segmentLoaderLoaderCalledTimes).to.be.at.least(1);
          });
        });
      }
    });

    describe("getError", () => {
      it("should return null if no fatal error has happened", async function () {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getError()).to.equal(null);
      });
    });

    describe("reload", () => {
      it("should reload at given absolute position", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        if (!manifestInfos.isLive) {
          expect(player.getPosition()).to.be.closeTo(manifestInfos.minimumPosition, 0.1);
        } else {
          expect(player.getPosition()).to.be.closeTo(
            manifestInfos.maximumPosition - 10,
            5,
          );
        }
        player.reload({
          reloadAt: { position: manifestInfos.minimumPosition + 5 },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(
          manifestInfos.minimumPosition + 5,
          0.1,
        );
      });
      it("should reload at given relative position", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: manifestInfos.minimumPosition + 2 },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(
          manifestInfos.minimumPosition + 2,
          0.1,
        );
        player.reload({ reloadAt: { relative: 5 } });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(
          manifestInfos.minimumPosition + 7,
          0.1,
        );
      });
      it("should reload after stop, at given relative position", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: manifestInfos.minimumPosition + 2 },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(manifestInfos.minimumPosition + 2, 1);
        player.stop();
        player.reload({ reloadAt: { relative: 5 } });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(
          manifestInfos.minimumPosition + 7,
          1.5,
        );
      });
      it("should reload when seeking at last playback position", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: manifestInfos.minimumPosition },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(manifestInfos.minimumPosition, 0.1);
        player.seekTo({ position: manifestInfos.minimumPosition + 5 });
        await checkAfterSleepWithBackoff({ maxTimeMs: 200 }, () => {
          expect(player.getLastStoredContentPosition()).to.be.closeTo(
            manifestInfos.minimumPosition + 5,
            0.1,
          );
        });
        player.reload();
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(
          manifestInfos.minimumPosition + 5,
          0.1,
        );
      });
      it("should reload even when the current content is not yet loaded", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: manifestInfos.minimumPosition },
        });
        player.reload();
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(manifestInfos.minimumPosition, 2);
      });
      it("should reload even when the last content was not yet loaded", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: manifestInfos.minimumPosition },
        });
        player.stop();
        await sleep(5);
        player.reload();
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(manifestInfos.minimumPosition, 2);
      });
      it("should not reload when no content was yet loaded", async function () {
        lockLowestBitrates(player);
        expect(() => player.reload()).to.throw(
          "API: Can't reload without having previously loaded a content.",
        );
      });
      it("should reload with autoplay when the current content was is yet loaded with autoPlay on", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        player.reload();
        await waitForState(player, "PLAYING", [
          "LOADING",
          "LOADED",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
      it("should reload without autoplay when the current content is not yet loaded with autoPlay off", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        player.reload();
        await waitForState(player, "LOADED", [
          "LOADING",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
      it("should reload with autoplay when the current content is loaded and playing", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.play();
        await waitForState(player, "PLAYING", ["BUFFERING", "SEEKING", "RELOADING"]);
        player.reload();
        await waitForState(player, "PLAYING", [
          "LOADING",
          "LOADED",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
      it("should reload without autoplay when the current content is loaded and paused", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.play();
        await waitForState(player, "PLAYING", ["BUFFERING", "SEEKING", "RELOADING"]);
        await sleep(200);
        player.pause();
        await waitForState(player, "PAUSED", [
          "PLAYING",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
        player.reload();
        await waitForState(player, "LOADED", [
          "LOADING",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
      it("should reload with autoplay when the last content was not yet loaded with autoPlay on", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        player.stop();
        await sleep(50);
        player.reload();
        await waitForState(player, "PLAYING", [
          "LOADING",
          "LOADED",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
      it("should reload without autoplay when the last content was not yet loaded with autoPlay off", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        player.stop();
        await sleep(50);
        player.reload();
        await waitForState(player, "LOADED", [
          "LOADING",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
      it("should reload with autoplay when the last content was loaded and playing", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.play();
        await waitForState(player, "PLAYING", ["BUFFERING", "SEEKING", "RELOADING"]);
        player.stop();
        await sleep(50);
        player.reload();
        await waitForState(player, "PLAYING", [
          "LOADING",
          "LOADED",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
      it("should reload without autoplay when the last content was loaded and paused", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.play();
        await waitForState(player, "PLAYING", ["BUFFERING", "SEEKING", "RELOADING"]);
        await sleep(200);
        player.pause();
        await waitForState(player, "PAUSED", [
          "PLAYING",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
        player.stop();
        await sleep(50);
        player.reload();
        await waitForState(player, "LOADED", [
          "LOADING",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
      it("should respect `autoPlay` reload setting even if the non-yet loaded content had a different autoPlay setting", async () => {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        player.reload({ autoPlay: true });
        await waitForState(player, "PLAYING", [
          "LOADING",
          "LOADED",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        player.reload({ autoPlay: false });
        await waitForState(player, "LOADED", [
          "LOADING",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
      it("should respect `autoPlay` reload setting even if the current content is loaded and playing", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.play();
        await waitForState(player, "PLAYING", ["BUFFERING", "SEEKING", "RELOADING"]);
        player.reload({ autoPlay: false });
        await waitForState(player, "LOADED", [
          "LOADING",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
      it("should respect `autoPlay` reload setting even if the current content is loaded and paused", async function () {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.play();
        await waitForState(player, "PLAYING", ["BUFFERING", "SEEKING", "RELOADING"]);
        await sleep(200);
        player.pause();
        await waitForState(player, "PAUSED", [
          "PLAYING",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
        player.reload({ autoPlay: true });
        await waitForState(player, "PLAYING", [
          "LOADING",
          "LOADED",
          "BUFFERING",
          "SEEKING",
          "RELOADING",
        ]);
      });
    });

    describe("getVideoElement", () => {
      it("should return a video element", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getVideoElement()).to.not.be.null;
        expect(player.getVideoElement().nodeType).to.eql(Element.ELEMENT_NODE);
        expect(player.getVideoElement().nodeName.toLowerCase()).to.eql("video");
      });
    });

    describe("getPlayerState", () => {
      it("should go from LOADING to LOADED", async () => {
        expect(player.getPlayerState()).to.equal("STOPPED");

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        expect(player.getPlayerState()).to.equal("LOADING");
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        player.pause();
        expect(player.getPlayerState()).to.equal("LOADED");
        await sleep(1);
        expect(player.getPlayerState()).to.equal("LOADED");
      });

      it("should go to PLAYING when play is called", async function () {
        this.timeout(5000);
        expect(player.getPlayerState()).to.equal("STOPPED");

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.play();
        await checkAfterSleepWithBackoff({ maxTimeMs: 1000 }, () => {
          expect(player.getPlayerState()).to.equal("PLAYING");
        });
      });

      it("should go to LOADING then to PLAYING immediately when autoPlay is set", async () => {
        expect(player.getPlayerState()).to.equal("STOPPED");

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
      });
    });

    describe("isContentLoaded", () => {
      it("should go from false to true when loading a content", async () => {
        expect(player.getPlayerState()).to.equal("STOPPED");
        expect(player.isContentLoaded()).to.equal(false);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        expect(player.getPlayerState()).to.equal("LOADING");
        expect(player.isContentLoaded()).to.equal(false);

        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        expect(player.isContentLoaded()).to.equal(true);
      });
    });

    describe("isBuffering", () => {
      it("should go to true when loading", async () => {
        expect(player.getPlayerState()).to.equal("STOPPED");
        expect(player.isBuffering()).to.equal(false);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        expect(player.getPlayerState()).to.equal("LOADING");
        expect(player.isBuffering()).to.equal(true);

        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        expect(player.isBuffering()).to.equal(false);
      });
    });

    describe("isPaused", () => {
      it("should return true when paused", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getVideoElement()).to.not.be.null;
        expect(player.isPaused()).to.equal(true);

        player.play();
        await sleep(100);
        expect(player.isPaused()).to.equal(false);

        player.dispose();
        await sleep(100);
        expect(player.getVideoElement()).to.be.null;
        expect(player.isPaused()).to.equal(true);
      });
    });

    describe("isLive", () => {
      if (isLive) {
        it("should return true", async () => {
          player.loadVideo({
            url: manifestInfos.url,
            transport,
            autoPlay: false,
          });
          await waitForLoadedStateAfterLoadVideo(player);
          expect(player.isLive()).to.eql(true);
        });
      } else {
        it("should return false", async () => {
          player.loadVideo({
            url: manifestInfos.url,
            transport,
            autoPlay: false,
          });
          await waitForLoadedStateAfterLoadVideo(player);
          expect(player.isLive()).to.eql(false);
        });
      }
    });

    describe("getContentUrls", () => {
      it("should return the URL of the manifest", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getContentUrls()).to.eql([manifestInfos.url]);
      });
    });

    describe("getMediaDuration", () => {
      if (isLive) {
        it("should return Math.MAX_NUMBER", async () => {
          player.loadVideo({
            url: manifestInfos.url,
            transport,
            autoPlay: false,
          });
          await waitForLoadedStateAfterLoadVideo(player);
          expect(player.getMediaDuration()).to.equal(Math.MAX_NUMBER);
        });
      } else {
        it("should return the duration of the whole video", async () => {
          player.loadVideo({
            url: manifestInfos.url,
            transport,
            autoPlay: false,
          });
          await waitForLoadedStateAfterLoadVideo(player);
          expect(player.getMediaDuration()).to.be.closeTo(maximumPosition, 0.1);
        });
      }
    });

    describe("getCurrentBufferGap", () => {
      // TODO handle live contents
      it("should return the buffer gap of the current range", async function () {
        this.timeout(20000);

        lockLowestBitrates(player);
        player.setWantedBufferAhead(10);
        expect(player.getWantedBufferAhead()).to.equal(10);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        await checkAfterSleepWithBackoff({ maxTimeMs: 3000 }, () => {
          const bufferGap = player.getCurrentBufferGap();
          expect(bufferGap).to.be.at.least(9.5);
          expect(bufferGap).to.be.at.most(10 + 10);
        });

        player.setWantedBufferAhead(20);
        expect(player.getWantedBufferAhead()).to.equal(20);
        await checkAfterSleepWithBackoff({ maxTimeMs: 3000 }, () => {
          const bufferGap = player.getCurrentBufferGap();
          expect(bufferGap).to.be.at.least(19.5);
          expect(bufferGap).to.be.at.most(20 + 10);
        });

        player.seekTo(minimumPosition + 10);
        await checkAfterSleepWithBackoff({ maxTimeMs: 3000 }, () => {
          expect(player.getWantedBufferAhead()).to.equal(20);
          const bufferGap = player.getCurrentBufferGap();
          expect(bufferGap).to.be.at.least(19.5);
          expect(bufferGap).to.be.at.most(20 + 10);
        });

        player.seekTo(minimumPosition + 10 + 30);
        await checkAfterSleepWithBackoff({ maxTimeMs: 3000 }, () => {
          expect(player.getWantedBufferAhead()).to.equal(20);
          const bufferGap = player.getCurrentBufferGap();
          expect(bufferGap).to.be.at.least(19.5);
          expect(bufferGap).to.be.at.most(20 + 10);
        });

        player.setWantedBufferAhead(Infinity);
        expect(player.getWantedBufferAhead()).to.equal(Infinity);
        await checkAfterSleepWithBackoff({ maxTimeMs: 4000 }, () => {
          const bufferGap = player.getCurrentBufferGap();
          expect(bufferGap).to.be.at.least(
            player.getMaximumPosition() - minimumPosition - (10 + 30) - 2,
          );
          expect(bufferGap).to.be.at.most(
            player.getMaximumPosition() - minimumPosition - (10 + 30) + 10,
          );
        });
      });
    });

    // TODO handle live contents
    describe("getWallClockTime", () => {
      it("should be at the minimum time by default", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getWallClockTime()).to.be.closeTo(minimumPosition, 0.001);
      });

      it("should return the starting position if one", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: minimumPosition + 4 },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getWallClockTime()).to.be.closeTo(minimumPosition + 4, 0.001);
      });

      it("should update as soon as we seek", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.seekTo(12);
        expect(player.getWallClockTime()).to.equal(12);
      });
    });

    // TODO handle live contents
    describe("getPosition", () => {
      it("should be at the minimum time by default", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(minimumPosition, 0.001);
      });

      it("should return the starting position if one", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: minimumPosition + 4 },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(minimumPosition + 4, 0.001);
      });

      it("should update as soon as we seek", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.seekTo(12);
        expect(player.getPosition()).to.equal(12);
      });
    });

    describe("getLastStoredContentPosition", () => {
      it("should return the last stored position", async () => {
        lockLowestBitrates(player);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: manifestInfos.minimumPosition },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(manifestInfos.minimumPosition, 0.1);
        player.seekTo({ position: manifestInfos.minimumPosition + 5 });
        await checkAfterSleepWithBackoff({ maxTimeMs: 200 }, () => {
          expect(player.getLastStoredContentPosition()).to.be.closeTo(
            manifestInfos.minimumPosition + 5,
            0.1,
          );
        });
        player.stop();
        await checkAfterSleepWithBackoff({ maxTimeMs: 200 }, () => {
          expect(player.getLastStoredContentPosition()).to.be.closeTo(
            manifestInfos.minimumPosition + 5,
            0.1,
          );
        });
      });
    });

    describe("getPlaybackRate", () => {
      it("should be 1 by default", async () => {
        expect(player.getPlaybackRate()).to.equal(1);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        expect(player.getPlaybackRate()).to.equal(1);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlaybackRate()).to.equal(1);
      });

      // TODO handle live contents
      it("should update when the speed is updated", async () => {
        player.setPlaybackRate(2);
        expect(player.getPlaybackRate()).to.equal(2);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        expect(player.getPlaybackRate()).to.equal(2);
        player.setPlaybackRate(3);
        expect(player.getPlaybackRate()).to.equal(3);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlaybackRate()).to.equal(3);
        player.setPlaybackRate(0);
        expect(player.getPlaybackRate()).to.equal(0);
      });
    });

    describe("setPlaybackRate", () => {
      // TODO handle live contents
      it("should update the speed accordingly", async function () {
        this.timeout(15000);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(minimumPosition, 0.001);
        player.setPlaybackRate(1);
        const before1 = performance.now();
        player.play();
        await sleep(2000);
        const duration1 = (performance.now() - before1) / 1000;
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be.closeTo(minimumPosition + duration1, 2);

        const before2 = performance.now();
        player.setPlaybackRate(3);
        await sleep(2000);
        const duration2 = (performance.now() - before2) / 1000;
        const secondPosition = player.getPosition();
        expect(secondPosition).to.be.closeTo(initialPosition + duration2 * 3, 2);
      });
    });

    describe("getVideoRepresentation", () => {
      it("should give a value once loaded", async () => {
        expect(player.getVideoRepresentation()).to.equal(undefined);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        expect(player.getVideoRepresentation()).to.equal(undefined);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getVideoRepresentation()).to.not.equal(undefined);
      });
    });

    describe("getAudioRepresentation", () => {
      it("should give a value once loaded", async () => {
        expect(player.getAudioRepresentation()).to.equal(undefined);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        expect(player.getAudioRepresentation()).to.equal(undefined);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getAudioRepresentation()).to.not.equal(undefined);
      });
    });

    describe("play", () => {
      let pauseEventsSent = 0;
      let playEventsSent = 0;
      beforeEach(() => {
        player.addEventListener("pause", () => {
          pauseEventsSent++;
        });
        player.addEventListener("play", () => {
          playEventsSent++;
        });
      });

      afterEach(() => {
        pauseEventsSent = 0;
        playEventsSent = 0;
      });

      it("should begin to play if LOADED", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        expect(pauseEventsSent).to.equal(0);
        expect(playEventsSent).to.equal(0);
        player.play();
        await sleep(10);
        expect(player.getPlayerState()).to.equal("PLAYING");
        expect(pauseEventsSent).to.equal(0);
        expect(playEventsSent).to.equal(1);
      });

      it("should resume if paused", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        await checkAfterSleepWithBackoff({ maxTimeMs: 100 }, () => {
          expect(player.getPlayerState()).to.equal("PLAYING");
          expect(pauseEventsSent).to.equal(0);
          expect(playEventsSent).to.equal(0);
        });
        player.pause();
        await checkAfterSleepWithBackoff({ maxTimeMs: 100 }, () => {
          expect(player.getPlayerState()).to.equal("PAUSED");
          expect(pauseEventsSent).to.equal(1);
          expect(playEventsSent).to.equal(0);
        });
        player.play();
        await checkAfterSleepWithBackoff({ maxTimeMs: 100 }, () => {
          expect(player.getPlayerState()).to.equal("PLAYING");
          expect(pauseEventsSent).to.equal(1);
          expect(playEventsSent).to.equal(1);
        });
      });
    });

    describe("pause", () => {
      let pauseEventsSent = 0;
      let playEventsSent = 0;
      beforeEach(() => {
        player.addEventListener("pause", () => {
          pauseEventsSent++;
        });
        player.addEventListener("play", () => {
          playEventsSent++;
        });
      });

      afterEach(() => {
        pauseEventsSent = 0;
        playEventsSent = 0;
      });

      it("should have no effect when LOADED", async () => {
        await tryTestMultipleTimes(
          async function runTest(cancelTest) {
            // On some rare conditions, the player may switch to a
            // `"BUFFERING"` or `"RELOADING"` state while loading a content.
            // For that test specifically, we want to avoid that situation and
            // just relaunch the test if that happens.
            player.addEventListener("playerStateChange", (state) => {
              if (state === "BUFFERING" || state === "RELOADING" || state === "SEEKING") {
                cancelTest();
              }
            });
            player.loadVideo({
              url: manifestInfos.url,
              transport,
            });
            await waitForLoadedStateAfterLoadVideo(player);
            expect(player.getPlayerState()).to.equal("LOADED");
            player.pause();
            await sleep(10);

            expect(player.getPlayerState()).to.equal("LOADED");
            expect(pauseEventsSent).to.equal(0);
            expect(playEventsSent).to.equal(0);
          },
          3,
          function cleanUp() {
            player.removeEventListener("playerStateChange");
          },
        );
      });

      it("should pause if playing", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        expect(pauseEventsSent).to.equal(0);
        player.pause();
        await checkAfterSleepWithBackoff({ maxTimeMs: 100 }, () => {
          expect(player.getPlayerState()).to.equal("PAUSED");
          expect(pauseEventsSent).to.equal(1);
          expect(playEventsSent).to.equal(0);
        });
      });

      it("should do nothing if already paused", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        expect(pauseEventsSent).to.equal(0);
        player.pause();
        await checkAfterSleepWithBackoff({ maxTimeMs: 100 }, () => {
          expect(player.getPlayerState()).to.equal("PAUSED");
          expect(pauseEventsSent).to.equal(1);
          expect(playEventsSent).to.equal(0);
        });
        player.pause();
        await sleep(100);
        expect(player.getPlayerState()).to.equal("PAUSED");
        expect(pauseEventsSent).to.equal(1);
        expect(playEventsSent).to.equal(0);
      });
    });

    // TODO handle live contents
    describe("seekTo", () => {
      it("should be able to seek to a given time once loaded", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.below(minimumPosition + 0.1);
        player.seekTo(minimumPosition + 50);
        expect(player.getPosition()).to.be.closeTo(minimumPosition + 50, 0.5);
      });

      it("should conserve pause if previously paused", async () => {
        let pauseEventsSent = 0;
        let playEventsSent = 0;
        player.addEventListener("pause", () => {
          pauseEventsSent++;
        });
        player.addEventListener("play", () => {
          playEventsSent++;
        });
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.seekTo(minimumPosition + 50);
        await waitForState(player, "PAUSED");
        expect(pauseEventsSent).to.equal(0);
        expect(playEventsSent).to.equal(0);
      });

      it("should still play if previously playing", async () => {
        let pauseEventsSent = 0;
        let playEventsSent = 0;
        let nbPausedStates = 0;
        player.addEventListener("pause", () => {
          pauseEventsSent++;
        });
        player.addEventListener("play", () => {
          playEventsSent++;
        });
        player.addEventListener("playerStateChange", (state) => {
          if (state === "PAUSED") {
            nbPausedStates++;
          }
        });
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.seekTo(minimumPosition + 50);
        await waitForState(player, "PLAYING");
        expect(pauseEventsSent).to.equal(0);
        expect(playEventsSent).to.equal(0);
        expect(nbPausedStates).to.equal(0);
      });

      it("should be able to pause while seeking", async () => {
        let pauseEventsSent = 0;
        let playEventsSent = 0;
        let nbPausedStates = 0;
        player.addEventListener("pause", () => {
          pauseEventsSent++;
        });
        player.addEventListener("play", () => {
          playEventsSent++;
        });
        player.addEventListener("playerStateChange", (state) => {
          if (state === "PAUSED") {
            nbPausedStates++;
          }
        });
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.seekTo(minimumPosition + 50);
        await sleep(0);
        player.pause();
        await waitForState(player, "PAUSED");
        await sleep(0);
        expect(pauseEventsSent).to.equal(1);
        expect(playEventsSent).to.equal(0);
        expect(nbPausedStates).to.equal(1);
      });

      it("should be able to play while seeking", async () => {
        let pauseEventsSent = 0;
        let playEventsSent = 0;
        let nbPlayingStates = 0;
        player.addEventListener("pause", () => {
          pauseEventsSent++;
        });
        player.addEventListener("play", () => {
          playEventsSent++;
        });
        player.addEventListener("playerStateChange", (state) => {
          if (state === "PLAYING") {
            nbPlayingStates++;
          }
        });
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.seekTo(minimumPosition + 50);
        await sleep(0);
        player.play();
        await waitForState(player, "PLAYING");
        await sleep(0);
        expect(pauseEventsSent).to.equal(0);
        expect(playEventsSent).to.equal(1);
        expect(nbPlayingStates).to.equal(1);
      });
    });

    describe("getVolume", () => {
      it("should return the current media element volume", async () => {
        const initialVolume = player.getVideoElement().volume;
        expect(player.getVolume()).to.equal(initialVolume);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getVolume()).to.equal(initialVolume);
      });

      it("should be updated when the volume is updated", async () => {
        const initialVolume = player.getVideoElement().volume;
        expect(player.getVolume()).to.equal(initialVolume);
        player.setVolume(0.54);
        expect(player.getVolume()).to.equal(0.54);
        player.setVolume(0.44);
        expect(player.getVolume()).to.equal(0.44);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.getVolume()).to.equal(0.44);
        player.setVolume(0.74);
        expect(player.getVolume()).to.equal(0.74);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getVolume()).to.equal(0.74);
        player.setVolume(0.92);
        expect(player.getVolume()).to.equal(0.92);
      });

      it("should still return the volume if muted", async () => {
        const initialVolume = player.getVideoElement().volume;
        expect(player.getVolume()).to.equal(initialVolume);
        player.mute();
        expect(player.getVolume()).to.equal(initialVolume);
        player.unMute();
        expect(player.getVolume()).to.equal(initialVolume);
        player.mute();

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.getVolume()).to.equal(initialVolume);
        player.setVolume(0.12);
        expect(player.getVolume()).to.equal(0.12);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getVolume()).to.equal(0.12);
      });
    });

    describe("setVolume", () => {
      it("should update the volume", async () => {
        player.setVolume(0.15);
        expect(player.getVolume()).to.equal(0.15);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.getVolume()).to.equal(0.15);
        player.setVolume(0.16);
        expect(player.getVolume()).to.equal(0.16);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getVolume()).to.equal(0.16);
        player.setVolume(0.17);
        expect(player.getVolume()).to.equal(0.17);
      });

      it("should not un-mute when muted", async () => {
        player.mute();
        expect(player.isMute()).to.equal(true);
        player.setVolume(0.25);
        expect(player.getVolume()).to.equal(0.25);
        expect(player.isMute()).to.equal(true);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        player.unMute();
        expect(player.isMute()).to.equal(false);
        player.mute();
        expect(player.isMute()).to.equal(true);
        player.setVolume(0.33);
        expect(player.getVolume()).to.equal(0.33);
        expect(player.isMute()).to.equal(true);

        await waitForLoadedStateAfterLoadVideo(player);

        player.setVolume(0.45);
        expect(player.getVolume()).to.equal(0.45);
        expect(player.isMute()).to.equal(true);
      });
    });

    describe("isMute", () => {
      it("should be false by default", async () => {
        expect(player.isMute()).to.equal(false);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.isMute()).to.equal(false);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.isMute()).to.equal(false);
      });

      it("should be true if muted and false if un-muted", async () => {
        player.mute();
        expect(player.isMute()).to.equal(true);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.isMute()).to.equal(true);
        player.unMute();
        expect(player.isMute()).to.equal(false);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.isMute()).to.equal(false);

        player.mute();
        expect(player.isMute()).to.equal(true);
        player.setVolume(1);
        expect(player.isMute()).to.equal(true);
      });
    });

    describe("mute", () => {
      it("should set the muted property", async () => {
        const initialVolume = player.getVideoElement().volume;
        expect(player.getVideoElement().muted).to.equal(false);
        player.mute();
        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
        expect(player.getVideoElement().muted).to.equal(true);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.isMute()).to.equal(true);
        expect(player.getVideoElement().muted).to.equal(true);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
        player.unMute();
        expect(player.isMute()).to.equal(false);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
        expect(player.getVideoElement().muted).to.equal(false);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.isMute()).to.equal(false);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
        expect(player.getVideoElement().muted).to.equal(false);

        player.mute();
        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
        expect(player.getVideoElement().muted).to.equal(true);
        player.setVolume(1);
        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
        expect(player.getVideoElement().muted).to.equal(true);
      });
    });

    describe("unMute", async () => {
      it("should unmute when the volume is muted", async () => {
        const initialVolume = player.getVideoElement().volume;
        player.mute();
        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
        expect(player.getVideoElement().muted).to.equal(true);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
        player.unMute();
        expect(player.isMute()).to.equal(false);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.isMute()).to.equal(false);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);

        player.mute();
        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
        player.setVolume(0.7);
        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(0.7);
        expect(player.getVideoElement().volume).to.equal(0.7);
      });
    });

    describe("getAvailableAudioTracks", () => {
      it("should list the right audio languages", async function () {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          segmentLoader: () => {
            /* do nothing */
          },
        });
        await checkAfterSleepWithBackoff({ maxTimeMs: 50 }, () => {
          const audioTracks = player.getAvailableAudioTracks();

          const audioAdaptations = manifestInfos.periods[0].adaptations.audio;
          expect(audioTracks.length).to.equal(
            audioAdaptations ? audioAdaptations.length : 0,
          );

          if (audioAdaptations) {
            for (let i = 0; i < audioAdaptations.length; i++) {
              const adaptation = audioAdaptations[i];
              let found = false;
              for (let j = 0; j < audioTracks.length; j++) {
                const audioTrack = audioTracks[j];
                if (audioTrack.id === adaptation.id) {
                  found = true;
                  expect(audioTrack.language).to.equal(adaptation.language || "");
                  expect(audioTrack.normalized).to.equal(
                    adaptation.normalizedLanguage || "",
                  );
                  expect(audioTrack.audioDescription).to.equal(
                    !!adaptation.isAudioDescription,
                  );

                  const activeAudioTrack = player.getAudioTrack();
                  expect(audioTrack.active).to.equal(
                    activeAudioTrack ? activeAudioTrack.id === audioTrack.id : false,
                  );
                }
              }
              expect(found).to.equal(true);
            }
          }
        });
      });
    });

    describe("getAvailableTextTracks", () => {
      it("should list the right text languages", async function () {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          segmentLoader: () => {
            /* do nothing */
          },
        });
        await checkAfterSleepWithBackoff({ maxTimeMs: 50 }, () => {
          const textTracks = player.getAvailableTextTracks();

          const textAdaptations = manifestInfos.periods[0].adaptations.text;
          expect(textTracks.length).to.equal(
            textAdaptations ? textAdaptations.length : 0,
          );

          if (textAdaptations) {
            for (let i = 0; i < textAdaptations.length; i++) {
              const adaptation = textAdaptations[i];
              let found = false;
              for (let j = 0; j < textTracks.length; j++) {
                const textTrack = textTracks[j];
                if (textTrack.id === adaptation.id) {
                  found = true;
                  expect(textTrack.language).to.equal(adaptation.language || "");
                  expect(textTrack.normalized).to.equal(
                    adaptation.normalizedLanguage || "",
                  );
                  expect(textTrack.closedCaption).to.equal(!!adaptation.isClosedCaption);

                  const activeTextTrack = player.getTextTrack();
                  expect(textTrack.active).to.equal(
                    activeTextTrack ? activeTextTrack.id === textTrack.id : false,
                  );
                }
              }
              expect(found).to.equal(true);
            }
          }
        });
      });
    });

    describe("getAvailableVideoTracks", () => {
      it("should list the right video tracks", async function () {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          segmentLoader: () => {
            /* do nothing */
          },
        });
        await checkAfterSleepWithBackoff({ maxTimeMs: 50 }, () => {
          const videoTracks = player.getAvailableVideoTracks();

          const videoAdaptations = manifestInfos.periods[0].adaptations.video;
          expect(videoTracks.length).to.equal(
            videoAdaptations ? videoAdaptations.length : 0,
          );

          if (videoAdaptations) {
            for (let i = 0; i < videoAdaptations.length; i++) {
              const adaptation = videoAdaptations[i];
              let found = false;
              for (let j = 0; j < videoTracks.length; j++) {
                const videoTrack = videoTracks[j];
                if (videoTrack.id === adaptation.id) {
                  found = true;

                  for (
                    let representationIndex = 0;
                    representationIndex < videoTrack.representations.length;
                    representationIndex++
                  ) {
                    const reprTrack = videoTrack.representations[representationIndex];
                    const representation = adaptation.representations.find(
                      ({ id }) => id === reprTrack.id,
                    );
                    expect(reprTrack.bitrate).to.equal(representation.bitrate);
                    expect(reprTrack.frameRate).to.equal(representation.frameRate);
                    expect(reprTrack.width).to.equal(representation.width);
                    expect(reprTrack.height).to.equal(representation.height);
                  }

                  const activeVideoTrack = player.getVideoTrack();
                  expect(videoTrack.active).to.equal(
                    activeVideoTrack ? activeVideoTrack.id === videoTrack.id : false,
                  );
                }
              }
              expect(found).to.equal(true);
            }
          }
        });
      });
    });

    describe("setWantedBufferAhead", () => {
      // TODO handle live contents
      it("should download until a set wanted buffer ahead", async function () {
        this.timeout(20000);
        lockLowestBitrates(player);
        player.setWantedBufferAhead(10);
        expect(player.getWantedBufferAhead()).to.equal(10);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        await checkAfterSleepWithBackoff({ maxTimeMs: 3000 }, () => {
          const buffered = player.getVideoElement().buffered;
          expect(buffered.length).to.equal(1);
          expect(buffered.start(0)).to.be.closeTo(minimumPosition, 0.5);
          const endOfCurrentRange = buffered.end(0);
          expect(endOfCurrentRange).to.be.at.least(minimumPosition + 9.7);
          expect(endOfCurrentRange).to.be.at.most(minimumPosition + 10 + 10);
        });

        player.setWantedBufferAhead(20);
        expect(player.getWantedBufferAhead()).to.equal(20);
        await checkAfterSleepWithBackoff({ maxTimeMs: 3000 }, () => {
          const buffered = player.getVideoElement().buffered;
          expect(buffered.length).to.equal(1);
          expect(buffered.start(0)).to.be.closeTo(minimumPosition, 0.5);
          const endOfCurrentRange = buffered.end(0);
          expect(endOfCurrentRange).to.be.at.least(minimumPosition + 19.7);
          expect(endOfCurrentRange).to.be.at.most(minimumPosition + 20 + 10);
        });

        player.seekTo(minimumPosition + 10);
        await checkAfterSleepWithBackoff({ maxTimeMs: 3000 }, () => {
          const buffered = player.getVideoElement().buffered;
          expect(player.getWantedBufferAhead()).to.equal(20);
          expect(buffered.length).to.equal(1);
          expect(buffered.start(0)).to.be.closeTo(minimumPosition, 0.5);
          const endOfCurrentRange = buffered.end(0);
          expect(endOfCurrentRange).to.be.at.least(
            Math.min(minimumPosition + 10 + 19.7, player.getMaximumPosition() - 2),
          );
          expect(endOfCurrentRange).to.be.at.most(minimumPosition + 10 + 20 + 10);
        });

        player.seekTo(minimumPosition + 10 + 20 + 10 + 10);
        await checkAfterSleepWithBackoff({ maxTimeMs: 3000 }, () => {
          const buffered = player.getVideoElement().buffered;
          expect(player.getWantedBufferAhead()).to.equal(20);
          expect(buffered.length).to.equal(2);
          expect(buffered.start(1)).to.be.at.most(minimumPosition + 10 + 20 + 10 + 10);
          const endOfCurrentRange = buffered.end(1);
          expect(endOfCurrentRange).to.be.at.least(
            Math.min(
              minimumPosition + 10 + 20 + 10 + 10 + 19.4,
              player.getMaximumPosition() - 2,
            ),
          );
          expect(endOfCurrentRange).to.be.at.most(
            minimumPosition + 10 + 20 + 10 + 10 + 20 + 10,
          );
        });

        player.setWantedBufferAhead(Infinity);
        expect(player.getWantedBufferAhead()).to.equal(Infinity);
        await checkAfterSleepWithBackoff({ maxTimeMs: 3000 }, () => {
          const buffered = player.getVideoElement().buffered;
          expect(buffered.length).to.equal(2);
          expect(buffered.start(1)).to.be.at.most(minimumPosition + 10 + 20 + 10 + 10);
          const endOfCurrentRange = buffered.end(1);
          expect(endOfCurrentRange).to.be.at.least(player.getMaximumPosition() - 2);
          expect(endOfCurrentRange).to.be.at.most(player.getMaximumPosition() + 10);
        });
      });
    });
  });
}
