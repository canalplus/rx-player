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
import RxPlayer from "../../../src";
import { manifestInfos } from "../../contents/DASH_static_SegmentTimeline";
import sleep from "../../utils/sleep.js";
import waitForState, {
  waitForLoadedStateAfterLoadVideo} from "../../utils/waitForPlayerState";
import XHRMock from "../../utils/request_mock";

describe("basic playback use cases: non-linear DASH SegmentTimeline", function () {
  let player;
  let xhrMock;

  beforeEach(() => {
    player = new RxPlayer();
    xhrMock = new XHRMock();
  });

  afterEach(() => {
    player.dispose();
    xhrMock.restore();
  });

  it("should begin playback on play", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(200);
    expect(player.getPosition()).to.be.above(0);
    expect(player.getPosition()).to.be.below(0.25);
    expect(player.getCurrentBufferGap()).to.be.above(0);
    expect(player.getVideoElement().buffered.start(0))
      .to.be.below(player.getPosition());
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
    await sleep(300);
    expect(player.getPosition()).to.be.below(0.35);
    expect(player.getPosition()).to.be.above(0.05);
    expect(player.getPosition()).to.be.above(lastPosition);
    expect(player.getVideoElement().buffered.start(0))
      .to.be.below(player.getPosition());
    expect(player.getPlaybackRate()).to.equal(0.5);
    expect(player.getVideoElement().playbackRate).to.equal(0.5);
  });

  it("should play faster for a speed superior to 1", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.setPlaybackRate(3);
    player.play();
    await sleep(400);
    expect(player.getPosition()).to.be.below(1.25);
    expect(player.getPosition()).to.be.above(0.5);
    expect(player.getCurrentBufferGap()).to.be.above(0);
    expect(player.getVideoElement().buffered.start(0))
      .to.be.below(player.getPosition());
    expect(player.getPlaybackRate()).to.equal(3);
    expect(player.getVideoElement().playbackRate).to.equal(3);
  });

  it("should be able to seek when loaded", async function () {
    player.loadVideo({ transport: manifestInfos.transport,
                       url: manifestInfos.url });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(10);
    expect(player.getPosition()).to.equal(10);
    expect(player.getPlayerState()).to.equal("LOADED");
    player.play();
    await sleep(1200);
    expect(player.getPlayerState()).to.equal("PLAYING");
    expect(player.getPosition()).to.be.above(10);
  });

  // TODO This often breaks, presumably due to the badly-encoded content.
  // To check
  xit("should end if seeking to the end when loaded", async function () {
    player.loadVideo({ transport: manifestInfos.transport,
                       url: manifestInfos.url });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(player.getMaximumPosition() + 15);
    await sleep(600);
    // FIXME: Chrome seems to have an issue with that content where we need to
    // seek two times for this test to pass.
    if (player.getPlayerState() === "PAUSED") {
      player.seekTo(player.getMaximumPosition() + 15);
      await sleep(600);
    }
    expect(player.getPlayerState()).to.equal("ENDED");
  });

  // TODO This often breaks, presumably due to the badly-encoded content.
  // To check
  xit("should end if seeking to the end when playing", async function () {
    player.loadVideo({ transport: manifestInfos.transport,
                       url: manifestInfos.url,
                       autoPlay: true });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(player.getMaximumPosition() + 15);
    await sleep(600);
    expect(player.getPlayerState()).to.equal("ENDED");
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
    await sleep(200);
    expect(player.getPlayerState()).to.equal("PLAYING");
    expect(player.getPosition()).to.be.above(player.getMinimumPosition());
  });

  it("should seek to maximum position if manual seek is higher than maximum when loaded", async function () {
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.seekTo(200);
    expect(player.getPlayerState()).to.equal("LOADED");
    expect(player.getPosition())
      .to.be.closeTo(player.getMaximumPosition(), 0.1);
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
    expect(player.getPosition())
      .to.be.closeTo(player.getMaximumPosition(), 0.1);
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
    expect(player.getPosition())
      .to.be.closeTo(player.getMaximumPosition(), 0.1);
    expect(player.getPlayerState()).to.equal("PAUSED");
  });

  it("should download first segment when wanted buffer ahead is under first segment duration", async function () {
    xhrMock.lock();
    player.setWantedBufferAhead(2);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });

    await sleep(10);
    expect(xhrMock.getLockedXHR().length).to.equal(1); // Manifest
    await xhrMock.flush();
    await sleep(10);

    // init segments first media segments
    expect(xhrMock.getLockedXHR().length).to.equal(4);
    await xhrMock.flush();
    await sleep(100);

    expect(xhrMock.getLockedXHR().length).to.equal(0); // nada
    expect(player.getCurrentBufferGap()).to.be.above(4);
    expect(player.getCurrentBufferGap()).to.be.below(5);
  });

  it("should download more than the first segment when wanted buffer ahead is over the first segment duration", async function () {
    xhrMock.lock();
    player.setWantedBufferAhead(20);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });

    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(1); // Manifest
    await xhrMock.flush();
    await sleep(1);

    // init segments first media segments
    expect(xhrMock.getLockedXHR().length).to.equal(4);
    await xhrMock.flush();
    await sleep(100);

    expect(xhrMock.getLockedXHR().length).to.equal(2); // next 2
    await xhrMock.flush();
    await sleep(100);

    expect(player.getCurrentBufferGap()).to.be.above(7);
    expect(player.getCurrentBufferGap()).to.be.below(9);
  });

  it("should continue downloading when seek to wanted buffer ahead", async function() {
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
    expect(player.getVideoElement().buffered.end(0))
      .to.be.above(lastPositionWithBuffer);
    player.play();
    await sleep(100);
    expect(player.getPlayerState()).to.equal("PLAYING");
  });

  it("should respect a set max buffer ahead", async function() {
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

  it("should delete buffer behind", async function() {
    player.setMaxBufferAhead(30);
    player.setMaxBufferBehind(2);

    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(200);

    player.seekTo(6);
    await sleep(100);

    expect(Math.round(player.getVideoElement().buffered.start(0))).to.equal(4);
  });

  it("may switch to SEEKING state when seeking to a buffered part when playing", async function() {
    this.timeout(5000);
    player.setWantedBufferAhead(30);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(1000);
    expect(player.getPlayerState()).to.equal("PLAYING");
    expect(player.getCurrentBufferGap()).to.be.above(10);

    player.seekTo(10);
    await waitForState(player, "SEEKING", ["PLAYING"]);
    expect(player.getCurrentBufferGap()).to.be.above(10);
    await sleep(1000);
    expect(player.getCurrentBufferGap()).to.be.above(10);
    expect(player.getPlayerState()).to.equal("PLAYING");
  });

  it("may switch to SEEKING state when seeking to a buffered part when paused", async function() {
    this.timeout(5000);
    player.setWantedBufferAhead(30);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(1000);
    expect(player.getPlayerState()).to.equal("LOADED");
    expect(player.getCurrentBufferGap()).to.be.above(10);

    player.seekTo(10);
    await waitForState(player, "SEEKING", ["PAUSED"]);
    expect(player.getCurrentBufferGap()).to.be.above(10);
    await sleep(1000);
    expect(player.getCurrentBufferGap()).to.be.above(10);
    expect(player.getPlayerState()).to.equal("PAUSED");
  });

  it("should be in SEEKING state when seeking to a non-buffered part when playing", async function() {

    player.setWantedBufferAhead(4);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.play();
    await sleep(100);
    expect(player.getPlayerState()).to.equal("PLAYING");

    xhrMock.lock();

    player.seekTo(10);
    await waitForState(player, "SEEKING", ["PLAYING"]);
    expect(player.getCurrentBufferGap()).to.equal(Infinity);

    await sleep(100);
    expect(player.getPlayerState()).to.equal("SEEKING");
    expect(player.getCurrentBufferGap()).to.equal(Infinity);

    await xhrMock.flush();
    await sleep(100);
    expect(player.getCurrentBufferGap()).to.be.above(1);
    expect(player.getCurrentBufferGap()).to.be.below(10);
    expect(player.getPlayerState()).to.equal("PLAYING");
  });

  it("should respect a set max buffer size", async function () {
    this.timeout(4000);
    const chosenVideoRepresentation = manifestInfos
                                        .periods[0]
                                        .adaptations
                                        .video[0]
                                        .representations[0];
    player.setWantedBufferAhead(100);
    const {bitrate} = chosenVideoRepresentation;
    player.setVideoBitrate(0);
    // A segment is a little bit more than 4sec, so not enough for MIN_BUFF_SIZE
    // ( MIN_BUFF_SIZE is 5sec) so the rx player will download 2 segments
    // So we take two segments : a bit more than 8sec
    const maxBuffersize = (bitrate/8000)*6;
    player.setMaxVideoBufferSize(maxBuffersize);
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(800);
    // And to take into consideration the estimation errors,
    // we round it up to 9sec
    expect(player.getCurrentBufferGap()).to.be.below(6*3);
    expect(player.getCurrentBufferGap()).to.be.above(6*1);
  });

  it("should remove behind if buffer full", async function() {
    const chosenVideoRepresentation = manifestInfos
                                        .periods[0]
                                        .adaptations
                                        .video[0]
                                        .representations[0];
    player.setWantedBufferAhead(20);
    const {bitrate} = chosenVideoRepresentation;
    player.setVideoBitrate(0) ;
    player.loadVideo({
      transport: manifestInfos.transport,
      url: manifestInfos.url,
    });
    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(400);
    expect(player.getCurrentBufferGap()).to.be.above(19);
    expect(player.getVideoElement().buffered.start(0)).to.be.closeTo(0.0, 0.8);
    const maxBuffersize = (bitrate/7000);
    player.seekTo(19);
    player.setMaxVideoBufferSize(maxBuffersize);
    await sleep(800);
    expect(player.getVideoElement().buffered.start(0)).to.be.above(14);
  });
});
