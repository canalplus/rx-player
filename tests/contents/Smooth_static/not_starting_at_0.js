/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

import flatMap from "../../utils/flatMap.js";
const baseURL = "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/";

const audioSegments = [
  0, 20053333, 40106666, 60160000, 80000000, 100053333, 120106666, 140160000,
  160000000, 180053333, 200106666, 220160000, 240000000, 260053333, 280106666,
  300160000, 320000000, 340053333, 360106666, 380160000, 400000000, 420053333,
  440106666, 460160000, 480000000, 500053333, 520106666, 540160000, 560000000,
  580053333, 600106666, 620160000, 640000000, 660053333, 680106666, 700160000,
  720000000, 740053333,
].map(time => {
  const data = require(`arraybuffer-loader!./media/Fragments(audio_und=${time}).mp4`);
  return {
    // TODO Open Sinon issue with malformed RegExp from strings
    url: baseURL + `QualityLevels96000/Fragmentsaudio_und=${time + 90000000}`,
    data: () => data.slice(),
    contentType: "video/mp4",
  };
});

const videoSegments = flatMap(
  [300000, 750000, 1100000, 1500000, 2100000, 3400000, 4000000, 5000000],
  quality => {
    const segments = [
      0, 20000000, 40000000, 60000000, 80000000, 100000000, 120000000,
      140000000, 160000000, 180000000, 200000000, 220000000, 240000000,
      260000000, 280000000, 300000000, 320000000, 340000000, 360000000,
      380000000, 400000000, 420000000, 440000000, 460000000, 480000000,
      500000000, 520000000, 540000000, 560000000, 580000000, 600000000,
      620000000, 640000000, 660000000, 680000000, 700000000, 720000000,
    ].map(time => {
      const data =
        require(`arraybuffer-loader!./media/${quality}-Fragments(video=0).mp4`);
      return {
        // TODO Open Sinon issue with malformed RegExp from strings
        url: baseURL + `QualityLevels${quality}/Fragmentsvideo=${time + 90000000}`,
        data: () => data.slice(),
        contentType: "video/mp4",
      };
    });

    segments.push({
      // TODO Open Sinon issue with malformed RegExp from strings
      url: baseURL + `QualityLevels${quality}/Fragmentsvideo=740000000`,
      data: require(`arraybuffer-loader!./media/${quality}-Fragments(video=740000000).mp4`),
      contentType: "video/mp4",
    });

    return segments;
  });

const URLs = [
  {
    url: baseURL + "Manifest",
    data: require("raw-loader!./media/Manifest_Not_Starting_at_0.xml").default,
    contentType: "text/xml",
  },
  ...audioSegments,
  ...videoSegments,
];

const manifestInfos = {
  url: baseURL + "Manifest",
  transport: "smooth",
  isLive: false,
  duration: 75.0079999 + 9,
  minimumPosition: 9,
  maximumPosition: 75.0079999 + 9,
  availabilityStartTime: 0,
  periods: [
    {
      start: 0,
      duration: 75.0079999 + 9,
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
                      time: 90000000,
                      timescale: 10000000,
                      duration: 20053333,
                      mediaURL: "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/QualityLevels96000/Fragmentsaudio_und=90000000",
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
                      time: 90000000,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/QualityLevels300000/Fragmentsvideo=90000000",
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
                      time: 90000000,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/QualityLevels750000/Fragmentsvideo=90000000",
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
                      time: 90000000,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/QualityLevels1100000/Fragmentsvideo=90000000",
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
                      time: 90000000,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/QualityLevels1500000/Fragmentsvideo=90000000",
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
                      time: 90000000,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/QualityLevels2100000/Fragmentsvideo=90000000",
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
                      time: 90000000,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/QualityLevels3400000/Fragmentsvideo=90000000",
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
                      time: 90000000,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/QualityLevels4000000/Fragmentsvideo=90000000",
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
                      time: 90000000,
                      timescale: 10000000,
                      duration: 20000000,
                      mediaURL: "http://hss-vod-aka-test.canal-bis.com/ondemand/test/bif/index.ism/QualityLevels5000000/Fragmentsvideo=90000000",
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

export {
  URLs,
  manifestInfos,
};
