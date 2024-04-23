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
import type { ICustomMediaKeySession } from "./custom_media_keys";
/**
 * Close the given `MediaKeySession` and returns a Promise resolving when the
 * session is closed.
 * This promise does not reject, even if we're unable to close the
 * `MediaKeySession`.
 *
 * Note that there is a lot of browser issues linked to the impossibility to
 * either close a MediaKeySession or to know if a MediaKeySession was closed.
 * Due to this, the returned Promise might take some time before resolving on
 * some devices.
 * @param {MediaKeySession|Object} session
 * @returns {Promise.<undefined>}
 */
export default function closeSession(session: MediaKeySession | ICustomMediaKeySession): Promise<void>;
