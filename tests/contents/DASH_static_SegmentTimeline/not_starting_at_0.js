const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_static_SegmentTimeline/media/";
export default {
  url: BASE_URL + "not_starting_at_0.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  duration: 101.568367,
  minimumPosition: 12.032222222222222,
  maximumPosition: 101.568367,
  availabilityStartTime: 0,
  periods: [
    {
      start: 12,
      duration: 89.568367,
      adaptations: {
        audio: [
          {
            isAudioDescription: undefined,
            language: undefined,
            normalizedLanguage: undefined,
            representations: [
              {
                bitrate: 128000,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "dash/ateam-audio=128000.dash",
                  },
                  segments: [
                    {
                      time: 530621,
                      timescale: 44100,
                      duration: 176128,
                      mediaURL: BASE_URL + "dash/ateam-audio=128000-530621.dash",
                    },
                    {
                      time: 706749,
                      timescale: 44100,
                      duration: 177152,
                      mediaURL: BASE_URL + "dash/ateam-audio=128000-706749.dash",
                    },
                    {
                      time: 883901,
                      timescale: 44100,
                      duration: 176128,
                      mediaURL: BASE_URL + "dash/ateam-audio=128000-883901.dash",
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
                bitrate: 400000,
                height: 124,
                width: 220,
                codec: "avc1.42C014",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "dash/ateam-video=400000.dash",
                  },
                  segments: [
                    {
                      time: 12012,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=400000-12012.dash",
                    },
                    {
                      time: 16016,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=400000-16016.dash",
                    },
                    {
                      time: 20020,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=400000-20020.dash",
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 795000,
                height: 208,
                width: 368,
                codec: "avc1.42C014",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "dash/ateam-video=795000.dash",
                  },
                  segments: [
                    {
                      time: 12012,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=795000-12012.dash",
                    },
                    {
                      time: 16016,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=795000-16016.dash",
                    },
                    {
                      time: 20020,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=795000-20020.dash",
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 1193000,
                height: 432,
                width: 768,
                codec: "avc1.42C01E",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "dash/ateam-video=1193000.dash",
                  },
                  segments: [
                    {
                      time: 12012,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=1193000-12012.dash",
                    },
                    {
                      time: 16016,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=1193000-16016.dash",
                    },
                    {
                      time: 20020,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=1193000-20020.dash",
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 1996000,
                height: 944,
                width: 1680,
                codec: "avc1.640028",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "dash/ateam-video=1996000.dash",
                  },
                  segments: [
                    {
                      time: 12012,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=1996000-12012.dash",
                    },
                    {
                      time: 16016,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=1996000-16016.dash",
                    },
                    {
                      time: 20020,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: BASE_URL + "dash/ateam-video=1996000-20020.dash",
                    },
                    // ...
                  ],
                },
              },

            ],
          },
        ],
      },
    },
  ],
};
