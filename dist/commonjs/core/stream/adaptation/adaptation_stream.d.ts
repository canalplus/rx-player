import type { CancellationSignal } from "../../../utils/task_canceller";
import type { IAdaptationStreamArguments, IAdaptationStreamCallbacks } from "./types";
/**
 * Create new `AdaptationStream` whose task will be to download the media data
 * for a given Adaptation (i.e. "track").
 *
 * It will rely on the IRepresentationEstimator to choose at any time the
 * best Representation for this Adaptation and then run the logic to download
 * and push the corresponding segments in the SegmentSink.
 *
 * @param {Object} args - Various arguments allowing the `AdaptationStream` to
 * determine which Representation to choose and which segments to load from it.
 * You can check the corresponding type for more information.
 * @param {Object} callbacks - The `AdaptationStream` relies on a system of
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
 * triggered, to immediately stop all operations the `AdaptationStream` is
 * doing.
 */
export default function AdaptationStream({ playbackObserver, content, options, representationEstimator, segmentSink, segmentFetcherCreator, wantedBufferAhead, maxVideoBufferSize, }: IAdaptationStreamArguments, callbacks: IAdaptationStreamCallbacks, parentCancelSignal: CancellationSignal): void;
//# sourceMappingURL=adaptation_stream.d.ts.map