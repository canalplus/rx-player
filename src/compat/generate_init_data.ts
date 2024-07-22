import { base64ToBytes, bytesToBase64 } from "../utils/base64";
import {
  itole4,
  itobe4,
  itole2,
  concat,
  le2toi,
  be4toi,
  be2toi,
} from "../utils/byte_parsing";
import isNullOrUndefined from "../utils/is_null_or_undefined";
import {
  strToUtf8,
  strToUtf16LE,
  hexToBytes,
  bytesToHex,
  utf16LEToStr,
} from "../utils/string_parsing";
import { findXmlElementByName, parseXml, toContentString } from "../utils/xml-parser";

/**
 * The PlayReadyHeader sample that will be used to test if the CDM is supported.
 * The KID does not matter because no content will be played, it's only to check if
 * the CDM is capable of creating a session and generating a request.
 */
export const DUMMY_PLAY_READY_HEADER =
  '<WRMHEADER xmlns="http://schemas.microsoft.com/DRM/2007/03/PlayReadyHeader" version="4.0.0.0"><DATA><PROTECTINFO><KEYLEN>16</KEYLEN><ALGID>AESCTR</ALGID></PROTECTINFO><KID>ckB07BNLskeUq0qd83fTbA==</KID><DS_ID>yYIPDBca1kmMfL60IsfgAQ==</DS_ID><CUSTOMATTRIBUTES xmlns=""><encryptionref>312_4024_2018127108</encryptionref></CUSTOMATTRIBUTES><CHECKSUM>U/tsUYRgMzw=</CHECKSUM></DATA></WRMHEADER>';

/**
 * Generate the "cenc" init data for playready from the PlayreadyHeader string.
 * @param {string} playreadyHeader - String representing the PlayreadyHeader XML.
 * @returns {Uint8Array} The init data generated for that PlayreadyHeader.
 * @see https://learn.microsoft.com/en-us/playready/specifications/playready-header-specification
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

export function extractPlayReadyKidAndChecksumFromInitData(initData: Uint8Array): Array<{
  keyId: Uint8Array;
  checksum?: Uint8Array | undefined;
}> | null {
  try {
    let offset = 0;
    while (offset < initData.length) {
      const boxSize = be4toi(initData, offset);
      const boxEnd = offset + boxSize;
      offset += 4 /* pssh size */ + 4 /* box name */ + 4 /* version + flags */;
      if (
        bytesToHex(initData.subarray(offset, offset + 16)).toLowerCase() !==
        "9a04f07998404286ab92e65be0885f95"
      ) {
        offset = boxEnd;
        continue;
      }
      offset += 16 /* systemId */ + 4 /* data size */ + 4 /* PlayReady Object length */;
      const objectRecordCount = le2toi(initData, offset);
      offset += 2 /* 2 bytes for the number of PlayReady objects */;
      const ret = [];
      for (let i = 0; i < objectRecordCount; i++) {
        const recordType = le2toi(initData, offset);
        offset += 2 /* 2 bytes for record type */;
        const recordLength = be2toi(initData, offset);
        offset += 2 /* 2 bytes for record length */;
        if (recordType !== 1) {
          offset += recordLength;
          continue;
        }
        const xmlDataStr = utf16LEToStr(initData.subarray(offset, offset + recordLength));
        offset += recordLength;
        const xmlDoc = parseXml(xmlDataStr);
        const kidXml = findXmlElementByName(xmlDoc, "KID");
        const checksumXml = findXmlElementByName(xmlDoc, "CHECKSUM");
        if (kidXml === null) {
          continue;
        }
        if (isNullOrUndefined(kidXml.attributes.VALUE)) {
          const kidContent = toContentString(kidXml);
          if (kidContent.length === 0) {
            continue;
          }
          // TODO GUID to UUID?
          const kidGuidBytes = base64ToBytes(kidContent);
          if (checksumXml !== null) {
            const checksum = base64ToBytes(toContentString(checksumXml));
            ret.push({
              keyId: kidGuidBytes,
              checksum: checksum.byteLength > 0 ? checksum : undefined,
            });
          } else {
            ret.push({
              keyId: kidGuidBytes,
            });
          }
        } else {
          // TODO GUID to UUID?
          const kidGuidBytes = base64ToBytes(kidXml.attributes.VALUE);
          if (checksumXml !== null) {
            const checksum = base64ToBytes(toContentString(checksumXml));
            ret.push({
              keyId: kidGuidBytes,
              checksum: checksum.byteLength > 0 ? checksum : undefined,
            });
          } else {
            if (!isNullOrUndefined(kidXml.attributes.CHECKSUM)) {
              const checksum = base64ToBytes(kidXml.attributes.CHECKSUM);
              ret.push({
                keyId: kidGuidBytes,
                checksum: checksum.byteLength > 0 ? checksum : undefined,
              });
            } else {
              ret.push({
                keyId: kidGuidBytes,
              });
            }
          }
        }
      }
      return ret;
    }
  } catch (_) {
    // do nothing
  }
  return null;
}

export function generatePlayReadyInitDataForKeyId({
  keyId,
  checksum,
}: {
  keyId: Uint8Array;
  checksum?: Uint8Array | undefined;
}): Uint8Array {
  const playreadyHeader =
    '<WRMHEADER xmlns="http://schemas.microsoft.com/DRM/2007/03/PlayReadyHeader" version="4.0.0.0">' +
    "<DATA><PROTECTINFO><KEYLEN>16</KEYLEN><ALGID>AESCTR</ALGID></PROTECTINFO><KID>" +
    bytesToBase64(keyId) +
    "</KID>" +
    "<DS_ID>yYIPDBca1kmMfL60IsfgAQ==</DS_ID>" +
    '<CUSTOMATTRIBUTES xmlns=""><encryptionref>312_4024_2018127108</encryptionref></CUSTOMATTRIBUTES>' +
    (checksum !== undefined
      ? "<CHECKSUM>" + bytesToBase64(checksum) + "</CHECKSUM>"
      : "") +
    "</DATA></WRMHEADER>";
  return generatePlayReadyInitData(playreadyHeader);
}
