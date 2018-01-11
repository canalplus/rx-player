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

import { Observable } from "rxjs/Observable";
import { ConnectableObservable } from "rxjs/observable/ConnectableObservable";
import { Subscription } from "rxjs/Subscription";

import castToObservable from "../../../utils/castToObservable";
import log from "../../../utils/log";
import { ISessionEvent } from "../session";
import SessionSet from "./abstract";
import hashInitData from "./hash_init_data";

// Cached data for a single MediaKeySession
interface ISessionData {
  initData : number;
  session : MediaKeySession;
  eventSubscription : Subscription;
}

/**
 * Set maintaining a representation of all currently loaded
 * MediaKeySessions. This set allow to reuse sessions without re-
 * negotiating a license exchange if the key is already used in a
 * loaded session.
 * @class InMemorySessionsSet
 * @extends SessionSet
 */
export default class InMemorySessionsSet extends SessionSet<ISessionData> {
  /**
   * @returns {MediaKeySession|undefined}
   */
  getFirst() : MediaKeySession|undefined {
    if (this._entries.length > 0) {
      return this._entries[0].session;
    }
  }

  /**
   * @param {Function} func
   * @returns {Object|null}
   */
  find(func : (x : ISessionData) => boolean) : ISessionData|null {
    for (let i = 0; i < this._entries.length; i++) {
      if (func(this._entries[i])) {
        return this._entries[i];
      }
    }
    return null;
  }

  /**
   * @param {number|Uint8Array} initData
   * @returns {MediaKeySession|null}
   */
  get(initData : number|Uint8Array) : MediaKeySession|null {
    const hash = hashInitData(initData);
    const entry = this.find((e) => e.initData === hash);
    if (entry) {
      return entry.session;
    } else {
      return null;
    }
  }

  /**
   * @param {Uint8Array|Array.<number>|number} initData
   * @param {MediaKeySession} session
   * @param {ConnectableObservable} sessionEvents
   */
  add(
    initData : Uint8Array|number[]|number,
    session : MediaKeySession,
    sessionEvents : ConnectableObservable<Event|ISessionEvent>
  ) : void {
    const hash = hashInitData(initData);
    const currentSession = this.get(hash);
    if (currentSession) {
      this.deleteAndClose(currentSession);
    }

    const eventSubscription = sessionEvents.connect();
    const entry = {
      session,
      initData: hash,
      eventSubscription,
    };
    log.debug("eme-mem-store: add session", entry);
    this._entries.push(entry);
  }

  /**
   * @param {string} sessionId
   * @returns {MediaKeySession|null}
   */
  deleteById(sessionId : string) : MediaKeySession|null {
    const entry = this.find((e) => e.session.sessionId === sessionId);
    if (entry) {
      return this.delete(entry.session);
    } else {
      return null;
    }
  }

  /**
   * @param {MediaKeySession} session_
   * @returns {MediaKeySession|null}
   */
  delete(session_ : MediaKeySession) : MediaKeySession|null {
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

  /**
   * @param {MediaKeySession} session_
   * @returns {Observable}
   */
  deleteAndClose(session_ : MediaKeySession) : Observable<void|null> {
    const session = this.delete(session_);
    if (session) {
      log.debug("eme-mem-store: close session", session);

      // TODO This call will be active as soon as this line is read. We should
      // probably defer the call on subscription
      return castToObservable(session.close())
        .catch(() => Observable.of(null));
    } else {
      return Observable.of(null);
    }
  }

  /**
   * @returns {Observable}
   */
  dispose() : Observable<void|null> {
    const disposed = this._entries.map((e) => this.deleteAndClose(e.session));
    this._entries = [];
    return Observable.merge(...disposed);
  }
}
