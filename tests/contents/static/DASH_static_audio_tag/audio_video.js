const BASE_URL =
  "http://" +
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_static_audio_tag/media/";

export default {
  url: BASE_URL + "audio_video.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  duration: 530621 / 44100,
  minimumPosition: 0,
  maximumPosition: 530621 / 44100,
  availabilityStartTime: 0,
  periods: [
    {
      start: 0,
      duration: 530621 / 44100,
      adaptations: {
        audio: [
          {
            id: "audio-audio-mp4a.40.2-audio/mp4",
            representations: [
              {
                id: "audio=128000",
                bitrate: 128000,
                codec: "mp4a.40.2",
                mimeType: "audio/mp4",
                index: {
                  init: {
                    url: "/DASH_static_SegmentTimeline/media/dash/ateam-audio=128000.dash",
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 177341 / 44100,
                      timescale: 1,
                      url: "/DASH_static_SegmentTimeline/media/dash/ateam-audio=128000-0.dash",
                    },
                    {
                      time: 177341 / 44100,
                      duration: 176128 / 44100,
                      timescale: 1,
                      url: "/DASH_static_SegmentTimeline/media/dash/ateam-audio=128000-177341.dash",
                    },
                    {
                      time: 353469 / 44100,
                      duration: 177152 / 44100,
                      timescale: 1,
                      url: "/DASH_static_SegmentTimeline/media/dash/ateam-audio=128000-353469.dash",
                    },
                  ],
                },
              },
            ],
          },
        ],
        video: [
          {
            id: "video-video-video/mp4",
            representations: [
              {
                id: "video=400000",
                bitrate: 400000,
                height: 124,
                width: 220,
                codec: "avc1.42C014",
                mimeType: "video/mp4",
                index: {
                  init: {
                    url: "/DASH_static_SegmentTimeline/media/dash/ateam-video=400000.dash",
                  },
                  segments: [
                    {
                      time: 0,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "/DASH_static_SegmentTimeline/media/dash/ateam-video=400000-0.dash",
                    },
                    {
                      time: 4004 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "/DASH_static_SegmentTimeline/media/dash/ateam-video=400000-4004.dash",
                    },
                    {
                      time: 8008 / 1000,
                      duration: 4004 / 1000,
                      timescale: 1,
                      url: "/DASH_static_SegmentTimeline/media/dash/ateam-video=400000-8008.dash",
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    },
  ],
};
