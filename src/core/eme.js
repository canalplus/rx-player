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
    this._hash = {};
  }

  getFirst() {
    for (let i in this._hash) {
      return this._hash[i];
    }
  }

  get(sessionId) {
    return this._hash[sessionId];
  }

  add(session) {
    let sessionId = session.sessionId;
    assert(sessionId);
    if (!this._hash[sessionId]) {
      log.debug("eme-store: add persisted session in store", sessionId);
      this._hash[sessionId] = session;

      session.closed.then(() => {
        log.debug("eme-store: remove persisted session from store", sessionId);
        delete this._hash[sessionId];
      });
    }
  }

  delete(sessionId) {
    let session = this._hash[sessionId];
    if (session) {
      delete this._hash[sessionId];
      return session.close();
    } else {
      return Promise_.resolve();
    }
  }

  dispose() {
    let disposed = [];
    for (let sessionId in this._hash) {
      disposed.push(this._hash[sessionId].close());
    }
    this._hash = {};
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
      log.warn("eme-store: could not get entries from license storage", e);
      this.dispose();
    }
  }

  hashInitData(initData) {
    if (typeof initData == "number") {
      return initData;
    } else {
      return hashBuffer(initData);
    }
  }

  get(initData) {
    initData = this.hashInitData(initData);
    let entry = _.find(this._entries, entry => entry.initData === initData);
    if (entry) {
      return entry.sessionId;
    }
  }

  add(initData, session) {
    initData = this.hashInitData(initData);
    if (!this.get(initData)) {
      let sessionId = session.sessionId;
      assert(sessionId);

      log.info("eme-store: store new session", sessionId, session);
      this._entries.push({ sessionId, initData });
      this._save();
    }
  }

  delete(initData, session) {
    initData = this.hashInitData(initData);

    let entry = _.find(this._entries, entry => entry.initData === initData);
    if (entry) {
      let sessionId = entry.sessionId;
      log.warn("eme-store: delete session from store", sessionId);

      let idx = this._entries.indexOf(entry);
      this._entries.splice(idx, 1);
      this._save();
    }

    if (session) {
      log.warn("eme-store: remove session from system", session.sessionId);
      session.remove();
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
      log.warn("eme-store: could not save licenses in localStorage");
    }
  }
}

const emptyStorage = {
  load() { return []; },
  save() {},
};
const $storedSessions = new PersistedSessionsSet(emptyStorage);
const $loadedSessions = new InMemorySessionsSet();

const cachedKeySystemAccess = {
  createMediaKeys: () => Promise_.resolve($mediaKeys)
};

// Persisted singleton instance of MediaKeys. We do not allow multiple
// CDM instances.
let $mediaKeys;
let $keySystem;

function loadPersistedSession(session, sessionId) {
  log.debug("eme: load persisted session", sessionId);
  return fromPromise(
    session.load(sessionId)
      .then(() => session)
  );
}

function logAndThrow(errMessage, reason) {
  let error = new Error(errMessage);
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
function EME(video, keySystems, {
  requestMediaKeySystemAccess,
  setMediaKeys,
  emeEvents
}) {

  const {
    onEncrypted,
    onKeyMessage,
    onKeyError,
    onKeyStatusesChange
  } = emeEvents;

  function buildKeySystemConfiguration(keySystem) {
    let sessionTypes = [];
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
    //
    // NOTE(pierre): alwaysRenew flag is used for IE11 which require the
    // creation of a new MediaKeys instance for each session creation
    if ($keySystem && $mediaKeys && !$mediaKeys.alwaysRenew) {

      var foundKeySystem = _.find(keySystems, (ks) => (
        ks.type == $keySystem.type &&
        ks.persistentLicense == $keySystem.persistentLicense &&
        ks.persistentStateRequired === $keySystem.persistentStateRequired &&
        ks.distinctiveIdentifierRequired == $keySystem.distinctiveIdentifierRequired
      ));

      if (foundKeySystem) {
        log.debug("eme: found compatible keySystem quickly", foundKeySystem);

        return just({
          keySystem: foundKeySystem,
          keySystemAccess: cachedKeySystemAccess
        });
      }
    }

    var keySystemsType = _.flatten(keySystems,
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

        var { keyType, keySystem } = keySystemsType[index];
        var keySystemConfigurations = [buildKeySystemConfiguration(keySystem)];

        log.debug(
          `eme: request keysystem access ${keyType},` +
          `${index+1} of ${keySystemsType.length}`,
          keySystemConfigurations
        );

        requestMediaKeySystemAccess(keyType, keySystemConfigurations)
          .then(
            keySystemAccess => {
              log.info("eme: found compatible keysystem", keyType, keySystemConfigurations);
              obs.onNext({ keySystem, keySystemAccess });
              obs.onCompleted();
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
    return fromPromise(
      keySystemAccess.createMediaKeys().then(mk => {
        $mediaKeys = mk;
        $keySystem = keySystem;
        log.debug("eme: set mediakeys");
        return setMediaKeys(video, mk).then(() => mk);
      })
    );
  }

  function makeNewKeyRequest(session, initDataType, initData) {
    log.debug("eme: generate request", initDataType, initData);
    return fromPromise(
      session.generateRequest(initDataType, initData)
        .then(() => session)
    );
  }

  if (__DEV__) {
    _.each(keySystems, ks => assert.iface(ks, "keySystem", { getLicense: "function", type: "string" }));
  }

  function handleEncryptedEvents(encryptedEvent, { keySystem, keySystemAccess }) {
    if (keySystem.persistentLicense) {
      $storedSessions.setStorage(keySystem.licenseStorage);
    }

    let initData = new Uint8Array(encryptedEvent.initData);
    let initDataType = encryptedEvent.initDataType;

    log.info("eme: encrypted event", encryptedEvent);
    return createAndSetMediaKeys(video, keySystem, keySystemAccess)
      .flatMap((mediaKeys) =>
        manageSessionCreation(mediaKeys, keySystem, initDataType, initData)
          .tap(
            (session) => {
              $storedSessions.add(initData, session);
              $loadedSessions.add(session);
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
              $storedSessions.delete(initData, session);
              $loadedSessions.delete(session.sessionId);
            })
      );
  }

  function manageSessionCreation(mediaKeys, keySystem, initDataType, initData) {
    // reuse currently loaded sessions without making a new key
    // request
    let sessionId = $storedSessions.get(initData);

    let session = $loadedSessions.get(sessionId);
    if (session) {
      log.debug("eme: reuse loaded session", sessionId);
      return just(session);
    }

    let sessionType;
    if (keySystem.persistentLicense) {
      sessionType = "persistent-license";
    } else {
      sessionType = "temporary";
    }

    log.debug(`eme: create a ${sessionType} session`);
    session = mediaKeys.createSession(sessionType);

    if (keySystem.persistentLicense) {
      // if a persisted session exists in the store associated to this
      // initData, we reuse it without a new license request through
      // the `load` method.
      if (sessionId) {
        return loadPersistedSession(session, sessionId)
          .catch(err => {
            log.warn(
              "eme: failed to load persisted session, do fallback",
              sessionId, err
            );

            $storedSessions.delete(initData, null);
            return fromPromise($loadedSessions.delete(sessionId))
              .flatMap(() => {
                session = mediaKeys.createSession(sessionType);
                return makeNewKeyRequest(session, initDataType, initData);
              });
          });
      }
    }

    // we have a fresh session without persisted informations and need
    // to make a new key request that we will associate to this
    // session
    return makeNewKeyRequest(session, initDataType, initData)
      .catch(err => {
        var firstLoadedSession = $loadedSessions.getFirst();
        if (!firstLoadedSession) {
          throw err;
        }

        log.warn(
          "eme: could not create a new session, " +
          "retry after closing a currently loaded session",
          err
        );

        return fromPromise(firstLoadedSession.close())
          .flatMap(() => {
            session = mediaKeys.createSession(sessionType);
            return makeNewKeyRequest(session, initDataType, initData);
          });
      });
  }

  // listen to "message" events from session containing a challenge
  // blob and map them to licenses using the getLicense method from
  // selected keySystem
  function handleMessageEvents(session, keySystem) {
    let sessionId;

    let keyErrors = onKeyError(session).map(err =>
      logAndThrow(`eme: keyerror event ${err.errorCode} / ${err.systemCode}`, err)
    );

    let keyStatusesChanges = onKeyStatusesChange(session).flatMap((keyStatusesEvent) => {
      sessionId = keyStatusesEvent.sessionId;
      log.debug("eme: keystatuseschange event", sessionId, session, keyStatusesEvent);

      // find out possible errors associated with this event
      let keyStatuses = session.keyStatuses.values();
      for (let v = keyStatuses.next(); !v.done; v = keyStatuses.next()) {
        let errMessage = KEY_STATUS_ERRORS[v.value];
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
        license = keySystem.onKeyStatusesChange(keyStatusesEvent, session);
      } catch(e) {
        license = Observable.throw(e);
      }

      return toObservable(license)
        .catch(err =>
          logAndThrow(`eme: onKeyStatusesChange has failed (reason: ${err && err.message || "unknown"})`, err));
    });

    let keyMessages = onKeyMessage(session).flatMap((messageEvent) => {
      sessionId = messageEvent.sessionId;

      let { message, messageType } = messageEvent;
      if (!messageType) {
        messageType = "license-request";
      }

      log.debug(`eme: event message type ${messageType}`, session, messageEvent);

      let license;
      try {
        license = keySystem.getLicense(new Uint8Array(message), messageType);
      } catch(e) {
        license = Observable.throw(e);
      }

      return toObservable(license)
        .catch(err =>
          logAndThrow(`eme: getLicense has failed (reason: ${err && err.message || "unknown"})`, err));
    });

    let sessionUpdates = merge(keyMessages, keyStatusesChanges)
      .concatMap(res => {
        log.debug("eme: update session", sessionId, res);

        return session.update(res, sessionId)
          .catch(err => logAndThrow(`eme: error on session update ${sessionId}`, err));
      })
      .map(() => ({ type: "eme", value: { session: session, name: "session-updated" } }));

    return merge(sessionUpdates, keyErrors);
  }

  return Observable.create(obs => {
    let sub = combineLatest(
      onEncrypted(video),
      findCompatibleKeySystem(keySystems),
      handleEncryptedEvents
    )
      .take(1)
      .mergeAll()
      .subscribe(obs);

    return () => {
      if (sub) {
        sub.dispose();
      }

      setMediaKeys(video, null)
        .catch((e) => log.warn(e));
    };
  });
}

EME.getCurrentKeySystem = () => {
  return $keySystem && $keySystem.type;
};

EME.dispose = () => {
  $mediaKeys = null;
  $keySystem = null;
  $loadedSessions.dispose();
};

module.exports = EME;
