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
import type { IAdaptation, ISegment, IPeriod, IRepresentation, IAdaptationMetadata, IPeriodMetadata, IRepresentationMetadata } from "../../../manifest";
/** Content information for a single buffered chunk */
export interface IChunkContext {
    /** Adaptation this chunk is related to. */
    adaptation: IAdaptation;
    /** Period this chunk is related to. */
    period: IPeriod;
    /** Representation this chunk is related to. */
    representation: IRepresentation;
    /** Segment this chunk is related to. */
    segment: ISegment;
}
export interface IChunkContextSnapshot {
    adaptation: IAdaptationMetadata;
    period: IPeriodMetadata;
    representation: IRepresentationMetadata;
}
//# sourceMappingURL=types.d.ts.map