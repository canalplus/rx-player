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
import type { CancellationSignal } from "../../../utils/task_canceller";
import type { IPeriodStreamArguments, IPeriodStreamCallbacks } from "./types";
/**
 * Create a single PeriodStream:
 *   - Lazily create (or reuse) a SegmentSink for the given type.
 *   - Create a Stream linked to an Adaptation each time it changes, to
 *     download and append the corresponding segments to the SegmentSink.
 *   - Announce when the Stream is full or is awaiting new Segments through
 *     events
 *
 * @param {Object} args - Various arguments allowing the `PeriodStream` to
 * determine which Adaptation and which Representation to choose, as well as
 * which segments to load from it.
 * You can check the corresponding type for more information.
 * @param {Object} callbacks - The `PeriodStream` relies on a system of
 * callbacks that it will call on various events.
 *
 * Depending on the event, the caller may be supposed to perform actions to
 * react upon some of them.
 *
 * This approach is taken instead of a more classical EventEmitter pattern to:
 *   - Allow callbacks to be called synchronously after the
 *     `AdaptationStream` is called.
 *   - Simplify bubbling events up, by just passing through callbacks
 *   - Force the caller to explicitely handle or not the different events.
 *
 * Callbacks may start being called immediately after the `AdaptationStream`
 * call and may be called until either the `parentCancelSignal` argument is
 * triggered, or until the `error` callback is called, whichever comes first.
 * @param {Object} parentCancelSignal - `CancellationSignal` allowing, when
 * triggered, to immediately stop all operations the `PeriodStream` is
 * doing.
 */
export default function PeriodStream({ bufferType, content, garbageCollectors, playbackObserver, representationEstimator, segmentFetcherCreator, segmentSinksStore, options, wantedBufferAhead, maxVideoBufferSize, }: IPeriodStreamArguments, callbacks: IPeriodStreamCallbacks, parentCancelSignal: CancellationSignal): void;
//# sourceMappingURL=period_stream.d.ts.map