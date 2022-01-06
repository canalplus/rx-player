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
  ICustomMediaKeySystemAccess,
} from "../../compat/";
import config from "../../config";
import {
  EncryptedMediaError,
  ICustomError,
  OtherError,
} from "../../errors";
import log from "../../log";
import areArraysOfNumbersEqual from "../../utils/are_arrays_of_numbers_equal";
import arrayIncludes from "../../utils/array_includes";
import { concat } from "../../utils/byte_parsing";
import EventEmitter from "../../utils/event_emitter";
import isNullOrUndefined from "../../utils/is_null_or_undefined";
import createSharedReference, {
  ISharedReference,
} from "../../utils/reference";
import TaskCanceller from "../../utils/task_canceller";
import attachMediaKeys from "./attach_media_keys";
import { ICleaningOldSessionDataPayload } from "./clean_old_loaded_sessions";
import cleanOldStoredPersistentInfo from "./clean_old_stored_persistent_info";
import getDrmSystemId from "./get_drm_system_id";
import { IMediaKeysInfos } from "./get_media_keys";
import getSession from "./get_session";
import initMediaKeys from "./init_media_keys";
import SessionEventsListener, {
  BlacklistedSessionError,
} from "./session_events_listener";
import setServerCertificate from "./set_server_certificate";
import {
  IAttachedMediaKeysData,
  IInitializationDataInfo,
  IKeySystemOption,
  IKeyUpdateValue,
} from "./types";
import InitDataStore from "./utils/init_data_store";

const { EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS,
        EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION } = config;

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
   * Keep track of all decryption keys handled by this instance of the
   * `ContentDecryptor`.
   * This allows to avoid creating multiple MediaKeySessions handling the same
   * decryption keys.
   */
  private _contentSessions : InitDataStore<IContentSessionInfo>;

  /**
   * Keep track of which initialization data have been blacklisted in the
   * current instance of the `ContentDecryptor`.
   * If the same initialization data is encountered again, we can directly emit
   * the same `BlacklistedSessionError`.
   */
  private _blacklistedInitData : InitDataStore<BlacklistedSessionError>;

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
    this._contentSessions = new InitDataStore<IContentSessionInfo>();
    this._blacklistedInitData = new InitDataStore<BlacklistedSessionError>();
    this._canceller = canceller;
    this._wasAttachCalled = false;
    this._stateData = { state: ContentDecryptorState.Initializing,
                        data: { initDataQueue: [] } };
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
          const prevInitDataQueue = this._stateData.data.initDataQueue;
          this._stateData = { state: ContentDecryptorState.WaitingForAttachment,
                              data: { initDataQueue: prevInitDataQueue,
                                      mediaKeysInfo,
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
      const currentInitDataQueue = this._stateData.data.initDataQueue;
      this._stateData = { state: ContentDecryptorState.ReadyForContent,
                          data: { isAttached: false,
                                  initDataQueue: currentInitDataQueue } };
      this.trigger("stateChange", this._stateData.state);
      if (this._isStopped()) {
        return ;
      }
    }

    log.debug("DRM: Attaching current MediaKeys");
    attachMediaKeys(mediaElement, stateToAttatch, this._canceller.signal)
      .then(async () => {
        const { serverCertificate } = options;

        if (!isNullOrUndefined(serverCertificate)) {
          const resSsc = await setServerCertificate(mediaKeys, serverCertificate);
          if (typeof resSsc !== "boolean") {
            this.trigger("warning", resSsc.value);
          }
        }

        if (this._isStopped()) {
          return;
        }

        const prevState = this._stateData.state;
        let initDataQueue : IInitializationDataInfo[];
        switch (prevState) {
          case ContentDecryptorState.Initializing:
          case ContentDecryptorState.WaitingForAttachment:
            initDataQueue = this._stateData.data.initDataQueue;
            break;
          case ContentDecryptorState.ReadyForContent:
            initDataQueue = this._stateData.data.isAttached ?
              [] :
              this._stateData.data.initDataQueue;
            break;
          default:
            initDataQueue = [];
        }

        this._stateData = { state: ContentDecryptorState.ReadyForContent,
                            data: { isAttached: true,
                                    mediaKeysData: mediaKeysInfo } };
        if (prevState !== ContentDecryptorState.ReadyForContent) {
          this.trigger("stateChange", ContentDecryptorState.ReadyForContent);
        }

        while (true) {
          // Side-effects might have provoked a stop/dispose
          if (this._isStopped()) {
            return;
          }
          const initData = initDataQueue.shift();
          if (initData === undefined) {
            return;
          }
          this.onInitializationData(initData);
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
    this._stateData = { state: ContentDecryptorState.Disposed, data: null };
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
    initializationData : IInitializationDataInfo
  ) : void {
    this._processInitializationData(initializationData)
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
    initializationData: IInitializationDataInfo
  ) : Promise<void> {
    if (this._stateData.state !== ContentDecryptorState.ReadyForContent) {
      if (this._stateData.state === ContentDecryptorState.Disposed ||
          this._stateData.state === ContentDecryptorState.Error)
      {
        throw new Error("ContentDecryptor either disposed or stopped.");
      }
      this._stateData.data.initDataQueue.push(initializationData);
      return ;
    } else if (!this._stateData.data.isAttached) {
      this._stateData.data.initDataQueue.push(initializationData);
      return ;
    }

    const mediaKeysData = this._stateData.data.mediaKeysData;
    const contentSessions = this._contentSessions;
    const { mediaKeySystemAccess, stores, options } = mediaKeysData;
    const blacklistError = this._blacklistedInitData.get(initializationData);

    if (blacklistError !== undefined) {
      if (initializationData.type === undefined) {
        log.error("DRM: The current session has already been blacklisted " +
                  "but the current content is not known. Throwing.");
        const { sessionError } = blacklistError;
        sessionError.fatal = true;
        throw sessionError;
      }
      log.warn("DRM: The current session has already been blacklisted. " +
               "Blacklisting content.");
      this.trigger("blacklistProtectionData", initializationData);
      return ;
    }

    const lastKeyUpdate = createSharedReference<IKeyUpdateValue | null>(null);

    // First, check that this initialization data is not already handled
    if (options.singleLicensePer === "content" && !contentSessions.isEmpty()) {
      const keyIds = initializationData.keyIds;
      if (keyIds === undefined) {
        log.warn("DRM: Initialization data linked to unknown key id, we'll " +
                 "not able to fallback from it.");
        return ;
      }

      const firstSession = contentSessions.getAll()[0];
      firstSession.lastKeyUpdate.onUpdate((val) => {
        if (val === null) {
          return;
        }
        const hasAllNeededKeyIds = keyIds.every(keyId => {
          for (let i = 0; i < val.whitelistedKeyIds.length; i++) {
            if (areArraysOfNumbersEqual(val.whitelistedKeyIds[i], keyId)) {
              return true;
            }
          }
        });

        if (!hasAllNeededKeyIds) {
          // Not all keys are available in the current session, blacklist those
          this.trigger("keyUpdate", { blacklistedKeyIDs: keyIds,
                                      whitelistedKeyIds: [] });
          return;
        }

        // Already handled by the current session.
        // Move corresponding session on top of the cache if it exists
        const { loadedSessionsStore } = mediaKeysData.stores;
        loadedSessionsStore.reuse(firstSession.initializationData);
        return ;
      }, { clearSignal: this._canceller.signal, emitCurrentValue: true });

      return ;
    } else if (!contentSessions.storeIfNone(initializationData, { initializationData,
                                                                  lastKeyUpdate })) {
      log.debug("DRM: Init data already received. Skipping it.");
      return ;
    }

    let wantedSessionType : MediaKeySessionType;
    if (options.persistentLicense !== true) {
      wantedSessionType = "temporary";
    } else if (!canCreatePersistentSession(mediaKeySystemAccess)) {
      log.warn("DRM: Cannot create \"persistent-license\" session: not supported");
      wantedSessionType = "temporary";
    } else {
      wantedSessionType = "persistent-license";
    }

    const maxSessionCacheSize = typeof options.maxSessionCacheSize === "number" ?
      options.maxSessionCacheSize :
      EME_DEFAULT_MAX_SIMULTANEOUS_MEDIA_KEY_SESSIONS;

    const sessionRes = await getSession(initializationData,
                                        stores,
                                        wantedSessionType,
                                        maxSessionCacheSize,
                                        onCleaningSession,
                                        this._canceller.signal);
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

          // We want to add the current key ids in the blacklist if it is
          // not already there.
          //
          // We only do that when `singleLicensePer` is set to something
          // else than the default `"init-data"` because this logic:
          //   1. might result in a quality fallback, which is a v3.x.x
          //      breaking change if some APIs (like `singleLicensePer`)
          //      aren't used.
          //   2. Rely on the DRM spec regarding key statuses being well
          //      implemented on all supported devices, which we're not
          //      sure yet. Because in any other `singleLicensePer`, we
          //      need a good implementation anyway, it doesn't matter
          //      there.
          const expectedKeyIds = initializationData.keyIds;
          if (expectedKeyIds !== undefined &&
              options.singleLicensePer !== "init-data")
          {
            const missingKeyIds = expectedKeyIds.filter(expected => {
              return (
                !evt.value.whitelistedKeyIds.some(whitelisted =>
                  areArraysOfNumbersEqual(whitelisted, expected)) &&
                !evt.value.blacklistedKeyIDs.some(blacklisted =>
                  areArraysOfNumbersEqual(blacklisted, expected))
              );
            });
            if (missingKeyIds.length > 0) {
              evt.value.blacklistedKeyIDs.push(...missingKeyIds) ;
            }
          }

          lastKeyUpdate.setValue(evt.value);

          if ((evt.value.whitelistedKeyIds.length === 0 &&
               evt.value.blacklistedKeyIDs.length === 0) ||
              sessionType === "temporary" ||
              stores.persistentSessionsStore === null ||
              isSessionPersisted)
          {
            this.trigger("keyUpdate", evt.value);
            return;
          }
          const { persistentSessionsStore } = stores;
          cleanOldStoredPersistentInfo(
            persistentSessionsStore,
            EME_MAX_STORED_PERSISTENT_SESSION_INFORMATION - 1);
          persistentSessionsStore.add(initializationData, mediaKeySession);
          isSessionPersisted = true;

          this.trigger("keyUpdate", evt.value);
          return;
        },
        error: (err) => {
          if (!(err instanceof BlacklistedSessionError)) {
            this._onFatalError(err);
            return ;
          }

          this._blacklistedInitData.store(initializationData, err);

          const { sessionError } = err;
          if (initializationData.type === undefined) {
            log.error("DRM: Current session blacklisted and content not known. " +
                      "Throwing.");
            sessionError.fatal = true;
            throw sessionError;
          }

          log.warn("DRM: Current session blacklisted. Blacklisting content.");
          this.trigger("warning", sessionError);

          // The previous trigger might have lead to a disposal of the `ContentDecryptor`.
          if (this._stateData.state !== ContentDecryptorState.Error &&
              this._stateData.state !== ContentDecryptorState.Disposed)
          {
            this.trigger("blacklistProtectionData", initializationData);
          }
        },
      });
    this._canceller.signal.register(() => {
      sub.unsubscribe();
    });

    if (sessionRes.type === "created-session") {
      // `generateKeyRequest` awaits a single Uint8Array containing all
      // initialization data.
      const concatInitData = concat(...initializationData.values.map(i => i.data));
      try {
        await generateKeyRequest(mediaKeySession,
                                 initializationData.type,
                                 concatInitData);
      } catch (error) {
        throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR",
                                      error instanceof Error ? error.toString() :
                                      "Unknown error");
      }
    }

    return PPromise.resolve();

    function onCleaningSession(evt : ICleaningOldSessionDataPayload) {
      contentSessions.remove(evt.initializationData);
    }
  }

  private _onFatalError(err : unknown) {
    if (this._canceller.isUsed) {
      return;
    }
    const formattedErr = err instanceof Error ?
      err :
      new OtherError("NONE", "Unknown encryption error");
    this.error = formattedErr;
    this._stateData = { state: ContentDecryptorState.Error, data: null };
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
   * Event emitted when we have an update on whitelisted keys (which can be
   * used) and blacklisted keys (which cannot be used right now).
   */
  keyUpdate : IKeyUpdateValue;

  /**
   * Event Emitted when specific "protection data" cannot be deciphered and is
   * thus blacklisted.
   *
   * The linked value is the initialization data linked to the content that
   * cannot be deciphered.
   */
  blacklistProtectionData: IInitializationDataInfo;

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

/** ContentDecryptor's internal data when in the `Initializing` state. */
interface IInitializingStateData {
  state: ContentDecryptorState.Initializing;
  data: {
    /**
     * This queue stores initialization data communicated while initializing so
     * it can be processed when the initialization is done.
     * This same queue is used while in the `Initializing` state, the
     * `WaitingForAttachment` state and the `ReadyForContent` until the
     * `MediaKeys` instance is actually attached to the HTMLMediaElement.
     */
    initDataQueue : IInitializationDataInfo[];
  };
}

/** ContentDecryptor's internal data when in the `WaitingForAttachment` state. */
interface IWaitingForAttachmentStateData {
  state: ContentDecryptorState.WaitingForAttachment;
  data: {
    /**
     * This queue stores initialization data communicated while initializing so
     * it can be processed when the initialization is done.
     * This same queue is used while in the `Initializing` state, the
     * `WaitingForAttachment` state and the `ReadyForContent` until the
     * `MediaKeys` instance is actually attached to the HTMLMediaElement.
     */
    initDataQueue : IInitializationDataInfo[];
    mediaKeysInfo : IMediaKeysInfos;
    mediaElement : HTMLMediaElement;
  };
}

/**
 * ContentDecryptor's internal data when in the `ReadyForContent` state before
 * it has attached the `MediaKeys` to the media element.
 */
interface IReadyForContentStateDataUnattached {
  state: ContentDecryptorState.ReadyForContent;
  data: {
    isAttached: false;
    /**
     * This queue stores initialization data communicated while initializing so
     * it can be processed when the initialization is done.
     * This same queue is used while in the `Initializing` state, the
     * `WaitingForAttachment` state and the `ReadyForContent` until the
     * `MediaKeys` instance is actually attached to the HTMLMediaElement.
     */
    initDataQueue : IInitializationDataInfo[];
  };
}

/**
 * ContentDecryptor's internal data when in the `ReadyForContent` state once
 * it has attached the `MediaKeys` to the media element.
 */
interface IReadyForContentStateDataAttached {
  state: ContentDecryptorState.ReadyForContent;
  data: {
    isAttached: true;
    /**
     * MediaKeys-related information linked to this instance of the
     * `ContentDecryptor`.
     * Set to `null` until it is known.
     * Should be always set when the `ContentDecryptor` has reached the
     * Initialized state (@see ContentDecryptorState).
     */
    mediaKeysData : IAttachedMediaKeysData;
  };
}

/** ContentDecryptor's internal data when in the `ReadyForContent` state. */
interface IDisposeStateData {
  state: ContentDecryptorState.Disposed;
  data: null;
}

/** ContentDecryptor's internal data when in the `Error` state. */
interface IErrorStateData {
  state: ContentDecryptorState.Error;
  data: null;
}

interface IContentSessionInfo {
  /** Initialization data which triggered the creation of this session. */
  initializationData : IInitializationDataInfo;
  /** Last key update event received for that session. */
  lastKeyUpdate : ISharedReference<IKeyUpdateValue | null>;
}
