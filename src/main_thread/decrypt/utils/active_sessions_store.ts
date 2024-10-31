import type { BlacklistedSessionError } from "../session_events_listener";
import type { MediaKeySessionLoadingType } from "../types";
import type KeySessionRecord from "./key_session_record";

/**
 * Contains information about all key sessions loaded for the current
 * content.
 * This object is most notably used to check which keys are already obtained,
 * thus avoiding to perform new unnecessary license requests and CDM
 * interactions.
 *
 * It is important to create only one `ActiveSessionsStore` for a given
 * `MediaKeys` to prevent conflicts.
 *
 * An `ActiveSessionsStore` instance can also be "marked" as full with the
 * `markAsFull` method.
 * "Marking as full" this way does not change your ability do add new session,
 * but the `isFull` method will return `true` until at least a single session is
 * removed from this `ActiveSessionsInfo`.
 * This "full" flag allows to simplify overflowing MediaKeySession management, by
 * storing in a single place whether this event has been encountered and whether
 * it had chance to be resolved since.
 *
 * @class ActiveSessionsInfo
 */
export default class ActiveSessionsStore {
  /** Metadata on each `MediaKeySession` stored here. */
  private _sessions: IActiveSessionInfo[];

  /**
   * `true` after the `markAsFull` method has been called, until `removeSession`
   * is called **and** led to a `MediaKeySession` has been removed.
   *
   * This boolean has no impact on the creation of new `MediaKeySession`, it is
   * only here as a flag to indicate that an overflow of `MediaKeySession`
   * linked to this `ActiveSessionsStore` has been detected and only resets to
   * `false` when it has chances to be resolved (when a `MediaKeySession` has
   * since been removed).
   */
  private _isFull: boolean;

  constructor() {
    this._sessions = [];
    this._isFull = false;
  }

  /**
   * Set the `isFull` flag to true meaning that the `isFull` method will from
   * now on return `true` until at least one `MediaKeySession` has been removed
   * from this `ActiveSessionsStore` (through the `removeSession` method).
   *
   * This flag allows to store the information of whether an "overflow" of
   * active `MediaKeySession` has been detected.
   */
  public markAsFull(): void {
    this._isFull = true;
  }

  /**
   * Add a new `MediaKeySession`, and its associated information, to the
   * `ActiveSessionsStore`.
   * @param {Object} sessionInfo
   */
  public addSession(sessionInfo: IActiveSessionInfo) {
    this._sessions.push(sessionInfo);
  }

  /**
   * Returns all information in the `ActiveSessionsStore` by order of insertion.
   * @returns {Array.<Object>}
   */
  public getSessions(): IActiveSessionInfo[] {
    return this._sessions;
  }

  /**
   * Remove element with the corresponding `MediaKeySession` information from
   * the `ActiveSessionsStore` if found.
   *
   * Returns `true` if the corresponding element has been found and removed, or
   * `false` if it wasn't found.
   *
   * @param {Object} sessionInfo
   * @returns {boolean}
   */
  public removeSession(sessionInfo: IActiveSessionInfo): boolean {
    const indexOf = this._sessions.indexOf(sessionInfo);
    if (indexOf >= 0) {
      this._sessions.splice(indexOf, 1);
      this._isFull = false;
      return true;
    }
    return false;
  }

  /**
   * If `true`, we know that there's too much `MediaKeySession` currently
   * created and we thus cannot create any more.
   *
   * Supplementary "overflowing" initialization data may in this state awaiting
   * in one of the `ContentDecryptor`'s queue.
   *
   * If `false` we've either have less `MediaKeySession` active than the
   * current limit currently or we don't know whether we reached the limit
   * yet.
   * @returns {boolean}
   */
  public isFull(): boolean {
    return this._isFull;
  }
}

/** Information linked to a session created by the `ContentDecryptor`. */
export interface IActiveSessionInfo {
  /**
   * Record associated to the session.
   * Most notably, it allows both to identify the session as well as to
   * anounce and find out which key ids are already handled.
   */
  record: KeySessionRecord;

  /** Current keys' statuses linked that session. */
  keyStatuses: {
    /** Key ids linked to keys that are "usable". */
    whitelisted: Uint8Array[];
    /**
     * Key ids linked to keys that are not considered "usable".
     * Content linked to those keys are not decipherable and may thus be
     * fallbacked from.
     */
    blacklisted: Uint8Array[];
  };

  /** Source of the MediaKeySession linked to that record. */
  source: MediaKeySessionLoadingType;

  /**
   * If different than `null`, all initialization data compatible with this
   * processed initialization data has been blacklisted with this corresponding
   * error.
   */
  blacklistedSessionError: BlacklistedSessionError | null;
}
