import { expect } from "chai";
import { manifestInfos } from "../../contents/DASH_static_SegmentTimeline";
import RxPlayer from "../../../src";
import XHRMock from "../../utils/request_mock";
import sleep from "../../utils/sleep.js";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";

let player;
let xhrMock;

describe("Fast-switching", function () {
  beforeEach(() => {
    player = new RxPlayer();
    xhrMock = new XHRMock();
  });

  afterEach(() => {
    player.dispose();
    xhrMock.restore();
  });

  const { url, transport } = manifestInfos;

  it("should enable fast-switching by default", async function () {
    this.timeout(3000);
    player.setMaxVideoBitrate(0);
    player.setWantedBufferAhead(10);
    player.loadVideo({ url,
                       transport,
                       autoPlay: false });
    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(1000);

    player.setWantedBufferAhead(30);
    player.setMaxVideoBitrate(Infinity);
    player.setMinVideoBitrate(Infinity);
    await sleep(1000);
    const videoSegmentBuffered = player.__priv_getSegmentBufferContent("video")
      .map(({ infos }) => {
        return { bitrate: infos.representation.bitrate,
                 time: infos.segment.time,
                 end: infos.segment.end };
      });
    expect(videoSegmentBuffered.length).to.be.at.least(3);
    expect(videoSegmentBuffered[1].bitrate).to.equal(1996000);
    expect(videoSegmentBuffered[2].bitrate).to.equal(1996000);
  });

  it("should enable fast-switching if explicitely enabled", async function () {
    this.timeout(3000);
    player.setMaxVideoBitrate(0);
    player.setWantedBufferAhead(10);
    player.loadVideo({ url,
                       transport,
                       autoPlay: false,
                       enableFastSwitching: true });
    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(1000);
    player.setWantedBufferAhead(30);
    player.setMaxVideoBitrate(Infinity);
    player.setMinVideoBitrate(Infinity);
    await sleep(1000);
    const videoSegmentBuffered = player.__priv_getSegmentBufferContent("video")
      .map(({ infos }) => {
        return { bitrate: infos.representation.bitrate,
                 time: infos.segment.time,
                 end: infos.segment.end };
      });
    expect(videoSegmentBuffered.length).to.be.at.least(3);
    expect(videoSegmentBuffered[1].bitrate).to.equal(1996000);
    expect(videoSegmentBuffered[2].bitrate).to.equal(1996000);
  });

  it("should disable fast-switching if explicitely disabled", async function () {
    this.timeout(3000);
    player.setMaxVideoBitrate(0);
    player.setWantedBufferAhead(10);
    player.loadVideo({ url,
                       transport,
                       autoPlay: false,
                       enableFastSwitching: false });
    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(1000);
    player.setWantedBufferAhead(30);
    player.setMaxVideoBitrate(Infinity);
    player.setMinVideoBitrate(Infinity);
    await sleep(1000);
    const videoSegmentBuffered = player.__priv_getSegmentBufferContent("video")
      .map(({ infos }) => {
        return { bitrate: infos.representation.bitrate,
                 time: infos.segment.time,
                 end: infos.segment.end };
      });
    expect(videoSegmentBuffered.length).to.be.at.least(3);
    expect(videoSegmentBuffered[0].bitrate).to.equal(400000);
    expect(videoSegmentBuffered[1].bitrate).to.equal(400000);
    expect(videoSegmentBuffered[2].bitrate).to.equal(400000);
  });
});
