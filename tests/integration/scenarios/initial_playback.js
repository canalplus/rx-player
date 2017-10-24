import { expect } from "chai";
import nise from "nise";
import RxPlayer from "../../../src";
import sleep from "../utils/sleep.js";
import Mock from "../mocks/dash_static_SegmentTimeline.js";
import { mockAllRequests } from "../utils/mock_requests";

describe("media player instance", function () {

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

  it("should begin playback", async function (done) {

    player.loadVideo({url: Mock.manifest.url, transport: "dash"});

    await new Promise(function(resolve) {
      player.getVideoElement().addEventListener("loadeddata", function() {
        resolve();
      }, false);
    });

    player.play();

    await sleep(100);
    expect(player.getPosition()).to.be.above(0);
    expect(player.getVideoLoadedTime()).to.be.above(0);
    expect(player.getVideoPlayedTime()).to.be.above(0);

    done();

  });

  it("should seek and continue playing", async function (done) {

    player.loadVideo({url: Mock.manifest.url, transport: "dash"});

    await new Promise(function(resolve) {
      player.getVideoElement().addEventListener("loadeddata", function() {
        resolve();
      }, false);
    });

    player.seekTo(2);
    expect(player.getPosition()).to.equal(2);

    player.play();
    await sleep(500);

    expect(player.getPosition()).to.be.above(2);

    done();
  });

  it("should seek to maximum position if manual seek is higher than maximum", async function (done) {

    player.loadVideo({url: Mock.manifest.url, transport: "dash"});

    await new Promise(function(resolve) {
      player.getVideoElement().addEventListener("loadeddata", function() {
        resolve();
      }, false);
    });

    player.play();
    await sleep(100);
    player.seekTo(200);

    expect(player.getPosition()).to.equal(player.getMaximumPosition());

    done();
  });

  it("should download first segment when wanted buffer ahead is under first segment duration", async function (done) {

    player.setWantedBufferAhead(2);

    player.loadVideo({url: Mock.manifest.url, transport: "dash"});
    await sleep(100);

    expect(player.getVideoLoadedTime()).to.equal(player.getCurrentRepresentations().video.index._index.timeline[0].d / 1000);

    done();
  });

  it("should continue downloading when seek to wanter buffer ahead", async function(done) {

    let state;

    player.setWantedBufferAhead(2);

    player.addEventListener("playerStateChange", function(newState){
      if (newState === "PLAYING") {state = newState;}
    });

    player.loadVideo({url: Mock.manifest.url, transport: "dash"});
    await sleep(100);

    const loadedVideo = player.getVideoLoadedTime();

    player.seekTo(loadedVideo);
    await sleep(100);

    expect(player.getVideoLoadedTime()).to.be.above(loadedVideo);

    player.play();
    await sleep(100);

    expect(state).to.equal("PLAYING");

    done();
  });

  it("should not load more than defined max buffer ahead", async function(done) {

    player.setMaxBufferAhead(2);

    player.loadVideo({url: Mock.manifest.url, transport: "dash"});
    await sleep(100);

    expect(Math.round(player.getVideoLoadedTime())).to.equal(2);

    done();
  });

  xit("should delete buffer behind", async function(done) {

    player.setMaxBufferBehind(2);

    player.loadVideo({url: Mock.manifest.url, transport: "dash"});
    await sleep(100);

    player.seekTo(8);
    await sleep(100);

    expect(Math.round(player.getVideoElement().buffered.start(0))).to.equal(6);

    done();
  });

});
