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

const log = require("canal-js-utils/log");
const assert = require("canal-js-utils/assert");
const find = require("lodash/collection/find");
const flatten = require("lodash/array/flatten");
const castToObservable = require("../utils/to-observable");
const { retryWithBackoff } = require("canal-js-utils/rx-ext");
const { Observable } = require("rxjs/Observable");
const empty = require("rxjs/observable/EmptyObservable").EmptyObservable.create;
const { combineLatestStatic } = require("rxjs/operator/combineLatest");
const { mergeStatic } = require("rxjs/operator/merge");
const {
  KeySystemAccess,
  requestMediaKeySystemAccess,
  setMediaKeys,
  emeEvents,
  shouldRenewMediaKeys,
} = require("./compat");

const {
  onEncrypted,
  onKeyMessage,
  onKeyError,
  onKeyStatusesChange,
} = emeEvents;

const SYSTEMS = {
  "clearkey":  ["webkit-org.w3.clearkey", "org.w3.clearkey"],
  "widevine":  ["com.widevine.alpha"],
  "playready": ["com.youtube.playready", "com.microsoft.playready"],
};

// Key statuses to error mapping. Taken from shaka-player.
const KEY_STATUS_ERRORS = {
  "expired": "eme: a required key has expired and the content cannot be decrypted.",
  "internal-error": "eme: an unknown error has occurred in the CDM.",
   // "expired",
   // "released",
   // "output-restricted",
   // "output-downscaled",
   // "status-pending",
};

class EMEError extends Error {
  constructor(reason) {
    super();
    this.name = "EMEError";
    this.reason = reason;
    this.message = reason && reason.message || "eme: unknown error";
  }
}

class GenerateRequestError extends Error {
  constructor(session, evt) {
    super();
    this.name = "GenerateRequestError";
    this.session = session;
    this.reason = evt;
  }
}

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

const NotSupportedKeySystemError = () => {
  new Error("eme: could not find a compatible key system");
};

/**
 * Set maintaining a representation of all currently loaded
 * MediaKeySessions. This set allow to reuse sessions without re-
 * negotiating a license exchange if the key is already used in a
 * loaded session.
 */
class InMemorySessionsSet {
  constructor() {
    this._entries = [];
  }

  getFirst() {
    if (this._entries.length > 0) {
      return this._entries[0].session;
    }
  }

  get(initData) {
    initData = hashInitData(initData);
    const entry = find(this._entries, (e) => e.initData === initData);
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
    const entry = find(this._entries, (e) => e.session.sessionId === sessionId);
    if (entry) {
      return this.delete(entry.session);
    } else {
      return null;
    }
  }

  delete(session_) {
    const entry = find(this._entries, (e) => e.session === session_);
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
    return mergeStatic.apply(null, disposed);
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
class PersistedSessionsSet {
  constructor(storage) {
    this.setStorage(storage);
  }

  setStorage(storage) {
    if (this._storage === storage) {
      return;
    }

    assert(
      storage,
      `eme: no licenseStorage given for keySystem with persistentLicense`
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
    const entry = find(this._entries, (e) => e.initData === initData);
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

    const entry = find(this._entries, (e) => e.initData === initData);
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
  return { type: "eme", value: { name, session, ...options } };
}

function getCachedKeySystemAccess(keySystems) {
  // NOTE(pierre): alwaysRenew flag is used for IE11 which require the
  // creation of a new MediaKeys instance for each session creation
  if (!$keySystem || !$mediaKeys || shouldRenewMediaKeys()) {
    return null;
  }

  const configuration = $mediaKeySystemConfiguration;
  const foundKeySystem = find(keySystems, (ks) => {
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
  });

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

function buildKeySystemConfiguration(keySystem) {
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

  return {
    videoCapabilities: undefined,
    audioCapabilities: undefined,
    initDataTypes: ["cenc"],
    distinctiveIdentifier,
    persistentState,
    sessionTypes,
  };
}

function findCompatibleKeySystem(keySystems) {
  // Fast way to find a compatible keySystem if the currently loaded
  // one as exactly the same compatibility options.
  const cachedKeySystemAccess = getCachedKeySystemAccess(keySystems);
  if (cachedKeySystemAccess) {
    log.debug("eme: found compatible keySystem quickly", cachedKeySystemAccess);
    return Observable.of(cachedKeySystemAccess);
  }

  const keySystemsType = flatten(keySystems.map(
    (keySystem) => SYSTEMS[keySystem.type].map((keyType) => ({ keyType, keySystem })))
  );

  return Observable.create((obs) => {
    let disposed = false;
    let sub = null;

    function testKeySystem(index) {
      if (disposed) {
        return;
      }

      if (index >= keySystemsType.length) {
        obs.onError(NotSupportedKeySystemError());
        return;
      }

      const { keyType, keySystem } = keySystemsType[index];
      const keySystemConfigurations = [buildKeySystemConfiguration(keySystem)];

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

    () => {
      disposed = true;
      if (sub) {
        sub.unsubscribe();
      }
    };
  });
}

function createAndSetMediaKeys(video, keySystem, keySystemAccess) {
  const oldVideoElement = $videoElement;
  const oldMediaKeys = $mediaKeys;

  return castToObservable(keySystemAccess.createMediaKeys())
    .flatMap((mk) => {
      $mediaKeys = mk;
      $mediaKeySystemConfiguration = keySystemAccess.getConfiguration();
      $keySystem = keySystem;
      $videoElement = video;

      if (video.mediaKeys === mk) {
        return Observable.of(mk);
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
          .concat(setMediaKeys($videoElement, mk));
      }
      else {
        log.debug("eme: set mediakeys");
        mediaKeysSetter = setMediaKeys($videoElement, mk);
      }

      return mediaKeysSetter.mapTo(mk);
    });
}

function createSession(mediaKeys, sessionType, keySystem, initData) {
  log.debug(`eme: create a new ${sessionType} session`);
  const session = mediaKeys.createSession(sessionType);
  const sessionEvents = sessionEventsHandler(session, keySystem)
    .finally(() => {
      $loadedSessions.deleteAndClose(session);
      $storedSessions.delete(initData);
    })
    .publish();

  return { session, sessionEvents };
}

function createSessionAndKeyRequest(mediaKeys,
                                    keySystem,
                                    sessionType,
                                    initDataType,
                                    initData) {
  const { session, sessionEvents } = createSession(mediaKeys, sessionType,
                                                   keySystem, initData);

  $loadedSessions.add(initData, session, sessionEvents);

  log.debug("eme: generate request", initDataType, initData);

  const generateRequest = castToObservable(
    session.generateRequest(initDataType, initData)
  )
    .catch((e) => {
      throw new GenerateRequestError(session, e);
    })
    .do(() => {
      if (sessionType == "persistent-license") {
        $storedSessions.add(initData, session);
      }
    })
    .mapTo(createMessage("generated-request", session, { initData, initDataType }));

  return mergeStatic(sessionEvents, generateRequest);
}

function createSessionAndKeyRequestWithRetry(mediaKeys,
                                             keySystem,
                                             sessionType,
                                             initDataType,
                                             initData) {
  return createSessionAndKeyRequest(
    mediaKeys,
    keySystem,
    sessionType,
    initDataType,
    initData
  )
    .catch((err) => {
      if (!(err instanceof GenerateRequestError)) {
        throw err;
      }

      const firstLoadedSession = $loadedSessions.getFirst();
      if (!firstLoadedSession) {
        throw err;
      }

      log.warn("eme: could not create a new session, " +
               "retry after closing a currently loaded session",
               err);

      return $loadedSessions.deleteAndClose(firstLoadedSession)
        .flatMap(() =>
          createSessionAndKeyRequest(
            mediaKeys,
            keySystem,
            sessionType,
            initDataType,
            initData
          )
        );
    });
}

function createPersistentSessionAndLoad(mediaKeys,
                                         keySystem,
                                         storedSessionId,
                                         initDataType,
                                         initData) {
  log.debug("eme: load persisted session", storedSessionId);

  const sessionType = "persistent-license";
  const { session, sessionEvents } = createSession(mediaKeys, sessionType,
                                                   keySystem, initData);

  return castToObservable(
    session.load(storedSessionId)
  )
    .catch(() => Observable.of(false))
    .flatMap((success) => {
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
          initData
        ).startWith(
          createMessage("loaded-session-failed", session, { storedSessionId })
        );
      }
    });
}

function manageSessionCreation(mediaKeys,
                               mediaKeySystemConfiguration,
                               keySystem,
                               initDataType,
                               initData) {
  // reuse currently loaded sessions without making a new key
  // request
  const loadedSession = $loadedSessions.get(initData);
  if (loadedSession && loadedSession.sessionId) {
    log.debug("eme: reuse loaded session", loadedSession.sessionId);
    return Observable.of(createMessage("reuse-session", loadedSession));
  }

  const sessionTypes = mediaKeySystemConfiguration.sessionTypes;
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
        initData);
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
    initData
  );
}

// listen to "message" events from session containing a challenge
// blob and map them to licenses using the getLicense method from
// selected keySystem
function sessionEventsHandler(session, keySystem) {
  log.debug("eme: handle message events", session);
  let sessionId;

  const keyErrors = onKeyError(session).map((err) =>
    logAndThrow(`eme: keyerror event ${err.errorCode} / ${err.systemCode}`, err)
  );

  const keyStatusesChanges = onKeyStatusesChange(session)
    .flatMap((keyStatusesEvent) => {
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
        const errMessage = KEY_STATUS_ERRORS[keyStatus] || KEY_STATUS_ERRORS[keyId];
        if (errMessage) {
          logAndThrow(errMessage);
        }
      });

      // otherwise use the keysystem handler if disponible
      if (!keySystem.onKeyStatusesChange) {
        log.info("eme: keystatuseschange event not handled");
        return empty();
      }

      let license;
      try {
        license = keySystem.onKeyStatusesChange(
          keyStatusesEvent,
          session
        );
      } catch(e) {
        license = Observable.throw(e);
      }

      return castToObservable(license).catch((err) =>
        logAndThrow(
          `eme: onKeyStatusesChange has failed (reason:${err && err.message || "unknown"})`,
          err
        )
      );
    });

  const keyMessages = onKeyMessage(session)
    .flatMap((messageEvent) => {
      sessionId = messageEvent.sessionId;

      const message = new Uint8Array(messageEvent.message);
      const messageType = messageEvent.messageType || "license-request";

      log.debug(
        `eme: event message type ${messageType}`,
        session,
        messageEvent
      );

      let license;
      try {
        license = retryWithBackoff(() => keySystem.getLicense(message, messageType),
          { totalRetry: 3, retryDelay: 100 });
      } catch(e) {
        license = Observable.throw(e);
      }

      return castToObservable(license).catch((err) =>
        logAndThrow(
          `eme: getLicense has failed (reason: ${err && err.message || "unknown"})`,
          err
        )
      );
    });

  const sessionUpdates = mergeStatic(keyMessages, keyStatusesChanges)
    .concatMap((res) => {
      log.debug("eme: update session", sessionId, res);

      return castToObservable(
        session.update(res, sessionId)
      )
        .catch((err) =>
          logAndThrow(`eme: error on session update ${sessionId}`, err)
        )
        .mapTo(createMessage("session-update", session, { updatedWith: res }));
    });

  const sessionEvents = mergeStatic(sessionUpdates, keyErrors);
  if (session.closed) {
    return sessionEvents.takeUntil(castToObservable(session.closed));
  } else {
    return sessionEvents;
  }
}

function logAndThrow(errMessage, reason) {
  const error = new Error(errMessage);
  if (reason) {
    error.reason = reason;
  }
  log.error(errMessage, reason);
  throw error;
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
 */
function createEME(video, keySystems) {
  if (__DEV__) {
    keySystems.forEach((ks) => assert.iface(ks, "keySystem", {
      getLicense: "function",
      type: "string",
    }));
  }

  function handleEncryptedEvents(encryptedEvent, { keySystem, keySystemAccess }) {
    if (keySystem.persistentLicense) {
      $storedSessions.setStorage(keySystem.licenseStorage);
    }

    log.info("eme: encrypted event", encryptedEvent);
    return createAndSetMediaKeys(video, keySystem, keySystemAccess)
      .flatMap((mediaKeys) =>
        manageSessionCreation(
          mediaKeys,
          keySystemAccess.getConfiguration(),
          keySystem,
          encryptedEvent.initDataType,
          new Uint8Array(encryptedEvent.initData)
        )
      );
  }

  return combineLatestStatic(
    onEncrypted(video),
    findCompatibleKeySystem(keySystems)
  )
    .take(1)
    .flatMap(([evt, ks]) => handleEncryptedEvents(evt, ks))
    .catch((e) => {
      throw new EMEError(e);
    });
}

function getCurrentKeySystem() {
  return $keySystem && $keySystem.type;
}

function dispose() {
  $mediaKeys = null;
  $keySystem = null;
  $loadedSessions.dispose();
}

module.exports = {
  createEME,
  EMEError,
  getCurrentKeySystem,
  onEncrypted,
  dispose,
};
