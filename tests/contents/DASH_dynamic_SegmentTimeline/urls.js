/* eslint-env node */

const path = require("path");

/**
 * Only init data for audio and video for now.
 * One single bitrate, english audio.
 */

const Manifest_URL = {
  url: "/DASH_dynamic_SegmentTimeline/media/Manifest.mpd",
  path: path.join(__dirname, "./media/Manifest.mpd"),
  contentType: "application/dash+xml",
};

/**
 * URLs for which the request should be stubbed.
 * @type {Array.<Object>}
 */
module.exports = [
  // manifest
  Manifest_URL,

  // Audio initialization segment
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/init.mp4",
    path: path.join(__dirname, "./media/A48/init.mp4"),
    contentType: "audio/mp4",
  },

  // Audio segments
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/t73320384978944.m4s",
    path: path.join(__dirname, "./media/A48/t73320384978944.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/t73320385267712.m4s",
    path: path.join(__dirname, "./media/A48/t73320385267712.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/t73320385556480.m4s",
    path: path.join(__dirname, "./media/A48/t73320385556480.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/t73320385561600.m4s",
    path: path.join(__dirname, "./media/A48/t73320385561600.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/t73320385844224.m4s",
    path: path.join(__dirname, "./media/A48/t73320385844224.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/t73320385849344.m4s",
    path: path.join(__dirname, "./media/A48/t73320385849344.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/t73320386132992.m4s",
    path: path.join(__dirname, "./media/A48/t73320386132992.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/t73320386138112.m4s",
    path: path.join(__dirname, "./media/A48/t73320386138112.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/t73320386421760.m4s",
    path: path.join(__dirname, "./media/A48/t73320386421760.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/A48/t73320386426880.m4s",
    path: path.join(__dirname, "./media/A48/t73320386426880.m4s"),
    contentType: "audio/mp4",
  },

  // Video initialization segment
  {
    url: "/DASH_dynamic_SegmentTimeline/media/V300/init.mp4",
    path: path.join(__dirname, "./media/V300/init.mp4"),
    contentType: "video/mp4",
  },

  // Video Segments
  {
    url: "/DASH_dynamic_SegmentTimeline/media/V300/t137475721800000.m4s",
    path: path.join(__dirname, "./media/V300/t137475721800000.m4s"),
    contentType: "video/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/V300/t137475722340000.m4s",
    path: path.join(__dirname, "./media/V300/t137475722340000.m4s"),
    contentType: "video/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/V300/t137475722880000.m4s",
    path: path.join(__dirname, "./media/V300/t137475722880000.m4s"),
    contentType: "video/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/V300/t137475723420000.m4s",
    path: path.join(__dirname, "./media/V300/t137475723420000.m4s"),
    contentType: "video/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/V300/t137475723960000.m4s",
    path: path.join(__dirname, "./media/V300/t137475723960000.m4s"),
    contentType: "video/mp4",
  },
  {
    url: "/DASH_dynamic_SegmentTimeline/media/V300/t137475724500000.m4s",
    path: path.join(__dirname, "./media/V300/t137475724500000.m4s"),
    contentType: "video/mp4",
  },
];
