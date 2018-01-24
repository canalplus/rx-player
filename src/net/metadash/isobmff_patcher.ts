/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    be4toi,
    be8toi,
    bytesToStr,
    concat,
    itobe4,
    itobe8,
    strToBytes,
  } from "../../utils/bytes";

/**
 * Create a new _Atom_ (isobmff box).
 * @param {string} name - The box name (e.g. sidx, moov, pssh etc.)
 * @param {Uint8Array} buff - The box's content
 */
function Atom(name : string, buff : Uint8Array) : Uint8Array {
  const len = buff.length + 8;
  return concat(itobe4(len), strToBytes(name), buff);
}

export default class BoxPatchers {
    private offset: number;
    private lmsg: boolean;
    private isTtml = false;
    private segNr: number|undefined;
    private topLevelBoxesToParse: string[] = [];
    private compositeBoxesToParse: string[] = [];
    private sizeChange = 0;
    private tfdtValue?: number;
    private duration?: number;
    private ttmlSize?: number;
    private data: Uint8Array;

    constructor(
        data: Uint8Array,
        lmsg: boolean,
        isTtml: boolean,
        offset?: number,
        segNr?: number
    ) {
        this.data = data;
        this.topLevelBoxesToParse = ["moov", "styp", "sidx", "moof", "mdat"];
        this.compositeBoxesToParse = ["trak", "moov", "moof", "traf"];
        this.segNr = segNr;
        this.offset = offset || 0;
        this.lmsg = lmsg || false;
        this.isTtml = isTtml || false;
        if (this.isTtml) {
            this.data = this.findAndProcessMdat(this.data);
        }
    }

    /**
     * Get size and boxtype from current box
     * @param {Uint8Array} data
     */
    checkBox(data: Uint8Array) {
      const size = be4toi(data, 0);
      const boxtype = bytesToStr(data.subarray(4,8));
      return {
        size,
        boxtype,
      };
    }

    /**
     * Triggers box processing
     */
    filter() {
      let output = new Uint8Array(0);
      let pos = 0;
      while(pos < this.data.length) {
        const { size, boxtype } = this.checkBox(this.data.subarray(pos, pos + 8));
        const boxdata = this.data.subarray(pos, pos + size);
        const concatData = (this.topLevelBoxesToParse
          .indexOf(boxtype) >= 0) ?
            this.filterBox(boxtype, boxdata, output.length) :
            boxdata;
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
     * @param {string} _path
     */
    filterBox(
      boxtype: string,
      data: Uint8Array,
      filePos: number,
      _path?: string
    ): Uint8Array{
      let output = new Uint8Array(0);
      const path = _path ? (_path + "." + boxtype) : boxtype;
      if (this.compositeBoxesToParse.indexOf(boxtype) >= 0) {
        output = data.subarray(0,8);
        let pos = 8;
        while(pos < data.length) {
          const {
            size: childSize,
            boxtype: childBoxType,
          } = this.checkBox(data.subarray(pos, pos + 8));
          const outputChildBox =
            this.filterBox(
              childBoxType,
              data.subarray(pos, pos + childSize),
              filePos+pos,
              path
            );
          output = concat(output, outputChildBox);
          pos += childSize;
        }
        if (output.length !== data.length) {
          output = concat(itobe4(output.length), output.subarray(4, output.length));
        }
      } else {
        switch(boxtype) {
          case "styp":
            output = this.styp(data);
            break;
          case "tfhd":
            output = this.tfhd(data);
            break;
          case "mfhd":
            output = this.mfhd(data);
            break;
          case "trun":
            output = this.trun(data);
            break;
          case "sidx":
            output = this.sidx(data, true);
            break;
          case "tfdt":
            output = this.tfdt(data);
            break;
          case "mdat":
            output = data;
            break;
          case "mvhd":
            output = this.mvhd(data);
            break;
          case "tkhd":
            output = this.tkhd(data);
            break;
          default:
            output = data;
            break;
        }
        // if (output.toString() !== data.toString()) {
        //   console.log(boxtype);
        //   console.log("");
        // }
      }
      return output;
    }

    tkhd(input: Uint8Array): Uint8Array {
      const version = input[8];
      let output = new Uint8Array(0);
      if (version === 1) {
        output = concat(
          input.subarray(0,36),
          itobe8(0),
          input.subarray(44, input.length)
        );
      } else {
        output = concat(
          input.subarray(0,28),
          itobe4(0),
          input.subarray(32, input.length)
        );
      }
      return output;
    }

    mvhd(input: Uint8Array): Uint8Array {
      const version = input[8];
      let output = new Uint8Array(0);
      if (version === 1) {
        output = concat(
          input.subarray(0,32),
          itobe8(0),
          input.subarray(40, input.length)
        );
      } else {
        output = concat(
          input.subarray(0,24),
          itobe4(0),
          input.subarray(28, input.length)
        );
      }
      return output;
    }

    /**
     * Process styp and make sure lmsg presence follows the lmsg flag parameter.
     * Add scte35 box if appropriate
     * @param {Uint8Array} input
     * @return {Uint8Array} patched box
     */
    styp(input: Uint8Array): Uint8Array {
      const lmsg = this.lmsg;
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
      const data = new Uint8Array(dataSize);
      for (let i = 0; i < brands.length; i++) {
        data.set(brands[i], i*4);
      }
      return Atom("styp", data);
    }

    /**
     * Process tfhd (assuming that we know the ttml size size).
     * @param {Uint8Array} input
     * @return {Uint8Array} patched box
     */
    tfhd(input: Uint8Array): Uint8Array {
      let output = new Uint8Array(0);
      if (!this.isTtml) {
        return input;
      }
      const tfFlags = be4toi(input.subarray(8,12), 0) & 0xFFFFFF;
      let pos = 16;
      if (tfFlags & 0x01) {
        throw new Error("base-data-offset-present not supported in ttml segments");
      }
      if (tfFlags & 0x02) {
        pos += 4;
      }
      if ((tfFlags & 0x08) === 0) {
        throw new Error("Cannot handle ttml segments with no default_sample_duration");
      } else {
        pos += 4;
      }
      if (tfFlags && 0x10 && this.ttmlSize) {
        output = concat(input.subarray(0, pos), itobe4(this.ttmlSize));
      }
      else{
        throw new Error(
          "Cannot handle ttml segments if default_sample_size_offset is absent"
        );
      }
      output = concat(output, input.subarray(pos, input.length));
      return output;
    }

    /**
     * Process mfhd box and set segmentNumber if requested.
     * @param {Uint8Array} input
     * @return {Uint8Array} patched box
     */
    mfhd(input: Uint8Array): Uint8Array {
      if (!this.segNr) {
        return input;
      }
      const prefix = input.subarray(0, 12);
      const segNrByte = itobe4(this.segNr);
      return concat(prefix, segNrByte);
    }

    /**
     * Get total duration from trun.
     * Fix offset if self.sizeChange is non-zero.
     * @param {Uint8Array} input
     * @return {Uint8Array} patched box
     */
    trun(input: Uint8Array): Uint8Array {
      const flags = be4toi(input, 8) & 0xFFFFFF;
      const sampleCount = be4toi(input, 16);
      let pos = 16;
      let dataOffsetPresent = false;
      // Data offset present
      if (flags & 0x1) {
        dataOffsetPresent = true;
        pos += 4;
      }
      // First sample flags present
      if (flags & 0x4) {
          pos += 4;
      }
      const sampleDurationPresent = flags & 0x100;
      const sampleSizePresent = flags & 0x200;
      const sampleFlagsPresent = flags & 0x400;
      const sampleCompTimePresent = flags & 0x800;
      let duration = 0;
      for (let i = 0; i<sampleCount; i++) {
        if (sampleDurationPresent) {
            duration += be4toi(input, pos);
            pos += 4;
        }
        if (sampleSizePresent) {
          pos += 4;
        }
        if (sampleFlagsPresent) {
            pos += 4;
      }
        if (sampleCompTimePresent) {
            pos += 4;
        }
      }
      this.duration = duration;
      // Modify data_offset
      let output = input.subarray(0, 16);
      if (dataOffsetPresent && this.sizeChange > 0) {
        let offset = be4toi(input, 16);
        offset += this.sizeChange;
        output = concat(output, itobe4(offset)); // func
      }
      else {
        output = concat(output, input.subarray(16,20));
      }
      output = concat(output, input.subarray(20, input.length));
      return output;
    }

    /**
     * Process sidx data and add to output.
     * @param {Uint8Array} input
     * @param {boolean} keepSidx
     */
    sidx(input: Uint8Array, patchSidx: boolean): Uint8Array {
      let output = new Uint8Array(0);
      if (!patchSidx) {
        return input;
      }
      let earliestPresentationTime;
      let firstOffset;
      const version = input[8];
      const timescale = be4toi(input, 16);
      if (version === 0) {
        // Changing sidx version to 1
        const size = be4toi(input, 0);
        const sidxSizeExpansion = 8;
        output = concat(
          itobe4(size + sidxSizeExpansion),
          input.subarray(4,8),
          new Uint8Array([1]),
          input.subarray(9, 20));
        earliestPresentationTime = be4toi(input, 20);
        firstOffset = be4toi(input, 24);
      }
      else {
        output = input.subarray(0, 20);
        earliestPresentationTime = be8toi(input, 20);
        firstOffset = be8toi(input, 28);
      }
      const newPresentationTime = earliestPresentationTime + timescale * this.offset;
      output = concat(output, itobe8(newPresentationTime), itobe8(firstOffset));
      const suffixOffset = version === 0 ? 28 : 36;
      output = concat(output, input.subarray(suffixOffset, input.length));
      return output;
    }

    /**
     * Generate new timestamps for tfdt and change size of boxes above if needed.
     * Try to keep in 32 bits if possible.
     * @param input
     */
    tfdt(input: Uint8Array): Uint8Array{
      const version = input[8];
      const tfdtOffset = this.offset;
      let newBaseMediaDecodeTime;
      let output = new Uint8Array(0);
      // 32-bit baseMediaDecodeTime
      if (version === 0) {
        const baseMediaDecodeTime = be4toi(input, 12);
        newBaseMediaDecodeTime = baseMediaDecodeTime + tfdtOffset;
        if (newBaseMediaDecodeTime < 4294967296) {
          output = concat(input.subarray(0,12), itobe4(newBaseMediaDecodeTime));
        } else {
          // Forced to change to 64-bit tfdt.
          this.sizeChange = 4;
          output = concat(
            itobe4(be4toi(input, 0) + this.sizeChange),
            input.subarray(4,8),
            new Uint8Array([1]),
            input.subarray(9, 12),
            itobe8(newBaseMediaDecodeTime)
          );
        }
      } else { // 64-bit
        const baseMediaDecodeTime = be8toi(input, 12);
        newBaseMediaDecodeTime = baseMediaDecodeTime + tfdtOffset;
        output = concat(input.subarray(0,12), itobe8(newBaseMediaDecodeTime));
      }
      this.tfdtValue = newBaseMediaDecodeTime;
      return output;
    }

      /**
       * Update the ttml payload of mdat and its size.
       */
      // update_ttml_mdat(data: Uint8Array) {
      //   const ttml_xml = data.subarray(8, data.length);
      //   const ttml_out = adjust_ttml_content(ttml_xml, this.offset, this.segNr);
      //   this.ttmlSize = ttml_out.length;
      //   const out_size = this.ttmlSize + 8;
      //   return concat(itobe4(out_size), strToBytes("mdat"), strToBytes(ttml_out));
      // }

      /**
       * Change the ttml part of mdat and update mdat size. Return full new data.
       */
      findAndProcessMdat(data: Uint8Array) {
        // let pos = 0;
        // let output = new Uint8Array(0);
        // while (pos < data.length) {
        //     const size = be4toi(data, pos);
        //     const boxtype = bytesToStr(data.subarray(pos+4,pos+8));
        //     const input_for_update =
        //       boxtype !== "mdat" ?
        //         data.subarray(pos, pos+size) :
        //         this.update_ttml_mdat(data.subarray(pos, pos+size));
        //     output = concat(output, input_for_update);
        //     pos += size;
        // }
        // return output;
        return data;
      }

      getTfdt() {
        return this.tfdtValue;
      }

      getDuration() {
        return this.duration;
      }
    }
