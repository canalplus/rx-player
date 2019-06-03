const BASE_URL = "https://vm2.dashif.org/livesim-dev/periods_1/testpic_2s/";

// Provide infos on this content under JSON.
// Useful for integration tests on DASH parsers.
export default {
  url: BASE_URL + "Manifest.mpd",
  transport: "dash",
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
