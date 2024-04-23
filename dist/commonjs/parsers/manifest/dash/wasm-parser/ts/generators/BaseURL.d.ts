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
import type { IBaseUrlIntermediateRepresentation } from "../../../node_parser_types";
import type { IAttributeParser } from "../parsers_stack";
/**
 * Generate an "attribute parser" once inside a `BaseURL` node.
 * @param {Object} baseUrlAttrs
 * @param {WebAssembly.Memory} linearMemory
 * @returns {Function}
 */
export declare function generateBaseUrlAttrParser(baseUrlAttrs: IBaseUrlIntermediateRepresentation, linearMemory: WebAssembly.Memory): IAttributeParser;
