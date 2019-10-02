/* eslint-env node */

const path = require("path");
const flatMap = require("../utils/flatMap.js");

/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

const BASE_URL = "/Smooth_static/media/";

const audioSegments = flatMap([
  0, 20053333, 40106666, 60160000, 80000000, 100053333, 120106666, 140160000,
  160000000, 180053333, 200106666, 220160000, 240000000, 260053333, 280106666,
  300160000, 320000000, 340053333, 360106666, 380160000, 400000000, 420053333,
  440106666, 460160000, 480000000, 500053333, 520106666, 540160000, 560000000,
  580053333, 600106666, 620160000, 640000000, 660053333, 680106666, 700160000,
  720000000, 740053333,
], time => {
  return [
    {
      url: BASE_URL + `QualityLevels96000/Fragmentsaudio_und=${time}`,
      path: path.join(__dirname, `./media/Fragments(audio_und=${time}).mp4`),
      contentType: "video/mp4",
    },
    {
      url: BASE_URL + `QualityLevels96000/Fragmentsaudio_und=${time + 90000000}`,
      path: path.join(__dirname, `./media/Fragments(audio_und=${time}).mp4`),
      contentType: "video/mp4",
    },
  ];
});

const videoSegments = flatMap(
  [ [1000, 300000],
    [2000, 750000],
    [3000, 1100000],
    [4000, 1500000],
    [5000, 2100000],
    [6000, 3400000],
    [7000, 4000000],
    [8000, 5000000] ],
  ([hwProfile, quality]) => {
    const segments = flatMap([
      0, 20000000, 40000000, 60000000, 80000000, 100000000, 120000000,
      140000000, 160000000, 180000000, 200000000, 220000000, 240000000,
      260000000, 280000000, 300000000, 320000000, 340000000, 360000000,
      380000000, 400000000, 420000000, 440000000, 460000000, 480000000,
      500000000, 520000000, 540000000, 560000000, 580000000, 600000000,
      620000000, 640000000, 660000000, 680000000, 700000000, 720000000,
    ], time => {
      return [
        {
          url: BASE_URL + `QualityLevels${quality}/Fragmentsvideo=${time}`,
          path: path.join(__dirname, `./media/${quality}-Fragments(video=0).mp4`),
          contentType: "video/mp4",
        },
        {
          url: BASE_URL + `QualityLevels${quality}/Fragmentsvideo=${time + 90000000}`,
          path: path.join(__dirname, `./media/${quality}-Fragments(video=0).mp4`),
          contentType: "video/mp4",
        },
        {
          url: BASE_URL + `QualityLevels${quality},hardwareProfile=${hwProfile}/Fragmentsvideo=${time}`,
          path: path.join(__dirname, `./media/${quality}-Fragments(video=0).mp4`),
          contentType: "video/mp4",
        },
      ];
    });

    segments.push({
      url: BASE_URL + `QualityLevels${quality}/Fragmentsvideo=740000000`,
      path: path.join(__dirname, `./media/${quality}-Fragments(video=740000000).mp4`),
      contentType: "video/mp4",
    }, {
      url: BASE_URL + `QualityLevels${quality},hardwareProfile=${hwProfile}/Fragmentsvideo=740000000`,
      path: path.join(__dirname, `./media/${quality}-Fragments(video=740000000).mp4`),
      contentType: "video/mp4",
    });

    return segments;
  });

module.exports = [
  {
    url: BASE_URL + "Manifest_Regular.xml",
    path: path.join(__dirname, "./media/Manifest_Regular.xml"),
    contentType: "text/xml",
  },
  {
    url: BASE_URL + "Manifest_Not_Starting_at_0.xml",
    path: path.join(__dirname, "./media/Manifest_Not_Starting_at_0.xml"),
    contentType: "text/xml",
  },
  {
    url: BASE_URL + "Manifest_Empty_Text_Track.xml",
    path: path.join(__dirname, "./media/Manifest_Empty_Text_Track.xml"),
    contentType: "text/xml",
  },
  {
    url: BASE_URL + "Manifest_Custom_Attributes.xml",
    path: path.join(__dirname, "./media/Manifest_Custom_Attributes.xml"),
    contentType: "text/xml",
  },
  ...audioSegments,
  ...videoSegments,
];
