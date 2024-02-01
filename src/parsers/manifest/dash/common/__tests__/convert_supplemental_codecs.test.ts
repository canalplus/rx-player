import { convertSupplementalCodecsToRFC6381 } from "../convert_supplemental_codecs";

describe("parseSupplementalCodec", () => {
  it("should return the codec unchanged if there is only one codec", () => {
    expect(convertSupplementalCodecsToRFC6381("avc1.4d400d")).toEqual("avc1.4d400d");
  });
  it("should trim starting and ending whitespace", () => {
    expect(convertSupplementalCodecsToRFC6381("  avc1.4d400d  ")).toEqual("avc1.4d400d");
  });
  it("should return comma-separated list if input is whitespace-separated", () => {
    expect(convertSupplementalCodecsToRFC6381("avc1.4d400d avc1.4d4015")).toEqual(
      "avc1.4d400d, avc1.4d4015",
    );
  });
  it("should return comma-separated value if input is already comma-separated", () => {
    expect(convertSupplementalCodecsToRFC6381("avc1.4d400d, avc1.4d4015")).toEqual(
      "avc1.4d400d, avc1.4d4015",
    );
  });

  it("should return comma-separated value if input as missplaced whitespace", () => {
    expect(convertSupplementalCodecsToRFC6381("avc1.4d400d  ,  avc1.4d4015 ")).toEqual(
      "avc1.4d400d, avc1.4d4015",
    );
  });

  it(`should return comma-separated value if input is mix of comma and 
    whitespace separated list`, () => {
    expect(
      convertSupplementalCodecsToRFC6381("avc1.4d400d avc1.4d4015, avc1.4d401f"),
    ).toEqual("avc1.4d400d, avc1.4d4015, avc1.4d401f");
  });
});
