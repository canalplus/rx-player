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

export type IErrorType = "NETWORK_ERROR" |
                         "MEDIA_ERROR" |
                         "ENCRYPTED_MEDIA_ERROR" |
                         "OTHER_ERROR";

export type IEncryptedMediaErrorCode = "INCOMPATIBLE_KEYSYSTEMS" |
                                       "INVALID_ENCRYPTED_EVENT" |
                                       "INVALID_KEY_SYSTEM" |
                                       "KEY_ERROR" |
                                       "KEY_GENERATE_REQUEST_ERROR" |
                                       "KEY_LOAD_ERROR" |
                                       "KEY_LOAD_TIMEOUT" |
                                       "KEY_STATUS_CHANGE_ERROR" |
                                       "KEY_UPDATE_ERROR" |
                                       "CREATE_MEDIA_KEYS_ERROR" |
                                       "LICENSE_SERVER_CERTIFICATE_ERROR" |
                                       "MEDIA_IS_ENCRYPTED_ERROR" |
                                       "MULTIPLE_SESSIONS_SAME_INIT_DATA";

export type IMediaErrorCode = "BUFFER_APPEND_ERROR" |
                              "BUFFER_FULL_ERROR" |
                              "BUFFER_TYPE_UNKNOWN" |
                              "MANIFEST_INCOMPATIBLE_CODECS_ERROR" |
                              "MANIFEST_PARSE_ERROR" |
                              "MANIFEST_UPDATE_ERROR" |
                              "MANIFEST_UNSUPPORTED_ADAPTATION_TYPE" |
                              "MEDIA_ERR_ABORTED" |
                              "MEDIA_ERR_BLOCKED_AUTOPLAY" |
                              "MEDIA_ERR_PLAY_NOT_ALLOWED" |
                              "MEDIA_ERR_NOT_LOADED_METADATA" |
                              "MEDIA_ERR_DECODE" |
                              "MEDIA_ERR_NETWORK" |
                              "MEDIA_ERR_SRC_NOT_SUPPORTED" |
                              "MEDIA_ERR_UNKNOWN" |
                              "MEDIA_KEYS_NOT_SUPPORTED" |
                              "MEDIA_SOURCE_NOT_SUPPORTED" |
                              "MEDIA_STARTING_TIME_NOT_FOUND" |
                              "MEDIA_TIME_BEFORE_MANIFEST" |
                              "MEDIA_TIME_AFTER_MANIFEST" |
                              "MEDIA_TIME_NOT_FOUND" |
                              "NO_PLAYABLE_REPRESENTATION";

export type INetworkErrorCode = "PIPELINE_LOAD_ERROR";

export type IOtherErrorCode = "PIPELINE_LOAD_ERROR" |
                              "PIPELINE_PARSE_ERROR" |
                              "INTEGRITY_ERROR" |
                              "NONE";

export type IErrorCode = INetworkErrorCode |
                         IMediaErrorCode |
                         IEncryptedMediaErrorCode |
                         IOtherErrorCode;

export type INetworkErrorType = "TIMEOUT" |
                                "ERROR_EVENT" |
                                "PARSE_ERROR" |
                                "ERROR_HTTP_CODE";

const ErrorTypes : Record<IErrorType, IErrorType> = {
  NETWORK_ERROR: "NETWORK_ERROR",
  MEDIA_ERROR: "MEDIA_ERROR",
  ENCRYPTED_MEDIA_ERROR: "ENCRYPTED_MEDIA_ERROR",
  OTHER_ERROR: "OTHER_ERROR",
};

const NetworkErrorTypes : Record<INetworkErrorType, INetworkErrorType> = {
  TIMEOUT: "TIMEOUT",
  ERROR_EVENT: "ERROR_EVENT",
  ERROR_HTTP_CODE: "ERROR_HTTP_CODE",
  PARSE_ERROR: "PARSE_ERROR",
};

const ErrorCodes : Record<IErrorCode, IErrorCode>  = {
  PIPELINE_LOAD_ERROR: "PIPELINE_LOAD_ERROR",
  PIPELINE_PARSE_ERROR: "PIPELINE_PARSE_ERROR",
  INTEGRITY_ERROR: "INTEGRITY_ERROR",

  MANIFEST_PARSE_ERROR: "MANIFEST_PARSE_ERROR",
  MANIFEST_INCOMPATIBLE_CODECS_ERROR: "MANIFEST_INCOMPATIBLE_CODECS_ERROR",
  MANIFEST_UPDATE_ERROR: "MANIFEST_UPDATE_ERROR",
  MANIFEST_UNSUPPORTED_ADAPTATION_TYPE: "MANIFEST_UNSUPPORTED_ADAPTATION_TYPE",

  MEDIA_STARTING_TIME_NOT_FOUND: "MEDIA_STARTING_TIME_NOT_FOUND",
  MEDIA_TIME_BEFORE_MANIFEST: "MEDIA_TIME_BEFORE_MANIFEST",
  MEDIA_TIME_AFTER_MANIFEST: "MEDIA_TIME_AFTER_MANIFEST",
  MEDIA_TIME_NOT_FOUND: "MEDIA_TIME_NOT_FOUND",

  NO_PLAYABLE_REPRESENTATION: "NO_PLAYABLE_REPRESENTATION",

  MEDIA_IS_ENCRYPTED_ERROR: "MEDIA_IS_ENCRYPTED_ERROR",

  CREATE_MEDIA_KEYS_ERROR: "CREATE_MEDIA_KEYS_ERROR",
  KEY_ERROR: "KEY_ERROR",
  KEY_STATUS_CHANGE_ERROR: "KEY_STATUS_CHANGE_ERROR",
  KEY_UPDATE_ERROR: "KEY_UPDATE_ERROR",
  KEY_LOAD_ERROR: "KEY_LOAD_ERROR",
  KEY_LOAD_TIMEOUT: "KEY_LOAD_TIMEOUT",
  KEY_GENERATE_REQUEST_ERROR: "KEY_GENERATE_REQUEST_ERROR",
  INCOMPATIBLE_KEYSYSTEMS: "INCOMPATIBLE_KEYSYSTEMS",
  INVALID_ENCRYPTED_EVENT: "INVALID_ENCRYPTED_EVENT",
  INVALID_KEY_SYSTEM: "INVALID_KEY_SYSTEM",
  LICENSE_SERVER_CERTIFICATE_ERROR: "LICENSE_SERVER_CERTIFICATE_ERROR",
  MULTIPLE_SESSIONS_SAME_INIT_DATA: "MULTIPLE_SESSIONS_SAME_INIT_DATA",

  BUFFER_APPEND_ERROR: "BUFFER_APPEND_ERROR",
  BUFFER_FULL_ERROR: "BUFFER_FULL_ERROR",
  BUFFER_TYPE_UNKNOWN: "BUFFER_TYPE_UNKNOWN",

  MEDIA_ERR_BLOCKED_AUTOPLAY: "MEDIA_ERR_BLOCKED_AUTOPLAY",
  MEDIA_ERR_PLAY_NOT_ALLOWED: "MEDIA_ERR_PLAY_NOT_ALLOWED",
  MEDIA_ERR_NOT_LOADED_METADATA: "MEDIA_ERR_NOT_LOADED_METADATA",

  MEDIA_ERR_ABORTED: "MEDIA_ERR_ABORTED",
  MEDIA_ERR_NETWORK: "MEDIA_ERR_NETWORK",
  MEDIA_ERR_DECODE: "MEDIA_ERR_DECODE",
  MEDIA_ERR_SRC_NOT_SUPPORTED: "MEDIA_ERR_SRC_NOT_SUPPORTED",
  MEDIA_ERR_UNKNOWN: "MEDIA_ERR_UNKNOWN",

  MEDIA_SOURCE_NOT_SUPPORTED: "MEDIA_SOURCE_NOT_SUPPORTED",
  MEDIA_KEYS_NOT_SUPPORTED: "MEDIA_KEYS_NOT_SUPPORTED",

  NONE: "NONE",
};

export {
  ErrorTypes,
  NetworkErrorTypes,
  ErrorCodes,
};
