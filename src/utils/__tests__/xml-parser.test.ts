import { parseXml } from "../xml-parser";

const exampleXml = `<?xml version="1.0" encoding="utf-8"?>
<MPD availabilityStartTime="2012-01-01T00:00:00Z" id="Config part of url maybe?" minBufferTime="PT2S" minimumUpdatePeriod="PT0S" profiles="urn:mpeg:dash:profile:isoff-live:2011,urn:com:dashif:dash264" publishTime="2018-05-28T11:47:45Z" timeShiftBufferDepth="PT5M" type="dynamic" ns1:schemaLocation="urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd" xmlns="urn:mpeg:dash:schema:mpd:2011" xmlns:ns1="http://www.w3.org/2001/XMLSchema-instance">
   <ProgramInformation>
      <Title>Media Presentation Description by MobiTV. Powered by MDL Team@Sweden.</Title>
   </ProgramInformation>
<Period id="p0" start="PT0S" ns2:publishTime="2012-01-01T00:00:00Z" xmlns:ns2="urn:mobitv">
      <AdaptationSet contentType="audio" lang="eng" mimeType="audio/mp4" segmentAlignment="true" startWithSAP="1" ns2:qualityLevel="SD">
         <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main" />
         <SegmentTemplate initialization="$RepresentationID$/init.mp4" media="$RepresentationID$/t$Time$.m4s" timescale="48000">
<SegmentTimeline>
<S d="288768" t="73320372578304" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
<S d="288768" r="2" />
<S d="287744" />
</SegmentTimeline>
</SegmentTemplate>
         <Representation audioSamplingRate="48000" bandwidth="48000" codecs="mp4a.40.2" id="A48">
            <AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="2" />
         </Representation>
      </AdaptationSet>
      <AdaptationSet contentType="video" maxFrameRate="60/2" maxHeight="360" maxWidth="640" mimeType="video/mp4" minHeight="360" minWidth="640" par="16:9" segmentAlignment="true" startWithSAP="1" ns2:qualityLevel="SD">
         <Role schemeIdUri="urn:mpeg:dash:role:2011" value="main" />
         <SegmentTemplate initialization="$RepresentationID$/init.mp4" media="$RepresentationID$/t$Time$.m4s" timescale="90000">
<SegmentTimeline>
<S d="540000" r="49" t="137475698580000" />
</SegmentTimeline>
</SegmentTemplate>
         <Representation bandwidth="300000" codecs="avc1.64001e" frameRate="60/2" height="360" id="V300" sar="1:1" width="640" />
      </AdaptationSet>
   </Period>
</MPD>`;

/* eslint-disable @typescript-eslint/naming-convention */
const exampleResult = [
  {
    tagName: "?xml",
    attributes: { version: "1.0", encoding: "utf-8" },
    children: [],
    posStart: 0,
    posEnd: 2589,
  },
  {
    tagName: "MPD",
    attributes: {
      availabilityStartTime: "2012-01-01T00:00:00Z",
      id: "Config part of url maybe?",
      minBufferTime: "PT2S",
      minimumUpdatePeriod: "PT0S",
      profiles: "urn:mpeg:dash:profile:isoff-live:2011,urn:com:dashif:dash264",
      publishTime: "2018-05-28T11:47:45Z",
      timeShiftBufferDepth: "PT5M",
      type: "dynamic",
      "ns1:schemaLocation": "urn:mpeg:dash:schema:mpd:2011 DASH-MPD.xsd",
      xmlns: "urn:mpeg:dash:schema:mpd:2011",
      "xmlns:ns1": "http://www.w3.org/2001/XMLSchema-instance",
    },
    children: [
      {
        tagName: "ProgramInformation",
        attributes: {},
        children: [
          {
            tagName: "Title",
            attributes: {},
            children: [
              "Media Presentation Description by MobiTV. Powered by MDL Team@Sweden.",
            ],
            posStart: 505,
            posEnd: 589,
          },
        ],
        posStart: 478,
        posEnd: 614,
      },
      {
        tagName: "Period",
        attributes: {
          id: "p0",
          start: "PT0S",
          "ns2:publishTime": "2012-01-01T00:00:00Z",
          "xmlns:ns2": "urn:mobitv",
        },
        children: [
          {
            tagName: "AdaptationSet",
            attributes: {
              contentType: "audio",
              lang: "eng",
              mimeType: "audio/mp4",
              segmentAlignment: "true",
              startWithSAP: "1",
              "ns2:qualityLevel": "SD",
            },
            children: [
              {
                tagName: "Role",
                attributes: { schemeIdUri: "urn:mpeg:dash:role:2011", value: "main" },
                children: [],
                posStart: 853,
                posEnd: 912,
              },
              {
                tagName: "SegmentTemplate",
                attributes: {
                  initialization: "$RepresentationID$/init.mp4",
                  media: "$RepresentationID$/t$Time$.m4s",
                  timescale: "48000",
                },
                children: [
                  {
                    tagName: "SegmentTimeline",
                    attributes: {},
                    children: [
                      {
                        tagName: "S",
                        attributes: { d: "288768", t: "73320372578304" },
                        children: [],
                        posStart: 1060,
                        posEnd: 1095,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1096,
                        posEnd: 1112,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1113,
                        posEnd: 1135,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1136,
                        posEnd: 1152,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1153,
                        posEnd: 1175,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1176,
                        posEnd: 1192,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1193,
                        posEnd: 1215,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1216,
                        posEnd: 1232,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1233,
                        posEnd: 1255,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1256,
                        posEnd: 1272,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1273,
                        posEnd: 1295,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1296,
                        posEnd: 1312,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1313,
                        posEnd: 1335,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1336,
                        posEnd: 1352,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1353,
                        posEnd: 1375,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1376,
                        posEnd: 1392,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1393,
                        posEnd: 1415,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1416,
                        posEnd: 1432,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1433,
                        posEnd: 1455,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1456,
                        posEnd: 1472,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1473,
                        posEnd: 1495,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1496,
                        posEnd: 1512,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1513,
                        posEnd: 1535,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1536,
                        posEnd: 1552,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "288768", r: "2" },
                        children: [],
                        posStart: 1553,
                        posEnd: 1575,
                      },
                      {
                        tagName: "S",
                        attributes: { d: "287744" },
                        children: [],
                        posStart: 1576,
                        posEnd: 1592,
                      },
                    ],
                    posStart: 1042,
                    posEnd: 1611,
                  },
                ],
                posStart: 922,
                posEnd: 1630,
              },
              {
                tagName: "Representation",
                attributes: {
                  audioSamplingRate: "48000",
                  bandwidth: "48000",
                  codecs: "mp4a.40.2",
                  id: "A48",
                },
                children: [
                  {
                    tagName: "AudioChannelConfiguration",
                    attributes: {
                      schemeIdUri:
                        "urn:mpeg:dash:23003:3:audio_channel_configuration:2011",
                      value: "2",
                    },
                    children: [],
                    posStart: 1741,
                    posEnd: 1849,
                  },
                ],
                posStart: 1640,
                posEnd: 1876,
              },
            ],
            posStart: 713,
            posEnd: 1899,
          },
          {
            tagName: "AdaptationSet",
            attributes: {
              contentType: "video",
              maxFrameRate: "60/2",
              maxHeight: "360",
              maxWidth: "640",
              mimeType: "video/mp4",
              minHeight: "360",
              minWidth: "640",
              par: "16:9",
              segmentAlignment: "true",
              startWithSAP: "1",
              "ns2:qualityLevel": "SD",
            },
            children: [
              {
                tagName: "Role",
                attributes: { schemeIdUri: "urn:mpeg:dash:role:2011", value: "main" },
                children: [],
                posStart: 2128,
                posEnd: 2187,
              },
              {
                tagName: "SegmentTemplate",
                attributes: {
                  initialization: "$RepresentationID$/init.mp4",
                  media: "$RepresentationID$/t$Time$.m4s",
                  timescale: "90000",
                },
                children: [
                  {
                    tagName: "SegmentTimeline",
                    attributes: {},
                    children: [
                      {
                        tagName: "S",
                        attributes: { d: "540000", r: "49", t: "137475698580000" },
                        children: [],
                        posStart: 2335,
                        posEnd: 2378,
                      },
                    ],
                    posStart: 2317,
                    posEnd: 2397,
                  },
                ],
                posStart: 2197,
                posEnd: 2416,
              },
              {
                tagName: "Representation",
                attributes: {
                  bandwidth: "300000",
                  codecs: "avc1.64001e",
                  frameRate: "60/2",
                  height: "360",
                  id: "V300",
                  sar: "1:1",
                  width: "640",
                },
                children: [],
                posStart: 2426,
                posEnd: 2546,
              },
            ],
            posStart: 1906,
            posEnd: 2569,
          },
        ],
        posStart: 615,
        posEnd: 2582,
      },
    ],
    posStart: 39,
    posEnd: 2589,
  },
];

describe("parseXml", () => {
  it("should properly parse example XML", () => {
    const parsed = parseXml(exampleXml);
    expect(parsed).toEqual(exampleResult);
  });
});
