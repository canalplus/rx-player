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
import log from "../../log";
import { getMDHDTimescale, getSegmentsFromSidx, takePSSHOut, } from "../../parsers/containers/isobmff";
import { fakeEncryptionDataInInitSegment, getKeyIdFromInitSegment, parseEmsgBoxes, } from "../../parsers/containers/isobmff/utils";
import { getSegmentsFromCues, getTimeCodeScale } from "../../parsers/containers/matroska";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import getISOBMFFTimingInfos from "../utils/get_isobmff_timing_infos";
import inferSegmentContainer from "../utils/infer_segment_container";
import getEventsOutOfEMSGs from "./get_events_out_of_emsgs";
/**
 * @param {Object} config
 * @returns {Function}
 */
export default function generateAudioVideoSegmentParser({ __priv_patchLastSegmentInSidx, }) {
    return function audioVideoSegmentParser(loadedSegment, context, initTimescale) {
        var _a, _b;
        const { segment, periodStart, periodEnd } = context;
        const { data, isChunked } = loadedSegment;
        const appendWindow = [periodStart, periodEnd];
        if (data === null) {
            if (segment.isInit) {
                return {
                    segmentType: "init",
                    initializationData: null,
                    initializationDataSize: 0,
                    protectionData: [],
                    initTimescale: undefined,
                };
            }
            return {
                segmentType: "media",
                chunkData: null,
                chunkSize: 0,
                chunkInfos: null,
                chunkOffset: 0,
                protectionData: [],
                appendWindow,
            };
        }
        let chunkData = data instanceof Uint8Array ? data : new Uint8Array(data);
        const containerType = inferSegmentContainer(context.type, context.mimeType);
        // TODO take a look to check if this is an ISOBMFF/webm?
        const seemsToBeMP4 = containerType === "mp4" || containerType === undefined;
        const protectionData = [];
        if (seemsToBeMP4) {
            const psshInfo = takePSSHOut(chunkData);
            let keyId;
            if (segment.isInit) {
                keyId = (_a = getKeyIdFromInitSegment(chunkData)) !== null && _a !== void 0 ? _a : undefined;
            }
            if (psshInfo.length > 0 || keyId !== undefined) {
                protectionData.push({
                    initDataType: "cenc",
                    keyId,
                    initData: psshInfo,
                });
            }
        }
        if (!segment.isInit) {
            const chunkInfos = seemsToBeMP4
                ? getISOBMFFTimingInfos(chunkData, isChunked, segment, initTimescale)
                : null; // TODO extract time info from webm
            const chunkOffset = (_b = segment.timestampOffset) !== null && _b !== void 0 ? _b : 0;
            if (seemsToBeMP4) {
                const parsedEMSGs = parseEmsgBoxes(chunkData);
                if (parsedEMSGs !== undefined) {
                    const whitelistedEMSGs = parsedEMSGs.filter((evt) => {
                        if (segment.privateInfos === undefined ||
                            segment.privateInfos.isEMSGWhitelisted === undefined) {
                            return false;
                        }
                        return segment.privateInfos.isEMSGWhitelisted(evt);
                    });
                    const events = getEventsOutOfEMSGs(whitelistedEMSGs, context.manifestPublishTime);
                    if (events !== undefined) {
                        const { needsManifestRefresh, inbandEvents } = events;
                        return {
                            segmentType: "media",
                            chunkData,
                            chunkSize: chunkData.length,
                            chunkInfos,
                            chunkOffset,
                            appendWindow,
                            inbandEvents,
                            protectionData,
                            needsManifestRefresh,
                        };
                    }
                }
            }
            return {
                segmentType: "media",
                chunkData,
                chunkSize: chunkData.length,
                chunkInfos,
                chunkOffset,
                protectionData,
                appendWindow,
            };
        }
        // we're handling an initialization segment
        const { indexRange } = segment;
        let segmentList;
        if (containerType === "webm") {
            segmentList = getSegmentsFromCues(chunkData, 0);
        }
        else if (seemsToBeMP4) {
            segmentList = getSegmentsFromSidx(chunkData, Array.isArray(indexRange) ? indexRange[0] : 0);
            // This is a very specific handling for streams we know have a very
            // specific problem at Canal+: The last reference gives a truncated
            // segment.
            // Sadly, people on the packaging side could not fix all legacy contents.
            // This is an easy-but-ugly fix for those.
            // TODO Cleaner way? I tried to always check the obtained segment after
            // a byte-range request but it leads to a lot of code.
            if (__priv_patchLastSegmentInSidx === true &&
                segmentList !== null &&
                segmentList.length > 0) {
                const lastSegment = segmentList[segmentList.length - 1];
                if (Array.isArray(lastSegment.range)) {
                    lastSegment.range[1] = Infinity;
                }
            }
        }
        let timescale;
        if (seemsToBeMP4) {
            timescale = getMDHDTimescale(chunkData);
        }
        else if (containerType === "webm") {
            timescale = getTimeCodeScale(chunkData, 0);
        }
        const parsedTimescale = isNullOrUndefined(timescale) ? undefined : timescale;
        if (segment.isInit) {
            log.warn("DASH: !!!!!!!!!!!! FAKE ENCRYPTION");
            chunkData = fakeEncryptionDataInInitSegment(chunkData);
        }
        return {
            segmentType: "init",
            initializationData: chunkData,
            initializationDataSize: chunkData.length,
            protectionData,
            initTimescale: parsedTimescale,
            segmentList: segmentList !== null && segmentList !== void 0 ? segmentList : undefined,
        };
    };
}
