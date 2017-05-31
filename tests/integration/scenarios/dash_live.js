import { expect } from "chai";
import sinon from "sinon";
import RxPlayer from "../../../src";

const fakeManifest = require("raw-loader!./fixtures/dash_dynamic_SegmentTimeline/manifest_mpm4sav_mvtime_w925796611.mpd");
const fakeAudioInit = require("raw-loader!./fixtures/dash_dynamic_SegmentTimeline/chunk_ctaudio_cfm4s_ridp0aa0br96257_cinit_w925796611_mpd.m4s");
const fakeVideoInit = require("raw-loader!./fixtures/dash_dynamic_SegmentTimeline/chunk_ctvideo_cfm4s_ridp0va0br601392_cinit_w925796611_mpd.m4s");

const manifestUrl = "https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/manifest_mpm4sav_mvtime_w925796611.mpd";
const audioInitUrl = "https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/chunk_ctaudio_cfm4s_ridp0aa0br96257_cinit_w925796611_mpd.m4s";
const videoInitUrl = "https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/chunk_ctvideo_cfm4s_ridp0va0br601392_cinit_w925796611_mpd.m4s";

describe("dash live SegmentTimeline content", function () {
  this.timeout(1000000);
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

  it("should fetch and parse the manifest", (done) => {
    fakeServer.respondWith("GET", manifestUrl,
      [
        200,
        { "Content-Type": "application/dash+xml" },
        fakeManifest,
      ]
    );

    player.loadVideo({
      url: manifestUrl,
      transport: "dash",
    });

    expect(fakeServer.requests.length).to.equal(1);

    setTimeout(() => {
      fakeServer.respond();

      expect(fakeServer.requests.length).to.equal(3);

      const requestsDone = [
        fakeServer.requests[1].url,
        fakeServer.requests[2].url,
      ];

      expect(requestsDone).to.include(audioInitUrl);
      expect(requestsDone).to.include(videoInitUrl);

      const manifest = player.getManifest();
      expect(manifest).not.to.equal(null);
      expect(typeof manifest).to.equal("object");
      expect(manifest.getDuration()).to.equal(Infinity);
      expect(manifest.transport).to.equal("dash");
      expect(typeof manifest.id).to.equal("string");
      expect(manifest.isLive).to.equal(true);
      expect(manifest.suggestedPresentationDelay).to.equal(15);
      expect(manifest.timeShiftBufferDepth).to.equal(50);
      expect(manifest.getUrl()).to.equal(manifestUrl);
      expect(manifest.availabilityStartTime).to.equal(1493225291);

      const adaptations = manifest.adaptations;

      expect(adaptations.audio.length).to.equal(1);
      expect(adaptations.audio[0].isAudioDescription).to.equal(false);
      expect(adaptations.audio[0].language).to.equal("eng");
      expect(adaptations.audio[0].type).to.equal("audio");
      expect(typeof adaptations.audio[0].id).to.equal("string");
      expect(adaptations.audio[0].id).to.not.equal(adaptations.video[0].id);
      expect(adaptations.audio[0].representations.length).to.equal(1);

      expect(adaptations.video.length).to.equal(1);
      expect(adaptations.video[0].type).to.equal("video");

      const audioRepresentation = adaptations.audio[0].representations[0];
      expect(audioRepresentation.baseURL).to.equal("https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/");
      expect(audioRepresentation.bitrate).to.equal(96257);
      expect(audioRepresentation.codec).to.equal("mp4a.40.2");
      expect(audioRepresentation.id).to.equal("p0aa0br96257");
      expect(audioRepresentation.mimeType).to.equal("audio/mp4");
      expect(typeof audioRepresentation.index).to.equal("object");

      const audioRepresentationIndex = audioRepresentation.index;
      const nextAudioSegment1 = audioRepresentationIndex.getSegments(3023671, 10);
      expect(nextAudioSegment1.length).to.equal(1);
      expect(nextAudioSegment1[0].duration).to.equal(479232);
      expect(nextAudioSegment1[0].id).to.equal("p0aa0br96257_145136233968");
      expect(nextAudioSegment1[0].isInit).to.equal(false);
      expect(nextAudioSegment1[0].media).to.equal("chunk_ctaudio_cfm4s_rid$RepresentationID$_cs$Time$_w925796611_mpd.m4s");
      expect(nextAudioSegment1[0].time).to.equal(145136233968);
      expect(nextAudioSegment1[0].timescale).to.equal(48000);

      const nextAudioSegment2 = audioRepresentationIndex.getSegments(3023671, 11);
      expect(nextAudioSegment2.length).to.equal(2);
      expect(nextAudioSegment2[1].duration).to.equal(480288);
      expect(nextAudioSegment2[1].id).to.equal("p0aa0br96257_145136713200");
      expect(nextAudioSegment2[1].isInit).to.equal(false);
      expect(nextAudioSegment2[1].media).to.equal("chunk_ctaudio_cfm4s_rid$RepresentationID$_cs$Time$_w925796611_mpd.m4s");
      expect(nextAudioSegment2[1].time).to.equal(145136713200);
      expect(nextAudioSegment2[1].timescale).to.equal(48000);

      expect(audioRepresentationIndex.getSegments(3023671, 41).length).to.equal(5);
      expect(audioRepresentationIndex.getSegments(3023671, 300000000000).length).to.equal(5);

      const videoRepresentation = adaptations.video[0].representations[0];
      expect(videoRepresentation.baseURL).to.equal("https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/");
      expect(videoRepresentation.bitrate).to.equal(601392);
      expect(videoRepresentation.codec).to.equal("avc1.42c015");
      expect(videoRepresentation.id).to.equal("p0va0br601392");
      expect(videoRepresentation.height).to.equal(288);
      expect(videoRepresentation.width).to.equal(512);
      expect(videoRepresentation.mimeType).to.equal("video/mp4");
      expect(typeof videoRepresentation.index).to.equal("object");

      const videoRepresentationIndex = videoRepresentation.index;
      const nextVideoSegment1 = videoRepresentationIndex.getSegments(3023671, 10);
      expect(nextVideoSegment1.length).to.equal(1);
      expect(nextVideoSegment1[0].duration).to.equal(900000);
      expect(nextVideoSegment1[0].id).to.equal("p0va0br601392_272130436800");
      expect(nextVideoSegment1[0].isInit).to.equal(false);
      expect(nextVideoSegment1[0].media).to.equal("chunk_ctvideo_cfm4s_rid$RepresentationID$_cs$Time$_w925796611_mpd.m4s");
      expect(nextVideoSegment1[0].time).to.equal(272130436800);
      expect(nextVideoSegment1[0].timescale).to.equal(90000);

      const nextVideoSegment2 = videoRepresentationIndex.getSegments(3023671, 11);
      expect(nextVideoSegment2.length).to.equal(2);
      expect(nextVideoSegment2[1].duration).to.equal(900000);
      expect(nextVideoSegment2[1].id).to.equal("p0va0br601392_272131336800");
      expect(nextVideoSegment2[1].isInit).to.equal(false);
      expect(nextVideoSegment2[1].media).to.equal("chunk_ctvideo_cfm4s_rid$RepresentationID$_cs$Time$_w925796611_mpd.m4s");
      expect(nextVideoSegment2[1].time).to.equal(272131336800);
      expect(nextVideoSegment2[1].timescale).to.equal(90000);

      expect(videoRepresentationIndex.getSegments(3023671, 41).length).to.equal(5);
      expect(videoRepresentationIndex.getSegments(3023671, 300000000000).length).to.equal(5);

      done();
    }, 1);
  });

  xit("should update the state when beginning to play", (done) => {
    fakeServer.respondWith("GET", manifestUrl,
      [200, { "Content-Type": "application/dash+xml" }, fakeManifest ]);
    fakeServer.respondWith("GET", audioInitUrl,
      [200, { "Content-Type": "audio/mp4" }, fakeAudioInit]);
    fakeServer.respondWith("GET", videoInitUrl,
      [200, { "Content-Type": "video/mp4" }, fakeVideoInit]);

    let lastEvent;
    player.addEventListener("playerStateChange", newState =>
      lastEvent = newState
    );
    expect(player.getPlayerState()).to.equal("STOPPED");

    player.loadVideo({
      url: manifestUrl,
      transport: "dash",
    });

    expect(player.getPlayerState()).to.equal("LOADING");
    expect(lastEvent).to.equal("LOADING");

    setTimeout(() => {
      fakeServer.respond();

      // expect(player.getPlayerState()).to.equal("LOADED");
      // expect(lastEvent).to.equal("LOADED");
      done();
    }, 1);
  });
});
