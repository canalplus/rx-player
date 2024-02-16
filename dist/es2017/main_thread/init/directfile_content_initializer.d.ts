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
import type { IMediaElementPlaybackObserver } from "../../playback_observer";
import type { IKeySystemOption } from "../../public_types";
import type { IReadOnlySharedReference } from "../../utils/reference";
import { ContentInitializer } from "./types";
import type { IInitialTimeOptions } from "./utils/get_initial_time";
/**
 * `ContentIntializer` which will load contents by putting their URL in the
 * `src` attribute of the given HTMLMediaElement.
 *
 * Because such contents are mainly loaded by the browser, those (called
 * "directfile" contents in the RxPlayer) needs a simpler logic in-JS when
 * compared to a content that relies on the MSE API.
 *
 * @class DirectFileContentInitializer
 */
export default class DirectFileContentInitializer extends ContentInitializer {
    /**
     * Initial options given to the `DirectFileContentInitializer`.
     */
    private _settings;
    /**
     * Allows to abort and clean everything the `DirectFileContentInitializer` is
     * doing.
     */
    private _initCanceller;
    /**
     * Creates a new `DirectFileContentInitializer` linked to the given settings.
     * @param {Object} settings
     */
    constructor(settings: IDirectFileOptions);
    /**
     * "Prepare" content so it can later be played by calling `start`.
     */
    prepare(): void;
    /**
     * Start playback of the content linked to this `DirectFileContentInitializer`
     * on the given `HTMLMediaElement` and its associated `PlaybackObserver`.
     * @param {HTMLMediaElement} mediaElement - HTMLMediaElement on which the
     * content will be played.
     * @param {Object} playbackObserver - Object regularly emitting playback
     * information.
     */
    start(mediaElement: HTMLMediaElement, playbackObserver: IMediaElementPlaybackObserver): void;
    /**
     * Update URL this `ContentIntializer` depends on.
     * @param {Array.<string>|undefined} _urls
     * @param {boolean} _refreshNow
     */
    updateContentUrls(_urls: string[] | undefined, _refreshNow: boolean): void;
    /**
     * Stop content and free all resources linked to this `ContentIntializer`.
     */
    dispose(): void;
    /**
     * Logic performed when a fatal error was triggered.
     * @param {*} err - The fatal error in question.
     */
    private _onFatalError;
    /**
     * Perform the initial seek (to begin playback at an initially-calculated
     * position based on settings) and auto-play if needed when loaded.
     * @param {HTMLMediaElement} mediaElement
     * @param {Object} playbackObserver
     */
    private _seekAndPlay;
}
/** Options used by the `DirectFileContentInitializer` */
export interface IDirectFileOptions {
    /** If `true` we will play right after the content is considered "loaded". */
    autoPlay: boolean;
    /**
     * Encryption-related settings. Can be left as an empty array if the content
     * isn't encrypted.
     */
    keySystems: IKeySystemOption[];
    /** Communicate the playback rate wanted by the user. */
    speed: IReadOnlySharedReference<number>;
    /** Optional initial position to start at. */
    startAt?: IInitialTimeOptions | undefined;
    /** URL that should be played. */
    url: string;
}
