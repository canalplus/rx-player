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

import log from "../../../utils/log";
import { castToObservable } from "../../../utils/rx-utils";
import SessionSet from "./abstract.js";
import hashInitData from "./hash_init_data.js";

/**
 * Set maintaining a representation of all currently loaded
 * MediaKeySessions. This set allow to reuse sessions without re-
 * negotiating a license exchange if the key is already used in a
 * loaded session.
 */
export default class InMemorySessionsSet extends SessionSet {

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
    return Observable.merge.apply(null, disposed);
  }
}
