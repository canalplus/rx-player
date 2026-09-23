import { EMBEDDED_DASH_WASM } from "rx-player/experimental/features/embeds";
// Import the parsers from the package currently linked by the performance runner.
// This is switched between the compared revision and the current one before bundling.
import parseWithJs from "../../node_modules/rx-player/dist/es2017/parsers/manifest/dash/js-parser/parse_from_xml_string";
import DashWasmParser from "../../node_modules/rx-player/dist/es2017/parsers/manifest/dash/wasm-parser/index";
import { multiAdaptationSetsInfos } from "../../../contents/static/DASH_static_SegmentTimeline";
import { declareTestGroup, shouldRunExtendedTests, testEnd, testStart } from "../lib";

const parserArgs = {
  url: "http://example.com/manifest.mpd",
  referenceDateTime: 0,
  externalClockOffset: 0,
  unsafelyBaseOnPreviousManifest: null,
};

declareTestGroup(
  "DASH parsers",
  async () => {
    const response = await fetch(multiAdaptationSetsInfos.url);
    if (!response.ok) {
      throw new Error(`Could not load DASH parser fixture: HTTP ${response.status}`);
    }

    const workloads = [
      { name: "regular manifest", xml: await response.text(), iterations: 20 },
      {
        name: "many AdaptationSets",
        xml: generateManifest({ adaptationSets: 100, timelineEntries: 0 }),
        iterations: 20,
      },
      {
        name: "short SegmentTimeline",
        xml: generateManifest({ adaptationSets: 2, timelineEntries: 30 }),
        iterations: 100,
      },
      {
        name: "medium SegmentTimeline",
        xml: generateManifest({ adaptationSets: 8, timelineEntries: 900 }),
        iterations: 4,
      },
    ];
    if (shouldRunExtendedTests()) {
      workloads.push({
        name: "eight-hour SegmentTimeline",
        xml: generateManifest({ adaptationSets: 20, timelineEntries: 14400 }),
        iterations: 1,
      });
    }

    const encoder = new TextEncoder();
    const wasmWorkloads = workloads.map(({ name, xml, iterations }) => ({
      name,
      bytes: encoder.encode(xml).buffer,
      iterations,
    }));
    const wasmParser = new DashWasmParser();
    await wasmParser.initialize({ wasmUrl: EMBEDDED_DASH_WASM });

    // Warm both parsers up before collecting measurements.
    parseWithJs(workloads[0].xml, parserArgs);
    wasmParser.runWasmParser(wasmWorkloads[0].bytes, parserArgs);

    for (let i = 0; i < workloads.length; i++) {
      const { name, xml, iterations } = workloads[i];
      const jsTestName = formatTestName("JS", name, iterations);
      testStart(jsTestName);
      runSeveralTimes(iterations, () => parseWithJs(xml, parserArgs));
      testEnd(jsTestName);

      const wasmWorkload = wasmWorkloads[i];
      const wasmTestName = formatTestName("WASM", name, iterations);
      testStart(wasmTestName);
      runSeveralTimes(iterations, () =>
        wasmParser.runWasmParser(wasmWorkload.bytes, parserArgs),
      );
      testEnd(wasmTestName);
    }
  },
  20000,
);

function formatTestName(parser, workload, iterations) {
  const parses = iterations === 1 ? "1 parse" : `${iterations} parses`;
  return `DASH ${parser} parser - ${workload} (${parses})`;
}

function runSeveralTimes(iterations, parse) {
  for (let i = 0; i < iterations; i++) {
    const result = parse();
    if (result.type !== "done") {
      throw new Error("Unexpected DASH parser result");
    }
  }
}

function generateManifest({ adaptationSets, timelineEntries }) {
  const timeline =
    timelineEntries === 0
      ? '<SegmentTemplate duration="2" media="$Number$.m4s" initialization="init.mp4" />'
      : `<SegmentTemplate media="$Number$.m4s" initialization="init.mp4"><SegmentTimeline>${'<S d="2" />'.repeat(timelineEntries)}</SegmentTimeline></SegmentTemplate>`;
  let period = "";
  for (let adaptationIndex = 0; adaptationIndex < adaptationSets; adaptationIndex++) {
    period +=
      `<AdaptationSet id="${adaptationIndex}" mimeType="video/mp4">` +
      timeline +
      `<Representation id="video-${adaptationIndex}" bandwidth="1000000" codecs="avc1.4d401f" />` +
      "</AdaptationSet>";
  }
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<MPD xmlns="urn:mpeg:dash:schema:mpd:2011" type="static" mediaPresentationDuration="PT28800S">' +
    `<Period duration="PT28800S">${period}</Period></MPD>`
  );
}
