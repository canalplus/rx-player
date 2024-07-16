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
import { assertUnreachable } from "../../../../utils/assert";
import { parseXml } from "../../../../utils/xml-parser";
import parseMpdIr from "../common";
import { createMPDIntermediateRepresentation } from "./node_parsers/MPD";
import { createPeriodIntermediateRepresentation } from "./node_parsers/Period";
/**
 * Parse MPD through the Fast JS parser.
 * @param {string} xml - MPD under a string format
 * @param {Object} args - Various parsing options and information.
 * @returns {Object} - Response returned by the DASH-JS parser.
 */
export default function parseFromString(xml, args) {
    const root = parseXml(xml);
    const lastChild = root[root.length - 1];
    if (lastChild === undefined ||
        typeof lastChild === "string" ||
        lastChild.tagName !== "MPD") {
        throw new Error("DASH Parser: document root should be MPD");
    }
    const [mpdIR, warnings] = createMPDIntermediateRepresentation(lastChild, xml);
    const ret = parseMpdIr(mpdIR, args, warnings);
    return processReturn(ret);
    /**
     * Handle `parseMpdIr` return values, asking for resources if they are needed
     * and pre-processing them before continuing parsing.
     *
     * @param {Object} initialRes
     * @returns {Object}
     */
    function processReturn(initialRes) {
        if (initialRes.type === "done") {
            return initialRes;
        }
        else if (initialRes.type === "needs-clock") {
            return {
                type: "needs-resources",
                value: {
                    urls: [initialRes.value.url],
                    format: "string",
                    continue(loadedClock) {
                        if (loadedClock.length !== 1) {
                            throw new Error("DASH parser: wrong number of loaded ressources.");
                        }
                        const newRet = initialRes.value.continue(loadedClock[0].responseData);
                        return processReturn(newRet);
                    },
                },
            };
        }
        else if (initialRes.type === "needs-xlinks") {
            return {
                type: "needs-resources",
                value: {
                    urls: initialRes.value.xlinksUrls,
                    format: "string",
                    continue(loadedXlinks) {
                        const resourceInfos = [];
                        for (let i = 0; i < loadedXlinks.length; i++) {
                            const { responseData: xlinkResp, receivedTime, sendingTime, url, } = loadedXlinks[i];
                            if (!xlinkResp.success) {
                                throw xlinkResp.error;
                            }
                            const wrappedData = "<root>" + xlinkResp.data + "</root>";
                            const dataAsXML = parseXml(wrappedData);
                            const innerParsed = dataAsXML[dataAsXML.length - 1];
                            if (innerParsed === undefined || typeof innerParsed === "string") {
                                throw new Error("DASH parser: Invalid external ressources");
                            }
                            const periods = innerParsed.children;
                            const periodsIR = [];
                            const periodsIRWarnings = [];
                            for (let j = 0; j < periods.length; j++) {
                                const period = periods[j];
                                if (typeof period === "string" || period.tagName !== "Period") {
                                    continue;
                                }
                                const [periodIR, periodWarnings] = createPeriodIntermediateRepresentation(period, wrappedData);
                                periodsIRWarnings.push(...periodWarnings);
                                periodsIR.push(periodIR);
                            }
                            resourceInfos.push({
                                url,
                                receivedTime,
                                sendingTime,
                                parsed: periodsIR,
                                warnings: periodsIRWarnings,
                            });
                        }
                        const newRet = initialRes.value.continue(resourceInfos);
                        return processReturn(newRet);
                    },
                },
            };
        }
        else {
            assertUnreachable(initialRes);
        }
    }
}
