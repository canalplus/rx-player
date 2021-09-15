const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_static_SegmentTimeline/media/";
export default {
  url: BASE_URL + "multi_period_same_choices.mpd",
  transport: "dash",
};
