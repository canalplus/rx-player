const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_dynamic_SegmentTemplate/media/";

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
                frameRate: 30,
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "V300/init.mp4"],
                  },
                  segments: [
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
