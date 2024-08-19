const BASE_URL =
  "http://" +
  // eslint-disable-next-line no-undef
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  // eslint-disable-next-line no-undef
  __TEST_CONTENT_SERVER__.PORT +
  "/Smooth_static/media/";

const manifestInfos = {
  url: BASE_URL + "Manifest_Custom_Attributes.xml",
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
            id: "audio_UND",
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
                      duration: 20053333 / 10000000,
                      timescale: 1,
                      url: "QualityLevels96000/Fragmentsaudio_und=0",
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
            id: "video_und",
            language: "und",
            normalizedLanguage: "und",
            representations: [
              {
                id: "video_und_video-video/mp4-avc1.42800d-300000",
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
                      duration: 20000000 / 10000000,
                      timescale: 1,
                      url: "QualityLevels300000,hardwareProfile=1000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                id: "video_und_video-video/mp4-avc1.428015-750000",
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
                      duration: 20000000 / 10000000,
                      timescale: 1,
                      url: "QualityLevels750000,hardwareProfile=2000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                id: "video_und_video-video/mp4-avc1.4d401e-1100000",
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
                      duration: 20000000 / 10000000,
                      timescale: 1,
                      url: "QualityLevels1100000,hardwareProfile=3000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                id: "video_und_video-video/mp4-avc1.4d401e-1500000",
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
                      duration: 20000000 / 10000000,
                      timescale: 1,
                      url: "QualityLevels1500000,hardwareProfile=4000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                id: "video_und_video-video/mp4-avc1.4d401f-2100000",
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
                      duration: 20000000 / 10000000,
                      timescale: 1,
                      url: "QualityLevels2100000,hardwareProfile=5000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                id: "video_und_video-video/mp4-avc1.64001f-3400000",
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
                      duration: 20000000 / 10000000,
                      timescale: 1,
                      url: "QualityLevels3400000,hardwareProfile=6000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                id: "video_und_video-video/mp4-avc1.64001f-4000000",
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
                      duration: 20000000 / 10000000,
                      timescale: 1,
                      url: "QualityLevels4000000,hardwareProfile=7000/Fragmentsvideo=0",
                    },
                    // ...
                  ],
                },
              },
              {
                id: "video_und_video-video/mp4-avc1.640029-5000000",
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
                      duration: 20000000 / 10000000,
                      timescale: 1,
                      url: "QualityLevels5000000,hardwareProfile=8000/Fragmentsvideo=0",
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
