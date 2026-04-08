const BASE_URL =
  "http://" +
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_static_SegmentTimeline/media/";
export default {
  url: BASE_URL + "multi_period_different_choices.mpd",
  transport: "dash",
};
