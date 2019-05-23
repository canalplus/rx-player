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
import sinon from "sinon";

import RxPlayer from "../../../src";

import {
  manifestInfos,
  URLs,
} from "../../contents/DASH_static_decode_errors";
import sleep from "../../utils/sleep.js";
import mockRequests from "../../utils/mock_requests";
import waitForState from "../../utils/waitForPlayerState";

describe("Decode errors with DASH static content", function () {

  /**
   * The content has several defects :
   * - At time 2, the buffered video is audio data
   * - At time 6, the buffered video is other codec
   */
  let player;
  let fakeServer;

  beforeEach(() => {
    player = new RxPlayer();
    fakeServer = sinon.fakeServer.create();
    fakeServer.autoRespond = true;
    mockRequests(fakeServer, URLs);
  });

  afterEach(() => {
    player.dispose();
    fakeServer.restore();
  });

  xit("should throw a BUFFER_APPEND_ERROR", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
      startAt: { position: 2 },
    });
    await waitForState(player, "STOPPED");
    const error = player.getError();
    expect(error).not.to.be.null;
    expect(player.getPlayerState()).to.equal("STOPPED");
    expect(error.code).to.equal("BUFFER_APPEND_ERROR");
  });

  xit("should avoid throwing and continue playback later", async function () {
    const handlePlaybackError = () => {
      return {
        type: "reload",
        value: {
          reloadAt: 12.1,
          autoPlay: false,
        }
      }
    };
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
      startAt: { position: 2 },
      handlePlaybackError
    });
    await sleep(200);
    const error = player.getError();
    expect(error).to.be.null;
    expect(player.getPosition()).to.equal(12.1);
    expect(player.getPlayerState()).to.equal("LOADED");
  });

  xit("should throw a MEDIA_ERR_DECODE", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
      startAt: { position: 9.7 },
    });
    await waitForState(player, "LOADED");
    player.play();
    await sleep(500);
    const error = player.getError();
    expect(error).not.to.be.null;
    expect(player.getPlayerState()).to.equal("STOPPED");
    expect(error.code).to.equal("MEDIA_ERR_DECODE");
  });

  xit("should avoid throwing and continue playback later", async function () {
    const handlePlaybackError = () => {
      return {
        type: "reload",
        value: {
          reloadAt: 12.1,
          autoPlay: false,
        }
      }
    };
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
      startAt: { position: 9.7 },
      handlePlaybackError
    });
    await sleep(100);
    player.play();
    await sleep(500);
    const error = player.getError();
    expect(error).to.be.null;
    expect(player.getPosition()).to.equal(12.1);
    expect(player.getPlayerState()).to.equal("PAUSED");
  });

  xit("should avoid throwing 1 time and throw", async function () {
    let called = 0;
    const handlePlaybackError = (e) => {
      called++;
      if (e.currentTime < 5) {
        return {
          type: "reload",
          value: {
            reloadAt: 9.7,
            autoPlay: false,
          }
        }
      }
      return {
        type: "throw"
      };
    };
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
      startAt: { position: 2 },
      handlePlaybackError
    });
    await sleep(200);
    let error = player.getError();
    expect(error).to.be.null;
    expect(player.getPosition()).to.equal(9.7);
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    await sleep(400);
    error = player.getError();
    expect(error).not.to.be.null;
    expect(error.code).to.equal("MEDIA_ERR_DECODE");
    expect(player.getPlayerState()).to.equal("STOPPED");
    expect(called).to.equal(2);
  });

  xit("should avoid throwing 2 times and play", async function () {
    let called = 0;
    const handlePlaybackError = (e) => {
      called++;
      if (e.currentTime < 5) {
        return {
          type: "reload",
          value: {
            reloadAt: 9.7,
            autoPlay: false,
          }
        }
      } else if (e.currentTime < 10) {
        return {
          type: "reload",
          value: {
            reloadAt: 12.1,
            autoPlay: false,
          }
        }
      }
    };
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
      startAt: { position: 2 },
      handlePlaybackError
    });
    await sleep(200);
    let error = player.getError();
    expect(error).to.be.null;
    expect(player.getPosition()).to.equal(9.7);
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    await sleep(400);
    error = player.getError();
    expect(error).to.be.null;
    expect(player.getPosition()).to.equal(12.1);
    expect(player.getPlayerState()).to.equal("PAUSED");
    expect(called).to.equal(2);
  });
});
