import { itole4, itobe4, itole2, concat } from "../utils/byte_parsing";
import { strToUtf8, strToUtf16LE, hexToBytes } from "../utils/string_parsing";

/**
 * The PlayReadyHeader sample that will be used to test if the CDM is supported.
 * The KID does not matter because no content will be played, it's only to check if
 * the CDM is capable of creating a session and generating a request.
 */
export const DUMMY_PLAY_READY_HEADER =
  /* eslint-disable-next-line max-len */
  '<WRMHEADER xmlns="http://schemas.microsoft.com/DRM/2007/03/PlayReadyHeader" version="4.0.0.0"><DATA><PROTECTINFO><KEYLEN>16</KEYLEN><ALGID>AESCTR</ALGID></PROTECTINFO><KID>ckB07BNLskeUq0qd83fTbA==</KID><DS_ID>yYIPDBca1kmMfL60IsfgAQ==</DS_ID><CUSTOMATTRIBUTES xmlns=""><encryptionref>312_4024_2018127108</encryptionref></CUSTOMATTRIBUTES><CHECKSUM>U/tsUYRgMzw=</CHECKSUM></DATA></WRMHEADER>';

/**
 * Generate the "cenc" init data for playready from the PlayreadyHeader string.
 * @param {string} playreadyHeader - String representing the PlayreadyHeader XML.
 * @returns {Uint8Array} The init data generated for that PlayreadyHeader.
 * @see https://learn.microsoft.com/en-us/playready/specifications/playready-hea
 * der-specification
 */
export function generatePlayReadyInitData(playreadyHeader: string): Uint8Array {
  const recordValueEncoded = strToUtf16LE(playreadyHeader);
  const recordLength = itole2(recordValueEncoded.length);
  // RecordType: 0x0001	Indicates that the record contains a PlayReady Header (PRH).
  const recordType = new Uint8Array([1, 0]);
  const numberOfObjects = new Uint8Array([1, 0]); // 1 PlayReady object

  /* playReadyObjectLength equals = X bytes for record + 2 bytes for record length,
  + 2 bytes for record types + 2 bytes for number of object  */
  const playReadyObjectLength = itole4(recordValueEncoded.length + 6);
  const playReadyObject = concat(
    playReadyObjectLength, // 4 bytes for the Playready object length
    numberOfObjects, // 2 bytes for the number of PlayReady objects
    recordType, // 2 bytes for record type
    recordLength, // 2 bytes for record length
    recordValueEncoded, // X bytes for record value
  );

  /**  the systemId is define at https://dashif.org/identifiers/content_protection/ */
  const playreadySystemId = hexToBytes("9a04f07998404286ab92e65be0885f95");

  return generateInitData(playReadyObject, playreadySystemId);
}

/**
 * Generate the "cenc" initData given the data and the systemId to use.
 * Note this will generate an initData for version 0 of pssh.
 * @param data - The data that is contained inside the pssh.
 * @param systemId - The systemId to use.
 * @returns
 */
function generateInitData(data: Uint8Array, systemId: Uint8Array): Uint8Array {
  const psshBoxName = strToUtf8("pssh");
  const versionAndFlags = new Uint8Array([0, 0, 0, 0]); // pssh version 0
  const sizeOfData = itobe4(data.length);
  const psshSize = itobe4(
    4 /* pssh size */ +
      4 /* pssh box */ +
      4 /* version and flags */ +
      16 /* systemId */ +
      4 /* size of data */ +
      data.length /* data */,
  );
  return concat(
    psshSize, // 4 bytes for the pssh size
    psshBoxName, // 4 bytes for the pssh box
    versionAndFlags, // 4 bytes for version and flags
    systemId, // 16 bytes for the systemId
    sizeOfData, // 4 bytes for the data size
    data, // X bytes for data
  );
}
