import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { parseToIntermediateRepresentation as parseWithJs } from "../../src/parsers/manifest/dash/js-parser/parse_from_xml_string.ts";
import DashWasmParser from "../../src/parsers/manifest/dash/wasm-parser/index.ts";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const encoder = new TextEncoder();
const decoder = new TextDecoder();

const fixtures = [
  "DASH_dynamic_SegmentTemplate/media/Manifest.mpd",
  "DASH_dynamic_SegmentTimeline/media/Manifest.mpd",
  "DASH_static_SegmentBase/media/multi_codecs.mpd",
  "DASH_DRM_static_SegmentTemplate/media/encrypted_multiple_keys_number.mpd",
  "DASH_static_SegmentTimeline/media/event-streams.mpd",
  "DASH_static_SegmentTimeline/media/multi-AdaptationSets.mpd",
  "DASH_static_number_based_SegmentTimeline/media/manifest.mpd",
  "DASH_static_audio_tag/media/audio_video.mpd",
];

function normalizeIr(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeIr);
  } else if (value instanceof ArrayBuffer) {
    // EventStream payloads stay encoded in the WASM IR and are strings in the JS IR.
    return decoder.decode(new Uint8Array(value));
  } else if (ArrayBuffer.isView(value)) {
    return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  } else if (value === null || typeof value !== "object") {
    return value;
  }

  const normalized = {};
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined) {
      continue;
    } else if (key === "eventStreamData") {
      const eventData =
        typeof child === "string" ? child : decoder.decode(new Uint8Array(child));
      // The WASM byte range starts before indentation preceding the Event tag.
      normalized[key] = eventData.trimStart();
    } else if (key === "timelineParser" && typeof child === "function") {
      normalized.timeline = normalizeTimeline(child());
    } else if (
      key === "attributes" &&
      typeof value.value === "string" &&
      Object.keys(child).length === 0
    ) {
      // The WASM generator currently leaves an unused empty object on BaseURL nodes.
      continue;
    } else {
      normalized[key] = normalizeIr(child);
    }
  }
  return normalized;
}

function normalizeTimeline(segments) {
  let currentTime = 0;
  return segments.map(({ attributes }) => {
    const start = attributes.t === undefined ? currentTime : parseInt(attributes.t, 10);
    const duration = attributes.d === undefined ? 0 : parseInt(attributes.d, 10);
    const repeatCount = attributes.r === undefined ? 0 : parseInt(attributes.r, 10);
    currentTime = start + duration * (repeatCount + 1);
    return { start, duration, repeatCount };
  });
}

describe("DASH parser intermediate-representation equivalence", () => {
  const wasmParser = new DashWasmParser();

  function expectEquivalent(xml) {
    const [jsIr] = parseWithJs(xml);
    const [wasmIr] = wasmParser.parseToIntermediateRepresentation(
      encoder.encode(xml).buffer,
    );
    expect(normalizeIr(wasmIr)).toStrictEqual(normalizeIr(jsIr));
  }

  beforeAll(async () => {
    const wasm = readFileSync(resolve(repositoryRoot, "dist/mpd-parser.wasm"));
    const wasmBytes = new Uint8Array(wasm).slice().buffer;
    await wasmParser.initialize({ wasmUrl: wasmBytes });
  });

  for (const fixture of fixtures) {
    it(`matches for ${fixture}`, () => {
      const xml = readFileSync(
        resolve(repositoryRoot, "tests/contents/static", fixture),
        "utf8",
      );
      expectEquivalent(xml);
    });
  }

  // More specialized tests for issues we did have in the past

  it("matches boolean attributes", () => {
    expectEquivalent(`
      <MPD type="static">
        <Period bitstreamSwitching="false">
          <AdaptationSet bitstreamSwitching="false" codingDependency="false"
                         availabilityTimeComplete="false">
            <Representation id="video" bandwidth="1" codingDependency="false"
                            availabilityTimeComplete="false">
              <SegmentTemplate availabilityTimeComplete="false"
                               indexRangeExact="false" bitstreamSwitching="false" />
              <SegmentBase availabilityTimeComplete="false" indexRangeExact="false" />
            </Representation>
          </AdaptationSet>
        </Period>
      </MPD>`);
  });
});
