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
import type { IRxPlayer } from "../../../main_thread/types";
import type { ILoaders } from "./types";
/**
 * This tool, as a supplement to the RxPlayer, intent to help creating thumbnails
 * from a video source.
 *
 * The tools will extract a "thumbnail track" either from a video track (whose light
 * chunks are adapted from such use case) or direclty from the media content.
 */
export default class VideoThumbnailLoader {
    private readonly _videoElement;
    private _player;
    private _lastRepresentationInfo;
    constructor(videoElement: HTMLVideoElement, player: IRxPlayer);
    /**
     * Add imported loader to thumbnail loader loader object.
     * It allows to use it when setting time.
     * @param {function} loaderFunc
     */
    static addLoader(loaderFunc: (features: ILoaders) => void): void;
    /**
     * Set time of thumbnail video media element :
     * - Remove buffer when too much buffered data
     * - Search for thumbnail track element to display
     * - Load data
     * - Append data
     * Resolves when time is set.
     * @param {number} time
     * @returns {Promise}
     */
    setTime(time: number): Promise<number>;
    /**
     * Dispose thumbnail loader.
     * @returns {void}
     */
    dispose(): void;
}
export { default as DASH_LOADER } from "./features/dash";
export { default as MPL_LOADER } from "./features/metaplaylist";
//# sourceMappingURL=video_thumbnail_loader.d.ts.map