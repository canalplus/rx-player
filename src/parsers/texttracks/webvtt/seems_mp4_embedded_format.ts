import bufferSourceToUint8 from "../../../utils/buffer_source_to_uint8";
import startsWith from "../../../utils/starts_with";
import { strToUtf8 } from "../../../utils/string_parsing";
import { getMDAT } from "../../containers/isobmff";

/**
 * Returns `true` if the current WEBVTT format has very high chances to be the
 * MP4-embedded one.
 * Returns `false` if that's not the case.
 * @param {string|BufferSource} input
 * @returns {boolean}
 */
export default function seemsMp4EmbeddedFormat(input: string | BufferSource): boolean {
  if (typeof input !== "string") {
    const toUint8 = bufferSourceToUint8(input);
    const hasBom = toUint8[0] === 0xfe && toUint8[1] === 0xff;
    const baseOffset = hasBom ? 2 : 0;
    if (
      toUint8[baseOffset + 0] !== 0x57 /* W */ ||
      toUint8[baseOffset + 1] !== 0x45 /* E */ ||
      toUint8[baseOffset + 2] !== 0x42 /* B */ ||
      toUint8[baseOffset + 3] !== 0x56 /* V */ ||
      toUint8[baseOffset + 4] !== 0x54 /* T */ ||
      toUint8[baseOffset + 5] !== 0x54 /* T */
    ) {
      // No WEBVTT Header.
      // We're either in an MP4 file, either an invalid file.
      const mdat = getMDAT(toUint8);
      return mdat !== null;
    } else {
      return false;
    }
  } else {
    if (startsWith(input, "WEBVTT")) {
      return false;
    } else {
      // No WEBVTT Header.
      // We're either in an MP4 file, either an invalid file.
      const mdat = getMDAT(strToUtf8(input));
      return mdat !== null;
    }
  }
}
