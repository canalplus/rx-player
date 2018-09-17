/**
 * Only init data for audio and video for now.
 * One single bitrate, english audio.
 */

const Manifest_URL = {
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  data: require("raw-loader!./media/Manifest.mpd"),
  contentType: "application/dash+xml",
};

/**
 * URLs for which the request should be stubbed.
 * @type {Array.<Object>}
 */
const URLs = [
  // manifest
  Manifest_URL,

  // Audio initialization segment
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/init.mp4",
    data: require("raw-loader!./media/A48/init.mp4"),
    contentType: "audio/mp4",
  },

  // Audio segments
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320384978944.m4s",
    data: require("raw-loader!./media/A48/t73320384978944.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385267712.m4s",
    data: require("raw-loader!./media/A48/t73320385267712.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385556480.m4s",
    data: require("raw-loader!./media/A48/t73320385556480.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385561600.m4s",
    data: require("raw-loader!./media/A48/t73320385561600.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385844224.m4s",
    data: require("raw-loader!./media/A48/t73320385844224.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320385849344.m4s",
    data: require("raw-loader!./media/A48/t73320385849344.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386132992.m4s",
    data: require("raw-loader!./media/A48/t73320386132992.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386138112.m4s",
    data: require("raw-loader!./media/A48/t73320386138112.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386421760.m4s",
    data: require("raw-loader!./media/A48/t73320386421760.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320386426880.m4s",
    data: require("raw-loader!./media/A48/t73320386426880.m4s"),
    contentType: "audio/mp4",
  },

  // Video initialization segment
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/init.mp4",
    data: require("raw-loader!./media/V300/init.mp4"),
    contentType: "video/mp4",
  },

  // Video Segments
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475721800000.m4s",
    data: require("raw-loader!./media/V300/t137475721800000.m4s"),
    contentType: "video/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475722340000.m4s",
    data: require("raw-loader!./media/V300/t137475722340000.m4s"),
    contentType: "video/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475722880000.m4s",
    data: require("raw-loader!./media/V300/t137475722880000.m4s"),
    contentType: "video/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475723420000.m4s",
    data: require("raw-loader!./media/V300/t137475723420000.m4s"),
    contentType: "video/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475723960000.m4s",
    data: require("raw-loader!./media/V300/t137475723960000.m4s"),
    contentType: "video/mp4",
  },
  {
    url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475724500000.m4s",
    data: require("raw-loader!./media/V300/t137475724500000.m4s"),
    contentType: "video/mp4",
  },
];

const manifestInfos = {
  url: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/Manifest.mpd",
  transport: "dash",
  isLive: true,
  timeShiftBufferDepth: 300,
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
                    mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/init.mp4",
                  },
                  segments: [
                    {
                      time: 73320372578304,
                      timescale: 48000,
                      duration: 288768,
                      mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320372578304.m4s",
                    },
                    {
                      time: 73320372867072,
                      timescale: 48000,
                      duration: 287744,
                      mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/A48/t73320372867072.m4s",
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
                bitrate: 300000,
                height: 360,
                width: 640,
                codec: "avc1.64001e",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/init.mp4",
                  },
                  segments: [
                    {
                      time: 137475698580000,
                      timescale: 90000,
                      duration: 540000,
                      mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475698580000.m4s",
                    },
                    {
                      time: 137475699120000,
                      timescale: 90000,
                      duration: 540000,
                      mediaURL: "http://vm2.dashif.org/livesim-dev/segtimeline_1/testpic_6s/V300/t137475699120000.m4s",
                    },
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

export {
  Manifest_URL,
  URLs,
  manifestInfos,
};
