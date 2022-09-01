import { expect } from "chai";
import RxPlayer from "../../../src";
import sleep from "../../utils/sleep.js";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";
import XHRMock from "../../utils/request_mock";

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
 *                                          .mediaURLs {string}
 *                                     .segments[]
 *                                                .time {number}
 *                                                .timescale {number}
 *                                                .duration {number}
 *                                                .mediaURLs {string}
 * ```
 */
export default function launchTestsForContent(manifestInfos) {
  let player;
  let xhrMock;

  const { isLive,
          maximumPosition,
          minimumPosition,
          periods: periodsInfos,
          transport } = manifestInfos;

  const firstPeriodIndex = isLive ? periodsInfos.length - 1 : 0;

  describe("API tests", () => {
    beforeEach(() => {
      player = new RxPlayer();
      xhrMock = new XHRMock();
    });

    afterEach(() => {
      player.dispose();
      xhrMock.restore();
    });

    describe("loadVideo", () => {
      it("should fetch the manifest then the init segments", async function () {
        xhrMock.lock();

        // set the lowest bitrate to facilitate the test
        player.setMaxVideoBitrate(0);
        player.setMaxVideoBitrate(0);

        player.loadVideo({ url: manifestInfos.url, transport });

        // should only have the manifest for now
        await sleep(1);
        expect(xhrMock.getLockedXHR().length).to.equal(1);
        expect(xhrMock.getLockedXHR()[0].url).to.equal(manifestInfos.url);

        await xhrMock.flush(); // only wait for the manifest request
        await sleep(1);

        expect(player.getPlayerState()).to.equal("LOADING");

        const firstPeriodAdaptationsInfos = periodsInfos[firstPeriodIndex]
          .adaptations;
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
            (audioRepresentationInfos && audioRepresentationInfos.index.init) &&
            (videoRepresentationInfos && videoRepresentationInfos.index.init)
          ) {
            expect(xhrMock.getLockedXHR().length)
              .to.be.at.least(2, "should request two init segments");
            const requestsDone = xhrMock.getLockedXHR().map(({ url }) => url);
            expect(requestsDone)
              .to.include(videoRepresentationInfos.index.init.mediaURLs[0]);
            expect(requestsDone)
              .to.include(audioRepresentationInfos.index.init.mediaURLs[0]);
          } else if (!(
            audioRepresentationInfos && audioRepresentationInfos.index.init)
          ) {
            expect(xhrMock.getLockedXHR().length).to.equal(1);
            expect(xhrMock.getLockedXHR()[0].url).to
              .equal(videoRepresentationInfos.index.init.mediaURLs[0]);
          } else {
            expect(xhrMock.getLockedXHR().length).to.equal(1);
            expect(xhrMock.getLockedXHR()[0].url).to
              .equal(audioRepresentationInfos.index.init.mediaURLs[0]);
          }
        }
      });

      if (transport === "dash" || transport === "smooth") {
        it("should not do the initial manifest request if an `initialManifest` option is set as a string", async function () {
          const initialManifest = await (
            (await fetch(manifestInfos.url))
              .text());
          xhrMock.lock();
          player.loadVideo({ url: manifestInfos.url,
                             transport,
                             transportOptions: { initialManifest } });

          await sleep(100);
          expect(xhrMock.getLockedXHR().length).to.be.at.least(1);
          expect(xhrMock.getLockedXHR()[0].url).not.to.equal(manifestInfos.url);
        });
        it("should not do the initial manifest request if an `initialManifest` option is set as a document", async function () {
          const initialManifestStr = await (
            (await fetch(manifestInfos.url))
              .text());
          const initialManifest = new DOMParser().parseFromString(initialManifestStr, "text/xml");
          xhrMock.lock();
          player.loadVideo({ url: manifestInfos.url,
                             transport,
                             transportOptions: { initialManifest } });

          await sleep(100);
          expect(xhrMock.getLockedXHR().length).to.be.at.least(1);
          expect(xhrMock.getLockedXHR()[0].url).not.to.equal(manifestInfos.url);
        });
      }
    });

    describe("getError", () => {
      it("should return null if no fatal error has happened", async function() {
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
        player.setMaxVideoBitrate(0);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        if (!manifestInfos.isLive) {
          expect(player.getPosition())
            .to.be.closeTo(manifestInfos.minimumPosition, 0.1);
        } else {
          expect(player.getPosition())
            .to.be.closeTo(manifestInfos.maximumPosition - 10, 5);
        }
        player.reload({
          reloadAt: { position: manifestInfos.minimumPosition + 5 }
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition())
          .to.be.closeTo(manifestInfos.minimumPosition + 5, 0.1);
      });
      it("should reload at given relative position", async function () {
        player.setMaxVideoBitrate(0);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: manifestInfos.minimumPosition + 2 }
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition())
          .to.be.closeTo(manifestInfos.minimumPosition + 2, 0.1);
        player.reload({ reloadAt: { relative: 5 }});
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition())
          .to.be.closeTo(manifestInfos.minimumPosition + 7, 0.1);
      });
      it("should reload after stop, at given relative position", async function () {
        player.setMaxVideoBitrate(0);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: manifestInfos.minimumPosition + 2 }
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition())
          .to.be.closeTo(manifestInfos.minimumPosition + 2, 1);
        player.stop();
        player.reload({ reloadAt: { relative: 5 }});
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition())
          .to.be.closeTo(manifestInfos.minimumPosition + 7, 1.5);
      });
      it("should reload when seeking at last playback position", async function () {
        player.setMaxVideoBitrate(0);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: manifestInfos.minimumPosition }
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition())
          .to.be.closeTo(manifestInfos.minimumPosition, 0.1);
        player.seekTo({ position: manifestInfos.minimumPosition + 5 });
        player.reload();
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition())
          .to.be.closeTo(manifestInfos.minimumPosition + 5, 0.1);
      });
      it("should not reload when content is not loaded", async function () {
        player.setMaxVideoBitrate(0);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          startAt: { position: manifestInfos.minimumPosition }
        });
        expect(() => player.reload())
          .to.throw("API: Can't reload without having previously loaded a content.");
      });
      it("should not reload when no content", async function () {
        player.setMaxVideoBitrate(0);
        expect(() => player.reload())
          .to.throw("API: Can't reload without having previously loaded a content.");
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

      it("should go to PLAYING when play is called", async function() {
        this.timeout(5000);
        expect(player.getPlayerState()).to.equal("STOPPED");

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        player.play();
        await sleep(1000);
        expect(player.getPlayerState()).to.equal("PLAYING");
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
      it("should return the buffer gap of the current range", async function() {
        this.timeout(20000);

        player.setMinVideoBitrate(Infinity);
        player.setWantedBufferAhead(10);
        expect(player.getWantedBufferAhead()).to.equal(10);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        await sleep(3000);

        let bufferGap = player.getCurrentBufferGap();
        expect(bufferGap).to.be.at.least(9.5);
        expect(bufferGap).to.be.at.most(10 + 10);

        player.setWantedBufferAhead(20);
        expect(player.getWantedBufferAhead()).to.equal(20);
        await sleep(3000);
        bufferGap = player.getCurrentBufferGap();
        expect(bufferGap).to.be.at.least(19.5);
        expect(bufferGap).to.be.at.most(20 + 10);

        player.seekTo(minimumPosition + 10);
        await sleep(3000);
        expect(player.getWantedBufferAhead()).to.equal(20);
        bufferGap = player.getCurrentBufferGap();
        expect(bufferGap).to.be.at.least(19.5);
        expect(bufferGap).to.be.at.most(20 + 10);

        player.seekTo(minimumPosition + 10 + 30);
        await sleep(3000);
        expect(player.getWantedBufferAhead()).to.equal(20);
        bufferGap = player.getCurrentBufferGap();
        expect(bufferGap).to.be.at.least(19.5);
        expect(bufferGap).to.be.at.most(20 + 10);

        player.setWantedBufferAhead(Infinity);
        expect(player.getWantedBufferAhead()).to.equal(Infinity);
        await sleep(4000);
        bufferGap = player.getCurrentBufferGap();
        expect(bufferGap).to.be
          .at.least(player.getMaximumPosition() -
                      minimumPosition - (10 + 30) - 2);
        expect(bufferGap).to.be
          .at.most(player.getMaximumPosition() -
                     minimumPosition - (10 + 30) + 10);
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
        expect(player.getWallClockTime()).to.be
          .closeTo(minimumPosition + 4, 0.001);
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
      it("should update the speed accordingly", async function() {
        this.timeout(7000);
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPosition()).to.be.closeTo(minimumPosition, 0.001);
        player.setPlaybackRate(1);
        player.play();
        await sleep(3000);
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be.closeTo(minimumPosition + 3, 1);

        player.setPlaybackRate(3);
        await sleep(2000);
        const secondPosition = player.getPosition();
        expect(secondPosition).to.be
          .closeTo(initialPosition + 3 * 2, 1.5);
      });
    });

    describe("getVideoBitrate", () => {
      it("should give a value once loaded", async () => {
        expect(player.getVideoBitrate()).to.equal(undefined);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        expect(player.getVideoBitrate()).to.equal(undefined);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getVideoBitrate()).to.not.equal(undefined);
      });
    });

    describe("getAudioBitrate", () => {
      it("should give a value once loaded", async () => {
        expect(player.getAudioBitrate()).to.equal(undefined);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        expect(player.getAudioBitrate()).to.equal(undefined);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getAudioBitrate()).to.not.equal(undefined);
      });
    });

    describe("getMaxVideoBitrate", () => {
      it("should stay at Infinity by default", async () => {
        expect(player.getMaxVideoBitrate()).to.equal(Infinity);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getMaxVideoBitrate()).to.equal(Infinity);
      });

      it("should be able to update", async () => {
        player.setMaxVideoBitrate(10000);
        expect(player.getMaxVideoBitrate()).to.equal(10000);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        expect(player.getMaxVideoBitrate()).to.equal(10000);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getMaxVideoBitrate()).to.equal(10000);
        player.setMaxVideoBitrate(5);
        expect(player.getMaxVideoBitrate()).to.equal(5);
      });
    });

    describe("getMaxAudioBitrate", () => {
      it("should stay at Infinity by default", async () => {
        expect(player.getMaxAudioBitrate()).to.equal(Infinity);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getMaxAudioBitrate()).to.equal(Infinity);
      });

      it("should be able to update", async () => {
        player.setMaxVideoBitrate(10000);
        expect(player.getMaxVideoBitrate()).to.equal(10000);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });

        expect(player.getMaxVideoBitrate()).to.equal(10000);
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getMaxVideoBitrate()).to.equal(10000);
        player.setMaxVideoBitrate(5);
        expect(player.getMaxVideoBitrate()).to.equal(5);
      });
    });

    describe("play", () => {
      it("should begin to play if LOADED", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        player.play();
        await sleep(10);
        expect(player.getPlayerState()).to.equal("PLAYING");
      });

      it("should resume if paused", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        await sleep(100);
        expect(player.getPlayerState()).to.equal("PLAYING");
        player.pause();
        await sleep(100);
        expect(player.getPlayerState()).to.equal("PAUSED");
        player.play();
        await sleep(100);
        expect(player.getPlayerState()).to.equal("PLAYING");
      });
    });

    describe("pause", () => {
      it("should have no effect when LOADED", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        player.pause();
        await sleep(10);
        expect(player.getPlayerState()).to.equal("LOADED");
      });

      it("should pause if playing", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        player.pause();
        await sleep(100);
        expect(player.getPlayerState()).to.equal("PAUSED");
      });

      it("should do nothing if already paused", async () => {
        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        player.pause();
        await sleep(100);
        expect(player.getPlayerState()).to.equal("PAUSED");
        player.pause();
        await sleep(100);
        expect(player.getPlayerState()).to.equal("PAUSED");
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
    });

    describe("getVolume", () => {
      it("should return the current media elment volume", async () => {
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

      it("should return 0 if muted", async () => {
        const initialVolume = player.getVideoElement().volume;
        expect(player.getVolume()).to.equal(initialVolume);
        player.mute();
        expect(player.getVolume()).to.equal(0);
        player.unMute();
        expect(player.getVolume()).to.equal(initialVolume);
        player.mute();

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.getVolume()).to.equal(0);
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

      it("should un-mute when muted", async () => {
        player.mute();
        expect(player.isMute()).to.equal(true);
        player.setVolume(0.25);
        expect(player.getVolume()).to.equal(0.25);
        expect(player.isMute()).to.equal(false);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.isMute()).to.equal(false);
        player.mute();
        expect(player.isMute()).to.equal(true);
        player.setVolume(0.33);
        expect(player.getVolume()).to.equal(0.33);
        expect(player.isMute()).to.equal(false);

        await waitForLoadedStateAfterLoadVideo(player);

        expect(player.isMute()).to.equal(false);
        player.mute();
        expect(player.isMute()).to.equal(true);
        player.setVolume(0.45);
        expect(player.getVolume()).to.equal(0.45);
        expect(player.isMute()).to.equal(false);
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
        expect(player.isMute()).to.equal(false);
      });
    });

    describe("mute", () => {
      it("should set the volume to 0", async () => {
        const initialVolume = player.getVideoElement().volume;
        player.mute();
        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(0);
        expect(player.getVideoElement().volume).to.equal(0);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(0);
        expect(player.getVideoElement().volume).to.equal(0);
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
        expect(player.getVolume()).to.equal(0);
        expect(player.getVideoElement().volume).to.equal(0);
        player.setVolume(1);
        expect(player.isMute()).to.equal(false);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
      });
    });

    describe("unMute", async () => {
      it("should unmute when the volume is muted", async () => {
        const initialVolume = player.getVideoElement().volume;
        player.mute();
        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(0);
        expect(player.getVideoElement().volume).to.equal(0);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: true,
        });

        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(0);
        expect(player.getVideoElement().volume).to.equal(0);
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
        expect(player.getVolume()).to.equal(0);
        expect(player.getVideoElement().volume).to.equal(0);
        player.setVolume(1);
        expect(player.isMute()).to.equal(false);
        expect(player.getVolume()).to.equal(initialVolume);
        expect(player.getVideoElement().volume).to.equal(initialVolume);
      });
    });

    describe("getAvailableAudioTracks", () => {
      it("should list the right audio languages", async function () {
        xhrMock.lock();

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        expect(player.getAvailableAudioTracks()).to.eql([]);

        await sleep(1);
        expect(player.getAvailableAudioTracks()).to.eql([]);
        await xhrMock.flush();
        await sleep(50);

        const audioTracks = player.getAvailableAudioTracks();

        const audioAdaptations = manifestInfos.periods[0].adaptations.audio;
        expect(audioTracks.length).to
          .equal(audioAdaptations ? audioAdaptations.length : 0);

        if (audioAdaptations) {
          for (let i = 0; i < audioAdaptations.length; i++) {
            const adaptation = audioAdaptations[i];
            let found = false;
            for (let j = 0; j < audioTracks.length; j++) {
              const audioTrack = audioTracks[j];
              if (audioTrack.id === adaptation.id) {
                found = true;
                expect(audioTrack.language).to.equal(adaptation.language || "");
                expect(audioTrack.normalized).to
                  .equal(adaptation.normalizedLanguage || "");
                expect(audioTrack.audioDescription)
                  .to.equal(!!adaptation.isAudioDescription);

                const activeAudioTrack = player.getAudioTrack();
                expect(audioTrack.active).to
                  .equal(activeAudioTrack ?
                    activeAudioTrack.id === audioTrack.id : false);
              }
            }
            expect(found).to.equal(true);
          }
        }
      });
    });

    describe("getAvailableTextTracks", () => {
      it("should list the right text languages", async function () {
        xhrMock.lock();

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        expect(player.getAvailableTextTracks()).to.eql([]);

        await sleep(1);
        expect(player.getAvailableTextTracks()).to.eql([]);
        await xhrMock.flush();
        await sleep(50);

        const textTracks = player.getAvailableTextTracks();

        const textAdaptations = manifestInfos.periods[0].adaptations.text;
        expect(textTracks.length).to
          .equal(textAdaptations ? textAdaptations.length : 0);

        if (textAdaptations) {
          for (let i = 0; i < textAdaptations.length; i++) {
            const adaptation = textAdaptations[i];
            let found = false;
            for (let j = 0; j < textTracks.length; j++) {
              const textTrack = textTracks[j];
              if (textTrack.id === adaptation.id) {
                found = true;
                expect(textTrack.language).to.equal(adaptation.language || "");
                expect(textTrack.normalized).to
                  .equal(adaptation.normalizedLanguage || "");
                expect(textTrack.closedCaption)
                  .to.equal(!!adaptation.isClosedCaption);

                const activeTextTrack = player.getTextTrack();
                expect(textTrack.active).to
                  .equal(activeTextTrack ?
                    activeTextTrack.id === textTrack.id : false);
              }
            }
            expect(found).to.equal(true);
          }
        }
      });
    });

    describe("getAvailableVideoTracks", () => {
      it("should list the right video tracks", async function () {
        xhrMock.lock();

        player.loadVideo({
          url: manifestInfos.url,
          transport,
        });
        expect(player.getAvailableVideoTracks()).to.eql([]);

        await sleep(1);
        expect(player.getAvailableVideoTracks()).to.eql([]);
        await xhrMock.flush();
        await sleep(50);

        const videoTracks = player.getAvailableVideoTracks();

        const videoAdaptations = manifestInfos.periods[0].adaptations.video;
        expect(videoTracks.length).to
          .equal(videoAdaptations ? videoAdaptations.length : 0);

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
                  const reprTrack = videoTrack
                    .representations[representationIndex];
                  const representation = adaptation.representations
                    .find(({ id }) => id === reprTrack.id);
                  expect(reprTrack.bitrate).to.equal(representation.bitrate);
                  expect(reprTrack.frameRate).to
                    .equal(representation.frameRate);
                  expect(reprTrack.width).to.equal(representation.width);
                  expect(reprTrack.height).to.equal(representation.height);
                }

                const activeVideoTrack = player.getVideoTrack();
                expect(videoTrack.active).to
                  .equal(activeVideoTrack ?
                    activeVideoTrack.id === videoTrack.id : false);
              }
            }
            expect(found).to.equal(true);
          }
        }
      });
    });

    describe("setWantedBufferAhead", () => {
      // TODO handle live contents
      it("should download until a set wanted buffer ahead", async function() {
        this.timeout(20000);
        player.setMaxVideoBitrate(0);
        player.setWantedBufferAhead(10);
        expect(player.getWantedBufferAhead()).to.equal(10);

        player.loadVideo({
          url: manifestInfos.url,
          transport,
          autoPlay: false,
        });
        await waitForLoadedStateAfterLoadVideo(player);
        await sleep(3000);
        let buffered = player.getVideoElement().buffered;
        expect(buffered.length).to.equal(1);
        expect(buffered.start(0)).to.be.closeTo(minimumPosition, 0.5);
        let endOfCurrentRange = buffered.end(0);
        expect(endOfCurrentRange).to.be
          .at.least(minimumPosition + 9.7);
        expect(endOfCurrentRange).to.be
          .at.most(minimumPosition + 10 + 10);

        player.setWantedBufferAhead(20);
        expect(player.getWantedBufferAhead()).to.equal(20);
        await sleep(3000);
        buffered = player.getVideoElement().buffered;
        expect(buffered.length).to.equal(1);
        expect(buffered.start(0)).to.be.closeTo(minimumPosition, 0.5);
        endOfCurrentRange = buffered.end(0);
        expect(endOfCurrentRange).to.be
          .at.least(minimumPosition + 19.7);
        expect(endOfCurrentRange).to.be
          .at.most(minimumPosition + 20 + 10);

        player.seekTo(minimumPosition + 10);
        await sleep(3000);
        buffered = player.getVideoElement().buffered;
        expect(player.getWantedBufferAhead()).to.equal(20);
        expect(buffered.length).to.equal(1);
        expect(buffered.start(0)).to.be.closeTo(minimumPosition, 0.5);
        endOfCurrentRange = buffered.end(0);
        expect(endOfCurrentRange).to.be
          .at.least(Math.min(
            minimumPosition + 10 + 19.7,
            player.getMaximumPosition() - 2
          ));
        expect(endOfCurrentRange).to.be
          .at.most(minimumPosition + 10 + 20 + 10);

        player.seekTo(minimumPosition + 10 + 20 + 10 + 10);
        await sleep(3000);
        buffered = player.getVideoElement().buffered;
        expect(player.getWantedBufferAhead()).to.equal(20);
        expect(buffered.length).to.equal(2);
        expect(buffered.start(1)).to.be
          .at.most(minimumPosition + 10 + 20 + 10 + 10);
        endOfCurrentRange = buffered.end(1);
        expect(endOfCurrentRange).to.be
          .at.least(Math.min(
            minimumPosition + 10 + 20 + 10 +10 + 19.4,
            player.getMaximumPosition() - 2
          ));
        expect(endOfCurrentRange).to.be
          .at.most(minimumPosition + 10 + 20 + 10 +10 + 20 + 10);

        player.setWantedBufferAhead(Infinity);
        expect(player.getWantedBufferAhead()).to.equal(Infinity);
        await sleep(3000);
        buffered = player.getVideoElement().buffered;
        expect(buffered.length).to.equal(2);
        expect(buffered.start(1)).to.be
          .at.most(minimumPosition + 10 + 20 + 10 + 10);
        endOfCurrentRange = buffered.end(1);
        expect(endOfCurrentRange).to.be
          .at.least(player.getMaximumPosition() - 2);
        expect(endOfCurrentRange).to.be
          .at.most(player.getMaximumPosition() + 10);
      });
    });
  });
}
