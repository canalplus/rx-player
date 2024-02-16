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
import type { IPeriod } from "../../../../manifest";
import type { IParsedAdaptations } from "../../types";
import type { IAdaptationSetIntermediateRepresentation, ISegmentTemplateIntermediateRepresentation } from "../node_parser_types";
import type { IRepresentationContext } from "./parse_representations";
/**
 * Process AdaptationSets intermediate representations to return under its final
 * form.
 * Note that the AdaptationSets returned are sorted by priority (from the most
 * priority to the least one).
 * @param {Array.<Object>} adaptationsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parseAdaptationSets(adaptationsIR: IAdaptationSetIntermediateRepresentation[], context: IAdaptationSetContext): IParsedAdaptations;
/** Context needed when calling `parseAdaptationSets`. */
export interface IAdaptationSetContext extends IInheritedRepresentationContext {
    /** SegmentTemplate parsed in the Period, if found. */
    segmentTemplate?: ISegmentTemplateIntermediateRepresentation | undefined;
    /**
     * The parser should take this Period - which is from a previously parsed
     * Manifest for the same dynamic content - as a base to speed-up the parsing
     * process.
     * /!\ If unexpected differences exist between both, there is a risk of
     * de-synchronization with what is actually on the server,
     * Use with moderation.
     */
    unsafelyBaseOnPreviousPeriod: IPeriod | null;
}
/**
 * Supplementary context needed to parse a Representation common with
 * `IRepresentationContext`.
 */
type IInheritedRepresentationContext = Omit<IRepresentationContext, "unsafelyBaseOnPreviousAdaptation" | "parentSegmentTemplates">;
export {};
