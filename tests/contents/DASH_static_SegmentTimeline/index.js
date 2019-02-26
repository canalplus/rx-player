/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

import flatMap from "../../utils/flatMap.js";
import patchSegmentWithTimeOffset from "../../utils/patchSegmentWithTimeOffset.js";

const baseURL = "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/";

const audioSegments = [
  0, 177341, 353469, 530621, 706749, 883901, 1060029, 1236157, 1413309,
  1589437, 1766589, 1942717, 2119869, 2295997, 2472125, 2649277, 2825405,
  3002557, 3178685, 3355837, 3531965, 3709117, 3885245, 4061373, 4238525,
  4414653,
].map(time => {
  return {
    url: baseURL + `dash/ateam-audio=128000-${time}.dash`,
    data: require(`arraybuffer-loader!./media/ateam-audio=128000-${time}.dash`),
    contentType: "audio/mp4",
  };
});

const videoQualities = flatMap(
  [400000, 795000, 1193000, 1996000],
  quality => {
    const segments = [
      0, 360360, 720720, 1081080, 1441440, 1801800, 2162160, 2522520, 2882880,
      3243240, 3603600, 3963960, 4324320, 4684680, 5045040, 5405400, 5765760,
      6126120, 6486480, 6846840, 7207200, 7567560, 7927920, 8288280, 8648640,
      9009000,
    ].map(time => {
      return {
        url: baseURL + `dash/ateam-video=${quality}-${time / 90}.dash`,
        data: () => {
          const base = new Uint8Array(
            require(`arraybuffer-loader!./media/ateam-video=${quality}-0.dash`)
          );
          return patchSegmentWithTimeOffset(base, time).buffer;
        },
        contentType: "video/mp4",
      };
    });

    // initialization segment
    segments.push({
      url: baseURL + `dash/ateam-video=${quality}.dash`,
      data: require(`arraybuffer-loader!./media/ateam-video=${quality}.dash`),
      contentType: "video/mp4",
    });

    // last segment (different duration)
    segments.push({
      url: baseURL + `dash/ateam-video=${quality}-900000.dash`,
      data: require(`arraybuffer-loader!./media/ateam-video=${quality}-9009000.dash`),
      contentType: "video/mp4",
    });

    return segments;
  });

const URLs = [
  // Manifest
  {
    url: baseURL + "ateam.mpd",
    data: require("raw-loader!./media/ateam.mpd"),
    contentType: "application/dash+xml",
  },

  // Audio initialization segment
  {
    url: baseURL + "dash/ateam-audio=128000.dash",
    data: require("arraybuffer-loader!./media/ateam-audio=128000.dash"),
    contentType: "audio/mp4",
  },
  ...audioSegments, // remaining audio segments
  ...videoQualities, // every video segments
];

const manifestInfos = {
  url: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/ateam.mpd",
  transport: "dash",
  isLive: false,
  duration: 101.568367,
  timeShiftBufferDepth: undefined,
  availabilityStartTime: 0,
  periods: [
    {
      start: 0,
      duration: 101.568367,
      adaptations: {
        audio: [
          {
            isAudioDescription: undefined,
            language: undefined,
            normalizedLanguage: undefined,
            representations: [
              {
                bitrate: 128000,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-audio=128000.dash",
                  },
                  segments: [
                    {
                      time: 0,
                      timescale: 44100,
                      duration: 177341,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-audio=128000-0.dash",
                    },
                    {
                      time: 177341,
                      timescale: 44100,
                      duration: 176128,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-audio=128000-177341.dash",
                    },
                    {
                      time: 353469,
                      timescale: 44100,
                      duration: 177152,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-audio=128000-353469.dash",
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
                bitrate: 400000,
                height: 124,
                width: 220,
                codec: "avc1.42C014",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=400000.dash",
                  },
                  segments: [
                    {
                      time: 0,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=400000-0.dash",
                    },
                    {
                      time: 4004,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=400000-360360.dash",
                    },
                    {
                      time: 8008,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=400000-720720.dash",
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 795000,
                height: 208,
                width: 368,
                codec: "avc1.42C014",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=795000.dash",
                  },
                  segments: [
                    {
                      time: 0,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=795000-0.dash",
                    },
                    {
                      time: 4004,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=795000-360360.dash",
                    },
                    {
                      time: 8008,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=795000-720720.dash",
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 1193000,
                height: 432,
                width: 768,
                codec: "avc1.42C01E",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=1193000.dash",
                  },
                  segments: [
                    {
                      time: 0,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=1193000-0.dash",
                    },
                    {
                      time: 4004,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=1193000-360360.dash",
                    },
                    {
                      time: 8008,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=1193000-720720.dash",
                    },
                    // ...
                  ],
                },
              },

              {
                bitrate: 1996000,
                height: 944,
                width: 1680,
                codec: "avc1.640028",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=1996000.dash",
                  },
                  segments: [
                    {
                      time: 0,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=1996000-0.dash",
                    },
                    {
                      time: 4004,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=1996000-360360.dash",
                    },
                    {
                      time: 8008,
                      timescale: 1000,
                      duration: 4004,
                      mediaURL: "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/dash/ateam-video=1996000-720720.dash",
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
