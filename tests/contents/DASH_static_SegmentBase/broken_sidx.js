const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_static_SegmentBase/media/";

// Provide infos on this content under JSON.
// Useful for integration tests on DASH parsers.
export default {
  url: BASE_URL + "broken_sidx.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  duration: 60.022,
  minimumPosition: 0,
  maximumPosition: 60.022,
  availabilityStartTime: 0,
  periods: [
    {
      start: 0,
      duration: 60.022,
      adaptations: {
        audio: [
          {
            isAudioDescription: undefined,
            language: "en",
            normalizedLanguage: "eng",
            representations: [
              {
                bitrate: 130107,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "a-eng-0128k-aac.mp4"],
                    range: [0, 745],
                  },
                  segments: [],
                },
              },
            ],
          },
        ],
        video: [
          {
            representations: [
              {
                bitrate: 99529,
                height: 144,
                width: 192,
                frameRate: 25,
                codec: "avc1.42c01e",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0144p-0100k-libx264_broken_sidx.mp4"],
                    range: [0, 806],
                  },
                  segments: [],
                },
              },
            ],
          },
        ],
      },
    },
  ],
};
