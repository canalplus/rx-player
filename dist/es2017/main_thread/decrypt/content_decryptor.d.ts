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
import type { IMediaElement } from "../../compat/browser_compatibility_types";
import type { IKeySystemOption } from "../../public_types";
import EventEmitter from "../../utils/event_emitter";
import type { IProtectionData, IProcessedProtectionData, IContentDecryptorEvent, IContentDecryptorStateData } from "./types";
import type KeySessionRecord from "./utils/key_session_record";
/**
 * Module communicating with the Content Decryption Module (or CDM) to be able
 * to decrypt contents.
 *
 * The `ContentDecryptor` starts communicating with the CDM, to initialize the
 * key system, as soon as it is created.
 *
 * You can be notified of various events, such as fatal errors, by registering
 * to one of its multiple events (@see IContentDecryptorEvent).
 *
 * @class ContentDecryptor
 */
export default class ContentDecryptor extends EventEmitter<IContentDecryptorEvent> {
    /**
     * Hexadecimal id identifying the currently-chosen key system.
     * `undefined` if not known or if the key system hasn't been initialized yet.
     *
     * When providing protection initialization data to the ContentDecryptor, you
     * may only provide those linked to that system id. You can also provide all
     * available protection initialization data, in which case it will be
     * automatically filtered.
     *
     * This `systemId` may only be known once the `ReadyForContent` state (@see
     * ContentDecryptorState) is reached, and even then, it may still be unknown,
     * in which case it will stay to `undefined`.
     */
    systemId: string | undefined;
    /**
     * State of the ContentDecryptor (@see ContentDecryptorState) and associated
     * data.
     *
     * The ContentDecryptor goes into a series of steps as it is initializing.
     * This private property stores the current state and the potentially linked
     * data.
     */
    private _stateData;
    /**
     * Contains information about all key sessions loaded for this current
     * content.
     * This object is most notably used to check which keys are already obtained,
     * thus avoiding to perform new unnecessary license requests and CDM interactions.
     */
    private _currentSessions;
    /**
     * Allows to dispose the resources taken by the current instance of the
     * ContentDecryptor.
     */
    private _canceller;
    /**
     * This queue stores initialization data which hasn't been processed yet,
     * probably because the "queue is locked" for now. (@see _stateData private
     * property).
     *
     * For example, this queue stores initialization data communicated while
     * initializing so it can be processed when the initialization is done.
     */
    private _initDataQueue;
    /**
     * `true` if the EME API are available on the current platform according to
     * the default EME implementation used.
     * `false` otherwise.
     * @returns {boolean}
     */
    static hasEmeApis(): boolean;
    /**
     * Create a new `ContentDecryptor`, and initialize its decryption capabilities
     * right away.
     * Goes into the `WaitingForAttachment` state once that initialization is
     * done, after which you should call the `attach` method when you're ready for
     * those decryption capabilities to be attached to the HTMLMediaElement.
     *
     * @param {HTMLMediaElement} mediaElement - The MediaElement which will be
     * associated to a MediaKeys object
     * @param {Array.<Object>} ksOptions - key system configuration.
     * The `ContentDecryptor` can be given one or multiple key system
     * configurations. It will choose the appropriate one depending on user
     * settings and browser support.
     */
    constructor(mediaElement: IMediaElement, ksOptions: IKeySystemOption[]);
    /**
     * Returns the current state of the ContentDecryptor.
     * @see ContentDecryptorState
     * @returns {Object}
     */
    getState(): IContentDecryptorStateData;
    /**
     * Attach the current decryption capabilities to the HTMLMediaElement.
     * This method should only be called once the `ContentDecryptor` is in the
     * `WaitingForAttachment` state.
     *
     * You might want to first set the HTMLMediaElement's `src` attribute before
     * calling this method, and only push data to it once the `ReadyForContent`
     * state is reached, for compatibility reasons.
     */
    attach(): void;
    /**
     * Stop this `ContentDecryptor` instance:
     *   - stop listening and reacting to the various event listeners
     *   - abort all operations.
     *
     * Once disposed, a `ContentDecryptor` cannot be used anymore.
     */
    dispose(): void;
    /**
     * Method to call when new protection initialization data is encounted on the
     * content.
     *
     * When called, the `ContentDecryptor` will try to obtain the decryption key
     * if not already obtained.
     *
     * @param {Object} initializationData
     */
    onInitializationData(initializationData: IProtectionData): void;
    /**
     * Async logic run each time new initialization data has to be processed.
     * The promise return may reject, in which case a fatal error should be linked
     * the current `ContentDecryptor`.
     *
     * The Promise's resolution however provides no semantic value.
     * @param {Object} initializationData
     * @returns {Promise.<void>}
     */
    private _processInitializationData;
    private _tryToUseAlreadyCreatedSession;
    /**
     * Callback that should be called if an error that made the current
     * `ContentDecryptor` instance unusable arised.
     * This callbacks takes care of resetting state and sending the right events.
     *
     * Once called, no further actions should be taken.
     *
     * @param {*} err - The error object which describes the issue. Will be
     * formatted and sent in an "error" event.
     */
    private _onFatalError;
    /**
     * Return `true` if the `ContentDecryptor` has either been disposed or
     * encountered a fatal error which made it stop.
     * @returns {boolean}
     */
    private _isStopped;
    /**
     * Start processing the next initialization data of the `_initDataQueue` if it
     * isn't lock.
     */
    private _processCurrentInitDataQueue;
    /**
     * Lock new initialization data (from the `_initDataQueue`) from being
     * processed until `_unlockInitDataQueue` is called.
     *
     * You may want to call this method when performing operations which may have
     * an impact on the handling of other initialization data.
     */
    private _lockInitDataQueue;
    /**
     * Unlock `_initDataQueue` and start processing the first element.
     *
     * Should have no effect if the `_initDataQueue` was not locked.
     */
    private _unlockInitDataQueue;
}
/**
 * Return the list of key IDs present in the `expectedKeyIds` array
 * but that are not present in `actualKeyIds`.
 * @param {Uint8Array[]} expectedKeyIds - Array of key IDs expected to be found.
 * @param {Uint8Array[]} actualKeyIds - Array of key IDs to test.
 * @returns {Uint8Array[]} An array of key IDs that are missing from `actualKeyIds`.
 */
export declare function getMissingKeyIds(expectedKeyIds: Uint8Array[], actualKeyIds: Uint8Array[]): Uint8Array[];
/**
 * Returns an array of all key IDs that are known by the `KeySessionRecord`
 * but are missing in the provided array of key IDs `newKeyIds`.
 * @param {KeySessionRecord} keySessionRecord - The KeySessionRecord containing known key IDs.
 * @param {Uint8Array[]} newKeyIds - Array of key IDs.
 * @returns {Uint8Array[]} An array of key IDs that are known by the `keySessionRecord`
 *                          but are missing in the license.
 */
export declare function getMissingKnownKeyIds(keySessionRecord: KeySessionRecord, newKeyIds: Uint8Array[]): Uint8Array[];
/**
 * Returns an array of all key IDs that are present in InitData
 * but are missing in the provided array of key IDs `newKeyIds`.
 * @param {IProcessedProtectionData} initializationData - The initialization data containing key IDs.
 * @param {Uint8Array[]} newKeyIds - Array of key IDs.
 * @returns {Uint8Array[]} An array of key IDs that are present in initializationData
 *                          but are missing in the license.
 */
export declare function getMissingInitDataKeyIds(initializationData: IProcessedProtectionData, newKeyIds: Uint8Array[]): Uint8Array[];
//# sourceMappingURL=content_decryptor.d.ts.map