const BASE_URL =
  "http://" +
  /* eslint-disable no-undef */
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  /* eslint-enable no-undef */
  "/DASH_static_SegmentTimeline/media/";
export default {
  url: BASE_URL + "forced-subtitles.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,
  minimumPosition: 0,
  maximumPosition: 101.568367,
  duration: 101.568367,
  availabilityStartTime: 0,

  /**
   * We don't care about that for now. As this content is only tested for track
   * preferences.
   * TODO still add it to our list of commonly tested contents?
   */
  periods: [],
};
