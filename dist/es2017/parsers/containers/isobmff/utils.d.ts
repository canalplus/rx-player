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
import { getPlayReadyKIDFromPrivateData } from "./drm";
/** Information related to a PSSH box. */
export interface IISOBMFFPSSHInfo {
    /** Corresponding DRM's system ID, as an hexadecimal string. */
    systemId: string;
    /** Additional data contained in the PSSH Box. */
    privateData: Uint8Array;
}
/**
 * Fake encryption metadata in the given initialization segment to make the
 * browser believe it is handling an encrypted segment.
 *
 * This beautiful mess is needed because multiple user-agents (meaning "browser"
 * in the w3c dialect :p) implementations, mostly those based on PlayReady,
 * poorly handle contents with mixed encrypted and unencrypted contents.
 *
 * By faking encryption information in initialization segments, it seems that
 * most of those problems disappear.
 *
 * Note that this work-around was not found by me, I actually saw it in the
 * shaka-player's code (google's own DASH player) while investigating this issue.
 * So kudos and thanks to them I guess!
 *
 * @param {BufferSource} segment
 * @returns {Uint8Array}
 */
export declare function fakeEncryptionDataInInitSegment(segment: BufferSource): Uint8Array;
/**
 * Inband event data when the data was contained inside an ISOBMFF box.
 * The value and their name corresponds to the same one than in the
 * corresponding ISOBMFF specification.
 */
export interface IEMSG {
    schemeIdUri: string;
    value: string;
    timescale: number;
    presentationTimeDelta: number;
    eventDuration: number;
    id: number;
    messageData: Uint8Array;
}
/** Segment information from a parsed sidx. */
export interface ISidxSegment {
    /** This segment start time, timescaled. */
    time: number;
    /** This segment difference between its end and start time, timescaled. */
    duration: number;
    /** Dividing `time` or `duration` with this value allows to obtain seconds. */
    timescale: number;
    /**
     * Start and ending bytes (included) for the segment in the whole ISOBMFF
     * buffer.
     */
    range: [number, number];
}
/**
 * Parse the sidx part (segment index) of an ISOBMFF buffer and construct a
 * corresponding Array of available segments.
 *
 * Returns `null` if not found.
 * @param {Uint8Array} buf
 * @param {Number} sidxOffsetInWholeSegment
 * @returns {Object|null} {Array.<Object>} - Information about each subsegment.
 */
declare function getSegmentsFromSidx(buf: Uint8Array, sidxOffsetInWholeSegment: number): ISidxSegment[] | null;
/**
 * Parse track Fragment Decode Time to get a precize initial time for this
 * segment (in the media timescale).
 *
 * Stops at the first tfdt encountered from the beginning of the file.
 * Returns this time.
 * `undefined` if not found.
 * @param {Uint8Array} buffer
 * @returns {Number | undefined}
 */
declare function getTrackFragmentDecodeTime(buffer: Uint8Array): number | undefined;
/**
 * Calculate segment duration approximation by additioning the duration from
 * every samples in a trun ISOBMFF box.
 *
 * Returns `undefined` if we could not parse the duration.
 * @param {Uint8Array} buffer
 * @returns {number | undefined}
 */
declare function getDurationFromTrun(buffer: Uint8Array): number | undefined;
/**
 * Get timescale information from a movie header box. Found in init segments.
 * `undefined` if not found or not parsed.
 *
 * This timescale is the default timescale used for segments.
 * @param {Uint8Array} buffer
 * @returns {Number | undefined}
 */
declare function getMDHDTimescale(buffer: Uint8Array): number | undefined;
/**
 * Update ISOBMFF given to add a "pssh" box in the "moov" box for every content
 * protection in the psshList array given.
 * @param {Uint8Array} buf - the ISOBMFF file
 * @param {Array.<Object>} psshList
 * @returns {Uint8Array} - The new ISOBMFF generated.
 */
declare function patchPssh(buf: Uint8Array, psshList: IISOBMFFPSSHInfo[]): Uint8Array;
/**
 * Returns a new version of the given box with the size updated
 * so it reflects its actual size.
 *
 * You can use this function after modifying a ISOBMFF box so its size is
 * updated.
 *
 * /!\ Please consider that this function might mutate the given Uint8Array
 * in place or might create a new one, depending on the current conditions.
 * @param {Uint8Array} buf - The ISOBMFF box
 * @returns {Uint8Array}
 */
declare function updateBoxLength(buf: Uint8Array): Uint8Array;
/**
 * Parse EMSG boxes from ISOBMFF data.
 * @param {Uint8Array} buffer
 * @returns {Array.<Object> | undefined}
 */
declare function parseEmsgBoxes(buffer: Uint8Array): IEMSG[] | undefined;
/**
 * @param {Uint8Array} segment
 * @returns {Uint8Array|null}
 */
declare function getKeyIdFromInitSegment(segment: Uint8Array): Uint8Array | null;
export { getKeyIdFromInitSegment, getMDHDTimescale, getPlayReadyKIDFromPrivateData, getTrackFragmentDecodeTime, getDurationFromTrun, getSegmentsFromSidx, patchPssh, updateBoxLength, parseEmsgBoxes, };
