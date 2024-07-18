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
import type { IMPDParserArguments } from "../common";
import type { IDashParserResponse } from "../parsers_types";
/**
 * Parse MPD through the Fast JS parser.
 * @param {string} xml - MPD under a string format
 * @param {Object} args - Various parsing options and information.
 * @returns {Object} - Response returned by the DASH-JS parser.
 */
export default function parseFromString(xml: string, args: IMPDParserArguments): IDashParserResponse<string>;
//# sourceMappingURL=parse_from_xml_string.d.ts.map