import { beforeAll, describe, expect, it, vi } from "vitest";
import type { IMediaElement } from "../../../../compat/browser_compatibility_types";
import type {
  IManifestMetadata,
  IPeriodMetadata,
  IAdaptationMetadata,
  IRepresentationMetadata,
} from "../../../../manifest";
import { ManifestMetadataFormat } from "../../../../manifest";

import type { IContentProtections } from "../../../../parsers/manifest";
import sleep from "../../../../utils/sleep";
import ContentDecryptor from "../../../decrypt";
import { updateManifestCodecSupport } from "../update_manifest_codec_support";

function generateFakeManifestWithRepresentations(
  videoRepresentations: IRepresentationMetadata[],
  audioRepresentations: IRepresentationMetadata[],
): IManifestMetadata {
  const videoAdaptation: IAdaptationMetadata = {
    id: "adaptation1",
    representations: videoRepresentations,
    type: "video",
    supportStatus: {
      isDecipherable: true,
      hasSupportedCodec: undefined,
      hasCodecWithUndefinedSupport: true,
    },
  };

  const audioAdaptation: IAdaptationMetadata = {
    id: "adaptation2",
    representations: audioRepresentations,
    type: "audio",
    supportStatus: {
      isDecipherable: true,
      hasSupportedCodec: undefined,
      hasCodecWithUndefinedSupport: true,
    },
  };

  const period: IPeriodMetadata = {
    adaptations: {
      video: [videoAdaptation],
      audio: [audioAdaptation],
    },
    id: "period1",
    start: 0,
    streamEvents: [],
    thumbnailTracks: [],
  };

  const manifest: IManifestMetadata = {
    id: "manifest1",
    isDynamic: false,
    isLive: false,
    timeBounds: {
      minimumSafePosition: 0,
      timeshiftDepth: null,
      maximumTimeData: {
        isLinear: false,
        livePosition: 0,
        maximumSafePosition: 10,
        time: 10,
      },
    },
    periods: [period],
    availabilityStartTime: 0,
    isLastPeriodKnown: true,
    manifestFormat: ManifestMetadataFormat.MetadataObject,
    uris: [],
  };

  return manifest;
}

beforeAll(() => {
  // Mock MediaSource APIs
  vi.mock("../../../../compat/browser_compatibility_types", () => ({
    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    MediaSource_: class {
      static isTypeSupported(type: string) {
        // Mocked behavior: return true for all codecs and return false for vp9 codec
        return type.indexOf("vp9") === -1;
      }
    },
  }));

  // Mock EME APIs
  vi.mock("../../../../compat/eme/eme-api-implementation", () => ({
    default: {
      requestMediaKeySystemAccess(
        keyType: string,
        config: MediaKeySystemConfiguration[],
      ) {
        return {
          keySystem: keyType,
          getConfiguration: () => ({
            ...config[0],
            videoCapabilities: [
              // Notice that all other codecs such as hevc are not listed in the videoCapabilities
              // meanings that the EME implementation does not support them.
              {
                contentType: 'video/mp4;codecs="avc1.4d401e"',
                robustness: "HW_SECURE_ALL",
              },
            ],
            audioCapabilities: [
              // Notice that all other codecs such as ec-3 are not listed in the audioCapabilities
              // meanings that the EME implementation does not support them.
              {
                contentType: 'audio/mp4;codecs="mp4a.40.2"',
                robustness: "HW_SECURE_ALL",
              },
            ],
          }),
          createMediaKeys: () => Promise.resolve({}),
        };
      },
      onEncrypted: (
        _target: unknown,
        _listener: (evt: unknown) => void,
        _cancelSignal: unknown,
      ) => {
        return;
      },
      setMediaKeys: (
        _mediaElement: IMediaElement,
        _mediaKeys: unknown,
      ): Promise<unknown> => {
        return Promise.resolve();
      },
    },
  }));
});
describe("init - utils - updateManifestCodecSupport", () => {
  it("should return the codecs with result true/false if it's supported by the device", () => {
    const representationAVC: IRepresentationMetadata = {
      bitrate: 1000,
      id: "representation1",
      uniqueId: "representation1",
      codecs: ["avc1.4d401e"],
      mimeType: "video/mp4",
      isSupported: undefined,
    };

    const representationHEVC: IRepresentationMetadata = {
      bitrate: 2000,
      id: "representation2",
      uniqueId: "representation2",
      codecs: ["hvc1.2.4.L153.B0"],
      mimeType: "video/mp4",
      isSupported: undefined,
    };

    const representationVP9: IRepresentationMetadata = {
      bitrate: 3000,
      id: "representation3",
      uniqueId: "representation3",
      codecs: ["vp9"],
      mimeType: "video/mp4",
      isSupported: undefined,
    };

    const representationMP4A: IRepresentationMetadata = {
      bitrate: 1000,
      id: "representation4",
      uniqueId: "representation4",
      codecs: ["mp4a.40.2"],
      mimeType: "audio/mp4",
      isSupported: undefined,
    };

    const representationEC3: IRepresentationMetadata = {
      bitrate: 2000,
      id: "representation5",
      uniqueId: "representation5",
      codecs: ["ec-3"],
      mimeType: "audio/mp4",
      isSupported: undefined,
    };

    const manifest = generateFakeManifestWithRepresentations(
      [representationAVC, representationHEVC, representationVP9],
      [representationMP4A, representationEC3],
    );

    const video = document.createElement("video");
    const keySystem1 = {
      type: "com.widevine.alpha",
      getLicense: () => {
        return new Uint8Array([]);
      },
    };
    const contentDecryptor = new ContentDecryptor(video, [keySystem1]);
    updateManifestCodecSupport(manifest, contentDecryptor, true);
    expect(representationAVC.isSupported).toBe(true);
    expect(representationHEVC.isSupported).toBe(true);
    expect(representationVP9.isSupported).toBe(false); // Not Supported by MSE
    expect(representationMP4A.isSupported).toBe(true);
    expect(representationEC3.isSupported).toBe(true);
  });

  it("should take into consideration the supported codecs by the CDM", async () => {
    /**
     * While HEVC codec is supported by the browser, in this example the CDM
     * does not support it. Overral the codec should be considered as unsupported.
     */
    const fakeContentProtection: IContentProtections = {
      keyIds: [new Uint8Array([1, 2, 3])],
      initData: [],
    };
    const encryptedRepresentationAVC: IRepresentationMetadata = {
      bitrate: 1000,
      id: "representation1",
      uniqueId: "representation1",
      codecs: ["avc1.4d401e"],
      mimeType: "video/mp4",
      contentProtections: fakeContentProtection,
    };

    const encryptedRepresentationHEVC: IRepresentationMetadata = {
      bitrate: 2000,
      id: "representation2",
      uniqueId: "representation2",
      codecs: ["hvc1.2.4.L153.B0"],
      mimeType: "video/mp4",
      contentProtections: fakeContentProtection,
    };

    const encryptedRepresentationVP9: IRepresentationMetadata = {
      bitrate: 2000,
      id: "representation3",
      uniqueId: "representation3",
      codecs: ["vp9"],
      mimeType: "video/mp4",
      contentProtections: fakeContentProtection,
    };

    const encryptedRepresentationMP4A: IRepresentationMetadata = {
      bitrate: 1000,
      id: "representation4",
      uniqueId: "representation4",
      codecs: ["mp4a.40.2"],
      mimeType: "audio/mp4",
      contentProtections: fakeContentProtection,
    };

    const encryptedRepresentationEC3: IRepresentationMetadata = {
      bitrate: 2000,
      id: "representation5",
      uniqueId: "representation5",
      codecs: ["ec-3"],
      mimeType: "audio/mp4",
      contentProtections: fakeContentProtection,
    };

    const manifest = generateFakeManifestWithRepresentations(
      [
        encryptedRepresentationAVC,
        encryptedRepresentationHEVC,
        encryptedRepresentationVP9,
      ],
      [encryptedRepresentationMP4A, encryptedRepresentationEC3],
    );

    const keySystem1 = {
      type: "com.widevine.alpha",
      getLicense: () => {
        return new Uint8Array([]);
      },
    };
    const video = document.createElement("video");
    const contentDecryptor = new ContentDecryptor(video, [keySystem1]);
    await sleep(100);
    contentDecryptor.attach();
    updateManifestCodecSupport(manifest, contentDecryptor, true);
    expect(encryptedRepresentationAVC.isSupported).toBe(true);
    expect(encryptedRepresentationHEVC.isSupported).toBe(false); // Not supported by EME
    expect(encryptedRepresentationVP9.isSupported).toBe(false); // Not supported by MSE
    expect(encryptedRepresentationMP4A.isSupported).toBe(true);
    expect(encryptedRepresentationEC3.isSupported).toBe(false); // Not supported by EME
  });

  it("should update to false if the codec is not usable with MSE in worker", () => {
    const representationAVC: IRepresentationMetadata = {
      bitrate: 1000,
      id: "representation1",
      uniqueId: "representation1",
      codecs: ["avc1.4d401e"],
      mimeType: "video/mp4",
      isSupported: undefined,
      isCodecSupportedInWebWorker: undefined,
    };
    const representationHEVC: IRepresentationMetadata = {
      bitrate: 2000,
      id: "representation2",
      uniqueId: "representation2",
      codecs: ["hvc1.2.4.L153.B0"],
      mimeType: "video/mp4",
      isSupported: undefined,
      isCodecSupportedInWebWorker: false,
    };

    const representationMP4A: IRepresentationMetadata = {
      bitrate: 1000,
      id: "representation4",
      uniqueId: "representation4",
      codecs: ["mp4a.40.2"],
      mimeType: "audio/mp4",
      isSupported: undefined,
      isCodecSupportedInWebWorker: true,
    };
    const manifest = generateFakeManifestWithRepresentations(
      [representationAVC, representationHEVC],
      [representationMP4A],
    );

    const video = document.createElement("video");
    const contentDecryptor = new ContentDecryptor(video, []);
    updateManifestCodecSupport(manifest, contentDecryptor, true);
    expect(representationAVC.isSupported).toBe(true);
    expect(representationHEVC.isSupported).toBe(false); // not supported with MSE in worker
    expect(representationMP4A.isSupported).toBe(true);
  });
});
