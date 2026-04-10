import { describe, beforeEach, it, expect, vi } from "vitest";
import getEmeApiImplementation from "../../../../compat/eme";
import { EncryptedMediaError } from "../../../../errors";
import type { IKeySystemOption } from "../../../../public_types";
import assert from "../../../../utils/assert";
import { getMissingKeyIds } from "../../content_decryptor";
import { ContentDecryptorState } from "../../types";
import { defaultKSConfig, mockCompat } from "./utils";

const mocks = vi.hoisted(() => {
  return {
    shouldRenewMediaKeySystemAccess: vi.fn(() => false),
    canReuseMediaKeys: vi.fn(() => true),
    onEncrypted: vi.fn(),
    requestMediaKeySystemAccess: vi.fn(),
    setMediaKeys: vi.fn(),
    getInitData: vi.fn(),
    generateKeyRequest: vi.fn(),
  };
});
vi.mock("../../../../compat/should_renew_media_key_system_access", () => ({
  default: mocks.shouldRenewMediaKeySystemAccess,
}));
vi.mock("../../../../compat/can_reuse_media_keys", () => ({
  default: mocks.canReuseMediaKeys,
}));
vi.mock("../../../../compat/eme", () => ({
  default: () => ({
    onEncrypted: mocks.onEncrypted,
    requestMediaKeySystemAccess: mocks.requestMediaKeySystemAccess,
    setMediaKeys: mocks.setMediaKeys,
  }),
  getInitData: mocks.getInitData,
  generateKeyRequest: mocks.generateKeyRequest,
  closeSession: vi.fn(),
  loadSession: vi.fn(),
}));

describe("content_decryptor - blacklist missing key Ids", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mocks.shouldRenewMediaKeySystemAccess.mockReset();
    mocks.canReuseMediaKeys.mockReset();
    mocks.onEncrypted.mockReset();
    mocks.requestMediaKeySystemAccess.mockReset();
    mocks.setMediaKeys.mockReset();
    mocks.getInitData.mockReset();
    mocks.generateKeyRequest.mockReset();
  });

  it("should return an empty array if actualKeyIds contains all expectedKeyIds", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
    ];
    const actualKeyIds = [new Uint8Array([1]), new Uint8Array([2]), new Uint8Array([3])];

    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual([]);
  });

  it("should return expectedKeyIds if actualKeyIds does not contain them", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
    ];
    const actualKeyIds: Uint8Array[] = []; // Empty array, none of the expectedKeyIds are present

    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual(expectedKeyIds);
  });

  it("should return only the missing key IDs from expectedKeyIds", () => {
    const expectedKeyIds = [
      new Uint8Array([1]),
      new Uint8Array([2]),
      new Uint8Array([3]),
      new Uint8Array([4]),
    ];
    const actualKeyIds = [new Uint8Array([1]), new Uint8Array([3])]; // Missing [2] and [4]
    const result = getMissingKeyIds(expectedKeyIds, actualKeyIds);
    expect(result).toEqual([new Uint8Array([2]), new Uint8Array([4])]);
  });
});

describe("content_decryptor - session decommissioning", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    mocks.shouldRenewMediaKeySystemAccess.mockReset();
    mocks.canReuseMediaKeys.mockReset();
    mocks.onEncrypted.mockReset();
    mocks.requestMediaKeySystemAccess.mockReset();
    mocks.setMediaKeys.mockReset();
    mocks.getInitData.mockReset();
    mocks.generateKeyRequest.mockReset();
  });

  it("should only remove the decommissioned session from tracked sessions", async () => {
    vi.resetModules();
    const videoElt = document.createElement("video");
    mockCompat(mocks);
    const sessionCallbacks: Array<{ onError: (err: unknown) => void }> = [];
    vi.doMock("../../session_events_listener", () => ({
      __esModule: true,
      default: vi.fn(
        (_session: unknown, _options: unknown, _access: unknown, callbacks: unknown) => {
          sessionCallbacks.push(callbacks as { onError: (err: unknown) => void });
        },
      ),
      BlacklistedSessionError: class BlacklistedSessionError extends Error {},
    }));
    const { DecommissionedSessionError } = await import("../../utils/check_key_statuses");
    const { default: ContentDecryptor } = await import("../../content_decryptor");

    const mockGetLicense = vi.fn(() => Promise.resolve(new Uint8Array([1, 2, 3, 4])));
    const ksConfig: IKeySystemOption[] = [
      {
        type: "com.widevine.alpha",
        getLicense: mockGetLicense,
        onKeyInternalError: "close-session",
      },
    ];

    const eme = getEmeApiImplementation("auto");
    assert(eme !== null, "Expected to have an EME implementation");
    const contentDecryptor = new ContentDecryptor(eme, videoElt, ksConfig);

    await new Promise<void>((res, rej) => {
      contentDecryptor.addEventListener("stateChange", (state) => {
        if (state !== ContentDecryptorState.WaitingForAttachment) {
          rej(new Error(`Unexpected state: ${state}`));
          return;
        }
        contentDecryptor.removeEventListener("stateChange");
        contentDecryptor.attach();
        res();
      });
    });

    contentDecryptor.onInitializationData({
      type: "cenc",
      values: [{ systemId: "15", data: new Uint8Array([1, 1, 1]) }],
    });
    contentDecryptor.onInitializationData({
      type: "cenc",
      values: [{ systemId: "15", data: new Uint8Array([2, 2, 2]) }],
    });
    contentDecryptor.onInitializationData({
      type: "cenc",
      values: [{ systemId: "15", data: new Uint8Array([3, 3, 3]) }],
    });

    await new Promise((res) => setTimeout(res, 120));

    expect(
      (contentDecryptor as unknown as { _currentSessions: unknown[] })._currentSessions,
    ).toHaveLength(3);

    sessionCallbacks[1].onError(
      new DecommissionedSessionError(
        new EncryptedMediaError("KEY_LOAD_ERROR", "forced decommissioning", {
          keyStatuses: undefined,
          keySystemConfiguration: defaultKSConfig[0],
          keySystem: "com.widevine.alpha",
        }),
      ),
    );
    await new Promise((res) => setTimeout(res, 30));

    expect(
      (contentDecryptor as unknown as { _currentSessions: unknown[] })._currentSessions,
    ).toHaveLength(2);

    contentDecryptor.dispose(undefined);
  });
});
