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
import type { IParsedManifest } from "../types";
/**
 * Ensure that no two periods, adaptations from the same period and
 * representations from the same adaptation, have the same ID.
 *
 * Log and mutate their ID if not until this is verified.
 *
 * @param {Object} manifest
 */
export default function checkManifestIDs(manifest: IParsedManifest): void;
