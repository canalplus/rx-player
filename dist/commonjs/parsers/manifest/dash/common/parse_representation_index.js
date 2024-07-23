"use strict";
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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var object_assign_1 = require("../../../../utils/object_assign");
var indexes_1 = require("./indexes");
/**
 * Parse the specific segment indexing information found in a representation
 * into a IRepresentationIndex implementation.
 * @param {Array.<Object>} representation
 * @param {Object} context
 * @returns {Array.<Object>}
 */
function parseRepresentationIndex(representation, context) {
    var _a, _b, _c;
    var availabilityTimeOffset = context.availabilityTimeOffset, manifestBoundsCalculator = context.manifestBoundsCalculator, isDynamic = context.isDynamic, periodEnd = context.end, periodStart = context.start, receivedTime = context.receivedTime, unsafelyBaseOnPreviousRepresentation = context.unsafelyBaseOnPreviousRepresentation, inbandEventStreams = context.inbandEventStreams, isLastPeriod = context.isLastPeriod;
    var isEMSGWhitelisted = function (inbandEvent) {
        if (inbandEventStreams === undefined) {
            return false;
        }
        return inbandEventStreams.some(function (_a) {
            var schemeIdUri = _a.schemeIdUri;
            return schemeIdUri === inbandEvent.schemeIdUri;
        });
    };
    var reprIndexCtxt = {
        availabilityTimeComplete: undefined,
        availabilityTimeOffset: availabilityTimeOffset,
        unsafelyBaseOnPreviousRepresentation: unsafelyBaseOnPreviousRepresentation,
        isEMSGWhitelisted: isEMSGWhitelisted,
        isLastPeriod: isLastPeriod,
        manifestBoundsCalculator: manifestBoundsCalculator,
        isDynamic: isDynamic,
        periodEnd: periodEnd,
        periodStart: periodStart,
        receivedTime: receivedTime,
        representationBitrate: representation.attributes.bitrate,
        representationId: representation.attributes.id,
    };
    var representationIndex;
    if (representation.children.segmentBase !== undefined) {
        var segmentBase = representation.children.segmentBase;
        representationIndex = new indexes_1.BaseRepresentationIndex(segmentBase, reprIndexCtxt);
    }
    else if (representation.children.segmentList !== undefined) {
        var segmentList = representation.children.segmentList;
        representationIndex = new indexes_1.ListRepresentationIndex(segmentList, reprIndexCtxt);
    }
    else if (representation.children.segmentTemplate !== undefined ||
        context.parentSegmentTemplates.length > 0) {
        var segmentTemplates = context.parentSegmentTemplates.slice();
        var childSegmentTemplate = representation.children.segmentTemplate;
        if (childSegmentTemplate !== undefined) {
            segmentTemplates.push(childSegmentTemplate);
        }
        var segmentTemplate = object_assign_1.default.apply(void 0, __spreadArray([{}], __read(segmentTemplates /* Ugly TS Hack */), false));
        if (segmentTemplate.availabilityTimeOffset !== undefined ||
            context.availabilityTimeOffset !== undefined) {
            reprIndexCtxt.availabilityTimeOffset =
                ((_a = segmentTemplate.availabilityTimeOffset) !== null && _a !== void 0 ? _a : 0) +
                    ((_b = context.availabilityTimeOffset) !== null && _b !== void 0 ? _b : 0);
        }
        if (segmentTemplate.availabilityTimeComplete !== undefined ||
            context.availabilityTimeComplete !== undefined) {
            reprIndexCtxt.availabilityTimeComplete =
                (_c = segmentTemplate.availabilityTimeComplete) !== null && _c !== void 0 ? _c : context.availabilityTimeComplete;
        }
        representationIndex = indexes_1.TimelineRepresentationIndex.isTimelineIndexArgument(segmentTemplate)
            ? new indexes_1.TimelineRepresentationIndex(segmentTemplate, reprIndexCtxt)
            : new indexes_1.TemplateRepresentationIndex(segmentTemplate, reprIndexCtxt);
    }
    else {
        var adaptationChildren = context.adaptation.children;
        if (adaptationChildren.segmentBase !== undefined) {
            var segmentBase = adaptationChildren.segmentBase;
            representationIndex = new indexes_1.BaseRepresentationIndex(segmentBase, reprIndexCtxt);
        }
        else if (adaptationChildren.segmentList !== undefined) {
            var segmentList = adaptationChildren.segmentList;
            representationIndex = new indexes_1.ListRepresentationIndex(segmentList, reprIndexCtxt);
        }
        else {
            representationIndex = new indexes_1.TemplateRepresentationIndex({
                duration: Number.MAX_VALUE,
                timescale: 1,
                startNumber: 0,
                media: "",
            }, reprIndexCtxt);
        }
    }
    return representationIndex;
}
exports.default = parseRepresentationIndex;
