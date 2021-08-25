const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_static_SegmentBase/media/";

// Provide infos on this content under JSON.
// Useful for integration tests on DASH parsers.
export default {
  url: BASE_URL + "multi_codecs.mpd",
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
            id: "9",
            isAudioDescription: undefined,
            language: "en",
            normalizedLanguage: "eng",
            representations: [
              {
                id: "13",
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
          {
            id: "10",
            isAudioDescription: undefined,
            language: "en",
            normalizedLanguage: "eng",
            representations: [
              {
                id: "15",
                bitrate: 135879,
                codec: "opus",
                mimeType: "audio/webm",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "a-eng-0128k-libopus.webm"],
                    range: [0, 319],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            id: "5",
            isAudioDescription: undefined,
            language: "es",
            normalizedLanguage: "spa",
            representations: [
              {
                id: "6",
                bitrate: 132868,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "a-spa-0128k-aac.mp4"],
                    range: [0, 745],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            id: "6",
            isAudioDescription: undefined,
            language: "de",
            normalizedLanguage: "deu",
            representations: [
              {
                id: "7",
                bitrate: 131498,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "a-deu-0128k-aac.mp4"],
                    range: [0, 745],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            id: "7",
            isAudioDescription: undefined,
            language: "fr",
            normalizedLanguage: "fra",
            representations: [
              {
                id: "8",
                bitrate: 134256,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "a-fra-0128k-aac.mp4"],
                    range: [0, 745],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            id: "11",
            isAudioDescription: undefined,
            language: "fr",
            normalizedLanguage: "fra",
            representations: [
              {
                id: "16",
                bitrate: 111053,
                codec: "opus",
                mimeType: "audio/webm",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "a-fra-0128k-libopus.webm"],
                    range: [0, 319],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            id: "12",
            isAudioDescription: undefined,
            language: "de",
            normalizedLanguage: "deu",
            representations: [
              {
                id: "17",
                bitrate: 108452,
                codec: "opus",
                mimeType: "audio/webm",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "a-deu-0128k-libopus.webm"],
                    range: [0, 319],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            id: "13",
            isAudioDescription: undefined,
            language: "it",
            normalizedLanguage: "ita",
            representations: [
              {
                id: "18",
                bitrate: 110873,
                codec: "opus",
                mimeType: "audio/webm",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "a-ita-0128k-libopus.webm"],
                    range: [0, 319],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            id: "14",
            isAudioDescription: undefined,
            language: "it",
            normalizedLanguage: "ita",
            representations: [
              {
                id: "20",
                bitrate: 133951,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "a-ita-0128k-aac.mp4"],
                    range: [0, 745],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            id: "15",
            isAudioDescription: undefined,
            language: "es",
            normalizedLanguage: "spa",
            representations: [
              {
                id: "22",
                bitrate: 116381,
                codec: "opus",
                mimeType: "audio/webm",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "a-spa-0128k-libopus.webm"],
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
            id: "1",
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
                    mediaURLs: null,
                  },
                  segments: [
                    {
                      mediaURLs: [BASE_URL + "s-en.webvtt"],
                      time: 0,
                      duration: 60.022,
                      timescale: 1,
                    },
                  ],
                },
              },
            ],
          },
          {
            id: "0",
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
                    mediaURLs: null,
                  },
                  segments: [
                    {
                      mediaURLs: [BASE_URL + "s-el.webvtt"],
                      time: 0,
                      duration: 60.022,
                      timescale: 1,
                    },
                  ],
                },
              },
            ],
          },
          {
            id: "2",
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
                    mediaURLs: null,
                  },
                  segments: [
                    {
                      mediaURLs: [BASE_URL + "s-fr.webvtt"],
                      time: 0,
                      duration: 60.022,
                      timescale: 1,
                    },
                  ],
                },
              },
            ],
          },
          {
            id: "3",
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
                    mediaURLs: null,
                  },
                  segments: [
                    {
                      mediaURLs: [BASE_URL + "s-pt-BR.webvtt"],
                      time: 0,
                      duration: 60.022,
                      timescale: 1,
                    },
                  ],
                },
              },
            ],
          },
        ],
        video: [
          {
            id: "4",
            representations: [
              {
                id: "12",
                bitrate: 99529,
                height: 144,
                width: 192,
                frameRate: 25,
                codec: "avc1.42c01e",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0144p-0100k-libx264.mp4"],
                    range: [0, 806],
                  },
                  segments: [],
                },
              },
              {
                id: "9",
                bitrate: 397494,
                height: 240,
                width: 320,
                frameRate: 25,
                codec: "avc1.4d401f",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0240p-0400k-libx264.mp4"],
                    range: [0, 808],
                  },
                  segments: [],
                },
              },
              {
                id: "4",
                bitrate: 752174,
                height: 360,
                width: 480,
                frameRate: 25,
                codec: "avc1.4d401f",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0360p-0750k-libx264.mp4"],
                    range: [0, 809],
                  },
                  segments: [],
                },
              },
              {
                id: "5",
                bitrate: 1005796,
                height: 480,
                width: 640,
                frameRate: 25,
                codec: "avc1.4d401f",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0480p-1000k-libx264.mp4"],
                    range: [0, 808],
                  },
                  segments: [],
                },
              },
              {
                id: "10",
                bitrate: 1408303,
                height: 576,
                width: 768,
                frameRate: 25,
                codec: "avc1.4d401f",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0576p-1400k-libx264.mp4"],
                    range: [0, 807],
                  },
                  segments: [],
                },
              },
            ],
          },
          {
            id: "8",
            representations: [
              {
                id: "14",
                bitrate: 81505,
                height: 144,
                width: 192,
                frameRate: 25,
                codec: "vp9",
                mimeType: "video/webm",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0144p-0100k-vp9.webm"],
                    range: [0, 293],
                  },
                  segments: [],
                },
              },
              {
                id: "21",
                bitrate: 203461,
                height: 240,
                width: 320,
                frameRate: 25,
                codec: "vp9",
                mimeType: "video/webm",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0240p-0300k-vp9.webm"],
                    range: [0, 295],
                  },
                  segments: [],
                },
              },
              {
                id: "11",
                bitrate: 362665,
                height: 360,
                width: 480,
                frameRate: 25,
                codec: "vp9",
                mimeType: "video/webm",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0360p-0550k-vp9.webm"],
                    range: [0, 297],
                  },
                  segments: [],
                },
              },
              {
                id: "19",
                bitrate: 485260,
                height: 480,
                width: 640,
                frameRate: 25,
                codec: "vp9",
                mimeType: "video/webm",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0480p-0750k-vp9.webm"],
                    range: [0, 297],
                  },
                  segments: [],
                },
              },
              {
                id: "23",
                bitrate: 620659,
                height: 576,
                width: 768,
                frameRate: 25,
                codec: "vp9",
                mimeType: "video/webm",
                index: {
                  init: {
                    mediaURLs: [BASE_URL + "v-0576p-1000k-vp9.webm"],
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
