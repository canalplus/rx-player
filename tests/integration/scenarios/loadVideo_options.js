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
import nise from "nise";
import RxPlayer from "../../../src";
import sleep from "../utils/sleep.js";
import Mock from "../mocks/dash_static_SegmentTimeline.js";
import { mockAllRequests } from "../utils/mock_requests";
import /* waitForState, */ {
  waitForLoadedStateAfterLoadVideo,
} from "../utils/waitForPlayerState";

describe("loadVideo Options", () => {
  let player;
  const fakeServer = nise.fakeServer;
  let server;

  beforeEach(() => {
    player = new RxPlayer();
    server = fakeServer.create();
    server.autoRespond = true;
    mockAllRequests(server, Mock);
  });

  afterEach(() => {
    player.dispose();
    server.restore();
  });

  describe("autoPlay", () => {
    it("should keep state as LOADED (and not play) if autoPlay is not set", async () => {
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlayerState()).to.equal("LOADED");
      expect(player.getPosition()).to.equal(0);
      await sleep(200);
      expect(player.getPlayerState()).to.equal("LOADED");
      expect(player.getPosition()).to.equal(0);
    });

    it("should keep state as LOADED (and not play) if autoPlay is false", async () => {
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlayerState()).to.equal("LOADED");
      expect(player.getPosition()).to.equal(0);
      await sleep(200);
      expect(player.getPlayerState()).to.equal("LOADED");
      expect(player.getPosition()).to.equal(0);
    });

    it("should set state as LOADED then to PLAYING (and play) if autoPlay is true", async () => {
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: true,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlayerState()).to.equal("PLAYING");
      expect(player.getPosition()).to.equal(0);
      await sleep(200);
      expect(player.getPosition()).to.be.above(0.100);
    });
  });

  describe("startAt", () => {
    describe("non-linear", () => {
      it("should seek at the right position if startAt.position is set", async function () {
        const startAt = 10;
        player.loadVideo({
          url: Mock.manifest.url,
          transport: "dash",
          autoPlay: false,
          startAt: { position: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be.closeTo(startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.equal(initialPosition);
      });

      it("should seek at the right position if startAt.wallClockTime is set", async function () {
        const startAt = 10;
        player.loadVideo({
          url: Mock.manifest.url,
          transport: "dash",
          autoPlay: false,
          startAt: { wallClockTime: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be.closeTo(startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.equal(initialPosition);
      });

      it("should seek at the right position if startAt.fromFirstPosition is set", async function () {
        const startAt = 10;
        player.loadVideo({
          url: Mock.manifest.url,
          transport: "dash",
          autoPlay: false,
          startAt: { fromFirstPosition: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMinimumPosition() + startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.equal(initialPosition);
      });

      it("should seek at the right position if startAt.fromLastPosition is set", async function () {
        const startAt = 10;
        player.loadVideo({
          url: Mock.manifest.url,
          transport: "dash",
          autoPlay: false,
          startAt: { fromLastPosition: - startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMaximumPosition() - startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.equal(initialPosition);
      });

      it("should seek at the right position if startAt.percentage is set", async function () {
        player.loadVideo({
          url: Mock.manifest.url,
          transport: "dash",
          autoPlay: false,
          startAt: { percentage: 30 },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("LOADED");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMaximumPosition() * 0.3, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.equal(initialPosition);
      });

      it("should seek at the right position then play if startAt.position and autoPlay is set", async function () {
        const startAt = 10;
        player.loadVideo({
          url: Mock.manifest.url,
          transport: "dash",
          autoPlay: true,
          startAt: { position: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be.closeTo(startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.be.above(initialPosition);
      });

      it("should seek at the right position then play if startAt.wallClockTime and autoPlay is set", async function () {
        const startAt = 10;
        player.loadVideo({
          url: Mock.manifest.url,
          transport: "dash",
          autoPlay: true,
          startAt: { wallClockTime: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be.closeTo(startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.be.above(initialPosition);
      });

      it("should seek at the right position then play if startAt.fromFirstPosition and autoPlay is set", async function () {
        const startAt = 10;
        player.loadVideo({
          url: Mock.manifest.url,
          transport: "dash",
          autoPlay: true,
          startAt: { fromFirstPosition: startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMinimumPosition() + startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.be.above(initialPosition);
      });

      it("should seek at the right position then play if startAt.fromLastPosition and autoPlay is set", async function () {
        const startAt = 10;
        player.loadVideo({
          url: Mock.manifest.url,
          transport: "dash",
          autoPlay: true,
          startAt: { fromLastPosition: - startAt },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMaximumPosition() - startAt, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.be.above(initialPosition);
      });

      it("should seek at the right position then play if startAt.percentage and autoPlay is set", async function () {
        player.loadVideo({
          url: Mock.manifest.url,
          transport: "dash",
          autoPlay: true,
          startAt: { percentage: 30 },
        });
        await waitForLoadedStateAfterLoadVideo(player);
        expect(player.getPlayerState()).to.equal("PLAYING");
        const initialPosition = player.getPosition();
        expect(initialPosition).to.be
          .closeTo(player.getMaximumPosition() * 0.3, 0.5);
        await sleep(500);
        expect(player.getPosition()).to.be.above(initialPosition);
      });
    });
  });
});
