const BASE_URL =
  "http://" +
  /* eslint-disable no-undef */
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  /* eslint-enable no-undef */
  "/DASH_dynamic_SegmentTemplate_Multi_Periods/media/";

// Provide infos on this content under JSON.
// Useful for integration tests on DASH parsers.
export default {
  url: BASE_URL + "Manifest.mpd",
  transport: "dash",
  tsbd: 5 * 60,
};
