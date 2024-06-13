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

import * as compat from "../../../../compat/can_rely_on_request_media_key_system_access";
import eme from "../../../../compat/eme";
import { testKeySystem } from "../../find_key_system";

describe("find_key_systems - ", () => {
  let requestMediaKeySystemAccessMock: jest.SpyInstance;
  let canRelyOnEMEMock: jest.SpyInstance;
  const keySystem = "com.microsoft.playready.recommendation";

  beforeEach(() => {
    jest.resetModules();
    jest.restoreAllMocks();
    requestMediaKeySystemAccessMock = jest.spyOn(eme, "requestMediaKeySystemAccess");
    canRelyOnEMEMock = jest.spyOn(compat, "canRelyOnRequestMediaKeySystemAccess");
  });

  it("should resolve if the keySystem is supported", async () => {
    /* mock implementation of requestMediaKeySystemAccess that support the keySystem */
    requestMediaKeySystemAccessMock.mockImplementation(() => ({
      createMediaKeys: () => ({
        createSession: () => ({
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          generateRequest: () => {},
        }),
      }),
    }));
    await expect(testKeySystem(keySystem, [])).resolves.toBeTruthy();
    expect(requestMediaKeySystemAccessMock).toHaveBeenCalledTimes(1);
  });

  it("should reject if the keySystem is not supported", async () => {
    /*
    * mock implementation of requestMediaKeySystemAccess that does not support
    * the keySystem
    */
    requestMediaKeySystemAccessMock.mockImplementation(() => {
      throw new Error();
    });
    await expect(testKeySystem(keySystem, [])).rejects.toThrow();
    expect(requestMediaKeySystemAccessMock).toHaveBeenCalledTimes(1);
  });

  /* eslint-disable-next-line max-len */
  it("should reject if the keySystem seems to be supported but the EME workflow fail", async () => {
    /*
     * mock implementation of requestMediaKeySystemAccess that seems to support
     * the keySystem but that is failing when performing the usual EME workflow
     * of creating mediaKeys, creating a session and generating a request.
    */

    canRelyOnEMEMock.mockImplementation(() => false);
    requestMediaKeySystemAccessMock.mockImplementation(() => ({
      createMediaKeys: () => ({
        createSession: () => ({
          generateRequest: () => {
            throw new Error("generateRequest failed");
          },
        }),
      }),
    }));
    await expect(testKeySystem(keySystem, [])).rejects.toThrow();
    expect(requestMediaKeySystemAccessMock).toHaveBeenCalledTimes(1);
  });
});
