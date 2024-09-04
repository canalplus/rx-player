const BASE_URL =
  "http://" +
  // eslint-disable-next-line no-undef
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  // eslint-disable-next-line no-undef
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_static_number_based_SegmentTimeline/media/";

export default {
  url: BASE_URL + "manifest.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  duration: 100.76,
  minimumPosition: 0,
  maximumPosition: 100.76,
  availabilityStartTime: 0,
  periods: [
    {
      start: 0,
      duration: 100.76,

      // TODO?
      adaptations: {},
    },
  ],
};
