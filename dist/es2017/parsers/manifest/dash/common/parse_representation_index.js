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
import objectAssign from "../../../../utils/object_assign";
import { BaseRepresentationIndex, ListRepresentationIndex, TemplateRepresentationIndex, TimelineRepresentationIndex, } from "./indexes";
/**
 * Parse the specific segment indexing information found in a representation
 * into a IRepresentationIndex implementation.
 * @param {Array.<Object>} representation
 * @param {Object} context
 * @returns {Array.<Object>}
 */
export default function parseRepresentationIndex(representation, context) {
    var _a, _b;
    const { availabilityTimeOffset, manifestBoundsCalculator, isDynamic, end: periodEnd, start: periodStart, receivedTime, unsafelyBaseOnPreviousRepresentation, inbandEventStreams, isLastPeriod, } = context;
    const isEMSGWhitelisted = (inbandEvent) => {
        if (inbandEventStreams === undefined) {
            return false;
        }
        return inbandEventStreams.some(({ schemeIdUri }) => schemeIdUri === inbandEvent.schemeIdUri);
    };
    const reprIndexCtxt = {
        availabilityTimeComplete: undefined,
        availabilityTimeOffset,
        unsafelyBaseOnPreviousRepresentation,
        isEMSGWhitelisted,
        isLastPeriod,
        manifestBoundsCalculator,
        isDynamic,
        periodEnd,
        periodStart,
        receivedTime,
        representationBitrate: representation.attributes.bitrate,
        representationId: representation.attributes.id,
    };
    let representationIndex;
    if (representation.children.segmentBase !== undefined) {
        const { segmentBase } = representation.children;
        representationIndex = new BaseRepresentationIndex(segmentBase, reprIndexCtxt);
    }
    else if (representation.children.segmentList !== undefined) {
        const { segmentList } = representation.children;
        representationIndex = new ListRepresentationIndex(segmentList, reprIndexCtxt);
    }
    else if (representation.children.segmentTemplate !== undefined ||
        context.parentSegmentTemplates.length > 0) {
        const segmentTemplates = context.parentSegmentTemplates.slice();
        const childSegmentTemplate = representation.children.segmentTemplate;
        if (childSegmentTemplate !== undefined) {
            segmentTemplates.push(childSegmentTemplate);
        }
        const segmentTemplate = objectAssign({}, ...segmentTemplates /* Ugly TS Hack */);
        if (segmentTemplate.availabilityTimeOffset !== undefined ||
            context.availabilityTimeOffset !== undefined) {
            reprIndexCtxt.availabilityTimeOffset =
                ((_a = segmentTemplate.availabilityTimeOffset) !== null && _a !== void 0 ? _a : 0) +
                    ((_b = context.availabilityTimeOffset) !== null && _b !== void 0 ? _b : 0);
        }
        representationIndex = TimelineRepresentationIndex.isTimelineIndexArgument(segmentTemplate)
            ? new TimelineRepresentationIndex(segmentTemplate, reprIndexCtxt)
            : new TemplateRepresentationIndex(segmentTemplate, reprIndexCtxt);
    }
    else {
        const adaptationChildren = context.adaptation.children;
        if (adaptationChildren.segmentBase !== undefined) {
            const { segmentBase } = adaptationChildren;
            representationIndex = new BaseRepresentationIndex(segmentBase, reprIndexCtxt);
        }
        else if (adaptationChildren.segmentList !== undefined) {
            const { segmentList } = adaptationChildren;
            representationIndex = new ListRepresentationIndex(segmentList, reprIndexCtxt);
        }
        else {
            representationIndex = new TemplateRepresentationIndex({
                duration: Number.MAX_VALUE,
                timescale: 1,
                startNumber: 0,
                media: "",
            }, reprIndexCtxt);
        }
    }
    return representationIndex;
}
