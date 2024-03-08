/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { expect } from "chai";
import RxPlayer from "../../../dist/es2017";
import { MULTI_THREAD } from "../../../dist/es2017/experimental/features/index.js";
import {
  EMBEDDED_WORKER,
  EMBEDDED_DASH_WASM,
  EMBEDDED_WORKER_ES5,
} from "../../../dist/es2017/__GENERATED_CODE/index.js";
import { manifestInfos } from "../../contents/DASH_static_SegmentTimeline";
import sleep from "../../utils/sleep.js";
import waitForState, {
  waitForLoadedStateAfterLoadVideo,
} from "../../utils/waitForPlayerState";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";

runInitialPlaybackTests();
runInitialPlaybackTests({ multithread: true });
runInitialPlaybackTests({ multithread: true, es5Worker: true });

/**
 * Test various cases of errors linked to starting playback.
 * @param {Object} [options]
 * @param {Boolean} [options.multithread] - If `true`, those tests will be run
 * if the RxPlayer runs in multithread mode.
 * In any other cases, tests will run in monothread mode.
 * @param {Boolean} [options.es5Worker] - If `true`, multithread tests will be
 * run in the ES5 version of the WebWorker file.
 */
function runInitialPlaybackTests({ multithread, es5Worker } = {}) {
  let title = "basic playback use cases: non-linear DASH SegmentTimeline";
  if (multithread === true) {
    RxPlayer.addFeatures([MULTI_THREAD]);
    title = "basic playback use cases: non-linear DASH SegmentTimeline with worker";
  }

  describe(title, function () {
    let player;

    beforeEach(() => {
      player = new RxPlayer();
      if (multithread === true) {
        player.attachWorker({
          workerUrl: es5Worker ? EMBEDDED_WORKER_ES5 : EMBEDDED_WORKER,
          dashWasmUrl: EMBEDDED_DASH_WASM,
        });
      }
    });

    afterEach(() => {
      player.dispose();
    });

    it("should begin playback on play", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.play();
      await checkAfterSleepWithBackoff({ stepMs: 100, maxTimeMs: 1000 }, () => {
        expect(player.getPosition()).to.be.above(0);
        expect(player.getPosition()).to.be.below(1);
        expect(player.getCurrentBufferGap()).to.be.above(0);
        expect(player.getVideoElement().buffered.start(0)).to.be.below(
          player.getPosition(),
        );
      });
    });

    it("should play slowly for a speed inferior to 1", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.setPlaybackRate(0.5);
      player.play();
      const lastPosition = player.getPosition();
      await checkAfterSleepWithBackoff({ stepMs: 100, maxTimeMs: 350 }, () => {
        expect(player.getPosition()).to.be.below(0.35);
        expect(player.getPosition()).to.be.above(0.05);
        expect(player.getPosition()).to.be.above(lastPosition);
        expect(player.getVideoElement().buffered.start(0)).to.be.below(
          player.getPosition(),
        );
        expect(player.getPlaybackRate()).to.equal(0.5);
        expect(player.getVideoElement().playbackRate).to.equal(0.5);
      });
    });

    it("should play faster for a speed superior to 1", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.setPlaybackRate(3);
      player.play();
      await checkAfterSleepWithBackoff(
        { minTimeMs: 700, stepMs: 100, maxTimeMs: 1400 },
        () => {
          expect(player.getPosition()).to.be.below(4);
          expect(player.getPosition()).to.be.above(2);
          expect(player.getCurrentBufferGap()).to.be.above(0);
          expect(player.getVideoElement().buffered.start(0)).to.be.below(
            player.getPosition(),
          );
          expect(player.getPlaybackRate()).to.equal(3);
          expect(player.getVideoElement().playbackRate).to.equal(3);
        },
      );
    });

    it("should be able to seek when loaded", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.seekTo(10);
      expect(player.getPosition()).to.equal(10);
      expect(player.getPlayerState()).to.equal("LOADED");
      player.play();
      await checkAfterSleepWithBackoff({ maxTimeMs: 5000 }, () => {
        expect(player.getPlayerState()).to.equal("PLAYING");
        expect(player.getPosition()).to.be.above(10);
      });
    });

    // TODO This often breaks, presumably due to the badly-encoded content.
    // To check
    xit("should end if seeking to the end when loaded", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.seekTo(player.getMaximumPosition() + 15);
      await sleep(200);
      // FIXME: Chrome seems to have an issue with that content where we need to
      // seek two times for this test to pass.
      if (player.getPlayerState() === "PAUSED") {
        player.seekTo(player.getMaximumPosition() + 15);
      }
      await checkAfterSleepWithBackoff({}, () => {
        expect(player.getPlayerState()).to.equal("ENDED");
      });
    });

    // TODO This often breaks, presumably due to the badly-encoded content.
    // To check
    xit("should end if seeking to the end when playing", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        autoPlay: true,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.seekTo(player.getMaximumPosition() + 15);
      await checkAfterSleepWithBackoff({}, () => {
        expect(player.getPlayerState()).to.equal("ENDED");
      });
    });

    it("should seek to minimum position for negative positions when loaded", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.seekTo(-2);
      expect(player.getPosition()).to.equal(player.getMinimumPosition());
      expect(player.getPlayerState()).to.equal("LOADED");
      player.play();
      await checkAfterSleepWithBackoff({}, () => {
        expect(player.getPlayerState()).to.equal("PLAYING");
        expect(player.getPosition()).to.be.above(player.getMinimumPosition());
      });
    });

    it("should seek to maximum position if manual seek is higher than maximum when loaded", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.seekTo(200);
      expect(player.getPlayerState()).to.equal("LOADED");
      expect(player.getPosition()).to.be.closeTo(player.getMaximumPosition(), 0.1);
    });

    it("should seek to minimum position for negative positions after playing", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.play();
      await sleep(100);
      player.seekTo(-2);
      expect(player.getPosition()).to.equal(player.getMinimumPosition());
      expect(player.getPlayerState()).to.equal("PLAYING");
    });

    it("should seek to maximum position if manual seek is higher than maximum after playing", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlayerState()).to.equal("LOADED");
      player.play();
      player.seekTo(200);
      expect(player.getPosition()).to.be.closeTo(player.getMaximumPosition(), 0.1);
    });

    it("should seek to minimum position for negative positions when paused", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.play();
      await sleep(100);
      player.pause();
      await sleep(10);
      expect(player.getPlayerState()).to.equal("PAUSED");
      player.seekTo(-2);
      expect(player.getPosition()).to.equal(player.getMinimumPosition());
      expect(player.getPlayerState()).to.equal("PAUSED");
    });

    it("should seek to maximum position if manual seek is higher than maximum when paused", async function () {
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlayerState()).to.equal("LOADED");
      player.play();
      await sleep(100);
      player.pause();
      await sleep(10);
      expect(player.getPlayerState()).to.equal("PAUSED");
      player.seekTo(200);
      expect(player.getPosition()).to.be.closeTo(player.getMaximumPosition(), 0.1);
      expect(player.getPlayerState()).to.equal("PAUSED");
    });

    it("should download first segment when wanted buffer ahead is under first segment duration", async function () {
      let manifestLoaderCalledTimes = 0;
      let segmentLoaderLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(manifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = (_, callbacks) => {
        segmentLoaderLoaderCalledTimes++;
        callbacks.fallback();
      };
      player.setWantedBufferAhead(2);
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        manifestLoader,
        segmentLoader,
      });

      expect(manifestLoaderCalledTimes).to.equal(1);
      await sleep(100);
      expect(manifestLoaderCalledTimes).to.equal(1);

      expect(segmentLoaderLoaderCalledTimes).to.equal(4);
      expect(player.getCurrentBufferGap()).to.be.above(4);
      expect(player.getCurrentBufferGap()).to.be.below(5);
    });

    it("should download more than the first segment when wanted buffer ahead is over the first segment duration", async function () {
      let manifestLoaderCalledTimes = 0;
      let segmentLoaderLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(manifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = (_, callbacks) => {
        segmentLoaderLoaderCalledTimes++;
        callbacks.fallback();
      };
      player.setWantedBufferAhead(20);
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
        manifestLoader,
        segmentLoader,
      });

      expect(manifestLoaderCalledTimes).to.equal(1);
      await sleep(100);
      expect(manifestLoaderCalledTimes).to.equal(1);

      expect(segmentLoaderLoaderCalledTimes).to.equal(12);
      expect(player.getCurrentBufferGap()).to.be.above(18);
      expect(player.getCurrentBufferGap()).to.be.below(30);
    });

    it("should continue downloading when seek to wanted buffer ahead", async function () {
      player.setWantedBufferAhead(2);
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await sleep(100);
      const lastPositionWithBuffer = player.getVideoElement().buffered.end(0);
      player.seekTo(lastPositionWithBuffer);
      await sleep(100);
      expect(player.getVideoElement().buffered.end(0)).to.be.above(
        lastPositionWithBuffer,
      );
      player.play();
      await sleep(100);
      expect(player.getPlayerState()).to.equal("PLAYING");
    });

    it("should respect a set max buffer ahead", async function () {
      player.setWantedBufferAhead(5);
      player.setMaxBufferAhead(10);
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await sleep(40);
      player.seekTo(10);
      await sleep(40);
      player.seekTo(0);
      await sleep(40);

      // The real limit is actually closer to the duration of a segment
      expect(Math.round(player.getCurrentBufferGap())).to.be.below(13);
    });

    it("should delete buffer behind", async function () {
      player.setMaxBufferAhead(30);
      player.setMaxBufferBehind(2);

      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await sleep(50);

      player.seekTo(6);

      await checkAfterSleepWithBackoff({}, () => {
        expect(Math.round(player.getVideoElement().buffered.start(0))).to.equal(4);
      });
    });

    it("may switch to SEEKING state when seeking to a buffered part when playing", async function () {
      this.timeout(5000);
      player.setWantedBufferAhead(30);
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.play();
      await checkAfterSleepWithBackoff({}, () => {
        expect(player.getPlayerState()).to.equal("PLAYING");
        expect(player.getCurrentBufferGap()).to.be.above(20);
      });

      player.seekTo(10);
      await waitForState(player, "SEEKING", ["PLAYING"]);
      expect(player.getCurrentBufferGap()).to.be.above(10);
      await checkAfterSleepWithBackoff({}, () => {
        expect(player.getCurrentBufferGap()).to.be.above(10);
        expect(player.getPlayerState()).to.equal("PLAYING");
      });
    });

    it("may switch to SEEKING state when seeking to a buffered part when paused", async function () {
      this.timeout(5000);
      player.setWantedBufferAhead(30);
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await checkAfterSleepWithBackoff({}, () => {
        expect(player.getPlayerState()).to.equal("LOADED");
        expect(player.getCurrentBufferGap()).to.be.above(20);
      });

      player.seekTo(10);
      await waitForState(player, "SEEKING", ["PAUSED"]);
      expect(player.getCurrentBufferGap()).to.be.above(10);
      await sleep(1000);
      expect(player.getCurrentBufferGap()).to.be.above(10);
      expect(player.getPlayerState()).to.equal("PAUSED");
    });

    it("should be in SEEKING state when seeking to a non-buffered part when playing", async function () {
      player.setWantedBufferAhead(4);
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.play();
      await sleep(100);
      expect(player.getPlayerState()).to.equal("PLAYING");

      player.seekTo(10);
      await waitForState(player, "SEEKING", ["PLAYING"]);
      expect(player.getCurrentBufferGap()).to.equal(0);

      await waitForState(player, "PLAYING", ["SEEKING"]);
      expect(player.getCurrentBufferGap()).to.be.above(1);
      expect(player.getCurrentBufferGap()).to.be.below(10);
    });

    it("should respect a set max buffer size", async function () {
      this.timeout(4000);

      // Force a given video Representation
      let hasLockedRepresentation = false;
      const chosenVideoRepresentation =
        manifestInfos.periods[0].adaptations.video[0].representations[0];
      player.addEventListener("newAvailablePeriods", (p) => {
        if (hasLockedRepresentation || p.length === 0) {
          return;
        }
        player.setVideoTrack({
          periodId: p[0].id,
          trackId: manifestInfos.periods[0].adaptations.video[0].id,
          lockedRepresentations: [chosenVideoRepresentation.id],
        });
        hasLockedRepresentation = true;
      });

      player.setWantedBufferAhead(100);
      const { bitrate } = chosenVideoRepresentation;
      // A segment is a little bit more than 4sec, so not enough for
      // MIN_BUFF_SIZE ( MIN_BUFF_SIZE is 5sec) so the rx player will
      // download 2 segments So we take two segments : a bit more than 8sec
      const maxBuffersize = (bitrate / 8000) * 6;
      player.setMaxVideoBufferSize(maxBuffersize);
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await sleep(800);
      // And to take into consideration the estimation errors,
      // we round it up to 9sec
      expect(player.getCurrentBufferGap()).to.be.below(6 * 3);
      expect(player.getCurrentBufferGap()).to.be.above(6 * 1);
    });

    it("should remove behind if buffer full", async function () {
      // Force a given video Representation
      let hasLockedRepresentation = false;
      const chosenVideoRepresentation =
        manifestInfos.periods[0].adaptations.video[0].representations[0];
      player.addEventListener("newAvailablePeriods", (p) => {
        if (hasLockedRepresentation || p.length === 0) {
          return;
        }
        player.setVideoTrack({
          periodId: p[0].id,
          trackId: manifestInfos.periods[0].adaptations.video[0].id,
          lockedRepresentations: [chosenVideoRepresentation.id],
        });
        hasLockedRepresentation = true;
      });
      player.setWantedBufferAhead(20);
      const { bitrate } = chosenVideoRepresentation;
      player.loadVideo({
        transport: manifestInfos.transport,
        url: manifestInfos.url,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await checkAfterSleepWithBackoff({}, () => {
        expect(player.getCurrentBufferGap()).to.be.above(19);
        expect(player.getVideoElement().buffered.start(0)).to.be.closeTo(0.0, 0.8);
      });
      const maxBuffersize = bitrate / 7000;
      player.seekTo(19);
      player.setMaxVideoBufferSize(maxBuffersize);
      await checkAfterSleepWithBackoff({}, () => {
        expect(player.getVideoElement().buffered.start(0)).to.be.above(14);
      });
    });
  });
}
