/**
 * Only init data for audio and video for now.
 * One single bitrate, english audio.
 */

export default {
  manifest: {
    url: "https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/manifest_mpm4sav_mvtime_w925796611.mpd",
    data: require("raw-loader!./fixtures/dash_dynamic_SegmentTimeline/manifest_mpm4sav_mvtime_w925796611.mpd"),
    contentType: "application/dash+xml",
  },

  audio: [{
    init: {
      url: "https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/chunk_ctaudio_cfm4s_ridp0aa0br96257_cinit_w925796611_mpd.m4s",
      data: require("raw-loader!./fixtures/dash_dynamic_SegmentTimeline/chunk_ctaudio_cfm4s_ridp0aa0br96257_cinit_w925796611_mpd.m4s"),
      contentType: "audio/mp4",
    },

    segments: [],
  }],

  video: [{
    init: {
      url: "https://wowzaec2demo.streamlock.net/live/_definst_/bigbuckbunny/chunk_ctvideo_cfm4s_ridp0va0br601392_cinit_w925796611_mpd.m4s",
      data: require("raw-loader!./fixtures/dash_dynamic_SegmentTimeline/chunk_ctvideo_cfm4s_ridp0va0br601392_cinit_w925796611_mpd.m4s"),
      contentType: "video/mp4",
    },
    segments: [],
  }],
};
