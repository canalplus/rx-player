/* eslint-env node */

/**
 * Update the decode time of ISOBMFF segments.
 * @param {Uint8Array} segmentData - The ISOBMFF segment.
 * @param {number} timeOffset - The time at which the segment should be
 * offseted.
 * @param {boolean|undefined} _lmsg - Whether a lmsg should be set. False by
 * default.
 * @returns {Uint8Array} - The updated ISOBMFF
 */
export default function patchSegmentWithTimeOffset(segmentData, timeOffset, _lmsg) {
  let sizeChange = 0;
  const topLevelBoxesToParse = ["moov", "styp", "sidx", "moof", "mdat"];
  const compositeBoxesToParse = ["trak", "moov", "moof", "traf"];
  const lmsg = _lmsg || false;

  /**
   * Get size and boxtype from current box
   * @param {Uint8Array} data
   */
  function getBoxInfos(boxData) {
    const size = be4toi(boxData, 0);
    const boxtype = bytesToStr(boxData.subarray(4, 8));
    return {
      size,
      boxtype,
    };
  }

  /**
   * Triggers box processing
   */
  function patchBoxes() {
    let output = new Uint8Array(0);
    let pos = 0;
    while (pos < segmentData.length) {
      const { size, boxtype } = getBoxInfos(segmentData.subarray(pos, pos + 8));
      const boxdata = segmentData.subarray(pos, pos + size);
      const concatData =
        topLevelBoxesToParse.indexOf(boxtype) >= 0
          ? patchBox(boxtype, boxdata, output.length)
          : boxdata;
      output = concat(output, concatData);
      pos += size;
    }
    return output;
  }

  /**
   * Process specific box and its children
   * @param {string} boxtype
   * @param {Uint8Array} data
   * @param {number} filePos
   * @param {string} _path
   */
  function patchBox(boxtype, boxSpecificData, filePos, _path) {
    let output;
    const path = _path ? _path + "." + boxtype : boxtype;
    if (compositeBoxesToParse.indexOf(boxtype) >= 0) {
      output = boxSpecificData.subarray(0, 8);
      let pos = 8;
      while (pos < boxSpecificData.length) {
        const { size: childSize, boxtype: childBoxType } = getBoxInfos(
          boxSpecificData.subarray(pos, pos + 8),
        );
        const outputChildBox = patchBox(
          childBoxType,
          boxSpecificData.subarray(pos, pos + childSize),
          filePos + pos,
          path,
        );
        output = concat(output, outputChildBox);
        pos += childSize;
      }
      if (output.length !== boxSpecificData.length) {
        output = concat(itobe4(output.length), output.subarray(4, output.length));
      }
    } else {
      switch (boxtype) {
        case "styp":
          output = patchStyp(boxSpecificData);
          break;
        case "trun":
          output = patchTrun(boxSpecificData);
          break;
        case "tfdt":
          output = patchTfdt(boxSpecificData);
          break;
        default:
          output = boxSpecificData;
          break;
      }
    }
    return output;
  }

  /**
   * Process styp and make sure lmsg presence follows the lmsg flag parameter.
   * @param {Uint8Array} input
   * @return {Uint8Array} patched box
   */
  function patchStyp(input) {
    const size = be4toi(input, 0);
    let pos = 8;
    const brands = [];
    while (pos < size) {
      const brand = input.subarray(pos, pos + 4);
      if (bytesToStr(brand) !== "lmsg") {
        brands.push(brand);
      }
      pos += 4;
    }
    if (lmsg) {
      brands.push(strToBytes("lmsg"));
    }
    const dataSize = brands.length * 4;
    const stypData = new Uint8Array(dataSize);
    for (let i = 0; i < brands.length; i++) {
      stypData.set(brands[i], i * 4);
    }
    return Atom("styp", stypData);
  }

  function patchTrun(input) {
    const flags = be4toi(input, 8) & 0xffffff;
    let dataOffsetPresent = false;
    // Data offset present
    if (flags & 0x1) {
      dataOffsetPresent = true;
    }
    // Modify data_offset
    let output = input.subarray(0, 16);
    if (dataOffsetPresent && sizeChange > 0) {
      let trunOffset = be4toi(input, 16);
      trunOffset += sizeChange;
      output = concat(output, itobe4(trunOffset)); // func
    } else {
      output = concat(output, input.subarray(16, 20));
    }
    output = concat(output, input.subarray(20, input.length));
    return output;
  }

  /**
   * Generate new timestamps for tfdt and change size of boxes above if needed.
   * Try to keep in 32 bits if possible.
   * @param input
   */
  function patchTfdt(input) {
    const version = input[8];
    const tfdtOffset = timeOffset;
    let newBaseMediaDecodeTime;
    let output;
    // 32-bit baseMediaDecodeTime
    if (version === 0) {
      const baseMediaDecodeTime = be4toi(input, 12);
      newBaseMediaDecodeTime = baseMediaDecodeTime + tfdtOffset;
      if (newBaseMediaDecodeTime < 4294967296) {
        output = concat(input.subarray(0, 12), itobe4(newBaseMediaDecodeTime));
      } else {
        // Forced to change to 64-bit tfdt.
        sizeChange = 4;
        output = concat(
          itobe4(be4toi(input, 0) + sizeChange),
          input.subarray(4, 8),
          new Uint8Array([1]),
          input.subarray(9, 12),
          itobe8(newBaseMediaDecodeTime),
        );
      }
    } else {
      // 64-bit
      const baseMediaDecodeTime = be8toi(input, 12);
      newBaseMediaDecodeTime = baseMediaDecodeTime + tfdtOffset;
      output = concat(input.subarray(0, 12), itobe8(newBaseMediaDecodeTime));
    }
    return output;
  }

  return patchBoxes();
}

/**
 * Translate groups of 4 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be4toi(bytes, offset) {
  return (
    bytes[offset + 0] * 0x1000000 +
    bytes[offset + 1] * 0x0010000 +
    bytes[offset + 2] * 0x0000100 +
    bytes[offset + 3]
  );
}

/**
 * Translate groups of 8 big-endian bytes to Integer.
 * @param {Uint8Array} bytes
 * @param {Number} offset - The offset (from the start of the given array)
 * @returns {Number}
 */
function be8toi(bytes, offset) {
  return (
    (bytes[offset + 0] * 0x1000000 +
      bytes[offset + 1] * 0x0010000 +
      bytes[offset + 2] * 0x0000100 +
      bytes[offset + 3]) *
      0x100000000 +
    bytes[offset + 4] * 0x1000000 +
    bytes[offset + 5] * 0x0010000 +
    bytes[offset + 6] * 0x0000100 +
    bytes[offset + 7]
  );
}

/**
 * construct string from unicode values.
 * /!\ does not support non-UCS-2 values
 * @param {Uint8Array} bytes
 * @returns {string}
 */
function bytesToStr(bytes) {
  return String.fromCharCode.apply(null, bytes);
}

/**
 * Returns a Uint8Array from the arguments given, in order:
 *   - if the next argument given is a number N set the N next bytes to 0.
 *   - else set the next bytes to the argument given.
 * @param {...(Number|Uint8Array)} args
 * @returns {Uint8Array}
 */
function concat(...args) {
  const l = args.length;
  let i = -1;
  let len = 0;
  let arg;
  while (++i < l) {
    arg = args[i];
    len += typeof arg === "number" ? arg : arg.length;
  }
  const arr = new Uint8Array(len);
  let offset = 0;
  i = -1;
  while (++i < l) {
    arg = args[i];
    if (typeof arg === "number") {
      offset += arg;
    } else if (arg.length > 0) {
      arr.set(arg, offset);
      offset += arg.length;
    }
  }
  return arr;
}

/**
 * Translate Integer to a Uint8Array of length 4 of the corresponding big-endian
 * bytes.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itobe4(num) {
  return new Uint8Array([
    (num >>> 24) & 0xff,
    (num >>> 16) & 0xff,
    (num >>> 8) & 0xff,
    num & 0xff,
  ]);
}

/**
 * Translate Integer to a Uint8Array of length 8 of the corresponding big-endian
 * bytes.
 * /!\ If the top-most bytes are set, this might go over MAX_SAFE_INTEGER, thus
 * leading to a "bad" value.
 * @param {Number} num
 * @returns {Uint8Array}
 */
function itobe8(num) {
  const l = num % 0x100000000;
  const h = (num - l) / 0x100000000;
  return new Uint8Array([
    (h >>> 24) & 0xff,
    (h >>> 16) & 0xff,
    (h >>> 8) & 0xff,
    h & 0xff,
    (l >>> 24) & 0xff,
    (l >>> 16) & 0xff,
    (l >>> 8) & 0xff,
    l & 0xff,
  ]);
}

/**
 * Returns Uint8Array from UTF16 string.
 * /!\ Take only the first byte from each UTF16 code.
 * @param {string} str
 * @returns {Uint8Array}
 */
function strToBytes(str) {
  const len = str.length;
  const arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    arr[i] = str.charCodeAt(i) & 0xff;
  }
  return arr;
}

/**
 * Create a new _Atom_ (isobmff box).
 * @param {string} name - The box name (e.g. sidx, moov, pssh etc.)
 * @param {Uint8Array} buff - The box's content
 */
function Atom(name, buff) {
  const len = buff.length + 8;
  return concat(itobe4(len), strToBytes(name), buff);
}
