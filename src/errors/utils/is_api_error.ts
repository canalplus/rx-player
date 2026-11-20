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

import type { IPlayerError } from "../../public_types.ts";
import EncryptedMediaError from "../public_api/encrypted_media_error.ts";
import { ErrorTypes } from "../public_api/error_codes.ts";
import MediaError from "../public_api/media_error.ts";
import NetworkError from "../public_api/network_error.ts";
import OtherError from "../public_api/other_error.ts";

/**
 * Whether the error given is a ICustomError.
 * @param {Error} error
 * @returns {Boolean}
 */
export default function isApiError(error: unknown): error is IPlayerError {
  return (
    (error instanceof EncryptedMediaError ||
      error instanceof MediaError ||
      error instanceof OtherError ||
      error instanceof NetworkError) &&
    Object.keys(ErrorTypes).indexOf(error.type) >= 0
  );
}
