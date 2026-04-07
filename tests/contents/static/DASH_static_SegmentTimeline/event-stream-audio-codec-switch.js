const BASE_URL =
  "http://" +
  __TEST_CONTENT_SERVER__.URL +
  ":" +
  __TEST_CONTENT_SERVER__.PORT +
  "/DASH_static_SegmentTimeline/media/";

const PERIOD_2_START = 101.568367;

export default {
  url: BASE_URL + "event-streams_audio_codec_switch.mpd",
  transport: "dash",
  crossingEvent: {
    id: "5",
    start: 100,
    end: 110,
    period2Start: PERIOD_2_START,
  },
  laterPeriodEvent: {
    id: "1",
    start: PERIOD_2_START + 20,
  },
};
