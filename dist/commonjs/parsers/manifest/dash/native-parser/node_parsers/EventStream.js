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
Object.defineProperty(exports, "__esModule", { value: true });
var utils_1 = require("./utils");
/**
 * Parse the EventStream node to extract Event nodes and their
 * content.
 * @param {Element} element
 * @returns {Array}
 */
function parseEventStream(element) {
    var eventStreamIR = {
        children: { events: [] },
        attributes: {},
    };
    var warnings = [];
    // 1 - Parse attributes
    var parseValue = (0, utils_1.ValueParser)(eventStreamIR.attributes, warnings);
    for (var i = 0; i < element.attributes.length; i++) {
        var attr = element.attributes[i];
        switch (attr.name) {
            case "schemeIdUri":
                eventStreamIR.attributes.schemeIdUri = attr.value;
                break;
            case "timescale":
                parseValue(attr.value, {
                    asKey: "timescale",
                    parser: utils_1.parseMPDInteger,
                    dashName: "timescale",
                });
                break;
            case "value":
                eventStreamIR.attributes.value = attr.value;
                break;
        }
    }
    for (var i = 0; i < element.childNodes.length; i++) {
        if (element.childNodes[i].nodeType === Node.ELEMENT_NODE) {
            var currentElement = element.childNodes[i];
            switch (currentElement.nodeName) {
                case "Event":
                    var _a = __read(parseEvent(currentElement), 2), event_1 = _a[0], eventWarnings = _a[1];
                    eventStreamIR.children.events.push(event_1);
                    if (eventWarnings.length > 0) {
                        warnings = warnings.concat(eventWarnings);
                    }
                    break;
            }
        }
    }
    return [eventStreamIR, warnings];
}
exports.default = parseEventStream;
/**
 * Parse `Event` Element, as found in EventStream nodes.
 * @param {Element} element
 * @returns {Array}
 */
function parseEvent(element) {
    var eventIR = {
        eventStreamData: element,
    };
    var warnings = [];
    // 1 - Parse attributes
    var parseValue = (0, utils_1.ValueParser)(eventIR, warnings);
    for (var i = 0; i < element.attributes.length; i++) {
        var attr = element.attributes[i];
        switch (attr.name) {
            case "presentationTime":
                parseValue(attr.value, {
                    asKey: "presentationTime",
                    parser: utils_1.parseMPDInteger,
                    dashName: "presentationTime",
                });
                break;
            case "duration":
                parseValue(attr.value, {
                    asKey: "duration",
                    parser: utils_1.parseMPDInteger,
                    dashName: "duration",
                });
                break;
            case "id":
                eventIR.id = attr.value;
                break;
        }
    }
    return [eventIR, warnings];
}
