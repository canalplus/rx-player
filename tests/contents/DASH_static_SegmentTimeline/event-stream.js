const BASE_URL = "http://" +
               /* eslint-disable no-undef */
               __TEST_CONTENT_SERVER__.URL + ":" +
               __TEST_CONTENT_SERVER__.PORT +
               /* eslint-enable no-undef */
               "/DASH_static_SegmentTimeline/media/";

const elt_p1_1 =
     `<Event xmlns="urn:mpeg:dash:schema:mpd:2011" presentationTime="50000" duration="30000" id="0">
        <data> 5 - 8 </data>
      </Event>`;

const elt_p1_2 =
     `<Event xmlns="urn:mpeg:dash:schema:mpd:2011" presentationTime="200000" id="1">
        20
      </Event>`;

const elt_p1_3 =
     `<Event xmlns="urn:mpeg:dash:schema:mpd:2011" presentationTime="400000" duration="100000" id="2">
        40 - 50
      </Event>`;

const elt_p1_4 =
     `<Event xmlns="urn:mpeg:dash:schema:mpd:2011" presentationTime="450000" duration="90000" id="3">
        45 - 55
      </Event>`;

const elt_p2_1 = "<Event xmlns=\"urn:mpeg:dash:schema:mpd:2011\" id=\"foo\" />";

const elt_p2_2 =
     `<Event xmlns="urn:mpeg:dash:schema:mpd:2011" presentationTime="0" id="bar">
        <data>0</data>
      </Event>`;

const elt_p2_3 =
     `<Event xmlns="urn:mpeg:dash:schema:mpd:2011" presentationTime="4000" duration="5000" id="0">
        <data>4 - 9</data>
      </Event>`;

const elt_p2_4 =
     `<Event xmlns="urn:mpeg:dash:schema:mpd:2011" presentationTime="20000" id="1">
        20
      </Event>`;

const elt_p2_5 =
     `<Event xmlns="urn:mpeg:dash:schema:mpd:2011" presentationTime="40000" duration="3000" id="2">
        40-43
      </Event>`;

const elt_p2_6 =
     `<Event xmlns="urn:mpeg:dash:schema:mpd:2011" presentationTime="60000" duration="1" id="4">
        60-60.001
      </Event>`;

const PERIOD_2_START = 101.568367;
const PERIOD_2_END = 101.568367 * 2;
const EVENTS = { periods: [ [ { start: 5,
                                end: 8,
                                schemeIdUri: "urn:uuid:XYZY",
                                type: "dash-event-stream",
                                timescale: 10000,
                                elt: elt_p1_1 },
                              { start: 20,
                                schemeIdUri: "urn:uuid:XYZY",
                                type: "dash-event-stream",
                                timescale: 10000,
                                elt: elt_p1_2 },
                              { start: 40,
                                end: 50,
                                schemeIdUri: "urn:uuid:XYZY",
                                type: "dash-event-stream",
                                timescale: 10000,
                                elt: elt_p1_3 },
                              { start: 45,
                                end: 54,
                                schemeIdUri: "urn:uuid:XYZY",
                                type: "dash-event-stream",
                                timescale: 10000,
                                elt: elt_p1_4 } ],

                            // Period 2
                            [ { start: PERIOD_2_START,
                                schemeIdUri: "urn:uuid:XYZ",
                                type: "dash-event-stream",
                                timescale: 1000,
                                elt: elt_p2_1 },
                              { start: PERIOD_2_START,
                                schemeIdUri: "urn:uuid:XYZ",
                                type: "dash-event-stream",
                                timescale: 1000,
                                elt: elt_p2_2 },
                              { start: PERIOD_2_START + 4,
                                end: PERIOD_2_START + 9,
                                schemeIdUri: "urn:uuid:XYZ",
                                type: "dash-event-stream",
                                timescale: 1000,
                                elt: elt_p2_3 },
                              { start: PERIOD_2_START + 20,
                                schemeIdUri: "urn:uuid:XYZ",
                                type: "dash-event-stream",
                                timescale: 1000,
                                elt: elt_p2_4 },
                              { start: PERIOD_2_START + 40,
                                end: PERIOD_2_START + 43,
                                schemeIdUri: "urn:uuid:XYZ",
                                type: "dash-event-stream",
                                timescale: 1000,
                                elt: elt_p2_5 },
                              { start: PERIOD_2_START + 60,
                                end: PERIOD_2_START + 60.001,
                                schemeIdUri: "urn:uuid:XYZ",
                                type: "dash-event-stream",
                                timescale: 1000,
                                elt: elt_p2_6 } ] ] };
export default {
  url: BASE_URL + "event-streams.mpd",
  transport: "dash",
  isDynamic: false,
  isLive: false,

  /**
   * We don't care about that for now. As this content is only tested for track
   * preferences.
   * TODO still add it to our list of commonly tested contents?
   */
  periods: [ { start: 0, end: PERIOD_2_START },
             { start: PERIOD_2_START, end: PERIOD_2_END }],
  events: EVENTS,
};
