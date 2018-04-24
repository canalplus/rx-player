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

import { IMediaKeySession } from "../../compat";

// Data representing a License
type ILicense =
  BufferSource |
  ArrayBuffer |
  ArrayBufferView;

type ISessionManagementEventType =
  "reuse-loaded-session" |
  "loaded-persistent-session";

type ISessionCreationEventType =
  "created-temporary-session" |
  "created-persistent-session";

type IMediaKeyMessageEventType =
  "license-request" |
  "license-renewal" |
  "license-release" |
  "individualization-request" |
  "key-status-change";

interface ISessionRequestEvent {
  type : "generated-request";
  value : {
    session: IMediaKeySession|MediaKeySession;
    sessionInfos: {
      initData: Uint8Array;
      initDataType: string;
    };
  };
}

interface ISessionManagementEvent {
  type : ISessionManagementEventType;
  value : {
    session : IMediaKeySession|MediaKeySession;
    sessionInfos: {
      storedSessionId?: string;
    };
  };
}

interface IMediaKeyMessageEvent {
  type : IMediaKeyMessageEventType;
  value : {
    session : IMediaKeySession|MediaKeySession;
    sessionInfos: {
      license: ILicense;
    };
  };
}

interface ISessionCreationEvent {
  type: ISessionCreationEventType;
  value: {
    session: IMediaKeySession|MediaKeySession;
    sessionInfos: {
      initData: Uint8Array;
      initDataType: string;
    };
  };
}

type ISessionEvent =
  ISessionManagementEvent |
  IMediaKeyMessageEvent |
  ISessionCreationEvent |
  ISessionRequestEvent;

/**
 * Create the Object emitted by the EME Observable.
 * @param {string} type - type of the event
 * @param {MediaKeySession} session - MediaKeySession concerned
 * @param {string} storedSessionId - Supplementary data, will be merged with the
 * session information in the returned object.
 * @returns {Object}
 */
function sessionManagementEvent(
  type: ISessionManagementEventType,
  session: IMediaKeySession|MediaKeySession,
  storedSessionId?: string
): ISessionManagementEvent {
  return {
    type,
    value: {
      session,
      sessionInfos: {
        storedSessionId,
      },
    },
  };
}

function sessionCreationEvent(
  type: ISessionCreationEventType,
  session: IMediaKeySession|MediaKeySession,
  initData: Uint8Array,
  initDataType: string
): ISessionCreationEvent {
  return {
    type,
    value: {
      session,
      sessionInfos: {
        initData,
        initDataType,
      },
    },
  };
}

function sessionRequestEvent(
  type: "generated-request",
  session: IMediaKeySession|MediaKeySession,
  initData: Uint8Array,
  initDataType: string
): ISessionRequestEvent {
  return {
    type,
    value: {
      session,
      sessionInfos: {
        initData,
        initDataType,
      },
    },
  };
}

function mediaKeyMessageEvent(
  type: IMediaKeyMessageEventType,
  session: IMediaKeySession|MediaKeySession,
  license: ILicense
): IMediaKeyMessageEvent {
  return {
    type,
    value: {
      session,
      sessionInfos: {
        license,
      },
    },
  };
}

export {
  IMediaKeyMessageEventType,
  sessionManagementEvent,
  sessionCreationEvent,
  sessionRequestEvent,
  mediaKeyMessageEvent,
  ISessionEvent,
  ISessionRequestEvent,
  ISessionCreationEvent,
  ISessionManagementEvent,
  IMediaKeyMessageEvent
};
