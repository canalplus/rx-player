const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_static_SegmentTemplate_Multi_Periods/media/";

export default {
  url: BASE_URL + "discontinuities_between_periods.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  duration: 251,
  minimumPosition: 0,
  maximumPosition: 251,
  availabilityStartTime: 0,
  periods: [
    {
      start: 0,
      duration: 120,
      adaptations: {
        audio: [
          {
            isAudioDescription: undefined,
            language: undefined,
            normalizedLanguage: undefined,
            representations: [
              {
                bitrate: 66295,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "mp4-live-periods-aaclc-.mp4"],
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 440029 / 44100,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-aaclc-1.m4s"],
                    },
                    {
                      time: 440029 / 44100,
                      duration: 440029 / 44100,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-aaclc-2.m4s"],
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
                bitrate: 50842,
                height: 180,
                width: 320,
                frameRate: 25,
                codec: "avc1.42c00d",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_low-.mp4"],
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_low-1.m4s"],
                    },
                    {
                      time: 250000 / 25000,
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_low-2.m4s"],
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 194834,
                height: 360,
                width: 640,
                frameRate: 25,
                codec: "avc1.42c01e",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_mid-.mp4"],
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_mid-1.m4s"],
                    },
                    {
                      time: 250000 / 25000,
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_mid-2.m4s"],
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 514793,
                height: 720,
                width: 1280,
                frameRate: 25,
                codec: "avc1.42c01f",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_hd-.mp4"],
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_hd-1.m4s"],
                    },
                    {
                      time: 250000 / 25000,
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_hd-2.m4s"],
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 770663,
                height: 1080,
                width: 1920,
                frameRate: 25,
                codec: "avc1.42c028",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_full-.mp4"],
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_full-1.m4s"],
                    },
                    {
                      time: 250000 / 25000,
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_full-2.m4s"],
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
    {
      start: 131,
      duration: 120,
      adaptations: {
        audio: [
          {
            isAudioDescription: undefined,
            language: undefined,
            normalizedLanguage: undefined,
            representations: [
              {
                bitrate: 66295,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "mp4-live-periods-aaclc-.mp4"],
                  },
                  segments: [
                    {
                      time: 120,
                      duration: 440029 / 44100,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-aaclc-13.m4s"],
                    },
                    {
                      time: 120 + (440029 / 44100),
                      duration: 440029 / 44100,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-aaclc-14.m4s"],
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
                bitrate: 50842,
                height: 180,
                width: 320,
                frameRate: 25,
                codec: "avc1.42c00d",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_low-.mp4"],
                  },
                  segments: [
                    {
                      time: 12 * (250000 / 25000),
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_low-13.m4s"],
                    },
                    {
                      time: 13 * (250000 / 25000),
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_low-14.m4s"],
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 194834,
                height: 360,
                width: 640,
                frameRate: 25,
                codec: "avc1.42c01e",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_mid-.mp4"],
                  },
                  segments: [
                    {
                      time: 12 * (250000 / 25000),
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_mid-13.m4s"],
                    },
                    {
                      time: 13 * (250000 / 25000),
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_mid-14.m4s"],
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 514793,
                height: 720,
                width: 1280,
                frameRate: 25,
                codec: "avc1.42c01f",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_hd-.mp4"],
                  },
                  segments: [
                    {
                      time: 12 * (250000 / 25000),
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_hd-13.m4s"],
                    },
                    {
                      time: 13 * (250000 / 25000),
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_hd-14.m4s"],
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 770663,
                height: 1080,
                width: 1920,
                frameRate: 25,
                codec: "avc1.42c028",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_full-.mp4"],
                  },
                  segments: [
                    {
                      time: 12 * (250000 / 25000),
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_full-13.m4s"],
                    },
                    {
                      time: 13 * (250000 / 25000),
                      duration: 250000 / 25000,
                      timescale: 1,
                      mediaURLs: [BASE_URL + "mp4-live-periods-h264bl_full-14.m4s"],
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
