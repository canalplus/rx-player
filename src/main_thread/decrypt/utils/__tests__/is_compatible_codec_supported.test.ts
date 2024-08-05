import { describe, it, expect } from "vitest";
import isCompatibleCodecSupported from "../is_compatible_codec_supported";

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
