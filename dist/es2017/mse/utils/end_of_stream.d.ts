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
import type { IMediaSource } from "../../compat/browser_compatibility_types";
import type { CancellationSignal } from "../../utils/task_canceller";
/**
 * Trigger the `endOfStream` method of a MediaSource.
 *
 * If the MediaSource is ended/closed, do not call this method.
 * If SourceBuffers are updating, wait for them to be updated before closing
 * it.
 * @param {MediaSource} mediaSource
 * @param {Object} cancelSignal
 */
export default function triggerEndOfStream(mediaSource: IMediaSource, cancelSignal: CancellationSignal): void;
/**
 * Trigger the `endOfStream` method of a MediaSource each times it opens.
 * @see triggerEndOfStream
 * @param {MediaSource} mediaSource
 * @param {Object} cancelSignal
 */
export declare function maintainEndOfStream(mediaSource: IMediaSource, cancelSignal: CancellationSignal): void;
//# sourceMappingURL=end_of_stream.d.ts.map