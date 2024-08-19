const BASE_URL =
  "http://" +
  // eslint-disable-next-line no-undef
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  // eslint-disable-next-line no-undef
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_static_number_based_SegmentTimeline/media/";

export default {
  url: BASE_URL + "end_number.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,

  // TODO ...
};
