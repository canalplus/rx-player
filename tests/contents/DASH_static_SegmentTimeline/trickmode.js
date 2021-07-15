const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_static_SegmentTimeline/media/";
export default {
  url: BASE_URL + "ateam-trickmode.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  duration: 101.476,
  minimumPosition: 0,
  maximumPosition: 101.476,
  availabilityStartTime: 0,
  periods: [
    {
      start: 0,
      duration: 101.568367,
      adaptations: {
        audio: [
          {
            id: "audio-audio-mp4a.40.2-audio/mp4",
            isAudioDescription: undefined,
            language: undefined,
            normalizedLanguage: undefined,
            representations: [
              {
                id: "audio=128000",
                bitrate: 128000,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "dash/ateam-audio=128000.dash"],
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 177341 / 44100,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-audio=128000-0.dash"],
                    },
                    {
                      time: 177341 / 44100,
                      duration: 176128 / 44100,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-audio=128000-177341.dash"],
                    },
                    {
                      time: 353469 / 44100,
                      duration: 177152 / 44100,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-audio=128000-353469.dash"],
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
                id: "video=400000",
                bitrate: 400000,
                height: 124,
                width: 220,
                codec: "avc1.42C014",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "dash/ateam-video=400000.dash"],
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=400000-0.dash"],
                    },
                    {
                      time: 4004 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=400000-360360.dash"],
                    },
                    {
                      time: 8008 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=400000-720720.dash"],
                    },
                    // ...
                  ],
                },
              },

              {
                id: "video=795000",
                bitrate: 795000,
                height: 208,
                width: 368,
                codec: "avc1.42C014",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "dash/ateam-video=795000.dash"],
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=795000-0.dash"],
                    },
                    {
                      time: 4004 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=795000-360360.dash"],
                    },
                    {
                      time: 8008 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=795000-720720.dash"],
                    },
                    // ...
                  ],
                },
              },

              {
                id: "video=1193000",
                bitrate: 1193000,
                height: 432,
                width: 768,
                codec: "avc1.42C01E",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "dash/ateam-video=1193000.dash"],
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=1193000-0.dash"],
                    },
                    {
                      time: 4004 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=1193000-360360.dash"],
                    },
                    {
                      time: 8008 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=1193000-720720.dash"],
                    },
                    // ...
                  ],
                },
              },

              {
                id: "video=1996000",
                bitrate: 1996000,
                height: 944,
                width: 1680,
                codec: "avc1.640028",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "dash/ateam-video=1996000.dash"],
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=1996000-0.dash"],
                    },
                    {
                      time: 4004 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=1996000-360360.dash"],
                    },
                    {
                      time: 8008 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "dash/ateam-video=1996000-720720.dash"],
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

