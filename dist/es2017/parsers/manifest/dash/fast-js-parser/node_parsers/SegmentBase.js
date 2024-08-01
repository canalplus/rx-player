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
import isNullOrUndefined from "../../../../../utils/is_null_or_undefined";
import parseInitialization from "./Initialization";
import { parseBoolean, parseByteRange, parseMPDFloat, parseMPDInteger, ValueParser, } from "./utils";
/**
 * Parse a SegmentBase element into a SegmentBase intermediate representation.
 * @param {Object} root - The SegmentBase root element.
 * @returns {Array}
 */
export default function parseSegmentBase(root) {
    const attributes = {};
    let warnings = [];
    const parseValue = ValueParser(attributes, warnings);
    const segmentBaseChildren = root.children;
    for (let i = 0; i < segmentBaseChildren.length; i++) {
        const currentNode = segmentBaseChildren[i];
        if (typeof currentNode !== "string") {
            if (currentNode.tagName === "Initialization") {
                const [initialization, initializationWarnings] = parseInitialization(currentNode);
                attributes.initialization = initialization;
                warnings = warnings.concat(initializationWarnings);
            }
        }
    }
    for (const attributeName of Object.keys(root.attributes)) {
        const attributeVal = root.attributes[attributeName];
        if (isNullOrUndefined(attributeVal)) {
            continue;
        }
        switch (attributeName) {
            case "timescale":
                parseValue(attributeVal, {
                    asKey: "timescale",
                    parser: parseMPDInteger,
                    dashName: "timescale",
                });
                break;
            case "presentationTimeOffset":
                parseValue(attributeVal, {
                    asKey: "presentationTimeOffset",
                    parser: parseMPDFloat,
                    dashName: "presentationTimeOffset",
                });
                break;
            case "indexRange":
                parseValue(attributeVal, {
                    asKey: "indexRange",
                    parser: parseByteRange,
                    dashName: "indexRange",
                });
                break;
            case "indexRangeExact":
                parseValue(attributeVal, {
                    asKey: "indexRangeExact",
                    parser: parseBoolean,
                    dashName: "indexRangeExact",
                });
                break;
            case "availabilityTimeOffset":
                parseValue(attributeVal, {
                    asKey: "availabilityTimeOffset",
                    parser: parseMPDFloat,
                    dashName: "availabilityTimeOffset",
                });
                break;
            case "availabilityTimeComplete":
                parseValue(attributeVal, {
                    asKey: "availabilityTimeComplete",
                    parser: parseBoolean,
                    dashName: "availabilityTimeComplete",
                });
                break;
            case "duration":
                parseValue(attributeVal, {
                    asKey: "duration",
                    parser: parseMPDInteger,
                    dashName: "duration",
                });
                break;
            case "startNumber":
                parseValue(attributeVal, {
                    asKey: "startNumber",
                    parser: parseMPDInteger,
                    dashName: "startNumber",
                });
                break;
            case "endNumber":
                parseValue(attributeVal, {
                    asKey: "endNumber",
                    parser: parseMPDInteger,
                    dashName: "endNumber",
                });
                break;
        }
    }
    return [attributes, warnings];
}
