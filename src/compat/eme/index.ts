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

import closeSession from "./close_session";
import CustomMediaKeySystemAccess, {
  ICustomMediaKeySystemAccess,
} from "./custom_key_system_access";
import {
  ICustomMediaKeys,
  ICustomMediaKeySession,
  requestMediaKeySystemAccess,
  setMediaKeys,
} from "./custom_media_keys";
import generateKeyRequest from "./generate_key_request";
import getInitData, {
  IEncryptedEventData,
} from "./get_init_data";
import loadSession from "./load_session";

export {
  closeSession,
  CustomMediaKeySystemAccess,
  generateKeyRequest,
  getInitData,
  loadSession,
  ICustomMediaKeySession,
  ICustomMediaKeySystemAccess,
  ICustomMediaKeys,
  IEncryptedEventData,
  requestMediaKeySystemAccess,
  setMediaKeys,
};
