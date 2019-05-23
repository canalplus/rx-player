const BASE_URL = "http://dash.akamaized.net/dash264/TestCasesIOP41/MultiTrack/alternative_content/1/";
const BASE_CONTENT_URL = "http://dash.akamaized.net/dash264/TestCasesIOP33/Content/";
const Manifest_URL = {
  url: BASE_URL + "manifest_alternative_content_live.mpd",
  data: require("raw-loader!./media/Manifest.mpd").default,
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
    url: BASE_CONTENT_URL + "audio/mp4a/2second/tears_of_steel_1080p_audio_32k_dash_track1_init.mp4",
    data: require("arraybuffer-loader!./media/audio/init.mp4"),
    contentType: "audio/mp4",
  },

  // Audio segments
  {
    url: BASE_CONTENT_URL + "audio/mp4a/2second/tears_of_steel_1080p_audio_32k_dash_track1_1.mp4",
    data: require("arraybuffer-loader!./media/audio/1.mp4"),
    contentType: "audio/mp4",
  },
  { 
    url: BASE_CONTENT_URL + "audio/mp4a/2second/tears_of_steel_1080p_audio_32k_dash_track1_2.mp4",
    data: require("arraybuffer-loader!./media/audio/2.mp4"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_CONTENT_URL + "audio/mp4a/2second/tears_of_steel_1080p_audio_32k_dash_track1_3.mp4",
    data: require("arraybuffer-loader!./media/audio/3.mp4"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_CONTENT_URL + "audio/mp4a/2second/tears_of_steel_1080p_audio_32k_dash_track1_4.mp4",
    data: require("arraybuffer-loader!./media/audio/4.mp4"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_CONTENT_URL + "audio/mp4a/2second/tears_of_steel_1080p_audio_32k_dash_track1_5.mp4",
    data: require("arraybuffer-loader!./media/audio/5.mp4"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_CONTENT_URL + "audio/mp4a/2second/tears_of_steel_1080p_audio_32k_dash_track1_6.mp4",
    data: require("arraybuffer-loader!./media/audio/6.mp4"),
    contentType: "audio/mp4",
  },
  {
    url: BASE_CONTENT_URL + "audio/mp4a/2second/tears_of_steel_1080p_audio_32k_dash_track1_7.mp4",
    data: require("arraybuffer-loader!./media/audio/7.mp4"),
    contentType: "audio/mp4",
  },


  // Video initialization segment
  {
    url: BASE_CONTENT_URL + "video/h264/1000k/2second/tears_of_steel_1080p_1000k_h264_dash_track1_init.mp4",
    data: require("arraybuffer-loader!./media/video/1000k/init.mp4"),
    contentType: "video/mp4",
  },

  // Video Segments
  {
    url: BASE_CONTENT_URL + "video/h264/1000k/2second/tears_of_steel_1080p_1000k_h264_dash_track1_1.m4s",
    data: require("arraybuffer-loader!./media/video/1000k/1.m4s"),
    contentType: "video/mp4",
  },
  { // Defect => BUFFER_APPEND_ERROR
    url: BASE_CONTENT_URL + "video/h264/1000k/2second/tears_of_steel_1080p_1000k_h264_dash_track1_2.m4s",
    data: require("arraybuffer-loader!./media/audio/2.mp4"),
    contentType: "video/mp4",
  },
  {
    url: BASE_CONTENT_URL + "video/h264/1000k/2second/tears_of_steel_1080p_1000k_h264_dash_track1_3.m4s",
    data: require("arraybuffer-loader!./media/video/1000k/3.m4s"),
    contentType: "video/mp4",
  },
  {
    url: BASE_CONTENT_URL + "video/h264/1000k/2second/tears_of_steel_1080p_1000k_h264_dash_track1_4.m4s",
    data: require("arraybuffer-loader!./media/video/1000k/4.m4s"),
    contentType: "video/mp4",
  },
  {
    url: BASE_CONTENT_URL + "video/h264/1000k/2second/tears_of_steel_1080p_1000k_h264_dash_track1_5.m4s",
    data: require("arraybuffer-loader!./media/video/1000k/5.m4s"),
    contentType: "video/mp4",
  },
  {
    // Defect => MEDIA_ERR_DECODE
    url: BASE_CONTENT_URL + "video/h264/1000k/2second/tears_of_steel_1080p_1000k_h264_dash_track1_6.m4s",
    data: require("arraybuffer-loader!./media/video/hevc/6.m4s"),
    contentType: "video/mp4",
  },
  {
    url: BASE_CONTENT_URL + "video/h264/1000k/2second/tears_of_steel_1080p_1000k_h264_dash_track1_7.m4s",
    data: require("arraybuffer-loader!./media/video/1000k/7.m4s"),
    contentType: "video/mp4",
  },
  {
    url: BASE_CONTENT_URL + "video/h264/1000k/2second/tears_of_steel_1080p_1000k_h264_dash_track1_8.m4s",
    data: require("arraybuffer-loader!./media/video/1000k/8.m4s"),
    contentType: "video/mp4",
  },
];

const manifestInfos = {
  url: BASE_URL + "manifest_alternative_content_live.mpd",
  transport: "dash",
  isLive: false,
  duration: 14,
  minimumPosition: 0,
  maximumPosition: 14,
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
                bitrate: 34189,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    mediaURL: "http://dash.akamaized.net/dash264/TestCasesIOP33/Content/audio/mp4a/2second/tears_of_steel_1080p_audio_32k_dash_track1_init.mp4",
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
                bitrate: 999120,
                height: 1080,
                width: 1920,
                codec: "avc1.640028",
                mimeType: "video/mp4",
                index: {
                  init: {
                    mediaURL: "http://dash.akamaized.net/dash264/TestCasesIOP33/Content/video/h264/1000k/2second/tears_of_steel_1080p_1000k_h264_dash_track1_init.mp4",
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
