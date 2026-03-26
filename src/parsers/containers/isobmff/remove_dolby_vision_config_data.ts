import log from "../../../log";
import { be4toi } from "../../../utils/byte_parsing";
import { boxTypeToFourCC, getBoxContent, getBoxOffsets } from "./get_box";

/**
 * Replace every dvcC/dvvC/dvwC box in an ISOBMFF segment with FREE boxes.
 * Useful to strip Dolby Vision configuration when the decoder cannot handle it.
 *
 * Unlike PSSH (which sits directly under `moov`), DV config boxes are nested
 * deep inside each track: moov > trak > mdia > minf > stbl > stsd > <codec> > dvcC|dvvC|dvwC
 * There may be multiple `trak` boxes, so we walk all of them.
 *
 * @param {Uint8Array} data - the ISOBMFF segment
 * @returns {void}
 */
export default function removeDolbyVisionConfigData(data: Uint8Array<ArrayBuffer>): void {
  const moov = getBoxContent(data, 0x6d6f6f76 /* moov */);
  if (moov === null) {
    return;
  }

  // Walk every trak box inside moov
  let trakStart = 0;
  while (trakStart < moov.length) {
    let trakOffsets;
    try {
      trakOffsets = getBoxOffsets(moov.subarray(trakStart), 0x7472616b /* trak */);
    } catch (e) {
      const err = e instanceof Error ? e : "";
      log.warn("isobmff", "Error while iterating trak boxes in ISOBMFF", err);
      return;
    }
    if (trakOffsets === null) {
      break;
    }

    const trak = getBoxContent(moov.subarray(trakStart), 0x7472616b /* trak */);
    if (trak !== null) {
      removeDvcCFromTrak(trak);
    }

    // Advance past this trak box to find the next one
    trakStart += trakOffsets[2];
  }
}

/**
 * Walk the stsd box inside a trak and replace any dvcC/dvvC/dvwC boxes
 * with free boxes.
 * @param {Uint8Array} trak - content of a trak box
 */
function removeDvcCFromTrak(trak: Uint8Array<ArrayBuffer>): void {
  const DV_BOX_TYPES = [
    0x64766343 /* dvcC */, 0x64767643 /* dvvC */, 0x64767743 /* dvwC */,
  ];

  // Descend: trak > mdia > minf > stbl > stsd
  const mdia = getBoxContent(trak, 0x6d646961 /* mdia */);
  if (mdia === null) {
    return;
  }
  const minf = getBoxContent(mdia, 0x6d696e66 /* minf */);
  if (minf === null) {
    return;
  }
  const stbl = getBoxContent(minf, 0x7374626c /* stbl */);
  if (stbl === null) {
    return;
  }
  const stsd = getBoxContent(stbl, 0x73747364 /* stsd */);
  if (stsd === null) {
    return;
  }

  const stsdChildren = stsd.subarray(8);

  // Each codec box (avc1, hvc1, av01 …) may contain a dvcC/dvvC/dvwC child.
  let codecStart = 0;
  while (codecStart < stsdChildren.length) {
    if (codecStart + 8 > stsdChildren.length) {
      break;
    }

    const codecBoxSize = be4toi(stsdChildren, codecStart);
    const codecBoxType = be4toi(stsdChildren, codecStart + 4);

    if (codecBoxSize < 8 || codecStart + codecBoxSize > stsdChildren.length) {
      break;
    }

    // The codec box is a VisualSampleEntry (or a wrapper like encv/enca).
    // Its layout is: size(4)+type(4)+reserved(6)+data_ref_idx(2) = 16 bytes,
    // then codec-specific fixed fields before child boxes begin.
    // We scan forward from offset 16 (past the mandatory SampleEntry header)
    // looking for the first plausible box boundary, then walk child boxes from
    // there.
    const codecBox = stsdChildren.subarray(codecStart, codecStart + codecBoxSize);

    // Find where children start: scan from offset 16 for a size+fourcc that
    // fits entirely within the box.
    const childrenStart = findNextChildrenStartOffset(codecBox);
    if (childrenStart === null) {
      codecStart += codecBoxSize;
      continue;
    }

    const codecChildren = codecBox.subarray(childrenStart);

    // Now search for and erase DV boxes
    for (const dvBoxType of DV_BOX_TYPES) {
      let dvStart = 0;
      while (dvStart < codecChildren.length) {
        let dvOffsets;
        try {
          dvOffsets = getBoxOffsets(codecChildren.subarray(dvStart), dvBoxType);
        } catch (e) {
          const err = e instanceof Error ? e : "";
          log.warn(
            "isobmff",
            "Error while patching out dvcC/dvvC/dvwC from ISOBMFF",
            err,
          );
          break;
        }
        if (dvOffsets === null) {
          break;
        }

        if (log.hasLevel("DEBUG")) {
          log.debug(
            "isobmff",
            `Found '${boxTypeToFourCC(dvBoxType)}' inside '${boxTypeToFourCC(codecBoxType)}', overwriting with 'free'`,
          );
        }

        // Overwrite the 4-byte box type with `free` (0x66726565)
        const typeByteOffset = dvStart + dvOffsets[0] + 4;
        codecChildren[typeByteOffset] = 0x66; /* f */
        codecChildren[typeByteOffset + 1] = 0x72; /* r */
        codecChildren[typeByteOffset + 2] = 0x65; /* e */
        codecChildren[typeByteOffset + 3] = 0x65; /* e */

        // Advance past this box (size of box relative to the current slice)
        dvStart += dvOffsets[2] - dvOffsets[0];
      }
    }

    codecStart += codecBoxSize;
  }
}

/**
 * Scan a codec box (VisualSampleEntry or wrapper) to find the byte offset
 * where child boxes begin. We skip the mandatory SampleEntry header (16 bytes)
 * and then look for the first offset whose size+type looks like a valid box
 * that fits within the parent.
 */
function findNextChildrenStartOffset(box: Uint8Array): number | null {
  // SampleEntry header: size(4)+type(4)+reserved(6)+data_ref_idx(2) = 16 bytes minimum.
  // Children can only start after that.
  for (let off = 16; off + 8 <= box.length; off++) {
    const size = be4toi(box, off);
    if (size < 8 || off + size > box.length) {
      continue;
    }
    // Check that the four-byte type is all printable ASCII as a sanity check.
    let allPrint = true;
    for (let i = off + 4; i < off + 8; i++) {
      if (box[i] < 0x20 || box[i] > 0x7e) {
        allPrint = false;
        break;
      }
    }
    if (allPrint) {
      return off;
    }
  }
  return null;
}
