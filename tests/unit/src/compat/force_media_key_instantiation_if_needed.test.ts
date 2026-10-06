import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  IMediaKeySession,
  IMediaKeySystemAccess,
  IMediaKeys,
} from "../../../../src/compat/browser_compatibility_types.ts";
import EnvDetector, {
  mockEnvironment,
  resetEnvironment,
} from "../../../../src/compat/env_detector.ts";
import forceMediaKeysInstantiationIfNeeded from "../../../../src/compat/force_media_key_instantiation_if_needed.ts";
import log from "../../../../src/log.ts";

const logInfo = vi.spyOn(log, "info").mockImplementation(() => {
  // noop
});
const logWarn = vi.spyOn(log, "warn").mockImplementation(() => {
  // noop
});

describe("compat - forceMediaKeysInstantiationIfNeeded", () => {
  afterEach(() => {
    vi.clearAllMocks();
    resetEnvironment();
  });

  it("creates a dummy session for PlayReady on Edge Chromium and Windows 10 or 11", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Windows10Or11);
    const close = vi.fn(() => Promise.resolve());
    const generateRequest = vi.fn(() => Promise.resolve());
    const mediaKeys = createMediaKeys(generateRequest, close);
    const mediaKeySystemAccess = createMediaKeySystemAccess("com.microsoft.playready", [
      "temporary",
    ]);

    await forceMediaKeysInstantiationIfNeeded(mediaKeys, mediaKeySystemAccess);

    expect(mediaKeys.createSession).toHaveBeenCalledOnce();
    expect(mediaKeys.createSession).toHaveBeenCalledWith();
    expect(generateRequest).toHaveBeenCalledOnce();
    expect(generateRequest).toHaveBeenCalledWith("cenc", expect.any(Uint8Array));
    expect(close).toHaveBeenCalledOnce();
    expect(logInfo).toHaveBeenCalledOnce();
  });

  it("does not create a dummy session for PlayReady on another device", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Other);
    const mediaKeys = createMediaKeys(vi.fn(), vi.fn());
    const mediaKeySystemAccess = createMediaKeySystemAccess("com.microsoft.playready");

    await forceMediaKeysInstantiationIfNeeded(mediaKeys, mediaKeySystemAccess);

    expect(mediaKeys.createSession).not.toHaveBeenCalled();
  });

  it("does not create a dummy session for PlayReady in another browser", async () => {
    mockEnvironment(EnvDetector.BROWSERS.Firefox, EnvDetector.DEVICES.Windows10Or11);
    const mediaKeys = createMediaKeys(vi.fn(), vi.fn());
    const mediaKeySystemAccess = createMediaKeySystemAccess("com.microsoft.playready");

    await forceMediaKeysInstantiationIfNeeded(mediaKeys, mediaKeySystemAccess);

    expect(mediaKeys.createSession).not.toHaveBeenCalled();
  });

  it("does not create a dummy session for another key system", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Windows10Or11);
    const mediaKeys = createMediaKeys(vi.fn(), vi.fn());
    const mediaKeySystemAccess = createMediaKeySystemAccess("com.widevine.alpha");

    await forceMediaKeysInstantiationIfNeeded(mediaKeys, mediaKeySystemAccess);

    expect(mediaKeys.createSession).not.toHaveBeenCalled();
  });

  it("creates a persistent dummy session when temporary sessions are unavailable", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Windows10Or11);
    const mediaKeys = createMediaKeys(
      vi.fn(() => Promise.resolve()),
      vi.fn(() => Promise.resolve()),
    );
    const mediaKeySystemAccess = createMediaKeySystemAccess("com.microsoft.playready", [
      "persistent-license",
    ]);

    await forceMediaKeysInstantiationIfNeeded(mediaKeys, mediaKeySystemAccess);

    expect(mediaKeys.createSession).toHaveBeenCalledOnce();
    expect(mediaKeys.createSession).toHaveBeenCalledWith("persistent-license");
  });

  it("prefers a temporary dummy session when both session types are available", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Windows10Or11);
    const mediaKeys = createMediaKeys(
      vi.fn(() => Promise.resolve()),
      vi.fn(() => Promise.resolve()),
    );
    const mediaKeySystemAccess = createMediaKeySystemAccess("com.microsoft.playready", [
      "temporary",
      "persistent-license",
    ]);

    await forceMediaKeysInstantiationIfNeeded(mediaKeys, mediaKeySystemAccess);

    expect(mediaKeys.createSession).toHaveBeenCalledOnce();
    expect(mediaKeys.createSession).toHaveBeenCalledWith();
  });

  it("creates a default dummy session when the session types are unknown", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Windows10Or11);
    const mediaKeys = createMediaKeys(
      vi.fn(() => Promise.resolve()),
      vi.fn(() => Promise.resolve()),
    );
    const mediaKeySystemAccess = createMediaKeySystemAccess("com.microsoft.playready", [
      "foo",
      "bar",
    ]);

    await forceMediaKeysInstantiationIfNeeded(mediaKeys, mediaKeySystemAccess);

    expect(mediaKeys.createSession).toHaveBeenCalledOnce();
    expect(mediaKeys.createSession).toHaveBeenCalledWith();
  });

  it("swallows errors thrown while creating the dummy session", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Windows10Or11);
    const mediaKeys = createMediaKeys(vi.fn(), vi.fn());
    const error = new Error("createSession failed");
    mediaKeys.createSession.mockImplementationOnce(() => {
      throw error;
    });
    const mediaKeySystemAccess = createMediaKeySystemAccess("com.microsoft.playready");

    await expect(
      forceMediaKeysInstantiationIfNeeded(mediaKeys, mediaKeySystemAccess),
    ).resolves.toBeUndefined();

    expect(logInfo).toHaveBeenLastCalledWith("DRM", expect.any(String), error);
  });

  it("swallows errors returned while generating the request", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Windows10Or11);
    const generateRequest = vi.fn(() => Promise.reject("generateRequest failed"));
    const close = vi.fn(() => Promise.resolve());
    const mediaKeys = createMediaKeys(generateRequest, close);
    const mediaKeySystemAccess = createMediaKeySystemAccess("com.microsoft.playready");

    await expect(
      forceMediaKeysInstantiationIfNeeded(mediaKeys, mediaKeySystemAccess),
    ).resolves.toBeUndefined();

    expect(close).not.toHaveBeenCalled();
    expect(logInfo).toHaveBeenLastCalledWith("DRM", expect.any(String), "Unknown error");
  });

  it("swallows errors returned while closing the dummy session", async () => {
    mockEnvironment(EnvDetector.BROWSERS.EdgeChromium, EnvDetector.DEVICES.Windows10Or11);
    const closePromise = Promise.reject(new Error("close failed"));
    const close = vi.fn(() => closePromise);
    const mediaKeys = createMediaKeys(
      vi.fn(() => Promise.resolve()),
      close,
    );
    const mediaKeySystemAccess = createMediaKeySystemAccess("com.microsoft.playready");

    await expect(
      forceMediaKeysInstantiationIfNeeded(mediaKeys, mediaKeySystemAccess),
    ).resolves.toBeUndefined();
    await closePromise.catch(() => {
      // The production code also handles this rejection asynchronously.
    });

    expect(logWarn).toHaveBeenCalledOnce();
  });
});

function createMediaKeys(
  generateRequest: () => Promise<void>,
  close: () => Promise<void>,
): IMediaKeys & { createSession: ReturnType<typeof vi.fn> } {
  const session = { generateRequest, close } as unknown as IMediaKeySession;
  return {
    createSession: vi.fn(() => session),
    setServerCertificate: vi.fn(() => Promise.resolve(true)),
  };
}

function createMediaKeySystemAccess(
  keySystem: string,
  sessionTypes: string[] | undefined = ["temporary"],
): IMediaKeySystemAccess {
  return {
    keySystem,
    createMediaKeys: vi.fn(() => Promise.reject(new Error("Not implemented"))),
    getConfiguration: vi.fn(() => ({ sessionTypes })),
  };
}
