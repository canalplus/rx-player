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
import { parseByteRange, ValueParser } from "./utils";
/**
 * Parse a SegmentURL element into a SegmentURL intermediate
 * representation.
 * @param {Object} root - The SegmentURL root element.
 * @returns {Array}
 */
export default function parseSegmentURL(root) {
    const parsedSegmentURL = {};
    const warnings = [];
    const parseValue = ValueParser(parsedSegmentURL, warnings);
    for (const attributeName of Object.keys(root.attributes)) {
        const attributeVal = root.attributes[attributeName];
        if (isNullOrUndefined(attributeVal)) {
            continue;
        }
        switch (attributeName) {
            case "media":
                parsedSegmentURL.media = attributeVal;
                break;
            case "indexRange":
                parseValue(attributeVal, {
                    asKey: "indexRange",
                    parser: parseByteRange,
                    dashName: "indexRange",
                });
                break;
            case "index":
                parsedSegmentURL.index = attributeVal;
                break;
            case "mediaRange":
                parseValue(attributeVal, {
                    asKey: "mediaRange",
                    parser: parseByteRange,
                    dashName: "mediaRange",
                });
                break;
        }
    }
    return [parsedSegmentURL, warnings];
}
