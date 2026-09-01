const BASE_URL =
  "http://" +
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_static_SelfInitializing/media/";

export default {
  url: BASE_URL + "manifest.mpd",
  transport: "dash",
};
