import { expect } from "chai";
import sinon from "sinon";
import RxPlayer from "../../../src";
import {
  // generateURLs,
  manifestInfos,
} from "../../contents/metaplaylist-static-dash";
import sleep from "../../utils/sleep";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";

xdescribe("MetaPlaylist with DASH Content", function () {
  let player;
  let fakeServer;
  const startTime = (Date.now() / 1000) - 20;
  // const timeShiftBufferDepth = 100;
  // const MetPlaylistURLs = generateURLs(startTime, timeShiftBufferDepth);

  beforeEach(() => {
    player = new RxPlayer();
    fakeServer = sinon.fakeServer.create({
      respondImmediately: true,
    });
  });

  afterEach(() => {
    player.dispose();
    fakeServer.restore();
  });

  // XXX TODO
  xit("should build metaplaylist from loaded DASH manifest.", async function() {
    // deactivate ABR for this test for now
    player.setVideoBitrate(0);
    player.setAudioBitrate(0);

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    await sleep(200);

    const manifest = player.getManifest();
    expect(manifest).not.to.equal(null);
    expect(manifest.transport).to.equal(manifestInfos.transport);
    expect(manifest.isLive).to.equal(true);
    expect(manifest.availabilityStartTime).to.equal(0);

    const periods = manifest.periods;
    const periodDuration = 101.568367;
    expect(periods.length).to.equal(20);
    expect(periods[0].start).to.equal(startTime);
    expect(periods[0].end).to.equal(startTime + periodDuration);

    const totalDuration = periodDuration * 20;
    expect(periods[periods.length - 1].end).to.equal(startTime + totalDuration);
  });

  // XXX TODO
  xit("should wrap indexes from loaded DASH manifest.", async function() {
    // deactivate ABR for this test for now
    player.setVideoBitrate(0);
    player.setAudioBitrate(0);

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    await sleep(100);

    const manifest = player.getManifest();

    const videoAdaptations = manifest.periods[0].adaptations.video[0];
    const firstRepresentation = videoAdaptations.representations[0];
    const segmentTimelineIndex = firstRepresentation.index;

    expect(videoAdaptations).not.to.equal(null);
    expect(firstRepresentation).not.to.equal(null);
    expect(segmentTimelineIndex.getSegments(0, startTime).length).to.equal(0);
    expect(segmentTimelineIndex.getSegments(startTime, 102).length)
      .to.equal(26);
    expect(segmentTimelineIndex.shouldRefresh(0, startTime + 2200))
      .to.equal(true);
  });

  // XXX TODO
  xit("should begin playback", async function() {
    // deactivate ABR for this test for now
    player.setVideoBitrate(0);
    player.setAudioBitrate(0);

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
      autoPlay: true,
    });

    await waitForLoadedStateAfterLoadVideo(player);
    await sleep(100);

    expect(player.getPlayerState()).to.equal("PLAYING");
    expect(player.getPosition()).to.be.above(startTime);
  });
});
