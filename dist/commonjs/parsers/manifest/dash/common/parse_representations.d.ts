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
import type { IAdaptation } from "../../../../manifest";
import type { IParsedRepresentation } from "../../types";
import type { IAdaptationSetIntermediateRepresentation, IRepresentationIntermediateRepresentation } from "../node_parser_types";
import type ContentProtectionParser from "./content_protection_parser";
import type { IRepresentationIndexContext } from "./parse_representation_index";
/**
 * Process intermediate representations to create final parsed representations.
 * @param {Array.<Object>} representationsIR
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parseRepresentations(representationsIR: IRepresentationIntermediateRepresentation[], adaptation: IAdaptationSetIntermediateRepresentation, context: IRepresentationContext): IParsedRepresentation[];
/** Supplementary context needed to parse a Representation. */
export interface IRepresentationContext extends IInheritedRepresentationIndexContext {
    /** Manifest DASH profiles used for signalling some features */
    manifestProfiles?: string | undefined;
    /**
     * The parser should take this Adaptation - which is from a previously parsed
     * Manifest for the same dynamic content - as a base to speed-up the parsing
     * process.
     * /!\ If unexpected differences exist between both, there is a risk of
     * de-synchronization with what is actually on the server,
     * Use with moderation.
     */
    unsafelyBaseOnPreviousAdaptation: IAdaptation | null;
    /** Parses contentProtection elements. */
    contentProtectionParser: ContentProtectionParser;
}
/**
 * Supplementary context needed to parse a Representation common with
 * `IRepresentationIndexContext`.
 */
type IInheritedRepresentationIndexContext = Omit<IRepresentationIndexContext, "adaptation" | "unsafelyBaseOnPreviousRepresentation" | "inbandEventStreams">;
export {};
//# sourceMappingURL=parse_representations.d.ts.map