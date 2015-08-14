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

var _ = require("canal-js-utils/misc");
var log = require("canal-js-utils/log");
var Promise_ = require("canal-js-utils/promise");
var assert = require("canal-js-utils/assert");
var { bytesToHex } = require("canal-js-utils/bytes");
var { Observable } = require("canal-js-utils/rx");
var { empty, fromPromise, merge, just } = Observable;
var {
  requestMediaKeySystemAccess,
  setMediaKeys,
  emeEvents
} = require("./compat");

var {
  onEncrypted,
  onKeyMessage,
  onKeyError,
  onKeyStatusesChange
} = emeEvents;

var SYSTEMS = {
  "clearkey":  ["webkit-org.w3.clearkey", "org.w3.clearkey"],
  "widevine":  ["com.widevine.alpha"],
  "playready": ["com.youtube.playready", "com.microsoft.playready"]
};

// Key statuses to error mapping. Taken from shaka-player.
var KEY_STATUS_ERRORS = {
  "output-not-allowed": "eme: the required output protection is not available.",
  "expired": "eme: a required key has expired and the content cannot be decrypted.",
  "internal-error": "eme: an unknown error has occurred in the CDM."
};

var NotSupportedKeySystemError = () =>
  new Error("eme: could not find a compatible key system");

// Persisted singleton instance of MediaKeys.
// We do not allow multiple CDM instances.
var $mediaKeys;
var $keySystem;

var $sessionsStore = (function() {
  var sessions = {};
  return {
    get(initData) {
      return sessions[bytesToHex(initData)];
    },
    set(initData, session) {
      sessions[bytesToHex(initData)] = session;
    },
    delete(initData) {
      delete sessions[bytesToHex(initData)];
    },
    dispose() {
      sessions = {};
    }
  };
})();

var cachedKeySystemAccess = {
  createMediaKeys: () => Promise_.resolve($mediaKeys)
};

function findCompatibleKeySystem(keySystems) {
  // in case we already have mounted a CDM with MediaKeys the
  //
  // NOTE(pierre): alwaysRenew flag is used for IE11 which require the
  // creation of a new MediaKeys instance for each session creation
  if ($keySystem && $mediaKeys && !$mediaKeys.alwaysRenew) {
    var foundKeySystem = _.find(keySystems, ({ type }) => (type == $keySystem));
    if (foundKeySystem) {
      return Promise_.resolve({
        keySystem: foundKeySystem,
        keySystemAccess: cachedKeySystemAccess
      });
    } else {
      throw NotSupportedKeySystemError();
    }
  }

  var keySystemConfigurations = [{ initDataTypes: ["cenc"] }];

  var keySystemsType = _.flatten(keySystems,
    keySystem => _.map(SYSTEMS[keySystem.type], keyType => ({ keyType, keySystem })));

  function testKeySystem(index, res, rej) {
    if (index >= keySystemsType.length)
      return rej(NotSupportedKeySystemError());

    var { keyType, keySystem } = keySystemsType[index];
    requestMediaKeySystemAccess(keyType, keySystemConfigurations)
      .then(
        keySystemAccess => res({ keySystem, keySystemAccess }),
        () => testKeySystem(index + 1, res, rej)
      );
  }

  return new Promise_((res, rej) => testKeySystem(0, res, rej));
}

function createAndSetMediaKeys(video, keySystem, keySystemAccess) {
  return keySystemAccess.createMediaKeys().then(mk => {
    $mediaKeys = mk;
    $keySystem = keySystem.type;
    log.debug("eme: set mediakeys");
    return setMediaKeys(video, mk).then(() => mk);
  });
}

function makeNewKeyRequest(session, initDataType, initData, persistedSessions=false) {
  log.debug("eme: generate request", initDataType, initData, persistedSessions);
  return session.generateRequest(initDataType, initData)
    .then(() => {
      // compat: store sessions only if they have a keyStatuses
      // property
      if (persistedSessions && session.keyStatuses) {
        log.info("eme: store session", session);
        $sessionsStore.set(initData, session);
      }
      return session;
    });
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
function EME(video, keySystems, options={}) {
  if (__DEV__)
    _.each(keySystems, ks => assert.iface(ks, "keySystem", { getLicense: "function", type: "string" }));

  var { persistedSessions } = options;

  function handleEncryptedEvents(encryptedEvent) {
    var initData = new Uint8Array(encryptedEvent.initData);
    var initDataType = encryptedEvent.initDataType;

    log.info("eme: encrypted event", encryptedEvent);

    var compatibleKeySystem = fromPromise(findCompatibleKeySystem(keySystems));
    return compatibleKeySystem.flatMap(({ keySystem, keySystemAccess }) => {
      log.info("eme: compatible keysystem", keySystem.type);

      var mediaKeysCreation = createAndSetMediaKeys(video, keySystem, keySystemAccess);

      return fromPromise(mediaKeysCreation)
        .flatMap((mediaKeys) => {
          // reuse previously created sessions without making a new
          // license request
          var session = $sessionsStore.get(initData);
          if (session) {
            var keyStatuses = session.keyStatuses;
            if (keyStatuses.size > 0) {
              log.debug("eme: reuse session");
              return just(session);
            } else {
              $sessionsStore.delete(initData);
            }
          }

          log.debug("eme: create session");
          session = mediaKeys.createSession("temporary");
          return makeNewKeyRequest(session, initDataType, initData, persistedSessions);
        })
        .flatMap((session) => {
          return handleMessageEvents(session, keySystem, initData);
        });
    });
  }

  // listen to "message" events from session containing a challenge
  // blob and map them to licenses using the getLicense method from
  // selected keySystem
  function handleMessageEvents(session, keySystem, initData) {
    var sessionId;

    var keyErrors = onKeyError(session).map(err => {
      var errMessage = `eme: keyerror event ${err.errorCode} / ${err.systemCode}`;
      log.error(errMessage);
      throw new Error(errMessage);
    });

    var keyStatusesChanges = onKeyStatusesChange(session).flatMap((keyStatusesEvent) => {
      sessionId = keyStatusesEvent.sessionId;

      // find out possible errors associated with this event
      var keyStatuses = session.keyStatuses.values();
      for (var v = keyStatuses.next(); !v.done; v = keyStatuses.next()) {
        var errMessage = KEY_STATUS_ERRORS[v.value];
        if (errMessage) {
          log.error(errMessage);
          throw new Error(errMessage);
        }
      }

      // otherwise use the keysystem handler if disponible
      if (!keySystem.onKeyStatusesChange) {
        log.warn("eme: keystatuseschange event not handled");
        return empty();
      }

      var license;
      try {
        license = keySystem.onKeyStatusesChange(keyStatusesEvent, session);
      } catch(e) {
        license = Observable.throw(e);
      }

      return toObservable(license)
        .catch(err => {
          var errMessage = `eme: onKeyStatusesChange has failed (reason: ${err && err.message || "unknown"})`;
          var error = new Error(errMessage);
          error.reason = err;
          log.error(errMessage);
          throw error;
        });
    });

    var keyMessages = onKeyMessage(session).flatMap((messageEvent) => {
      sessionId = messageEvent.sessionId;

      var { message, messageType } = messageEvent;

      var license;
      try {
        license = keySystem.getLicense(new Uint8Array(message), messageType || "licenserequest");
      } catch(e) {
        license = Observable.throw(e);
      }

      return toObservable(license)
        .catch(err => {
          var errMessage = `eme: getLicense has failed (reason: ${err && err.message || "unknown"})`;
          var error = new Error(errMessage);
          error.reason = err;
          log.error(errMessage);
          throw error;
        });
    });

    var sessionUpdates = merge(keyMessages, keyStatusesChanges)
      .concatMap(res => {
        return session.update(res, sessionId)
          .catch((err) => {
            log.error("eme: error on session update", sessionId, err);
            throw err;
          });
      })
      .map(res => ({ type: "eme", value: { session: session, name: "session-updated" } }));

    return merge(sessionUpdates, keyErrors)
      .tapOnError((err) => {
        log.debug("eme: delete session from store", sessionId);
        $sessionsStore.delete(initData);
      });
  }

  return Observable.create(obs => {
    var sub = onEncrypted(video)
      .take(1)
      .flatMap(handleEncryptedEvents)
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

EME.onEncrypted = video => onEncrypted(video);
EME.getCurrentKeySystem = () => $keySystem;
EME.dispose = () => {
  $mediaKeys = null;
  $keySystem = null;
  $sessionsStore.dispose();
};

module.exports = EME;
