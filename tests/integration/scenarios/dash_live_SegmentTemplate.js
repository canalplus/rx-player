import { expect } from "chai";
import RxPlayer from "../../../src";
import {
  manifestInfos,
  noTimeShiftBufferDepthManifestInfos,
} from "../../contents/DASH_dynamic_SegmentTemplate";
import sleep from "../../utils/sleep.js";
import XHRMock from "../../utils/request_mock";

describe("DASH live content (SegmentTemplate)", function() {
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

  it("should fetch and parse the manifest", async function() {
    xhrMock.lock();

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(1);
    await xhrMock.flush();
    await sleep(1);

    expect(player.getPlayerState()).to.equal("LOADING");

    expect(player.isLive()).to.equal(true);
    expect(player.getUrl()).to.equal(manifestInfos.url);

    expect(xhrMock.getLockedXHR().length).to.be.at.least(2);
  });

  it("should list the right bitrates", async function () {
    xhrMock.lock();

    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
    });

    await sleep(1);
    await xhrMock.flush();
    await sleep(1);

    expect(player.getAvailableAudioBitrates()).to.eql([48000]);
    expect(player.getAvailableVideoBitrates()).to.eql([300000]);
  });

  describe("getAvailableAudioTracks", () => {
    it("should list the right audio languages", async function () {
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
      });
      expect(player.getAvailableAudioTracks()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableAudioTracks()).to.eql([]);
      await xhrMock.flush();
      await sleep(1);

      const audioTracks = player.getAvailableAudioTracks();

      const audioAdaptations = manifestInfos.periods[0].adaptations.audio;
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
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
      });
      expect(player.getAvailableTextTracks()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableTextTracks()).to.eql([]);
      await xhrMock.flush();
      await sleep(1);

      const textTracks = player.getAvailableTextTracks();

      const textAdaptations = manifestInfos.periods[0].adaptations.text;
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
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });
      expect(player.getAvailableVideoTracks()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableVideoTracks()).to.eql([]);
      await xhrMock.flush();
      await sleep(1);

      const videoTracks = player.getAvailableVideoTracks();

      const videoAdaptations = manifestInfos.periods[0].adaptations.video;
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
                const representation = adaptation.representations
                  .find(({ id }) => id === reprTrack.id);
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
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(1);
      await xhrMock.flush();
      await sleep(1);
      expect(player.getMinimumPosition()).to.be.closeTo(1553521448, 1);
    });
  });

  describe("getMaximumPosition", () => {
    it("should return the last playable position", async () => {
      xhrMock.lock();

      player.loadVideo({
        url: manifestInfos.url,
        transport:manifestInfos.transport,
      });

      await sleep(1);
      await xhrMock.flush();
      await sleep(1);
      expect(player.getMaximumPosition()).to.be.closeTo(1553521748, 1);
    });
  });
});

describe("DASH live content without timeShiftBufferDepth (SegmentTemplate)", function() {
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

  it("should fetch and parse the manifest", async function() {
    xhrMock.lock();

    player.loadVideo({
      url: noTimeShiftBufferDepthManifestInfos.url,
      transport: noTimeShiftBufferDepthManifestInfos.transport,
    });

    await sleep(1);
    expect(xhrMock.getLockedXHR().length).to.equal(1);
    await xhrMock.flush();
    await sleep(1);

    expect(player.getPlayerState()).to.equal("LOADING");

    expect(player.isLive()).to.equal(true);
    expect(player.getUrl()).to.equal(noTimeShiftBufferDepthManifestInfos.url);

    expect(xhrMock.getLockedXHR().length).to.be.at.least(2);
  });

  it("should list the right bitrates", async function () {
    xhrMock.lock();

    player.loadVideo({
      url: noTimeShiftBufferDepthManifestInfos.url,
      transport: noTimeShiftBufferDepthManifestInfos.transport,
    });

    await sleep(1);
    await xhrMock.flush();
    await sleep(1);

    expect(player.getAvailableAudioBitrates()).to.eql([48000]);
    expect(player.getAvailableVideoBitrates()).to.eql([300000]);
  });

  describe("getAvailableAudioTracks", () => {
    it("should list the right audio languages", async function () {
      xhrMock.lock();

      player.loadVideo({
        url: noTimeShiftBufferDepthManifestInfos.url,
        transport: noTimeShiftBufferDepthManifestInfos.transport,
      });
      expect(player.getAvailableAudioTracks()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableAudioTracks()).to.eql([]);
      await xhrMock.flush();
      await sleep(1);

      const audioTracks = player.getAvailableAudioTracks();

      const audioAdaptations = manifestInfos.periods[0].adaptations.audio;
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
      xhrMock.lock();

      player.loadVideo({
        url: noTimeShiftBufferDepthManifestInfos.url,
        transport: noTimeShiftBufferDepthManifestInfos.transport,
      });
      expect(player.getAvailableTextTracks()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableTextTracks()).to.eql([]);
      await xhrMock.flush();
      await sleep(1);

      const textTracks = player.getAvailableTextTracks();

      const textAdaptations = manifestInfos.periods[0].adaptations.text;
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
      xhrMock.lock();

      player.loadVideo({
        url: noTimeShiftBufferDepthManifestInfos.url,
        transport:noTimeShiftBufferDepthManifestInfos.transport,
      });
      expect(player.getAvailableVideoTracks()).to.eql([]);

      await sleep(1);
      expect(player.getAvailableVideoTracks()).to.eql([]);
      await xhrMock.flush();
      await sleep(1);

      const videoTracks = player.getAvailableVideoTracks();

      const videoAdaptations = manifestInfos.periods[0].adaptations.video;
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
                const representation = adaptation.representations
                  .find(({ id }) => id === reprTrack.id);
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
    it("should return the period start if one", async () => {
      xhrMock.lock();

      player.loadVideo({
        url: noTimeShiftBufferDepthManifestInfos.url,
        transport:noTimeShiftBufferDepthManifestInfos.transport,
      });

      await sleep(1);
      await xhrMock.flush();
      await sleep(1);
      expect(player.getMinimumPosition()).to.equal(1553515200);
    });
  });

  describe("getMaximumPosition", () => {
    it("should return the last playable position", async () => {
      xhrMock.lock();

      player.loadVideo({
        url: noTimeShiftBufferDepthManifestInfos.url,
        transport:noTimeShiftBufferDepthManifestInfos.transport,
      });

      await sleep(1);
      await xhrMock.flush();
      await sleep(1);
      expect(player.getMaximumPosition()).to.be
        .closeTo(1553521448, 3);
    });
  });
});
