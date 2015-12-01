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

const _ = require("canal-js-utils/misc");
const log = require("canal-js-utils/log");
const Promise_ = require("canal-js-utils/promise");
const assert = require("canal-js-utils/assert");
const { Observable } = require("canal-js-utils/rx");
const { combineLatest, empty, fromPromise, merge, just } = Observable;
const {
  KeySystemAccess,
  requestMediaKeySystemAccess,
  setMediaKeys,
  emeEvents,
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
  "playready": ["com.youtube.playready", "com.microsoft.playready"]
};

// Key statuses to error mapping. Taken from shaka-player.
const KEY_STATUS_ERRORS = {
  "output-not-allowed": "eme: the required output protection is not available.",
  "expired": "eme: a required key has expired and the content cannot be decrypted.",
  "internal-error": "eme: an unknown error has occurred in the CDM."
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

const NotSupportedKeySystemError = () =>
  new Error("eme: could not find a compatible key system");

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
    const entry = _.find(
      this._entries,
      entry => entry.initData === initData
    );
    if (entry) {
      return entry.session;
    }
  }

  add(initData, session) {
    initData = hashInitData(initData);
    if (!this.get(initData)) {
      const sessionId = session.sessionId;
      if (!sessionId) {
        return;
      }

      const entry = { session, initData };
      log.debug("eme-mem-store: add session", entry);
      this._entries.push(entry);
      session.closed.then(() => {
        log.debug("eme-mem-store: remove closed session", entry);
        const idx = this._entries.indexOf(entry);
        if (idx >= 0) {
          this._entries.splice(idx, 1);
        }
      });
    }
  }

  delete(sessionId) {
    const entry = _.find(
      this._entries,
      entry => entry.session.sessionId === sessionId
    );
    if (entry) {
      log.debug("eme-mem-store: delete session", sessionId);
      const idx = this._entries.indexOf(entry);
      this._entries.splice(idx, 1);
      return entry.session;
    }
  }

  deleteAndClose(sessionId) {
    const session = this.delete(sessionId);
    if (session) {
      log.debug("eme-mem-store: close session", sessionId);
      return session.close();
    } else {
      return Promise_.resolve();
    }
  }

  dispose() {
    const disposed = this._entries.map(({ session }) => session.close());
    this._entires = [];
    return Promise_.all(disposed);
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
    const entry = _.find(
      this._entries,
      entry => entry.initData === initData
    );
    if (entry) {
      return entry.sessionId;
    }
  }

  add(initData, session) {
    initData = hashInitData(initData);
    if (session.sessionType == "persistent-license" && !this.get(initData)) {
      const sessionId = session.sessionId;
      if (!sessionId) {
        return;
      }

      log.info("eme-persitent-store: add new session", sessionId, session);
      this._entries.push({ sessionId, initData });
      this._save();
    }
  }

  delete(initData) {
    initData = hashInitData(initData);

    const entry = _.find(
      this._entries,
      entry => entry.initData === initData
    );
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

// Persisted singleton instance of MediaKeys. We do not allow multiple
// CDM instances.
let $mediaKeys;
let $mediaKeySystemConfiguration;
let $keySystem;
let $videoElement;

function getCachedKeySystemAccess(keySystems) {
  // NOTE(pierre): alwaysRenew flag is used for IE11 which require the
  // creation of a new MediaKeys instance for each session creation
  if (!$keySystem || !$mediaKeys || $mediaKeys.alwaysRenew) {
    return null;
  }

  const configuration = $mediaKeySystemConfiguration;
  const foundKeySystem = _.find(keySystems, (ks) => {
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
  const sessionTypes = [];
  let persistentState = "optional";
  let distinctiveIdentifier = "optional";

  if (keySystem.persistentLicense) {
    persistentState = "required";
    sessionTypes.push("persistent-license");
  } else {
    sessionTypes.push("temporary");
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
    return just(cachedKeySystemAccess);
  }

  const keySystemsType = _.flatten(keySystems,
    keySystem => _.map(SYSTEMS[keySystem.type], keyType => ({ keyType, keySystem })));

  return Observable.create(obs => {
    let disposed = false;

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

      requestMediaKeySystemAccess(keyType, keySystemConfigurations)
        .then(
          keySystemAccess => {
            log.info("eme: found compatible keysystem", keyType, keySystemConfigurations);
            // TODO(pierre): remove this compat code used only for X1
            // with an intermediary implementation of EME
            if (!keySystemAccess.getConfiguration) {
              keySystemAccess.getConfiguration = () => {
                const conf = keySystemConfigurations[0];
                return {
                  audioCapabilities: conf.audioCapabilities,
                  videoCapabilities: conf.videoCapabilities,
                  initDataTypes: ["cenc"],
                  distinctiveIdentifier: conf.distinctiveIdentifier === "required" ? "required" : "not-allowed",
                  persistentState: conf.persistentState === "required" ? "required" : "not-allowed",
                  sessionTypes: conf.sessionTypes,
                };
              };
            }

            obs.next({ keySystem, keySystemAccess });
            obs.complete();
          },
          () => {
            log.debug("eme: rejected access to keysystem", keyType, keySystemConfigurations);
            testKeySystem(index + 1);
          }
        );
    }

    testKeySystem(0);

    () => disposed = true;
  });
}

function createAndSetMediaKeys(video, keySystem, keySystemAccess) {
  const oldVideoElement = $videoElement;
  const oldMediaKeys = $mediaKeys;

  return fromPromise(
    keySystemAccess.createMediaKeys().then(mk => {
      $mediaKeys = mk;
      $mediaKeySystemConfiguration = keySystemAccess.getConfiguration();
      $keySystem = keySystem;
      $videoElement = video;

      if (video.mediaKeys === mk) {
        return Promise.resolve(mk);
      }

      if (oldMediaKeys && oldMediaKeys !== $mediaKeys) {
        // if we change our mediaKeys singleton, we need to dispose all existing
        // sessions linked to the previous one.
        $loadedSessions.dispose();
      }

      if ((oldVideoElement && oldVideoElement !== $videoElement)) {
        log.debug("eme: unlink old video element and set mediakeys");
        return setMediaKeys(oldVideoElement, null)
          .then(() => setMediaKeys($videoElement, mk))
          .then(() => mk);
      }
      else {
        log.debug("eme: set mediakeys");
        return setMediaKeys($videoElement, mk)
          .then(() => mk);
      }
    })
  );
}

function createSession(mediaKeys, sessionType) {
  const session = mediaKeys.createSession(sessionType);
  session.sessionType = sessionType;
  return session;
}

function makeNewKeyRequest(session, initDataType, initData) {
  log.debug("eme: generate request", initDataType, initData);
  return fromPromise(
    session.generateRequest(initDataType, initData)
      .then(() => session)
  );
}

function loadPersistedSession(session, sessionId) {
  log.debug("eme: load persisted session", sessionId);
  return fromPromise(
    session.load(sessionId).then((success) => ({ success, session }))
  );
}

function logAndThrow(errMessage, reason) {
  const error = new Error(errMessage);
  if (reason) {
    error.reason = reason;
  }
  log.error(errMessage, reason);
  throw error;
}

function toObservable(value) {
  if (_.isPromise(value))
    return fromPromise(value);

  if (!_.isObservable(value))
    return just(value);

  return value;
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
function EME(video, keySystems) {
  if (__DEV__) {
    _.each(keySystems, ks => assert.iface(ks, "keySystem", {
      getLicense: "function",
      type: "string",
    }));
  }

  function handleEncryptedEvents(encryptedEvent, { keySystem, keySystemAccess }) {
    if (keySystem.persistentLicense) {
      $storedSessions.setStorage(keySystem.licenseStorage);
    }

    const initData = new Uint8Array(encryptedEvent.initData);
    const initDataType = encryptedEvent.initDataType;
    const mediaKeySystemConfiguration = keySystemAccess.getConfiguration();

    log.info("eme: encrypted event", encryptedEvent);
    return createAndSetMediaKeys(video, keySystem, keySystemAccess)
      .flatMap((mediaKeys) =>
        manageSessionCreation(
          mediaKeys,
          mediaKeySystemConfiguration,
          keySystem,
          initDataType,
          initData
        )
          .tap(
            (session) => {
              $storedSessions.add(initData, session);
              $loadedSessions.add(initData, session);
            },
            (error) => {
              log.error("eme: error during session management handler", error);
            })
      )
      .flatMap((session) =>
        handleMessageEvents(session, keySystem)
          .tapOnError(
            (error) => {
              log.error("eme: error in session messages handler", session, error);
              $storedSessions.delete(initData);
              $loadedSessions.deleteAndClose(session.sessionId);
            })
      );
  }

  function manageSessionCreation(mediaKeys,
                                 mediaKeySystemConfiguration,
                                 keySystem,
                                 initDataType,
                                 initData) {
    // reuse currently loaded sessions without making a new key
    // request
    const loadedSession = $loadedSessions.get(initData);
    if (loadedSession) {
      log.debug("eme: reuse loaded session", loadedSession.sessionId);
      return just(loadedSession);
    }

    const persistentLicenseSupported = mediaKeySystemConfiguration.sessionTypes.indexOf("persistent-license") >= 0;
    const sessionType = persistentLicenseSupported && keySystem.persistentLicense
      ? "persistent-license"
      : "temporary";

    if (persistentLicenseSupported && keySystem.persistentLicense) {
      const storedSessionId = $storedSessions.get(initData);

      // if a persisted session exists in the store associated to this
      // initData, we reuse it without a new license request through
      // the `load` method.
      if (storedSessionId) {
        return makeNewPersistentSessionAndLoad(
          mediaKeys,
          storedSessionId,
          initDataType,
          initData);
      }
    }

    // we have a fresh session without persisted informations and need
    // to make a new key request that we will associate to this
    // session
    return makeNewSessionAndCreateKeyRequest(
      mediaKeys,
      sessionType,
      initDataType,
      initData
    );
  }

  function makeNewSessionAndCreateKeyRequest(mediaKeys,
                                             sessionType,
                                             initDataType,
                                             initData) {
    log.debug(`eme: create a new ${sessionType} session`);
    const session = createSession(mediaKeys, sessionType);

    return makeNewKeyRequest(session, initDataType, initData)
      .catch(err => {
        const firstLoadedSession = $loadedSessions.getFirst();
        if (!firstLoadedSession) {
          throw err;
        }

        log.warn(
          "eme: could not create a new session, " +
          "retry after closing a currently loaded session",
          err
        );

        return Observable
          .from(firstLoadedSession.close())
          .flatMap(() =>
             makeNewKeyRequest(
              createSession(mediaKeys, sessionType),
              initDataType,
              initData
            )
          );
      });
  }

  function makeNewPersistentSessionAndLoad(mediaKeys,
                                           storedSessionId,
                                           initDataType,
                                           initData) {
    const sessionType = "persistent-license";

    log.debug(`eme: create a new ${sessionType} session`);
    const session = createSession(mediaKeys, sessionType);

    return loadPersistedSession(session, storedSessionId)
      .catch(err => {
        log.warn(
          "eme: failed to load persisted session, do fallback",
          storedSessionId, err
        );

        $storedSessions.delete(initData);
        $loadedSessions.delete(storedSessionId);

        const newSession = makeNewSessionAndCreateKeyRequest(
          mediaKeys,
          sessionType,
          initDataType,
          initData
        );

        return newSession.map((session) => ({ success: true, session }));
      })
      .flatMap(({ success, session }) => {
        if (success) {
          log.debug("eme: successfully loaded session");
          return just(session);
        }

        log.warn(
          "eme: no data stored for the loaded session, removing it",
          storedSessionId
        );

        $storedSessions.delete(initData);
        $loadedSessions.delete(storedSessionId);

        const sessionToRemove = session;
        sessionToRemove.remove()
          .catch((err) => log.warn("eme: could not remove session", err));

        const newSession = makeNewSessionAndCreateKeyRequest(
          mediaKeys,
          sessionType,
          initDataType,
          initData
        );

        return merge(newSession, just(sessionToRemove));
      });
  }

  // listen to "message" events from session containing a challenge
  // blob and map them to licenses using the getLicense method from
  // selected keySystem
  function handleMessageEvents(session, keySystem) {
    log.debug("eme: handle message events for session", session.sessionId);
    let sessionId;

    const keyErrors = onKeyError(session).map(err =>
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
        const keyStatuses = session.keyStatuses.values();
        for (let v = keyStatuses.next(); !v.done; v = keyStatuses.next()) {
          const errMessage = KEY_STATUS_ERRORS[v.value];
          if (errMessage) {
            logAndThrow(errMessage);
          }
        }

        // otherwise use the keysystem handler if disponible
        if (!keySystem.onKeyStatusesChange) {
          log.warn("eme: keystatuseschange event not handled");
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

        return toObservable(license)
          .catch(err =>
            logAndThrow(
              `eme: onKeyStatusesChange has failed ` +
              `(reason:${err && err.message || "unknown"})`,
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
          license = keySystem.getLicense(message, messageType);
        } catch(e) {
          license = Observable.throw(e);
        }

        return toObservable(license)
          .catch(err =>
            logAndThrow(
              `eme: getLicense has failed ` +
              `(reason: ${err && err.message || "unknown"})`,
              err
            )
          );
      });

    const sessionUpdates = merge(keyMessages, keyStatusesChanges)
      .concatMap(res => {
        log.debug("eme: update session", sessionId, res);

        return session.update(res, sessionId)
          .catch(err => logAndThrow(`eme: error on session update ${sessionId}`, err));
      })
      .map(() => ({ type: "eme", value: { session: session, name: "session-updated" } }));

    return merge(sessionUpdates, keyErrors);
  }

  return combineLatest(
    onEncrypted(video),
    findCompatibleKeySystem(keySystems)
  )
    .take(1)
    .flatMap(([evt, ks]) => handleEncryptedEvents(evt, ks));
}

EME.onEncrypted = onEncrypted;
EME.getCurrentKeySystem = () => {
  return $keySystem && $keySystem.type;
};
EME.dispose = () => {
  $mediaKeys = null;
  $keySystem = null;
  $loadedSessions.dispose();
};

module.exports = EME;
