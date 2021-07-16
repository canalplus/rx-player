import { expect } from "chai";
import RxPlayer from "../../../src";

/**
 * Test every player at an initial, idle state.
 *
 * Breaking a test here will means with an high confidence that the API contract
 * is broken.
 */

describe("initial idle state", () => {
  describe("constructor", () => {
    it("should create a video element if no videoElement option is given", () => {
      const player = new RxPlayer();
      const videoElement = player.getMediaElement();
      expect(videoElement).to.exist;
      player.dispose();
    });

    it("should use the video element given as videoElement", () => {
      const videoElement = document.createElement("VIDEO");
      document.body.appendChild(videoElement);
      const player = new RxPlayer({
        videoElement,
      });
      expect(videoElement instanceof HTMLMediaElement).to.equal(true);
      player.dispose();
    });
  });

  describe("static members", () => {
    describe("ErrorTypes", () => {
      it("should expose static ErrorTypes property", () => {
        expect(typeof RxPlayer.ErrorTypes).to.equal("object");
      });
    });

    describe("ErrorCodes", () => {
      it("should expose static ErrorCodes property", () => {
        expect(typeof RxPlayer.ErrorTypes).to.equal("object");
      });
    });
  });

  describe("initial state", () => {
    const player = new RxPlayer();

    after(() => player.dispose());

    describe("getError", () => {
      it("should have no error by default", () => {
        expect(player.getError()).to.equal(null);
      });
    });

    describe("getPlayerState", () => {
      it("should return \"STOPPED\" in getPlayerState by default", () => {
        expect(player.getPlayerState()).to.equal("STOPPED");
      });
    });

    describe("isLive", () => {
      it("should return false in isLive by default", () => {
        expect(player.isLive()).to.equal(false);
      });
    });

    describe("getUrl", () => {
      it("should return undefined in getUrl by default", () => {
        expect(player.getUrl()).to.equal(undefined);
      });
    });

    describe("getVideoDuration", () => {
      it("should return the video element initial duration in getVideoDuration by default", () => {

        // ! HAHA ! NaN is not === to NaN
        expect(player.getVideoDuration()).to.eql(
          player.getMediaElement().duration
        );
      });
    });

    describe("getVideoBufferGap", () => {
      it("should return Infinity in getVideoBufferGap by default", () => {
        expect(player.getVideoBufferGap()).to.equal(Infinity);
      });
    });

    describe("getWallClockTime", () => {
      it("should return 0 in getWallClockTime by default", () => {
        expect(player.getWallClockTime()).to.equal(0);
      });
    });

    describe("getPosition", () => {
      it("should return 0 in getPosition by default", () => {
        expect(player.getPosition()).to.equal(0);
      });
    });

    describe("getPlaybackRate", () => {
      it("should return 1 in getPlaybackRate by default", () => {
        expect(player.getPlaybackRate()).to.equal(1);
      });
    });

    describe("getVolume", () => {
      it("should return 1 in getVolume by default", () => {
        expect(player.getVolume()).to.equal(1);
      });
    });

    describe("getAvailableVideoBitrates", () => {
      it("should return [] in getAvailableVideoBitrates by default", () => {
        expect(player.getAvailableVideoBitrates()).to.eql([]);
      });
    });

    describe("getAvailableAudioBitrates", () => {
      it("should return [] in getAvailableAudioBitrates by default", () => {
        expect(player.getAvailableAudioBitrates()).to.eql([]);
      });
    });

    describe("getVideoBitrate", () => {
      it("should return undefined in getVideoBitrate by default", () => {
        expect(player.getVideoBitrate()).to.equal(undefined);
      });
    });

    describe("getAudioBitrate", () => {
      it("should return undefined in getAudioBitrate by default", () => {
        expect(player.getVideoBitrate()).to.equal(undefined);
      });
    });

    describe("getMaxVideoBitrate", () => {
      it("should return Infinity in getMaxVideoBitrate by default", () => {
        expect(player.getMaxVideoBitrate()).to.equal(Infinity);
      });
    });

    describe("getMaxAudioBitrate", () => {
      it("should return Infinity in getMaxAudioBitrate by default", () => {
        expect(player.getMaxAudioBitrate()).to.equal(Infinity);
      });
    });

    describe("getWantedBufferAhead", () => {
      it("should return 30 in getWantedBufferAhead by default", () => {
        expect(player.getWantedBufferAhead()).to.equal(30);
      });
    });

    describe("getMaxBufferBehind", () => {
      it("should return Infinity in getMaxBufferBehind by default", () => {
        expect(player.getMaxBufferBehind()).to.equal(Infinity);
      });
    });

    describe("getMaxBufferAhead", () => {
      it("should return Infinity in getMaxBufferAhead by default", () => {
        expect(player.getMaxBufferAhead()).to.equal(Infinity);
      });
    });

    describe("getPlaybackRate/setPlaybackRate", () => {
      it("should allow to change the playback rate through setPlaybackRate", () => {
        expect(player.setPlaybackRate(4)).to.equal(undefined);
        expect(player.getPlaybackRate()).to.equal(4);

        expect(player.setPlaybackRate(3)).to.equal(undefined);
        expect(player.getPlaybackRate()).to.equal(3);

        expect(player.setPlaybackRate(2)).to.equal(undefined);
        expect(player.getPlaybackRate()).to.equal(2);

        expect(player.setPlaybackRate(1.5)).to.equal(undefined);
        expect(player.getPlaybackRate()).to.equal(1.5);

        expect(player.setPlaybackRate(0.7)).to.equal(undefined);
        expect(player.getPlaybackRate()).to.equal(0.7);

        expect(player.setPlaybackRate(1)).to.equal(undefined);
        expect(player.getPlaybackRate()).to.equal(1);
      });
    });

    describe("seekTo", () => {
      it("should throw in seekTo by default", () => {
        expect(() => player.seekTo()).to.throw();
        expect(() => player.seekTo(54)).to.throw();
        expect(() => player.seekTo({ relative: 5 })).to.throw();
        expect(() => player.seekTo({ position: 5 })).to.throw();
        expect(() => player.seekTo({ wallClockTime: 5 })).to.throw();
      });
    });

    describe("getVolume/setVolume", () => {
      it("should throw in setVolume by default if no volume has been given", () => {
        expect(() => player.setVolume()).to.throw();
      });

      it("should set the volume in setVolume by default if a volume has been given", () => {
        expect(player.setVolume(1)).to.equal(undefined);
        expect(player.setVolume(0.5)).to.equal(undefined);
        expect(player.getVolume()).to.equal(0.5);
        expect(player.getMediaElement().volume).to.equal(0.5);

        expect(player.setVolume(1)).to.equal(undefined);
        expect(player.getVolume()).to.equal(1);
        expect(player.getMediaElement().volume).to.equal(1);
      });
    });

    describe("mute/unMute/isMute", () => {
      it("should set the volume to 0 in mute by default", () => {
        const videoElement = player.getMediaElement();
        if (videoElement.muted) {
          videoElement.muted = false;
        }
        player.setVolume(1);

        expect(player.mute()).to.equal(undefined);
        expect(player.getVolume()).to.equal(0);
        expect(videoElement.volume).to.equal(0);
        expect(videoElement.muted).to.equal(false);
        expect(player.isMute()).to.equal(true);
        player.unMute();
        expect(player.isMute()).to.equal(false);
      });

      it("should unmute the volume at the previous value in unMute by default", () => {
        // back to a "normal" state.
        player.unMute();
        const videoElement = player.getMediaElement();
        if (videoElement.muted) {
          videoElement.muted = false;
        }
        expect(player.isMute()).to.equal(false);
        player.setVolume(1);

        player.setVolume(0.8);
        expect(player.getVolume()).to.equal(0.8);
        expect(videoElement.volume).to.equal(0.8);

        player.mute();
        expect(player.isMute()).to.equal(true);
        expect(player.getVolume()).to.equal(0);
        expect(videoElement.volume).to.equal(0);

        player.unMute();
        expect(player.isMute()).to.equal(false);
        expect(player.getVolume()).to.equal(0.8);
        expect(videoElement.volume).to.equal(0.8);
      });

      it("should return false in isMute by default", () => {
        expect(player.isMute()).to.equal(false);
      });

      it("should return true in isMute if the volume is equal to 0", () => {
        const oldVolume = player.getVolume();

        expect(player.isMute()).to.equal(false);

        player.setVolume(0);
        expect(player.isMute()).to.equal(true);
        player.setVolume(oldVolume);
        expect(player.isMute()).to.equal(false);

        player.mute();
        expect(player.isMute()).to.equal(true);
        player.unMute();
        expect(player.isMute()).to.equal(false);

        player.mute();
        expect(player.isMute()).to.equal(true);
        player.setVolume(oldVolume);
        expect(player.isMute()).to.equal(false);
        player.unMute();
        expect(player.isMute()).to.equal(false);

        player.setVolume(oldVolume);
      });
    });

    describe("setMinAudioBitrate/getMinAudioBitrate", () => {
      const defaultMin = player.getMinAudioBitrate();
      const defaultMax = player.getMaxAudioBitrate();

      beforeEach(() => {
        player.setMinAudioBitrate(defaultMin);
        player.setMaxAudioBitrate(defaultMax);
      });

      it("should have a 0 minimum audio bitrate by default", () => {
        expect(player.getMinAudioBitrate()).to.equal(0);
      });

      it("should update minimum audio bitrate when calling setMinAudioBitrate", () => {
        player.setMinAudioBitrate(84);
        expect(player.getMinAudioBitrate()).to.equal(84);

        player.setMinAudioBitrate(-1);
        expect(player.getMinAudioBitrate()).to.equal(-1);

        player.setMinAudioBitrate(0);
        expect(player.getMinAudioBitrate()).to.equal(0);

        player.setMinAudioBitrate(defaultMin);
        expect(player.getMinAudioBitrate()).to.equal(defaultMin);
      });

      it("should throw when setting a min audio bitrate superior to the max audio bitrate", () => {
        let err;

        try {
          player.setMaxAudioBitrate(9);
          player.setMinAudioBitrate(1000);
        } catch (e) {
          err = e;
        }

        expect(player.getMinAudioBitrate()).to.equal(defaultMin);
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to
          .equal("Invalid minimum audio bitrate given. Its value, \"1000\" is superior the current maximum audio birate, \"9\".");
      });

      it("should allow setting different or equal max and min audio bitrate in that order", () => {
        player.setMaxAudioBitrate(84);
        player.setMinAudioBitrate(84);
        expect(player.getMinAudioBitrate()).to.equal(84);

        player.setMinAudioBitrate(-1);
        expect(player.getMinAudioBitrate()).to.equal(-1);

        player.setMinAudioBitrate(0);
        expect(player.getMinAudioBitrate()).to.equal(0);

        player.setMaxVideoBitrate(defaultMax);
        player.setMinAudioBitrate(defaultMin);
        expect(player.getMinAudioBitrate()).to.equal(defaultMin);
      });
    });

    describe("setMinVideoBitrate/getMinVideoBitrate", () => {
      const defaultMin = player.getMinVideoBitrate();
      const defaultMax = player.getMaxVideoBitrate();
      beforeEach(() => {
        player.setMinVideoBitrate(defaultMin);
        player.setMaxVideoBitrate(defaultMax);
      });
      it("should have a 0 minimum video bitrate by default", () => {
        expect(player.getMinVideoBitrate()).to.equal(0);
      });

      it("should update minimum video bitrate when calling setMinVideoBitrate", () => {
        player.setMinVideoBitrate(84);
        expect(player.getMinVideoBitrate()).to.equal(84);

        player.setMinVideoBitrate(-1);
        expect(player.getMinVideoBitrate()).to.equal(-1);

        player.setMinVideoBitrate(0);
        expect(player.getMinVideoBitrate()).to.equal(0);

        player.setMinVideoBitrate(defaultMin);
        expect(player.getMinVideoBitrate()).to.equal(defaultMin);
      });

      it("should throw when setting a min video bitrate superior to the max video bitrate", () => {
        let err;

        try {
          player.setMaxVideoBitrate(9);
          player.setMinVideoBitrate(1000);
        } catch (e) {
          err = e;
        }

        expect(player.getMinVideoBitrate()).to.equal(defaultMin);
        expect(err).to.be.an.instanceOf(Error);
        expect(err.message).to
          .equal("Invalid minimum video bitrate given. Its value, \"1000\" is superior the current maximum video birate, \"9\".");
      });

      it("should allow setting different or equal max and min video bitrate in that order", () => {
        player.setMaxVideoBitrate(84);
        player.setMinVideoBitrate(84);
        expect(player.getMinVideoBitrate()).to.equal(84);

        player.setMinVideoBitrate(-1);
        expect(player.getMinVideoBitrate()).to.equal(-1);

        player.setMinVideoBitrate(0);
        expect(player.getMinVideoBitrate()).to.equal(0);

        player.setMaxVideoBitrate(defaultMax);
        player.setMinVideoBitrate(defaultMin);
        expect(player.getMinVideoBitrate()).to.equal(defaultMin);
      });
    });

    describe("setMaxAudioBitrate/getMaxAudioBitrate", () => {
      const defaultMin = player.getMinAudioBitrate();
      const defaultMax = player.getMaxAudioBitrate();
      beforeEach(() => {
        player.setMinAudioBitrate(defaultMin);
        player.setMaxAudioBitrate(defaultMax);
      });
      it("should have a Infinity maximum audio bitrate by default", () => {
        expect(player.getMaxAudioBitrate()).to.equal(Infinity);
      });

      it("should update maximum audio bitrate when calling setMaxAudioBitrate", () => {
        player.setMaxAudioBitrate(84);
        expect(player.getMaxAudioBitrate()).to.equal(84);

        player.setMaxAudioBitrate(0);
        expect(player.getMaxAudioBitrate()).to.equal(0);

        player.setMaxAudioBitrate(defaultMax);
        expect(player.getMaxAudioBitrate()).to.equal(defaultMax);
      });

      it("should throw when setting a max audio bitrate inferior to the min audio bitrate", () => {
        let err1;
        let err2;

        try {
          player.setMaxAudioBitrate(-1);
        } catch (e) {
          err1 = e;
        }

        expect(player.getMaxAudioBitrate()).to.equal(defaultMax);

        try {
          player.setMinAudioBitrate(1000);
          player.setMaxAudioBitrate(9);
        } catch (e) {
          err2 = e;
        }

        expect(player.getMaxAudioBitrate()).to.equal(defaultMax);
        expect(err1).to.be.an.instanceOf(Error);
        expect(err1.message).to
          .equal("Invalid maximum audio bitrate given. Its value, \"-1\" is inferior the current minimum audio birate, \"0\".");
        expect(err2).to.be.an.instanceOf(Error);
        expect(err2.message).to
          .equal("Invalid maximum audio bitrate given. Its value, \"9\" is inferior the current minimum audio birate, \"1000\".");
      });

      it("should allow setting different or equal min and max audio bitrate in that order", () => {
        player.setMinAudioBitrate(84);
        player.setMaxAudioBitrate(84);
        expect(player.getMaxAudioBitrate()).to.equal(84);

        player.setMaxAudioBitrate(Infinity);
        expect(player.getMaxAudioBitrate()).to.equal(Infinity);

        player.setMaxAudioBitrate(100);
        expect(player.getMaxAudioBitrate()).to.equal(100);

        player.setMinAudioBitrate(defaultMin);
        player.setMaxAudioBitrate(defaultMax);
        expect(player.getMaxAudioBitrate()).to.equal(defaultMax);
      });
    });

    describe("setMaxVideoBitrate/getMaxVideoBitrate", () => {
      const defaultMin = player.getMinVideoBitrate();
      const defaultMax = player.getMaxVideoBitrate();
      beforeEach(() => {
        player.setMinVideoBitrate(defaultMin);
        player.setMaxVideoBitrate(defaultMax);
      });
      it("should have a Infinity maximum video bitrate by default", () => {
        expect(player.getMaxVideoBitrate()).to.equal(Infinity);
      });

      it("should update maximum video bitrate when calling setMaxVideoBitrate", () => {

        player.setMaxVideoBitrate(84);
        expect(player.getMaxVideoBitrate()).to.equal(84);

        player.setMaxVideoBitrate(0);
        expect(player.getMaxVideoBitrate()).to.equal(0);

        player.setMaxVideoBitrate(defaultMax);
        expect(player.getMaxVideoBitrate()).to.equal(defaultMax);
      });

      it("should throw when setting a max video bitrate inferior to the min video bitrate", () => {
        let err1;
        let err2;

        try {
          player.setMaxVideoBitrate(-1);
        } catch (e) {
          err1 = e;
        }

        expect(player.getMaxVideoBitrate()).to.equal(defaultMax);

        try {
          player.setMinVideoBitrate(1000);
          player.setMaxVideoBitrate(9);
        } catch (e) {
          err2 = e;
        }

        expect(player.getMaxVideoBitrate()).to.equal(defaultMax);
        expect(err1).to.be.an.instanceOf(Error);
        expect(err1.message).to
          .equal("Invalid maximum video bitrate given. Its value, \"-1\" is inferior the current minimum video birate, \"0\".");
        expect(err2).to.be.an.instanceOf(Error);
        expect(err2.message).to
          .equal("Invalid maximum video bitrate given. Its value, \"9\" is inferior the current minimum video birate, \"1000\".");
      });

      it("should allow setting different or equal min and max video bitrate in that order", () => {
        player.setMinVideoBitrate(84);
        player.setMaxVideoBitrate(84);
        expect(player.getMaxVideoBitrate()).to.equal(84);

        player.setMaxVideoBitrate(Infinity);
        expect(player.getMaxVideoBitrate()).to.equal(Infinity);

        player.setMaxVideoBitrate(100);
        expect(player.getMaxVideoBitrate()).to.equal(100);

        player.setMinVideoBitrate(defaultMin);
        player.setMaxVideoBitrate(defaultMax);
        expect(player.getMaxVideoBitrate()).to.equal(defaultMax);
      });
    });

    describe("setAudioBitrate/getManualAudioBitrate", () => {
      it("should have a -1 manual audio bitrate by default", () => {
        expect(player.getManualAudioBitrate()).to.equal(-1);
      });

      it("should update manual audio bitrate when calling setAudioBitrate", () => {
        const oldManual = player.getManualAudioBitrate();

        player.setAudioBitrate(84);
        expect(player.getManualAudioBitrate()).to.equal(84);
        player.setAudioBitrate(-1);
        expect(player.getManualAudioBitrate()).to.equal(-1);
        player.setAudioBitrate(0);
        expect(player.getManualAudioBitrate()).to.equal(0);

        player.setAudioBitrate(oldManual);
        expect(player.getManualAudioBitrate()).to.equal(oldManual);
      });
    });

    describe("setVideoBitrate/getManualVideoBitrate", () => {
      it("should have a -1 manual video bitrate by default", () => {
        expect(player.getManualVideoBitrate()).to.equal(-1);
      });

      it("should update manual video bitrate when calling setVideoBitrate", () => {
        const oldManual = player.getManualVideoBitrate();

        player.setVideoBitrate(84);
        expect(player.getManualVideoBitrate()).to.equal(84);

        player.setVideoBitrate(-1);
        expect(player.getManualVideoBitrate()).to.equal(-1);

        player.setVideoBitrate(0);
        expect(player.getManualVideoBitrate()).to.equal(0);

        player.setVideoBitrate(oldManual);
        expect(player.getManualVideoBitrate()).to.equal(oldManual);
      });
    });

    describe("getMaxBufferBehind/setMaxBufferBehind", () => {
      it("should update the max buffer behind through setMaxBufferBehind by default", () => {
        expect(player.setMaxBufferBehind(50)).to.equal(undefined);
        expect(player.getMaxBufferBehind()).to.equal(50);

        expect(player.setMaxBufferBehind(Infinity)).to.equal(undefined);
        expect(player.getMaxBufferBehind()).to.equal(Infinity);
      });
    });

    describe("getMaxBufferAhead/setMaxBufferAhead", () => {
      it("should update the max buffer behind through setMaxBufferAhead by default", () => {
        expect(player.setMaxBufferAhead(50)).to.equal(undefined);
        expect(player.getMaxBufferAhead()).to.equal(50);

        expect(player.setMaxBufferAhead(Infinity)).to.equal(undefined);
        expect(player.getMaxBufferAhead()).to.equal(Infinity);
      });
    });

    describe("getWantedBufferAhead/setWantedBufferAhead", () => {
      it("should update the buffer goal through setWantedBufferAhead by default", () => {
        expect(player.setWantedBufferAhead(50)).to.equal(undefined);
        expect(player.getWantedBufferAhead()).to.equal(50);

        expect(player.setWantedBufferAhead(Infinity)).to.equal(undefined);
        expect(player.getWantedBufferAhead()).to.equal(Infinity);
      });
    });

    describe("getAvailableAudioTracks", () => {
      it("should return an empty array through getAvailableAudioTracks by default", () => {
        expect(player.getAvailableAudioTracks()).to.eql([]);
      });
    });

    describe("getAvailableTextTracks", () => {
      it("should return an empty array through getAvailableTextTracks by default", () => {
        expect(player.getAvailableTextTracks()).to.eql([]);
      });
    });

    describe("getAvailableVideoTracks", () => {
      it("should return an empty array through getAvailableVideoTracks by default", () => {
        expect(player.getAvailableVideoTracks()).to.eql([]);
      });
    });

    describe("getAudioTrack", () => {
      it("should return undefined through getAudioTrack by default", () => {
        expect(player.getAudioTrack()).to.equal(undefined);
      });
    });

    describe("getTextTrack", () => {
      it("should return undefined through getTextTrack by default", () => {
        expect(player.getTextTrack()).to.equal(undefined);
      });
    });

    describe("getVideoTrack", () => {
      it("should return undefined through getVideoTrack by default", () => {
        expect(player.getVideoTrack()).to.equal(undefined);
      });
    });

    describe("setAudioTrack", () => {
      it("should throw in setAudioTrack by default", () => {
        expect(() => player.setAudioTrack()).to.throw();
        expect(() => player.setAudioTrack("test")).to.throw();
      });
    });

    describe("setTextTrack", () => {
      it("should throw in setTextTrack by default", () => {
        expect(() => player.setTextTrack()).to.throw();
        expect(() => player.setTextTrack("test")).to.throw();
      });
    });

    describe("setVideoTrack", () => {
      it("should throw in setVideoTrack by default", () => {
        expect(() => player.setVideoTrack()).to.throw();
        expect(() => player.setVideoTrack("test")).to.throw();
      });
    });

    describe("disableTextTrack", () => {
      it("should disable text tracks in disableTextTrack by default", () => {
        expect(player.disableTextTrack()).to.equal(undefined);
        expect(player.getTextTrack()).to.equal(undefined);
      });
    });

    describe("getPreferredAudioTracks", () => {
      it("should return an empty array through getPreferredAudioTracks by default", () => {
        expect(player.getPreferredAudioTracks()).to.eql([]);
      });
    });

    describe("getPreferredTextTracks", () => {
      it("should return an empty array through getPreferredTextTracks by default", () => {
        expect(player.getPreferredTextTracks()).to.eql([]);
      });
    });

    describe("setPreferredAudioTracks", () => {
      it("should allow setting preferred audio tracks by default", () => {
        expect(player.getPreferredAudioTracks()).to.eql([]);
        player.setPreferredAudioTracks(["fr", "en"]);
        expect(player.getPreferredAudioTracks()).to.eql(["fr", "en"]);
        player.setPreferredAudioTracks([
          { language: "it", audioDescription: true },
          { language: "pt", audioDescription: false },
          { language: "pt", audioDescription: true },
        ]);
        expect(player.getPreferredAudioTracks()).to.eql([
          { language: "it", audioDescription: true },
          { language: "pt", audioDescription: false },
          { language: "pt", audioDescription: true },
        ]);
      });
    });

    describe("setPreferredTextTracks", () => {
      it("should return an empty array through getPreferredTextTracks by default", () => {
        expect(player.getPreferredTextTracks()).to.eql([]);
        player.setPreferredTextTracks(["fr", "en"]);
        expect(player.getPreferredTextTracks()).to.eql(["fr", "en"]);
        player.setPreferredTextTracks([
          { language: "it", closedCaption: true },
          { language: "pt", closedCaption: false },
          { language: "pt", closedCaption: true },
        ]);
        expect(player.getPreferredTextTracks()).to.eql([
          { language: "it", closedCaption: true },
          { language: "pt", closedCaption: false },
          { language: "pt", closedCaption: true },
        ]);
      });
    });

    describe("getImageTrackData", () => {
      it("should return null in getImageTrackData by default", () => {
        expect(player.getImageTrackData()).to.equal(null);
      });
    });

    describe("getMinimumPosition", () => {
      it("should return null in getMinimumPosition by default", () => {
        expect(player.getMinimumPosition()).to.equal(null);
      });
    });

    describe("getMaximumPosition", () => {
      it("should return null in getMaximumPosition by default", () => {
        expect(player.getMinimumPosition()).to.equal(null);
      });
    });
  });
});
