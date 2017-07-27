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

import objectAssign from "object-assign";
import { Observable } from "rxjs/Observable";
import { EmptyObservable } from "rxjs/observable/EmptyObservable";
import { DeferObservable } from "rxjs/observable/DeferObservable";
import { combineLatest } from "rxjs/observable/combineLatest";
import { merge } from "rxjs/observable/merge";
import { TimeoutError } from "rxjs/util/TimeoutError";

import log from "../../utils/log";
import assert from "../../utils/assert";
import { tryCatch, castToObservable } from "../../utils/rx-utils";
import { retryWithBackoff } from "../../utils/retry";

import {
  KeySystemAccess,
  requestMediaKeySystemAccess,
  setMediaKeys,
  shouldRenewMediaKeys,
} from "../../compat";

import {
  onEncrypted,
  onKeyMessage,
  onKeyError,
  onKeyStatusesChange,
} from "../../compat/events.js";

import {
  ErrorTypes,
  ErrorCodes,
  EncryptedMediaError,
} from "../../errors";

const empty = EmptyObservable.create;
const defer = DeferObservable.create;

const SYSTEMS = {
  "clearkey":  ["webkit-org.w3.clearkey", "org.w3.clearkey"],
  "widevine":  ["com.widevine.alpha"],
  "playready": ["com.microsoft.playready", "com.chromecast.playready", "com.youtube.playready"],
};

// List of all eme security robustnesses from highest to lowest
const DEFAULT_ROBUSTNESSES = [
  "HW_SECURE_ALL",
  "HW_SECURE_DECODE",
  "HW_SECURE_CRYPTO",
  "SW_SECURE_DECODE",
  "SW_SECURE_CRYPTO",
];

const KEY_STATUS_ERRORS = {
  "expired": true,
  "internal-error": true,
   // "released",
   // "output-restricted",
   // "output-downscaled",
   // "status-pending",
};

function hashBuffer(buffer) {
  let hash = 0;
  let char;
  for (let i = 0; i < buffer.length; i++) {
    char = buffer[i];
    hash = ((hash <<  5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

function hashInitData(initData) {
  if (typeof initData == "number") {
    return initData;
  } else {
    return hashBuffer(initData);
  }
}

class SessionSet {
  constructor() {
    this._entries = [];
  }

  find(func) {
    for (let i = 0; i < this._entries.length; i++) {
      if (func(this._entries[i]) === true) {
        return this._entries[i];
      }
    }
    return null;
  }
}

/**
 * Set maintaining a representation of all currently loaded
 * MediaKeySessions. This set allow to reuse sessions without re-
 * negotiating a license exchange if the key is already used in a
 * loaded session.
 */
class InMemorySessionsSet extends SessionSet {

  getFirst() {
    if (this._entries.length > 0) {
      return this._entries[0].session;
    }
  }

  find(func) {
    for (let i = 0; i < this._entries.length; i++) {
      if (func(this._entries[i]) === true) {
        return this._entries[i];
      }
    }
    return null;
  }

  get(initData) {
    initData = hashInitData(initData);
    const entry = this.find((e) => e.initData === initData);
    if (entry) {
      return entry.session;
    } else {
      return null;
    }
  }

  add(initData, session, sessionEvents) {
    initData = hashInitData(initData);
    const currentSession = this.get(initData);
    if (currentSession) {
      this.deleteAndClose(currentSession);
    }

    const eventSubscription = sessionEvents.connect();
    const entry = { session, initData, eventSubscription };
    log.debug("eme-mem-store: add session", entry);
    this._entries.push(entry);
  }

  deleteById(sessionId) {
    const entry = this.find((e) => e.session.sessionId === sessionId);
    if (entry) {
      return this.delete(entry.session);
    } else {
      return null;
    }
  }

  delete(session_) {
    const entry = this.find((e) => e.session === session_);
    if (!entry) {
      return null;
    }

    const { session, eventSubscription } = entry;
    log.debug("eme-mem-store: delete session", entry);
    const idx = this._entries.indexOf(entry);
    this._entries.splice(idx, 1);
    eventSubscription.unsubscribe();
    return session;
  }

  deleteAndClose(session_) {
    const session = this.delete(session_);
    if (session) {
      log.debug("eme-mem-store: close session", session);
      return castToObservable(session.close())
        .catch(() => Observable.of(null));
    } else {
      return Observable.of(null);
    }
  }

  dispose() {
    const disposed = this._entries.map((e) => this.deleteAndClose(e.session));
    this._entries = [];
    return merge.apply(null, disposed);
  }
}

/**
 * Set representing persisted licenses. Depends on a simple local-
 * storage implementation with a `save`/`load` synchronous interface
 * to persist informations on persisted sessions.
 *
 * This set is used only for a cdm/keysystem with license persistency
 * supported.
 */
class PersistedSessionsSet extends SessionSet {
  constructor(storage) {
    super();
    this.setStorage(storage);
  }

  setStorage(storage) {
    if (this._storage === storage) {
      return;
    }

    assert(
      storage,
      "no licenseStorage given for keySystem with persistentLicense"
    );

    assert.iface(
      storage,
      "licenseStorage", { save: "function", load: "function" }
    );

    this._storage = storage;
    try {
      this._entries = this._storage.load();
      assert(Array.isArray(this._entries));
    } catch(e) {
      log.warn("eme-persitent-store: could not get entries from license storage", e);
      this.dispose();
    }
  }

  get(initData) {
    initData = hashInitData(initData);
    const entry = this.find((e) => e.initData === initData);
    return entry || null;
  }

  add(initData, session) {
    const sessionId = session && session.sessionId;
    if (!sessionId) {
      return;
    }

    initData = hashInitData(initData);
    const currentEntry = this.get(initData);
    if (currentEntry && currentEntry.sessionId === sessionId) {
      return;
    }

    if (currentEntry) {
      this.delete(initData);
    }

    log.info("eme-persitent-store: add new session", sessionId, session);
    this._entries.push({ sessionId, initData });
    this._save();
  }

  delete(initData) {
    initData = hashInitData(initData);

    const entry = this.find((e) => e.initData === initData);
    if (entry) {
      log.warn("eme-persitent-store: delete session from store", entry);

      const idx = this._entries.indexOf(entry);
      this._entries.splice(idx, 1);
      this._save();
    }
  }

  dispose() {
    this._entries = [];
    this._save();
  }

  _save() {
    try {
      this._storage.save(this._entries);
    } catch(e) {
      log.warn("eme-persitent-store: could not save licenses in localStorage");
    }
  }
}

const emptyStorage = {
  load() { return []; },
  save() {},
};
const $storedSessions = new PersistedSessionsSet(emptyStorage);
const $loadedSessions = new InMemorySessionsSet();

if (__DEV__) {
  window.$loadedSessions = $loadedSessions;
  window.$storedSessions = $storedSessions;
}

// Persisted singleton instance of MediaKeys. We do not allow multiple
// CDM instances.
let $mediaKeys;
let $mediaKeySystemConfiguration;
let $keySystem;
let $videoElement;

function createMessage(name, session, options) {
  return { type: "eme", value: objectAssign({ name, session }, options) };
}

function getCachedKeySystemAccess(keySystems) {
  // NOTE(pierre): alwaysRenew flag is used for IE11 which require the
  // creation of a new MediaKeys instance for each session creation
  if (!$keySystem || !$mediaKeys || shouldRenewMediaKeys()) {
    return null;
  }

  const configuration = $mediaKeySystemConfiguration;
  const foundKeySystem = keySystems.filter((ks) => {
    if (ks.type !== $keySystem.type) {
      return false;
    }

    if (ks.persistentLicense &&
        configuration.persistentState != "required") {
      return false;
    }

    if (ks.distinctiveIdentifierRequired &&
        configuration.distinctiveIdentifier != "required") {
      return false;
    }

    return true;
  })[0];

  if (foundKeySystem) {
    return {
      keySystem: foundKeySystem,
      keySystemAccess: new KeySystemAccess(
        $keySystem,
        $mediaKeys,
        $mediaKeySystemConfiguration),
    };
  }
  else {
    return null;
  }
}

/**
 * Build configuration for the requestMediaKeySystemAccess EME API, based
 * on the current keySystem object.
 * @param {Object} keySystem
 * @param {Boolean} [keySystem.persistentLicense]
 * @param {Boolean} [keySystem.persistentStateRequired]
 * @param {Boolean} [keySystem.distinctiveIdentifierRequired]
 * @returns {Array.<Object>} - Configuration to give to the
 * requestMediaKeySystemAccess API.
 */
function buildKeySystemConfigurations(keySystem) {
  const sessionTypes = ["temporary"];
  let persistentState = "optional";
  let distinctiveIdentifier = "optional";

  if (keySystem.persistentLicense) {
    persistentState = "required";
    sessionTypes.push("persistent-license");
  }

  if (keySystem.persistentStateRequired) {
    persistentState = "required";
  }

  if (keySystem.distinctiveIdentifierRequired) {
    distinctiveIdentifier = "required";
  }

  const videoRobustnesses = keySystem.videoRobustnesses || DEFAULT_ROBUSTNESSES;
  const audioRobustnesses = keySystem.audioRobustnesses || DEFAULT_ROBUSTNESSES;

  // From the W3 EME spec, we have to provide videoCapabilities and
  // audioCapabilities.
  // These capabilities must specify a codec (even though your stream can use
  // a completely different codec afterward).
  // It is also strongly recommended to specify the required security
  // robustness. As we do not want to forbide any security level, we specify
  // every existing security level from highest to lowest so that the best
  // security level is selected.
  // More details here:
  // https://storage.googleapis.com/wvdocs/Chrome_EME_Changes_and_Best_Practices.pdf
  // https://www.w3.org/TR/encrypted-media/#get-supported-configuration-and-consent
  const videoCapabilities = videoRobustnesses.map(robustness => ({
    contentType: "video/mp4;codecs=\"avc1.4d401e\"", // standard mp4 codec
    robustness,
  }));
  const audioCapabilities = audioRobustnesses.map(robustness => ({
    contentType: "audio/mp4;codecs=\"mp4a.40.2\"", // standard mp4 codec
    robustness,
  }));

  return [{
    initDataTypes: ["cenc"],
    videoCapabilities,
    audioCapabilities,
    distinctiveIdentifier,
    persistentState,
    sessionTypes,
  }, {
    // add another with no {audio,video}Capabilities for some legacy browsers.
    // As of today's spec, this should return NotSupported but the first
    // candidate configuration should be good, so whe should have no downside
    // doing that.
    initDataTypes: ["cenc"],
    videoCapabilities: undefined,
    audioCapabilities: undefined,
    distinctiveIdentifier,
    persistentState,
    sessionTypes,
  }];
}

/**
 * Try to find a compatible key system from the keySystems array given.
 *
 * Returns an Observable which, when subscribed to, will request a
 * MediaKeySystemAccess based on the various keySystems provided. This
 * Observable will:
 *   - emit the MediaKeySystemAccess and the keySystems as an object, when
 *     found. The object is under this form:
 *     {
 *       keySystemAccess {MediaKeySystemAccess}
 *       keySystem {Object}
 *     }
 *   - complete immediately after emitting.
 *   - throw if no  compatible key system has been found.
 *
 * @param {Array.<Object>} keySystems - The keySystems you want to test.
 * @returns {Observable}
 */
function findCompatibleKeySystem(keySystems) {
  // Fast way to find a compatible keySystem if the currently loaded
  // one as exactly the same compatibility options.
  const cachedKeySystemAccess = getCachedKeySystemAccess(keySystems);
  if (cachedKeySystemAccess) {
    log.debug("eme: found compatible keySystem quickly", cachedKeySystemAccess);
    return Observable.of(cachedKeySystemAccess);
  }

  /**
   * Array of set keySystems for this content.
   * Each item of this array is an object containing two keys:
   *   - keyType {string}: keySystem type
   *   - keySystem {Object}: the original keySystem object
   * @type {Array.<Object>}
   */
  const keySystemsType = keySystems.reduce(
    (arr, keySystem) =>
      arr.concat(
        (SYSTEMS[keySystem.type] || [])
          .map((keyType) => ({ keyType, keySystem }))
      )
    , []);

  return Observable.create((obs) => {
    let disposed = false;
    let sub = null;

    /**
     * Test the key system as defined in keySystemsType[index].
     * @param {Number} index
     */
    function testKeySystem(index) {
      // completely quit the loop if unsubscribed
      if (disposed) {
        return;
      }

      // if we iterated over the whole keySystemsType Array, quit on error
      if (index >= keySystemsType.length) {
        obs.error(new EncryptedMediaError("INCOMPATIBLE_KEYSYSTEMS", null, true));
        return;
      }

      const { keyType, keySystem } = keySystemsType[index];
      const keySystemConfigurations =
        buildKeySystemConfigurations(keySystem);

      log.debug(
        `eme: request keysystem access ${keyType},` +
        `${index+1} of ${keySystemsType.length}`,
        keySystemConfigurations
      );

      sub = requestMediaKeySystemAccess(keyType, keySystemConfigurations)
        .subscribe(
          (keySystemAccess) => {
            log.info("eme: found compatible keysystem", keyType, keySystemConfigurations);
            obs.next({ keySystem, keySystemAccess });
            obs.complete();
          },
          () => {
            log.debug("eme: rejected access to keysystem", keyType, keySystemConfigurations);
            sub = null;
            testKeySystem(index + 1);
          }
        );
    }

    testKeySystem(0);

    return () => {
      disposed = true;
      if (sub) {
        sub.unsubscribe();
      }
    };
  });
}

/**
 * Call the createMediaKeys API and cast it to an observable.
 * @param {MediaKeySystemAccess} keySystemAccess
 * @returns {Observable}
 */
function createMediaKeysObs(keySystemAccess) {
  // (keySystemAccess should return a promise)
  return castToObservable(keySystemAccess.createMediaKeys());
}

/**
 * Set the MediaKeys object on the videoElement.
 * @param {MediaKeys} mediaKeys
 * @param {Object} mksConfig - MediaKeySystemConfiguration used
 * @param {HTMLMediaElement} video
 * @param {Object} keySystem
 * @returns {Observable}
 */
function setMediaKeysObs(mediaKeys, mksConfig, video, keySystem) {
  const oldVideoElement = $videoElement;
  const oldMediaKeys = $mediaKeys;

  $mediaKeys = mediaKeys;
  $mediaKeySystemConfiguration = mksConfig;
  $keySystem = keySystem;
  $videoElement = video;

  if (video.mediaKeys === mediaKeys) {
    return Observable.of(mediaKeys);
  }

  if (oldMediaKeys && oldMediaKeys !== $mediaKeys) {
    // if we change our mediaKeys singleton, we need to dispose all existing
    // sessions linked to the previous one.
    $loadedSessions.dispose();
  }

  let mediaKeysSetter;
  if ((oldVideoElement && oldVideoElement !== $videoElement)) {
    log.debug("eme: unlink old video element and set mediakeys");
    mediaKeysSetter = setMediaKeys(oldVideoElement, null)
      .concat(setMediaKeys($videoElement, mediaKeys));
  }
  else {
    log.debug("eme: set mediakeys");
    mediaKeysSetter = setMediaKeys($videoElement, mediaKeys);
  }

  return mediaKeysSetter.mapTo(mediaKeys);
}

/**
 * Create Key Session and link MediaKeySession events to the right events
 * handlers.
 * @param {MediaKeys} mediaKeys
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {Object} keySystem
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createSession(
  mediaKeys,
  sessionType,
  keySystem,
  initData,
  errorStream
) {
  log.debug(`eme: create a new ${sessionType} session`);
  const session = mediaKeys.createSession(sessionType);
  const sessionEvents = sessionEventsHandler(session, keySystem, errorStream)
    .finally(() => {
      $loadedSessions.deleteAndClose(session);
      $storedSessions.delete(initData);
    })
    .publish();

  return { session, sessionEvents };
}

/**
 * @param {MediaKeys} mediaKeys
 * @param {Object} keySystem
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {string} initDataType
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createSessionAndKeyRequest(
  mediaKeys,
  keySystem,
  sessionType,
  initDataType,
  initData,
  errorStream
) {
  const { session, sessionEvents } = createSession(mediaKeys, sessionType,
                                                   keySystem, initData, errorStream);

  $loadedSessions.add(initData, session, sessionEvents);

  log.debug("eme: generate request", initDataType, initData);

  const generateRequest = castToObservable(
    session.generateRequest(initDataType, initData)
  )
    .catch((error) => {
      throw new EncryptedMediaError("KEY_GENERATE_REQUEST_ERROR", error, false);
    })
    .do(() => {
      if (sessionType == "persistent-license") {
        $storedSessions.add(initData, session);
      }
    })
    .mapTo(createMessage("generated-request", session, { initData, initDataType }));

  return merge(sessionEvents, generateRequest);
}

/**
 * @param {MediaKeys} mediaKeys
 * @param {Object} keySystem
 * @param {string} sessionType - Either "persistent-license" or "temporary"
 * @param {string} initDataType
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createSessionAndKeyRequestWithRetry(
  mediaKeys,
  keySystem,
  sessionType,
  initDataType,
  initData,
  errorStream
) {
  return createSessionAndKeyRequest(
    mediaKeys,
    keySystem,
    sessionType,
    initDataType,
    initData,
    errorStream
  )
    .catch((error) => {
      if (error.code !== ErrorCodes.KEY_GENERATE_REQUEST_ERROR) {
        throw error;
      }

      const firstLoadedSession = $loadedSessions.getFirst();
      if (!firstLoadedSession) {
        throw error;
      }

      log.warn("eme: could not create a new session, " +
               "retry after closing a currently loaded session",
               error);

      return $loadedSessions.deleteAndClose(firstLoadedSession)
        .mergeMap(() =>
          createSessionAndKeyRequest(
            mediaKeys,
            keySystem,
            sessionType,
            initDataType,
            initData,
            errorStream
          )
        );
    });
}

function createPersistentSessionAndLoad(mediaKeys,
                                         keySystem,
                                         storedSessionId,
                                         initDataType,
                                         initData,
                                         errorStream) {
  log.debug("eme: load persisted session", storedSessionId);

  const sessionType = "persistent-license";
  const { session, sessionEvents } = createSession(mediaKeys, sessionType,
                                                   keySystem, initData, errorStream);

  return castToObservable(
    session.load(storedSessionId)
  )
    .catch(() => Observable.of(false))
    .mergeMap((success) => {
      if (success) {
        $loadedSessions.add(initData, session, sessionEvents);
        $storedSessions.add(initData, session);
        return sessionEvents.startWith(
          createMessage("loaded-session", session, { storedSessionId })
        );
      } else {
        log.warn(
          "eme: no data stored for the loaded session, do fallback",
          storedSessionId
        );

        $loadedSessions.deleteById(storedSessionId);
        $storedSessions.delete(initData);

        if (session.sessionId) {
          session.remove();
        }

        return createSessionAndKeyRequestWithRetry(
          mediaKeys,
          keySystem,
          sessionType,
          initDataType,
          initData,
          errorStream
        ).startWith(
          createMessage("loaded-session-failed", session, { storedSessionId })
        );
      }
    });
}

/**
 * @param {MediaKeys} mediaKeys
 * @param {MediaKeySystemConfiguration} mksConfig
 * @param {Object} keySystem
 * @param {string} initDataType
 * @param {UInt8Array} initData
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function manageSessionCreation(
  mediaKeys,
  mksConfig,
  keySystem,
  initDataType,
  initData,
  errorStream
) {
  // reuse currently loaded sessions without making a new key
  // request
  const loadedSession = $loadedSessions.get(initData);
  if (loadedSession && loadedSession.sessionId) {
    log.debug("eme: reuse loaded session", loadedSession.sessionId);
    return Observable.of(createMessage("reuse-session", loadedSession));
  }

  const sessionTypes = mksConfig.sessionTypes;
  const persistentLicenseSupported = (
    sessionTypes &&
    sessionTypes.indexOf("persistent-license") >= 0
  );

  const sessionType = persistentLicenseSupported && keySystem.persistentLicense
    ? "persistent-license"
    : "temporary";

  if (persistentLicenseSupported && keySystem.persistentLicense) {
    const storedEntry = $storedSessions.get(initData);

    // if a persisted session exists in the store associated to this
    // initData, we reuse it without a new license request through
    // the `load` method.
    if (storedEntry) {
      return createPersistentSessionAndLoad(
        mediaKeys,
        keySystem,
        storedEntry.sessionId,
        initDataType,
        initData,
        errorStream);
    }
  }

  // we have a fresh session without persisted informations and need
  // to make a new key request that we will associate to this
  // session
  return createSessionAndKeyRequestWithRetry(
    mediaKeys,
    keySystem,
    sessionType,
    initDataType,
    initData,
    errorStream
  );
}

/*
 * listen to "message" events from session containing a challenge
 * blob and map them to licenses using the getLicense method from
 * selected keySystem.
 * @param {MediaKeySession} session
 * @param {Object} keySystem
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function sessionEventsHandler(session, keySystem, errorStream) {
  log.debug("eme: handle message events", session);
  let sessionId;

  function licenseErrorSelector(error, fatal) {
    if (error.type === ErrorTypes.ENCRYPTED_MEDIA_ERROR) {
      error.fatal = fatal;
      return error;
    } else {
      return new EncryptedMediaError("KEY_LOAD_ERROR", error, fatal);
    }
  }

  const getLicenseRetryOptions = {
    totalRetry: 2,
    retryDelay: 200,
    errorSelector: (error) => licenseErrorSelector(error, true),
    onRetry: (error) => errorStream.next(licenseErrorSelector(error, false)),
  };

  const keyErrors = onKeyError(session).map((error) => {
    throw new EncryptedMediaError("KEY_ERROR", error, true);
  });

  const keyStatusesChanges = onKeyStatusesChange(session)
    .mergeMap((keyStatusesEvent) => {
      sessionId = keyStatusesEvent.sessionId;
      log.debug(
        "eme: keystatuseschange event",
        sessionId,
        session,
        keyStatusesEvent
      );

      // find out possible errors associated with this event
      session.keyStatuses.forEach((keyId, keyStatus) => {
        // TODO: remove this hack present because the order of the
        // arguments has changed in spec and is not the same between
        // Edge and Chrome.
        const reason = KEY_STATUS_ERRORS[keyStatus] || KEY_STATUS_ERRORS[keyId];
        if (reason) {
          throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", keyStatus, true);
        }
      });

      // otherwise use the keysystem handler if disponible
      if (!keySystem.onKeyStatusesChange) {
        log.info("eme: keystatuseschange event not handled");
        return empty();
      }

      const license = tryCatch(() =>
        castToObservable(keySystem.onKeyStatusesChange(keyStatusesEvent, session)));

      return license.catch((error) => {
        throw new EncryptedMediaError("KEY_STATUS_CHANGE_ERROR", error, true);
      });
    });

  const keyMessages = onKeyMessage(session)
    .mergeMap((messageEvent) => {
      sessionId = messageEvent.sessionId;

      const message = new Uint8Array(messageEvent.message);
      const messageType = messageEvent.messageType || "license-request";

      log.debug(
        `eme: event message type ${messageType}`,
        session,
        messageEvent
      );

      const getLicense = defer(() => {
        return castToObservable(keySystem.getLicense(message, messageType))
          .timeout(10 * 1000)
          .catch(error => {
            if (error instanceof TimeoutError) {
              throw new EncryptedMediaError("KEY_LOAD_TIMEOUT", null, false);
            } else {
              throw error;
            }
          });
      });

      return retryWithBackoff(getLicense, getLicenseRetryOptions);
    });

  const sessionUpdates = merge(keyMessages, keyStatusesChanges)
    .concatMap((res) => {
      log.debug("eme: update session", sessionId, res);

      return castToObservable(
        session.update(res, sessionId)
      )
        .catch((error) => {
          throw new EncryptedMediaError("KEY_UPDATE_ERROR", error, true);
        })
        .mapTo(createMessage("session-update", session, { updatedWith: res }));
    });

  const sessionEvents = merge(sessionUpdates, keyErrors);
  if (session.closed) {
    return sessionEvents.takeUntil(castToObservable(session.closed));
  } else {
    return sessionEvents;
  }
}

/**
 * Call the setServerCertificate API with the given certificate.
 * Complete when worked, throw when failed.
 *
 * TODO Manage success?
 * From the spec:
 *   - setServerCertificate resolves with true if everything worked
 *   - it resolves with false if the CDM does not support server
 *     certificates.
 *
 * @param {MediaKeys} mediaKeys
 * @param {ArrayBuffer} serverCertificate
 * @returns {Observable}
 */
function setServerCertificate(mediaKeys, serverCertificate) {
  return castToObservable(
    mediaKeys.setServerCertificate(serverCertificate)
  )
    .ignoreElements()
    .catch((error) => {
      throw new
        EncryptedMediaError("LICENSE_SERVER_CERTIFICATE_ERROR", error, true);
    });
}

/**
 * Call the setCertificate API. If it fails just emit the error through the
 * errorStream and complete.
 * @param {MediaKeys} mediaKeys
 * @param {ArrayBuffer} serverCertificate
 * @returns {Observable}
 */
function trySettingServerCertificate(
  mediaKeys,
  serverCertificate,
  errorStream
) {
  return setServerCertificate(mediaKeys, serverCertificate)
    .catch(error => {
      error.fatal = false;
      errorStream.next(error);
      return Observable.empty();
    });
}

/**
 * EME abstraction and event handler used to communicate with the Content-
 * Description-Module (CDM).
 *
 * The communication with backend key-servers is not handled directly by this
 * module but through the given "KeySystems".
 *
 * A system has to expose the given interface:
 * interface KeySystem {
 *   readonly attribute string type;
 *
 *   Promise<AB> getLicense((AB) challenge);
 *   AB extractInitData(AB);
 * }
 * with AB = ArrayBuffer or ArrayBufferView
 *
 * The `extraInitData` method is not mandatory and used to pre-process the
 * initData vector injected into the CDM. The `getLicense` method is used to
 * serve the license encapsulated in a promise to support asynchronous license
 * fetching. The challenge buffer sent by the CDM is directly passed as first
 * argument of this method.
 *
 * The EME handler can be given one or multiple systems and will choose the
 * appropriate one supported by the user's browser.
 * @param {HTMLMediaElement} video
 * @param {Object} keySystems
 * @param {Subject} errorStream
 * @returns {Observable}
 */
function createEME(video, keySystems, errorStream) {
  if (__DEV__) {
    keySystems.forEach((ks) => assert.iface(ks, "keySystem", {
      getLicense: "function",
      type: "string",
    }));
  }

  /**
   * Function triggered when both:
   *   - the ``encrypted`` event has been received.
   *   - a compatible key system has been found.
   *
   * @param {MediaEncryptedEvent} encryptedEvent
   * @param {Object} compatibleKeySystem
   * @param {MediaKeySystemAccess} compatibleKeySystem.keySystemAccess
   * @param {Object} compatibleKeySystem.keySystem
   * @returns {Observable}
   */
  function handleEncryptedEvents(encryptedEvent, { keySystem, keySystemAccess }) {
    if (keySystem.persistentLicense) {
      $storedSessions.setStorage(keySystem.licenseStorage);
    }

    log.info("eme: encrypted event", encryptedEvent);
    return createMediaKeysObs(keySystemAccess)
      .mergeMap((mediaKeys) => {
        const { serverCertificate } = keySystem;
        const setCertificate$ = serverCertificate &&
          typeof mediaKeys.setServerCertificate === "function" ?
            trySettingServerCertificate(
              mediaKeys,
              serverCertificate,
              errorStream
            ) : Observable.empty();

        const mksConfig = keySystemAccess.getConfiguration();

        // TODO FIXME The code here is ugly. What we should most probably do
        // is a merge between setMediaKeys and manageSessionCreation as
        // depending on the device, we might run into a race condition there by
        // doing them sequentially.
        //
        // Here those seem sequential (concat), and were tested as with no
        // problem, but there is an inherent problem in how those methods are
        // written: they do not wait for the subscription to begin their
        // side-effect(s) (like session.load and whatnot).
        // Thus the next two functions are effectively executed at the same
        // time, not truly concatenated.
        // I did not change it to Observable.merge yet as I'm affraid to
        // run into other issues, the code there works for now!
        //
        // This was done for a quick release (v2.3.2), and was not re-updated
        // because it was tested, worked, and we had not much time to re-do all
        // the tests with a proper logic. Please re-update and re-test
        // everything for a later release.
        return setCertificate$
          .concat(setMediaKeysObs(mediaKeys, mksConfig, video, keySystem))
          .concat(manageSessionCreation(
              mediaKeys,
              mksConfig,
              keySystem,
              encryptedEvent.initDataType,
              new Uint8Array(encryptedEvent.initData),
              errorStream
            )
          );

        // TODO Test this in next Release instead. The previous behavior has a
        // high chance to not work as expected with future evolutions.
        // return setCertificate$
        //   .concat(Observable.merge(
        //     setMediaKeysObs(mediaKeys, mksConfig, video, keySystem)),
        //     manageSessionCreation(
        //       mediaKeys,
        //       mksConfig,
        //       keySystem,
        //       encryptedEvent.initDataType,
        //       new Uint8Array(encryptedEvent.initData),
        //       errorStream
        //     )
        //   ));
      });
  }

  return combineLatest(
    onEncrypted(video),
    findCompatibleKeySystem(keySystems)
  )
    .take(1)
    .mergeMap(([evt, ks]) => handleEncryptedEvents(evt, ks));
}

function getCurrentKeySystem() {
  return $keySystem && $keySystem.type;
}

function dispose() {
  // Remove MediaKey before to prevent MediaKey error
  // if other instance is creating after dispose
  if ($videoElement) {
    setMediaKeys($videoElement, null).subscribe(()=>{});
  }
  $mediaKeys = null;
  $keySystem = null;
  $videoElement = null;
  $loadedSessions.dispose();
}

export {
  createEME,
  getCurrentKeySystem,
  onEncrypted,
  dispose,
};
