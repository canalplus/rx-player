const BASE_URL =
  "http://" +
  // eslint-disable-next-line no-undef
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  // eslint-disable-next-line no-undef
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_static_SegmentTimeline/media/";
export default {
  url: BASE_URL + "multi_period_same_choices.mpd",
  transport: "dash",
};
