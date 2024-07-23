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
import log from "../log";
/**
 * If the changeType MSE API is implemented, update the current codec of the
 * SourceBuffer and return true if it succeeded.
 * In any other cases, return false.
 * @param {Object} sourceBuffer
 * @param {string} codec
 * @returns {boolean}
 */
export default function tryToChangeSourceBufferType(sourceBuffer, codec) {
    if (typeof sourceBuffer.changeType === "function") {
        try {
            sourceBuffer.changeType(codec);
        }
        catch (e) {
            log.warn("Could not call 'changeType' on the given SourceBuffer:", e instanceof Error ? e : "");
            return false;
        }
        return true;
    }
    return false;
}
