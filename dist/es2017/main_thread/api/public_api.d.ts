/**
 * Copyright 2015 CANAL+ Group
 *
 * Licensed under the Apache License, Version 2.0 (the "License");publicapi
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
import type { IInbandEvent, IBufferedChunk, IBufferType } from "../../core/types";
import type { IErrorCode, IErrorType } from "../../errors";
import type { IFeature } from "../../features";
import type { IAdaptationMetadata, IManifestMetadata, IRepresentationMetadata } from "../../manifest";
import type { IAudioRepresentation, IAudioTrack, IAudioTrackSetting, IAvailableAudioTrack, IAvailableTextTrack, IAvailableVideoTrack, IBrokenRepresentationsLockContext, IConstructorOptions, IKeySystemConfigurationOutput, IKeySystemOption, ILoadVideoOptions, ILockedAudioRepresentationsSettings, ILockedVideoRepresentationsSettings, ITrackUpdateEventPayload, IRepresentationListUpdateContext, IPeriod, IPeriodChangeEvent, IPlayerError, IPlayerState, IPositionUpdate, IStreamEvent, ITextTrack, IVideoRepresentation, ITextTrackSetting, IVideoTrack, IVideoTrackSetting, IModeInformation, IWorkerSettings } from "../../public_types";
import type { IListener } from "../../utils/event_emitter";
import EventEmitter from "../../utils/event_emitter";
import type Logger from "../../utils/logger";
/**
 * @class Player
 * @extends EventEmitter
 */
declare class Player extends EventEmitter<IPublicAPIEvent> {
    /** Current version of the RxPlayer.  */
    static version: string;
    /** Current version of the RxPlayer.  */
    readonly version: string;
    /**
     * Store all video elements currently in use by an RxPlayer instance.
     * This is used to check that a video element is not shared between multiple instances.
     * Use of a WeakSet ensure the object is garbage collected if it's not used anymore.
     */
    private static _priv_currentlyUsedVideoElements;
    /**
     * Media element attached to the RxPlayer.
     * Set to `null` when the RxPlayer is disposed.
     */
    videoElement: HTMLMediaElement | null;
    /** Logger the RxPlayer uses.  */
    readonly log: Logger;
    /**
     * Current state of the RxPlayer.
     * Please use `getPlayerState()` instead.
     */
    state: IPlayerState;
    /**
     * Emit when the the RxPlayer is not needed anymore and thus all resources
     * used for its normal functionment can be freed.
     * The player will be unusable after that.
     */
    private readonly _destroyCanceller;
    /**
     * Contains `true` when the previous content is cleaning-up, `false` when it's
     * done.
     * A new content cannot be launched until it stores `false`.
     */
    private readonly _priv_contentLock;
    /**
     * The speed that should be applied to playback.
     * Used instead of videoElement.playbackRate to allow more flexibility.
     */
    private readonly _priv_speed;
    /** Store buffer-related options used needed when initializing a content. */
    private readonly _priv_bufferOptions;
    /** Information on the current bitrate settings. */
    private readonly _priv_bitrateInfos;
    private _priv_worker;
    /**
     * Current fatal error which STOPPED the player.
     * `null` if no fatal error was received for the current or last content.
     */
    private _priv_currentError;
    /**
     * Information about the current content being played.
     * `null` when no content is currently loading or loaded.
     */
    private _priv_contentInfos;
    /** If `true` trickMode video tracks will be chosen if available. */
    private _priv_preferTrickModeTracks;
    /** Refer to last picture in picture event received. */
    private _priv_pictureInPictureRef;
    /** Store wanted configuration for the `videoResolutionLimit` option. */
    private readonly _priv_videoResolutionLimit;
    /** Store wanted configuration for the `throttleVideoBitrateWhenHidden` option. */
    private readonly _priv_throttleVideoBitrateWhenHidden;
    /**
     * Store last state of various values sent as events, to avoid re-triggering
     * them multiple times in a row.
     *
     * All those events are linked to the content being played and can be cleaned
     * on stop.
     */
    private _priv_contentEventsMemory;
    /**
     * Information that can be relied on once `reload` is called.
     * It should refer to the last content being played.
     */
    private _priv_reloadingMetadata;
    /**
     * Store last value of autoPlay, from the last load or reload.
     */
    private _priv_lastAutoPlay;
    /** All possible Error types emitted by the RxPlayer. */
    static get ErrorTypes(): Record<IErrorType, IErrorType>;
    /** All possible Error codes emitted by the RxPlayer. */
    static get ErrorCodes(): Record<IErrorCode, IErrorCode>;
    /**
     * Current log level.
     * Update current log level.
     * Should be either (by verbosity ascending):
     *   - "NONE"
     *   - "ERROR"
     *   - "WARNING"
     *   - "INFO"
     *   - "DEBUG"
     * Any other value will be translated to "NONE".
     */
    static get LogLevel(): string;
    static set LogLevel(logLevel: string);
    /**
     * Add feature(s) to the RxPlayer.
     * @param {Array.<Object>} featureList - Features wanted.
     */
    static addFeatures(featureList: IFeature[]): void;
    /**
     * Register the video element to the set of elements currently in use.
     * @param videoElement the video element to register.
     * @throws Error - Throws if the element is already used by another player instance.
     */
    private static _priv_registerVideoElement;
    /**
     * Deregister the video element of the set of elements currently in use.
     * @param videoElement the video element to deregister.
     */
    static _priv_deregisterVideoElement(videoElement: HTMLMediaElement): void;
    /**
     * @constructor
     * @param {Object} options
     */
    constructor(options?: IConstructorOptions);
    /**
     * TODO returns promise?
     * @param {Object} workerSettings
     */
    attachWorker(workerSettings: IWorkerSettings): Promise<void>;
    /**
     * Returns information on which "mode" the RxPlayer is running for the current
     * content (e.g. main logic running in a WebWorker or not, are we in
     * directfile mode...).
     *
     * Returns `null` if no content is loaded.
     * @returns {Object|null}
     */
    getCurrentModeInformation(): IModeInformation | null;
    /**
     * Register a new callback for a player event event.
     *
     * @param {string} evt - The event to register a callback to
     * @param {Function} fn - The callback to call as that event is triggered.
     * The callback will take as argument the eventual payload of the event
     * (single argument).
     */
    addEventListener<TEventName extends keyof IPublicAPIEvent>(evt: TEventName, fn: IListener<IPublicAPIEvent, TEventName>): void;
    /**
     * Stop the playback for the current content.
     */
    stop(): void;
    /**
     * Free the resources used by the player.
     * /!\ The player cannot be "used" anymore after this method has been called.
     */
    dispose(): void;
    /**
     * Load a new video.
     * @param {Object} opts
     */
    loadVideo(opts: ILoadVideoOptions): void;
    /**
     * Reload the last loaded content.
     * @param {Object} reloadOpts
     */
    reload(reloadOpts?: {
        reloadAt?: {
            position?: number;
            relative?: number;
        };
        keySystems?: IKeySystemOption[];
        autoPlay?: boolean;
    }): void;
    createDebugElement(element: HTMLElement): {
        dispose(): void;
    };
    /**
     * From given options, initialize content playback.
     * @param {Object} options
     */
    private _priv_initializeContentPlayback;
    /**
     * Returns fatal error if one for the current content.
     * null otherwise.
     * @returns {Object|null} - The current Error (`null` when no error).
     */
    getError(): Error | null;
    /**
     * Returns the media DOM element used by the player.
     * You should not its HTML5 API directly and use the player's method instead,
     * to ensure a well-behaved player.
     * @returns {HTMLMediaElement|null} - The HTMLMediaElement used (`null` when
     * disposed)
     */
    getVideoElement(): HTMLMediaElement | null;
    /**
     * Returns the player's current state.
     * @returns {string} - The current Player's state
     */
    getPlayerState(): string;
    /**
     * Returns true if a content is loaded.
     * @returns {Boolean} - `true` if a content is loaded, `false` otherwise.
     */
    isContentLoaded(): boolean;
    /**
     * Returns true if the player is buffering.
     * @returns {Boolean} - `true` if the player is buffering, `false` otherwise.
     */
    isBuffering(): boolean;
    /**
     * Returns the play/pause status of the player :
     *   - when `LOADING` or `RELOADING`, returns the scheduled play/pause condition
     *     for when loading is over,
     *   - in other states, returns the `<video>` element .paused value,
     *   - if the player is disposed, returns `true`.
     * @returns {Boolean} - `true` if the player is paused or will be after loading,
     * `false` otherwise.
     */
    isPaused(): boolean;
    /**
     * Returns true if both:
     *   - a content is loaded
     *   - the content loaded is a live content
     * @returns {Boolean} - `true` if we're playing a live content, `false` otherwise.
     */
    isLive(): boolean;
    /**
     * Returns `true` if trickmode playback is active (usually through the usage
     * of the `setPlaybackRate` method), which means that the RxPlayer selects
     * "trickmode" video tracks in priority.
     * @returns {Boolean}
     */
    areTrickModeTracksEnabled(): boolean;
    /**
     * Returns the URL(s) of the currently considered Manifest, or of the content for
     * directfile content.
     * @returns {Array.<string>|undefined} - Current URL. `undefined` if not known
     * or no URL yet.
     */
    getContentUrls(): string[] | undefined;
    /**
     * Update URL of the content currently being played (e.g. DASH's MPD).
     * @param {Array.<string>|undefined} urls - URLs to reach that content /
     * Manifest from the most prioritized URL to the least prioritized URL.
     * @param {Object|undefined} [params]
     * @param {boolean} params.refresh - If `true` the resource in question
     * (e.g. DASH's MPD) will be refreshed immediately.
     */
    updateContentUrls(urls: string[] | undefined, params?: {
        refresh?: boolean;
    } | undefined): void;
    /**
     * Returns the video duration, in seconds.
     * NaN if no video is playing.
     * @returns {Number}
     */
    getMediaDuration(): number;
    /**
     * Returns in seconds the difference between:
     *   - the end of the current contiguous loaded range.
     *   - the current time
     * @returns {Number}
     */
    getCurrentBufferGap(): number;
    /**
     * Get the current position, in s, in wall-clock time.
     * That is:
     *   - for live content, get a timestamp, in s, of the current played content.
     *   - for static content, returns the position from beginning in s.
     *
     * If you do not know if you want to use this method or getPosition:
     *   - If what you want is to display the current time to the user, use this
     *     one.
     *   - If what you want is to interact with the player's API or perform other
     *     actions (like statistics) with the real player data, use getPosition.
     *
     * @returns {Number}
     */
    getWallClockTime(): number;
    /**
     * Get the current position, in seconds, of the video element.
     *
     * If you do not know if you want to use this method or getWallClockTime:
     *   - If what you want is to display the current time to the user, use
     *     getWallClockTime.
     *   - If what you want is to interact with the player's API or perform other
     *     actions (like statistics) with the real player data, use this one.
     *
     * @returns {Number}
     */
    getPosition(): number;
    /**
     * Returns the last stored content position, in seconds.
     *
     * @returns {number|undefined}
     */
    getLastStoredContentPosition(): number | undefined;
    /**
     * Returns the current playback rate at which the video plays.
     * @returns {Number}
     */
    getPlaybackRate(): number;
    /**
     * Update the playback rate of the video.
     *
     * This method's effect is persisted from content to content, and can be
     * called even when no content is playing (it will still have an effect for
     * the next contents).
     *
     * If you want to reverse effects provoked by `setPlaybackRate` before playing
     * another content, you will have to call `setPlaybackRate` first with the
     * default settings you want to set.
     *
     * As an example, to reset the speed to "normal" (x1) speed and to disable
     * trickMode video tracks (which may have been enabled by a previous
     * `setPlaybackRate` call), you can call:
     * ```js
     * player.setPlaybackRate(1, { preferTrickModeTracks: false });
     * ```
     *
     * --
     *
     * This method can be used to switch to or exit from "trickMode" video tracks,
     * which are tracks specifically defined to mimic the visual aspect of a VCR's
     * fast forward/rewind feature, by only displaying a few video frames during
     * playback.
     *
     * This behavior is configurable through the second argument, by adding a
     * property named `preferTrickModeTracks` to that object.
     *
     * You can set that value to `true` to switch to trickMode video tracks when
     * available, and set it to `false` when you want to disable that logic.
     * Note that like any configuration given to `setPlaybackRate`, this setting
     * is persisted through all future contents played by the player.
     *
     * If you want to stop enabling trickMode tracks, you will have to call
     * `setPlaybackRate` again with `preferTrickModeTracks` set to `false`.
     *
     * You can know at any moment whether this behavior is enabled by calling
     * the `areTrickModeTracksEnabled` method. This will only means that the
     * RxPlayer will select in priority trickmode video tracks, not that the
     * currently chosen video tracks is a trickmode track (for example, some
     * contents may have no trickmode tracks available).
     *
     * If you want to know about the latter instead, you can call `getVideoTrack`
     * and/or listen to `videoTrackChange` events. The track returned may have an
     * `isTrickModeTrack` property set to `true`, indicating that it is a
     * trickmode track.
     *
     * Note that switching to or getting out of a trickmode video track may
     * lead to the player being a brief instant in a `"RELOADING"` state (notified
     * through `playerStateChange` events and the `getLoadedContentState` method).
     * When in that state, a black screen may be displayed and multiple RxPlayer
     * APIs will not be usable.
     *
     * @param {Number} rate
     * @param {Object} opts
     */
    setPlaybackRate(rate: number, opts?: {
        preferTrickModeTracks?: boolean;
    }): void;
    /**
     * Returns video Representation currently considered for the current Period.
     *
     * Returns `null` if no video track is playing for the current Period.
     *
     * Returns `undefined` either when are not currently playing any Period or
     * when we don't know which Representation is playing.
     * @returns {Object|null|undefined}
     */
    getVideoRepresentation(): IVideoRepresentation | null | undefined;
    /**
     * Returns audio Representation currently considered for the current Period.
     *
     * Returns `null` if no audio track is playing for the current Period.
     *
     * Returns `undefined` either when are not currently playing any Period or
     * when we don't know which Representation is playing.
     * @returns {Object|null|undefined}
     */
    getAudioRepresentation(): IAudioRepresentation | null | undefined;
    /**
     * Play/Resume the current video.
     * @returns {Promise}
     */
    play(): Promise<void>;
    /**
     * Pause the current video.
     */
    pause(): void;
    /**
     * Seek to a given absolute position.
     * @param {Number|Object} time
     * @returns {Number} - The time the player has seek to
     */
    seekTo(time: number | {
        relative: number;
    } | {
        position: number;
    } | {
        wallClockTime: number;
    }): number;
    /**
     * Returns the current player's audio volume on the media element.
     * From 0 (no audio) to 1 (maximum volume).
     * @returns {Number}
     */
    getVolume(): number;
    /**
     * Set the player's audio volume. From 0 (no volume) to 1 (maximum volume).
     * @param {Number} volume
     */
    setVolume(volume: number): void;
    /**
     * Returns `true` if audio is currently muted.
     * @returns {Boolean}
     */
    isMute(): boolean;
    /**
     * Mute audio.
     */
    mute(): void;
    /**
     * Unmute audio.
     */
    unMute(): void;
    /**
     * Set the max buffer size for the buffer behind the current position.
     * Every buffer data before will be removed.
     * @param {Number} depthInSeconds
     */
    setMaxBufferBehind(depthInSeconds: number): void;
    /**
     * Set the max buffer size for the buffer behind the current position.
     * Every buffer data before will be removed.
     * @param {Number} depthInSeconds
     */
    setMaxBufferAhead(depthInSeconds: number): void;
    /**
     * Set the max buffer size for the buffer ahead of the current position.
     * The player will stop downloading chunks when this size is reached.
     * @param {Number} sizeInSeconds
     */
    setWantedBufferAhead(sizeInSeconds: number): void;
    /**
     * Set the max buffer size the buffer should take in memory
     * The player . will stop downloading chunks when this size is reached.
     * @param {Number} sizeInKBytes
     */
    setMaxVideoBufferSize(sizeInKBytes: number): void;
    /**
     * Returns the max buffer size for the buffer behind the current position.
     * @returns {Number}
     */
    getMaxBufferBehind(): number;
    /**
     * Returns the max buffer size for the buffer behind the current position.
     * @returns {Number}
     */
    getMaxBufferAhead(): number;
    /**
     * Returns the max buffer size for the buffer ahead of the current position.
     * @returns {Number}
     */
    getWantedBufferAhead(): number;
    /**
     * Returns the max buffer memory size for the buffer in kilobytes
     * @returns {Number}
     */
    getMaxVideoBufferSize(): number;
    getCurrentPeriod(): IPeriod | null;
    /**
     * Returns both the name of the key system (e.g. `"com.widevine.alpha"`) and
     * the `MediaKeySystemConfiguration` currently associated to the
     * HTMLMediaElement linked to the RxPlayer.
     *
     * Returns `null` if no such capabilities is associated or if unknown.
     * @returns {Object|null}
     */
    getKeySystemConfiguration(): IKeySystemConfigurationOutput | null;
    /**
     * Returns the list of available Periods for which the current audio, video or
     * text track can now be changed.
     * @returns {Array.<Object>}
     */
    getAvailablePeriods(): IPeriod[];
    /**
     * Returns every available audio tracks for a given Period - or the current
     * one if no `periodId` is given.
     * @param {string|undefined} [periodId]
     * @returns {Array.<Object>}
     */
    getAvailableAudioTracks(periodId?: string | undefined): IAvailableAudioTrack[];
    /**
     * Returns every available text tracks for a given Period - or the current
     * one if no `periodId` is given.
     * @param {string|undefined} [periodId]
     * @returns {Array.<Object>}
     */
    getAvailableTextTracks(periodId?: string | undefined): IAvailableTextTrack[];
    /**
     * Returns every available video tracks for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Array.<Object>}
     */
    getAvailableVideoTracks(periodId?: string | undefined): IAvailableVideoTrack[];
    /**
     * Returns currently chosen audio language for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Object|null|undefined}
     */
    getAudioTrack(periodId?: string | undefined): IAudioTrack | null | undefined;
    /**
     * Returns currently chosen subtitle for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Object|null|undefined}
     */
    getTextTrack(periodId?: string | undefined): ITextTrack | null | undefined;
    /**
     * Returns currently chosen video track for the current Period.
     * @param {string|undefined} [periodId]
     * @returns {Object|null|undefined}
     */
    getVideoTrack(periodId?: string | undefined): IVideoTrack | null | undefined;
    /**
     * Update the audio language for the current Period.
     * @param {string | object} arg
     * @throws Error - the current content has no TracksStore.
     * @throws Error - the given id is linked to no audio track.
     */
    setAudioTrack(arg: string | IAudioTrackSetting): void;
    /**
     * Update the text language for the current Period.
     * @param {string | Object} arg
     * @throws Error - the current content has no TracksStore.
     * @throws Error - the given id is linked to no text track.
     */
    setTextTrack(arg: string | ITextTrackSetting): void;
    /**
     * Disable subtitles for the current content.
     * @param {string|undefined} [periodId]
     */
    disableTextTrack(periodId?: string | undefined): void;
    /**
     * Update the video track for the current Period.
     * @param {string | Object} arg
     * @throws Error - the current content has no TracksStore.
     * @throws Error - the given id is linked to no video track.
     */
    setVideoTrack(arg: string | IVideoTrackSetting): void;
    /**
     * Disable video track for the current content.
     * @param {string|undefined} [periodId]
     */
    disableVideoTrack(periodId?: string | undefined): void;
    lockVideoRepresentations(arg: string[] | ILockedVideoRepresentationsSettings): void;
    lockAudioRepresentations(arg: string[] | ILockedAudioRepresentationsSettings): void;
    getLockedVideoRepresentations(periodId?: string | undefined): string[] | null;
    getLockedAudioRepresentations(periodId?: string | undefined): string[] | null;
    unlockVideoRepresentations(periodId?: string | undefined): void;
    unlockAudioRepresentations(periodId?: string | undefined): void;
    /**
     * Get minimum seek-able position.
     * @returns {number}
     */
    getMinimumPosition(): number | null;
    /**
     * Returns the current position for live contents.
     *
     * Returns `null` if no content is loaded or if the current loaded content is
     * not considered as a live content.
     * Returns `undefined` if that live position is currently unknown.
     * @returns {number}
     */
    getLivePosition(): number | undefined | null;
    /**
     * Get maximum seek-able position.
     * @returns {number}
     */
    getMaximumPosition(): number | null;
    /**
     * /!\ For demo use only! Do not touch!
     *
     * Returns every chunk buffered for a given buffer type.
     * Returns `null` if no SegmentSink was created for this type of buffer.
     * @param {string} bufferType
     * @returns {Array.<Object>|null}
     */
    __priv_getSegmentSinkContent(bufferType: IBufferType): IBufferedChunk[] | null;
    /**
     * /!\ For tools use only! Do not touch!
     *
     * Returns manifest/playlist object.
     * null if the player is STOPPED.
     * @returns {Manifest|null} - The current Manifest (`null` when not known).
     */
    __priv_getManifest(): IManifestMetadata | null;
    __priv_getCurrentAdaptation(): Partial<Record<IBufferType, IAdaptationMetadata | null>> | null;
    __priv_getCurrentRepresentations(): Partial<Record<IBufferType, IRepresentationMetadata | null>> | null;
    /**
     * Reset all state properties relative to a playing content.
     */
    private _priv_cleanUpCurrentContentState;
    /**
     * Triggered when the Manifest has been loaded for the current content.
     * Initialize various private properties and emit initial event.
     * @param {Object} contentInfos
     * @param {Object} manifest
     */
    private _priv_onManifestReady;
    /**
     * Triggered when the Manifest has been updated for the current content.
     * Initialize various private properties and emit initial event.
     * @param {Object} contentInfos
     * @param {Object} updates
     */
    private _priv_onManifestUpdate;
    private _priv_onDecipherabilityUpdate;
    /**
     * Triggered each times the current Period Changed.
     * Store and emit initial state for the Period.
     *
     * @param {Object} contentInfos
     * @param {Object} periodInfo
     */
    private _priv_onActivePeriodChanged;
    /**
     * Triggered each times a new "PeriodStream" is ready.
     * Choose the right Adaptation for the Period and emit it.
     * @param {Object} contentInfos
     * @param {Object} value
     */
    private _priv_onPeriodStreamReady;
    /**
     * Triggered each times we "remove" a PeriodStream.
     * @param {Object} contentInfos
     * @param {Object} value
     */
    private _priv_onPeriodStreamCleared;
    /**
     * Triggered each times a new Adaptation is considered for the current
     * content.
     * Store given Adaptation and emit it if from the current Period.
     * @param {Object} contentInfos
     * @param {Object} value
     */
    private _priv_onAdaptationChange;
    /**
     * Triggered each times a new Representation is considered during playback.
     *
     * Store given Representation and emit it if from the current Period.
     *
     * @param {Object} contentInfos
     * @param {Object} obj
     */
    private _priv_onRepresentationChange;
    /**
     * Triggered each time a bitrate estimate is calculated.
     *
     * Emit it.
     *
     * @param {Object} value
     */
    private _priv_onBitrateEstimateChange;
    /**
     * Triggered each time the player state updates.
     *
     * Trigger the right Player Event.
     *
     * @param {string} newState
     */
    private _priv_setPlayerState;
    /**
     * Triggered each time a playback observation.
     *
     * Trigger the right Player Event
     *
     * @param {Object} contentInfos
     * @param {Object} observation
     */
    private _priv_triggerPositionUpdate;
    /**
     * @param {string} evt
     * @param {*} arg
     * @param {Object} currentContentCancelSignal
     */
    private _priv_triggerEventIfNotStopped;
    /**
     * @param {Object} cancelSignal
     * @returns {Object}
     */
    private _priv_initializeMediaElementTracksStore;
    private _priv_callTracksStoreGetterSetter;
    /**
     * Method to call when some event lead to a high for possibility that the
     * available tracks for the given type have changed.
     * Send the corresponding `available*Tracks` change event with the last
     * available tracks.
     *
     * @param {string} trackType
     * @param {Object|undefined} [oPeriodRef] - optional period object used by the
     * `tracksStore` API, allows to optimize the method by bypassing this step.
     */
    private _priv_onAvailableTracksMayHaveChanged;
    /**
     * Method to call when a fatal error lead to the stopping of the current
     * content.
     *
     * @param {*} err - The error encountered.
     * @param {Object} contentInfos - The `IPublicApiContentInfos` object linked
     * to the content for which the error was received.
     */
    private _priv_onFatalError;
}
/** Every events sent by the RxPlayer's public API. */
interface IPublicAPIEvent {
    playerStateChange: string;
    positionUpdate: IPositionUpdate;
    audioTrackChange: IAudioTrack | null;
    textTrackChange: ITextTrack | null;
    videoTrackChange: IVideoTrack | null;
    audioRepresentationChange: IVideoRepresentation | null;
    videoRepresentationChange: IAudioRepresentation | null;
    volumeChange: {
        volume: number;
        muted: boolean;
    };
    error: IPlayerError | Error;
    warning: IPlayerError | Error;
    periodChange: IPeriodChangeEvent;
    availableAudioTracksChange: IAvailableAudioTrack[];
    availableTextTracksChange: IAvailableTextTrack[];
    availableVideoTracksChange: IAvailableVideoTrack[];
    play: null;
    pause: null;
    newAvailablePeriods: IPeriod[];
    brokenRepresentationsLock: IBrokenRepresentationsLockContext;
    trackUpdate: ITrackUpdateEventPayload;
    representationListUpdate: IRepresentationListUpdateContext;
    seeking: null;
    seeked: null;
    streamEvent: IStreamEvent;
    streamEventSkip: IStreamEvent;
    inbandEvents: IInbandEvent[];
}
export default Player;
