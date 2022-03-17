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

import { ICustomMediaKeys } from "../../compat";
import {
  EncryptedMediaError,
  ICustomError,
  isKnownError,
} from "../../errors";
import log from "../../log";
import ServerCertificateStore from "./utils/server_certificate_store";

/**
 * Call the setServerCertificate API with the given certificate.
 * Resolves on success, rejects on failure.
 *
 * TODO Handle returned value?
 * From the spec:
 *   - setServerCertificate resolves with true if everything worked
 *   - it resolves with false if the CDM does not support server
 *     certificates.
 *
 * @param {MediaKeys} mediaKeys
 * @param {ArrayBuffer} serverCertificate
 * @returns {Promise}
 */
async function setServerCertificate(
  mediaKeys : ICustomMediaKeys|MediaKeys,
  serverCertificate : BufferSource
) : Promise<unknown> {
  try {
    const res = await (mediaKeys as MediaKeys).setServerCertificate(serverCertificate);
    // Note: Even if `setServerCertificate` technically should return a
    // Promise.<boolean>, this is not technically always true.
    // Thus we prefer to return unknown here.
    return res;
  } catch (error) {
    log.warn("DRM: mediaKeys.setServerCertificate returned an error", error);
    const reason = error instanceof Error ? error.toString() :
                                            "`setServerCertificate` error";
    throw new EncryptedMediaError("LICENSE_SERVER_CERTIFICATE_ERROR", reason);
  }
}

/**
 * Call the setCertificate API. If it fails just emit the error as warning
 * and complete.
 * @param {MediaKeys} mediaKeys
 * @param {ArrayBuffer} serverCertificate
 * @returns {Observable}
 */
export default async function trySettingServerCertificate(
  mediaKeys : ICustomMediaKeys|MediaKeys,
  serverCertificate : BufferSource
) : Promise<{ type: "success"; value: unknown } |
            { type: "already-has-one" } |
            { type: "method-not-implemented" } |
            { type: "error"; value: ICustomError }> {
  if (ServerCertificateStore.hasOne(mediaKeys) === true) {
    log.info("DRM: The MediaKeys already has a server certificate, skipping...");
    return { type: "already-has-one" };
  }
  if (typeof mediaKeys.setServerCertificate !== "function") {
    log.warn("DRM: Could not set the server certificate." +
             " mediaKeys.setServerCertificate is not a function");
    return { type: "method-not-implemented" };
  }

  log.info("DRM: Setting server certificate on the MediaKeys");
  // Because of browser errors, or a user action that can lead to interrupting
  // server certificate setting, we might be left in a status where we don't
  // know if we attached the server certificate or not.
  // Calling `prepare` allow to invalidate temporarily that status.
  ServerCertificateStore.prepare(mediaKeys);
  try {
    const result = await setServerCertificate(mediaKeys, serverCertificate);
    ServerCertificateStore.set(mediaKeys, serverCertificate);
    return { type: "success", value: result };
  } catch (error) {
    const formattedErr = isKnownError(error) ?
      error :
      new EncryptedMediaError("LICENSE_SERVER_CERTIFICATE_ERROR",
                              "Unknown error when setting the server certificate.");
    return { type: "error" as const, value: formattedErr };
  }
}

export {
  trySettingServerCertificate,
  setServerCertificate,
};
