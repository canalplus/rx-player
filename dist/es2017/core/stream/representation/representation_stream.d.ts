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
import type { IRepresentationStreamArguments, IRepresentationStreamCallbacks } from "./types";
/**
 * Perform the logic to load the right segments for the given Representation and
 * push them to the given `SegmentSink`.
 *
 * In essence, this is the entry point of the core streaming logic of the
 * RxPlayer, the one actually responsible for finding which are the current
 * right segments to load, loading them, and pushing them so they can be decoded.
 *
 * Multiple RepresentationStream can run on the same SegmentSink.
 * This allows for example smooth transitions between multiple periods.
 *
 * @param {Object} args - Various arguments allowing to know which segments to
 * load, loading them and pushing them.
 * You can check the corresponding type for more information.
 * @param {Object} callbacks - The `RepresentationStream` relies on a system of
 * callbacks that it will call on various events.
 *
 * Depending on the event, the caller may be supposed to perform actions to
 * react upon some of them.
 *
 * This approach is taken instead of a more classical EventEmitter pattern to:
 *   - Allow callbacks to be called synchronously after the
 *     `RepresentationStream` is called.
 *   - Simplify bubbling events up, by just passing through callbacks
 *   - Force the caller to explicitely handle or not the different events.
 *
 * Callbacks may start being called immediately after the `RepresentationStream`
 * call and may be called until either the `parentCancelSignal` argument is
 * triggered, until the `terminating` callback has been triggered AND all loaded
 * segments have been pushed, or until the `error` callback is called, whichever
 * comes first.
 * @param {Object} parentCancelSignal - `CancellationSignal` allowing, when
 * triggered, to immediately stop all operations the `RepresentationStream` is
 * doing.
 */
export default function RepresentationStream<TSegmentDataType>({ content, options, playbackObserver, segmentSink, segmentFetcher, terminate, }: IRepresentationStreamArguments<TSegmentDataType>, callbacks: IRepresentationStreamCallbacks, parentCancelSignal: CancellationSignal): void;
