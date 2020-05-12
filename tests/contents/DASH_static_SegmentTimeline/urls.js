/* eslint-env node */
/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

const path = require("path");
const flatMap = require("../utils/flatMap.js");
const patchSegmentWithTimeOffset = require("../utils/patchSegmentWithTimeOffset.js");

const BASE_URL = "/DASH_static_SegmentTimeline/media/";

const audioSegments = [
  0, 177341, 353469, 530621, 706749, 883901, 1060029, 1236157, 1413309,
  1589437, 1766589, 1942717, 2119869, 2295997, 2472125, 2649277, 2825405,
  3002557, 3178685, 3355837, 3531965, 3709117, 3885245, 4061373, 4238525,
  4414653,
].map(time => {
  return {
    url: BASE_URL + `dash/ateam-audio=128000-${time}.dash`,
    path: path.join(__dirname, `./media/dash/ateam-audio=128000-${time}.dash`),
    contentType: "audio/mp4",
  };
});

const textSegments = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(time => {
  return {
    url: BASE_URL + `dash/ateam-text-${time}.dash`,
    path: path.join(__dirname, `./media/dash/ateam-text-${time}.dash`),
    contentType: "text/plain",
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
        url: BASE_URL + `dash/ateam-video=${quality}-${time / 90}.dash`,
        path: path.join(__dirname, `media/dash/ateam-video=${quality}-0.dash`),
        postProcess(base) {
          return patchSegmentWithTimeOffset(base, time).buffer;
        },
        contentType: "video/mp4",
      };
    });

    // initialization segment
    segments.push({
      url: BASE_URL + `dash/ateam-video=${quality}.dash`,
      path: path.join(__dirname, `media/dash/ateam-video=${quality}.dash`),
      contentType: "video/mp4",
    });

    // last segment (different duration)
    segments.push({
      url: BASE_URL + `dash/ateam-video=${quality}-900000.dash`,
      path: path.join(__dirname, `media/dash/ateam-video=${quality}-9009000.dash`),
      contentType: "video/mp4",
    });

    return segments;
  });

module.exports = [
  // Manifest
  {
    url: BASE_URL + "ateam.mpd",
    path: path.join(__dirname, "media/ateam.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "not_starting_at_0.mpd",
    path: path.join(__dirname, "media/not_starting_at_0.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: BASE_URL + "multi-AdaptationSets.mpd",
    path: path.join(__dirname, "media/multi-AdaptationSets.mpd"),
    contentType: "application/dash+xml",
  },

  // Audio initialization segment
  {
    url: BASE_URL + "dash/ateam-audio=128000.dash",
    path: path.join(__dirname, "media/dash/ateam-audio=128000.dash"),
    contentType: "audio/mp4",
  },
  ...audioSegments, // remaining audio segments
  ...textSegments, // every text segments
  ...videoQualities, // every video segments
];
