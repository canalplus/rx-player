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
 * Load a persistent session, based on its `sessionId`, on the given
 * MediaKeySession.
 *
 * Returns a Promise which resolves with:
 *   - `true` if the persistent MediaKeySession was found and loaded
 *   - `false` if no persistent MediaKeySession was found with that `sessionId`.
 *
 * The Promise rejects if anything goes wrong in the process.
 * @param {MediaKeySession} session
 * @param {string} sessionId
 * @returns {Promise.<boolean>}
 */
export default function loadSession(session: MediaKeySession | ICustomMediaKeySession, sessionId: string): Promise<boolean>;
//# sourceMappingURL=load_session.d.ts.map