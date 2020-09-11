const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_static_broken_cenc_in_MPD/media/";

export default {
  url: BASE_URL + "broken_cenc.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  duration: 900,
  minimumPosition: 0,
  maximumPosition: 900,
  availabilityStartTime: 0,
  periods: [
    {
      start: 0,
      duration: 900,
      adaptations: {
        audio: [
          { isAudioDescription: undefined,
            language: "fre",
            normalizedLanguage: "fra",
            representations: [
              { bitrate: 260700,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: { init: { mediaURLs: [BASE_URL + "audio.mp4"] },
                         segments: [] } },
            ] },
        ],
        video: [
          {
            representations: [
              { bitrate: 2102584,
                height: 540,
                width: 960,
                codec: "avc1.4D401F",
                mimeType: "video/mp4",
                index: { init: { mediaURLs: [BASE_URL + "video.mp4"] },
                         segments: [] } },
            ],
          },
        ],
      },
    },
  ],
};
