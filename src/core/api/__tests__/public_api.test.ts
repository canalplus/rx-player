/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */

describe("API - Public API", () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe("static properties", () => {
    describe("ErrorTypes", () => {
      it("should expose static ErrorTypes property", () => {
        const PublicAPI = require("../public_api").default;
        expect(typeof PublicAPI.ErrorTypes).toBe("object");
      });
    });

    describe("ErrorCodes", () => {
      it("should expose static ErrorCodes property", () => {
        const PublicAPI = require("../public_api").default;
        expect(typeof PublicAPI.ErrorTypes).toBe("object");
      });
    });
  });

  describe("public methods", () => {
    describe("getError", () => {
      it("should have no error by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getError()).toBe(null);
      });
    });

    describe("getPlayerState", () => {
      it("should return \"STOPPED\" in getPlayerState by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getPlayerState()).toBe("STOPPED");
      });
    });

    describe("isLive", () => {
      it("should return false in isLive by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.isLive()).toBe(false);
      });
    });

    describe("getUrl", () => {
      it("should return undefined in getUrl by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getUrl()).toBe(undefined);
      });
    });

    describe("getVideoDuration", () => {
      /* eslint-disable max-len */
      it("should return the video element initial duration in getVideoDuration by default", () => {
      /* eslint-enable max-len */
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();

        // ! HAHA ! NaN is not === to NaN
        const videoElement = player.getMediaElement();
        if (videoElement == null) {
          throw new Error("The API is disposed");
        }
        expect(player.getVideoDuration()).toEqual(
          videoElement.duration
        );
      });
    });

    describe("getVideoBufferGap", () => {
      it("should return Infinity in getVideoBufferGap by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getVideoBufferGap()).toBe(Infinity);
      });
    });

    describe("getVideoLoadedTime", () => {
      it("should return 0 in getVideoLoadedTime by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getVideoLoadedTime()).toBe(0);
      });
    });

    describe("getVideoPlayedTime", () => {
      it("should return 0 in getVideoPlayedTime by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getVideoPlayedTime()).toBe(0);
      });
    });

    describe("getWallClockTime", () => {
      it("should return 0 in getWallClockTime by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getWallClockTime()).toBe(0);
      });
    });

    describe("getPosition", () => {
      it("should return 0 in getPosition by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getPosition()).toBe(0);
      });
    });

    describe("getPlaybackRate", () => {
      it("should return 1 in getPlaybackRate by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getPlaybackRate()).toBe(1);
      });
    });

    describe("getVolume", () => {
      it("should return 1 in getVolume by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getVolume()).toBe(1);
      });
    });

    describe("getAvailableVideoBitrates", () => {
      it("should return [] in getAvailableVideoBitrates by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getAvailableVideoBitrates()).toEqual([]);
      });
    });

    describe("getAvailableAudioBitrates", () => {
      it("should return [] in getAvailableAudioBitrates by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getAvailableAudioBitrates()).toEqual([]);
      });
    });

    describe("getVideoBitrate", () => {
      it("should return undefined in getVideoBitrate by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getVideoBitrate()).toBe(undefined);
      });
    });

    describe("getAudioBitrate", () => {
      it("should return undefined in getAudioBitrate by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getVideoBitrate()).toBe(undefined);
      });
    });

    describe("getMaxVideoBitrate", () => {
      it("should return Infinity in getMaxVideoBitrate by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getMaxVideoBitrate()).toBe(Infinity);
      });
    });

    describe("getMaxAudioBitrate", () => {
      it("should return Infinity in getMaxAudioBitrate by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getMaxAudioBitrate()).toBe(Infinity);
      });
    });

    describe("getWantedBufferAhead", () => {
      it("should return 30 in getWantedBufferAhead by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getWantedBufferAhead()).toBe(30);
      });
    });

    describe("getMaxBufferBehind", () => {
      it("should return Infinity in getMaxBufferBehind by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getMaxBufferBehind()).toBe(Infinity);
      });
    });

    describe("getMaxBufferAhead", () => {
      it("should return Infinity in getMaxBufferAhead by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getMaxBufferAhead()).toBe(Infinity);
      });
    });

    describe("getPlaybackRate/setPlaybackRate", () => {
      it("should allow to change the playback rate through setPlaybackRate", () => {
        const PublicAPI = require("../public_api").default;
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
      it("should throw in seekTo by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(() => player.seekTo(10)).toThrow();
        expect(() => player.seekTo(54)).toThrow();
        expect(() => player.seekTo({ relative: 5 })).toThrow();
        expect(() => player.seekTo({ position: 5 })).toThrow();
        expect(() => player.seekTo({ wallClockTime: 5 })).toThrow();
      });
    });

    describe("getVolume/setVolume", () => {
      it("should throw in setVolume by default if no volume has been given", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(() => player.setVolume(5)).toThrow();
      });

      /* eslint-disable max-len */
      it("should set the volume in setVolume by default if a volume has been given", () => {
      /* eslint-enable max-len */
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const videoElement = player.getMediaElement();
        if (videoElement == null) {
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
      it("should set the volume to 0 in mute by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const videoElement = player.getMediaElement();
        if (videoElement == null) {
          throw new Error("The API is disposed");
        }
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (videoElement.muted) {
          videoElement.muted = false;
        }
        player.setVolume(1);

        player.mute();
        expect(player.getVolume()).toBe(0);
        expect(videoElement.volume).toBe(0);
        expect(videoElement.muted).toBe(false);
        expect(player.isMute()).toBe(true);
        player.unMute();
        expect(player.isMute()).toBe(false);
      });

      it("should unmute the volume at the previous value in unMute by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        // back to a "normal" state.
        player.unMute();
        const videoElement = player.getMediaElement();
        if (videoElement == null) {
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
        expect(player.getVolume()).toBe(0);
        expect(videoElement.volume).toBe(0);

        player.unMute();
        expect(player.isMute()).toBe(false);
        expect(player.getVolume()).toBe(0.8);
        expect(videoElement.volume).toBe(0.8);
      });

      it("should return false in isMute by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.isMute()).toBe(false);
      });

      it("should return true in isMute if the volume is equal to 0", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldVolume = player.getVolume();

        expect(player.isMute()).toBe(false);

        player.setVolume(0);
        expect(player.isMute()).toBe(true);
        player.setVolume(oldVolume);
        expect(player.isMute()).toBe(false);

        player.mute();
        expect(player.isMute()).toBe(true);
        player.unMute();
        expect(player.isMute()).toBe(false);

        player.mute();
        expect(player.isMute()).toBe(true);
        player.setVolume(oldVolume);
        expect(player.isMute()).toBe(false);
        player.unMute();
        expect(player.isMute()).toBe(false);

        player.setVolume(oldVolume);
      });
    });

    describe("setAudioBitrate/getManualAudioBitrate", () => {
      it("should have a -1 manual audio bitrate by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getManualAudioBitrate()).toBe(-1);
      });

      it("should update manual audio bitrate when calling setAudioBitrate", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldManual = player.getManualAudioBitrate();

        player.setAudioBitrate(84);
        expect(player.getManualAudioBitrate()).toBe(84);
        player.setAudioBitrate(-1);
        expect(player.getManualAudioBitrate()).toBe(-1);
        player.setAudioBitrate(0);
        expect(player.getManualAudioBitrate()).toBe(0);

        player.setAudioBitrate(oldManual);
        expect(player.getManualAudioBitrate()).toBe(oldManual);
      });
    });

    describe("setVideoBitrate/getManualVideoBitrate", () => {
      it("should have a -1 manual video bitrate by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getManualVideoBitrate()).toBe(-1);
      });

      it("should update manual video bitrate when calling setVideoBitrate", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldManual = player.getManualVideoBitrate();

        player.setVideoBitrate(84);
        expect(player.getManualVideoBitrate()).toBe(84);

        player.setVideoBitrate(-1);
        expect(player.getManualVideoBitrate()).toBe(-1);

        player.setVideoBitrate(0);
        expect(player.getManualVideoBitrate()).toBe(0);

        player.setVideoBitrate(oldManual);
        expect(player.getManualVideoBitrate()).toBe(oldManual);
      });
    });

    describe("setMaxVideoBitrate/getMaxVideoBitrate", () => {
      /* eslint-disable max-len */
      it("should update the maximum video bitrate when calling setMaxVideoBitrate by default", () => {
      /* eslint-enable max-len */
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMax = player.getMaxVideoBitrate();

        player.setMaxVideoBitrate(Infinity);
        expect(player.getMaxVideoBitrate()).toBe(Infinity);

        player.setMaxVideoBitrate(500);
        expect(player.getMaxVideoBitrate()).toBe(500);

        player.setMaxVideoBitrate(3);
        expect(player.getMaxVideoBitrate()).toBe(3);

        player.setMaxVideoBitrate(0);
        expect(player.getMaxVideoBitrate()).toBe(0);

        player.setMaxVideoBitrate(Infinity);
        player.getMaxVideoBitrate();

        player.setMaxVideoBitrate(oldMax);
        expect(player.getMaxVideoBitrate()).toBe(oldMax);
      });

      it("should throw when setting a negative maximum video bitrate", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMax = player.getMaxVideoBitrate();

        expect(() => player.setMaxVideoBitrate(-1))
          .toThrow(new Error("Invalid maximum video bitrate given. " +
                             "Its value, \"-1\" is inferior the current " +
                              "minimum video birate, \"0\"."));
        expect(player.getMaxVideoBitrate()).toBe(oldMax);

        expect(() => player.setMaxVideoBitrate(-Infinity))
          .toThrow(new Error("Invalid maximum video bitrate given. " +
                             "Its value, \"-Infinity\" is inferior the current " +
                              "minimum video birate, \"0\"."));
        expect(player.getMaxVideoBitrate()).toBe(oldMax);

        expect(() => player.setMaxVideoBitrate(-100))
          .toThrow(new Error("Invalid maximum video bitrate given. " +
                             "Its value, \"-100\" is inferior the current " +
                              "minimum video birate, \"0\"."));
        expect(player.getMaxVideoBitrate()).toBe(oldMax);
      });

      // eslint-disable-next-line max-len
      it("should throw when setting a maximum video bitrate inferior to the minimum", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMin = player.getMinVideoBitrate();
        const oldMax = player.getMaxVideoBitrate();

        player.setMinVideoBitrate(50);
        expect(() => player.setMaxVideoBitrate(49))
          .toThrow(new Error("Invalid maximum video bitrate given. " +
                             "Its value, \"49\" is inferior the current " +
                              "minimum video birate, \"50\"."));
        expect(player.getMaxVideoBitrate()).toBe(oldMax);
        player.setMinVideoBitrate(oldMin);
      });

      // eslint-disable-next-line max-len
      it("should not throw when setting a maximum video bitrate equal to the minimum", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMin = player.getMinVideoBitrate();
        const oldMax = player.getMaxVideoBitrate();

        player.setMinVideoBitrate(50);
        player.setMaxVideoBitrate(50);
        expect(player.getMaxVideoBitrate()).toBe(50);
        player.setMinVideoBitrate(oldMin);
        player.setMaxVideoBitrate(oldMax);
      });
    });

    describe("setMinAudioBitrate/getMinAudioBitrate", () => {
      /* eslint-disable max-len */
      it("should update the minimum audio bitrate when calling setMinAudioBitrate by default", () => {
      /* eslint-enable max-len */
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMin = player.getMinAudioBitrate();

        player.setMinAudioBitrate(0);
        expect(player.getMinAudioBitrate()).toBe(0);

        player.setMinAudioBitrate(500);
        expect(player.getMinAudioBitrate()).toBe(500);

        player.setMinAudioBitrate(3);
        expect(player.getMinAudioBitrate()).toBe(3);

        player.setMinAudioBitrate(0);
        expect(player.getMinAudioBitrate()).toBe(0);

        player.setMinAudioBitrate(oldMin);
        expect(player.getMinAudioBitrate()).toBe(oldMin);
      });

      // eslint-disable-next-line max-len
      it("should throw when setting a minimum audio bitrate superior to the maximum", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMax = player.getMaxAudioBitrate();
        const oldMin = player.getMinAudioBitrate();

        player.setMaxAudioBitrate(49);
        expect(() => player.setMinAudioBitrate(50))
          .toThrow(new Error("Invalid minimum audio bitrate given. " +
                             "Its value, \"50\" is superior the current " +
                              "maximum audio birate, \"49\"."));
        expect(player.getMinAudioBitrate()).toBe(oldMin);
        player.setMaxAudioBitrate(oldMax);
      });

      // eslint-disable-next-line max-len
      it("should not throw when setting a minimum audio bitrate equal to the maximum", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMax = player.getMaxAudioBitrate();
        const oldMin = player.getMinAudioBitrate();

        player.setMaxAudioBitrate(50);
        player.setMinAudioBitrate(50);
        expect(player.getMinAudioBitrate()).toBe(50);
        player.setMaxAudioBitrate(oldMax);
        player.setMinAudioBitrate(oldMin);
      });
    });


    describe("setMaxAudioBitrate/getMaxAudioBitrate", () => {
      /* eslint-disable max-len */
      it("should update the maximum audio bitrate when calling setMaxAudioBitrate by default", () => {
      /* eslint-enable max-len */
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMax = player.getMaxAudioBitrate();

        player.setMaxAudioBitrate(Infinity);
        expect(player.getMaxAudioBitrate()).toBe(Infinity);

        player.setMaxAudioBitrate(500);
        expect(player.getMaxAudioBitrate()).toBe(500);

        player.setMaxAudioBitrate(3);
        expect(player.getMaxAudioBitrate()).toBe(3);

        player.setMaxAudioBitrate(0);
        expect(player.getMaxAudioBitrate()).toBe(0);

        player.setMaxAudioBitrate(Infinity);
        player.getMaxAudioBitrate();

        player.setMaxAudioBitrate(oldMax);
        expect(player.getMaxAudioBitrate()).toBe(oldMax);
      });

      it("should throw when setting a negative maximum audio bitrate", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMax = player.getMaxAudioBitrate();

        expect(() => player.setMaxAudioBitrate(-1))
          .toThrow(new Error("Invalid maximum audio bitrate given. " +
                             "Its value, \"-1\" is inferior the current " +
                              "minimum audio birate, \"0\"."));
        expect(player.getMaxAudioBitrate()).toBe(oldMax);

        expect(() => player.setMaxAudioBitrate(-Infinity))
          .toThrow(new Error("Invalid maximum audio bitrate given. " +
                             "Its value, \"-Infinity\" is inferior the current " +
                              "minimum audio birate, \"0\"."));
        expect(player.getMaxAudioBitrate()).toBe(oldMax);

        expect(() => player.setMaxAudioBitrate(-100))
          .toThrow(new Error("Invalid maximum audio bitrate given. " +
                             "Its value, \"-100\" is inferior the current " +
                              "minimum audio birate, \"0\"."));
        expect(player.getMaxAudioBitrate()).toBe(oldMax);
      });

      // eslint-disable-next-line max-len
      it("should throw when setting a maximum audio bitrate inferior to the minimum", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMin = player.getMinAudioBitrate();
        const oldMax = player.getMaxAudioBitrate();

        player.setMinAudioBitrate(50);
        expect(() => player.setMaxAudioBitrate(49))
          .toThrow(new Error("Invalid maximum audio bitrate given. " +
                             "Its value, \"49\" is inferior the current " +
                              "minimum audio birate, \"50\"."));
        expect(player.getMaxAudioBitrate()).toBe(oldMax);
        player.setMinAudioBitrate(oldMin);
      });

      // eslint-disable-next-line max-len
      it("should not throw when setting a maximum audio bitrate equal to the minimum", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        const oldMin = player.getMinAudioBitrate();
        const oldMax = player.getMaxAudioBitrate();

        player.setMinAudioBitrate(50);
        player.setMaxAudioBitrate(50);
        expect(player.getMaxAudioBitrate()).toBe(50);
        player.setMinAudioBitrate(oldMin);
        player.setMaxAudioBitrate(oldMax);
      });
    });

    describe("getMaxBufferBehind/setMaxBufferBehind", () => {
      /* eslint-disable max-len */
      it("should update the max buffer behind through setMaxBufferBehind by default", () => {
      /* eslint-enable max-len */
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        player.setMaxBufferBehind(50);
        expect(player.getMaxBufferBehind()).toBe(50);

        player.setMaxBufferBehind(Infinity);
        expect(player.getMaxBufferBehind()).toBe(Infinity);
      });
    });

    describe("getMaxBufferAhead/setMaxBufferAhead", () => {
      /* eslint-disable max-len */
      it("should update the max buffer behind through setMaxBufferAhead by default", () => {
      /* eslint-enable max-len */
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        player.setMaxBufferAhead(50);
        expect(player.getMaxBufferAhead()).toBe(50);

        player.setMaxBufferAhead(Infinity);
        expect(player.getMaxBufferAhead()).toBe(Infinity);
      });
    });

    describe("getWantedBufferAhead/setWantedBufferAhead", () => {
      it("should update the buffer goal through setWantedBufferAhead by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        player.setWantedBufferAhead(50);
        expect(player.getWantedBufferAhead()).toBe(50);

        player.setWantedBufferAhead(Infinity);
        expect(player.getWantedBufferAhead()).toBe(Infinity);
      });
    });

    describe("getAvailableAudioTracks", () => {
      /* eslint-disable max-len */
      it("should return an empty array through getAvailableAudioTracks by default", () => {
      /* eslint-enable max-len */
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getAvailableAudioTracks()).toEqual([]);
      });
    });

    describe("getAvailableTextTracks", () => {
      it("should return an empty array through getAvailableTextTracks by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getAvailableTextTracks()).toEqual([]);
      });
    });

    describe("getAvailableVideoTracks", () => {
      /* eslint-disable max-len */
      it("should return an empty array through getAvailableVideoTracks by default", () => {
      /* eslint-enable max-len */
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getAvailableVideoTracks()).toEqual([]);
      });
    });

    describe("getAudioTrack", () => {
      it("should return undefined through getAudioTrack by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getAudioTrack()).toBe(undefined);
      });
    });

    describe("getTextTrack", () => {
      it("should return undefined through getTextTrack by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getTextTrack()).toBe(undefined);
      });
    });

    describe("getVideoTrack", () => {
      it("should return undefined through getVideoTrack by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getVideoTrack()).toBe(undefined);
      });
    });

    describe("setAudioTrack", () => {
      it("should throw in setAudioTrack by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(() => player.setAudioTrack("a")).toThrow();
        expect(() => player.setAudioTrack("test")).toThrow();
      });
    });

    describe("setTextTrack", () => {
      it("should throw in setTextTrack by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(() => player.setTextTrack("a")).toThrow();
        expect(() => player.setTextTrack("test")).toThrow();
      });
    });

    describe("setVideoTrack", () => {
      it("should throw in setVideoTrack by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(() => player.setVideoTrack("a")).toThrow();
        expect(() => player.setVideoTrack("test")).toThrow();
      });
    });

    describe("disableTextTrack", () => {
      it("should disable text tracks in disableTextTrack by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        player.disableTextTrack();
        expect(player.getTextTrack()).toBe(undefined);
      });
    });

    describe("getImageTrackData", () => {
      it("should return null in getImageTrackData by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getImageTrackData()).toBe(null);
      });
    });

    describe("getMinimumPosition", () => {
      it("should return null in getMinimumPosition by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getMinimumPosition()).toBe(null);
      });
    });

    describe("getMaximumPosition", () => {
      it("should return null in getMaximumPosition by default", () => {
        const PublicAPI = require("../public_api").default;
        const player = new PublicAPI();
        expect(player.getMinimumPosition()).toBe(null);
      });
    });
  });
});
