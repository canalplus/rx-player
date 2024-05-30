import { expect } from "chai";
import { describe, beforeEach, afterEach, it } from "vitest";
import RxPlayer from "../../../dist/es2017";
import {
  manifestInfos,
  noTimeShiftBufferDepthManifestInfos,
} from "../../contents/DASH_dynamic_SegmentTimeline";
import sleep from "../../utils/sleep.js";
import { checkAfterSleepWithBackoff } from "../../utils/checkAfterSleepWithBackoff.js";

describe("DASH live content (SegmentTimeline)", function () {
  let player;

  beforeEach(() => {
    player = new RxPlayer();
  });

  afterEach(() => {
    player.dispose();
  });

  it("should fetch and parse the Manifest", async function () {
    let manifestLoaderCalledTimes = 0;
    let segmentLoaderLoaderCalledTimes = 0;
    const manifestLoader = (man, callbacks) => {
      expect(manifestInfos.url).to.equal(man.url);
      manifestLoaderCalledTimes++;
      callbacks.fallback();
    };
    const segmentLoader = () => {
      segmentLoaderLoaderCalledTimes++;
      // Do nothing here
    };
    player.loadVideo({
      url: manifestInfos.url,
      transport: manifestInfos.transport,
      manifestLoader,
      segmentLoader,
    });

    await sleep(1);
    expect(manifestLoaderCalledTimes).to.equal(1); // Manifest request
    await checkAfterSleepWithBackoff(null, () => {
      expect(player.getPlayerState()).to.equal("LOADING");

      expect(player.isLive()).to.equal(true);
      expect(player.getContentUrls()).to.eql([manifestInfos.url]);

      expect(manifestLoaderCalledTimes).to.equal(1);
      expect(segmentLoaderLoaderCalledTimes).to.be.at.least(2);
    });
  });

  describe("getAvailableAudioTracks", () => {
    it("should list the right audio languages", async function () {
      let manifestLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(manifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = () => {
        // Do nothing here
      };
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        manifestLoader,
        segmentLoader,
      });
      expect(player.getAvailableAudioTracks()).to.eql([]);

      await sleep(1);
      expect(manifestLoaderCalledTimes).to.equal(1);
      await checkAfterSleepWithBackoff(null, () => {
        const audioTracks = player.getAvailableAudioTracks();

        const audioAdaptations = manifestInfos.periods[0].adaptations.audio;
        expect(audioTracks.length).to.equal(
          audioAdaptations ? audioAdaptations.length : 0,
        );

        if (audioAdaptations) {
          for (let i = 0; i < audioAdaptations.length; i++) {
            const adaptation = audioAdaptations[i];

            for (let j = 0; j < audioTracks.length; j++) {
              let found = false;
              const audioTrack = audioTracks[j];
              if (audioTrack.id === adaptation.id) {
                found = true;
                expect(audioTrack.language).to.equal(adaptation.language || "");
                expect(audioTrack.normalized).to.equal(
                  adaptation.normalizedLanguage || "",
                );
                expect(audioTrack.audioDescription).to.equal(
                  !!adaptation.isAudioDescription,
                );

                const activeAudioTrack = player.getAudioTrack();
                expect(audioTrack.active).to.equal(
                  activeAudioTrack ? activeAudioTrack.id === audioTrack.id : false,
                );
              }
              expect(found).to.equal(true);
            }
          }
        }
      });
    });
  });

  describe("getAvailableTextTracks", () => {
    it("should list the right text languages", async function () {
      let manifestLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(manifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = () => {
        // Do nothing here
      };
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        manifestLoader,
        segmentLoader,
      });
      expect(player.getAvailableTextTracks()).to.eql([]);

      await sleep(1);
      expect(manifestLoaderCalledTimes).to.equal(1);
      await checkAfterSleepWithBackoff(null, () => {
        const textTracks = player.getAvailableTextTracks();

        const textAdaptations = manifestInfos.periods[0].adaptations.text;
        expect(textTracks.length).to.equal(textAdaptations ? textAdaptations.length : 0);

        if (textAdaptations) {
          for (let i = 0; i < textAdaptations.length; i++) {
            const adaptation = textAdaptations[i];

            for (let j = 0; j < textTracks.length; j++) {
              let found = false;
              const textTrack = textTracks[j];
              if (textTrack.id === adaptation.id) {
                found = true;
                expect(textTrack.language).to.equal(adaptation.language || "");
                expect(textTrack.normalized).to.equal(
                  adaptation.normalizedLanguage || "",
                );
                expect(textTrack.closedCaption).to.equal(!!adaptation.isClosedCaption);

                const activeTextTrack = player.getTextTrack();
                expect(textTrack.active).to.equal(
                  activeTextTrack ? activeTextTrack.id === textTrack.id : false,
                );
              }
              expect(found).to.equal(true);
            }
          }
        }
      });
    });
  });

  describe("getAvailableVideoTracks", () => {
    it("should list the right video tracks", async function () {
      let manifestLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(manifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = () => {
        // Do nothing here
      };
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        manifestLoader,
        segmentLoader,
      });
      expect(player.getAvailableVideoTracks()).to.eql([]);

      expect(player.getAvailableVideoTracks()).to.eql([]);
      expect(manifestLoaderCalledTimes).to.equal(1);
      await checkAfterSleepWithBackoff(null, () => {
        const videoTracks = player.getAvailableVideoTracks();

        const videoAdaptations = manifestInfos.periods[0].adaptations.video;
        expect(videoTracks.length).to.equal(
          videoAdaptations ? videoAdaptations.length : 0,
        );

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
                  const reprTrack = videoTrack.representations[representationIndex];
                  const representation = adaptation.representations.find(
                    ({ id }) => id === reprTrack.id,
                  );
                  expect(reprTrack.bitrate).to.equal(representation.bitrate);
                  expect(reprTrack.frameRate).to.equal(representation.frameRate);
                  expect(reprTrack.width).to.equal(representation.width);
                  expect(reprTrack.height).to.equal(representation.height);
                }

                const activeVideoTrack = player.getVideoTrack();
                expect(videoTrack.active).to.equal(
                  activeVideoTrack ? activeVideoTrack.id === videoTrack.id : false,
                );
              }
              expect(found).to.equal(true);
            }
          }
        }
      });
    });
  });

  describe("getMinimumPosition", () => {
    it("should return the last position minus the TimeShift window", async () => {
      let manifestLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(manifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = () => {
        // Do nothing here
      };
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        manifestLoader,
        segmentLoader,
      });

      expect(manifestLoaderCalledTimes).to.equal(1);
      await checkAfterSleepWithBackoff(null, () => {
        expect(player.getMinimumPosition()).to.be.closeTo(1527507768, 1);
      });
    });
  });

  describe("getMaximumPosition", () => {
    it("should return the last playable position", async () => {
      let manifestLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(manifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = () => {
        // Do nothing here
      };
      player.loadVideo({
        url: manifestInfos.url,
        transport: manifestInfos.transport,
        manifestLoader,
        segmentLoader,
      });

      expect(manifestLoaderCalledTimes).to.equal(1);
      await checkAfterSleepWithBackoff(null, () => {
        expect(player.getMaximumPosition()).to.be.closeTo(1527508062, 1);
      });
    });
  });
});

describe("DASH live content with no timeShiftBufferDepth (SegmentTimeline)", function () {
  let player;

  beforeEach(() => {
    player = new RxPlayer();
  });

  afterEach(() => {
    player.dispose();
  });

  it("should fetch and parse the Manifest", async function () {
    let manifestLoaderCalledTimes = 0;
    let segmentLoaderLoaderCalledTimes = 0;
    const manifestLoader = (man, callbacks) => {
      expect(noTimeShiftBufferDepthManifestInfos.url).to.equal(man.url);
      manifestLoaderCalledTimes++;
      callbacks.fallback();
    };
    const segmentLoader = () => {
      segmentLoaderLoaderCalledTimes++;
    };
    player.loadVideo({
      url: noTimeShiftBufferDepthManifestInfos.url,
      transport: noTimeShiftBufferDepthManifestInfos.transport,
      manifestLoader,
      segmentLoader,
    });

    await sleep(1);
    expect(manifestLoaderCalledTimes).to.equal(1);
    await checkAfterSleepWithBackoff(null, () => {
      expect(player.getPlayerState()).to.equal("LOADING");

      expect(player.isLive()).to.equal(true);
      expect(player.getContentUrls()).to.eql([noTimeShiftBufferDepthManifestInfos.url]);
      expect(segmentLoaderLoaderCalledTimes).to.be.at.least(2);
    });
  });

  describe("getAvailableAudioTracks", () => {
    it("should list the right audio languages", async function () {
      let manifestLoaderCalledTimes = 0;
      let segmentLoaderLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(noTimeShiftBufferDepthManifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = () => {
        segmentLoaderLoaderCalledTimes++;
      };
      player.loadVideo({
        url: noTimeShiftBufferDepthManifestInfos.url,
        transport: noTimeShiftBufferDepthManifestInfos.transport,
        manifestLoader,
        segmentLoader,
      });
      expect(player.getAvailableAudioTracks()).to.eql([]);

      expect(manifestLoaderCalledTimes).to.equal(1);
      await checkAfterSleepWithBackoff(null, () => {
        const audioTracks = player.getAvailableAudioTracks();

        const audioAdaptations = manifestInfos.periods[0].adaptations.audio;
        expect(audioTracks.length).to.equal(
          audioAdaptations ? audioAdaptations.length : 0,
        );

        if (audioAdaptations) {
          for (let i = 0; i < audioAdaptations.length; i++) {
            const adaptation = audioAdaptations[i];

            for (let j = 0; j < audioTracks.length; j++) {
              let found = false;
              const audioTrack = audioTracks[j];
              if (audioTrack.id === adaptation.id) {
                found = true;
                expect(audioTrack.language).to.equal(adaptation.language || "");
                expect(audioTrack.normalized).to.equal(
                  adaptation.normalizedLanguage || "",
                );
                expect(audioTrack.audioDescription).to.equal(
                  !!adaptation.isAudioDescription,
                );

                const activeAudioTrack = player.getAudioTrack();
                expect(audioTrack.active).to.equal(
                  activeAudioTrack ? activeAudioTrack.id === audioTrack.id : false,
                );
              }
              expect(found).to.equal(true);
            }
          }
        }
        expect(segmentLoaderLoaderCalledTimes).to.be.at.least(2);
      });
    });
  });

  describe("getAvailableTextTracks", () => {
    it("should list the right text languages", async function () {
      let manifestLoaderCalledTimes = 0;
      let segmentLoaderLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(noTimeShiftBufferDepthManifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = () => {
        segmentLoaderLoaderCalledTimes++;
      };
      player.loadVideo({
        url: noTimeShiftBufferDepthManifestInfos.url,
        transport: noTimeShiftBufferDepthManifestInfos.transport,
        manifestLoader,
        segmentLoader,
      });
      expect(player.getAvailableTextTracks()).to.eql([]);

      expect(player.getAvailableTextTracks()).to.eql([]);
      expect(manifestLoaderCalledTimes).to.equal(1);

      await checkAfterSleepWithBackoff(null, () => {
        const textTracks = player.getAvailableTextTracks();

        const textAdaptations = manifestInfos.periods[0].adaptations.text;
        expect(textTracks.length).to.equal(textAdaptations ? textAdaptations.length : 0);

        if (textAdaptations) {
          for (let i = 0; i < textAdaptations.length; i++) {
            const adaptation = textAdaptations[i];

            for (let j = 0; j < textTracks.length; j++) {
              let found = false;
              const textTrack = textTracks[j];
              if (textTrack.id === adaptation.id) {
                found = true;
                expect(textTrack.language).to.equal(adaptation.language || "");
                expect(textTrack.normalized).to.equal(
                  adaptation.normalizedLanguage || "",
                );
                expect(textTrack.closedCaption).to.equal(!!adaptation.isClosedCaption);

                const activeTextTrack = player.getTextTrack();
                expect(textTrack.active).to.equal(
                  activeTextTrack ? activeTextTrack.id === textTrack.id : false,
                );
              }
              expect(found).to.equal(true);
            }
          }
        }
        expect(segmentLoaderLoaderCalledTimes).to.be.at.least(2);
      });
    });
  });

  describe("getAvailableVideoTracks", () => {
    it("should list the right video tracks", async function () {
      let manifestLoaderCalledTimes = 0;
      let segmentLoaderLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(noTimeShiftBufferDepthManifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = () => {
        segmentLoaderLoaderCalledTimes++;
      };
      player.loadVideo({
        url: noTimeShiftBufferDepthManifestInfos.url,
        transport: noTimeShiftBufferDepthManifestInfos.transport,
        manifestLoader,
        segmentLoader,
      });
      expect(player.getAvailableVideoTracks()).to.eql([]);

      expect(player.getAvailableVideoTracks()).to.eql([]);
      expect(manifestLoaderCalledTimes).to.equal(1);
      await checkAfterSleepWithBackoff(null, () => {
        const videoTracks = player.getAvailableVideoTracks();

        const videoAdaptations = manifestInfos.periods[0].adaptations.video;
        expect(videoTracks.length).to.equal(
          videoAdaptations ? videoAdaptations.length : 0,
        );

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
                  const reprTrack = videoTrack.representations[representationIndex];
                  const representation = adaptation.representations.find(
                    ({ id }) => id === reprTrack.id,
                  );
                  expect(reprTrack.bitrate).to.equal(representation.bitrate);
                  expect(reprTrack.frameRate).to.equal(representation.frameRate);
                  expect(reprTrack.width).to.equal(representation.width);
                  expect(reprTrack.height).to.equal(representation.height);
                }

                const activeVideoTrack = player.getVideoTrack();
                expect(videoTrack.active).to.equal(
                  activeVideoTrack ? activeVideoTrack.id === videoTrack.id : false,
                );
              }
              expect(found).to.equal(true);
            }
          }
        }
        expect(segmentLoaderLoaderCalledTimes).to.be.at.least(2);
      });
    });
  });

  describe("getMinimumPosition", () => {
    it("should return the time of the first segment declared", async () => {
      let manifestLoaderCalledTimes = 0;
      let segmentLoaderLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(noTimeShiftBufferDepthManifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = () => {
        segmentLoaderLoaderCalledTimes++;
      };
      player.loadVideo({
        url: noTimeShiftBufferDepthManifestInfos.url,
        transport: noTimeShiftBufferDepthManifestInfos.transport,
        manifestLoader,
        segmentLoader,
      });

      expect(manifestLoaderCalledTimes).to.equal(1);
      await checkAfterSleepWithBackoff(null, () => {
        expect(player.getMinimumPosition()).to.equal(6);
        expect(segmentLoaderLoaderCalledTimes).to.be.at.least(2);
      });
    });
  });

  describe("getMaximumPosition", () => {
    it("should return the last playable position", async () => {
      let manifestLoaderCalledTimes = 0;
      let segmentLoaderLoaderCalledTimes = 0;
      const manifestLoader = (man, callbacks) => {
        expect(noTimeShiftBufferDepthManifestInfos.url).to.equal(man.url);
        manifestLoaderCalledTimes++;
        callbacks.fallback();
      };
      const segmentLoader = () => {
        segmentLoaderLoaderCalledTimes++;
      };
      player.loadVideo({
        url: noTimeShiftBufferDepthManifestInfos.url,
        transport: noTimeShiftBufferDepthManifestInfos.transport,
        manifestLoader,
        segmentLoader,
      });

      expect(manifestLoaderCalledTimes).to.equal(1);
      await checkAfterSleepWithBackoff(null, () => {
        expect(player.getMaximumPosition()).to.be.closeTo(1527508062, 1);
        expect(segmentLoaderLoaderCalledTimes).to.be.at.least(2);
      });
    });
  });
});
