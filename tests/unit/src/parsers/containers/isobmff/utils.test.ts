import { describe, it, expect, vi } from "vitest";
import { parseEmsgBoxes } from "../../../../../../src/parsers/containers/isobmff/utils.ts";
import { concat, itobe4 } from "../../../../../../src/utils/byte_parsing.ts";
import { strToUtf8 } from "../../../../../../src/utils/string_parsing.ts";

vi.mock("../../../../../../src/log", () => ({
  default: { warn: vi.fn(), debug: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

/**
 * Create an ISOBMFF box from its name and content.
 * @param {string} name
 * @param {Uint8Array} content
 * @returns {Uint8Array}
 */
function createBox(name: string, content: Uint8Array): Uint8Array {
  return concat(itobe4(8 + content.length), strToUtf8(name), content);
}

/**
 * Create a version 0 "emsg" box.
 * @param {Object} args
 * @returns {Uint8Array}
 */
function createEmsgV0(args: {
  schemeIdUri: string;
  value: string;
  id: number;
  messageData: Uint8Array;
  version?: number;
}): Uint8Array {
  return createBox(
    "emsg",
    concat(
      new Uint8Array([args.version ?? 0, 0, 0, 0]), // version + flags
      strToUtf8(args.schemeIdUri),
      new Uint8Array([0]),
      strToUtf8(args.value),
      new Uint8Array([0]),
      itobe4(1000), // timescale
      itobe4(500), // presentation_time_delta
      itobe4(2000), // event_duration
      itobe4(args.id),
      args.messageData,
    ),
  );
}

describe("parseEmsgBoxes", () => {
  it("should return undefined when there's no emsg box", () => {
    const data = createBox("free", new Uint8Array([1, 2, 3]));
    expect(parseEmsgBoxes(data)).toBe(undefined);
  });

  it("should parse a single emsg box", () => {
    const messageData = new Uint8Array([1, 2, 3, 4]);
    const data = createEmsgV0({ schemeIdUri: "urn:a", value: "1", id: 7, messageData });
    expect(parseEmsgBoxes(data)).toEqual([
      {
        schemeIdUri: "urn:a",
        value: "1",
        timescale: 1000,
        presentationTimeDelta: 500,
        eventDuration: 2000,
        id: 7,
        messageData,
      },
    ]);
  });

  it("should parse multiple adjacent emsg boxes", () => {
    const data = concat(
      createEmsgV0({
        schemeIdUri: "urn:a",
        value: "1",
        id: 1,
        messageData: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
      }),
      createEmsgV0({
        schemeIdUri: "urn:b",
        value: "2",
        id: 2,
        messageData: new Uint8Array([11, 12]),
      }),
      createEmsgV0({
        schemeIdUri: "urn:c",
        value: "3",
        id: 3,
        messageData: new Uint8Array([]),
      }),
    );
    const res = parseEmsgBoxes(data);
    expect(res?.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(res?.map((e) => e.schemeIdUri)).toEqual(["urn:a", "urn:b", "urn:c"]);
    expect(res?.[0].messageData).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    expect(res?.[1].messageData).toEqual(new Uint8Array([11, 12]));
    expect(res?.[2].messageData).toEqual(new Uint8Array([]));
  });

  it("should parse emsg boxes placed after or between other boxes", () => {
    const data = concat(
      createBox("styp", new Uint8Array([1, 2, 3, 4])),
      createEmsgV0({
        schemeIdUri: "urn:a",
        value: "1",
        id: 1,
        messageData: new Uint8Array([5, 6, 7]),
      }),
      createBox("free", new Uint8Array(20)),
      createEmsgV0({
        schemeIdUri: "urn:b",
        value: "2",
        id: 2,
        messageData: new Uint8Array([8]),
      }),
      createBox("moof", new Uint8Array(16)),
    );
    expect(parseEmsgBoxes(data)?.map((e) => e.id)).toEqual([1, 2]);
  });

  it("should skip unsupported emsg versions without stopping", () => {
    const data = concat(
      createEmsgV0({
        schemeIdUri: "urn:a",
        value: "1",
        id: 1,
        messageData: new Uint8Array([]),
        version: 1,
      }),
      createEmsgV0({
        schemeIdUri: "urn:b",
        value: "2",
        id: 2,
        messageData: new Uint8Array([]),
      }),
    );
    expect(parseEmsgBoxes(data)?.map((e) => e.id)).toEqual([2]);
  });
});
