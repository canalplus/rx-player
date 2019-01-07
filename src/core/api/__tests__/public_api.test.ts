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
    const PublicAPI = require("../public_api").default;
    let player : any;
    beforeEach(() => {
      player = new PublicAPI();
    });
    afterEach(() => {
      player.dispose();
    });

    describe("getError", () => {
      it("should have no error by default", () => {
        expect(player.getError()).toBe(null);
      });
    });

    describe("getManifest", () => {
      it("should return null in getManifest by default", () => {
        expect(player.getManifest()).toBe(null);
      });
    });

    describe("getCurrentAdaptations", () => {
      it("should return null in getCurrentAdaptations by default", () => {
        expect(player.getCurrentAdaptations()).toBe(null);
      });
    });

    describe("getCurrentRepresentations", () => {
      it("should return null in getCurrentRepresentations by default", () => {
        expect(player.getCurrentRepresentations()).toBe(null);
      });
    });

//     describe("getNativeTextTrack", () => {
//       it("should return null in getNativeTextTrack by default", () => {
//         /* tslint:disable deprecation */
//         expect(player.getNativeTextTrack()).toBe(null);
//         /* tslint:enable deprecation */
//       });
//     });

    describe("getPlayerState", () => {
      it("should return \"STOPPED\" in getPlayerState by default", () => {
        expect(player.getPlayerState()).toBe("STOPPED");
      });
    });

    describe("isLive", () => {
      it("should return false in isLive by default", () => {
        expect(player.isLive()).toBe(false);
      });
    });

    describe("getUrl", () => {
      it("should return undefined in getUrl by default", () => {
        expect(player.getUrl()).toBe(undefined);
      });
    });

    describe("getVideoDuration", () => {
      /* tslint:disable:max-line-length */
      it("should return the video element initial duration in getVideoDuration by default", () => {
      /* tslint:enable:max-line-length */

        // ! HAHA ! NaN is not === to NaN
        const videoElement = player.getVideoElement();
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
        expect(player.getVideoBufferGap()).toBe(Infinity);
      });
    });

    describe("getVideoLoadedTime", () => {
      it("should return 0 in getVideoLoadedTime by default", () => {
        expect(player.getVideoLoadedTime()).toBe(0);
      });
    });

    describe("getVideoPlayedTime", () => {
      it("should return 0 in getVideoPlayedTime by default", () => {
        expect(player.getVideoPlayedTime()).toBe(0);
      });
    });

    describe("getWallClockTime", () => {
      it("should return 0 in getWallClockTime by default", () => {
        expect(player.getWallClockTime()).toBe(0);
      });
    });

    describe("getPosition", () => {
      it("should return 0 in getPosition by default", () => {
        expect(player.getPosition()).toBe(0);
      });
    });

    describe("getPlaybackRate", () => {
      it("should return 1 in getPlaybackRate by default", () => {
        expect(player.getPlaybackRate()).toBe(1);
      });
    });

    describe("getVolume", () => {
      it("should return 1 in getVolume by default", () => {
        expect(player.getVolume()).toBe(1);
      });
    });

    // describe("isFullscreen", () => {
    //   it("should return false in isFullscreen by default", () => {
    //     /* tslint:disable deprecation */
    //     expect(player.isFullscreen()).toBe(false);
    //     /* tslint:enable deprecation */
    //   });
    // });

    describe("getAvailableVideoBitrates", () => {
      it("should return [] in getAvailableVideoBitrates by default", () => {
        expect(player.getAvailableVideoBitrates()).toEqual([]);
      });
    });

    describe("getAvailableAudioBitrates", () => {
      it("should return [] in getAvailableAudioBitrates by default", () => {
        expect(player.getAvailableAudioBitrates()).toEqual([]);
      });
    });

    describe("getVideoBitrate", () => {
      it("should return undefined in getVideoBitrate by default", () => {
        expect(player.getVideoBitrate()).toBe(undefined);
      });
    });

    describe("getAudioBitrate", () => {
      it("should return undefined in getAudioBitrate by default", () => {
        expect(player.getVideoBitrate()).toBe(undefined);
      });
    });

    describe("getMaxVideoBitrate", () => {
      it("should return Infinity in getMaxVideoBitrate by default", () => {
        expect(player.getMaxVideoBitrate()).toBe(Infinity);
      });
    });

    describe("getMaxAudioBitrate", () => {
      it("should return Infinity in getMaxAudioBitrate by default", () => {
        expect(player.getMaxAudioBitrate()).toBe(Infinity);
      });
    });

    describe("getWantedBufferAhead", () => {
      it("should return 30 in getWantedBufferAhead by default", () => {
        expect(player.getWantedBufferAhead()).toBe(30);
      });
    });

    describe("getMaxBufferBehind", () => {
      it("should return Infinity in getMaxBufferBehind by default", () => {
        expect(player.getMaxBufferBehind()).toBe(Infinity);
      });
    });

    describe("getMaxBufferAhead", () => {
      it("should return Infinity in getMaxBufferAhead by default", () => {
        expect(player.getMaxBufferAhead()).toBe(Infinity);
      });
    });

    describe("getPlaybackRate/setPlaybackRate", () => {
      it("should allow to change the playback rate through setPlaybackRate", () => {
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
        expect(() => player.seekTo(10)).toThrow();
        expect(() => player.seekTo(54)).toThrow();
        expect(() => player.seekTo({ relative: 5 })).toThrow();
        expect(() => player.seekTo({ position: 5 })).toThrow();
        expect(() => player.seekTo({ wallClockTime: 5 })).toThrow();
      });
    });

    // describe("exitFullscreen", () => {
    //   it("should allow exitFullscreen by default", () => {
    //     /* tslint:disable deprecation */
    //     player.exitFullscreen();
    //     /* tslint:enable deprecation */
    //   });
    // });

    // describe("setFullscreen", () => {
    //   it("should allow setFullscreen by default", () => {
    //     /* tslint:disable deprecation */
    //     player.setFullscreen();
    //     /* tslint:enable deprecation */

    //     // TODO remove for v3.0.0
    //     /* tslint:disable deprecation */
    //     player.setFullscreen(false);
    //     /* tslint:enable deprecation */
    //   });
    // });

    describe("getVolume/setVolume", () => {
      it("should throw in setVolume by default if no volume has been given", () => {
        expect(() => player.setVolume(5)).toThrow();
      });

      /* tslint:disable:max-line-length */
      it("should set the volume in setVolume by default if a volume has been given", () => {
      /* tslint:enable:max-line-length */
        const videoElement = player.getVideoElement();
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
        const videoElement = player.getVideoElement();
        if (videoElement == null) {
          throw new Error("The API is disposed");
        }
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
        // back to a "normal" state.
        player.unMute();
        const videoElement = player.getVideoElement();
        if (videoElement == null) {
          throw new Error("The API is disposed");
        }
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
        expect(player.isMute()).toBe(false);
      });

      it("should return true in isMute if the volume is equal to 0", () => {
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
        expect(player.getManualAudioBitrate()).toBe(-1);
      });

      it("should update manual audio bitrate when calling setAudioBitrate", () => {
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
        expect(player.getManualVideoBitrate()).toBe(-1);
      });

      it("should update manual video bitrate when calling setVideoBitrate", () => {
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
      /* tslint:disable:max-line-length */
      it("should update the maximum video bitrate when calling setMaxVideoBitrate by default", () => {
      /* tslint:enable:max-line-length */
        const oldMax = player.getManualVideoBitrate();

        player.setMaxVideoBitrate(Infinity);
        expect(player.getMaxVideoBitrate()).toBe(Infinity);

        player.setMaxVideoBitrate(500);
        expect(player.getMaxVideoBitrate()).toBe(500);

        player.setMaxVideoBitrate(3);
        expect(player.getMaxVideoBitrate()).toBe(3);

        player.setMaxVideoBitrate(Infinity);
        player.getMaxVideoBitrate();

        player.setMaxVideoBitrate(oldMax);
        expect(player.getMaxVideoBitrate()).toBe(oldMax);
      });
    });

    describe("setMaxAudioBitrate/getMaxAudioBitrate", () => {
      /* tslint:disable:max-line-length */
      it("should update the maximum audio bitrate when calling setMaxAudioBitrate by default", () => {
      /* tslint:enable:max-line-length */
        const oldMax = player.getManualAudioBitrate();

        player.setMaxAudioBitrate(Infinity);
        expect(player.getMaxAudioBitrate()).toBe(Infinity);

        player.setMaxAudioBitrate(500);
        expect(player.getMaxAudioBitrate()).toBe(500);

        player.setMaxAudioBitrate(3);
        expect(player.getMaxAudioBitrate()).toBe(3);

        player.setMaxAudioBitrate(Infinity);
        expect(player.getMaxAudioBitrate()).toBe(Infinity);

        player.setMaxAudioBitrate(oldMax);
        expect(player.getMaxAudioBitrate()).toBe(oldMax);
      });
    });

    describe("getMaxBufferBehind/setMaxBufferBehind", () => {
      /* tslint:disable:max-line-length */
      it("should update the max buffer behind through setMaxBufferBehind by default", () => {
      /* tslint:enable:max-line-length */
        player.setMaxBufferBehind(50);
        expect(player.getMaxBufferBehind()).toBe(50);

        player.setMaxBufferBehind(Infinity);
        expect(player.getMaxBufferBehind()).toBe(Infinity);
      });
    });

    describe("getMaxBufferAhead/setMaxBufferAhead", () => {
      /* tslint:disable:max-line-length */
      it("should update the max buffer behind through setMaxBufferAhead by default", () => {
      /* tslint:enable:max-line-length */
        player.setMaxBufferAhead(50);
        expect(player.getMaxBufferAhead()).toBe(50);

        player.setMaxBufferAhead(Infinity);
        expect(player.getMaxBufferAhead()).toBe(Infinity);
      });
    });

    describe("getWantedBufferAhead/setWantedBufferAhead", () => {
      it("should update the buffer goal through setWantedBufferAhead by default", () => {
        player.setWantedBufferAhead(50);
        expect(player.getWantedBufferAhead()).toBe(50);

        player.setWantedBufferAhead(Infinity);
        expect(player.getWantedBufferAhead()).toBe(Infinity);
      });
    });

    describe("getAvailableAudioTracks", () => {
      /* tslint:disable:max-line-length */
      it("should return an empty array through getAvailableAudioTracks by default", () => {
      /* tslint:enable:max-line-length */
        expect(player.getAvailableAudioTracks()).toEqual([]);
      });
    });

    describe("getAvailableTextTracks", () => {
      it("should return an empty array through getAvailableTextTracks by default", () => {
        expect(player.getAvailableTextTracks()).toEqual([]);
      });
    });

    describe("getAvailableVideoTracks", () => {
      /* tslint:disable:max-line-length */
      it("should return an empty array through getAvailableVideoTracks by default", () => {
      /* tslint:enable:max-line-length */
        expect(player.getAvailableVideoTracks()).toEqual([]);
      });
    });

    describe("getAudioTrack", () => {
      it("should return undefined through getAudioTrack by default", () => {
        expect(player.getAudioTrack()).toBe(undefined);
      });
    });

    describe("getTextTrack", () => {
      it("should return undefined through getTextTrack by default", () => {
        expect(player.getTextTrack()).toBe(undefined);
      });
    });

    describe("getVideoTrack", () => {
      it("should return undefined through getVideoTrack by default", () => {
        expect(player.getVideoTrack()).toBe(undefined);
      });
    });

    describe("setAudioTrack", () => {
      it("should throw in setAudioTrack by default", () => {
        expect(() => player.setAudioTrack("a")).toThrow();
        expect(() => player.setAudioTrack("test")).toThrow();
      });
    });

    describe("setTextTrack", () => {
      it("should throw in setTextTrack by default", () => {
        expect(() => player.setTextTrack("a")).toThrow();
        expect(() => player.setTextTrack("test")).toThrow();
      });
    });

    describe("setVideoTrack", () => {
      it("should throw in setVideoTrack by default", () => {
        expect(() => player.setVideoTrack("a")).toThrow();
        expect(() => player.setVideoTrack("test")).toThrow();
      });
    });

    describe("disableTextTrack", () => {
      it("should disable text tracks in disableTextTrack by default", () => {
        player.disableTextTrack();
        expect(player.getTextTrack()).toBe(undefined);
      });
    });

    describe("getImageTrackData", () => {
      it("should return null in getImageTrackData by default", () => {
        expect(player.getImageTrackData()).toBe(null);
      });
    });

    describe("getMinimumPosition", () => {
      it("should return null in getMinimumPosition by default", () => {
        expect(player.getMinimumPosition()).toBe(null);
      });
    });

    describe("getMaximumPosition", () => {
      it("should return null in getMaximumPosition by default", () => {
        expect(player.getMinimumPosition()).toBe(null);
      });
    });
  });
});
