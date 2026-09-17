import { describe, it, expect } from "vitest";
import {
  DUMMY_PLAY_READY_HEADER,
  generatePlayReadyInitData,
  getDummyInitDataForKeySystem,
} from "../../../../src/compat/generate_init_data.ts";
import { utf16LEToStr } from "../../../../src/utils/string_parsing.ts";

describe("utils - generatePlayReadyInitData", () => {
  const playReadyHeader =
    '<WRMHEADER xmlns="http://schemas.microsoft.com/DRM/2007/03/PlayReadyHeader" version="4.0.0.0"><DATA><PROTECTINFO><KEYLEN>16</KEYLEN><ALGID>AESCTR</ALGID></PROTECTINFO><KID>ckB07BNLskeUq0qd83fTbA==</KID><DS_ID>yYIPDBca1kmMfL60IsfgAQ==</DS_ID><CUSTOMATTRIBUTES xmlns=""><encryptionref>312_4024_2018127108</encryptionref></CUSTOMATTRIBUTES></DATA></WRMHEADER>';

  const initData = generatePlayReadyInitData(playReadyHeader);
  const decodedInitDataUtf16LE = utf16LEToStr(initData);

  it("has correct length", () => {
    // the expected length for an initData with that PlayReady header.
    expect(initData.length).toBe(754);
  });

  it("has the playerReadyHeader in it", () => {
    expect(decodedInitDataUtf16LE).toMatch(playReadyHeader);
  });
});

describe("getDummyInitDataForKeySystem", () => {
  it("returns PlayReady initialization data for a PlayReady key system", () => {
    expect(
      getDummyInitDataForKeySystem("com.microsoft.playready.recommendation"),
    ).toEqual(generatePlayReadyInitData(DUMMY_PLAY_READY_HEADER));
  });

  it("return Nagra InitData for tvkey keysystem", () => {
    expect(getDummyInitDataForKeySystem("com.tvkey.drm")).toBeInstanceOf(Uint8Array);
  });

  it("throws when no initialization data is available for the key system", () => {
    expect(() => getDummyInitDataForKeySystem("com.widevine.alpha")).toThrow(
      'No dummy initialization data for key system "com.widevine.alpha"',
    );
  });
});
