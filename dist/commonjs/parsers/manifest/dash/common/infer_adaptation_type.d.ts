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
import type { IRepresentationIntermediateRepresentation } from "../node_parser_types";
/** Different "type" a parsed Adaptation can be. */
type IAdaptationType = "audio" | "video" | "text";
/** Structure of a parsed "scheme-like" element in the MPD. */
interface IScheme {
    schemeIdUri?: string | undefined;
    value?: string | undefined;
}
/**
 * Infers the type of adaptation from codec and mimetypes found in it.
 *
 * This follows the guidelines defined by the DASH-IF IOP:
 *   - one adaptation set contains a single media type
 *   - The order of verifications are:
 *       1. mimeType
 *       2. Role
 *       3. codec
 *
 * Note: This is based on DASH-IF-IOP-v4.0 with some more freedom.
 * @param {Array.<Object>} representations
 * @param {string|null} adaptationMimeType
 * @param {string|null} adaptationCodecs
 * @param {Array.<Object>|null} adaptationRoles
 * @returns {string} - "audio"|"video"|"text"|"metadata"|"unknown"
 */
export default function inferAdaptationType(representations: IRepresentationIntermediateRepresentation[], adaptationMimeType: string | null, adaptationCodecs: string | null, adaptationRoles: IScheme[] | null): IAdaptationType | undefined;
export {};
