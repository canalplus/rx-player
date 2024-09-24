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

import type { Adaptation, Period, Representation } from "../../manifest";
import type Manifest from "../../manifest";
import type { IPlayerError } from "../../public_types";
import type InitDataValuesContainer from "./utils/init_data_values_container";
import type LoadedSessionsStore from "./utils/loaded_sessions_store";
import type PersistentSessionsStore from "./utils/persistent_sessions_store";

/** Events sent by the `ContentDecryptor`, in a `{ event: payload }` format. */
export interface IContentDecryptorEvent {
  /**
   * Event emitted when a major error occured which made the ContentDecryptor
   * stopped.
   * When that event is sent, the `ContentDecryptor` is in the `Error` state and
   * cannot be used anymore.
   */
  error: Error;

  /**
   * Event emitted when a minor error occured which the ContentDecryptor can
   * recover from.
   */
  warning: IPlayerError;

  /**
   * Event emitted when the `ContentDecryptor`'s state changed.
   * States are a central aspect of the `ContentDecryptor`, be sure to check the
   * ContentDecryptorState type.
   */
  stateChange: ContentDecryptorState;
}

/** Enumeration of the various "state" the `ContentDecryptor` can be in. */
export enum ContentDecryptorState {
  /**
   * The `ContentDecryptor` is not yet ready to create key sessions and request
   * licenses.
   * This is is the initial state of the ContentDecryptor.
   */
  Initializing,

  /**
   * The `ContentDecryptor` has been initialized.
   * You should now called the `attach` method when you want to add decryption
   * capabilities to the HTMLMediaElement. The ContentDecryptor won't go to the
   * `ReadyForContent` state until `attach` is called.
   *
   * For compatibility reasons, this should be done after the HTMLMediaElement's
   * src attribute is set.
   *
   * It is also from when this state is reached that the `ContentDecryptor`'s
   * `systemId` property may be known.
   *
   * This state is always coming after the `Initializing` state.
   */
  WaitingForAttachment,

  /**
   * Content (encrypted or not) can begin to be pushed on the HTMLMediaElement
   * (this state was needed because some browser quirks sometimes forces us to
   * call EME API before this can be done).
   *
   * This state is always coming after the `WaitingForAttachment` state.
   */
  ReadyForContent,

  /**
   * The `ContentDecryptor` has encountered a fatal error and has been stopped.
   * It is now unusable.
   */
  Error,

  /** The `ContentDecryptor` has been disposed of and is now unusable. */
  Disposed,
}

/** Information about the encryption initialization data. */
export interface IProtectionData {
  /**
   * The initialization data type - or the format of the `data` attribute (e.g.
   * "cenc").
   * `undefined` if unknown.
   */
  type: string | undefined;
  /**
   * The key ids linked to those initialization data.
   * This should be the key ids for the key concerned by the media which have
   * the present initialization data.
   *
   * `undefined` when not known (different from an empty array - which would
   * just mean that there's no key id involved).
   */
  keyIds?: Uint8Array[] | undefined;
  /** The content linked to that segment protection data. */
  content?: IContent;
  /** Every initialization data for that type. */
  values: IInitDataValue[];
}

/** Protection initialization data actually processed by the `ContentDecryptor`. */
export interface IProcessedProtectionData extends Omit<IProtectionData, "values"> {
  values: InitDataValuesContainer;
  /**
   * Enforce to recreate the media key session if there is already a session created
   * with this init data
   */
  forceSessionRecreation?: boolean | undefined;
}

/**
 * Represent the initialization data linked to a key system that can be used to
 * generate the license request.
 */
export interface IInitDataValue {
  /**
   * Hex encoded system id, which identifies the key system.
   * https://dashif.org/identifiers/content_protection/
   *
   * If `undefined`, we don't know the system id for that initialization data.
   * In that case, the initialization data might even be a concatenation of
   * the initialization data from multiple system ids.
   */
  systemId: string | undefined;
  /**
   * The initialization data itself for that type and systemId.
   * For example, with "cenc" initialization data found in an ISOBMFF file,
   * this will be the whole PSSH box.
   */
  data: Uint8Array;
}

export type ILicense = BufferSource | ArrayBuffer;

/** Segment protection sent by the RxPlayer to the `ContentDecryptor`. */
export interface IContentProtection {
  /** The content linked to that segment protection data. */
  content: IContent;
  /**
   * Initialization data type.
   * String describing the format of the initialization data sent through this
   * event.
   * https://www.w3.org/TR/eme-initdata-registry/
   */
  type: string;
  /**
   * The key ids linked to those initialization data.
   * This should be the key ids for the key concerned by the media which have
   * the present initialization data.
   *
   * `undefined` when not known (different from an empty array - which would
   * just mean that there's no key id involved).
   */
  keyIds: Uint8Array[] | undefined;
  /** Every initialization data for that type. */
  values: Array<{
    /**
     * Hex encoded system id, which identifies the key system.
     * https://dashif.org/identifiers/content_protection/
     */
    systemId: string;
    /**
     * The initialization data itself for that type and systemId.
     * For example, with "cenc" initialization data found in an ISOBMFF file,
     * this will be the whole PSSH box.
     */
    data: Uint8Array;
  }>;
}

/** Content linked to protection data. */
export interface IContent {
  /** Manifest object associated to the protection data. */
  manifest: Manifest;
  /** Period object associated to the protection data. */
  period: Period;
  /** Adaptation object associated to the protection data. */
  adaptation: Adaptation;
  /** Representation object associated to the protection data. */
  representation: Representation;
}

/** Stores helping to create and retrieve MediaKeySessions. */
export interface IMediaKeySessionStores {
  /** Retrieve MediaKeySessions already loaded on the current MediaKeys instance. */
  loadedSessionsStore: LoadedSessionsStore;
  /** Retrieve persistent MediaKeySessions already created. */
  persistentSessionsStore: PersistentSessionsStore | null;
}

/** Enum identifying the way a new MediaKeySession has been loaded. */
export const enum MediaKeySessionLoadingType {
  /**
   * This MediaKeySession has just been created.
   * This means that it will necessitate a new license request to be generated
   * and performed.
   */
  Created = "created-session",
  /**
   * This MediaKeySession was an already-opened one that is being reused.
   * Such session had already their license loaded and pushed.
   */
  LoadedOpenSession = "loaded-open-session",
  /**
   * This MediaKeySession was a persistent MediaKeySession that has been
   * re-loaded.
   * Such session are linked to a persistent license which should have already
   * been fetched.
   */
  LoadedPersistentSession = "loaded-persistent-session",
}

/** Wrap an Uint8Array and allow serialization of it into base64. */
interface ByteArrayContainer {
  /**
   * The wrapped data.
   * Here named `initData` even when it's not always initialization data for
   * backward-compatible reasons.
   */
  initData: Uint8Array;

  /**
   * Convert it to base64.
   * `toJSON` is specially interpreted by JavaScript engines to be able to rely
   * on it when calling `JSON.stringify` on it or any of its parent objects:
   * https://tc39.es/ecma262/#sec-serializejsonproperty
   */
  toJSON(): string;
}

/**
 * Stored information about a single persistent `MediaKeySession`, when created
 * since the v3.27.0 RxPlayer version included.
 */
export interface IPersistentSessionInfoV4 {
  /** Version for this object. */
  version: 4;

  /** The persisted MediaKeySession's `id`. Used to load it at a later time. */
  sessionId: string;

  /** Type giving information about the format of the initialization data. */
  initDataType: string | undefined;

  /** All key ids linked to that `MediaKeySession`. */
  keyIds: Array<ByteArrayContainer | string>;

  /**
   * Every saved initialization data for that session, used as IDs.
   * Elements are sorted in systemId alphabetical order (putting the `undefined`
   * ones last).
   */
  values: Array<{
    /**
     * Hex encoded system id, which identifies the key system.
     * https://dashif.org/identifiers/content_protection/
     *
     * If `undefined`, we don't know the system id for that initialization data.
     * In that case, the initialization data might even be a concatenation of
     * the initialization data from multiple system ids.
     */
    systemId: string | undefined;
    /**
     * A hash of the initialization data (generated by the `hashBuffer` function,
     * at the time of v3.20.1 at least). Allows for a faster comparison than just
     * comparing initialization data multiple times.
     */
    hash: number;
    /**
     * The initialization data associated to the systemId, wrapped in a
     * container to allow efficient serialization.
     */
    data: ByteArrayContainer | string;
  }>;
}

/**
 * Stored information about a single persistent `MediaKeySession`, when created
 * from the v3.24.0 RxPlayer version included to the v3.26.2 included.
 */
export interface IPersistentSessionInfoV3 {
  /** Version for this object. */
  version: 3;

  /** The persisted MediaKeySession's `id`. Used to load it at a later time. */
  sessionId: string;

  /** Type giving information about the format of the initialization data. */
  initDataType: string | undefined;

  /**
   * Every saved initialization data for that session, used as IDs.
   * Elements are sorted in systemId alphabetical order (putting the `undefined`
   * ones last).
   */
  values: Array<{
    /**
     * Hex encoded system id, which identifies the key system.
     * https://dashif.org/identifiers/content_protection/
     *
     * If `undefined`, we don't know the system id for that initialization data.
     * In that case, the initialization data might even be a concatenation of
     * the initialization data from multiple system ids.
     */
    systemId: string | undefined;
    /**
     * A hash of the initialization data (generated by the `hashBuffer` function,
     * at the time of v3.20.1 at least). Allows for a faster comparison than just
     * comparing initialization data multiple times.
     */
    hash: number;
    /**
     * The initialization data associated to the systemId, wrapped in a
     * container to allow efficient serialization.
     */
    data: ByteArrayContainer | string;
  }>;
}

/**
 * Stored information about a single persistent `MediaKeySession`, when created
 * between the RxPlayer versions v3.21.0 and v3.21.1 included.
 * The previous implementation (version 1) was fine enough but did not serialize
 * well due to it containing an Uint8Array. This data is now wrapped into a
 * container which will convert it to base64 when linearized through
 * `JSON.stringify`.
 */
export interface IPersistentSessionInfoV2 {
  /** Version for this object. */
  version: 2;
  /** The persisted MediaKeySession's `id`. Used to load it at a later time. */
  sessionId: string;
  /**
   * The initialization data associated to the `MediaKeySession`, wrapped in a
   * container to allow efficient linearization.
   */
  initData: ByteArrayContainer;
  /**
   * A hash of the initialization data (generated by the `hashBuffer` function,
   * at the time of v3.20.1 at least). Allows for a faster comparison than just
   * comparing initialization data multiple times.
   */
  initDataHash: number;
  /** Type giving information about the format of the initialization data. */
  initDataType?: string | undefined;
}

/**
 * Stored information about a single persistent `MediaKeySession`, when created
 * in the v3.20.1 RxPlayer version.
 * Add sub-par (as in not performant) collision prevention by setting both
 * the hash of the initialization data and the initialization data itself.
 * The hash could be checked first for a fast comparison, then the full data.
 * Had to do this way because this structure is documented in the API as being
 * put in an array with one element per sessionId.
 * We might implement a HashMap in future versions instead.
 */
export interface IPersistentSessionInfoV1 {
  /** Version for this object. */
  version: 1;
  /** The persisted MediaKeySession's `id`. Used to load it at a later time. */
  sessionId: string;
  /** The initialization data associated to the `MediaKeySession`, untouched. */
  initData: Uint8Array;
  /**
   * A hash of the initialization data (generated by the `hashBuffer` function,
   * at the time of v3.20.1 at least). Allows for a faster comparison than just
   * comparing initialization data multiple times.
   */
  initDataHash: number;
  /** Type giving information about the format of the initialization data. */
  initDataType?: string | undefined;
}

/**
 * Stored information about a single persistent `MediaKeySession`, when created
 * in RxPlayer versions before the v3.20.1
 * Here we have no collision detection. We could theorically load the wrong
 * persistent session.
 */
export interface IPersistentSessionInfoV0 {
  /** Version for this object. Usually not defined here. */
  version?: undefined;
  /** The persisted MediaKeySession's `id`. Used to load it at a later time. */
  sessionId: string;
  /** This initData is a hash of a real one. Here we don't handle collision. */
  initData: number;
  /** Type giving information about the format of the initialization data. */
  initDataType?: string | undefined;
}
