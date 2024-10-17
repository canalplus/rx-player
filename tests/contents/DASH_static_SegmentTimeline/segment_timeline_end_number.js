const BASE_URL =
  "http://" +
  // eslint-disable-next-line no-undef
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  // eslint-disable-next-line no-undef
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_static_SegmentTimeline/media/";
export default {
  url: BASE_URL + "./segment_timeline_end_number.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  duration: 101.476,
  minimumPosition: 0,
  maximumPosition: 101.476,
  availabilityStartTime: 0,
  periods: [],
};
