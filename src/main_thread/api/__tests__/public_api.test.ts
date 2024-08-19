import { describe, beforeEach, it, expect, vi } from "vitest";
import type IPublicAPI from "../public_api";

describe("API - Public API", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("static properties", () => {
    describe("ErrorTypes", () => {
      it("should expose static ErrorTypes property", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        expect(typeof PublicAPI.ErrorTypes).toBe("object");
      });
    });

    describe("ErrorCodes", () => {
      it("should expose static ErrorCodes property", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        expect(typeof PublicAPI.ErrorTypes).toBe("object");
      });
    });
  });

  describe("public methods", () => {
    describe("getError", () => {
      it("should have no error by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getError()).toBe(null);
      });
    });

    describe("getPlayerState", () => {
      it('should return "STOPPED" in getPlayerState by default', async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getPlayerState()).toBe("STOPPED");
      });
    });

    describe("isLive", () => {
      it("should return false in isLive by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.isLive()).toBe(false);
      });
    });

    describe("getContentUrls", () => {
      it("should return undefined in getContentUrls by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getContentUrls()).toBe(undefined);
      });
    });

    describe("getMediaDuration", () => {
      it("should return the video element initial duration in getMediaDuration by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();

        // ! HAHA ! NaN is not === to NaN
        const videoElement = player.getVideoElement();
        if (videoElement === null) {
          throw new Error("The API is disposed");
        }
        expect(player.getMediaDuration()).toEqual(videoElement.duration);
      });
    });

    describe("getCurrentBufferGap", () => {
      it("should return 0 in getCurrentBufferGap by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getCurrentBufferGap()).toBe(0);
      });
    });

    describe("getWallClockTime", () => {
      it("should return 0 in getWallClockTime by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getWallClockTime()).toBe(0);
      });
    });

    describe("getPosition", () => {
      it("should return 0 in getPosition by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getPosition()).toBe(0);
      });
    });

    describe("getPlaybackRate", () => {
      it("should return 1 in getPlaybackRate by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getPlaybackRate()).toBe(1);
      });
    });

    describe("getVolume", () => {
      it("should return 1 in getVolume by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getVolume()).toBe(1);
      });
    });

    describe("getVideoRepresentation", () => {
      it("should return undefined in getVideoRepresentation by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getVideoRepresentation()).toBe(undefined);
      });
    });

    describe("getAudioRepresentation", () => {
      it("should return undefined in getAudioRepresentation by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getAudioRepresentation()).toBe(undefined);
      });
    });

    describe("getWantedBufferAhead", () => {
      it("should return 30 in getWantedBufferAhead by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getWantedBufferAhead()).toBe(30);
      });
    });

    describe("getMaxBufferBehind", () => {
      it("should return Infinity in getMaxBufferBehind by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getMaxBufferBehind()).toBe(Infinity);
      });
    });

    describe("getMaxBufferAhead", () => {
      it("should return Infinity in getMaxBufferAhead by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getMaxBufferAhead()).toBe(Infinity);
      });
    });

    describe("getPlaybackRate/setPlaybackRate", () => {
      it("should allow to change the playback rate through setPlaybackRate", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        player.setPlaybackRate(4);
        expect(player.getPlaybackRate()).toBe(4);

        player.setPlaybackRate(3);
        expect(player.getPlaybackRate()).toBe(3);

        player.setPlaybackRate(2);
        expect(player.getPlaybackRate()).toBe(2);

        player.setPlaybackRate(1.5);
        expect(player.getPlaybackRate()).toBe(1.5);

        player.setPlaybackRate(0.7);
        expect(player.getPlaybackRate()).toBe(0.7);

        player.setPlaybackRate(1);
        expect(player.getPlaybackRate()).toBe(1);
      });
    });

    describe("seekTo", () => {
      it("should throw in seekTo by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(() => player.seekTo(10)).toThrow();
        expect(() => player.seekTo(54)).toThrow();
        expect(() => player.seekTo({ relative: 5 })).toThrow();
        expect(() => player.seekTo({ position: 5 })).toThrow();
        expect(() => player.seekTo({ wallClockTime: 5 })).toThrow();
      });
    });

    describe("getVolume/setVolume", () => {
      it("should throw in setVolume by default if no volume has been given", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(() => player.setVolume(5)).toThrow();
      });

      it("should set the volume in setVolume by default if a volume has been given", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        const videoElement = player.getVideoElement();
        if (videoElement === null) {
          throw new Error("The API is disposed");
        }
        player.setVolume(1);
        player.setVolume(0.5);
        expect(player.getVolume()).toBe(0.5);
        expect(videoElement.volume).toBe(0.5);

        player.setVolume(1);
        expect(player.getVolume()).toBe(1);
        expect(videoElement.volume).toBe(1);
      });
    });

    describe("mute/unMute/isMute", () => {
      it("should keep the volume yet mute the media element in mute by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        const videoElement = player.getVideoElement();
        if (videoElement === null) {
          throw new Error("The API is disposed");
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (videoElement.muted) {
          videoElement.muted = false;
        }
        player.setVolume(1);

        player.mute();
        expect(player.getVolume()).toBe(1);
        expect(videoElement.volume).toBe(1);
        expect(videoElement.muted).toBe(true);
        expect(player.isMute()).toBe(true);
        player.unMute();
        expect(player.isMute()).toBe(false);
        expect(player.getVolume()).toBe(1);
        expect(videoElement.volume).toBe(1);
        expect(videoElement.muted).toBe(false);
      });

      it("should unmute without changing the volume in unMute by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        // back to a "normal" state.
        player.unMute();
        const videoElement = player.getVideoElement();
        if (videoElement === null) {
          throw new Error("The API is disposed");
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (videoElement.muted) {
          videoElement.muted = false;
        }
        expect(player.isMute()).toBe(false);
        player.setVolume(1);

        player.setVolume(0.8);
        expect(player.getVolume()).toBe(0.8);
        expect(videoElement.volume).toBe(0.8);

        player.mute();
        expect(player.isMute()).toBe(true);
        expect(player.getVolume()).toBe(0.8);
        expect(videoElement.volume).toBe(0.8);
        expect(videoElement.muted).toBe(true);

        player.unMute();
        expect(player.isMute()).toBe(false);
        expect(player.getVolume()).toBe(0.8);
        expect(videoElement.volume).toBe(0.8);
        expect(videoElement.muted).toBe(false);
      });

      it("should return false in isMute by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.isMute()).toBe(false);
      });

      it("should not return true in isMute if just the volume is equal to 0", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();

        expect(player.isMute()).toBe(false);

        player.setVolume(0);
        expect(player.isMute()).toBe(false);
      });
    });

    describe("getMaxBufferBehind/setMaxBufferBehind", () => {
      it("should update the max buffer behind through setMaxBufferBehind by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        player.setMaxBufferBehind(50);
        expect(player.getMaxBufferBehind()).toBe(50);

        player.setMaxBufferBehind(Infinity);
        expect(player.getMaxBufferBehind()).toBe(Infinity);
      });
    });

    describe("getMaxBufferAhead/setMaxBufferAhead", () => {
      it("should update the max buffer behind through setMaxBufferAhead by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        player.setMaxBufferAhead(50);
        expect(player.getMaxBufferAhead()).toBe(50);

        player.setMaxBufferAhead(Infinity);
        expect(player.getMaxBufferAhead()).toBe(Infinity);
      });
    });

    describe("getWantedBufferAhead/setWantedBufferAhead", () => {
      it("should update the buffer goal through setWantedBufferAhead by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        player.setWantedBufferAhead(50);
        expect(player.getWantedBufferAhead()).toBe(50);

        player.setWantedBufferAhead(Infinity);
        expect(player.getWantedBufferAhead()).toBe(Infinity);
      });
    });

    describe("getAvailableAudioTracks", () => {
      it("should return an empty array through getAvailableAudioTracks by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getAvailableAudioTracks()).toEqual([]);
      });
    });

    describe("getAvailableTextTracks", () => {
      it("should return an empty array through getAvailableTextTracks by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getAvailableTextTracks()).toEqual([]);
      });
    });

    describe("getAvailableVideoTracks", () => {
      it("should return an empty array through getAvailableVideoTracks by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getAvailableVideoTracks()).toEqual([]);
      });
    });

    describe("getAudioTrack", () => {
      it("should return undefined through getAudioTrack by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getAudioTrack()).toBe(undefined);
      });
    });

    describe("getTextTrack", () => {
      it("should return undefined through getTextTrack by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getTextTrack()).toBe(undefined);
      });
    });

    describe("getVideoTrack", () => {
      it("should return undefined through getVideoTrack by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getVideoTrack()).toBe(undefined);
      });
    });

    describe("setAudioTrack", () => {
      it("should throw in setAudioTrack by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(() => player.setAudioTrack("a")).toThrow();
        expect(() => player.setAudioTrack("test")).toThrow();
      });
    });

    describe("setTextTrack", () => {
      it("should throw in setTextTrack by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(() => player.setTextTrack("a")).toThrow();
        expect(() => player.setTextTrack("test")).toThrow();
      });
    });

    describe("setVideoTrack", () => {
      it("should throw in setVideoTrack by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(() => player.setVideoTrack("a")).toThrow();
        expect(() => player.setVideoTrack("test")).toThrow();
      });
    });

    describe("disableTextTrack", () => {
      it("should disable text tracks in disableTextTrack by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        player.disableTextTrack();
        expect(player.getTextTrack()).toBe(undefined);
      });
    });

    describe("getMinimumPosition", () => {
      it("should return null in getMinimumPosition by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getMinimumPosition()).toBe(null);
      });
    });

    describe("getMaximumPosition", () => {
      it("should return null in getMaximumPosition by default", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const player = new PublicAPI();
        expect(player.getMinimumPosition()).toBe(null);
      });
    });

    describe("Player instantiation", () => {
      it("should log a warning if creating two players attached to the same video element", async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const warn = vi.spyOn(console, "warn").mockImplementation(vi.fn());
        const videoElement = document.createElement("video");
        const player1 = new PublicAPI({ videoElement });
        expect(player1.getVideoElement()).toBe(videoElement);

        const errorMessage =
          "The video element is already attached to another RxPlayer instance." +
          "\nMake sure to dispose the previous instance with player.dispose() before creating" +
          " a new player instance attaching that video element.";

        new PublicAPI({ videoElement });
        expect(warn).toHaveBeenCalledWith(errorMessage);
        expect(warn).toHaveBeenCalledTimes(1);

        warn.mockClear();
        /*
         * TODO: for next major version 5.0: this need to throw an error instead of just logging
         * this was not done for minor version as it could be considerated a breaking change
         *
         * expect(() => {
         *    new PublicAPI({ videoElement });
         * }).toThrow(errorMessage);
         */
      });

      it(`should not log a warning if creating a player attached to
        the same video element after the previous one was disposed`, async () => {
        const PublicAPI = (await vi.importActual("../public_api"))
          .default as typeof IPublicAPI;
        const warn = vi.spyOn(console, "warn").mockImplementation(vi.fn());
        const videoElement = document.createElement("video");
        const player1 = new PublicAPI({ videoElement });
        expect(player1.getVideoElement()).toBe(videoElement);

        player1.dispose();
        expect(warn).not.toHaveBeenCalled();
        /*
         * TODO: for next major version 5.0: this need to throw an error instead of just logging
         * this was not done for minor version as it could be considerated a breaking change.
         *
         * expect(() => {
         *   new PublicAPI({ videoElement });
         * }).not.toThrow();
         *
         */
        warn.mockClear();
      });
    });
  });
});
