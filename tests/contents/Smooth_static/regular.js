const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/Smooth_static/media/";

const manifestInfos = {
  url: BASE_URL + "Manifest_Regular.xml",
  transport: "smooth",
  isDynamic: false,
  isLive: false,
  duration: 75,
  minimumPosition: 0,
  maximumPosition: 75,
  availabilityStartTime: 0,
  periods: [
    {
      start: 0,
      duration: 75,
      adaptations: {
        audio: [
          {
            isAudioDescription: undefined,
            language: "UND",
            normalizedLanguage: "UND",
            representations: [
              {
                bitrate: 96000,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: null,
                  segments: [
                    {
                      time: 0,
                      timescale: 10000000,
                      duration: 20053333,
                      mediaURL: BASE_URL + "QualityLevels96000/Fragmentsaudio_und=0",
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
            language: "und",
            normalizedLanguage: "und",
            representations: [
              {
                bitrate: 300000,
                height: 224,
                width: 400,
                codec: "avc1.42800d",
                mimeType: "video/mp4",
                index: {
                  init: null,
                  segments: [
                    {
                      time: 0,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: BASE_URL + "QualityLevels300000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                bitrate: 750000,
                height: 270,
                width: 480,
                codec: "avc1.428015",
                mimeType: "video/mp4",
                index: {
                  init: null,
                  segments: [
                    {
                      time: 0,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: BASE_URL + "QualityLevels750000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                bitrate: 1100000,
                height: 360,
                width: 640,
                codec: "avc1.4d401e",
                mimeType: "video/mp4",
                index: {
                  init: null,
                  segments: [
                    {
                      time: 0,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: BASE_URL + "QualityLevels1100000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                bitrate: 1500000,
                height: 360,
                width: 640,
                codec: "avc1.4d401e",
                mimeType: "video/mp4",
                index: {
                  init: null,
                  segments: [
                    {
                      time: 0,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: BASE_URL + "QualityLevels1500000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                bitrate: 2100000,
                height: 540,
                width: 960,
                codec: "avc1.4d401f",
                mimeType: "video/mp4",
                index: {
                  init: null,
                  segments: [
                    {
                      time: 0,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: BASE_URL + "QualityLevels2100000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                bitrate: 3400000,
                height: 720,
                width: 1280,
                codec: "avc1.64001f",
                mimeType: "video/mp4",
                index: {
                  init: null,
                  segments: [
                    {
                      time: 0,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: BASE_URL + "QualityLevels3400000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                bitrate: 4000000,
                height: 720,
                width: 1280,
                codec: "avc1.64001f",
                mimeType: "video/mp4",
                index: {
                  init: null,
                  segments: [
                    {
                      time: 0,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: BASE_URL + "QualityLevels4000000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                bitrate: 5000000,
                height: 1080,
                width: 1920,
                codec: "avc1.640029",
                mimeType: "video/mp4",
                index: {
                  init: null,
                  segments: [
                    {
                      time: 0,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: BASE_URL + "QualityLevels5000000/Fragmentsvideo=0",
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

export { manifestInfos };
