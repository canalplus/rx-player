/**
 * Only init data for audio and video for now.
 * One single bitrate, english audio.
 */

export default {
  manifest: {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
    data: require("raw-loader!./fixtures/dash-if_segment-timeline/Manifest.mpd"),
    contentType: "application/dash+xml",
  },

  audio: [{
    init: {
      url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/init.mp4",
      data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/init.mp4"),
      contentType: "audio/mp4",
    },

    segments: [
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320384978944.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/t73320384978944.m4s"),
        contentType: "audio/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385267712.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/t73320385267712.m4s"),
        contentType: "audio/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385556480.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/t73320385556480.m4s"),
        contentType: "audio/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385561600.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/t73320385561600.m4s"),
        contentType: "audio/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385844224.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/t73320385844224.m4s"),
        contentType: "audio/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385849344.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/t73320385849344.m4s"),
        contentType: "audio/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386132992.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/t73320386132992.m4s"),
        contentType: "audio/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386138112.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/t73320386138112.m4s"),
        contentType: "audio/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386421760.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/t73320386421760.m4s"),
        contentType: "audio/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386426880.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/A48/t73320386426880.m4s"),
        contentType: "audio/mp4",
      },
    ],
  }],

  video: [{
    init: {
      url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/init.mp4",
      data: require("raw-loader!./fixtures/dash-if_segment-timeline/V300/init.mp4"),
      contentType: "video/mp4",
    },
    segments: [
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475721800000.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/V300/t137475721800000.m4s"),
        contentType: "video/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475722340000.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/V300/t137475722340000.m4s"),
        contentType: "video/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475722880000.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/V300/t137475722880000.m4s"),
        contentType: "video/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475723420000.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/V300/t137475723420000.m4s"),
        contentType: "video/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475723960000.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/V300/t137475723960000.m4s"),
        contentType: "video/mp4",
      },
      {
        url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475724500000.m4s",
        data: require("raw-loader!./fixtures/dash-if_segment-timeline/V300/t137475724500000.m4s"),
        contentType: "video/mp4",
      },
    ],
  }],
};
