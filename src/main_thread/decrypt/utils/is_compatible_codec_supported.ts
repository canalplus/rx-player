import areCodecsCompatible from "../../../utils/are_codecs_compatible";
import type { ICodecSupportList } from "../find_key_system";

/**
 * Find the first codec in the provided codec list that is compatible with the given mimeType and codec.
 * This first codec is called the "compatible codec". Return true if the "compatible codec"
 * is supported or false if it's not supported. If no "compatible codec" has been found, return undefined.
 *
 * @param {string} mimeType - The MIME type to check.
 * @param {string} codec - The codec to check.
 * @param {Array} codecList - The list of codecs to check against.
 * @returns {boolean|undefined} - True if the "compatible codec" is supported, false if not,
 * or undefined if no "compatible codec" is found.
 */
export default function isCompatibleCodecSupported(
  mimeType: string,
  codec: string,
  codecList: ICodecSupportList,
): boolean | undefined {
  const inputCodec = `${mimeType};codecs="${codec}"`;
  const sameMimeTypeCodec = codecList.filter((c) => c.mimeType === mimeType);
  if (sameMimeTypeCodec.length === 0) {
    // No codec with the same MIME type was found.
    return undefined;
  }

  for (const {
    codec: currentCodec,
    mimeType: currentMimeType,
    result,
  } of sameMimeTypeCodec) {
    const existingCodec = `${currentMimeType};codecs="${currentCodec}"`;
    if (areCodecsCompatible(inputCodec, existingCodec)) {
      return result;
    }
  }
  // No compatible codec was found.
  return undefined;
}
