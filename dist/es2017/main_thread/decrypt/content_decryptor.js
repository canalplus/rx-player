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
import eme, { getInitData } from "../../compat/eme";
import config from "../../config";
import { EncryptedMediaError, OtherError } from "../../errors";
import log from "../../log";
import areArraysOfNumbersEqual from "../../utils/are_arrays_of_numbers_equal";
import arrayFind from "../../utils/array_find";
import arrayIncludes from "../../utils/array_includes";
import EventEmitter from "../../utils/event_emitter";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import { objectValues } from "../../utils/object_values";
import { bytesToHex } from "../../utils/string_parsing";
import TaskCanceller from "../../utils/task_canceller";
import attachMediaKeys from "./attach_media_keys";
import createOrLoadSession from "./create_or_load_session";
import initMediaKeys from "./init_media_keys";
import SessionEventsListener, { BlacklistedSessionError, } from "./session_events_listener";
import setServerCertificate from "./set_server_certificate";
import { ContentDecryptorState } from "./types";
import { DecommissionedSessionError } from "./utils/check_key_statuses";
import cleanOldStoredPersistentInfo from "./utils/clean_old_stored_persistent_info";
import getDrmSystemId from "./utils/get_drm_system_id";
import InitDataValuesContainer from "./utils/init_data_values_container";
import { areAllKeyIdsContainedIn, areSomeKeyIdsContainedIn, } from "./utils/key_id_comparison";
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
export default class ContentDecryptor extends EventEmitter {
    /**
     * `true` if the EME API are available on the current platform according to
     * the default EME implementation used.
     * `false` otherwise.
     * @returns {boolean}
     */
    static hasEmeApis() {
        return !isNullOrUndefined(eme.requestMediaKeySystemAccess);
    }
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
    constructor(mediaElement, ksOptions) {
        super();
        log.debug("DRM: Starting ContentDecryptor logic.");
        const canceller = new TaskCanceller();
        this._currentSessions = [];
        this._canceller = canceller;
        this._initDataQueue = [];
        this._stateData = {
            state: {
                name: ContentDecryptorState.Initializing,
                payload: null,
            },
            isMediaKeysAttached: 0 /* MediaKeyAttachmentStatus.NotAttached */,
            isInitDataQueueLocked: true,
            data: null,
        };
        eme.onEncrypted(mediaElement, (evt) => {
            log.debug("DRM: Encrypted event received from media element.");
            const initData = getInitData(evt);
            if (initData !== null) {
                this.onInitializationData(initData);
            }
        }, canceller.signal);
        initMediaKeys(mediaElement, ksOptions, canceller.signal)
            .then((mediaKeysInfo) => {
            const { mediaKeySystemAccess } = mediaKeysInfo;
            /**
             * String identifying the key system, allowing the rest of the code to
             * only advertise the required initialization data for license requests.
             */
            const systemId = getDrmSystemId(mediaKeySystemAccess.keySystem);
            this.systemId = systemId;
            if (this._stateData.state.name === ContentDecryptorState.Initializing) {
                this._stateData = {
                    state: {
                        name: ContentDecryptorState.WaitingForAttachment,
                        payload: null,
                    },
                    isInitDataQueueLocked: true,
                    isMediaKeysAttached: 0 /* MediaKeyAttachmentStatus.NotAttached */,
                    data: { mediaKeysInfo, mediaElement },
                };
                this.trigger("stateChange", this._stateData.state);
            }
        })
            .catch((err) => {
            this._onFatalError(err);
        });
    }
    /**
     * Returns the current state of the ContentDecryptor.
     * @see ContentDecryptorState
     * @returns {Object}
     */
    getState() {
        return this._stateData.state;
    }
    /**
     * Attach the current decryption capabilities to the HTMLMediaElement.
     * This method should only be called once the `ContentDecryptor` is in the
     * `WaitingForAttachment` state.
     *
     * You might want to first set the HTMLMediaElement's `src` attribute before
     * calling this method, and only push data to it once the `ReadyForContent`
     * state is reached, for compatibility reasons.
     */
    attach() {
        if (this._stateData.state.name !== ContentDecryptorState.WaitingForAttachment) {
            throw new Error("`attach` should only be called when " + "in the WaitingForAttachment state");
        }
        else if (this._stateData.isMediaKeysAttached !== 0 /* MediaKeyAttachmentStatus.NotAttached */ ||
            this._stateData.data === null) {
            log.warn("DRM: ContentDecryptor's `attach` method called more than once.");
            return;
        }
        const { mediaElement, mediaKeysInfo } = this._stateData.data;
        const { options, mediaKeys, mediaKeySystemAccess, stores } = mediaKeysInfo;
        const shouldDisableLock = options.disableMediaKeysAttachmentLock === true;
        const canFilterProtectionData = isNullOrUndefined(options.persistentLicenseConfig) ||
            options.persistentLicenseConfig.disableRetroCompatibility === true;
        if (shouldDisableLock) {
            this._stateData = {
                state: {
                    name: ContentDecryptorState.ReadyForContent,
                    payload: {
                        systemId: this.systemId,
                        canFilterProtectionData,
                        failOnEncryptedAfterClear: true,
                    },
                },
                isInitDataQueueLocked: true,
                isMediaKeysAttached: 1 /* MediaKeyAttachmentStatus.Pending */,
                data: { mediaKeysInfo, mediaElement },
            };
            this.trigger("stateChange", this._stateData.state);
            // previous trigger might have lead to disposal
            if (this._isStopped()) {
                return;
            }
        }
        this._stateData.isMediaKeysAttached = 1 /* MediaKeyAttachmentStatus.Pending */;
        const stateToAttach = {
            emeImplementation: eme,
            loadedSessionsStore: stores.loadedSessionsStore,
            mediaKeySystemAccess,
            mediaKeys,
            keySystemOptions: options,
        };
        log.debug("DRM: Attaching current MediaKeys");
        attachMediaKeys(mediaElement, stateToAttach, this._canceller.signal)
            .then(async () => {
            this._stateData.isMediaKeysAttached = 2 /* MediaKeyAttachmentStatus.Attached */;
            const { serverCertificate } = options;
            if (!isNullOrUndefined(serverCertificate)) {
                const resSsc = await setServerCertificate(mediaKeys, serverCertificate);
                if (resSsc.type === "error") {
                    this.trigger("warning", resSsc.value);
                }
            }
            if (this._isStopped()) {
                // We might be stopped since then
                return;
            }
            this._stateData = {
                state: {
                    name: ContentDecryptorState.ReadyForContent,
                    payload: {
                        systemId: this.systemId,
                        canFilterProtectionData,
                        failOnEncryptedAfterClear: true,
                    },
                },
                isMediaKeysAttached: 2 /* MediaKeyAttachmentStatus.Attached */,
                isInitDataQueueLocked: false,
                data: { mediaKeysData: mediaKeysInfo },
            };
            this.trigger("stateChange", this._stateData.state);
            if (!this._isStopped()) {
                this._processCurrentInitDataQueue();
            }
        })
            .catch((err) => {
            this._onFatalError(err);
        });
    }
    /**
     * Stop this `ContentDecryptor` instance:
     *   - stop listening and reacting to the various event listeners
     *   - abort all operations.
     *
     * Once disposed, a `ContentDecryptor` cannot be used anymore.
     */
    dispose() {
        this.removeEventListener();
        this._stateData = {
            state: {
                name: ContentDecryptorState.Disposed,
                payload: null,
            },
            isMediaKeysAttached: undefined,
            isInitDataQueueLocked: undefined,
            data: null,
        };
        this._canceller.cancel();
        this.trigger("stateChange", this._stateData.state);
    }
    /**
     * Method to call when new protection initialization data is encounted on the
     * content.
     *
     * When called, the `ContentDecryptor` will try to obtain the decryption key
     * if not already obtained.
     *
     * @param {Object} initializationData
     */
    onInitializationData(initializationData) {
        if (this._stateData.isInitDataQueueLocked !== false) {
            if (this._isStopped()) {
                throw new Error("ContentDecryptor either disposed or stopped.");
            }
            this._initDataQueue.push(initializationData);
            return;
        }
        const { mediaKeysData } = this._stateData.data;
        const processedInitializationData = Object.assign(Object.assign({}, initializationData), { values: new InitDataValuesContainer(initializationData.values) });
        this._processInitializationData(processedInitializationData, mediaKeysData).catch((err) => {
            this._onFatalError(err);
        });
    }
    /**
     * Async logic run each time new initialization data has to be processed.
     * The promise return may reject, in which case a fatal error should be linked
     * the current `ContentDecryptor`.
     *
     * The Promise's resolution however provides no semantic value.
     * @param {Object} initializationData
     * @returns {Promise.<void>}
     */
    async _processInitializationData(initializationData, mediaKeysData) {
        var _a, _b, _c;
        if (log.hasLevel("DEBUG")) {
            log.debug("DRM: processing init data", (_a = initializationData.content) === null || _a === void 0 ? void 0 : _a.adaptation.type, (_b = initializationData.content) === null || _b === void 0 ? void 0 : _b.representation.bitrate, ((_c = initializationData.keyIds) !== null && _c !== void 0 ? _c : []).map((k) => bytesToHex(k)).join(", "));
        }
        const { mediaKeySystemAccess, stores, options } = mediaKeysData;
        if (this._tryToUseAlreadyCreatedSession(initializationData, mediaKeysData) ||
            this._isStopped()) {
            // _isStopped is voluntarly checked after here
            return;
        }
        if (options.singleLicensePer === "content") {
            const firstCreatedSession = arrayFind(this._currentSessions, (x) => x.source === "created-session" /* MediaKeySessionLoadingType.Created */);
            if (firstCreatedSession !== undefined) {
                // We already fetched a `singleLicensePer: "content"` license, yet we
                // could not use the already-created MediaKeySession with it.
                // It means that we'll never handle it and we should thus blacklist it.
                const keyIds = initializationData.keyIds;
                if (keyIds === undefined) {
                    if (initializationData.content === undefined) {
                        log.warn("DRM: Unable to fallback from a non-decipherable quality.");
                    }
                    else {
                        log.debug("DRM: Blacklisting new init data (due to singleLicensePer content policy)");
                        this.trigger("blackListProtectionData", initializationData);
                    }
                    return;
                }
                firstCreatedSession.record.associateKeyIds(keyIds);
                if (initializationData.content === undefined) {
                    log.warn("DRM: Unable to fallback from a non-decipherable quality.");
                }
                else {
                    if (log.hasLevel("DEBUG")) {
                        const hexKids = keyIds.reduce((acc, kid) => `${acc}, ${bytesToHex(kid)}`, "");
                        log.debug("DRM: Blacklisting new key ids", hexKids);
                    }
                    this.trigger("keyIdsCompatibilityUpdate", {
                        whitelistedKeyIds: [],
                        blacklistedKeyIds: keyIds,
                        delistedKeyIds: [],
                    });
                }
                return;
            }
        }
        else if (options.singleLicensePer === "periods" &&
            initializationData.content !== undefined) {
            const { period } = initializationData.content;
            const createdSessions = this._currentSessions.filter((x) => x.source === "created-session" /* MediaKeySessionLoadingType.Created */);
            const periodKeys = new Set();
            addKeyIdsFromPeriod(periodKeys, period);
            for (const createdSess of createdSessions) {
                const periodKeysArr = Array.from(periodKeys);
                for (const kid of periodKeysArr) {
                    if (createdSess.record.isAssociatedWithKeyId(kid)) {
                        createdSess.record.associateKeyIds(periodKeys.values());
                        // Re-loop through the Period's key ids to blacklist ones that are missing
                        // from `createdSess`'s `keyStatuses` and to update the content's
                        // decipherability.
                        for (const innerKid of periodKeysArr) {
                            if (!createdSess.keyStatuses.whitelisted.some((k) => areArraysOfNumbersEqual(k, innerKid)) &&
                                !createdSess.keyStatuses.blacklisted.some((k) => areArraysOfNumbersEqual(k, innerKid))) {
                                createdSess.keyStatuses.blacklisted.push(innerKid);
                            }
                        }
                        if (log.hasLevel("DEBUG")) {
                            log.debug("DRM: Session already created for", bytesToHex(kid), 'under singleLicensePer "periods" policy');
                        }
                        this.trigger("keyIdsCompatibilityUpdate", {
                            whitelistedKeyIds: createdSess.keyStatuses.whitelisted,
                            blacklistedKeyIds: createdSess.keyStatuses.blacklisted,
                            delistedKeyIds: [],
                        });
                        return;
                    }
                }
            }
        }
        // /!\ Do not forget to unlock when done
        // TODO this is error-prone and can lead to performance issue when loading
        // persistent sessions.
        // Can we find a better strategy?
        this._lockInitDataQueue();
        let wantedSessionType;
        if (isNullOrUndefined(options.persistentLicenseConfig)) {
            wantedSessionType = "temporary";
        }
        else if (!canCreatePersistentSession(mediaKeySystemAccess)) {
            log.warn('DRM: Cannot create "persistent-license" session: not supported');
            wantedSessionType = "temporary";
        }
        else {
            wantedSessionType = "persistent-license";
        }
        const { EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS, EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION, } = config.getCurrent();
        const maxSessionCacheSize = typeof options.maxSessionCacheSize === "number"
            ? options.maxSessionCacheSize
            : EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS;
        const sessionRes = await createOrLoadSession(initializationData, stores, wantedSessionType, maxSessionCacheSize, this._canceller.signal);
        if (this._isStopped()) {
            return;
        }
        const sessionInfo = {
            record: sessionRes.value.keySessionRecord,
            source: sessionRes.type,
            keyStatuses: { whitelisted: [], blacklisted: [] },
            blacklistedSessionError: null,
        };
        this._currentSessions.push(sessionInfo);
        const { mediaKeySession, sessionType } = sessionRes.value;
        /**
         * We only store persistent sessions once its keys are known.
         * This boolean allows to know if this session has already been
         * persisted or not.
         */
        let isSessionPersisted = false;
        SessionEventsListener(mediaKeySession, options, mediaKeySystemAccess.keySystem, {
            onKeyUpdate: (value) => {
                const linkedKeys = getKeyIdsLinkedToSession(initializationData, sessionInfo.record, options.singleLicensePer, sessionInfo.source === "created-session" /* MediaKeySessionLoadingType.Created */, value.whitelistedKeyIds, value.blacklistedKeyIds);
                sessionInfo.record.associateKeyIds(linkedKeys.whitelisted);
                sessionInfo.record.associateKeyIds(linkedKeys.blacklisted);
                sessionInfo.keyStatuses = {
                    whitelisted: linkedKeys.whitelisted,
                    blacklisted: linkedKeys.blacklisted,
                };
                if (sessionInfo.record.getAssociatedKeyIds().length !== 0 &&
                    sessionType === "persistent-license" &&
                    stores.persistentSessionsStore !== null &&
                    !isSessionPersisted) {
                    const { persistentSessionsStore } = stores;
                    cleanOldStoredPersistentInfo(persistentSessionsStore, EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION - 1);
                    persistentSessionsStore.add(initializationData, sessionInfo.record.getAssociatedKeyIds(), mediaKeySession);
                    isSessionPersisted = true;
                }
                if (initializationData.content !== undefined) {
                    this.trigger("keyIdsCompatibilityUpdate", {
                        whitelistedKeyIds: linkedKeys.whitelisted,
                        blacklistedKeyIds: linkedKeys.blacklisted,
                        delistedKeyIds: [],
                    });
                }
                this._unlockInitDataQueue();
            },
            onWarning: (value) => {
                this.trigger("warning", value);
            },
            onError: (err) => {
                var _a;
                if (err instanceof DecommissionedSessionError) {
                    log.warn("DRM: A session's closing condition has been triggered");
                    this._lockInitDataQueue();
                    const indexOf = this._currentSessions.indexOf(sessionInfo);
                    if (indexOf >= 0) {
                        this._currentSessions.splice(indexOf);
                    }
                    if (initializationData.content !== undefined) {
                        this.trigger("keyIdsCompatibilityUpdate", {
                            whitelistedKeyIds: [],
                            blacklistedKeyIds: [],
                            delistedKeyIds: sessionInfo.record.getAssociatedKeyIds(),
                        });
                    }
                    (_a = stores.persistentSessionsStore) === null || _a === void 0 ? void 0 : _a.delete(mediaKeySession.sessionId);
                    stores.loadedSessionsStore
                        .closeSession(mediaKeySession)
                        .catch((e) => {
                        const closeError = e instanceof Error ? e : "unknown error";
                        log.warn("DRM: failed to close expired session", closeError);
                    })
                        .then(() => this._unlockInitDataQueue())
                        .catch((retryError) => this._onFatalError(retryError));
                    if (!this._isStopped()) {
                        this.trigger("warning", err.reason);
                    }
                    return;
                }
                if (!(err instanceof BlacklistedSessionError)) {
                    this._onFatalError(err);
                    return;
                }
                sessionInfo.blacklistedSessionError = err;
                if (initializationData.content !== undefined) {
                    log.info("DRM: blacklisting Representations based on " + "protection data.");
                    this.trigger("blackListProtectionData", initializationData);
                }
                this._unlockInitDataQueue();
                // TODO warning for blacklisted session?
            },
        }, this._canceller.signal);
        if (options.singleLicensePer === undefined ||
            options.singleLicensePer === "init-data") {
            this._unlockInitDataQueue();
        }
        if (sessionRes.type === "created-session" /* MediaKeySessionLoadingType.Created */) {
            const requestData = initializationData.values.constructRequestData();
            try {
                await stores.loadedSessionsStore.generateLicenseRequest(mediaKeySession, initializationData.type, requestData);
            }
            catch (error) {
                // First check that the error was not due to the MediaKeySession closing
                // or being closed
                const entry = stores.loadedSessionsStore.getEntryForSession(mediaKeySession);
                if (entry === null || entry.closingStatus.type !== "none") {
                    // MediaKeySession closing/closed: Just remove from handled list and abort.
                    const indexInCurrent = this._currentSessions.indexOf(sessionInfo);
                    if (indexInCurrent >= 0) {
                        this._currentSessions.splice(indexInCurrent, 1);
                    }
                    return Promise.resolve();
                }
                throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR", error instanceof Error ? error.toString() : "Unknown error");
            }
        }
        return Promise.resolve();
    }
    _tryToUseAlreadyCreatedSession(initializationData, mediaKeysData) {
        const { stores, options } = mediaKeysData;
        /**
         * If set, a currently-used key session is already compatible to this
         * initialization data.
         */
        const compatibleSessionInfo = arrayFind(this._currentSessions, (x) => x.record.isCompatibleWith(initializationData));
        if (compatibleSessionInfo === undefined) {
            return false;
        }
        // Check if the compatible session is blacklisted
        const blacklistedSessionError = compatibleSessionInfo.blacklistedSessionError;
        if (!isNullOrUndefined(blacklistedSessionError)) {
            if (initializationData.type === undefined ||
                initializationData.content === undefined) {
                log.error("DRM: This initialization data has already been blacklisted " +
                    "but the current content is not known.");
                return true;
            }
            else {
                log.info("DRM: This initialization data has already been blacklisted. " +
                    "Blacklisting the related content.");
                this.trigger("blackListProtectionData", initializationData);
                return true;
            }
        }
        // Check if the current key id(s) has been blacklisted by this session
        if (initializationData.keyIds !== undefined) {
            /**
             * If set to `true`, the Representation(s) linked to this
             * initialization data's key id should be marked as "not decipherable".
             */
            let isUndecipherable;
            if (options.singleLicensePer === undefined ||
                options.singleLicensePer === "init-data") {
                // Note: In the default "init-data" mode, we only avoid a
                // Representation if the key id was originally explicitely
                // blacklisted (and not e.g. if its key was just not present in
                // the license).
                //
                // This is to enforce v3.x.x retro-compatibility: we cannot
                // fallback from a Representation unless some RxPlayer option
                // documentating this behavior has been set.
                const { blacklisted } = compatibleSessionInfo.keyStatuses;
                isUndecipherable = areSomeKeyIdsContainedIn(initializationData.keyIds, blacklisted);
            }
            else {
                // In any other mode, as soon as not all of this initialization
                // data's linked key ids are explicitely whitelisted, we can mark
                // the corresponding Representation as "not decipherable".
                // This is because we've no such retro-compatibility guarantee to
                // make there.
                const { whitelisted } = compatibleSessionInfo.keyStatuses;
                isUndecipherable = !areAllKeyIdsContainedIn(initializationData.keyIds, whitelisted);
            }
            if (isUndecipherable) {
                if (initializationData.content === undefined) {
                    log.error("DRM: Cannot forbid key id, the content is unknown.");
                    return true;
                }
                log.info("DRM: Current initialization data is linked to blacklisted keys. " +
                    "Marking Representations as not decipherable");
                this.trigger("keyIdsCompatibilityUpdate", {
                    whitelistedKeyIds: [],
                    blacklistedKeyIds: initializationData.keyIds,
                    delistedKeyIds: [],
                });
                return true;
            }
        }
        // If we reached here, it means that this initialization data is not
        // blacklisted in any way.
        // Search loaded session and put it on top of the cache if it exists.
        const entry = stores.loadedSessionsStore.reuse(initializationData);
        if (entry !== null) {
            // TODO update decipherability to `true` if not?
            log.debug("DRM: Init data already processed. Skipping it.");
            return true;
        }
        // Session not found in `loadedSessionsStore`, it might have been closed
        // since.
        // Remove from `this._currentSessions` and start again.
        const indexOf = this._currentSessions.indexOf(compatibleSessionInfo);
        if (indexOf === -1) {
            log.error("DRM: Unable to remove processed init data: not found.");
        }
        else {
            log.debug("DRM: A session from a processed init data is not available " +
                "anymore. Re-processing it.");
            this._currentSessions.splice(indexOf, 1);
        }
        return false;
    }
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
    _onFatalError(err) {
        if (this._canceller.isUsed()) {
            return;
        }
        const formattedErr = err instanceof Error ? err : new OtherError("NONE", "Unknown decryption error");
        this._initDataQueue.length = 0;
        this._stateData = {
            state: {
                name: ContentDecryptorState.Error,
                payload: formattedErr,
            },
            isMediaKeysAttached: undefined,
            isInitDataQueueLocked: undefined,
            data: null,
        };
        this._canceller.cancel();
        // The previous trigger might have lead to a disposal of the `ContentDecryptor`.
        if (this._stateData.state.name === ContentDecryptorState.Error) {
            this.trigger("stateChange", this._stateData.state);
        }
    }
    /**
     * Return `true` if the `ContentDecryptor` has either been disposed or
     * encountered a fatal error which made it stop.
     * @returns {boolean}
     */
    _isStopped() {
        return (this._stateData.state.name === ContentDecryptorState.Disposed ||
            this._stateData.state.name === ContentDecryptorState.Error);
    }
    /**
     * Start processing the next initialization data of the `_initDataQueue` if it
     * isn't lock.
     */
    _processCurrentInitDataQueue() {
        while (this._stateData.isInitDataQueueLocked === false) {
            const initData = this._initDataQueue.shift();
            if (initData === undefined) {
                return;
            }
            this.onInitializationData(initData);
        }
    }
    /**
     * Lock new initialization data (from the `_initDataQueue`) from being
     * processed until `_unlockInitDataQueue` is called.
     *
     * You may want to call this method when performing operations which may have
     * an impact on the handling of other initialization data.
     */
    _lockInitDataQueue() {
        if (this._stateData.isInitDataQueueLocked === false) {
            this._stateData.isInitDataQueueLocked = true;
        }
    }
    /**
     * Unlock `_initDataQueue` and start processing the first element.
     *
     * Should have no effect if the `_initDataQueue` was not locked.
     */
    _unlockInitDataQueue() {
        if (this._stateData.isMediaKeysAttached !== 2 /* MediaKeyAttachmentStatus.Attached */) {
            log.error("DRM: Trying to unlock in the wrong state");
            return;
        }
        this._stateData.isInitDataQueueLocked = false;
        this._processCurrentInitDataQueue();
    }
}
/**
 * Returns `true` if the given MediaKeySystemAccess can create
 * "persistent-license" MediaKeySessions.
 * @param {MediaKeySystemAccess} mediaKeySystemAccess
 * @returns {Boolean}
 */
function canCreatePersistentSession(mediaKeySystemAccess) {
    const { sessionTypes } = mediaKeySystemAccess.getConfiguration();
    return sessionTypes !== undefined && arrayIncludes(sessionTypes, "persistent-license");
}
/**
 * Return the list of key IDs present in the `expectedKeyIds` array
 * but that are not present in `actualKeyIds`.
 * @param {Uint8Array[]} expectedKeyIds - Array of key IDs expected to be found.
 * @param {Uint8Array[]} actualKeyIds - Array of key IDs to test.
 * @returns {Uint8Array[]} An array of key IDs that are missing from `actualKeyIds`.
 */
export function getMissingKeyIds(expectedKeyIds, actualKeyIds) {
    return expectedKeyIds.filter((expected) => {
        return !actualKeyIds.some((actual) => areArraysOfNumbersEqual(actual, expected));
    });
}
/**
 * Returns an array of all key IDs that are known by the `KeySessionRecord`
 * but are missing in the provided array of key IDs `newKeyIds`.
 * @param {KeySessionRecord} keySessionRecord - The KeySessionRecord containing known key IDs.
 * @param {Uint8Array[]} newKeyIds - Array of key IDs.
 * @returns {Uint8Array[]} An array of key IDs that are known by the `keySessionRecord`
 *                          but are missing in the license.
 */
export function getMissingKnownKeyIds(keySessionRecord, newKeyIds) {
    const allKnownKeyIds = keySessionRecord.getAssociatedKeyIds();
    const missingKeyIds = getMissingKeyIds(allKnownKeyIds, newKeyIds);
    if (missingKeyIds.length > 0 && log.hasLevel("DEBUG")) {
        log.debug("DRM: KeySessionRecord's keys missing in the license, blacklisting them", missingKeyIds.map((m) => bytesToHex(m)).join(", "));
    }
    return missingKeyIds;
}
/**
 * Returns an array of all key IDs that are present in InitData
 * but are missing in the provided array of key IDs `newKeyIds`.
 * @param {IProcessedProtectionData} initializationData - The initialization data containing key IDs.
 * @param {Uint8Array[]} newKeyIds - Array of key IDs.
 * @returns {Uint8Array[]} An array of key IDs that are present in initializationData
 *                          but are missing in the license.
 */
export function getMissingInitDataKeyIds(initializationData, newKeyIds) {
    let missingKeyIds = [];
    const { keyIds: expectedKeyIds } = initializationData;
    if (expectedKeyIds !== undefined) {
        missingKeyIds = getMissingKeyIds(expectedKeyIds, newKeyIds);
    }
    if (missingKeyIds.length > 0 && log.hasLevel("DEBUG")) {
        log.debug("DRM: init data keys missing in the license, blacklisting them", missingKeyIds.map((m) => bytesToHex(m)).join(", "));
    }
    return missingKeyIds;
}
/**
 * Returns set of all usable and unusable keys - explicit or implicit - that are
 * linked to a `MediaKeySession`.
 *
 * In the RxPlayer, there is a concept of "explicit" key ids, which are key ids
 * found in a license whose status can be known through the `keyStatuses`
 * property from a `MediaKeySession`, and of "implicit" key ids, which are key
 * ids which were expected to be in a fetched license, but apparently weren't.
 *
 * @param {Object} initializationData - Initialization data object used to make
 * the request for the current license.
 * @param {Object} keySessionRecord - The `KeySessionRecord` associated with the
 * session that has been loaded. It might give supplementary information on
 * keys implicitly linked to the license.
 * @param {string|undefined} singleLicensePer - Setting allowing to indicate the
 * scope a given license should have.
 * @param {boolean} isCurrentLicense - If `true` the license has been fetched
 * especially for the current content.
 *
 * Knowing this allows to determine that if decryption keys that should have
 * been referenced in the fetched license (according to the `singleLicensePer`
 * setting) are missing, then the keys surely must have been voluntarly
 * removed from the license.
 *
 * If it is however set to `false`, it means that the license is an older
 * license that might have been linked to another content, thus we cannot make
 * that assumption.
 * @param {Array.<Uint8Array>} usableKeyIds - Key ids that are present in the
 * license and can be used.
 * @param {Array.<Uint8Array>} unusableKeyIds - Key ids that are present in the
 * license yet cannot be used.
 * @returns {Object} - Returns an object with the following properties:
 *   - `whitelisted`: Array of key ids for keys that are known to be usable
 *   - `blacklisted`: Array of key ids for keys that are considered unusable.
 *     The qualities linked to those keys should not be played.
 */
function getKeyIdsLinkedToSession(initializationData, keySessionRecord, singleLicensePer, isCurrentLicense, usableKeyIds, unusableKeyIds) {
    var _a;
    /**
     * Every key id associated with the MediaKeySession, starting with
     * whitelisted ones.
     */
    const keyIdsInLicense = [...usableKeyIds, ...unusableKeyIds];
    const missingKnownKeyIds = getMissingKnownKeyIds(keySessionRecord, keyIdsInLicense);
    const associatedKeyIds = keyIdsInLicense.concat(missingKnownKeyIds);
    if (singleLicensePer !== undefined && singleLicensePer !== "init-data") {
        // We want to add the current key ids in the blacklist if it is
        // not already there.
        //
        // We only do that when `singleLicensePer` is set to something
        // else than the default `"init-data"` because this logic:
        //   1. might result in a quality fallback, which is a v3.x.x
        //      breaking change if some APIs (like `singleLicensePer`)
        //      aren't used.
        //   2. Rely on the EME spec regarding key statuses being well
        //      implemented on all supported devices, which we're not
        //      sure yet. Because in any other `singleLicensePer`, we
        //      need a good implementation anyway, it doesn't matter
        //      there.
        const missingInitDataKeyIds = getMissingInitDataKeyIds(initializationData, associatedKeyIds);
        associatedKeyIds.push(...missingInitDataKeyIds);
        const { content } = initializationData;
        if (isCurrentLicense && content !== undefined) {
            if (singleLicensePer === "content") {
                // Put it in a Set to automatically filter out duplicates (by ref)
                const contentKeys = new Set();
                const { manifest } = content;
                for (const period of manifest.periods) {
                    addKeyIdsFromPeriod(contentKeys, period);
                }
                mergeKeyIdSetIntoArray(contentKeys, associatedKeyIds);
            }
            else if (singleLicensePer === "periods") {
                const { manifest } = content;
                for (const period of manifest.periods) {
                    const periodKeys = new Set();
                    addKeyIdsFromPeriod(periodKeys, period);
                    if (((_a = initializationData.content) === null || _a === void 0 ? void 0 : _a.period.id) === period.id) {
                        mergeKeyIdSetIntoArray(periodKeys, associatedKeyIds);
                    }
                    else {
                        const periodKeysArr = Array.from(periodKeys);
                        for (const kid of periodKeysArr) {
                            const isFound = associatedKeyIds.some((k) => areArraysOfNumbersEqual(k, kid));
                            if (isFound) {
                                mergeKeyIdSetIntoArray(periodKeys, associatedKeyIds);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    return {
        whitelisted: usableKeyIds,
        /** associatedKeyIds starts with the whitelisted one. */
        blacklisted: associatedKeyIds.slice(usableKeyIds.length),
    };
}
/**
 * Push all kei ids in the given `set` and add it to the `arr` Array only if it
 * isn't already present in it.
 * @param {Set.<Uint8Array>} set
 * @param {Array.<Uint8Array>} arr
 */
function mergeKeyIdSetIntoArray(set, arr) {
    const setArr = Array.from(set.values());
    for (const kid of setArr) {
        const isFound = arr.some((k) => areArraysOfNumbersEqual(k, kid));
        if (!isFound) {
            arr.push(kid);
        }
    }
}
/**
 * Add to the given `set` all key ids found in the given `Period`.
 * @param {Set.<Uint8Array>} set
 * @param {Object} period
 */
function addKeyIdsFromPeriod(set, period) {
    const adaptationsByType = period.adaptations;
    const adaptations = objectValues(adaptationsByType).reduce(
    // Note: the second case cannot happen. TS is just being dumb here
    (acc, adaps) => (!isNullOrUndefined(adaps) ? acc.concat(adaps) : acc), []);
    for (const adaptation of adaptations) {
        for (const representation of adaptation.representations) {
            if (representation.contentProtections !== undefined &&
                representation.contentProtections.keyIds !== undefined) {
                for (const kidInf of representation.contentProtections.keyIds) {
                    set.add(kidInf.keyId);
                }
            }
        }
    }
}
