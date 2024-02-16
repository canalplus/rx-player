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
import type { IAdaptationMetadata } from "../../manifest";
import type { IParsedAdaptation } from "../../parsers/manifest";
import type { ITrackType, IRepresentationFilter } from "../../public_types";
import type { ICodecSupportList } from "./representation";
import Representation from "./representation";
/**
 * Normalized Adaptation structure.
 * An `Adaptation` describes a single `Track`. For example a specific audio
 * track (in a given language) or a specific video track.
 * It istelf can be represented in different qualities, which we call here
 * `Representation`.
 * @class Adaptation
 */
export default class Adaptation implements IAdaptationMetadata {
    /** ID uniquely identifying the Adaptation in the Period. */
    readonly id: string;
    /**
     * `true` if this Adaptation was not present in the original Manifest, but was
     * manually added after through the corresponding APIs.
     */
    manuallyAdded?: boolean;
    /**
     * @see IRepresentationMetadata
     */
    readonly representations: Representation[];
    /**
     * @see IRepresentationMetadata
     */
    readonly type: ITrackType;
    /**
     * @see IRepresentationMetadata
     */
    isAudioDescription?: boolean;
    /**
     * @see IRepresentationMetadata
     */
    isClosedCaption?: boolean;
    /**
     * @see IRepresentationMetadata
     */
    isForcedSubtitles?: boolean;
    /**
     * @see IRepresentationMetadata
     */
    isSignInterpreted?: boolean;
    /**
     * @see IRepresentationMetadata
     */
    isDub?: boolean;
    /**
     * @see IRepresentationMetadata
     */
    language?: string;
    /**
     * @see IRepresentationMetadata
     */
    normalizedLanguage?: string;
    /**
     * @see IRepresentationMetadata
     */
    isSupported: boolean | undefined;
    /**
     * @see IRepresentationMetadata
     */
    isTrickModeTrack?: boolean;
    /**
     * @see IRepresentationMetadata
     */
    label?: string;
    /**
     * @see IRepresentationMetadata
     */
    readonly trickModeTracks?: Adaptation[];
    /**
     * @constructor
     * @param {Object} parsedAdaptation
     * @param {Object|undefined} [options]
     */
    constructor(parsedAdaptation: IParsedAdaptation, options?: {
        representationFilter?: IRepresentationFilter | undefined;
        isManuallyAdded?: boolean | undefined;
    });
    /**
     * Some environments (e.g. in a WebWorker) may not have the capability to know
     * if a mimetype+codec combination is supported on the current platform.
     *
     * Calling `refreshCodecSupport` manually with a clear list of codecs supported
     * once it has been requested on a compatible environment (e.g. in the main
     * thread) allows to work-around this issue.
     *
     * If the right mimetype+codec combination is found in the provided object,
     * this `Adaptation`'s `isSupported` property will be updated accordingly as
     * well as all of its inner `Representation`'s `isSupported` attributes.
     *
     * @param {Array.<Object>} supportList
     */
    refreshCodecSupport(supportList: ICodecSupportList): void;
    /**
     * Returns the Representation linked to the given ID.
     * @param {number|string} wantedId
     * @returns {Object|undefined}
     */
    getRepresentation(wantedId: number | string): Representation | undefined;
    /**
     * Format the current `Adaptation`'s properties into a
     * `IAdaptationMetadata` format which can better be communicated through
     * another thread.
     *
     * Please bear in mind however that the returned object will not be updated
     * when the current `Adaptation` instance is updated, it is only a
     * snapshot at the current time.
     *
     * If you want to keep that data up-to-date with the current `Adaptation`
     * instance, you will have to do it yourself.
     *
     * @returns {Object}
     */
    getMetadataSnapshot(): IAdaptationMetadata;
}
