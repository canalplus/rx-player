const baseURL = "https://storage.googleapis.com/shaka-demo-assets/angel-one/";

function getByteRangedData(rangeHeader, dataAB) {
  const data = new Uint8Array(dataAB);
  if (!rangeHeader || !rangeHeader.startsWith("bytes=")) {
    return new Uint8Array(data).buffer;
  }

  const rangesStr = rangeHeader.substr(6).split("-");
  if (
    rangesStr[0] != "" && Number.isNaN(+rangesStr[0]) ||
    rangesStr[1] != "" && Number.isNaN(+rangesStr[1])
  ) {
    throw new Error("Invalid range request");
  }
  const rangesNb = rangesStr.map(x => x === "" ? null : +x);

  if (rangesNb[1] <= rangesNb[0]) {
    return new Uint8Array([]).buffer;
  }
  if (rangesNb[0] == null || rangesNb === 0) {
    if (rangesNb[1] == null) {
      return new Uint8Array(data).buffer;
    }
    return new Uint8Array(data.subarray(0, rangesNb[1] + 1)).buffer;
  }

  if (rangesNb[1] == null) {
    return new Uint8Array(data.subarray(rangesNb[0])).buffer;
  }

  return new Uint8Array(data.subarray(rangesNb[0], rangesNb[1] + 1)).buffer;
}

const mp4AudioSegments = ["deu", "eng", "fra", "ita", "spa"].map((lang) => {
  const data = require(`arraybuffer-loader!./media/a-${lang}-0128k-aac.mp4`);
  return {
    url: baseURL + "a-" + lang + "-0128k-aac.mp4",
    data: (headers) => getByteRangedData(headers.Range, data),
    contentType: "audio/mp4",
  };
});

const webmAudioSegments = ["deu", "eng", "fra", "ita", "spa"].map((lang) => {
  const data = require(`arraybuffer-loader!./media/a-${lang}-0128k-libopus.webm`);
  return {
    url: baseURL + "a-" + lang + "-0128k-libopus.webm",
    data: (headers) => getByteRangedData(headers.range, data),
    contentType: "audio/webm",
  };
});

const mp4VideoSegments = [
  "0144p-0100k", "0240p-0400k", "0360p-0750k", "0480p-1000k", "0576p-1400k",
].map(quality => {
  const data = require(`arraybuffer-loader!./media/v-${quality}-libx264.mp4`);
  return {
    url: baseURL + "v-" + quality + "-libx264.mp4",
    data: (headers) => getByteRangedData(headers.range, data),
    contentType: "video/mp4",
  };
});

const webmVideoSegments = [
  "0144p-0100k", "0240p-0300k", "0360p-0550k", "0480p-0750k", "0576p-1000k",
].map(quality => {
  const data = require(`arraybuffer-loader!./media/v-${quality}-vp9.webm`);
  return {
    url: baseURL + "v-" + quality + "-vp9.webm",
    data: (headers) => getByteRangedData(headers.range, data),
    contentType: "video/mp4",
  };
});

const textSegments = ["el", "en", "fr"].map(lang => {
  const data = require(`arraybuffer-loader!./media/s-${lang}.webvtt`);
  return {
    url: baseURL + "s-" + lang + ".webvtt",
    data,
    contentType: "text/plain",
  };
});

const URLs = [
  // Manifest
  {
    url: baseURL + "dash.mpd",
    data: require("raw-loader!./media/dash.mpd"),
    contentType: "application/dash+xml",
  },
  ...mp4AudioSegments,
  ...webmAudioSegments,
  ...mp4VideoSegments,
  ...webmVideoSegments,
  ...textSegments,
];

const manifestInfos = {
  url: baseURL + "dash.mpd",
  transport: "dash",
  isLive: false,
  duration: 60.022,
  minimumPosition: 0,
  maximumPosition: 60.022,
  timeShiftBufferDepth: undefined,
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/a-spa-0128k-aac.mp4",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/a-deu-0128k-aac.mp4",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/a-fra-0128k-aac.mp4",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/a-eng-0128k-aac.mp4",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/a-eng-0128k-libopus.webm",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/a-fra-0128k-libopus.webm",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/a-deu-0128k-libopus.webm",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/a-ita-0128k-libopus.webm",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/a-ita-0128k-aac.mp4",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/a-spa-0128k-libopus.webm",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/s-el.webvtt",
                  },
                  segments: [
                    {
                      mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/s-el.webvtt",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/s-en.webvtt",
                  },
                  segments: [
                    {
                      mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/s-en.webvtt",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/s-fr.webvtt",
                  },
                  segments: [
                    {
                      mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/s-fr.webvtt",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/s-pt-BR.webvtt",
                  },
                  segments: [
                    {
                      mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/s-pt-BR.webvtt",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/v-0144p-0100k-libx264.mp4",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/v-0240p-0400k-libx264.mp4",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/v-0360p-0750k-libx264.mp4",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/v-0480p-1000k-libx264.mp4",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/v-0576p-1400k-libx264.mp4",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/v-0144p-0100k-vp9.webm",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/v-0240p-0300k-vp9.webm",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/v-0360p-0550k-vp9.webm",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/v-0480p-0750k-vp9.webm",
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
                    mediaURL: "https://storage.googleapis.com/shaka-demo-assets/angel-one/v-0576p-1000k-vp9.webm",
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

export {
  URLs,
  manifestInfos,
};
