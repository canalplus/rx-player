import type { MockInstance } from "vitest";
import { describe, beforeEach, it, expect, vi } from "vitest";
import * as compat from "../../../../compat/can_rely_on_request_media_key_system_access";
import { testKeySystem } from "../../find_key_system";

/* eslint-disable @typescript-eslint/no-explicit-any */

describe("find_key_systems - ", () => {
  let requestMediaKeySystemAccessMock: MockInstance<
    [_type: string, _config: MediaKeySystemConfiguration[]],
    Promise<any>
  >;
  let canRelyOnEMEMock: MockInstance;
  const keySystem = "com.microsoft.playready.recommendation";
  const eme = {
    implementation: "standard",
    requestMediaKeySystemAccess: (
      _type: string,
      _config: MediaKeySystemConfiguration[],
    ): Promise<any> => Promise.reject(new Error("Unimplemented")),
    onEncrypted: () => {
      /* noop */
    },
    setMediaKeys: () => Promise.reject(new Error("Unimplemented")),
  } as const;

  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    requestMediaKeySystemAccessMock = vi.spyOn(eme, "requestMediaKeySystemAccess");
    canRelyOnEMEMock = vi.spyOn(compat, "canRelyOnRequestMediaKeySystemAccess");
  });

  it("should resolve if the keySystem is supported", async () => {
    /* mock implementation of requestMediaKeySystemAccess that support the keySystem */
    requestMediaKeySystemAccessMock.mockImplementation(() =>
      Promise.resolve({
        createMediaKeys: () => ({
          createSession: () => ({
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            generateRequest: () => {},
          }),
        }),
      }),
    );
    await expect(testKeySystem(eme, keySystem, [])).resolves.toBeTruthy();
    expect(requestMediaKeySystemAccessMock).toHaveBeenCalledTimes(1);
  });

  it("should reject if the keySystem is not supported", async () => {
    /* mock implementation of requestMediaKeySystemAccess that does not support the keySystem */
    requestMediaKeySystemAccessMock.mockImplementation(() => {
      throw new Error();
    });
    await expect(testKeySystem(eme, keySystem, [])).rejects.toThrow();
    expect(requestMediaKeySystemAccessMock).toHaveBeenCalledTimes(1);
  });

  it("should reject if the keySystem seems to be supported but the EME workflow fail", async () => {
    /*  mock implementation of requestMediaKeySystemAccess that seems to support the keySystem
    but that is failing when performing the usual EME workflow of creating mediaKeys, creating a session
    and generating a request. */

    canRelyOnEMEMock.mockImplementation(() => false);
    requestMediaKeySystemAccessMock.mockImplementation(() =>
      Promise.resolve({
        createMediaKeys: () => ({
          createSession: () => ({
            generateRequest: () => {
              throw new Error("generateRequest failed");
            },
          }),
        }),
      }),
    );
    await expect(testKeySystem(eme, keySystem, [])).rejects.toThrow();
    expect(requestMediaKeySystemAccessMock).toHaveBeenCalledTimes(1);
  });
});
