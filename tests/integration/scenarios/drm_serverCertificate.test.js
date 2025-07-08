import { describe, beforeEach, afterEach, it, expect, vi } from "vitest";
import { manifestInfos } from "../../contents/DASH_DRM_static_SegmentTemplate";
import DummyMediaElement from "../../../dist/es2017/experimental/tools/DummyMediaElement";
import {
  DummyMediaKeys,
  DummyMediaKeySystemAccess,
} from "../../../dist/es2017/experimental/tools/DummyMediaElement/eme";
import RxPlayer from "../../../dist/es2017";
import { waitForLoadedStateAfterLoadVideo } from "../../utils/waitForPlayerState";
import { lockLowestBitrates } from "../../utils/bitrates";
import sleep from "../../utils/sleep";
import { generateGetLicenseForFakeLicense } from "../utils/drm_utils";

describe("DRM: server certificate", function () {
  const { url, transport } = manifestInfos;
  let player;
  let serverCertificateSpy;
  let createMediaKeysSpy;
  let requestMediaKeySystemAccessSpy;
  const oldMediaSourceSupported = MediaSource.isTypeSupported;

  let dummy;
  beforeEach(() => {
    MediaSource.isTypeSupported = () => true;
    dummy = new DummyMediaElement();
    serverCertificateSpy = vi.spyOn(DummyMediaKeys.prototype, "setServerCertificate");
    createMediaKeysSpy = vi.spyOn(DummyMediaKeySystemAccess.prototype, "createMediaKeys");
    requestMediaKeySystemAccessSpy = vi.spyOn(
      dummy.FORCED_EME_API,
      "requestMediaKeySystemAccess",
    );
    player = new RxPlayer({ videoElement: dummy });
    player.setWantedBufferAhead(10);
  });

  afterEach(async () => {
    MediaSource.isTypeSupported = oldMediaSourceSupported;
    serverCertificateSpy.mockRestore();
    createMediaKeysSpy.mockRestore();
    requestMediaKeySystemAccessSpy.mockRestore();
    player.dispose();
  });

  it("should not call `setServerCertificate` if no server certificate is asked", async function () {
    lockLowestBitrates(player);
    for (const keySystem of ["com.microsoft.playready", "com.widevine.alpha"]) {
      requestMediaKeySystemAccessSpy.mockClear();
      createMediaKeysSpy.mockClear();
      serverCertificateSpy.mockClear();
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(serverCertificateSpy).not.toHaveBeenCalled();
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(2);
      } else {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(1);
      }
      expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
    }
  });

  it("should call `setServerCertificate` if a server certificate is asked as Uint8Array", async function () {
    lockLowestBitrates(player);
    for (const keySystem of ["com.microsoft.playready", "com.widevine.alpha"]) {
      requestMediaKeySystemAccessSpy.mockClear();
      createMediaKeysSpy.mockClear();
      serverCertificateSpy.mockClear();
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate: new Uint8Array([1, 2, 3]),
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(1, new Uint8Array([1, 2, 3]));
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(2);
      } else {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(1);
      }
      expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
    }
  });

  it("should call `setServerCertificate` if a server certificate is asked as ArrayBuffer", async function () {
    lockLowestBitrates(player);
    for (const keySystem of ["com.microsoft.playready", "com.widevine.alpha"]) {
      requestMediaKeySystemAccessSpy.mockClear();
      createMediaKeysSpy.mockClear();
      serverCertificateSpy.mockClear();
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate: new Uint8Array([1, 2, 3]).buffer,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(
        1,
        new Uint8Array([1, 2, 3]).buffer,
      );
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        // There also is the initial key system check on Edge
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(2);
      } else {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(1);
      }
      expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
    }
  });

  it("should not change MediaKeys if serverCertificate is set later", async function () {
    lockLowestBitrates(player);
    for (const keySystem of ["com.microsoft.playready", "com.widevine.alpha"]) {
      requestMediaKeySystemAccessSpy.mockClear();
      createMediaKeysSpy.mockClear();
      serverCertificateSpy.mockClear();
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(2);
      } else {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(1);
      }
      expect(serverCertificateSpy).toHaveBeenCalledTimes(0);

      const serverCertificate = new Uint8Array([1, 2, 3]);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(2);
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(4);
      } else {
        expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(1);
      }
      expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(1, new Uint8Array([1, 2, 3]));
    }
  });

  it("should not re-call `setServerCertificate` if the server certificate didn't change", async function () {
    lockLowestBitrates(player);
    for (const keySystem of ["com.microsoft.playready", "com.widevine.alpha"]) {
      requestMediaKeySystemAccessSpy.mockClear();
      createMediaKeysSpy.mockClear();
      serverCertificateSpy.mockClear();
      const serverCertificate = new Uint8Array([1, 2, 3]);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(1, new Uint8Array([1, 2, 3]));

      const serverCertificate2 = new Uint8Array([1, 2, 3]);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate: serverCertificate2,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(2);
        expect(serverCertificateSpy).toHaveBeenCalledTimes(2);
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(4);
      } else {
        expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(1);
      }
      expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
    }
  });

  it("should re-call `setServerCertificate` if the server certificate change", async function () {
    lockLowestBitrates(player);
    for (const keySystem of ["com.microsoft.playready", "com.widevine.alpha"]) {
      requestMediaKeySystemAccessSpy.mockClear();
      createMediaKeysSpy.mockClear();
      serverCertificateSpy.mockClear();
      const serverCertificate = new Uint8Array([1, 2, 3]);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(1, new Uint8Array([1, 2, 3]));

      const serverCertificate2 = new Uint8Array([1, 2, 3, 4]);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate: serverCertificate2,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(2);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(
        2,
        new Uint8Array([1, 2, 3, 4]),
      );
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(2);
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(4);
      } else {
        expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(2);
      }
      expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
    }
  });

  it("should re-call `setServerCertificate` if the key system type change", async function () {
    lockLowestBitrates(player);
    const serverCertificate = new Uint8Array([1, 2, 3]);
    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready",
          serverCertificate,
          getLicense: generateGetLicenseForFakeLicense({}),
        },
      ],
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.stop();
    await sleep(10);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
    expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
    expect(serverCertificateSpy).toHaveBeenNthCalledWith(1, new Uint8Array([1, 2, 3]));

    player.loadVideo({
      url,
      transport,
      autoPlay: false,
      textTrackMode: "html",
      textTrackElement: document.createElement("div"),
      keySystems: [
        {
          type: "com.microsoft.playready2",
          serverCertificate,
          getLicense: generateGetLicenseForFakeLicense({}),
        },
      ],
    });
    await waitForLoadedStateAfterLoadVideo(player);
    player.stop();
    await sleep(10);
    expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(2);
    expect(serverCertificateSpy).toHaveBeenCalledTimes(2);
    expect(serverCertificateSpy).toHaveBeenNthCalledWith(2, new Uint8Array([1, 2, 3]));
    if (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") {
      expect(createMediaKeysSpy).toHaveBeenCalledTimes(4);
    } else {
      expect(createMediaKeysSpy).toHaveBeenCalledTimes(2);
    }
    expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
  });

  it("should re-call `setServerCertificate` if a key MediaKeySystemAccess state has changed", async function () {
    lockLowestBitrates(player);
    for (const keySystem of ["com.microsoft.playready", "com.widevine.alpha"]) {
      requestMediaKeySystemAccessSpy.mockClear();
      createMediaKeysSpy.mockClear();
      serverCertificateSpy.mockClear();
      const serverCertificate = new Uint8Array([1, 2, 3]);
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(1, new Uint8Array([1, 2, 3]));

      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            distinctiveIdentifier: "required",
            serverCertificate,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(2);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(2);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(2, new Uint8Array([1, 2, 3]));
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(4);
      } else {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(2);
      }
      expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
    }
  });

  it("should re-call `createMediaKeys` if the server certificate is reset", async function () {
    lockLowestBitrates(player);
    const serverCertificate = new Uint8Array([1, 2, 3]);
    for (const keySystem of ["com.microsoft.playready", "com.widevine.alpha"]) {
      requestMediaKeySystemAccessSpy.mockClear();
      createMediaKeysSpy.mockClear();
      serverCertificateSpy.mockClear();
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(1, new Uint8Array([1, 2, 3]));

      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate: null,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(2);
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(4);
      } else {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(2);
        expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
        expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
      }
      expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
    }
  });

  it("should re-call `setServerCertificate` but not re-`createMediaKeys` if it was set to `null` at some point", async function () {
    lockLowestBitrates(player);
    const serverCertificate = new Uint8Array([1, 2, 3]);
    for (const keySystem of ["com.microsoft.playready", "com.widevine.alpha"]) {
      requestMediaKeySystemAccessSpy.mockClear();
      createMediaKeysSpy.mockClear();
      serverCertificateSpy.mockClear();
      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(1, new Uint8Array([1, 2, 3]));

      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate: null,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(1);
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(2);
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(4);
      } else {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(2);
        expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(1);
      }
      expect(dummy.mediaKeys.dummySessions).toHaveLength(2);

      player.loadVideo({
        url,
        transport,
        autoPlay: false,
        textTrackMode: "html",
        textTrackElement: document.createElement("div"),
        keySystems: [
          {
            type: keySystem,
            serverCertificate,
            getLicense: generateGetLicenseForFakeLicense({}),
          },
        ],
      });
      await waitForLoadedStateAfterLoadVideo(player);
      player.stop();
      await sleep(10);
      expect(serverCertificateSpy).toHaveBeenCalledTimes(2);
      expect(serverCertificateSpy).toHaveBeenNthCalledWith(2, new Uint8Array([1, 2, 3]));
      if (
        (__BROWSER_NAME__ === "edge" || __BROWSER_NAME__ === "firefox") &&
        keySystem.indexOf("playready") !== -1
      ) {
        expect(requestMediaKeySystemAccessSpy).toHaveBeenCalledTimes(3);
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(6);
      } else {
        expect(createMediaKeysSpy).toHaveBeenCalledTimes(2);
      }
      expect(dummy.mediaKeys.dummySessions).toHaveLength(2);
    }
  });
});
