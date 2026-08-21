const BASE_URL =
  "http://" +
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_static_AnnexI/media/";

export default {
  url: BASE_URL + "manifest.mpd",
  transport: "dash",
  expectedRequests: {
    videoInit: BASE_URL + "init.mp4?from=network&kind=video",
    videoMedia: BASE_URL + "segment-1.m4s?from=network&kind=video",
  },
};
