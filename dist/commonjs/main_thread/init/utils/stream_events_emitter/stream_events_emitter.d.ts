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
import type { IManifestMetadata } from "../../../../manifest";
import type { IPlaybackObservation, IReadOnlyPlaybackObserver } from "../../../../playback_observer";
import EventEmitter from "../../../../utils/event_emitter";
import type { IPublicNonFiniteStreamEvent, IPublicStreamEvent } from "./types";
interface IStreamEventsEmitterEvent {
    event: IPublicStreamEvent | IPublicNonFiniteStreamEvent;
    eventSkip: IPublicStreamEvent | IPublicNonFiniteStreamEvent;
}
/**
 * Get events from manifest and emit each time an event has to be emitted
 */
export default class StreamEventsEmitter extends EventEmitter<IStreamEventsEmitterEvent> {
    private _manifest;
    private _mediaElement;
    private _playbackObserver;
    private _scheduledEventsRef;
    private _eventsBeingPlayed;
    private _canceller;
    /**
     * @param {Object} manifest
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} playbackObserver
     */
    constructor(manifest: IManifestMetadata, mediaElement: HTMLMediaElement, playbackObserver: IReadOnlyPlaybackObserver<IPlaybackObservation>);
    start(): void;
    onManifestUpdate(man: IManifestMetadata): void;
    stop(): void;
    /**
     * Examine playback situation from playback observations to emit stream events and
     * prepare set onExit callbacks if needed.
     * @param {Array.<Object>} scheduledEvents
     * @param {Object} oldObservation
     * @param {Object} newObservation
     * @param {Object} stopSignal
     */
    private _emitStreamEvents;
}
export {};
//# sourceMappingURL=stream_events_emitter.d.ts.map