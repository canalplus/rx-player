import { describe, beforeEach, it, expect, vi, afterEach } from "vitest";
import type {
  base64ToBytes as IBase64ToBytes,
  bytesToBase64 as IBytesToBase64,
} from "../base64";
import globalScope from "../global_scope";

/** Every chars defined in base64. */
const CHARS = [
  "A",
  "R",
  "i",
  "z",
  "B",
  "S",
  "j",
  "0",
  "C",
  "T",
  "k",
  "1",
  "D",
  "U",
  "l",
  "2",
  "E",
  "V",
  "m",
  "3",
  "F",
  "W",
  "n",
  "4",
  "G",
  "X",
  "o",
  "5",
  "H",
  "Y",
  "p",
  "6",
  "I",
  "Z",
  "q",
  "7",
  "J",
  "a",
  "r",
  "8",
  "K",
  "b",
  "s",
  "9",
  "L",
  "c",
  "t",
  "+",
  "M",
  "d",
  "u",
  "/",
  "N",
  "e",
  "v",
  "O",
  "f",
  "w",
  "P",
  "g",
  "x",
  "Q",
  "h",
  "y",
];

describe("base64ToBytes", () => {
  const logWarn = vi.fn();
  beforeEach(() => {
    vi.doMock("../../log", () => ({
      default: { warn: logWarn },
    }));
  });
  afterEach(() => {
    vi.resetModules();
    logWarn.mockReset();
  });

  it("should return an empty Uint8Array for an empty string", async () => {
    const base64ToBytes = (await vi.importActual("../base64"))
      .base64ToBytes as typeof IBase64ToBytes;
    expect(base64ToBytes("")).toEqual(new Uint8Array([]));
    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should convert a base64 to an Uint8Array", async () => {
    const base64ToBytes = (await vi.importActual("../base64"))
      .base64ToBytes as typeof IBase64ToBytes;
    expect(base64ToBytes("woDCge+/vg==")).toEqual(
      new Uint8Array([194, 128, 194, 129, 239, 191, 190]),
    );
    expect(base64ToBytes("dG90b/CfjIM=")).toEqual(
      new Uint8Array([116, 111, 116, 111, 240, 159, 140, 131]),
    );
    expect(base64ToBytes("JGV4cGVjdChiYXNlNjRUb1VpbnQ4QXJyYXkoIiIp")).toEqual(
      new Uint8Array([
        36, 101, 120, 112, 101, 99, 116, 40, 98, 97, 115, 101, 54, 52, 84, 111, 85, 105,
        110, 116, 56, 65, 114, 114, 97, 121, 40, 34, 34, 41,
      ]),
    );
    expect(base64ToBytes(globalScope.btoa("toto"))).toEqual(
      new Uint8Array([116, 111, 116, 111]),
    );
    expect(logWarn).not.toHaveBeenCalled();

    const bytesToBase64 = (await vi.importActual("../base64"))
      .bytesToBase64 as typeof IBytesToBase64;

    for (let i = 0; i < CHARS.length; i++) {
      const char1 = CHARS[i];
      for (let j = 0; j < CHARS.length; j++) {
        const char2 = CHARS[j];
        // for (let k = 0; k < CHARS.length; k++) {
        //   const char3 = CHARS[j];
        //   for (let l = 0; l < CHARS.length; l++) {
        //     const char4 = CHARS[j];
        const combination = char1 + char2 + char2 + char1;
        expect(bytesToBase64(base64ToBytes(combination))).toEqual(combination);
        // }
        // }
      }
    }
  });

  it("should convert a non-padded base64 to an Uint8Array", async () => {
    const base64ToBytes = (await vi.importActual("../base64"))
      .base64ToBytes as typeof IBase64ToBytes;
    expect(base64ToBytes("woDCge+/vg")).toEqual(
      new Uint8Array([194, 128, 194, 129, 239, 191, 190]),
    );
    expect(logWarn).toHaveBeenCalledTimes(1);
    expect(logWarn).toHaveBeenNthCalledWith(
      1,
      "base64ToBytes: base64 given miss padding",
    );
    expect(base64ToBytes("dG90b/CfjIM")).toEqual(
      new Uint8Array([116, 111, 116, 111, 240, 159, 140, 131]),
    );
    expect(logWarn).toHaveBeenCalledTimes(2);
    expect(logWarn).toHaveBeenNthCalledWith(
      1,
      "base64ToBytes: base64 given miss padding",
    );
  });

  it("should fail on invalid data", async () => {
    const base64ToBytes = (await vi.importActual("../base64"))
      .base64ToBytes as typeof IBase64ToBytes;
    expect(() => base64ToBytes("woD=Cge+/vg=")).toThrowError(
      "Unable to parse base64 string.",
    );
    expect(() => base64ToBytes("woDCg{+/vg==")).toThrowError(
      "Unable to parse base64 string.",
    );
    expect(() => base64ToBytes("dG90b/Cfj===")).toThrowError(
      "Unable to parse base64 string.",
    );
  });
});

describe("bytesToBase64", () => {
  const logWarn = vi.fn();
  beforeEach(() => {
    vi.resetModules();
    logWarn.mockReset();
    vi.doMock("../../log", () => ({
      default: { warn: logWarn },
    }));
  });

  it("should return an empty string for an empty Uint8Array", async () => {
    const bytesToBase64 = (await vi.importActual("../base64"))
      .bytesToBase64 as typeof IBytesToBase64;
    expect(bytesToBase64(new Uint8Array([]))).toEqual("");
    expect(logWarn).not.toHaveBeenCalled();
  });

  it("should convert a base64 to an Uint8Array", async () => {
    const bytesToBase64 = (await vi.importActual("../base64"))
      .bytesToBase64 as typeof IBytesToBase64;
    expect(bytesToBase64(new Uint8Array([194, 128, 194, 129, 239, 191, 190]))).toEqual(
      "woDCge+/vg==",
    );
    expect(
      bytesToBase64(new Uint8Array([116, 111, 116, 111, 240, 159, 140, 131])),
    ).toEqual("dG90b/CfjIM=");
    expect(
      bytesToBase64(
        new Uint8Array([
          36, 101, 120, 112, 101, 99, 116, 40, 98, 97, 115, 101, 54, 52, 84, 111, 85, 105,
          110, 116, 56, 65, 114, 114, 97, 121, 40, 34, 34, 41,
        ]),
      ),
    ).toEqual("JGV4cGVjdChiYXNlNjRUb1VpbnQ4QXJyYXkoIiIp");
    expect(bytesToBase64(new Uint8Array([116, 111, 116, 111]))).toEqual(
      globalScope.btoa("toto"),
    );
    expect(logWarn).not.toHaveBeenCalled();
  });
});
