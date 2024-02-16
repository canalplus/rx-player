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
import type { IReadOnlySharedReference } from "../utils/reference";
import type { CancellationSignal } from "../utils/task_canceller";
export interface IResolution {
    width: number;
    height: number;
}
/**
 * Emit the current height and width of the given `element` each time it
 * changes.
 *
 * On some browsers, we might not be able to rely on a native API to know when
 * it changes, the `interval` argument allow us to provide us an inverval in
 * milliseconds at which we should query that element's size.
 * @param {HTMLElement} element
 * @param {number} interval
 * @returns {Object}
 */
export default function onHeightWidthChange(element: HTMLElement, interval: number, cancellationSignal: CancellationSignal): IReadOnlySharedReference<IResolution>;
