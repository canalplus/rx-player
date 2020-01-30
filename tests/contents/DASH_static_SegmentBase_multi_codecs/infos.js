const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_static_SegmentBase_multi_codecs/media/";

// Provide infos on this content under JSON.
// Useful for integration tests on DASH parsers.
export default {
  url: BASE_URL + "dash.mpd",
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
            language: "es",
            normalizedLanguage: "spa",
            representations: [
              {
                bitrate: 132868,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "a-spa-0128k-aac.mp4",
                    range: [0, 745],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            isAudioDescription: undefined,
            language: "de",
            normalizedLanguage: "deu",
            representations: [
              {
                bitrate: 131498,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "a-deu-0128k-aac.mp4",
                    range: [0, 745],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            isAudioDescription: undefined,
            language: "fr",
            normalizedLanguage: "fra",
            representations: [
              {
                bitrate: 134256,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "a-fra-0128k-aac.mp4",
                    range: [0, 745],
                  },
                  segments: [],
                },
              },
            ],
          },
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
                    mediaURL: BASE_URL + "a-eng-0128k-aac.mp4",
                    range: [0, 745],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            isAudioDescription: undefined,
            language: "en",
            normalizedLanguage: "eng",
            representations: [
              {
                bitrate: 135879,
                codec: "opus",
                mimeType: "audio/webm",
                index: {
                  init: {
                    mediaURL: BASE_URL + "a-eng-0128k-libopus.webm",
                    range: [0, 319],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            isAudioDescription: undefined,
            language: "fr",
            normalizedLanguage: "fra",
            representations: [
              {
                bitrate: 111053,
                codec: "opus",
                mimeType: "audio/webm",
                index: {
                  init: {
                    mediaURL: BASE_URL + "a-fra-0128k-libopus.webm",
                    range: [0, 319],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            isAudioDescription: undefined,
            language: "de",
            normalizedLanguage: "deu",
            representations: [
              {
                bitrate: 108452,
                codec: "opus",
                mimeType: "audio/webm",
                index: {
                  init: {
                    mediaURL: BASE_URL + "a-deu-0128k-libopus.webm",
                    range: [0, 319],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            isAudioDescription: undefined,
            language: "it",
            normalizedLanguage: "ita",
            representations: [
              {
                bitrate: 110873,
                codec: "opus",
                mimeType: "audio/webm",
                index: {
                  init: {
                    mediaURL: BASE_URL + "a-ita-0128k-libopus.webm",
                    range: [0, 319],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            isAudioDescription: undefined,
            language: "it",
            normalizedLanguage: "ita",
            representations: [
              {
                bitrate: 133951,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "a-ita-0128k-aac.mp4",
                    range: [0, 745],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            isAudioDescription: undefined,
            language: "es",
            normalizedLanguage: "spa",
            representations: [
              {
                bitrate: 116381,
                codec: "opus",
                mimeType: "audio/webm",
                index: {
                  init: {
                    mediaURL: BASE_URL + "a-spa-0128k-libopus.webm",
                    range: [0, 319],
                  },
                  segments: [],
                },
              },
            ],
          },
        ],
        text: [
          {
            isClosedCaption: undefined,
            language: "el",
            normalizedLanguage: "ell",
            representations: [
              {
                bitrate: 256,
                codec: undefined,
                mimeType: "text/vtt",
                index: {
                  init: {
                    mediaURL: BASE_URL + "s-el.webvtt",
                  },
                  segments: [
                    {
                      mediaURL: BASE_URL + "s-el.webvtt",
                      time: 0,
                      timescale: 1,
                      duration: 60.022,
                    },
                  ],
                },
              },
            ],
          },
          {
            isClosedCaption: undefined,
            language: "en",
            normalizedLanguage: "eng",
            representations: [
              {
                bitrate: 256,
                codec: undefined,
                mimeType: "text/vtt",
                index: {
                  init: {
                    mediaURL: BASE_URL + "s-en.webvtt",
                  },
                  segments: [
                    {
                      mediaURL: BASE_URL + "s-en.webvtt",
                      time: 0,
                      timescale: 1,
                      duration: 60.022,
                    },
                  ],
                },
              },
            ],
          },
          {
            isClosedCaption: undefined,
            language: "fr",
            normalizedLanguage: "fra",
            representations: [
              {
                bitrate: 256,
                codec: undefined,
                mimeType: "text/vtt",
                index: {
                  init: {
                    mediaURL: BASE_URL + "s-fr.webvtt",
                  },
                  segments: [
                    {
                      mediaURL: BASE_URL + "s-fr.webvtt",
                      time: 0,
                      timescale: 1,
                      duration: 60.022,
                    },
                  ],
                },
              },
            ],
          },
          {
            isClosedCaption: undefined,
            language: "pt-BR",
            normalizedLanguage: "por",
            representations: [
              {
                bitrate: 256,
                codec: undefined,
                mimeType: "text/vtt",
                index: {
                  init: {
                    mediaURL: BASE_URL + "s-pt-BR.webvtt",
                  },
                  segments: [
                    {
                      mediaURL: BASE_URL + "s-pt-BR.webvtt",
                      time: 0,
                      timescale: 1,
                      duration: 60.022,
                    },
                  ],
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
                frameRate: "12800/512",
                codec: "avc1.42c01e",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "v-0144p-0100k-libx264.mp4",
                    range: [0, 806],
                  },
                  segments: [],
                },
              },
              {
                bitrate: 397494,
                height: 240,
                width: 320,
                frameRate: "12800/512",
                codec: "avc1.4d401f",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "v-0240p-0400k-libx264.mp4",
                    range: [0, 808],
                  },
                  segments: [],
                },
              },
              {
                bitrate: 752174,
                height: 360,
                width: 480,
                frameRate: "12800/512",
                codec: "avc1.4d401f",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "v-0360p-0750k-libx264.mp4",
                    range: [0, 809],
                  },
                  segments: [],
                },
              },
              {
                bitrate: 1005796,
                height: 480,
                width: 640,
                frameRate: "12800/512",
                codec: "avc1.4d401f",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "v-0480p-1000k-libx264.mp4",
                    range: [0, 808],
                  },
                  segments: [],
                },
              },
              {
                bitrate: 1408303,
                height: 576,
                width: 768,
                frameRate: "12800/512",
                codec: "avc1.4d401f",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "v-0576p-1400k-libx264.mp4",
                    range: [0, 807],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            representations: [
              {
                bitrate: 81505,
                height: 144,
                width: 192,
                frameRate: "1000000/40000",
                codec: "vp9",
                mimeType: "video/webm",
                index: {
                  init: {
                    mediaURL: BASE_URL + "v-0144p-0100k-vp9.webm",
                    range: [0, 293],
                  },
                  segments: [],
                },
              },
              {
                bitrate: 203461,
                height: 240,
                width: 320,
                frameRate: "1000000/40000",
                codec: "vp9",
                mimeType: "video/webm",
                index: {
                  init: {
                    mediaURL: BASE_URL + "v-0240p-0300k-vp9.webm",
                    range: [0, 295],
                  },
                  segments: [],
                },
              },
              {
                bitrate: 362665,
                height: 360,
                width: 480,
                frameRate: "1000000/40000",
                codec: "vp9",
                mimeType: "video/webm",
                index: {
                  init: {
                    mediaURL: BASE_URL + "v-0360p-0550k-vp9.webm",
                    range: [0, 297],
                  },
                  segments: [],
                },
              },
              {
                bitrate: 485260,
                height: 480,
                width: 640,
                frameRate: "1000000/40000",
                codec: "vp9",
                mimeType: "video/webm",
                index: {
                  init: {
                    mediaURL: BASE_URL + "v-0480p-0750k-vp9.webm",
                    range: [0, 297],
                  },
                  segments: [],
                },
              },
              {
                bitrate: 620659,
                height: 576,
                width: 768,
                frameRate: "1000000/40000",
                codec: "vp9",
                mimeType: "video/webm",
                index: {
                  init: {
                    mediaURL: BASE_URL + "v-0576p-1000k-vp9.webm",
                    range: [0, 297],
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
