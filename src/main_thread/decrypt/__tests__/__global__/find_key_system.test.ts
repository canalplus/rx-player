import { describe, beforeEach, it, expect, vi } from "vitest";
import getEmeApiImplementation from "../../../../compat/eme";
import assert from "../../../../utils/assert";
import { testKeySystem } from "../../find_key_system";

const mocks = vi.hoisted(() => {
  return {
    requestMediaKeySystemAccess: vi.fn(),
    canRelyOnRequestMediaKeySystemAccess: vi.fn(),
  };
});

vi.mock("../../../../compat/can_rely_on_request_media_key_system_access", () => {
  return {
    canRelyOnRequestMediaKeySystemAccess: mocks.canRelyOnRequestMediaKeySystemAccess,
  };
});
vi.mock("../../../../compat/eme", () => ({
  default: () => ({
    onEncrypted: vi.fn(),
    requestMediaKeySystemAccess: mocks.requestMediaKeySystemAccess,
    setMediaKeys: vi.fn(),
  }),
  getInitData: vi.fn(),
  generateKeyRequest: vi.fn(),
  closeSession: vi.fn(),
  loadSession: vi.fn(),
}));

describe("find_key_systems - ", () => {
  const keySystem = "com.microsoft.playready.recommendation";
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mocks.canRelyOnRequestMediaKeySystemAccess.mockReset();
    mocks.requestMediaKeySystemAccess.mockReset();
  });

  it("should resolve if the keySystem is supported", async () => {
    /* mock implementation of requestMediaKeySystemAccess that support the keySystem */
    mocks.requestMediaKeySystemAccess.mockImplementation(() =>
      Promise.resolve({
        createMediaKeys: () => ({
          createSession: () => ({
            generateRequest: () => {
              /* noop */
            },
            close: () => {
              return Promise.resolve();
            },
          }),
        }),
      }),
    );
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null);
    await expect(testKeySystem(eme, keySystem, [])).resolves.toBeTruthy();
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
  });

  it("should reject if the keySystem is not supported", async () => {
    /* mock implementation of requestMediaKeySystemAccess that does not support the keySystem */
    mocks.requestMediaKeySystemAccess.mockImplementation(() => {
      throw new Error();
    });
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null);
    await expect(testKeySystem(eme, keySystem, [])).rejects.toThrow();
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
  });

  it("should reject if the keySystem seems to be supported but the EME workflow fail", async () => {
    /*  mock implementation of requestMediaKeySystemAccess that seems to support the keySystem
    but that is failing when performing the usual EME workflow of creating mediaKeys, creating a session
    and generating a request. */

    mocks.canRelyOnRequestMediaKeySystemAccess.mockImplementation(() => false);
    mocks.requestMediaKeySystemAccess.mockImplementation(() =>
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
    const eme = getEmeApiImplementation("auto");
    assert(eme !== null);
    await expect(testKeySystem(eme, keySystem, [])).rejects.toThrow();
    expect(mocks.requestMediaKeySystemAccess).toHaveBeenCalledTimes(1);
  });
});
