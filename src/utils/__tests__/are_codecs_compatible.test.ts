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
