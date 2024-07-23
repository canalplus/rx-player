/**
 * The PlayReadyHeader sample that will be used to test if the CDM is supported.
 * The KID does not matter because no content will be played, it's only to check if
 * the CDM is capable of creating a session and generating a request.
 */
export declare const DUMMY_PLAY_READY_HEADER = "<WRMHEADER xmlns=\"http://schemas.microsoft.com/DRM/2007/03/PlayReadyHeader\" version=\"4.0.0.0\"><DATA><PROTECTINFO><KEYLEN>16</KEYLEN><ALGID>AESCTR</ALGID></PROTECTINFO><KID>ckB07BNLskeUq0qd83fTbA==</KID><DS_ID>yYIPDBca1kmMfL60IsfgAQ==</DS_ID><CUSTOMATTRIBUTES xmlns=\"\"><encryptionref>312_4024_2018127108</encryptionref></CUSTOMATTRIBUTES><CHECKSUM>U/tsUYRgMzw=</CHECKSUM></DATA></WRMHEADER>";
/**
 * Generate the "cenc" init data for playready from the PlayreadyHeader string.
 * @param {string} playreadyHeader - String representing the PlayreadyHeader XML.
 * @returns {Uint8Array} The init data generated for that PlayreadyHeader.
 * @see https://learn.microsoft.com/en-us/playready/specifications/playready-header-specification
 */
export declare function generatePlayReadyInitData(playreadyHeader: string): Uint8Array;
//# sourceMappingURL=generate_init_data.d.ts.map