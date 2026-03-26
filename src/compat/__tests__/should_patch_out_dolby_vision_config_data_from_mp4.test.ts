import { describe, it, expect, vi } from "vitest";
import shouldPatchOutDolbyVisionConfigDataFromMp4 from "../should_patch_out_dolby_vision_config_data_from_mp4";

const mockGetChromeVersion = vi.hoisted(() => vi.fn());
vi.mock("../browser_version", () => ({
  getChromeVersion: mockGetChromeVersion,
}));

describe("compat - shouldPatchOutDolbyVisionConfigDataFromMp4", () => {
  it("should return false if Chrome version is null", () => {
    mockGetChromeVersion.mockReturnValue(null);
    expect(shouldPatchOutDolbyVisionConfigDataFromMp4(["dvh1.something"], "hevc")).toBe(
      false,
    );
  });

  it("should return false if Chrome version is 94", () => {
    mockGetChromeVersion.mockReturnValue(94);
    expect(shouldPatchOutDolbyVisionConfigDataFromMp4(["dvh1.something"], "hevc")).toBe(
      false,
    );
  });

  it("should return false if Chrome version is above 94", () => {
    mockGetChromeVersion.mockReturnValue(120);
    expect(shouldPatchOutDolbyVisionConfigDataFromMp4(["dvh1.something"], "hevc")).toBe(
      false,
    );
  });

  it("should return false if no Dolby Vision codec is present in the codecs array", () => {
    mockGetChromeVersion.mockReturnValue(80);
    expect(shouldPatchOutDolbyVisionConfigDataFromMp4(["hevc", "avc1"], "hevc")).toBe(
      false,
    );
  });

  it("should return false if the chosen codec is itself a Dolby Vision codec (dvh1)", () => {
    mockGetChromeVersion.mockReturnValue(80);
    expect(
      shouldPatchOutDolbyVisionConfigDataFromMp4(
        ["dvh1.something", "hevc"],
        "dvh1.something",
      ),
    ).toBe(false);
  });

  it("should return false if the chosen codec is itself a Dolby Vision codec (dvhe)", () => {
    mockGetChromeVersion.mockReturnValue(80);
    expect(
      shouldPatchOutDolbyVisionConfigDataFromMp4(
        ["dvhe.something", "hevc"],
        "dvhe.something",
      ),
    ).toBe(false);
  });

  it("should return false if chosenCodec is undefined", () => {
    mockGetChromeVersion.mockReturnValue(80);
    expect(
      shouldPatchOutDolbyVisionConfigDataFromMp4(["dvh1.something"], undefined),
    ).toBe(false);
  });

  it("should return true if Chrome version is below 94, codecs contain Dolby Vision, and chosen codec is not Dolby Vision", () => {
    mockGetChromeVersion.mockReturnValue(80);
    expect(
      shouldPatchOutDolbyVisionConfigDataFromMp4(["dvh1.something", "hevc"], "hevc"),
    ).toBe(true);
  });

  it("should return true when Dolby Vision is signaled via dvhe and chosen codec is a retro-compatible one", () => {
    mockGetChromeVersion.mockReturnValue(93);
    expect(
      shouldPatchOutDolbyVisionConfigDataFromMp4(["dvhe.something", "hevc"], "hevc"),
    ).toBe(true);
  });
});
