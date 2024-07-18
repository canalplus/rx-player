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
import type { IManifestMetadata } from "../../../../manifest";
import type { INonFiniteStreamEventPayload, IStreamEventPayload } from "./types";
/**
 * Refresh local scheduled events list
 * @param {Array.<Object>} oldScheduledEvents
 * @param {Object} manifest
 * @returns {Array.<Object>}
 */
declare function refreshScheduledEventsList(oldScheduledEvents: Array<IStreamEventPayload | INonFiniteStreamEventPayload>, manifest: IManifestMetadata): Array<IStreamEventPayload | INonFiniteStreamEventPayload>;
export default refreshScheduledEventsList;
//# sourceMappingURL=refresh_scheduled_events_list.d.ts.map