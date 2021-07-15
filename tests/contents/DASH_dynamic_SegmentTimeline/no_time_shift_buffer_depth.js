const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_dynamic_SegmentTimeline/media/";

// Provide infos on this content under JSON.
// Useful for integration tests on DASH parsers.
export default {
  url: BASE_URL + "Manifest_no-timeShiftBufferDepth.mpd",
  transport: "dash",
  isLive: true,
  availabilityStartTime: 1325376000,
  periods: [
    {
      adaptations: {
        audio: [
          {
            id: "audio-eng-audio-audio/mp4",
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
                    mediaURLs: [BASE_URL + "A48/init.mp4"],
                  },
                  segments: [
                    {
                      time: 73320372578304 / 48000,
                      duration: 288768 / 48000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "A48/t73320372578304.m4s"],
                    },
                    {
                      time: 73320372867072 / 48000,
                      duration: 287744 / 48000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "A48/t73320372867072.m4s"],
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
            id: "video-video-video/mp4",
            representations: [
              {
                id: "V300",
                bitrate: 300000,
                height: 360,
                width: 640,
                codec: "avc1.64001e",
                mimeType: "video/mp4",
                frameRate: "60/2",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "V300/init.mp4"],
                  },
                  segments: [
                    {
                      time: 137475698580000 / 90000,
                      duration: 540000 / 90000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "V300/t137475698580000.m4s"],
                    },
                    {
                      time: 137475699120000 / 90000,
                      duration: 540000 / 90000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "V300/t137475699120000.m4s"],
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

