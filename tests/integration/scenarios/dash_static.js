import { expect } from "chai";
import sinon from "sinon";
import RxPlayer from "../../../src";
import {
  mockManifestRequest,
  mockAllRequests,
} from "../utils/mock_requests.js";
import sleep from "../utils/sleep.js";
import { waitForLoadedStateAfterLoadVideo } from "../utils/waitForPlayerState";
import Mock from "../mocks/dash_static_SegmentTimeline.js";

describe("DASH non-linear content (SegmentTimeline)", function () {
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

  describe("loadVideo", () => {
    it("should fetch the manifest then the init segments", async function () {
      mockManifestRequest(fakeServer, Mock);

      // We only have arround 15s of playback locally for this content
      player.setWantedBufferAhead(15);

      // deactivate ABR for this test for now
      player.setVideoBitrate(0);
      player.setAudioBitrate(0);

      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });

      // should only have the manifest for now
      expect(fakeServer.requests.length).to.equal(1);
      expect(fakeServer.requests[0].url).to.equal(Mock.manifest.url);

      await sleep(0);
      fakeServer.respond();
      await sleep(0);

      expect(fakeServer.requests.length).to.equal(3);
      const requestsDone = [
        fakeServer.requests[1].url,
        fakeServer.requests[2].url,
      ];
      expect(requestsDone).to.include(Mock.audio[0].init.url);
      expect(requestsDone).to.include(Mock.video[0].init.url);

      // TODO Do the init segment and the first needed segment in parallel
      // expect(fakeServer.requests.length).to.equal(5);

      // const requestsDone = [
      //   fakeServer.requests[1].url,
      //   fakeServer.requests[2].url,
      //   fakeServer.requests[3].url,
      //   fakeServer.requests[4].url,
      // ];

      // expect(requestsDone).to.include(Mock.audio[0].init.url);
      // expect(requestsDone).to.include(Mock.video[0].init.url);
    });
  });

  describe("getError", () => {
    it("should return null if no fatal error has happened", async () => {
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getError()).to.eql(null);
    });
  });

  describe("getManifest", () => {
    it("should returns the manifest correctly parsed", async function () {
      mockManifestRequest(fakeServer, Mock);

      // We only have arround 15s of playback locally for this content
      player.setWantedBufferAhead(15);

      // deactivate ABR for this test for now
      player.setVideoBitrate(0);
      player.setAudioBitrate(0);

      player.loadVideo({ url: Mock.manifest.url, transport: "dash" });

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
      expect(manifest.availabilityStartTime).to.equal(0);


      // ---- General Adaptations data ----

      const adaptations = manifest.adaptations;

      expect(adaptations.audio.length).to.equal(1);
      expect(adaptations.audio[0].type).to.equal("audio");

      expect(!!adaptations.audio[0].isAudioDescription).to.equal(false);
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
      expect(audioRepresentation.bitrate).to.equal(128000);
      expect(audioRepresentation.codec).to.equal("mp4a.40.2");
      expect(audioRepresentation.id).to.equal("audio=128000");
      expect(audioRepresentation.mimeType).to.equal("audio/mp4");
      expect(typeof audioRepresentation.index).to.equal("object");

      const audioRepresentationIndex = audioRepresentation.index;
      const initAudioSegment = audioRepresentationIndex.getInitSegment();
      expect(initAudioSegment.mediaURL).to
        .equal("http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-audio=128000.dash");
      expect(initAudioSegment.id).to.equal("init");

      const nextAudioSegment1 = audioRepresentationIndex.getSegments(0, 4);
      expect(nextAudioSegment1.length).to.equal(1);
      expect(nextAudioSegment1[0].duration).to.equal(177341);
      expect(nextAudioSegment1[0].id).to.equal("0");
      expect(nextAudioSegment1[0].isInit).to.equal(false);
      expect(nextAudioSegment1[0].mediaURL).to
        .equal("http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-audio=128000-0.dash");
      expect(nextAudioSegment1[0].time).to.equal(0);
      expect(nextAudioSegment1[0].timescale).to.equal(44100);

      const nextAudioSegment2 = audioRepresentationIndex.getSegments(0, 5);
      expect(nextAudioSegment2.length).to.equal(2);
      expect(nextAudioSegment2[1].duration).to.equal(176128);
      expect(nextAudioSegment2[1].id).to.equal("177341");
      expect(nextAudioSegment2[1].isInit).to.equal(false);
      expect(nextAudioSegment2[1].mediaURL)
        .to.equal("http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-audio=128000-177341.dash");
      expect(nextAudioSegment2[1].time).to.equal(177341);
      expect(nextAudioSegment2[1].timescale).to.equal(44100);

      expect(audioRepresentationIndex.getSegments(0, 101).length)
        .to.equal(26);
      expect(audioRepresentationIndex.getSegments(0, 1010).length)
        .to.equal(26);

      // ---- Video Adaptations / Representations / Segments ----

      const videoRepresentation = adaptations.video[0].representations[0];
      expect(videoRepresentation.bitrate).to.equal(400000);
      expect(videoRepresentation.codec).to.equal("avc1.42C014");
      expect(videoRepresentation.id).to.equal("video=400000");
      expect(videoRepresentation.height).to.equal(124);
      expect(videoRepresentation.width).to.equal(220);
      expect(videoRepresentation.mimeType).to.equal("video/mp4");
      expect(typeof videoRepresentation.index).to.equal("object");

      const videoRepresentationIndex = videoRepresentation.index;
      const initVideoSegment = videoRepresentationIndex.getInitSegment();
      expect(initVideoSegment.mediaURL).to
        .equal("http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=400000.dash");
      expect(initVideoSegment.id).to.equal("init");

      const nextVideoSegment1 = videoRepresentationIndex.getSegments(0, 4);
      expect(nextVideoSegment1.length).to.equal(1);
      expect(nextVideoSegment1[0].duration).to.equal(4004);
      expect(nextVideoSegment1[0].id).to.equal("0");
      expect(nextVideoSegment1[0].isInit).to.equal(false);
      expect(nextVideoSegment1[0].mediaURL).to
        .equal("http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=400000-0.dash");
      expect(nextVideoSegment1[0].time).to.equal(0);
      expect(nextVideoSegment1[0].timescale).to.equal(1000);

      const nextVideoSegment2 = videoRepresentationIndex.getSegments(0, 5);
      expect(nextVideoSegment2.length).to.equal(2);
      expect(nextVideoSegment2[1].duration).to.equal(4004);
      expect(nextVideoSegment2[1].id).to.equal("4004");
      expect(nextVideoSegment2[1].isInit).to.equal(false);
      expect(nextVideoSegment2[1].mediaURL).to
        .equal("http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=400000-4004.dash");
      expect(nextVideoSegment2[1].time).to.equal(4004);
      expect(nextVideoSegment2[1].timescale).to.equal(1000);

      expect(videoRepresentationIndex.getSegments(0, 101).length)
        .to.equal(26);
      expect(videoRepresentationIndex.getSegments(0, 1010).length)
        .to.equal(26);
    });
  });

  describe("getCurrentAdaptations", () => {
    it("should return the currently played adaptations", async () => {
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      const currentAdaptations = player.getCurrentAdaptations();
      expect(typeof currentAdaptations).to.eql("object");
      expect(currentAdaptations.text).to.equal(null);
      expect(currentAdaptations.image).to.equal(null);
      expect(currentAdaptations.video).to
        .equal(player.getManifest().periods[0].adaptations.video[0]);
      expect(currentAdaptations.audio).to
        .equal(player.getManifest().periods[0].adaptations.audio[0]);
    });
  });

  describe("getCurrentRepresentations", () => {
    it("should return the currently played representations", async () => {
      mockAllRequests(fakeServer, Mock);
      player.setVideoBitrate(0);
      fakeServer.autoRespond = true;
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      await waitForLoadedStateAfterLoadVideo(player);

      const currentRepresentations = player.getCurrentRepresentations();
      expect(typeof currentRepresentations).to.eql("object");
      expect(currentRepresentations.text).to.equal(undefined);
      expect(currentRepresentations.image).to.equal(undefined);
      expect(currentRepresentations.audio).to
        .equal(player.getCurrentAdaptations().audio.representations[0]);
      const videoRepresentations = player.getCurrentAdaptations()
        .video.representations;
      expect(currentRepresentations.video).to
        .equal(videoRepresentations[0]);
    });
  });

  describe("getVideoElement", () => {
    it("should return a video element", async () => {
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getVideoElement()).to.not.be.null;
      expect(player.getVideoElement().nodeType).to.eql(Element.ELEMENT_NODE);
      expect(player.getVideoElement().nodeName.toLowerCase()).to.eql("video");
    });
  });

  describe("getNativeTextTrack", () => {
    it("should be null if no enabled text track", async () => {
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getNativeTextTrack()).to.be.null;
    });
  });

  describe("getPlayerState", () => {

    it("should go from LOADING to LOADED", async () => {
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;
      expect(player.getPlayerState()).to.equal("STOPPED");
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      expect(player.getPlayerState()).to.equal("LOADING");
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlayerState()).to.equal("LOADED");
      player.pause();
      expect(player.getPlayerState()).to.equal("LOADED");
      await sleep(1);
      expect(player.getPlayerState()).to.equal("LOADED");
    });

    it("should go to PLAYING when play is called", async () => {
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;
      expect(player.getPlayerState()).to.equal("STOPPED");
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.play();
      await sleep(1);
      expect(player.getPlayerState()).to.equal("PLAYING");
    });

    it("should go to LOADING then to PLAYING immediately when autoPlay is set", async () => {
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;
      expect(player.getPlayerState()).to.equal("STOPPED");
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: true,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlayerState()).to.equal("PLAYING");
    });
  });

  describe("isLive", () => {
    it("should return false", async () => {
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.isLive()).to.eql(false);
    });
  });

  describe("getUrl", () => {
    it("should return the URL of the manifest", async () => {
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getUrl()).to.eql(Mock.manifest.url);
    });
  });

  describe("getVideoDuration", () => {
    it("should return the duration of the whole video", async () => {
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getVideoDuration()).to.be.closeTo(101.5, 0.1);
    });
  });

  describe("getVideoBufferGap", () => {
    it("should return the buffer gap of the current range", async function() {
      this.timeout(3000);
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;

      player.setWantedBufferAhead(10);
      expect(player.getWantedBufferAhead()).to.equal(10);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await sleep(200);

      let bufferGap = player.getVideoBufferGap();
      expect(bufferGap).to.be.at.least(10);
      expect(bufferGap).to.be.below(10 + 5);

      player.setWantedBufferAhead(20);
      expect(player.getWantedBufferAhead()).to.equal(20);
      await sleep(300);
      bufferGap = player.getVideoBufferGap();
      expect(bufferGap).to.be.at.least(20);
      expect(bufferGap).to.be.below(20 + 5);

      player.seekTo(10);
      await sleep(300);
      expect(player.getWantedBufferAhead()).to.equal(20);
      bufferGap = player.getVideoBufferGap();
      expect(bufferGap).to.be.at.least(20);
      expect(bufferGap).to.be.below(20 + 5);

      player.seekTo(10 + 26);
      await sleep(300);
      expect(player.getWantedBufferAhead()).to.equal(20);
      bufferGap = player.getVideoBufferGap();
      expect(bufferGap).to.be.at.least(20);
      expect(bufferGap).to.be.below(20 + 5);

      player.setWantedBufferAhead(Infinity);
      expect(player.getWantedBufferAhead()).to.equal(Infinity);
      await sleep(500);
      bufferGap = player.getVideoBufferGap();
      expect(bufferGap).to.be.closeTo(player.getVideoDuration() - (10 + 26), 2);
    });
  });

  describe("getVideoLoadedTime", () => {
    it("should return the time of the current loaded time", async function() {
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);

      player.setWantedBufferAhead(10);
      expect(player.getWantedBufferAhead()).to.equal(10);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await sleep(100);

      const bufferGap = player.getVideoBufferGap();
      expect(player.getPosition()).to.equal(0);
      expect(player.getVideoLoadedTime()).to.equal(bufferGap);

      fakeServer.autoRespond = false;
      player.seekTo(5);
      await sleep(100);
      expect(player.getVideoLoadedTime()).to.equal(bufferGap);

      fakeServer.respond();
      fakeServer.autoRespond = true;
      await sleep(300);
      expect(player.getVideoLoadedTime()).to.be.closeTo(bufferGap + 5, 2);

      player.seekTo(20);
      await sleep(300);
      expect(player.getVideoLoadedTime()).to.be.closeTo(20 + 10, 4);
    });
  });

  describe("getVideoPlayedTime", () => {
    it("should return the difference between the start of the current range and the current time", async function() {
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);

      player.setWantedBufferAhead(10);
      expect(player.getWantedBufferAhead()).to.equal(10);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await sleep(100);

      expect(player.getPosition()).to.equal(0);
      expect(player.getVideoPlayedTime()).to.equal(0);

      fakeServer.autoRespond = false;
      player.seekTo(5);
      await sleep(100);
      expect(player.getVideoPlayedTime()).to.equal(5);

      fakeServer.respond();
      fakeServer.autoRespond = true;
      await sleep(300);
      expect(player.getVideoPlayedTime()).to.equal(5);

      player.seekTo(30);
      await sleep(300);
      const initialLoadedTime = player.getVideoPlayedTime();
      expect(initialLoadedTime).to.be.closeTo(0, 4);

      player.seekTo(30 + 5);
      expect(player.getVideoPlayedTime()).to.be
        .closeTo(initialLoadedTime + 5, 1);
    });
  });

  describe("getWallClockTime", () => {
    it("should be 0 by default", async () => {
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getWallClockTime()).to.equal(0);
    });

    it("should return the starting position if one", async () => {
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        startAt: { position: 4 },
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getWallClockTime()).to.equal(4);
    });

    it("should update as soon as we seek", async () => {
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.seekTo(12);
      expect(player.getWallClockTime()).to.equal(12);
    });
  });

  describe("getPosition", () => {
    it("should be 0 by default", async () => {
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPosition()).to.equal(0);
    });

    it("should return the starting position if one", async () => {
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        startAt: { position: 4 },
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPosition()).to.equal(4);
    });

    it("should update as soon as we seek", async () => {
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.seekTo(12);
      expect(player.getPosition()).to.equal(12);
    });
  });

  describe("getPlaybackRate", () => {
    it("should be 1 by default", async () => {
      expect(player.getPlaybackRate()).to.equal(1);
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      expect(player.getPlaybackRate()).to.equal(1);
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlaybackRate()).to.equal(1);
    });

    it("should update when the speed is updated", async () => {
      player.setPlaybackRate(2);
      expect(player.getPlaybackRate()).to.equal(2);
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      expect(player.getPlaybackRate()).to.equal(2);
      player.setPlaybackRate(3);
      expect(player.getPlaybackRate()).to.equal(3);
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPlaybackRate()).to.equal(3);
      player.setPlaybackRate(0);
      expect(player.getPlaybackRate()).to.equal(0);
    });
  });

  describe("setPlaybackRate", () => {
    it("should update the speed accordingly", async function() {
      this.timeout(5000);
      fakeServer.autoRespond = true;
      mockAllRequests(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      await waitForLoadedStateAfterLoadVideo(player);
      expect(player.getPosition()).to.equal(0);
      player.setPlaybackRate(1);
      player.play();
      await sleep(900);
      const initialPosition = player.getPosition();
      expect(initialPosition).to.be.closeTo(0.900, 0.150);

      player.setPlaybackRate(10);
      await sleep(800);
      const secondPosition = player.getPosition();
      expect(secondPosition).to.be
        .closeTo(initialPosition + 10 * 0.800, 1);
    });
  });

  describe("getAvailableVideoBitrates", () => {
    it("should list the right video bitrates", async function () {
      mockManifestRequest(fakeServer, Mock);

      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });

      expect(player.getAvailableVideoBitrates()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableVideoBitrates()).to.eql([]);
      fakeServer.respond();
      await sleep(1);

      expect(player.getAvailableVideoBitrates()).to.eql(
        [400000, 795000, 1193000, 1996000]
      );
    });
  });

  describe("getAvailableAudioBitrates", () => {
    it("should list the right audio bitrates", async function () {
      mockManifestRequest(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      expect(player.getAvailableAudioBitrates()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableAudioBitrates()).to.eql([]);
      fakeServer.respond();
      await sleep(1);

      expect(player.getAvailableAudioBitrates()).to.eql([128000]);
    });
  });

  describe("getAvailableAudioTracks", () => {
    it("should list the right audio languages", async function () {
      mockManifestRequest(fakeServer, Mock);

      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      expect(player.getAvailableAudioTracks()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableAudioTracks()).to.eql([]);
      fakeServer.respond();
      await sleep(1);

      const audioTracks = player.getAvailableAudioTracks();

      expect(audioTracks.length).to.equal(1);
      expect(audioTracks[0].language).to.equal("");
      expect(audioTracks[0].normalized).to.equal("");
      expect(audioTracks[0].audioDescription).to.equal(false);
      expect(typeof audioTracks[0].id).to.equal("string");
      expect(audioTracks[0].id).to.not.equal("");
      expect(audioTracks[0].active).to.equal(true);
    });
  });

  describe("getAvailableTextTracks", () => {
    it("should list the right text languages", async function () {
      mockManifestRequest(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      expect(player.getAvailableTextTracks()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableTextTracks()).to.eql([]);
      fakeServer.respond();
      await sleep(1);

      const textTracks = player.getAvailableTextTracks();
      expect(textTracks.length).to.equal(0);
    });
  });

  describe("getAvailableVideoTracks", () => {
    it("should list the right text languages", async function () {
      mockManifestRequest(fakeServer, Mock);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
      });
      expect(player.getAvailableVideoTracks()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableVideoTracks()).to.eql([]);
      fakeServer.respond();
      await sleep(1);

      const videoTracks = player.getAvailableVideoTracks();
      expect(videoTracks.length).to.equal(1);
      expect(videoTracks[0]).to.not.equal("");
      expect(typeof videoTracks[0].id).to.equal("string");
      expect(videoTracks[0].active).to.eql(true);
      expect(videoTracks[0].representations.length).to.equal(4);

      expect(videoTracks[0].representations[0].bitrate).to.equal(400000);
      expect(videoTracks[0].representations[0].codec).to.equal("avc1.42C014");
      expect(videoTracks[0].representations[0].height).to.equal(124);
      expect(videoTracks[0].representations[0].width).to.equal(220);
      expect(videoTracks[0].representations[0].id).to.equal("video=400000");

      expect(videoTracks[0].representations[1].bitrate).to.equal(795000);
      expect(videoTracks[0].representations[1].codec).to.equal("avc1.42C014");
      expect(videoTracks[0].representations[1].height).to.equal(208);
      expect(videoTracks[0].representations[1].width).to.equal(368);
      expect(videoTracks[0].representations[1].id).to.equal("video=795000");

      expect(videoTracks[0].representations[2].bitrate).to.equal(1193000);
      expect(videoTracks[0].representations[2].codec).to.equal("avc1.42C01E");
      expect(videoTracks[0].representations[2].height).to.equal(432);
      expect(videoTracks[0].representations[2].width).to.equal(768);
      expect(videoTracks[0].representations[2].id).to.equal("video=1193000");

      expect(videoTracks[0].representations[3].bitrate).to.equal(1996000);
      expect(videoTracks[0].representations[3].codec).to.equal("avc1.640028");
      expect(videoTracks[0].representations[3].height).to.equal(944);
      expect(videoTracks[0].representations[3].width).to.equal(1680);
      expect(videoTracks[0].representations[3].id).to.equal("video=1996000");
    });
  });

  describe("setWantedBufferAhead", () => {
    it("should download until a set wanted buffer ahead", async function() {
      this.timeout(3000);
      mockAllRequests(fakeServer, Mock);
      fakeServer.autoRespond = true;

      player.setWantedBufferAhead(10);
      expect(player.getWantedBufferAhead()).to.equal(10);
      player.loadVideo({
        url: Mock.manifest.url,
        transport: "dash",
        autoPlay: false,
      });
      await waitForLoadedStateAfterLoadVideo(player);
      await sleep(200);
      let buffered = player.getVideoElement().buffered;
      expect(buffered.length).to.equal(1);
      expect(buffered.start(0)).to.equal(0);
      let endOfCurrentRange = buffered.end(0);
      expect(endOfCurrentRange).to.be.at.least(10);
      expect(endOfCurrentRange).to.be.below(10 + 5);

      player.setWantedBufferAhead(20);
      expect(player.getWantedBufferAhead()).to.equal(20);
      await sleep(300);
      buffered = player.getVideoElement().buffered;
      expect(buffered.length).to.equal(1);
      expect(buffered.start(0)).to.equal(0);
      endOfCurrentRange = buffered.end(0);
      expect(endOfCurrentRange).to.be.at.least(20);
      expect(endOfCurrentRange).to.be.below(20 + 5);

      player.seekTo(10);
      await sleep(300);
      buffered = player.getVideoElement().buffered;
      expect(player.getWantedBufferAhead()).to.equal(20);
      expect(buffered.length).to.equal(1);
      expect(buffered.start(0)).to.equal(0);
      endOfCurrentRange = buffered.end(0);
      expect(endOfCurrentRange).to.be.at.least(10 + 20);
      expect(endOfCurrentRange).to.be.below(10 + 20 + 5);

      player.seekTo(10 + 20 + 5 + 10);
      await sleep(300);
      buffered = player.getVideoElement().buffered;
      expect(player.getWantedBufferAhead()).to.equal(20);
      expect(buffered.length).to.equal(2);
      expect(buffered.start(1)).to.be.at.most(10 + 20 + 5 + 10);
      endOfCurrentRange = buffered.end(1);
      expect(endOfCurrentRange).to.be.at.least(20 + 10 + 5 + 10 + 20);
      expect(endOfCurrentRange).to.be.below(20 + 10 + 5 + 10 + 20 + 5);

      player.setWantedBufferAhead(Infinity);
      expect(player.getWantedBufferAhead()).to.equal(Infinity);
      await sleep(500);
      buffered = player.getVideoElement().buffered;
      expect(buffered.length).to.equal(2);
      expect(buffered.start(1)).to.be.at.most(10 + 20 + 5 + 10);
      endOfCurrentRange = buffered.end(1);
      expect(endOfCurrentRange).to.be.closeTo(player.getVideoDuration(), 2);
    });
  });
});
