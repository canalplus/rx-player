import { expect } from "chai";
import sinon from "sinon";
import RxPlayer from "../../../src";
import sleep from "../utils/sleep.js";
import {
  mockManifestRequest,
  mockAllRequests,
} from "../utils/mock_requests.js";
import Mock from "../mocks/dash_static_SegmentTimeline.js";
import { Observable } from "rxjs/Observable";

describe("plays", function () {

  let player;
  let fakeServer;
  let video;

  var isPlaying = function() {
    return video.currentTime > 0
            && !video.paused
            && !video.ended
            && video.readyState > 2;
  };

  beforeEach(() => {
    player = new RxPlayer();
    video = player.getVideoElement();
    fakeServer = sinon.fakeServer.create({
      autoRespond: true,
    });
  });

  afterEach(() => {
    player.dispose();
    fakeServer.restore();
  });

  it("should begin playback", async function () {

    mockAllRequests(fakeServer, Mock);

    player.addEventListener("playerStateChange", newState => {
      console.log(newState);
    });

    player.loadVideo({ url: Mock.manifest.url, transport: "dash" });
    expect(video.currentTime).to.equal(0);

    // player.play();
    // await sleep(1);
    // expect(video.currentTime).to.be.above(0)


  });
});
