import { describe, it, expect } from "vitest";
import removeDolbyVisionConfigData from "../../../../../../src/parsers/containers/isobmff/remove_dolby_vision_config_data.ts";

/** Write a big-endian uint32 into a DataView */
function writeU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, false);
}

/**
 * Build a minimal ISOBMFF box:
 *   [size u32][type u32][...payload]
 */
function buildBox(
  type: number,
  payload: Uint8Array<ArrayBuffer>,
): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(8 + payload.length);
  const view = new DataView(buf.buffer);
  writeU32(view, 0, buf.length);
  writeU32(view, 4, type);
  buf.set(payload, 8);
  return buf;
}

/**
 * Concatenate multiple Uint8Arrays into one.
 */
function concat(...arrays: Array<Uint8Array<ArrayBuffer>>): Uint8Array<ArrayBuffer> {
  const total = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    out.set(a, offset);
    offset += a.length;
  }
  return out;
}

// Box type constants
const MOOV = 0x6d6f6f76;
const TRAK = 0x7472616b;
const MDIA = 0x6d646961;
const MINF = 0x6d696e66;
const STBL = 0x7374626c;
const STSD = 0x73747364;
const HVC1 = 0x68766331;
const AVC1 = 0x61766331;
const AV01 = 0x61763031;
const DVCC = 0x64766343;
const DVVC = 0x64767643;
const DVWC = 0x64767743;
const FREE = 0x66726565;

/**
 * Build a minimal dvcC/dvvC/dvwC payload (5 bytes of fields + 19 reserved).
 * Values are representative of a real Profile 8 / level 6 / HDR10-compat record.
 */
function buildDvBox(type: number): Uint8Array<ArrayBuffer> {
  const payload = new Uint8Array(24);
  const view = new DataView(payload.buffer);
  payload[0] = 1; // dv_version_major
  payload[1] = 0; // dv_version_minor
  // dv_profile=8 (7 bits), dv_level=6 (6 bits), rpu=1, el=0, bl=1
  // => 0b_0001000_000110_1_0_1 packed into 16 bits = 0x10_35
  view.setUint16(2, 0x1035, false);
  // dv_bl_signal_compatibility_id=1 (HDR10) in top 4 bits => 0x10
  payload[4] = 0x10;
  // bytes 5–23: reserved zeros (already zero)
  return buildBox(type, payload);
}

/**
 * Build a minimal stsd FullBox wrapping a codec box that contains a DV config box.
 * stsd FullBox header: version(1) + flags(3) + entry_count(4) = 8 bytes before children.
 */
function buildStsd(codecType: number, dvBoxType: number): Uint8Array<ArrayBuffer> {
  const dvBox = buildDvBox(dvBoxType);
  // A real codec box has extra fields before its children, but for our purposes
  // the parser only cares about finding the dv child box inside it.
  // We add 8 bytes of dummy codec-box fields (e.g. reserved + data-ref-index).
  const codecPayload = concat(new Uint8Array(8), dvBox);
  const codecBox = buildBox(codecType, codecPayload);
  // stsd FullBox header: 4 bytes (version+flags) + 4 bytes (entry_count=1)
  const stsdHeader = new Uint8Array(8);
  new DataView(stsdHeader.buffer).setUint32(4, 1, false); // entry_count = 1
  const stsdPayload = concat(stsdHeader, codecBox);
  return buildBox(STSD, stsdPayload);
}

/**
 * Wrap an stsd box in the full stbl > minf > mdia > trak chain.
 */
function buildTrakFromStsd(stsd: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const stbl = buildBox(STBL, stsd);
  const minf = buildBox(MINF, stbl);
  const mdia = buildBox(MDIA, minf);
  return buildBox(TRAK, mdia);
}

/**
 * Wrap a trak (or multiple traks) in a moov box.
 */
function buildMoov(...traks: Array<Uint8Array<ArrayBuffer>>): Uint8Array<ArrayBuffer> {
  return buildBox(MOOV, concat(...traks));
}

/**
 * Find the byte offset of a box type within a buffer using a flat byte-by-byte
 * scan. This finds boxes at any nesting depth.
 * Returns -1 if not found.
 */
function findBoxOffset(buf: Uint8Array, type: number): number {
  for (let i = 0; i + 8 <= buf.length; i++) {
    const t = new DataView(buf.buffer, buf.byteOffset + i + 4, 4).getUint32(0, false);
    if (t === type) {
      return i;
    }
  }
  return -1;
}

describe("removeDolbyVisionConfigData", () => {
  describe("when there is no moov box", () => {
    it("does nothing and does not throw", () => {
      const data = buildBox(0x66726565 /* free */, new Uint8Array(16));
      const before = data.slice();
      removeDolbyVisionConfigData(data);
      expect(data).toEqual(before);
    });
  });

  describe("when moov has no trak", () => {
    it("does nothing and does not throw", () => {
      const data = buildMoov(buildBox(0x75647461 /* udta */, new Uint8Array(4)));
      const before = data.slice();
      removeDolbyVisionConfigData(data);
      expect(data).toEqual(before);
    });
  });

  describe("when trak has no dvcC/dvvC/dvwC", () => {
    it("leaves all box types untouched", () => {
      const stsd = buildStsd(HVC1, 0x68766343 /* hvcC — not a DV box */);
      const data = buildMoov(buildTrakFromStsd(stsd));
      const before = data.slice();
      removeDolbyVisionConfigData(data);
      expect(data).toEqual(before);
    });
  });

  describe("dvcC replacement", () => {
    it("replaces dvcC type bytes with 'free'", () => {
      const stsd = buildStsd(HVC1, DVCC);
      const data = buildMoov(buildTrakFromStsd(stsd));

      removeDolbyVisionConfigData(data);

      const dvOffset = findBoxOffset(data, DVCC);
      expect(dvOffset).toBe(-1); // no longer found as dvcC

      // The box that was dvcC should now read as `free`
      const freeOffset = findBoxOffset(data, FREE);
      expect(freeOffset).toBeGreaterThan(-1);
    });

    it("preserves the box size field", () => {
      const stsd = buildStsd(HVC1, DVCC);
      const data = buildMoov(buildTrakFromStsd(stsd));
      const dvOffset = findBoxOffset(data, DVCC);
      const sizeBefore = new DataView(
        data.buffer,
        data.byteOffset + dvOffset,
        4,
      ).getUint32(0, false);

      removeDolbyVisionConfigData(data);

      // find the free box at the same position
      const sizeAfter = new DataView(
        data.buffer,
        data.byteOffset + dvOffset,
        4,
      ).getUint32(0, false);
      expect(sizeAfter).toBe(sizeBefore);
    });

    it("preserves the payload bytes after replacing the type", () => {
      const stsd = buildStsd(HVC1, DVCC);
      const data = buildMoov(buildTrakFromStsd(stsd));
      const dvOffset = findBoxOffset(data, DVCC);
      const payloadBefore = data.slice(dvOffset + 8);

      removeDolbyVisionConfigData(data);

      const payloadAfter = data.slice(dvOffset + 8);
      expect(payloadAfter).toEqual(payloadBefore);
    });
  });

  describe("dvvC replacement", () => {
    it("replaces dvvC type bytes with 'free'", () => {
      const stsd = buildStsd(HVC1, DVVC);
      const data = buildMoov(buildTrakFromStsd(stsd));

      removeDolbyVisionConfigData(data);

      expect(findBoxOffset(data, DVVC)).toBe(-1);
      expect(findBoxOffset(data, FREE)).toBeGreaterThan(-1);
    });
  });

  describe("dvwC replacement", () => {
    it("replaces dvwC type bytes with 'free' (AV1 base layer)", () => {
      const stsd = buildStsd(AV01, DVWC);
      const data = buildMoov(buildTrakFromStsd(stsd));

      removeDolbyVisionConfigData(data);

      expect(findBoxOffset(data, DVWC)).toBe(-1);
      expect(findBoxOffset(data, FREE)).toBeGreaterThan(-1);
    });
  });

  describe("multiple trak boxes", () => {
    it("replaces dvcC in all trak boxes", () => {
      const stsd1 = buildStsd(HVC1, DVCC);
      const stsd2 = buildStsd(AVC1, DVCC);
      const data = buildMoov(buildTrakFromStsd(stsd1), buildTrakFromStsd(stsd2));

      removeDolbyVisionConfigData(data);

      // No dvcC should remain anywhere in the buffer
      expect(findBoxOffset(data, DVCC)).toBe(-1);
    });

    it("only touches the DV track and leaves a non-DV trak intact", () => {
      const stsdWithDv = buildStsd(HVC1, DVCC);
      const stsdWithoutDv = buildStsd(AVC1, 0x61766343 /* avcC */);
      const data = buildMoov(
        buildTrakFromStsd(stsdWithDv),
        buildTrakFromStsd(stsdWithoutDv),
      );
      const before = data.slice();

      removeDolbyVisionConfigData(data);

      // The avcC box should be completely untouched
      const avcCOffset = findBoxOffset(data, 0x61766343);
      const avcCOffsetBefore = findBoxOffset(before, 0x61766343);
      expect(avcCOffset).toBe(avcCOffsetBefore);
    });
  });

  describe("mixed dvcC and dvvC in the same segment", () => {
    it("replaces both", () => {
      const stsd1 = buildStsd(HVC1, DVCC);
      const stsd2 = buildStsd(HVC1, DVVC);
      const data = buildMoov(buildTrakFromStsd(stsd1), buildTrakFromStsd(stsd2));

      removeDolbyVisionConfigData(data);

      expect(findBoxOffset(data, DVCC)).toBe(-1);
      expect(findBoxOffset(data, DVVC)).toBe(-1);
    });
  });

  describe("empty segment", () => {
    it("does not throw on an empty buffer", () => {
      const data = new Uint8Array(0);
      expect(() => removeDolbyVisionConfigData(data)).not.toThrow();
    });
  });

  describe("truncated box", () => {
    it("does not throw on a truncated moov", () => {
      const full = buildMoov(buildTrakFromStsd(buildStsd(HVC1, DVCC)));
      // Truncate to just the moov header — incomplete content
      const truncated = full.slice(0, 10);
      expect(() => removeDolbyVisionConfigData(truncated)).not.toThrow();
    });
  });
});
