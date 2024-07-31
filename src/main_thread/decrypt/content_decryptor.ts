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
import type { ICustomMediaKeys, ICustomMediaKeySystemAccess } from "../../compat/eme";
import eme, { getInitData } from "../../compat/eme";
import type { ICustomMediaEncryptedEvent } from "../../compat/eme/custom_media_keys/types";
import config from "../../config";
import { EncryptedMediaError, OtherError } from "../../errors";
import log from "../../log";
import type { IAdaptationMetadata, IPeriodMetadata } from "../../manifest";
import type { IKeySystemOption, IPlayerError } from "../../public_types";
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
import type { ICodecSupportList } from "./find_key_system";
import type { IMediaKeysInfos } from "./get_media_keys";
import initMediaKeys from "./init_media_keys";
import type { IKeyUpdateValue } from "./session_events_listener";
import SessionEventsListener, {
  BlacklistedSessionError,
} from "./session_events_listener";
import setServerCertificate from "./set_server_certificate";
import type {
  IProtectionData,
  IMediaKeySessionStores,
  IProcessedProtectionData,
  IContentDecryptorEvent,
} from "./types";
import { MediaKeySessionLoadingType, ContentDecryptorState } from "./types";
import { DecommissionedSessionError } from "./utils/check_key_statuses";
import cleanOldStoredPersistentInfo from "./utils/clean_old_stored_persistent_info";
import getDrmSystemId from "./utils/get_drm_system_id";
import InitDataValuesContainer from "./utils/init_data_values_container";
import isCompatibleCodecSupported from "./utils/is_compatible_codec_supported";
import {
  areAllKeyIdsContainedIn,
  areSomeKeyIdsContainedIn,
} from "./utils/key_id_comparison";
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
  public systemId: string | undefined;

  /**
   * Set only if the `ContentDecryptor` failed on an error.
   * The corresponding Error.
   */
  public error: Error | null;

  /**
   * State of the ContentDecryptor (@see ContentDecryptorState) and associated
   * data.
   *
   * The ContentDecryptor goes into a series of steps as it is initializing.
   * This private property stores the current state and the potentially linked
   * data.
   */
  private _stateData: IContentDecryptorStateData;

  /**
   * Contains information about all key sessions loaded for this current
   * content.
   * This object is most notably used to check which keys are already obtained,
   * thus avoiding to perform new unnecessary license requests and CDM interactions.
   */
  private _currentSessions: IActiveSessionInfo[];

  /**
   * Allows to dispose the resources taken by the current instance of the
   * ContentDecryptor.
   */
  private _canceller: TaskCanceller;

  /**
   * This queue stores initialization data which hasn't been processed yet,
   * probably because the "queue is locked" for now. (@see _stateData private
   * property).
   *
   * For example, this queue stores initialization data communicated while
   * initializing so it can be processed when the initialization is done.
   */
  private _initDataQueue: IProtectionData[];

  /**
   * Store the list of supported codecs with the current key system configuration.
   */
  private _supportedCodecWhenEncrypted: ICodecSupportList;

  /**
   * `true` if the EME API are available on the current platform according to
   * the default EME implementation used.
   * `false` otherwise.
   * @returns {boolean}
   */
  public static hasEmeApis(): boolean {
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
  constructor(mediaElement: IMediaElement, ksOptions: IKeySystemOption[]) {
    super();

    log.debug("DRM: Starting ContentDecryptor logic.");

    const canceller = new TaskCanceller();
    this._currentSessions = [];
    this._canceller = canceller;
    this._initDataQueue = [];
    this._stateData = {
      state: ContentDecryptorState.Initializing,
      isMediaKeysAttached: MediaKeyAttachmentStatus.NotAttached,
      isInitDataQueueLocked: true,
      data: null,
    };
    this._supportedCodecWhenEncrypted = [];
    this.error = null;

    eme.onEncrypted(
      mediaElement,
      (evt) => {
        log.debug("DRM: Encrypted event received from media element.");
        const initData = getInitData(evt as ICustomMediaEncryptedEvent);
        if (initData !== null) {
          this.onInitializationData(initData);
        }
      },
      canceller.signal,
    );

    initMediaKeys(mediaElement, ksOptions, canceller.signal)
      .then((mediaKeysInfo) => {
        const { options, mediaKeySystemAccess } = mediaKeysInfo;
        this._supportedCodecWhenEncrypted = mediaKeysInfo.codecSupport;
        /**
         * String identifying the key system, allowing the rest of the code to
         * only advertise the required initialization data for license requests.
         *
         * Note that we only set this value if retro-compatibility to older
         * persistent logic in the RxPlayer is not important, as the
         * optimizations this property unlocks can break the loading of
         * MediaKeySessions persisted in older RxPlayer's versions.
         */
        let systemId: string | undefined;
        if (
          isNullOrUndefined(options.persistentLicenseConfig) ||
          options.persistentLicenseConfig.disableRetroCompatibility === true
        ) {
          systemId = getDrmSystemId(mediaKeySystemAccess.keySystem);
        }

        this.systemId = systemId;
        if (this._stateData.state === ContentDecryptorState.Initializing) {
          this._stateData = {
            state: ContentDecryptorState.WaitingForAttachment,
            isInitDataQueueLocked: true,
            isMediaKeysAttached: MediaKeyAttachmentStatus.NotAttached,
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
  public getState(): ContentDecryptorState {
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
  public attach(): void {
    if (this._stateData.state !== ContentDecryptorState.WaitingForAttachment) {
      throw new Error(
        "`attach` should only be called when " + "in the WaitingForAttachment state",
      );
    } else if (
      this._stateData.isMediaKeysAttached !== MediaKeyAttachmentStatus.NotAttached
    ) {
      log.warn("DRM: ContentDecryptor's `attach` method called more than once.");
      return;
    }

    const { mediaElement, mediaKeysInfo } = this._stateData.data;
    const { options, mediaKeys, mediaKeySystemAccess, stores } = mediaKeysInfo;
    const shouldDisableLock = options.disableMediaKeysAttachmentLock === true;

    if (shouldDisableLock) {
      this._stateData = {
        state: ContentDecryptorState.ReadyForContent,
        isInitDataQueueLocked: true,
        isMediaKeysAttached: MediaKeyAttachmentStatus.Pending,
        data: { mediaKeysInfo, mediaElement },
      };
      this.trigger("stateChange", this._stateData.state);

      // previous trigger might have lead to disposal
      if (this._isStopped()) {
        return;
      }
    }

    this._stateData.isMediaKeysAttached = MediaKeyAttachmentStatus.Pending;
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
        this._stateData.isMediaKeysAttached = MediaKeyAttachmentStatus.Attached;

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

        const prevState = this._stateData.state;
        this._stateData = {
          state: ContentDecryptorState.ReadyForContent,
          isMediaKeysAttached: MediaKeyAttachmentStatus.Attached,
          isInitDataQueueLocked: false,
          data: { mediaKeysData: mediaKeysInfo },
        };
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
    this._stateData = {
      state: ContentDecryptorState.Disposed,
      isMediaKeysAttached: undefined,
      isInitDataQueueLocked: undefined,
      data: null,
    };
    this._canceller.cancel();
    this.trigger("stateChange", this._stateData.state);
  }

  /**
   * Returns `true` if the given mimeType and codec couple should be supported
   * by the current key system.
   * Returns `false` if it isn't.
   *
   * Returns `undefined` if we cannot determine if it is supported.
   *
   * @param {string} mimeType
   * @param {string} codec
   * @returns {boolean}
   */
  public isCodecSupported(mimeType: string, codec: string): boolean | undefined {
    if (this._stateData.state === ContentDecryptorState.Initializing) {
      log.error(
        "DRM: Asking for codec support while the ContentDecryptor is still initializing",
      );
      return undefined;
    }
    if (
      this._stateData.state === ContentDecryptorState.Error ||
      this._stateData.state === ContentDecryptorState.Disposed
    ) {
      log.error("DRM: Asking for codec support while the ContentDecryptor is disposed");
    }
    return isCompatibleCodecSupported(mimeType, codec, this._supportedCodecWhenEncrypted);
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
  public onInitializationData(initializationData: IProtectionData): void {
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
    this._processInitializationData(processedInitializationData, mediaKeysData).catch(
      (err) => {
        this._onFatalError(err);
      },
    );
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
    mediaKeysData: IAttachedMediaKeysData,
  ): Promise<void> {
    if (log.hasLevel("DEBUG")) {
      log.debug(
        "DRM: processing init data",
        initializationData.content?.adaptation.type,
        initializationData.content?.representation.bitrate,
        (initializationData.keyIds ?? []).map((k) => bytesToHex(k)).join(", "),
      );
    }
    const { mediaKeySystemAccess, stores, options } = mediaKeysData;

    if (
      this._tryToUseAlreadyCreatedSession(initializationData, mediaKeysData) ||
      this._isStopped()
    ) {
      // _isStopped is voluntarly checked after here
      return;
    }

    if (options.singleLicensePer === "content") {
      const firstCreatedSession = arrayFind(
        this._currentSessions,
        (x) => x.source === MediaKeySessionLoadingType.Created,
      );

      if (firstCreatedSession !== undefined) {
        // We already fetched a `singleLicensePer: "content"` license, yet we
        // could not use the already-created MediaKeySession with it.
        // It means that we'll never handle it and we should thus blacklist it.
        const keyIds = initializationData.keyIds;
        if (keyIds === undefined) {
          if (initializationData.content === undefined) {
            log.warn("DRM: Unable to fallback from a non-decipherable quality.");
          } else {
            log.debug(
              "DRM: Blacklisting new init data (due to singleLicensePer content policy)",
            );
            this.trigger("blackListProtectionData", initializationData);
          }
          return;
        }

        firstCreatedSession.record.associateKeyIds(keyIds);
        if (initializationData.content === undefined) {
          log.warn("DRM: Unable to fallback from a non-decipherable quality.");
        } else {
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
    } else if (
      options.singleLicensePer === "periods" &&
      initializationData.content !== undefined
    ) {
      const { period } = initializationData.content;
      const createdSessions = this._currentSessions.filter(
        (x) => x.source === MediaKeySessionLoadingType.Created,
      );
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
              if (
                !createdSess.keyStatuses.whitelisted.some((k) =>
                  areArraysOfNumbersEqual(k, innerKid),
                ) &&
                !createdSess.keyStatuses.blacklisted.some((k) =>
                  areArraysOfNumbersEqual(k, innerKid),
                )
              ) {
                createdSess.keyStatuses.blacklisted.push(innerKid);
              }
            }
            if (log.hasLevel("DEBUG")) {
              log.debug(
                "DRM: Session already created for",
                bytesToHex(kid),
                'under singleLicensePer "periods" policy',
              );
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

    let wantedSessionType: MediaKeySessionType;
    if (isNullOrUndefined(options.persistentLicenseConfig)) {
      wantedSessionType = "temporary";
    } else if (!canCreatePersistentSession(mediaKeySystemAccess)) {
      log.warn('DRM: Cannot create "persistent-license" session: not supported');
      wantedSessionType = "temporary";
    } else {
      wantedSessionType = "persistent-license";
    }

    const {
      EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS,
      EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION,
    } = config.getCurrent();

    const maxSessionCacheSize =
      typeof options.maxSessionCacheSize === "number"
        ? options.maxSessionCacheSize
        : EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS;

    const sessionRes = await createOrLoadSession(
      initializationData,
      stores,
      wantedSessionType,
      maxSessionCacheSize,
      this._canceller.signal,
    );
    if (this._isStopped()) {
      return;
    }

    const sessionInfo: IActiveSessionInfo = {
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

    SessionEventsListener(
      mediaKeySession,
      options,
      mediaKeySystemAccess.keySystem,
      {
        onKeyUpdate: (value: IKeyUpdateValue): void => {
          const linkedKeys = getKeyIdsLinkedToSession(
            initializationData,
            sessionInfo.record,
            options.singleLicensePer,
            sessionInfo.source === MediaKeySessionLoadingType.Created,
            value.whitelistedKeyIds,
            value.blacklistedKeyIds,
          );

          sessionInfo.record.associateKeyIds(linkedKeys.whitelisted);
          sessionInfo.record.associateKeyIds(linkedKeys.blacklisted);
          sessionInfo.keyStatuses = {
            whitelisted: linkedKeys.whitelisted,
            blacklisted: linkedKeys.blacklisted,
          };

          if (
            sessionInfo.record.getAssociatedKeyIds().length !== 0 &&
            sessionType === "persistent-license" &&
            stores.persistentSessionsStore !== null &&
            !isSessionPersisted
          ) {
            const { persistentSessionsStore } = stores;
            cleanOldStoredPersistentInfo(
              persistentSessionsStore,
              EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION - 1,
            );
            persistentSessionsStore.add(
              initializationData,
              sessionInfo.record.getAssociatedKeyIds(),
              mediaKeySession,
            );
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
        onWarning: (value: IPlayerError): void => {
          this.trigger("warning", value);
        },
        onError: (err: unknown): void => {
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
            stores.persistentSessionsStore?.delete(mediaKeySession.sessionId);
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
      },
      this._canceller.signal,
    );

    if (
      options.singleLicensePer === undefined ||
      options.singleLicensePer === "init-data"
    ) {
      this._unlockInitDataQueue();
    }

    if (sessionRes.type === MediaKeySessionLoadingType.Created) {
      const requestData = initializationData.values.constructRequestData();
      try {
        await stores.loadedSessionsStore.generateLicenseRequest(
          mediaKeySession,
          initializationData.type,
          requestData,
        );
      } catch (error) {
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
        throw new EncryptedMediaError(
          "KEY_GENERATE_REQUEST_ERROR",
          error instanceof Error ? error.toString() : "Unknown error",
        );
      }
    }

    return Promise.resolve();
  }

  private _tryToUseAlreadyCreatedSession(
    initializationData: IProcessedProtectionData,
    mediaKeysData: IAttachedMediaKeysData,
  ): boolean {
    const { stores, options } = mediaKeysData;

    /**
     * If set, a currently-used key session is already compatible to this
     * initialization data.
     */
    const compatibleSessionInfo = arrayFind(this._currentSessions, (x) =>
      x.record.isCompatibleWith(initializationData),
    );

    if (compatibleSessionInfo === undefined) {
      return false;
    }

    /**
     * On Safari using Directfile, the old EME implementation triggers
     * the "webkitneedkey" event instead of "encrypted". There's an issue in Safari
     * where "webkitneedkey" fires too early before all tracks are added from an HLS playlist.
     * Safari incorrectly assumes some keys are missing for these tracks,
     * leading to repeated "webkitneedkey" events. Because RxPlayer recognizes
     * it already has a session for these keys and ignores the events,
     * the content remains frozen. To resolve this, the session is re-created.
     */
    const forceSessionRecreation = initializationData.forceSessionRecreation;
    if (forceSessionRecreation === true) {
      this.removeSessionForInitData(initializationData, mediaKeysData);
      return false;
    }

    // Check if the compatible session is blacklisted
    const blacklistedSessionError = compatibleSessionInfo.blacklistedSessionError;
    if (!isNullOrUndefined(blacklistedSessionError)) {
      if (
        initializationData.type === undefined ||
        initializationData.content === undefined
      ) {
        log.error(
          "DRM: This initialization data has already been blacklisted " +
            "but the current content is not known.",
        );
        return true;
      } else {
        log.info(
          "DRM: This initialization data has already been blacklisted. " +
            "Blacklisting the related content.",
        );
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
      let isUndecipherable: boolean;

      if (
        options.singleLicensePer === undefined ||
        options.singleLicensePer === "init-data"
      ) {
        // Note: In the default "init-data" mode, we only avoid a
        // Representation if the key id was originally explicitely
        // blacklisted (and not e.g. if its key was just not present in
        // the license).
        //
        // This is to enforce v3.x.x retro-compatibility: we cannot
        // fallback from a Representation unless some RxPlayer option
        // documentating this behavior has been set.
        const { blacklisted } = compatibleSessionInfo.keyStatuses;
        isUndecipherable = areSomeKeyIdsContainedIn(
          initializationData.keyIds,
          blacklisted,
        );
      } else {
        // In any other mode, as soon as not all of this initialization
        // data's linked key ids are explicitely whitelisted, we can mark
        // the corresponding Representation as "not decipherable".
        // This is because we've no such retro-compatibility guarantee to
        // make there.
        const { whitelisted } = compatibleSessionInfo.keyStatuses;
        isUndecipherable = !areAllKeyIdsContainedIn(
          initializationData.keyIds,
          whitelisted,
        );
      }

      if (isUndecipherable) {
        if (initializationData.content === undefined) {
          log.error("DRM: Cannot forbid key id, the content is unknown.");
          return true;
        }
        log.info(
          "DRM: Current initialization data is linked to blacklisted keys. " +
            "Marking Representations as not decipherable",
        );
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
    } else {
      log.debug(
        "DRM: A session from a processed init data is not available " +
          "anymore. Re-processing it.",
      );
      this._currentSessions.splice(indexOf, 1);
    }
    return false;
  }

  /**
   * Remove the session corresponding to the initData provided, and close it.
   * It does nothing if no session was found for this initData.
   * @param {Object} initData : The initialization data corresponding to the session
   * that need to be removed
   * @param {Object} mediaKeysData : The media keys data
   */
  private removeSessionForInitData(
    initData: IProcessedProtectionData,
    mediaKeysData: IAttachedMediaKeysData,
  ) {
    const { stores } = mediaKeysData;
    /** Remove the session and close it from the loadedSessionStore */
    const entry = stores.loadedSessionsStore.reuse(initData);
    if (entry !== null) {
      stores.loadedSessionsStore
        .closeSession(entry.mediaKeySession)
        .catch(() =>
          log.error("DRM: Cannot close the session from the loaded session store"),
        );
    }

    /**
     * If set, a currently-used key session is already compatible to this
     * initialization data.
     */
    const compatibleSessionInfo = arrayFind(this._currentSessions, (x) =>
      x.record.isCompatibleWith(initData),
    );
    if (compatibleSessionInfo === undefined) {
      return;
    }
    /** Remove the session from the currentSessions */
    const indexOf = this._currentSessions.indexOf(compatibleSessionInfo);
    if (indexOf !== -1) {
      log.debug(
        "DRM: A session from a processed init is removed due to forceSessionRecreation policy.",
      );
      this._currentSessions.splice(indexOf, 1);
    }
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
  private _onFatalError(err: unknown): void {
    if (this._canceller.isUsed()) {
      return;
    }
    const formattedErr =
      err instanceof Error ? err : new OtherError("NONE", "Unknown decryption error");
    this.error = formattedErr;
    this._initDataQueue.length = 0;
    this._stateData = {
      state: ContentDecryptorState.Error,
      isMediaKeysAttached: undefined,
      isInitDataQueueLocked: undefined,
      data: null,
    };
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
  private _isStopped(): boolean {
    return (
      this._stateData.state === ContentDecryptorState.Disposed ||
      this._stateData.state === ContentDecryptorState.Error
    );
  }

  /**
   * Start processing the next initialization data of the `_initDataQueue` if it
   * isn't lock.
   */
  private _processCurrentInitDataQueue(): void {
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
  private _lockInitDataQueue(): void {
    if (this._stateData.isInitDataQueueLocked === false) {
      this._stateData.isInitDataQueueLocked = true;
    }
  }

  /**
   * Unlock `_initDataQueue` and start processing the first element.
   *
   * Should have no effect if the `_initDataQueue` was not locked.
   */
  private _unlockInitDataQueue(): void {
    if (this._stateData.isMediaKeysAttached !== MediaKeyAttachmentStatus.Attached) {
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
  mediaKeySystemAccess: MediaKeySystemAccess | ICustomMediaKeySystemAccess,
): boolean {
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
export function getMissingKeyIds(
  expectedKeyIds: Uint8Array[],
  actualKeyIds: Uint8Array[],
): Uint8Array[] {
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
export function getMissingKnownKeyIds(
  keySessionRecord: KeySessionRecord,
  newKeyIds: Uint8Array[],
): Uint8Array[] {
  const allKnownKeyIds = keySessionRecord.getAssociatedKeyIds();
  const missingKeyIds = getMissingKeyIds(allKnownKeyIds, newKeyIds);
  if (missingKeyIds.length > 0 && log.hasLevel("DEBUG")) {
    log.debug(
      "DRM: KeySessionRecord's keys missing in the license, blacklisting them",
      missingKeyIds.map((m) => bytesToHex(m)).join(", "),
    );
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
export function getMissingInitDataKeyIds(
  initializationData: IProcessedProtectionData,
  newKeyIds: Uint8Array[],
): Uint8Array[] {
  let missingKeyIds: Uint8Array[] = [];
  const { keyIds: expectedKeyIds } = initializationData;
  if (expectedKeyIds !== undefined) {
    missingKeyIds = getMissingKeyIds(expectedKeyIds, newKeyIds);
  }

  if (missingKeyIds.length > 0 && log.hasLevel("DEBUG")) {
    log.debug(
      "DRM: init data keys missing in the license, blacklisting them",
      missingKeyIds.map((m) => bytesToHex(m)).join(", "),
    );
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
function getKeyIdsLinkedToSession(
  initializationData: IProcessedProtectionData,
  keySessionRecord: KeySessionRecord,
  singleLicensePer: undefined | "init-data" | "content" | "periods",
  isCurrentLicense: boolean,
  usableKeyIds: Uint8Array[],
  unusableKeyIds: Uint8Array[],
): { whitelisted: Uint8Array[]; blacklisted: Uint8Array[] } {
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
    const missingInitDataKeyIds = getMissingInitDataKeyIds(
      initializationData,
      associatedKeyIds,
    );
    associatedKeyIds.push(...missingInitDataKeyIds);

    const { content } = initializationData;
    if (isCurrentLicense && content !== undefined) {
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
              const isFound = associatedKeyIds.some((k) =>
                areArraysOfNumbersEqual(k, kid),
              );
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
function mergeKeyIdSetIntoArray(set: Set<Uint8Array>, arr: Uint8Array[]) {
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
function addKeyIdsFromPeriod(set: Set<Uint8Array>, period: IPeriodMetadata) {
  const adaptationsByType = period.adaptations;
  const adaptations = objectValues(adaptationsByType).reduce<IAdaptationMetadata[]>(
    // Note: the second case cannot happen. TS is just being dumb here
    (acc, adaps) => (!isNullOrUndefined(adaps) ? acc.concat(adaps) : acc),
    [],
  );
  for (const adaptation of adaptations) {
    for (const representation of adaptation.representations) {
      if (
        representation.contentProtections !== undefined &&
        representation.contentProtections.keyIds !== undefined
      ) {
        for (const kidInf of representation.contentProtections.keyIds) {
          set.add(kidInf.keyId);
        }
      }
    }
  }
}

/** Possible states the ContentDecryptor is in and associated data for each one. */
type IContentDecryptorStateData =
  | IInitializingStateData
  | IWaitingForAttachmentStateData
  | IReadyForContentStateDataUnattached
  | IReadyForContentStateDataAttached
  | IDisposeStateData
  | IErrorStateData;

/** Skeleton that all variants of `IContentDecryptorStateData` use. */
interface IContentDecryptorStateBase<
  TStateName extends ContentDecryptorState,
  TIsQueueLocked extends boolean | undefined,
  TIsMediaKeyAttached extends MediaKeyAttachmentStatus | undefined,
  TData,
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

const enum MediaKeyAttachmentStatus {
  NotAttached,
  Pending,
  Attached,
}

/** ContentDecryptor's internal data when in the `Initializing` state. */
type IInitializingStateData = IContentDecryptorStateBase<
  ContentDecryptorState.Initializing,
  true, // isInitDataQueueLocked
  MediaKeyAttachmentStatus.NotAttached, // isMediaKeysAttached
  null // data
>;

/** ContentDecryptor's internal data when in the `WaitingForAttachment` state. */
type IWaitingForAttachmentStateData = IContentDecryptorStateBase<
  ContentDecryptorState.WaitingForAttachment,
  true, // isInitDataQueueLocked
  MediaKeyAttachmentStatus.NotAttached, // isMediaKeysAttached
  // data
  { mediaKeysInfo: IMediaKeysInfos; mediaElement: IMediaElement }
>;

/**
 * ContentDecryptor's internal data when in the `ReadyForContent` state before
 * it has attached the `MediaKeys` to the media element.
 */
type IReadyForContentStateDataUnattached = IContentDecryptorStateBase<
  ContentDecryptorState.ReadyForContent,
  true, // isInitDataQueueLocked
  MediaKeyAttachmentStatus.NotAttached | MediaKeyAttachmentStatus.Pending, // isMediaKeysAttached
  { mediaKeysInfo: IMediaKeysInfos; mediaElement: IMediaElement } // data
>;

/**
 * ContentDecryptor's internal data when in the `ReadyForContent` state once
 * it has attached the `MediaKeys` to the media element.
 */
type IReadyForContentStateDataAttached = IContentDecryptorStateBase<
  ContentDecryptorState.ReadyForContent,
  boolean, // isInitDataQueueLocked
  MediaKeyAttachmentStatus.Attached, // isMediaKeysAttached
  {
    /**
     * MediaKeys-related information linked to this instance of the
     * `ContentDecryptor`.
     * Set to `null` until it is known.
     * Should be always set when the `ContentDecryptor` has reached the
     * Initialized state (@see ContentDecryptorState).
     */
    mediaKeysData: IAttachedMediaKeysData;
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
  record: KeySessionRecord;

  /** Current keys' statuses linked that session. */
  keyStatuses: {
    /** Key ids linked to keys that are "usable". */
    whitelisted: Uint8Array[];
    /**
     * Key ids linked to keys that are not considered "usable".
     * Content linked to those keys are not decipherable and may thus be
     * fallbacked from.
     */
    blacklisted: Uint8Array[];
  };

  /** Source of the MediaKeySession linked to that record. */
  source: MediaKeySessionLoadingType;

  /**
   * If different than `null`, all initialization data compatible with this
   * processed initialization data has been blacklisted with this corresponding
   * error.
   */
  blacklistedSessionError: BlacklistedSessionError | null;
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
  mediaKeySystemAccess: MediaKeySystemAccess | ICustomMediaKeySystemAccess;
  /** The MediaKeys instance. */
  mediaKeys: MediaKeys | ICustomMediaKeys;
  stores: IMediaKeySessionStores;
  options: IKeySystemOption;
}
