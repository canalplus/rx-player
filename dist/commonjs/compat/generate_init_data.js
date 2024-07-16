"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePlayReadyInitData = exports.DUMMY_PLAY_READY_HEADER = void 0;
var byte_parsing_1 = require("../utils/byte_parsing");
var string_parsing_1 = require("../utils/string_parsing");
/**
 * The PlayReadyHeader sample that will be used to test if the CDM is supported.
 * The KID does not matter because no content will be played, it's only to check if
 * the CDM is capable of creating a session and generating a request.
 */
exports.DUMMY_PLAY_READY_HEADER = '<WRMHEADER xmlns="http://schemas.microsoft.com/DRM/2007/03/PlayReadyHeader" version="4.0.0.0"><DATA><PROTECTINFO><KEYLEN>16</KEYLEN><ALGID>AESCTR</ALGID></PROTECTINFO><KID>ckB07BNLskeUq0qd83fTbA==</KID><DS_ID>yYIPDBca1kmMfL60IsfgAQ==</DS_ID><CUSTOMATTRIBUTES xmlns=""><encryptionref>312_4024_2018127108</encryptionref></CUSTOMATTRIBUTES><CHECKSUM>U/tsUYRgMzw=</CHECKSUM></DATA></WRMHEADER>';
/**
 * Generate the "cenc" init data for playready from the PlayreadyHeader string.
 * @param {string} playreadyHeader - String representing the PlayreadyHeader XML.
 * @returns {Uint8Array} The init data generated for that PlayreadyHeader.
 * @see https://learn.microsoft.com/en-us/playready/specifications/playready-header-specification
 */
function generatePlayReadyInitData(playreadyHeader) {
    var recordValueEncoded = (0, string_parsing_1.strToUtf16LE)(playreadyHeader);
    var recordLength = (0, byte_parsing_1.itole2)(recordValueEncoded.length);
    // RecordType: 0x0001	Indicates that the record contains a PlayReady Header (PRH).
    var recordType = new Uint8Array([1, 0]);
    var numberOfObjects = new Uint8Array([1, 0]); // 1 PlayReady object
    /* playReadyObjectLength equals = X bytes for record + 2 bytes for record length,
    + 2 bytes for record types + 2 bytes for number of object  */
    var playReadyObjectLength = (0, byte_parsing_1.itole4)(recordValueEncoded.length + 6);
    var playReadyObject = (0, byte_parsing_1.concat)(playReadyObjectLength, // 4 bytes for the Playready object length
    numberOfObjects, // 2 bytes for the number of PlayReady objects
    recordType, // 2 bytes for record type
    recordLength, // 2 bytes for record length
    recordValueEncoded);
    /**  the systemId is define at https://dashif.org/identifiers/content_protection/ */
    var playreadySystemId = (0, string_parsing_1.hexToBytes)("9a04f07998404286ab92e65be0885f95");
    return generateInitData(playReadyObject, playreadySystemId);
}
exports.generatePlayReadyInitData = generatePlayReadyInitData;
/**
 * Generate the "cenc" initData given the data and the systemId to use.
 * Note this will generate an initData for version 0 of pssh.
 * @param data - The data that is contained inside the pssh.
 * @param systemId - The systemId to use.
 * @returns
 */
function generateInitData(data, systemId) {
    var psshBoxName = (0, string_parsing_1.strToUtf8)("pssh");
    var versionAndFlags = new Uint8Array([0, 0, 0, 0]); // pssh version 0
    var sizeOfData = (0, byte_parsing_1.itobe4)(data.length);
    var psshSize = (0, byte_parsing_1.itobe4)(4 /* pssh size */ +
        4 /* pssh box */ +
        4 /* version and flags */ +
        16 /* systemId */ +
        4 /* size of data */ +
        data.length /* data */);
    return (0, byte_parsing_1.concat)(psshSize, // 4 bytes for the pssh size
    psshBoxName, // 4 bytes for the pssh box
    versionAndFlags, // 4 bytes for version and flags
    systemId, // 16 bytes for the systemId
    sizeOfData, // 4 bytes for the data size
    data);
}
