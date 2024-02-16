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
import type { IManifest } from "../../../../manifest";
import type { IParsedPeriod } from "../../types";
import type { IPeriodIntermediateRepresentation } from "../node_parser_types";
import type { IAdaptationSetContext } from "./parse_adaptation_sets";
/** Information about each linked Xlink. */
export type IXLinkInfos = WeakMap<IPeriodIntermediateRepresentation, {
    /** Real URL (post-redirection) used to download this xlink. */
    url?: string | undefined;
    /** Time at which the request was sent (since the time origin), in ms. */
    sendingTime?: number | undefined;
    /** Time at which the request was received (since the time origin), in ms. */
    receivedTime?: number | undefined;
}>;
/**
 * Process intermediate periods to create final parsed periods.
 * @param {Array.<Object>} periodsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parsePeriods(periodsIR: IPeriodIntermediateRepresentation[], context: IPeriodContext): IParsedPeriod[];
/** Context needed when calling `parsePeriods`. */
export interface IPeriodContext extends IInheritedAdaptationContext {
    availabilityStartTime: number;
    /**
     * Difference between the server's clock, in milliseconds, and the
     * monotonically-raising timestamp used by the RxPlayer.
     */
    clockOffset?: number | undefined;
    /** Duration (mediaPresentationDuration) of the whole MPD, in seconds. */
    duration?: number | undefined;
    /**
     * The parser should take this Manifest - which is a previously parsed
     * Manifest for the same dynamic content - as a base to speed-up the parsing
     * process.
     * /!\ If unexpected differences exist between the two, there is a risk of
     * de-synchronization with what is actually on the server,
     * Use with moderation.
     */
    unsafelyBaseOnPreviousManifest: IManifest | null;
    xlinkInfos: IXLinkInfos;
    /**
     * XML namespaces linked to the `<MPD>` element.
     * May be needed to convert EventStream's Event elements back into the
     * Document form.
     */
    xmlNamespaces?: Array<{
        key: string;
        value: string;
    }> | undefined;
}
type IInheritedAdaptationContext = Omit<IAdaptationSetContext, "availabilityTimeComplete" | "availabilityTimeOffset" | "duration" | "isLastPeriod" | "start" | "unsafelyBaseOnPreviousPeriod">;
export {};
