import type { MockInstance } from "vitest";
import { describe, beforeEach, it, expect, vi } from "vitest";
import * as compat from "../../../../compat/can_rely_on_request_media_key_system_access";
import eme from "../../../../compat/eme";
import noop from "../../../../utils/noop";
import { testKeySystem } from "../../find_key_system";

describe("find_key_systems - ", () => {
  let requestMediaKeySystemAccessMock: MockInstance;
  let canRelyOnEMEMock: MockInstance;
  const keySystem = "com.microsoft.playready.recommendation";

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    requestMediaKeySystemAccessMock = vi.spyOn(eme, "requestMediaKeySystemAccess");
    canRelyOnEMEMock = vi.spyOn(compat, "canRelyOnRequestMediaKeySystemAccess");
  });

  it("should resolve if the keySystem is supported", async () => {
    /* mock implementation of requestMediaKeySystemAccess that support the keySystem */
    requestMediaKeySystemAccessMock.mockImplementation(() => ({
      createMediaKeys: () => ({
        createSession: () => ({
          generateRequest: () => noop,
        }),
      }),
    }));
    await expect(testKeySystem(keySystem, [])).resolves.toBeTruthy();
    expect(requestMediaKeySystemAccessMock).toHaveBeenCalledTimes(1);
  });

  it("should reject if the keySystem is not supported", async () => {
    /* mock implementation of requestMediaKeySystemAccess that does not support the keySystem */
    requestMediaKeySystemAccessMock.mockImplementation(() => {
      throw new Error();
    });
    await expect(testKeySystem(keySystem, [])).rejects.toThrow();
    expect(requestMediaKeySystemAccessMock).toHaveBeenCalledTimes(1);
  });

  it("should reject if the keySystem seems to be supported but the EME workflow fail", async () => {
    /*  mock implementation of requestMediaKeySystemAccess that seems to support the keySystem
    but that is failing when performing the usual EME workflow of creating mediaKeys, creating a session
    and generating a request. */

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
