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
      const videoElement = player.getVideoElement();
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

    describe("getContentUrls", () => {
      it("should return undefined in getContentUrls by default", () => {
        expect(player.getContentUrls()).to.equal(undefined);
      });
    });

    describe("getMediaDuration", () => {
      it("should return the video element initial duration in getMediaDuration by default", () => {

        // ! HAHA ! NaN is not === to NaN
        expect(player.getMediaDuration()).to.eql(
          player.getVideoElement().duration
        );
      });
    });

    describe("getCurrentBufferGap", () => {
      it("should return 0 in getCurrentBufferGap by default", () => {
        expect(player.getCurrentBufferGap()).to.equal(0);
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

    describe("getVideoRepresentation", () => {
      it("should return undefined in getVideoRepresentation by default", () => {
        expect(player.getVideoRepresentation()).to.equal(undefined);
      });
    });

    describe("getAudioRepresentation", () => {
      it("should return undefined in getAudioRepresentation by default", () => {
        expect(player.getAudioRepresentation()).to.equal(undefined);
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
        expect(player.getVideoElement().volume).to.equal(0.5);

        expect(player.setVolume(1)).to.equal(undefined);
        expect(player.getVolume()).to.equal(1);
        expect(player.getVideoElement().volume).to.equal(1);
      });
    });

    describe("mute/unMute/isMute", () => {
      it("should set the volume to 0 in mute by default", () => {
        const videoElement = player.getVideoElement();
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
        const videoElement = player.getVideoElement();
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
