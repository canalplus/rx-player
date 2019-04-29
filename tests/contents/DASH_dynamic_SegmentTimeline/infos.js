const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_dynamic_SegmentTimeline/media/";

// Provide infos on this content under JSON.
// Useful for integration tests on DASH parsers.
export default {
  url: BASE_URL + "Manifest.mpd",
  transport: "dash",
  isDynamic: true,
  isLive: true,
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
                    mediaURL: BASE_URL + "A48/init.mp4",
                  },
                  segments: [
                    // {
                    //   time: 73320372578304,
                    //   timescale: 48000,
                    //   duration: 288768,
                    //   mediaURL: BASE_URL + "A48/t73320372578304.m4s",
                    // },
                    {
                      time: 73320372867072,
                      timescale: 48000,
                      duration: 287744,
                      mediaURL: BASE_URL + "A48/t73320372867072.m4s",
                    },
                    {
                      duration: 288768,
                      mediaURL: "http://127.0.0.1:3000/DASH_dynamic_SegmentTimeline/media/A48/t73320373154816.m4s",
                      time: 73320373154816,
                      timescale: 48000,
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
                    mediaURL: BASE_URL + "V300/init.mp4",
                  },
                  segments: [
                    // {
                    //   time: 137475698580000,
                    //   timescale: 90000,
                    //   duration: 540000,
                    //   mediaURL: BASE_URL + "V300/t137475698580000.m4s",
                    // },
                    {
                      time: 137475699120000,
                      timescale: 90000,
                      duration: 540000,
                      mediaURL: BASE_URL + "V300/t137475699120000.m4s",
                    },
                    {
                      duration: 540000,
                      mediaURL: "http://127.0.0.1:3000/DASH_dynamic_SegmentTimeline/media/V300/t137475699660000.m4s",
                      time: 137475699660000,
                      timescale: 90000,
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
