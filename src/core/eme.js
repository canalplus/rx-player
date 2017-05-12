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

const log = require("../utils/log");
const assert = require("../utils/assert");
const { tryCatch, castToObservable } = require("../utils/rx-utils");
const { retryWithBackoff } = require("../utils/retry");
const { Observable } = require("rxjs/Observable");
const empty = require("rxjs/observable/EmptyObservable").EmptyObservable.create;
const defer = require("rxjs/observable/DeferObservable").DeferObservable.create;
const { combineLatest } = require("rxjs/observable/combineLatest");
const { merge } = require("rxjs/observable/merge");
const {
  KeySystemAccess,
  requestMediaKeySystemAccess,
  setMediaKeys,
  emeEvents,
  shouldRenewMediaKeys,
} = require("./compat");

const {
  ErrorTypes,
  ErrorCodes,
  EncryptedMediaError,
} = require("../errors");

const {
  onEncrypted,
  onKeyMessage,
  onKeyError,
  onKeyStatusesChange,
} = emeEvents;

const SYSTEMS = {
  "clearkey":  ["webkit-org.w3.clearkey", "org.w3.clearkey"],
  "widevine":  ["com.widevine.alpha"],
  "playready": ["com.microsoft.playready", "com.chromecast.playready", "com.youtube.playready"],
};

// List of all eme security robustnesses from highest to lowest
const ROBUSTNESSES = [
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
  return { type: "eme", value: Object.assign({ name, session }, options) };
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

  // From chrome 58, you must specify at least one videoCapabilities and one audioCapabilities
  // These capabilities must specify a codec (even though your stream can use a completely
  // different codec afterward). It is also strongly recommended to specify the required
  // security robustness. As we do not want to forbide any security level, we specify
  // every existing security level from highest to lowest so that the best security level is selected.
  // More details here: https://storage.googleapis.com/wvdocs/Chrome_EME_Changes_and_Best_Practices.pdf
  // TODO: enable the user to specify which codec and robustness he wants
  const videoCapabilities = [], audioCapabilities = [];
  ROBUSTNESSES.forEach(robustness => {
    videoCapabilities.push({
      contentType: "video/mp4;codecs=\"avc1.4d401e\"", // standard mp4 codec
      robustness,
    });
    audioCapabilities.push({
      contentType: "audio/mp4;codecs=\"mp4a.40.2\"", // standard mp4 codec
      robustness,
    });
  });

  return {
    initDataTypes: ["cenc"],
    videoCapabilities,
    audioCapabilities,
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

  const keySystemsType = keySystems.reduce(
    (parent, keySystem) => parent.concat((SYSTEMS[keySystem.type] || []).map((keyType) => ({ keyType, keySystem })))
  , []);

  return Observable.create((obs) => {
    let disposed = false;
    let sub = null;

    function testKeySystem(index) {
      if (disposed) {
        return;
      }

      if (index >= keySystemsType.length) {
        obs.error(new EncryptedMediaError("INCOMPATIBLE_KEYSYSTEMS", null, true));
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

    return () => {
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
    .mergeMap((mk) => {
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

function createSession(mediaKeys, sessionType, keySystem, initData, errorStream) {
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

function createSessionAndKeyRequest(mediaKeys,
                                    keySystem,
                                    sessionType,
                                    initDataType,
                                    initData,
                                    errorStream) {
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

function createSessionAndKeyRequestWithRetry(mediaKeys,
                                             keySystem,
                                             sessionType,
                                             initDataType,
                                             initData,
                                             errorStream) {
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

function manageSessionCreation(mediaKeys,
                               mediaKeySystemConfiguration,
                               keySystem,
                               initDataType,
                               initData,
                               errorStream) {
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

// listen to "message" events from session containing a challenge
// blob and map them to licenses using the getLicense method from
// selected keySystem
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
          .timeout(10 * 1000, new EncryptedMediaError("KEY_LOAD_TIMEOUT", null, false));
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
function createEME(video, keySystems, errorStream) {
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
      .mergeMap((mediaKeys) =>
        manageSessionCreation(
          mediaKeys,
          keySystemAccess.getConfiguration(),
          keySystem,
          encryptedEvent.initDataType,
          new Uint8Array(encryptedEvent.initData),
          errorStream
        )
      );
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

module.exports = {
  createEME,
  getCurrentKeySystem,
  onEncrypted,
  dispose,
};
