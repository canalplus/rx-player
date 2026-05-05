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

import getEmeApiImplementation from "../../../../compat/eme/index.ts";
import log from "../log.ts";

type IMediaKeyStatus =
  | "usable"
  | "expired"
  | "released"
  | "output-restricted"
  | "output-downscaled"
  | "status-pending"
  | "internal-error";

/**
 * @param {string} hdcpVersion
 * @returns {Promise}
 */
export default async function probeHDCPPolicy(
  hdcpVersion: string,
): Promise<"Supported" | "NotSupported"> {
  const eme = getEmeApiImplementation("auto");

  if (eme === null) {
    return Promise.reject(new Error("EME API not available"));
  }

  const hdcpString = "hdcp-" + hdcpVersion;
  const policy = { minHdcpVersion: hdcpString };

  const keySystem = "org.w3.clearkey";
  const drmConfig = {
    initDataTypes: ["cenc"],
    audioCapabilities: [
      {
        contentType: 'audio/mp4;codecs="mp4a.40.2"',
      },
    ],
    videoCapabilities: [
      {
        contentType: 'video/mp4;codecs="avc1.42E01E"',
      },
    ],
  };

  const mediaKeysSystemAccess = await eme.requestMediaKeySystemAccess(keySystem, [
    drmConfig,
  ]);

  const mediaKeys = await mediaKeysSystemAccess.createMediaKeys();
  if (!("getStatusForPolicy" in mediaKeys)) {
    log.error(
      "MediaCapabilitiesProber",
      "`MediaKeys.prototype.getStatusForPolicy` API is not available",
    );
    throw new Error("MediaKeys.prototype.getStatusForPolicy` API is not available");
  }
  const result = await (
    mediaKeys as {
      getStatusForPolicy: (policy: {
        minHdcpVersion: string;
      }) => Promise<IMediaKeyStatus>;
    }
  ).getStatusForPolicy(policy);
  if (result === "usable") {
    return "Supported";
  } else {
    return "NotSupported";
  }
}
