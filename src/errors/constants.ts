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

const ErrorTypes = {
  NETWORK_ERROR: "NETWORK_ERROR",
  MEDIA_ERROR: "MEDIA_ERROR",
  ENCRYPTED_MEDIA_ERROR: "ENCRYPTED_MEDIA_ERROR",
  OTHER_ERROR: "OTHER_ERROR",
};

const RequestErrorTypes = {
  TIMEOUT: "TIMEOUT",
  ERROR_EVENT: "ERROR_EVENT",
  ERROR_HTTP_CODE: "ERROR_HTTP_CODE",
  PARSE_ERROR: "PARSE_ERROR",
};

const ErrorCodes = {
  PIPELINE_RESOLVE_ERROR: "PIPELINE_RESOLVE_ERROR",
  PIPELINE_LOAD_ERROR: "PIPELINE_LOAD_ERROR",
  PIPELINE_PARSING_ERROR: "PIPELINE_PARSING_ERROR",

  MANIFEST_PARSE_ERROR: "MANIFEST_PARSE_ERROR",
  MANIFEST_INCOMPATIBLE_CODECS_ERROR: "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
  MANIFEST_UNSUPPORTED_ADAPTATION_TYPE: "MANIFEST_UNSUPPORTED_ADAPTATION_TYPE",

  MEDIA_STARTING_TIME_NOT_FOUND: "MEDIA_STARTING_TIME_NOT_FOUND",
  MEDIA_TIME_NOT_FOUND: "MEDIA_TIME_NOT_FOUND",

  MEDIA_IS_ENCRYPTED_ERROR: "MEDIA_IS_ENCRYPTED_ERROR",

  KEY_ERROR: "KEY_ERROR",
  KEY_STATUS_CHANGE_ERROR: "KEY_STATUS_CHANGE_ERROR",
  KEY_UPDATE_ERROR: "KEY_UPDATE_ERROR",
  KEY_LOAD_ERROR: "KEY_LOAD_ERROR",
  KEY_LOAD_TIMEOUT: "KEY_LOAD_TIMEOUT",
  KEY_GENERATE_REQUEST_ERROR: "KEY_GENERATE_REQUEST_ERROR",
  INCOMPATIBLE_KEYSYSTEMS: "INCOMPATIBLE_KEYSYSTEMS",
  LICENSE_SERVER_CERTIFICATE_ERROR: "LICENSE_SERVER_CERTIFICATE_ERROR",

  BUFFER_APPEND_ERROR: "BUFFER_APPEND_ERROR",
  BUFFER_FULL_ERROR: "BUFFER_FULL_ERROR",
  BUFFER_TYPE_UNKNOWN: "BUFFER_TYPE_UNKNOWN",

  MEDIA_ERR_BLOCKED_AUTOPLAY: "MEDIA_ERR_BLOCKED_AUTOPLAY",

  MEDIA_ERR_ABORTED: "MEDIA_ERR_ABORTED",
  MEDIA_ERR_NETWORK: "MEDIA_ERR_NETWORK",
  MEDIA_ERR_DECODE: "MEDIA_ERR_DECODE",
  MEDIA_ERR_SRC_NOT_SUPPORTED: "MEDIA_ERR_SRC_NOT_SUPPORTED",
  MEDIA_ERR_UNKNOWN: "MEDIA_ERR_UNKNOWN",

  MEDIA_SOURCE_NOT_SUPPORTED: "MEDIA_SOURCE_NOT_SUPPORTED",
  MEDIA_KEYS_NOT_SUPPORTED: "MEDIA_KEYS_NOT_SUPPORTED",
};

export {
  ErrorTypes,
  RequestErrorTypes,
  ErrorCodes,
};
