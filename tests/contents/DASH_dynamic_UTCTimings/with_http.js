const BASE_URL = "https://vm2.dashif.org/livesim-dev/periods_1/testpic_2s/";
const Manifest_URL = {
  url: BASE_URL + "Manifest_with_http.mpd",
  data: require("raw-loader!./media/Manifest_with_http.mpd"),
  contentType: "application/dash+xml",
};

/**
 * URLs for which the request should be stubbed.
 * @type {Array.<Object>}
 */
const URLs = [
  // manifest
  Manifest_URL,

  // time server
  {
    url: "https://time.akamai.com/?iso",
    data: "2019-03-25T12:49:08.014Z",
    contentType: "text/plain",
  },

  // Audio initialization segment
  {
    url: BASE_URL + "A48/init.mp4",
    data: require("raw-loader!./media/A48/init.mp4"),
    contentType: "audio/mp4",
  },

  // Audio segments
  {
    url: BASE_URL + "A48/776759063.m4s",
    data: require("raw-loader!./media/A48/776759063.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759064.m4s",
    data: require("raw-loader!./media/A48/776759064.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759065.m4s",
    data: require("raw-loader!./media/A48/776759065.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759066.m4s",
    data: require("raw-loader!./media/A48/776759066.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759067.m4s",
    data: require("raw-loader!./media/A48/776759067.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759068.m4s",
    data: require("raw-loader!./media/A48/776759068.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759069.m4s",
    data: require("raw-loader!./media/A48/776759069.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759070.m4s",
    data: require("raw-loader!./media/A48/776759070.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759071.m4s",
    data: require("raw-loader!./media/A48/776759071.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759072.m4s",
    data: require("raw-loader!./media/A48/776759072.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759073.m4s",
    data: require("raw-loader!./media/A48/776759073.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759074.m4s",
    data: require("raw-loader!./media/A48/776759074.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759075.m4s",
    data: require("raw-loader!./media/A48/776759075.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759076.m4s",
    data: require("raw-loader!./media/A48/776759076.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759077.m4s",
    data: require("raw-loader!./media/A48/776759077.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759078.m4s",
    data: require("raw-loader!./media/A48/776759078.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "A48/776759079.m4s",
    data: require("raw-loader!./media/A48/776759079.m4s"),
    contentType: "audio/mp4",
  },

  // Video initialization segment
  {
    url: BASE_URL + "V300/init.mp4",
    data: require("raw-loader!./media/V300/init.mp4"),
    contentType: "video/mp4",
  },

  // Video Segments
  {
    url: BASE_URL + "V300/776759063.m4s",
    data: require("raw-loader!./media/V300/776759063.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759064.m4s",
    data: require("raw-loader!./media/A48/776759064.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759065.m4s",
    data: require("raw-loader!./media/V300/776759065.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759066.m4s",
    data: require("raw-loader!./media/V300/776759066.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759067.m4s",
    data: require("raw-loader!./media/V300/776759067.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759068.m4s",
    data: require("raw-loader!./media/V300/776759068.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759069.m4s",
    data: require("raw-loader!./media/V300/776759069.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759070.m4s",
    data: require("raw-loader!./media/V300/776759070.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759071.m4s",
    data: require("raw-loader!./media/V300/776759071.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759072.m4s",
    data: require("raw-loader!./media/V300/776759072.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759073.m4s",
    data: require("raw-loader!./media/V300/776759073.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759074.m4s",
    data: require("raw-loader!./media/V300/776759074.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759075.m4s",
    data: require("raw-loader!./media/V300/776759075.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759076.m4s",
    data: require("raw-loader!./media/V300/776759076.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759077.m4s",
    data: require("raw-loader!./media/V300/776759077.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759078.m4s",
    data: require("raw-loader!./media/V300/776759078.m4s"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_URL + "V300/776759079.m4s",
    data: require("raw-loader!./media/V300/776759079.m4s"),
    contentType: "audio/mp4",
  },
];

const manifestInfos = {
  url: BASE_URL + "Manifest_with_http.mpd",
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
                    mediaURL: BASE_URL + "A48/init.mp4",
                  },
                  segments: [
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
                    mediaURL: BASE_URL + "V300/init.mp4",
                  },
                  segments: [
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
