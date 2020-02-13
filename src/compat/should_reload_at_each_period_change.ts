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

import { isSafari } from "./browser_detection";

/**
 * On Safari, there can be issues when playing different periods from multiple
 * contents (e.g. when playing a metaplaylist). Playback may block when
 * buffering a different content from the current played one. The reasons are
 * quite unclear. It may depend on media caracteristics changes such as with
 * framerate and samplerate.
 *
 * Then, we should handle one period at a time in the buffer orchestrator and
 * ask for reloading when changing period.
 */
const shouldReloadAtEachPeriodChange = isSafari;
export default shouldReloadAtEachPeriodChange;
