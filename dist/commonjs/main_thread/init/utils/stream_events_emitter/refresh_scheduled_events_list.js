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
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
var are_same_stream_events_1 = require("./are_same_stream_events");
/**
 * Refresh local scheduled events list
 * @param {Array.<Object>} oldScheduledEvents
 * @param {Object} manifest
 * @returns {Array.<Object>}
 */
function refreshScheduledEventsList(oldScheduledEvents, manifest) {
    var scheduledEvents = [];
    var periods = manifest.periods;
    for (var i = 0; i < periods.length; i++) {
        var period = periods[i];
        var streamEvents = period.streamEvents;
        streamEvents.forEach(function (_a) {
            var start = _a.start, end = _a.end, id = _a.id, data = _a.data;
            for (var j = 0; j < oldScheduledEvents.length; j++) {
                var currentScheduledEvent = oldScheduledEvents[j];
                if ((0, are_same_stream_events_1.default)(currentScheduledEvent, { id: id, start: start, end: end })) {
                    scheduledEvents.push(currentScheduledEvent);
                    return;
                }
            }
            var element;
            if (data.value.element !== undefined) {
                element = data.value.element;
            }
            else if (data.value.xmlData !== undefined) {
                // First, we will create a parent Element defining all namespaces that
                // should have been encountered until know.
                // This is needed because the DOMParser API might throw when
                // encountering unknown namespaced attributes or elements in the given
                // `<Event>` xml subset.
                var parentNode = data.value.xmlData.namespaces.reduce(function (acc, ns) {
                    return acc + "xmlns:" + ns.key + '="' + ns.value + '" ';
                }, "<toremove ");
                parentNode += ">";
                var parsedDom = new DOMParser().parseFromString(parentNode + data.value.xmlData.data + "</toremove>", "application/xml").documentElement;
                element =
                    parsedDom.children.length > 0
                        ? parsedDom.children[0]
                        : parsedDom.childNodes[0];
            }
            else {
                return;
            }
            var actualData = { type: data.type, value: __assign(__assign({}, data.value), { element: element }) };
            if (end === undefined) {
                var newScheduledEvent = {
                    start: start,
                    id: id,
                    data: actualData,
                    publicEvent: { start: start, data: actualData },
                };
                scheduledEvents.push(newScheduledEvent);
            }
            else {
                var newScheduledEvent = {
                    start: start,
                    end: end,
                    id: id,
                    data: actualData,
                    publicEvent: { start: start, end: end, data: actualData },
                };
                scheduledEvents.push(newScheduledEvent);
            }
        });
    }
    return scheduledEvents;
}
exports.default = refreshScheduledEventsList;
