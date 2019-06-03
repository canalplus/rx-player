// Provide infos on this content under JSON.
// Useful for integration tests on DASH parsers.
export default {
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  isLive: true,
  availabilityStartTime: 1325376000,
  periods: [
    {
      adaptations: {
        audio: [
          {
            isAudioDescription: false,
            language: "eng",
            normalizedLanguage: "eng",
            representations: [
              {
                bitrate: 48000,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/init.mp4",
                  },
                  segments: [
                    {
                      time: 73320372578304,
                      timescale: 48000,
                      duration: 288768,
                      mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320372578304.m4s",
                    },
                    {
                      time: 73320372867072,
                      timescale: 48000,
                      duration: 287744,
                      mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320372867072.m4s",
                    },
                  ],
                  // ...
                },
              },
            ],
          },
        ],
        video: [
          {
            representations: [
              {
                bitrate: 300000,
                height: 360,
                width: 640,
                codec: "avc1.64001e",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/init.mp4",
                  },
                  segments: [
                    {
                      time: 137475698580000,
                      timescale: 90000,
                      duration: 540000,
                      mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475698580000.m4s",
                    },
                    {
                      time: 137475699120000,
                      timescale: 90000,
                      duration: 540000,
                      mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475699120000.m4s",
                    },
                  ],
                  // ...
                },
              },
            ],
          },
        ],
      },
    },
  ],
};
