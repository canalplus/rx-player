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
    it("should expose static ErrorTypes property", () => {
      expect(typeof RxPlayer.ErrorTypes).to.equal("object");
    });

    it("should expose static ErrorCodes property", () => {
      expect(typeof RxPlayer.ErrorTypes).to.equal("object");
    });
  });

  describe("initial state", () => {
    const player = new RxPlayer();

    after(() => player.dispose());

    it("should have no error by default", () => {
      expect(player.getError()).to.equal(null);
    });

    it("should return null in getManifest by default", () => {
      expect(player.getManifest()).to.equal(null);
    });

    it("should return null in getCurrentAdaptations by default", () => {
      expect(player.getCurrentAdaptations()).to.equal(null);
    });

    it("should return null in getCurrentRepresentations by default", () => {
      expect(player.getCurrentRepresentations()).to.equal(null);
    });

    it("should return null in getNativeTextTrack by default", () => {
      expect(player.getNativeTextTrack()).to.equal(null);
    });

    it("should return \"STOPPED\" in getPlayerState by default", () => {
      expect(player.getPlayerState()).to.equal("STOPPED");
    });

    it("should return false in isLive by default", () => {
      expect(player.isLive()).to.equal(false);
    });

    it("should return undefined in getUrl by default", () => {
      expect(player.getUrl()).to.equal(undefined);
    });

    it("should return the video element initial duration in getVideoDuration by default", () => {

      // ! HAHA ! NaN is not === to NaN
      expect(player.getVideoDuration()).to.eql(player.getVideoElement().duration);
    });

    it("should return Infinity in getVideoBufferGap by default", () => {
      expect(player.getVideoBufferGap()).to.equal(Infinity);
    });

    it("should return 0 in getVideoLoadedTime by default", () => {
      expect(player.getVideoLoadedTime()).to.equal(0);
    });

    it("should return 0 in getVideoPlayedTime by default", () => {
      expect(player.getVideoPlayedTime()).to.equal(0);
    });

    it("should return 0 in getWallClockTime by default", () => {
      expect(player.getWallClockTime()).to.equal(0);
    });

    it("should return 0 in getPosition by default", () => {
      expect(player.getPosition()).to.equal(0);
    });

    it("should return 1 in getPlaybackRate by default", () => {
      expect(player.getPlaybackRate()).to.equal(1);
    });

    it("should return 1 in getVolume by default", () => {
      expect(player.getVolume()).to.equal(1);
    });

    it("should return false in isFullscreen by default", () => {
      expect(player.isFullscreen()).to.equal(false);
    });

    it("should return [] in getAvailableVideoBitrates by default", () => {
      expect(player.getAvailableVideoBitrates()).to.eql([]);
    });

    it("should return [] in getAvailableAudioBitrates by default", () => {
      expect(player.getAvailableAudioBitrates()).to.eql([]);
    });

    it("should return undefined in getVideoBitrate by default", () => {
      expect(player.getVideoBitrate()).to.equal(undefined);
    });

    it("should return undefined in getAudioBitrate by default", () => {
      expect(player.getVideoBitrate()).to.equal(undefined);
    });

    it("should return Infinity in getMaxVideoBitrate by default", () => {
      expect(player.getMaxVideoBitrate()).to.equal(Infinity);
    });

    it("should return Infinity in getMaxAudioBitrate by default", () => {
      expect(player.getMaxAudioBitrate()).to.equal(Infinity);
    });

    it("should return 30 in getWantedBufferAhead by default", () => {
      expect(player.getWantedBufferAhead()).to.equal(30);
    });

    it("should return Infinity in getMaxBufferBehind by default", () => {
      expect(player.getMaxBufferBehind()).to.equal(Infinity);
    });

    it("should return Infinity in getMaxBufferAhead by default", () => {
      expect(player.getMaxBufferAhead()).to.equal(Infinity);
    });

    it("should allow play by default", () => {
      expect(player.play()).to.equal(undefined);
    });

    it("should allow to pause and play by default", () => {
      expect(player.play()).to.equal(undefined);
      expect(player.pause()).to.equal(undefined);
      expect(player.getVideoElement().paused).to.equal(true);
      expect(player.play()).to.equal(undefined);
      expect(player.getVideoElement().paused).to.equal(false);
    });

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

    it("should throw in goToStart by default", () => {
      expect(() => player.goToStart()).to.throw();
    });

    it("should throw in seekTo by default", () => {
      expect(() => player.seekTo()).to.throw();
      expect(() => player.seekTo(54)).to.throw();
      expect(() => player.seekTo({ relative: 5 })).to.throw();
      expect(() => player.seekTo({ position: 5 })).to.throw();
      expect(() => player.seekTo({ wallClockTime: 5 })).to.throw();
    });

    it("should allow exitFullscreen by default", () => {
      expect(player.exitFullscreen()).to.equal(undefined);
    });

    it("should allow setFullscreen by default", () => {
      expect(player.setFullscreen()).to.equal(undefined);

      // TODO remove for v3.0.0
      expect(player.setFullscreen(false)).to.equal(undefined);
    });

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
      player.unMute();
    });

    it("should unmute the volume at the previous value in unMute by default", () => {
      // back to a "normal" state.
      player.unMute();
      const videoElement = player.getVideoElement();
      if (videoElement.muted) {
        videoElement.muted = false;
      }
      player.setVolume(1);

      player.setVolume(0.8);
      expect(player.getVolume()).to.equal(0.8);
      expect(videoElement.volume).to.equal(0.8);

      player.mute();
      expect(player.getVolume()).to.equal(0);
      expect(videoElement.volume).to.equal(0);

      player.unMute();
      expect(player.getVolume()).to.equal(0.8);
      expect(videoElement.volume).to.equal(0.8);
    });

    it("should have a -1 manual audio bitrate by default", () => {
      expect(player.getManualAudioBitrate()).to.equal(-1);
    });

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

    it("should update the maximum video bitrate when calling setMaxVideoBitrate by default", () => {
      const oldMax = player.getManualVideoBitrate();

      expect(player.setMaxVideoBitrate(Infinity)).to.equal(undefined);
      expect(player.getMaxVideoBitrate()).to.equal(Infinity);

      expect(player.setMaxVideoBitrate(500)).to.equal(undefined);
      expect(player.getMaxVideoBitrate()).to.equal(500);

      expect(player.setMaxVideoBitrate(3)).to.equal(undefined);
      expect(player.getMaxVideoBitrate()).to.equal(3);

      expect(player.setMaxVideoBitrate(Infinity)).to.equal(undefined);
      expect(player.getMaxVideoBitrate()).to.equal(Infinity);

      expect(player.setMaxVideoBitrate(oldMax)).to.equal(undefined);
      expect(player.getMaxVideoBitrate()).to.equal(oldMax);
    });

    it("should update the maximum audio bitrate when calling setMaxAudioBitrate by default", () => {
      const oldMax = player.getManualAudioBitrate();

      expect(player.setMaxAudioBitrate(Infinity)).to.equal(undefined);
      expect(player.getMaxAudioBitrate()).to.equal(Infinity);

      expect(player.setMaxAudioBitrate(500)).to.equal(undefined);
      expect(player.getMaxAudioBitrate()).to.equal(500);

      expect(player.setMaxAudioBitrate(3)).to.equal(undefined);
      expect(player.getMaxAudioBitrate()).to.equal(3);

      expect(player.setMaxAudioBitrate(Infinity)).to.equal(undefined);
      expect(player.getMaxAudioBitrate()).to.equal(Infinity);

      expect(player.setMaxAudioBitrate(oldMax)).to.equal(undefined);
      expect(player.getMaxAudioBitrate()).to.equal(oldMax);
    });

    it("should update the max buffer behind through setMaxBufferBehind by default", () => {
      expect(player.setMaxBufferBehind(50)).to.equal(undefined);
      expect(player.getMaxBufferBehind()).to.equal(50);

      expect(player.setMaxBufferBehind(Infinity)).to.equal(undefined);
      expect(player.getMaxBufferBehind()).to.equal(Infinity);
    });

    it("should update the max buffer behind through setMaxBufferAhead by default", () => {
      expect(player.setMaxBufferAhead(50)).to.equal(undefined);
      expect(player.getMaxBufferAhead()).to.equal(50);

      expect(player.setMaxBufferAhead(Infinity)).to.equal(undefined);
      expect(player.getMaxBufferAhead()).to.equal(Infinity);
    });

    it("should update the buffer goal through setWantedBufferAhead by default", () => {
      expect(player.setWantedBufferAhead(50)).to.equal(undefined);
      expect(player.getWantedBufferAhead()).to.equal(50);

      expect(player.setWantedBufferAhead(Infinity)).to.equal(undefined);
      expect(player.getWantedBufferAhead()).to.equal(Infinity);
    });

    it("should return null through getAvailableAudioTracks by default", () => {
      expect(player.getAvailableAudioTracks()).to.equal(null);
    });

    it("should return null through getAvailableTextTracks by default", () => {
      expect(player.getAvailableTextTracks()).to.equal(null);
    });

    it("should return undefined through getAudioTrack by default", () => {
      expect(player.getAudioTrack()).to.equal(undefined);
    });

    it("should return undefined through getTextTrack by default", () => {
      expect(player.getTextTrack()).to.equal(undefined);
    });

    it("should throw in setTextTrack by default", () => {
      expect(() => player.setTextTrack()).to.throw();
      expect(() => player.setTextTrack("test")).to.throw();
    });

    it("should throw in setAudioTrack by default", () => {
      expect(() => player.setAudioTrack()).to.throw();
      expect(() => player.setAudioTrack("test")).to.throw();
    });

    it("should disable text tracks in disableTextTrack by default", () => {
      expect(player.disableTextTrack()).to.equal(undefined);
      expect(player.getTextTrack()).to.equal(undefined);
    });

    it("should return null in getImageTrackData by default", () => {
      expect(player.getImageTrackData()).to.equal(null);
    });

    it("should return null in getMinimumPosition by default", () => {
      expect(player.getMinimumPosition()).to.equal(null);
    });

    it("should return null in getMaximumPosition by default", () => {
      expect(player.getMinimumPosition()).to.equal(null);
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
});
