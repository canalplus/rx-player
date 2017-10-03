/**
 * Data worth a little more than 15s of playback audio+video
 *
 * Note: the same actual low-bitrate segments are used for every video tracks to
 * avoid being too heavy.
 */

const baseURL = "http://demo.unified-streaming.com/video/ateam/ateam.ism/dash/";

export default {
  manifest: {
    url: baseURL + "ateam.mpd",
    data: require("raw-loader!./fixtures/dash_static_SegmentTimeline/ateam.mpd"),
    contentType: "application/dash+xml",
  },

  audio: [{
    init: {
      url: baseURL + "dash/ateam-audio=128000.dash",
      data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-audio=128000.dash")),
      contentType: "application/octet-stream; charset=utf-8",
    },

    segments: [
      {
        url: baseURL + "dash/ateam-audio=128000-0.dash",
        data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-audio=128000-0.dash")),
        contentType: "application/octet-stream; charset=utf-8",
      },
      {
        url: baseURL + "dash/ateam-audio=128000-177341.dash",
        data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-audio=128000-177341.dash")),
        contentType: "application/octet-stream; charset=utf-8",
      },
      {
        url: baseURL + "dash/ateam-audio=128000-353469.dash",
        data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-audio=128000-353469.dash")),
        contentType: "application/octet-stream; charset=utf-8",
      },
      {
        url: baseURL + "dash/ateam-audio=128000-530621.dash",
        data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-audio=128000-530621.dash")),
        contentType: "application/octet-stream; charset=utf-8",
      },
      {
        url: baseURL + "dash/ateam-audio=128000-706749.dash",
        data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-audio=128000-706749.dash")),
        contentType: "application/octet-stream; charset=utf-8",
      },
      {
        url: baseURL + "dash/ateam-audio=128000-883901.dash",
        data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-audio=128000-883901.dash")),
        contentType: "application/octet-stream; charset=utf-8",
      },
    ],
  }],

  video: [
    {
      init: {
        url: baseURL + "dash/ateam-video=400000.dash",
        data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000.dash")),
        contentType: "application/octet-stream; charset=utf-8",
      },
      segments: [
        {
          url: baseURL + "dash/ateam-video=400000-0.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-0.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=400000-4004.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-4004.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=400000-8008.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-8008.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=400000-12012.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-12012.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=400000-16016.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-16016.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=400000-20020.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-20020.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
      ],
    },
    {
      init: {
        url: baseURL + "dash/ateam-video=795000.dash",
        data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000.dash")),
        contentType: "application/octet-stream; charset=utf-8",
      },
      segments: [
        {
          url: baseURL + "dash/ateam-video=795000-0.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-0.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=795000-4004.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-4004.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=795000-8008.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-8008.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=795000-12012.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-12012.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=795000-16016.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-16016.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=795000-20020.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-20020.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
      ],
    },
    {
      init: {
        url: baseURL + "dash/ateam-video=1193000.dash",
        data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000.dash")),
        contentType: "application/octet-stream; charset=utf-8",
      },
      segments: [
        {
          url: baseURL + "dash/ateam-video=1193000-0.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-0.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=1193000-4004.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-4004.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=1193000-8008.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-8008.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=1193000-12012.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-12012.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=1193000-16016.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-16016.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=1193000-20020.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-20020.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
      ],
    },
    {
      init: {
        url: baseURL + "dash/ateam-video=1996000.dash",
        data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000.dash")),
        contentType: "application/octet-stream; charset=utf-8",
      },
      segments: [
        {
          url: baseURL + "dash/ateam-video=1996000-0.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-0.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=1996000-4004.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-4004.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=1996000-8008.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-8008.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=1996000-12012.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-12012.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=1996000-16016.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-16016.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
        {
          url: baseURL + "dash/ateam-video=1996000-20020.dash",
          data: new Uint8Array(require("arraybuffer-loader!./fixtures/dash_static_SegmentTimeline/dash/ateam-video=400000-20020.dash")),
          contentType: "application/octet-stream; charset=utf-8",
        },
      ],
    },
  ],
};
