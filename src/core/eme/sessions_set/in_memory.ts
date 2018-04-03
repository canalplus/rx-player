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

import arrayFind = require("array-find");
import { Observable } from "rxjs/Observable";
import { ConnectableObservable } from "rxjs/observable/ConnectableObservable";
import { Subscription } from "rxjs/Subscription";
import { IMediaKeySession } from "../../../compat";
import castToObservable from "../../../utils/castToObservable";
import log from "../../../utils/log";
import { ISessionEvent } from "../session";
import hashInitData from "./hash_init_data";

// Cached data for a single MediaKeySession
interface ISessionData {
  initData : number;
  session : IMediaKeySession|MediaKeySession;
  eventSubscription : Subscription;
}

/**
 * Cache linking initData to a single MediaKeySession.
 *
 * TODO Maximum cache length
 * TODO Either this is a cache and it does not interact with the MediaKeySession
 * (like closing them or subscribing to its events) or it manages them and it
 * should be some kind of wrapper on it.
 * The problem with implementing a cache with a maximum size is that we don't
 * know if the oldest MediaKeySession is used, so we cannot close it.
 *
 * @class MediaKeySessionCache
 */
export default class MediaKeySessionCache {
  private _entries : ISessionData[];

  constructor() {
    this._entries = [];
  }

  /**
   * Get oldest MediaKeySession cached.
   * @returns {MediaKeySession|undefined}
   */
  public getOldest() : IMediaKeySession|MediaKeySession|undefined {
    if (!this._entries.length) {
      return undefined;
    }
    return this._entries[0].session;
  }

  /**
   * Get the MediaKeySession linked to an initData.
   * null if no MediaKeySession with this initData is stored.
   *
   * @param {number|Uint8Array} initData
   * @returns {MediaKeySession|null}
   */
  public get(initData : number|Uint8Array) : IMediaKeySession|MediaKeySession|null {
    const hash = hashInitData(initData);
    const entry = arrayFind(this._entries, (e) => e.initData === hash);
    if (entry) {
      return entry.session;
    } else {
      return null;
    }
  }

  /**
   * Adds a new MediaKeySession and start subscription to its events.
   *
   * TODO Manage event subscription elsewhere.
   * @param {Uint8Array|Array.<number>|number} initData
   * @param {MediaKeySession} session
   * @param {ConnectableObservable} sessionEvents
   */
  public add(
    initData : Uint8Array|number[]|number,
    session : IMediaKeySession|MediaKeySession,
    sessionEvents : ConnectableObservable<Event|ISessionEvent>
  ) : void {
    const hash = hashInitData(initData);

    const currentSession = this.get(hash);
    if (currentSession) {
      this.delete(currentSession);
      currentSession.close() // TODO we shouldn't close sessions like that here
        .then(() => {
          log.debug("closed MediaKeySession", session);
        })
        .catch(() => {
          log.warn("Failed to close MediaKeySession", session);
        });
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
   * Delete Session reference from this cache and unsubscribe to its events by
   * giving its sessionId.
   *
   * Returns true if the given session has been found and deleted, false
   * otherwise.
   *
   * @param {string} sessionId
   * @returns {MediaKeySession|null}
   */
  public deleteById(sessionId : string) : boolean {
    const entry = arrayFind(this._entries,(e) => e.session.sessionId === sessionId);

    if (entry) {
      return this.delete(entry.session);
    } else {
      return false;
    }
  }

  /**
   * Delete Session reference from this cache and unsubscribe to its events by
   * giving its session.
   *
   * Returns true if the given session has been found and deleted, false
   * otherwise.
   *
   * /!\ Doesn't close the session
   *
   * TODO merge with deleteById?
   * TODO Manage event subscription elsewhere.
   * @param {MediaKeySession} session_
   * @returns {boolean}
   */
  public delete(
    session_ : IMediaKeySession|MediaKeySession
  ) : boolean {
    const entry = arrayFind(this._entries, (e) => e.session === session_);
    if (!entry) {
      return false;
    }

    const { eventSubscription } = entry;
    log.debug("eme-mem-store: delete session", entry);
    const idx = this._entries.indexOf(entry);
    this._entries.splice(idx, 1);
    eventSubscription.unsubscribe();
    return true;
  }

  /**
   * Free up all ressources taken by this class:
   *   - stop subscribing to the events of all sessions
   *   - Close the corresponding session
   *   - remove their reference
   *
   * @returns {Observable}
   */
  public dispose() : Observable<void|null> {
    const disposed = this._entries.map(({ session }) => {
      this.delete(session);
      return castToObservable(session.close())
        .catch(() => Observable.of(undefined));
    });
    this._entries = [];
    return Observable.merge(...disposed);
  }
}
