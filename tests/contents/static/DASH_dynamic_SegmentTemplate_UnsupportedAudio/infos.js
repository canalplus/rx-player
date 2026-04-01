const BASE_URL =
  "http://" +
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_dynamic_SegmentTemplate_UnsupportedAudio/media/";

// Provide infos on this content under JSON.
// Useful for integration tests on DASH parsers.
export default {
  url: BASE_URL + "Manifest_audio_not_supported.mpd",
  transport: "dash",
  tsbd: 5 * 60,
};
