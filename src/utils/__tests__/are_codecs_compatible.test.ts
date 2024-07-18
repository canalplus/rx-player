import { describe, it, expect } from "vitest";
import areCodecsCompatible from "../are_codecs_compatible";

describe("are_codecs_compatible", () => {
  it("should return false as one is different from the other", () => {
    expect(areCodecsCompatible("", 'audio/mp4;codecs="mp4a.42.2"')).toEqual(false);
  });

  it("should return false as the mimeType is different", () => {
    expect(
      areCodecsCompatible('audio/mp4;codecs="mp4a.40.2"', 'audio/mp3;codecs="mp4a.40.2"'),
    ).toEqual(false);
  });

  it("should return false as the codec is different", () => {
    expect(
      areCodecsCompatible('audio/mp4;codecs="mp4a.40.2"', 'audio/mp4;codecs="av1.40.2"'),
    ).toEqual(false);
  });

  it("should return true as only the codec version is different", () => {
    expect(
      areCodecsCompatible('audio/mp4;codecs="mp4a.40.2"', 'audio/mp4;codecs="mp4a.42.2"'),
    ).toEqual(true);
  });

  it("should return true as they are exactly same", () => {
    expect(
      areCodecsCompatible(
        'audio/mp4;toto=5;codecs="mp4a.40.2";test=4',
        'audio/mp4;toto=5;codecs="mp4a.40.2";test=4',
      ),
    ).toEqual(true);
  });

  it("should return true as their codecs are same", () => {
    expect(
      areCodecsCompatible(
        'audio/mp4;toto=6;codecs="mp4a.40.2";test=4',
        'audio/mp4;toto=5;codecs="mp4a.40.2";test=4',
      ),
    ).toEqual(true);
  });

  it("should return false as their codecs are different", () => {
    expect(
      areCodecsCompatible(
        'audio/mp4;toto=6;codecs="av1.40.2";test=4',
        'audio/mp4;toto=5;codecs="mp4a.40.2";test=4',
      ),
    ).toEqual(false);
  });

  it("should return false as codecs have been found", () => {
    expect(
      areCodecsCompatible("audio/mp4;toto=6;test=4", "audio/mp4;toto=5;test=4"),
    ).toEqual(false);
  });
});

describe("isCodecInCompatibleCodecList", () => {
  it("should return true if the compatible codec is supported", () => {
    const supportedCodecs = [
      { mimeType: "video/mp4", codec: "avc1.4eed1", result: true },
    ];
    const isCompatible = isCompatibleCodecSupported(
      "video/mp4",
      "avc1.4df1",
      supportedCodecs,
    );
    expect(isCompatible).toBe(true);
  });

  it("should return false if the compatible codec is explicitly not supported", () => {
    const supportedCodecs = [
      { mimeType: "video/mp4", codec: "avc1.4df1", result: true },
      { mimeType: "video/mp4", codec: "hvc1.1.6.L93.B0", result: false },
    ];
    const isCompatible = isCompatibleCodecSupported(
      "video/mp4",
      "hvc1.1.6.L153",
      supportedCodecs,
    );
    expect(isCompatible).toBe(false);
  });

  it("should return undefined if there is no compatible codec", () => {
    const supportedCodecs = [
      { mimeType: "video/mp4", codec: "avc1.4df1", result: true },
      { mimeType: "video/mp4", codec: "hvc1.1.6.L93.B0", result: false },
    ];
    const isCompatible = isCompatibleCodecSupported("video/mp4", "vp9", supportedCodecs);
    expect(isCompatible).toBe(undefined);
  });
});
