/**
 * Only init data for audio and video for now.
 * One single bitrate, english audio.
 */

const Manifest_URL = {
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  data: require("raw-loader!./media/Manifest.mpd").default,
  contentType: "application/dash+xml",
};

/**
 * URLs for which the request should be stubbed.
 * @type {Array.<Object>}
 */
export default [
  // manifest
  Manifest_URL,

  // Audio initialization segment
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/init.mp4",
    data: require("raw-loader!./media/A48/init.mp4").default,
    contentType: "audio/mp4",
  },

  // Audio segments
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320384978944.m4s",
    data: require("raw-loader!./media/A48/t73320384978944.m4s").default,
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385267712.m4s",
    data: require("raw-loader!./media/A48/t73320385267712.m4s").default,
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385556480.m4s",
    data: require("raw-loader!./media/A48/t73320385556480.m4s").default,
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385561600.m4s",
    data: require("raw-loader!./media/A48/t73320385561600.m4s").default,
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385844224.m4s",
    data: require("raw-loader!./media/A48/t73320385844224.m4s").default,
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385849344.m4s",
    data: require("raw-loader!./media/A48/t73320385849344.m4s").default,
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386132992.m4s",
    data: require("raw-loader!./media/A48/t73320386132992.m4s").default,
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386138112.m4s",
    data: require("raw-loader!./media/A48/t73320386138112.m4s").default,
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386421760.m4s",
    data: require("raw-loader!./media/A48/t73320386421760.m4s").default,
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386426880.m4s",
    data: require("raw-loader!./media/A48/t73320386426880.m4s").default,
    contentType: "audio/mp4",
  },

  // Video initialization segment
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/init.mp4",
    data: require("raw-loader!./media/V300/init.mp4").default,
    contentType: "video/mp4",
  },

  // Video Segments
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475721800000.m4s",
    data: require("raw-loader!./media/V300/t137475721800000.m4s").default,
    contentType: "video/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475722340000.m4s",
    data: require("raw-loader!./media/V300/t137475722340000.m4s").default,
    contentType: "video/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475722880000.m4s",
    data: require("raw-loader!./media/V300/t137475722880000.m4s").default,
    contentType: "video/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475723420000.m4s",
    data: require("raw-loader!./media/V300/t137475723420000.m4s").default,
    contentType: "video/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475723960000.m4s",
    data: require("raw-loader!./media/V300/t137475723960000.m4s").default,
    contentType: "video/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475724500000.m4s",
    data: require("raw-loader!./media/V300/t137475724500000.m4s").default,
    contentType: "video/mp4",
  },
];
