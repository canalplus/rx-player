const BASE_URL =
  "http://" +
  /* eslint-disable no-undef */
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  /* eslint-enable no-undef */
  "/DASH_DRM_static_SegmentTemplate/media/";

export default {
  url: BASE_URL + "encrypted_multiple_keys_number.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  duration: 734,
  minimumPosition: 0,
  maximumPosition: 734,
  availabilityStartTime: 0,
  periods: [
    {
      start: 0,
      duration: 734,
      // TODO?
      adaptations: {
        audio: [],
        video: [],
        text: [],
      },
    },
  ],
};
