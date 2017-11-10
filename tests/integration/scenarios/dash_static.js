import { expect } from "chai";
import sinon from "sinon";
import RxPlayer from "../../../src";
import {
  mockManifestRequest,
  mockAllRequests,
} from "../utils/mock_requests.js";
import sleep from "../utils/sleep.js";
import Mock from "../mocks/dash_static_SegmentTimeline.js";

describe("dash static SegmentTimeline content", function () {
  let player;
  let fakeServer;

  beforeEach(() => {
    player = new RxPlayer();
    fakeServer = sinon.fakeServer.create();
  });

  afterEach(() => {
    player.dispose();
    fakeServer.restore();
  });

  it("should fetch and correctly parse the manifest", async function (done) {
    mockManifestRequest(fakeServer, Mock);

    // We only have arround 15s of playback locally for this content
    player.setWantedBufferAhead(15);

    // deactivate ABR for this test for now
    player.setVideoBitrate(0);
    player.setAudioBitrate(0);

    player.loadVideo({ url: Mock.manifest.url, transport: "dash" });

    // should only have the manifest for now
    expect(fakeServer.requests.length).to.equal(1);

    await sleep(0);
    fakeServer.respond();
    await sleep(0);


    // ---- General Manifest Data ----

    const manifest = player.getManifest();
    expect(manifest).not.to.equal(null);
    expect(typeof manifest).to.equal("object");
    expect(manifest.getDuration()).to.equal(101.568367);
    expect(manifest.transport).to.equal("dash");
    expect(typeof manifest.id).to.equal("string");
    expect(manifest.isLive).to.equal(false);
    expect(manifest.getUrl()).to.equal(Mock.manifest.url);
    expect(manifest.getAdaptations().length).to.equal(2);

    expect(manifest.timeShiftBufferDepth).to.equal(undefined);
    expect(manifest.availabilityStartTime).to.equal(undefined);


    // ---- General Adaptations data ----

    const adaptations = manifest.adaptations;

    expect(adaptations.audio.length).to.equal(1);
    expect(adaptations.audio[0].type).to.equal("audio");

    expect(adaptations.audio[0].isAudioDescription).to.equal(false);
    expect(adaptations.audio[0].language).to.equal(undefined);
    expect(adaptations.audio[0].normalizedLanguage).to.equal(undefined);
    expect(typeof adaptations.audio[0].id).to.equal("string");
    expect(adaptations.audio[0].id).to.not.equal(adaptations.video[0].id);
    expect(adaptations.audio[0].representations.length).to.equal(1);
    expect(adaptations.audio[0].getAvailableBitrates()).to.eql([128000]);

    expect(adaptations.video.length).to.equal(1);
    expect(adaptations.video[0].type).to.equal("video");
    expect(adaptations.video[0].getAvailableBitrates()).to.eql(
      [400000, 795000, 1193000, 1996000]
    );
    expect(adaptations.video[0].representations.length).to.equal(4);
    expect(adaptations.video[0].getRepresentationsForBitrate(400000).length)
      .to.eql(1);

    // ---- Audio Adaptations / Representations / Segments ----


    const audioRepresentation = adaptations.audio[0].representations[0];
    expect(audioRepresentation.baseURL).to.equal("http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/");
    expect(audioRepresentation.bitrate).to.equal(128000);
    expect(audioRepresentation.codec).to.equal("mp4a.40.2");
    expect(audioRepresentation.id).to.equal("audio=128000");
    expect(audioRepresentation.mimeType).to.equal("audio/mp4");
    expect(typeof audioRepresentation.index).to.equal("object");

    const audioRepresentationIndex = audioRepresentation.index;
    const initAudioSegment = audioRepresentationIndex.getInitSegment();
    expect(initAudioSegment.media).to.equal("ateam-$RepresentationID$.dash");
    expect(initAudioSegment.id).to.equal("audio=128000_init");

    const nextAudioSegment1 = audioRepresentationIndex.getSegments(0, 4);
    expect(nextAudioSegment1.length).to.equal(1);
    expect(nextAudioSegment1[0].duration).to.equal(177341);
    expect(nextAudioSegment1[0].id).to.equal("audio=128000_0");
    expect(nextAudioSegment1[0].isInit).to.equal(false);
    expect(nextAudioSegment1[0].media).to
      .equal("ateam-$RepresentationID$-$Time$.dash");
    expect(nextAudioSegment1[0].time).to.equal(0);
    expect(nextAudioSegment1[0].timescale).to.equal(44100);

    const nextAudioSegment2 = audioRepresentationIndex.getSegments(0, 5);
    expect(nextAudioSegment2.length).to.equal(2);
    expect(nextAudioSegment2[1].duration).to.equal(176128);
    expect(nextAudioSegment2[1].id).to.equal("audio=128000_177341");
    expect(nextAudioSegment2[1].isInit).to.equal(false);
    expect(nextAudioSegment2[1].media)
      .to.equal("ateam-$RepresentationID$-$Time$.dash");
    expect(nextAudioSegment2[1].time).to.equal(177341);
    expect(nextAudioSegment2[1].timescale).to.equal(44100);

    expect(audioRepresentationIndex.getSegments(0, 101).length)
      .to.equal(26);
    expect(audioRepresentationIndex.getSegments(0, 1010).length)
      .to.equal(26);

    // ---- Video Adaptations / Representations / Segments ----

    const videoRepresentation = adaptations.video[0].representations[0];
    expect(videoRepresentation.baseURL)
      .to.equal("http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/");
    expect(videoRepresentation.bitrate).to.equal(400000);
    expect(videoRepresentation.codec).to.equal("avc1.42C014");
    expect(videoRepresentation.id).to.equal("video=400000");
    expect(videoRepresentation.height).to.equal(124);
    expect(videoRepresentation.width).to.equal(220);
    expect(videoRepresentation.mimeType).to.equal("video/mp4");
    expect(typeof videoRepresentation.index).to.equal("object");

    const videoRepresentationIndex = videoRepresentation.index;
    const initVideoSegment = videoRepresentationIndex.getInitSegment();
    expect(initVideoSegment.media).to.equal("ateam-$RepresentationID$.dash");
    expect(initVideoSegment.id).to.equal("video=400000_init");

    const nextVideoSegment1 = videoRepresentationIndex.getSegments(0, 4);
    expect(nextVideoSegment1.length).to.equal(1);
    expect(nextVideoSegment1[0].duration).to.equal(4004);
    expect(nextVideoSegment1[0].id).to.equal("video=400000_0");
    expect(nextVideoSegment1[0].isInit).to.equal(false);
    expect(nextVideoSegment1[0].media).to.equal("ateam-$RepresentationID$-$Time$.dash");
    expect(nextVideoSegment1[0].time).to.equal(0);
    expect(nextVideoSegment1[0].timescale).to.equal(1000);

    const nextVideoSegment2 = videoRepresentationIndex.getSegments(0, 5);
    expect(nextVideoSegment2.length).to.equal(2);
    expect(nextVideoSegment2[1].duration).to.equal(4004);
    expect(nextVideoSegment2[1].id).to.equal("video=400000_4004");
    expect(nextVideoSegment2[1].isInit).to.equal(false);
    expect(nextVideoSegment2[1].media).to.equal("ateam-$RepresentationID$-$Time$.dash");
    expect(nextVideoSegment2[1].time).to.equal(4004);
    expect(nextVideoSegment2[1].timescale).to.equal(1000);

    expect(videoRepresentationIndex.getSegments(0, 101).length)
      .to.equal(26);
    expect(videoRepresentationIndex.getSegments(0, 1010).length)
      .to.equal(26);

    expect(fakeServer.requests.length).to.equal(3);

    const requestsDone = [
      fakeServer.requests[1].url,
      fakeServer.requests[2].url,
    ];

    expect(requestsDone).to.include(Mock.audio[0].init.url);
    expect(requestsDone).to.include(Mock.video[0].init.url);
    done();
  });

  it("should list the right bitrates", async function (done) {
    mockManifestRequest(fakeServer, Mock);
    player.loadVideo({ url: Mock.manifest.url, transport: "dash" });

    await sleep(1);
    fakeServer.respond();
    await sleep(1);

    expect(player.getAvailableAudioBitrates()).to.eql([128000]);
    expect(player.getAvailableVideoBitrates()).to.eql(
      [400000, 795000, 1193000, 1996000]
    );

    done();
  });

  it("should list the right languages", async function (done) {
    mockManifestRequest(fakeServer, Mock);
    player.loadVideo({ url: Mock.manifest.url, transport: "dash" });

    await sleep(1);
    fakeServer.respond();
    await sleep(1);

    const audioTracks = player.getAvailableAudioTracks();
    const textTracks = player.getAvailableTextTracks();

    expect(audioTracks.length).to.equal(1);
    expect(audioTracks[0].language).to.equal("");
    expect(audioTracks[0].normalized).to.equal("");
    expect(audioTracks[0].audioDescription).to.equal(false);
    expect(typeof audioTracks[0].id).to.equal("string");
    expect(audioTracks[0].id).to.not.equal("");
    expect(audioTracks[0].active).to.equal(true);

    expect(textTracks.length).to.equal(0);

    done();
  });

  // TODO fixup
  // TODO own scenario
  xit("should update the state when beginning to play", async function (done) {
    mockAllRequests(fakeServer, Mock);

    let lastPlayerState;
    player.addEventListener("playerStateChange", newState =>
      lastPlayerState = newState
    );

    expect(player.getPlayerState()).to.equal("STOPPED");

    player.loadVideo({
      url: Mock.manifest.url,
      transport: "dash",
    });

    expect(player.getPlayerState()).to.equal("LOADING");
    expect(lastPlayerState).to.equal("LOADING");

    await sleep(1);
    fakeServer.respond();
    await sleep(1);

    expect(player.getPlayerState()).to.equal("LOADED");
    expect(lastPlayerState).to.equal("LOADED");

    done();
  });
});
