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

import { IStreamEventData } from "./types";

/**
 * Compare 2 events.
 * As the payload of two events may be the same, but the JS objects may not
 * have the same references, it may be difficult to compare them.
 * If two events start and end at the same moment, and possess the same id,
 * we consider the two to be the same.
 * /!\ However, the DASH-if spec does not say that the event payload
 * may be the same if these conditions are met. Thus, there are high chances
 * that it may be the case.
 * TODO See if we can compare payloads
 * @param {Object} evt1
 * @param {Object} evt2
 * @returns {Boolean}
 */
function areSameStreamEvents(evt1: IStreamEventData,
                             evt2: IStreamEventData): boolean {
  return evt1.id === evt2.id &&
         evt1.start === evt2.start &&
         evt1.end === evt2.end;
}

export default areSameStreamEvents;
