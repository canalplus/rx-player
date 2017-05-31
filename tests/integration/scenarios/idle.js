import { expect } from "chai";
import RxPlayer from "../../../src";

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
      expect(videoElement instanceof HTMLVideoElement).to.equal(true);
      player.dispose();
    });
  });

  describe("static members", () => {
    it("should expose static getErrorTypes method", () => {
      expect(typeof RxPlayer.getErrorTypes()).to.equal("object");
    });

    it("should expose static getErrorCodes method", () => {
      expect(typeof RxPlayer.getErrorCodes()).to.equal("object");
    });

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

    it("should throw in isLive by default", () => {
      expect(() => player.isLive()).to.throw();
    });

    it("should throw in getUrl by default", () => {
      expect(() => player.getUrl()).to.throw();
    });

    it("should return the video element initial duration in getVideoDuration by default", () => {

      // ! HAHA ! NaN is not === to NaN
      expect(player.getVideoDuration()).to.eql(player.getVideoElement().duration);
    });

    it("should return 0 in getVideoLoadedTime by default", () => {
      expect(player.getVideoLoadedTime()).to.equal(0);
    });

    it("should return 0 in getVideoPlayedTime by default", () => {
      expect(player.getVideoPlayedTime()).to.equal(0);
    });

    it("should return 0 in getCurrentTime by default", () => {
      expect(player.getCurrentTime()).to.equal(0);
    });

    it("should return 0 in getWallClockTime by default", () => {
      expect(player.getWallClockTime()).to.equal(0);
    });

    it("should return 0 in getPosition by default", () => {
      expect(player.getPosition()).to.equal(0);
    });

    it("should return null in getStartTime by default", () => {
      expect(player.getStartTime()).to.equal(null);
    });

    it("should return null in getEndTime by default", () => {
      expect(player.getEndTime()).to.equal(null);
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

    it("should return [] in getAvailableLanguages by default", () => {
      expect(player.getAvailableLanguages()).to.eql([]);
    });

    it("should return [] in getAvailableSubtitles by default", () => {
      expect(player.getAvailableSubtitles()).to.eql([]);
    });

    it("should return undefined in getLanguage by default", () => {
      expect(player.getLanguage()).to.equal(undefined);
    });

    it("should return undefined in getSubtitle by default", () => {
      expect(player.getSubtitle()).to.equal(undefined);
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

    it("should return Infinity in getVideoMaxBitrate by default", () => {
      expect(player.getVideoMaxBitrate()).to.equal(Infinity);
    });

    it("should return Infinity in getMaxVideoBitrate by default", () => {
      expect(player.getMaxVideoBitrate()).to.equal(Infinity);
    });

    it("should return Infinity in getAudioMaxBitrate by default", () => {
      expect(player.getAudioMaxBitrate()).to.equal(Infinity);
    });

    it("should return Infinity in getMaxAudioBitrate by default", () => {
      expect(player.getMaxAudioBitrate()).to.equal(Infinity);
    });

    it("should return 30 in getVideoBufferSize by default", () => {
      expect(player.getVideoBufferSize()).to.equal(30);
    });

    it("should return 30 in getAudioBufferSize by default", () => {
      expect(player.getAudioBufferSize()).to.equal(30);
    });

    it("should return an object in getAverageBitrates by default", () => {
      const averageBitrates = player.getAverageBitrates();
      expect(typeof averageBitrates.audio).to.equal("object");
      expect(typeof averageBitrates.video).to.equal("object");
    });

    it("should return an object in getMetrics by default", () => {
      expect(typeof player.getMetrics()).to.equal("object");
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
      expect(player.getVideoElement().playbackRate).to.equal(4);

      expect(player.setPlaybackRate(3)).to.equal(undefined);
      expect(player.getPlaybackRate()).to.equal(3);
      expect(player.getVideoElement().playbackRate).to.equal(3);

      expect(player.setPlaybackRate(2)).to.equal(undefined);
      expect(player.getPlaybackRate()).to.equal(2);
      expect(player.getVideoElement().playbackRate).to.equal(2);

      expect(player.setPlaybackRate(1.5)).to.equal(undefined);
      expect(player.getPlaybackRate()).to.equal(1.5);
      expect(player.getVideoElement().playbackRate).to.equal(1.5);

      expect(player.setPlaybackRate(0.7)).to.equal(undefined);
      expect(player.getPlaybackRate()).to.equal(0.7);
      expect(player.getVideoElement().playbackRate).to.equal(0.7);

      expect(player.setPlaybackRate(1)).to.equal(undefined);
      expect(player.getPlaybackRate()).to.equal(1);
      expect(player.getVideoElement().playbackRate).to.equal(1);
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

    // TODO remove for v3.0.0
    it("should return \"\" in normalizeLanguageCode by default", () => {
      expect(player.normalizeLanguageCode()).to.equal("");
    });

    // TODO remove for v3.0.0
    it("should return a \"normalized\" language code in normalizeLanguageCode for the most common codes by default", () => {
      expect(player.normalizeLanguageCode("eng")).to.equal("eng");
      expect(player.normalizeLanguageCode("en")).to.equal("eng");

      expect(player.normalizeLanguageCode("fre")).to.equal("fre");
      expect(player.normalizeLanguageCode("fra")).to.equal("fre");
      expect(player.normalizeLanguageCode("fr")).to.equal("fre");

      expect(player.normalizeLanguageCode("pol")).to.equal("pol");
      expect(player.normalizeLanguageCode("pl")).to.equal("pol");
    });

    it("should return false in isLanguageAvailable by default", () => {
      expect(player.isLanguageAvailable()).to.equal(false);
      expect(player.isLanguageAvailable("eng")).to.equal(false);
    });

    it("should return false in isSubtitleAvailable by default", () => {
      expect(player.isSubtitleAvailable()).to.equal(false);
      expect(player.isSubtitleAvailable("eng")).to.equal(false);
    });

    it("should throw when calling setLanguage by default", () => {
      expect(() => player.setLanguage("fr")).to.throw();
    });

    it("should throw when calling setSubtitle by default", () => {
      expect(() => player.setSubtitle("fr")).to.throw();
    });

    it("should throw when calling setVideoBitrate by default", () => {
      expect(() => player.setVideoBitrate(84)).to.throw();
      expect(() => player.setVideoBitrate(0)).to.throw();
    });

    it("should throw when calling setAudioBitrate by default", () => {
      expect(() => player.setAudioBitrate(84)).to.throw();
      expect(() => player.setAudioBitrate(0)).to.throw();
    });

    it("should update the maximum video bitrate when calling setVideoMaxBitrate by default", () => {
      expect(player.setVideoMaxBitrate(Infinity)).to.equal(undefined);
      expect(player.getVideoMaxBitrate()).to.equal(Infinity);
      expect(player.getMaxVideoBitrate()).to.equal(Infinity);

      expect(player.setVideoMaxBitrate(500)).to.equal(undefined);
      expect(player.getVideoMaxBitrate()).to.equal(500);
      expect(player.getMaxVideoBitrate()).to.equal(500);

      expect(player.setVideoMaxBitrate(3)).to.equal(undefined);
      expect(player.getVideoMaxBitrate()).to.equal(3);
      expect(player.getMaxVideoBitrate()).to.equal(3);

      expect(player.setVideoMaxBitrate(Infinity)).to.equal(undefined);
      expect(player.getVideoMaxBitrate()).to.equal(Infinity);
      expect(player.getMaxVideoBitrate()).to.equal(Infinity);
    });

    it("should update the maximum video bitrate when calling setMaxVideoBitrate by default", () => {
      expect(player.setMaxVideoBitrate(Infinity)).to.equal(undefined);
      expect(player.getVideoMaxBitrate()).to.equal(Infinity);
      expect(player.getMaxVideoBitrate()).to.equal(Infinity);

      expect(player.setMaxVideoBitrate(500)).to.equal(undefined);
      expect(player.getVideoMaxBitrate()).to.equal(500);
      expect(player.getMaxVideoBitrate()).to.equal(500);

      expect(player.setMaxVideoBitrate(3)).to.equal(undefined);
      expect(player.getVideoMaxBitrate()).to.equal(3);
      expect(player.getMaxVideoBitrate()).to.equal(3);

      expect(player.setMaxVideoBitrate(Infinity)).to.equal(undefined);
      expect(player.getVideoMaxBitrate()).to.equal(Infinity);
      expect(player.getMaxVideoBitrate()).to.equal(Infinity);
    });

    it("should update the maximum audio bitrate when calling setAudioMaxBitrate by default", () => {
      expect(player.setAudioMaxBitrate(Infinity)).to.equal(undefined);
      expect(player.getAudioMaxBitrate()).to.equal(Infinity);
      expect(player.getMaxAudioBitrate()).to.equal(Infinity);

      expect(player.setAudioMaxBitrate(500)).to.equal(undefined);
      expect(player.getAudioMaxBitrate()).to.equal(500);
      expect(player.getMaxAudioBitrate()).to.equal(500);

      expect(player.setAudioMaxBitrate(3)).to.equal(undefined);
      expect(player.getAudioMaxBitrate()).to.equal(3);
      expect(player.getMaxAudioBitrate()).to.equal(3);

      expect(player.setAudioMaxBitrate(Infinity)).to.equal(undefined);
      expect(player.getAudioMaxBitrate()).to.equal(Infinity);
      expect(player.getMaxAudioBitrate()).to.equal(Infinity);
    });

    it("should update the maximum audio bitrate when calling setMaxAudioBitrate by default", () => {
      expect(player.setMaxAudioBitrate(Infinity)).to.equal(undefined);
      expect(player.getAudioMaxBitrate()).to.equal(Infinity);
      expect(player.getMaxAudioBitrate()).to.equal(Infinity);

      expect(player.setMaxAudioBitrate(500)).to.equal(undefined);
      expect(player.getAudioMaxBitrate()).to.equal(500);
      expect(player.getMaxAudioBitrate()).to.equal(500);

      expect(player.setMaxAudioBitrate(3)).to.equal(undefined);
      expect(player.getAudioMaxBitrate()).to.equal(3);
      expect(player.getMaxAudioBitrate()).to.equal(3);

      expect(player.setMaxAudioBitrate(Infinity)).to.equal(undefined);
      expect(player.getAudioMaxBitrate()).to.equal(Infinity);
      expect(player.getMaxAudioBitrate()).to.equal(Infinity);
    });

    it("should update the video buffer size through setVideoBufferSize by default", () => {
      expect(player.setVideoBufferSize(50)).to.equal(undefined);
      expect(player.getVideoBufferSize()).to.equal(50);

      expect(player.setVideoBufferSize(Infinity)).to.equal(undefined);
      expect(player.getVideoBufferSize()).to.equal(Infinity);
    });

    it("should update the audio buffer size through setAudioBufferSize by default", () => {
      expect(player.setAudioBufferSize(50)).to.equal(undefined);
      expect(player.getAudioBufferSize()).to.equal(50);

      expect(player.setAudioBufferSize(Infinity)).to.equal(undefined);
      expect(player.getAudioBufferSize()).to.equal(Infinity);
    });

    it("should return an object through asObservable by default", () => {
      expect(typeof player.asObservable()).to.equal("object");
    });

    it("should return null through getCurrentKeySystem by default", () => {
      expect(player.getCurrentKeySystem()).to.equal(null);
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
  });
});
