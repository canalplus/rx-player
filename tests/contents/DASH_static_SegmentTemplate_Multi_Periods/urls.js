/* eslint-env node */

const path = require("path");
const flatMap = require("../utils/flatMap.js");
const patchSegmentWithTimeOffset = require("../utils/patchSegmentWithTimeOffset.js");

/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

const baseURL = "/DASH_static_SegmentTemplate_Multi_Periods/media/";

const audioSegments = [
  {
    url: baseURL + "mp4-live-periods-aaclc-.mp4",
    path: path.join(__dirname, "./media/mp4-live-periods-aaclc-.mp4"),
    content: "video/mp4",
  },
];
for (let i = 1; i <= 60; i++) {
  audioSegments.push({
    url: baseURL + `mp4-live-periods-aaclc-${i}.m4s`,
    path: path.join(__dirname, "./media/mp4-live-periods-aaclc-1.m4s"),
    postProcess(buffer) {
      return patchSegmentWithTimeOffset(new Uint8Array(buffer), (i - 1) * 440029).buffer;
    },
    content: "video/mp4",
  });
}

const videoQualities = flatMap(["low", "mid", "hd", "full"], (quality) => {
  const videoSegments = [
    {
      url: baseURL + `mp4-live-periods-h264bl_${quality}-.mp4`,
      path: path.join(__dirname, `./media/mp4-live-periods-h264bl_${quality}-.mp4`),
      content: "video/mp4",
    },
  ];
  for (let i = 1; i <= 60; i++) {
    videoSegments.push({
      url: baseURL + `mp4-live-periods-h264bl_${quality}-${i}.m4s`,
      path: path.join(__dirname, `./media/mp4-live-periods-h264bl_${quality}-1.m4s`),
      postProcess(buffer) {
        return patchSegmentWithTimeOffset(new Uint8Array(buffer), (i - 1) * 250000)
          .buffer;
      },
      content: "video/mp4",
    });
  }
  return videoSegments;
});

module.exports = [
  // Manifest
  {
    url: baseURL + "mp4-live-periods-mpd.mpd",
    path: path.join(__dirname, "./media/mp4-live-periods-mpd.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: baseURL + "discontinuities_between_periods.mpd",
    path: path.join(__dirname, "./media/discontinuities_between_periods.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: baseURL + "different_types_discontinuity.mpd",
    path: path.join(__dirname, "./media/different_types_discontinuity.mpd"),
    contentType: "application/dash+xml",
  },
  {
    url: baseURL + "end_number.mpd",
    path: path.join(__dirname, "./media/end_number.mpd"),
    contentType: "application/dash+xml",
  },
  ...audioSegments, // remaining audio segments
  ...videoQualities, // every video segments
];
