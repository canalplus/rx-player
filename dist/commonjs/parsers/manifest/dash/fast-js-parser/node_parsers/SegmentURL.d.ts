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
import type { ITNode } from "../../../../../utils/xml-parser";
import type { ISegmentUrlIntermediateRepresentation } from "../../node_parser_types";
/**
 * Parse a SegmentURL element into a SegmentURL intermediate
 * representation.
 * @param {Object} root - The SegmentURL root element.
 * @returns {Array}
 */
export default function parseSegmentURL(root: ITNode): [ISegmentUrlIntermediateRepresentation, Error[]];
