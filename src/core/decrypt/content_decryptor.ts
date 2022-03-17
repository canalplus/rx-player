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

import PPromise from "pinkie";
import {
  events,
  generateKeyRequest,
  getInitData,
  ICustomMediaKeys,
  ICustomMediaKeySystemAccess,
} from "../../compat/";
import config from "../../config";
import {
  EncryptedMediaError,
  ICustomError,
  OtherError,
} from "../../errors";
import log from "../../log";
import Manifest, {
  Period,
} from "../../manifest";
import areArraysOfNumbersEqual from "../../utils/are_arrays_of_numbers_equal";
import arrayFind from "../../utils/array_find";
import arrayIncludes from "../../utils/array_includes";
import EventEmitter from "../../utils/event_emitter";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import { bytesToHex } from "../../utils/string_parsing";
import TaskCanceller from "../../utils/task_canceller";
import attachMediaKeys from "./attach_media_keys";
import createOrLoadSession from "./create_or_load_session";
import { IMediaKeysInfos } from "./get_media_keys";
import initMediaKeys from "./init_media_keys";
import SessionEventsListener, {
  BlacklistedSessionError,
} from "./session_events_listener";
import setServerCertificate from "./set_server_certificate";
import {
  IProtectionData,
  IKeySystemOption,
  IMediaKeySessionStores,
  MediaKeySessionLoadingType,
  IProcessedProtectionData,
} from "./types";
import cleanOldStoredPersistentInfo from "./utils/clean_old_stored_persistent_info";
import getDrmSystemId from "./utils/get_drm_system_id";
import InitDataValuesContainer from "./utils/init_data_values_container";
import {
  areAllKeyIdsContainedIn,
  areKeyIdsEqual,
  areSomeKeyIdsContainedIn,
  isKeyIdContainedIn,
} from "./utils/key_id_comparison";
import KeySessionRecord from "./utils/key_session_record";

const { onEncrypted$ } = events;

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
  public systemId : string | undefined;

  /**
   * Set only if the `ContentDecryptor` failed on an error.
   * The corresponding Error.
   */
  public error : Error | null;

  /**
   * State of the ContentDecryptor (@see ContentDecryptorState) and associated
   * data.
   *
   * The ContentDecryptor goes into a series of steps as it is initializing.
   * This private property stores the current state and the potentially linked
   * data.
   */
  private _stateData : IContentDecryptorStateData;

  /**
   * Contains information about all key sessions loaded for this current
   * content.
   * This object is most notably used to check which keys are already obtained,
   * thus avoiding to perform new unnecessary license requests and CDM interactions.
   */
  private _currentSessions : IActiveSessionInfo[];

  /**
   * Allows to dispose the resources taken by the current instance of the
   * ContentDecryptor.
   */
  private _canceller : TaskCanceller;

  /**
   * `true` once the `attach` method has been called`.
   * Allows to avoid calling multiple times that function.
   */
  private _wasAttachCalled : boolean;

  /**
   * This queue stores initialization data which hasn't been processed yet,
   * probably because the "queue is locked" for now. (@see _stateData private
   * property).
   *
   * For example, this queue stores initialization data communicated while
   * initializing so it can be processed when the initialization is done.
   */
  private _initDataQueue : IProtectionData[];

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
  constructor(mediaElement : HTMLMediaElement, ksOptions: IKeySystemOption[]) {
    super();

    log.debug("DRM: Starting ContentDecryptor logic.");

    const canceller = new TaskCanceller();
    this._currentSessions = [];
    this._canceller = canceller;
    this._wasAttachCalled = false;
    this._initDataQueue = [];
    this._stateData = { state: ContentDecryptorState.Initializing,
                        isMediaKeysAttached: false,
                        isInitDataQueueLocked: true,
                        data: null };
    this.error = null;

    const listenerSub = onEncrypted$(mediaElement).subscribe(evt => {
      log.debug("DRM: Encrypted event received from media element.");
      const initData = getInitData(evt);
      if (initData !== null) {
        this.onInitializationData(initData);
      }
    });
    canceller.signal.register(() => {
      listenerSub.unsubscribe();
    });

    initMediaKeys(mediaElement, ksOptions, canceller.signal)
      .then((mediaKeysInfo) => {
        const { options, mediaKeySystemAccess } = mediaKeysInfo;

        /**
         * String identifying the key system, allowing the rest of the code to
         * only advertise the required initialization data for license requests.
         *
         * Note that we only set this value if retro-compatibility to older
         * persistent logic in the RxPlayer is not important, as the
         * optimizations this property unlocks can break the loading of
         * MediaKeySessions persisted in older RxPlayer's versions.
         */
        let systemId : string | undefined;
        if (isNullOrUndefined(options.licenseStorage) ||
            options.licenseStorage.disableRetroCompatibility === true)
        {
          systemId = getDrmSystemId(mediaKeySystemAccess.keySystem);
        }

        this.systemId = systemId;
        if (this._stateData.state === ContentDecryptorState.Initializing) {
          this._stateData = { state: ContentDecryptorState.WaitingForAttachment,
                              isInitDataQueueLocked: true,
                              isMediaKeysAttached: false,
                              data: { mediaKeysInfo,
                                      mediaElement } };

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
  public getState() : ContentDecryptorState {
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
  public attach() : void {
    if (this._stateData.state !== ContentDecryptorState.WaitingForAttachment) {
      throw new Error("`attach` should only be called when " +
                      "in the WaitingForAttachment state");
    } else if (this._wasAttachCalled) {
      log.warn("DRM: ContentDecryptor's `attach` method called more than once.");
      return;
    }
    this._wasAttachCalled = true;

    const { mediaElement, mediaKeysInfo } = this._stateData.data;
    const { options, mediaKeys, mediaKeySystemAccess, stores } = mediaKeysInfo;
    const stateToAttatch = { loadedSessionsStore: stores.loadedSessionsStore,
                             mediaKeySystemAccess,
                             mediaKeys,
                             keySystemOptions: options };

    const shouldDisableLock = options.disableMediaKeysAttachmentLock === true;
    if (shouldDisableLock) {
      this._stateData = { state: ContentDecryptorState.ReadyForContent,
                          isInitDataQueueLocked: true,
                          isMediaKeysAttached: false,
                          data: null };
      this.trigger("stateChange", this._stateData.state);
      if (this._isStopped()) { // previous trigger might have lead to disposal
        return ;
      }
    }

    log.debug("DRM: Attaching current MediaKeys");
    attachMediaKeys(mediaElement, stateToAttatch, this._canceller.signal)
      .then(async () => {
        const { serverCertificate } = options;

        if (!isNullOrUndefined(serverCertificate)) {
          const resSsc = await setServerCertificate(mediaKeys, serverCertificate);
          if (resSsc.type === "error") {
            this.trigger("warning", resSsc.value);
          }
        }

        if (this._isStopped()) { // We might be stopped since then
          return;
        }

        const prevState = this._stateData.state;
        this._stateData = { state: ContentDecryptorState.ReadyForContent,
                            isMediaKeysAttached: true,
                            isInitDataQueueLocked: false,
                            data: { mediaKeysData: mediaKeysInfo } };
        if (prevState !== ContentDecryptorState.ReadyForContent) {
          this.trigger("stateChange", ContentDecryptorState.ReadyForContent);
        }
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
  public dispose() {
    this.removeEventListener();
    this._stateData = { state: ContentDecryptorState.Disposed,
                        isMediaKeysAttached: undefined,
                        isInitDataQueueLocked: undefined,
                        data: null };
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
  public onInitializationData(
    initializationData : IProtectionData
  ) : void {
    if (this._stateData.isInitDataQueueLocked !== false) {
      if (this._isStopped()) {
        throw new Error("ContentDecryptor either disposed or stopped.");
      }
      this._initDataQueue.push(initializationData);
      return;
    }

    const { mediaKeysData } = this._stateData.data;
    const processedInitializationData = {
      ...initializationData,
      values: new InitDataValuesContainer(initializationData.values),
    };
    this._processInitializationData(processedInitializationData, mediaKeysData)
      .catch(err => { this._onFatalError(err); });
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
  private async _processInitializationData(
    initializationData: IProcessedProtectionData,
    mediaKeysData: IAttachedMediaKeysData
  ) : Promise<void> {
    const { mediaKeySystemAccess, stores, options } = mediaKeysData;

    if (this._tryToUseAlreadyCreatedSession(initializationData, mediaKeysData) ||
        this._isStopped()) // _isStopped is voluntarly checked after here
    {
      return;
    }

    if (options.singleLicensePer === "content") {
      const firstCreatedSession = arrayFind(this._currentSessions, (x) =>
        x.source === MediaKeySessionLoadingType.Created);

      if (firstCreatedSession !== undefined) {
        // We already fetched a `singleLicensePer: "content"` license, yet we
        // could not use the already-created MediaKeySession with it.
        // It means that we'll never handle it and we should thus blacklist it.
        const keyIds = initializationData.keyIds;
        if (keyIds === undefined) {
          if (initializationData.content === undefined) {
            log.warn("DRM: Unable to fallback from a non-decipherable quality.");
          } else {
            blackListProtectionData(initializationData.content.manifest,
                                    initializationData);
          }
          return ;
        }

        firstCreatedSession.record.associateKeyIds(keyIds);
        if (initializationData.content !== undefined) {
          if (log.getLevel() === "DEBUG") {
            const hexKids = keyIds
              .reduce((acc, kid) => `${acc}, ${bytesToHex(kid)}`, "");
            log.debug("DRM: Blacklisting new key ids", hexKids);
          }
          updateDecipherability(initializationData.content.manifest, [], keyIds);
        }
        return ;
      }
    } else if (options.singleLicensePer === "periods" &&
               initializationData.content !== undefined)
    {
      const { period } = initializationData.content;
      const createdSessions = this._currentSessions
        .filter(x => x.source === MediaKeySessionLoadingType.Created);
      const periodKeys = new Set<Uint8Array>();
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
              if (!isKeyIdContainedIn(innerKid, createdSess.keyStatuses.whitelisted) &&
                  !isKeyIdContainedIn(innerKid, createdSess.keyStatuses.blacklisted))
              {
                createdSess.keyStatuses.blacklisted.push(innerKid);
              }
            }
            updateDecipherability(initializationData.content.manifest,
                                  createdSess.keyStatuses.whitelisted,
                                  createdSess.keyStatuses.blacklisted);
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

    let wantedSessionType : MediaKeySessionType;
    if (options.persistentLicense !== true) {
      wantedSessionType = "temporary";
    } else if (!canCreatePersistentSession(mediaKeySystemAccess)) {
      log.warn("DRM: Cannot create \"persistent-license\" session: not supported");
      wantedSessionType = "temporary";
    } else {
      wantedSessionType = "persistent-license";
    }

    const { EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS,
            EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION } = config.getCurrent();

    const maxSessionCacheSize = typeof options.maxSessionCacheSize === "number" ?
      options.maxSessionCacheSize :
      EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS;

    const sessionRes = await createOrLoadSession(initializationData,
                                                 stores,
                                                 wantedSessionType,
                                                 maxSessionCacheSize,
                                                 this._canceller.signal);
    if (this._isStopped()) {
      return;
    }

    const sessionInfo : IActiveSessionInfo = {
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

    const sub = SessionEventsListener(mediaKeySession,
                                      options,
                                      mediaKeySystemAccess.keySystem)
      .subscribe({

        next: (evt) : void => {
          switch (evt.type) {
            case "warning":
              this.trigger("warning", evt.value);
              return;
          }

          let linkedKeys;
          if (sessionInfo.source === MediaKeySessionLoadingType.Created) {
            // When the license has been fetched, there might be implicit key ids
            // linked to the session depending on the `singleLicensePer` option.
            linkedKeys = getFetchedLicenseKeysInfo(initializationData,
                                                   options.singleLicensePer,
                                                   evt.value.whitelistedKeyIds,
                                                   evt.value.blacklistedKeyIDs);
          } else {
            // When the MediaKeySession is just a cached/persisted one, we don't
            // have any concept of "implicit key id".
            linkedKeys = { whitelisted: evt.value.whitelistedKeyIds,
                           blacklisted: evt.value.blacklistedKeyIDs };
          }

          sessionInfo.record.associateKeyIds(linkedKeys.whitelisted);
          sessionInfo.record.associateKeyIds(linkedKeys.blacklisted);
          sessionInfo.keyStatuses = { whitelisted: linkedKeys.whitelisted,
                                      blacklisted: linkedKeys.blacklisted };

          if (sessionInfo.record.getAssociatedKeyIds().length !== 0 &&
              sessionType === "persistent-license" &&
              stores.persistentSessionsStore !== null &&
              !isSessionPersisted)
          {
            const { persistentSessionsStore } = stores;
            cleanOldStoredPersistentInfo(
              persistentSessionsStore,
              EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION - 1);
            persistentSessionsStore.add(initializationData,
                                        sessionInfo.record.getAssociatedKeyIds(),
                                        mediaKeySession);
            isSessionPersisted = true;
          }

          if (initializationData.content !== undefined) {
            updateDecipherability(initializationData.content.manifest,
                                  linkedKeys.whitelisted,
                                  linkedKeys.blacklisted);
          }

          this._unlockInitDataQueue();
        },

        error: (err) => {
          if (!(err instanceof BlacklistedSessionError)) {
            this._onFatalError(err);
            return ;
          }

          sessionInfo.blacklistedSessionError = err;

          if (initializationData.content !== undefined) {
            const { manifest } = initializationData.content;
            log.info("DRM: blacklisting Representations based on " +
                     "protection data.");
            blackListProtectionData(manifest, initializationData);
          }

          this._unlockInitDataQueue();

          // TODO warning for blacklisted session?
        },
      });
    this._canceller.signal.register(() => {
      sub.unsubscribe();
    });

    if (options.singleLicensePer === undefined ||
        options.singleLicensePer === "init-data")
    {
      this._unlockInitDataQueue();
    }

    if (sessionRes.type === MediaKeySessionLoadingType.Created) {
      const requestData = initializationData.values.constructRequestData();
      try {
        await generateKeyRequest(mediaKeySession,
                                 initializationData.type,
                                 requestData);
      } catch (error) {
        throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR",
                                      error instanceof Error ? error.toString() :
                                      "Unknown error");
      }
    }

    return PPromise.resolve();
  }

  private _tryToUseAlreadyCreatedSession(
    initializationData : IProcessedProtectionData,
    mediaKeysData : IAttachedMediaKeysData
  ) : boolean {
    const { stores, options } = mediaKeysData;

    /**
     * If set, a currently-used key session is already compatible to this
     * initialization data.
     */
    const compatibleSessionInfo = arrayFind(
      this._currentSessions,
      (x) => x.record.isCompatibleWith(initializationData));

    if (compatibleSessionInfo === undefined) {
      return false;
    }

    // Check if the compatible session is blacklisted
    const blacklistedSessionError = compatibleSessionInfo.blacklistedSessionError;
    if (!isNullOrUndefined(blacklistedSessionError)) {
      if (initializationData.type === undefined ||
          initializationData.content === undefined)
      {
        log.error("DRM: This initialization data has already been blacklisted " +
                  "but the current content is not known.");
        return true;
      } else {
        log.info("DRM: This initialization data has already been blacklisted. " +
                 "Blacklisting the related content.");
        const { manifest } = initializationData.content;
        blackListProtectionData(manifest, initializationData);
        return true;
      }
    }

    // Check if the current key id(s) has been blacklisted by this session
    if (initializationData.keyIds !== undefined) {
      /**
       * If set to `true`, the Representation(s) linked to this
       * initialization data's key id should be marked as "not decipherable".
       */
      let isUndecipherable : boolean;

      if (options.singleLicensePer === undefined ||
          options.singleLicensePer === "init-data")
      {
        // Note: In the default "init-data" mode, we only avoid a
        // Representation if the key id was originally explicitely
        // blacklisted (and not e.g. if its key was just not present in
        // the license).
        //
        // This is to enforce v3.x.x retro-compatibility: we cannot
        // fallback from a Representation unless some RxPlayer option
        // documentating this behavior has been set.
        const { blacklisted } = compatibleSessionInfo.keyStatuses;
        isUndecipherable = areSomeKeyIdsContainedIn(initializationData.keyIds,
                                                    blacklisted);
      } else {
        // In any other mode, as soon as not all of this initialization
        // data's linked key ids are explicitely whitelisted, we can mark
        // the corresponding Representation as "not decipherable".
        // This is because we've no such retro-compatibility guarantee to
        // make there.
        const { whitelisted } = compatibleSessionInfo.keyStatuses;
        isUndecipherable = !areAllKeyIdsContainedIn(initializationData.keyIds,
                                                    whitelisted);
      }

      if (isUndecipherable) {
        if (initializationData.content === undefined) {
          log.error("DRM: Cannot forbid key id, the content is unknown.");
          return true;
        }
        log.info("DRM: Current initialization data is linked to blacklisted keys. " +
                 "Marking Representations as not decipherable");
        updateDecipherability(initializationData.content.manifest,
                              [],
                              initializationData.keyIds);
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
    } else {
      log.debug("DRM: A session from a processed init data is not available " +
                "anymore. Re-processing it.");
      this._currentSessions.splice(indexOf, 1);
    }
    return false;
  }

  private _onFatalError(err : unknown) {
    if (this._canceller.isUsed) {
      return;
    }
    const formattedErr = err instanceof Error ?
      err :
      new OtherError("NONE", "Unknown encryption error");
    this.error = formattedErr;
    this._initDataQueue.length = 0;
    this._stateData = { state: ContentDecryptorState.Error,
                        isMediaKeysAttached: undefined,
                        isInitDataQueueLocked: undefined,
                        data: null };
    this._canceller.cancel();
    this.trigger("error", formattedErr);

    // The previous trigger might have lead to a disposal of the `ContentDecryptor`.
    if (this._stateData.state === ContentDecryptorState.Error) {
      this.trigger("stateChange", this._stateData.state);
    }
  }

  /**
   * Return `true` if the `ContentDecryptor` has either been disposed or
   * encountered a fatal error which made it stop.
   * @returns {boolean}
   */
  private _isStopped() : boolean {
    return this._stateData.state === ContentDecryptorState.Disposed ||
           this._stateData.state === ContentDecryptorState.Error;
  }

  private _processCurrentInitDataQueue() {
    while (this._stateData.isInitDataQueueLocked === false) {
      const initData = this._initDataQueue.shift();
      if (initData === undefined) {
        return;
      }
      this.onInitializationData(initData);
    }
  }

  private _lockInitDataQueue() {
    if (this._stateData.isInitDataQueueLocked === false) {
      this._stateData.isInitDataQueueLocked = true;
    }
  }

  private _unlockInitDataQueue() {
    if (this._stateData.isMediaKeysAttached !== true) {
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
function canCreatePersistentSession(
  mediaKeySystemAccess : MediaKeySystemAccess | ICustomMediaKeySystemAccess
) : boolean {
  const { sessionTypes } = mediaKeySystemAccess.getConfiguration();
  return sessionTypes !== undefined &&
         arrayIncludes(sessionTypes, "persistent-license");
}

function updateDecipherability(
  manifest : Manifest,
  whitelistedKeyIds : Uint8Array[],
  blacklistedKeyIDs : Uint8Array[]
) : void {
  manifest.updateRepresentationsDeciperability((representation) => {
    if (representation.contentProtections === undefined) {
      return representation.decipherable;
    }
    const contentKIDs = representation.contentProtections.keyIds;
    for (let i = 0; i < contentKIDs.length; i++) {
      const elt = contentKIDs[i];
      for (let j = 0; j < blacklistedKeyIDs.length; j++) {
        if (areKeyIdsEqual(blacklistedKeyIDs[j], elt.keyId)) {
          return false;
        }
      }
      for (let j = 0; j < whitelistedKeyIds.length; j++) {
        if (areKeyIdsEqual(whitelistedKeyIds[j], elt.keyId)) {
          return true;
        }
      }
    }
    return representation.decipherable;
  });
}

function blackListProtectionData(
  manifest : Manifest,
  initData : IProcessedProtectionData
) : void {
  manifest.updateRepresentationsDeciperability((representation) => {
    if (representation.decipherable === false) {
      return false;
    }
    const segmentProtections = representation.contentProtections?.initData ?? [];
    for (let i = 0; i < segmentProtections.length; i++) {
      if (initData.type === undefined ||
          segmentProtections[i].type === initData.type)
      {
        const containedInitData = initData.values.getFormattedValues()
          .every(undecipherableVal => {
            return segmentProtections[i].values.some(currVal => {
              return (undecipherableVal.systemId === undefined ||
                      currVal.systemId === undecipherableVal.systemId) &&
                      areArraysOfNumbersEqual(currVal.data,
                                              undecipherableVal.data);
            });
          });
        if (containedInitData) {
          return false;
        }
      }
    }
    return representation.decipherable;
  });
}

/** Events sent by the `ContentDecryptor`, in a `{ event: payload }` format. */
export interface IContentDecryptorEvent {
  /**
   * Event emitted when a major error occured which made the ContentDecryptor
   * stopped.
   * When that event is sent, the `ContentDecryptor` is in the `Error` state and
   * cannot be used anymore.
   */
  error : Error;

  /**
   * Event emitted when a minor error occured which the ContentDecryptor can
   * recover from.
   */
  warning : ICustomError;

  /**
   * Event emitted when the `ContentDecryptor`'s state changed.
   * States are a central aspect of the `ContentDecryptor`, be sure to check the
   * ContentDecryptorState type.
   */
  stateChange: ContentDecryptorState;
}

/** Enumeration of the various "state" the `ContentDecryptor` can be in. */
export enum ContentDecryptorState {
  /**
   * The `ContentDecryptor` is not yet ready to create key sessions and request
   * licenses.
   * This is is the initial state of the ContentDecryptor.
   */
  Initializing,

  /**
   * The `ContentDecryptor` has been initialized.
   * You should now called the `attach` method when you want to add decryption
   * capabilities to the HTMLMediaElement. The ContentDecryptor won't go to the
   * `ReadyForContent` state until `attach` is called.
   *
   * For compatibility reasons, this should be done after the HTMLMediaElement's
   * src attribute is set.
   *
   * It is also from when this state is reached that the `ContentDecryptor`'s
   * `systemId` property may be known.
   *
   * This state is always coming after the `Initializing` state.
   */
  WaitingForAttachment,

  /**
   * Content (encrypted or not) can begin to be pushed on the HTMLMediaElement
   * (this state was needed because some browser quirks sometimes forces us to
   * call EME API before this can be done).
   *
   * This state is always coming after the `WaitingForAttachment` state.
   */
  ReadyForContent,

  /**
   * The `ContentDecryptor` has encountered a fatal error and has been stopped.
   * It is now unusable.
   */
  Error,

  /** The `ContentDecryptor` has been disposed of and is now unusable. */
  Disposed,
}

/** Possible states the ContentDecryptor is in and associated data for each one. */
type IContentDecryptorStateData = IInitializingStateData |
                                  IWaitingForAttachmentStateData |
                                  IReadyForContentStateDataUnattached |
                                  IReadyForContentStateDataAttached |
                                  IDisposeStateData |
                                  IErrorStateData;

/** Skeleton that all variants of `IContentDecryptorStateData` use. */
interface IContentDecryptorStateBase<
  TStateName extends ContentDecryptorState,
  TIsQueueLocked extends boolean | undefined,
  TIsMediaKeyAttached extends boolean | undefined,
  TData
> {
  /** Identify the ContentDecryptor's state. */
  state: TStateName;
  /**
   * If `true`, the `ContentDecryptor` will wait before processing
   * newly-received initialization data.
   * If `false`, it will process them right away.
   * Set to undefined when it won't ever process them like for example in a
   * disposed or errored state.
   */
  isInitDataQueueLocked: TIsQueueLocked;
  /**
   * If `true`, the `MediaKeys` instance has been attached to the HTMLMediaElement.
   * If `false`, it hasn't happened yet.
   * If uncertain or unimportant (for example if the `ContentDecryptor` is an
   * disposed/errored state, set to `undefined`).
   */
  isMediaKeysAttached: TIsMediaKeyAttached;
  /** Data stored relative to that state. */
  data: TData;
}

/** ContentDecryptor's internal data when in the `Initializing` state. */
type IInitializingStateData = IContentDecryptorStateBase<
  ContentDecryptorState.Initializing,
  true, // isInitDataQueueLocked
  false, // isMediaKeysAttached
  null // data
>;

/** ContentDecryptor's internal data when in the `WaitingForAttachment` state. */
type IWaitingForAttachmentStateData = IContentDecryptorStateBase<
  ContentDecryptorState.WaitingForAttachment,
  true, // isInitDataQueueLocked
  false, // isMediaKeysAttached
  // data
  { mediaKeysInfo : IMediaKeysInfos;
    mediaElement : HTMLMediaElement; }
>;

/**
 * ContentDecryptor's internal data when in the `ReadyForContent` state before
 * it has attached the `MediaKeys` to the media element.
 */
type IReadyForContentStateDataUnattached = IContentDecryptorStateBase<
  ContentDecryptorState.ReadyForContent,
  true, // isInitDataQueueLocked
  false, // isMediaKeysAttached
  null // data
>;

/**
 * ContentDecryptor's internal data when in the `ReadyForContent` state once
 * it has attached the `MediaKeys` to the media element.
 */
type IReadyForContentStateDataAttached = IContentDecryptorStateBase<
  ContentDecryptorState.ReadyForContent,
  boolean, // isInitDataQueueLocked
  true, // isMediaKeysAttached
  {
    /**
     * MediaKeys-related information linked to this instance of the
     * `ContentDecryptor`.
     * Set to `null` until it is known.
     * Should be always set when the `ContentDecryptor` has reached the
     * Initialized state (@see ContentDecryptorState).
     */
    mediaKeysData : IAttachedMediaKeysData;
  }
>;

/** ContentDecryptor's internal data when in the `Disposed` state. */
type IDisposeStateData = IContentDecryptorStateBase<
  ContentDecryptorState.Disposed,
  undefined, // isInitDataQueueLocked
  undefined, // isMediaKeysAttached
  null // data
>;

/** ContentDecryptor's internal data when in the `Error` state. */
type IErrorStateData = IContentDecryptorStateBase<
  ContentDecryptorState.Error,
  undefined, // isInitDataQueueLocked
  undefined, // isMediaKeysAttached
  null // data
>;

/** Information linked to a session created by the `ContentDecryptor`. */
interface IActiveSessionInfo {
  /**
   * Record associated to the session.
   * Most notably, it allows both to identify the session as well as to
   * anounce and find out which key ids are already handled.
   */
  record : KeySessionRecord;

  /** Current keys' statuses linked that session. */
  keyStatuses : {
    /** Key ids linked to keys that are "usable". */
    whitelisted : Uint8Array[];
    /**
     * Key ids linked to keys that are not considered "usable".
     * Content linked to those keys are not decipherable and may thus be
     * fallbacked from.
     */
    blacklisted : Uint8Array[];
  };

  /** Source of the MediaKeySession linked to that record. */
  source : MediaKeySessionLoadingType;

  /**
   * If different than `null`, all initialization data compatible with this
   * processed initialization data has been blacklisted with this corresponding
   * error.
   */
  blacklistedSessionError : BlacklistedSessionError | null;
}

/**
 * Sent when the created (or already created) MediaKeys is attached to the
 * current HTMLMediaElement element.
 * On some peculiar devices, we have to wait for that step before the first
 * media segments are to be pushed to avoid issues.
 * Because this event is sent after a MediaKeys is created, you will always have
 * a "created-media-keys" event before an "attached-media-keys" event.
 */
interface IAttachedMediaKeysData {
  /** The MediaKeySystemAccess which allowed to create the MediaKeys instance. */
  mediaKeySystemAccess: MediaKeySystemAccess |
                        ICustomMediaKeySystemAccess;
  /** The MediaKeys instance. */
  mediaKeys : MediaKeys |
              ICustomMediaKeys;
  stores : IMediaKeySessionStores;
  options : IKeySystemOption;
}

/**
 * Returns information on all keys - explicit or implicit - that are linked to
 * a loaded license.
 *
 * In the RxPlayer, there is a concept of "explicit" key ids, which are key ids
 * found in a license whose status can be known through the `keyStatuses`
 * property from a `MediaKeySession`, and of "implicit" key ids, which are key
 * ids which were expected to be in a fetched license, but apparently weren't.
 * @param {Object} initializationData
 * @param {string|undefined} singleLicensePer
 * @param {Array.<Uint8Array>} usableKeyIds
 * @param {Array.<Uint8Array>} unusableKeyIds
 * @returns {Object}
 */
function getFetchedLicenseKeysInfo(
  initializationData : IProcessedProtectionData,
  singleLicensePer : undefined | "init-data" | "content" | "periods",
  usableKeyIds : Uint8Array[],
  unusableKeyIds : Uint8Array[]
) : { whitelisted : Uint8Array[];
      blacklisted : Uint8Array[]; }
{
  /**
   * Every key id associated with the MediaKeySession, starting with
   * whitelisted ones.
   */
  const associatedKeyIds = [...usableKeyIds,
                            ...unusableKeyIds];

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
    const { keyIds: expectedKeyIds,
            content } = initializationData;
    if (expectedKeyIds !== undefined) {
      const missingKeyIds = expectedKeyIds.filter(expected => {
        return !associatedKeyIds.some(k => areKeyIdsEqual(k, expected));
      });
      if (missingKeyIds.length > 0) {
        associatedKeyIds.push(...missingKeyIds) ;
      }
    }

    if (content !== undefined) {
      if (singleLicensePer === "content") {
        // Put it in a Set to automatically filter out duplicates (by ref)
        const contentKeys = new Set<Uint8Array>();
        const { manifest } = content;
        for (const period of manifest.periods) {
          addKeyIdsFromPeriod(contentKeys, period);
        }
        mergeKeyIdSetIntoArray(contentKeys, associatedKeyIds);
      } else if (singleLicensePer === "periods") {
        const { manifest } = content;
        for (const period of manifest.periods) {
          const periodKeys = new Set<Uint8Array>();
          addKeyIdsFromPeriod(periodKeys, period);
          if (initializationData.content?.period.id === period.id) {
            mergeKeyIdSetIntoArray(periodKeys, associatedKeyIds);
          } else {
            const periodKeysArr = Array.from(periodKeys);
            for (const kid of periodKeysArr) {
              const isFound = associatedKeyIds.some(k => areKeyIdsEqual(k, kid));
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
  return { whitelisted: usableKeyIds,
           /** associatedKeyIds starts with the whitelisted one. */
           blacklisted: associatedKeyIds.slice(usableKeyIds.length) };
}

function mergeKeyIdSetIntoArray(
  set : Set<Uint8Array>,
  arr : Uint8Array[]
) {
  const setArr = Array.from(set.values());
  for (const kid of setArr) {
    const isFound = arr.some(k => areKeyIdsEqual(k, kid));
    if (!isFound) {
      arr.push(kid);
    }
  }
}

function addKeyIdsFromPeriod(
  set : Set<Uint8Array>,
  period : Period
) {
  for (const adaptation of period.getAdaptations()) {
    for (const representation of adaptation.representations) {
      if (representation.contentProtections !== undefined &&
          representation.contentProtections.keyIds.length >= - 1)
      {
        for (const kidInf of representation.contentProtections.keyIds) {
          set.add(kidInf.keyId);
        }
      }
    }
  }
}
