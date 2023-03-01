import { expect } from "chai";
import XHRMock from "../../utils/request_mock";
import {
  manifestInfosEndNumber as numberBasedManifestInfos,
} from "../../contents/DASH_static_number_based_SegmentTimeline";
import {
  endNumberManifestInfos as templateManifestinfos,
} from "../../contents/DASH_static_SegmentTemplate_Multi_Periods";
import {
  segmentTimelineEndNumber as timeBasedManifestInfos,
} from "../../contents/DASH_static_SegmentTimeline";
import RxPlayer from "../../../src";
import sleep from "../../utils/sleep.js";
import waitForState, { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";
import {lockLowestBitrates} from "../../utils/bitrates";

let player;

describe("end number", function () {
  let xhrMock;
  beforeEach(() => {
    player = new RxPlayer({ stopAtEnd: false });
    xhrMock = new XHRMock();
  });

  afterEach(() => {
    player.dispose();
    xhrMock.restore();
  });

  it("should calculate the right duration according to endNumber on a number-based SegmentTemplate", async function () {
    this.timeout(3000);
    xhrMock.lock();
    lockLowestBitrates(player);
    player.setWantedBufferAhead(15);
    const { url, transport } = templateManifestinfos;

    player.loadVideo({
      url,
      transport,
      autoPlay: false,
    });
    await sleep(50);
    expect(xhrMock.getLockedXHR().length).to.equal(1);
    await xhrMock.flush();
    await sleep(500);
    expect(player.getMinimumPosition()).to.eql(0);
    expect(player.getMaximumPosition()).to.eql(120 + 30);
  });

  it("should not load segment later than the end number on a time-based SegmentTimeline", async function () {
    this.timeout(15000);
    xhrMock.lock();
    lockLowestBitrates(player);
    player.setWantedBufferAhead(15);
    const { url, transport } = timeBasedManifestInfos;

    player.loadVideo({
      url,
      transport,
      autoPlay: true,
    });
    await sleep(50);
    expect(xhrMock.getLockedXHR().length).to.equal(1); // Manifest
    await xhrMock.flush();
    await sleep(50);
    expect(player.getMaximumPosition()).to.be.closeTo(20, 1);
    expect(xhrMock.getLockedXHR().length).to.equal(4); // Init + media of audio
                                                       // + video
    await xhrMock.flush();
    await waitForLoadedStateAfterLoadVideo(player);

    await sleep(50);
    expect(xhrMock.getLockedXHR().length).to.equal(2); // next audio + video
    xhrMock.flush();
    player.seekTo(19);
    await sleep(50);
    expect(xhrMock.getLockedXHR().length).to.equal(2); // last audio + video
    xhrMock.flush();
    await waitForState(player, "ENDED", ["BUFFERING", "RELOADING", "PLAYING"]);
    expect(player.getPosition()).to.be.closeTo(20, 1);
  });

  it("should calculate the right duration on a number-based SegmentTimeline", async function () {
    this.timeout(10000);
    xhrMock.lock();
    lockLowestBitrates(player);
    player.setWantedBufferAhead(15);
    const { url, transport } = numberBasedManifestInfos;

    player.loadVideo({
      url,
      transport,
      autoPlay: true,
    });
    await sleep(50);
    expect(xhrMock.getLockedXHR().length).to.equal(1);
    await xhrMock.flush();
    await sleep(50);
    expect(player.getMaximumPosition()).to.be.closeTo(20, 1);
  });
});
