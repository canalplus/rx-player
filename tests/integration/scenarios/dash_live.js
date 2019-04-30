import { expect } from "chai";
import sinon from "sinon";
import RxPlayer from "../../../src";
import {
  manifestInfos,
  URLs,
} from "../../contents/DASH_dynamic_SegmentTimeline";
import mockRequests from "../../utils/mock_requests.js";
import sleep from "../../utils/sleep.js";

describe("DASH live content (SegmentTimeline)", function () {
  let player;
  let fakeServer;

  beforeEach(() => {
    player = new RxPlayer();
    fakeServer = sinon.createFakeServer();
  });

  afterEach(() => {
    player.dispose();
    fakeServer.restore();
  });

  it("should fetch and parse the manifest", async function () {
    mockRequests(fakeServer, URLs);

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    expect(fakeServer.requests.length).to.equal(1);
    await sleep(10);
    fakeServer.respond();
    await sleep(10);

    const manifest = player.getManifest();
    expect(manifest).not.to.equal(null);
    expect(typeof manifest).to.equal("object");
    expect(manifest.getDuration()).to.equal(undefined);
    expect(manifest.transport)
      .to.equal(manifestInfos.transport);
    expect(typeof manifest.id).to.equal("string");
    expect(manifest.isLive).to.equal(true);
    expect(manifest.suggestedPresentationDelay).to.equal(10);
    expect(manifest.getUrl()).to.equal(manifestInfos.url);
    expect(manifest.availabilityStartTime)
      .to.equal(manifestInfos.availabilityStartTime);

    const adaptations = manifest.periods[0].adaptations;
    const firstPeriodAdaptationsInfos = manifestInfos.periods[0].adaptations;

    expect(adaptations.audio.length)
      .to.equal(firstPeriodAdaptationsInfos.audio.length);
    expect(adaptations.video.length)
      .to.equal(firstPeriodAdaptationsInfos.video.length);

    const firstAudioAdaptationInfos = firstPeriodAdaptationsInfos.audio[0];
    expect(!!adaptations.audio[0].isAudioDescription)
      .to.equal(firstAudioAdaptationInfos.isAudioDescription);
    expect(adaptations.audio[0].language)
      .to.equal(firstAudioAdaptationInfos.language);
    expect(adaptations.audio[0].normalizedLanguage)
      .to.equal(firstAudioAdaptationInfos.normalizedLanguage);
    expect(adaptations.audio[0].type).to.equal("audio");
    expect(typeof adaptations.audio[0].id).to.equal("string");
    expect(adaptations.audio[0].id).to.not.equal(adaptations.video[0].id);
    expect(adaptations.audio[0].representations.length)
      .to.equal(firstAudioAdaptationInfos.representations.length);
    expect(adaptations.audio[0].getAvailableBitrates())
      .to.eql(firstAudioAdaptationInfos.representations
        .map(representation => representation.bitrate)
      );

    const firstVideoAdaptationInfos = firstPeriodAdaptationsInfos.video[0];
    expect(adaptations.video[0].type).to.equal("video");
    expect(adaptations.video[0].getAvailableBitrates())
      .to.eql(firstVideoAdaptationInfos.representations
        .map(representation => representation.bitrate)
      );

    const audioRepresentation = adaptations.audio[0].representations[0];
    const audioRepresentationInfos = firstAudioAdaptationInfos
      .representations[0];
    expect(audioRepresentation.bitrate)
      .to.equal(audioRepresentationInfos.bitrate);
    expect(audioRepresentation.codec)
      .to.equal(audioRepresentationInfos.codec);
    expect(typeof audioRepresentation.id).to.equal("string");
    expect(audioRepresentation.mimeType)
      .to.equal(audioRepresentationInfos.mimeType);
    expect(typeof audioRepresentation.index).to.equal("object");

    const audioRepresentationIndex = audioRepresentation.index;
    const audioRepresentationIndexInfos = audioRepresentationInfos.index;
    const initAudioSegment = audioRepresentationIndex.getInitSegment();
    expect(typeof initAudioSegment.id).to.equal("string");
    expect(initAudioSegment.mediaURL).to
      .equal(audioRepresentationIndexInfos.init.mediaURL);

    const nextAudioSegment1 = audioRepresentationIndex
      .getSegments(1527507762, 5);
    expect(nextAudioSegment1.length).to.equal(1);
    expect(nextAudioSegment1[0].duration)
      .to.equal(audioRepresentationIndexInfos.segments[0].duration);
    expect(typeof nextAudioSegment1[0].id).to.equal("string");
    expect(nextAudioSegment1[0].isInit).to.equal(false);
    expect(nextAudioSegment1[0].time)
      .to.equal(audioRepresentationIndexInfos.segments[0].time);
    expect(nextAudioSegment1[0].timescale)
      .to.equal(audioRepresentationIndexInfos.segments[0].timescale);
    expect(nextAudioSegment1[0].mediaURL)
      .to.equal(audioRepresentationIndexInfos.segments[0].mediaURL);

    const nextAudioSegment2 = audioRepresentationIndex
      .getSegments(1527507762, 11);
    expect(nextAudioSegment2.length).to.equal(2);
    expect(nextAudioSegment2[1].duration)
      .to.equal(audioRepresentationIndexInfos.segments[1].duration);
    expect(typeof nextAudioSegment2[1].id).to.equal("string");
    expect(nextAudioSegment2[1].isInit).to.equal(false);
    expect(nextAudioSegment2[1].time)
      .to.equal(audioRepresentationIndexInfos.segments[1].time);
    expect(nextAudioSegment2[1].timescale)
      .to.equal(audioRepresentationIndexInfos.segments[1].timescale);
    expect(nextAudioSegment2[1].mediaURL)
      .to.equal(audioRepresentationIndexInfos.segments[1].mediaURL);

    expect(audioRepresentationIndex.getSegments(1527507762, 294).length)
      .to.equal(49);
    expect(audioRepresentationIndex.getSegments(1527507762, 295).length)
      .to.equal(50);
    expect(
      audioRepresentationIndex.getSegments(1527507762, 300000000000).length
    ).to.equal(50);

    const videoRepresentation = adaptations.video[0].representations[0];
    const videoRepresentationInfos = firstVideoAdaptationInfos
      .representations[0];

    expect(videoRepresentation.bitrate)
      .to.equal(videoRepresentationInfos.bitrate);
    expect(videoRepresentation.codec)
      .to.equal(videoRepresentationInfos.codec);
    expect(typeof videoRepresentation.id).to.equal("string");
    expect(videoRepresentation.height)
      .to.equal(videoRepresentationInfos.height);
    expect(videoRepresentation.width)
      .to.equal(videoRepresentationInfos.width);
    expect(videoRepresentation.mimeType)
      .to.equal(videoRepresentationInfos.mimeType);
    expect(typeof videoRepresentation.index)
      .to.equal("object");

    const videoRepresentationIndex = videoRepresentation.index;
    const videoRepresentationIndexInfos = videoRepresentationInfos.index;

    const initVideoSegment = videoRepresentationIndex.getInitSegment();
    expect(typeof initVideoSegment.id).to.equal("string");
    expect(initVideoSegment.mediaURL)
      .to.equal(videoRepresentationIndexInfos.init.mediaURL);

    const nextVideoSegment1 = videoRepresentationIndex
      .getSegments(1527507762, 5);
    expect(nextVideoSegment1.length).to.equal(1);
    expect(nextVideoSegment1[0].duration)
      .to.equal(videoRepresentationIndexInfos.segments[0].duration);
    expect(typeof nextVideoSegment1[0].id).to.equal("string");
    expect(nextVideoSegment1[0].isInit).to.equal(false);
    expect(nextVideoSegment1[0].time)
      .to.equal(videoRepresentationIndexInfos.segments[0].time);
    expect(nextVideoSegment1[0].timescale)
      .to.equal(videoRepresentationIndexInfos.segments[0].timescale);
    expect(nextVideoSegment1[0].mediaURL)
      .to.equal(videoRepresentationIndexInfos.segments[0].mediaURL);

    const nextVideoSegment2 = videoRepresentationIndex
      .getSegments(1527507762, 11);
    expect(nextVideoSegment2.length).to.equal(2);
    expect(nextVideoSegment2[1].duration)
      .to.equal(videoRepresentationIndexInfos.segments[1].duration);
    expect(typeof nextVideoSegment2[1].id).to.equal("string");
    expect(nextVideoSegment2[1].isInit).to.equal(false);
    expect(nextVideoSegment2[1].time)
      .to.equal(videoRepresentationIndexInfos.segments[1].time);
    expect(nextVideoSegment2[1].timescale)
      .to.equal(videoRepresentationIndexInfos.segments[1].timescale);
    expect(nextVideoSegment2[1].mediaURL)
      .to.equal(videoRepresentationIndexInfos.segments[1].mediaURL);

    expect(videoRepresentationIndex.getSegments(1527507762, 294).length)
      .to.equal(49);
    expect(videoRepresentationIndex.getSegments(1527507762, 295).length)
      .to.equal(50);
    expect(
      videoRepresentationIndex.getSegments(1527507762, 300000000000).length
    ).to.equal(50);

    expect(fakeServer.requests.length).to.be.at.least(3);
    const requestsDone = fakeServer.requests.map(r => r.url);
    expect(requestsDone)
      .to.include(videoRepresentationIndexInfos.init.mediaURL);
    expect(requestsDone)
      .to.include(audioRepresentationIndexInfos.init.mediaURL);
  });

  it("should list the right bitrates", async function () {
    mockRequests(fakeServer, URLs);

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    await sleep(5);
    fakeServer.respond();
    await sleep(5);

    expect(player.getAvailableAudioBitrates()).to.eql([48000]);
    expect(player.getAvailableVideoBitrates()).to.eql([300000]);
  });

  describe("getAvailableAudioTracks", () => {
    it("should list the right audio languages", async function () {
      mockRequests(fakeServer, URLs);

      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
      });
      expect(player.getAvailableAudioTracks()).to.eql([]);

      await sleep(5);
      expect(player.getAvailableAudioTracks()).to.eql([]);
      fakeServer.respond();
      await sleep(5);

      const audioTracks = player.getAvailableAudioTracks();

      const currentPeriod = player.getManifest().periods[0];
      const audioAdaptations = currentPeriod.adaptations.audio;
      expect(audioTracks.length).to
        .equal(audioAdaptations ? audioAdaptations.length : 0);

      if (audioAdaptations) {
        for (let i = 0; i < audioAdaptations.length; i++) {
          const adaptation = audioAdaptations[i];

          for (let j = 0; j < audioTracks.length; j++) {
            let found = false;
            const audioTrack = audioTracks[j];
            if (audioTrack.id === adaptation.id) {
              found = true;
              expect(audioTrack.language).to.equal(adaptation.language || "");
              expect(audioTrack.normalized).to
                .equal(adaptation.normalizedLanguage || "");
              expect(audioTrack.audioDescription)
                .to.equal(!!adaptation.isAudioDescription);

              const activeAudioTrack = player.getAudioTrack();
              expect(audioTrack.active).to
                .equal(activeAudioTrack ?
                  activeAudioTrack.id === audioTrack.id : false);
            }
            expect(found).to.equal(true);
          }
        }
      }
    });
  });

  describe("getAvailableTextTracks", () => {
    it("should list the right text languages", async function () {
      mockRequests(fakeServer, URLs);

      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
      });
      expect(player.getAvailableTextTracks()).to.eql([]);

      await sleep(5);
      expect(player.getAvailableTextTracks()).to.eql([]);
      fakeServer.respond();
      await sleep(5);

      const textTracks = player.getAvailableTextTracks();

      const currentPeriod = player.getManifest().periods[0];
      const textAdaptations = currentPeriod.adaptations.text;
      expect(textTracks.length).to
        .equal(textAdaptations ? textAdaptations.length : 0);

      if (textAdaptations) {
        for (let i = 0; i < textAdaptations.length; i++) {
          const adaptation = textAdaptations[i];

          for (let j = 0; j < textTracks.length; j++) {
            let found = false;
            const textTrack = textTracks[j];
            if (textTrack.id === adaptation.id) {
              found = true;
              expect(textTrack.language).to.equal(adaptation.language || "");
              expect(textTrack.normalized).to
                .equal(adaptation.normalizedLanguage || "");
              expect(textTrack.closedCaption)
                .to.equal(!!adaptation.isClosedCaption);

              const activeTextTrack = player.getTextTrack();
              expect(textTrack.active).to
                .equal(activeTextTrack ?
                  activeTextTrack.id === textTrack.id : false);
            }
            expect(found).to.equal(true);
          }
        }
      }
    });
  });

  describe("getAvailableVideoTracks", () => {
    it("should list the right video tracks", async function () {
      mockRequests(fakeServer, URLs);

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });
      expect(player.getAvailableVideoTracks()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableVideoTracks()).to.eql([]);
      fakeServer.respond();
      await sleep(1);

      const videoTracks = player.getAvailableVideoTracks();

      const currentPeriod = player.getManifest().periods[0];
      const videoAdaptations = currentPeriod.adaptations.video;
      expect(videoTracks.length).to
        .equal(videoAdaptations ? videoAdaptations.length : 0);

      if (videoAdaptations) {
        for (let i = 0; i < videoAdaptations.length; i++) {
          const adaptation = videoAdaptations[i];

          for (let j = 0; j < videoTracks.length; j++) {
            let found = false;
            const videoTrack = videoTracks[j];
            if (videoTrack.id === adaptation.id) {
              found = true;

              for (
                let representationIndex = 0;
                representationIndex < videoTrack.representations.length;
                representationIndex++
              ) {
                const reprTrack = videoTrack
                  .representations[representationIndex];
                const representation =
                  adaptation.getRepresentation(reprTrack.id);
                expect(reprTrack.bitrate).to.equal(representation.bitrate);
                expect(reprTrack.frameRate).to
                  .equal(representation.frameRate);
                expect(reprTrack.width).to.equal(representation.width);
                expect(reprTrack.height).to.equal(representation.height);
              }

              const activeVideoTrack = player.getVideoTrack();
              expect(videoTrack.active).to
                .equal(activeVideoTrack ?
                  activeVideoTrack.id === videoTrack.id : false);
            }
            expect(found).to.equal(true);
          }
        }
      }
    });
  });

  describe("getMinimumPosition", () => {
    it("should return the last position minus the TimeShift window", async () => {
      mockRequests(fakeServer, URLs);

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      fakeServer.respond();
      await sleep(10);
      expect(player.getMinimumPosition()).to.be
        .closeTo(1527507767, 1);
    });
  });

  describe("getMaximumPosition", () => {
    it("should return the last playable position", async () => {
      mockRequests(fakeServer, URLs);

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(10);
      fakeServer.respond();
      await sleep(10);
      expect(player.getMaximumPosition()).to.be
        .closeTo(1527508062, 1);
    });
  });
});
