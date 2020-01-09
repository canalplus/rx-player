const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_dynamic_UTCTimings/media/";

const manifestInfos = {
  url: BASE_URL + "Manifest_with_http.mpd",
  transport: "dash",
  isDynamic: true,
  isLive: true,
  availabilityStartTime: 0,
  periods: [
    {
      adaptations: {
        audio: [
          {
            isAudioDescription: false,
            language: "eng",
            normalizedLanguage: "eng",
            representations: [
              {
                bitrate: 48000,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "A48/init.mp4",
                  },
                  segments: [
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
                bitrate: 300000,
                height: 360,
                width: 640,
                codec: "avc1.64001e",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: BASE_URL + "V300/init.mp4",
                  },
                  segments: [
                  ],
                  // ...
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
