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

import CustomLoaderError from "./custom_loader_error";
import type { ISerializedEncryptedMediaError } from "./encrypted_media_error";
import EncryptedMediaError from "./encrypted_media_error";
import type { IErrorCode, IErrorType, INetworkErrorType } from "./error_codes";
import { ErrorCodes, ErrorTypes, NetworkErrorTypes } from "./error_codes";
import formatError from "./format_error";
import isKnownError from "./is_known_error";
import type { ISerializedMediaError } from "./media_error";
import MediaError from "./media_error";
import type { ISerializedNetworkError } from "./network_error";
import NetworkError from "./network_error";
import type { ISerializedOtherError } from "./other_error";
import OtherError from "./other_error";
import SourceBufferError from "./source_buffer_error";

export type {
  IErrorCode,
  IErrorType,
  INetworkErrorType,
  ISerializedMediaError,
  ISerializedNetworkError,
  ISerializedEncryptedMediaError,
  ISerializedOtherError,
};
export {
  CustomLoaderError,
  EncryptedMediaError,
  SourceBufferError,
  ErrorCodes,
  ErrorTypes,
  formatError,
  MediaError,
  NetworkError,
  OtherError,
  NetworkErrorTypes,
  isKnownError,
};
