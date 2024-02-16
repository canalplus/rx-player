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
import type { ICustomMediaKeySession } from "../../../compat/eme";
/**
 * If all key statuses attached to session are valid (either not
 * "expired" or "internal-error"), return true.
 * If not, return false.
 * @param {MediaKeySession} loadedSession
 * @returns {MediaKeySession}
 */
export default function isSessionUsable(loadedSession: MediaKeySession | ICustomMediaKeySession): boolean;
