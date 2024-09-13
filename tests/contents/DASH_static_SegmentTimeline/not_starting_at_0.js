const BASE_URL =
  "http://" +
  /* eslint-disable no-undef */
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  /* eslint-enable no-undef */
  "/DASH_static_SegmentTimeline/media/";
export default {
  url: BASE_URL + "not_starting_at_0.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  minimumPosition: 12.032222222222222,
  maximumPosition: 101.476,
  duration: 101.476 - 12.032222222222222,
  availabilityStartTime: 0,
  periods: [
    {
      start: 12,
      duration: 89.568367,
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
                    url: "ateam-audio=128000.dash",
                  },
                  segments: [
                    {
                      time: 530621 / 44100,
                      duration: 176128 / 44100,
                      timescale: 1,
                      url: "ateam-audio=128000-530621.dash",
                    },
                    {
                      time: 706749 / 44100,
                      duration: 177152 / 44100,
                      timescale: 1,
                      url: "ateam-audio=128000-706749.dash",
                    },
                    {
                      time: 883901 / 44100,
                      duration: 176128 / 44100,
                      timescale: 1,
                      url: "ateam-audio=128000-883901.dash",
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
                    url: "ateam-video=400000.dash",
                  },
                  segments: [
                    {
                      time: 12012 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=400000-12012.dash",
                    },
                    {
                      time: 16016 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=400000-16016.dash",
                    },
                    {
                      time: 20020 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=400000-20020.dash",
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
                    url: "ateam-video=795000.dash",
                  },
                  segments: [
                    {
                      time: 12012 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=795000-12012.dash",
                    },
                    {
                      time: 16016 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=795000-16016.dash",
                    },
                    {
                      time: 20020 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=795000-20020.dash",
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
                    url: "ateam-video=1193000.dash",
                  },
                  segments: [
                    {
                      time: 12012 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=1193000-12012.dash",
                    },
                    {
                      time: 16016 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=1193000-16016.dash",
                    },
                    {
                      time: 20020 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=1193000-20020.dash",
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
                    url: "ateam-video=1996000.dash",
                  },
                  segments: [
                    {
                      time: 12012 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=1996000-12012.dash",
                    },
                    {
                      time: 16016 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=1996000-16016.dash",
                    },
                    {
                      time: 20020 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "ateam-video=1996000-20020.dash",
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
