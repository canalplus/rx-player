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

import listToMap from "../utils/listToMap";

const ErrorTypes = listToMap([
  "NETWORK_ERROR",
  "MEDIA_ERROR",
  "ENCRYPTED_MEDIA_ERROR",
  "INDEX_ERROR",
  "OTHER_ERROR",
]);

const RequestErrorTypes = listToMap([
  "TIMEOUT",
  "ERROR_EVENT",
  "ERROR_HTTP_CODE",
  "PARSE_ERROR",
]);

const ErrorCodes = listToMap([
  "PIPELINE_RESOLVE_ERROR",
  "PIPELINE_LOAD_ERROR",
  "PIPELINE_PARSING_ERROR",

  "MANIFEST_PARSE_ERROR",
  "MANIFEST_INCOMPATIBLE_CODECS_ERROR",

  "MEDIA_IS_ENCRYPTED_ERROR",

  "KEY_ERROR",
  "KEY_STATUS_CHANGE_ERROR",
  "KEY_UPDATE_ERROR",
  "KEY_LOAD_ERROR",
  "KEY_LOAD_TIMEOUT",
  "KEY_GENERATE_REQUEST_ERROR",
  "INCOMPATIBLE_KEYSYSTEMS",
  "LICENSE_SERVER_CERTIFICATE_ERROR",

  "BUFFER_APPEND_ERROR",
  "BUFFER_FULL_ERROR",
  "BUFFER_TYPE_UNKNOWN",

  "MEDIA_ERR_ABORTED",
  "MEDIA_ERR_NETWORK",
  "MEDIA_ERR_DECODE",
  "MEDIA_ERR_SRC_NOT_SUPPORTED",
  "MEDIA_ERR_UNKNOWN",

  "MEDIA_SOURCE_NOT_SUPPORTED",
  "MEDIA_KEYS_NOT_SUPPORTED",

  "OUT_OF_INDEX_ERROR",
  "UNKNOWN_INDEX",
]);

export {
  ErrorTypes,
  RequestErrorTypes,
  ErrorCodes,
};
