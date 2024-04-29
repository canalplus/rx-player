import { generatePlayReadyInitData } from "../generate_init_data";
import { utf16LEToStr } from "../string_parsing";

describe("utils - generatePlayReadyInitData", () => {
  const playReadyHeader =
    '<WRMHEADER xmlns="http://schemas.microsoft.com/DRM/2007/03/PlayReadyHeader" version="4.0.0.0"><DATA><PROTECTINFO><KEYLEN>16</KEYLEN><ALGID>AESCTR</ALGID></PROTECTINFO><KID>ckB07BNLskeUq0qd83fTbA==</KID><LA_URL>http://drm.canal-plus.com/</LA_URL><LUI_URL>http://drm.canal-plus.com/</LUI_URL><DS_ID>yYIPDBca1kmMfL60IsfgAQ==</DS_ID><CUSTOMATTRIBUTES xmlns=""><encryptionref>312_4024_2018127108</encryptionref></CUSTOMATTRIBUTES><CHECKSUM>U/tsUYRgMzw=</CHECKSUM></DATA></WRMHEADER>';

  const initData = generatePlayReadyInitData(playReadyHeader);
  const decodedInitDataUtf16LE = utf16LEToStr(initData);

  it("has correct length", () => {
    // the expected length for an initData with that PlayReady header.
    expect(initData.length).toBe(996);
  });

  it("has the playerReadyHeader in it", () => {
    expect(decodedInitDataUtf16LE).toMatch(playReadyHeader);
  });
});
